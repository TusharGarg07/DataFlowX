package com.dataflowx.dataset.dto.request;

import com.dataflowx.dataset.entity.DatasetStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateDatasetRequest(

        @NotBlank
        @Size(max = 200)
        String name,

        @Size(max = 2000)
        String description,

        DatasetStatus status
) {
}
