package com.dataflowx.job.service.impl;

import com.dataflowx.auth.entity.User;
import com.dataflowx.auth.entity.UserRole;
import com.dataflowx.auth.repository.UserRepository;
import com.dataflowx.common.exception.InvalidJobStateException;
import com.dataflowx.common.exception.ResourceNotFoundException;
import com.dataflowx.common.exception.UnauthorizedOperationException;
import com.dataflowx.dataset.entity.Dataset;
import com.dataflowx.dataset.repository.DatasetRepository;
import com.dataflowx.job.dto.request.CreateJobRequest;
import com.dataflowx.job.dto.response.JobResponse;
import com.dataflowx.job.entity.Job;
import com.dataflowx.job.entity.JobStatus;
import com.dataflowx.job.event.JobSubmittedEvent;
import com.dataflowx.job.mapper.JobMapper;
import com.dataflowx.job.repository.JobRepository;
import com.dataflowx.job.service.JobService;
import com.dataflowx.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.context.ApplicationEventPublisher;

@Service
@RequiredArgsConstructor
public class JobServiceImpl implements JobService {

    private final JobRepository jobRepository;
    private final DatasetRepository datasetRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher applicationEventPublisher;

    @Override
    @Transactional
    public JobResponse submitJob(Long datasetId, CreateJobRequest request, SecurityUser principal) {
        Dataset dataset = findAuthorizedDataset(datasetId, principal);
        Job savedJob = jobRepository.save(new Job(dataset));
        applicationEventPublisher.publishEvent(new JobSubmittedEvent(savedJob.getId()));
        return JobMapper.toResponse(savedJob);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<JobResponse> getJobs(SecurityUser principal, Pageable pageable) {
        Page<Job> jobs = principal.getRole() == UserRole.ADMIN
                ? jobRepository.findAll(pageable)
                : jobRepository.findByDatasetOwner(userRepository.getReferenceById(principal.getId()), pageable);
        return JobMapper.toResponsePage(jobs);
    }

    @Override
    @Transactional(readOnly = true)
    public JobResponse getJobById(Long id, SecurityUser principal) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));
        assertAuthorized(job.getDataset(), principal);
        return JobMapper.toResponse(job);
    }

    @Override
    @Transactional
    public JobResponse transitionJobState(Long id, JobStatus targetStatus, String failureMessage) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));
        try {
            job.transitionTo(targetStatus, failureMessage);
        } catch (IllegalArgumentException | IllegalStateException exception) {
            throw new InvalidJobStateException("Invalid transition from " + job.getStatus() + " to " + targetStatus);
        }
        return JobMapper.toResponse(job);
    }

    @Override
    @Transactional
    public boolean startProcessing(Long id) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));
        if (job.getStatus() != JobStatus.PENDING) {
            return false;
        }
        job.transitionTo(JobStatus.RUNNING, null);
        return true;
    }

    @Override
    @Transactional
    public void updateJobProgress(Long id, int progress) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));
        try {
            job.updateProgress(progress);
        } catch (IllegalArgumentException | IllegalStateException exception) {
            throw new InvalidJobStateException(exception.getMessage());
        }
    }

    @Override
    @Transactional
    public void completeProcessing(Long id) {
        transitionJobState(id, JobStatus.COMPLETED, null);
    }

    @Override
    @Transactional
    public void failProcessing(Long id, String failureMessage) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));
        if (job.getStatus() == JobStatus.PENDING || job.getStatus() == JobStatus.RUNNING) {
            job.transitionTo(JobStatus.FAILED, failureMessage);
        }
    }

    private Dataset findAuthorizedDataset(Long datasetId, SecurityUser principal) {
        Dataset dataset = datasetRepository.findById(datasetId)
                .orElseThrow(() -> new ResourceNotFoundException("Dataset not found"));
        assertAuthorized(dataset, principal);
        return dataset;
    }

    private void assertAuthorized(Dataset dataset, SecurityUser principal) {
        if (principal.getRole() == UserRole.ADMIN) {
            return;
        }
        if (!dataset.getOwner().getId().equals(principal.getId())) {
            throw new UnauthorizedOperationException("Not authorized to access this dataset or its jobs");
        }
    }
}
