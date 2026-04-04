/**
 * 出牌动画
 */

import { _decorator, Component, Node, Vec3, tween } from 'cc';
import { Card } from '../../core/Card';

const { ccclass, property } = _decorator;

@ccclass('CardPlayAnimator')
export class CardPlayAnimator extends Component {
    @property(Node)
    playAreaCenter: Node = null!;

    private playAreaPos: Vec3 = new Vec3(0, 0);

    start() {
        if (this.playAreaCenter) {
            this.playAreaPos = this.playAreaCenter.position.clone();
        }
    }

    /**
     * 播放出牌动画
     * @param cardNodes 要出的牌的节点数组
     * @param targetPos 目标位置（出牌区域中心）
     * @returns 动画完成后的回调
     */
    async playAnimation(cardNodes: Node[], targetPos: Vec3): Promise<void> {
        const promises: Promise<void>[] = [];

        // 每张牌的偏移量（扇形展开）
        const spacing = 50;
        const startX = -(cardNodes.length - 1) * spacing / 2;

        for (let i = 0; i < cardNodes.length; i++) {
            const node = cardNodes[i];
            const offsetX = startX + i * spacing;
            const pos = new Vec3(
                targetPos.x + offsetX,
                targetPos.y,
                0
            );

            const promise = new Promise<void>(resolve => {
                tween(node)
                    .to(0.2, { position: pos })
                    .call(() => resolve())
                    .start();
            });

            promises.push(promise);
        }

        await Promise.all(promises);
    }

    /**
     * 单张牌快速飞向目标
     */
    async playSingleCard(node: Node, targetPos: Vec3): Promise<void> {
        return new Promise(resolve => {
            tween(node)
                .to(0.15, { position: targetPos })
                .call(() => resolve())
                .start();
        });
    }
}
