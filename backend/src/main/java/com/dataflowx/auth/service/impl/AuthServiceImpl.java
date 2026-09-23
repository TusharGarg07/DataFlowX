package com.dataflowx.auth.service.impl;

import com.dataflowx.auth.dto.request.LoginRequest;
import com.dataflowx.auth.dto.request.RegisterRequest;
import com.dataflowx.auth.dto.response.AuthResponse;
import com.dataflowx.auth.entity.User;
import com.dataflowx.auth.entity.UserRole;
import com.dataflowx.auth.mapper.UserMapper;
import com.dataflowx.auth.repository.UserRepository;
import com.dataflowx.auth.service.AuthService;
import com.dataflowx.common.exception.InvalidCredentialsException;
import com.dataflowx.common.exception.ResourceConflictException;
import com.dataflowx.security.JwtService;
import com.dataflowx.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new ResourceConflictException("An account with that email already exists");
        }

        User user = new User(
                request.username(),
                request.email(),
                passwordEncoder.encode(request.password()),
                UserRole.USER
        );
        User savedUser = userRepository.save(user);
        return UserMapper.toAuthResponse(savedUser, jwtService.generateToken(new SecurityUser(savedUser)));
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        try {
            SecurityUser principal = (SecurityUser) authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(request.email(), request.password())
            ).getPrincipal();

            return new AuthResponse(
                    principal.getId(),
                    principal.getDisplayUsername(),
                    principal.getUsername(),
                    principal.getRole(),
                    jwtService.generateToken(principal)
            );
        } catch (BadCredentialsException exception) {
            throw new InvalidCredentialsException();
        }
    }
}
