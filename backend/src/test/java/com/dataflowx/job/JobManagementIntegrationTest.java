package com.dataflowx.job;

import com.dataflowx.auth.entity.User;
import com.dataflowx.auth.entity.UserRole;
import com.dataflowx.auth.repository.UserRepository;
import com.dataflowx.dataset.entity.Dataset;
import com.dataflowx.dataset.repository.DatasetRepository;
import com.dataflowx.job.dto.request.CreateJobRequest;
import com.dataflowx.job.dto.response.JobResponse;
import com.dataflowx.job.entity.Job;
import com.dataflowx.job.entity.JobStatus;
import com.dataflowx.job.repository.JobRepository;
import com.dataflowx.job.service.JobService;
import com.dataflowx.security.SecurityUser;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class JobManagementIntegrationTest {

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

    private User alice;
    private User bob;
    private User admin;
    private Dataset aliceDataset;
    private Dataset bobDataset;

    @BeforeEach
    void setUp() {
        jobRepository.deleteAll();
        datasetRepository.deleteAll();
        userRepository.deleteAll();

        alice = saveUser("alice", "alice@example.com", UserRole.USER);
        bob = saveUser("bob", "bob@example.com", UserRole.USER);
        admin = saveUser("admin", "admin@example.com", UserRole.ADMIN);
        aliceDataset = datasetRepository.save(new Dataset("Alice dataset", null, alice));
        bobDataset = datasetRepository.save(new Dataset("Bob dataset", null, bob));
    }

    @Test
    void ownerAndAdminCanSubmitPendingJobsButAnotherUserCannot() throws Exception {
        String aliceToken = login("alice@example.com", "alice-password");
        String bobToken = login("bob@example.com", "bob-password");
        String adminToken = login("admin@example.com", "admin-password");

        mockMvc.perform(post("/api/v1/datasets/" + aliceDataset.getId() + "/jobs")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"COMPLETED\",\"progress\":100}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.datasetId").value(aliceDataset.getId()))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.progress").value(0))
                .andExpect(jsonPath("$.submittedAt").isNotEmpty());

        mockMvc.perform(post("/api/v1/datasets/" + aliceDataset.getId() + "/jobs")
                        .header("Authorization", "Bearer " + bobToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/datasets/" + aliceDataset.getId() + "/jobs")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/datasets/999999/jobs")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"));
    }

    @Test
    void jobReadsAndListsRespectDatasetAuthorizationAndPagination() throws Exception {
        Job first = jobRepository.save(new Job(aliceDataset));
        Job second = jobRepository.save(new Job(aliceDataset));
        jobRepository.save(new Job(bobDataset));
        String aliceToken = login("alice@example.com", "alice-password");
        String bobToken = login("bob@example.com", "bob-password");
        String adminToken = login("admin@example.com", "admin-password");

        mockMvc.perform(get("/api/v1/jobs/" + first.getId()).header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.datasetId").value(aliceDataset.getId()));

        mockMvc.perform(get("/api/v1/jobs/" + first.getId()).header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/jobs?page=0&size=1&sort=submittedAt,desc")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.content.length()").value(1));

        mockMvc.perform(get("/api/v1/jobs").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(3));

        mockMvc.perform(get("/api/v1/jobs/999999").header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"));

        mockMvc.perform(get("/api/v1/jobs"))
                .andExpect(status().isUnauthorized());
        assertThat(second.getId()).isNotNull();
    }

    @Test
    void paginationSizeIsCapedAtMaximumAndSizeZeroIsNormalisedToOne() throws Exception {
        for (int i = 0; i < 5; i++) {
            jobRepository.save(new Job(aliceDataset));
        }
        String aliceToken = login("alice@example.com", "alice-password");

        // size=0 should be normalised to 1 (not cause an exception)
        mockMvc.perform(get("/api/v1/jobs?page=0&size=0")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(1));

        // size=999999 should be clamped to MAX_PAGE_SIZE (100)
        mockMvc.perform(get("/api/v1/jobs?page=0&size=999999")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(100));
    }

    @Test
    void stateMachinePersistsAllValidTransitionsAndRejectsInvalidOnes() {
        Job pendingToRunning = jobRepository.save(new Job(aliceDataset));
        JobResponse running = jobService.transitionJobState(pendingToRunning.getId(), JobStatus.RUNNING, null);
        assertThat(running.status()).isEqualTo(JobStatus.RUNNING);
        assertThat(running.startedAt()).isNotNull();

        JobResponse completed = jobService.transitionJobState(pendingToRunning.getId(), JobStatus.COMPLETED, null);
        assertThat(completed.status()).isEqualTo(JobStatus.COMPLETED);
        assertThat(completed.completedAt()).isNotNull();
        assertThat(completed.progress()).isEqualTo(100);

        Job pendingToFailed = jobRepository.save(new Job(aliceDataset));
        JobResponse failedFromPending = jobService.transitionJobState(pendingToFailed.getId(), JobStatus.FAILED, "validation failed");
        assertThat(failedFromPending.status()).isEqualTo(JobStatus.FAILED);
        assertThat(failedFromPending.completedAt()).isNotNull();
        assertThat(failedFromPending.errorMessage()).isEqualTo("validation failed");

        Job runningToFailed = jobRepository.save(new Job(aliceDataset));
        jobService.transitionJobState(runningToFailed.getId(), JobStatus.RUNNING, null);
        assertThat(jobService.transitionJobState(runningToFailed.getId(), JobStatus.FAILED, "processor failure").status())
                .isEqualTo(JobStatus.FAILED);

        assertThatThrownBy(() -> jobService.transitionJobState(pendingToRunning.getId(), JobStatus.RUNNING, null))
                .hasMessageContaining("Invalid transition");
        assertThatThrownBy(() -> jobService.transitionJobState(pendingToRunning.getId(), JobStatus.FAILED, "late failure"))
                .hasMessageContaining("Invalid transition");
        Job pendingToCompleted = jobRepository.save(new Job(aliceDataset));
        assertThatThrownBy(() -> jobService.transitionJobState(pendingToCompleted.getId(), JobStatus.COMPLETED, null))
                .hasMessageContaining("Invalid transition");
        assertThatThrownBy(() -> jobService.transitionJobState(pendingToFailed.getId(), JobStatus.COMPLETED, null))
                .hasMessageContaining("Invalid transition");
        assertThatThrownBy(() -> jobService.transitionJobState(runningToFailed.getId(), JobStatus.RUNNING, null))
                .hasMessageContaining("Invalid transition");
        assertThatThrownBy(() -> jobService.transitionJobState(runningToFailed.getId(), JobStatus.COMPLETED, null))
                .hasMessageContaining("Invalid transition");
    }

    @Test
    void progressRangeIsGuardedInTheDomainModel() {
        Job job = new Job(aliceDataset);

        assertThatThrownBy(() -> job.updateProgress(-1)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> job.updateProgress(101)).isInstanceOf(IllegalArgumentException.class);
    }

    private User saveUser(String username, String email, UserRole role) {
        return userRepository.save(new User(username, email, passwordEncoder.encode(username + "-password"), role));
    }

    private String login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, password)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        return response.get("token").asText();
    }
}
