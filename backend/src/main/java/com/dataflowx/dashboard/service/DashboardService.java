package com.dataflowx.dashboard.service;

import com.dataflowx.dashboard.dto.response.DashboardSummaryResponse;
import com.dataflowx.security.SecurityUser;

public interface DashboardService {

    DashboardSummaryResponse getSummary(SecurityUser principal);
}
