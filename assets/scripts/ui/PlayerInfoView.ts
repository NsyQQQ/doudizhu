/**
 * 玩家信息视图 - 显示玩家名字、手牌数
 */

import { _decorator, Component, Label, Sprite, SpriteFrame, Color } from 'cc';
import { resources } from 'cc';
import { Card } from '../core/Card';
import { Player } from '../shared/RoomManager';
import { EventBus, GameEvents } from '../shared/EventBus';
import { CURRENT_PLAYER_INDEX } from '../shared/Constants';

const { ccclass, property } = _decorator;

@ccclass('PlayerInfoView')
export class PlayerInfoView extends Component {
    @property(Label)
    nameLabel: Label = null!;

    @property(Label)
    cardCountLabel: Label = null!;

    @property(Label)
    roleLabel: Label = null!;

    @property(Sprite)
    avatarSprite: Sprite = null!;

    private playerId: number = -1;
    private isLandlord: boolean = false;
    private isHiddenLandlord: boolean = false;
    private identityKnown: boolean = false;  // 身份是否已确定（暗地主选完后）
    private landlordCardId: number = -1;  // 地主选择的代表性地主牌ID
    private hiddenLandlordIds: number[] = [];  // 暗地主ID列表
    private isFarmerIdentityKnown: boolean = false;  // 农民身份是否已显示（出完牌后）

    // 存储绑定函数
    private boundOnGameStarted: () => void = null!;
    private boundOnGameDealt: () => void = null!;
    private boundOnLandlordSelected: (data: any) => void = null!;
    private boundOnCardsPlayed: (data: any) => void = null!;
    private boundOnCardDealt: (data: any) => void = null!;
    private boundOnGameOver: () => void = null!;

    start() {
        this.boundOnGameStarted = this.onGameStarted.bind(this);
        this.boundOnGameDealt = this.onGameDealt.bind(this);
        this.boundOnLandlordSelected = this.onLandlordSelected.bind(this);
        this.boundOnCardsPlayed = this.onCardsPlayed.bind(this);
        this.boundOnCardDealt = this.onCardDealt.bind(this);
        this.boundOnGameOver = this.onGameOver.bind(this);
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        EventBus.on(GameEvents.GAME_STARTED, this.boundOnGameStarted);
        EventBus.on(GameEvents.GAME_DEALT, this.boundOnGameDealt);
        EventBus.on(GameEvents.LANDLORD_SELECTED, this.boundOnLandlordSelected);
        EventBus.on(GameEvents.CARDS_PLAYED, this.boundOnCardsPlayed);
        EventBus.on(GameEvents.CARD_DEALT, this.boundOnCardDealt);
        EventBus.on(GameEvents.GAME_OVER, this.boundOnGameOver);
    }

    setPlayer(player: Player): void {
        this.playerId = player.id;
        // 不重置地主标志，等待 onLandlordSelected 或 onGameOver 来设置
        // 重置身份已知标志
        this.identityKnown = false;
        if (this.nameLabel) {
            this.nameLabel.string = player.name;
        }
        console.log(`[PlayerInfoView] setPlayer id=${player.id}, hand.count=${player.hand.count}`);
        this.updateCardCount(player.hand.count);
        this.updateRoleLabel();  // 初始化时显示"未知身份"

        // 加载玩家头像
        if (player.avatar && this.avatarSprite) {
            this.loadAvatar(player.avatar);
        }
    }

    /** 加载头像 */
    private loadAvatar(avatarName: string): void {
        const avatarPath = `avatar/${avatarName}/spriteFrame`;
        resources.load(avatarPath, SpriteFrame, (err: any, spriteFrame: SpriteFrame | null) => {
            if (err) {
                console.error('[PlayerInfoView] Load avatar failed:', err);
                return;
            }
            if (this.avatarSprite && spriteFrame) {
                this.avatarSprite.spriteFrame = spriteFrame;
            }
        });
    }

    private updateCardCount(count: number): void {
        console.log(`[PlayerInfoView] updateCardCount called with ${count}, label exists=${!!this.cardCountLabel}`);
        if (this.cardCountLabel) {
            this.cardCountLabel.string = `${count}张`;
        }
    }

    private onGameStarted(): void {
        // 不清空角色标签，等待地主确定后再显示
    }

    private onGameDealt(): void {
        // 不在这里重置，等待发牌动画
    }

    public onLandlordSelected(data: { playerId: number; hiddenLandlordIds?: number[]; landlordCardId?: number }): void {
        console.log(`[PlayerInfoView ${this.playerId}] onLandlordSelected called: data.playerId=${data.playerId}, hiddenIds=${JSON.stringify(data.hiddenLandlordIds)}`);
        const hiddenIds = data.hiddenLandlordIds || [];

        // 明地主：立即揭示身份（所有人都能看到明地主）
        if (data.playerId === this.playerId) {
            this.isLandlord = true;
            this.isHiddenLandlord = false;
            this.identityKnown = true;
            console.log(`[PlayerInfoView ${this.playerId}] 我是明地主，设置identityKnown=true`);
            this.updateRoleLabel();
            return;
        }

        // 非明地主：只有自己能看到自己的身份，其他玩家保持未知
        if (hiddenIds.length === 0) {
            // hiddenIds 为空，还在等待选择地主牌
            // 当前玩家（非明地主）可以确定自己不是地主
            if (this.playerId === CURRENT_PLAYER_INDEX) {
                this.isLandlord = false;
                this.isHiddenLandlord = false;
                this.identityKnown = true;
                console.log(`[PlayerInfoView ${this.playerId}] 我不是地主（非明地主），等待选择地主牌`);
                this.updateRoleLabel();
            }
            return;
        }

        // 如果自己在隐藏地主列表中，立即揭示身份（玩家永远知道自己的身份）
        if (hiddenIds.includes(this.playerId) && this.playerId === CURRENT_PLAYER_INDEX) {
            // 只有当这是你自己的视图时才立即揭示（你知道你自己是谁）
            this.isLandlord = false;
            this.isHiddenLandlord = true;
            this.identityKnown = true;
            console.log(`[PlayerInfoView ${this.playerId}] 我是暗地主，设置identityKnown=true`);
        } else if (this.playerId === CURRENT_PLAYER_INDEX) {
            // 自己不是暗地主：农民身份立即揭示
            this.isLandlord = false;
            this.isHiddenLandlord = false;
            this.identityKnown = true;
            console.log(`[PlayerInfoView ${this.playerId}] 我是农民，设置identityKnown=true`);
        } else {
            // 其他玩家：保持身份未知（你还不知道谁是农民谁是暗地主）
            this.isLandlord = false;
            this.isHiddenLandlord = false;
            this.identityKnown = false;
        }

        // 存储地主牌ID和暗地主ID
        if (data.landlordCardId !== undefined && data.landlordCardId > 0) {
            this.landlordCardId = data.landlordCardId;
        }
        this.hiddenLandlordIds = hiddenIds;
        this.updateRoleLabel();
        console.log(`[PlayerInfoView ${this.playerId}] updateRoleLabel called, roleLabel=${this.roleLabel?.string}`);
    }

    private updateRoleLabel(): void {
        if (this.roleLabel) {
            // 如果身份还未确定，显示"未知"
            if (!this.identityKnown) {
                this.roleLabel.string = '未知';
                this.roleLabel.color = new Color(128, 128, 128); // 灰色
            } else if (this.isLandlord) {
                this.roleLabel.string = '明地主';
                this.roleLabel.color = new Color(255, 0, 0); // 红色
            } else if (this.isHiddenLandlord) {
                this.roleLabel.string = '暗地主';
                this.roleLabel.color = new Color(255, 255, 0); // 黄色
            } else {
                this.roleLabel.string = '农民';
                this.roleLabel.color = new Color(0, 255, 0); // 绿色
            }
        }
    }

    private onCardsPlayed(data: { playerId: number; cards: Card[]; remainingCounts?: number[] }): void {
        const isMyAction = data.playerId === this.playerId;

        if (isMyAction) {
            // 如果服务器提供了 remainingCounts，直接使用
            if (data.remainingCounts) {
                const newCount = data.remainingCounts[this.playerId] ?? 0;
                console.log(`[PlayerInfoView ${this.playerId}] onCardsPlayed: remainingCounts=${JSON.stringify(data.remainingCounts)}, newCount=${newCount}`);
                this.updateCardCount(newCount);
            } else {
                // 否则回退到计算方式
                const currentStr = this.cardCountLabel?.string || '0';
                const current = parseInt(currentStr) || 0;
                const newCount = Math.max(0, current - data.cards.length);
                console.log(`[PlayerInfoView ${this.playerId}] onCardsPlayed: currentLabel="${currentStr}", ${data.playerId} played ${data.cards.length} cards, ${current} -> ${newCount}`);
                this.updateCardCount(newCount);
            }
        }

        // 检查是否需要揭示暗地主身份（任何人出牌时都可能揭示）
        this.checkRevealHiddenLandlord(data);

        // 如果是自己出牌，检查是否需要揭示农民身份
        if (isMyAction) {
            this.checkRevealFarmer(data);
        }
    }

    /** 检测是否需要揭示暗地主身份（其他玩家打出地主牌时） */
    private checkRevealHiddenLandlord(data: { playerId: number; cards: Card[]; remainingCounts?: number[] }): void {
        // 如果身份已经揭示，不需要再检测
        if (this.identityKnown) {
            return;
        }

        // 检查打出牌的玩家是不是在暗地主列表中
        // 注意：this.hiddenLandlordIds 存储了所有暗地主的ID
        if (!this.hiddenLandlordIds.includes(data.playerId)) {
            return;
        }

        // 检查是否打出了地主牌（比较花色+点数，而非卡牌ID）
        // 因为6人场有3副牌，暗地主出的可能不是同一张物理牌，但花色点数相同
        const landlordSuit = Math.floor((this.landlordCardId % 1000) / 13) % 4;
        const landlordRank = (this.landlordCardId % 13) + 3;
        for (const card of data.cards) {
            if (card.suit === landlordSuit && card.rank === landlordRank) {
                this.identityKnown = true;
                this.updateRoleLabel();
                console.log(`[PlayerInfoView] 玩家${data.playerId}打出了地主牌，${this.playerId}号的视图揭示身份`);
                return;
            }
        }
    }

    /** 检测是否需要揭示农民身份（自己出完所有牌时） */
    private checkRevealFarmer(data: { playerId: number; cards: Card[]; remainingCounts?: number[] }): void {
        // 只有当自己是农民且身份未知时，才检测是否需要揭示
        if (this.isLandlord || this.isHiddenLandlord || this.identityKnown) {
            return;
        }

        // 如果没有 remainingCounts，不揭示
        if (!data.remainingCounts) {
            return;
        }

        const remainingCount = data.remainingCounts[this.playerId];
        if (remainingCount === undefined || remainingCount < 0) {
            return;
        }

        // 农民出完了所有牌（剩余0张），揭示身份
        if (remainingCount === 0) {
            this.identityKnown = true;
            this.isFarmerIdentityKnown = true;
            this.updateRoleLabel();
            console.log(`[PlayerInfoView] 农民${this.playerId}出完了所有牌，揭示身份`);
        }
    }

    private onCardDealt(data: { playerId: number; count: number }): void {
        if (data.playerId === this.playerId) {
            this.updateCardCount(data.count);
        }
    }

    private onGameOver(): void {
        // 游戏结束时清空角色标签
        this.isLandlord = false;
        this.identityKnown = false;
        if (this.roleLabel) {
            this.roleLabel.string = '';
        }
    }

    isLandlordPlayer(): boolean {
        return this.isLandlord;
    }

    onDestroy(): void {
        EventBus.off(GameEvents.GAME_STARTED, this.boundOnGameStarted);
        EventBus.off(GameEvents.GAME_DEALT, this.boundOnGameDealt);
        EventBus.off(GameEvents.LANDLORD_SELECTED, this.boundOnLandlordSelected);
        EventBus.off(GameEvents.CARDS_PLAYED, this.boundOnCardsPlayed);
        EventBus.off(GameEvents.CARD_DEALT, this.boundOnCardDealt);
        EventBus.off(GameEvents.GAME_OVER, this.boundOnGameOver);
    }
}
