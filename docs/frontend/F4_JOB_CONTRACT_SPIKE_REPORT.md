# DataFlowX Frontend — Phase F4 Stage 0: Job Contract Spike Report

## Executive Summary
This document records the verified backend contract, source implementation analysis, and runtime verification for **Job Management (Phase F4)**.

All findings are grounded in authoritative backend source code (`JobController.java`, `JobServiceImpl.java`, `JobProcessor.java`, `Job.java`, `JobResponse.java`, `CreateJobRequest.java`, `GlobalExceptionHandler.java`) and live runtime verification executed against the running Spring Boot environment.

---

## 1. Verified Endpoints & Authoritative Contracts

| Method | Path | Request Body | Response Body | HTTP Status | Authorization | Notes |
|---|---|---|---|---|---|---|
| `POST` | `/api/v1/datasets/{datasetId}/jobs` | `{}` (`application/json`) | `JobResponse` | `201 Created` | Dataset Owner / `ADMIN` | **Must send `{}`**. Missing body returns `400 Bad Request`. Archived datasets are allowed. |
| `GET` | `/api/v1/jobs` | None | `Page<JobResponse>` | `200 OK` | Authenticated (`USER` / `ADMIN`) | `USER` sees only jobs for own datasets. `ADMIN` sees all jobs. Default sort: `submittedAt,desc`. |
| `GET` | `/api/v1/jobs/{id}` | None | `JobResponse` | `200 OK` | Dataset Owner / `ADMIN` | Non-owner gets `403 Forbidden`. Non-existent ID gets `404 Not Found`. |

*Note: There are no status filters, no datasetId query filters, no cancel, pause, or retry endpoints.*

---

## 2. Source-Confirmed Facts

### A. DTO and Entity Definitions

#### `JobResponse`
```ts
export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface JobResponse {
  id: number;
  datasetId: number;
  status: JobStatus;
  progress: number; // 0 to 100
  submittedAt: string; // ISO 8601 instant
  startedAt: string | null; // ISO 8601 instant
  completedAt: string | null; // ISO 8601 instant
  errorMessage: string | null;
}
```
- **There is NO `datasetName` field** in `JobResponse`.
- `startedAt` is set when status transitions to `RUNNING`.
- `completedAt` is set when status transitions to `COMPLETED` or `FAILED`.
- `errorMessage` is set only on `FAILED`.

#### `CreateJobRequest`
- Backend defines `public record CreateJobRequest() {}` with **zero fields**.
- In `JobController.java`, the parameter is annotated with `@Valid @RequestBody CreateJobRequest request` (default `required = true`).

### B. Pagination & Limits
- Default page size: `20`
- Maximum page size: `100` (`Math.min(Math.max(size, 1), 100)`)
- Page shape: standard Spring Data `Page<T>` containing `content`, `totalElements`, `totalPages`, `number`, `size`, `first`, `last`, and `numberOfElements`.

### C. Allowed Sort Properties
- Entity properties available on `Job`: `id`, `status`, `progress`, `submittedAt`, `startedAt`, `completedAt`, `errorMessage`.
- Prompt-approved frontend sort keys:
  ```ts
  export type JobSortKey = 'id' | 'status' | 'progress' | 'submittedAt' | 'startedAt' | 'completedAt';
  ```
- Default sort: `submittedAt,desc`.

### D. Asynchronous Execution Mechanism
- In `JobProcessor.java`:
  - `PROGRESS_STEPS = {20, 40, 60, 80}`
  - `STEP_DELAY_MILLIS = 25` (25ms sleep per step)
  - Controlled failure occurs if dataset name equals `${app.job.processing.failure-dataset-name}` (e.g. `"fail-processing"`), transitioning directly to `FAILED` with message `"Simulated processing failure"`.
  - Normal execution proceeds through 4 progress increments + completion pause: total nominal runtime is **~125ms–500ms**.

---

## 3. Runtime-Confirmed Facts (Spike Execution)

### A. Job Submission Body Variations
- **Empty body (0 bytes) / no Content-Type**:
  - **Status**: `400 Bad Request`
  - **Cause**: Spring throws `HttpMessageNotReadableException: Required request body is missing`.
  - **Body**: Empty body returned by Spring's `DefaultHandlerExceptionResolver`.
- **Empty body (0 bytes) with `Content-Type: application/json`**:
  - **Status**: `400 Bad Request` (`HttpMessageNotReadableException: Required request body is missing`).
- **`Content-Type: application/json` with `{}`**:
  - **Status**: `201 Created`
  - **Body**:
    ```json
    {
      "id": 1,
      "datasetId": 1,
      "status": "PENDING",
      "progress": 0,
      "submittedAt": "2026-09-23T17:07:17.842786900Z",
      "startedAt": null,
      "completedAt": null,
      "errorMessage": null
    }
    ```
- **Architectural Requirement**: Frontend HTTP client `submitJob(datasetId)` **must explicitly send `{}`** with `Content-Type: application/json`.

### B. 403 Forbidden Response
- Submitting a job to another user's dataset or querying another user's job returns `403 Forbidden`:
  ```json
  {
    "timestamp": "2026-09-23T17:07:17.944472700Z",
    "status": 403,
    "error": "FORBIDDEN",
    "message": "Not authorized to access this dataset or its jobs",
    "path": "/api/v1/datasets/1/jobs"
  }
  ```
  Normalized cleanly by frontend `ApiError`.

### C. 404 Not Found Response
- Submitting a job to a non-existent dataset (`/datasets/999999/jobs`):
  ```json
  {
    "timestamp": "2026-09-23T17:07:17.997092900Z",
    "status": 404,
    "error": "NOT_FOUND",
    "message": "Dataset not found",
    "path": "/api/v1/datasets/999999/jobs"
  }
  ```
- Querying a non-existent job (`/jobs/999999`):
  ```json
  {
    "timestamp": "2026-09-23T17:07:18.022865100Z",
    "status": 404,
    "error": "NOT_FOUND",
    "message": "Job not found",
    "path": "/api/v1/jobs/999999"
  }
  ```

### D. Sort Parameter Handling & Whitelisting
- Valid sort parameters (`id,asc`, `status,desc`, `progress,asc`, `submittedAt,desc`, `startedAt,asc`, `completedAt,desc`) all return `200 OK`.
- Invalid sort parameter (`foobar,asc`) throws `PropertyReferenceException: No property 'foobar' found for type 'Job'`, resulting in unhandled **Spring HTTP 500**.
- **Architectural Requirement**: Frontend must strictly validate sort keys against `JobSortKey` and fallback to `submittedAt,desc`. No unvalidated sort key may reach the backend.

### E. End-to-End Job Lifecycle & State Observability
During high-frequency polling (~10ms interval):
1. **At POST**: Job is immediately returned with `status: "PENDING"`, `progress: 0`.
2. **At 61ms**: Job status is observed as `status: "RUNNING"`, `progress: 0`, `startedAt` is populated.
3. **At 134ms**: Job status is `status: "RUNNING"`, `progress: 40`.
4. **At 230ms**: Job status is `status: "RUNNING"`, `progress: 60`.
5. **At 548ms**: Job status is `status: "COMPLETED"`, `progress: 100`, `completedAt` is populated.
6. **On Failure Dataset**: Job transitions to `status: "FAILED"`, `errorMessage: "Simulated processing failure"`.

**Conclusion on State Observability**:
- `PENDING` is always captured on submission response.
- `RUNNING` and intermediate progress steps (`0`, `40`, `60`) **are observable** if polling happens immediately.
- Because backend processing takes ~125–500ms total, a standard 1s or 2s polling interval will often observe a job that transitions directly from `PENDING` (initial submission) to `COMPLETED` on the first poll interval. This is expected real backend behavior. The frontend must handle direct jumps without faking intermediate steps.

---

## 4. Observations & Critical Edge Cases

1. **Fast Completion vs Polling Interval**:
   - The frontend should poll aggressively at start (e.g. 1000ms initially), then back off (2000ms, 3000ms).
   - If a job is already `COMPLETED` or `FAILED` when polled, polling stops immediately.
2. **Stuck / Non-Replaying Jobs on Backend Restart**:
   - Jobs are triggered asynchronously via in-memory Spring events. If the backend restarts while a job is `PENDING` or `RUNNING`, the job never resumes in the backend.
   - Polling must be bounded (e.g. max ~2 minutes).
   - When bounded polling expires, display a clear user message: *"No update since <time>. Refresh to check again."* Never falsely claim the job failed.
3. **Dataset Name Resolution**:
   - Since `JobResponse` lacks `datasetName`, the frontend will resolve `datasetName` using the TanStack Query cache for datasets (`['datasets', 'list', ...]`). If absent, it gracefully displays `"Dataset #<datasetId>"`.
4. **Archived Dataset Submission**:
   - Verified that backend `JobServiceImpl.java` only checks `findAuthorizedDataset`, not status. Submitting jobs on archived datasets is valid and allowed.

---

## 5. Recommended F4 Implementation Architecture

### File Structure
```
frontend/src/features/jobs/
├── types.ts                     # JobResponse, JobStatus, JobSortKey, JobListParams
├── api.ts                       # getJobs, getJob, submitJob (sends `{}`)
├── queries.ts                   # useJobs, useJob, useSubmitJob
├── lib/
│   ├── sort.ts                  # parseJobSort, formatJobSort, whitelist
│   ├── status.ts                # status labels, badges, terminal checks
│   └── polling.ts               # calculatePollInterval (number | false)
├── components/
│   ├── JobStatusBadge.tsx       # Status badge with distinct styling
│   ├── JobLifecycle.tsx         # Data-driven lifecycle steps & progress bar
│   ├── JobTable.tsx             # Responsive table, sortable headers, mobile card view
│   └── SubmitJobButton.tsx      # Submission button with inline feedback & view link
├── pages/
│   ├── JobListPage.tsx          # URL-synced listing, pagination, sorting
│   └── JobDetailPage.tsx        # Overview, lifecycle timeline, polling, error states
└── index.ts                     # Public exports
```

### Route Updates
- `/jobs` -> `JobListPage`
- `/jobs/:id` -> `JobDetailPage`
- Integrate `SubmitJobButton` into `DatasetDetailPage`

---

## 6. Recommended Step-by-Step Implementation Sequence

1. **`features/jobs/types.ts`**: Define `JobStatus`, `JobResponse`, `JobSortKey`, `JobListParams`.
2. **`features/jobs/api.ts`**: Implement `getJobs`, `getJob`, and `submitJob` (passing `{}` in body with `http.post`).
3. **`features/jobs/lib/sort.ts`**: Pure functions `parseJobSort` and `formatJobSort` strictly whitelisting `['id', 'status', 'progress', 'submittedAt', 'startedAt', 'completedAt']` with default `submittedAt,desc`.
4. **`features/jobs/lib/status.ts`**: Status helpers (`isTerminalStatus`, badge variant mapping).
5. **`features/jobs/lib/polling.ts`**: Bounded polling delay helper returning `number | false`.
6. **`features/jobs/queries.ts`**:
   - `useJobs(params)` with `placeholderData: keepPreviousData` and conditional page-level polling if any item is non-terminal.
   - `useJob(id)` with bounded polling (`refetchInterval`), stopping on terminal state (`COMPLETED` | `FAILED`) or timeout.
   - `useSubmitJob()` mutation invalidating `['jobs']`.
7. **`features/jobs/components/JobStatusBadge.tsx`**: Status indicator with color coding.
8. **`features/jobs/components/JobLifecycle.tsx`**: Lifecycle visualizer rendering Submitted -> Running -> Completed/Failed based on actual server fields (`submittedAt`, `startedAt`, `completedAt`, `progress`, `errorMessage`).
9. **`features/jobs/components/JobTable.tsx`**: Accessible, responsive table with sortable columns, dataset name fallback, and mobile view.
10. **`features/jobs/components/SubmitJobButton.tsx`**: Action button for `DatasetDetailPage` handling loading, success feedback, and "View Job" link.
11. **`features/jobs/pages/JobListPage.tsx`**: Connected to `useUrlState` for pagination and sorting.
12. **`features/jobs/pages/JobDetailPage.tsx`**: Detailed job overview, invalid ID handling, 404/403 states, manual refresh button, timeout message.
13. **Integration**: Update `DatasetDetailPage.tsx` to include `SubmitJobButton`, and update `app/router/index.tsx` to register `/jobs` and `/jobs/:id`.
14. **Tests**: Comprehensive unit and integration tests across sort parsing, polling, lifecycle rendering, table, detail page, and job submission.
15. **Verification**: Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
