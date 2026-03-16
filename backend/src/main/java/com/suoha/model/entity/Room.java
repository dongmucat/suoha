package com.suoha.model.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Room {
    private String id;
    private String roomCode;
    private String hostUserId;
    @Builder.Default
    private List<String> playerIds = new ArrayList<>();
    private String status; // WAITING, PLAYING, SETTLED
    private long createdAt;
}
