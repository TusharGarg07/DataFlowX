package com.dataflowx.contract;

import com.dataflowx.auth.entity.User;
import com.dataflowx.auth.entity.UserRole;
import com.dataflowx.auth.repository.UserRepository;
import com.dataflowx.dataset.entity.Dataset;
import com.dataflowx.dataset.repository.DatasetRepository;
import com.dataflowx.job.entity.Job;
import com.dataflowx.job.repository.JobRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ContractSpikeTest {

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

    private static final Path FIXTURES_DIR = Path.of("..", "docs", "contract-fixtures");

    @BeforeEach
    void setUp() throws Exception {
        jobRepository.deleteAll();
        datasetRepository.deleteAll();
        userRepository.deleteAll();
        Files.createDirectories(FIXTURES_DIR);
    }

    @Test
    void executeFullContractSpikeAndRecordFixtures() throws Exception {
        // 1. POST /api/v1/auth/register
        MvcResult regResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"spikeuser\",\"email\":\"spikeuser@example.com\",\"password\":\"spikepassword123\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        saveSanitizedFixture("01_auth_register_201.json", regResult.getResponse().getContentAsString(), "token");

        // 2. POST /api/v1/auth/login
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"spikeuser@example.com\",\"password\":\"spikepassword123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        saveSanitizedFixture("02_auth_login_200.json", loginResult.getResponse().getContentAsString(), "token");

        String userToken = objectMapper.readTree(loginResult.getResponse().getContentAsString()).get("token").asText();

        // 3. GET /api/v1/auth/me
        MvcResult meResult = mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andReturn();
        saveFixture("03_auth_me_200.json", meResult.getResponse().getContentAsString());

        // 4. POST /api/v1/datasets
        MvcResult createDatasetResult = mockMvc.perform(post("/api/v1/datasets")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Spike Dataset\",\"description\":\"Contract Spike Description\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        saveFixture("04_create_dataset_201.json", createDatasetResult.getResponse().getContentAsString());
        Long datasetId = objectMapper.readTree(createDatasetResult.getResponse().getContentAsString()).get("id").asLong();

        // 5. GET /api/v1/datasets (Page<T>)
        MvcResult getDatasetsResult = mockMvc.perform(get("/api/v1/datasets?page=0&size=10&sort=createdAt,desc")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andReturn();
        saveFixture("05_get_datasets_page_200.json", getDatasetsResult.getResponse().getContentAsString());

        // 6. POST /api/v1/datasets/{id}/jobs (returns 201 Created)
        MvcResult submitJobResult = mockMvc.perform(post("/api/v1/datasets/" + datasetId + "/jobs")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isCreated())
                .andReturn();
        saveFixture("06_submit_job_201.json", submitJobResult.getResponse().getContentAsString());
        Long jobId = objectMapper.readTree(submitJobResult.getResponse().getContentAsString()).get("id").asLong();

        // 7. GET /api/v1/jobs/{id}
        MvcResult getJobResult = mockMvc.perform(get("/api/v1/jobs/" + jobId)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andReturn();
        saveFixture("07_get_job_200.json", getJobResult.getResponse().getContentAsString());

        // 8. GET /api/v1/jobs (Page<T>)
        MvcResult getJobsResult = mockMvc.perform(get("/api/v1/jobs?page=0&size=10")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andReturn();
        saveFixture("08_get_jobs_page_200.json", getJobsResult.getResponse().getContentAsString());

        // 9. DELETE /api/v1/datasets/{id} when dataset HAS jobs
        try {
            mockMvc.perform(delete("/api/v1/datasets/" + datasetId)
                    .header("Authorization", "Bearer " + userToken));
        } catch (Exception ex) {
            String fixtureText = "{\n  \"behavior\": \"FK_CONSTRAINT_VIOLATION_500\",\n  \"exception\": \"" + ex.getClass().getName() + "\",\n  \"message\": \"Deleting a dataset with associated jobs causes a database FK constraint violation.\"\n}";
            Files.writeString(FIXTURES_DIR.resolve("09_delete_dataset_with_jobs_behavior.json"), fixtureText);
        }

        // 9b. DELETE /api/v1/datasets/{id} when dataset HAS NO jobs (204 No Content)
        MvcResult emptyDatasetResult = mockMvc.perform(post("/api/v1/datasets")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Empty Dataset to Delete\",\"description\":\"To be deleted\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        Long emptyDatasetId = objectMapper.readTree(emptyDatasetResult.getResponse().getContentAsString()).get("id").asLong();

        MvcResult deleteEmptyResult = mockMvc.perform(delete("/api/v1/datasets/" + emptyDatasetId)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isNoContent())
                .andReturn();
        Files.writeString(FIXTURES_DIR.resolve("09b_delete_empty_dataset_204.json"), "{\n  \"status\": 204,\n  \"message\": \"No Content — dataset successfully deleted\"\n}");

        // 10. GET /api/v1/dashboard/summary as USER (403 FORBIDDEN)
        MvcResult userDashboardResult = mockMvc.perform(get("/api/v1/dashboard/summary")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden())
                .andReturn();
        saveFixture("10_dashboard_summary_user_403_error.json", userDashboardResult.getResponse().getContentAsString());

        // 11. GET /api/v1/dashboard/summary as ADMIN (200 OK)
        userRepository.save(new User("spikeadmin", "spikeadmin@example.com", passwordEncoder.encode("adminpassword123"), UserRole.ADMIN));
        MvcResult adminLoginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"spikeadmin@example.com\",\"password\":\"adminpassword123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String adminToken = objectMapper.readTree(adminLoginResult.getResponse().getContentAsString()).get("token").asText();

        MvcResult adminDashboardResult = mockMvc.perform(get("/api/v1/dashboard/summary")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();
        saveFixture("11_dashboard_summary_admin_200.json", adminDashboardResult.getResponse().getContentAsString());

        // 12. 401 Unauthorized Error (bad credentials)
        MvcResult badAuthResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"spikeuser@example.com\",\"password\":\"wrongpassword\"}"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        saveFixture("12_auth_login_401_error.json", badAuthResult.getResponse().getContentAsString());

        // 13. 400 Validation Error (short password)
        MvcResult shortPasswordResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"valuser\",\"email\":\"valuser@example.com\",\"password\":\"123\"}"))
                .andExpect(status().isBadRequest())
                .andReturn();
        saveFixture("13_validation_400_error.json", shortPasswordResult.getResponse().getContentAsString());
    }

    private void saveFixture(String filename, String content) throws Exception {
        Object json = objectMapper.readValue(content, Object.class);
        String pretty = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(json);
        Files.writeString(FIXTURES_DIR.resolve(filename), pretty);
    }

    private void saveSanitizedFixture(String filename, String content, String secretField) throws Exception {
        JsonNode node = objectMapper.readTree(content);
        if (node.isObject() && node.has(secretField)) {
            ((ObjectNode) node).put(secretField, "<SANITIZED_JWT_TOKEN>");
        }
        String pretty = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(node);
        Files.writeString(FIXTURES_DIR.resolve(filename), pretty);
    }
}