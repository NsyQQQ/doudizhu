/**
 * 玩家信息视图 - 显示玩家名字、手牌数、身份
 *
 * 身份显示规则（6人场）：
 * - 明地主：所有人立即看到，显示"地主"
 * - 暗地主：自己立即知道；其他玩家等其出地主牌后显示"暗地主"
 * - 农民：所有人等其出完牌后显示"农民"
 */

import { _decorator, Component, Label, Sprite, SpriteFrame, Color } from 'cc';
import { resources } from 'cc';
import { Player } from '../shared/RoomManager';
import { EventBus, GameEvents } from '../shared/EventBus';
import { CURRENT_PLAYER_INDEX } from '../shared/Constants';

const { ccclass, property } = _decorator;

/** 单个玩家的身份信息 */
interface PlayerIdentity {
    isLandlord: boolean;
    isHiddenLandlord: boolean;
    identityKnown: boolean;
}

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

    /** 当前视图对应的玩家ID */
    private playerId: number = -1;
    /** 所有人身份信息 Map<playerId, identity> */
    private identities: Map<number, PlayerIdentity> = new Map();
    /** 暗地主ID列表 */
    private hiddenLandlordIds: number[] = [];

    // 绑定函数
    private boundOnLandlordSelected: (data: any) => void = null!;
    private boundOnCardsPlayed: (data: any) => void = null!;
    private boundOnCardDealt: (data: any) => void = null!;
    private boundOnGameOver: () => void = null!;
    private boundOnHiddenLandlordRevealed: (data: { playerId: number }) => void = null!;
    private boundOnFarmerRevealed: (data: { playerId: number }) => void = null!

    start() {
        this.boundOnLandlordSelected = this.onLandlordSelected.bind(this);
        this.boundOnCardsPlayed = this.onCardsPlayed.bind(this);
        this.boundOnCardDealt = this.onCardDealt.bind(this);
        this.boundOnGameOver = this.onGameOver.bind(this);
        this.boundOnHiddenLandlordRevealed = this.onHiddenLandlordRevealed.bind(this);
        this.boundOnFarmerRevealed = this.onFarmerRevealed.bind(this);
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        EventBus.on(GameEvents.LANDLORD_SELECTED, this.boundOnLandlordSelected);
        EventBus.on(GameEvents.CARDS_PLAYED, this.boundOnCardsPlayed);
        EventBus.on(GameEvents.CARD_DEALT, this.boundOnCardDealt);
        EventBus.on(GameEvents.GAME_OVER, this.boundOnGameOver);
        EventBus.on(GameEvents.HIDDEN_LANDLORD_REVEALED, this.boundOnHiddenLandlordRevealed);
        EventBus.on(GameEvents.FARMER_REVEAL, this.boundOnFarmerRevealed);
    }

    setPlayer(player: Player): void {
        this.playerId = player.id;
        this.identities.clear();
        this.identities.set(player.id, { isLandlord: false, isHiddenLandlord: false, identityKnown: false });
        if (this.nameLabel) {
            this.nameLabel.string = player.name;
        }
        this.updateCardCount(player.hand.count);
        this.updateRoleLabel();
        if (player.avatar && this.avatarSprite) {
            this.loadAvatar(player.avatar);
        }
    }

    private loadAvatar(avatarName: string): void {
        const avatarPath = `avatar/${avatarName}/spriteFrame`;
        resources.load(avatarPath, SpriteFrame, (err: any, spriteFrame: SpriteFrame | null) => {
            if (err || !this.avatarSprite || !spriteFrame) return;
            this.avatarSprite.spriteFrame = spriteFrame;
        });
    }

    private updateCardCount(count: number): void {
        if (this.cardCountLabel) {
            this.cardCountLabel.string = `${count}张`;
        }
    }

    /** 获取当前玩家的身份信息 */
    private getMyIdentity(): PlayerIdentity {
        return this.identities.get(this.playerId) ?? { isLandlord: false, isHiddenLandlord: false, identityKnown: false };
    }

    public onLandlordSelected(data: {
        playerId: number;
        hiddenLandlordIds?: number[];
    }): void {
        this.hiddenLandlordIds = (data.hiddenLandlordIds || []).map(id => Number(id));

        // 明地主：所有人都能看到
        const landlordId = data.playerId;
        this.identities.set(landlordId, { isLandlord: true, isHiddenLandlord: false, identityKnown: true });

        // 自己（非明地主）的身份
        if (this.playerId !== landlordId) {
            if (this.playerId === CURRENT_PLAYER_INDEX) {
                // 自己：如果在暗地主列表，立即揭示为暗地主，否则揭示为农民
                if (this.hiddenLandlordIds.some(id => id === this.playerId)) {
                    this.identities.set(this.playerId, { isLandlord: false, isHiddenLandlord: true, identityKnown: true });
                } else {
                    this.identities.set(this.playerId, { isLandlord: false, isHiddenLandlord: false, identityKnown: true });
                }
            } else {
                // 其他玩家（非明地主）：身份未知，等待触发
                this.identities.set(this.playerId, { isLandlord: false, isHiddenLandlord: false, identityKnown: false });
            }
        }

        this.updateRoleLabel();
    }

    private updateRoleLabel(): void {
        if (!this.roleLabel) return;
        const identity = this.getMyIdentity();

        if (!identity.identityKnown) {
            this.roleLabel.string = '未知';
            this.roleLabel.color = new Color(128, 128, 128);
        } else if (identity.isLandlord) {
            this.roleLabel.string = '地主';
            this.roleLabel.color = new Color(255, 0, 0);
        } else if (identity.isHiddenLandlord) {
            this.roleLabel.string = '暗地主';
            this.roleLabel.color = new Color(255, 255, 0);
        } else {
            this.roleLabel.string = '农民';
            this.roleLabel.color = new Color(0, 255, 0);
        }
    }

    private onCardsPlayed(data: { playerId: number; remainingCounts?: number[] }): void {
        const { playerId, remainingCounts } = data;
        const isMyAction = playerId === this.playerId;

        // 更新自己手牌数
        if (isMyAction) {
            const count = remainingCounts ? (remainingCounts[this.playerId] ?? 0) : -1;
            if (count >= 0) {
                this.updateCardCount(count);
            }
        }
    }

    /** 其他玩家揭示为暗地主（事件触发，所有视图统一处理） */
    private onHiddenLandlordRevealed(data: { playerId: number }): void {
        const revealedId = data.playerId;
        // 已经知道身份的不处理
        const existing = this.identities.get(revealedId);
        if (existing?.identityKnown) return;
        this.identities.set(revealedId, { isLandlord: false, isHiddenLandlord: true, identityKnown: true });
        // 只有当前视图对应的玩家被揭示时，才更新自己的显示
        if (revealedId === this.playerId) {
            this.updateRoleLabel();
        }
    }

    /** 农民出完牌揭示（事件触发） */
    private onFarmerRevealed(data: { playerId: number }): void {
        const revealedId = data.playerId;
        const existing = this.identities.get(revealedId);
        if (existing?.identityKnown) return;
        // 只有非地主、非暗地主的才能被揭示为农民
        if (existing?.isLandlord || existing?.isHiddenLandlord) return;
        this.identities.set(revealedId, { isLandlord: false, isHiddenLandlord: false, identityKnown: true });
        if (revealedId === this.playerId) {
            this.updateRoleLabel();
        }
    }

    private onCardDealt(data: { playerId: number; count: number }): void {
        if (data.playerId === this.playerId) {
            this.updateCardCount(data.count);
        }
    }

    private onGameOver(): void {
        this.identities.clear();
        if (this.roleLabel) {
            this.roleLabel.string = '';
        }
    }

    isLandlordPlayer(): boolean {
        return this.getMyIdentity().isLandlord;
    }

    /** 直接设置身份（不经过setPlayer，避免被重置） */
    public setLandlordIdentity(isLandlord: boolean): void {
        this.identities.set(this.playerId, { isLandlord, isHiddenLandlord: false, identityKnown: true });
        this.updateRoleLabel();
    }

    onDestroy(): void {
        EventBus.off(GameEvents.LANDLORD_SELECTED, this.boundOnLandlordSelected);
        EventBus.off(GameEvents.CARDS_PLAYED, this.boundOnCardsPlayed);
        EventBus.off(GameEvents.CARD_DEALT, this.boundOnCardDealt);
        EventBus.off(GameEvents.GAME_OVER, this.boundOnGameOver);
        EventBus.off(GameEvents.HIDDEN_LANDLORD_REVEALED, this.boundOnHiddenLandlordRevealed);
        EventBus.off(GameEvents.FARMER_REVEAL, this.boundOnFarmerRevealed);
    }
}
