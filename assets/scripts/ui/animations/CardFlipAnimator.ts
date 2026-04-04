/**
 * 翻牌动画 - 用于揭示地主牌
 */

import { _decorator, Component, Node, tween, Vec3 } from 'cc';
import { Card } from '../../core/Card';
import { CardView } from '../CardView';

const { ccclass, property } = _decorator;

@ccclass('CardFlipAnimator')
export class CardFlipAnimator extends Component {
    /**
     * 播放翻牌动画
     * @param cardNode 要翻转的牌的节点
     * @param card 牌数据（可选）
     * @returns 动画完成
     */
    async flipAnimation(cardNode: Node, card?: Card): Promise<void> {
        return new Promise(resolve => {
            tween(cardNode)
                .to(0.2, { scale: new Vec3(0, 1, 1) })
                .call(() => {
                    const cardView = cardNode.getComponent(CardView);
                    if (cardView) {
                        if (card) {
                            cardView.setCard(card);
                        }
                        cardView.setFaceUp(true);
                    }
                })
                .to(0.2, { scale: new Vec3(1, 1, 1) })
                .call(() => resolve())
                .start();
        });
    }

    /**
     * 播放多张牌的翻牌动画（依次翻）
     * @param cardNodes 牌的节点数组
     * @param cards 牌数据数组（可选）
     */
    async flipCardsSequentially(cardNodes: Node[], cards?: Card[]): Promise<void> {
        for (let i = 0; i < cardNodes.length; i++) {
            await this.flipAnimation(cardNodes[i], cards ? cards[i] : undefined);
        }
    }

    /**
     * 同时翻转所有牌
     * @param cardNodes 牌的节点数组
     * @param cards 牌数据数组（可选）
     */
    async flipCardsAllAtOnce(cardNodes: Node[], cards?: Card[]): Promise<void> {
        const promises = cardNodes.map((node, i) => {
            return new Promise<void>(resolve => {
                tween(node)
                    .to(0.2, { scale: new Vec3(0, 1, 1) })
                    .call(() => {
                        const cardView = node.getComponent(CardView);
                        if (cardView) {
                            if (cards) {
                                cardView.setCard(cards[i]);
                            }
                            cardView.setFaceUp(true);
                        }
                    })
                    .to(0.2, { scale: new Vec3(1, 1, 1) })
                    .call(() => resolve())
                    .start();
            });
        });
        await Promise.all(promises);
    }
}
