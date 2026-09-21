# DataFlowX — Phase 2: Authentication & Security — Implementation Plan

## Task 1: Fix SecurityUser compilation — implement all UserDetails methods
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Add the three missing UserDetails default methods (isAccountNonExpired, isAccountNonLocked, isCredentialsNonExpired) to SecurityUser so Spring Security 6.x accepts the class.
  - All three return true (account is not disabled/expired/locked) matching the existing isEnabled() behavior.
  - Verify that the class no longer triggers a compile-time abstract-method error.
- **Acceptance Criteria Addressed**: AC-1, AC-9, AC-11
- **Test Requirements**:
  - `rule` TR-1.1: `mvn clean compile` exits BUILD SUCCESS with 0 errors. Evidence: maven compile output.
  - `rule` TR-1.2: SecurityUser.getAuthorities() returns exactly ROLE_USER for a USER User and ROLE_ADMIN for an ADMIN User. Evidence: direct JUnit assertion in JwtServiceTest passes.

## Task 2: Verify auth flow code correctness and minor fixes
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Audit AuthServiceImpl: BCrypt encode on registration, USER role hardcoded, authenticationManager for login, InvalidCredentialsException on BadCredentialsException, no password/hash logging.
  - Audit RegisterRequest DTO: ensure no role field exists on the record (prevents arbitrary ADMIN self-assignment by design).
  - Audit AuthController responses: ensure registration returns 201 Created and login returns 200 OK and both return AuthResponse via UserMapper only, never the User entity.
  - Audit UserMapper.toAuthResponse returns safe fields (id, username, email, role, token) with no password field.
  - Audit JwtService: ensure generateToken puts only subject=email, iat, exp into claims and signs with the configured secret; extractSubject catches JwtException/IllegalArgumentException returning Optional.empty; isTokenValid validates subject.
  - Audit JwtAuthenticationFilter: Bearer extraction, early return when no header, do not overwrite existing Authentication, catch RuntimeException inside user lookup, no token/secret logging.
  - Audit SecurityConfig: exactly one BCrypt PasswordEncoder, STATELESS, CSRF/form/httpBasic disabled, permitAll for POST /api/v1/auth/register and /api/v1/auth/login, anyRequest authenticated, filter order correct, RestAuthenticationEntryPoint wired.
  - Audit CustomUserDetailsService: throws UsernameNotFoundException when email unknown so DaoAuthenticationProvider translates it consistently.
  - Audit RestAuthenticationEntryPoint and GlobalExceptionHandler: no stack traces; messages safe; no secrets.
  - Audit application properties: app.jwt.secret uses env variable with development-only fallback clearly labeled in local; test profile has explicit test secret.
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-4, AC-5, AC-6, AC-9, AC-10, AC-11, AC-12
- **Test Requirements**:
  - `rubric` TR-2.1: Audit completeness and fidelity to module boundaries; scale 0-2; 0=auth implements JWT filter or security owns User; 1=minor boundary leak; 2=clean separation; threshold >=2; evidence: source-file package + class responsibility inspection.
  - `rubric` TR-2.2: Sensitive-data handling audit; scale 0-2; 0=hard-coded secrets or log statements with passwords/tokens; 1=one minor concern; 2=all secrets externalized, no sensitive log statements, error messages safe; threshold >=2; evidence: grep of source code for 'log', 'println', 'secret' patterns.

## Task 3: Run the full test suite and diagnose any failures
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**:
  - Run `mvn clean test` against JDK 21 + H2 test profile.
  - Ensure PersistenceContextTest.contextLoads and persists relationships pass (Phase 1 stability).
  - Ensure JwtServiceTest both cases pass (valid token recovery, expired + malformed handled).
  - Ensure AuthControllerIntegrationTest six cases pass (registration BCrypt/role, duplicate, admin-role rejection, login JWT, safe login error, protected routes).
  - If any test fails, diagnose and fix in-situ: e.g., missing SecurityUser methods, wrong password matcher behavior, DaoAuthenticationProvider UsernameNotFoundException handling, 404 vs 401 for missing endpoints after authentication, principal name mapping.
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-13
- **Test Requirements**:
  - `rule` TR-3.1: PersistenceContextTest both tests pass. Evidence: surefire report.
  - `rule` TR-3.2: JwtServiceTest both tests pass. Evidence: surefire report.
  - `rule` TR-3.3: AuthControllerIntegrationTest all six tests pass. Evidence: surefire report.
  - `rule` TR-3.4: Overall `mvn clean test` reports Tests run: N, Failures: 0, Errors: 0, Skipped: 0. Evidence: final maven summary lines.

## Task 4: Spring Security context smoke verification (context loads; endpoint protection sanity check)
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 3
- **Description**:
  - Confirm Spring context builds with active security config (covered by @SpringBootTest integration tests already).
  - Confirm unauthenticated GET of any non-auth API returns 401 and that authenticated GET with a valid token reaches the controller layer (404 is fine when controller absent).
  - Confirm authorities ROLE_USER/ROLE_ADMIN are resolvable from SecurityContext after authentication.
  - Add no new Dataset/Job controllers; use the existing missing-route 404-after-auth pattern.
- **Acceptance Criteria Addressed**: AC-8, AC-9, AC-10
- **Test Requirements**:
  - `rule` TR-4.1: Integration test protectedRoutesRejectAnonymousRequestsAndAcceptValidJwtAuthentication assertions pass. Evidence: surefire pass.
  - `rule` TR-4.2: authenticated() matcher verifies principal username equals the registering user email. Evidence: surefire pass.

## Task 5: README phase status update (optional, small, accurate)
- **Status**: `pending`
- **Priority**: low
- **Depends On**: Task 4
- **Description**:
  - Update README.md `Current Phase` to Phase 2 and flip the `Security implementation` checkbox to completed.
  - Do not edit ARCHITECTURE.md / PROJECT_STRUCTURE.md / CODEX_INSTRUCTIONS.md per Phase 2 rule 26.
  - Do not add Dataset/Job/Dashboard/Docker/CI status lines (those belong to later phases).
- **Acceptance Criteria Addressed**: (Informational only; does not gate completion)
- **Test Requirements**:
  - `rule` TR-5.1: README Current Phase updated and Security implementation marked done. Evidence: README diff.
