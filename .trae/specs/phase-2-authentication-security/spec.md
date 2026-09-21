# DataFlowX — Phase 2: Authentication & Security — Product Requirements Document

## Overview
- **Summary**: Implement a secure, stateless authentication foundation connecting the existing User domain to Spring Security via JWT, with registration, login, protected endpoints, and USER/ADMIN roles.
- **Purpose**: Deliver Phase 2 of the DataFlowX platform, establishing the authentication and security infrastructure that all later phases will depend on.
- **Target Users**: Developers of later DataFlowX modules (Dataset, Job, Dashboard) who require an authenticated principal; future end users who will register and log in.

## Goals
- Secure user registration with BCrypt password hashing and USER default role.
- Secure login with safe credential verification and JWT issuance.
- Stateless JWT validation filter and Spring Security integration.
- Clear module separation: `auth` owns the User domain and auth flows; `security` owns JWT + Spring Security infrastructure.
- Comprehensive test coverage for registration, login, JWT, and endpoint protection.
- Complete project compiles and all tests pass.

## Non-Goals
- Dataset REST APIs and Dataset ownership authorization.
- Job REST APIs, Job processing, and async processing.
- Dashboard UI.
- OpenAPI configuration.
- Docker, Docker Compose, and CI/CD (GitHub Actions).
- Refresh-token system, email verification, and password reset.
- OAuth2, social login, and rate limiting unless required by architecture docs.
- Migrations (handled later).
- Business authorization for Dataset/Job endpoints beyond the security infrastructure.

## Background & Context
- Phase 1 Foundation is complete: Spring Boot 3.2 + Java 21, PostgreSQL/H2 test profile, User/Dataset/Job entities, repositories, and PersistenceContextTest pass.
- Module ownership rules documented by the project: `auth` = User domain + registration/login; `security` = JWT + Spring Security + authentication filter.
- Roles: exactly USER and ADMIN. Normal registration must not accept arbitrary role assignment.
- Dependencies already present in pom.xml: spring-boot-starter-security, jjwt-api 0.12.6, jjwt-impl, jjwt-jackson, spring-security-test.
- Environment-backed JWT configuration already wired in application-local.properties and application-test.properties.
- Existing code skeleton (DTOs, entities, services, controllers, security classes, tests) exists but must be verified, fixed (compilation error in SecurityUser), and tested end-to-end.
- Architecture docs (ARCHITECTURE.md, PROJECT_STRUCTURE.md, CODEX_INSTRUCTIONS.md) were not found as files in the repository; requirements are treated as specified in the user's Phase 2 prompt.

## Functional Requirements
- **FR-1 Registration**: POST `/api/v1/auth/register` accepts RegisterRequest (username, email, password), validates fields, rejects duplicate emails, hashes password with BCrypt, assigns USER role, persists User, returns AuthResponse (id, username, email, role, JWT) without password/hash.
- **FR-2 Role hardening**: Normal registration ignores any client-supplied `role` and always uses USER.
- **FR-3 Login**: POST `/api/v1/auth/login` accepts LoginRequest (email, password), verifies via PasswordEncoder, throws InvalidCredentialsException for any failure (unknown user or wrong password), returns identical safe error message.
- **FR-4 JWT generation**: JwtService.generateToken produces a signed JWT containing at least the authenticated subject (email) and nothing sensitive (no password, no hash, no secret).
- **FR-5 JWT validation**: JwtAuthenticationFilter extracts Bearer tokens, validates them, resolves the principal via CustomUserDetailsService, and sets Authentication in SecurityContext when valid.
- **FR-6 Public endpoints**: `/api/v1/auth/register` and `/api/v1/auth/login` permit anonymous access; all other endpoints require authentication.
- **FR-7 SecurityUser**: Bridges User domain and Spring Security UserDetails, exposing id, displayUsername, email, role, authorities (ROLE_USER/ROLE_ADMIN), and required UserDetails methods.
- **FR-8 Stateless configuration**: SecurityConfig disables CSRF, form login, HTTP Basic; uses SessionCreationPolicy.STATELESS; registers the JWT filter before UsernamePasswordAuthenticationFilter; provides a single BCrypt PasswordEncoder bean.
- **FR-9 DTO boundary**: AuthController never returns User entities; only AuthResponse records via UserMapper.
- **FR-10 Error handling**: GlobalExceptionHandler handles validation, ResourceConflictException, InvalidCredentialsException; RestAuthenticationEntryPoint returns 401 JSON for anonymous access to protected endpoints. No stack traces or internals leak.

## Non-Functional Requirements
- **NFR-1 No sensitive logging/persistence**: Raw passwords, BCrypt hashes, JWTs, JWT secrets, DB passwords never logged or exposed through DTOs, error messages, or JWT claims.
- **NFR-2 Externalized secrets**: JWT secret and expiration come exclusively from `app.jwt.*` properties; test profile uses an explicit test-only secret; local profile warns that production must override JWT_SECRET env.
- **NFR-3 Deterministic short transactions**: Registration uses @Transactional with no long-running work; login and JWT generation are non-transactional.
- **NFR-4 Compilation and test stability**: `mvn clean test` passes on JDK 21 with the existing H2 test profile.
- **NFR-5 Module boundary fidelity**: `auth` does not implement JWT parsing/filtering; `security` does not own User persistence or registration/login domain logic.

## Constraints
- **Technical**: Spring Boot 3.2, Java 21, Maven, JJWT 0.12.x, BCrypt via Spring Security PasswordEncoder, H2 test profile, PostgreSQL local profile.
- **Business**: Exactly USER and ADMIN roles; USER is the registration default; ADMIN cannot be self-assigned through public registration.
- **Dependencies**: No new libraries beyond what is already required for Spring Security + JWT (already in pom.xml). No OAuth2/OIDC.

## Assumptions
- Email is the unique login identifier used as the JWT subject (already implemented by RegisterRequest, LoginRequest, findByEmail).
- AuthResponse's token field carries the JWT to the client.
- Protected-endpoint verification will reuse the existing `/api/v1/datasets` 404-after-authentication pattern from AuthControllerIntegrationTest rather than creating a fake business endpoint.
- JWT claims minimum: subject = email; isTokenValid() validates subject equality; expiration handled by JJWT expiration validation in extractSubject.
- UserDetails interface requires isAccountNonExpired, isAccountNonLocked, isCredentialsNonExpired — currently missing and must be supplied in SecurityUser.

## Acceptance Criteria

### AC-1: Project compiles cleanly
- **Type**: `rule`
- **Given**: JDK 21 and Maven configured, no source files present
- **When**: `mvn clean compile` is executed
- **Then**: No compilation errors; SecurityUser implements all UserDetails methods
- **Pass Condition**: BUILD SUCCESS with 0 compile errors
- **Evidence**: Maven compile output

### AC-2: Registration flow — success with BCrypt, USER role, no password leak
- **Type**: `rule`
- **Given**: Empty H2 test schema and valid RegisterRequest
- **When**: POST /api/v1/auth/register
- **Then**: 201 Created; AuthResponse.role == USER; token non-empty; password field absent; persisted password is a BCrypt hash (matches via PasswordEncoder); raw password not stored or echoed.
- **Pass Condition**: AuthControllerIntegrationTest.registrationHashesThePasswordAssignsUserRoleAndReturnsNoPassword passes
- **Evidence**: Surefire report for Persistence/Auth tests

### AC-3: Registration rejects duplicate email with 409 CONFLICT
- **Type**: `rule`
- **Given**: A user already registered with email E
- **When**: Second registration with email E
- **Then**: 409 CONFLICT; message "An account with that email already exists"
- **Pass Condition**: AuthControllerIntegrationTest.duplicateEmailIsRejected passes
- **Evidence**: Surefire report

### AC-4: Registration ignores client-supplied ADMIN role
- **Type**: `rule`
- **Given**: Register request JSON including `"role":"ADMIN"`
- **When**: Registration succeeds (201) or role is rejected as unknown field (400)
- **Then**: If user is created, role == USER, never ADMIN
- **Pass Condition**: AuthControllerIntegrationTest.registrationDoesNotAcceptAnAdminRole passes
- **Evidence**: Surefire report

### AC-5: Login flow — success returns JWT, no password leak
- **Type**: `rule`
- **Given**: Existing user with known email/password
- **When**: POST /api/v1/auth/login with correct credentials
- **Then**: 200 OK; token non-empty; no password field in response; response body does not contain raw password
- **Pass Condition**: AuthControllerIntegrationTest.successfulLoginReturnsJwtWithoutPasswordFields passes
- **Evidence**: Surefire report

### AC-6: Login safe failures — identical response for unknown user vs bad password
- **Type**: `rule`
- **Given**: (a) existing user + wrong password; (b) unknown email
- **When**: Two login requests
- **Then**: Both return 401 UNAUTHORIZED with message "Invalid email or password"
- **Pass Condition**: AuthControllerIntegrationTest.invalidPasswordAndUnknownEmailReceiveTheSameSafeResponse passes
- **Evidence**: Surefire report

### AC-7: JWT unit tests pass — valid token, expired, malformed handled
- **Type**: `rule`
- **Given**: JwtService with known secret
- **When**: Generating tokens, validating against expired-token-service, and malformed strings
- **Then**: validTokenRecoversIdentityWithoutSensitiveCredentialClaims and expiredAndMalformedTokensDoNotAuthenticate pass
- **Pass Condition**: Both JwtServiceTest cases pass
- **Evidence**: Surefire report

### AC-8: Protected endpoints — anonymous 401, valid JWT authenticates, malformed JWT rejects
- **Type**: `rule`
- **Given**: No dataset controller (404 after auth)
- **When**: GET /api/v1/datasets anonymous → with valid Bearer token → with malformed token
- **Then**: 401 anonymous, 404 with authenticated principal, 401 malformed
- **Pass Condition**: AuthControllerIntegrationTest.protectedRoutesRejectAnonymousRequestsAndAcceptValidJwtAuthentication passes
- **Evidence**: Surefire report

### AC-9: SecurityUser exposes ROLE_USER/ROLE_ADMIN authorities correctly
- **Type**: `rule`
- **Given**: SecurityUser constructed from User with role=USER and role=ADMIN
- **When**: getAuthorities() returns exactly one GrantedAuthority
- **Then**: USER → ROLE_USER; ADMIN → ROLE_ADMIN
- **Pass Condition**: JwtServiceTest authority assertion passes and integration tests verify authorities via authenticated principal
- **Evidence**: JwtServiceTest and integration test authenticated() matchers

### AC-10: Security configuration is stateless and single PasswordEncoder
- **Type**: `rubric`
- **Dimension**: Spring Security configuration quality
- **Scale**: 0-2
- **Anchors**: 0 = session auth still enabled or multiple encoders; 1 = stateless mostly correct but minor gaps; 2 = STATELESS, CSRF/form/httpBasic disabled, exactly one BCrypt PasswordEncoder bean, filter in correct position
- **Pass Threshold**: >= 2
- **Evidence**: Inspection of SecurityConfig.java source; application context loads with no authentication bean conflicts

### AC-11: Module boundary and DTO safety
- **Type**: `rubric`
- **Dimension**: Separation of auth vs security concerns and DTO boundary
- **Scale**: 0-2
- **Anchors**: 0 = User domain or JWT filter in wrong package, entities returned from controllers; 1 = mostly correct but one leak; 2 = auth owns User/registration/login DTOs/controllers/services; security owns JWT/filter/SecurityUser/config; controllers never expose entities or password fields
- **Pass Threshold**: >= 2
- **Evidence**: Source inspection of package layout and AuthController/AuthServiceImpl

### AC-12: Secrets externalized and secure logging
- **Type**: `rubric`
- **Dimension**: Sensitive-data handling across code and configs
- **Scale**: 0-2
- **Anchors**: 0 = hard-coded JWT secret in Java or logged tokens/passwords in logs; 1 = config present but one leakage in tests/logging; 2 = all secrets in application properties only, development defaults clearly labeled, no password/hash/token/secret logging absent from source, GlobalExceptionHandler safe
- **Pass Threshold**: >= 2
- **Evidence**: Source grep and config files; absence of any log statements printing secrets

### AC-13: Full test suite passes
- **Type**: `rule`
- **Given**: ActiveProfiles=test, H2 in-memory
- **When**: `mvn clean test`
- **Then**: All tests (PersistenceContextTest, JwtServiceTest, AuthControllerIntegrationTest) pass
- **Pass Condition**: Tests run: N, Failures: 0, Errors: 0
- **Evidence**: Full surefire summary

## Open Questions
- Architecture docs were requested but not present on disk; requirements are inferred strictly from the user Phase 2 prompt and extant code conventions. If docs exist elsewhere, reconcile after.
