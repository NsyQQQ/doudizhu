/**
 * 已出牌视图 - 显示各玩家最近出的牌
 */

import { _decorator, Component, Node, Prefab, instantiate, Label } from 'cc';
import { Card, CardPatternType } from '../core/Card';
import { CardView } from './CardView';
import { CardPatternRecognizer } from '../core/CardPattern';
import { EventBus, GameEvents } from '../shared/EventBus';
import { CURRENT_PLAYER_INDEX } from '../shared/Constants';

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

    @property(Label)
    bottomLabel: Label = null!;

    @property(Label)
    leftLabel: Label = null!;

    @property(Label)
    rightLabel: Label = null!;

    private areaNodes: Map<number, Node[]> = new Map();

    // 存储绑定函数
    private boundOnCardsPlayed: (data: any) => void = null!;
    private boundOnPlayerPassed: (data: any) => void = null!;
    private boundOnRoundCleared: () => void = null!;

    start() {
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

    private onCardsPlayed(data: { playerId: number; cards: Card[] }): void {
        
        this.showCards(data.playerId, data.cards);
    }

    private onPlayerPassed(data: { playerId: number }): void {
        this.showPass(data.playerId);
    }

    private onRoundCleared(): void {
        // 回合清除由 GameTableCtrl 统一处理（带延迟），这里不再单独清空
    }

    private showCards(playerId: number, cards: Card[]): void {
        
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

        // 识别牌型并显示
        const pattern = CardPatternRecognizer.recognize(cards);
        const patternName = this.getPatternName(pattern);
        this.updateLabel(playerId, patternName);
    }

    /** 获取牌型名称 */
    private getPatternName(pattern: { type: CardPatternType; primaryValue?: number; secondaryValue?: number } | null): string {
        if (!pattern) return '';

        switch (pattern.type) {
            case CardPatternType.SINGLE: return '单张';
            case CardPatternType.PAIR: return '对子';
            case CardPatternType.TRIPLE: return '三张';
            case CardPatternType.TRIPLE_SINGLE: return '三带一';
            case CardPatternType.TRIPLE_PAIR: return '三带二';
            case CardPatternType.STRAIGHT: return '顺子';
            case CardPatternType.STRAIGHT_PAIRS: return '连对';
            case CardPatternType.STRAIGHT_TRIPLES: return '飞机';
            case CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_SINGLE: return '飞机带翅膀';
            case CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_PAIR: return '飞机带翅膀';
            case CardPatternType.QUADRUPLE_SINGLE: return '四带两单';
            case CardPatternType.QUADRUPLE_PAIR: return '四带两对';
            case CardPatternType.BOMB: return '炸弹';
            case CardPatternType.ROCKET: return '王炸';
            default: return '';
        }
    }

    private showPass(playerId: number): void {
        this.updateLabel(playerId, '不出');
    }

    private getAreaNode(playerId: number): Node | null {
        // 计算相对于当前玩家的位置偏移
        // offset 0 = 当前玩家（下方）, offset 1 = 左边玩家, offset 2 = 右边玩家
        const offset = (playerId - CURRENT_PLAYER_INDEX + 3) % 3;
        switch (offset) {
            case 0: return this.bottomArea;   // 当前玩家
            case 1: return this.leftArea;    // 左边的玩家
            case 2: return this.rightArea;   // 右边的玩家
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
        
        for (let i = 0; i < 3; i++) {
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
        // offset 0 = 当前玩家（下方）, offset 1 = 左边玩家, offset 2 = 右边玩家
        const offset = (playerId - CURRENT_PLAYER_INDEX + 3) % 3;
        switch (offset) {
            case 0: return this.bottomLabel;   // 当前玩家
            case 1: return this.leftLabel;    // 左边的玩家
            case 2: return this.rightLabel;   // 右边的玩家
            default: return null;
        }
    }

    onDestroy(): void {
        EventBus.off(GameEvents.CARDS_PLAYED, this.boundOnCardsPlayed);
        EventBus.off(GameEvents.PLAYER_PASSED, this.boundOnPlayerPassed);
        EventBus.off(GameEvents.ROUND_CLEARED, this.boundOnRoundCleared);
    }
}
