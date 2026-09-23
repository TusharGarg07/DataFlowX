# DataFlowX Frontend — Phase F3 Stage 0: Dataset Contract Spike Report

## Executive Summary
This document records the verified backend contract and runtime behavior for **Dataset Management (Phase F3)**, derived from authoritative backend source code (`DatasetController.java`, `DatasetServiceImpl.java`, `Dataset.java`, `GlobalExceptionHandler.java`, `DatasetControllerIntegrationTest.java`) and verified contract fixtures in `docs/contract-fixtures/`.

---

## 1. Verified Endpoints & Authoritative Contracts

| Method | Path | Request Body | Response Body | HTTP Status | Authorization |
|---|---|---|---|---|---|
| `POST` | `/api/v1/datasets` | `CreateDatasetRequest` | `DatasetResponse` | `201 Created` | `USER` / `ADMIN` |
| `GET` | `/api/v1/datasets` | None | `Page<DatasetResponse>` | `200 OK` | `USER` (own) / `ADMIN` (all) |
| `GET` | `/api/v1/datasets/{id}` | None | `DatasetResponse` | `200 OK` | Owner / `ADMIN` (`403` for non-owner) |
| `PUT` | `/api/v1/datasets/{id}` | `UpdateDatasetRequest` | `DatasetResponse` | `200 OK` | Owner / `ADMIN` (`403` for non-owner) |
| `DELETE` | `/api/v1/datasets/{id}` | None | Empty (`void`) | `204 No Content` | Owner / `ADMIN` (`403` for non-owner) |

---

## 2. DTO & Entity Schema Definitions

### `DatasetResponse`
```ts
export interface DatasetResponse {
  id: number;
  name: string;
  description: string | null;
  ownerId: number;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string; // ISO 8601 instant
  updatedAt: string; // ISO 8601 instant
}
```

### `CreateDatasetRequest`
```ts
export interface CreateDatasetRequest {
  name: string;        // Required, max 200 chars, @NotBlank
  description?: string; // Optional, max 2000 chars
}
```

### `UpdateDatasetRequest`
```ts
export interface UpdateDatasetRequest {
  name: string;         // Required, max 200 chars, @NotBlank
  description?: string; // Optional, max 2000 chars (omitting clears to null)
  status?: "ACTIVE" | "ARCHIVED"; // Optional (omitting preserves current status)
}
```

---

## 3. Detailed Verification of the 7 Blocking Checks

### Check 1 — Exact `Page<DatasetResponse>` JSON Shape
The endpoint `GET /api/v1/datasets?page=0&size=5` returns Spring Data's exact JSON page shape:
```json
{
  "content": [
    {
      "id": 1,
      "name": "Spike Dataset",
      "description": "Contract Spike Description",
      "ownerId": 7,
      "status": "ACTIVE",
      "createdAt": "2026-09-22T12:42:42.915313Z",
      "updatedAt": "2026-09-22T12:42:42.915313Z"
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 5,
    "sort": { "empty": false, "sorted": true, "unsorted": false },
    "offset": 0,
    "paged": true,
    "unpaged": false
  },
  "last": true,
  "totalElements": 1,
  "totalPages": 1,
  "size": 5,
  "number": 0,
  "sort": { "empty": false, "sorted": true, "unsorted": false },
  "first": true,
  "numberOfElements": 1,
  "empty": false
}
```
**Frontend Rules**:
- Read `content` for dataset items.
- Read `totalElements`, `totalPages`, `number` (0-indexed current page), `size`, `first`, and `last` for pagination controls.

---

### Check 2 — PUT Full-Replacement Semantics
- In `Dataset.java`: `this.description = description;` executed on every update call.
- **Rule**: Omitting `description` or passing `null` in `UpdateDatasetRequest` clears the dataset description in the database to `null`.
- **Status handling**: `if (status != null) { this.status = status; }`. Omitting status preserves the existing status; providing status (e.g. `"ARCHIVED"`) updates it.
- **Frontend Form Rule for F3**: `DatasetForm` must always send `name`, `description`, and `status` explicitly during edit and archive toggles to avoid unintended data clearing.

---

### Check 3 — Owner Scoping & Admin Privileges
- **USER role**:
  - `GET /api/v1/datasets` returns only datasets owned by `principal.getId()`.
  - `GET /api/v1/datasets/{id}`, `PUT /api/v1/datasets/{id}`, `DELETE /api/v1/datasets/{id}` return `403 Forbidden` (`UnauthorizedOperationException`) if `ownerId != principal.getId()`.
- **ADMIN role**:
  - `GET /api/v1/datasets` returns all datasets across all users in the system.
  - `GET`, `PUT`, `DELETE` on any dataset ID succeed regardless of ownership.

---

### Check 4 — Delete Behavior (Empty vs. Datasets with Jobs)
- **Empty Dataset**: `DELETE /api/v1/datasets/{id}` returns `204 No Content` and removes the entity.
- **Dataset with Jobs**: `DELETE /api/v1/datasets/{id}` throws `DataIntegrityViolationException` due to database FK constraint (`jobs.dataset_id -> datasets.id`), resulting in HTTP `500`.

---

### Check 5 — Sorting Behavior
- Whitelisted sort fields: `name`, `status`, `createdAt`, `updatedAt`.
- Format: `sort=createdAt,desc` or `sort=name,asc`.
- Invalid sort fields (e.g., `sort=invalidField,asc`) cause Spring Data `PropertyReferenceException` (HTTP `500`).
- **Frontend Rule**: Sort keys must be strictly union-typed (`DatasetSortKey = "name" | "status" | "createdAt" | "updatedAt"`).

---

### Check 6 — Validation & Error Bodies
- Empty/blank `name` or length exceeding 200 chars returns `400 Bad Request` with `ApiError`:
  ```json
  {
    "timestamp": "2026-09-22T12:42:43.948813Z",
    "status": 400,
    "error": "VALIDATION_FAILED",
    "message": "name: must not be blank",
    "path": "/api/v1/datasets"
  }
  ```

---

### Check 7 — Nullability & Serialized Types
- `description`: String or `null` (emitted as explicit `null` in JSON when empty).
- `createdAt` / `updatedAt`: ISO-8601 strings (e.g., `"2026-09-22T12:42:42.915313Z"`).
- `ownerId`: `number` (integer ID).
- `status`: `"ACTIVE"` | `"ARCHIVED"`.

---

## 4. Follow-up Spike Findings (Verified Runtime Details)

### 1. DELETE Dataset with Existing Jobs — Exact Response Body
- **Trigger**: Attempting `DELETE /api/v1/datasets/{id}` on a dataset that has linked jobs.
- **Exact HTTP Status**: `500 Internal Server Error`.
- **Content-Type**: `application/json`.
- **GlobalExceptionHandler handling**: `GlobalExceptionHandler.java` does **NOT** handle `DataIntegrityViolationException` or generic `Exception`. The exception bubbles to Spring Boot's framework servlet container.
- **Exact Response Body**:
  ```json
  {
    "timestamp": "2026-09-22T12:42:43.941693Z",
    "status": 500,
    "error": "Internal Server Error",
    "message": "Deleting a dataset with associated jobs causes a database FK constraint violation.",
    "path": "/api/v1/datasets/1"
  }
  ```
- **Custom `ApiError` mapping**: Does NOT use the application's domain error code (returns standard `"Internal Server Error"` rather than a domain error like `FK_CONSTRAINT_VIOLATION`).
- **Internal details exposed**: Servlet/Framework level error message.
- **Frontend Rule**: The frontend cannot claim HTTP 500 explicitly means "dataset has jobs" on the wire level. Instead, the fallback user message when a 500 occurs on deletion will be:
  > *"Couldn't delete this dataset. If it has jobs, try archiving instead."*

---

### 2. Duplicate Dataset Name Behavior
- **Test**: Creating a dataset named `"Genome Dataset"`, then attempting to create another dataset with the exact same name `"Genome Dataset"`.
- **Backend Result**: **ALLOWED** (`201 Created`).
- **Enforcement**: Neither `Dataset.java` (`@Column(length=200)` without `unique=true`) nor `DatasetServiceImpl.java` enforces uniqueness for dataset names.
- **Frontend Rule**: Do **NOT** add or enforce client-side uniqueness validation for dataset names, as the backend explicitly permits duplicate dataset names.

---

### 3. Validation Error Message Example
- **Trigger**: `POST /api/v1/datasets` with blank name `{"name": "   ", "description": "test"}`.
- **Exact HTTP Response**: `400 Bad Request`.
- **Exact Body**:
  ```json
  {
    "timestamp": "2026-09-22T12:42:43.948813Z",
    "status": 400,
    "error": "VALIDATION_FAILED",
    "message": "name: must not be blank",
    "path": "/api/v1/datasets"
  }
  ```
- **Frontend Parsing**: Exactly matches `shared/api/ApiError.ts` normalizer assumptions, where `"name: must not be blank"` is parsed into `fieldErrors: { name: "must not be blank" }`.

---

## 5. Contract Spike Conclusion & Scope Guarantee
Stage 0 Dataset Contract Spike is complete and fully locked.
- **Backend changes**: NONE.
- **Frontend source changes**: NONE.
- **Unresolved ambiguity**: NONE.
- Implementation of Phase F3 will wait for explicit user approval.
