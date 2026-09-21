package com.dataflowx.job.service;

import com.dataflowx.job.dto.request.CreateJobRequest;
import com.dataflowx.job.dto.response.JobResponse;
import com.dataflowx.job.entity.JobStatus;
import com.dataflowx.security.SecurityUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface JobService {

    JobResponse submitJob(Long datasetId, CreateJobRequest request, SecurityUser principal);

    Page<JobResponse> getJobs(SecurityUser principal, Pageable pageable);

    JobResponse getJobById(Long id, SecurityUser principal);

    JobResponse transitionJobState(Long id, JobStatus targetStatus, String failureMessage);

    boolean startProcessing(Long id);

    void updateJobProgress(Long id, int progress);

    void completeProcessing(Long id);

    void failProcessing(Long id, String failureMessage);
}
