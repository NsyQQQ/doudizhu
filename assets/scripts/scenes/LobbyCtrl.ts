/**
 * 大厅控制器 - 创建房间/加入房间
 */

import { _decorator, Component, Button, EditBox, Label } from 'cc';
import { director } from 'cc';
import { CURRENT_ROOM_TYPE, setCurrentRoomId, setCurrentRoomCode, setCurrentPlayerIndex, setCurrentRoomPlayers, setQuickMatchDealt, CURRENT_USER_ID, CURRENT_USER_NAME } from '../shared/Constants';
import { WebSocketManager, WsMessageType, WsConnectionState } from '../shared/WebSocketManager';
import { RoomManager } from '../shared/RoomManager';

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

    @property(Label)
    errorLabel: Label = null!;

    private roomManager: RoomManager = RoomManager.getInstance();
    private wsManager: WebSocketManager = WebSocketManager.getInstance();
    private isLoading: boolean = false;

    // 保存回调函数引用，用于清理
    private onConnectHandler: () => void = () => { };
    private onRoomCreateHandler: (data: any) => void = () => { };
    private onRoomJoinHandler: (data: any) => void = () => { };
    private onQuickMatchHandler: (data: any) => void = () => { };
    private onErrorHandler: (error: any) => void = () => { };

    start() {
        this.setupUI();
        this.setupMessageHandlers();
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
                // 根据房间类型进入不同场景
                const roomType = data.room.type || CURRENT_ROOM_TYPE;
                // 6人场 (roomType 3 和 5 都是6人) 使用 GameTable2
                const sceneName = (roomType === 5 || roomType === 3) ? 'GameTable2' : 'GameTable';
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

        // 匹配对战按钮
        if (this.matchBattleButton) {
            this.matchBattleButton.node.on('click', this.onMatchBattleClicked, this);
        }

        // 隐藏错误提示
        if (this.errorLabel) {
            this.errorLabel.node.active = false;
        }
    }

    private onBackClicked(): void {
        if (this.isLoading) return;
        this.isLoading = true;

        director.loadScene('MainMenu');
    }

    private onCreateRoomClicked(): void {
        if (this.isLoading) return;
        this.isLoading = true;

        this.sendCreateRoom();
    }

    private sendCreateRoom(): void {
        // 使用保存的用户信息
        const userId = CURRENT_USER_ID;
        const nickname = CURRENT_USER_NAME;
        const roomType = CURRENT_ROOM_TYPE;
        console.log('[LobbyCtrl] sendCreateRoom, roomType:', roomType, 'CURRENT_ROOM_TYPE:', CURRENT_ROOM_TYPE);
        // 创建房间
        this.wsManager.send(WsMessageType.ROOM_CREATE, {
            userId: userId,
            nickname: nickname,
            roomType: roomType
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

        this.sendJoinRoom(inputStr);
    }

    private sendJoinRoom(roomCode: string): void {
        this.wsManager.send(WsMessageType.ROOM_JOIN, {
            roomCode: roomCode,
            roomType: CURRENT_ROOM_TYPE,
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
            roomType: CURRENT_ROOM_TYPE
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
        if (this.matchBattleButton?.node) {
            this.matchBattleButton.node.off('click', this.onMatchBattleClicked, this);
        }
    }
}
