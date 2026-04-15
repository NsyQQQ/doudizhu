/**
 * 游戏控制器 - 远程模式（接收服务器指令）
 */

import { _decorator, Component } from 'cc';
import { Card } from '../core/Card';
import { Hand } from '../core/Hand';
import { Move } from '../core/Move';
import { GameRules } from '../core/GameRules';
import { CardPatternRecognizer } from '../core/CardPattern';
import { EventBus, GameEvents } from '../shared/EventBus';
import { GameState, PLAYER_ID } from '../shared/Constants';
import { WebSocketManager, WsMessageType } from '../shared/WebSocketManager';

const { ccclass, property } = _decorator;

@ccclass('GameController')
export class GameController extends Component {
    private state: string = GameState.READY;
    private players: { id: number, hand: Hand, isLandlord: boolean, isHuman: boolean, avatar: string }[] = [];
    private landlordCards: Card[] = [];
    private landlordId: number = 0;
    private lastMove: Move | null = null;
    private currentPlayerId: number = PLAYER_ID.HUMAN;
    private isMyTurn: boolean = false;

    private ws: WebSocketManager = WebSocketManager.getInstance();

    // Bound callbacks
    private onGameDealtHandler: (data: any) => void = () => {};
    private onLandlordSelectedHandler: (data: any) => void = () => {};
    private onTurnChangedHandler: (data: any) => void = () => {};
    private onRemoteActionHandler: (data: any) => void = () => {};
    private onRoundClearedHandler: () => void = () => {};
    private onGameOverHandler: (data: any) => void = () => {};
    private onPlayRequestedHandler: () => void = () => {};
    private onPassRequestedHandler: () => void = () => {};

    start() {
        this.initPlayers();
        this.setupEventListeners();
        this.setupWebSocketListeners();

        // 通知服务器客户端已准备好，请求当前游戏状态（可能需要重发发牌数据）
        this.ws.send(WsMessageType.GAME_READY);
    }

    private initPlayers(): void {
        this.players = [
            { id: 0, hand: new Hand(), isLandlord: false, isHuman: true, avatar: '' },
            { id: 1, hand: new Hand(), isLandlord: false, isHuman: false, avatar: '' },
            { id: 2, hand: new Hand(), isLandlord: false, isHuman: false, avatar: '' },
        ];
    }

    private setupEventListeners(): void {
        this.onPlayRequestedHandler = this.onPlayRequested.bind(this);
        this.onPassRequestedHandler = this.onPassRequested.bind(this);
        EventBus.on(GameEvents.PLAY_REQUESTED, this.onPlayRequestedHandler);
        EventBus.on(GameEvents.PASS_REQUESTED, this.onPassRequestedHandler);
    }

    private setupWebSocketListeners(): void {
        // 发牌
        this.onGameDealtHandler = (data: any) => {
            this.handleGameDealt(data);
        };

        // 地主确定
        this.onLandlordSelectedHandler = (data: any) => {
            this.landlordId = data.landlordId;
            this.players[data.landlordId].isLandlord = true;
            EventBus.emit(GameEvents.LANDLORD_SELECTED, { playerId: data.landlordId });
        };

        // 回合变化
        this.onTurnChangedHandler = (data: any) => {
            this.currentPlayerId = data.playerId;
            this.isMyTurn = (data.playerId === PLAYER_ID.HUMAN);
            EventBus.emit(GameEvents.TURN_CHANGED, { playerId: data.playerId });
        };

        // 其他玩家动作
        this.onRemoteActionHandler = (data: any) => {
            this.handleRemoteAction(data);
        };

        // 回合清除
        this.onRoundClearedHandler = () => {
            this.lastMove = null;
            EventBus.emit(GameEvents.ROUND_CLEARED);
        };

        // 游戏结束
        this.onGameOverHandler = (data: any) => {
            this.state = GameState.GAME_OVER;
            EventBus.emit(GameEvents.GAME_OVER, data);
        };

        this.ws.on(WsMessageType.GAME_DEALT, this.onGameDealtHandler);
        this.ws.on(WsMessageType.GAME_LANDLORD_SELECTED, this.onLandlordSelectedHandler);
        this.ws.on(WsMessageType.GAME_TURN, this.onTurnChangedHandler);
        this.ws.on(WsMessageType.GAME_ACTION, this.onRemoteActionHandler);
        this.ws.on(WsMessageType.GAME_ROUND_CLEARED, this.onRoundClearedHandler);
        this.ws.on(WsMessageType.GAME_OVER, this.onGameOverHandler);
    }

    private handleGameDealt(data: any): void {
        // 如果已经有地主牌数据，检查是否是再来一局（地主牌不同了）
        if (this.landlordCards.length > 0) {
            // 比较地主牌是否相同
            const sameLandlordCards = this.landlordCards.length === data.landlordCards?.length &&
                this.landlordCards.every((c, i) => c.id === data.landlordCards[i]?.id);
            if (sameLandlordCards) {
                return;
            }
            // 地主牌不同，说明是再来一局，需要重置所有状态
        }

        // 重置所有游戏状态
        this.lastMove = null;
        this.state = GameState.DEALING;
        EventBus.emit(GameEvents.GAME_STARTED);

        // 保存地主牌
        this.landlordCards = data.landlordCards;
        this.landlordId = data.landlordId;

        // 清空手牌
        for (const player of this.players) {
            player.hand = new Hand([]);
            player.isLandlord = false;
        }

        this.emitDealtEvent(data);
    }

    private emitDealtEvent(data: any): void {
        // 服务器现在发送的是玩家自己的手牌 (hand)
        const myHand = data.hand || [];
        const hands: Card[][] = [[], [], []];
        hands[PLAYER_ID.HUMAN] = [...myHand];

        EventBus.emit(GameEvents.GAME_DEALT, {
            hands,
            landlordCards: this.landlordCards,
            landlordId: this.landlordId,
        });

        this.state = GameState.LANDLORD_REVEAL;
    }

    /** UI 动画完成后调用，远程模式下只需更新状态 */
    public startPlaying(): void {
        if (this.state === GameState.LANDLORD_REVEAL) {
            this.state = GameState.PLAYING;
        }
    }

    private handleRemoteAction(data: any): void {
        const { playerId, cards, actionType } = data;

        if (actionType === 'pass') {
            // 玩家跳过 - 不修改 lastMove，保持为上一个有效的出牌
            EventBus.emit(GameEvents.PLAYER_PASSED, { playerId });
        } else if (cards && cards.length > 0) {
            // 玩家出牌 - 识别牌型
            const pattern = CardPatternRecognizer.recognize(cards);
            const move: Move = {
                playerId,
                cards: cards,
                pattern: pattern,
            };

            // 始终更新 lastMove 为出牌者的出牌
            // 这样下一个玩家才能知道需要跟什么牌
            this.lastMove = move;
            // 注意：CARDS_PLAYED 由 GameTableCtrl.onWsCardsPlayed 统一处理，避免重复
        }
    }

    onPlayRequested(selectedCards: Card[]): void {
        if (this.state !== GameState.PLAYING) return;
        if (!this.isMyTurn) {
            console.warn('[GameController] Not your turn');
            return;
        }

        // 本地验证
        const hand = this.players[PLAYER_ID.HUMAN].hand;
        const validMoves = GameRules.generateValidMoves(hand, this.lastMove, PLAYER_ID.HUMAN);

        const selectedRankCounts = new Map<number, number>();
        for (const card of selectedCards) {
            selectedRankCounts.set(card.rank, (selectedRankCounts.get(card.rank) || 0) + 1);
        }

        const matchedMove = validMoves.find(m => {
            if (m.cards.length !== selectedCards.length) return false;

            const moveRankCounts = new Map<number, number>();
            for (const card of m.cards) {
                moveRankCounts.set(card.rank, (moveRankCounts.get(card.rank) || 0) + 1);
            }

            if (moveRankCounts.size !== selectedRankCounts.size) return false;

            for (const [rank, count] of selectedRankCounts) {
                if (moveRankCounts.get(rank) !== count) return false;
            }

            return true;
        });

        if (matchedMove) {
            // 从手牌移除
            this.players[PLAYER_ID.HUMAN].hand.removeCards(selectedCards);
            this.lastMove = matchedMove;

            // 发送出牌到服务器
            const cardIds = selectedCards.map(c => c.id);
            this.ws.send(WsMessageType.GAME_ACTION, { cards: cardIds });

            // 本地触发事件
            EventBus.emit(GameEvents.CARDS_PLAYED, { playerId: PLAYER_ID.HUMAN, cards: selectedCards });
        }
    }

    onPassRequested(): void {
        if (this.state !== GameState.PLAYING) return;
        if (!this.isMyTurn) {
            console.warn('[GameController] Not your turn');
            return;
        }

        // 发送跳过到服务器
        this.ws.send(WsMessageType.GAME_ACTION, { actionType: 'pass' });

        // 本地触发事件
        EventBus.emit(GameEvents.PLAYER_PASSED, { playerId: PLAYER_ID.HUMAN });
    }

    /** 获取当前玩家ID */
    getCurrentPlayerId(): number {
        return this.currentPlayerId;
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
    getPlayerHand(playerId: number): Hand {
        return this.players[playerId]?.hand || new Hand([]);
    }

    /** 获取最后出牌 */
    getLastMove(): Move | null {
        return this.lastMove;
    }

    /** 获取是否是自己的回合 */
    getIsMyTurn(): boolean {
        return this.isMyTurn;
    }

    /** 是否是自己的回合 */
    isPlayerTurn(playerId: number): boolean {
        return playerId === this.currentPlayerId;
    }

    /** 获取玩家是否是地主 */
    isPlayerLandlord(playerId: number): boolean {
        return this.players[playerId]?.isLandlord || false;
    }

    onDestroy(): void {
        EventBus.off(GameEvents.PLAY_REQUESTED, this.onPlayRequestedHandler);
        EventBus.off(GameEvents.PASS_REQUESTED, this.onPassRequestedHandler);

        this.ws.off(WsMessageType.GAME_DEALT, this.onGameDealtHandler);
        this.ws.off(WsMessageType.GAME_LANDLORD_SELECTED, this.onLandlordSelectedHandler);
        this.ws.off(WsMessageType.GAME_TURN, this.onTurnChangedHandler);
        this.ws.off(WsMessageType.GAME_ACTION, this.onRemoteActionHandler);
        this.ws.off(WsMessageType.GAME_ROUND_CLEARED, this.onRoundClearedHandler);
        this.ws.off(WsMessageType.GAME_OVER, this.onGameOverHandler);
    }
}
