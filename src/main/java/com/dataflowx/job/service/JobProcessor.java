package com.dataflowx.job.service;

import com.dataflowx.common.exception.ResourceNotFoundException;
import com.dataflowx.job.entity.Job;
import com.dataflowx.job.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class JobProcessor {

    private static final int[] PROGRESS_STEPS = {20, 40, 60, 80};
    private static final long STEP_DELAY_MILLIS = 25;

    private final JobService jobService;
    private final JobRepository jobRepository;

    @Value("${app.job.processing.failure-dataset-name:}")
    private String failureDatasetName;

    @Async("jobTaskExecutor")
    public void process(Long jobId) {
        if (!jobService.startProcessing(jobId)) {
            log.debug("Job {} skipped: not in PENDING state when processing started", jobId);
            return;
        }

        log.info("Job {} started processing", jobId);

        try {
            if (isControlledFailure(jobId)) {
                log.info("Job {} failed: controlled failure triggered by dataset name", jobId);
                jobService.failProcessing(jobId, "Simulated processing failure");
                return;
            }

            for (int progress : PROGRESS_STEPS) {
                pauseBetweenSteps();
                jobService.updateJobProgress(jobId, progress);
            }
            pauseBetweenSteps();
            jobService.completeProcessing(jobId);
            log.info("Job {} completed successfully", jobId);
        } catch (ResourceNotFoundException exception) {
            log.debug("Job {} was removed before asynchronous processing completed", jobId);
        } catch (RuntimeException exception) {
            log.warn("Job processing failed for job {}: {}", jobId, exception.getClass().getSimpleName());
            failJobSafely(jobId);
        }
    }

    private boolean isControlledFailure(Long jobId) {
        if (failureDatasetName.isBlank()) {
            return false;
        }
        return jobRepository.findWithDatasetById(jobId)
                .map(Job::getDataset)
                .map(dataset -> failureDatasetName.equals(dataset.getName()))
                .orElse(false);
    }

    private void pauseBetweenSteps() {
        try {
            Thread.sleep(STEP_DELAY_MILLIS);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Job processing was interrupted", exception);
        }
    }

    private void failJobSafely(Long jobId) {
        try {
            jobService.failProcessing(jobId, "Processing failed");
        } catch (ResourceNotFoundException exception) {
            log.debug("Job {} was removed while recording its processing failure", jobId);
        }
    }
}
