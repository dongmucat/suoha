package com.suoha.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TransferHostRequest {
    @NotBlank(message = "新房主ID不能为空")
    private String newHostUserId;
}
