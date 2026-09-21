package com.dataflowx.dashboard.controller;

import com.dataflowx.dashboard.dto.response.DashboardSummaryResponse;
import com.dataflowx.dashboard.service.DashboardService;
import com.dataflowx.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    public DashboardSummaryResponse getSummary(@AuthenticationPrincipal SecurityUser principal) {
        return dashboardService.getSummary(principal);
    }
}
