/**
 * 操作按钮 - 出牌/不出
 */

import { _decorator, Component, Button, Label } from 'cc';
import { EventBus, GameEvents } from '../shared/EventBus';
import { Card } from '../core/Card';
import { GameRules } from '../core/GameRules';
import { GameRules2 } from '../core/GameRules2';
import { Hand } from '../core/Hand';
import { Move } from '../core/Move';
import { CURRENT_PLAYER_INDEX, CURRENT_ROOM_TYPE } from '../shared/Constants';
import { CardPatternType2 } from '../core/CardPattern2';

const { ccclass, property } = _decorator;

@ccclass('ActionButtons')
export class ActionButtons extends Component {
    @property(Button)
    playButton: Button = null!;

    @property(Button)
    passButton: Button = null!;

    @property(Button)
    hintButton: Button = null!;

    @property(Button)
    selectLandlordButton: Button = null!;  // 选择地主牌按钮

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
    private selectingLandlordCards: boolean = false;  // 是否在选择地主牌阶段
    private dealingAnimationActive: boolean = false;  // 是否正在播放发牌动画

    /** 设置是否轮到自己出牌 */
    public setMyTurn(myTurn: boolean): void {
        this.isMyTurn = myTurn;
        this.updateButtonState();
    }

    // 存储绑定函数
    private boundOnGameStarted: () => void = null!;
    private boundOnTurnChanged: (data: any) => void = null!;
    private boundOnCardSelected: (data: any) => void = null!;
    private boundOnRoundCleared: () => void = null!;
    private boundOnGameDealt: () => void = null!;

    start() {
        this.boundOnGameStarted = this.onGameStarted.bind(this);
        this.boundOnTurnChanged = this.onTurnChanged.bind(this);
        this.boundOnCardSelected = this.onCardSelected.bind(this);
        this.boundOnRoundCleared = this.onRoundCleared.bind(this);
        this.boundOnGameDealt = this.onGameDealt.bind(this);

        this.setupEventListeners();
        this.setupButtonEvents();
        this.updateButtonState();
    }

    private setupEventListeners(): void {
        EventBus.on(GameEvents.GAME_STARTED, this.boundOnGameStarted);
        EventBus.on(GameEvents.GAME_DEALT, this.boundOnGameDealt);
        EventBus.on(GameEvents.TURN_CHANGED, this.boundOnTurnChanged);
        EventBus.on(GameEvents.CARD_SELECTED, this.boundOnCardSelected);
        EventBus.on(GameEvents.ROUND_CLEARED, this.boundOnRoundCleared);
    }

    /** 是否是6人场模式 */
    private isSixPlayerMode(): boolean {
        return CURRENT_ROOM_TYPE === 4;
    }

    /** 获取当前规则的generateValidMoves */
    private generateValidMoves(hand: Hand, lastMove: Move | null, playerId: number) {
        return this.isSixPlayerMode()
            ? GameRules2.generateValidMoves(hand, lastMove, playerId)
            : GameRules.generateValidMoves(hand, lastMove, playerId);
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
        this.selectingLandlordCards = false;
        this.dealingAnimationActive = false;
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
        if (this.selectLandlordButton) {
            this.selectLandlordButton.node.on('click', this.onSelectLandlordClicked, this);
        }
    }

    private onTurnChanged(data: { playerId: number }): void {
        // 如果正在播放发牌动画，忽略回合变化（等待动画结束后的正式回合通知）
        if (this.dealingAnimationActive) {
            return;
        }
        this.isMyTurn = data.playerId === CURRENT_PLAYER_INDEX;
        // 回合变化时，清空提示，重新生成
        this.hintMoves = [];
        this.hintIndex = 0;
        this.updateButtonState();
    }

    private onCardSelected(data: { cards: Card[] }): void {
        this.selectedCards = [...data.cards];  // 复制数组，避免引用问题
        this.updateButtonState();
    }

    private onRoundCleared(): void {
        // 回合清除时，清空 lastMove
        if (this.lastMove !== null) {
            this.waitingForRoundClear = true;
            this.lastMove = null;
            this.waitingForRoundClear = false; // 重置标记，避免阻塞后续的 setLastMove
            this.updateButtonState();
        }
        // 回合清除时，清空提示
        this.hintMoves = [];
        this.hintIndex = 0;
    }

    /** 发牌动画开始时调用 */
    private onGameDealt(): void {
        this.dealingAnimationActive = true;
        // 立即隐藏按钮，不等待 updateButtonState
        if (this.playButton) this.playButton.node.active = false;
        if (this.passButton) this.passButton.node.active = false;
        if (this.hintButton) this.hintButton.node.active = false;
    }

    /** 发牌动画结束调用（在GameTableCtrl的动画回调中调用） */
    public onDealingAnimationEnd(): void {
        this.dealingAnimationActive = false;
        this.updateButtonState();
    }

    setHand(hand: Hand): void {
        this.hand = hand;
    }

    setLastMove(move: Move | null): void {
        // 如果正在等待 round_clear 处理，只允许设置非 null 值
        if (this.waitingForRoundClear && move === null) {
            return;
        }
        this.waitingForRoundClear = false;

        // 防御性检查：如果值相同，不更新
        if (this.lastMove === move) return;
        if (this.lastMove && move && this.lastMove.cards.map(c => c.id).join(',') === move.cards.map(c => c.id).join(',')) return;

        this.lastMove = move;
        this.updateButtonState();
    }

    public updateButtonState(): void {
        // 3人场没有 selectLandlordButton，只检查实际需要的按钮
        if (!this.playButton || !this.passButton || !this.hintButton) return;

        // 始终显示按钮，用 interactable 控制是否可点击
        this.playButton.node.active = true;
        this.passButton.node.active = true;
        this.hintButton.node.active = true;

        // 如果是选择地主牌阶段，只显示选牌按钮（6人场）
        if (this.selectingLandlordCards && this.selectLandlordButton) {
            this.playButton.node.active = false;
            this.passButton.node.active = false;
            this.hintButton.node.active = false;
            this.selectLandlordButton.node.active = true;

            // 选牌按钮：需要选中1张牌才能点击
            const canSelect = this.selectedCards.length === 1;
            this.selectLandlordButton.interactable = canSelect;
            return;
        }

        const isMyTurn = this.isMyTurn;
        const canPass = isMyTurn && this.lastMove !== null;

        // 始终启用按钮，用 interactable 控制状态
        this.playButton.interactable = false;
        this.passButton.interactable = canPass;  // 只有跟上家出牌时才能不出
        this.hintButton.interactable = isMyTurn;

        if (this.selectLandlordButton) {
            this.selectLandlordButton.node.active = false;
        }

        if (!isMyTurn) {
            return;
        }

        const hasSelection = this.selectedCards.length > 0;
        let canPlay = false;

        if (hasSelection && this.hand) {
            const validMoves = this.generateValidMoves(this.hand, this.lastMove, 0);

            // 用选中牌的rank排序列表来判断是否匹配（跨场次通用）
            const selectedRanks = this.selectedCards.map(c => c.rank).sort((a, b) => a - b);

            canPlay = validMoves.some(m => {
                const moveRanks = m.cards.map(c => c.rank).sort((a, b) => a - b);
                if (moveRanks.length !== selectedRanks.length) return false;
                for (let i = 0; i < moveRanks.length; i++) {
                    if (moveRanks[i] !== selectedRanks[i]) return false;
                }
                return true;
            });
        }

        this.playButton.interactable = canPlay;
        if (this.playLabel) {
            this.playLabel.string = canPlay ? '出牌' : '请选牌';
        }

        // 提示按钮：仅当有可出的牌时可用
        if (this.hintButton && this.hand) {
            const validMoves = this.generateValidMoves(this.hand, this.lastMove, 0);
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
            return;
        }

        // 如果还没有提示，或者上一轮已经用完，重新生成所有提示
        if (this.hintMoves.length === 0 || this.hintIndex >= this.hintMoves.length) {
            const validMoves = this.generateValidMoves(this.hand, this.lastMove, 0);
            // 过滤掉 PASS，只保留实际出牌
            let actualPlays = validMoves.filter(m => m.cards.length > 0);

            // 防御性过滤（仅3人场）：如果上家是炸弹/王炸，只显示炸弹/王炸提示
            // 6人场不过滤，因为炸弹可能打得过王炸（如5炸 > 2王炸）
            if (this.lastMove && this.lastMove.cards.length > 0 && !this.isSixPlayerMode()) {
                const lastType = this.lastMove.pattern.type;
                const isLastMoveBomb = lastType === 11 || this.isBombType2(lastType);
                const isLastMoveRocket = lastType === 12 || this.isRocketType2(lastType);
                if (isLastMoveBomb || isLastMoveRocket) {
                    // 只保留炸弹或王炸
                    actualPlays = actualPlays.filter(m => {
                        const t = m.pattern.type;
                        const isBomb = m.cards.length >= 4 && (t === 11 || this.isBombType2(t));
                        const isRocket = m.cards.length >= 2 && (t === 12 || this.isRocketType2(t));
                        return isBomb || isRocket;
                    });
                }
            }

            // 按从小到大排序：先按牌型长度排序（少的优先），再按 primaryValue 排序
            actualPlays = actualPlays.sort((a, b) => {
                if (a.cards.length !== b.cards.length) {
                    return a.cards.length - b.cards.length;
                }
                return a.pattern.primaryValue - b.pattern.primaryValue;
            });

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
            this.hintMoves = [];
            this.hintIndex = 0;
            // 重新生成提示会发生在下一轮（这次直接返回）
            return;
        }

        // 移动到下一个提示
        this.hintIndex = (this.hintIndex + 1) % this.hintMoves.length;

        // 通知手牌视图选中提示的所有牌
        EventBus.emit(GameEvents.HINT_REQUESTED, { cards: currentMove.cards });
    }

    clearSelection(): void {
        this.selectedCards = [];
        this.updateButtonState();
    }

    /** 设置是否在选择地主牌阶段 */
    setSelectingLandlordCards(selecting: boolean): void {
        this.selectingLandlordCards = selecting;
        if (selecting) {
            this.selectedCards = [];
        } else {
            // 退出选择地主牌阶段时，也要清空选牌
            this.selectedCards = [];
        }
        this.updateButtonState();
    }

    /** 选择地主牌按钮点击 */
    private onSelectLandlordClicked(): void {
        if (this.selectedCards.length === 1) {
            // 发送选择地主牌事件
            EventBus.emit(GameEvents.SELECT_LANDLORD_CARDS, { card: this.selectedCards[0] });
            this.selectedCards = [];
        }
    }

    /** 判断是否是炸弹类型（CardPatternType2新牌型） */
    private isBombType2(type: number): boolean {
        return type === CardPatternType2.BOMB_four ||
               type === CardPatternType2.BOMB_five ||
               type === CardPatternType2.BOMB_six ||
               type === CardPatternType2.BOMB_seven ||
               type === CardPatternType2.BOMB_eight ||
               type === CardPatternType2.BOMB_nine ||
               type === CardPatternType2.BOMB_ten ||
               type === CardPatternType2.BOMB_eleven ||
               type === CardPatternType2.BOMB_twelve;
    }

    /** 判断是否是王炸类型（CardPatternType2新牌型） */
    private isRocketType2(type: number): boolean {
        return type === CardPatternType2.ROCKET_two_SMALL ||
               type === CardPatternType2.ROCKET_two_MEDIUM ||
               type === CardPatternType2.ROCKET_two_LARGE ||
               type === CardPatternType2.ROCKET_three_SMALL ||
               type === CardPatternType2.ROCKET_three_MEDIUM1 ||
               type === CardPatternType2.ROCKET_three_MEDIUM2 ||
               type === CardPatternType2.ROCKET_three_LARGE ||
               type === CardPatternType2.ROCKET_four ||
               type === CardPatternType2.ROCKET_five ||
               type === CardPatternType2.ROCKET_six;
    }

    onDestroy(): void {
        EventBus.off(GameEvents.GAME_STARTED, this.boundOnGameStarted);
        EventBus.off(GameEvents.GAME_DEALT, this.boundOnGameDealt);
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
        if (this.selectLandlordButton?.node) {
            this.selectLandlordButton.node.off('click', this.onSelectLandlordClicked, this);
        }
    }
}
