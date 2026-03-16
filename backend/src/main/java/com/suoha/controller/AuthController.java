package com.suoha.controller;

import com.suoha.model.dto.LoginRequest;
import com.suoha.model.dto.LoginResponse;
import com.suoha.model.entity.User;
import com.suoha.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return Map.of(
                "code", 200,
                "message", "success",
                "data", response
        );
    }

    @GetMapping("/me")
    public Map<String, Object> me(Authentication authentication) {
        String userId = authentication.getName();
        User user = authService.getCurrentUser(userId);
        var data = new java.util.HashMap<String, Object>();
        data.put("userId", user.getId());
        data.put("phone", user.getPhone());
        data.put("nickname", user.getNickname());
        data.put("currentRoomId", user.getCurrentRoomId());
        return Map.of(
                "code", 200,
                "message", "success",
                "data", data
        );
    }
}
