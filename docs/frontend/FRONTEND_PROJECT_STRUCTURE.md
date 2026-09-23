# FRONTEND_PROJECT_STRUCTURE.md

## 1. Document metadata

| Field | Value |
|---|---|
| Project | DataFlowX — Research Data Processing Platform (frontend) |
| Document type | Implementation blueprint (architecture + phase plan) |
| Audience | An implementation agent building the frontend phase-by-phase |
| Backend status | Existing, complete, treated as source of truth. Frozen unless a change is separately approved. |
| Visual reference | Approved DataFlowX UI mockups (login, dashboard — user + admin, datasets list/detail, job detail, submit/success modals, mobile). See §33 for the full component-by-component spec and `dataflowx-ui-mockup.png` (shipped alongside this document). |
| Status | Locked pending F1 Contract Spike verification of items marked `UNVERIFIED`. Visual direction in §21/§33 is locked as-is (approved mockup), not subject to F1. |

This document does not contain implementation code and does not create the frontend project. It is the contract the implementation agent builds against. Every screen it describes must match the approved mockup pixel-for-pixel in structure and closely in styling (§33) — the mockup is the visual source of truth, this document is the behavioral/data source of truth.

---

## 2. Purpose

Define, before any frontend code is written:

- the exact backend contract the frontend may rely on
- the locked technology and architecture decisions
- the exact target project structure and ownership boundaries
- state, auth, routing, error-handling and testing rules
- the phase roadmap and the definition of done for each phase
- what must never be built, assumed, or faked

Anything not written here, or not confirmed during the F1 Contract Spike, is not a valid basis for implementation.

---

## 3. Source of truth (priority order)

1. Existing backend code and actual runtime API behavior (verified in F1)
2. The locked architecture decisions in this document
3. The prior frontend architecture review
4. Existing DataFlowX backend documentation (README, docs/)
5. Standard React/TypeScript conventions

If a decision here conflicts with actual backend behavior discovered in F1, backend behavior wins, and this document is corrected — not the other way around.

---

## 4. Backend contract summary

**Stack:** Java 21, Spring Boot, Spring Data JPA/Hibernate, PostgreSQL, Spring Security, JWT, Maven, Docker Compose, GitHub Actions. Modular monolith: `auth`, `dataset`, `job`, `dashboard`.

**Domain:** `User → Dataset → Job` (one owner per dataset, one dataset per job).

**Dataset status:** `ACTIVE`, `ARCHIVED`
**Job status:** `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`
**Valid job transitions:** `PENDING→RUNNING`, `PENDING→FAILED`, `RUNNING→COMPLETED`, `RUNNING→FAILED`. `COMPLETED`/`FAILED` are terminal — no transition out.

**Endpoints (base `/api/v1`, all except register/login require `Authorization: Bearer <JWT>`):**

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | Creates a `USER`. Returns `AuthResponse` (includes token). 409 on duplicate email. |
| POST | `/auth/login` | Returns `AuthResponse`. 401 on bad credentials. |
| GET | `/auth/me` | Returns `UserResponse` (id, username, email, role). Only source of role. |
| POST | `/datasets` | Owner-scoped create. |
| GET | `/datasets` | Paginated. `page`, `size`, `sort`. USER sees own datasets only; ADMIN sees all. |
| GET | `/datasets/{id}` | 404 if not found, 403 if not owner and not ADMIN. |
| PUT | `/datasets/{id}` | **Full replacement.** Omitted `description` clears it. Omitted `status` leaves status unchanged. `name` required. |
| DELETE | `/datasets/{id}` | Hard delete, 204 No Content. Behavior when the dataset has jobs is `UNVERIFIED — MUST BE CONFIRMED DURING F1 CONTRACT SPIKE`. |
| POST | `/datasets/{datasetId}/jobs` | Empty request body. Creates a `PENDING` job and triggers async processing. Backend does **not** block submission to an `ARCHIVED` dataset. |
| GET | `/jobs` | Paginated, `page`/`size` (size capped server-side at 100)/`sort` (`property,direction`, default `submittedAt,desc`). USER sees jobs for own datasets only; ADMIN sees all. No `status` or `datasetId` filter exists. |
| GET | `/jobs/{id}` | Returns full `JobResponse`. |
| GET | `/dashboard/summary` | **ADMIN only.** 403 for `USER`. |

**DTO shapes (hand-authored from backend code, not from Swagger):**

```ts
// AuthResponse
{ id: number; username: string; email: string; role: "USER" | "ADMIN"; token: string }

// UserResponse
{ id: number; username: string; email: string; role: "USER" | "ADMIN" }

// DatasetResponse
{
  id: number; name: string; description: string | null; ownerId: number;
  status: "ACTIVE" | "ARCHIVED"; createdAt: string; updatedAt: string; // ISO instants
}

// JobResponse
{
  id: number; datasetId: number; status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  progress: number; // 0-100
  submittedAt: string; startedAt: string | null; completedAt: string | null;
  errorMessage: string | null;
}
// NOTE: no datasetName field. Resolve dataset names client-side from cached dataset data if needed.

// DashboardSummaryResponse
{ totalDatasets: number; pendingJobs: number; runningJobs: number; completedJobs: number; failedJobs: number }

// Page<T> (Spring Data Page — exact field set to be confirmed in F1, expected shape below)
{ content: T[]; totalElements: number; totalPages: number; number: number; size: number; /* ...other Spring Page fields, ignore unless needed */ }

// ApiError (only for exceptions the backend explicitly maps)
{ timestamp: string; status: number; error: string; message: string; path: string }
```

**Known important facts:**

- The JWT carries only subject (email) and expiry — **no role**. Role always comes from `/auth/me`.
- There is no refresh-token endpoint. A session ends when the token expires; there is no silent renewal.
- The backend has no CORS configuration. The frontend must be deployed same-origin (see §5) rather than requesting a backend change.
- Job processing is asynchronous and, under normal backend configuration, completes in roughly 150 ms. **Do not build or fake live intermediate progress animation** — real progress values may never be observed by a poll.
- Controlled `FAILED` outcomes are driven by a backend property (`app.job.processing.failure-dataset-name`) matching a dataset's name; this is an environment/demo concern, not a frontend feature.
- Swagger/OpenAPI is not a reliable contract source for this build (the running backend advertises it, but no OpenAPI generator dependency is present in this codebase) — do not generate types from it.
- Backend error responses are not guaranteed to be uniform: handled domain exceptions return `ApiError`; framework-level failures (e.g., malformed pagination input) may return Spring Boot's default error body instead. Both shapes must be handled (see §18).

**Everything below marked `UNVERIFIED — MUST BE CONFIRMED DURING F1 CONTRACT SPIKE` must be confirmed against the running backend before the corresponding UI ships:**

- Exact `Page<T>` JSON field set returned by this backend version.
- `DELETE /datasets/{id}` behavior when the dataset has jobs (success, 409, or 500).
- Behavior of an invalid/unknown `sort` property on `GET /datasets` or `GET /jobs`.
- Exact JSON body of a 401 (login failure) vs. a 401 (missing/expired token) — confirm both use `ApiError`.
- Exact JSON body of a 403.
- Exact JSON body of a validation failure (`400`) — confirm the flattened `"field: msg; field: msg"` message format.
- Whether `null` fields (e.g., `description`, `startedAt`, `completedAt`, `errorMessage`) are emitted as JSON `null` or omitted entirely.
- Real observed job timing distribution (confirm ~150 ms assumption and whether it is consistent across environments).

---

## 5. Deployment architecture (locked)

Same-origin. No CORS change to the backend.

```
Development:
  React (Vite dev server) → Vite dev-server proxy for /api/* → Spring Boot (localhost:8080)

Production:
  Nginx
   ├── serves built React static assets
   └── proxies /api/* → Spring Boot service
```

The frontend never targets a cross-origin backend URL in any environment. This constraint is why CORS is out of scope for this project.

---

## 6. Project structure (exact target tree)

```
frontend/
├── public/
├── src/
│   ├── app/
│   │   ├── providers/          # QueryClientProvider, AuthProvider, ToastProvider composition
│   │   ├── router/              # route table, lazy imports, route guards wiring
│   │   └── App.tsx               # top-level composition only
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── api.ts             # login, register, getCurrentUser — typed fetch calls only
│   │   │   ├── AuthProvider.tsx   # holds token + user + status, exposes useAuth()
│   │   │   ├── tokenStorage.ts    # sole owner of sessionStorage access for the token
│   │   │   ├── guards.tsx         # <RequireAuth>, <RequireRole role="ADMIN">
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   └── RegisterPage.tsx
│   │   │   └── types.ts           # AuthResponse, UserResponse, LoginRequest, RegisterRequest
│   │   │
│   │   ├── datasets/
│   │   │   ├── api.ts             # getDatasets, getDataset, createDataset, updateDataset, deleteDataset
│   │   │   ├── queries.ts         # query key factory + useQuery/useMutation hooks
│   │   │   ├── components/
│   │   │   │   ├── DatasetTable.tsx
│   │   │   │   ├── DatasetForm.tsx        # shared by create + edit
│   │   │   │   ├── DatasetStatusBadge.tsx
│   │   │   │   └── DeleteDatasetDialog.tsx
│   │   │   ├── pages/
│   │   │   │   ├── DatasetListPage.tsx
│   │   │   │   ├── DatasetDetailPage.tsx
│   │   │   │   └── DatasetCreatePage.tsx
│   │   │   ├── lib/
│   │   │   │   └── sort.ts        # DatasetSortKey union + buildPageParams
│   │   │   └── types.ts           # DatasetResponse, CreateDatasetRequest, UpdateDatasetRequest
│   │   │
│   │   ├── jobs/
│   │   │   ├── api.ts             # getJobs, getJob, submitJob
│   │   │   ├── queries.ts         # includes the polling-aware useQuery configs
│   │   │   ├── components/
│   │   │   │   ├── JobTable.tsx
│   │   │   │   ├── JobStatusBadge.tsx
│   │   │   │   ├── JobLifecycle.tsx        # signature component, see §16
│   │   │   │   └── SubmitJobButton.tsx
│   │   │   ├── pages/
│   │   │   │   ├── JobListPage.tsx
│   │   │   │   └── JobDetailPage.tsx
│   │   │   ├── lib/
│   │   │   │   ├── status.ts      # isTerminal, statusConfig: Record<JobStatus, ...>
│   │   │   │   ├── polling.ts     # pollDelay(attempt), shouldPoll(job)
│   │   │   │   └── sort.ts        # JobSortKey union
│   │   │   └── types.ts           # JobResponse, CreateJobRequest
│   │   │
│   │   └── dashboard/
│   │       ├── api.ts             # getDashboardSummary
│   │       ├── queries.ts
│   │       ├── components/
│   │       │   ├── AdminSummaryCards.tsx
│   │       │   └── UserOverviewCards.tsx    # built from dataset/job list metadata, see §17
│   │       ├── pages/
│   │       │   └── DashboardPage.tsx        # branches on role
│   │       └── types.ts           # DashboardSummaryResponse
│   │
│   ├── shared/
│   │   ├── api/
│   │   │   ├── http.ts            # fetch wrapper: base URL, auth header, JSON, timeouts
│   │   │   ├── ApiError.ts        # normalized error class + normalizer function
│   │   │   └── types.ts           # Page<T> generic — the only cross-feature API type
│   │   ├── ui/                    # built on second use only — see §17
│   │   ├── hooks/
│   │   │   └── useUrlState.ts     # syncs page/size/sort to URL search params
│   │   └── lib/
│   │       ├── env.ts             # typed import.meta.env access
│   │       └── format.ts          # date/duration formatting (Intl only, no date library)
│   │
│   └── layouts/
│       ├── AppShell/              # authenticated shell: nav, header, outlet
│       │   └── AppShell.tsx
│       └── AuthLayout/            # login/register shell
│           └── AuthLayout.tsx
│
├── .env.example
├── package.json
├── tsconfig.json
├── vite.config.ts
├── eslint.config.js
└── README.md
```

Rule: a directory exists only when it has a real responsibility. Do not pre-create empty `components/`, `hooks/`, or `lib/` folders in a feature that doesn't need them yet — datasets and jobs need all of the above; auth and dashboard do not need every category and should not have empty ones.

---

## 7. Module ownership

| Concern | Owner |
|---|---|
| Token storage, auth state, role | `features/auth` |
| Dataset CRUD, archive/restore, dataset list/detail UI | `features/datasets` |
| Job submission, job list/detail UI, polling, lifecycle visualization | `features/jobs` |
| Admin summary + user overview | `features/dashboard` |
| HTTP client, error normalization, generic `Page<T>` type | `shared/api` |
| Reusable presentational primitives (built on 2nd use) | `shared/ui` |
| URL state sync, other cross-feature hooks | `shared/hooks` |
| Env access, formatting helpers | `shared/lib` |
| Route table, provider composition | `app/` |
| Authenticated/unauthenticated page chrome | `layouts/` |

A feature never reaches into another feature's internals. If `jobs` needs a dataset's name, it imports only what `datasets` exports from its `index.ts` (or reads it from the shared `Page<T>`/query cache, not from `datasets` internals).

---

## 8. Dependency rules

**Allowed:**
- `features/* → shared/*`
- `app → features/*`, `app → shared/*`
- `layouts → shared/*`, `layouts → features/*` (for auth guards/state only)
- `feature A → feature B` **only** through `B`'s `index.ts` public exports, and only when genuinely required (e.g., dashboard reading job status config)

**Forbidden:**
- `shared/* → features/*` (would create a cycle)
- Deep imports into another feature's internal files (`features/jobs/lib/polling` imported directly by `features/dashboard` — must go through `jobs/index.ts` if exported at all)
- Components calling `fetch`/`http` directly — must go through a feature's `api.ts`
- Business logic inside JSX — pure logic goes in `lib/`
- A generic `utils/`, `helpers/`, or catch-all `services/` folder anywhere

Enforce with ESLint `no-restricted-imports` / import boundary rules (e.g. `eslint-plugin-boundaries` or hand-written path patterns) configured in F1 and treated as a CI gate.

---

## 9. API architecture

`shared/api/http.ts` is the single HTTP entry point. It owns:

- Base URL (from `shared/lib/env.ts`, defaults to same-origin `/api/v1`)
- Attaching `Authorization: Bearer <token>` when a token exists (reads via `features/auth/tokenStorage`, not a global)
- JSON request/response handling
- Raising a normalized `ApiError` (see §18) for any non-2xx response
- A hook point for global 401 handling (calls a callback registered by `AuthProvider`, so `http.ts` never imports `AuthProvider` directly)

Feature `api.ts` files expose only typed functions, e.g.:

```ts
// features/datasets/api.ts
getDatasets(params: DatasetListParams): Promise<Page<DatasetResponse>>
getDataset(id: number): Promise<DatasetResponse>
createDataset(body: CreateDatasetRequest): Promise<DatasetResponse>
updateDataset(id: number, body: UpdateDatasetRequest): Promise<DatasetResponse>
deleteDataset(id: number): Promise<void>
```

```ts
// features/jobs/api.ts
getJobs(params: JobListParams): Promise<Page<JobResponse>>
getJob(id: number): Promise<JobResponse>
submitJob(datasetId: number): Promise<JobResponse>
```

```ts
// features/auth/api.ts
login(body: LoginRequest): Promise<AuthResponse>
register(body: RegisterRequest): Promise<AuthResponse>
getCurrentUser(): Promise<UserResponse>
```

```ts
// features/dashboard/api.ts
getDashboardSummary(): Promise<DashboardSummaryResponse>
```

No function here may call an endpoint not listed in §4. No function may accept parameters the backend doesn't support (e.g., no `status` param on `getJobs` unless §4 is amended after a separately approved backend change).

---

## 10. Type architecture

Rules:

- `"strict": true` in `tsconfig.json`, plus `noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax`.
- No `any`. No non-null assertions (`!`) except where a prior null-check makes it structurally impossible for TypeScript to see (rare; comment why).
- `catch (e: unknown)` everywhere; normalize immediately through `ApiError`.
- Status values are string-literal unions built from `as const` arrays, not TypeScript `enum`:
  ```ts
  export const JOB_STATUSES = ["PENDING", "RUNNING", "COMPLETED", "FAILED"] as const;
  export type JobStatus = (typeof JOB_STATUSES)[number];
  ```
  Status-to-UI mappings are `Record<JobStatus, Config>` so adding a status is a compile error until handled everywhere.
- Nullability mirrors the actual JSON, confirmed in F1: `startedAt: string | null`, not `startedAt?: string`, unless F1 shows the field is omitted rather than null.
- Timestamps stay ISO strings at the API boundary. Parsing/formatting happens only in `shared/lib/format.ts`.
- IDs are `number`.
- Pagination and sort params are typed per feature: `DatasetSortKey = "name" | "status" | "createdAt" | "updatedAt"`, `JobSortKey = "submittedAt" | "status" | "progress" | "completedAt"` — never a free `string`.
- Types live with their owning feature (`features/jobs/types.ts`, etc.). The only cross-feature type is the generic `Page<T>` and `ApiError`, both in `shared/api/`.
- No single application-wide `types.ts`.
- No `as` casts on data coming from the API. Use `satisfies` for static config objects (e.g. the status-config maps).

---

## 11. State management

No global state library (no Redux/Zustand). Three kinds of state, three different tools:

**Auth state** — `features/auth/AuthProvider`, a React context exposing:
```ts
{ status: "loading" | "authenticated" | "anonymous"; user: UserResponse | null;
  login(...): Promise<void>; register(...): Promise<void>; logout(): void }
```
`user` and role are populated by a `useQuery(['auth','me'])` call gated on a token being present.

**Server state** — TanStack Query for every GET. Query key factories per feature, e.g.:
```ts
export const datasetKeys = {
  all: ["datasets"] as const,
  list: (params: DatasetListParams) => ["datasets", "list", params] as const,
  detail: (id: number) => ["datasets", "detail", id] as const,
};
```
Baseline config (tune during F1/F3, do not hard-lock exact numbers yet):
- Datasets: `staleTime` ≈ 30s
- Dashboard: `staleTime` ≈ 30s
- Jobs: low/zero `staleTime` (polling drives freshness — see §12)
- Retry: none on 4xx; limited retries (≈2) on network errors / 5xx
- List queries use `keepPreviousData` for stable pagination UX
- Mutations invalidate the relevant query key namespace (`datasets.all`, `jobs.all`, `dashboard`) on success; job submission additionally seeds the new job's detail cache with the response

**Cache clearing on logout:** `logout()` must `queryClient.cancelQueries()` then `queryClient.clear()` before navigating away, so no other user's cached data can surface after a re-login.

**UI state** — local `useState` for dialog/drawer open state and expanded rows. Page/size/sort live in URL search params via `shared/hooks/useUrlState`, not in React state, so navigation and sharing a link both work. Forms manage their own local state (React Hook Form if adopted — see §26).

---

## 12. Job polling architecture

Terminal statuses: `COMPLETED`, `FAILED`. Non-terminal: `PENDING`, `RUNNING`.

**Job detail (`features/jobs/lib/polling.ts` + `queries.ts`):**
- `refetchInterval` is a function of the last fetched job: return `false` once `isTerminal(job.status)` is true, otherwise return a delay from `pollDelay(attemptNumber)`.
- Backoff schedule: short interval first (e.g. a few hundred ms), lengthening after repeated non-terminal reads (e.g. to 1–2s), and stop polling altogether after a bounded number of attempts / elapsed time — surface "no update since &lt;time&gt;, refresh" rather than polling forever. Given real jobs finish in ~150ms (§4), this ceiling mainly protects against a job stuck from a backend restart.
- `refetchIntervalInBackground: false`.
- Never synthesize a progress value between real reads. Only display `progress` exactly as returned.

**Job list:**
- Poll only while the currently loaded page contains at least one non-terminal job; otherwise do not poll.
- Same background-tab rule as above.
- Do not poll every row individually — one list refetch covers the visible page.

**Dashboard:**
- Manual refresh only for F1–F7. An auto-refresh toggle is a §26/F6 "nice to have," not a requirement.

All polling decision logic (interval calculation, terminal check) lives in `features/jobs/lib/`, unit-tested in isolation — never written ad hoc inside a component's `useEffect`.

---

## 13. Authentication

Flow: `Login → receive JWT → tokenStorage.set(token) → GET /auth/me → AuthProvider.user set → render protected app`.

**Storage:** `sessionStorage`, accessed only through `features/auth/tokenStorage.ts`. No component or other feature module touches `sessionStorage` directly.

**Auth state shape:** `loading | authenticated | anonymous`, plus `user`, `login`, `register`, `logout` (see §11).

**401 handling:** clear token, clear the Query cache, redirect to `/login`, preserve the attempted destination as a `returnTo` param where the 401 happened mid-navigation, show a "session expired" notice, and guarantee this cannot loop (the redirect target itself, `/login`, never triggers this handler).

**403 handling:** keep the session as-is; render an in-place forbidden state on the affected view. Never logs the user out on 403.

**Never:** log the JWT, put it in a URL, put secrets in `VITE_*` env vars (everything prefixed `VITE_` ships to the browser), or treat client-side role checks as the actual authorization boundary — the backend remains authoritative for every request regardless of what the UI shows or hides.

---

## 14. Dashboard role behavior

**ADMIN:** calls `GET /dashboard/summary`, renders total datasets and per-status job counts (`AdminSummaryCards`).

**USER:** must never call `/dashboard/summary` (it will 403). The USER-facing "overview" is built only from data the user can already fetch:
- total dataset count and total job count, taken from `totalElements` of `GET /datasets?size=1` and `GET /jobs?size=1`
- a short "recent jobs" list from `GET /jobs?size=5&sort=submittedAt,desc`

**Do not fabricate per-status (pending/running/completed/failed) counts for a `USER`** — no endpoint provides that broken down by owner. If this gap matters later, it is a candidate for a separately approved backend change (see §4's frozen list), not something the frontend should approximate or guess at.

`DashboardPage` branches on `user.role` and renders `AdminSummaryCards` or `UserOverviewCards` accordingly; the two are visually related but are separate components, not one component with scattered conditionals.

---

## 15. Routing

```
Public:
  /login
  /register

Protected (any authenticated role):
  /                     redirect to /datasets (or /dashboard for ADMIN — decide in F2, document the choice)
  /datasets
  /datasets/:id
  /datasets/new
  /jobs
  /jobs/:id

Protected, ADMIN only:
  /dashboard
```

- `<RequireAuth>` wraps all protected routes; unauthenticated access redirects to `/login?returnTo=<path>`.
- `<RequireRole role="ADMIN">` wraps `/dashboard`; a non-admin sees an in-app forbidden view, not a redirect loop or a blank page.
- Route-level code is lazy-loaded (`React.lazy` + route-level `Suspense`) per feature.
- Frontend route guards are a UX convenience only. The backend enforces the real authorization boundary (§13) regardless of what routes exist client-side.

Exact route list may be refined once F1's contract spike is complete; any change is documented, not silently substituted.

---

## 16. Dataset architecture

`features/datasets` owns: list (paginated, sorted), create, detail, edit, archive/restore, delete (with confirmation), and all associated loading/empty/error states.

- **`PUT /datasets/{id}` is a full replacement**, not a patch. `DatasetForm` must always submit `name`, `description`, and `status` together — even in an "archive" action that only intends to change status — to avoid silently clearing `description`.
- Status handling follows the actual backend contract: omitting `status` on the wire leaves it unchanged server-side, but the frontend form should not rely on omission — it should always send the current/intended status explicitly.
- **Delete is a hard delete.** Its behavior when the dataset has jobs is `UNVERIFIED` (§4) — until F1 confirms it, the delete UI must show a confirmation dialog and handle both a clean 204 and an error response gracefully (do not assume success silently).
- Archive/restore is a `PUT` with `status` toggled; treat it as the primary "remove from active view" action, with hard delete as a secondary, confirmed action.
- List view: server-side pagination and sorting only, synced to the URL (`page`, `size`, `sort` search params), on whitelisted `DatasetSortKey` columns.

---

## 17. Job architecture

`features/jobs` owns: list (paginated, sorted), submission, detail with lifecycle visualization, polling (§12), and status/failure display.

- There is **no cancel, pause, or retry endpoint**. Do not build UI affordances implying any of these.
- A "resubmit" action, if built, creates a brand-new job via `POST /datasets/{datasetId}/jobs` and must be labeled "Create a new job" (or equivalent) — never implied to retry or resume the original job.
- No client-side filter by status or dataset exists server-side (§4); any status filter in the UI must be clearly scoped as "on this page" (client-side filter of the currently loaded page), not a real server query.
- Job rows show `datasetId` (and, if practical, resolve a dataset name from the datasets query cache — never invent a `datasetName` field on the wire type, since the backend doesn't return one).

---

## 18. Signature component: JobLifecycle

`features/jobs/components/JobLifecycle.tsx` renders the job's state using only real fields: `status`, `progress`, `submittedAt`, `startedAt`, `completedAt`, `errorMessage`.

Node sequence (rendered from data, not animated toward a guessed endpoint):

```
Submitted → Running → Completed
Submitted → Running → Failed
Submitted → Failed              (failed while still PENDING; "Running" shown as skipped)
```

For each node, show its real timestamp if reached. Below the nodes, show:
- Queue duration: `startedAt − submittedAt` (if `startedAt` present)
- Run duration: `completedAt − startedAt` (if both present)
- `progress` as a real progress bar (`role="progressbar"`, `aria-valuenow`/`aria-valuemin`/`aria-valuemax`) bound directly to the API value — never incremented client-side
- `errorMessage`, shown only when `status === "FAILED"`

No WebSockets, no SSE, no simulated log stream, no client-generated intermediate progress values. If a poll only ever observes `COMPLETED`/`FAILED` because processing finished between requests, the component must render correctly from that single terminal read (this is the expected common case, not an edge case — see §4).

---

## 19. Dashboard architecture

`features/dashboard` owns: `AdminSummaryCards` (from `/dashboard/summary`), `UserOverviewCards` (from list metadata, §14), manual refresh, and loading/empty/error states for both.

- No trend charts or time-series visualizations — no endpoint supports them.
- Any derived metric (e.g., a completed/failed ratio computed client-side from the admin summary) must be visually labeled as derived, not presented as a raw backend figure.
- Do not imply analytics capabilities the backend doesn't have.

---

## 20. Shared UI

Build shared primitives only on genuine second use, not speculatively. Candidates as reuse emerges: `Button`, `Input`, `Select`, `Badge`, `Dialog`, `Drawer`, `Table`, `Skeleton`, `EmptyState`, `ErrorState`, `Toast`, `Spinner`, `ProgressBar`.

- Prefer the native `<dialog>` element (`showModal()`/`close()`) for `Dialog`/`Drawer` — it provides focus trapping, `Escape` handling, and background inertness for free. Only reach for a library if a concrete requirement (e.g. non-modal drawer with complex focus needs) makes the native element insufficient.
- No large design-system dependency. No component library import "just in case."
- `shared/ui` never imports from `features/*`.

---

## 21. UI/UX direction

The product should read as a professional technical data-processing tool: clean, information-dense but legible, strong hierarchy, responsive, subtly interactive. The concrete visual language to build against is the approved mockup — see **§33** for the full, screen-by-screen spec (colors, spacing, every card/table/modal). This section states the principles; §33 states the exact pixels.

**Approved from the mockup (build these, don't avoid them):** a dark navy sidebar as persistent chrome, a two-panel hero layout on `/login` and `/register` only, rounded-xl/2xl white cards with a soft shadow for every content block, a colored-icon-in-rounded-square motif on stat cards, pill-shaped status badges, and a circular progress ring alongside the `JobLifecycle` stepper on the job detail page.

**Still avoid:** glassmorphism/blur effects, generic "AI startup" gradients beyond the single blue brand gradient on the logo mark, decorative/non-functional animation, fake data, fake progress (§4, §18), meaningless charts, and smooth page-transition animation (adds latency with no informational value here). The hero panel is confined to auth pages — no hero sections inside the authenticated app.

**Signature UI element:** `JobLifecycle` (§18), rendered per the stepper layout in §33.7.

**Tables:** sortable only on backend-supported columns, sticky header where useful, compact but accessible row height, horizontal scroll or a stacked card layout on narrow viewports rather than column truncation.

**Status:** always icon + label + color together — never color alone. Exact badge colors are in §33.2.

---

## 22. Responsiveness

- **Desktop:** persistent sidebar navigation, full data tables, multi-column dashboard cards.
- **Tablet:** condensed/collapsible navigation, tables remain tabular but with reduced column density where needed.
- **Mobile:** stacked single-column layout; table rows become a card/list presentation rather than a horizontally-scrolling table; all controls remain reachable without horizontal page overflow.

---

## 23. Accessibility

- Semantic HTML first (`button`, `nav`, `table`, `dialog`, proper heading order) over ARIA-heavy `div` soup.
- All form fields have associated `<label>`s.
- Full keyboard operability: tab order, visible focus states (never `outline: none` without a replacement), `Escape` closes dialogs/drawers, focus returns to the triggering element on close.
- Native `<dialog>` gives focus trapping "for free" (§20) — verify it in F1's UI shell rather than assuming.
- Sufficient color contrast in both the status-badge and general text palette.
- Status information is never conveyed by color alone (§21).
- Respect `prefers-reduced-motion` for any transition that is kept.

---

## 24. Error handling

Backend error shapes are not uniform (§4). `shared/api/ApiError.ts` normalizes every failure into one shape the rest of the app consumes:

```ts
class ApiError extends Error {
  status: number;
  code?: string;          // e.g. "VALIDATION_FAILED", "NOT_FOUND" — from ApiError.error when present
  fieldErrors?: Record<string, string>; // best-effort parse of the flattened "field: msg; field: msg" string
  raw?: unknown;           // preserved for debugging, never rendered to the user
}
```

The normalizer: tries to parse a backend `ApiError` body first; if the body doesn't match that shape (a framework-level error), falls back to a generic message keyed off the HTTP status; never surfaces a raw stack trace or unparsed body to the UI.

**UI mapping:**

| Status | UI behavior |
|---|---|
| 401 | Auth flow per §13 (except on the login form itself, where it's an inline "invalid email or password" error) |
| 403 | In-place forbidden state, session preserved |
| 404 | Not-found state (e.g., "Dataset not found") |
| 409 | Conflict message inline (e.g., register with duplicate email) |
| 400 / 422 | Field-level validation errors mapped to form fields, using `fieldErrors` where parseable, generic message otherwise |
| 5xx | Generic "something went wrong" state with a retry action |

---

## 25. Environment configuration

- All `import.meta.env` access goes through `shared/lib/env.ts`, parsed once and typed; the app fails fast at startup if a required variable is missing.
- Example variable: `VITE_API_BASE_URL` (defaults to same-origin `/api/v1` in both dev, via the Vite proxy, and prod, via Nginx).
- `.env.example` documents every variable the app reads.
- Never place secrets in a `VITE_*` variable — anything with that prefix is bundled into the client and visible to any user.

---

## 26. Testing architecture

**Unit tests (Vitest):** status/lifecycle helpers (`isTerminal`, `pollDelay`, `lifecycleSteps`), pagination/sort param builders, the `ApiError` normalizer, auth guard logic.

**Component tests (Testing Library):** `DatasetForm` (including full-replacement submit behavior), `JobLifecycle` across all three sequences in §18, dialogs (focus trap/return, Escape), protected route rendering for each auth state.

**Integration/smoke (Playwright, one flow, only if justified by time budget):** register → login → create dataset → submit job → observe a terminal job → logout.

Do not write exhaustive tests for trivial presentational components with no logic.

---

## 27. F1 Contract Spike (mandatory, first task of F1)

Before any UI beyond a bare shell is implemented, run the actual backend and capture real responses for:

1. `POST /auth/register`
2. `POST /auth/login`
3. `GET /auth/me`
4. `GET /datasets` (including the exact `Page<T>` field set)
5. `POST /datasets`
6. `GET /jobs`
7. `GET /jobs/{id}`
8. `GET /dashboard/summary` as both `ADMIN` and `USER` (capturing the 403 body for `USER`)

Also explicitly verify each `UNVERIFIED` item listed in §4, and save the results as fixtures (e.g. `docs/contract-fixtures/*.json`) that later phases and tests reference. Any assumption in this document that turns out wrong must be corrected here before F2 proceeds.

---

## 28. Frontend phase roadmap

### F1 — Foundation + Contract Spike
- **Goal:** a running, empty, correctly-configured app plus a verified backend contract.
- **Scope:** Vite + React + TS project init; Tailwind setup with semantic design tokens; ESLint/Prettier + import-boundary rules; Vite dev proxy to the backend; typed env module; `shared/api/http.ts` and `ApiError.ts` skeletons; CI workflow (lint, typecheck, build, test); the Contract Spike itself (§27).
- **Files/modules:** `app/`, `shared/api/`, `shared/lib/env.ts`, `.env.example`, `vite.config.ts`, `eslint.config.js`, CI workflow file, `docs/contract-fixtures/`.
- **Dependencies:** none (first phase).
- **Tests:** CI pipeline runs and passes on an empty app; no feature tests yet.
- **Definition of Done:** app boots, proxies to the backend, lints/typechecks/builds cleanly in CI, and every `UNVERIFIED` item in §4 is resolved and recorded in fixtures.
- **Out of scope:** any feature UI, auth, routing beyond a placeholder page.

### F2 — Authentication + App Shell
- **Goal:** login/register/logout working end to end against the real backend, with role-aware shell.
- **Scope:** `features/auth` in full (§6, §13); `AppShell`/`AuthLayout`; route table with `RequireAuth`/`RequireRole` (§15); 401/403 handling wired to `shared/api/http.ts`.
- **Dependencies:** F1's `http.ts`/`ApiError` and confirmed auth response/error shapes.
- **Tests:** auth guard unit tests; login/register component tests; 401 redirect behavior test.
- **Definition of Done:** a user can register, log in, see their role-appropriate shell, get redirected correctly on 401/403, and log out with the cache cleared.
- **Out of scope:** datasets, jobs, dashboard content.

### F3 — Dataset Management
- **Goal:** full dataset CRUD against the real backend.
- **Scope:** `features/datasets` in full (§16); server-side pagination/sort synced to URL; create/edit form with full-replacement semantics; archive/restore; delete with confirmation, built against F1's verified delete-with-jobs behavior.
- **Dependencies:** F2's auth context (for owner-scoped calls) and F1's fixtures.
- **Tests:** `DatasetForm` component tests; sort/pagination param unit tests; empty/error/loading state coverage.
- **Definition of Done:** a user can list, create, view, edit, archive/restore, and delete their own datasets, with correct ADMIN-sees-all behavior, and every state (loading/empty/error) is handled.
- **Out of scope:** job submission UI, dashboard.

### F4 — Job Management + JobLifecycle
- **Goal:** job submission, listing, and the signature lifecycle visualization, fully data-driven.
- **Scope:** `features/jobs` in full (§17); `JobLifecycle` (§18); polling architecture (§12).
- **Dependencies:** F3 (submitting a job requires an existing dataset); F1's confirmed job timing/nullability.
- **Tests:** polling logic unit tests (`pollDelay`, `isTerminal`); `JobLifecycle` component tests for all three sequences; job list/detail component tests.
- **Definition of Done:** a user can submit a job from a dataset, watch its detail page poll until terminal (or land directly on a terminal read), see accurate timestamps/durations, and see failure messages when applicable — with no fabricated progress at any point.
- **Out of scope:** dashboard.

### F5 — Dashboard
- **Goal:** role-appropriate dashboard.
- **Scope:** `features/dashboard` in full (§14, §19).
- **Dependencies:** F3/F4 query keys and cache (for the USER overview) and confirmed `/dashboard/summary` shape.
- **Tests:** role-branch component tests (ADMIN view vs. USER view); derived-metric labeling check.
- **Definition of Done:** an ADMIN sees the real summary; a USER sees an honest overview built only from data they can access, with no fabricated per-status counts.
- **Out of scope:** any chart/trend visualization.

### F6 — UX / Responsive / Accessibility Polish
- **Goal:** cross-cutting quality pass, not new features.
- **Scope:** responsive behavior audit (§22) across all pages; accessibility audit (§23) including a full keyboard walkthrough and a contrast check; toasts/skeletons/empty-states consistency review across features; `prefers-reduced-motion` support.
- **Dependencies:** F2–F5 complete.
- **Tests:** targeted component tests for any gaps found; no new unit-logic tests expected.
- **Definition of Done:** every page works at desktop/tablet/mobile widths, is fully keyboard-operable, meets contrast requirements, and status is never color-only anywhere in the app.
- **Out of scope:** dark theme (optional, only if time allows and only after this audit), page-transition animation (explicitly excluded, §21).

### F7 — Testing + Integration + Quality
- **Goal:** confidence in the whole system, not just individual features.
- **Scope:** fill remaining unit/component test gaps (§26); one Playwright smoke flow if justified; full TypeScript-strict pass with zero `any`; final review against the import-boundary rules (§8); production build verification against the same-origin Nginx setup (§5).
- **Dependencies:** F1–F6 complete.
- **Tests:** the full suite from §26, running in CI.
- **Definition of Done:** CI is green (lint, typecheck, unit, component, build), the one smoke flow passes against a real backend instance, and a manual pass confirms no direct-fetch-in-component or cross-feature-deep-import violations remain.
- **Out of scope:** new features.

### F8 — Portfolio Release
- **Goal:** a presentable, honestly-documented deliverable.
- **Scope:** final `README.md` (setup instructions for both frontend and backend, same-origin deployment steps, admin-promotion note since registration only creates `USER`, and the failing-dataset env var for demoing `FAILED` jobs); UI screenshots; architecture summary linking back to this document; a documented "backend limitations" section (no filters, no datasetName, ~150ms processing, no refresh token, etc.); git history cleanup.
- **Dependencies:** F1–F7 complete.
- **Tests:** none new; a final manual demo run-through of the core loop (register → dataset → submit job → completed → dashboard).
- **Definition of Done:** a new reader can follow the README, run both services, and reach the same demo state described in it, with no claims in the README that outrun what the app actually does.
- **Out of scope:** anything not already built in F1–F7.

---

## 29. Phase completion rule

Every phase follows, in order:

```
IMPLEMENT → RUN → TEST → INSPECT → REPORT → LOCK → NEXT PHASE
```

A phase is not complete because files exist. Completing a phase requires a report covering:

- files created/modified
- commands run (install, build, test, lint)
- test results
- build status
- known limitations
- any deviation from this document, and why
- anything explicitly left out of scope for this phase

A phase is "locked" once its Definition of Done (§28) is met and reported; later phases build on a locked phase without revisiting its internals except to fix a defect.

---

## 30. Do-not list

- No backend redesign, and no CORS change unless separately approved outside this document.
- No microservices, no GraphQL, no WebSockets, no SSE.
- No Redux/Zustand or other global state library without a concrete, demonstrated need.
- No fake job progress, fake data, or fake dashboard metrics of any kind.
- No API calls to endpoints that don't exist in §4 (no status/datasetId job filters, no datasetName field, no cancel/pause/retry job endpoints).
- No chart library without a real, data-backed need.
- No large shared component library or design system dependency.
- No generic `services/`, `utils/`, or `helpers/` dumping-ground folders.
- No direct `fetch` calls inside components.
- No secrets in frontend environment variables.
- No treating client-side route guards or role checks as actual security — the backend is always the authorization boundary.
- No unnecessary dependencies (Axios, a date library, Framer Motion, Zod) unless a concrete requirement emerges that the native/already-chosen tools can't meet.
- No premature abstraction (shared components built before a second real use) or premature optimization.
- No scope creep into a "Phase 9" that touches the backend.

---

## 31. Portfolio quality checklist

The finished frontend should visibly demonstrate: TypeScript discipline (strict, no `any`, literal unions), deliberate React architecture (feature-oriented, enforced boundaries), real API integration against a non-trivial backend, authentication and authorization-aware UX (not just a login form), correct server-state management (caching, invalidation, polling) via TanStack Query, an honest async-workflow visualization (`JobLifecycle`) rather than a decorative one, responsive layout, baseline accessibility, a meaningful test suite, and a README that matches what the app actually does — nothing more.

---

## 32. Final frontend architecture contract

This is the binding summary an implementation agent should re-check against before writing code:

- **Deployment:** same-origin only (§5); no backend CORS change.
- **Backend:** frozen (§4); no assumed endpoints, fields, or filters beyond what's listed; `UNVERIFIED` items resolved in F1 before dependent UI ships.
- **Stack:** React + TypeScript (strict) + Vite + React Router + Tailwind + TanStack Query + native fetch wrapper + Lucide; React Hook Form optional/lean; no Zod, Axios, chart library, Framer Motion, or global state library initially (§3 locked list).
- **Structure:** feature-oriented (§6–§8), enforced import boundaries, no dumping-ground folders.
- **Auth:** `sessionStorage` token via one storage module; role only from `/auth/me`; explicit 401 vs. 403 handling (§13).
- **Jobs:** no fake progress, ever; `JobLifecycle` is the signature, data-only component (§18); polling backs off and stops (§12).
- **Dashboard:** role-branched; USER never calls the admin endpoint and never sees fabricated per-status counts (§14).
- **Errors:** normalized through one `ApiError` shape regardless of the backend's actual response shape (§24).
- **Phases:** F1 (Foundation + Contract Spike) → F2 (Auth + Shell) → F3 (Datasets) → F4 (Jobs + JobLifecycle) → F5 (Dashboard) → F6 (UX/Responsive/Accessibility) → F7 (Testing/Integration) → F8 (Portfolio Release), each following IMPLEMENT → RUN → TEST → INSPECT → REPORT → LOCK (§29).
- **Visual design:** every screen built in F2–F6 must match the approved mockup per §33 (colors, layout, components) — treat §33 as locked, on the same footing as §4's frozen backend contract.

Any implementation detail not covered here is decided using the priority order in §3, and any resulting decision of consequence is added back into this document rather than left undocumented.

---

## 33. Visual design reference — approved mockup spec

This section is the pixel-level companion to §21. It was written directly off the approved DataFlowX mockup (`dataflowx-ui-mockup.png`, shipped alongside this document) and is locked: implement to this, do not reinterpret the mood-board language in §21 in a way that contradicts the concrete values below. Where this section gives a hex value, spacing, or radius, treat it as a starting design-token value to wire into Tailwind config in F1, not a literal inline style to hardcode per component.

### 33.1 Design tokens

```
Color tokens (semantic names → approximate hex, refine exact values against the mockup in F1):
  --color-nav-bg:          #0B1120   /* sidebar / hero panel background, near-black navy */
  --color-nav-bg-hover:    #1E293B   /* inactive nav item hover */
  --color-nav-text:        #94A3B8   /* inactive nav item label */
  --color-nav-text-active: #FFFFFF   /* active nav item label, on solid accent pill */

  --color-brand-500:       #3B82F6   /* logo mark, links, focus rings */
  --color-brand-600:       #2563EB   /* primary buttons, active nav pill, RUNNING accents */
  --color-brand-700:       #1D4ED8   /* primary button hover */

  --color-success-50:      #ECFDF5   /* COMPLETED / ACTIVE badge background */
  --color-success-600:     #16A34A   /* COMPLETED / ACTIVE badge text + icon, success checkmark */
  --color-danger-50:       #FEF2F2   /* FAILED badge background, destructive button outline bg on hover */
  --color-danger-600:      #DC2626   /* FAILED badge text + icon, Delete button */
  --color-neutral-50:      #F1F5F9   /* ARCHIVED / PENDING badge background */
  --color-neutral-600:     #64748B   /* ARCHIVED / PENDING badge text, secondary/help text */

  --color-surface:         #FFFFFF   /* card backgrounds */
  --color-page-bg:         #F8FAFC   /* authenticated app content background */
  --color-border:          #E2E8F0   /* card/table borders, dividers */
  --color-text-primary:    #0F172A   /* headings, primary values */
  --color-text-secondary:  #64748B   /* labels, captions, table secondary text */

Radius:
  --radius-card: 16px   (rounded-2xl)   — stat cards, info cards, modals
  --radius-control: 8px (rounded-lg)    — buttons, inputs, table
  --radius-badge: 999px (rounded-full)  — status pills

Shadow:
  --shadow-card: a single soft, low-opacity shadow (e.g. 0 1px 2px rgba(15,23,42,.04), 0 1px 3px rgba(15,23,42,.06)) — no heavy/colored shadows.

Typography:
  Sans-serif system stack (e.g. Inter or the platform default). Page titles: bold, ~24–28px, --color-text-primary.
  Card labels: 12–13px, uppercase or sentence case, --color-text-secondary.
  Card values: 20–32px bold for stat-card numbers; 14–15px regular for table/detail values.

Spacing: 4px base scale (4/8/12/16/24/32). Card padding ~24px. Sidebar item padding ~12px/16px.
```

### 33.2 Status badge colors (ties to the `Record<JobStatus, Config>` / dataset-status maps in §10)

| Status | Badge background | Badge text/icon |
|---|---|---|
| `ACTIVE` (dataset) | `--color-success-50` | `--color-success-600` |
| `ARCHIVED` (dataset) | `--color-neutral-50` | `--color-neutral-600` |
| `PENDING` (job) | `--color-neutral-50` | `--color-neutral-600` |
| `RUNNING` (job) | tinted brand blue (e.g. `#EFF6FF` / `--color-brand-600` text) | `--color-brand-600` |
| `COMPLETED` (job) | `--color-success-50` | `--color-success-600` |
| `FAILED` (job) | `--color-danger-50` | `--color-danger-600` |

Every badge is a pill (`--radius-badge`) with a small leading dot or icon plus the label text — never color alone (§21, §23).

### 33.3 App shell (`layouts/AppShell`)

- **Sidebar** (desktop): fixed width ~240–260px, `--color-nav-bg` background, full viewport height.
  - Top: logo mark (rounded-square blue gradient tile with a bolt icon) + "DataFlowX" wordmark in white, bold.
  - Nav list: `Dashboard`, `Datasets`, `Jobs` (icon + label). Active item renders as a solid `--color-brand-600` rounded-lg pill with white text; inactive items are `--color-nav-text` with a subtle `--color-nav-bg-hover` on hover/focus.
  - Bottom, pinned: `Settings` nav item above a divider, then the current-user block — circular avatar (initial or photo), name, and role (`USER`/`ADMIN`) in small uppercase `--color-nav-text`.
- **Header bar** (top of main content, not sidebar): page title (and for the admin System Overview, a "Last 30 days" range control on the right); a notification bell icon and the current-user avatar/name with a dropdown (containing at least "Log out") sit top-right on every authenticated page.
- **Main content area:** `--color-page-bg` background, content padded and max-width constrained, stat cards and tables as `--color-surface` cards on top of it.

### 33.4 Auth pages (`layouts/AuthLayout` — `/login`, `/register` only)

Two-panel layout, full viewport height, only place in the app that uses this hero treatment (§21):

- **Left panel** (roughly 40% width, `--color-nav-bg`, hidden on narrow/mobile viewports): logo + wordmark, tagline ("Process. Discover. Advance."), one supporting sentence, a subtle abstract line/wave graphic as background texture (decorative only, `aria-hidden`), and a small process breadcrumb (e.g. "Data → Processing → Discovery") near the bottom with a one-line caption under it.
- **Right panel** (`--color-surface`/white): centered form column, max-width ~400px — heading ("Welcome back" / "Create an account"), subheading, labeled email + password inputs, a "Remember me" checkbox + "Forgot password?" link on the login form, a full-width solid `--color-brand-600`→dark-navy primary submit button (matches the mockup's near-black "Sign In" button), and a footer line linking to the other auth page ("Don't have an account? Register").
- Inline validation/`ApiError` messaging (§24) renders under the relevant field or as a banner above the form — never a raw alert().

### 33.5 Dashboard (`features/dashboard`)

- **USER view (`UserOverviewCards`):** greeting header ("Welcome back, `{name}` 👋") with a short subtitle. Two stat cards side by side: "Your Datasets" and "Your Jobs", each a white rounded-2xl card with the big number, a small "+N this month" delta caption in `--color-success-600`, and a colored icon tile on the right. Below: a "Recent Jobs" card containing a compact table (`#`, Dataset, Status badge, Progress bar + %, Submitted At) with a "View all →" link in the card header.
- **ADMIN view (`AdminSummaryCards`):** header "System Overview" + subtitle, with the "Last 30 days" range control top-right (display-only unless/until a backend param exists — do not silently fabricate a filtered query, §4/§30). A grid of stat cards from the real `/dashboard/summary` fields: Total Datasets, Total Jobs, Completed, Running, Failed — each an icon-tile + number card as above, no invented delta captions since the summary endpoint doesn't provide period deltas for admin (§14 — do not fabricate). Below: "Recent Jobs" table with the same columns as the user view plus an `Owner` column (resolvable only because ADMIN's job list already includes cross-user data per §4).
- Both variants: loading state is skeleton cards in the same grid shape; empty state replaces the table body with an `EmptyState` (§20); error state is a card-level `ErrorState` with retry, not a full-page crash.

### 33.6 Datasets (`features/datasets`)

- **List page:** header row — "Datasets" title + subtitle, primary "+ New Dataset" button (`--color-brand-600`, solid, leading plus icon) top-right. Toolbar row below: a search input (leading search icon, filters the current page client-side unless/until backend search exists, labeled honestly per §17's "on this page" rule), a "Status" select, and a "Sort" select. Table: `Name` (bold, links to detail), `Status` (badge, §33.2), `Description` (truncated, `--color-text-secondary`), `Updated At`, `Actions` (kebab `⋮` menu → View / Edit / Archive-Restore / Delete). Footer: numbered pagination controls left, "`N` items" count right — both driven by the real `Page<T>` response (§4), never a client-guessed total.
- **Detail page:** "← Back to Datasets" link; title row with dataset name + status badge inline and outline `Edit` / `Archive` / destructive-outline `Delete` buttons top-right (§16 — Archive is a full-replacement `PUT`, Delete is the confirmed hard-delete flow). Underline tabs: `Overview` (active) / `Jobs`. Two-column grid under the tabs:
  - Left card, "Dataset Information": label/value rows for `ID`, `Name`, `Description`, `Owner`, `Status` (badge), `Created At`, `Updated At`.
  - Right column: an "Actions" card with a full-width primary "Submit Processing Job" button plus one line of helper text, and below it a "Jobs for this dataset" mini-list (job `#id` + status badge + progress %) with a "View all jobs →" link into the filtered job list (client-side filter, §17).

### 33.7 Jobs (`features/jobs`)

- **Detail page:** "← Back to Jobs" link; title row "Job #`{id}`" + status badge inline, with the live `progress` percentage shown large and bold top-right plus a small caption ("Processing…" while non-terminal, omitted or "Done" once terminal — never a fabricated status word, §4/§18). Three-column grid below:
  1. **"Job Lifecycle" card** — this *is* the `JobLifecycle` component (§18) rendered as a vertical stepper: a filled circle with a check for each reached node (`Submitted`, `Running`) with its real timestamp under it; the current non-terminal node gets a highlighted/ringed circle instead of a plain fill; unreached nodes (`Completed`, `Failed`) render as hollow gray circles labeled "Pending"; a connecting vertical line is colored up to the last-reached node and gray beyond it. Only ever show the sequence that actually happened (§18's three valid sequences) — never render both `Completed` and `Failed` as reached, and never show `Running` as reached if the job failed straight from `PENDING`.
  2. **"Progress" card** — a circular ring/donut progress indicator (SVG, `role="progressbar"` with the same `aria-value*` attributes as the linear bar per §18) showing the exact `progress` value large and centered inside the ring. This is a second visualization of the same real number as the lifecycle card, not a separate data source.
  3. **"Job Details" card** — label/value rows: `ID`, `Dataset ID`, `Status` (badge), `Progress`, `Submitted At`, `Started At`, `Completed At`, `Error Message` — each showing an em dash or "—" when the underlying field is `null`, never a blank cell.
- **List page:** table with `#`, `Dataset` (resolved name where possible, §17), `Status` (badge), `Progress` (thin inline bar + %), `Submitted At`; same pagination footer pattern as the dataset list.

### 33.8 Modals (`shared/ui` `Dialog`, native `<dialog>` per §20)

- **"Submit Processing Job"**: centered modal, rounded-2xl white surface, header with title + close `×`; a `Dataset` select (pre-selected/locked to the current dataset when opened from a dataset detail page); an informational banner (tinted blue background, info icon) stating in plain language that this creates a new processing job and starts async server-side processing (mirrors §4's real async behavior — never imply synchronous completion); footer with outline `Cancel` and solid `Submit Job` buttons.
- **Success confirmation**: centered modal, a green circular checkmark icon at the top, bold "Job submitted successfully!" heading, one-line subtext, a small two-field summary (`Job ID` / `Status` badge — status is `PENDING`, matching §4's real creation response, never shown as already `RUNNING`), footer with a solid `View Job` button (navigates to the new job's detail page) and an outline `Close` button.
- Both follow §23: focus trapped in the dialog, `Escape` closes, focus returns to the triggering element.

### 33.9 Mobile / narrow viewports (extends §22)

- The persistent sidebar (§33.3) becomes a hamburger-triggered slide-out drawer using the same `--color-nav-bg` styling and nav list; the header bar keeps the hamburger, logo, and the notification/avatar cluster.
- Stat cards stack to a 2-column (phone) or 1-column grid instead of a full row.
- Tables (dashboard recent jobs, dataset list, job list) become a stacked card-per-row list — each card shows the row's fields as label/value pairs plus the status badge — rather than a horizontally scrolling table, per §22's mobile rule.
- The job detail page's 3-column grid (§33.7) stacks vertically in this order: Lifecycle → Progress ring → Job Details.
- Modals become full-width bottom sheets or full-screen dialogs on the smallest breakpoint rather than a small centered box.
