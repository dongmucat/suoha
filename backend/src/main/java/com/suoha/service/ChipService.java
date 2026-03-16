package com.suoha.service;

import com.suoha.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.scripting.support.ResourceScriptSource;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChipService {

    private static final String CHIPS_KEY = "room:%s:chips";
    private static final String POT_KEY = "room:%s:pot";
    private static final String BETS_KEY = "room:%s:bets";
    private static final long TTL_HOURS = 24;

    private final StringRedisTemplate redisTemplate;

    private DefaultRedisScript<List> placeBetScript;
    private DefaultRedisScript<List> collectPotScript;
    private DefaultRedisScript<List> splitPotScript;

    @PostConstruct
    public void init() {
        placeBetScript = new DefaultRedisScript<>();
        placeBetScript.setScriptSource(new ResourceScriptSource(new ClassPathResource("lua/place_bet.lua")));
        placeBetScript.setResultType(List.class);

        collectPotScript = new DefaultRedisScript<>();
        collectPotScript.setScriptSource(new ResourceScriptSource(new ClassPathResource("lua/collect_pot.lua")));
        collectPotScript.setResultType(List.class);

        splitPotScript = new DefaultRedisScript<>();
        splitPotScript.setScriptSource(new ResourceScriptSource(new ClassPathResource("lua/split_pot.lua")));
        splitPotScript.setResultType(List.class);
    }

    public void initRoomChips(String roomId, List<String> playerIds) {
        String chipsKey = String.format(CHIPS_KEY, roomId);
        String potKey = String.format(POT_KEY, roomId);
        String betsKey = String.format(BETS_KEY, roomId);

        for (String playerId : playerIds) {
            redisTemplate.opsForHash().put(chipsKey, playerId, "0");
        }
        redisTemplate.opsForValue().set(potKey, "0");
        // bets key 不需要初始化，使用时自动创建

        refreshTTL(roomId);
    }

    public void initPlayerChips(String roomId, String userId) {
        String chipsKey = String.format(CHIPS_KEY, roomId);
        redisTemplate.opsForHash().put(chipsKey, userId, "0");
        refreshTTL(roomId);
    }

    public Map<String, Object> placeBet(String roomId, String userId, int amount) {
        if (amount <= 0) {
            throw new BusinessException(40030, "下注金额必须大于0");
        }

        List<String> keys = List.of(
                String.format(CHIPS_KEY, roomId),
                String.format(POT_KEY, roomId),
                String.format(BETS_KEY, roomId)
        );

        @SuppressWarnings("unchecked")
        List<Object> result = redisTemplate.execute(placeBetScript, keys, userId, String.valueOf(amount));

        refreshTTL(roomId);

        return buildChipState(roomId);
    }

    public Map<String, Object> collectPot(String roomId, String userId) {
        List<String> keys = List.of(
                String.format(CHIPS_KEY, roomId),
                String.format(POT_KEY, roomId),
                String.format(BETS_KEY, roomId)
        );

        @SuppressWarnings("unchecked")
        List<Object> result = redisTemplate.execute(collectPotScript, keys, userId);

        if (result != null && result.size() >= 2 && "POT_EMPTY".equals(result.get(1))) {
            throw new BusinessException(40031, "池底为空，无法收回");
        }

        refreshTTL(roomId);

        return buildChipState(roomId);
    }

    public Map<String, Object> splitPot(String roomId, String userId, List<String> participantIds) {
        if (participantIds == null || participantIds.isEmpty()) {
            throw new BusinessException(40032, "至少选择1人参与平分");
        }

        List<String> keys = List.of(
                String.format(CHIPS_KEY, roomId),
                String.format(POT_KEY, roomId),
                String.format(BETS_KEY, roomId)
        );

        List<Object> args = new ArrayList<>();
        args.add(String.valueOf(participantIds.size()));
        args.addAll(participantIds);

        @SuppressWarnings("unchecked")
        List<Object> result = redisTemplate.execute(splitPotScript, keys, args.toArray());

        if (result != null && result.size() >= 2 && "POT_EMPTY".equals(result.get(1))) {
            throw new BusinessException(40033, "池底为空，无法平分");
        }

        refreshTTL(roomId);

        return buildChipState(roomId);
    }

    public Map<String, Object> getChipState(String roomId) {
        return buildChipState(roomId);
    }

    public void deleteRoomChips(String roomId) {
        redisTemplate.delete(String.format(CHIPS_KEY, roomId));
        redisTemplate.delete(String.format(POT_KEY, roomId));
        redisTemplate.delete(String.format(BETS_KEY, roomId));
    }

    public int getPot(String roomId) {
        String potKey = String.format(POT_KEY, roomId);
        Object potRaw = redisTemplate.opsForValue().get(potKey);
        return potRaw != null ? Integer.parseInt(potRaw.toString()) : 0;
    }

    public Map<String, Integer> getPlayerChips(String roomId) {
        String chipsKey = String.format(CHIPS_KEY, roomId);
        Map<Object, Object> entries = redisTemplate.opsForHash().entries(chipsKey);
        Map<String, Integer> chips = new HashMap<>();
        entries.forEach((k, v) -> chips.put(k.toString(), Integer.parseInt(v.toString())));
        return chips;
    }

    private Map<String, Object> buildChipState(String roomId) {
        String chipsKey = String.format(CHIPS_KEY, roomId);
        String potKey = String.format(POT_KEY, roomId);
        String betsKey = String.format(BETS_KEY, roomId);

        Map<Object, Object> chipsRaw = redisTemplate.opsForHash().entries(chipsKey);
        Object potRaw = redisTemplate.opsForValue().get(potKey);
        Map<Object, Object> betsRaw = redisTemplate.opsForHash().entries(betsKey);

        Map<String, Integer> chips = new HashMap<>();
        chipsRaw.forEach((k, v) -> chips.put(k.toString(), Integer.parseInt(v.toString())));

        int pot = potRaw != null ? Integer.parseInt(potRaw.toString()) : 0;

        Map<String, Integer> bets = new HashMap<>();
        betsRaw.forEach((k, v) -> bets.put(k.toString(), Integer.parseInt(v.toString())));

        Map<String, Object> state = new HashMap<>();
        state.put("chips", chips);
        state.put("pot", pot);
        state.put("bets", bets);
        return state;
    }

    private void refreshTTL(String roomId) {
        redisTemplate.expire(String.format(CHIPS_KEY, roomId), TTL_HOURS, TimeUnit.HOURS);
        redisTemplate.expire(String.format(POT_KEY, roomId), TTL_HOURS, TimeUnit.HOURS);
        redisTemplate.expire(String.format(BETS_KEY, roomId), TTL_HOURS, TimeUnit.HOURS);
    }
}
