/**
 * 操作按钮 - 出牌/不出
 */

import { _decorator, Component, Button, Label } from 'cc';
import { EventBus, GameEvents } from '../shared/EventBus';
import { Card } from '../core/Card';
import { GameRules } from '../core/GameRules';
import { Hand } from '../core/Hand';
import { Move } from '../core/Move';
import { CURRENT_PLAYER_INDEX } from '../shared/Constants';

const { ccclass, property } = _decorator;

@ccclass('ActionButtons')
export class ActionButtons extends Component {
    @property(Button)
    playButton: Button = null!;

    @property(Button)
    passButton: Button = null!;

    @property(Button)
    hintButton: Button = null!;

    @property(Label)
    playLabel: Label = null!;

    @property(Label)
    passLabel: Label = null!;

    @property(Label)
    hintLabel: Label = null!;

    private hand: Hand | null = null;
    private lastMove: Move | null = null;
    private selectedCards: Card[] = [];
    private isMyTurn: boolean = false;
    private hintMoves: Move[] = [];  // 当前可出的所有提示
    private hintIndex: number = 0;    // 当前提示索引
    private waitingForRoundClear: boolean = false;  // 是否在等待回合清除处理

    // 存储绑定函数
    private boundOnGameStarted: () => void = null!;
    private boundOnTurnChanged: (data: any) => void = null!;
    private boundOnCardSelected: (data: any) => void = null!;
    private boundOnRoundCleared: () => void = null!;

    start() {
        this.boundOnGameStarted = this.onGameStarted.bind(this);
        this.boundOnTurnChanged = this.onTurnChanged.bind(this);
        this.boundOnCardSelected = this.onCardSelected.bind(this);
        this.boundOnRoundCleared = this.onRoundCleared.bind(this);

        this.setupEventListeners();
        this.setupButtonEvents();
        this.updateButtonState();
    }

    private setupEventListeners(): void {
        EventBus.on(GameEvents.GAME_STARTED, this.boundOnGameStarted);
        EventBus.on(GameEvents.TURN_CHANGED, this.boundOnTurnChanged);
        EventBus.on(GameEvents.CARD_SELECTED, this.boundOnCardSelected);
        EventBus.on(GameEvents.ROUND_CLEARED, this.boundOnRoundCleared);
    }

    /** 游戏开始时重置状态 */
    private onGameStarted(): void {
        this.isMyTurn = false;
        this.selectedCards = [];
        this.lastMove = null;
        this.hand = null;
        this.hintMoves = [];
        this.hintIndex = 0;
        this.waitingForRoundClear = false;
        this.updateButtonState();
    }

    /** 外部重置（再来一局时调用） */
    reset(): void {
        this.isMyTurn = false;
        this.selectedCards = [];
        this.lastMove = null;
        this.hand = null;
        this.hintMoves = [];
        this.hintIndex = 0;
        this.waitingForRoundClear = false;
        this.updateButtonState();
    }

    private setupButtonEvents(): void {
        if (this.playButton) {
            this.playButton.node.on('click', this.onPlayClicked, this);
        }
        if (this.passButton) {
            this.passButton.node.on('click', this.onPassClicked, this);
        }
        if (this.hintButton) {
            this.hintButton.node.on('click', this.onHintClicked, this);
        }
    }

    private onTurnChanged(data: { playerId: number }): void {
        this.isMyTurn = data.playerId === CURRENT_PLAYER_INDEX;
        // 回合变化时，清空提示，重新生成
        this.hintMoves = [];
        this.hintIndex = 0;
        console.log(`[onTurnChanged] 回合变化为玩家${data.playerId}，isMyTurn=${this.isMyTurn}，清空提示`);
        this.updateButtonState();
    }

    private onCardSelected(data: { cards: Card[] }): void {
        this.selectedCards = [...data.cards];  // 复制数组，避免引用问题
        console.log(`[选牌] ${data.cards.map(c => c.id).join(',')} (${data.cards.length}张)`);
        this.updateButtonState();
    }

    private onRoundCleared(): void {
        console.log(`[ActionButtons onRoundCleared] 被调用, lastMove: ${this.lastMove ? this.lastMove.cards.map(c => c.id).join(',') : 'null'}`);
        // 回合清除时，清空 lastMove
        if (this.lastMove !== null) {
            this.waitingForRoundClear = true;
            console.log(`[回合清除] 设置 waitingForRoundClear = true`);
            console.log(`[回合清除] 直接清空 lastMove`);
            this.lastMove = null;
            this.waitingForRoundClear = false; // 重置标记，避免阻塞后续的 setLastMove
            this.updateButtonState();
        }
        // 回合清除时，清空提示
        this.hintMoves = [];
        this.hintIndex = 0;
        console.log(`[回合清除] 清空提示`);
    }

    setHand(hand: Hand): void {
        if (this.hand !== hand) {
            console.log(`[setHand] 设置为: ${hand?.cards.map(c => `${c.id}(rank${c.rank})`).join(',') || 'null'} (${hand?.cards.length || 0}张)`);
        }
        this.hand = hand;
    }

    setLastMove(move: Move | null): void {
        // 如果正在等待 round_clear 处理，只允许设置非 null 值
        if (this.waitingForRoundClear && move === null) {
            console.log(`[setLastMove] 跳过（等待round_clear）`);
            return;
        }
        this.waitingForRoundClear = false;

        // 防御性检查：如果值相同，不更新
        if (this.lastMove === move) return;
        if (this.lastMove && move && this.lastMove.cards.map(c => c.id).join(',') === move.cards.map(c => c.id).join(',')) return;

        const lastMoveInfo = move ? `${move.cards.map(c => c.id).join(',')} rank${move.pattern.primaryValue}` : 'null';
        console.log(`[setLastMove] 设置为: ${lastMoveInfo}`);
        this.lastMove = move;
        this.updateButtonState();
    }

    public updateButtonState(): void {
        if (!this.playButton || !this.passButton || !this.hintButton) return;

        const showButtons = this.isMyTurn;
        this.playButton.node.active = showButtons;
        this.passButton.node.active = showButtons;
        this.hintButton.node.active = showButtons;



        if (!showButtons) return;

        const hasSelection = this.selectedCards.length > 0;
        let canPlay = false;

        if (hasSelection && this.hand) {
            const validMoves = GameRules.generateValidMoves(this.hand, this.lastMove, 0);

            // 计算选中牌的rank数量
            const selectedRankCounts = new Map<number, number>();
            for (const card of this.selectedCards) {
                selectedRankCounts.set(card.rank, (selectedRankCounts.get(card.rank) || 0) + 1);
            }

            canPlay = validMoves.some(m => {
                if (m.cards.length !== this.selectedCards.length) return false;

                // 计算这个move的rank数量
                const moveRankCounts = new Map<number, number>();
                for (const card of m.cards) {
                    moveRankCounts.set(card.rank, (moveRankCounts.get(card.rank) || 0) + 1);
                }

                // rank数量必须完全一致
                if (moveRankCounts.size !== selectedRankCounts.size) return false;

                for (const [rank, count] of selectedRankCounts) {
                    if (moveRankCounts.get(rank) !== count) return false;
                }

                return true;
            });
        }

        this.playButton.interactable = canPlay;
        if (this.playLabel) {
            this.playLabel.string = canPlay ? '出牌' : '请选牌';
        }

        const canPass = this.isMyTurn && this.lastMove !== null;
        this.passButton.interactable = canPass;
        if (this.passLabel) {
            this.passLabel.string = '不出';
        }

        // 提示按钮：仅当有可出的牌时可用
        if (this.hand) {
            const validMoves = GameRules.generateValidMoves(this.hand, this.lastMove, 0);
            const lastMoveInfo = this.lastMove
                ? `lastMove: ${this.lastMove.cards.map(c => `${c.id}(rank${c.rank})`).join(',')} type: ${this.lastMove.pattern.type}`
                : 'lastMove: null';
            console.log(`[updateButtonState] hand: ${this.hand.cards.length}张, ${lastMoveInfo}, validMoves: ${validMoves.length}`);

            const hasValidPlay = validMoves.some(m => m.cards.length > 0);
            this.hintButton.interactable = hasValidPlay;
        }
    }

    private onPlayClicked(): void {
        
        if (this.selectedCards.length === 0) {
            // 没有选牌时，视为不出/跳过
            EventBus.emit(GameEvents.PASS_REQUESTED);
            return;
        }
        EventBus.emit(GameEvents.PLAY_REQUESTED, this.selectedCards);
        
        this.selectedCards = [];
    }

    private onPassClicked(): void {
        EventBus.emit(GameEvents.PASS_REQUESTED);
    }

    private onHintClicked(): void {
        if (!this.hand) {
            console.log(`[提示] hand为空`);
            return;
        }

        const lastMoveInfo = this.lastMove
            ? `lastMove: ${this.lastMove.cards.map(c => `${c.id}(rank${c.rank})`).join(',')} type: ${this.lastMove.pattern.type} count: ${this.lastMove.cards.length}`
            : 'lastMove: null';
        console.log(`[提示] 当前hand: ${this.hand.cards.map(c => `${c.id}(rank${c.rank})`).join(',')} (${this.hand.cards.length}张), ${lastMoveInfo}`);

        // 如果还没有提示，或者上一轮已经用完，重新生成所有提示
        if (this.hintMoves.length === 0 || this.hintIndex >= this.hintMoves.length) {
            const lastMoveInfo = this.lastMove
                ? `lastMove: ${this.lastMove.cards.map(c => `${c.id}(rank${c.rank})`).join(',')} type: ${this.lastMove.pattern.type} count: ${this.lastMove.cards.length}`
                : 'lastMove: null';
            console.log(`[提示] 重新生成提示, ${lastMoveInfo}`);
            const validMoves = GameRules.generateValidMoves(this.hand, this.lastMove, 0);
            // 过滤掉 PASS，只保留实际出牌
            let actualPlays = validMoves.filter(m => m.cards.length > 0);
            console.log(`[提示] 重新生成提示, actualPlays数量: ${actualPlays.length}`);

            // 按从小到大排序：先按牌型长度排序（少的优先），再按 primaryValue 排序
            actualPlays = actualPlays.sort((a, b) => {
                if (a.cards.length !== b.cards.length) {
                    return a.cards.length - b.cards.length;
                }
                return a.pattern.primaryValue - b.pattern.primaryValue;
            });

            // 按牌型分组统计
            const typeCount = new Map<number, number>();
            for (const play of actualPlays) {
                typeCount.set(play.pattern.type, (typeCount.get(play.pattern.type) || 0) + 1);
            }
            console.log(`[提示] 牌型分布: ${[...typeCount.entries()].map(([t, c]) => `type${t}:${c}`).join(', ')}`);
            for (let i = 0; i < Math.min(3, actualPlays.length); i++) {
                console.log(`[提示] 可出牌${i}: ${actualPlays[i].cards.map(c => `${c.id}(rank${c.rank})`).join(',')} type: ${actualPlays[i].pattern.type}`);
            }
            if (actualPlays.length === 0) return;

            this.hintMoves = actualPlays;
            this.hintIndex = 0;
        }

        // 选择当前提示
        const currentMove = this.hintMoves[this.hintIndex];
        // 检查提示的牌是否都还在手里，如果不在了（说明手牌已变），重新生成提示
        const handCardIds = new Set(this.hand.cards.map(c => c.id));
        const hintCardIds = currentMove.cards.map(c => c.id);
        const allCardsInHand = hintCardIds.every(id => handCardIds.has(id));
        if (!allCardsInHand) {
            console.log(`[提示] 提示的牌${hintCardIds.join(',')}不在当前手牌中，重新生成提示`);
            this.hintMoves = [];
            this.hintIndex = 0;
            // 重新生成提示会发生在下一轮（这次直接返回）
            return;
        }
        console.log(`[提示] 第${this.hintIndex + 1}/${this.hintMoves.length}个提示: ${currentMove.cards.map(c => `${c.id}(rank${c.rank})`).join(',')} type: ${currentMove.pattern.type}`);

        // 移动到下一个提示
        this.hintIndex = (this.hintIndex + 1) % this.hintMoves.length;

        // 通知手牌视图选中提示的所有牌
        EventBus.emit(GameEvents.HINT_REQUESTED, { cards: currentMove.cards });
    }

    clearSelection(): void {
        this.selectedCards = [];
        this.updateButtonState();
    }

    onDestroy(): void {
        EventBus.off(GameEvents.GAME_STARTED, this.boundOnGameStarted);
        EventBus.off(GameEvents.TURN_CHANGED, this.boundOnTurnChanged);
        EventBus.off(GameEvents.CARD_SELECTED, this.boundOnCardSelected);
        EventBus.off(GameEvents.ROUND_CLEARED, this.boundOnRoundCleared);

        if (this.playButton?.node) {
            this.playButton.node.off('click', this.onPlayClicked, this);
        }
        if (this.passButton?.node) {
            this.passButton.node.off('click', this.onPassClicked, this);
        }
        if (this.hintButton?.node) {
            this.hintButton.node.off('click', this.onHintClicked, this);
        }
    }
}
