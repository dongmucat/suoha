package com.suoha.repository;

import com.suoha.model.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class UserRepository {

    private static final String USER_KEY_PREFIX = "user:";
    private static final String PHONE_INDEX_PREFIX = "user:phone:";

    private final RedisTemplate<String, Object> redisTemplate;

    public void save(User user) {
        String key = USER_KEY_PREFIX + user.getId();
        redisTemplate.opsForHash().put(key, "id", user.getId());
        redisTemplate.opsForHash().put(key, "phone", user.getPhone());
        redisTemplate.opsForHash().put(key, "passwordHash", user.getPasswordHash());
        redisTemplate.opsForHash().put(key, "nickname", user.getNickname());
        redisTemplate.opsForHash().put(key, "currentRoomId", user.getCurrentRoomId() != null ? user.getCurrentRoomId() : "");
        redisTemplate.opsForHash().put(key, "createdAt", String.valueOf(user.getCreatedAt()));

        // Phone index for O(1) lookup
        redisTemplate.opsForValue().set(PHONE_INDEX_PREFIX + user.getPhone(), user.getId());
    }

    public Optional<User> findById(String userId) {
        String key = USER_KEY_PREFIX + userId;
        if (Boolean.FALSE.equals(redisTemplate.hasKey(key))) {
            return Optional.empty();
        }
        return Optional.of(mapToUser(key));
    }

    public Optional<User> findByPhone(String phone) {
        Object userId = redisTemplate.opsForValue().get(PHONE_INDEX_PREFIX + phone);
        if (userId == null) {
            return Optional.empty();
        }
        return findById(userId.toString());
    }

    /**
     * Atomically set phone index only if not exists (prevents concurrent registration).
     * @return true if set successfully (phone not taken), false if already exists
     */
    public boolean setPhoneIndexIfAbsent(String phone, String userId) {
        return Boolean.TRUE.equals(
                redisTemplate.opsForValue().setIfAbsent(PHONE_INDEX_PREFIX + phone, userId)
        );
    }

    private User mapToUser(String key) {
        var hash = redisTemplate.opsForHash().entries(key);
        String roomId = hash.getOrDefault("currentRoomId", "").toString();
        return User.builder()
                .id(hash.get("id").toString())
                .phone(hash.get("phone").toString())
                .passwordHash(hash.get("passwordHash").toString())
                .nickname(hash.get("nickname").toString())
                .currentRoomId(roomId.isEmpty() ? null : roomId)
                .createdAt(Long.parseLong(hash.getOrDefault("createdAt", "0").toString()))
                .build();
    }
}
