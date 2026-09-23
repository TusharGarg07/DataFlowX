package com.dataflowx.job.entity;

import com.dataflowx.dataset.entity.Dataset;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "jobs", indexes = {
        @jakarta.persistence.Index(name = "idx_jobs_dataset_id", columnList = "dataset_id"),
        @jakarta.persistence.Index(name = "idx_jobs_status", columnList = "status"),
        @jakarta.persistence.Index(name = "idx_jobs_submitted_at", columnList = "submittedAt")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dataset_id", nullable = false)
    private Dataset dataset;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private JobStatus status;

    @Min(0)
    @Max(100)
    @Column(nullable = false)
    private int progress;

    @Column(nullable = false, updatable = false)
    private Instant submittedAt;

    private Instant startedAt;

    private Instant completedAt;

    @Column(length = 2_000)
    private String errorMessage;

    public Job(Dataset dataset) {
        this.dataset = dataset;
        this.status = JobStatus.PENDING;
        this.progress = 0;
    }

    @PrePersist
    private void initializeSubmittedAt() {
        submittedAt = Instant.now();
    }

    public void transitionTo(JobStatus targetStatus, String failureMessage) {
        if (!isTransitionAllowed(targetStatus)) {
            throw new IllegalStateException("Invalid job state transition");
        }

        status = targetStatus;
        Instant now = Instant.now();
        if (targetStatus == JobStatus.RUNNING) {
            startedAt = now;
        } else if (targetStatus == JobStatus.COMPLETED) {
            completedAt = now;
            progress = 100;
            errorMessage = null;
        } else if (targetStatus == JobStatus.FAILED) {
            completedAt = now;
            errorMessage = failureMessage;
        }
    }

    public void updateProgress(int progress) {
        if (progress < 0 || progress > 100) {
            throw new IllegalArgumentException("Progress must be between 0 and 100");
        }
        if (status != JobStatus.RUNNING) {
            throw new IllegalStateException("Progress can only be updated for a running job");
        }
        this.progress = progress;
    }

    private boolean isTransitionAllowed(JobStatus targetStatus) {
        return switch (status) {
            case PENDING -> targetStatus == JobStatus.RUNNING || targetStatus == JobStatus.FAILED;
            case RUNNING -> targetStatus == JobStatus.COMPLETED || targetStatus == JobStatus.FAILED;
            case COMPLETED, FAILED -> false;
        };
    }
}
