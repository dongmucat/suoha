package com.suoha.model.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {
    private String id;
    private String phone;
    private String passwordHash;
    private String nickname;
    private String currentRoomId;
    private long createdAt;
}
