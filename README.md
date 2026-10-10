# DataFlowX

Research Data Processing Platform

## Project Overview

DataFlowX is an enterprise-style Research Data Processing Platform developed as a long-term learning, portfolio, and interview project. The project follows professional software engineering practices using a modular monolith architecture.

## Technology Stack

- **Java**: 21
- **Framework**: Spring Boot 3.2.0
- **Build Tool**: Maven
- **Database**: PostgreSQL 15
- **Database Migrations**: Flyway
- **Testing**: JUnit 5, Mockito, MockMvc, Testcontainers (PostgreSQL 15)
- **Security**: Spring Security + JWT (JJWT 0.12.6)
- **ORM**: Spring Data JPA / Hibernate (ddl-auto=validate)
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
- [x] **Phase 8** — Persistence Truth (Flyway migrations, PostgreSQL Testcontainers, ddl-auto=validate)
- [x] **Phase 9** — Deployment Truth (Docker Compose topology, Nginx reverse proxy, Vercel SPA readiness, CORS & Health)

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
- Flyway Core
- Spring Security
- Spring Boot Validation
- Lombok
- Spring Boot DevTools
- JJWT (API / Impl / Jackson)
- Spring Boot Test (test scope)
- Spring Security Test (test scope)
- Testcontainers PostgreSQL (test scope)

## Local Database Configuration

The default profile connects to PostgreSQL. Configure these environment variables:

```
DATABASE_URL=jdbc:postgresql://localhost:5432/dataflowx
DATABASE_USERNAME=your_username
DATABASE_PASSWORD=your_password
```

Schema management is handled via Flyway migrations (`V1__initial_schema.sql`). Hibernate validates the schema at boot time (`spring.jpa.hibernate.ddl-auto=validate`).

## Running Tests

```bash
cd backend
./mvnw clean test
```

Integration tests execute against a real PostgreSQL 15 container using Testcontainers. Docker Engine / Docker Desktop must be running.

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

## Deployment & Infrastructure (Phase 9)

DataFlowX provides two deployment topologies:
1. **Local / Self-Hosted Production-Like Topology** (Docker Compose with unified Nginx reverse proxy gateway)
2. **Public Portfolio Topology** (Vercel static frontend + Cloud container backend + Managed PostgreSQL)

---

### Local Topology: Docker Compose with Unified Nginx Gateway

In local production-like deployment, all services run within a dedicated private Docker bridge network (`dataflowx-network`). Only port **80** is published to the host machine.

```
Browser (User)
      │
      │ HTTP :80
      ▼
┌────────────────────────────────────────────────────────┐
│                     Nginx Gateway                      │
│  ┌─────────────────────────┬─────────────────────────┐ │
│  │ / (Static React SPA)    │ /api/ (Reverse Proxy)   │ │
│  │                         │                         │ │
│  └─────────────────────────┴────────────┬────────────┘ │
└─────────────────────────────────────────┼──────────────┘
                                          │ Internal Network
                                          ▼
                   ┌─────────────────────────────────────────────┐
                   │             Spring Boot Backend             │
                   │  (Port 8080 internal, Profile: local/prod)  │
                   └──────────────────────┬──────────────────────┘
                                          │ Internal Network (JDBC)
                                          ▼
                   ┌─────────────────────────────────────────────┐
                   │             PostgreSQL 15 Database          │
                   │  (Port 5432 internal, Volume: postgres_data)│
                   └─────────────────────────────────────────────┘
```

#### Network & Port Isolation
- **Frontend / Gateway (Nginx):** Listens on port `80` and is the **only service exposed to the host machine** (`0.0.0.0:80->80`).
- **Spring Boot Backend:** Runs on port `8080` internally within `dataflowx-network`. **No host port is published.** Nginx reverse-proxies `/api/` requests to `http://backend:8080`.
- **PostgreSQL Database:** Runs on port `5432` internally within `dataflowx-network`. **No host port is published.** Accessible only to the backend.

#### Managing the Docker Compose Stack

1. **Start the Stack:**
   ```bash
   docker compose up -d
   ```
   *Dependency lifecycle:* PostgreSQL initializes first (`pg_isready` healthcheck) → Backend boots in `local` profile (or `prod` when configured via `SPRING_PROFILES_ACTIVE=prod`), runs Flyway migrations, and reaches healthy status (`GET /api/v1/health`) → Frontend Nginx service starts.

2. **Verify Container Status:**
   ```bash
   docker compose ps
   ```
   Confirm all services are running and healthy:
   - `dataflowx-postgres`: `Up (healthy)`, port `5432/tcp` (internal only)
   - `dataflowx-backend`: `Up (healthy)`, port `8080/tcp` (internal only)
   - `dataflowx-frontend`: `Up`, port `0.0.0.0:80->80/tcp`

3. **Verify HTTP Endpoints (Smoke Tests):**
   - **Frontend UI:** `http://localhost/` (Returns HTTP 200 and loads the React SPA)
   - **SPA Deep Route:** `http://localhost/datasets` (Returns HTTP 200; Nginx `try_files` rewrite serves `index.html`)
   - **Backend Health:** `http://localhost/api/v1/health` (Returns HTTP 200 with `{"status":"UP"}` via Nginx reverse proxy)

4. **Stop the Stack Safely (Preserve Database Volume):**
   ```bash
   docker compose down
   ```
   *Note:* Running `docker compose down` stops and removes containers while keeping the persistent PostgreSQL volume (`postgres_data`) intact.

5. **Wipe Database Volume (Clean Reset):**
   ```bash
   docker compose down -v
   ```
   *Warning:* The `-v` flag removes persisted database data. Use only when a complete state reset is explicitly intended.

---

### Public Deployment Architecture (Target Specifications)

For public portfolio demonstration, the static frontend and dynamic backend are decoupled:

#### 1. Frontend on Vercel (Static SPA)
- **Root Directory:** `frontend`
- **Framework Preset:** `Vite`
- **Build Command:** `npm run build` (`tsc && vite build`)
- **Output Directory:** `dist`
- **SPA Routing:** Configured via `frontend/vercel.json` rewrite rules (`{"source": "/(.*)", "destination": "/index.html"}`) to prevent HTTP 404 errors when refreshing client-side routes (`/datasets`, `/jobs`).
- **Environment Variable:** Set `VITE_API_BASE_URL` in the Vercel project dashboard to the public HTTPS URL of the backend (e.g., `https://api.yourdomain.com/api/v1`). For local development and local Docker, it defaults to `/api/v1` for relative same-origin proxying.

#### 2. Backend on Cloud Container Platform (Target: Render, Railway, Fly.io, or VPS)
- **Container Image:** Built via multi-stage `backend/Dockerfile` using Eclipse Temurin 21. Runs under unprivileged user `spring:spring` (UID 10001) with container-aware JVM flags (`-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0`).
- **Dynamic Port Binding:** Automatically binds via `server.port=${PORT:8080}` in `application-prod.properties` to support cloud PaaS platforms injecting `$PORT`.
- **Active Profile:** Requires `SPRING_PROFILES_ACTIVE=prod`.

#### 3. Managed PostgreSQL (Target: Neon, Supabase, Render Postgres)
- **Engine Parity:** PostgreSQL 15.x.
- **SSL Enforcement:** Production JDBC URL must require TLS: `jdbc:postgresql://<host>:<port>/<dbname>?sslmode=require`.
- **Schema Management:** Flyway automatically applies migrations (`V1__initial_schema.sql`) on startup. Hibernate validates tables with `spring.jpa.hibernate.ddl-auto=validate`.

#### 4. Production Environment Variables & Secrets Reference

| Variable | Target Service | Description & Validation Rule |
| :--- | :--- | :--- |
| `DATABASE_URL` | Production Backend | Full JDBC URL mapped to `spring.datasource.url`. Must require SSL/TLS in cloud environments. |
| `DATABASE_USERNAME` | Production Backend | Database username mapped to `spring.datasource.username`. |
| `DATABASE_PASSWORD` | Production Backend | Database password mapped to `spring.datasource.password`. |
| `PORT` | Production Backend | Server port mapped to `server.port` (defaults to `8080` if unset). |
| `JWT_SECRET` | Production Backend | HMAC-SHA256 signing secret. **Must be at least 32 characters.** Known placeholders (`change-me-to-a-secure-secret-at-least-32-characters`), Compose fallback (`dataflowx-local-docker-compose-secret-key-32chars`), insecure defaults, and test keys fail fast at startup in `prod` profile. |
| `JWT_EXPIRATION_MS` | Production Backend | Token lifespan in milliseconds (defaults to `3600000` = 1 hour). |
| `APP_CORS_ALLOWED_ORIGINS` | Production Backend | Comma-separated allowed origins (e.g. `https://dataflowx.vercel.app`). No wildcard `*` allowed with credentials enabled. |
| `VITE_API_BASE_URL` | Vercel Frontend | Target API base URL pointing to the deployed backend HTTPS endpoint. |

> [!IMPORTANT]
> **Production Secret Isolation:** While `docker-compose.yml` provides a local-only evaluation secret for local Docker testing (`dataflowx-local-docker-compose-secret-key-32chars`), all public production deployments must inject their own unique secret via the platform's secret manager or environment variables. Production deployments must never rely on Compose fallbacks. Public backend and database deployments remain pending operator infrastructure setup.
