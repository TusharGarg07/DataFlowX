package com.dataflowx.dashboard.service.impl;

import com.dataflowx.auth.entity.UserRole;
import com.dataflowx.common.exception.UnauthorizedOperationException;
import com.dataflowx.dashboard.dto.response.DashboardSummaryResponse;
import com.dataflowx.dashboard.service.DashboardService;
import com.dataflowx.dataset.repository.DatasetRepository;
import com.dataflowx.job.entity.JobStatus;
import com.dataflowx.job.repository.JobRepository;
import com.dataflowx.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final DatasetRepository datasetRepository;
    private final JobRepository jobRepository;

    @Override
    @Transactional(readOnly = true)
    public DashboardSummaryResponse getSummary(SecurityUser principal) {
        if (principal.getRole() != UserRole.ADMIN) {
            throw new UnauthorizedOperationException("Administrator access is required for the dashboard");
        }

        return new DashboardSummaryResponse(
                datasetRepository.count(),
                jobRepository.countByStatus(JobStatus.PENDING),
                jobRepository.countByStatus(JobStatus.RUNNING),
                jobRepository.countByStatus(JobStatus.COMPLETED),
                jobRepository.countByStatus(JobStatus.FAILED)
        );
    }
}
