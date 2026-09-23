package com.dataflowx.auth;

import com.dataflowx.auth.entity.User;
import com.dataflowx.auth.entity.UserRole;
import com.dataflowx.auth.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void registrationHashesThePasswordAssignsUserRoleAndReturnsNoPassword() throws Exception {
        String email = "register@example.com";
        String rawPassword = "safe-password";

        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson("researcher", email, rawPassword)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.password").doesNotExist())
                .andReturn();

        User savedUser = userRepository.findByEmail(email).orElseThrow();
        assertThat(savedUser.getRole()).isEqualTo(UserRole.USER);
        assertThat(savedUser.getPassword()).isNotEqualTo(rawPassword);
        assertThat(passwordEncoder.matches(rawPassword, savedUser.getPassword())).isTrue();
        assertThat(result.getResponse().getContentAsString()).doesNotContain(rawPassword, savedUser.getPassword());
    }

    @Test
    void duplicateEmailIsRejected() throws Exception {
        String email = "duplicate@example.com";
        register(email, "safe-password");

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson("another-user", email, "another-safe-password")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("An account with that email already exists"));
    }

    @Test
    void registrationDoesNotAcceptAnAdminRole() throws Exception {
        String email = "role-request@example.com";
        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"role-request","email":"%s","password":"safe-password","role":"ADMIN"}
                                """.formatted(email)))
                .andReturn();

        assertThat(result.getResponse().getStatus()).isIn(400, 201);
        userRepository.findByEmail(email).ifPresent(user -> assertThat(user.getRole()).isEqualTo(UserRole.USER));
    }

    @Test
    void registrationRejectsShortPasswordWithValidationError() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson("new-user", "short-pw@example.com", "short")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void registrationRejectsBlankUsernameWithValidationError() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson("   ", "blank-user@example.com", "safe-password")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));
    }

    @Test
    void registrationRejectsInvalidEmailWithValidationError() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson("valid-user", "not-an-email", "safe-password")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));
    }

    @Test
    void successfulLoginReturnsJwtWithoutPasswordFields() throws Exception {
        String email = "login@example.com";
        register(email, "safe-password");

        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(email, "safe-password")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.password").doesNotExist())
                .andReturn();

        assertThat(result.getResponse().getContentAsString()).doesNotContain("safe-password");
    }

    @Test
    void invalidPasswordAndUnknownEmailReceiveTheSameSafeResponse() throws Exception {
        String knownEmail = "known@example.com";
        register(knownEmail, "safe-password");

        String incorrectPasswordResponse = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(knownEmail, "wrong-password")))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();

        String unknownEmailResponse = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("unknown@example.com", "wrong-password")))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();

        assertThat(incorrectPasswordResponse).contains("Invalid email or password");
        assertThat(unknownEmailResponse).contains("Invalid email or password");
    }

    @Test
    void protectedRoutesRejectAnonymousRequestsAndAcceptValidJwtAuthentication() throws Exception {
        String email = "protected@example.com";
        String token = register(email, "safe-password");

        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized());

        MvcResult authenticatedResult = mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.username").value("user-protected"))
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andReturn();

        User savedUser = userRepository.findByEmail(email).orElseThrow();
        JsonNode response = objectMapper.readTree(authenticatedResult.getResponse().getContentAsString());
        assertThat(response.get("id").asLong()).isEqualTo(savedUser.getId());
        assertThat(authenticatedResult.getResponse().getContentAsString()).doesNotContain(savedUser.getPassword());

        mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer malformed-token"))
                .andExpect(status().isUnauthorized());
    }

    private String register(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson("user-" + email.substring(0, email.indexOf('@')), email, password)))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        return response.get("token").asText();
    }

    private String registerJson(String username, String email, String password) {
        return """
                {"username":"%s","email":"%s","password":"%s"}
                """.formatted(username, email, password);
    }

    private String loginJson(String email, String password) {
        return """
                {"email":"%s","password":"%s"}
                """.formatted(email, password);
    }
}
