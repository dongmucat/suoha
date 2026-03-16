package com.suoha.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomInfoResponse {
    private String roomId;
    private String roomCode;
    private String hostUserId;
    private List<PlayerInfo> players;
    private String status;
    private long createdAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlayerInfo {
        private String userId;
        private String nickname;
    }
}
