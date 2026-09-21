package com.dataflowx.job.dto.response;

import com.dataflowx.job.entity.JobStatus;

import java.time.Instant;

public record JobResponse(
        Long id,
        Long datasetId,
        JobStatus status,
        int progress,
        Instant submittedAt,
        Instant startedAt,
        Instant completedAt,
        String errorMessage
) {
}
