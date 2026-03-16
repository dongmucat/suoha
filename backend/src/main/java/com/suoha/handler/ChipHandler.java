package com.suoha.handler;

import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.SocketIOServer;
import com.corundumstudio.socketio.listener.ConnectListener;
import com.corundumstudio.socketio.listener.DisconnectListener;
import com.suoha.exception.BusinessException;
import com.suoha.model.dto.EndGameResponse;
import com.suoha.model.entity.Room;
import com.suoha.model.entity.User;
import com.suoha.repository.RoomRepository;
import com.suoha.repository.UserRepository;
import com.suoha.security.JwtTokenProvider;
import com.suoha.service.ChipService;
import com.suoha.service.RoomService;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class ChipHandler {

    private final SocketIOServer socketIOServer;
    private final ChipService chipService;
    private final RoomService roomService;
    private final JwtTokenProvider jwtTokenProvider;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;

    // userId -> SocketIOClient mapping
    private final ConcurrentHashMap<String, SocketIOClient> userClients = new ConcurrentHashMap<>();

    @PostConstruct
    public void start() {
        socketIOServer.addConnectListener(onConnect());
        socketIOServer.addDisconnectListener(onDisconnect());

        socketIOServer.addEventListener("place-bet", Map.class, (client, data, ackRequest) -> {
            String userId = client.get("userId");
            String roomId = client.get("roomId");
            if (userId == null || roomId == null) {
                ackRequest.sendAckData(Map.of("success", false, "error", "未认证或未加入房间"));
                return;
            }

            try {
                int amount = ((Number) data.get("amount")).intValue();
                Map<String, Object> state = chipService.placeBet(roomId, userId, amount);
                socketIOServer.getRoomOperations(roomId).sendEvent("bet-placed", state);
                ackRequest.sendAckData(Map.of("success", true));
            } catch (BusinessException e) {
                ackRequest.sendAckData(Map.of("success", false, "error", e.getMessage()));
            } catch (Exception e) {
                log.error("place-bet error", e);
                ackRequest.sendAckData(Map.of("success", false, "error", "下注失败"));
            }
        });

        socketIOServer.addEventListener("collect-pot", Map.class, (client, data, ackRequest) -> {
            String userId = client.get("userId");
            String roomId = client.get("roomId");
            if (userId == null || roomId == null) {
                ackRequest.sendAckData(Map.of("success", false, "error", "未认证或未加入房间"));
                return;
            }

            try {
                Map<String, Object> state = chipService.collectPot(roomId, userId);
                socketIOServer.getRoomOperations(roomId).sendEvent("pot-collected", state);
                ackRequest.sendAckData(Map.of("success", true));
            } catch (BusinessException e) {
                ackRequest.sendAckData(Map.of("success", false, "error", e.getMessage()));
            } catch (Exception e) {
                log.error("collect-pot error", e);
                ackRequest.sendAckData(Map.of("success", false, "error", "收回池底失败"));
            }
        });

        socketIOServer.addEventListener("split-pot", Map.class, (client, data, ackRequest) -> {
            String userId = client.get("userId");
            String roomId = client.get("roomId");
            if (userId == null || roomId == null) {
                ackRequest.sendAckData(Map.of("success", false, "error", "未认证或未加入房间"));
                return;
            }

            try {
                @SuppressWarnings("unchecked")
                List<String> participantIds = (List<String>) data.get("participantIds");
                Map<String, Object> state = chipService.splitPot(roomId, userId, participantIds);
                socketIOServer.getRoomOperations(roomId).sendEvent("pot-split", state);
                ackRequest.sendAckData(Map.of("success", true));
            } catch (BusinessException e) {
                ackRequest.sendAckData(Map.of("success", false, "error", e.getMessage()));
            } catch (Exception e) {
                log.error("split-pot error", e);
                ackRequest.sendAckData(Map.of("success", false, "error", "平分池底失败"));
            }
        });

        socketIOServer.addEventListener("transfer-owner", Map.class, (client, data, ackRequest) -> {
            String userId = client.get("userId");
            String roomId = client.get("roomId");
            if (userId == null || roomId == null) {
                ackRequest.sendAckData(Map.of("success", false, "error", "未认证或未加入房间"));
                return;
            }
            try {
                String newHostUserId = (String) data.get("newHostUserId");
                roomService.transferHost(roomId, userId, newHostUserId);
                User newHost = userRepository.findById(newHostUserId).orElse(null);
                String nickname = newHost != null ? newHost.getNickname() : "未知玩家";
                socketIOServer.getRoomOperations(roomId).sendEvent("owner-transferred",
                        Map.of("newHostUserId", newHostUserId, "newHostNickname", nickname));
                ackRequest.sendAckData(Map.of("success", true, "newHostNickname", nickname));
            } catch (BusinessException e) {
                ackRequest.sendAckData(Map.of("success", false, "error", e.getMessage()));
            } catch (Exception e) {
                log.error("transfer-owner error", e);
                ackRequest.sendAckData(Map.of("success", false, "error", "转让房主失败"));
            }
        });

        socketIOServer.addEventListener("end-game", Map.class, (client, data, ackRequest) -> {
            String userId = client.get("userId");
            String roomId = client.get("roomId");
            if (userId == null || roomId == null) {
                ackRequest.sendAckData(Map.of("success", false, "error", "未认证或未加入房间"));
                return;
            }
            try {
                EndGameResponse settlement = roomService.endGame(roomId, userId);
                socketIOServer.getRoomOperations(roomId).sendEvent("game-ended", settlement);
                ackRequest.sendAckData(Map.of("success", true));
            } catch (BusinessException e) {
                ackRequest.sendAckData(Map.of("success", false, "error", e.getMessage()));
            } catch (Exception e) {
                log.error("end-game error", e);
                ackRequest.sendAckData(Map.of("success", false, "error", "结束牌局失败"));
            }
        });

        socketIOServer.start();
        log.info("Socket.IO server started on port {}", socketIOServer.getConfiguration().getPort());
    }

    @PreDestroy
    public void stop() {
        socketIOServer.stop();
    }

    private ConnectListener onConnect() {
        return client -> {
            String token = client.getHandshakeData().getSingleUrlParam("token");
            if (token == null) {
                // 尝试从 auth header 获取
                String authHeader = client.getHandshakeData().getHttpHeaders().get("Authorization");
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    token = authHeader.substring(7);
                }
            }

            if (token == null || !jwtTokenProvider.validateToken(token)) {
                log.warn("Socket.IO connection rejected: invalid token");
                client.disconnect();
                return;
            }

            String userId = jwtTokenProvider.getUserIdFromToken(token);
            String roomId = client.getHandshakeData().getSingleUrlParam("roomId");

            if (roomId == null) {
                log.warn("Socket.IO connection rejected: no roomId");
                client.disconnect();
                return;
            }

            // 验证用户是否属于该房间
            Room room = roomRepository.findById(roomId).orElse(null);
            if (room == null || !room.getPlayerIds().contains(userId)) {
                log.warn("Socket.IO connection rejected: user {} not in room {}", userId, roomId);
                client.disconnect();
                return;
            }

            client.set("userId", userId);
            client.set("roomId", roomId);
            client.joinRoom(roomId);

            // 处理重复连接：踢掉旧连接
            SocketIOClient oldClient = userClients.put(userId, client);
            if (oldClient != null && oldClient.getSessionId() != client.getSessionId()) {
                log.info("Disconnecting old connection for user {}", userId);
                oldClient.disconnect();
            }

            // 发送完整房间状态（包含 chips、pot、bets、players、hostUserId）
            Map<String, Object> fullState = buildFullRoomState(roomId);
            client.sendEvent("room-state", fullState);

            // 广播 player-joined 事件给房间内其他玩家
            broadcastPlayerJoined(roomId, userId);

            log.info("User {} connected to room {}", userId, roomId);
        };
    }

    private DisconnectListener onDisconnect() {
        return client -> {
            String userId = client.get("userId");
            String roomId = client.get("roomId");
            if (userId != null) {
                userClients.remove(userId);
            }
            if (roomId != null) {
                client.leaveRoom(roomId);
                // 广播 player-left 事件给房间内其他玩家
                broadcastPlayerLeft(roomId, userId);
            }
            log.info("User {} disconnected from room {}", userId, roomId);
        };
    }

    /**
     * 构建完整房间状态快照（chips、pot、bets、players、hostUserId）
     */
    private Map<String, Object> buildFullRoomState(String roomId) {
        // 获取筹码状态
        Map<String, Object> chipState = chipService.getChipState(roomId);

        // 获取房间信息
        Room room = roomRepository.findById(roomId).orElse(null);
        if (room == null) {
            return chipState; // 房间不存在时返回基础筹码状态
        }

        // 构建玩家列表（包含 userId 和 nickname）
        List<Map<String, String>> players = room.getPlayerIds().stream()
                .map(playerId -> {
                    User user = userRepository.findById(playerId).orElse(null);
                    Map<String, String> playerInfo = new HashMap<>();
                    playerInfo.put("userId", playerId);
                    playerInfo.put("nickname", user != null ? user.getNickname() : "未知玩家");
                    return playerInfo;
                })
                .collect(Collectors.toList());

        // 合并完整状态
        Map<String, Object> fullState = new HashMap<>(chipState);
        fullState.put("players", players);
        fullState.put("hostUserId", room.getHostUserId());

        return fullState;
    }

    /**
     * 广播 player-joined 事件给房间内其他玩家
     */
    private void broadcastPlayerJoined(String roomId, String userId) {
        User user = userRepository.findById(userId).orElse(null);
        Map<String, String> playerInfo = new HashMap<>();
        playerInfo.put("userId", userId);
        playerInfo.put("nickname", user != null ? user.getNickname() : "未知玩家");

        socketIOServer.getRoomOperations(roomId).sendEvent("player-joined", playerInfo);
        log.info("Broadcasted player-joined event for user {} in room {}", userId, roomId);
    }

    /**
     * 广播 player-left 事件给房间内其他玩家
     */
    private void broadcastPlayerLeft(String roomId, String userId) {
        Map<String, String> playerInfo = new HashMap<>();
        playerInfo.put("userId", userId);

        socketIOServer.getRoomOperations(roomId).sendEvent("player-left", playerInfo);
        log.info("Broadcasted player-left event for user {} in room {}", userId, roomId);
    }
}
