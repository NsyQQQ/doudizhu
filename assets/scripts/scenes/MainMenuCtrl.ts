/**
 * 主菜单控制器
 */

import { _decorator, Component, Button, Label, Color, Sprite, SpriteFrame, game } from 'cc';
import { director, resources } from 'cc';
import { setCurrentRoomType, setCurrentUserId, setCurrentUserName, CURRENT_USER_ID, CURRENT_USER_NAME, CURRENT_USER_AVATAR } from '../shared/Constants';
import { WebSocketManager } from '../shared/WebSocketManager';

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

    private isLoading: boolean = false;
    private wsManager: WebSocketManager = WebSocketManager.getInstance();

    start() {
        this.initUser();
        this.setupButtons();
        this.updateConnectionStatus();
        this.setAvatar();
        this.disableButtons();
    }

    /** 禁用指定按钮（置灰并不可点击） */
    private disableButton(button: Button): void {
        if (!button) return;
        button.interactable = false;
        // Button 通常使用子节点显示，需要遍历子节点找 Sprite
        const sprites = button.node.getComponentsInChildren(Sprite);
        for (const sprite of sprites) {
            sprite.grayscale = true;
        }
    }

    /** 禁用 btn2 btn3 btn4 btn6 */
    private disableButtons(): void {
        this.disableButton(this.button2);
        this.disableButton(this.button3);
        this.disableButton(this.button4);
        this.disableButton(this.button6);
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

    private onLobbyClicked(roomType: number): void {
        if (this.isLoading) return;
        this.isLoading = true;

        setCurrentRoomType(roomType);
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

        // 清理 WebSocket 状态监听
        this.wsManager.off('stateChange', this.updateStatusLabel);
        this.wsManager.off('connect', this.updateStatusLabel);
        this.wsManager.off('disconnect', this.updateStatusLabel);
        this.wsManager.off('reconnectFailed', this.updateStatusLabel);
    }
}
