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
import org.awaitility.Awaitility;
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

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AsyncJobProcessingIntegrationTest {

    private static final Duration PROCESSING_TIMEOUT = Duration.ofSeconds(3);

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
    private Dataset successfulDataset;
    private Dataset failingDataset;

    @BeforeEach
    void setUp() {
        jobRepository.deleteAll();
        datasetRepository.deleteAll();
        userRepository.deleteAll();

        owner = userRepository.save(new User(
                "async-owner",
                "async-owner@example.com",
                passwordEncoder.encode("async-owner-password"),
                UserRole.USER
        ));
        successfulDataset = datasetRepository.save(new Dataset("async-success", null, owner));
        failingDataset = datasetRepository.save(new Dataset("fail-processing", null, owner));
    }

    @Test
    void submissionReturnsPendingThenProcessesToCompletionWithPersistedProgress() throws Exception {
        String token = login();

        MvcResult result = mockMvc.perform(post("/api/v1/datasets/" + successfulDataset.getId() + "/jobs")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.progress").value(0))
                .andReturn();

        Long jobId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        Awaitility.await()
                .atMost(PROCESSING_TIMEOUT)
                .pollInterval(Duration.ofMillis(10))
                .until(() -> jobRepository.findById(jobId)
                        .map(Job::getProgress)
                        .filter(progress -> progress > 0 && progress < 100)
                        .isPresent());

        Job completedJob = awaitTerminalState(jobId, JobStatus.COMPLETED);
        assertThat(completedJob.getProgress()).isEqualTo(100);
        assertThat(completedJob.getStartedAt()).isNotNull();
        assertThat(completedJob.getCompletedAt()).isNotNull();
        assertThat(completedJob.getErrorMessage()).isNull();
    }

    @Test
    void deterministicProcessingFailureIsPersistedWithoutAnExternalFailureEndpoint() {
        JobResponse submitted = jobService.submitJob(
                failingDataset.getId(), new CreateJobRequest(), new SecurityUser(owner));

        assertThat(submitted.status()).isEqualTo(JobStatus.PENDING);

        Job failedJob = awaitTerminalState(submitted.id(), JobStatus.FAILED);
        assertThat(failedJob.getStartedAt()).isNotNull();
        assertThat(failedJob.getCompletedAt()).isNotNull();
        assertThat(failedJob.getErrorMessage()).isEqualTo("Simulated processing failure");
    }

    @Test
    void severalSubmittedJobsAreProcessedIndependently() {
        List<Long> jobIds = List.of(
                submitSuccessfulJob(),
                submitSuccessfulJob(),
                submitSuccessfulJob()
        );

        jobIds.forEach(jobId -> {
            Job completedJob = awaitTerminalState(jobId, JobStatus.COMPLETED);
            assertThat(completedJob.getProgress()).isEqualTo(100);
        });
    }

    private Long submitSuccessfulJob() {
        return jobService.submitJob(successfulDataset.getId(), new CreateJobRequest(), new SecurityUser(owner)).id();
    }

    private Job awaitTerminalState(Long jobId, JobStatus expectedStatus) {
        Awaitility.await()
                .atMost(PROCESSING_TIMEOUT)
                .pollInterval(Duration.ofMillis(10))
                .until(() -> jobRepository.findById(jobId)
                        .filter(job -> job.getStatus() == expectedStatus)
                        .isPresent());
        return jobRepository.findById(jobId).orElseThrow();
    }

    private String login() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"async-owner@example.com\",\"password\":\"async-owner-password\"}"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        return response.get("token").asText();
    }
}
