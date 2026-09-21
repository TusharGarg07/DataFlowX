package com.dataflowx.job.mapper;

import com.dataflowx.job.dto.response.JobResponse;
import com.dataflowx.job.entity.Job;
import org.springframework.data.domain.Page;

public final class JobMapper {

    private JobMapper() {
    }

    public static JobResponse toResponse(Job job) {
        return new JobResponse(
                job.getId(),
                job.getDataset().getId(),
                job.getStatus(),
                job.getProgress(),
                job.getSubmittedAt(),
                job.getStartedAt(),
                job.getCompletedAt(),
                job.getErrorMessage()
        );
    }

    public static Page<JobResponse> toResponsePage(Page<Job> jobs) {
        return jobs.map(JobMapper::toResponse);
    }
}
