package com.dataflowx.dataset.service;

import com.dataflowx.dataset.dto.request.CreateDatasetRequest;
import com.dataflowx.dataset.dto.request.UpdateDatasetRequest;
import com.dataflowx.dataset.dto.response.DatasetResponse;
import com.dataflowx.security.SecurityUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface DatasetService {

    DatasetResponse createDataset(CreateDatasetRequest request, SecurityUser principal);

    Page<DatasetResponse> getDatasets(SecurityUser principal, Pageable pageable);

    DatasetResponse getDatasetById(Long id, SecurityUser principal);

    DatasetResponse updateDataset(Long id, UpdateDatasetRequest request, SecurityUser principal);

    void deleteDataset(Long id, SecurityUser principal);
}
