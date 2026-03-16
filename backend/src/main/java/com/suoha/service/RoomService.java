package com.suoha.service;

import com.suoha.exception.BusinessException;
import com.suoha.model.dto.CreateRoomResponse;
import com.suoha.model.dto.EndGameResponse;
import com.suoha.model.dto.JoinRoomResponse;
import com.suoha.model.dto.RoomInfoResponse;
import com.suoha.model.entity.Room;
import com.suoha.model.entity.User;
import com.suoha.repository.RoomRepository;
import com.suoha.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class RoomService {

    private static final int MAX_PLAYERS = 8;
    private static final String USER_LOCK_PREFIX = "lock:user:";
    private static final long LOCK_TIMEOUT_SECONDS = 5;

    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final ChipService chipService;
    private final RedisTemplate<String, Object> redisTemplate;

    public CreateRoomResponse createRoom(String userId) {
        String lockKey = USER_LOCK_PREFIX + userId;
        Boolean locked = redisTemplate.opsForValue().setIfAbsent(lockKey, "1", LOCK_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        if (!Boolean.TRUE.equals(locked)) {
            throw new BusinessException(40017, "操作过于频繁，请稍后重试");
        }
        try {
            return doCreateRoom(userId);
        } finally {
            redisTemplate.delete(lockKey);
        }
    }

    private CreateRoomResponse doCreateRoom(String userId) {
        User user = getUser(userId);

        // 单房间限制（防御性检查：房间已不存在时自动清除残留状态）
        if (user.getCurrentRoomId() != null) {
            if (roomRepository.findById(user.getCurrentRoomId()).isEmpty()) {
                updateUserCurrentRoom(user, null);
            } else {
                throw new BusinessException(40010, "您已在房间中，请先退出当前房间");
            }
        }

        String roomId = UUID.randomUUID().toString();
        String roomCode = roomRepository.generateUniqueRoomCode(roomId);

        List<String> playerIds = new ArrayList<>();
        playerIds.add(userId);

        Room room = Room.builder()
                .id(roomId)
                .roomCode(roomCode)
                .hostUserId(userId)
                .playerIds(playerIds)
                .status("WAITING")
                .createdAt(System.currentTimeMillis())
                .build();

        roomRepository.save(room);
        updateUserCurrentRoom(user, roomId);

        // 初始化筹码数据
        chipService.initRoomChips(roomId, playerIds);

        return CreateRoomResponse.builder()
                .roomId(roomId)
                .roomCode(roomCode)
                .hostUserId(userId)
                .build();
    }

    public JoinRoomResponse joinRoom(String userId, String roomCode) {
        String lockKey = USER_LOCK_PREFIX + userId;
        Boolean locked = redisTemplate.opsForValue().setIfAbsent(lockKey, "1", LOCK_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        if (!Boolean.TRUE.equals(locked)) {
            throw new BusinessException(40017, "操作过于频繁，请稍后重试");
        }
        try {
            return doJoinRoom(userId, roomCode);
        } finally {
            redisTemplate.delete(lockKey);
        }
    }

    private JoinRoomResponse doJoinRoom(String userId, String roomCode) {
        User user = getUser(userId);

        // 单房间限制（防御性检查：房间已不存在时自动清除残留状态）
        if (user.getCurrentRoomId() != null) {
            if (roomRepository.findById(user.getCurrentRoomId()).isEmpty()) {
                updateUserCurrentRoom(user, null);
            } else {
                throw new BusinessException(40010, "您已在房间中，请先退出当前房间");
            }
        }

        // 查找房间
        Room room = roomRepository.findByRoomCode(roomCode)
                .orElseThrow(() -> new BusinessException(40011, "房间不存在"));

        // 满员检查
        if (room.getPlayerIds().size() >= MAX_PLAYERS) {
            throw new BusinessException(40012, "房间已满");
        }

        // 添加玩家
        room.getPlayerIds().add(userId);
        roomRepository.updatePlayerIds(room.getId(), room.getPlayerIds());
        updateUserCurrentRoom(user, room.getId());

        // 初始化新玩家筹码
        chipService.initPlayerChips(room.getId(), userId);

        return JoinRoomResponse.builder()
                .roomId(room.getId())
                .roomCode(room.getRoomCode())
                .build();
    }

    public RoomInfoResponse getRoomInfo(String roomId, String userId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new BusinessException(40011, "房间不存在"));

        // 验证请求者是否属于该房间
        if (!room.getPlayerIds().contains(userId)) {
            throw new BusinessException(40013, "您不在该房间中");
        }

        List<RoomInfoResponse.PlayerInfo> players = room.getPlayerIds().stream()
                .map(pid -> {
                    User u = userRepository.findById(pid).orElse(null);
                    if (u == null) {
                        return RoomInfoResponse.PlayerInfo.builder()
                                .userId(pid)
                                .nickname("未知玩家")
                                .build();
                    }
                    return RoomInfoResponse.PlayerInfo.builder()
                            .userId(u.getId())
                            .nickname(u.getNickname())
                            .build();
                })
                .toList();

        return RoomInfoResponse.builder()
                .roomId(room.getId())
                .roomCode(room.getRoomCode())
                .hostUserId(room.getHostUserId())
                .players(players)
                .status(room.getStatus())
                .createdAt(room.getCreatedAt())
                .build();
    }

    public void leaveRoom(String userId, String roomId) {
        User user = getUser(userId);
        if (user.getCurrentRoomId() == null) {
            throw new BusinessException(40013, "您不在任何房间中");
        }

        // 校验用户所在房间与请求的房间一致
        if (!user.getCurrentRoomId().equals(roomId)) {
            throw new BusinessException(40013, "您不在该房间中");
        }

        // 房间已不存在时（被其他玩家离开时销毁），兜底清除 currentRoomId
        var roomOpt = roomRepository.findById(roomId);
        if (roomOpt.isEmpty()) {
            updateUserCurrentRoom(user, null);
            return;
        }

        Room room = roomOpt.get();

        // 从玩家列表移除
        room.getPlayerIds().remove(userId);

        // 清空用户的 currentRoomId
        updateUserCurrentRoom(user, null);

        if (room.getPlayerIds().isEmpty()) {
            // 最后一个玩家离开，销毁房间
            destroyRoom(room);
        } else {
            // 如果是房主离开，自动转让给列表中第一个玩家
            if (room.getHostUserId().equals(userId)) {
                String newHostId = room.getPlayerIds().get(0);
                room.setHostUserId(newHostId);
                roomRepository.updateHostUserId(room.getId(), newHostId);
            }
            roomRepository.updatePlayerIds(room.getId(), room.getPlayerIds());
        }
    }

    public void transferHost(String roomId, String currentUserId, String newHostUserId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new BusinessException(40011, "房间不存在"));

        // 验证当前用户是房主
        if (!room.getHostUserId().equals(currentUserId)) {
            throw new BusinessException(40014, "只有房主可以转让权限");
        }

        // 验证新房主在房间中
        if (!room.getPlayerIds().contains(newHostUserId)) {
            throw new BusinessException(40015, "目标玩家不在房间中");
        }

        room.setHostUserId(newHostUserId);
        roomRepository.updateHostUserId(roomId, newHostUserId);
    }

    public EndGameResponse endGame(String roomId, String userId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new BusinessException(40011, "房间不存在"));

        // 防止重复结算
        if ("SETTLED".equals(room.getStatus())) {
            throw new BusinessException(40018, "牌局已结算，请勿重复操作");
        }

        // 验证是房主
        if (!room.getHostUserId().equals(userId)) {
            throw new BusinessException(40014, "只有房主可以结束牌局");
        }

        // 池底非零校验
        int pot = chipService.getPot(roomId);
        if (pot != 0) {
            throw new BusinessException(40016, "池底还有 " + pot + " 未分配，请先收回或平分池底");
        }

        // 更新房间状态
        roomRepository.updateStatus(roomId, "SETTLED");

        // 从 Redis 读取实际筹码数据用于结算
        Map<String, Integer> playerChips = chipService.getPlayerChips(roomId);

        List<EndGameResponse.PlayerSettlement> players = room.getPlayerIds().stream()
                .map(pid -> {
                    User u = userRepository.findById(pid).orElse(null);
                    String nickname = (u != null) ? u.getNickname() : "未知玩家";
                    return EndGameResponse.PlayerSettlement.builder()
                            .userId(pid)
                            .nickname(nickname)
                            .chips(playerChips.getOrDefault(pid, 0))
                            .build();
                })
                .toList();

        int totalChips = players.stream().mapToInt(EndGameResponse.PlayerSettlement::getChips).sum();

        return EndGameResponse.builder()
                .roomId(roomId)
                .players(players)
                .totalCheck(totalChips == 0)
                .build();
    }

    public void cleanupAfterSettlement(String roomId, String userId) {
        var roomOpt = roomRepository.findById(roomId);
        if (roomOpt.isPresent()) {
            Room room = roomOpt.get();
            // 验证请求者是否属于该房间
            if (!room.getPlayerIds().contains(userId)) {
                throw new BusinessException(40013, "您不在该房间中");
            }
            // 清除所有玩家的 currentRoomId
            for (String pid : room.getPlayerIds()) {
                userRepository.findById(pid).ifPresent(u -> {
                    u.setCurrentRoomId(null);
                    userRepository.save(u);
                });
            }
            destroyRoom(room);
        } else {
            // 房间已被其他玩家清理，兜底清除自己的 currentRoomId
            userRepository.findById(userId).ifPresent(u -> {
                u.setCurrentRoomId(null);
                userRepository.save(u);
            });
        }
    }

    private void destroyRoom(Room room) {
        roomRepository.removeRoomCodeIndex(room.getRoomCode());
        roomRepository.deleteRoom(room.getId());
        chipService.deleteRoomChips(room.getId());
    }

    private User getUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(40004, "用户不存在"));
    }

    private void updateUserCurrentRoom(User user, String roomId) {
        user.setCurrentRoomId(roomId);
        userRepository.save(user);
    }
}
