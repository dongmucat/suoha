-- place_bet.lua
-- KEYS[1] = room:{roomId}:chips
-- KEYS[2] = room:{roomId}:pot
-- KEYS[3] = room:{roomId}:bets
-- ARGV[1] = userId
-- ARGV[2] = amount (positive integer)

local chipsKey = KEYS[1]
local potKey = KEYS[2]
local betsKey = KEYS[3]
local userId = ARGV[1]
local amount = tonumber(ARGV[2])

-- 扣减玩家筹码（允许负数）
local currentChips = tonumber(redis.call('HGET', chipsKey, userId) or '0')
local newChips = currentChips - amount
redis.call('HSET', chipsKey, userId, tostring(newChips))

-- 增加池底
local currentPot = tonumber(redis.call('GET', potKey) or '0')
local newPot = currentPot + amount
redis.call('SET', potKey, tostring(newPot))

-- 记录下注明细（累加）
local currentBet = tonumber(redis.call('HGET', betsKey, userId) or '0')
redis.call('HSET', betsKey, userId, tostring(currentBet + amount))

return {tostring(newChips), tostring(newPot), tostring(currentBet + amount)}
