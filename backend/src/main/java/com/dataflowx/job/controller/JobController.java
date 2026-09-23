package com.dataflowx.job.controller;

import com.dataflowx.job.dto.request.CreateJobRequest;
import com.dataflowx.job.dto.response.JobResponse;
import com.dataflowx.job.service.JobService;
import com.dataflowx.security.SecurityUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class JobController {

    private static final int MAX_PAGE_SIZE = 100;

    private final JobService jobService;

    @PostMapping("/datasets/{datasetId}/jobs")
    public ResponseEntity<JobResponse> submitJob(
            @PathVariable Long datasetId,
            @Valid @RequestBody CreateJobRequest request,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(jobService.submitJob(datasetId, request, principal));
    }

    @GetMapping("/jobs")
    public Page<JobResponse> getJobs(
            @AuthenticationPrincipal SecurityUser principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "submittedAt,desc") String[] sort
    ) {
        int effectiveSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        return jobService.getJobs(principal, PageRequest.of(page, effectiveSize, Sort.by(parseSort(sort))));
    }

    @GetMapping("/jobs/{id}")
    public JobResponse getJobById(@PathVariable Long id, @AuthenticationPrincipal SecurityUser principal) {
        return jobService.getJobById(id, principal);
    }

    private Sort.Order parseSort(String[] sort) {
        String property = sort.length > 0 && !sort[0].isBlank() ? sort[0] : "submittedAt";
        Sort.Direction direction = sort.length > 1 ? Sort.Direction.fromOptionalString(sort[1]).orElse(Sort.Direction.DESC) : Sort.Direction.DESC;
        return new Sort.Order(direction, property);
    }
}
