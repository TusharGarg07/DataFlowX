package com.dataflowx.dataset.dto.response;

import com.dataflowx.dataset.entity.DatasetStatus;

import java.time.Instant;

public record DatasetResponse(
        Long id,
        String name,
        String description,
        Long ownerId,
        DatasetStatus status,
        Instant createdAt,
        Instant updatedAt
) {
}
