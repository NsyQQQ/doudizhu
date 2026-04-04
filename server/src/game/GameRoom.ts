/**
 * 游戏房间 - 服务端游戏状态管理
 */

import { Card, GamePlayer, GameStatus, GameOverResult, Move, CardPatternType } from './types';
import { createDeck, shuffle, deal } from './Deck';
import { GameRules, Hand } from './GameRules';
import { EventEmitter } from 'events';

const PLAYER_COUNT = 3;
const CARDS_PER_PLAYER = 17;
const LANDLORD_CARDS = 3;

/** AI 玩家名字列表 */
const AI_NAMES = ['小智', '小红', '小刚', '小明', '小华', '小杰', '小丽', '小强', '小芳', '小军', '小雨', '小燕', '小涛', '小梅', '小兵', '小燕'];

/** AI 玩家头像 */
const AI_AVATAR = 'test';

export type GameRoomEventType =
    | 'player_ready'
    | 'player_unready'
    | 'game_start'
    | 'game_dealt'
    | 'landlord_selected'
    | 'turn_changed'
    | 'cards_played'
    | 'player_passed'
    | 'round_cleared'
    | 'game_over'
    | 'player_disconnected';

export interface GameRoomEvents {
    player_ready: (playerId: number) => void;
    player_unready: (playerId: number) => void;
    game_start: () => void;
    game_dealt: (data: { hands: Card[][], landlordCards: Card[], landlordId: number }) => void;
    landlord_selected: (landlordId: number) => void;
    turn_changed: (playerId: number) => void;
    cards_played: (data: { playerId: number, cards: Card[] }) => void;
    player_passed: (playerId: number) => void;
    round_cleared: () => void;
    game_over: (result: GameOverResult) => void;
    player_disconnected: (playerId: number) => void;
}

export class GameRoom extends EventEmitter {
    public readonly roomCode: string;
    public readonly roomId: number;
    private players: (GamePlayer | null)[] = [null, null, null];
    private status: GameStatus = 'waiting';
    private landlordId: number = -1;
    private landlordCards: Card[] = [];
    private hands: Hand[] = [new Hand(), new Hand(), new Hand()];
    private currentPlayerId: number = 0;
    private lastMove: Move | null = null;
    private roundStartPlayerId: number = 0;
    private passedPlayers: Set<number> = new Set(); // 记录本轮跳过过的玩家
    private aiTimers: NodeJS.Timeout[] = [];
    private quickMatchMode: boolean = false; // 快速匹配模式，不运行AI
    private scheduledPlayerId: number = -1; // 记录当前调度的AI玩家ID（位置索引）
    private waitingForClientReady: boolean = false; // 等待客户端动画播放完成
    private turnNotified: boolean = false; // 是否已经发送过 turn_changed（防止重复发送）
    private firstMoveDone: boolean = false; // 是否已完成首轮出牌（用于调整AI延迟）

    constructor(roomCode: string, roomId: number) {
        super();
        this.roomCode = roomCode;
        this.roomId = roomId;
    }

    /** 设置快速匹配模式 */
    setQuickMatchMode(enabled: boolean): void {
        this.quickMatchMode = enabled;
    }

    /** 添加玩家到房间 */
    addPlayer(player: Omit<GamePlayer, 'hand' | 'isLandlord'>): number | null {
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
    removePlayer(playerId: number): void {
        const index = this.players.findIndex(p => p && p.id === playerId);
        if (index !== -1) {
            this.players[index] = null;
            this.emit('player_disconnected', index);
        }
    }

    /** 添加AI玩家 */
    addAI(targetPosition: number = -1, nickname: string = 'AI'): { success: boolean, position?: number, error?: string } {
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
        // 如果没有提供昵称，随机生成一个（确保不重复）
        if (!nickname || nickname === 'AI') {
            // 获取当前已使用的AI名字
            const usedNames = this.players
                .filter(p => p && p.isAI && p.nickname)
                .map(p => p!.nickname);
            // 从未使用的名字中随机选择
            const availableNames = AI_NAMES.filter(n => !usedNames.includes(n));
            if (availableNames.length > 0) {
                nickname = availableNames[Math.floor(Math.random() * availableNames.length)];
            } else {
                nickname = `AI${position}`;
            }
        }
        const aiAvatar = AI_AVATAR;
        const aiPlayer: GamePlayer = {
            id: aiId,
            openid: `ai_${aiId}`,
            nickname: nickname,
            avatar: aiAvatar,
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
    removeAI(position: number): { success: boolean, error?: string } {
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
    getPlayerIndex(playerId: number): number {
        return this.players.findIndex(p => p && p.id === playerId);
    }

    /** 玩家准备 */
    setPlayerReady(playerId: number, ready: boolean): void {
        const index = this.getPlayerIndex(playerId);
        if (index !== -1 && this.players[index]) {
            this.players[index]!.isReady = ready;
            this.emit(ready ? 'player_ready' : 'player_unready', index);
        }
    }

    /** 检查是否所有人都准备好了 */
    allPlayersReady(): boolean {
        return this.players.every(p => p !== null && p.isReady);
    }

    /** 检查是否有空位 */
    hasEmptySlot(): boolean {
        return this.players.some(p => p === null);
    }

    /** 获取真实玩家数量 */
    getPlayerCount(): number {
        return this.players.filter(p => p !== null).length;
    }

    /** 玩家是否都在场 */
    allPlayersPresent(): boolean {
        return this.players.every(p => p !== null);
    }

    /** 开始游戏 */
    startGame(): boolean {
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
        this.turnNotified = false; // 重置回合通知标志
        this.firstMoveDone = false; // 重置首轮标志
        this.emit('game_start');
        this.dealCards();
        return true;
    }

    /** 重开游戏（游戏结束后再来一局） */
    restartGame(): boolean {
        // 只允许在游戏结束后重开
        if (this.status !== 'ended' && this.status !== 'playing') {
            console.log(`[restartGame] Cannot restart, status=${this.status}`);
            return false;
        }

        console.log(`[restartGame] Restarting game, current status=${this.status}`);

        // 重置游戏状态
        this.status = 'dealing';
        this.turnNotified = false;
        this.firstMoveDone = false;
        this.lastMove = null;
        this.passedPlayers.clear();
        this.currentPlayerId = this.landlordId; // 从地主开始

        // 重置玩家手牌为新的空Hand实例
        this.hands = [new Hand(), new Hand(), new Hand()];

        // 重新发牌
        this.dealCards();

        // 广播发牌数据给所有客户端
        this.emit('game_dealt', {
            hands: this.hands.map(h => h.cards),
            landlordCards: this.landlordCards,
            landlordId: this.landlordId
        });

        // 广播地主选择结果
        this.emit('landlord_selected', this.landlordId);

        // 广播回合开始（从地主开始）
        this.emit('turn_changed', this.currentPlayerId);

        console.log(`[restartGame] Game restarted, landlordId=${this.landlordId}, currentPlayerId=${this.currentPlayerId}`);
        return true;
    }

    /** 发牌 */
    private dealCards(): void {
        const deck = shuffle(createDeck());
        const hands = deal(deck, [CARDS_PER_PLAYER, CARDS_PER_PLAYER, CARDS_PER_PLAYER]);

        // 随机确定地主
        this.landlordId = Math.floor(Math.random() * PLAYER_COUNT);
        this.landlordCards = hands[PLAYER_COUNT];

        // 设置玩家手牌
        for (let i = 0; i < PLAYER_COUNT; i++) {
            this.hands[i] = new Hand(hands[i]);
            this.players[i]!.hand = hands[i];
            this.players[i]!.isLandlord = (i === this.landlordId);
        }

        // 地主获得地主牌
        this.hands[this.landlordId].addCards(this.landlordCards);
        // 同步更新 players 中的手牌数据
        this.players[this.landlordId]!.hand = this.hands[this.landlordId].cards;

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
        } else {
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
    playCards(playerId: number, cardIds: number[]): { success: boolean, error?: string } {
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
        const cards: Card[] = [];
        for (const id of cardIds) {
            const card = this.hands[playerIndex].cards.find(c => c.id === id);
            if (card) cards.push(card);
        }

                if (cards.length !== cardIds.length) {
            return { success: false, error: 'Some cards not found in hand' };
        }

        // 识别牌型
        const pattern = GameRules.recognizePattern(cards);

        // 创建出牌动作
        const move: Move = {
            cards,
            pattern,
            playerId: playerIndex
        };

        // 验证是否能压过上一手
        if (this.lastMove && this.lastMove.playerId !== playerIndex) {
            if (!GameRules.canBeat(move, this.lastMove)) {
                return { success: false, error: 'Cannot beat last move' };
            }
        }

        // 执行出牌
        this.hands[playerIndex].removeCards(cards);
        this.lastMove = move;
        this.players[playerIndex]!.hand = this.hands[playerIndex].cards;
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
            const result: GameOverResult = { winnerId: playerIndex, isLandlordWin };
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
        } else {
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
    pass(playerId: number): { success: boolean, error?: string } {
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
        } else {
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
    private checkRoundClear(): boolean {
        // 只有出过牌之后才能判定一轮结束
        if (!this.lastMove) return false;

        // 王炸（火箭）直接结束这一轮
        if (this.lastMove.pattern.type === CardPatternType.ROCKET) {
            return true;
        }

        const result = this.passedPlayers.size >= PLAYER_COUNT - 1;
        return result;
    }

    /** 获取下一个有玩家的位置 */
    private getNextNonEmptyPlayer(from: number): number {
        let idx = (from + 1) % PLAYER_COUNT;
        let attempts = 0;
        while (!this.players[idx] && attempts < PLAYER_COUNT) {
            idx = (idx + 1) % PLAYER_COUNT;
            attempts++;
        }
        return idx;
    }

    /** 调度 AI 出牌 */
    private scheduleAIMove(): void {
        // 清除之前的定时器
        this.clearAITimers();

        // 计算延迟：如果AI是地主且是首轮出牌，使用更长延迟（给客户端播放发牌动画的时间）
        // 后续回合无论是否地主都用 1.5-2 秒
        let delay = 500;
        if (this.players[this.currentPlayerId]?.isAI) {
            const isLandlord = this.currentPlayerId === this.landlordId;
            if (isLandlord && !this.firstMoveDone) {
                delay = 5000 + Math.random() * 1500; // 首轮地主：4-5秒
            } else {
                delay = 1500 + Math.random() * 500; // 后续：1.5-2秒
            }
        }

        // 如果是 AI，延迟后自动出牌
        if (this.players[this.currentPlayerId]?.isAI) {
            this.scheduledPlayerId = this.currentPlayerId;
            const timer = setTimeout(() => {
                this.executeAIMove();
            }, delay);
            this.aiTimers.push(timer);
            console.log(`[AI调度] 延迟${delay}ms后出牌, landlordId=${this.landlordId}, currentPlayerId=${this.currentPlayerId}, firstMoveDone=${this.firstMoveDone}`);
        } else {
            this.scheduledPlayerId = -1;
        }
    }

    /** AI 自动出牌 */
    private executeAIMove(): void {
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

        // 首轮出牌后标记
        if (!this.firstMoveDone) {
            this.firstMoveDone = true;
            console.log(`[首轮完成] firstMoveDone设为true`);
        }

        const hand = this.hands[this.currentPlayerId];
        const validMoves = GameRules.generateValidMoves(hand, this.lastMove, this.currentPlayerId);

        if (validMoves.length === 0) {
            // 无法出牌，尝试跳过
            const passResult = this.pass(this.players[this.currentPlayerId]!.id);
            if (!passResult.success) {
                // 跳过失败，强制出一张牌（如果手牌为空则跳过）
                const cards = hand.cards;
                if (cards.length > 0) {
                    // 按rank排序，选最小的牌出
                    const sortedCards = [...cards].sort((a, b) => a.rank - b.rank);
                    this.playCards(this.players[this.currentPlayerId]!.id, [sortedCards[0].id]);
                }
            }
        } else {
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
                this.playCards(this.players[this.currentPlayerId]!.id, cardIds);
            } catch (e) {
                // silently ignore play exception
            }
        }
    }

    /** 清除所有 AI 定时器 */
    clearAITimers(): void {
        for (const timer of this.aiTimers) {
            clearTimeout(timer);
        }
        this.aiTimers = [];
        this.scheduledPlayerId = -1;
    }

    /** 获取当前玩家ID（位置索引） */
    getCurrentPlayerId(): number {
        return this.currentPlayerId;
    }

    /** 获取玩家信息 */
    getPlayers(): (GamePlayer | null)[] {
        return this.players.map(p => p ? { ...p } : null);
    }

    /** 获取状态 */
    getStatus(): GameStatus {
        return this.status;
    }

    /** 获取地主ID */
    getLandlordId(): number {
        return this.landlordId;
    }

    /** 获取地主牌 */
    getLandlordCards(): Card[] {
        return this.landlordCards;
    }

    /** 获取玩家手牌 */
    getPlayerHand(playerIndex: number): Card[] {
        return this.hands[playerIndex]?.cards || [];
    }

    /** 获取上一手出牌 */
    getLastMove(): Move | null {
        return this.lastMove;
    }

    /** 获取所有玩家手牌（用于广播，不包含具体卡牌ID顺序） */
    getAllHandsForBroadcast(): Card[][] {
        // 不广播具体卡牌，只广播数量和是否地主
        return [];
    }

    /** 客户端动画播放完成，等待开始出牌 */
    clientReady(): void {
        console.log(`[clientReady] called, waitingForClientReady=${this.waitingForClientReady}, currentPlayerId=${this.currentPlayerId}, landlordId=${this.landlordId}, status=${this.status}, quickMatchMode=${this.quickMatchMode}, turnNotified=${this.turnNotified}`);
        if (!this.waitingForClientReady) {
            console.log(`[clientReady] early return: waitingForClientReady is false`);
            return;
        }
        if (this.turnNotified) {
            console.log(`[clientReady] early return: turnNotified is true, skipping`);
            return;
        }
        this.waitingForClientReady = false;
        this.status = 'playing';
        this.turnNotified = true;
        console.log(`[TURN] Player${this.currentPlayerId}'s turn (client ready)`);
        this.emit('turn_changed', this.currentPlayerId);
        this.scheduleAIMove();
    }

    /** 销毁房间 */
    destroy(): void {
        this.clearAITimers();
        this.removeAllListeners();
    }
}
