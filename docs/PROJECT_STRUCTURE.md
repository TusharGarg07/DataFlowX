# DataFlowX — Project Structure

**Document Version:** 1.0  
**Status:** Implementation Blueprint  
**Based On:** DataFlowX Architecture v1.1  
**Architecture Style:** Modular Monolith + Feature-Oriented Layered Architecture  
**Primary Stack:** Java 21, Spring Boot, Spring Data JPA, PostgreSQL, Spring Security, JWT, Maven

---

## 1. Purpose

This document translates the DataFlowX Architecture v1.1 into a concrete source-code structure.

It answers:

- Where each class belongs.
- What responsibility each package has.
- Which modules may depend on which other modules.
- What belongs in the shared/common layer.
- What should remain outside the MVP.
- In what order the project should be implemented.

This document is an implementation blueprint. It does **not** introduce a new architecture.

The architecture remains a **modular monolith** with feature-oriented modules:

- `auth`
- `dataset`
- `job`
- `dashboard`

Cross-cutting infrastructure:

- `security`
- `config`
- `common`

---

## 2. Root Package

All application code lives under:

```text
com.dataflowx
```

The Spring Boot entry point is:

```text
com.dataflowx.DataFlowXApplication
```

Do not create unrelated top-level packages outside the architecture unless a real requirement justifies them.

---

# 3. Target Package Tree

The target structure is:

```text
src/
└── main/
    ├── java/
    │   └── com/
    │       └── dataflowx/
    │           ├── DataFlowXApplication.java
    │           │
    │           ├── config/
    │           │   ├── SecurityConfig.java
    │           │   ├── OpenApiConfig.java
    │           │   └── AsyncConfig.java
    │           │
    │           ├── security/
    │           │   ├── JwtAuthenticationFilter.java
    │           │   ├── JwtService.java
    │           │   ├── CustomUserDetailsService.java
    │           │   └── SecurityUser.java
    │           │
    │           ├── common/
    │           │   ├── constants/
    │           │   ├── exception/
    │           │   │   ├── GlobalExceptionHandler.java
    │           │   │   ├── ResourceNotFoundException.java
    │           │   │   ├── ResourceConflictException.java
    │           │   │   ├── UnauthorizedOperationException.java
    │           │   │   └── InvalidJobStateException.java
    │           │   ├── response/
    │           │   └── validation/
    │           │
    │           ├── auth/
    │           │   ├── controller/
    │           │   │   └── AuthController.java
    │           │   ├── dto/
    │           │   │   ├── request/
    │           │   │   │   ├── RegisterRequest.java
    │           │   │   │   └── LoginRequest.java
    │           │   │   └── response/
    │           │   │       └── AuthResponse.java
    │           │   ├── entity/
    │           │   │   └── User.java
    │           │   ├── mapper/
    │           │   │   └── UserMapper.java
    │           │   ├── repository/
    │           │   │   └── UserRepository.java
    │           │   └── service/
    │           │       ├── AuthService.java
    │           │       └── impl/
    │           │           └── AuthServiceImpl.java
    │           │
    │           ├── dataset/
    │           │   ├── controller/
    │           │   │   └── DatasetController.java
    │           │   ├── dto/
    │           │   │   ├── request/
    │           │   │   │   ├── CreateDatasetRequest.java
    │           │   │   │   └── UpdateDatasetRequest.java
    │           │   │   └── response/
    │           │   │       └── DatasetResponse.java
    │           │   ├── entity/
    │           │   │   └── Dataset.java
    │           │   ├── mapper/
    │           │   │   └── DatasetMapper.java
    │           │   ├── repository/
    │           │   │   └── DatasetRepository.java
    │           │   └── service/
    │           │       ├── DatasetService.java
    │           │       └── impl/
    │           │           └── DatasetServiceImpl.java
    │           │
    │           ├── job/
    │           │   ├── controller/
    │           │   │   └── JobController.java
    │           │   ├── dto/
    │           │   │   ├── request/
    │           │   │   │   └── CreateJobRequest.java
    │           │   │   └── response/
    │           │   │       └── JobResponse.java
    │           │   ├── entity/
    │           │   │   └── Job.java
    │           │   ├── mapper/
    │           │   │   └── JobMapper.java
    │           │   ├── repository/
    │           │   │   └── JobRepository.java
    │           │   └── service/
    │           │       ├── JobService.java
    │           │       └── impl/
    │           │           └── JobServiceImpl.java
    │           │
    │           └── dashboard/
    │               ├── controller/
    │               │   └── DashboardController.java
    │               ├── dto/
    │               │   └── response/
    │               │       └── DashboardSummaryResponse.java
    │               └── service/
    │                   ├── DashboardService.java
    │                   └── impl/
    │                       └── DashboardServiceImpl.java
    │
    └── resources/
        ├── application.properties
        ├── application-local.properties
        ├── application-test.properties
        └── static/
```

The tree is a **target structure**, not a requirement that every optional file must exist immediately.

Create files when their corresponding implementation phase requires them.

---

# 4. Module Responsibilities

## 4.1 `auth`

Owns user identity and authentication use cases.

### Responsibilities

- User registration.
- Login.
- User entity.
- User repository.
- User/role domain concepts.
- Authentication DTOs.
- Password hashing integration through the security/authentication flow.

### Must not own

- JWT filter implementation.
- Generic Spring Security configuration.
- Dataset business logic.
- Job processing.
- Dashboard aggregation.

---

## 4.2 `security`

Owns security infrastructure.

### Responsibilities

- JWT creation.
- JWT validation.
- JWT authentication filter.
- UserDetails integration.
- Security-related utilities.

### Important boundary

`dataset` and `job` must **not** implement JWT validation themselves.

Security infrastructure authenticates the request; application services perform resource-level authorization.

---

## 4.3 `dataset`

Owns dataset management.

### Responsibilities

- Dataset entity.
- Dataset persistence.
- Dataset CRUD.
- Dataset validation.
- Dataset ownership rules.
- Dataset status.
- Dataset DTOs and mapping.

### Ownership rule

The authenticated user comes from the security context.

The client must **not** be allowed to submit an arbitrary `ownerId` to claim another user's dataset.

---

## 4.4 `job`

Owns processing-job lifecycle and processing behavior.

### Responsibilities

- Job entity.
- Job persistence.
- Job submission.
- Job access control.
- Job state transitions.
- Job progress.
- Processing execution.
- Async processing when the async phase is implemented.
- Failure handling.

### Job lifecycle

Valid transitions:

```text
PENDING → RUNNING
PENDING → FAILED
RUNNING → COMPLETED
RUNNING → FAILED
```

Invalid state transitions must be rejected.

The client must not directly set arbitrary job status values.

---

## 4.5 `dashboard`

Owns read-oriented aggregate information.

### Responsibilities

- Dashboard summary endpoint.
- Dataset/job counts.
- Aggregate read operations.

### Important rule

Dashboard must not duplicate dataset or job business logic.

It should obtain the information it needs through appropriate services/repositories according to the final implementation.

Dashboard is an aggregation/read module, not a second job-management module.

---

# 5. Cross-Cutting Packages

## 5.1 `config`

Contains application-level configuration.

Examples:

- Spring Security configuration.
- OpenAPI configuration.
- Async executor configuration.

Do not place business logic here.

---

## 5.2 `common`

Contains genuinely shared infrastructure.

Possible areas:

```text
common/
├── constants/
├── exception/
├── response/
└── validation/
```

Only place code here when it is truly shared.

Do not use `common` as a dumping ground for unrelated business logic.

---

# 6. Controller Layer

Controllers are the HTTP/API boundary.

Responsibilities:

- Map HTTP requests to application/service calls.
- Read path/query parameters.
- Accept request DTOs.
- Trigger validation.
- Return appropriate HTTP status codes.
- Return response DTOs.

Controllers must remain thin.

### Controllers must not

- Contain business rules.
- Directly access repositories.
- Contain JWT implementation.
- Perform long-running job processing.
- Construct complex persistence entities manually when that belongs in a service/mapper.

---

# 7. DTO Layer

DTOs protect the API boundary from persistence entities.

## Request DTOs

Examples:

```text
RegisterRequest
LoginRequest
CreateDatasetRequest
UpdateDatasetRequest
CreateJobRequest
```

Use Jakarta Bean Validation where appropriate:

```java
@NotBlank
@Email
@Size
```

Validation belongs at the API boundary for request-shape constraints.

Business validation remains in services.

---

## Response DTOs

Examples:

```text
AuthResponse
DatasetResponse
JobResponse
DashboardSummaryResponse
```

Never expose:

- Password hashes.
- JWT secrets.
- Internal security credentials.
- Unnecessary persistence internals.

Entities should not be returned directly from controllers.

---

# 8. Entity Layer

Entities represent persisted domain state.

## User

Core fields:

```text
id
username
email
password
role
createdAt
updatedAt
```

---

## Dataset

Core fields:

```text
id
name
description
owner
status
createdAt
updatedAt
```

Dataset status:

```text
ACTIVE
ARCHIVED
```

---

## Job

Core fields:

```text
id
dataset
status
progress
submittedAt
startedAt
completedAt
errorMessage
```

Job status:

```text
PENDING
RUNNING
COMPLETED
FAILED
```

Progress must remain within:

```text
0–100
```

---

# 9. Repository Layer

Repositories handle persistence.

Expected initial repositories:

```text
UserRepository
DatasetRepository
JobRepository
```

They should normally extend Spring Data interfaces such as:

```java
JpaRepository<Entity, IdType>
```

Prefer:

1. Spring Data derived queries.
2. JPQL/custom queries only when necessary.
3. Native SQL only when there is a clear reason.

Repositories should not contain business workflows.

---

# 10. Service Layer

Services contain application/business logic.

Expected interfaces:

```text
AuthService
DatasetService
JobService
DashboardService
```

Implementation classes:

```text
AuthServiceImpl
DatasetServiceImpl
JobServiceImpl
DashboardServiceImpl
```

Services handle things such as:

- Authorization decisions.
- Ownership checks.
- State transitions.
- Resource existence checks.
- Transaction boundaries.
- Coordination between repositories and other application components.

---

# 11. Mapper Layer

Initial implementation should use simple manual mapping.

Examples:

```text
UserMapper
DatasetMapper
JobMapper
```

Typical responsibility:

```text
Entity → Response DTO
Request DTO → Entity
```

Do not introduce MapStruct just for the sake of using another technology.

MapStruct can be evaluated later if mapping complexity grows.

---

# 12. API Structure

All API endpoints use:

```text
/api/v1
```

## Authentication

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
```

Public endpoints.

---

## Dataset

```text
POST   /api/v1/datasets
GET    /api/v1/datasets
GET    /api/v1/datasets/{id}
PUT    /api/v1/datasets/{id}
DELETE /api/v1/datasets/{id}
```

Protected endpoints.

Collection endpoints should support pagination.

Example:

```text
GET /api/v1/datasets?page=0&size=20
```

---

## Jobs

```text
POST /api/v1/datasets/{datasetId}/jobs
GET  /api/v1/jobs
GET  /api/v1/jobs/{id}
```

Protected endpoints.

Example pagination:

```text
GET /api/v1/jobs?page=0&size=20&sort=submittedAt,desc
```

Future endpoints such as explicit retry operations should only be added when the corresponding feature is implemented.

---

## Dashboard

```text
GET /api/v1/dashboard/summary
```

System-wide dashboard access is intended for administrators.

---

# 13. Authorization Rules

| Operation | USER | ADMIN |
|---|---:|---:|
| Register | Yes | Yes |
| Login | Yes | Yes |
| Create dataset | Yes | Yes |
| View own dataset | Yes | Yes |
| Update own dataset | Yes | Yes |
| Delete own dataset | Yes | Yes |
| View authorized jobs | Yes | Yes |
| Submit job for authorized dataset | Yes | Yes |
| View all jobs | No | Yes |
| System-wide dashboard | No | Yes |

For ordinary users:

```text
User → owns Dataset → owns/accesses Job through Dataset
```

A user must not bypass dataset authorization simply by knowing a Job ID.

---

# 14. Module Dependency Rules

The project is a modular monolith, but modules still need boundaries.

## Preferred dependency direction

```text
Controller
    ↓
Service
    ↓
Repository
    ↓
Database
```

Cross-module interaction should happen through application/service-level contracts where practical.

### Rules

1. `dataset` must not access `job` repositories directly just because they are available.
2. `job` must not bypass dataset authorization.
3. `dashboard` must not reimplement dataset/job business rules.
4. `auth` owns the User entity and user persistence.
5. `security` provides authentication infrastructure.
6. Business modules must not duplicate JWT validation.
7. Avoid circular dependencies.
8. Shared code belongs in `common` only when genuinely cross-cutting.

---

# 15. Transaction Boundaries

Transactions belong around business operations.

Typical examples:

```text
createDataset()
updateDataset()
deleteDataset()
submitJob()
updateJobState()
```

For async processing:

```text
HTTP request
    ↓
Create PENDING job
    ↓
Commit transaction
    ↓
Trigger async processing
    ↓
RUNNING
    ↓
COMPLETED / FAILED
```

Do not keep a database transaction open for the duration of long-running processing.

Async execution may require its own transaction boundaries.

---

# 16. Async Job Processing Structure

Async processing is introduced after the basic job lifecycle works synchronously.

A likely implementation shape is:

```text
job/
├── service/
│   ├── JobService.java
│   ├── JobProcessor.java
│   └── impl/
│       └── JobServiceImpl.java
```

Exact class naming may be refined during implementation if needed.

The important boundary is:

```text
Controller
    ↓
JobService
    ↓
Persist PENDING
    ↓
Async processing boundary
    ↓
RUNNING
    ↓
Processing
    ↓
COMPLETED / FAILED
```

Do not:

- Create manual threads.
- Put `Thread.sleep()` in controllers.
- Block the HTTP request while simulating long processing.
- Allow clients to arbitrarily mutate lifecycle states.

The initial processing task is intentionally deterministic and simulated. It represents the processing boundary without claiming to be a real scientific processing engine.

---

# 17. Exception Structure

Central exception handling belongs in:

```text
common/exception/
```

Expected exceptions:

```text
ResourceNotFoundException
ResourceConflictException
UnauthorizedOperationException
InvalidJobStateException
```

Central handler:

```text
GlobalExceptionHandler
```

Expected error information:

```text
timestamp
status
error
message
path
```

Do not return:

- Stack traces.
- Passwords.
- JWTs.
- Secrets.
- Internal security details.

---

# 18. Configuration Files

Target resources:

```text
src/main/resources/
├── application.properties
├── application-local.properties
└── application-test.properties
```

Configuration should support environment-based values.

Examples:

```text
DATABASE_URL
DATABASE_USERNAME
DATABASE_PASSWORD
JWT_SECRET
JWT_EXPIRATION
```

Never commit real secrets.

A future:

```text
.env.example
```

can document required environment variables without containing real credentials.

---

# 19. Database Structure

The core relational model is:

```text
User
  1
  │
  │ owns
  ▼
Dataset
  1
  │
  │ contains
  ▼
Job
```

Relationships:

```text
User 1 ─── N Dataset
Dataset 1 ─── N Job
```

Avoid unnecessary bidirectional relationships.

Use deliberate fetch strategies and avoid accidental N+1 query behavior.

Do not use:

```java
CascadeType.ALL
```

automatically just for convenience.

Delete behavior must be explicitly chosen during implementation.

Possible dataset deletion strategies:

- Reject deletion when jobs exist.
- Explicitly remove/archive dependent jobs.
- Archive/soft-delete the dataset.

Do not introduce automatic cascading deletion without deciding the business behavior.

---

# 20. Index Candidates

Initial candidates:

```text
user.email
dataset.owner_id
job.dataset_id
job.status
job.submitted_at
```

These are candidates, not blindly mandatory indexes.

Verify actual query/access patterns during implementation.

---

# 21. Testing Structure

Tests should mirror the production package structure.

Target:

```text
src/test/java/com/dataflowx/
├── auth/
│   ├── controller/
│   └── service/
├── dataset/
│   ├── controller/
│   └── service/
├── job/
│   ├── controller/
│   └── service/
└── dashboard/
    └── service/
```

Potential test types:

### Unit tests

Focus on:

- Business rules.
- Authorization.
- State transitions.
- Validation-related service behavior.
- Error handling.

### Controller/API tests

Use:

```text
MockMvc
```

Test:

- HTTP status.
- Request validation.
- Response structure.
- Authentication/authorization behavior.

### Integration tests

Use Spring Boot integration testing where valuable.

Test critical persistence/API flows.

### Database integration

Testcontainers can be introduced if useful, but it is not a prerequisite for the earliest MVP implementation.

---

# 22. OpenAPI / Swagger

OpenAPI documentation should describe:

- Authentication endpoints.
- Dataset endpoints.
- Job endpoints.
- Dashboard endpoint.
- Request/response DTOs.
- Authentication requirements.
- Relevant HTTP status codes.

Swagger/OpenAPI configuration belongs under:

```text
config/
```

Do not mix documentation configuration into business services.

---

# 23. Logging

Log useful application events such as:

```text
Application startup
Authentication failures
Dataset operations where useful
Job submission
Job state changes
Processing failures
Unexpected exceptions
```

Never log:

```text
Passwords
JWT tokens
JWT secrets
Database passwords
Other credentials
```

Logs should provide enough information to debug failures without exposing sensitive data.

---

# 24. Implementation Order

Implementation should follow dependency order rather than building every package at once.

## Phase 1 — Foundation

Implement:

```text
Project structure
Configuration
PostgreSQL connection
JPA
Basic entities
Basic repositories
```

Goal:

```text
Application starts successfully
        +
Database connection works
        +
Entities can be persisted
```

---

## Phase 2 — Authentication

Implement:

```text
User
UserRepository
RegisterRequest
LoginRequest
AuthResponse
AuthService
AuthController
Password hashing
JWT
SecurityConfig
JWT filter
```

Goal:

```text
Register → Login → Receive JWT → Access protected endpoint
```

---

## Phase 3 — Dataset Management

Implement:

```text
Dataset
DatasetRepository
Dataset DTOs
DatasetMapper
DatasetService
DatasetController
Validation
Ownership authorization
```

Goal:

```text
Authenticated user
    ↓
Create dataset
    ↓
Read/update/delete own dataset
```

---

## Phase 4 — Job Management

Implement:

```text
Job
JobRepository
Job DTOs
JobMapper
JobService
JobController
Job state machine
Authorization through dataset ownership
```

Goal:

```text
Dataset
    ↓
Submit Job
    ↓
PENDING
    ↓
Track Job
```

At first, lifecycle processing can be synchronous/simple so that the domain rules are proven before introducing async complexity.

---

## Phase 5 — Async Processing

Implement:

```text
Async configuration
Job processing boundary
RUNNING transition
Progress updates
COMPLETED transition
FAILED transition
Controlled failure behavior
```

Goal:

```text
POST job
    ↓
PENDING
    ↓
Async processing
    ↓
RUNNING
    ↓
COMPLETED / FAILED
```

---

## Phase 6 — Dashboard

Implement:

```text
DashboardSummaryResponse
DashboardService
DashboardController
```

Goal:

```text
GET /api/v1/dashboard/summary
```

Return useful aggregate information such as:

```text
Total datasets
Pending jobs
Running jobs
Completed jobs
Failed jobs
```

---

## Phase 7 — Quality

Add/refine:

```text
Validation
Global exception handling
Unit tests
Controller tests
Integration tests
Pagination
Indexes
Logging
OpenAPI documentation
```

Do not add complexity merely to increase the technology list.

---

## Phase 8 — Infrastructure

Add:

```text
Docker
Docker Compose
PostgreSQL container
Environment configuration
GitHub Actions CI
```

Test the application from a clean environment.

---

## Phase 9 — Portfolio Polish

Verify the complete workflow:

```text
Clone repository
    ↓
Configure environment
    ↓
Start PostgreSQL / Docker Compose
    ↓
Build
    ↓
Run tests
    ↓
Start application
    ↓
Open Swagger
    ↓
Register
    ↓
Login
    ↓
Create dataset
    ↓
Submit job
    ↓
Observe lifecycle
    ↓
View dashboard
```

Then finalize:

- README.
- Architecture documentation.
- API documentation.
- Setup instructions.
- Example requests/responses.
- Screenshots if useful.
- CI status.
- Git history cleanup where appropriate.

---

# 25. MVP Boundary

## Must Have

```text
Java 21
Spring Boot
REST APIs
PostgreSQL
Spring Data JPA
Spring Security
JWT authentication
User roles
Dataset management
Job management
Job lifecycle
Dashboard summary
Validation
Global exception handling
Unit/API testing
Swagger/OpenAPI
Docker
Git/GitHub
```

## Should Have

```text
Async job processing
Pagination
GitHub Actions
Testcontainers
Useful logging
```

## Future / Optional

```text
Kafka
RabbitMQ
Redis
Object storage
Dedicated processing workers
Prometheus
Grafana
OpenTelemetry
Flyway/Liquibase
Kubernetes
Cloud deployment
Microservice extraction
Real scientific processing engine
```

Future technologies must not become accidental MVP requirements.

---

# 26. Things Codex Must Not Do Automatically

Codex must not:

- Convert the modular monolith into microservices.
- Introduce Kafka/RabbitMQ without an explicit requirement.
- Introduce Redis without an explicit requirement.
- Add Kubernetes without an explicit requirement.
- Add a real scientific processing engine when the MVP only requires simulated processing.
- Replace JWT with another authentication system.
- Add MapStruct without a mapping-complexity reason.
- Add Flyway/Liquibase merely for resume keywords.
- Add generic repository abstractions on top of Spring Data without a concrete benefit.
- Create unnecessary interfaces/classes.
- Add generic response wrappers everywhere without an API requirement.
- Expose JPA entities directly through controllers.
- Put business logic into controllers.
- Let clients provide arbitrary dataset ownership.
- Let clients directly set job lifecycle status.
- Put long-running processing inside HTTP request handling.
- Create manual threads.
- Log secrets/passwords/JWTs.
- Commit credentials.
- Modify architecture silently.

---

# 27. Naming Conventions

Use clear Java/Spring naming.

Examples:

```text
DatasetController
DatasetService
DatasetServiceImpl
DatasetRepository
DatasetMapper
DatasetResponse
CreateDatasetRequest
UpdateDatasetRequest
```

Methods should describe behavior:

```text
createDataset()
getDatasetById()
getDatasets()
updateDataset()
deleteDataset()
submitJob()
getJobById()
getJobs()
```

Avoid vague names such as:

```text
process()
handle()
doStuff()
manager()
helper()
```

unless the name is genuinely appropriate to the responsibility.

---

# 28. General Code Organization Rules

### Rule 1 — Feature first

Prefer:

```text
dataset/controller
dataset/service
dataset/repository
```

over a giant global structure such as:

```text
controller/
service/
repository/
entity/
```

### Rule 2 — Keep layers clear

Use:

```text
Controller → Service → Repository
```

### Rule 3 — Protect boundaries

Use DTOs between HTTP and persistence.

### Rule 4 — Keep business logic in services/domain behavior

Controllers coordinate.

Repositories persist.

### Rule 5 — Avoid premature abstractions

Create abstractions when they solve an actual problem.

### Rule 6 — Keep the MVP understandable

A portfolio project should be easy for another engineer to clone, run, inspect, and explain.

---

# 29. Definition of Structural Completion

The project structure is considered complete when:

- Every implemented feature has a clear owning module.
- Controllers are separated from services.
- Services are separated from repositories.
- DTOs protect API boundaries.
- Entities remain persistence/domain representations.
- Security infrastructure is separated from authentication use cases.
- Dataset ownership is enforced server-side.
- Job authorization follows dataset authorization.
- Dashboard remains read/aggregation focused.
- Shared code is genuinely shared.
- No circular module dependencies exist.
- Future technologies are not accidentally implemented as MVP requirements.
- The source tree remains understandable to an external reviewer.

---

# 30. Final Structure Principle

DataFlowX should remain a **clean modular monolith**:

```text
                    ┌──────────────┐
                    │    Client    │
                    └──────┬───────┘
                           │ HTTP
                           ▼
                 ┌───────────────────┐
                 │    Controllers    │
                 └─────────┬─────────┘
                           │
                           ▼
                 ┌───────────────────┐
                 │     Services     │
                 │                   │
                 │ Auth              │
                 │ Dataset           │
                 │ Job               │
                 │ Dashboard         │
                 └─────────┬─────────┘
                           │
                           ▼
                 ┌───────────────────┐
                 │   Repositories    │
                 └─────────┬─────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ PostgreSQL  │
                    └─────────────┘

Security is a cross-cutting infrastructure layer:

Client
  ↓
JWT Authentication
  ↓
SecurityContext
  ↓
Controller / Service authorization

Async processing is introduced at the Job service boundary:

HTTP → PENDING → Async Processing → RUNNING → COMPLETED/FAILED
```

The goal is not to maximize the number of packages or technologies.

The goal is to create a backend whose **structure, boundaries, behavior, tests, and deployment model can be understood and defended in a real engineering interview.**
