package com.dataflowx.security;

import com.dataflowx.auth.entity.User;
import com.dataflowx.auth.entity.UserRole;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private static final String TEST_SECRET = "test-only-secret-must-be-at-least-32-characters";

    @Test
    void validTokenRecoversIdentityWithoutSensitiveCredentialClaims() {
        SecurityUser user = new SecurityUser(new User(
                "researcher", "researcher@example.com", "bcrypt-hash-not-for-token", UserRole.USER
        ));
        JwtService jwtService = new JwtService(TEST_SECRET, 60_000);

        String token = jwtService.generateToken(user);

        assertThat(jwtService.extractSubject(token)).contains("researcher@example.com");
        assertThat(jwtService.isTokenValid(token, user)).isTrue();
        assertThat(token).doesNotContain("bcrypt-hash-not-for-token");
        assertThat(user.getAuthorities()).extracting(Object::toString).containsExactly("ROLE_USER");
    }

    @Test
    void expiredAndMalformedTokensDoNotAuthenticate() {
        SecurityUser user = new SecurityUser(new User(
                "researcher", "researcher@example.com", "bcrypt-hash-not-for-token", UserRole.USER
        ));
        JwtService expiredTokenService = new JwtService(TEST_SECRET, -1_000);

        String expiredToken = expiredTokenService.generateToken(user);

        assertThat(expiredTokenService.extractSubject(expiredToken)).isEmpty();
        assertThat(expiredTokenService.isTokenValid(expiredToken, user)).isFalse();
        assertThat(expiredTokenService.extractSubject("not.a.jwt")).isEmpty();
    }

    @Test
    void productionProfileRejectsDefaultInsecureSecret() {
        org.springframework.mock.env.MockEnvironment prodEnv = new org.springframework.mock.env.MockEnvironment();
        prodEnv.setActiveProfiles("prod");

        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
                new JwtService(JwtService.INSECURE_DEFAULT_SECRET, 60_000, prodEnv)
        ).isInstanceOf(IllegalStateException.class)
         .hasMessageContaining("Production profile requires a secure, non-default JWT_SECRET");
    }

    @Test
    void productionProfileAcceptsValidSecret() {
        org.springframework.mock.env.MockEnvironment prodEnv = new org.springframework.mock.env.MockEnvironment();
        prodEnv.setActiveProfiles("prod");

        String strongSecret = "a-very-strong-production-secret-with-plenty-of-entropy-123456";
        JwtService prodJwtService = new JwtService(strongSecret, 60_000, prodEnv);
        assertThat(prodJwtService).isNotNull();
    }
}
