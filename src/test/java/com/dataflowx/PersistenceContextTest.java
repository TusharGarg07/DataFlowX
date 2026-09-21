package com.dataflowx;

import com.dataflowx.auth.entity.User;
import com.dataflowx.auth.entity.UserRole;
import com.dataflowx.auth.repository.UserRepository;
import com.dataflowx.dataset.entity.Dataset;
import com.dataflowx.dataset.entity.DatasetStatus;
import com.dataflowx.dataset.repository.DatasetRepository;
import com.dataflowx.job.entity.Job;
import com.dataflowx.job.entity.JobStatus;
import com.dataflowx.job.repository.JobRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class PersistenceContextTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DatasetRepository datasetRepository;

    @Autowired
    private JobRepository jobRepository;

    @Test
    void contextLoadsWithPersistenceRepositories() {
        assertThat(userRepository).isNotNull();
        assertThat(datasetRepository).isNotNull();
        assertThat(jobRepository).isNotNull();
    }

    @Test
    void persistsTheCoreDomainRelationshipsAndDefaults() {
        User user = userRepository.saveAndFlush(
                new User("researcher", "researcher@example.com", "not-an-api-response", UserRole.USER)
        );
        Dataset dataset = datasetRepository.saveAndFlush(
                new Dataset("Genome dataset", "Initial persistence verification", user)
        );
        Job job = jobRepository.saveAndFlush(new Job(dataset));

        assertThat(user.getId()).isNotNull();
        assertThat(user.getCreatedAt()).isNotNull();
        assertThat(user.getUpdatedAt()).isNotNull();
        assertThat(dataset.getOwner().getId()).isEqualTo(user.getId());
        assertThat(dataset.getStatus()).isEqualTo(DatasetStatus.ACTIVE);
        assertThat(dataset.getCreatedAt()).isNotNull();
        assertThat(job.getDataset().getId()).isEqualTo(dataset.getId());
        assertThat(job.getStatus()).isEqualTo(JobStatus.PENDING);
        assertThat(job.getProgress()).isZero();
        assertThat(job.getSubmittedAt()).isNotNull();
    }
}
