package com.dataflowx.dashboard;

import com.dataflowx.auth.entity.User;
import com.dataflowx.auth.entity.UserRole;
import com.dataflowx.auth.repository.UserRepository;
import com.dataflowx.dataset.entity.Dataset;
import com.dataflowx.dataset.repository.DatasetRepository;
import com.dataflowx.job.entity.Job;
import com.dataflowx.job.entity.JobStatus;
import com.dataflowx.job.repository.JobRepository;
import com.dataflowx.job.service.JobService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DashboardControllerIntegrationTest {

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
    private JobService jobService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User owner;
    private String adminToken;
    private String userToken;

    @BeforeEach
    void setUp() throws Exception {
        jobRepository.deleteAll();
        datasetRepository.deleteAll();
        userRepository.deleteAll();

        owner = saveUser("dashboard-user", "dashboard-user@example.com", UserRole.USER);
        saveUser("dashboard-admin", "dashboard-admin@example.com", UserRole.ADMIN);
        adminToken = login("dashboard-admin@example.com", "dashboard-admin-password");
        userToken = login("dashboard-user@example.com", "dashboard-user-password");
    }

    @Test
    void adminSeesZeroCountsWhenNoDatasetsOrJobsExist() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard/summary").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalDatasets").value(0))
                .andExpect(jsonPath("$.pendingJobs").value(0))
                .andExpect(jsonPath("$.runningJobs").value(0))
                .andExpect(jsonPath("$.completedJobs").value(0))
                .andExpect(jsonPath("$.failedJobs").value(0));
    }

    @Test
    void dashboardRequiresAuthenticatedAdministratorAccess() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard/summary"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/dashboard/summary").header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("FORBIDDEN"));
    }

    @Test
    void adminGetsAccurateIndependentCountsFromPersistedStates() throws Exception {
        List<Dataset> datasets = List.of(
                datasetRepository.save(new Dataset("dashboard-one", null, owner)),
                datasetRepository.save(new Dataset("dashboard-two", null, owner)),
                datasetRepository.save(new Dataset("dashboard-three", null, owner))
        );

        createPendingJob(datasets.get(0));
        createPendingJob(datasets.get(1));
        transition(createPendingJob(datasets.get(0)), JobStatus.RUNNING);
        for (int index = 0; index < 4; index++) {
            Job job = createPendingJob(datasets.get(index % datasets.size()));
            transition(job, JobStatus.RUNNING);
            transition(job, JobStatus.COMPLETED);
        }
        transition(createPendingJob(datasets.get(2)), JobStatus.FAILED);

        mockMvc.perform(get("/api/v1/dashboard/summary").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalDatasets").value(3))
                .andExpect(jsonPath("$.pendingJobs").value(2))
                .andExpect(jsonPath("$.runningJobs").value(1))
                .andExpect(jsonPath("$.completedJobs").value(4))
                .andExpect(jsonPath("$.failedJobs").value(1));
    }

    private Job createPendingJob(Dataset dataset) {
        return jobRepository.save(new Job(dataset));
    }

    private void transition(Job job, JobStatus targetStatus) {
        jobService.transitionJobState(job.getId(), targetStatus, targetStatus == JobStatus.FAILED ? "test failure" : null);
    }

    private User saveUser(String username, String email, UserRole role) {
        return userRepository.save(new User(username, email, passwordEncoder.encode(username + "-password"), role));
    }

    private String login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, password)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        return response.get("token").asText();
    }
}
