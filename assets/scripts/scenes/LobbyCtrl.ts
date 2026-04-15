/**
 * 大厅控制器 - 创建房间/加入房间
 */

import { _decorator, Component, Button, EditBox, Label, ToggleContainer, Toggle, Node, Prefab, instantiate, Sprite } from 'cc';
import { director } from 'cc';
import { CURRENT_GAME_TYPE, CURRENT_ROOM_TYPE, CURRENT_ROOM_CODE, setCurrentRoomType, setCurrentGameType, setCurrentRoomId, setCurrentRoomCode, setCurrentPlayerIndex, setCurrentRoomPlayers, setQuickMatchDealt, CURRENT_USER_ID, CURRENT_USER_NAME, GAME_MODE_CONFIG } from '../shared/Constants';
import { WebSocketManager, WsMessageType, WsConnectionState } from '../shared/WebSocketManager';

const { ccclass, property } = _decorator;

@ccclass('LobbyCtrl')
export class LobbyCtrl extends Component {
    @property(Button)
    createRoomButton: Button = null!;

    @property(Button)
    joinRoomButton: Button = null!;

    @property(Button)
    backButton: Button = null!;

    @property(Button)
    matchBattleButton: Button = null!;

    @property(EditBox)
    roomIdInput: EditBox = null!;

    @property(Node)
    joinRoomArea: Node = null!;

    @property(Button)
    confirmJoinButton: Button = null!;

    @property(Button)
    closeJoinRoomButton: Button = null!;

    @property(Node)
    createRoomArea: Node = null!;

    @property(Button)
    closeCreateRoomButton: Button = null!;

    @property(Button)
    confirmCreateButton: Button = null!;

    @property(Label)
    errorLabel: Label = null!;

    @property(ToggleContainer)
    gameTypeToggleContainer: ToggleContainer = null!;

    @property(Node)
    roomTypeButtonContainer: Node = null!;

    @property(Prefab)
    roomTypeButtonPrefab: Prefab = null!;

    @property(Node)
    roomTypeToggleContainer: Node = null!;

    @property(Prefab)
    roomTypeTogglePrefab: Prefab = null!;

    private _currentGameType: number = 1;
    private _currentRoomType: number = 1;
    private wsManager: WebSocketManager = WebSocketManager.getInstance();
    private isLoading: boolean = false;
    private joinRoomAreaVisible: boolean = false;
    private createRoomAreaVisible: boolean = false;

    // 保存回调函数引用，用于清理
    private onConnectHandler: () => void = () => { };
    private onRoomCreateHandler: (data: any) => void = () => { };
    private onRoomJoinHandler: (data: any) => void = () => { };
    private onQuickMatchHandler: (data: any) => void = () => { };
    private onErrorHandler: (error: any) => void = () => { };

    start() {
        // 初始化当前玩法和房间类型（从 MainMenu 传入）
        this._currentGameType = CURRENT_GAME_TYPE;
        const gameModeConfig = GAME_MODE_CONFIG[this._currentGameType];
        const roomTypeKeys = gameModeConfig ? Object.keys(gameModeConfig.roomTypes).map(Number) : [];
        this._currentRoomType = roomTypeKeys[0] || 1;
        setCurrentGameType(this._currentGameType);
        setCurrentRoomType(this._currentRoomType);

        this.setupUI();
        this.setupMessageHandlers();

        // 如果房间号已设置（从房间列表进入），自动加入房间
        if (CURRENT_ROOM_CODE && CURRENT_ROOM_CODE.length === 6) {
            this.isLoading = true;
            this.sendJoinRoom(CURRENT_ROOM_CODE);
        }
    }

    private setupMessageHandlers(): void {
        this.onRoomCreateHandler = (data: any) => {
            if (data.success) {
                setCurrentRoomId(data.room.id);
                setCurrentRoomCode(data.room.roomCode);
                setCurrentPlayerIndex(0); // 房主是位置0
                setCurrentRoomPlayers(data.room.players || []); // 保存玩家列表
                director.loadScene('Room');
            } else {
                this.showErrorTip(data.error || '创建房间失败');
                this.isLoading = false;
            }
        };

        this.onRoomJoinHandler = (data: any) => {
            if (data.success) {
                setCurrentRoomId(data.room.id);
                setCurrentRoomCode(data.room.roomCode);
                setCurrentPlayerIndex(data.playerIndex ?? 0); // 保存玩家在房间中的位置
                setCurrentRoomPlayers(data.room.players || []); // 保存玩家列表
                director.loadScene('Room');
            } else {
                this.showErrorTip(data.error || '加入房间失败');
                this.isLoading = false;
            }
        };

        this.onQuickMatchHandler = (data: any) => {
            if (data.success) {
                setCurrentRoomId(data.room.id);
                setCurrentRoomCode(data.room.roomCode);
                setCurrentPlayerIndex(0);
                setCurrentRoomPlayers(data.room.players || []);
                // 只有当 dealt 数据完整时才保存
                if (data.dealt && data.dealt.hand && Array.isArray(data.dealt.hand) && data.dealt.hand.length > 0) {
                    setQuickMatchDealt(data.dealt);
                }
                // 快速匹配直接进入游戏场景（6人场用GameTable2）
                const sceneName = (CURRENT_ROOM_TYPE === 4) ? 'GameTable2' : 'GameTable';
                director.loadScene(sceneName);
            } else {
                this.showErrorTip(data.error || '匹配失败');
                this.isLoading = false;
            }
        };

        this.onErrorHandler = (error: any) => {
            this.showErrorTip('网络错误');
            this.isLoading = false;
        };

        // 监听房间创建响应
        this.wsManager.on(WsMessageType.ROOM_CREATE, this.onRoomCreateHandler);

        // 监听加入房间响应
        this.wsManager.on(WsMessageType.ROOM_JOIN, this.onRoomJoinHandler);

        // 监听快速匹配响应
        this.wsManager.on(WsMessageType.ROOM_QUICK_MATCH, this.onQuickMatchHandler);

        // 监听错误
        this.wsManager.on('error', this.onErrorHandler);
    }

    private setupUI(): void {
        // 返回按钮
        if (this.backButton) {
            this.backButton.node.on('click', this.onBackClicked, this);
        }

        // 创建房间按钮
        if (this.createRoomButton) {
            this.createRoomButton.node.on('click', this.onCreateRoomClicked, this);
        }

        // 加入房间按钮
        if (this.joinRoomButton) {
            this.joinRoomButton.node.on('click', this.onJoinRoomClicked, this);
        }

        // 隐藏加入房间区域
        if (this.joinRoomArea) {
            this.joinRoomArea.active = false;
        }

        // 确认加入按钮
        if (this.confirmJoinButton) {
            this.confirmJoinButton.node.on('click', this.onConfirmJoinClicked, this);
        }

        // 关闭加入房间按钮
        if (this.closeJoinRoomButton) {
            this.closeJoinRoomButton.node.on('click', this.onCloseJoinRoomClicked, this);
        }

        // 隐藏创建房间区域
        if (this.createRoomArea) {
            this.createRoomArea.active = false;
        }

        // 关闭创建房间按钮
        if (this.closeCreateRoomButton) {
            this.closeCreateRoomButton.node.on('click', this.onCloseCreateRoomClicked, this);
        }

        // 确认创建按钮
        if (this.confirmCreateButton) {
            this.confirmCreateButton.node.on('click', this.onConfirmCreateClicked, this);
        }

        // 匹配对战按钮
        if (this.matchBattleButton) {
            this.matchBattleButton.node.on('click', this.onMatchBattleClicked, this);
        }

        // 隐藏错误提示
        if (this.errorLabel) {
            this.errorLabel.node.active = false;
        }

        // 监听玩法类型切换
        if (this.gameTypeToggleContainer) {
            const gameToggles = this.gameTypeToggleContainer.toggleItems;
            gameToggles.forEach((toggle, index) => {
                toggle.node.on('toggle', () => this.onGameTypeChanged(toggle, index), this);
            });
        }

        // 预选择玩法类型并显示对应房间类型按钮
        this.preselectGameType();
        // 初始化创建房间区域的房间类型 Toggle
        this.createRoomTypeToggles();
    }

    /** 预选择玩法类型 */
    private preselectGameType(): void {
        if (!this.gameTypeToggleContainer) return;

        const gameToggles = this.gameTypeToggleContainer.toggleItems;
        const targetIndex = this._currentGameType - 1;

        if (gameToggles[targetIndex]) {
            // 设置 Toggle 的 isChecked 状态（但不走 onGameTypeChanged，避免重复设置）
            gameToggles[targetIndex].isChecked = true;
            // 直接设置内部状态
            (gameToggles[targetIndex] as any)._isChecked = true;
        }

        // 显示对应玩法的房间类型按钮
        this.createRoomTypeButtons();
    }

    /** 创建房间类型按钮 */
    private createRoomTypeButtons(): void {
        if (!this.roomTypeButtonContainer || !this.roomTypeButtonPrefab) return;

        // 清除现有按钮
        this.roomTypeButtonContainer.removeAllChildren();

        const gameModeConfig = GAME_MODE_CONFIG[this._currentGameType];
        if (!gameModeConfig) return;

        const roomTypeEntries = Object.entries(gameModeConfig.roomTypes);

        roomTypeEntries.forEach(([roomTypeStr, config]) => {
            const roomType = parseInt(roomTypeStr);
            const btnNode = instantiate(this.roomTypeButtonPrefab);
            btnNode.setParent(this.roomTypeButtonContainer);

            const label = btnNode.getChildByName('Label')?.getComponent(Label);
            const btn = btnNode.getComponent(Button);

            if (label) {
                label.string = config.name;
            }

            // isOpen 为 true 才开启
            const isEnabled = config.isOpen;
            if (btn) {
                btn.interactable = isEnabled;
            }
            if (!isEnabled) {
                // Button 使用子节点显示，遍历子节点找 Sprite 置灰
                const sprites = btnNode.getComponentsInChildren(Sprite);
                for (const sprite of sprites) {
                    sprite.grayscale = true;
                }
            }

            btnNode.on('click', () => {
                this.onRoomTypeButtonClicked(roomType);
            }, this);
        });
    }

    /** 切换玩法类型 */
    private onGameTypeChanged(toggle: Toggle, index: number): void {
        if (!toggle.isChecked) return;
        this._currentGameType = index + 1;
        setCurrentGameType(this._currentGameType);
        const gameModeConfig = GAME_MODE_CONFIG[this._currentGameType];
        const roomTypeKeys = gameModeConfig ? Object.keys(gameModeConfig.roomTypes).map(Number) : [];
        this._currentRoomType = roomTypeKeys[0] || 1;
        setCurrentRoomType(this._currentRoomType);
        this.createRoomTypeButtons();
        // 更新创建房间区域中的房间类型 Toggle
        this.createRoomTypeToggles();
    }

    /** 创建房间类型 Toggle（用于创建房间区域） */
    private createRoomTypeToggles(): void {
        if (!this.roomTypeToggleContainer || !this.roomTypeTogglePrefab) return;

        // 清除现有 Toggle
        this.roomTypeToggleContainer.removeAllChildren();

        const gameModeConfig = GAME_MODE_CONFIG[this._currentGameType];
        if (!gameModeConfig) return;

        const roomTypeEntries = Object.entries(gameModeConfig.roomTypes);

        roomTypeEntries.forEach(([roomTypeStr, config], index) => {
            const roomType = parseInt(roomTypeStr);
            const toggleNode = instantiate(this.roomTypeTogglePrefab);
            toggleNode.setParent(this.roomTypeToggleContainer);

            const label = toggleNode.getChildByName('Label')?.getComponent(Label);
            if (label) {
                label.string = config.name;
            }

            const toggle = toggleNode.getComponent(Toggle);
            if (toggle) {
                // 默认选中第一个
                toggle.isChecked = index === 0;
                toggle.node.on('toggle', () => {
                    if (toggle.isChecked) {
                        this._currentRoomType = roomType;
                        setCurrentRoomType(roomType);
                    }
                }, this);
            }
        });

        // 确保初始状态下 _currentRoomType 是第一个房间类型
        if (roomTypeEntries.length > 0) {
            const firstRoomType = parseInt(roomTypeEntries[0][0]);
            this._currentRoomType = firstRoomType;
            setCurrentRoomType(firstRoomType);
        }
    }

    /** 点击房间类型按钮 - 直接匹配对战 */
    private onRoomTypeButtonClicked(roomType: number): void {
        if (this.isLoading) return;
        this.isLoading = true;

        this._currentRoomType = roomType;
        setCurrentRoomType(roomType);
        this.sendQuickMatch();
    }

    private onBackClicked(): void {
        if (this.isLoading) return;
        this.isLoading = true;

        director.loadScene('MainMenu');
    }

    private onCreateRoomClicked(): void {
        // 切换创建房间区域显示
        this.createRoomAreaVisible = !this.createRoomAreaVisible;
        if (this.createRoomArea) {
            this.createRoomArea.active = this.createRoomAreaVisible;
        }
    }

    private onCloseCreateRoomClicked(): void {
        this.createRoomAreaVisible = false;
        if (this.createRoomArea) {
            this.createRoomArea.active = false;
        }
    }

    private onConfirmCreateClicked(): void {
        if (this.isLoading) return;

        // 检查房间类型是否开放
        const gameModeConfig = GAME_MODE_CONFIG[this._currentGameType];
        if (gameModeConfig) {
            const roomTypeConfig = gameModeConfig.roomTypes[this._currentRoomType];
            if (roomTypeConfig && !roomTypeConfig.isOpen) {
                this.showErrorTip('暂未开放');
                return;
            }
        }

        this.isLoading = true;

        // 隐藏创建房间区域
        if (this.createRoomArea) {
            this.createRoomArea.active = false;
        }
        this.createRoomAreaVisible = false;

        this.sendCreateRoom();
    }

    private sendCreateRoom(): void {
        // 使用保存的用户信息
        const userId = CURRENT_USER_ID;
        const nickname = CURRENT_USER_NAME;
        const roomType = CURRENT_ROOM_TYPE;
        const gameType = CURRENT_GAME_TYPE;
        // 创建房间
        this.wsManager.send(WsMessageType.ROOM_CREATE, {
            userId: userId,
            nickname: nickname,
            roomType: roomType,
            gameType: gameType
        });
    }

    /** 显示错误提示 */
    private showErrorTip(message: string): void {
        if (this.errorLabel) {
            this.errorLabel.node.active = true;
            this.errorLabel.string = message;

            this.scheduleOnce(() => {
                this.errorLabel.node.active = false;
            }, 2);
        }
    }

    private onJoinRoomClicked(): void {
        // 切换加入房间区域显示
        this.joinRoomAreaVisible = !this.joinRoomAreaVisible;
        if (this.joinRoomArea) {
            this.joinRoomArea.active = this.joinRoomAreaVisible;
        }
    }

    private onCloseJoinRoomClicked(): void {
        this.joinRoomAreaVisible = false;
        if (this.joinRoomArea) {
            this.joinRoomArea.active = false;
        }
    }

    private onConfirmJoinClicked(): void {
        if (this.isLoading) return;

        if (!this.roomIdInput) {
            this.showErrorTip('请输入房间号');
            return;
        }

        const inputStr = this.roomIdInput.string.trim();
        if (inputStr.length !== 6) {
            this.showErrorTip('房间号必须是6位数');
            return;
        }

        this.isLoading = true;

        // 隐藏加入房间区域
        if (this.joinRoomArea) {
            this.joinRoomArea.active = false;
        }
        this.joinRoomAreaVisible = false;

        this.sendJoinRoom(inputStr);
    }

    private sendJoinRoom(roomCode: string): void {
        // 清除房间号（防止下次进入时重复加入）
        setCurrentRoomCode('');
        this.wsManager.send(WsMessageType.ROOM_JOIN, {
            roomCode: roomCode,
            userId: CURRENT_USER_ID,
            nickname: CURRENT_USER_NAME
        });
    }

    /** 匹配对战 - 直接进入游戏桌（单人测试用） */
    private onMatchBattleClicked(): void {
        if (this.isLoading) return;
        this.isLoading = true;

        this.sendQuickMatch();
    }

    private sendQuickMatch(): void {
        this.wsManager.send(WsMessageType.ROOM_QUICK_MATCH, {
            userId: CURRENT_USER_ID,
            roomType: CURRENT_ROOM_TYPE,
            gameType: CURRENT_GAME_TYPE
        });
    }

    onDestroy(): void {
        // 清理监听器
        this.wsManager.off(WsMessageType.ROOM_CREATE, this.onRoomCreateHandler);
        this.wsManager.off(WsMessageType.ROOM_JOIN, this.onRoomJoinHandler);
        this.wsManager.off('connect', this.onConnectHandler);
        this.wsManager.off('error', this.onErrorHandler);
        this.wsManager.off(WsMessageType.ROOM_QUICK_MATCH, this.onQuickMatchHandler);

        if (this.backButton?.node) {
            this.backButton.node.off('click', this.onBackClicked, this);
        }
        if (this.createRoomButton?.node) {
            this.createRoomButton.node.off('click', this.onCreateRoomClicked, this);
        }
        if (this.joinRoomButton?.node) {
            this.joinRoomButton.node.off('click', this.onJoinRoomClicked, this);
        }
        if (this.confirmJoinButton?.node) {
            this.confirmJoinButton.node.off('click', this.onConfirmJoinClicked, this);
        }
        if (this.closeJoinRoomButton?.node) {
            this.closeJoinRoomButton.node.off('click', this.onCloseJoinRoomClicked, this);
        }
        if (this.closeCreateRoomButton?.node) {
            this.closeCreateRoomButton.node.off('click', this.onCloseCreateRoomClicked, this);
        }
        if (this.confirmCreateButton?.node) {
            this.confirmCreateButton.node.off('click', this.onConfirmCreateClicked, this);
        }
        if (this.matchBattleButton?.node) {
            this.matchBattleButton.node.off('click', this.onMatchBattleClicked, this);
        }
    }
}
