package com.suoha.controller;

import com.suoha.model.dto.CreateRoomResponse;
import com.suoha.model.dto.EndGameResponse;
import com.suoha.model.dto.JoinRoomRequest;
import com.suoha.model.dto.JoinRoomResponse;
import com.suoha.model.dto.RoomInfoResponse;
import com.suoha.model.dto.TransferHostRequest;
import com.suoha.service.RoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;

    @PostMapping
    public Map<String, Object> createRoom(Authentication authentication) {
        String userId = authentication.getName();
        CreateRoomResponse response = roomService.createRoom(userId);
        return Map.of(
                "code", 200,
                "message", "success",
                "data", response
        );
    }

    @PostMapping("/join")
    public Map<String, Object> joinRoom(Authentication authentication,
                                        @Valid @RequestBody JoinRoomRequest request) {
        String userId = authentication.getName();
        JoinRoomResponse response = roomService.joinRoom(userId, request.getRoomCode());
        return Map.of(
                "code", 200,
                "message", "success",
                "data", response
        );
    }

    @GetMapping("/{roomId}")
    public Map<String, Object> getRoomInfo(Authentication authentication,
                                           @PathVariable String roomId) {
        String userId = authentication.getName();
        RoomInfoResponse response = roomService.getRoomInfo(roomId, userId);
        return Map.of(
                "code", 200,
                "message", "success",
                "data", response
        );
    }

    @PostMapping("/{roomId}/leave")
    public Map<String, Object> leaveRoom(Authentication authentication,
                                         @PathVariable String roomId) {
        String userId = authentication.getName();
        roomService.leaveRoom(userId, roomId);
        return Map.of(
                "code", 200,
                "message", "success",
                "data", Map.of()
        );
    }

    @PostMapping("/{roomId}/transfer")
    public Map<String, Object> transferHost(Authentication authentication,
                                            @PathVariable String roomId,
                                            @Valid @RequestBody TransferHostRequest request) {
        String userId = authentication.getName();
        roomService.transferHost(roomId, userId, request.getNewHostUserId());
        return Map.of(
                "code", 200,
                "message", "success",
                "data", Map.of()
        );
    }

    @PostMapping("/{roomId}/end")
    public Map<String, Object> endGame(Authentication authentication,
                                       @PathVariable String roomId) {
        String userId = authentication.getName();
        EndGameResponse response = roomService.endGame(roomId, userId);
        return Map.of(
                "code", 200,
                "message", "success",
                "data", response
        );
    }

    @PostMapping("/{roomId}/cleanup")
    public Map<String, Object> cleanupAfterSettlement(Authentication authentication,
                                                      @PathVariable String roomId) {
        String userId = authentication.getName();
        roomService.cleanupAfterSettlement(roomId, userId);
        return Map.of(
                "code", 200,
                "message", "清理完成",
                "data", Map.of()
        );
    }
}
