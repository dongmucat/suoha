package com.suoha.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class JoinRoomRequest {

    @NotBlank(message = "房间号不能为空")
    @Pattern(regexp = "^\\d{6}$", message = "房间号必须为6位数字")
    private String roomCode;
}
