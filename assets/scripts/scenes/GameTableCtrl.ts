/**
 * 游戏桌控制器 - 串联所有UI组件
 */

import { _decorator, Component, Node, Label, Prefab, instantiate, Button, Vec3 } from 'cc';
import { director } from 'cc';
import { GameController } from '../game/GameController';
import { HandView } from '../ui/HandView';
import { PlayedCardsView } from '../ui/PlayedCardsView';
import { ActionButtons } from '../ui/ActionButtons';
import { CardView } from '../ui/CardView';
import { PlayerInfoView } from '../ui/PlayerInfoView';
import { CardFlipAnimator } from '../ui/animations/CardFlipAnimator';
import { DealCardsAnimator } from '../ui/animations/DealCardsAnimator';
import { EventBus, GameEvents } from '../shared/EventBus';
import { WebSocketManager, WsMessageType } from '../shared/WebSocketManager';
import { CURRENT_ROOM_ID, QUICK_MATCH_DEALT, clearQuickMatchDealt, CURRENT_ROOM_PLAYERS, CURRENT_PLAYER_INDEX, CURRENT_USER_NAME, CURRENT_USER_AVATAR, setCurrentRoomPlayers, CURRENT_ROOM_TYPE } from '../shared/Constants';
import { RoomManager } from '../shared/RoomManager';
import { Card } from '../core/Card';
import { Hand } from '../core/Hand';
import { AudioManager } from '../shared/AudioManager';

const { ccclass, property } = _decorator;

@ccclass('GameTableCtrl')
export class GameTableCtrl extends Component {
    @property(Node)
    landlordCardsArea: Node = null!;

    @property(Prefab)
    cardPrefab: Prefab = null!;

    @property(Prefab)
    landlordCardPrefab: Prefab = null!;

    @property(Label)
    gameStatusLabel: Label = null!;

    @property(Label)
    resultLabel: Label = null!;

    @property(HandView)
    handView: HandView = null!;

    @property(PlayedCardsView)
    playedCardsView: PlayedCardsView = null!;

    @property(ActionButtons)
    actionButtons: ActionButtons = null!;

    @property(PlayerInfoView)
    BottomPlayerInfo: PlayerInfoView = null!;

    @property(PlayerInfoView)
    leftPlayerInfo: PlayerInfoView = null!;

    @property(PlayerInfoView)
    rightPlayerInfo: PlayerInfoView = null!;

    @property(Node)
    gameOverNode: Node = null!;

    @property(Button)
    restartButton: Button = null!;

    @property(Button)
    exitButton: Button = null!;

    @property(Button)
    BackButton: Button = null!;

    private gameController: GameController = null!;
    private landlordCards: Card[] = [];  // 保存地主牌
    private playerHand: Card[] = [];  // 保存玩家手牌
    private playerCardCounts: number[] = [];  // 所有玩家手牌数
    private isLoading: boolean = false;  // 防止重复加载场景

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

    // WebSocket 消息处理函数
    private boundWsTurnChanged: (data: any) => void = null!;
    private boundWsCardsPlayed: (data: any) => void = null!;
    private boundWsPlayerPassed: (data: any) => void = null!;
    private boundWsRoundCleared: () => void = null!;
    private boundWsGameOver: (data: any) => void = null!;
    private boundWsQuickMatch: (data: any) => void = null!;
    private boundWsPlayerLeave: (data: any) => void = null!;

    start() {
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
            const gameDealtData = {
                hands: [dealtData.hand, [], []] as Card[][],
                landlordCards: dealtData.landlordCards || [],
                landlordId: dealtData.landlordId ?? -1
            };
            this.onGameDealt(gameDealtData);
        } else {
            // 清除旧数据
            clearQuickMatchDealt();
            setTimeout(() => {
                this.startGame();
            }, 500);
        }
    }

    private initGameController(): void {
        let controllerNode = this.node.getChildByName('GameController');
        if (!controllerNode) {
            controllerNode = new Node('GameController');
            this.node.addChild(controllerNode);
        }
        this.gameController = controllerNode.getComponent(GameController);
        if (!this.gameController) {
            this.gameController = controllerNode.addComponent(GameController);
        }
    }

    private initUI(): void {
        // HandView, PlayedCardsView, ActionButtons 由用户在编辑器绑定
        // 这里直接使用绑定好的组件

        if (this.handView && this.cardPrefab) {
            this.handView.cardPrefab = this.cardPrefab;
        }

        if (this.resultLabel) {
            this.resultLabel.node.active = false;
        }

        // 游戏结束界面默认隐藏
        if (this.gameOverNode) {
            this.gameOverNode.active = false;
        }

        // 设置游戏结束按钮（仅房主可见）
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
            // BackButton 所有玩家都可见
            this.BackButton.node.on(Button.EventType.CLICK, this.onBackClicked, this);
        }

        // 初始化AI玩家信息
        this.initPlayerInfo();
    }

    /** 初始化玩家信息
     * @param landlordId 可选的地主ID，如果未提供则使用 CURRENT_ROOM_PLAYERS 中的 isLandlord 字段
     */
    private initPlayerInfo(landlordId?: number): void {
        const roomManager = RoomManager.getInstance();
        // 优先使用服务器传来的玩家数据（CURRENT_ROOM_PLAYERS）
        let players = CURRENT_ROOM_PLAYERS && CURRENT_ROOM_PLAYERS.length > 0
            ? CURRENT_ROOM_PLAYERS
            : roomManager.getRoomPlayers(CURRENT_ROOM_ID);
        const playerInfos = [this.leftPlayerInfo, this.rightPlayerInfo];
        // 如果没有提供 landlordId，尝试从 CURRENT_ROOM_PLAYERS 中查找 isLandlord=true 的玩家
        let resolvedLandlordId = landlordId;
        if (resolvedLandlordId === undefined) {
            const landlordPlayer = players.find(p => p && p.isLandlord);
            resolvedLandlordId = landlordPlayer ? players.indexOf(landlordPlayer) : -1;
        }
        const myIndex = CURRENT_PLAYER_INDEX;

        // 根据我的位置确定左右两边对应的玩家索引
        // 我的位置在下方(0)，左边是1，右边是2
        // 我的位置在左边(1)，左边是2，右边是0
        // 我的位置在右边(2)，左边是0，右边是1
        let leftPlayerIndex: number, rightPlayerIndex: number;
        if (myIndex === 0) {
            leftPlayerIndex = 1;
            rightPlayerIndex = 2;
        } else if (myIndex === 1) {
            leftPlayerIndex = 2;
            rightPlayerIndex = 0;
        } else {
            leftPlayerIndex = 0;
            rightPlayerIndex = 1;
        }

        // 设置下方玩家（我自己）的信息
        if (this.BottomPlayerInfo) {
            // 玩家通过数组索引存储，直接用 myIndex 访问
            const myPlayerData = players[myIndex];
            const myName = myPlayerData?.nickname || myPlayerData?.name || CURRENT_USER_NAME || '你';
            const myAvatar = myPlayerData?.avatar || CURRENT_USER_AVATAR || '';
            const isMyLandlord = myIndex === resolvedLandlordId;
            const myCardCount = isMyLandlord ? 20 : 17;
            const myPlayer = { id: myIndex, name: myName, avatar: myAvatar, hand: { count: myCardCount } as any, isLandlord: isMyLandlord, isHuman: true };
            this.BottomPlayerInfo.setPlayer(myPlayer as any);
        }

        const positions = [
            { info: playerInfos[0], playerIndex: leftPlayerIndex },
            { info: playerInfos[1], playerIndex: rightPlayerIndex }
        ];

        for (const { info: playerInfo, playerIndex } of positions) {
            if (playerInfo) {
                const isLandlord = playerIndex === resolvedLandlordId;
                const cardCount = isLandlord ? 20 : 17;
                // 玩家通过数组索引存储，直接用 playerIndex 访问
                const playerData = players[playerIndex];
                const name = playerData?.nickname || playerData?.name || (playerData?.isAI ? `AI${playerIndex}` : `玩家${playerIndex.toString().padStart(3, '0')}`);
                const fakePlayer = { id: playerIndex, name, avatar: playerData?.avatar || '', hand: { count: cardCount } as any, isLandlord, isHuman: !playerData?.isAI };
                playerInfo.setPlayer(fakePlayer as any);
            }
        }
    }

    /** 根据玩家ID获取玩家名字 */
    private getPlayerName(playerId: number): string {
        const playerData = CURRENT_ROOM_PLAYERS[playerId];
        return playerData?.nickname || playerData?.name || `玩家${playerId}`;
    }

    /** 获取所有玩家名字数组 [自己, AI1, AI2] */
    private getPlayerNames(): string[] {
        const roomManager = RoomManager.getInstance();
        // 优先使用服务器传来的玩家数据
        const players = CURRENT_ROOM_PLAYERS && CURRENT_ROOM_PLAYERS.length > 0
            ? CURRENT_ROOM_PLAYERS
            : roomManager.getRoomPlayers(CURRENT_ROOM_ID);
        const names: string[] = [];

        // 获取所有玩家名字（直接用 playerId 作为索引访问）
        for (let i = 0; i <= 2; i++) {
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
        EventBus.on(GameEvents.GAME_STARTED, this.boundOnGameStarted);
        EventBus.on(GameEvents.GAME_DEALT, this.boundOnGameDealt);
        EventBus.on(GameEvents.LANDLORD_SELECTED, this.boundOnLandlordSelected);
        // 注意：TURN_CHANGED 不通过 EventBus 监听，而是在 onGameDealt 和 onWsTurnChanged 中直接调用
        EventBus.on(GameEvents.CARDS_PLAYED, this.boundOnCardsPlayed);
        EventBus.on(GameEvents.PLAYER_PASSED, this.boundOnPlayerPassed);
        EventBus.on(GameEvents.ROUND_CLEARED, this.boundOnRoundCleared);
        EventBus.on(GameEvents.GAME_OVER, this.boundOnGameOver);
        EventBus.on(GameEvents.PLAY_REQUESTED, this.boundOnPlayRequested);
        EventBus.on(GameEvents.PASS_REQUESTED, this.boundOnPassRequested);
    }

    /** 设置 WebSocket 消息监听（用于快速匹配等远程游戏状态） */
    private setupWebSocketListeners(): void {
        const wsManager = WebSocketManager.getInstance();

        wsManager.on(WsMessageType.GAME_TURN, this.boundWsTurnChanged);
        wsManager.on(WsMessageType.GAME_ACTION, this.boundWsCardsPlayed);
        wsManager.on(WsMessageType.GAME_OVER, this.boundWsGameOver);
        wsManager.on(WsMessageType.ROOM_QUICK_MATCH, this.boundWsQuickMatch);
        wsManager.on(WsMessageType.ROOM_PLAYER_LEAVE, this.boundWsPlayerLeave);
    }

    /** 移除 WebSocket 消息监听 */
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
        this.unscheduleAllCallbacks(); // 取消任何待执行的延迟清空
        this.onTurnChanged(data);
    }

    /** WebSocket 消息：出牌 */
    private async onWsCardsPlayed(data: { playerId: number; cards: Card[]; actionType: string }): Promise<void> {
        if (data.actionType === 'pass') {
            // 跳过只通过EventBus通知
            EventBus.emit(GameEvents.PLAYER_PASSED, { playerId: data.playerId });
            // 刷新按钮状态（更新lastMove等）
            this.actionButtons?.updateButtonState();
        } else {
            // 取消任何待执行的延迟清空
            this.unscheduleAllCallbacks();
            // 立即清空出牌区域，显示新出的牌
            this.playedCardsView?.clearAllAreas();
            // 出牌时通过EventBus通知所有监听器（包括PlayerInfoView更新手牌数、PlayedCardsView显示）
            // 包含 remainingCounts 让 PlayerInfoView 直接使用正确数值
            // 更新其他玩家手牌数
            if (this.playerCardCounts.length > 0) {
                this.playerCardCounts[data.playerId] = Math.max(0, (this.playerCardCounts[data.playerId] || 0) - (data.cards?.length || 0));
                EventBus.emit(GameEvents.CARD_DEALT, { playerId: data.playerId, count: this.playerCardCounts[data.playerId] });
            }

            EventBus.emit(GameEvents.CARDS_PLAYED, {
                playerId: data.playerId,
                cards: data.cards || [],
                pattern: (data as any).pattern,
                remainingCounts: (data as any).remainingCounts
            });

            // 人类玩家出牌时，同时调用onCardsPlayed处理手牌动画
            if (data.playerId === CURRENT_PLAYER_INDEX) {
                await this.onCardsPlayed({ playerId: data.playerId, cards: data.cards || [] });
                // 更新 ActionButtons 的手牌数据
                if (this.handView && this.actionButtons) {
                    this.actionButtons.setHand(this.handView.hand);
                }
            }
        }
    }

    /** WebSocket 消息：跳过 */
    private onWsPlayerPassed(data: { playerId: number }): void {
        this.onPlayerPassed(data);
    }

    /** WebSocket 消息：回合结束 */
    private onWsRoundCleared(): void {
        this.onRoundCleared();
    }

    /** WebSocket 消息：游戏结束 */
    private onWsGameOver(data: { winnerId: number; isLandlordWin: boolean }): void {
        this.onGameOver(data);
    }

    /** WebSocket 消息：快速匹配（再来一局） */
    private onWsQuickMatch(data: any): void {
        if (data.success) {
            // 重置UI状态
            if (this.gameOverNode) {
                this.gameOverNode.active = false;
            }
            if (this.resultLabel) {
                this.resultLabel.node.active = false;
            }
            if (this.playedCardsView) {
                this.playedCardsView.clearAllAreas();
            }
            if (this.actionButtons) {
                this.actionButtons.reset();
            }

            // 重置状态
            this.landlordCards = [];
            this.playerHand = [];
            this.playerCardCounts = [];

            // 更新房间玩家数据
            if (data.room?.players) {
                setCurrentRoomPlayers(data.room.players);
            }

            // 如果服务器直接发送了 dealt 数据，立即处理
            if (data.dealt) {
                this.onGameDealt({
                    hands: [data.dealt.hand, [], []],
                    landlordCards: data.dealt.landlordCards,
                    landlordId: data.dealt.landlordId
                });
            }
        }
    }

    /** WebSocket 消息：玩家离开（房主退出时通知其他玩家） */
    private onWsPlayerLeave(data: { playerIndex: number }): void {
        // 如果是房主离开，非房主玩家返回大厅
        if (data.playerIndex === 0 && !this.isLoading) {
            this.isLoading = true;
            director.loadScene('Lobby');
        }
    }

    private startGame(): void {
        if (this.gameStatusLabel) {
            this.gameStatusLabel.string = '发牌中...';
        }
    }

    private onGameStarted(): void {
        if (this.gameStatusLabel) {
            this.gameStatusLabel.string = '发牌中...';
        }
    }

    private onGameDealt(data: { hands: Card[][]; landlordCards: Card[]; landlordId: number }): void {
        if (!this.handView) {
            return;
        }
        if (!data.hands[0]) {
            return;
        }

        // 如果已经有地主牌数据，检查是否是重复调用还是晚客户端加入
        if (this.landlordCards.length > 0) {
            // 如果地主ID相同，说明是重复调用，忽略
            if (this.landlordCards.length === data.landlordCards.length &&
                this.landlordCards.every((c, i) => c.id === data.landlordCards[i]?.id)) {
                return;
            }
            // 地主牌不同，说明是新游戏，重置状态
            this.landlordCards = [];
            this.playerHand = [];
            this.playerCardCounts = [];
        }

        // 保存地主牌和玩家手牌
        this.landlordCards = data.landlordCards;
        let playerHand = data.hands[0] || [];

        // 如果手牌数量超过20（地主应该是17+3=20），截断多余部分
        const maxHandSize = 20;
        if (playerHand.length > maxHandSize) {
            playerHand = playerHand.slice(0, maxHandSize);
        }
        this.playerHand = playerHand;

        // 清空手牌准备发牌动画
        this.handView.setHand(new Hand([]));

        // 1. 发牌开始时就显示地主牌背面
        this.showLandlordCardsFaceDown(this.landlordCards);

        // 2. 发牌动画（背面）
        const animator = this.node.getComponent(DealCardsAnimator) as DealCardsAnimator | null;

        // 如果自己是地主，发牌数量包含地主牌（20张）
        // 注意：服务器发送的 hands[0] 已经包含地主牌，不需要再额外添加
        const isLandlord = data.landlordId === 0;
        // 使用已截断的 playerHand（20张）而不是原始的 data.hands[0]（可能是23张）
        const cardsToDeal = this.playerHand;
        

        if (animator) {
            animator.playDealAnimation(cardsToDeal, 50, async () => {
                // 3. 发完统一翻转手牌（如果是地主，传入完整的20张牌，按rank排序）
                const sortedCards = [...cardsToDeal].sort((a, b) => b.rank - a.rank);
                this.handView.setHand(new Hand(sortedCards));

                // 4. 确定地主
                this.initPlayerInfo(data.landlordId);

                // 5. 如果自己是地主，隐藏3张地主牌（根据card id查找）
                if (isLandlord) {
                    const landlordIds = this.landlordCards.map(c => c.id);
                    this.handView.hideCardsByIds(landlordIds);
                }

                // 6. 地主牌翻转
                await this.flipLandlordCards();

                // 7. 如果自己是地主，让地主牌播放Y轴动画
                if (isLandlord) {
                    const landlordIds = this.landlordCards.map(c => c.id);
                    await this.handView.animateCardsByIds(landlordIds, 20);
                }

                // 8. 翻牌完成后显示"你是地主"
                this.onLandlordSelected({ playerId: data.landlordId });

                // 初始化所有玩家手牌数并通知
                const playerCount = 3;
                this.playerCardCounts = [];
                for (let i = 0; i < playerCount; i++) {
                    const count = i === 0 ? cardsToDeal.length : (i === data.landlordId ? 20 : 17);
                    this.playerCardCounts.push(count);
                    EventBus.emit(GameEvents.CARD_DEALT, { playerId: i, count });
                }

                // 9. 发牌动画全部完成，允许显示操作按钮（必须在发送game/ready之前）
                this.actionButtons?.onDealingAnimationEnd();

                // 10. 通知服务器客户端已准备好
                // 服务器收到后会发送 game/turn 开始回合
                const wsManager = WebSocketManager.getInstance();
                wsManager.send(WsMessageType.GAME_READY);
            });
        } else {
            // 没有 animator 时直接显示
            (async () => {
                const sortedCards = [...cardsToDeal].sort((a, b) => b.rank - a.rank);
                this.handView.setHand(new Hand(sortedCards));
                this.initPlayerInfo(data.landlordId);
                if (isLandlord) {
                    const landlordIds = this.landlordCards.map(c => c.id);
                    this.handView.hideCardsByIds(landlordIds);
                }
                await this.flipLandlordCards();
                if (isLandlord) {
                    const landlordIds = this.landlordCards.map(c => c.id);
                    await this.handView.animateCardsByIds(landlordIds, 20);
                }
                this.onLandlordSelected({ playerId: data.landlordId });

                // 初始化所有玩家手牌数并通知
                const playerCount2 = 3;
                this.playerCardCounts = [];
                for (let i = 0; i < playerCount2; i++) {
                    const count = i === 0 ? cardsToDeal.length : (i === data.landlordId ? 20 : 17);
                    this.playerCardCounts.push(count);
                    EventBus.emit(GameEvents.CARD_DEALT, { playerId: i, count });
                }

                // 发牌动画全部完成，允许显示操作按钮（必须在发送game/ready之前）
                this.actionButtons?.onDealingAnimationEnd();

                // 通知服务器客户端已准备好
                const wsManager = WebSocketManager.getInstance();
                wsManager.send(WsMessageType.GAME_READY);
            })();
        }
    }

    /** 显示地主牌背面 */
    private showLandlordCardsFaceDown(cards: Card[]): void {
        if (!this.landlordCardsArea || !this.landlordCardPrefab) return;

        // 清空旧地主牌
        for (const child of this.landlordCardsArea.children) {
            child.destroy();
        }

        for (let i = 0; i < cards.length; i++) {
            const node = instantiate(this.landlordCardPrefab);
            node.setParent(this.landlordCardsArea);
            node.setPosition(-80 + i * 80, 0, 0);

            const cardView = node.getComponent(CardView);
            if (cardView) {
                cardView.setBack();
            }
        }
    }

    /** 翻转地主牌 */
    private flipLandlordCards(): Promise<void> {
        if (!this.landlordCardsArea) return Promise.resolve();

        const nodes = this.landlordCardsArea.children;
        if (nodes.length === 0) return Promise.resolve();

        // 调试：确保地主牌数据存在
        if (!this.landlordCards || this.landlordCards.length === 0) {
            this.landlordCards = this.gameController?.getLandlordCards() || [];
        }

        const animator = this.node.getComponent(CardFlipAnimator) as CardFlipAnimator | null;
        if (animator) {
            // 使用本地保存的地主牌
            const cards = this.landlordCards || [];
            
            return animator.flipCardsAllAtOnce(nodes as any, cards);
        } else {
            // 没有 animator 时直接显示正面
            for (const node of nodes) {
                const cardView = node.getComponent(CardView);
                if (cardView) {
                    cardView.setFaceUp(true);
                }
            }
            return Promise.resolve();
        }
    }

    private onLandlordSelected(data: { playerId: number }): void {
        const playerNames = this.getPlayerNames();
        if (this.gameStatusLabel) {
            this.gameStatusLabel.string = `${playerNames[data.playerId]}是地主！`;
        }
        // 直接设置所有玩家的身份标签
        // 因为 LANDLORD_SELECTED 事件可能在 PlayerInfoView.start() 之前就发出了
        // BottomPlayerInfo (玩家自己)
        if (this.BottomPlayerInfo) {
            this.BottomPlayerInfo.setLandlordIdentity(data.playerId === 0);
        }
        // leftPlayerInfo (玩家1)
        if (this.leftPlayerInfo) {
            this.leftPlayerInfo.setLandlordIdentity(data.playerId === 1);
        }
        // rightPlayerInfo (玩家2)
        if (this.rightPlayerInfo) {
            this.rightPlayerInfo.setLandlordIdentity(data.playerId === 2);
        }
    }

    private onTurnChanged(data: { playerId: number }): void {
        const playerNames = this.getPlayerNames();

        if (this.gameStatusLabel) {
            if (data.playerId === CURRENT_PLAYER_INDEX) {
                this.gameStatusLabel.string = '请出牌';
            } else {
                this.gameStatusLabel.string = `${playerNames[data.playerId]}出牌`;
            }
        }

        if (this.actionButtons && this.handView) {
            // 使用 HandView 中最新的手牌数据
            this.actionButtons.setHand(this.handView.hand);
            // 使用 GameController 的 lastMove
            this.actionButtons.setLastMove(this.gameController?.getLastMove() || null);
            // 设置是否轮到自己出牌
            this.actionButtons.setMyTurn(data.playerId === CURRENT_PLAYER_INDEX);
        }

        if (this.handView) {
            this.handView.setInteractive(data.playerId === CURRENT_PLAYER_INDEX);
        }
    }

    private async onCardsPlayed(data: { playerId: number; cards: Card[]; pattern?: any }): Promise<void> {
        // 播放出牌音效
        AudioManager.getInstance().playCardSFX(data.pattern?.type, data.cards);

        // 更新自己手牌数
        if (data.playerId === CURRENT_PLAYER_INDEX && this.playerCardCounts.length > 0) {
            this.playerCardCounts[0] = Math.max(0, (this.playerCardCounts[0] || 0) - data.cards.length);
            EventBus.emit(GameEvents.CARD_DEALT, { playerId: 0, count: this.playerCardCounts[0] });
        }
        // 自己出牌：从手牌移除并显示到出牌区域
        // 其他玩家出牌由 PlayedCardsView 通过 EventBus 自动处理
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
        const playerNames = this.getPlayerNames();
        if (this.gameStatusLabel) {
            this.gameStatusLabel.string = `${playerNames[data.playerId]}不出`;
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
        if (this.gameStatusLabel) {
            this.gameStatusLabel.string = '新一轮';
        }
        // 取消之前的延迟清空
        this.unscheduleAllCallbacks();
        // 延迟清空出牌区域，让玩家看清最后一手牌
        if (this.playedCardsView) {
            this.scheduleOnce(() => {
                this.playedCardsView?.clearAllAreas();
            }, 1.5);
        }
    }

    /** 处理出牌请求 */
    private onPlayRequested(cards: Card[]): void {
        // 检查是否轮到自己出牌
        const currentPlayerId = this.gameController?.getCurrentPlayerId();
        if (currentPlayerId !== CURRENT_PLAYER_INDEX) {
            return;
        }

        // 通过 WebSocket 发送出牌请求到服务器
        const wsManager = WebSocketManager.getInstance();
        wsManager.send(WsMessageType.GAME_ACTION, { cards: cards.map(c => c.id) });

    }

    private onPassRequested(): void {
        const wsManager = WebSocketManager.getInstance();
        wsManager.send(WsMessageType.GAME_PASS);
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

        // 显示游戏结束界面
        if (this.gameOverNode) {
            this.gameOverNode.active = true;
        }

        // 发出 GAME_OVER 事件，通知 PlayerInfoView 清空角色标签
        EventBus.emit(GameEvents.GAME_OVER);
    }

    /** 再来一局 */
    private onRestartClicked(): void {
        // 隐藏游戏结束界面
        if (this.gameOverNode) {
            this.gameOverNode.active = false;
        }
        // 隐藏胜利标签
        if (this.resultLabel) {
            this.resultLabel.node.active = false;
        }
        // 清空出牌区域
        if (this.playedCardsView) {
            this.playedCardsView.clearAllAreas();
        }
        // 重置按钮状态
        if (this.actionButtons) {
            this.actionButtons.reset();
        }
        // 重置游戏状态
        this.landlordCards = [];
        this.playerHand = [];
        this.playerCardCounts = [];
        // 发送快速匹配请求开始新游戏
        const wsManager = WebSocketManager.getInstance();
        wsManager.send(WsMessageType.ROOM_QUICK_MATCH, {
            roomType: CURRENT_ROOM_TYPE,
        });
    }

    /** 退出游戏 */
    private onExitClicked(): void {
        if (this.isLoading) return;
        this.isLoading = true;
        const wsManager = WebSocketManager.getInstance();
        wsManager.send(WsMessageType.ROOM_LEAVE);
        director.loadScene('Lobby');
    }

    /** 返回房间（解散房间） */
    private onBackClicked(): void {
        if (this.isLoading) return;
        this.isLoading = true;
        const wsManager = WebSocketManager.getInstance();
        wsManager.send(WsMessageType.ROOM_LEAVE);
        director.loadScene('Lobby');
    }

    onDestroy(): void {
        EventBus.off(GameEvents.GAME_STARTED, this.boundOnGameStarted);
        EventBus.off(GameEvents.GAME_DEALT, this.boundOnGameDealt);
        EventBus.off(GameEvents.LANDLORD_SELECTED, this.boundOnLandlordSelected);
        // TURN_CHANGED 不通过 EventBus 监听，不需要移除
        EventBus.off(GameEvents.CARDS_PLAYED, this.boundOnCardsPlayed);
        EventBus.off(GameEvents.PLAYER_PASSED, this.boundOnPlayerPassed);
        EventBus.off(GameEvents.ROUND_CLEARED, this.boundOnRoundCleared);
        EventBus.off(GameEvents.GAME_OVER, this.boundOnGameOver);
        EventBus.off(GameEvents.PLAY_REQUESTED, this.boundOnPlayRequested);
        EventBus.off(GameEvents.PASS_REQUESTED, this.boundOnPassRequested);

        this.removeWebSocketListeners();
    }
}
