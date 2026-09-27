# Phase F5 Contract Spike Report

## 1. Scope

Phase F5 implements the role-aware Dashboard for DataFlowX. This spike establishes and verifies the authoritative API contracts, authorization boundaries, query key integration points, and UI routing behavior for:

1. **ADMIN Role**:
   - Authorized access to `GET /api/v1/dashboard/summary`.
   - Aggregated system-wide counts: total datasets and per-status job counts (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`).
   - Recent jobs overview across the platform.

2. **USER Role**:
   - Explicitly restricted from calling `GET /api/v1/dashboard/summary` (enforced by backend HTTP 403 Forbidden).
   - Overview derived exclusively from authorized, pre-existing F3/F4 endpoints:
     - `GET /api/v1/datasets?size=1` → `totalElements` (total owned datasets).
     - `GET /api/v1/jobs?size=1` → `totalElements` (total owned jobs).
     - `GET /api/v1/jobs?size=5&sort=submittedAt,desc` → 5 most recent jobs owned by the user.
   - **Zero fabrication**: Per-status counts are not provided by the backend for non-admin users and must never be approximated, simulated, or fabricated on the client.

3. **Cache & Navigation Integration**:
   - Reusing existing TanStack Query key factories from `features/datasets` and `features/jobs`.
   - Validating cache invalidation and manual refresh behavior.
   - Resolving router and navigation state from the Phase F2 placeholder.

---

## 2. GET /dashboard/summary contract

- **URL**: `/api/v1/dashboard/summary`
- **Method**: `GET`
- **Controller**: `com.dataflowx.dashboard.controller.DashboardController.getSummary(@AuthenticationPrincipal SecurityUser principal)`
- **Service**: `com.dataflowx.dashboard.service.impl.DashboardServiceImpl.getSummary(SecurityUser principal)`
- **Security & Authorization**:
  ```java
  if (principal.getRole() != UserRole.ADMIN) {
      throw new UnauthorizedOperationException("Administrator access is required for the dashboard");
  }
  ```
  - Unauthenticated requests: Handled by `RestAuthenticationEntryPoint`, returning `401 UNAUTHORIZED`.
  - Non-admin authenticated requests (`USER`): Handled by `GlobalExceptionHandler`, returning `403 FORBIDDEN`.

---

## 3. ADMIN response shape

- **HTTP Status**: `200 OK`
- **Content-Type**: `application/json`
- **Backend Model**: `com.dataflowx.dashboard.dto.response.DashboardSummaryResponse`

### Exact JSON Shape
```json
{
  "totalDatasets": 3,
  "pendingJobs": 2,
  "runningJobs": 1,
  "completedJobs": 4,
  "failedJobs": 1
}
```

### Field Specifications
| Field | Type | Description |
| :--- | :--- | :--- |
| `totalDatasets` | `number` (int64) | Total number of datasets across the entire platform (`datasetRepository.count()`). |
| `pendingJobs` | `number` (int64) | Total jobs with status `PENDING` (`jobRepository.countByStatus(PENDING)`). |
| `runningJobs` | `number` (int64) | Total jobs with status `RUNNING` (`jobRepository.countByStatus(RUNNING)`). |
| `completedJobs` | `number` (int64) | Total jobs with status `COMPLETED` (`jobRepository.countByStatus(COMPLETED)`). |
| `failedJobs` | `number` (int64) | Total jobs with status `FAILED` (`jobRepository.countByStatus(FAILED)`). |

*Note: All values are non-negative integers. When no data exists, all counts evaluate to `0`.*

---

## 4. USER 403 behavior

When an authenticated user with role `USER` calls `GET /api/v1/dashboard/summary`:

- **HTTP Status**: `403 Forbidden`
- **Content-Type**: `application/json`
- **Backend Handling**: `GlobalExceptionHandler.handleForbidden` catching `UnauthorizedOperationException`.

### Exact Response Body (Verified from `10_dashboard_summary_user_403_error.json`)
```json
{
  "timestamp": "2026-09-22T12:42:43.176925200Z",
  "status": 403,
  "error": "FORBIDDEN",
  "message": "Administrator access is required for the dashboard",
  "path": "/api/v1/dashboard/summary"
}
```

### Frontend Rule
The frontend `features/dashboard` query layer must **never** invoke `/dashboard/summary` when `user.role !== 'ADMIN'`. The dashboard query hook must guard its execution with `enabled: user?.role === 'ADMIN'`.

---

## 5. USER dataset count contract

- **URL**: `/api/v1/datasets?size=1`
- **Method**: `GET`
- **Query Parameters**: `size=1` (minimal content payload to retrieve pagination metadata).
- **Backend Service**: `DatasetServiceImpl.getDatasets` executes `datasetRepository.findByOwner(owner, pageable)` for `USER`.
- **Response Shape**: Spring `Page<DatasetResponse>`

```json
{
  "content": [
    {
      "id": 1,
      "name": "Research Sample Dataset",
      "description": "Sample description",
      "ownerId": 7,
      "status": "ACTIVE",
      "createdAt": "2026-09-22T12:42:42.915313Z",
      "updatedAt": "2026-09-22T12:42:42.915313Z"
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 1,
    "offset": 0,
    "paged": true,
    "unpaged": false
  },
  "totalElements": 1,
  "totalPages": 1,
  "size": 1,
  "number": 0,
  "first": true,
  "last": true,
  "numberOfElements": 1,
  "empty": false
}
```

### Extraction
- Dataset count is extracted directly from `data.totalElements`.
- Matches the existing `Page<T>` type definition in `frontend/src/shared/api/types.ts`.

---

## 6. USER job count contract

- **URL**: `/api/v1/jobs?size=1`
- **Method**: `GET`
- **Query Parameters**: `size=1`
- **Backend Service**: `JobServiceImpl.getJobs` executes `jobRepository.findByDatasetOwner(owner, pageable)` for `USER`.
- **Response Shape**: Spring `Page<JobResponse>`

```json
{
  "content": [
    {
      "id": 1,
      "datasetId": 1,
      "status": "RUNNING",
      "progress": 40,
      "submittedAt": "2026-09-22T12:42:43.021973Z",
      "startedAt": "2026-09-22T12:42:43.046917Z",
      "completedAt": null,
      "errorMessage": null
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "size": 1,
  "number": 0,
  "first": true,
  "last": true,
  "numberOfElements": 1,
  "empty": false
}
```

### Extraction
- Job count is extracted directly from `data.totalElements`.
- **Constraint**: `JobController` does not support status filtering on `GET /jobs`. Per-status counts cannot be retrieved for non-admins without full table scanning, which is prohibited. The USER view displays total datasets and total jobs only.

---

## 7. Recent jobs contract

- **URL**: `/api/v1/jobs?page=0&size=5&sort=submittedAt,desc`
- **Method**: `GET`
- **Controller Sorting Parser**:
  ```java
  private Sort.Order parseSort(String[] sort) {
      String property = sort.length > 0 && !sort[0].isBlank() ? sort[0] : "submittedAt";
      Sort.Direction direction = sort.length > 1 ? Sort.Direction.fromOptionalString(sort[1]).orElse(Sort.Direction.DESC) : Sort.Direction.DESC;
      return new Sort.Order(direction, property);
  }
  ```
- **Ordering Behavior**: Verified deterministic server-side descending order by `submittedAt`.
- **Item Schema (`JobResponse`)**:
  | Field | Type | Nullable | Notes |
  | :--- | :--- | :--- | :--- |
  | `id` | `number` | No | Unique job identifier. |
  | `datasetId` | `number` | No | ID of associated dataset. |
  | `status` | `JobStatus` | No | `'PENDING' \| 'RUNNING' \| 'COMPLETED' \| 'FAILED'`. |
  | `progress` | `number` | No | Integer `0` to `100`. |
  | `submittedAt` | `string` | No | ISO-8601 UTC timestamp. |
  | `startedAt` | `string` | Yes | `null` until execution begins. |
  | `completedAt` | `string` | Yes | `null` until terminal state. |
  | `errorMessage` | `string` | Yes | `null` unless status is `FAILED`. |

### Dataset Name Handling in Recent Jobs
- `JobResponse` does **not** include `datasetName`.
- The dashboard recent jobs component must follow the established Phase F4 `JobTable` cache resolution pattern:
  1. Inspect `['datasets', 'detail', datasetId]` in `queryClient`.
  2. Inspect `['datasets', 'list']` entries in `queryClient`.
  3. Fall back to `Dataset #{datasetId}` gracefully when not in cache.
- The client must **not** invent or expect a `datasetName` field on `JobResponse`.

---

## 8. Empty-state behavior

1. **System with 0 Datasets and 0 Jobs**:
   - `GET /dashboard/summary` (ADMIN) returns:
     ```json
     {
       "totalDatasets": 0,
       "pendingJobs": 0,
       "runningJobs": 0,
       "completedJobs": 0,
       "failedJobs": 0
     }
     ```
     All stat cards render `0` cleanly.
   - `GET /datasets?size=1` (USER) returns `totalElements: 0, content: []`.
   - `GET /jobs?size=1` (USER) returns `totalElements: 0, content: []`.
   - `GET /jobs?size=5&sort=submittedAt,desc` returns `totalElements: 0, content: []`.
   - Recent jobs table renders an `EmptyState` component with a direct call to action ("No jobs submitted yet — explore datasets to start processing").

2. **System with Data**:
   - Stat cards accurately reflect positive counts.
   - Recent jobs renders up to 5 items with active status badges, progress bars, and clickable links to `/jobs/:id` and `/datasets/:datasetId`.

---

## 9. Existing F3/F4 query keys and cache

### Existing Key Factories
1. **Datasets** (`frontend/src/features/datasets/queries.ts`):
   ```typescript
   export const datasetKeys = {
     all: ['datasets'] as const,
     lists: () => [...datasetKeys.all, 'list'] as const,
     list: (params: DatasetListParams) => [...datasetKeys.lists(), params] as const,
     details: () => [...datasetKeys.all, 'detail'] as const,
     detail: (id: number) => [...datasetKeys.details(), id] as const,
   };
   ```

2. **Jobs** (`frontend/src/features/jobs/queries.ts`):
   ```typescript
   export const jobKeys = {
     all: ['jobs'] as const,
     lists: () => [...jobKeys.all, 'list'] as const,
     list: (params: JobListParams) => [...jobKeys.lists(), params] as const,
     details: () => [...jobKeys.all, 'detail'] as const,
     detail: (id: number) => [...jobKeys.details(), id] as const,
   };
   ```

### Recommended Dashboard Key Factory (`features/dashboard/queries.ts`)
```typescript
export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
};
```

### Cache Invalidation & Manual Refresh Strategy
- **Natural Synchronization**:
  - When a dataset is created or deleted in F3, `datasetKeys.lists()` is invalidated, immediately refreshing the user dashboard dataset count.
  - When a job is submitted in F4, `jobKeys.lists()` is invalidated, immediately refreshing the user dashboard job count and recent jobs list.
- **Manual Refresh Button**:
  - Requires **no global state** (no Redux, no Zustand, no event emitter).
  - Implemented via `useQueryClient()`:
    - **For ADMIN**:
      ```typescript
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      void queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
      ```
    - **For USER**:
      ```typescript
      void queryClient.invalidateQueries({ queryKey: datasetKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
      ```

---

## 10. Routing and role guard state

### Current Implementation (`frontend/src/app/router/index.tsx`)
```tsx
// Current lines 96-103
{
  path: '/dashboard',
  element: (
    <RequireRole role="ADMIN">
      <DashboardPagePlaceholder />
    </RequireRole>
  ),
}
```

### Root Redirect (`RootRedirect`)
```tsx
// Current lines 61-67
function RootRedirect() {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/datasets" replace />;
}
```

### Architectural Finding
- Currently, `<RequireRole role="ADMIN">` blocks non-admin users from accessing `/dashboard`, presenting an "Access Restricted" screen.
- In `FRONTEND_PROJECT_STRUCTURE.md` §14 and §33.5, the dashboard is designed as a **role-branched** page where both `USER` and `ADMIN` land on `/dashboard`, and `DashboardPage` conditionally renders either `AdminSummaryCards` or `UserOverviewCards`.
- **F5 Requirement**: In Phase F5, remove `<RequireRole role="ADMIN">` from the `/dashboard` route so all authenticated users access `/dashboard`. `RootRedirect` can then route all authenticated users to `/dashboard`.

---

## 11. AppShell / navigation state

### Current Implementation (`frontend/src/layouts/AppShell/AppShell.tsx`)
```tsx
// Current lines 39-48
const navItems = [
  ...(user?.role === 'ADMIN'
    ? [
        {
          to: '/dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
        },
      ]
    : []),
  { to: '/datasets', label: 'Datasets', icon: Database },
  { to: '/jobs', label: 'Jobs', icon: Briefcase },
];
```

### Finding
- Currently, the "Dashboard" navigation item is omitted from the sidebar for non-admin users.
- In Phase F5, once `/dashboard` becomes accessible to both roles, `navItems` should include `{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }` unconditionally for all authenticated users.

---

## 12. Contract mismatches / deviations

| Spec Section | Architecture / Mockup Text | Actual Runtime Reality | Resolution for F5 |
| :--- | :--- | :--- | :--- |
| **Delta Captions** (§33.5) | Mentions `+N this month` delta captions on user stat cards. | The backend summary and listing endpoints do not compute or return monthly deltas. | **Do not fabricate**. Render clean stat cards with exact totals; omit delta badges. |
| **Status Counts for USER** (§14) | "Never fabricate per-status counts for a USER." | Verified: `JobController` has no status filter param, and `/dashboard/summary` 403s for USER. | **Enforce**: USER sees total datasets and total jobs only; status breakdowns are ADMIN-only. |
| **Dataset Name in Jobs** (§33.5) | Mentions "Dataset" column in recent jobs table. | `JobResponse` contains `datasetId`, not `datasetName`. | **Follow F4 pattern**: Resolve from TanStack Query dataset cache, falling back to `Dataset #{id}`. |
| **Owner in Admin Recent Jobs** (§33.5) | Mentions `Owner` column in recent jobs for ADMIN. | `JobResponse` DTO does not contain `owner` or `ownerId`. | **Do not invent fields**: Omit owner column; display verified fields (`Job ID`, `Dataset`, `Status`, `Progress`, `Submitted At`). |
| **Route Guard** (§15 vs §14) | §15 listed `/dashboard` under `Protected, ADMIN only`, whereas §14 and §33.5 define a dual-role page. | `RequireRole role="ADMIN"` currently prevents USER from seeing the user overview. | **Lift guard**: Allow both roles to access `/dashboard` and branch within `DashboardPage`. |

---

## 13. Recommended F5 implementation shape

### Module Structure
```
frontend/src/features/dashboard/
├── api.ts                         # getDashboardSummary()
├── types.ts                       # DashboardSummaryResponse
├── queries.ts                     # dashboardKeys, useDashboardSummary()
├── index.ts                       # public exports
├── components/
│   ├── AdminSummaryCards.tsx      # Total datasets + per-status counts
│   ├── UserOverviewCards.tsx       # Total datasets + total jobs
│   └── RecentJobsCard.tsx         # 5 recent jobs with status & progress
└── pages/
    └── DashboardPage.tsx          # Role-branching page + manual refresh
```

### Key Behaviors
1. **`useDashboardSummary()`**:
   ```typescript
   export function useDashboardSummary() {
     const { user } = useAuth();
     return useQuery({
       queryKey: dashboardKeys.summary(),
       queryFn: getDashboardSummary,
       enabled: user?.role === 'ADMIN',
       staleTime: 30 * 1000,
     });
   }
   ```
2. **`UserOverviewCards`**:
   - Queries `useDatasets({ page: 0, size: 1 })` → `data?.totalElements ?? 0`.
   - Queries `useJobs({ page: 0, size: 1 })` → `data?.totalElements ?? 0`.
3. **`RecentJobsCard`**:
   - Shared between both views.
   - Queries `useJobs({ page: 0, size: 5, sort: 'submittedAt,desc' })`.
   - Includes "View all jobs →" navigation link to `/jobs`.
4. **Manual Refresh**:
   - Single "Refresh" button in header with loading spinner when `isFetching`.
   - Triggers TanStack Query invalidation on active queries.

---

## 14. Explicit non-goals

- No heavy chart or graphing libraries (Recharts, Chart.js, etc.).
- No client-side simulation or guessing of per-status job counts for non-admin users.
- No client-side generation of periodic percentage delta captions ("+12% this week").
- No polling on `/dashboard/summary` (relies on 30s `staleTime` and manual refresh).
- No direct `fetch` calls inside React components.
- No global state management libraries (Redux, Zustand, etc.).
- No changes to backend production code or database schemas.
