package com.dataflowx.auth.dto.response;

import com.dataflowx.auth.entity.UserRole;

public record UserResponse(
        Long id,
        String username,
        String email,
        UserRole role
) {
}
