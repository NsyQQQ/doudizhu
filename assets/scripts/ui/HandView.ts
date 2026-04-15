/**
 * 手牌视图 - 管理玩家的手牌和触摸选择
 */

import { _decorator, Component, Node, Prefab, instantiate, Button, tween, Vec3 } from 'cc';
import { Card, getCardDisplayChar } from '../core/Card';
import { Hand } from '../core/Hand';
import { CardView } from './CardView';
import { CardPlayAnimator } from './animations/CardPlayAnimator';
import { EventBus, GameEvents } from '../shared/EventBus';
import { PlayedCardsView } from './PlayedCardsView';

const { ccclass, property } = _decorator;

@ccclass('HandView')
export class HandView extends Component {
    @property(Prefab)
    cardPrefab: Prefab = null!;

    private cardNodes: Node[] = [];
    private selectedCards: Card[] = [];
    public hand: Hand | null = null;
    private isInteractive: boolean = true;

    private readonly CARD_SPACING = 47;
    private readonly CARD_WIDTH = 100;

    start() {
        EventBus.on(GameEvents.HINT_REQUESTED, this.onHintRequested.bind(this));
    }

    private onHintRequested(data: { cards: Card[] }): void {
        const idsToSelect = new Set(data.cards.map(c => c.id));
        // 清除之前的选中
        this.clearSelection();

        // 选中提示的所有牌
        if (!this.cardNodes || this.cardNodes.length === 0) {
            return;
        }

        for (const node of this.cardNodes) {
            const cv = node.getComponent(CardView);
            const card = cv?.getCard();
            if (card && idsToSelect.has(card.id)) {
                cv?.setSelected(true);
                if (!this.selectedCards.some(c => c.id === card.id)) {
                    this.selectedCards.push(card);
                }
            }
        }

        EventBus.emit(GameEvents.CARD_SELECTED, { cards: [...this.selectedCards] });  // 发送副本避免引用问题
    }

    /** 设置手牌数据 */
    setHand(hand: Hand): void {
        this.hand = hand;
        this.refreshDisplay();
    }

    /** 添加单张牌（用于发牌动画） */
    addCard(card: Card): void {
        if (!this.hand) {
            this.hand = new Hand([card]);
        } else {
            this.hand.addCards([card]);
        }
        this.createCardNode(card);
        this.layoutCards();
    }

    /** 插入单张牌并动画（保持降序排列） */
    addCardWithAnimation(card: Card): void {
        if (!this.hand) {
            this.hand = new Hand([card]);
        } else {
            this.hand.addCards([card]);
        }

        // 找到插入位置（保持降序）
        const insertIndex = this.findInsertIndex(card.rank);

        // 创建节点并插入
        const node = this.createCardNodeAt(card, insertIndex);

        // 从上方滑入动画（类似选牌偏移）
        const startY = 20;
        // 计算目标X位置
        const count = this.cardNodes.length + 1;
        const totalWidth = count * this.CARD_SPACING + (this.CARD_WIDTH - this.CARD_SPACING);
        const startX = -totalWidth / 2 + this.CARD_WIDTH / 2;
        const targetX = startX + insertIndex * this.CARD_SPACING;
        // 先设置初始位置在目标X，上方偏移
        node.setPosition(targetX, startY, 0);
        node.active = true;
        // 插入到数组
        this.cardNodes.splice(insertIndex, 0, node);
        node.setSiblingIndex(insertIndex);
        // 重置原始Y坐标
        const cardView = node.getComponent(CardView);
        if (cardView) {
            cardView.resetOriginalY();
        }
        // 动画排列所有牌
        this.animateLayoutWithNewCard(insertIndex);
    }

    /** 动画排列（带新插入的牌） */
    private animateLayoutWithNewCard(newCardIndex: number): void {
        const count = this.cardNodes.length;
        if (count === 0) return;

        const totalWidth = count * this.CARD_SPACING + (this.CARD_WIDTH - this.CARD_SPACING);
        const startX = -totalWidth / 2 + this.CARD_WIDTH / 2;

        // 1. 先让插入位置及之后的牌向右移动，空出位置
        for (let i = newCardIndex; i < this.cardNodes.length; i++) {
            const node = this.cardNodes[i];
            const targetX = startX + i * this.CARD_SPACING;
            const currentX = node.position.x;
            if (currentX !== targetX) {
                tween(node)
                    .to(0.1, { position: new Vec3(targetX, 0, 0) })
                    .start();
            }
        }

        // 2. 延迟100ms后，新插入的牌Y轴动画滑入
        this.scheduleOnce(() => {
            const newNode = this.cardNodes[newCardIndex];
            if (newNode) {
                const targetX = startX + newCardIndex * this.CARD_SPACING;
                // Y从20滑入到0
                tween(newNode)
                    .to(0.15, { position: new Vec3(targetX, 0, 0) })
                    .start();
            }
        }, 0.1);
    }

    /** 找到插入位置 */
    private findInsertIndex(rank: number): number {
        for (let i = 0; i < this.cardNodes.length; i++) {
            const cv = this.cardNodes[i].getComponent(CardView);
            const existingCard = cv?.getCard();
            if (existingCard && existingCard.rank <= rank) {
                return i;
            }
        }
        return this.cardNodes.length;
    }

    /** 在指定位置创建节点 */
    private createCardNodeAt(card: Card, index: number): Node {
        const node = instantiate(this.cardPrefab);
        node.setParent(this.node);

        const cardView = node.getComponent(CardView);
        if (cardView) {
            cardView.setCard(card);
        }

        let button = node.getComponent(Button);
        if (!button) {
            button = node.addComponent(Button);
        }
        button.clickEvents.push(this.createClickEvent(node, card));

        return node;
    }

    /** 动画排列 */
    private animateLayout(): void {
        const count = this.cardNodes.length;
        if (count === 0) return;

        const totalWidth = count * this.CARD_SPACING + (this.CARD_WIDTH - this.CARD_SPACING);
        const startX = -totalWidth / 2 + this.CARD_WIDTH / 2;

        for (let i = 0; i < this.cardNodes.length; i++) {
            const node = this.cardNodes[i];
            const targetX = startX + i * this.CARD_SPACING;
            // 重置原始Y坐标，避免插入的牌叠加偏移
            const cardView = node.getComponent(CardView);
            if (cardView) {
                cardView.resetOriginalY();
            }
            tween(node)
                .to(0.15, { position: new Vec3(targetX, 0, 0) })
                .start();
        }
    }

    /** 刷新显示 */
    refreshDisplay(): void {
        if (!this.hand) return;

        this.clearCards();

        const cards = this.hand.cards;
        

        for (const card of cards) {
            this.createCardNode(card);
        }

        this.layoutCards();
        
    }

    /** 创建牌节点 */
    private createCardNode(card: Card): void {
        if (!this.cardPrefab) return;

        const node = instantiate(this.cardPrefab);
        node.setParent(this.node);
        node.setPosition(0, 0, 0);

        const cardView = node.getComponent(CardView);
        if (cardView) {
            cardView.setCard(card);
        }

        // 确保有 Button 组件用于点击
        let button = node.getComponent(Button);
        if (!button) {
            button = node.addComponent(Button);
        }

        // 添加点击事件
        button.clickEvents.push(this.createClickEvent(node, card));

        this.cardNodes.push(node);
    }

    /** 创建点击事件 */
    private createClickEvent(node: Node, card: Card): any {
        const handler = new Component.EventHandler();
        handler.target = this.node;
        handler.component = 'HandView';
        handler.handler = 'onCardClicked';
        handler.customEventData = card.id.toString();
        return handler;
    }

    /** 卡片被点击 */
    public onCardClicked(event: any, customData: string): void {
        if (!this.isInteractive) return;

        const cardId = parseInt(customData);

        const card = this.hand?.cards.find(c => c.id === cardId);
        if (!card) return;

        // 打印当前选择的手牌
        const currentSelected = [...this.selectedCards];
        if (!currentSelected.some(c => c.id === cardId)) {
            currentSelected.push(card);
        }
        const cardChars = currentSelected.map(c => getCardDisplayChar(c.rank)).join('');

        const isAlreadySelected = this.selectedCards.some(c => c.id === cardId);

        if (isAlreadySelected) {
            this.selectedCards = this.selectedCards.filter(c => c.id !== cardId);
            const node = this.cardNodes.find(n => {
                const cv = n.getComponent(CardView);
                return cv?.getCard()?.id === cardId;
            });
            if (node) {
                const cv = node.getComponent(CardView);
                if (cv) cv.setSelected(false);
            }
        } else {
            this.selectedCards.push(card);
            const node = this.cardNodes.find(n => {
                const cv = n.getComponent(CardView);
                return cv?.getCard()?.id === cardId;
            });
            if (node) {
                const cv = node.getComponent(CardView);
                if (cv) cv.setSelected(true);
            }
        }

        EventBus.emit(GameEvents.CARD_SELECTED, { cards: [...this.selectedCards] });  // 发送副本避免引用问题
    }

    /** 清除所有牌 */
    private clearCards(): void {
        if (!this.cardNodes || this.cardNodes.length === 0) return;
        for (const node of this.cardNodes) {
            node.destroy();
        }
        this.cardNodes = [];
        this.selectedCards = [];
    }

    /** 排列手牌 */
    private layoutCards(): void {
        const count = this.cardNodes.length;
        if (count === 0) return;

        const totalWidth = count * this.CARD_SPACING + (this.CARD_WIDTH - this.CARD_SPACING);
        const startX = -totalWidth / 2 + this.CARD_WIDTH / 2;

        for (let i = 0; i < this.cardNodes.length; i++) {
            const node = this.cardNodes[i];
            const x = startX + i * this.CARD_SPACING;
            node.setPosition(x, 0, 0);
        }
    }

    /** 获取选中的牌 */
    getSelectedCards(): Card[] {
        return [...this.selectedCards];
    }

    /** 清除选择 */
    clearSelection(): void {
        if (!this.cardNodes || this.cardNodes.length === 0) return;
        for (const node of this.cardNodes) {
            const cardView = node.getComponent(CardView);
            if (cardView) {
                cardView.setSelected(false);
            }
        }
        this.selectedCards = [];
    }

    /** 设置是否可交互 */
    setInteractive(interactive: boolean): void {
        this.isInteractive = interactive;
        if (!this.cardNodes || this.cardNodes.length === 0) return;
        for (const node of this.cardNodes) {
            const button = node.getComponent(Button);
            if (button) {
                button.interactable = interactive;
            }
        }
    }

    /** 移除指定的牌 */
    removeCards(cards: Card[]): void {
        if (!this.hand) return;

        this.hand.removeCards(cards);
        this.refreshDisplay();
    }

    /** 播放出牌动画并移除牌 */
    async playCardsAndRemove(cards: Card[], targetPos: Vec3): Promise<void> {
        if (!this.hand || cards.length === 0) return;

        // 找到要出的牌的节点
        const cardIds = new Set(cards.map(c => c.id));
        const playNodes: Node[] = [];

        for (const node of this.cardNodes) {
            const cv = node.getComponent(CardView);
            const card = cv?.getCard();
            if (card && cardIds.has(card.id)) {
                playNodes.push(node);
            }
        }

        if (playNodes.length === 0) return;

        // 获取 CardPlayAnimator
        const animator = this.node.getComponent(CardPlayAnimator);
        if (animator) {
            // 播放动画
            await animator.playAnimation(playNodes, targetPos);
        }

        // 动画完成后从手牌移除
        this.hand.removeCards(cards);
        this.refreshDisplay();
    }

    /** 隐藏最后N张牌 */
    hideLastCards(count: number): void {
        const startIndex = this.cardNodes.length - count;
        for (let i = startIndex; i < this.cardNodes.length; i++) {
            if (this.cardNodes[i]) {
                this.cardNodes[i].active = false;
            }
        }
    }

    /** 根据rank隐藏牌 */
    hideCardsByRanks(ranks: number[]): void {
        const rankSet = new Set(ranks);
        for (const node of this.cardNodes) {
            const cv = node.getComponent(CardView);
            const card = cv?.getCard();
            if (card && rankSet.has(card.rank)) {
                node.active = false;
            }
        }
    }

    /** 根据id隐藏牌 */
    hideCardsByIds(ids: number[]): void {
        const idSet = new Set(ids);
        for (const node of this.cardNodes) {
            const cv = node.getComponent(CardView);
            const card = cv?.getCard();
            if (card && idSet.has(card.id)) {
                node.active = false;
            }
        }
    }

    /** 根据rank播放牌的Y轴动画 */
    animateCardsByRanks(ranks: number[], startY: number): Promise<void> {
        const rankSet = new Set(ranks);
        const totalWidth = this.cardNodes.length * this.CARD_SPACING + (this.CARD_WIDTH - this.CARD_SPACING);
        const startX = -totalWidth / 2 + this.CARD_WIDTH / 2;

        // 先设置初始位置并显示
        for (let i = 0; i < this.cardNodes.length; i++) {
            const node = this.cardNodes[i];
            const cv = node.getComponent(CardView);
            const card = cv?.getCard();
            if (card && rankSet.has(card.rank)) {
                const targetX = startX + i * this.CARD_SPACING;
                node.setPosition(targetX, startY, 0);
                node.active = true;
                if (cv) {
                    cv.resetOriginalY();
                }
            }
        }

        // 等待下一帧动画
        return new Promise(resolve => {
            this.scheduleOnce(() => {
                for (let i = 0; i < this.cardNodes.length; i++) {
                    const node = this.cardNodes[i];
                    const cv = node.getComponent(CardView);
                    const card = cv?.getCard();
                    if (card && rankSet.has(card.rank)) {
                        const targetX = startX + i * this.CARD_SPACING;
                        tween(node)
                            .to(0.15, { position: new Vec3(targetX, 0, 0) })
                            .start();
                    }
                }
                this.scheduleOnce(resolve, 0.15);
            }, 0.01);
        });
    }

    /** 根据id播放牌的Y轴动画 */
    animateCardsByIds(ids: number[], startY: number): Promise<void> {
        const idSet = new Set(ids);
        const totalWidth = this.cardNodes.length * this.CARD_SPACING + (this.CARD_WIDTH - this.CARD_SPACING);
        const startX = -totalWidth / 2 + this.CARD_WIDTH / 2;

        // 先设置初始位置并显示
        for (let i = 0; i < this.cardNodes.length; i++) {
            const node = this.cardNodes[i];
            const cv = node.getComponent(CardView);
            const card = cv?.getCard();
            if (card && idSet.has(card.id)) {
                const targetX = startX + i * this.CARD_SPACING;
                node.setPosition(targetX, startY, 0);
                node.active = true;
                if (cv) {
                    cv.resetOriginalY();
                }
            }
        }

        // 等待下一帧动画
        return new Promise(resolve => {
            this.scheduleOnce(() => {
                for (let i = 0; i < this.cardNodes.length; i++) {
                    const node = this.cardNodes[i];
                    const cv = node.getComponent(CardView);
                    const card = cv?.getCard();
                    if (card && idSet.has(card.id)) {
                        const targetX = startX + i * this.CARD_SPACING;
                        tween(node)
                            .to(0.15, { position: new Vec3(targetX, 0, 0) })
                            .start();
                    }
                }
                this.scheduleOnce(resolve, 0.15);
            }, 0.01);
        });
    }
}
