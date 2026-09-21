# DataFlowX — Codex Instructions

**Document Version:** 1.0  
**Status:** Master Implementation Instructions  
**Project:** DataFlowX — Research Data Processing Platform  
**Architecture:** Modular Monolith + Feature-Oriented Layered Architecture  
**Primary Stack:** Java 21, Spring Boot, Spring Data JPA, PostgreSQL, Spring Security, JWT, Maven

---

## 1. Purpose

This document is the **operating rulebook for Codex while implementing DataFlowX**.

Codex must use the project's approved architecture and project structure as the source of truth.

The three documents have distinct roles:

```text
ARCHITECTURE.md
    ↓
What the system is + why it is designed this way

PROJECT_STRUCTURE.md
    ↓
Where code belongs + implementation organization

CODEX_INSTRUCTIONS.md
    ↓
How Codex must implement, modify, verify, and evolve the system
```

Codex must not silently redesign the project.

If an implementation detail is unclear, prefer the smallest reasonable solution consistent with the architecture and project structure.

---

# 2. Source-of-Truth Hierarchy

When making implementation decisions, use this priority order:

```text
1. Explicit user instruction in the current task
2. Architecture v1.1
3. PROJECT_STRUCTURE.md
4. CODEX_INSTRUCTIONS.md
5. Existing working project code
6. Normal framework conventions
7. Personal implementation preference
```

If two sources appear to conflict:

1. Do not silently choose one.
2. Identify the conflict.
3. Explain the impact.
4. Prefer the higher-priority source.
5. If the conflict is architectural and cannot be safely resolved, stop and ask before making a significant redesign.

A small implementation detail may be resolved using normal Spring/Java conventions.

A significant architectural change must not be made silently.

---

# 2.1 Mandatory Pre-Flight: Read Before Coding

Before making any implementation change, Codex must first read and use:

```text
ARCHITECTURE.md
PROJECT_STRUCTURE.md
CODEX_INSTRUCTIONS.md
```

Then inspect the actual repository state.

The documents answer different questions:

```text
Architecture        → system design and constraints
Project Structure   → code organization and ownership
Codex Instructions  → implementation behavior and guardrails
Repository          → what actually exists right now
```

Do not implement from memory, from a single document, or from an outdated repository assumption.

If the repository differs from the documentation, report the difference before making a significant structural change.

Do not rewrite documentation merely to make it agree with an incorrect implementation. First determine which side is actually intended by the current task.

---

# 3. Project Goal

DataFlowX is a portfolio-grade backend designed to demonstrate practical backend engineering.

The system should demonstrate:

- Java 21.
- Spring Boot.
- REST API design.
- PostgreSQL.
- Spring Data JPA.
- Spring Security.
- JWT authentication.
- Role-based authorization.
- Dataset management.
- Processing-job lifecycle management.
- Asynchronous processing.
- Dashboard aggregation.
- Validation.
- Exception handling.
- Testing.
- OpenAPI/Swagger.
- Docker.
- Git/GitHub.
- CI where included in the implementation phase.

The goal is **not** to maximize technologies.

The goal is to build a coherent backend that another engineer can clone, run, inspect, test, and discuss in an interview.

---

# 4. Architecture Must Remain a Modular Monolith

Do not convert DataFlowX into microservices.

The approved architecture is:

```text
                    DataFlowX
                       │
              Modular Monolith
                       │
       ┌───────────────┼────────────────┐
       │               │                │
      auth          dataset            job
       │               │                │
       └───────────────┼────────────────┘
                       │
                   dashboard

Cross-cutting:
security
config
common
```

The project should remain deployable as one Spring Boot application.

Future extraction into worker services or microservices may be discussed later, but it is not an MVP implementation requirement.

---

# 5. Approved Feature Modules

The core modules are:

```text
auth
dataset
job
dashboard
```

Cross-cutting infrastructure:

```text
security
config
common
```

Each module should have a clear responsibility.

Do not create additional top-level business modules unless a real requirement appears.

---

# 6. Layering Rule

The default flow is:

```text
HTTP Request
    ↓
Controller
    ↓
Request DTO + Validation
    ↓
Service
    ↓
Repository
    ↓
PostgreSQL
```

For responses:

```text
PostgreSQL
    ↓
Entity
    ↓
Service
    ↓
Mapper
    ↓
Response DTO
    ↓
HTTP Response
```

Respect these boundaries.

## Controllers

Controllers:

- Accept HTTP requests.
- Bind DTOs.
- Trigger request validation.
- Read path/query parameters.
- Call services.
- Return response DTOs.
- Return appropriate HTTP status codes.

Controllers must remain thin.

Controllers must not:

- Implement business rules.
- Access repositories directly.
- Implement JWT logic.
- Perform long-running processing.
- Manage database transactions unnecessarily.
- Become a dumping ground for application logic.

## Services

Services own application/business logic.

Examples:

- Ownership checks.
- Authorization decisions.
- Resource existence checks.
- State transitions.
- Business validation.
- Transaction boundaries.
- Coordination between application components.

## Repositories

Repositories own persistence operations.

Prefer Spring Data JPA.

Do not put business workflows into repositories.

---

# 7. Feature-Oriented Package Rule

Prefer:

```text
dataset/
├── controller/
├── dto/
├── entity/
├── mapper/
├── repository/
└── service/
```

Do not reorganize the entire project into global layers such as:

```text
controller/
service/
repository/
entity/
```

The feature-oriented structure is intentional.

Keep related feature code together.

---

# 8. Exact Package Ownership

## `auth`

Owns:

- User entity.
- User repository.
- Registration.
- Login use case.
- Auth DTOs.
- User role concepts.
- Authentication-related application logic.

Does not own:

- JWT filter implementation.
- Generic security configuration.
- Dataset logic.
- Job processing.
- Dashboard aggregation.

## `security`

Owns:

- JWT generation.
- JWT validation.
- JWT authentication filter.
- UserDetails integration.
- Security utilities.
- Authentication infrastructure.

Dataset and job modules must not implement JWT validation themselves.

## `dataset`

Owns:

- Dataset entity.
- Dataset persistence.
- Dataset CRUD.
- Dataset ownership.
- Dataset status.
- Dataset DTOs/mapping.
- Dataset-specific business rules.

## `job`

Owns:

- Job entity.
- Job persistence.
- Job submission.
- Job authorization.
- Job state transitions.
- Progress.
- Processing execution.
- Async processing.
- Failure handling.

## `dashboard`

Owns:

- Dashboard summary endpoint.
- Aggregate read operations.
- Dataset/job counts.

Dashboard must not duplicate dataset or job business logic.

---

# 9. Authentication and Security Boundary

Keep this boundary explicit:

```text
auth
 ├── User
 ├── UserRepository
 ├── Register/Login
 └── AuthService

security
 ├── JwtService
 ├── JwtAuthenticationFilter
 ├── UserDetails integration
 └── Security infrastructure
```

Authentication answers:

> Who is this user?

Authorization answers:

> Is this user allowed to perform this operation on this resource?

JWT infrastructure should authenticate the request.

Dataset/job services should enforce resource-level authorization.

---

# 10. Security Rules

Implement security with:

- Spring Security.
- JWT.
- Password hashing.
- Stateless authentication.
- Role-based authorization.

Use BCrypt or the appropriate Spring Security password encoder.

Never store plaintext passwords.

Never log:

```text
password
password hash
JWT token
JWT secret
database password
credentials
```

JWT secrets and other credentials must come from external configuration.

Never commit real credentials.

Do not copy security configuration blindly from tutorials. Configure it according to the actual stateless JWT architecture.

---

# 11. Roles

Approved roles:

```text
USER
ADMIN
```

Expected authorization:

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

Do not weaken these rules simply to make an endpoint easier to implement.

---

# 12. Dataset Ownership

Dataset ownership is server-side.

The client must not provide an arbitrary `ownerId` and have the server trust it.

The owner should be derived from the authenticated user.

Expected conceptual flow:

```text
JWT
 ↓
Authenticated User
 ↓
DatasetService
 ↓
Create dataset with authenticated user as owner
```

For user-owned resources:

```text
Owner → allowed
Admin → allowed according to role policy
Other USER → forbidden
Unauthenticated → unauthorized
```

Do not rely only on frontend checks.

Authorization must be enforced by the backend.

---

# 13. Job Authorization

Job access follows dataset authorization.

Conceptually:

```text
User
  ↓ owns
Dataset
  ↓ contains
Job
```

A user must not bypass authorization merely by knowing a Job ID.

When retrieving or manipulating a job, verify that the authenticated user is authorized through the associated dataset, unless the user has the appropriate administrative role.

---

# 14. DTO Boundary

Never expose JPA entities directly through REST controllers.

Use DTOs.

Expected request DTOs include:

```text
RegisterRequest
LoginRequest
CreateDatasetRequest
UpdateDatasetRequest
CreateJobRequest
```

Expected response DTOs include:

```text
AuthResponse
DatasetResponse
JobResponse
DashboardSummaryResponse
```

Request DTOs handle API input validation.

Services handle business validation.

Response DTOs must never contain sensitive persistence/security information.

---

# 15. Validation

Use Jakarta Bean Validation for request-shape validation.

Examples:

```java
@NotBlank
@Email
@Size
```

Validation should happen at the API boundary.

Business rules remain in services.

Examples of business validation:

```text
Dataset exists
User owns dataset
Job belongs to dataset
Job transition is valid
Requested resource is accessible
```

Do not attempt to encode all business rules as DTO annotations.

---

# 16. Entity Rules

Core entities:

```text
User
Dataset
Job
```

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

Progress:

```text
0–100
```

Use `Instant` or `OffsetDateTime` consistently for timestamps.

Use ISO-8601 representations at the API boundary.

Avoid legacy date/time APIs unless there is a concrete reason.

---

# 17. JPA Rules

Use Spring Data JPA/Hibernate.

Prefer:

```text
JpaRepository
```

Use deliberate relationship mappings.

Avoid unnecessary bidirectional relationships.

Be conscious of fetch behavior.

Avoid accidental N+1 queries.

Do not add:

```java
CascadeType.ALL
```

automatically.

Deletion semantics must reflect an explicit business decision.

Possible dataset deletion behavior:

- Reject deletion when jobs exist.
- Explicitly delete/archive dependent jobs.
- Archive the dataset.

Do not let JPA cascade behavior accidentally define business behavior.

---

# 18. Repository Rules

Initial repositories:

```text
UserRepository
DatasetRepository
JobRepository
```

Query preference:

```text
1. Derived Spring Data query
2. JPQL/custom query when needed
3. Native SQL only with a clear reason
```

Do not create generic repository abstractions merely to look architectural.

Do not add a repository method unless the application actually needs it.

---

# 19. Mapper Rules

Use simple manual mapping initially.

Examples:

```text
UserMapper
DatasetMapper
JobMapper
```

Do not add MapStruct merely for a technology keyword.

If mapping complexity becomes significant, evaluate MapStruct explicitly.

---

# 20. API Contract

Base path:

```text
/api/v1
```

## Auth

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
```

## Dataset

```text
POST   /api/v1/datasets
GET    /api/v1/datasets
GET    /api/v1/datasets/{id}
PUT    /api/v1/datasets/{id}
DELETE /api/v1/datasets/{id}
```

## Job

```text
POST /api/v1/datasets/{datasetId}/jobs
GET  /api/v1/jobs
GET  /api/v1/jobs/{id}
```

## Dashboard

```text
GET /api/v1/dashboard/summary
```

Do not add undocumented endpoints casually.

Future endpoints such as retry should be introduced when the corresponding feature is intentionally implemented.

---

# 21. Pagination

Collection endpoints should support Spring Data pagination.

Example:

```text
GET /api/v1/datasets?page=0&size=20
```

Jobs:

```text
GET /api/v1/jobs?page=0&size=20&sort=submittedAt,desc
```

Do not load unlimited collections when pagination is part of the approved API behavior.

Return useful pagination metadata appropriate to the chosen response design.

Do not add an unnecessary generic response envelope solely for pagination.

---

# 22. HTTP Semantics

Use meaningful HTTP status codes.

Typical examples:

```text
200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
```

Do not return `200 OK` for every outcome.

Choose status codes based on the actual operation and failure.

---

# 23. Exception Handling

Use centralized exception handling.

Expected shared exceptions include:

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

Error responses should contain useful information such as:

```text
timestamp
status
error
message
path
```

Never expose:

```text
stack traces
passwords
JWTs
secrets
internal credentials
```

Do not swallow unexpected exceptions silently.

Log unexpected server-side failures appropriately without exposing sensitive data.

---

# 24. Job State Machine

The approved valid transitions are:

```text
PENDING → RUNNING
PENDING → FAILED
RUNNING → COMPLETED
RUNNING → FAILED
```

Invalid transitions must be rejected.

The client must not directly set arbitrary lifecycle states.

For example, do not design a public endpoint that lets the client send:

```json
{
  "status": "COMPLETED"
}
```

and trust it.

The application controls lifecycle transitions.

---

# 25. Job Processing Strategy

The initial processing engine is intentionally simulated and deterministic.

It is not supposed to pretend to be a real scientific engine.

The purpose is to demonstrate:

- Job lifecycle.
- Async processing.
- Persistence.
- Progress.
- Failure handling.
- Backend concurrency concepts.

Keep the processing boundary replaceable.

Future implementations may use:

```text
Java processing engine
Python processing engine
Containerized worker
External scientific tool
Queue-based worker
```

But do not implement those future systems during MVP unless explicitly requested.

---

# 26. Async Processing Rules

Async processing is introduced **after the basic job lifecycle is proven**.

Expected flow:

```text
POST /jobs
    ↓
Create PENDING job
    ↓
Persist + commit
    ↓
Trigger async processing
    ↓
RUNNING
    ↓
Processing
    ↓
COMPLETED / FAILED
```

Do not:

- Create manual `Thread` instances.
- Put `Thread.sleep()` in controllers.
- Block HTTP requests for simulated processing.
- Keep a database transaction open throughout long processing.
- Allow clients to arbitrarily manipulate job status.

Use Spring's async facilities.

The async worker/task should have appropriate transaction boundaries when it updates persistent job state.

---

# 27. Concurrency and Consistency

Do not add optimistic locking or other concurrency mechanisms automatically.

If concurrent updates create a real correctness problem during implementation, evaluate the simplest appropriate solution.

For example:

```text
@Version
```

may be considered if actual concurrent state-update behavior requires it.

Do not add concurrency machinery merely because the project mentions async processing.

---

# 28. Dashboard Rules

Dashboard is a read/aggregation module.

It should provide useful counts such as:

```text
total datasets
pending jobs
running jobs
completed jobs
failed jobs
```

Do not duplicate:

```text
dataset ownership rules
job lifecycle rules
job submission logic
dataset CRUD logic
```

Dashboard should compose/read the necessary data through appropriate application boundaries.

---

# 29. Transaction Rules

Transactions should generally wrap business operations.

Examples:

```text
createDataset()
updateDataset()
deleteDataset()
submitJob()
updateJobState()
```

For async processing:

```text
Persist PENDING
    ↓ commit
Async task
    ↓
RUNNING update
    ↓
Processing
    ↓
COMPLETED/FAILED update
```

Do not hold a DB transaction open while performing long-running processing.

---

# 30. Configuration Rules

Configuration should use environment-driven values.

Examples:

```text
DATABASE_URL
DATABASE_USERNAME
DATABASE_PASSWORD
JWT_SECRET
JWT_EXPIRATION
```

Never commit actual credentials.

Keep local/test configuration separated appropriately.

Tests must not depend on a developer's personal local PostgreSQL instance.

A `.env.example` may document required environment variables without containing real secrets.

---

# 31. Database Schema Strategy

For early development, Hibernate schema generation may be used for speed.

Do not introduce Flyway/Liquibase merely to add another resume keyword.

Before portfolio-complete release, evaluate whether a migration tool is justified.

If introduced, it must be integrated properly and tested.

---

# 32. Testing Strategy

Follow a testing pyramid.

```text
          /\
         /  \
        / API\
       /------\
      /  UNIT  \
     /----------\
```

The project should have mostly focused unit tests plus important API/database integration tests.

## Unit tests

Prioritize:

- Business rules.
- Dataset ownership.
- Authorization.
- Job state transitions.
- Error behavior.
- Service logic.

## Controller/API tests

Use MockMvc where appropriate.

Test:

- Status codes.
- Validation.
- Authentication.
- Authorization.
- Response structure.
- Important error cases.

## Integration tests

Cover critical flows such as:

```text
Register
Login
Authenticated request
Create dataset
Submit job
Persist job state
Dashboard aggregation
```

## Async tests

Verify important lifecycle behavior:

```text
PENDING
→ RUNNING
→ COMPLETED
```

and failure:

```text
PENDING
→ RUNNING
→ FAILED
```

Do not make tests dependent on arbitrary timing where avoidable.

Testcontainers may be introduced when valuable, but it is not an early prerequisite.

---

# 33. OpenAPI / Swagger

Document:

- Auth endpoints.
- Dataset endpoints.
- Job endpoints.
- Dashboard endpoint.
- Request DTOs.
- Response DTOs.
- Authentication requirements.
- Relevant HTTP status codes.

Keep OpenAPI configuration in the configuration layer.

Do not pollute services with documentation concerns.

---

# 34. Logging

Logging should help an engineer understand system behavior.

Useful events include:

```text
Application startup
Authentication failures
Dataset operations where useful
Job submission
Job state changes
Processing failures
Unexpected exceptions
```

Never log secrets.

Avoid excessive debug noise in production-style code.

Logs should be actionable rather than decorative.

---

# 35. Observability Scope

Initial observability should include:

- Useful logs.
- Health/basic startup verification where appropriate.
- Job state visibility.
- Exception visibility.

Future:

```text
Spring Boot Actuator
Prometheus
Grafana
OpenTelemetry
```

These are optional/future unless explicitly promoted into the current implementation phase.

Do not add an observability stack just to increase project complexity.

---

# 36. Docker Rules

The intended deployment model is:

```text
DataFlowX Spring Boot Application
            +
       PostgreSQL
```

Docker Compose should eventually provide a simple reproducible environment.

Do not introduce Kubernetes for the MVP.

Do not create a distributed deployment topology unless explicitly requested.

The final project should be runnable from a clean environment using documented steps.

---

# 37. CI/CD Rules

The CI pipeline should initially focus on:

```text
Checkout
   ↓
Set up Java 21
   ↓
Build
   ↓
Run tests
   ↓
Package
```

Docker image building can be added in the infrastructure/portfolio phase.

Do not build a complex deployment pipeline unless there is a concrete deployment target.

---

# 38. Git Discipline

Use meaningful commits.

Examples:

```text
feat: add dataset management
feat: add JWT authentication
feat: add job lifecycle
feat: add async job processing
test: add dataset service tests
test: add job lifecycle tests
docs: update API documentation
chore: add docker compose setup
```

Avoid giant commits containing unrelated features.

Avoid committing:

```text
.env
credentials
secrets
IDE-specific private configuration
generated junk
```

Do not rewrite Git history unless explicitly requested.

---

# 39. Implementation Phases

Codex must implement incrementally.

## Phase 1 — Foundation

Focus on:

```text
Existing bootstrap
↓
PostgreSQL configuration
↓
JPA configuration
↓
Entities
↓
Repositories
↓
Application startup verification
```

Do not build auth, jobs, dashboard, Docker, and async processing all at once.

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

Verify:

```text
Register
→ Login
→ JWT
→ Protected endpoint
```

---

## Phase 3 — Dataset

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

Verify:

```text
Authenticated user
→ Create dataset
→ Read dataset
→ Update own dataset
→ Delete own dataset
```

Also verify that another ordinary user cannot access another user's dataset.

---

## Phase 4 — Jobs

Implement:

```text
Job
JobRepository
Job DTOs
JobMapper
JobService
JobController
State transition rules
Dataset-based authorization
```

Initially prove the lifecycle without introducing unnecessary async complexity.

---

## Phase 5 — Async

Implement:

```text
AsyncConfig
JobProcessor
Async execution
RUNNING
Progress
COMPLETED
FAILED
Controlled failure
```

Verify that job creation returns without waiting for long-running processing.

---

## Phase 6 — Dashboard

Implement:

```text
DashboardSummaryResponse
DashboardService
DashboardController
```

Verify aggregate values against actual database state.

---

## Phase 7 — Quality

Refine:

```text
Validation
Exception handling
Unit tests
Controller tests
Integration tests
Pagination
Indexes
Logging
OpenAPI
```

---

## Phase 8 — Infrastructure

Implement:

```text
Dockerfile
Docker Compose
PostgreSQL container
Environment configuration
GitHub Actions
```

Verify from a clean environment.

---

## Phase 9 — Portfolio Release

Verify the end-to-end journey:

```text
Clone
 ↓
Configure
 ↓
Start infrastructure
 ↓
Build
 ↓
Test
 ↓
Run
 ↓
Open Swagger
 ↓
Register
 ↓
Login
 ↓
Create Dataset
 ↓
Submit Job
 ↓
Observe Job Lifecycle
 ↓
View Dashboard
```

Then polish README and documentation.

---

# 40. Working Method for Every Task

Before changing code:

### Step 1 — Inspect

Inspect:

- Relevant source files.
- Current package structure.
- Existing dependencies.
- Existing configuration.
- Tests.
- Git state if relevant.

Do not assume the repository is in the state described by an old plan.

### Step 2 — Identify Scope

Determine:

```text
What is being requested?
Which module owns it?
Which files are affected?
Which phase does it belong to?
```

### Step 3 — Plan

For non-trivial changes, identify:

```text
Files to create
Files to modify
Tests to add/update
Potential risks
```

### Step 4 — Implement

Make the smallest coherent change that satisfies the requirement.

### Step 5 — Verify

Run the relevant:

```text
compile/build
tests
application startup
API verification
```

depending on the change.

### Step 6 — Report

Explain:

- What changed.
- What was verified.
- Any limitations.
- Any remaining decision.

Do not claim tests passed unless they were actually run.

---

# 41. Minimal-Change Principle

Prefer:

```text
smallest correct change
```

over:

```text
largest possible refactor
```

If a task asks to add a dataset endpoint, do not refactor authentication at the same time.

If a bug can be fixed in one service, do not redesign the module.

Avoid unrelated cleanup unless it is required to safely implement the task.

---

# 42. No Silent Redesign

Do not silently:

- Rename major modules.
- Change API contracts.
- Change database relationships.
- Change authentication architecture.
- Replace JWT.
- Convert the application to microservices.
- Introduce a message broker.
- Introduce Redis.
- Introduce Kubernetes.
- Replace PostgreSQL.
- Change the job lifecycle.
- Change ownership semantics.

If a real requirement makes the current architecture insufficient:

```text
Identify requirement
      ↓
Explain why current design is insufficient
      ↓
Propose smallest viable change
      ↓
Identify affected modules/files
      ↓
Consider simpler alternatives
      ↓
Update architecture documentation if necessary
      ↓
Implement
      ↓
Test
```

Significant architecture changes require explicit approval.

---

# 43. No Premature Technology

The following are not automatic MVP requirements:

```text
Kafka
RabbitMQ
Redis
Object storage
Kubernetes
Microservices
Prometheus
Grafana
OpenTelemetry
Flyway/Liquibase
MapStruct
Dedicated workers
Real scientific processing engine
```

A technology may be introduced only when:

1. The current requirement needs it.
2. It materially improves the solution.
3. The added complexity is justified.
4. It does not violate the approved scope.

"Good for resume" is not enough justification.

---

# 44. No Over-Abstraction

Do not create abstractions just because enterprise code sometimes has them.

Avoid unnecessary:

```text
BaseService
BaseRepository
GenericController
GenericResponse
GenericMapper
Manager
Helper
Factory
Strategy
```

unless the actual code demonstrates a concrete need.

Use interfaces where the architecture already calls for them or where they provide a real boundary.

---

# 45. Dependency Management Rules

Before adding a Maven dependency, ask:

```text
Why is this dependency needed?
Is the feature already supported by Spring/Java/current dependencies?
Does the architecture call for it?
Will it materially improve the implementation?
```

Do not add duplicate libraries.

Do not add dependencies solely for keywords.

Keep the `pom.xml` understandable.

---

# 46. Code Quality Rules

Write production-style Java.

Prefer:

- Clear names.
- Small focused methods.
- Constructor injection.
- Immutable DTOs where appropriate.
- Explicit business behavior.
- Meaningful exceptions.
- Consistent formatting.
- Avoiding unnecessary comments.

Comments should explain **why**, not merely repeat what the code says.

Do not generate huge classes.

If a class starts owning unrelated responsibilities, reconsider its boundaries.

---

# 47. Lombok Rules

Lombok is already part of the approved stack.

Use it where it improves readability.

Do not use Lombok blindly for every possible annotation.

Avoid patterns that obscure important domain behavior.

For entities, be careful with automatically generated:

```text
equals()
hashCode()
toString()
```

especially when relationships are involved.

Do not accidentally cause recursive relationship traversal.

---

# 48. API and Persistence Separation

Maintain this boundary:

```text
REST API
   ↕
DTO
   ↕
Service
   ↕
Entity
   ↕
Repository
   ↕
Database
```

Do not make controllers depend on JPA implementation details.

Do not expose entity internals as API contracts.

Do not allow API DTO design to force accidental persistence design.

---

# 49. Error-First Thinking

For every feature, consider:

```text
Happy path
Invalid input
Missing resource
Unauthorized request
Forbidden request
Conflict
Invalid state
Unexpected failure
```

Especially for:

- Dataset ownership.
- Job access.
- Job transitions.
- Authentication.
- Duplicate users.
- Missing datasets/jobs.

A feature is not complete merely because its happy path works.

---

# 50. Definition of Done for a Feature

A feature is not considered complete until:

- It is implemented in the correct module.
- Its API contract is clear.
- Input validation is present where needed.
- Business validation is handled.
- Authorization is enforced where needed.
- Correct HTTP status codes are used.
- Exceptions are handled consistently.
- Sensitive information is protected.
- Relevant tests exist.
- The project builds successfully.
- Relevant tests pass.
- Documentation is updated when the public contract changes.

Do not mark a feature complete based only on compilation.

---

# 51. Definition of Done for DataFlowX MVP

The MVP is ready when the following core journey works:

```text
User Registration
      ↓
User Login
      ↓
JWT Authentication
      ↓
Create Dataset
      ↓
Dataset Ownership
      ↓
Submit Processing Job
      ↓
Job Lifecycle
      ↓
Async Processing
      ↓
COMPLETED / FAILED
      ↓
Dashboard Summary
```

And the project also has:

```text
Validation
Exception handling
Authorization
Tests
Swagger/OpenAPI
PostgreSQL
Docker
Git/GitHub
Clear README
```

Optional/future technologies must not block this definition.

---

# 52. Portfolio Quality Standard

DataFlowX should feel like a small real backend, not a tutorial dump.

A reviewer should be able to understand:

```text
Why the architecture exists
Why the modules are separated
How authentication works
How ownership is enforced
How jobs move through states
Why async processing exists
How failures are handled
How persistence works
How the API is tested
How the project is run
```

Avoid artificial complexity that cannot be defended in an interview.

---

# 53. Interview Defensibility Rule

Every meaningful implementation decision should be explainable.

Examples:

### Why modular monolith?

Because the project is small enough to keep operational complexity low while preserving clear module boundaries and future extraction points.

### Why JWT?

Because the backend needs stateless API authentication suitable for protected REST endpoints.

### Why DTOs?

To prevent persistence entities from becoming API contracts and to protect sensitive fields.

### Why async jobs?

To demonstrate non-blocking request handling and backend concurrency concepts while modeling a realistic processing workflow.

### Why simulated processing?

To demonstrate the processing architecture without falsely claiming a real scientific computation engine.

### Why not Kafka?

Because the current MVP does not require distributed messaging, and adding it would introduce unnecessary operational complexity.

These explanations should remain consistent with the actual implementation.

---

# 54. Future Extension Discipline

The architecture intentionally leaves room for:

```text
Kafka/RabbitMQ
Redis
Object storage
Dedicated workers
Real scientific processors
Prometheus/Grafana
OpenTelemetry
Flyway/Liquibase
Kubernetes
Cloud deployment
Microservice extraction
```

When such a feature is later requested:

1. Evaluate the requirement.
2. Identify the existing boundary it fits into.
3. Prefer extension over rewrite.
4. Keep the public API stable where practical.
5. Update architecture documentation if the change is significant.
6. Add tests.
7. Document operational implications.

Do not implement future infrastructure in advance "just in case."

---

# 55. When Codex Encounters Ambiguity

Use this decision tree:

```text
Is the answer explicitly defined?
        │
       YES
        ↓
Implement it.

        NO
        ↓
Is it a small implementation detail?
        │
       YES
        ↓
Choose the simplest architecture-consistent solution.

        NO
        ↓
Could the decision change the architecture/API/data model?
        │
       YES
        ↓
Do not silently redesign.
Explain the decision and ask/seek approval.
```

Do not stop for every minor naming decision.

Do stop for decisions that materially change the system.

---

# 56. What Codex Should Optimize For

Priority order:

```text
1. Correctness
2. Security
3. Architecture consistency
4. Testability
5. Maintainability
6. Simplicity
7. Clear API behavior
8. Performance where relevant
9. Portfolio polish
```

Do not sacrifice correctness for speed of implementation.

Do not sacrifice simplicity for artificial enterprise complexity.

Do not sacrifice security for convenience.

---

# 57. Final Codex Contract

Codex must treat DataFlowX as a **real engineering project with controlled scope**.

The implementation should follow:

```text
Inspect
  ↓
Understand
  ↓
Plan
  ↓
Implement
  ↓
Test
  ↓
Verify
  ↓
Document
```

The architecture is not a suggestion.

The project structure is not a suggestion.

The MVP boundary is not a suggestion.

Codex may improve implementation quality **within those boundaries**, but it must not silently redefine the project.

The final result should be a clean, testable, secure, production-style modular monolith that demonstrates practical Java/Spring backend engineering without unnecessary distributed-system complexity.

---

# 57.1 Task Scope and Completion Reporting

For every requested task, Codex should distinguish:

```text
IN SCOPE
Required for the current task/phase.

DEPENDENCY
Necessary to make the requested feature work correctly.

OUT OF SCOPE
Useful future work that should not be implemented now.
```

When finishing a task, report these separately when relevant.

A task should not expand simply because Codex notices unrelated improvements.

If an out-of-scope issue is discovered, mention it rather than silently implementing it.

---

# 58. Final Principle

> **Build the smallest system that convincingly demonstrates professional engineering.**

Do not build a technology museum.

Build DataFlowX so that every important piece has a reason to exist, every boundary is understandable, every failure is handled deliberately, and every major decision can be defended by the engineer who built it.
