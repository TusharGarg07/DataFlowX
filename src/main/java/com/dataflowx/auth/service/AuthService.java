package com.dataflowx.auth.service;

import com.dataflowx.auth.dto.request.LoginRequest;
import com.dataflowx.auth.dto.request.RegisterRequest;
import com.dataflowx.auth.dto.response.AuthResponse;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);
}
