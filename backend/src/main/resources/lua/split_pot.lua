-- split_pot.lua
-- KEYS[1] = room:{roomId}:chips
-- KEYS[2] = room:{roomId}:pot
-- KEYS[3] = room:{roomId}:bets
-- ARGV[1] = participant count
-- ARGV[2..N] = participant userIds

local chipsKey = KEYS[1]
local potKey = KEYS[2]
local betsKey = KEYS[3]
local participantCount = tonumber(ARGV[1])

-- 检查池底是否为 0
local currentPot = tonumber(redis.call('GET', potKey) or '0')
if currentPot == 0 then
    return {'-1', 'POT_EMPTY'}
end

-- 计算每人分得金额和余数
local share = math.floor(currentPot / participantCount)
local remainder = currentPot - (share * participantCount)

-- 分配给每个参与者
for i = 2, participantCount + 1 do
    local pid = ARGV[i]
    local currentChips = tonumber(redis.call('HGET', chipsKey, pid) or '0')
    redis.call('HSET', chipsKey, pid, tostring(currentChips + share))
end

-- 余数保留在池底
redis.call('SET', potKey, tostring(remainder))

-- 清空下注明细
redis.call('DEL', betsKey)

return {tostring(share), tostring(remainder)}
