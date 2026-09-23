# DataFlowX

Research Data Processing Platform

## Project Overview

DataFlowX is an enterprise-style Research Data Processing Platform developed as a long-term learning, portfolio, and interview project. The project follows professional software engineering practices using a modular monolith architecture.

## Technology Stack

- **Java**: 21
- **Framework**: Spring Boot 3.2.0
- **Build Tool**: Maven
- **Database**: PostgreSQL (H2 for tests)
- **Security**: Spring Security + JWT (JJWT 0.12.6)
- **ORM**: Spring Data JPA / Hibernate
- **Async**: Spring `@Async` with bounded thread pool executor
- **Validation**: Bean Validation (Jakarta)
- **Packaging**: JAR

## Architecture

The project is a **modular monolith** following a layered architecture:

```
Controller → DTO/Validation → Service → Repository → Database
```

Modules: `auth`, `dataset`, `job`, `dashboard`, `security`, `common`, `config`

## Completed Phases

- [x] **Phase 1** — Foundation (Spring Boot, JPA, PostgreSQL, project structure)
- [x] **Phase 2** — Authentication & Security (Spring Security, JWT, BCrypt)
- [x] **Phase 3** — Dataset Management (CRUD, ownership, authorization, pagination)
- [x] **Phase 4** — Job Management (submission, state machine, authorization)
- [x] **Phase 5** — Asynchronous Processing (Spring `@Async`, lifecycle, progress, failure)
- [x] **Phase 6** — Dashboard (admin-only aggregate read model, DB-side COUNT queries)
- [x] **Phase 7** — Quality & Hardening (validation, error consistency, pagination caps, logging, security review)

## API Overview

### Authentication
- `POST /api/v1/auth/register` — Register a new user (returns JWT)
- `POST /api/v1/auth/login` — Login (returns JWT)
- `GET /api/v1/auth/me` — Get current authenticated user

### Datasets
- `POST /api/v1/datasets` — Create a dataset
- `GET /api/v1/datasets` — List datasets (paginated, owner-scoped)
- `GET /api/v1/datasets/{id}` — Get dataset by ID
- `PUT /api/v1/datasets/{id}` — Update dataset
- `DELETE /api/v1/datasets/{id}` — Delete dataset

### Jobs
- `POST /api/v1/datasets/{datasetId}/jobs` — Submit a job (triggers async processing)
- `GET /api/v1/jobs` — List jobs (paginated, max 100 per page)
- `GET /api/v1/jobs/{id}` — Get job by ID

### Dashboard (ADMIN only)
- `GET /api/v1/dashboard/summary` — Aggregate counts of datasets and jobs by status

## Security Model

- All protected endpoints require `Authorization: Bearer <JWT>` header
- Ownership is enforced server-side — clients cannot submit arbitrary owner IDs
- `USER` role: can manage own datasets and jobs
- `ADMIN` role: broader access including the dashboard endpoint
- Passwords are BCrypt-hashed and never returned in API responses

## Dependencies

- Spring Web
- Spring Data JPA
- PostgreSQL Driver
- Spring Security
- Spring Boot Validation
- Lombok
- Spring Boot DevTools
- JJWT (API / Impl / Jackson)
- H2 (test scope)
- Spring Boot Test (test scope)
- Spring Security Test (test scope)

## Local Database Configuration

The default profile connects to PostgreSQL. Configure these environment variables:

```
DATABASE_URL=jdbc:postgresql://localhost:5432/dataflowx
DATABASE_USERNAME=your_username
DATABASE_PASSWORD=your_password
```

## Running Tests

```bash
cd backend
./mvnw test
```

Tests use an in-memory H2 database and do not require a running PostgreSQL instance.

## Building the Project

```bash
cd backend
./mvnw clean install
```

## Running the Application

```bash
cd backend
./mvnw spring-boot:run
```

The application starts on `http://localhost:8080`

## License

This project is for educational and portfolio purposes.

## Infrastructure & Deployment (Phase 8)

This project has been dockerized for reproducible execution without relying on a local development setup.

### Prerequisites
- Docker & Docker Compose
- Git
- Java 21 (only if running without Docker)

### Environment Configuration
The application externalizes configuration for deployment. You must configure environment variables.
Copy the example environment file inside `backend/` and update it with secure values (do not commit this file):
```bash
cp backend/.env.example backend/.env
```
Update `.env` locally as needed. 

### Run with Docker
Start the PostgreSQL database and Spring Boot application:
```bash
docker compose up --build
```

### Stop
Stop the containers safely:
```bash
docker compose down
```

**Stop and remove database volume:**
If you need to wipe your local database data completely (this removes persisted PostgreSQL data):
```bash
docker compose down -v
```

### Tests
To run the full suite of integration tests locally using the Maven Wrapper (Docker is not required as tests run in-memory):
```bash
cd backend
./mvnw test
```
(On Windows Command Prompt, use `cd backend && mvnw.cmd test`).

### Accessing the Application
- **API:** http://localhost:8080
- **Swagger UI:** http://localhost:8080/swagger-ui/index.html
- **API Docs:** http://localhost:8080/v3/api-docs


