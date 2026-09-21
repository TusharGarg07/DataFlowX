package com.dataflowx.dataset.service.impl;

import com.dataflowx.auth.entity.User;
import com.dataflowx.auth.entity.UserRole;
import com.dataflowx.auth.repository.UserRepository;
import com.dataflowx.common.exception.ResourceNotFoundException;
import com.dataflowx.common.exception.UnauthorizedOperationException;
import com.dataflowx.dataset.dto.request.CreateDatasetRequest;
import com.dataflowx.dataset.dto.request.UpdateDatasetRequest;
import com.dataflowx.dataset.dto.response.DatasetResponse;
import com.dataflowx.dataset.entity.Dataset;
import com.dataflowx.dataset.mapper.DatasetMapper;
import com.dataflowx.dataset.repository.DatasetRepository;
import com.dataflowx.dataset.service.DatasetService;
import com.dataflowx.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DatasetServiceImpl implements DatasetService {

    private final DatasetRepository datasetRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public DatasetResponse createDataset(CreateDatasetRequest request, SecurityUser principal) {
        User owner = userRepository.getReferenceById(principal.getId());
        Dataset dataset = new Dataset(request.name(), request.description(), owner);
        Dataset saved = datasetRepository.save(dataset);
        return DatasetMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DatasetResponse> getDatasets(SecurityUser principal, Pageable pageable) {
        if (principal.getRole() == UserRole.ADMIN) {
            return DatasetMapper.toResponsePage(datasetRepository.findAll(pageable));
        }
        User owner = userRepository.getReferenceById(principal.getId());
        return DatasetMapper.toResponsePage(datasetRepository.findByOwner(owner, pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public DatasetResponse getDatasetById(Long id, SecurityUser principal) {
        Dataset dataset = datasetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dataset not found"));
        assertAuthorized(dataset, principal);
        return DatasetMapper.toResponse(dataset);
    }

    @Override
    @Transactional
    public DatasetResponse updateDataset(Long id, UpdateDatasetRequest request, SecurityUser principal) {
        Dataset dataset = datasetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dataset not found"));
        assertAuthorized(dataset, principal);
        dataset.update(request.name(), request.description(), request.status());
        return DatasetMapper.toResponse(dataset);
    }

    @Override
    @Transactional
    public void deleteDataset(Long id, SecurityUser principal) {
        Dataset dataset = datasetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dataset not found"));
        assertAuthorized(dataset, principal);
        datasetRepository.delete(dataset);
    }

    private void assertAuthorized(Dataset dataset, SecurityUser principal) {
        if (principal.getRole() == UserRole.ADMIN) {
            return;
        }
        if (!dataset.getOwner().getId().equals(principal.getId())) {
            throw new UnauthorizedOperationException("Not authorized to access this dataset");
        }
    }
}
