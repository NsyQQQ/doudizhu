/**
 * 发牌动画
 */

import { _decorator, Component, Node, Vec3, tween, Prefab, instantiate } from 'cc';
import { Card } from '../../core/Card';
import { CardView } from '../CardView';
import { CardFlipAnimator } from './CardFlipAnimator';
import { EventBus, GameEvents } from '../../shared/EventBus';

const { ccclass, property } = _decorator;

@ccclass('DealCardsAnimator')
export class DealCardsAnimator extends Component {
    @property(Prefab)
    cardPrefab: Prefab = null!;

    /** 发牌延迟（毫秒） */
    @property
    dealDelay: number = 50;

    /** 发完牌后的回调 */
    private onComplete: (() => void) | null = null;

    /** 是否已销毁，防止切换场景后动画继续执行 */
    private _isDestroyed: boolean = false;

    // 6个玩家位置（逆时针：下、左下、左、左上、右上、右）
    private playerPositions6: Vec3[] = [
        new Vec3(0, -275, 0),    // 位置0：下方（自己）
        new Vec3(-580, 100, 0), // 位置1：左边
        new Vec3(-400, 270, 0),    // 位置2：左上
        new Vec3(0, 270, 0),  // 位置3：上方
        new Vec3(400, 270, 0),   // 位置4：右上
        new Vec3(580, 100, 0),     // 位置5：右边
    ];

    // 3个玩家位置（下方、左边、右边）
    private playerPositions3: Vec3[] = [
        new Vec3(0, -275, 0),   // 下方玩家
        new Vec3(-580, 50, 0),   // 左边玩家
        new Vec3(580, 50, 0),    // 右边玩家
    ];

    /**
     * 播放发牌动画
     * @param cards 要发的牌数组
     * @param delay 每张牌的延迟（毫秒）
     * @param onComplete 动画完成回调
     * @param playerCount 玩家数量（默认3，6人场传6）
     */
    playDealAnimation(cards: Card[], delay: number, onComplete: () => void, playerCount: number = 3): void {
        this.onComplete = onComplete;

        const centerPos = new Vec3(0, 0, 0);
        const positions = playerCount === 6 ? this.playerPositions6 : this.playerPositions3;

        let dealIndex = 0;
        const totalCards = cards.length;
        const playerCardCounts = new Array(playerCount).fill(0);

        const dealOne = () => {
            if (this._isDestroyed) return;

            if (dealIndex >= totalCards) {
                // 动画结束
                if (this.onComplete) {
                    this.onComplete();
                }
                return;
            }

            if (!this.cardPrefab) {
                this._isDestroyed = true;
                return;
            }

            const playerIdx = dealIndex % playerCount;
            playerCardCounts[playerIdx]++;

            // 创建发牌节点
            const node = instantiate(this.cardPrefab);
            node.setParent(this.node);
            node.setPosition(centerPos);
            node.setScale(0.2, 0.2, 0.2);

            const cardView = node.getComponent(CardView);
            if (cardView) {
                cardView.setBack();  // 显示背面
            }

            // 动画移动到目标位置，缩放从0.2到1
            tween(node)
                .to(0.1, { position: positions[playerIdx], scale: new Vec3(1, 1, 1) })
                .call(() => {
                    node.destroy();
                    dealIndex++;
                    // 触发发牌事件，通知玩家信息更新手牌数
                    EventBus.emit(GameEvents.CARD_DEALT, { playerId: playerIdx, count: playerCardCounts[playerIdx] });
                    setTimeout(dealOne, delay);
                })
                .start();
        };

        dealOne();
    }

    /**
     * 播放统一翻牌动画（所有牌同时翻面）
     * @param cardNodes 要翻转的牌的节点数组
     * @param cards 对应的牌数据
     */
    flipAllCards(cardNodes: Node[], cards: Card[]): void {
        const flipAnimator = this.node.getComponent(CardFlipAnimator) as CardFlipAnimator | null;
        if (flipAnimator) {
            // 使用 CardFlipAnimator 逐张翻转
            flipAnimator.flipCardsSequentially(cardNodes as any, cards);
        }
    }

    onDestroy(): void {
        this._isDestroyed = true;
    }
}
