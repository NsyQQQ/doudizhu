/**
 * 主菜单控制器
 */

import { _decorator, Component, Button, Label, Color, Sprite, SpriteFrame, Node, Prefab, instantiate } from 'cc';
import { director, resources } from 'cc';
import { setCurrentGameType, setCurrentRoomType, setCurrentUserId, setCurrentUserName, setCurrentRoomCode, CURRENT_USER_ID, CURRENT_USER_NAME, CURRENT_USER_AVATAR } from '../shared/Constants';
import { WebSocketManager, WsMessageType } from '../shared/WebSocketManager';
import { RoomListItemCtrl } from './RoomListItemCtrl';

const { ccclass, property } = _decorator;

@ccclass('MainMenuCtrl')
export class MainMenuCtrl extends Component {
    @property(Button)
    button1: Button = null!;

    @property(Button)
    button2: Button = null!;

    @property(Button)
    button3: Button = null!;

    @property(Button)
    button4: Button = null!;

    @property(Button)
    button5: Button = null!;

    @property(Button)
    button6: Button = null!;

    @property(Label)
    userIdLabel: Label = null!;

    @property(Label)
    userNameLabel: Label = null!;

    @property(Label)
    statusLabel: Label = null!;

    @property(Sprite)
    avatarSprite: Sprite = null!;

    @property(Button)
    roomListButton: Button = null!;

    @property(Node)
    roomListArea: Node = null!;

    @property(Prefab)
    roomListItemPrefab: Prefab = null!;

    @property(Node)
    roomListContent: Node = null!;

    private isLoading: boolean = false;
    private wsManager: WebSocketManager = WebSocketManager.getInstance();
    private roomListVisible: boolean = false;
    private onRoomListHandler: (data: any) => void = () => { };

    start() {
        this.initUser();
        this.setupButtons();
        this.updateConnectionStatus();
        this.setAvatar();
        this.setupRoomList();
    }

    /** 设置房间列表 */
    private setupRoomList(): void {
        // 隐藏房间列表区域
        if (this.roomListArea) {
            this.roomListArea.active = false;
        }

        // 房间列表按钮
        if (this.roomListButton) {
            this.roomListButton.node.on('click', this.onRoomListButtonClicked, this);
        }

        // 监听房间列表响应
        this.onRoomListHandler = (data: any) => {
            if (data.success) {
                this.updateRoomList(data.rooms || []);
            } else {
                this.clearRoomList();
            }
        };
        this.wsManager.on(WsMessageType.ROOM_LIST, this.onRoomListHandler);
    }

    /** 房间列表按钮点击 */
    private onRoomListButtonClicked(): void {
        this.roomListVisible = !this.roomListVisible;

        if (this.roomListArea) {
            this.roomListArea.active = this.roomListVisible;
        }

        if (this.roomListVisible) {
            // 请求房间列表
            this.wsManager.getRoomList();
        }
    }

    /** 更新房间列表 */
    private updateRoomList(rooms: any[]): void {
        if (!this.roomListContent) return;

        // 清除现有列表
        this.roomListContent.removeAllChildren();

        // 创建房间列表项
        for (const room of rooms) {
            const item = instantiate(this.roomListItemPrefab);
            item.setParent(this.roomListContent);

            const ctrl = item.getComponent(RoomListItemCtrl);
            if (ctrl) {
                ctrl.setRoomData(room);
                ctrl.setOnJoinCallback((roomCode: string) => {
                    this.onJoinRoomFromList(roomCode);
                });
            }
        }
    }

    /** 清空房间列表 */
    private clearRoomList(): void {
        if (this.roomListContent) {
            this.roomListContent.removeAllChildren();
        }
    }

    /** 从房间列表加入房间 */
    private onJoinRoomFromList(roomCode: string): void {
        if (this.isLoading) return;
        this.isLoading = true;

        setCurrentRoomCode(roomCode);
        // 根据房间号跳转到 Lobby 场景，由 Lobby 处理加入房间逻辑
        director.loadScene('Lobby');
    }

    /** 更新连接状态显示 */
    private updateConnectionStatus(): void {
        this.updateStatusLabel();

        // 监听状态变化
        this.wsManager.on('stateChange', () => this.updateStatusLabel());
        this.wsManager.on('connect', () => this.updateStatusLabel());
        this.wsManager.on('disconnect', () => this.updateStatusLabel());
        this.wsManager.on('reconnectFailed', () => this.updateStatusLabel());
    }

    /** 更新状态标签文本和颜色 */
    private updateStatusLabel(): void {
        if (this.statusLabel) {
            const color = this.wsManager.getStateColor();
            this.statusLabel.string = `连接状态: ${this.wsManager.getStateText()}`;
            this.statusLabel.color = new Color(color.r, color.g, color.b);
        }
    }

    /** 设置头像 */
    private setAvatar(): void {
        if (!this.avatarSprite || !CURRENT_USER_AVATAR) return;

        const avatarPath = `avatar/${CURRENT_USER_AVATAR}/spriteFrame`;
        resources.load(avatarPath, SpriteFrame, (err: any, spriteFrame: SpriteFrame | null) => {
            if (err) {
                console.error('[MainMenu] Load avatar failed:', err);
                return;
            }
            if (this.avatarSprite && spriteFrame) {
                this.avatarSprite.spriteFrame = spriteFrame;
            }
        });
    }

    /** 初始化用户信息 */
    private initUser(): void {
        // 如果没有用户ID，生成一个
        if (CURRENT_USER_ID === 0) {
            const userId = Math.floor(Math.random() * 90000) + 10000;
            setCurrentUserId(userId);
        }

        // 如果没有用户名，设置默认值
        if (!CURRENT_USER_NAME) {
            setCurrentUserName(`玩家${CURRENT_USER_ID}`);
        }

        this.updateUserDisplay();
    }

    /** 更新用户信息显示 */
    private updateUserDisplay(): void {
        if (this.userIdLabel) {
            this.userIdLabel.string = `ID: ${CURRENT_USER_ID}`;
        }
        if (this.userNameLabel) {
            this.userNameLabel.string = CURRENT_USER_NAME;
        }
    }

    private setupButtons(): void {
        if (this.button1) {
            this.button1.node.on(Button.EventType.CLICK, () => this.onLobbyClicked(1), this);
        }
        if (this.button2) {
            this.button2.node.on(Button.EventType.CLICK, () => this.onLobbyClicked(2), this);
        }
        if (this.button3) {
            this.button3.node.on(Button.EventType.CLICK, () => this.onLobbyClicked(3), this);
        }
        if (this.button4) {
            this.button4.node.on(Button.EventType.CLICK, () => this.onLobbyClicked(4), this);
        }
        if (this.button5) {
            this.button5.node.on(Button.EventType.CLICK, () => this.onLobbyClicked(5), this);
        }
        if (this.button6) {
            this.button6.node.on(Button.EventType.CLICK, () => this.onLobbyClicked(6), this);
        }
    }

    private onLobbyClicked(gameType: number): void {
        if (this.isLoading) return;
        this.isLoading = true;

        setCurrentGameType(gameType);
        director.loadScene('Lobby');
    }

    onDestroy(): void {
        // 清理按钮事件
        if (this.button1?.node) {
            this.button1.node.off(Button.EventType.CLICK, () => this.onLobbyClicked(1), this);
        }
        if (this.button2?.node) {
            this.button2.node.off(Button.EventType.CLICK, () => this.onLobbyClicked(2), this);
        }
        if (this.button3?.node) {
            this.button3.node.off(Button.EventType.CLICK, () => this.onLobbyClicked(3), this);
        }
        if (this.button4?.node) {
            this.button4.node.off(Button.EventType.CLICK, () => this.onLobbyClicked(4), this);
        }
        if (this.button5?.node) {
            this.button5.node.off(Button.EventType.CLICK, () => this.onLobbyClicked(5), this);
        }
        if (this.button6?.node) {
            this.button6.node.off(Button.EventType.CLICK, () => this.onLobbyClicked(6), this);
        }

        // 清理房间列表按钮事件
        if (this.roomListButton?.node) {
            this.roomListButton.node.off('click', this.onRoomListButtonClicked, this);
        }

        // 清理 WebSocket 状态监听
        this.wsManager.off('stateChange', this.updateStatusLabel);
        this.wsManager.off('connect', this.updateStatusLabel);
        this.wsManager.off('disconnect', this.updateStatusLabel);
        this.wsManager.off('reconnectFailed', this.updateStatusLabel);

        // 清理房间列表监听
        this.wsManager.off(WsMessageType.ROOM_LIST, this.onRoomListHandler);
    }
}
