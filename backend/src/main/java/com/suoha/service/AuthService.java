package com.suoha.service;

import com.suoha.exception.BusinessException;
import com.suoha.model.dto.LoginRequest;
import com.suoha.model.dto.LoginResponse;
import com.suoha.model.entity.User;
import com.suoha.repository.UserRepository;
import com.suoha.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public LoginResponse login(LoginRequest request) {
        Optional<User> existingUser = userRepository.findByPhone(request.getPhone());

        if (existingUser.isPresent()) {
            // Existing user: verify password
            User user = existingUser.get();
            if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
                throw new BusinessException(40001, "手机号或密码错误");
            }
            return buildLoginResponse(user);
        } else {
            // New user: auto-register
            return register(request);
        }
    }

    private LoginResponse register(LoginRequest request) {
        String userId = UUID.randomUUID().toString();

        // Atomic phone index to prevent concurrent registration
        if (!userRepository.setPhoneIndexIfAbsent(request.getPhone(), userId)) {
            // Another request registered this phone concurrently, retry login
            return login(request);
        }

        String phoneSuffix = request.getPhone().substring(request.getPhone().length() - 4);
        User user = User.builder()
                .id(userId)
                .phone(request.getPhone())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .nickname("玩家_" + phoneSuffix)
                .currentRoomId(null)
                .createdAt(System.currentTimeMillis())
                .build();

        userRepository.save(user);
        return buildLoginResponse(user);
    }

    public User getCurrentUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(40004, "用户不存在"));
    }

    private LoginResponse buildLoginResponse(User user) {
        String token = jwtTokenProvider.generateToken(user.getId());
        return LoginResponse.builder()
                .token(token)
                .userId(user.getId())
                .phone(user.getPhone())
                .nickname(user.getNickname())
                .build();
    }
}
