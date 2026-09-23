package com.dataflowx.auth.mapper;

import com.dataflowx.auth.dto.response.AuthResponse;
import com.dataflowx.auth.dto.response.UserResponse;
import com.dataflowx.auth.entity.User;
import com.dataflowx.security.SecurityUser;

public final class UserMapper {

    private UserMapper() {
    }

    public static AuthResponse toAuthResponse(User user, String token) {
        return new AuthResponse(user.getId(), user.getUsername(), user.getEmail(), user.getRole(), token);
    }

    public static UserResponse toUserResponse(User user) {
        return new UserResponse(user.getId(), user.getUsername(), user.getEmail(), user.getRole());
    }

    public static UserResponse toUserResponse(SecurityUser principal) {
        return new UserResponse(principal.getId(), principal.getDisplayUsername(), principal.getUsername(), principal.getRole());
    }
}
