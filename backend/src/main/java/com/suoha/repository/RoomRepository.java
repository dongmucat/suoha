package com.suoha.repository;

import com.suoha.exception.BusinessException;
import com.suoha.model.entity.Room;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Repository
@RequiredArgsConstructor
public class RoomRepository {

    private static final String ROOM_KEY_PREFIX = "room:";
    private static final String ROOM_CODE_INDEX_PREFIX = "room:code:";
    private static final int MAX_RETRY = 10;

    private final RedisTemplate<String, Object> redisTemplate;

    public void save(Room room) {
        String key = ROOM_KEY_PREFIX + room.getId();
        redisTemplate.opsForHash().put(key, "id", room.getId());
        redisTemplate.opsForHash().put(key, "roomCode", room.getRoomCode());
        redisTemplate.opsForHash().put(key, "hostUserId", room.getHostUserId());
        redisTemplate.opsForHash().put(key, "playerIds", String.join(",", room.getPlayerIds()));
        redisTemplate.opsForHash().put(key, "status", room.getStatus());
        redisTemplate.opsForHash().put(key, "createdAt", String.valueOf(room.getCreatedAt()));
    }

    public Optional<Room> findById(String roomId) {
        String key = ROOM_KEY_PREFIX + roomId;
        if (Boolean.FALSE.equals(redisTemplate.hasKey(key))) {
            return Optional.empty();
        }
        return Optional.of(mapToRoom(key));
    }

    public Optional<Room> findByRoomCode(String roomCode) {
        Object roomId = redisTemplate.opsForValue().get(ROOM_CODE_INDEX_PREFIX + roomCode);
        if (roomId == null) {
            return Optional.empty();
        }
        return findById(roomId.toString());
    }

    public void updatePlayerIds(String roomId, List<String> playerIds) {
        String key = ROOM_KEY_PREFIX + roomId;
        redisTemplate.opsForHash().put(key, "playerIds", String.join(",", playerIds));
    }

    public void updateStatus(String roomId, String status) {
        String key = ROOM_KEY_PREFIX + roomId;
        redisTemplate.opsForHash().put(key, "status", status);
    }

    /**
     * Generate a unique 6-digit room code using SETNX for atomicity.
     * Retries up to MAX_RETRY times on collision.
     */
    public String generateUniqueRoomCode(String roomId) {
        for (int i = 0; i < MAX_RETRY; i++) {
            String code = String.format("%06d", ThreadLocalRandom.current().nextInt(1_000_000));
            Boolean set = redisTemplate.opsForValue().setIfAbsent(ROOM_CODE_INDEX_PREFIX + code, roomId);
            if (Boolean.TRUE.equals(set)) {
                return code;
            }
        }
        throw new BusinessException(40020, "无法生成唯一房间号，请重试");
    }

    public void updateHostUserId(String roomId, String hostUserId) {
        String key = ROOM_KEY_PREFIX + roomId;
        redisTemplate.opsForHash().put(key, "hostUserId", hostUserId);
    }

    public void deleteRoom(String roomId) {
        redisTemplate.delete(ROOM_KEY_PREFIX + roomId);
    }

    public void removeRoomCodeIndex(String roomCode) {
        redisTemplate.delete(ROOM_CODE_INDEX_PREFIX + roomCode);
    }

    private Room mapToRoom(String key) {
        var hash = redisTemplate.opsForHash().entries(key);
        String playerIdsStr = hash.getOrDefault("playerIds", "").toString();
        List<String> playerIds = playerIdsStr.isEmpty()
                ? new ArrayList<>()
                : new ArrayList<>(Arrays.asList(playerIdsStr.split(",")));

        return Room.builder()
                .id(hash.get("id").toString())
                .roomCode(hash.get("roomCode").toString())
                .hostUserId(hash.get("hostUserId").toString())
                .playerIds(playerIds)
                .status(hash.get("status").toString())
                .createdAt(Long.parseLong(hash.getOrDefault("createdAt", "0").toString()))
                .build();
    }
}
