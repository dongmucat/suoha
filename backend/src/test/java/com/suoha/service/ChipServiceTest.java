package com.suoha.service;

import com.suoha.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.script.DefaultRedisScript;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChipServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private HashOperations<String, Object, Object> hashOperations;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private ChipService chipService;

    @BeforeEach
    void setUp() {
        chipService = new ChipService(redisTemplate);
    }

    @Test
    void initRoomChips_success() {
        when(redisTemplate.opsForHash()).thenReturn(hashOperations);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(redisTemplate.expire(anyString(), anyLong(), any())).thenReturn(true);

        chipService.initRoomChips("room-1", List.of("user-1", "user-2"));

        verify(hashOperations).put("room:room-1:chips", "user-1", "0");
        verify(hashOperations).put("room:room-1:chips", "user-2", "0");
        verify(valueOperations).set("room:room-1:pot", "0");
    }

    @Test
    void initPlayerChips_success() {
        when(redisTemplate.opsForHash()).thenReturn(hashOperations);
        when(redisTemplate.expire(anyString(), anyLong(), any())).thenReturn(true);

        chipService.initPlayerChips("room-1", "user-3");

        verify(hashOperations).put("room:room-1:chips", "user-3", "0");
    }

    @Test
    void placeBet_invalidAmount_throwsException() {
        assertThrows(BusinessException.class, () -> chipService.placeBet("room-1", "user-1", 0));
        assertThrows(BusinessException.class, () -> chipService.placeBet("room-1", "user-1", -10));
    }

    @Test
    void splitPot_emptyParticipants_throwsException() {
        assertThrows(BusinessException.class, () -> chipService.splitPot("room-1", "user-1", List.of()));
        assertThrows(BusinessException.class, () -> chipService.splitPot("room-1", "user-1", null));
    }

    @Test
    void getChipState_returnsCorrectState() {
        when(redisTemplate.opsForHash()).thenReturn(hashOperations);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        Map<Object, Object> chipsMap = new HashMap<>();
        chipsMap.put("user-1", "100");
        chipsMap.put("user-2", "-50");
        when(hashOperations.entries("room:room-1:chips")).thenReturn(chipsMap);
        when(valueOperations.get("room:room-1:pot")).thenReturn("200");

        Map<Object, Object> betsMap = new HashMap<>();
        betsMap.put("user-1", "150");
        when(hashOperations.entries("room:room-1:bets")).thenReturn(betsMap);

        Map<String, Object> state = chipService.getChipState("room-1");

        @SuppressWarnings("unchecked")
        Map<String, Integer> chips = (Map<String, Integer>) state.get("chips");
        assertEquals(100, chips.get("user-1"));
        assertEquals(-50, chips.get("user-2"));
        assertEquals(200, state.get("pot"));

        @SuppressWarnings("unchecked")
        Map<String, Integer> bets = (Map<String, Integer>) state.get("bets");
        assertEquals(150, bets.get("user-1"));
    }

    @Test
    void getPlayerChips_returnsMap() {
        when(redisTemplate.opsForHash()).thenReturn(hashOperations);

        Map<Object, Object> chipsMap = new HashMap<>();
        chipsMap.put("user-1", "500");
        chipsMap.put("user-2", "-200");
        when(hashOperations.entries("room:room-1:chips")).thenReturn(chipsMap);

        Map<String, Integer> result = chipService.getPlayerChips("room-1");

        assertEquals(500, result.get("user-1"));
        assertEquals(-200, result.get("user-2"));
    }

    @Test
    void deleteRoomChips_deletesAllKeys() {
        when(redisTemplate.delete(anyString())).thenReturn(true);

        chipService.deleteRoomChips("room-1");

        verify(redisTemplate).delete("room:room-1:chips");
        verify(redisTemplate).delete("room:room-1:pot");
        verify(redisTemplate).delete("room:room-1:bets");
    }
}
