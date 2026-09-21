package com.dataflowx.dashboard.dto.response;

public record DashboardSummaryResponse(
        long totalDatasets,
        long pendingJobs,
        long runningJobs,
        long completedJobs,
        long failedJobs
) {
}
