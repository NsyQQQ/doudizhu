/**
 * 玩家信息项控制器 - 用于房间内的玩家信息展示
 */

import { _decorator, Component, Sprite, Label, SpriteFrame } from 'cc';
import { resources } from 'cc';

/** 玩家信息数据结构 */
export interface PlayerInfoItem {
    id: number;
    name: string;
    avatar: string;
    isReady: boolean;
    isHost: boolean;
    isAI: boolean;
    isEmpty?: boolean;  // 空位标记
}

const { ccclass, property } = _decorator;

@ccclass('PlayerInfoItemCtrl')
export class PlayerInfoItemCtrl extends Component {
    @property(Sprite)
    avatar: Sprite = null!;

    @property(Label)
    nameLabel: Label = null!;

    @property(Label)
    statusLabel: Label = null!;

    private playerInfo: PlayerInfoItem | null = null;

    /** 更新玩家信息显示 */
    updatePlayerInfo(info: PlayerInfoItem): void {
        this.playerInfo = info;

        if (this.nameLabel) {
            this.nameLabel.string = info.isEmpty ? '等待加入' : info.name;
        }

        if (this.statusLabel) {
            if (info.isEmpty) {
                this.statusLabel.string = '空位';
            } else if (info.isHost) {
                this.statusLabel.string = '房主';
            } else if (info.isReady) {
                this.statusLabel.string = '已准备';
            } else {
                this.statusLabel.string = '未准备';
            }
        }

        if (!info.isEmpty && info.avatar && this.avatar) {
            this.loadAvatar(info.avatar);
        }
    }

    /** 加载头像 */
    private loadAvatar(avatarName: string): void {
        const avatarPath = `avatar/${avatarName}/spriteFrame`;
        resources.load(avatarPath, SpriteFrame, (err: any, spriteFrame: SpriteFrame | null) => {
            if (err) {
                console.error('[PlayerInfoItem] Load avatar failed:', err);
                return;
            }
            if (this.avatar && spriteFrame) {
                this.avatar.spriteFrame = spriteFrame;
            }
        });
    }

    /** 显示准备状态 */
    setReady(ready: boolean): void {
        if (this.playerInfo) {
            this.playerInfo.isReady = ready;
        }
        if (this.statusLabel && this.playerInfo && !this.playerInfo.isHost) {
            this.statusLabel.string = ready ? '已准备' : '未准备';
        }
    }

    /** 获取玩家信息 */
    getPlayerInfo(): PlayerInfoItem | null {
        return this.playerInfo;
    }
}
