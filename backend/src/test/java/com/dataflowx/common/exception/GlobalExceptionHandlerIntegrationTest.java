package com.dataflowx.common.exception;

import com.dataflowx.auth.entity.User;
import com.dataflowx.auth.entity.UserRole;
import com.dataflowx.auth.repository.UserRepository;
import com.dataflowx.dataset.entity.Dataset;
import com.dataflowx.dataset.repository.DatasetRepository;
import com.dataflowx.job.entity.Job;
import com.dataflowx.job.repository.JobRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GlobalExceptionHandlerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DatasetRepository datasetRepository;

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @TestConfiguration
    static class TestEndpointConfig {
        @RestController
        static class FaultyTestController {
            @GetMapping("/api/v1/test-fault-500")
            public void throwUnexpected() {
                throw new RuntimeException("Simulated unexpected database failure with sensitive stack trace");
            }
        }
    }

    private User user;
    private String token;

    @BeforeEach
    void setUp() throws Exception {
        jobRepository.deleteAll();
        datasetRepository.deleteAll();
        userRepository.deleteAll();

        user = userRepository.save(new User(
                "tester",
                "tester@example.com",
                passwordEncoder.encode("test-password"),
                UserRole.USER
        ));

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"tester@example.com\",\"password\":\"test-password\"}"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode json = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        token = json.get("token").asText();
    }

    @Test
    void malformedJsonReturnsBadRequestWithStructuredApiError() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\": invalid json..."))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("MALFORMED_REQUEST"))
                .andExpect(jsonPath("$.message").value("Malformed JSON request body"))
                .andExpect(jsonPath("$.path").value("/api/v1/auth/login"))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    void deleteDatasetWithJobsReturnsConflictRatherThanMaskedUnauthorized() throws Exception {
        Dataset dataset = datasetRepository.save(new Dataset("Dataset With Job", "Desc", user));
        jobRepository.save(new Job(dataset));

        mockMvc.perform(delete("/api/v1/datasets/" + dataset.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.error").value("CONFLICT"))
                .andExpect(jsonPath("$.message").value("Cannot delete dataset because it is referenced by existing jobs. Please archive the dataset instead."))
                .andExpect(jsonPath("$.path").value("/api/v1/datasets/" + dataset.getId()))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());

        assertThat(datasetRepository.findById(dataset.getId())).isPresent();
    }

    @Test
    void unexpectedExceptionReturnsGeneric500WithoutLeakingDetails() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/test-fault-500")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.error").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.message").value("An unexpected internal error occurred"))
                .andExpect(jsonPath("$.path").value("/api/v1/test-fault-500"))
                .andExpect(jsonPath("$.timestamp").isNotEmpty())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertThat(body).doesNotContain("Simulated unexpected");
        assertThat(body).doesNotContain("RuntimeException");
        assertThat(body).doesNotContain("stackTrace");
    }
}
