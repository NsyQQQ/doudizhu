/**
 * 游戏控制器 - 6人斗地主（3副牌）
 */

import { _decorator, Component } from 'cc';
import { Card } from '../core/Card';
import { Hand } from '../core/Hand';
import { Move } from '../core/Move';
import { GameRules } from '../core/GameRules';
import { GameRules2 } from '../core/GameRules2';
import { CardPatternRecognizer } from '../core/CardPattern';
import { EventBus, GameEvents } from '../shared/EventBus';
import { GameState } from '../shared/Constants';
import { WebSocketManager, WsMessageType } from '../shared/WebSocketManager';
import { ROOM_PLAYER_COUNTS, CURRENT_ROOM_TYPE } from '../shared/Constants';

const { ccclass, property } = _decorator;

@ccclass('GameController2')
export class GameController2 extends Component {
    private state: string = GameState.READY;
    private players: { id: number, hand: Hand, isLandlord: boolean, isHiddenLandlord: boolean, isHuman: boolean, avatar: string }[] = [];
    private landlordCards: Card[] = [];
    private landlordId: number = 0;
    private hiddenLandlordIds: number[] = [];
    private landlordCardId: number = -1;  // 地主牌ID
    private lastMove: Move | null = null;
    private currentPlayerId: number = 0;
    private isMyTurn: boolean = false;
    private playerCount: number = 6; // 6人场默认6个玩家

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
        // 根据房间类型获取玩家数量
        this.playerCount = ROOM_PLAYER_COUNTS[CURRENT_ROOM_TYPE] || 6;

        this.initPlayers();
        this.setupEventListeners();
        this.setupWebSocketListeners();

        // 通知服务器客户端已准备好，请求当前游戏状态
        this.ws.send(WsMessageType.GAME_READY);
    }

    private initPlayers(): void {
        this.players = [];
        for (let i = 0; i < this.playerCount; i++) {
            this.players.push({
                id: i,
                hand: new Hand(),
                isLandlord: false,
                isHiddenLandlord: false,
                isHuman: i === 0, // 自己始终是位置0
                avatar: ''
            });
        }
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
            console.log(`[GameController2 onLandlordSelectedHandler] landlordId=${data.landlordId}, hiddenIds=${JSON.stringify(data.hiddenLandlordIds)}, landlordCardId=${data.landlordCardId}`);
            this.landlordId = data.landlordId;
            this.hiddenLandlordIds = data.hiddenLandlordIds || [];
            this.landlordCardId = data.landlordCardId !== undefined ? data.landlordCardId : -1;
            console.log(`[GameController2 onLandlordSelectedHandler] after setting: landlordCardId=${this.landlordCardId}`);
            // 设置明地主
            if (this.players[this.landlordId]) {
                this.players[this.landlordId].isLandlord = true;
            }
            // 设置暗地主
            for (const hid of this.hiddenLandlordIds) {
                if (this.players[hid]) {
                    this.players[hid].isHiddenLandlord = true;
                }
            }
            EventBus.emit(GameEvents.LANDLORD_SELECTED, { playerId: data.landlordId, hiddenLandlordIds: this.hiddenLandlordIds, landlordCardId: this.landlordCardId });
            console.log(`[GameController2] emit LANDLORD_SELECTED: landlordId=${data.landlordId}, hiddenIds=${JSON.stringify(this.hiddenLandlordIds)}`);
        };

        // 回合变化
        this.onTurnChangedHandler = (data: any) => {
            this.currentPlayerId = data.playerId;
            this.isMyTurn = (data.playerId === 0); // 自己始终是位置0
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
        // 如果已经有地主牌数据，检查是否是再来一局
        if (this.landlordCards.length > 0) {
            const sameLandlordCards = this.landlordCards.length === data.landlordCards?.length &&
                this.landlordCards.every((c, i) => c.id === data.landlordCards[i]?.id);
            if (sameLandlordCards) {
                console.log('[GameController2] handleGameDealt ignored: duplicate landlord cards');
                return;
            }
            console.log('[GameController2] handleGameDealt: new game detected, resetting state');
        }

        console.log('[GameController2] handleGameDealt called, hand:', data.hand?.length);

        // 重置所有游戏状态
        this.lastMove = null;
        this.state = GameState.DEALING;
        EventBus.emit(GameEvents.GAME_STARTED);

        // 保存地主牌
        this.landlordCards = data.landlordCards;
        this.landlordId = data.landlordId;
        this.hiddenLandlordIds = data.hiddenLandlordIds || [];

        // 清空手牌
        for (const player of this.players) {
            player.hand = new Hand([]);
            player.isLandlord = false;
        }

        this.emitDealtEvent(data);
    }

    private emitDealtEvent(data: any): void {
        const myHand = data.hand || [];
        const hands: Card[][] = Array.from({ length: this.playerCount }, () => []);
        hands[0] = [...myHand]; // 自己始终是位置0

        console.log('[GameController2] emitDealtEvent, myHand length:', myHand.length, 'landlordId:', this.landlordId, 'hiddenLandlordIds:', this.hiddenLandlordIds);
        EventBus.emit(GameEvents.GAME_DEALT, {
            hands,
            landlordCards: this.landlordCards,
            landlordId: this.landlordId,
            hiddenLandlordIds: this.hiddenLandlordIds,
        });

        this.state = GameState.LANDLORD_REVEAL;
    }

    /** UI 动画完成后调用 */
    public startPlaying(): void {
        if (this.state === GameState.LANDLORD_REVEAL) {
            this.state = GameState.PLAYING;
        }
    }

    private handleRemoteAction(data: any): void {
        const { playerId, cards, actionType, pattern } = data;

        if (actionType === 'pass') {
            EventBus.emit(GameEvents.PLAYER_PASSED, { playerId });
        } else if (cards && cards.length > 0) {
            // 优先使用服务端返回的pattern（6人场用GameRules2识别）
            const recognizedPattern = pattern || CardPatternRecognizer.recognize(cards);
            const move: Move = {
                playerId,
                cards: cards,
                pattern: recognizedPattern,
            };

            this.lastMove = move;
            console.log(`[handleRemoteAction] 玩家${playerId}出牌`);
        }
    }

    onPlayRequested(selectedCards: Card[]): void {
        if (this.state !== GameState.PLAYING) return;
        if (!this.isMyTurn) {
            console.warn('[GameController2] Not your turn');
            return;
        }

        const humanPlayerId = 0; // 自己始终是位置0
        const hand = this.players[humanPlayerId].hand;
        const validMoves = GameRules2.generateValidMoves(hand, this.lastMove, humanPlayerId);

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
            this.players[humanPlayerId].hand.removeCards(selectedCards);
            this.lastMove = matchedMove;

            const cardIds = selectedCards.map(c => c.id);
            this.ws.send(WsMessageType.GAME_ACTION, { cards: cardIds });

            EventBus.emit(GameEvents.CARDS_PLAYED, { playerId: humanPlayerId, cards: selectedCards });
        }
    }

    onPassRequested(): void {
        if (this.state !== GameState.PLAYING) return;
        if (!this.isMyTurn) {
            console.warn('[GameController2] Not your turn');
            return;
        }

        this.ws.send(WsMessageType.GAME_ACTION, { actionType: 'pass' });
        EventBus.emit(GameEvents.PLAYER_PASSED, { playerId: 0 });
    }

    getCurrentPlayerId(): number {
        return this.currentPlayerId;
    }

    getLandlordId(): number {
        return this.landlordId;
    }

    getLandlordCards(): Card[] {
        return this.landlordCards;
    }

    getPlayerHand(playerId: number): Hand {
        return this.players[playerId]?.hand || new Hand([]);
    }

    getLastMove(): Move | null {
        return this.lastMove;
    }

    getIsMyTurn(): boolean {
        return this.isMyTurn;
    }

    isPlayerTurn(playerId: number): boolean {
        return playerId === this.currentPlayerId;
    }

    isPlayerLandlord(playerId: number): boolean {
        return this.players[playerId]?.isLandlord || false;
    }

    getPlayerCount(): number {
        return this.playerCount;
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
