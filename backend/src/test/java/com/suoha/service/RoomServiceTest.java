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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoomServiceTest {

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ChipService chipService;

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    @InjectMocks
    private RoomService roomService;

    private User testUser;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        lenient().when(valueOperations.setIfAbsent(anyString(), anyString(), anyLong(), any(TimeUnit.class))).thenReturn(true);
        lenient().when(redisTemplate.delete(anyString())).thenReturn(true);
        testUser = User.builder()
                .id("user-1")
                .phone("13800138000")
                .passwordHash("hash")
                .nickname("玩家_8000")
                .currentRoomId(null)
                .createdAt(System.currentTimeMillis())
                .build();
    }

    @Test
    void createRoom_success() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));
        when(roomRepository.generateUniqueRoomCode(anyString())).thenReturn("123456");

        CreateRoomResponse response = roomService.createRoom("user-1");

        assertNotNull(response.getRoomId());
        assertEquals("123456", response.getRoomCode());
        assertEquals("user-1", response.getHostUserId());
        verify(roomRepository).save(any(Room.class));
        verify(userRepository).save(any(User.class));
    }

    @Test
    void createRoom_alreadyInRoom_throwsException() {
        testUser.setCurrentRoomId("existing-room");
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));
        // 房间必须真实存在，否则防御性检查会清除残留状态
        Room existingRoom = Room.builder().id("existing-room").roomCode("000000")
                .hostUserId("user-1").playerIds(new ArrayList<>(List.of("user-1")))
                .status("WAITING").createdAt(System.currentTimeMillis()).build();
        when(roomRepository.findById("existing-room")).thenReturn(Optional.of(existingRoom));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> roomService.createRoom("user-1"));
        assertEquals(40010, ex.getCode());
    }

    @Test
    void joinRoom_success() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));

        Room room = Room.builder()
                .id("room-1")
                .roomCode("654321")
                .hostUserId("host-user")
                .playerIds(new ArrayList<>(List.of("host-user")))
                .status("WAITING")
                .createdAt(System.currentTimeMillis())
                .build();
        when(roomRepository.findByRoomCode("654321")).thenReturn(Optional.of(room));

        JoinRoomResponse response = roomService.joinRoom("user-1", "654321");

        assertEquals("room-1", response.getRoomId());
        assertEquals("654321", response.getRoomCode());
        verify(roomRepository).updatePlayerIds(eq("room-1"), anyList());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void joinRoom_alreadyInRoom_throwsException() {
        testUser.setCurrentRoomId("existing-room");
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));
        // 房间必须真实存在，否则防御性检查会清除残留状态
        Room existingRoom = Room.builder().id("existing-room").roomCode("000000")
                .hostUserId("user-1").playerIds(new ArrayList<>(List.of("user-1")))
                .status("WAITING").createdAt(System.currentTimeMillis()).build();
        when(roomRepository.findById("existing-room")).thenReturn(Optional.of(existingRoom));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> roomService.joinRoom("user-1", "654321"));
        assertEquals(40010, ex.getCode());
    }

    @Test
    void joinRoom_roomNotFound_throwsException() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));
        when(roomRepository.findByRoomCode("999999")).thenReturn(Optional.empty());

        BusinessException ex = assertThrows(BusinessException.class,
                () -> roomService.joinRoom("user-1", "999999"));
        assertEquals(40011, ex.getCode());
    }

    @Test
    void joinRoom_roomFull_throwsException() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));

        List<String> fullPlayers = new ArrayList<>(
                List.of("p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"));
        Room room = Room.builder()
                .id("room-1")
                .roomCode("654321")
                .hostUserId("p1")
                .playerIds(fullPlayers)
                .status("WAITING")
                .createdAt(System.currentTimeMillis())
                .build();
        when(roomRepository.findByRoomCode("654321")).thenReturn(Optional.of(room));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> roomService.joinRoom("user-1", "654321"));
        assertEquals(40012, ex.getCode());
    }

    @Test
    void getRoomInfo_success() {
        Room room = Room.builder()
                .id("room-1")
                .roomCode("123456")
                .hostUserId("user-1")
                .playerIds(new ArrayList<>(List.of("user-1")))
                .status("WAITING")
                .createdAt(System.currentTimeMillis())
                .build();
        when(roomRepository.findById("room-1")).thenReturn(Optional.of(room));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));

        RoomInfoResponse response = roomService.getRoomInfo("room-1", "user-1");

        assertEquals("room-1", response.getRoomId());
        assertEquals("123456", response.getRoomCode());
        assertEquals(1, response.getPlayers().size());
        assertEquals("玩家_8000", response.getPlayers().get(0).getNickname());
    }

    @Test
    void getRoomInfo_roomNotFound_throwsException() {
        when(roomRepository.findById("nonexistent")).thenReturn(Optional.empty());

        BusinessException ex = assertThrows(BusinessException.class,
                () -> roomService.getRoomInfo("nonexistent", "user-1"));
        assertEquals(40011, ex.getCode());
    }

    // ===== Story 2.2: leaveRoom tests =====

    @Test
    void leaveRoom_normalPlayer_success() {
        testUser.setCurrentRoomId("room-1");
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));

        Room room = Room.builder()
                .id("room-1").roomCode("123456").hostUserId("host-user")
                .playerIds(new ArrayList<>(List.of("host-user", "user-1")))
                .status("WAITING").createdAt(System.currentTimeMillis()).build();
        when(roomRepository.findById("room-1")).thenReturn(Optional.of(room));

        roomService.leaveRoom("user-1", "room-1");

        assertNull(testUser.getCurrentRoomId());
        verify(userRepository).save(testUser);
        verify(roomRepository).updatePlayerIds(eq("room-1"), argThat(list -> !list.contains("user-1")));
        verify(roomRepository, never()).deleteRoom(anyString());
    }

    @Test
    void leaveRoom_hostAutoTransfer() {
        testUser.setCurrentRoomId("room-1");
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));

        Room room = Room.builder()
                .id("room-1").roomCode("123456").hostUserId("user-1")
                .playerIds(new ArrayList<>(List.of("user-1", "user-2", "user-3")))
                .status("WAITING").createdAt(System.currentTimeMillis()).build();
        when(roomRepository.findById("room-1")).thenReturn(Optional.of(room));

        roomService.leaveRoom("user-1", "room-1");

        verify(roomRepository).updateHostUserId("room-1", "user-2");
        verify(roomRepository).updatePlayerIds(eq("room-1"), argThat(list ->
                !list.contains("user-1") && list.get(0).equals("user-2")));
    }

    @Test
    void leaveRoom_lastPlayer_destroysRoom() {
        testUser.setCurrentRoomId("room-1");
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));

        Room room = Room.builder()
                .id("room-1").roomCode("123456").hostUserId("user-1")
                .playerIds(new ArrayList<>(List.of("user-1")))
                .status("WAITING").createdAt(System.currentTimeMillis()).build();
        when(roomRepository.findById("room-1")).thenReturn(Optional.of(room));

        roomService.leaveRoom("user-1", "room-1");

        verify(roomRepository).removeRoomCodeIndex("123456");
        verify(roomRepository).deleteRoom("room-1");
    }

    @Test
    void leaveRoom_notInRoom_throwsException() {
        testUser.setCurrentRoomId(null);
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> roomService.leaveRoom("user-1", "room-1"));
        assertEquals(40013, ex.getCode());
    }

    // ===== Story 2.2: transferHost tests =====

    @Test
    void transferHost_success() {
        Room room = Room.builder()
                .id("room-1").roomCode("123456").hostUserId("user-1")
                .playerIds(new ArrayList<>(List.of("user-1", "user-2")))
                .status("WAITING").createdAt(System.currentTimeMillis()).build();
        when(roomRepository.findById("room-1")).thenReturn(Optional.of(room));

        roomService.transferHost("room-1", "user-1", "user-2");

        verify(roomRepository).updateHostUserId("room-1", "user-2");
    }

    @Test
    void transferHost_notOwner_throwsException() {
        Room room = Room.builder()
                .id("room-1").roomCode("123456").hostUserId("user-1")
                .playerIds(new ArrayList<>(List.of("user-1", "user-2")))
                .status("WAITING").createdAt(System.currentTimeMillis()).build();
        when(roomRepository.findById("room-1")).thenReturn(Optional.of(room));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> roomService.transferHost("room-1", "user-2", "user-1"));
        assertEquals(40014, ex.getCode());
    }

    @Test
    void transferHost_targetNotInRoom_throwsException() {
        Room room = Room.builder()
                .id("room-1").roomCode("123456").hostUserId("user-1")
                .playerIds(new ArrayList<>(List.of("user-1")))
                .status("WAITING").createdAt(System.currentTimeMillis()).build();
        when(roomRepository.findById("room-1")).thenReturn(Optional.of(room));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> roomService.transferHost("room-1", "user-1", "user-99"));
        assertEquals(40015, ex.getCode());
    }

    // ===== Story 2.2: endGame tests =====

    @Test
    void endGame_success() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));

        Room room = Room.builder()
                .id("room-1").roomCode("123456").hostUserId("user-1")
                .playerIds(new ArrayList<>(List.of("user-1")))
                .status("WAITING").createdAt(System.currentTimeMillis()).build();
        when(roomRepository.findById("room-1")).thenReturn(Optional.of(room));

        EndGameResponse response = roomService.endGame("room-1", "user-1");

        assertEquals("room-1", response.getRoomId());
        assertEquals(1, response.getPlayers().size());
        assertTrue(response.isTotalCheck());
        verify(roomRepository).updateStatus("room-1", "SETTLED");
    }

    @Test
    void endGame_notOwner_throwsException() {
        Room room = Room.builder()
                .id("room-1").roomCode("123456").hostUserId("user-1")
                .playerIds(new ArrayList<>(List.of("user-1", "user-2")))
                .status("WAITING").createdAt(System.currentTimeMillis()).build();
        when(roomRepository.findById("room-1")).thenReturn(Optional.of(room));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> roomService.endGame("room-1", "user-2"));
        assertEquals(40014, ex.getCode());
    }
}
