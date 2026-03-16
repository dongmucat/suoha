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
public class EndGameResponse {
    private String roomId;
    private List<PlayerSettlement> players;
    private boolean totalCheck; // 盈亏之和 = 0

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlayerSettlement {
        private String userId;
        private String nickname;
        private int chips; // 盈亏值（正数赢/负数输）
    }
}
