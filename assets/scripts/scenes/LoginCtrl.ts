/**
 * 登录场景控制器
 */

declare const wx: any;

import { _decorator, Component, EditBox, Button, Label } from 'cc';
import { director } from 'cc';
import { setCurrentUserId, setCurrentUserName, setCurrentUserAvatar } from '../shared/Constants';
import { loginByOpenid, checkUserExists } from '../shared/HttpClient';
import { AudioManager } from '../shared/AudioManager';

const { ccclass, property } = _decorator;

@ccclass('LoginCtrl')
export class LoginCtrl extends Component {
    @property(EditBox)
    accountEditBox: EditBox = null!;

    @property(Button)
    loginButton: Button = null!;

    @property(Label)
    statusLabel: Label = null!;

    @property(Button)
    clearCacheButton: Button = null!;

    private isLoading: boolean = false;

    start() {
        this.setupLoginButton();
        this.setupClearCacheButton();
    }

    private setupLoginButton(): void {
        if (this.loginButton) {
            this.loginButton.node.on(Button.EventType.CLICK, this.onLoginClicked, this);
        }
    }

    private setupClearCacheButton(): void {
        if (this.clearCacheButton) {
            this.clearCacheButton.node.on(Button.EventType.CLICK, this.onClearCacheClicked, this);
        }
    }

    private onClearCacheClicked(): void {
        // 清除微信 storage
        try {
            (wx as any).clearStorageSync();
            this.showStatus('缓存已清除');
        } catch (e) {
            this.showStatus('清除失败');
        }
    }

    private async onLoginClicked(): Promise<void> {
        if (this.isLoading) return;

        // 获取输入框文本
        let account = '';
        if (this.accountEditBox) {
            // Cocos Creator 3.x 中 EditBox 的文本通过 string 属性获取
            account = (this.accountEditBox as any).string?.trim() || '';
        }

        if (!account) {
            this.showStatus('请输入账号');
            return;
        }

        this.isLoading = true;
        this.showStatus('登录中...');
        if (this.loginButton) {
            this.loginButton.interactable = false;
        }

        try {
            // 先检查账号是否存在
            const checkResponse = await checkUserExists(account);

            if (!checkResponse.exists) {
                this.showStatus('账号不存在');
                return;
            }

            // 账号存在，执行登录
            const response = await loginByOpenid(account);

            if (response.success && response.data) {
                setCurrentUserId(response.data.id);
                setCurrentUserName(response.data.nickname || `玩家${account}`);
                setCurrentUserAvatar(response.data.avatar || '');
                director.loadScene('MainMenu');
            } else {
                this.showStatus(response.error || '登录失败');
            }
        } catch (error) {
            console.error('[Login] Error:', error);
            this.showStatus('网络错误或服务器未启动');
        } finally {
            this.isLoading = false;
            if (this.loginButton) {
                this.loginButton.interactable = true;
            }
        }
    }

    private showStatus(message: string): void {
        if (this.statusLabel) {
            this.statusLabel.string = message;
        }
    }

    onDestroy(): void {
        if (this.loginButton?.node) {
            this.loginButton.node.off(Button.EventType.CLICK, this.onLoginClicked, this);
        }
        if (this.clearCacheButton?.node) {
            this.clearCacheButton.node.off(Button.EventType.CLICK, this.onClearCacheClicked, this);
        }
    }
}
