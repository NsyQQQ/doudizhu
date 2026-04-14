/**
 * 游戏桌控制器 - 6人斗地主版本
 * 在GameTableCtrl基础上增加3位玩家位置，删除地主牌
 */

import { _decorator, Component, Node, Label, Prefab, instantiate, Button, Vec3 } from 'cc';
import { director } from 'cc';
import { GameController2 } from '../game/GameController2';
import { HandView } from '../ui/HandView';
import { PlayedCardsView } from '../ui/PlayedCardsView';
import { ActionButtons } from '../ui/ActionButtons';
import { CardView } from '../ui/CardView';
import { PlayerInfoView } from '../ui/PlayerInfoView';
import { DealCardsAnimator } from '../ui/animations/DealCardsAnimator';
import { CardFlipAnimator } from '../ui/animations/CardFlipAnimator';
import { EventBus, GameEvents } from '../shared/EventBus';
import { WebSocketManager, WsMessageType } from '../shared/WebSocketManager';
import { CURRENT_ROOM_ID, QUICK_MATCH_DEALT, clearQuickMatchDealt, CURRENT_ROOM_PLAYERS, CURRENT_PLAYER_INDEX, CURRENT_USER_NAME, CURRENT_USER_AVATAR, setCurrentRoomPlayers, ROOM_PLAYER_COUNTS, ROOM_CARDS_PER_PLAYER, CURRENT_ROOM_TYPE } from '../shared/Constants';
import { RoomManager } from '../shared/RoomManager';
import { Card, CardSuit, CardRank, PatternResult, decodeCardId } from '../core/Card';
import { Hand } from '../core/Hand';
import { AudioManager } from '../shared/AudioManager';

const { ccclass, property } = _decorator;

@ccclass('GameTableCtrl2')
export class GameTableCtrl2 extends Component {
    @property(Prefab)
    cardPrefab: Prefab = null!;

    @property(Node)
    landlordCardArea: Node = null!;  // 显示地主牌的区域（屏幕中间）

    @property(CardFlipAnimator)
    cardFlipAnimator: CardFlipAnimator = null!;  // 翻牌动画

    @property(Label)
    gameStatusLabel: Label = null!;

    @property(Label)
    PlayerStatusLabel: Label = null!;

    @property(Label)
    resultLabel: Label = null!;

    @property(Label)
    bombCountLabel: Label = null!;

    @property(HandView)
    handView: HandView = null!;

    @property(PlayedCardsView)
    playedCardsView: PlayedCardsView = null!;

    @property(ActionButtons)
    actionButtons: ActionButtons = null!;

    // 6个玩家位置
    @property(PlayerInfoView)
    bottomPlayerInfo: PlayerInfoView = null!;  // 位置0（自己）

    @property(PlayerInfoView)
    leftPlayerInfo: PlayerInfoView = null!;   // 位置1

    @property(PlayerInfoView)
    topLeftPlayerInfo: PlayerInfoView = null!; // 位置2

    @property(PlayerInfoView)
    topPlayerInfo: PlayerInfoView = null!;    // 位置3

    @property(PlayerInfoView)
    topRightPlayerInfo: PlayerInfoView = null!; // 位置4

    @property(PlayerInfoView)
    rightPlayerInfo: PlayerInfoView = null!;  // 位置5

    @property(Node)
    gameOverNode: Node = null!;

    @property(Button)
    restartButton: Button = null!;

    @property(Button)
    exitButton: Button = null!;

    @property(Button)
    BackButton: Button = null!;

    private gameController: GameController2 = null!;
    private playerHand: Card[] = [];  // 保存玩家手牌
    private playerCardCounts: number[] = [];  // 所有玩家手牌数
    private playerCount: number = 6;
    private bombCount: number = 0;  // 炸弹数量
    private isSelectingLandlordCards: boolean = false;  // 是否在选择地主牌阶段
    private landlordSelectionDone: boolean = false;  // 地主是否已完成选牌（暗地主是否已确定）
    private landlordCardNode: Node | null = null;  // 地主牌节点
    private isFlippingLandlordCard: boolean = false;  // 是否正在翻转地主牌
    private storedLandlordCardSuit: number = -1;  // 地主牌花色（用于检测暗地主出牌）
    private storedLandlordCardRank: number = -1;  // 地主牌点数
    private storedHiddenLandlordIds: number[] = [];  // 暗地主ID列表

    // 存储绑定函数
    private boundOnGameStarted: () => void = null!;
    private boundOnGameDealt: (data: any) => void = null!;
    private boundOnLandlordSelected: (data: any) => void = null!;
    private boundOnTurnChanged: (data: any) => void = null!;
    private boundOnCardsPlayed: (data: any) => void = null!;
    private boundOnPlayerPassed: (data: any) => void = null!;
    private boundOnRoundCleared: () => void = null!;
    private boundOnGameOver: (data: any) => void = null!;
    private boundOnPlayRequested: (data: any) => void = null!;
    private boundOnPassRequested: () => void = null!;
    private boundOnSelectLandlordCards: (data: any) => void = null!;
    private _listenersInitialized: boolean = false;

    // WebSocket 消息处理函数
    private boundWsTurnChanged: (data: any) => void = null!;
    private boundWsCardsPlayed: (data: any) => void = null!;
    private boundWsPlayerPassed: (data: any) => void = null!;
    private boundWsRoundCleared: () => void = null!;
    private boundWsGameOver: (data: any) => void = null!;
    private boundWsQuickMatch: (data: any) => void = null!;
    private boundWsPlayerLeave: (data: any) => void = null!;

    start() {
        console.warn(`[GameTableCtrl2] start() called`);
        // 获取房间类型的玩家数量
        this.playerCount = ROOM_PLAYER_COUNTS[CURRENT_ROOM_TYPE] || 6;

        // 创建并存储绑定函数
        this.boundOnGameStarted = this.onGameStarted.bind(this);
        this.boundOnGameDealt = this.onGameDealt.bind(this);
        this.boundOnLandlordSelected = this.onLandlordSelected.bind(this);
        this.boundOnTurnChanged = this.onTurnChanged.bind(this);
        this.boundOnCardsPlayed = this.onCardsPlayed.bind(this);
        this.boundOnPlayerPassed = this.onPlayerPassed.bind(this);
        this.boundOnRoundCleared = this.onRoundCleared.bind(this);
        this.boundOnGameOver = this.onGameOver.bind(this);
        this.boundOnPlayRequested = this.onPlayRequested.bind(this);
        this.boundOnPassRequested = this.onPassRequested.bind(this);
        this.boundOnSelectLandlordCards = this.onSelectLandlordCards.bind(this);

        // 初始化 WebSocket 消息处理函数
        this.boundWsTurnChanged = this.onWsTurnChanged.bind(this);
        this.boundWsCardsPlayed = this.onWsCardsPlayed.bind(this);
        this.boundWsPlayerPassed = this.onWsPlayerPassed.bind(this);
        this.boundWsRoundCleared = this.onWsRoundCleared.bind(this);
        this.boundWsGameOver = this.onWsGameOver.bind(this);
        this.boundWsQuickMatch = this.onWsQuickMatch.bind(this);
        this.boundWsPlayerLeave = this.onWsPlayerLeave.bind(this);

        this.initGameController();
        this.initUI();
        this.setupEventListeners();
        this.setupWebSocketListeners();

        // 确保 QUICK_MATCH_DEALT 是有效对象
        const dealtData = QUICK_MATCH_DEALT;
        if (dealtData && dealtData.hand && Array.isArray(dealtData.hand) && dealtData.hand.length > 0) {
            clearQuickMatchDealt();
            // 转换为 onGameDealt 期望的格式
            const hands: Card[][] = Array.from({ length: this.playerCount }, () => []);
            hands[0] = [...dealtData.hand];
            const gameDealtData = {
                hands: hands,
                landlordCards: dealtData.landlordCards || [],
                landlordId: dealtData.landlordId ?? -1
            };
            this.onGameDealt(gameDealtData);
        } else {
            clearQuickMatchDealt();
            this.startGame();
        }
    }

    private initGameController(): void {
        let controllerNode = this.node.getChildByName('GameController2');
        if (!controllerNode) {
            controllerNode = new Node('GameController2');
            this.node.addChild(controllerNode);
        }
        this.gameController = controllerNode.getComponent(GameController2);
        if (!this.gameController) {
            this.gameController = controllerNode.addComponent(GameController2);
        }
    }

    private initUI(): void {
        if (this.handView && this.cardPrefab) {
            this.handView.cardPrefab = this.cardPrefab;
        }

        if (this.resultLabel) {
            this.resultLabel.node.active = false;
        }

        if (this.bombCountLabel) {
            this.bombCount = 0;
            this.bombCountLabel.string = '炸弹数量：0';
        }

        // 初始化所有Label为空文本
        if (this.gameStatusLabel) {
            this.gameStatusLabel.string = '';
        }
        if (this.PlayerStatusLabel) {
            this.PlayerStatusLabel.string = '';
        }

        if (this.gameOverNode) {
            this.gameOverNode.active = false;
        }

        const isHost = CURRENT_PLAYER_INDEX === 0;
        if (this.restartButton) {
            this.restartButton.node.active = isHost;
            if (isHost) {
                this.restartButton.node.on(Button.EventType.CLICK, this.onRestartClicked, this);
            }
        }
        if (this.exitButton) {
            this.exitButton.node.active = isHost;
            if (isHost) {
                this.exitButton.node.on(Button.EventType.CLICK, this.onExitClicked, this);
            }
        }
        if (this.BackButton) {
            this.BackButton.node.on(Button.EventType.CLICK, this.onBackClicked, this);
        }

        this.initPlayerInfo();
    }

    /** 初始化6个玩家信息 */
    private initPlayerInfo(landlordId?: number): void {
        const roomManager = RoomManager.getInstance();
        let players = CURRENT_ROOM_PLAYERS && CURRENT_ROOM_PLAYERS.length > 0
            ? CURRENT_ROOM_PLAYERS
            : roomManager.getRoomPlayers(CURRENT_ROOM_ID);

        // 获取所有PlayerInfoView
        const playerInfos = [
            this.bottomPlayerInfo,   // 位置0
            this.leftPlayerInfo,    // 位置1
            this.topLeftPlayerInfo, // 位置2
            this.topPlayerInfo,     // 位置3
            this.topRightPlayerInfo, // 位置4
            this.rightPlayerInfo    // 位置5
        ];

        // 解析地主ID
        let resolvedLandlordId = landlordId;
        if (resolvedLandlordId === undefined) {
            const landlordPlayer = players.find(p => p && p.isLandlord);
            resolvedLandlordId = landlordPlayer ? players.indexOf(landlordPlayer) : -1;
        }

        const myIndex = CURRENT_PLAYER_INDEX;
        console.log(`[initPlayerInfo6] myIndex=${myIndex}, players count=${players.length}, landlordId=${resolvedLandlordId}`);

        // 调整地主ID的显示位置（相对于当前玩家）
        const displayLandlordId = resolvedLandlordId >= 0
            ? (resolvedLandlordId - myIndex + this.playerCount) % this.playerCount
            : -1;

        // 设置所有玩家信息（旋转显示顺序，让当前玩家在下方）
        for (let i = 0; i < this.playerCount; i++) {
            const playerInfo = playerInfos[i];
            if (!playerInfo) continue;

            // 旋转：i=0是当前玩家，i=1是左边玩家，以此类推
            const rotatedIndex = (i + myIndex) % this.playerCount;
            const playerData = players[rotatedIndex];
            const isLandlord = i === displayLandlordId;
            const isMyPosition = i === 0;

            // 计算手牌数量（根据房间类型）
            const cardCount = ROOM_CARDS_PER_PLAYER[CURRENT_ROOM_TYPE] || 27;

            let name: string;
            if (isMyPosition) {
                name = playerData?.nickname || playerData?.name || CURRENT_USER_NAME || '你';
            } else {
                name = playerData?.nickname || playerData?.name || (playerData?.isAI ? `AI${i}` : `玩家${i}`);
            }

            const avatar = isMyPosition
                ? (playerData?.avatar || CURRENT_USER_AVATAR || '')
                : (playerData?.avatar || '');

            const fakePlayer = {
                id: i,
                name,
                avatar,
                hand: { count: cardCount } as any,
                isLandlord,
                isHuman: isMyPosition
            };

            playerInfo.setPlayer(fakePlayer as any);
            console.log(`[initPlayerInfo6] position ${i}: ${name}, landlord=${isLandlord}, cardCount=${cardCount}`);
        }
    }

    /** 根据玩家ID获取玩家名字 */
    private getPlayerName(playerId: number): string {
        const playerData = CURRENT_ROOM_PLAYERS[playerId];
        return playerData?.nickname || playerData?.name || `玩家${playerId}`;
    }

    /** 获取所有玩家名字数组 */
    private getPlayerNames(): string[] {
        const roomManager = RoomManager.getInstance();
        const players = CURRENT_ROOM_PLAYERS && CURRENT_ROOM_PLAYERS.length > 0
            ? CURRENT_ROOM_PLAYERS
            : roomManager.getRoomPlayers(CURRENT_ROOM_ID);
        const names: string[] = [];

        for (let i = 0; i < this.playerCount; i++) {
            const playerData = players[i];
            if (i === CURRENT_PLAYER_INDEX) {
                names.push('你');
            } else {
                names.push(playerData?.nickname || playerData?.name || (playerData?.isAI ? `AI${i}` : `玩家${i}`));
            }
        }
        return names;
    }

    private setupEventListeners(): void {
        if (this._listenersInitialized) {
            console.warn(`[GameTableCtrl2] setupEventListeners called again!`);
            return;
        }
        this._listenersInitialized = true;
        EventBus.on(GameEvents.GAME_STARTED, this.boundOnGameStarted);
        EventBus.on(GameEvents.GAME_DEALT, this.boundOnGameDealt);
        EventBus.on(GameEvents.LANDLORD_SELECTED, this.boundOnLandlordSelected);
        EventBus.on(GameEvents.CARDS_PLAYED, this.boundOnCardsPlayed);
        EventBus.on(GameEvents.PLAYER_PASSED, this.boundOnPlayerPassed);
        EventBus.on(GameEvents.ROUND_CLEARED, this.boundOnRoundCleared);
        EventBus.on(GameEvents.GAME_OVER, this.boundOnGameOver);
        EventBus.on(GameEvents.PLAY_REQUESTED, this.boundOnPlayRequested);
        EventBus.on(GameEvents.PASS_REQUESTED, this.boundOnPassRequested);
        EventBus.on(GameEvents.SELECT_LANDLORD_CARDS, this.boundOnSelectLandlordCards);
    }

    private setupWebSocketListeners(): void {
        const wsManager = WebSocketManager.getInstance();

        wsManager.on(WsMessageType.GAME_TURN, this.boundWsTurnChanged);
        wsManager.on(WsMessageType.GAME_ACTION, this.boundWsCardsPlayed);
        wsManager.on(WsMessageType.GAME_OVER, this.boundWsGameOver);
        wsManager.on(WsMessageType.ROOM_QUICK_MATCH, this.boundWsQuickMatch);
        wsManager.on(WsMessageType.ROOM_PLAYER_LEAVE, this.boundWsPlayerLeave);
    }

    private removeWebSocketListeners(): void {
        const wsManager = WebSocketManager.getInstance();

        wsManager.off(WsMessageType.GAME_TURN, this.boundWsTurnChanged);
        wsManager.off(WsMessageType.GAME_ACTION, this.boundWsCardsPlayed);
        wsManager.off(WsMessageType.GAME_OVER, this.boundWsGameOver);
        wsManager.off(WsMessageType.ROOM_QUICK_MATCH, this.boundWsQuickMatch);
        wsManager.off(WsMessageType.ROOM_PLAYER_LEAVE, this.boundWsPlayerLeave);
    }

    /** WebSocket 消息：回合变化 */
    private onWsTurnChanged(data: { playerId: number }): void {
        console.log(`[回合变化] ${this.getPlayerName(data.playerId)}的回合`);
        this.unscheduleAllCallbacks();
        this.onTurnChanged(data);
    }

    /** WebSocket 消息：出牌 */
    private async onWsCardsPlayed(data: { playerId: number; cards: Card[]; actionType: string }): Promise<void> {
        if (data.actionType === 'pass') {
            console.log(`[出牌] ${this.getPlayerName(data.playerId)}不出`);
            this.actionButtons?.updateButtonState();
        } else {
            const playerData = CURRENT_ROOM_PLAYERS[data.playerId];
            const playerName = playerData?.nickname || playerData?.name || `玩家${data.playerId}`;
            // 确保 cards 是完整的卡牌对象（而非纯ID），供 PlayerInfoView 的 checkRevealHiddenLandlord 使用
            const resolvedCards: Card[] = (data.cards || []).map((c: any) => {
                if (typeof c === 'number') {
                    return decodeCardId(c);
                }
                return c as Card;
            });
            console.log(`[出牌] ${playerName}出牌: ${(resolvedCards).map(c => c.id).join(',')} (${resolvedCards.length}张)`);
            this.unscheduleAllCallbacks();
            this.playedCardsView?.clearAllAreas();

            // 更新其他玩家手牌数
            if (this.playerCardCounts.length > 0) {
                this.playerCardCounts[data.playerId] = Math.max(0, (this.playerCardCounts[data.playerId] || 0) - resolvedCards.length);
                EventBus.emit(GameEvents.CARD_DEALT, { playerId: data.playerId, count: this.playerCardCounts[data.playerId] });
            }

            EventBus.emit(GameEvents.CARDS_PLAYED, {
                playerId: data.playerId,
                cards: resolvedCards,
                pattern: (data as any).pattern,
                remainingCounts: (data as any).remainingCounts
            });

            // 检测炸弹
            console.log(`[炸弹检测] cards: ${JSON.stringify(resolvedCards?.slice(0, 3))}, pattern: ${(data as any).pattern}`);
            if (this.isBomb(resolvedCards)) {
                this.bombCount++;
                if (this.bombCountLabel) {
                    this.bombCountLabel.string = `炸弹数量：${this.bombCount}`;
                }
                console.log(`[炸弹] 本局炸弹数量: ${this.bombCount}, 牌型: ${(data as any).pattern}`);
            }

            // 检测农民出完牌，揭示农民身份
            const remainingCounts = (data as any).remainingCounts;
            if (remainingCounts) {
                for (const [pid, count] of Object.entries(remainingCounts)) {
                    if (count === 0) {
                        EventBus.emit(GameEvents.FARMER_REVEAL, { playerId: parseInt(pid as string) });
                    }
                }
            }

            // 检测暗地主出牌，揭示暗地主身份
            if (this.storedHiddenLandlordIds.length > 0 && this.storedLandlordCardSuit >= 0) {
                const playerId = data.playerId;
                if (this.storedHiddenLandlordIds.includes(playerId)) {
                    for (const card of resolvedCards) {
                        if (card.suit === this.storedLandlordCardSuit && card.rank === this.storedLandlordCardRank) {
                            EventBus.emit(GameEvents.HIDDEN_LANDLORD_REVEALED, { playerId });
                            console.log(`[暗地主揭示] 玩家${playerId}打出了地主牌`);
                            break;
                        }
                    }
                }
            }

            if (data.playerId === CURRENT_PLAYER_INDEX) {
                await this.onCardsPlayed({ playerId: data.playerId, cards: resolvedCards, pattern: (data as any).pattern, skipSFX: true });
                if (this.handView && this.actionButtons) {
                    this.actionButtons.setHand(this.handView.hand);
                }
            }
        }
    }

    /** WebSocket 消息：跳过 */
    private onWsPlayerPassed(data: { playerId: number }): void {
        console.log(`[跳过] ${this.getPlayerName(data.playerId)}`);
        this.onPlayerPassed(data);
    }

    /** WebSocket 消息：回合结束 */
    private onWsRoundCleared(): void {
        console.log(`[回合结束]`);
        this.onRoundCleared();
    }

    /** WebSocket 消息：游戏结束 */
    private onWsGameOver(data: { winnerId: number; isLandlordWin: boolean }): void {
        console.log(`[游戏结束] ${this.getPlayerName(data.winnerId)}胜利, isLandlordWin: ${data.isLandlordWin}`);
        this.onGameOver(data);
    }

    /** WebSocket 消息：快速匹配（再来一局） */
    private onWsQuickMatch(data: any): void {
        console.log(`[快速匹配] success: ${data.success}, hasDealt: ${!!data.dealt}`);
        if (data.success) {
            if (this.gameOverNode) this.gameOverNode.active = false;
            if (this.resultLabel) this.resultLabel.node.active = false;
            if (this.playedCardsView) this.playedCardsView.clearAllAreas();
            if (this.actionButtons) this.actionButtons.reset();

            this.playerHand = [];
            this.bombCount = 0;
            this.isSelectingLandlordCards = false;
            this.landlordSelectionDone = false;
            if (this.bombCountLabel) this.bombCountLabel.string = '炸弹数量：0';

            if (data.room?.players) {
                setCurrentRoomPlayers(data.room.players);
            }

            if (data.dealt) {
                console.log(`[快速匹配] 处理内嵌的dealt数据`);
                const hands: Card[][] = Array.from({ length: this.playerCount }, () => []);
                hands[0] = [...data.dealt.hand];
                this.onGameDealt({
                    hands: hands,
                    landlordCards: data.dealt.landlordCards,
                    landlordId: data.dealt.landlordId
                });
            }
        }
    }

    /** WebSocket 消息：玩家离开 */
    private onWsPlayerLeave(data: { playerIndex: number }): void {
        console.log(`[玩家离开] playerIndex=${data.playerIndex}`);
        if (data.playerIndex === 0) {
            director.loadScene('Lobby');
        }
    }

    private startGame(): void {
        if (this.gameStatusLabel) {
            this.gameStatusLabel.string = '发牌中...';
        }
        // 发牌开始前就显示地主牌背面
        this.showLandlordCardBack();
    }

    private onGameStarted(): void {
        console.log(`[游戏开始]`);
        if (this.gameStatusLabel) {
            this.gameStatusLabel.string = '发牌中...';
        }
        // 发牌开始前就显示地主牌背面
        this.showLandlordCardBack();
    }

    private onGameDealt(data: { hands: Card[][]; landlordCards: Card[]; landlordId: number; hiddenLandlordIds?: number[] }): void {
        console.log('[onGameDealt6] called, handView:', !!this.handView, 'hands[0]:', data.hands[0]?.length);

        // 如果还没有选完地主牌（hiddenIds为空），显示"发牌中..."
        const hiddenIds = data.hiddenLandlordIds || [];
        if (hiddenIds.length === 0 && this.gameStatusLabel) {
            this.gameStatusLabel.string = '发牌中...';
        }

        // 如果还没有显示过地主牌背面，先显示（发牌前就要显示）
        if (!this.landlordCardNode) {
            this.showLandlordCardBack();
        }

        if (!this.handView) {
            console.log('[onGameDealt6] early return: handView is null');
            return;
        }
        if (!data.hands[0]) {
            console.log('[onGameDealt6] early return: hands[0] is empty');
            return;
        }

        if (this.playerHand.length > 0 && data.hands[0].length === this.playerHand.length) {
            console.log('[onGameDealt6] ignored: duplicate hands');
            return;
        }

        this.playerHand = data.hands[0] || [];
        console.log(`[发牌6] 地主: ${data.landlordId}, 手牌: ${this.playerHand.length}张`);

        this.handView.setHand(new Hand([]));

        const animator = this.node.getComponent(DealCardsAnimator) as DealCardsAnimator | null;
        const cardsToDeal = this.playerHand;

        if (animator) {
            animator.playDealAnimation(cardsToDeal, 50, async () => {
                const sortedCards = [...cardsToDeal].sort((a, b) => b.rank - a.rank);
                this.handView.setHand(new Hand(sortedCards));

                this.initPlayerInfo(data.landlordId);

                this.onLandlordSelected({ playerId: data.landlordId, hiddenLandlordIds: data.hiddenLandlordIds || [] });

                // 初始化所有玩家手牌数
                const myHandCount = data.hands[0]?.length || 0;
                const defaultCount = ROOM_CARDS_PER_PLAYER[CURRENT_ROOM_TYPE] || 27;
                this.playerCardCounts = [];
                for (let i = 0; i < this.playerCount; i++) {
                    const count = i === 0 ? myHandCount : defaultCount;
                    this.playerCardCounts.push(count);
                    EventBus.emit(GameEvents.CARD_DEALT, { playerId: i, count });
                }

                // 发牌动画全部完成，允许显示操作按钮（必须在发送game/ready之前）
                this.actionButtons?.onDealingAnimationEnd();

                const wsManager = WebSocketManager.getInstance();
                wsManager.send(WsMessageType.GAME_READY);
            }, this.playerCount);
        } else {
            (async () => {
                const sortedCards = [...cardsToDeal].sort((a, b) => b.rank - a.rank);
                this.handView.setHand(new Hand(sortedCards));
                this.initPlayerInfo(data.landlordId);
                this.onLandlordSelected({ playerId: data.landlordId, hiddenLandlordIds: data.hiddenLandlordIds || [] });

                // 初始化所有玩家手牌数
                const myHandCount2 = data.hands[0]?.length || 0;
                const defaultCount2 = ROOM_CARDS_PER_PLAYER[CURRENT_ROOM_TYPE] || 27;
                this.playerCardCounts = [];
                for (let i = 0; i < this.playerCount; i++) {
                    const count = i === 0 ? myHandCount2 : defaultCount2;
                    this.playerCardCounts.push(count);
                    EventBus.emit(GameEvents.CARD_DEALT, { playerId: i, count });
                }

                // 发牌动画全部完成，允许显示操作按钮（必须在发送game/ready之前）
                this.actionButtons?.onDealingAnimationEnd();

                const wsManager = WebSocketManager.getInstance();
                wsManager.send(WsMessageType.GAME_READY);
            })();
        }
    }

    private async onLandlordSelected(data: { playerId: number; hiddenLandlordIds?: number[]; landlordCardId?: number; landlordCardSuit?: number; landlordCardRank?: number }): Promise<void> {
        console.log(`[地主] ${this.getPlayerName(data.playerId)}, 暗地主: ${JSON.stringify(data.hiddenLandlordIds)}, landlordCardId: ${data.landlordCardId}`);
        const playerNames = this.getPlayerNames();
        const hiddenIds = data.hiddenLandlordIds || [];

        // 如果 hiddenIds 为空，说明还在选择地主牌阶段
        if (hiddenIds.length === 0) {
            console.log(`[地主] 暗地主尚未确定，等待选择地主牌`);
            this.landlordSelectionDone = false;
            // 显示地主牌背面
            this.showLandlordCardBack();
            if (this.gameStatusLabel) {
                if (data.playerId === CURRENT_PLAYER_INDEX) {
                    this.gameStatusLabel.string = '请选择一张地主牌';
                } else {
                    this.gameStatusLabel.string = `${this.getPlayerName(data.playerId)}正在选择地主牌`;
                }
            }
            // 如果是明地主自己，设置选择地主牌的UI
            if (data.playerId === CURRENT_PLAYER_INDEX) {
                if (this.bottomPlayerInfo) {
                    this.bottomPlayerInfo.onLandlordSelected(data);
                }
                if (this.actionButtons && this.handView) {
                    this.isSelectingLandlordCards = true;
                    this.actionButtons.setMyTurn(true);
                    this.actionButtons.setHand(this.handView.hand);
                    this.actionButtons.setSelectingLandlordCards(true);
                    console.log(`[选择地主牌] UI已设置`);
                }
            }
            return;
        }

        // 暗地主已确定
        this.landlordSelectionDone = true;
        // 存储地主牌信息（供 onWsCardsPlayed 检测暗地主出牌时使用）
        this.storedHiddenLandlordIds = hiddenIds.map(id => Number(id));
        if (data.landlordCardSuit !== undefined && data.landlordCardRank !== undefined) {
            this.storedLandlordCardSuit = data.landlordCardSuit;
            this.storedLandlordCardRank = data.landlordCardRank;
        } else if (data.landlordCardId > 0) {
            const idx = data.landlordCardId % 1000;
            if (idx >= 52) {
                this.storedLandlordCardSuit = 4;
                this.storedLandlordCardRank = idx === 52 ? 16 : 17;
            } else {
                this.storedLandlordCardSuit = Math.floor(idx / 13) % 4;
                this.storedLandlordCardRank = (idx % 13) + 3;
            }
        }

        // 更新状态文本（AI已选完地主牌时，gameStatusLabel可能还是"发牌中..."）
        if (this.gameStatusLabel) {
            let statusText = `${this.getPlayerName(data.playerId)}是地主！`;
            this.gameStatusLabel.string = statusText;
        }

        // 翻转地主牌显示正面（仅当地主牌ID有效时）
        if (data.landlordCardId !== undefined && data.landlordCardId > 0) {
            await this.flipLandlordCardToFront(data.landlordCardId);
        }

        // 暗地主确定后，重置选择地主牌状态，切换到正常出牌模式
        this.isSelectingLandlordCards = false;
        if (this.actionButtons) {
            this.actionButtons.setSelectingLandlordCards(false);
            // 如果轮到自己，设置isMyTurn
            if (data.playerId === CURRENT_PLAYER_INDEX) {
                this.actionButtons.setMyTurn(true);
            }
        }
    }

    /** 显示地主牌背面（选择阶段） */
    private showLandlordCardBack(): void {
        if (!this.landlordCardArea || !this.cardPrefab) {
            console.log(`[showLandlordCardBack] landlordCardArea 或 cardPrefab 未设置`);
            return;
        }

        // 清空旧地主牌
        for (const child of this.landlordCardArea.children) {
            child.destroy();
        }

        // 创建地主牌节点
        const cardNode = instantiate(this.cardPrefab);
        cardNode.setParent(this.landlordCardArea);
        cardNode.setPosition(0, 0, 0);
        this.landlordCardNode = cardNode;

        // 设置为背面
        const cardView = cardNode.getComponent(CardView);
        if (cardView) {
            cardView.setBack();
        }

        this.landlordCardArea.active = true;
        console.log(`[显示地主牌背面]`);
    }

    /** 翻转地主牌显示正面 */
    private async flipLandlordCardToFront(cardId: number): Promise<void> {
        if (!this.landlordCardNode) {
            console.log(`[flipLandlordCardToFront] landlordCardNode 为空`);
            // 翻转失败，直接处理暂存的回合
            this.isFlippingLandlordCard = false;
            if (this._pendingTurnData) {
                console.log(`[flipLandlordCardToFront] 处理暂存回合: ${this.getPlayerName(this._pendingTurnData.playerId)}`);
                const pendingData = this._pendingTurnData;
                this._pendingTurnData = null;
                this.onTurnChanged(pendingData);
            }
            return;
        }

        this.isFlippingLandlordCard = true;

        // 解码卡牌ID (与服务器编码一致)
        const indexWithinDeck = cardId % 1000;
        let suit: number;
        let rank: number;

        if (indexWithinDeck >= 52) {
            suit = CardSuit.JOKER;
            rank = indexWithinDeck === 52 ? CardRank.SMALL_JOKER : CardRank.BIG_JOKER;
        } else {
            suit = Math.floor(indexWithinDeck / 13) % 4;
            rank = (indexWithinDeck % 13) + 3;
        }

        const card: Card = { id: cardId, suit, rank };

        // 使用翻转动画
        if (this.cardFlipAnimator) {
            await this.cardFlipAnimator.flipAnimation(this.landlordCardNode, card);
        } else {
            // 如果没有翻转动画，直接显示正面
            const cardView = this.landlordCardNode.getComponent(CardView);
            if (cardView) {
                cardView.setCard(card);
            }
        }

        this.isFlippingLandlordCard = false;
        console.log(`[翻转地主牌] cardId=${cardId}, suit=${suit}, rank=${rank}`);

        // 翻转完成后，处理暂存的回合变化
        if (this._pendingTurnData) {
            console.log(`[翻转完成] 处理暂存的回合变化: ${this.getPlayerName(this._pendingTurnData.playerId)}`);
            const pendingData = this._pendingTurnData;
            this._pendingTurnData = null;
            this.onTurnChanged(pendingData);
        }
    }

    private _pendingTurnData: { playerId: number } | null = null;  // 存储待处理的回合变化

    private onTurnChanged(data: { playerId: number }): void {
        // 如果正在翻转地主牌，先暂存回合变化，等翻转完成后再处理
        if (this.isFlippingLandlordCard) {
            console.log(`[回合变化] 正在翻转地主牌，暂存回合变化: ${this.getPlayerName(data.playerId)}`);
            this._pendingTurnData = data;
            return;
        }

        console.log(`[回合变化] 本地处理: ${this.getPlayerName(data.playerId)}`);
        const gameControllerLastMove = this.gameController?.getLastMove();
        console.log(`[onTurnChanged] hand: ${this.handView?.hand?.cards.length || 0}, lastMove: ${gameControllerLastMove ? 'yes' : 'no'}`);
        const playerNames = this.getPlayerNames();

        // 判断是否在选择地主牌阶段（明地主的回合且还未确定暗地主）
        const isCurrentPlayerLandlord = data.playerId === CURRENT_PLAYER_INDEX;

        if (isCurrentPlayerLandlord && this.playerHand.length > 0 && !this.landlordSelectionDone) {
            // 检查是否是选择地主牌阶段（手牌数量等于该房间类型的数量）
            const cardsPerPlayer = ROOM_CARDS_PER_PLAYER[CURRENT_ROOM_TYPE] || 27;
            if (this.playerHand.length === cardsPerPlayer && !this.isSelectingLandlordCards) {
                // 首次轮到明地主，说明在选择地主牌阶段
                // 标记为自己的回合，让选择按钮显示出来
                this.actionButtons.setMyTurn(true);
                this.isSelectingLandlordCards = true;
                if (this.gameStatusLabel) {
                    this.gameStatusLabel.string = '请选择一张地主牌';
                }
                if (this.handView) {
                    this.handView.setInteractive(true);
                }
                if (this.actionButtons) {
                    this.actionButtons.setHand(this.handView.hand);
                    this.actionButtons.setSelectingLandlordCards(true);
                }
                console.log(`[选择地主牌] 进入选择地主牌阶段`);
                return;
            }
        }

        // 只有在玩家手牌已设置（大于0）时才重置选择地主牌标志
        // 否则说明还在发牌动画中，不需要重置
        if (this.playerHand.length > 0) {
            this.isSelectingLandlordCards = false;
        }

        if (this.PlayerStatusLabel) {
            if (data.playerId === CURRENT_PLAYER_INDEX) {
                this.PlayerStatusLabel.string = '请出牌';
            } else {
                this.PlayerStatusLabel.string = `${playerNames[data.playerId]}出牌`;
            }
        }

        if (this.actionButtons && this.handView) {
            this.actionButtons.setHand(this.handView.hand);
            this.actionButtons.setLastMove(this.gameController?.getLastMove() || null);
            this.actionButtons.setMyTurn(data.playerId === CURRENT_PLAYER_INDEX);
        }

        if (this.handView) {
            this.handView.setInteractive(data.playerId === CURRENT_PLAYER_INDEX);
        }
    }

    private async onCardsPlayed(data: { playerId: number; cards: Card[]; pattern?: PatternResult; skipSFX?: boolean }): Promise<void> {
        // 清空游戏状态标签
        if (this.gameStatusLabel) {
            this.gameStatusLabel.string = '';
        }

        // 更新自己手牌数
        if (data.playerId === CURRENT_PLAYER_INDEX && this.playerCardCounts.length > 0) {
            this.playerCardCounts[0] = Math.max(0, (this.playerCardCounts[0] || 0) - data.cards.length);
            EventBus.emit(GameEvents.CARD_DEALT, { playerId: 0, count: this.playerCardCounts[0] });
        }

        // 播放出牌音效
        if (!data.skipSFX) {
            AudioManager.getInstance().playCardSFX(data.pattern?.type, data.cards);
        }

        console.log(`[出牌动画] ${this.getPlayerName(data.playerId)}出牌动画`);
        if (data.playerId === CURRENT_PLAYER_INDEX && this.handView) {
            const targetPos = this.playedCardsView?.node.position.clone() || new Vec3(0, 0, 0);
            await this.handView.playCardsAndRemove(data.cards, targetPos);
            this.handView.clearSelection();
        }

        if (this.actionButtons) {
            this.actionButtons.clearSelection();
        }
    }

    private _lastPassSFXTime: number = 0;

    private onPlayerPassed(data: { playerId: number }): void {
        console.log(`[跳过] 本地处理: ${this.getPlayerName(data.playerId)}`);
        const playerNames = this.getPlayerNames();
        if (this.PlayerStatusLabel) {
            this.PlayerStatusLabel.string = `${playerNames[data.playerId]}不出`;
        }
        // 防重：500ms内的重复调用忽略（应对多实例同时触发）
        const now = Date.now();
        if (now - this._lastPassSFXTime < 500) return;
        this._lastPassSFXTime = now;
        const guoSounds = ['Woman_buyao1', 'Woman_buyao2', 'Woman_buyao3', 'Woman_buyao4'];
        const randomGuo = guoSounds[Math.floor(Math.random() * guoSounds.length)];
        AudioManager.getInstance().playSFX(`audio/Fight/${randomGuo}`);
    }

    private onRoundCleared(): void {
        console.log(`[回合结束]`);
        if (this.gameStatusLabel) {
            this.gameStatusLabel.string = '新一轮';
        }
        this.unscheduleAllCallbacks();
        if (this.playedCardsView) {
            this.scheduleOnce(() => {
                this.playedCardsView?.clearAllAreas();
            }, 1.5);
        }
    }

    private onPlayRequested(cards: Card[]): void {
        console.log(`[发送] 出牌: ${cards.map(c => c.id).join(',')} (${cards.length}张)`);
        const currentPlayerId = this.gameController?.getCurrentPlayerId();
        if (currentPlayerId !== CURRENT_PLAYER_INDEX) {
            return;
        }

        const wsManager = WebSocketManager.getInstance();

        // 如果是选择地主牌阶段，发送特殊消息
        if (this.isSelectingLandlordCards && cards.length === 1) {
            console.log(`[发送] 选择地主牌: cardId=${cards[0].id}`);
            wsManager.send(WsMessageType.GAME_LANDLORD_CARDS_SELECTED, { cardId: cards[0].id });
            this.isSelectingLandlordCards = false;
            return;
        }

        wsManager.send(WsMessageType.GAME_ACTION, { cards: cards.map(c => c.id) });
    }

    private onPassRequested(): void {
        console.log(`[发送] 跳过`);
        const wsManager = WebSocketManager.getInstance();
        wsManager.send(WsMessageType.GAME_PASS);
    }

    private onSelectLandlordCards(data: { card: Card }): void {
        console.log(`[发送] 选择地主牌: cardId=${data.card.id}`);
        const wsManager = WebSocketManager.getInstance();
        wsManager.send(WsMessageType.GAME_LANDLORD_CARDS_SELECTED, { cardId: data.card.id });
        this.isSelectingLandlordCards = false;
    }

    private onGameOver(data: { winnerId: number; isLandlordWin: boolean; winnerNames?: string[]; loserNames?: string[] }): void {
        const playerNames = this.getPlayerNames();

        // 构建胜利/失败字符串
        const winnerText = data.winnerNames ? data.winnerNames.join('、') + '胜利！' : `${playerNames[data.winnerId]}胜利！`;
        const loserText = data.loserNames ? data.loserNames.join('、') + '失败！' : '';

        if (this.resultLabel) {
            this.resultLabel.string = winnerText + '\n' + loserText;
            this.resultLabel.node.active = true;
        }

        if (this.gameStatusLabel) {
            this.gameStatusLabel.string = '游戏结束';
        }

        if (this.handView) {
            this.handView.setInteractive(false);
        }

        if (this.gameOverNode) {
            this.gameOverNode.active = true;
        }

        EventBus.emit(GameEvents.GAME_OVER);
    }

    private onRestartClicked(): void {
        if (this.gameOverNode) this.gameOverNode.active = false;
        if (this.resultLabel) this.resultLabel.node.active = false;
        if (this.playedCardsView) this.playedCardsView.clearAllAreas();
        if (this.actionButtons) this.actionButtons.reset();
        this.playerHand = [];
        this.bombCount = 0;
        this.playerCardCounts = [];
        if (this.bombCountLabel) this.bombCountLabel.string = '炸弹数量：0';
        const wsManager = WebSocketManager.getInstance();
        wsManager.send(WsMessageType.ROOM_QUICK_MATCH, {
            roomType: CURRENT_ROOM_TYPE,
        });
    }

    private onExitClicked(): void {
        const wsManager = WebSocketManager.getInstance();
        wsManager.send(WsMessageType.ROOM_LEAVE);
        director.loadScene('Lobby');
    }

    private onBackClicked(): void {
        const wsManager = WebSocketManager.getInstance();
        wsManager.send(WsMessageType.ROOM_LEAVE);
        director.loadScene('Lobby');
    }

    /** 从Card或card ID获取rank（6人场card ID格式：deckIndex*1000 + rank） */
    private getCardRank(card: Card | number): number {
        if (typeof card === 'number') {
            // card ID in 6-player mode: deckIndex * 1000 + rank
            return (card as number) % 1000;
        }
        return card.rank;
    }

    /** 检测是否为炸弹或火箭（根据牌型数值判断） */
    private isBomb(cards: Card[] | number[]): boolean {
        // 如果没有牌型数据，根据牌面判断
        if (!cards || cards.length === 0) return false;

        // 计算同点数的牌数量
        const rankCount: Map<number, number> = new Map();
        for (const card of cards) {
            const rank = this.getCardRank(card as any);
            const count = rankCount.get(rank) || 0;
            rankCount.set(rank, count + 1);
        }

        // 检查是否有4张及以上同点数的牌（普通炸弹）
        for (const count of rankCount.values()) {
            if (count >= 4) return true;
        }

        // 检查多王火箭（6人场可能有多个王）
        const jokerCount = (rankCount.get(17) || 0) + (rankCount.get(16) || 0);
        if (jokerCount >= 2) return true;

        return false;
    }

    onDestroy(): void {
        EventBus.off(GameEvents.GAME_STARTED, this.boundOnGameStarted);
        EventBus.off(GameEvents.GAME_DEALT, this.boundOnGameDealt);
        EventBus.off(GameEvents.LANDLORD_SELECTED, this.boundOnLandlordSelected);
        EventBus.off(GameEvents.CARDS_PLAYED, this.boundOnCardsPlayed);
        EventBus.off(GameEvents.PLAYER_PASSED, this.boundOnPlayerPassed);
        EventBus.off(GameEvents.ROUND_CLEARED, this.boundOnRoundCleared);
        EventBus.off(GameEvents.GAME_OVER, this.boundOnGameOver);
        EventBus.off(GameEvents.PLAY_REQUESTED, this.boundOnPlayRequested);
        EventBus.off(GameEvents.PASS_REQUESTED, this.boundOnPassRequested);
        EventBus.off(GameEvents.SELECT_LANDLORD_CARDS, this.boundOnSelectLandlordCards);

        this.removeWebSocketListeners();
    }
}
