package com.dataflowx.dataset.controller;

import com.dataflowx.dataset.dto.request.CreateDatasetRequest;
import com.dataflowx.dataset.dto.request.UpdateDatasetRequest;
import com.dataflowx.dataset.dto.response.DatasetResponse;
import com.dataflowx.dataset.service.DatasetService;
import com.dataflowx.security.SecurityUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/datasets")
@RequiredArgsConstructor
public class DatasetController {

    private final DatasetService datasetService;

    @PostMapping
    public ResponseEntity<DatasetResponse> create(
            @Valid @RequestBody CreateDatasetRequest request,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(datasetService.createDataset(request, principal));
    }

    @GetMapping
    public Page<DatasetResponse> list(
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return datasetService.getDatasets(principal, pageable);
    }

    @GetMapping("/{id}")
    public DatasetResponse getById(
            @PathVariable Long id,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return datasetService.getDatasetById(id, principal);
    }

    @PutMapping("/{id}")
    public DatasetResponse update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDatasetRequest request,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return datasetService.updateDataset(id, request, principal);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable Long id,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        datasetService.deleteDataset(id, principal);
    }
}
