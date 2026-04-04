/**
 * 玩家信息视图 - 显示玩家名字、手牌数
 */

import { _decorator, Component, Label, Sprite, SpriteFrame } from 'cc';
import { resources } from 'cc';
import { Card } from '../core/Card';
import { Player } from '../shared/RoomManager';
import { EventBus, GameEvents } from '../shared/EventBus';

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
        if (this.nameLabel) {
            this.nameLabel.string = player.name;
        }
        console.log(`[PlayerInfoView] setPlayer id=${player.id}, hand.count=${player.hand.count}`);
        this.updateCardCount(player.hand.count);

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

    private onLandlordSelected(data: { playerId: number }): void {
        // 只有地主玩家设置 isLandlord = true，其他玩家保持 false
        // 注意：setPlayer 已经在开始时将 isLandlord 重置为 false
        if (data.playerId === this.playerId) {
            this.isLandlord = true;
        } else {
            this.isLandlord = false;
        }
        this.updateRoleLabel();
    }

    private updateRoleLabel(): void {
        if (this.roleLabel) {
            this.roleLabel.string = this.isLandlord ? '地主' : '农民';
        }
    }

    private onCardsPlayed(data: { playerId: number; cards: Card[]; remainingCounts?: number[] }): void {
        if (data.playerId === this.playerId) {
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
    }

    private onCardDealt(data: { playerId: number; count: number }): void {
        if (data.playerId === this.playerId) {
            this.updateCardCount(data.count);
        }
    }

    private onGameOver(): void {
        // 游戏结束时清空角色标签
        this.isLandlord = false;
        this.roleLabel.string = '';
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
