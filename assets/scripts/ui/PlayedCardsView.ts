/**
 * 已出牌视图 - 显示各玩家最近出的牌
 */

import { _decorator, Component, Node, Prefab, instantiate, Label } from 'cc';
import { Card, CardPatternType } from '../core/Card';
import { CardView } from './CardView';
import { CardPatternRecognizer } from '../core/CardPattern';
import { CardPatternRecognizer2, CardPatternType2 } from '../core/CardPattern2';
import { EventBus, GameEvents } from '../shared/EventBus';
import { CURRENT_PLAYER_INDEX, CURRENT_ROOM_TYPE, ROOM_PLAYER_COUNTS } from '../shared/Constants';

const { ccclass, property } = _decorator;

@ccclass('PlayedCardsView')
export class PlayedCardsView extends Component {
    @property(Prefab)
    cardPrefab: Prefab = null!;

    @property(Node)
    bottomArea: Node = null!;

    @property(Node)
    leftArea: Node = null!;

    @property(Node)
    rightArea: Node = null!;

    @property(Node)
    topLeftArea: Node = null!;

    @property(Node)
    topArea: Node = null!;

    @property(Node)
    topRightArea: Node = null!;

    @property(Label)
    bottomLabel: Label = null!;

    @property(Label)
    leftLabel: Label = null!;

    @property(Label)
    rightLabel: Label = null!;

    @property(Label)
    topLeftLabel: Label = null!;

    @property(Label)
    topLabel: Label = null!;

    @property(Label)
    topRightLabel: Label = null!;

    private areaNodes: Map<number, Node[]> = new Map();

    // 存储绑定函数
    private boundOnCardsPlayed: (data: any) => void = null!;
    private boundOnPlayerPassed: (data: any) => void = null!;
    private boundOnRoundCleared: () => void = null!;

    start() {
        // 初始化所有Label为空文本
        if (this.bottomLabel) this.bottomLabel.string = '';
        if (this.leftLabel) this.leftLabel.string = '';
        if (this.rightLabel) this.rightLabel.string = '';
        if (this.topLeftLabel) this.topLeftLabel.string = '';
        if (this.topLabel) this.topLabel.string = '';
        if (this.topRightLabel) this.topRightLabel.string = '';

        this.boundOnCardsPlayed = this.onCardsPlayed.bind(this);
        this.boundOnPlayerPassed = this.onPlayerPassed.bind(this);
        this.boundOnRoundCleared = this.onRoundCleared.bind(this);
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        EventBus.on(GameEvents.CARDS_PLAYED, this.boundOnCardsPlayed);
        EventBus.on(GameEvents.PLAYER_PASSED, this.boundOnPlayerPassed);
        EventBus.on(GameEvents.ROUND_CLEARED, this.boundOnRoundCleared);
    }

    private onCardsPlayed(data: { playerId: number; cards: Card[]; pattern?: any }): void {

        this.showCards(data.playerId, data.cards, data.pattern);
    }

    private onPlayerPassed(data: { playerId: number }): void {
        this.showPass(data.playerId);
    }

    private onRoundCleared(): void {
        // 回合清除由 GameTableCtrl 统一处理（带延迟），这里不再单独清空
    }

    private showCards(playerId: number, cards: Card[], pattern?: any): void {

        const area = this.getAreaNode(playerId);
        if (!area || !this.cardPrefab) {

            return;
        }

        this.clearArea(playerId);

        const cardNodes: Node[] = [];
        const startX = -(cards.length - 1) * 25;
        for (let i = 0; i < cards.length; i++) {
            const node = instantiate(this.cardPrefab);
            node.parent = area;
            node.setPosition(startX + i * 50, 0);

            const cardView = node.getComponent(CardView);
            if (cardView) {
                cardView.setCard(cards[i]);
            }

            cardNodes.push(node);
        }

        this.areaNodes.set(playerId, cardNodes);

        this.updateLabel(playerId, '');
    }

    private showPass(playerId: number): void {
        this.updateLabel(playerId, '不出');
    }

    private getAreaNode(playerId: number): Node | null {
        // 计算相对于当前玩家的位置偏移
        // offset 0 = 当前玩家（下方）, offset 1 = 左边玩家, offset 2 = 左上玩家
        // offset 3 = 上方玩家, offset 4 = 右上玩家, offset 5 = 右边玩家
        const offset = (playerId - CURRENT_PLAYER_INDEX + 6) % 6;

        // 3人场：只有 bottom(0), left(1), right(5) 三个区域有UI
        // 玩家2(offset=2)应该显示在rightArea
        const playerCount = ROOM_PLAYER_COUNTS[CURRENT_ROOM_TYPE] || 3;
        if (playerCount === 3 && offset === 2) {
            return this.rightArea;
        }

        switch (offset) {
            case 0: return this.bottomArea;   // 当前玩家
            case 1: return this.leftArea;    // 左边的玩家
            case 2: return this.topLeftArea;  // 左上的玩家
            case 3: return this.topArea;      // 上方的玩家
            case 4: return this.topRightArea; // 右上的玩家
            case 5: return this.rightArea;   // 右边的玩家
            default: return null;
        }
    }

    private clearArea(playerId: number): void {
        const nodes = this.areaNodes.get(playerId);
        if (nodes) {
            for (const node of nodes) {
                node.destroy();
            }
            this.areaNodes.delete(playerId);
        }
    }

    public clearAllAreas(): void {

        for (let i = 0; i < 6; i++) {
            this.clearArea(i);
            this.updateLabel(i, '');
        }
    }

    private updateLabel(playerId: number, text: string): void {
        const label = this.getLabel(playerId);
        if (label) {
            label.string = text;
        }
    }

    private getLabel(playerId: number): Label | null {
        // 计算相对于当前玩家的位置偏移
        // offset 0 = 当前玩家（下方）, offset 1 = 左边玩家, offset 2 = 左上玩家
        // offset 3 = 上方玩家, offset 4 = 右上玩家, offset 5 = 右边玩家
        const offset = (playerId - CURRENT_PLAYER_INDEX + 6) % 6;

        // 3人场：玩家2(offset=2)应该显示在rightLabel
        const playerCount = ROOM_PLAYER_COUNTS[CURRENT_ROOM_TYPE] || 3;
        if (playerCount === 3 && offset === 2) {
            return this.rightLabel;
        }

        switch (offset) {
            case 0: return this.bottomLabel;   // 当前玩家
            case 1: return this.leftLabel;    // 左边的玩家
            case 2: return this.topLeftLabel;  // 左上的玩家
            case 3: return this.topLabel;      // 上方的玩家
            case 4: return this.topRightLabel; // 右上的玩家
            case 5: return this.rightLabel;   // 右边的玩家
            default: return null;
        }
    }

    onDestroy(): void {
        EventBus.off(GameEvents.CARDS_PLAYED, this.boundOnCardsPlayed);
        EventBus.off(GameEvents.PLAYER_PASSED, this.boundOnPlayerPassed);
        EventBus.off(GameEvents.ROUND_CLEARED, this.boundOnRoundCleared);
    }
}
