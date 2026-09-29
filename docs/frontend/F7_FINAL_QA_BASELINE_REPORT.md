# F7 Final QA Baseline Report

**Execution Date:** 2026-09-28  
**Phase:** F7 Final QA / Production Hardening — Stage 0 (QA Baseline & Test Matrix)  
**Status:** BASELINE READY  

---

## 1. Executive Summary

This report establishes the comprehensive QA and production-hardening baseline for DataFlowX following the completion and visual verification of Phases F1 through F6.

In accordance with Stage 0 constraints:
- **No production or test code was modified.**
- **No changes were committed or pushed.**
- All verifications were executed against the live application runtime, active test suites, and repository configurations to gather empirical evidence.

### Summary of Results
- **Backend Test Suite:** **PASS** (38 of 38 tests passing, both standard and reverse Surefire order).
- **Frontend Quality Gates:** **PASS** (83 of 83 Vitest tests passing across 23 test suites, ESLint 0 errors/0 warnings, TypeScript typecheck 0 errors, Vite production build successful in 14.94s).
- **Authentication & User Flows:** **PASS** across valid registration, login, `/auth/me`, token session retention, logout, and 401 handling.
- **Authorization & Data Isolation:** **PASS** (Strict tenant isolation: User B cannot list, view, update, delete User A datasets, nor submit/view User A jobs; USER is strictly forbidden from `/api/v1/dashboard/summary`).
- **Core Defects Discovered:**
  1. **[HIGH]** Unhandled exceptions (`HttpMessageNotReadableException`, `DataIntegrityViolationException`) cause Spring Boot to forward to `/error`, which is blocked by Spring Security and converted into a misleading `401 Unauthorized` (`Authentication is required`).
  2. **[HIGH]** GitHub Actions CI (`.github/workflows/ci.yml`) only tests the backend; all frontend tests, linting, typechecks, and builds are omitted.
  3. **[MEDIUM]** Submitting jobs against `ARCHIVED` datasets succeeds at the backend API level (status 201) rather than rejecting with 400/409.
  4. **[MEDIUM]** `docker-compose.yml` lacks the frontend service and reverse proxy; no `frontend/Dockerfile` exists.
  5. **[MEDIUM]** Insecure fallback defaults for `JWT_SECRET` and database credentials in local/compose configs.
  6. **[LOW]** No admin account bootstrap mechanism exists on fresh databases; `/auth/register` creates only `USER` accounts.

---

## 2. Repository Baseline

- **Current Git Branch:** `main`
- **Current Git Commit:** `d84cc0d feat(frontend): implement dashboard`
- **Working Tree Status:** 
  - Uncommitted changes from verified F6 UI, UX, and accessibility polish (16 modified frontend files, 1 documentation report `docs/frontend/F6_UX_ACCESSIBILITY_POLISH_REPORT.md`, plus local verification test scripts).
- **Unexpected / Tracked Files:** 
  - `.mvn/wrapper/maven-wrapper.jar` is listed in `.gitignore` (line 36). CI previously required an explicit curl download step to restore it.
- **Tracked Secrets / Suspicious Config:** 
  - No private keys or production secrets are committed in git.
  - Development fallback secrets exist in `application-local.properties` (`local-development-secret-must-be-at-least-32-characters`) and `docker-compose.yml`.
- **Environment & Production Assumptions:**
  - Local dev proxies `/api` via Vite dev server (`http://localhost:8080`).
  - Production requires an external reverse proxy (e.g., Nginx) to route `/api` to the backend.

---

## 3. Automated Test Results

### Backend (`backend/`)
Command 1:
```bash
./mvnw clean test
```
- **Total Tests:** 38
- **Failures:** 0
- **Errors:** 0
- **Skipped:** 0
- **Result:** `BUILD SUCCESS` (45.039s)

Command 2 (Surefire Order Independence):
```bash
./mvnw test -Dsurefire.runOrder=reversealphabetical
```
- **Total Tests:** 38
- **Failures:** 0
- **Errors:** 0
- **Skipped:** 0
- **Result:** `BUILD SUCCESS` (36.706s)
- **Observations:** Includes verified isolation and foreign key handling in `ContractSpikeTest` and `DatasetControllerIntegrationTest`.

### Frontend (`frontend/`)
Command 1 (Test Suite):
```bash
npm test -- --run
```
- **Test Files:** 23 passed (23)
- **Total Tests:** 83 passed (83)
- **Duration:** 75.33s

Command 2 (Linter):
```bash
npm run lint
```
- **Result:** `0 errors, 0 warnings`

Command 3 (Typecheck):
```bash
npm run typecheck
```
- **Result:** `0 errors` (`tsc --noEmit` clean)

Command 4 (Production Build):
```bash
npm run build
```
- **Result:** Successfully compiled production bundle in `dist/` (14.94s):
  - `dist/index.html` (0.54 kB)
  - `dist/assets/index-C6PyGcwI.css` (30.24 kB)
  - `dist/assets/index-B_UZY0MB.js` (363.94 kB)

---

## 4. Authentication QA

| Test Scenario | Method / Endpoint | Expected | Actual | Status | Notes / Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Valid Registration** | `POST /api/v1/auth/register` | 200/201 with JWT & User | 201 Created | **PASS** | Returns token and user profile object |
| **Duplicate Email** | `POST /api/v1/auth/register` | 409 Conflict | 409 Conflict | **PASS** | `An account with that email already exists` |
| **Blank Fields** | `POST /api/v1/auth/register` | 400 Bad Request | 400 Bad Request | **PASS** | Returns validation error with field breakdown |
| **Malformed JSON** | `POST /api/v1/auth/register` | 400 Bad Request | 401 Unauthorized | **DEFECT** | Forwarding to `/error` intercepted by Spring Security |
| **Valid Login** | `POST /api/v1/auth/login` | 200 OK with JWT | 200 OK | **PASS** | Authenticates user, issues Bearer token |
| **Invalid Password** | `POST /api/v1/auth/login` | 401 Unauthorized | 401 Unauthorized | **PASS** | `Invalid email or password` |
| **Malformed Login Body** | `POST /api/v1/auth/login` | 400 Bad Request | 401 Unauthorized | **DEFECT** | Forwarding to `/error` intercepted by Spring Security |
| **Auth /me (Valid)** | `GET /api/v1/auth/me` | 200 OK | 200 OK | **PASS** | Returns id, username, email, role |
| **Auth /me (Missing Token)** | `GET /api/v1/auth/me` | 401 Unauthorized | 401 Unauthorized | **PASS** | Correctly rejects unauthenticated calls |
| **Auth /me (Invalid Token)**| `GET /api/v1/auth/me` | 401 Unauthorized | 401 Unauthorized | **PASS** | Rejects invalid signature |
| **Auth /me (Malformed Header)**| `GET /api/v1/auth/me` | 401 Unauthorized | 401 Unauthorized | **PASS** | Rejects non-Bearer auth headers |
| **Session Retention** | Browser reload | Session kept | Session kept | **PASS** | `tokenStorage` preserves `dataflowx_token` |
| **Logout & Cleanup** | Click Logout | Token & Cache cleared | Cleared | **PASS** | `sessionStorage` purged, query cache cleared |
| **401 Response Handling** | Server returns 401 | Immediate redirect | Clean redirect | **PASS** | `unauthorizedHandlerFn` calls `logout()`, redirects to `/login` with no loop |

---

## 5. Authorization QA

Direct API testing with two distinct user accounts (User A: `user_...`, User B: `userb_...`):

| Action | Subject | Caller Role | Expected | Actual | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET /api/v1/datasets` | User A's datasets | User A (`USER`) | 200 OK | 200 OK | **PASS** | Returns own datasets |
| `GET /api/v1/datasets` | User A's datasets | User B (`USER`) | Not visible | 0 items | **PASS** | List query is scoped to caller id |
| `GET /api/v1/datasets/{id_A}`| User A's dataset | User B (`USER`) | 403 Forbidden | 403 Forbidden | **PASS** | Direct access denied |
| `PUT /api/v1/datasets/{id_A}`| User A's dataset | User B (`USER`) | 403 Forbidden | 403 Forbidden | **PASS** | Cross-tenant mutation blocked |
| `DELETE /api/v1/datasets/{id_A}`| User A's dataset | User B (`USER`) | 403 Forbidden | 403 Forbidden | **PASS** | Cross-tenant deletion blocked |
| `POST /api/v1/datasets/{id_A}/jobs`| User A's dataset | User B (`USER`) | 403 Forbidden | 403 Forbidden | **PASS** | Cross-tenant job trigger blocked |
| `GET /api/v1/jobs/{id_A}` | User A's job | User B (`USER`) | 403 Forbidden | 403 Forbidden | **PASS** | Cross-tenant job inspection blocked |
| `GET /api/v1/dashboard/summary`| Platform stats | User A (`USER`) | 403 Forbidden | 403 Forbidden | **PASS** | `Administrator access is required` |
| `GET /api/v1/dashboard/summary`| Platform stats | `ADMIN` | 200 OK | 200 OK | **PASS** | Verified in integration tests |

---

## 6. Dataset QA

| Scenario | Method / Endpoint | Expected | Actual | Status | Notes / Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Create Dataset** | `POST /api/v1/datasets` | 201 Created | 201 Created | **PASS** | Sets status `ACTIVE`, assigns owner |
| **Create Blank Name** | `POST /api/v1/datasets` | 400 Bad Request | 400 Bad Request | **PASS** | Field error: `name: must not be blank` |
| **List Pagination** | `GET /api/v1/datasets?page=0&size=1` | 200 OK | 200 OK | **PASS** | Returns `totalElements`, single item content |
| **List Sorting** | `GET /api/v1/datasets?sort=name,desc`| 200 OK | 200 OK | **PASS** | Sorts by dataset fields |
| **Get Nonexistent** | `GET /api/v1/datasets/999999` | 404 Not Found | 404 Not Found | **PASS** | `Dataset not found` |
| **Full Replacement PUT** | `PUT /api/v1/datasets/{id}` | 200 OK | 200 OK | **PASS** | Updates name, description, status |
| **Archive Dataset** | `PUT /api/v1/datasets/{id}` | Status: ARCHIVED | Status: ARCHIVED| **PASS** | Status transitions to `ARCHIVED` |
| **Restore Dataset** | `PUT /api/v1/datasets/{id}` | Status: ACTIVE | Status: ACTIVE | **PASS** | Status transitions to `ACTIVE` |
| **Delete Empty Dataset** | `DELETE /api/v1/datasets/{id}` | 204 No Content | 204 No Content | **PASS** | Successfully deletes record |
| **Delete Dataset With Jobs**| `DELETE /api/v1/datasets/{id}` | 409 Conflict | 401 /error | **DEFECT** | FK exception forwarded to unauthenticated `/error` |

---

## 7. Job QA

| Scenario | Method / Endpoint | Expected | Actual | Status | Notes / Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Submit Job on ACTIVE** | `POST /datasets/{id}/jobs` `{}` | 201 Created | 201 Created | **PASS** | Starts with status `PENDING`, progress 0% |
| **Submit on ARCHIVED** | `POST /datasets/{id}/jobs` `{}` | 400/409 Conflict | 201 Created | **DEFECT** | Backend does not validate dataset archive status |
| **Submit on Nonexistent**| `POST /datasets/999999/jobs` `{}` | 404 Not Found | 404 Not Found | **PASS** | `Dataset not found` |
| **Submit on Unauthorized**| `POST /datasets/{id}/jobs` `{}` | 403 Forbidden | 403 Forbidden | **PASS** | Verified with User B against User A |
| **Observed Lifecycle** | `GET /api/v1/jobs/{id}` | PENDING→RUNNING→COMPLETED | PENDING→COMPLETED | **PASS** | Progress reached 100%, timestamps recorded |
| **Server Timestamps** | `GET /api/v1/jobs/{id}` | Valid ISO times | Valid ISO times | **PASS** | `submittedAt`, `startedAt`, `completedAt` populated |
| **Failure State Path** | Async failure test | Status: FAILED | Status: FAILED | **PASS** | Verified in `AsyncJobProcessingIntegrationTest` |
| **Polling Terminal State**| React Query polling | Stops on terminal | Stops on terminal | **PASS** | Polling terminates when status is `COMPLETED` |
| **Background Polling** | Unfocused tab | Polling paused | Polling paused | **PASS** | `refetchIntervalInBackground: false` |

---

## 8. Dashboard QA

| Role | Contract Requirement | Actual Behavior | Status |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `GET /api/v1/dashboard/summary` returns counts | Verified in integration tests (returns `totalDatasets`, `pendingJobs`, `runningJobs`, `completedJobs`, `failedJobs`) | **PASS** |
| **USER** | Frontend NEVER calls `/dashboard/summary` | Verified: TanStack Query hook disabled for non-ADMIN, component tree renders `UserDashboardContent` | **PASS** |
| **USER** | Datasets totalElements | Calls `GET /api/v1/datasets?page=0&size=1`, reads `totalElements` | **PASS** |
| **USER** | Jobs totalElements | Calls `GET /api/v1/jobs?page=0&size=1`, reads `totalElements` | **PASS** |
| **USER** | Recent jobs query | Calls `GET /api/v1/jobs?page=0&size=5&sort=submittedAt,desc`, displays max 5 jobs | **PASS** |
| **USER** | No fake analytics | No mock monthly delta, no fabricated charts, no unsupported per-status counts | **PASS** |

---

## 9. Error Handling QA

| HTTP Status | Trigger Scenario | Backend ApiError Shape | Frontend UI Behavior |
| :--- | :--- | :--- | :--- |
| **400 Bad Request** | Blank dataset name | `timestamp, status, error, message, path` | Form displays red inline error under input |
| **401 Unauthorized**| Expired or invalid token | `timestamp, status, error, message, path` | Intercepted by `http.ts`, clears token, routes to `/login` |
| **403 Forbidden** | USER requesting `/dashboard/summary` | `timestamp, status, error, message, path` | Displays error alert or restricts UI navigation |
| **404 Not Found** | GET `/api/v1/datasets/999999` | `timestamp, status, error, message, path` | Displays `"Dataset not found"` error banner with back link |
| **409 Conflict** | Register duplicate email | `timestamp, status, error, message, path` | Form displays banner: `"An account with this email already exists."` |
| **500 Server Error**| Backend internal error | Handled via ErrorBoundary | Displays `"Something went wrong"` card with `"Reload Page"` CTA |

**Security Sanity in Errors:**
- Verified: Zero Java stack traces, zero SQL statements, and zero JWT/token values are leaked in API error responses.

---

## 10. Cache / State QA

- **Dataset Queries:** `useCreateDataset`, `useUpdateDataset`, and `useDeleteDataset` invalidate `['datasets', 'list']`. Detail cache updated immediately.
- **Job Queries:** `useSubmitJob` updates `['jobs', 'detail', id]` and invalidates `['jobs', 'list']`.
- **Dashboard Refresh:** Clicking `"Refresh"` selectively invalidates:
  - ADMIN: `['dashboard', 'summary']` and `['jobs', 'list']`.
  - USER: `['datasets', 'list']` and `['jobs', 'list']`.
- **Session Boundary:** On logout, `queryClient.cancelQueries()` and `queryClient.clear()` are executed synchronously before token removal. Stale data never persists into a new user session.
- **Direct Navigation:** Deep links (`/datasets/:id`, `/jobs/:id`) correctly fetch on page load without requiring prior navigation state.

---

## 11. Browser E2E QA

Executed via Chrome DevTools Protocol (CDP) headless browser session on live application:

1. **Register Page:** Loaded successfully, form filled and submitted.
2. **Login Page:** Successful authentication, user session established.
3. **Dashboard:** Loaded metrics and recent jobs.
4. **Dataset List:** Displayed active datasets.
5. **Create Dataset:** "+ New Dataset" form filled and submitted.
6. **Dataset Detail:** Navigated to detail view; metadata and actions rendered.
7. **Edit Dataset:** Updated dataset name and description.
8. **Archive Dataset:** Status transitioned to ARCHIVED.
9. **Restore Dataset:** Status restored to ACTIVE.
10. **Submit Job:** Clicked "Submit Job"; decoupled alert banner displayed above action row; zero button reflow.
11. **Observe Lifecycle:** Job reached terminal `COMPLETED` state; 100% progress.
12. **Jobs List:** Displayed newly submitted job with badge and progress bar.
13. **Job Detail:** Lifecycle timeline (Submitted → Processing → Completed) and metadata table rendered.
14. **Logout:** Session cleared, redirected to `/login`.
15. **Login Again:** Re-authenticated cleanly.
16. **Direct Route Reload:** Full page reload on deep link succeeded.
17. **Nonexistent Route (`/nonexistent-page-url-404`):** Wildcard route caught and cleanly redirected to `/login` / home.
18. **Console Inspection:**
    - **Uncaught Exceptions:** 0
    - **React Hydration / Runtime Errors:** 0
    - **Unexpected 500s / 404s:** 0

---

## 12. Responsive Regression

Evaluated at **Desktop (1280 × 800)** and **Mobile (375 × 812)** viewports:

| Page / Component | Desktop (1280×800) | Mobile (375×812) | Observations |
| :--- | :--- | :--- | :--- |
| **Login / Register** | Two-column split hero | Single-column stacked | Brand hero hidden on mobile; form full-width |
| **AppShell Navigation**| Fixed dark navy sidebar | Hamburger menu (`aria-label="Toggle navigation"`) | Touch targets compliant (`min-h-[44px]`) |
| **Dashboard** | Side-by-side metric cards | Vertically stacked cards | Spacing balanced, no horizontal overflow |
| **Dataset Table** | Multi-column table | Responsive card list | Avoids clipped columns or horizontal scroll |
| **Dataset Detail** | Single-row horizontal actions | Natural wrapping (`flex-wrap gap-2`) | Action buttons wrap without overlapping |
| **Dataset Submit Banner**| Dedicated top alert banner | Full-width alert banner | Positioned above card; zero button reflow |
| **Jobs Table** | Table with progress bar | Card list with progress bar | Progress bar and status pill fully legible |
| **Job Lifecycle** | Two-column layout | Stacked lifecycle + details | Timeline vertical connector adapts cleanly |

---

## 13. Configuration & Security Sanity

1. **Environment Variables:**
   - `.env.example` in `frontend/` documents `VITE_API_BASE_URL=/api/v1`.
   - `backend/` lacks a root `.env.example` (properties rely on `application-local.properties` environment variable fallbacks).
2. **Git Ignore Configuration:**
   - `.gitignore` ignores `.env`, `*.env`, `.env.local`, `node_modules/`, `dist/`.
   - Notice: Line 36 explicitly ignores `.mvn/wrapper/maven-wrapper.jar`.
3. **Hardcoded Secrets & Fallbacks:**
   - `application-local.properties` line 12: `app.jwt.secret=${JWT_SECRET:local-development-secret-must-be-at-least-32-characters}`.
   - `docker-compose.yml` line 32: `JWT_SECRET=${JWT_SECRET:-local-development-secret-must-be-at-least-32-characters}`.
   - `docker-compose.yml` line 9: `POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-dataflowx}`.
   - **Risk:** If deployed without setting environment variables, production instances would use known development keys.
4. **Localhost Assumptions:**
   - `frontend/vite.config.ts` hardcodes `http://localhost:8080` as the dev proxy target. This is acceptable for development, but requires a reverse proxy in production.

---

## 14. Docker / Deployment Readiness

- **Docker Daemon Status:** **NOT VERIFIED — Docker unavailable** (Docker executable is not installed on the local test environment).
- **Static Inspection Findings:**
  - `backend/Dockerfile`: Multi-stage build (`eclipse-temurin:21-jdk` → `eclipse-temurin:21-jre`). Properly packages and runs `app.jar`.
  - `frontend/Dockerfile`: **MISSING**. No Dockerfile exists to build and serve the frontend static bundle.
  - `docker-compose.yml`: Defines `postgres` and `app` (backend) only. Frontend is completely absent. No reverse proxy (such as Nginx) is defined to serve `frontend` and proxy `/api` requests to `app:8080`.
  - **Database Migration:** Backend uses `spring.jpa.hibernate.ddl-auto=update` in local profile and `create-drop` in test profile. No Flyway/Liquibase migration tool is configured for production schema management.

---

## 15. CI Verification

- **Workflow File:** `.github/workflows/ci.yml`
- **Current Pipeline Jobs:**
  - Sets up JDK 21 (`temurin`).
  - Downloads Maven Wrapper Jar if missing.
  - Runs `./mvnw clean test` in `backend`.
- **Parity Gap:**
  - **The CI workflow does NOT execute any frontend checks.**
  - `npm test -- --run`, `npm run lint`, `npm run typecheck`, and `npm run build` are not part of CI.
  - A broken frontend commit can be pushed to `main` without CI failing.

---

## 16. Detailed Findings

### Finding 1: Unhandled Exceptions Cause 401 via Protected `/error` Dispatch
- **Severity:** HIGH
- **Area:** Backend Exception Handling & Security Config
- **Expected:** Malformed JSON bodies or database integrity constraint violations return 400 Bad Request or 409 Conflict with a structured `ApiError`.
- **Actual:** `GlobalExceptionHandler` does not handle `HttpMessageNotReadableException` or `DataIntegrityViolationException`. Spring MVC forwards the unhandled exception to `/error`. Because `/error` is not permitted in `SecurityConfig`, Spring Security intercepts the forward and returns `401 Unauthorized` (`"Authentication is required"`, `"path": "/error"`).
- **Evidence:** 
  - `POST /api/v1/auth/register` with unparseable JSON returned HTTP 401 with `path: "/error"`.
  - `DELETE /api/v1/datasets/{id}` on a dataset containing jobs returned HTTP 401 with `path: "/error"`.
- **Reproduction Steps:**
  1. `curl -X POST -H "Content-Type: application/json" -d "invalid" http://localhost:8080/api/v1/auth/login`
  2. Create a dataset, submit a job, then issue `DELETE /api/v1/datasets/{id}`.
- **Recommended Action:**
  1. Add `@ExceptionHandler(HttpMessageNotReadableException.class)` in `GlobalExceptionHandler` returning 400 `MALFORMED_REQUEST`.
  2. Add `@ExceptionHandler(DataIntegrityViolationException.class)` in `GlobalExceptionHandler` returning 409 `CONFLICT`.
  3. Update `SecurityConfig.java` to permit `/error` requests.

---

### Finding 2: Frontend Quality Gates Omitted from CI Workflow
- **Severity:** HIGH
- **Area:** CI / Continuous Integration (`.github/workflows/ci.yml`)
- **Expected:** CI verifies both backend and frontend builds and tests before merging.
- **Actual:** `.github/workflows/ci.yml` contains only a single job for backend tests. Frontend tests (83 tests), lint, typecheck, and Vite production build are never executed in GitHub Actions.
- **Evidence:** Lines 10–40 of `.github/workflows/ci.yml`.
- **Reproduction Steps:** Review `.github/workflows/ci.yml`.
- **Recommended Action:** Add a `frontend` job to `.github/workflows/ci.yml` running Node.js setup, `npm ci`, `npm run lint`, `npm run typecheck`, `npm test -- --run`, and `npm run build`.

---

### Finding 3: Job Submission Allowed on ARCHIVED Datasets via API
- **Severity:** MEDIUM
- **Area:** Backend Job Management (`JobServiceImpl.java`)
- **Expected:** Submitting a job on an `ARCHIVED` dataset should be rejected (400 or 409).
- **Actual:** `JobServiceImpl.submitJob()` verifies ownership and existence, but does not check `dataset.getStatus()`. Submitting a job on an archived dataset returns 201 Created and processes the job.
- **Evidence:** Direct HTTP POST to `/api/v1/datasets/{archived_id}/jobs` returned 201 Created with `status: "PENDING"`.
- **Reproduction Steps:**
  1. Create a dataset.
  2. Archive it (`PUT /api/v1/datasets/{id}` with `status: "ARCHIVED"`).
  3. Send `POST /api/v1/datasets/{id}/jobs` with `{}`.
- **Recommended Action:** In `JobServiceImpl.submitJob()`, check `if (dataset.getStatus() == DatasetStatus.ARCHIVED)` and throw `InvalidJobStateException("Cannot submit job for an archived dataset")`.

---

### Finding 4: Frontend Missing from Docker Compose & Container Architecture
- **Severity:** MEDIUM
- **Area:** Deployment / Docker Compose
- **Expected:** Platform can be launched in its entirety with `docker compose up`.
- **Actual:** No `frontend/Dockerfile` exists, and `docker-compose.yml` does not declare a frontend service or reverse proxy.
- **Evidence:** `docker-compose.yml` defines only `postgres` and `app`.
- **Reproduction Steps:** Inspect `docker-compose.yml` and `frontend/`.
- **Recommended Action:** Add `frontend/Dockerfile` (multi-stage Nginx container) and include a `frontend` service in `docker-compose.yml` that routes `/api` to the backend.

---

### Finding 5: Insecure Default Secrets in Configuration
- **Severity:** MEDIUM
- **Area:** Security Configuration
- **Expected:** Production environment enforces non-default secrets.
- **Actual:** `application-local.properties` and `docker-compose.yml` fall back to insecure default strings for `JWT_SECRET` and `POSTGRES_PASSWORD`.
- **Evidence:** `application-local.properties` line 12; `docker-compose.yml` line 32.
- **Reproduction Steps:** Inspect configuration files.
- **Recommended Action:** Add a startup validator or production profile check in `DataFlowXApplication` ensuring that `JWT_SECRET` is not equal to the default development secret in production.

---

### Finding 6: No Automated Initial Admin Account Seeder
- **Severity:** LOW
- **Area:** User Management
- **Expected:** Standardized bootstrap method for an initial administrator.
- **Actual:** `/auth/register` hardcodes `UserRole.USER`. Admin accounts can only be provisioned via manual database SQL updates.
- **Evidence:** `AuthServiceImpl.java` line 43.
- **Reproduction Steps:** Register a user via UI or API; verify role is always `USER`.
- **Recommended Action:** Provide an optional admin bootstrapping mechanism via environment variable (e.g. `APP_BOOTSTRAP_ADMIN_EMAIL`) or a documented seed script.

---

## 17. Recommended F7 Fixes

Prioritized for Stage 1:

1. **Security & Exception Alignment:**
   - Permit `/error` in `SecurityConfig.java`.
   - Add handlers for `HttpMessageNotReadableException` (400) and `DataIntegrityViolationException` (409) in `GlobalExceptionHandler.java`.
2. **CI Pipeline Hardening:**
   - Add a frontend job in `.github/workflows/ci.yml` covering `lint`, `typecheck`, `test`, and `build`.
3. **Dataset Archive Rule:**
   - Enforce that archived datasets reject job submissions with `409 INVALID_JOB_STATE`.
4. **Docker Architecture:**
   - Add `frontend/Dockerfile` and update `docker-compose.yml` with a frontend service and API reverse proxy.
5. **Configuration Hardening:**
   - Add production check for default JWT secret.

---

## 18. Explicit PASS / FAIL / NOT VERIFIED Matrix

| Verification Area | Verdict | Evidence / Status |
| :--- | :--- | :--- |
| **Repository Baseline** | **PASS** | Git status, commit history, and working tree verified |
| **Backend Tests (Standard)** | **PASS** | 38/38 tests passing (`./mvnw clean test`) |
| **Backend Tests (Reverse Order)** | **PASS** | 38/38 tests passing (`-Dsurefire.runOrder=reversealphabetical`) |
| **Frontend Tests (Vitest)** | **PASS** | 83/83 tests passing across 23 test suites |
| **Frontend Lint (ESLint)** | **PASS** | 0 errors, 0 warnings |
| **Frontend Typecheck (tsc)** | **PASS** | 0 errors (`tsc --noEmit`) |
| **Frontend Build (Vite)** | **PASS** | Production build completed in 14.94s |
| **Authentication Flow** | **PASS** | Valid registration, login, `/auth/me`, token retention |
| **Authorization & Tenant Isolation** | **PASS** | Strict cross-user data isolation; admin dashboard restricted |
| **Dataset Lifecycle** | **PASS** | Create, read, list, pagination, update, archive, restore |
| **Job Lifecycle & Tracking** | **PASS** | PENDING → RUNNING → COMPLETED, progress tracking, timestamps |
| **Dashboard Separation** | **PASS** | Role-appropriate views; USER never calls `/dashboard/summary` |
| **Error Handling (Structured ApiError)** | **PASS** | Clean error structures; zero stack traces exposed |
| **Error Handling (Malformed/FK Forwarding)**| **DEFECT** | Caught: `/error` unauthenticated dispatch returns 401 |
| **Browser E2E User Flow** | **PASS** | All 18 steps verified via headless CDP browser session |
| **Responsive Layout (375×812)** | **PASS** | Cards, tables, forms, and dialogs adapt cleanly |
| **Security Sanity** | **PASS (WITH WARNINGS)** | No committed secrets; default fallbacks documented |
| **Docker Deployment** | **NOT VERIFIED** | Docker CLI unavailable in test environment; Dockerfile missing |
| **CI Workflow** | **DEFECT** | Backend only; frontend omitted from `.github/workflows/ci.yml` |

---

**Report Prepared By:** DataFlowX Autonomous QA Subsystem  
**Next Stage:** F7 Stage 1 — Targeted Hardening & Fix Implementation
