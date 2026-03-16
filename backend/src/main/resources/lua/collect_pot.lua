-- collect_pot.lua
-- KEYS[1] = room:{roomId}:chips
-- KEYS[2] = room:{roomId}:pot
-- KEYS[3] = room:{roomId}:bets
-- ARGV[1] = userId

local chipsKey = KEYS[1]
local potKey = KEYS[2]
local betsKey = KEYS[3]
local userId = ARGV[1]

-- 检查池底是否为 0
local currentPot = tonumber(redis.call('GET', potKey) or '0')
if currentPot == 0 then
    return {'-1', 'POT_EMPTY'}
end

-- 池底全部加到玩家筹码
local currentChips = tonumber(redis.call('HGET', chipsKey, userId) or '0')
local newChips = currentChips + currentPot
redis.call('HSET', chipsKey, userId, tostring(newChips))

-- 池底归零
redis.call('SET', potKey, '0')

-- 清空下注明细
redis.call('DEL', betsKey)

return {tostring(newChips), '0'}
