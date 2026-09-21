# DataFlowX — System Architecture

**Document Status:** Draft v1.0  
**Project:** DataFlowX — Research Data Processing Platform  
**Primary Goal:** Build a production-style Java/Spring Boot backend that demonstrates practical backend engineering, REST API design, authentication, persistence, asynchronous job processing, testing, containerization, and CI/CD.

---

## 1. Project Overview

DataFlowX is a backend platform for managing research datasets and submitting processing jobs against those datasets.

The platform provides:

- User registration and authentication
- JWT-based authentication and authorization
- Research dataset management
- Processing job submission and lifecycle tracking
- Job progress tracking
- Dashboard/summary APIs
- API documentation through OpenAPI/Swagger
- Automated testing
- Dockerized local deployment
- CI/CD through GitHub Actions

The project is intentionally designed as a realistic backend system rather than a simple CRUD tutorial application.

---

## 2. Engineering Goals

DataFlowX should demonstrate the following engineering capabilities:

1. Java 21 development
2. Spring Boot application design
3. RESTful API development
4. Layered backend architecture
5. Domain-driven modular organization
6. PostgreSQL persistence with Spring Data JPA
7. Secure authentication using Spring Security and JWT
8. Request validation and consistent error handling
9. Asynchronous backend processing
10. Unit and integration testing
11. API documentation
12. Docker-based development
13. CI/CD automation
14. Maintainable Git-based development workflow

The implementation should prioritize clarity, correctness, maintainability, and realistic engineering practices over unnecessary complexity.

---

# 3. Technology Stack

## Backend

- Java 21
- Spring Boot
- Spring Web
- Spring Data JPA
- Spring Security
- JWT

## Database

- PostgreSQL
- Hibernate / JPA

## Testing

- JUnit 5
- Mockito
- Spring Boot Test
- MockMvc
- Testcontainers where appropriate

## API Documentation

- OpenAPI
- Swagger UI

## Infrastructure

- Docker
- Docker Compose

## DevOps

- Git
- GitHub
- GitHub Actions

---

# 4. Architecture Style

DataFlowX uses a **feature-oriented modular structure combined with layered architecture**.

Each business domain is isolated into its own module.

Primary modules:

- `auth`
- `dataset`
- `job`
- `dashboard`

Cross-cutting concerns are separated into:

- `security`
- `config`
- `common`

Within each business module, responsibilities are separated into layers:

```text
Controller
    ↓
DTO / Validation
    ↓
Service
    ↓
Repository
    ↓
Database
```

Entities must not be exposed directly as REST API responses.

Business logic must not be placed inside controllers.

Repositories must focus on persistence and database access.

---

# 5. High-Level System Architecture

```text
                         ┌─────────────────────┐
                         │       Client        │
                         │ Postman / Swagger   │
                         └──────────┬──────────┘
                                    │
                                    │ HTTP/REST
                                    ▼
                         ┌─────────────────────┐
                         │   Spring Security   │
                         │ JWT Authentication  │
                         │ Authorization       │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    Controllers      │
                         │ REST API Boundary   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │       DTOs          │
                         │ Validation/Mapping  │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │      Services       │
                         │   Business Logic    │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    Repositories     │
                         │   Spring Data JPA   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │     PostgreSQL      │
                         └─────────────────────┘
```

Cross-cutting concerns operate across the application:

```text
Security
Validation
Exception Handling
Logging
Configuration
API Documentation
Testing
```

---

# 6. Package Structure

The root package should follow:

```text
com.dataflowx
```

Recommended structure:

```text
com.dataflowx
│
├── DataFlowXApplication.java
│
├── config/
│
├── security/
│
├── common/
│   ├── constants/
│   ├── exception/
│   ├── response/
│   └── validation/
│
├── auth/
│   ├── controller/
│   ├── dto/
│   │   ├── request/
│   │   └── response/
│   ├── entity/
│   ├── mapper/
│   ├── repository/
│   └── service/
│       └── impl/
│
├── dataset/
│   ├── controller/
│   ├── dto/
│   │   ├── request/
│   │   └── response/
│   ├── entity/
│   ├── mapper/
│   ├── repository/
│   └── service/
│       └── impl/
│
├── job/
│   ├── controller/
│   ├── dto/
│   │   ├── request/
│   │   └── response/
│   ├── entity/
│   ├── mapper/
│   ├── repository/
│   └── service/
│       └── impl/
│
└── dashboard/
    ├── controller/
    ├── dto/
    │   └── response/
    └── service/
        └── impl/
```

This structure should evolve only when a concrete implementation requirement justifies a change.

---

# 7. Module Responsibilities

## 7.1 Auth Module

Responsible for:

- User registration
- User login
- Password hashing
- Authentication-related DTOs
- User persistence
- Role information

The Auth module should not contain general dataset or job business logic.

---

## 7.2 Dataset Module

Responsible for:

- Dataset creation
- Dataset retrieval
- Dataset update
- Dataset deletion
- Dataset ownership
- Dataset status
- Dataset validation

A dataset belongs to an authenticated user.

---

## 7.3 Job Module

Responsible for:

- Processing job submission
- Job lifecycle management
- Job status
- Job progress
- Job timestamps
- Job failure information
- Asynchronous processing

A processing job belongs to a dataset.

---

## 7.4 Dashboard Module

Responsible for read-oriented aggregate information such as:

- Total datasets
- Running jobs
- Pending jobs
- Completed jobs
- Failed jobs

Dashboard should not duplicate business logic from Dataset or Job services.

---

# 8. Domain Model

Initial domain model:

```text
User
  │
  │ 1:N
  ▼
Dataset
  │
  │ 1:N
  ▼
Job
```

## User

Fields:

```text
id
username
email
password
role
createdAt
updatedAt
```

Responsibilities:

- Identity
- Credentials
- Authorization role
- Dataset ownership

---

## Dataset

Fields:

```text
id
name
description
owner
status
createdAt
updatedAt
```

Possible dataset status:

```text
ACTIVE
ARCHIVED
```

The exact status model may evolve if the business requirements require more states.

---

## Job

Fields:

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

Progress:

```text
0–100
```

---

# 9. Database Relationships

```text
USER
 │
 │ 1
 │
 │ N
 ▼
DATASET
 │
 │ 1
 │
 │ N
 ▼
JOB
```

Relationship rules:

- One user can own multiple datasets.
- Each dataset has one owner.
- One dataset can have multiple processing jobs.
- Each job belongs to one dataset.
- Deleting a dataset must account for associated jobs and referential integrity.
- Ownership must be enforced at the service/security boundary.

Foreign keys:

```text
dataset.owner_id → user.id
job.dataset_id   → dataset.id
```

---

# 10. REST API Design

All APIs should use a versioned base path:

```text
/api/v1
```

## Authentication

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
```

---

## Dataset

```text
POST   /api/v1/datasets
GET    /api/v1/datasets
GET    /api/v1/datasets/{id}
PUT    /api/v1/datasets/{id}
DELETE /api/v1/datasets/{id}
```

---

## Jobs

```text
POST /api/v1/datasets/{datasetId}/jobs
GET  /api/v1/jobs
GET  /api/v1/jobs/{id}
```

Potential future operations:

```text
POST /api/v1/jobs/{id}/retry
GET  /api/v1/jobs/{id}/status
```

These should only be implemented when required.

---

## Dashboard

```text
GET /api/v1/dashboard/summary
```

---

# 11. API Conventions

## HTTP Methods

Use standard HTTP semantics:

```text
POST    Create resource
GET     Read resource
PUT     Replace/update resource
PATCH   Partial update when justified
DELETE  Delete resource
```

## Status Codes

Expected usage:

```text
200 OK
201 CREATED
204 NO CONTENT
400 BAD REQUEST
401 UNAUTHORIZED
403 FORBIDDEN
404 NOT FOUND
409 CONFLICT
422 UNPROCESSABLE ENTITY (only if justified)
500 INTERNAL SERVER ERROR
```

The implementation should use the most semantically appropriate status code rather than returning `200` for every operation.

---

# 12. DTO Strategy

Entities must never be used directly as the public API contract.

Use:

```text
Request DTO
    ↓
Validation
    ↓
Service
    ↓
Entity
    ↓
Repository
    ↓
Entity
    ↓
Response DTO
```

Examples:

```text
RegisterRequest
LoginRequest

DatasetCreateRequest
DatasetUpdateRequest
DatasetResponse

JobCreateRequest
JobResponse

DashboardSummaryResponse
```

DTOs should expose only information required by the API.

Passwords must never appear in response DTOs.

---

# 13. Validation

Use Jakarta Bean Validation for incoming requests.

Examples:

```text
@NotBlank
@Email
@Size
@NotNull
@Min
@Max
```

Validation belongs at the API boundary.

Business-level validation belongs in the service layer.

Example:

```text
API validation:
"dataset name must not be blank"

Business validation:
"user cannot modify a dataset they do not own"
```

---

# 14. Exception Handling

Use a centralized exception handling strategy.

Recommended:

```text
@RestControllerAdvice
```

Application exceptions should be represented through meaningful custom exceptions.

Examples:

```text
ResourceNotFoundException
UnauthorizedOperationException
ResourceConflictException
InvalidJobStateException
```

Consistent error response:

```json
{
  "timestamp": "...",
  "status": 404,
  "error": "NOT_FOUND",
  "message": "Dataset not found",
  "path": "/api/v1/datasets/123"
}
```

The exact schema may evolve, but error responses must remain consistent.

Internal implementation details and stack traces must not be exposed to clients.

---

# 15. Authentication & Authorization

Authentication uses:

```text
Spring Security
+
JWT
+
Password hashing
```

Authentication flow:

```text
Client
  │
  │ username + password
  ▼
POST /auth/login
  │
  ▼
AuthenticationManager
  │
  ▼
UserDetailsService
  │
  ▼
Password Verification
  │
  ▼
JWT Generation
  │
  ▼
Client receives token
```

Authenticated request:

```text
Client
  │
  │ Authorization: Bearer <JWT>
  ▼
JWT Filter
  │
  ▼
Token Validation
  │
  ▼
SecurityContext
  │
  ▼
Controller
```

Passwords must be stored using a secure password hashing mechanism such as BCrypt.

JWT secrets must never be hard-coded in source control.

Secrets should be provided through environment variables/configuration.

---

# 16. Authorization Model

Initial roles:

```text
USER
ADMIN
```

Initial principle:

- Authenticated users can manage their own datasets.
- Users can submit and view jobs for datasets they are authorized to access.
- Admin capabilities may be added where useful.

Authorization must be enforced server-side.

Never trust ownership information supplied by the client.

---

# 17. Job Processing Architecture

Job submission:

```text
Client
  │
  ▼
Job Controller
  │
  ▼
Job Service
  │
  ▼
Create Job
  │
  ▼
PENDING
```

Processing:

```text
PENDING
   │
   ▼
RUNNING
   │
   ├───────────────┐
   ▼               ▼
COMPLETED        FAILED
```

The initial implementation should keep the processing model intentionally simple.

---

# 18. Asynchronous Processing

After the basic job lifecycle is working, processing should be extended using Spring asynchronous execution.

Conceptual flow:

```text
POST /jobs
    │
    ▼
Create PENDING job
    │
    ▼
Trigger async processing
    │
    ▼
RUNNING
    │
    ▼
Process dataset
    │
    ├── success → COMPLETED
    └── error   → FAILED
```

Potential implementation:

```text
@Async
```

The asynchronous processor should not block the HTTP request while a long-running job is executing.

Important:

- Job status must be persisted.
- Failures must be captured.
- Progress must be updated safely.
- Transactions must be designed carefully around asynchronous boundaries.

---

# 19. Concurrency Considerations

The project should demonstrate awareness of concurrent backend execution without introducing unnecessary distributed infrastructure.

Consider:

- Multiple jobs running concurrently
- Race conditions during job status updates
- Transaction boundaries
- Thread safety
- Consistent progress updates

If optimistic locking becomes necessary, JPA versioning may be introduced:

```text
@Version
```

This should be added based on an actual concurrency requirement rather than for decoration.

---

# 20. Dashboard Architecture

Dashboard APIs should use efficient aggregate database queries where practical.

Example:

```text
Total Datasets
Running Jobs
Pending Jobs
Completed Jobs
Failed Jobs
```

Conceptual response:

```json
{
  "totalDatasets": 25,
  "pendingJobs": 3,
  "runningJobs": 2,
  "completedJobs": 18,
  "failedJobs": 2
}
```

Dashboard is primarily a read/aggregation module.

It should not directly manipulate Dataset or Job entities.

---

# 21. Persistence Strategy

Use:

```text
Spring Data JPA
Hibernate
PostgreSQL
```

Repositories should extend appropriate Spring Data interfaces.

Example conceptual pattern:

```text
JpaRepository<Entity, ID>
```

Database-specific queries should only be introduced when derived queries are insufficient.

Avoid unnecessary native SQL.

Transactions should be placed at the service/business boundary where business operations require atomicity.

---

# 22. Configuration

Configuration should be externalized.

Environment-specific values should not be hard-coded.

Examples:

```text
DATABASE_URL
DATABASE_USERNAME
DATABASE_PASSWORD
JWT_SECRET
JWT_EXPIRATION
```

Local development should be supported through Docker Compose.

Sensitive credentials must not be committed to Git.

Provide safe example configuration where required:

```text
.env.example
```

---

# 23. Docker Architecture

Local infrastructure:

```text
┌─────────────────────────────┐
│       Docker Compose        │
│                             │
│  ┌─────────────┐            │
│  │ DataFlowX   │            │
│  │ Spring Boot │            │
│  └──────┬──────┘            │
│         │                   │
│         ▼                   │
│  ┌─────────────┐            │
│  │ PostgreSQL  │            │
│  └─────────────┘            │
│                             │
└─────────────────────────────┘
```

The application should be buildable and runnable in a container.

PostgreSQL should use a persistent Docker volume for local development.

---

# 24. Testing Strategy

Testing should be introduced throughout development rather than added at the very end.

## Unit Tests

Focus on:

- Service business logic
- Validation-related behavior
- Job state transitions
- Authorization rules

Use Mockito where appropriate.

---

## Controller Tests

Use:

```text
MockMvc
```

Test:

- HTTP status
- Request validation
- Response structure
- Authentication/authorization behavior
- Error responses

---

## Repository/Integration Tests

Use Spring Boot integration testing.

Where useful, use Testcontainers with PostgreSQL so database behavior is tested against a real PostgreSQL instance.

---

# 25. API Documentation

Use OpenAPI/Swagger.

Swagger UI should document:

- Authentication
- Dataset endpoints
- Job endpoints
- Dashboard endpoints
- Request schemas
- Response schemas
- Error responses

Protected endpoints should clearly indicate Bearer JWT authentication.

---

# 26. Logging & Observability

Use structured, useful application logging.

Log important events such as:

```text
Authentication attempts
Dataset creation/update
Job submission
Job state transitions
Processing failures
Unexpected application errors
```

Do not log:

- Passwords
- JWT tokens
- Database credentials
- Sensitive secrets

Avoid excessive debug logging in production-oriented code.

---

# 27. CI/CD

GitHub Actions should eventually perform:

```text
Checkout
   ↓
Set up Java 21
   ↓
Build
   ↓
Run Tests
   ↓
Package Application
```

A later stage may build a Docker image.

The CI pipeline must fail when tests or compilation fail.

---

# 28. Git Workflow

Use meaningful commits.

Examples:

```text
chore: initialize spring boot project
feat: add database configuration
feat: implement user registration
feat: implement jwt authentication
feat: add dataset management APIs
feat: add processing job lifecycle
feat: add async job processing
feat: add dashboard summary
test: add dataset service tests
docs: add api documentation
build: add docker compose setup
ci: add github actions workflow
```

Avoid giant commits containing unrelated functionality.

---

# 29. Development Strategy

Implementation should happen incrementally.

## Phase 1 — Foundation

- Project structure
- Configuration
- PostgreSQL
- JPA
- Health/basic application verification

## Phase 2 — Authentication

- User entity
- Registration
- Password hashing
- Login
- JWT
- Spring Security

## Phase 3 — Dataset Management

- Dataset entity
- Relationships
- DTOs
- CRUD APIs
- Ownership rules
- Validation

## Phase 4 — Job Management

- Job entity
- Dataset relationship
- Job submission
- Status lifecycle
- Progress tracking

## Phase 5 — Async Processing

- Async processor
- Background job execution
- Status transitions
- Failure handling
- Concurrency considerations

## Phase 6 — Dashboard

- Aggregate queries
- Summary endpoint

## Phase 7 — Engineering Quality

- Exception handling
- Testing
- OpenAPI
- Logging
- API consistency

## Phase 8 — Infrastructure

- Dockerfile
- Docker Compose
- GitHub Actions
- CI validation

## Phase 9 — Portfolio Polish

- README
- Architecture diagram
- API examples
- Setup instructions
- Screenshots
- Resume bullets
- GitHub cleanup

---

# 30. Definition of Done

A feature is not considered complete merely because the code compiles.

A feature should generally satisfy:

```text
✓ Implementation
✓ Validation
✓ Error handling
✓ Appropriate HTTP status codes
✓ Security/authorization where applicable
✓ Unit tests
✓ Integration/controller tests where appropriate
✓ API documentation
✓ Logging where useful
✓ README/documentation update
✓ Application still builds successfully
```

Not every item is mandatory for every tiny internal change, but externally visible functionality should meet the relevant criteria.

---

# 31. Architectural Principles

The following principles are mandatory unless there is a documented reason to deviate.

### Separation of Concerns

Each layer has a clear responsibility.

### Single Responsibility

Classes should have focused responsibilities.

### Dependency Direction

```text
Controller → Service → Repository
```

Controllers should not bypass services.

### API Boundary Protection

Entities are internal persistence models.

DTOs are external API contracts.

### Secure by Default

Authentication, authorization, validation, and secret management are treated as first-class concerns.

### Fail Clearly

Errors should produce meaningful, consistent responses.

### Test What Matters

Tests should verify business behavior rather than merely increasing coverage numbers.

### Avoid Premature Complexity

Do not add Kafka, Redis, Kubernetes, microservices, or other infrastructure unless the project requirements genuinely justify them.

---

# 32. Future Extension Points

The architecture intentionally leaves room for future evolution.

Possible future additions:

```text
Message Queue
Kafka / RabbitMQ

Caching
Redis

Object Storage
S3-compatible storage

Advanced Processing
Dedicated worker services

Observability
Prometheus / Grafana

Distributed Tracing
OpenTelemetry

Database Migration
Flyway / Liquibase

Deployment
Kubernetes / Cloud platform
```

These are **future extension points**, not part of the initial MVP.

---

# 33. MVP Boundary

The MVP must remain achievable within approximately 2–3 weeks.

### Must Have

```text
Java 21
Spring Boot
REST APIs
PostgreSQL
Spring Data JPA
Spring Security
JWT
Dataset management
Job management
Job status tracking
Dashboard API
Validation
Exception handling
Testing
Swagger/OpenAPI
Docker
GitHub
```

### Should Have

```text
Async processing
GitHub Actions CI
Testcontainers
```

### Future / Optional

```text
Kafka
Redis
Object storage
Kubernetes
Microservices
Advanced distributed processing
```

The project should never sacrifice core correctness merely to add more technologies.

---

# 34. Target Engineering Outcome

At completion, DataFlowX should demonstrate that the developer can:

- Design a backend system from requirements
- Structure a Spring Boot application cleanly
- Build secure REST APIs
- Model relational data
- Implement business logic
- Handle asynchronous processing
- Write meaningful automated tests
- Document APIs
- Containerize an application
- Build a basic CI pipeline
- Explain architectural trade-offs

The project should be explainable in an interview from:

```text
Requirement
    ↓
Architecture
    ↓
Database Design
    ↓
API Design
    ↓
Implementation
    ↓
Testing
    ↓
Docker
    ↓
CI/CD
```

---

# 35. Architectural Decision

**DataFlowX is a modular monolithic Spring Boot application for the initial release.**

It is intentionally **not** a microservices system.

Reason:

- Faster development
- Easier local setup
- Easier testing
- Lower operational complexity
- Appropriate for the project scope
- Still demonstrates strong backend engineering fundamentals

The architecture should make future extraction of heavy processing into separate workers/services possible without forcing distributed-system complexity into the MVP.

---

# 36. Source of Truth

This document defines the intended architecture of DataFlowX.

When implementing the project:

1. Read this document before making architectural changes.
2. Follow the defined module boundaries.
3. Implement incrementally.
4. Keep the application buildable.
5. Update this document when a significant architectural decision changes.
6. Do not introduce technologies solely to make the project appear more complex.
7. Prefer demonstrable engineering quality over technology count.

---

**End of Architecture Document**


---

# 37. Architecture Refinements — v1.1

This section refines the v1.0 architecture without changing the core modular-monolith decision.

The goal is to remove implementation ambiguity before the architecture is handed to Codex.

---

## 37.1 Auth vs Security Boundary

The `auth` and `security` packages have distinct responsibilities.

### `auth`

Owns the user-facing authentication domain:

```text
User entity
User repository
Registration
Login use case
Authentication DTOs
User/role domain information
```

### `security`

Owns security infrastructure:

```text
SecurityConfig
JWT generation
JWT validation
JWT authentication filter
Authentication provider integration
Security-related utilities
```

Dependency principle:

```text
auth
  │
  │ provides user/authentication domain data
  ▼
security
  │
  │ provides security infrastructure
  ▼
Spring Security
```

Security infrastructure must not contain Dataset or Job business logic.

Dataset and Job modules must not implement their own JWT validation.

---

## 37.2 Module Dependency Rules

The application is modular, but it remains a single deployable application.

Allowed high-level dependency direction:

```text
Controller
    ↓
Service
    ↓
Repository
    ↓
Entity / Database
```

Cross-module rules:

```text
Dataset → may depend on authenticated user identity
Job     → may depend on Dataset domain
Dashboard → may depend on read-oriented Dataset/Job data
```

Avoid circular dependencies such as:

```text
Dataset → Job → Dataset
```

when a simpler service boundary can solve the requirement.

Modules must not directly access another module's repository unless there is a documented architectural reason.

Prefer communication through public service/domain contracts.

---

## 37.3 Mapper Strategy

The initial implementation will use **manual mapping**.

Reason:

- Small project scope
- Explicit mapping is easy to understand
- No additional mapping framework is required
- Mapping logic remains visible during interviews

Conceptual flow:

```text
Request DTO
    ↓
Service
    ↓
Entity

Entity
    ↓
Mapper
    ↓
Response DTO
```

MapStruct or another mapping framework may be introduced later only if mapping complexity materially increases.

---

## 37.4 Dataset Ownership Rules

Dataset ownership is a server-side authorization concern.

The client must never be trusted to determine the owner.

For dataset creation:

```text
Authenticated JWT
      ↓
Current User
      ↓
Dataset.owner
```

The API should not require the client to submit an arbitrary `ownerId`.

For update/delete:

```text
Request
  ↓
Authenticated User
  ↓
Load Dataset
  ↓
Verify ownership / authorization
  ↓
Perform operation
```

Expected behavior:

```text
Owner → allowed
Admin → allowed where policy permits
Other authenticated user → 403 FORBIDDEN
Unauthenticated user → 401 UNAUTHORIZED
```

---

## 37.5 Job Ownership and Access Rules

Jobs inherit access restrictions from their associated dataset.

A user may access a job when they are authorized to access its dataset.

Conceptual rule:

```text
User
  ↓
Dataset ownership/access
  ↓
Job access
```

The client must not be able to bypass dataset authorization by directly providing a job ID.

---

## 37.6 Authorization Matrix

Initial authorization model:

| Operation | Public | USER | ADMIN |
|---|---:|---:|---:|
| Register | ✓ | — | — |
| Login | ✓ | — | — |
| Create Dataset | — | ✓ | ✓ |
| View Own Dataset | — | ✓ | ✓ |
| Update Own Dataset | — | ✓ | ✓ |
| Delete Own Dataset | — | ✓ | ✓ |
| Submit Job for Authorized Dataset | — | ✓ | ✓ |
| View Own/Authorized Jobs | — | ✓ | ✓ |
| View All Jobs | — | — | ✓ |
| System-wide Dashboard | — | — | ✓ |

The exact ADMIN capabilities may expand later.

Authorization must always be enforced server-side.

---

## 37.7 Collection API and Pagination

Collection endpoints should be designed to support pagination.

Initial examples:

```text
GET /api/v1/datasets?page=0&size=20
GET /api/v1/jobs?page=0&size=20
```

Optional future parameters:

```text
sort
status
```

Example:

```text
GET /api/v1/jobs?page=0&size=20&sort=submittedAt,desc
```

Pagination should use Spring Data's `Pageable` where appropriate.

The API response should expose enough metadata for clients to navigate result pages.

Do not load unbounded collections from the database when a paginated query is appropriate.

---

## 37.8 Database Indexing Strategy

Indexes should be added based on actual query and relationship requirements.

Initial candidates:

```text
user.email
dataset.owner_id
job.dataset_id
job.status
job.submitted_at
```

Rationale:

- `user.email` supports login lookup.
- `dataset.owner_id` supports owner-based dataset queries.
- `job.dataset_id` supports dataset/job relationship queries.
- `job.status` supports dashboard/job filtering.
- `job.submitted_at` supports ordering and recent-job queries.

Indexes should be verified against actual PostgreSQL access patterns rather than added indiscriminately.

---

## 37.9 Job Processing Definition for MVP

The MVP does not require a real scientific data-processing engine.

DataFlowX should demonstrate the **backend job-processing lifecycle**.

A processing job may represent a deterministic simulated processing task.

Example lifecycle:

```text
POST /jobs
    ↓
Create PENDING job
    ↓
Start asynchronous task
    ↓
RUNNING
    ↓
Perform deterministic processing steps
    ↓
Update progress
    ↓
COMPLETED
```

Controlled failure must also be possible for testing:

```text
RUNNING
    ↓
Processing error
    ↓
FAILED
    ↓
Persist errorMessage
```

The implementation should make the processing behavior deterministic enough to test.

The architecture must not pretend that a production scientific processing engine exists when the MVP only demonstrates job orchestration.

Future versions may replace the simulated processor with:

```text
Python/Java processing engine
Containerized workers
External scientific tools
Message queues
Distributed workers
```

without changing the public job lifecycle concept.

---

## 37.10 Job State Transition Rules

Valid initial transitions:

```text
PENDING → RUNNING
PENDING → FAILED

RUNNING → COMPLETED
RUNNING → FAILED
```

Invalid transitions should be rejected.

Examples:

```text
COMPLETED → RUNNING   ✗
COMPLETED → FAILED    ✗
FAILED → RUNNING      ✗
```

If retry is introduced later, it should use an explicit operation such as:

```text
POST /api/v1/jobs/{id}/retry
```

rather than allowing arbitrary client-side status changes.

The client must not directly set:

```text
RUNNING
COMPLETED
FAILED
```

through a generic status-update endpoint.

---

## 37.11 Async Processing Boundary

The HTTP request responsible for job submission should remain short-lived.

Conceptual sequence:

```text
HTTP Request
    ↓
Validate dataset access
    ↓
Create PENDING job
    ↓
Persist job
    ↓
Trigger asynchronous processing
    ↓
Return job information
```

The actual processing occurs outside the request thread.

The asynchronous component is responsible for:

```text
PENDING → RUNNING
processing
progress updates
COMPLETED / FAILED
```

The async boundary must be clearly separated from the REST controller.

Controllers must not contain `Thread`, `sleep`, or manual thread-management logic.

Spring's asynchronous execution facilities should manage background execution.

---

## 37.12 Transaction Boundaries

Transactions belong primarily at the service/business-operation boundary.

Typical example:

```text
@Transactional
createDataset(...)
```

For asynchronous processing, transaction boundaries must be explicit.

Do not assume that a transaction opened in the HTTP request automatically remains active inside an asynchronous task.

The async processor should load the required persistent state within its own transaction where necessary.

Avoid keeping database transactions open while performing long-running processing work.

---

## 37.13 API Response Convention

The API should use clear resource responses rather than wrapping every response in unnecessary generic structures.

For example:

```json
{
  "id": 101,
  "name": "Genome Dataset",
  "description": "Research dataset",
  "status": "ACTIVE",
  "createdAt": "2026-09-14T10:30:00Z"
}
```

For collection endpoints, pagination metadata should be included when pagination is used.

Error responses should follow the common error contract defined in Section 14.

The API should remain consistent across modules.

---

## 37.14 Time and Timestamp Strategy

Persist timestamps using timezone-aware Java time types where appropriate.

Preferred application-level types:

```text
Instant
OffsetDateTime
```

Avoid legacy:

```text
java.util.Date
java.sql.Timestamp
```

unless a concrete compatibility requirement exists.

The API should use a consistent ISO-8601 representation.

Example:

```text
2026-09-14T10:30:00Z
```

Database and application timezone behavior should be explicitly configured and documented.

---

## 37.15 Entity Design Rules

Entities are persistence models.

Rules:

- Do not expose entities directly from controllers.
- Do not place API-specific formatting logic in entities.
- Avoid bidirectional relationships unless they are genuinely required.
- Be deliberate with `FetchType`.
- Avoid accidental N+1 queries.
- Do not use `CascadeType.ALL` automatically.
- Define delete behavior explicitly.
- Keep entity relationships aligned with database ownership.

For `User → Dataset`, a many-to-one reference from Dataset to User is sufficient for the initial use cases.

For `Dataset → Job`, a many-to-one reference from Job to Dataset is sufficient unless a reverse collection is required.

---

## 37.16 Delete Semantics

Dataset deletion must account for associated jobs.

Initial policy:

```text
A dataset cannot be deleted if associated processing jobs would violate
referential integrity or business rules.
```

The exact behavior must be selected during implementation:

```text
Option A: reject deletion when jobs exist
Option B: explicitly delete/archive dependent jobs
Option C: soft-delete/archive the dataset
```

Do not use cascading deletion automatically just to make the database operation convenient.

The selected policy must be documented in the implementation.

---

## 37.17 Security Rules

Mandatory security rules:

```text
✓ Passwords hashed before persistence
✓ JWT secret externalized
✓ No secrets committed to Git
✓ JWT tokens never logged
✓ Passwords never logged
✓ Authorization enforced server-side
✓ Ownership verified server-side
✓ Protected endpoints require authentication
✓ Input validation enabled
✓ Error responses do not expose stack traces
```

CORS, CSRF, session management, and security headers should be configured according to the stateless JWT architecture rather than copied from generic tutorials.

---

## 37.18 Configuration Profiles

Configuration should support at least:

```text
default/local
test
```

Production deployment may later add:

```text
prod
```

Environment-specific secrets and infrastructure configuration must remain outside source control.

Tests must not depend on a developer's local PostgreSQL installation.

---

## 37.19 Database Migration Strategy

For the initial development stage, Hibernate schema generation may be used for rapid iteration.

Before the project is considered portfolio-complete, a migration strategy should be evaluated.

Preferred future direction:

```text
Flyway
```

Migration tooling should be introduced when schema evolution becomes meaningful.

The project should not add migration tooling solely as a resume keyword if it provides no practical value during the current development cycle.

---

## 37.20 Observability Boundary

Initial observability:

```text
Application logs
Health/basic application verification
Job state logging
Exception logging
```

Future observability:

```text
Actuator
Metrics
Prometheus
Grafana
OpenTelemetry
Distributed tracing
```

Spring Boot Actuator may be added to the MVP if it can be integrated without unnecessary complexity.

---

## 37.21 Testing Pyramid

The project should follow a practical testing pyramid:

```text
             ┌───────────────┐
             │  Integration  │
             │     Tests     │
             └───────────────┘
          ┌─────────────────────┐
          │  Controller/API     │
          │      Tests          │
          └─────────────────────┘
     ┌───────────────────────────────┐
     │        Unit Tests             │
     │ Service / Business Behaviour  │
     └───────────────────────────────┘
```

Most business rules should be covered by fast unit tests.

Critical API/database behavior should be covered with integration tests.

Async job lifecycle tests should verify:

```text
PENDING → RUNNING → COMPLETED
PENDING → RUNNING → FAILED
```

---

## 37.22 Definition of a Portfolio-Ready Release

The project is portfolio-ready when a fresh developer can:

```text
1. Clone repository
2. Configure environment
3. Start PostgreSQL/Docker Compose
4. Build application
5. Run tests
6. Start application
7. Open Swagger UI
8. Register/login
9. Create dataset
10. Submit processing job
11. Observe job lifecycle
12. View dashboard
```

The README must document this flow.

A reviewer should be able to understand the architecture without reading the entire source code.

---

## 37.23 Architecture Change Protocol

Codex and future contributors must not silently change architectural decisions.

Before introducing a significant architectural change:

```text
1. Identify the requirement
2. Explain why the existing architecture is insufficient
3. Propose the change
4. Identify affected modules
5. Consider simpler alternatives
6. Update ARCHITECTURE.md
7. Implement the change
8. Run relevant tests
```

Small implementation details do not require an architecture-document update.

Significant changes do.

---

# 38. Final v1.1 Architectural Contract

The following decisions are now considered the baseline contract for implementation:

```text
Architecture:
    Modular Monolith

Organization:
    Feature-oriented + layered

Domains:
    Auth
    Dataset
    Job
    Dashboard

Security:
    Spring Security + JWT
    Stateless authentication

Persistence:
    PostgreSQL + Spring Data JPA

API:
    REST /api/v1
    DTO-based boundary
    Validation
    Consistent errors
    Pagination for collections

Authorization:
    Server-side ownership checks
    USER / ADMIN roles

Job Processing:
    Persisted lifecycle
    PENDING → RUNNING → COMPLETED/FAILED
    Asynchronous execution
    Deterministic MVP processor

Testing:
    JUnit
    Mockito
    MockMvc
    Integration tests
    Testcontainers where useful

Documentation:
    OpenAPI / Swagger

Infrastructure:
    Docker
    Docker Compose

CI:
    GitHub Actions

Mapping:
    Manual initially

Database:
    Explicit relationships
    Targeted indexes
    Deliberate delete semantics

Engineering Principle:
    Realistic complexity, not technology accumulation
```

This v1.1 contract should be treated as the baseline before creating the detailed project skeleton and Codex implementation instructions.

---

**End of Architecture v1.1 Refinements**
