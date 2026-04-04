/**
 * 牌的视图组件 - 显示单张牌
 */

import { _decorator, Component, Sprite, Label, Node, Color } from 'cc';
import { Card, getCardDisplayChar, CardRank } from '../core/Card';

const { ccclass, property } = _decorator;

@ccclass('CardView')
export class CardView extends Component {
    @property(Sprite)
    cardSprite: Sprite = null!;

    @property(Node)
    faceUp: Node = null!;

    @property(Label)
    rankLabel: Label = null!;

    @property(Label)
    suitLabel1: Label = null!;

    @property(Label)
    suitLabel2: Label = null!;

    @property(Label)
    jokerLabel: Label = null!;

    private _card: Card | null = null;
    private _isSelected: boolean = false;
    private _originalY: number = 0;

    start() {
        this._originalY = this.node.position.y;
    }

    /** 设置牌数据 */
    setCard(card: Card): void {
        this._card = card;
        this.updateDisplay();
        this.setFaceUp(true);
    }

    /** 设置为背面 */
    setBack(): void {
        this._card = null;
        this.setFaceUp(false);
    }

    /** 是否显示正面 */
    setFaceUp(faceUp: boolean): void {
        // faceUp = 正面, cardSprite = 背面
        if (this.faceUp) this.faceUp.active = faceUp;
        if (this.cardSprite) this.cardSprite.node.active = !faceUp;

        if (!faceUp || !this._card) {
            // 隐藏所有标签
            if (this.rankLabel) this.rankLabel.node.active = false;
            if (this.suitLabel1) this.suitLabel1.node.active = false;
            if (this.suitLabel2) this.suitLabel2.node.active = false;
            if (this.jokerLabel) this.jokerLabel.node.active = false;
            return;
        }

        const isJoker = this._card.rank === CardRank.SMALL_JOKER || this._card.rank === CardRank.BIG_JOKER;

        if (isJoker) {
            // 大王小王显示jokerLabel
            if (this.jokerLabel) {
                this.jokerLabel.node.active = true;
            }
            if (this.rankLabel) this.rankLabel.node.active = false;
            if (this.suitLabel1) this.suitLabel1.node.active = false;
            if (this.suitLabel2) this.suitLabel2.node.active = false;
        } else {
            // 其他牌显示rankLabel和suitLabel
            if (this.rankLabel) {
                this.rankLabel.string = getCardDisplayChar(this._card.rank);
                this.rankLabel.node.active = true;
            }
            if (this.suitLabel1 && this.suitLabel2) {
                this.suitLabel1.string = this.suitLabel2.string = this.getSuitChar(this._card.suit);
                this.suitLabel1.node.active = true;
                this.suitLabel2.node.active = true;
            }
            if (this.jokerLabel) this.jokerLabel.node.active = false;
        }
    }

    /** 获取牌的显示字符 */
    private getSuitChar(suit: number): string {
        const suits = ['♠', '♥', '♣', '♦', '王'];
        return suits[suit] || '';
    }

    /** 更新显示 */
    private updateDisplay(): void {
        if (!this._card) return;

        const isJoker = this._card.rank === CardRank.SMALL_JOKER || this._card.rank === CardRank.BIG_JOKER;
        const isRedSuit = this._card.suit === 1 || this._card.suit === 3;

        if (this.rankLabel) {
            // 普通牌：红桃/方块红色，黑桃/梅花黑色
            if (!isJoker) {
                this.rankLabel.color = isRedSuit ? Color.RED : Color.BLACK;
            }
        }
        if (this.suitLabel1 && this.suitLabel2) {
            if (!isJoker) {
                this.suitLabel1.color = this.suitLabel2.color = isRedSuit ? Color.RED : Color.BLACK;
            }
        }
        if (this.jokerLabel) {
            // 大王红色，小王黑色
            if (isJoker) {
                this.jokerLabel.color = this._card.rank === CardRank.BIG_JOKER ? Color.RED : Color.BLACK;
            }
        }
    }

    /** 重置原始Y坐标（用于插入动画后） */
    resetOriginalY(): void {
        this._originalY = 0;
    }

    /** 设置选中状态 */
    setSelected(selected: boolean): void {
        this._isSelected = selected;
        if (this.node) {
            const currentX = this.node.position.x;
            const targetY = selected ? 20 : 0;
            this.node.setPosition(currentX, targetY);
        }
    }

    /** 是否选中 */
    isSelected(): boolean {
        return this._isSelected;
    }

    /** 获取牌数据 */
    getCard(): Card | null {
        return this._card;
    }

    /** 重置 */
    reset(): void {
        this._card = null;
        this._isSelected = false;
        this.setFaceUp(false);
        if (this.node) {
            this.node.setPosition(this.node.position.x, this._originalY);
        }
    }
}
