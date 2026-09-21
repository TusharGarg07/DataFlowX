package com.dataflowx.dataset.mapper;

import com.dataflowx.dataset.dto.response.DatasetResponse;
import com.dataflowx.dataset.entity.Dataset;
import org.springframework.data.domain.Page;

public final class DatasetMapper {

    private DatasetMapper() {
    }

    public static DatasetResponse toResponse(Dataset dataset) {
        return new DatasetResponse(
                dataset.getId(),
                dataset.getName(),
                dataset.getDescription(),
                dataset.getOwner().getId(),
                dataset.getStatus(),
                dataset.getCreatedAt(),
                dataset.getUpdatedAt()
        );
    }

    public static Page<DatasetResponse> toResponsePage(Page<Dataset> datasets) {
        return datasets.map(DatasetMapper::toResponse);
    }
}
