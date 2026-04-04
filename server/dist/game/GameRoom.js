"use strict";
/**
 * 游戏房间 - 服务端游戏状态管理
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRoom = void 0;
const types_1 = require("./types");
const Deck_1 = require("./Deck");
const GameRules_1 = require("./GameRules");
const events_1 = require("events");
const PLAYER_COUNT = 3;
const CARDS_PER_PLAYER = 17;
const LANDLORD_CARDS = 3;
class GameRoom extends events_1.EventEmitter {
    constructor(roomCode, roomId) {
        super();
        this.players = [null, null, null];
        this.status = 'waiting';
        this.landlordId = -1;
        this.landlordCards = [];
        this.hands = [new GameRules_1.Hand(), new GameRules_1.Hand(), new GameRules_1.Hand()];
        this.currentPlayerId = 0;
        this.lastMove = null;
        this.roundStartPlayerId = 0;
        this.passedPlayers = new Set(); // 记录本轮跳过过的玩家
        this.aiTimers = [];
        this.quickMatchMode = false; // 快速匹配模式，不运行AI
        this.scheduledPlayerId = -1; // 记录当前调度的AI玩家ID（位置索引）
        this.waitingForClientReady = false; // 等待客户端动画播放完成
        this.roomCode = roomCode;
        this.roomId = roomId;
    }
    /** 设置快速匹配模式 */
    setQuickMatchMode(enabled) {
        this.quickMatchMode = enabled;
    }
    /** 添加玩家到房间 */
    addPlayer(player) {
        for (let i = 0; i < PLAYER_COUNT; i++) {
            if (!this.players[i]) {
                this.players[i] = {
                    ...player,
                    hand: [],
                    isLandlord: false
                };
                return i;
            }
        }
        return null;
    }
    /** 移除玩家 */
    removePlayer(playerId) {
        const index = this.players.findIndex(p => p && p.id === playerId);
        if (index !== -1) {
            this.players[index] = null;
            this.emit('player_disconnected', index);
        }
    }
    /** 添加AI玩家 */
    addAI(targetPosition = -1, nickname = 'AI') {
        let position = targetPosition;
        const maxPlayers = this.players.length;
        // 如果没有指定位置，找第一个空位
        if (position < 0 || position >= maxPlayers) {
            position = this.players.findIndex(p => p === null);
        }
        // 检查位置是否有效
        if (position < 0 || position >= maxPlayers || this.players[position] !== null) {
            return { success: false, error: '没有空位' };
        }
        // 检查房间状态
        if (this.status !== 'waiting') {
            return { success: false, error: '游戏已经开始，无法添加AI' };
        }
        // 生成唯一的AI ID（使用负数 + 位置，避免时间戳冲突）
        const aiId = -(1000000 + position + Math.floor(Math.random() * 1000));
        // 添加AI
        const aiPlayer = {
            id: aiId,
            openid: `ai_${aiId}`,
            nickname: nickname,
            avatar: '',
            isReady: true, // AI默认准备
            isHost: false,
            isAI: true,
            hand: [],
            isLandlord: false
        };
        this.players[position] = aiPlayer;
        return { success: true, position };
    }
    /** 移除AI玩家 */
    removeAI(position) {
        // 检查位置是否有效
        if (position < 0 || position >= this.players.length) {
            return { success: false, error: '位置无效' };
        }
        const player = this.players[position];
        if (!player) {
            return { success: false, error: '该位置没有玩家' };
        }
        // 检查是否是AI
        if (!player.isAI) {
            return { success: false, error: '只能移除AI玩家' };
        }
        // 检查房间状态
        if (this.status !== 'waiting') {
            return { success: false, error: '游戏已经开始，无法移除AI' };
        }
        this.players[position] = null;
        return { success: true };
    }
    /** 获取玩家位置索引 */
    getPlayerIndex(playerId) {
        return this.players.findIndex(p => p && p.id === playerId);
    }
    /** 玩家准备 */
    setPlayerReady(playerId, ready) {
        const index = this.getPlayerIndex(playerId);
        if (index !== -1 && this.players[index]) {
            this.players[index].isReady = ready;
            this.emit(ready ? 'player_ready' : 'player_unready', index);
        }
    }
    /** 检查是否所有人都准备好了 */
    allPlayersReady() {
        return this.players.every(p => p !== null && p.isReady);
    }
    /** 检查是否有空位 */
    hasEmptySlot() {
        return this.players.some(p => p === null);
    }
    /** 获取真实玩家数量 */
    getPlayerCount() {
        return this.players.filter(p => p !== null).length;
    }
    /** 玩家是否都在场 */
    allPlayersPresent() {
        return this.players.every(p => p !== null);
    }
    /** 开始游戏 */
    startGame() {
        if (this.status !== 'waiting') {
            return false;
        }
        if (!this.allPlayersPresent()) {
            return false;
        }
        if (!this.allPlayersReady()) {
            return false;
        }
        this.status = 'dealing';
        this.emit('game_start');
        this.dealCards();
        return true;
    }
    /** 发牌 */
    dealCards() {
        const deck = (0, Deck_1.shuffle)((0, Deck_1.createDeck)());
        const hands = (0, Deck_1.deal)(deck, [CARDS_PER_PLAYER, CARDS_PER_PLAYER, CARDS_PER_PLAYER]);
        // 随机确定地主
        this.landlordId = Math.floor(Math.random() * PLAYER_COUNT);
        this.landlordCards = hands[PLAYER_COUNT];
        // 设置玩家手牌
        for (let i = 0; i < PLAYER_COUNT; i++) {
            this.hands[i] = new GameRules_1.Hand(hands[i]);
            this.players[i].hand = hands[i];
            this.players[i].isLandlord = (i === this.landlordId);
        }
        // 地主获得地主牌
        this.hands[this.landlordId].addCards(this.landlordCards);
        // 同步更新 players 中的手牌数据
        this.players[this.landlordId].hand = this.hands[this.landlordId].cards;
        // 打印所有玩家手牌
        for (let i = 0; i < PLAYER_COUNT; i++) {
            const cardIds = this.hands[i].cards.map(c => c.id);
            console.log(`[DEALT] Player${i}(${this.players[i]?.isLandlord ? '地主' : '农民'}) hand: ${cardIds.join(',')} (${this.hands[i].cards.length}张)`);
        }
        // 快速匹配模式下：发送数据后等待客户端动画完成
        // 客户端播放完发牌动画后发送 game/ready，服务器再开始回合
        if (this.quickMatchMode) {
            // 发送发牌数据
            this.emit('game_dealt', {
                hands: [this.hands[0].cards, this.hands[1].cards, this.hands[2].cards],
                landlordCards: this.landlordCards,
                landlordId: this.landlordId
            });
            this.emit('landlord_selected', this.landlordId);
            // 等待客户端准备就绪
            this.status = 'dealing';
            this.currentPlayerId = this.landlordId;
            this.roundStartPlayerId = this.landlordId;
            this.waitingForClientReady = true;
        }
        else {
            this.emit('game_dealt', {
                hands: [this.hands[0].cards, this.hands[1].cards, this.hands[2].cards],
                landlordCards: this.landlordCards,
                landlordId: this.landlordId
            });
            this.emit('landlord_selected', this.landlordId);
            // 开始出牌阶段
            this.status = 'playing';
            this.currentPlayerId = this.landlordId;
            this.roundStartPlayerId = this.landlordId;
            console.log(`[TURN] Player${this.currentPlayerId}'s turn (game start, landlord)`);
            this.emit('turn_changed', this.currentPlayerId);
            // 如果是 AI，自动出牌
            this.scheduleAIMove();
        }
    }
    /** 玩家出牌 */
    playCards(playerId, cardIds) {
        const playerIndex = this.getPlayerIndex(playerId);
        if (playerIndex === -1) {
            return { success: false, error: 'Player not in room' };
        }
        if (this.currentPlayerId !== playerIndex) {
            return { success: false, error: 'Not your turn' };
        }
        if (this.status !== 'playing') {
            return { success: false, error: 'Game not in playing state' };
        }
        // 查找卡牌
        const cards = [];
        for (const id of cardIds) {
            const card = this.hands[playerIndex].cards.find(c => c.id === id);
            if (card)
                cards.push(card);
        }
        if (cards.length !== cardIds.length) {
            return { success: false, error: 'Some cards not found in hand' };
        }
        // 识别牌型
        const pattern = GameRules_1.GameRules.recognizePattern(cards);
        // 创建出牌动作
        const move = {
            cards,
            pattern,
            playerId: playerIndex
        };
        // 验证是否能压过上一手
        if (this.lastMove && this.lastMove.playerId !== playerIndex) {
            if (!GameRules_1.GameRules.canBeat(move, this.lastMove)) {
                return { success: false, error: 'Cannot beat last move' };
            }
        }
        // 执行出牌
        this.hands[playerIndex].removeCards(cards);
        this.lastMove = move;
        this.players[playerIndex].hand = this.hands[playerIndex].cards;
        this.passedPlayers.clear(); // 重置跳过记录，出牌后重新开始计算
        // 打印出牌信息
        const playedCardIds = cards.map(c => c.id);
        console.log(`[PLAY] Player${playerIndex} played: ${playedCardIds.join(',')} (${cards.length}张) ${pattern.type}, remaining: ${this.hands[playerIndex].cards.length}张`);
        // 打印所有玩家剩余手牌
        for (let i = 0; i < PLAYER_COUNT; i++) {
            const remaining = this.hands[i].cards.map(c => c.id);
            console.log(`[HAND] Player${i}: ${remaining.join(',')} (${this.hands[i].cards.length}张)`);
        }
        this.emit('cards_played', {
            playerId: playerIndex,
            cards,
            remainingCounts: [this.hands[0].cards.length, this.hands[1].cards.length, this.hands[2].cards.length]
        });
        // 检查游戏结束
        console.log(`[GAME_OVER CHECK] Player${playerIndex} hand empty: ${this.hands[playerIndex].isEmpty}, remaining: ${this.hands[playerIndex].cards.length}`);
        if (this.hands[playerIndex].isEmpty) {
            console.log(`[GAME_OVER] Player${playerIndex} wins!`);
            this.status = 'ended';
            const isLandlordWin = playerIndex === this.landlordId;
            const result = { winnerId: playerIndex, isLandlordWin };
            this.emit('game_over', result);
            return { success: true };
        }
        // 检查是否一轮结束
        if (this.checkRoundClear()) {
            // 更新下一轮的起始玩家为最后出牌者
            this.roundStartPlayerId = this.lastMove ? this.lastMove.playerId : this.roundStartPlayerId;
            this.currentPlayerId = this.roundStartPlayerId; // 先更新currentPlayerId，再发送turn_changed
            this.lastMove = null;
            this.passedPlayers.clear(); // 重置跳过记录
            this.emit('round_cleared');
            // 一轮结束后，由最后出牌者继续出牌
            console.log(`[TURN] Player${this.roundStartPlayerId}'s turn (last played)`);
            this.emit('turn_changed', this.roundStartPlayerId);
        }
        else {
            // 下一回合
            this.currentPlayerId = (this.currentPlayerId + 1) % PLAYER_COUNT;
            console.log(`[TURN] Player${this.currentPlayerId}'s turn (next)`);
            this.emit('turn_changed', this.currentPlayerId);
        }
        // 如果是 AI，自动出牌
        this.scheduleAIMove();
        return { success: true };
    }
    /** 玩家跳过 */
    pass(playerId) {
        const playerIndex = this.getPlayerIndex(playerId);
        if (playerIndex === -1) {
            return { success: false, error: 'Player not in room' };
        }
        if (this.currentPlayerId !== playerIndex) {
            return { success: false, error: 'Not your turn' };
        }
        if (this.status !== 'playing') {
            return { success: false, error: 'Game not in playing state' };
        }
        // 如果是第一手且没有上家出过牌，不能跳过（但 firstMove 模式下可以跳过）
        // 只有在上一手是该玩家自己出的时候才不能跳过
        if (this.lastMove && this.lastMove.playerId === playerIndex) {
            return { success: false, error: 'Cannot pass on first move' };
        }
        // 记录跳过
        this.passedPlayers.add(playerIndex);
        console.log(`[PASS] Player${playerIndex} passed`);
        this.emit('player_passed', playerIndex);
        // 检查一轮结束（所有非起始玩家都跳过）
        if (this.checkRoundClear()) {
            // 更新下一轮的起始玩家为最后出牌者
            this.roundStartPlayerId = this.lastMove ? this.lastMove.playerId : this.roundStartPlayerId;
            this.currentPlayerId = this.roundStartPlayerId; // 先更新currentPlayerId，再发送turn_changed
            this.lastMove = null;
            this.passedPlayers.clear(); // 重置跳过记录
            this.emit('round_cleared');
            // 一轮结束后，由最后出牌者继续出牌
            console.log(`[TURN] Player${this.roundStartPlayerId}'s turn (pass last played)`);
            this.emit('turn_changed', this.roundStartPlayerId);
        }
        else {
            // 下一回合
            this.currentPlayerId = (this.currentPlayerId + 1) % PLAYER_COUNT;
            console.log(`[TURN] Player${this.currentPlayerId}'s turn (pass next)`);
            this.emit('turn_changed', this.currentPlayerId);
        }
        // 如果是 AI，自动出牌
        this.scheduleAIMove();
        return { success: true };
    }
    /** 检查一轮是否结束 */
    checkRoundClear() {
        // 只有出过牌之后才能判定一轮结束
        if (!this.lastMove)
            return false;
        // 王炸（火箭）直接结束这一轮
        if (this.lastMove.pattern.type === types_1.CardPatternType.ROCKET) {
            return true;
        }
        const result = this.passedPlayers.size >= PLAYER_COUNT - 1;
        return result;
    }
    /** 获取下一个有玩家的位置 */
    getNextNonEmptyPlayer(from) {
        let idx = (from + 1) % PLAYER_COUNT;
        let attempts = 0;
        while (!this.players[idx] && attempts < PLAYER_COUNT) {
            idx = (idx + 1) % PLAYER_COUNT;
            attempts++;
        }
        return idx;
    }
    /** 调度 AI 出牌 */
    scheduleAIMove() {
        // 清除之前的定时器
        this.clearAITimers();
        // 快速匹配模式下延长延迟，让客户端有时间加载场景
        const baseDelay = this.quickMatchMode ? 1500 : 500;
        const randomDelay = this.quickMatchMode ? 500 : 500;
        const delay = baseDelay + Math.random() * randomDelay;
        // 如果是 AI，延迟后自动出牌
        if (this.players[this.currentPlayerId]?.isAI) {
            this.scheduledPlayerId = this.currentPlayerId;
            const timer = setTimeout(() => {
                this.executeAIMove();
            }, delay);
            this.aiTimers.push(timer);
        }
        else {
            this.scheduledPlayerId = -1;
        }
    }
    /** AI 自动出牌 */
    executeAIMove() {
        // 检查是否轮到被调度的AI玩家出牌（防止过期的setTimeout回调执行）
        const scheduledIdx = this.scheduledPlayerId;
        if (scheduledIdx !== this.currentPlayerId) {
            return;
        }
        if (this.status !== 'playing') {
            return;
        }
        if (!this.players[this.currentPlayerId]?.isAI) {
            return;
        }
        const hand = this.hands[this.currentPlayerId];
        const validMoves = GameRules_1.GameRules.generateValidMoves(hand, this.lastMove, this.currentPlayerId);
        if (validMoves.length === 0) {
            // 无法出牌，尝试跳过
            const passResult = this.pass(this.players[this.currentPlayerId].id);
            if (!passResult.success) {
                // 跳过失败，强制出一张牌（如果手牌为空则跳过）
                const cards = hand.cards;
                if (cards.length > 0) {
                    // 按rank排序，选最小的牌出
                    const sortedCards = [...cards].sort((a, b) => a.rank - b.rank);
                    this.playCards(this.players[this.currentPlayerId].id, [sortedCards[0].id]);
                }
            }
        }
        else {
            // 选择一个合法的出牌（选最小的能压过的牌）
            // 按 primaryValue 排序（从小到大）
            const sortedMoves = [...validMoves].sort((a, b) => {
                // 首先按牌型长度排序（少的优先）
                if (a.cards.length !== b.cards.length) {
                    return a.cards.length - b.cards.length;
                }
                // 然后按 primaryValue 排序
                return a.pattern.primaryValue - b.pattern.primaryValue;
            });
            const move = sortedMoves[0];
            const cardIds = move.cards.map(c => c.id);
            try {
                this.playCards(this.players[this.currentPlayerId].id, cardIds);
            }
            catch (e) {
                // silently ignore play exception
            }
        }
    }
    /** 清除所有 AI 定时器 */
    clearAITimers() {
        for (const timer of this.aiTimers) {
            clearTimeout(timer);
        }
        this.aiTimers = [];
        this.scheduledPlayerId = -1;
    }
    /** 获取当前玩家ID（位置索引） */
    getCurrentPlayerId() {
        return this.currentPlayerId;
    }
    /** 获取玩家信息 */
    getPlayers() {
        return this.players.map(p => p ? { ...p } : null);
    }
    /** 获取状态 */
    getStatus() {
        return this.status;
    }
    /** 获取地主ID */
    getLandlordId() {
        return this.landlordId;
    }
    /** 获取地主牌 */
    getLandlordCards() {
        return this.landlordCards;
    }
    /** 获取玩家手牌 */
    getPlayerHand(playerIndex) {
        return this.hands[playerIndex]?.cards || [];
    }
    /** 获取上一手出牌 */
    getLastMove() {
        return this.lastMove;
    }
    /** 获取所有玩家手牌（用于广播，不包含具体卡牌ID顺序） */
    getAllHandsForBroadcast() {
        // 不广播具体卡牌，只广播数量和是否地主
        return [];
    }
    /** 客户端动画播放完成，等待开始出牌 */
    clientReady() {
        if (!this.waitingForClientReady)
            return;
        this.waitingForClientReady = false;
        this.status = 'playing';
        console.log(`[TURN] Player${this.currentPlayerId}'s turn (client ready)`);
        this.emit('turn_changed', this.currentPlayerId);
        this.scheduleAIMove();
    }
    /** 销毁房间 */
    destroy() {
        this.clearAITimers();
        this.removeAllListeners();
    }
}
exports.GameRoom = GameRoom;
//# sourceMappingURL=GameRoom.js.map