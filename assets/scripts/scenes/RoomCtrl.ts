/**
 * 房间控制器
 */

import { _decorator, Component, Button, Label, Node, Prefab, instantiate } from 'cc';
import { director } from 'cc';
import { CURRENT_ROOM_TYPE, CURRENT_ROOM_CODE, CURRENT_PLAYER_INDEX, CURRENT_ROOM_PLAYERS, setCurrentRoomPlayers, ROOM_PLAYER_COUNTS } from '../shared/Constants';
import { WebSocketManager, WsMessageType } from '../shared/WebSocketManager';
import { PlayerInfoItemCtrl } from './PlayerInfoItemCtrl';

/** 房间名称配置 */
const ROOM_NAMES: Record<number, string> = {
    1: '三人斗地主',
    2: '四人扔炸弹',
    3: '六人扔炸弹',
    4: '五人斗地主',
    5: '六人斗地主',
    6: '七人斗地主',
};

const { ccclass, property } = _decorator;

@ccclass('RoomCtrl')
export class RoomCtrl extends Component {
    @property(Button)
    backButton: Button = null!;

    @property(Button)
    readyButton: Button = null!;

    @property(Button)
    startButton: Button = null!;

    @property(Label)
    roomNameLabel: Label = null!;

    @property(Label)
    roomCodeLabel: Label = null!;

    @property(Prefab)
    playerInfoPrefab: Prefab = null!;

    @property(Node)
    playerListParent: Node = null!;

    private playerInfos: any[] = [];
    private playerItemCtrls: PlayerInfoItemCtrl[] = [];
    private wsManager: WebSocketManager = WebSocketManager.getInstance();
    private isHumanReady: boolean = false;
    private isHumanHost: boolean = true;
    private isLoading: boolean = false;

    // Bound callbacks for event listeners
    private onPlayerJoinHandler: (data: any) => void = () => {};
    private onPlayerLeaveHandler: (data: any) => void = () => {};
    private onPlayerReadyHandler: (data: any) => void = () => {};
    private onPlayersUpdateHandler: (data: any) => void = () => {};
    private onGameStartHandler: (data: any) => void = () => {};
    private onDisconnectHandler: () => void = () => {};
    private onAddAIHandler: (data: any) => void = () => {};
    private onRemoveAIHandler: (data: any) => void = () => {};

    start() {
        this.setupUI();
        this.setupWebSocketListeners();
        this.initEmptySlots();
        this.createPlayerInfoItems();
    }

    private setupWebSocketListeners(): void {
        this.onPlayerJoinHandler = (data: any) => {
            this.updatePlayers(data.players);
        };

        this.onPlayerLeaveHandler = (data: any) => {
            // 玩家离开后刷新房间信息
            if (data.players) {
                this.updatePlayers(data.players);
            }
        };

        this.onPlayerReadyHandler = (data: any) => {
            this.updatePlayerReadyState(data.playerIndex, data.ready);
            // 注意：不要用players数组更新，会覆盖正确的ready状态
            this.checkAllReady();
        };

        this.onPlayersUpdateHandler = (data: any) => {
            this.updatePlayers(data.players);
        };

        this.onGameStartHandler = (data: any) => {
            if (data.success) {
                const sceneName = CURRENT_ROOM_TYPE === 5 ? 'GameTable2' : 'GameTable';
                director.loadScene(sceneName);
            } else {

                this.isLoading = false;
            }
        };

        this.onDisconnectHandler = () => {
        };

        this.onAddAIHandler = (data: any) => {
            if (data.success) {
                this.updatePlayers(data.players);
            }
        };

        this.onRemoveAIHandler = (data: any) => {
            if (data.success) {
                this.updatePlayers(data.players);
            }
        };

        this.wsManager.on(WsMessageType.ROOM_PLAYER_JOIN, this.onPlayerJoinHandler);
        this.wsManager.on(WsMessageType.ROOM_PLAYER_LEAVE, this.onPlayerLeaveHandler);
        this.wsManager.on(WsMessageType.ROOM_PLAYER_READY, this.onPlayerReadyHandler);
        this.wsManager.on(WsMessageType.ROOM_PLAYERS_UPDATE, this.onPlayersUpdateHandler);
        this.wsManager.on(WsMessageType.GAME_START, this.onGameStartHandler);
        this.wsManager.on(WsMessageType.ROOM_ADD_AI, this.onAddAIHandler);
        this.wsManager.on(WsMessageType.ROOM_REMOVE_AI, this.onRemoveAIHandler);
        this.wsManager.on('disconnect', this.onDisconnectHandler);
    }

    private updatePlayers(players: any[]): void {
        const maxPlayers = ROOM_PLAYER_COUNTS[CURRENT_ROOM_TYPE] || 3;
        this.playerInfos = []; // 先清空

        // 同步更新 CURRENT_ROOM_PLAYERS
        setCurrentRoomPlayers(players);
        console.log('[RoomCtrl] updatePlayers, players:', JSON.stringify(players));

        for (let i = 0; i < maxPlayers; i++) {
            if (players[i]) {
                // 使用服务器传来的玩家 ID（可能是 id 或 playerIndex）
                const playerId = players[i].id ?? players[i].playerIndex ?? i;
                // AI 玩家没有头像时随机分配 avatar1-avatar9
                let avatar = players[i].avatar || '';
                if (players[i].isAI && !avatar) {
                    const avatarNum = Math.floor(Math.random() * 9) + 1;
                    avatar = `avatar${avatarNum}`;
                    players[i].avatar = avatar; // 保存回原始数据
                }
                this.playerInfos[i] = {
                    id: playerId,
                    name: players[i].nickname || `玩家${playerId}`,
                    avatar: avatar,
                    isReady: players[i].isReady || false,
                    isHost: players[i].isHost || false,
                    isAI: players[i].isAI || false,
                    isEmpty: false
                };
            } else {
                this.playerInfos[i] = {
                    id: i,
                    name: '',
                    avatar: '',
                    isReady: false,
                    isHost: false,
                    isAI: false,
                    isEmpty: true
                };
            }
        }

        this.createPlayerInfoItems();
        this.updateHostAndReadyButtons();
    }

    private updatePlayerReadyState(playerIndex: number, ready: boolean): void {
        if (playerIndex >= 0 && playerIndex < this.playerInfos.length) {
            this.playerInfos[playerIndex].isReady = ready;
            const ctrl = this.playerItemCtrls[playerIndex];
            if (ctrl) {
                ctrl.setReady(ready);
            }
        }
    }

    private setupUI(): void {
        if (this.backButton) {
            this.backButton.node.on('click', this.onBackClicked, this);
        }

        if (this.roomNameLabel) {
            this.roomNameLabel.string = ROOM_NAMES[CURRENT_ROOM_TYPE] || '斗地主';
        }

        if (this.roomCodeLabel) {
            this.roomCodeLabel.node.active = true;
            this.roomCodeLabel.string = `房间码：${CURRENT_ROOM_CODE}`;
        }

        if (this.readyButton) {
            this.readyButton.node.active = true;
            this.readyButton.interactable = true;
            this.readyButton.node.on('click', this.onReadyClicked, this);
        }

        if (this.startButton) {
            this.startButton.node.active = false;
        }

        if (this.readyButton) {
            const label = this.readyButton.node.getComponentInChildren(Label);
            if (label) {
                label.string = '准备';
            }
        }
    }

    private updateHostAndReadyButtons(): void {
        // 找到我在房间中的位置，判断是否是房主
        const myIndex = CURRENT_PLAYER_INDEX;
        const myPlayer = this.playerInfos[myIndex];
        this.isHumanHost = myPlayer?.isHost || false;

        if (this.isHumanHost) {
            if (this.readyButton) {
                this.readyButton.node.active = false;
            }
            if (this.startButton) {
                this.startButton.node.active = true;
                this.startButton.interactable = false;
                this.startButton.node.on('click', this.onStartClicked, this);
            }
        } else {
            if (this.readyButton) {
                this.readyButton.node.active = true;
                const label = this.readyButton.node.getComponentInChildren(Label);
                if (label) {
                    label.string = myPlayer?.isReady ? '取消' : '准备';
                }
            }
            if (this.startButton) {
                this.startButton.node.active = false;
            }
        }

        this.checkAllReady();
    }

    private initEmptySlots(): void {
        const maxPlayers = ROOM_PLAYER_COUNTS[CURRENT_ROOM_TYPE] || 3;
        this.playerInfos = [];

        // 如果有保存的玩家数据，使用保存的数据
        if (CURRENT_ROOM_PLAYERS.length > 0) {
            for (let i = 0; i < maxPlayers; i++) {
                if (CURRENT_ROOM_PLAYERS[i]) {
                    this.playerInfos.push({
                        id: i,
                        name: CURRENT_ROOM_PLAYERS[i].nickname || `玩家${i}`,
                        avatar: CURRENT_ROOM_PLAYERS[i].avatar || '',
                        isReady: CURRENT_ROOM_PLAYERS[i].isReady || false,
                        isHost: CURRENT_ROOM_PLAYERS[i].isHost || false,
                        isAI: CURRENT_ROOM_PLAYERS[i].isAI || false,
                        isEmpty: false
                    });
                } else {
                    this.playerInfos.push({
                        id: i,
                        name: '',
                        avatar: '',
                        isReady: false,
                        isHost: false,
                        isAI: false,
                        isEmpty: true
                    });
                }
            }
            return;
        }

        // 否则创建空槽位
        for (let i = 0; i < maxPlayers; i++) {
            this.playerInfos.push({
                id: i,
                name: '',
                avatar: '',
                isReady: false,
                isHost: false,
                isAI: false,
                isEmpty: true
            });
        }
    }

    private createPlayerInfoItems(): void {
        if (!this.playerInfoPrefab || !this.playerListParent) {
            return;
        }

        this.playerListParent.removeAllChildren();
        this.playerItemCtrls = [];

        // 先更新房主状态
        this.updateHostAndReadyButtons();

        for (let i = 0; i < this.playerInfos.length; i++) {
            const info = this.playerInfos[i];
            const node = instantiate(this.playerInfoPrefab);
            node.setParent(this.playerListParent);
            const ctrl = node.getComponent(PlayerInfoItemCtrl);
            if (ctrl) {
                ctrl.updatePlayerInfo(info);
                this.playerItemCtrls.push(ctrl);

                // 如果是房主且是空位或AI，添加点击事件
                if (this.isHumanHost && (info.isEmpty || info.isAI)) {
                    node.on('click', () => this.onEmptySlotClicked(i), this);
                }
            }
        }

        // 更新按钮状态
        this.updateHostAndReadyButtons();
    }

    private onReadyClicked(): void {
        // 防止重复点击
        if (this.isLoading) return;
        this.isLoading = true;

        this.isHumanReady = !this.isHumanReady;
        this.updatePlayerReadyState(CURRENT_PLAYER_INDEX, this.isHumanReady);

        if (this.readyButton) {
            const label = this.readyButton.node.getComponentInChildren(Label);
            if (label) {
                label.string = this.isHumanReady ? '取消' : '准备';
            }
        }

        this.wsManager.send(WsMessageType.ROOM_PLAYER_READY, {
            ready: this.isHumanReady
        });

        // 1秒后解除锁定
        this.scheduleOnce(() => {
            this.isLoading = false;
        }, 1);

        this.checkAllReady();
    }

    private checkAllReady(): void {
        const hasEmptySlot = this.playerInfos.some((p: any) => p.isEmpty);
        const allReady = this.playerInfos.every((p: any) => p.isReady || p.isEmpty);

        if (this.startButton) {
            this.startButton.interactable = this.isHumanHost && !hasEmptySlot && allReady;
        }
    }

    private onStartClicked(): void {
        if (this.isLoading) return;
        this.isLoading = true;
        this.wsManager.send(WsMessageType.GAME_START);
    }

    /** 点击空位添加/移除AI */
    private onEmptySlotClicked(position: number): void {
        if (!this.isHumanHost) return;

        const info = this.playerInfos[position];
        if (!info) return;

        if (info.isAI) {
            this.wsManager.send(WsMessageType.ROOM_REMOVE_AI, { position });
        } else if (info.isEmpty) {
            this.wsManager.send(WsMessageType.ROOM_ADD_AI, { position });
        }
    }

    private onBackClicked(): void {
        if (this.isLoading) return;
        this.isLoading = true;
        this.wsManager.send(WsMessageType.ROOM_LEAVE);
        director.loadScene('Lobby');
    }

    onDestroy(): void {
        this.wsManager.off(WsMessageType.ROOM_PLAYER_JOIN, this.onPlayerJoinHandler);
        this.wsManager.off(WsMessageType.ROOM_PLAYER_LEAVE, this.onPlayerLeaveHandler);
        this.wsManager.off(WsMessageType.ROOM_PLAYER_READY, this.onPlayerReadyHandler);
        this.wsManager.off(WsMessageType.ROOM_PLAYERS_UPDATE, this.onPlayersUpdateHandler);
        this.wsManager.off(WsMessageType.GAME_START, this.onGameStartHandler);
        this.wsManager.off(WsMessageType.ROOM_ADD_AI, this.onAddAIHandler);
        this.wsManager.off(WsMessageType.ROOM_REMOVE_AI, this.onRemoveAIHandler);
        this.wsManager.off('disconnect', this.onDisconnectHandler);

        if (this.backButton?.node) {
            this.backButton.node.off('click', this.onBackClicked, this);
        }
        if (this.startButton?.node) {
            this.startButton.node.off('click', this.onStartClicked, this);
        }
        if (this.readyButton?.node) {
            this.readyButton.node.off('click', this.onReadyClicked, this);
        }
    }
}
