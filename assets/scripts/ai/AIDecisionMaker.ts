/**
 * AI决策器 - 中等难度
 */

import { Card, CardRank, CardPatternType } from '../core/Card';
import { Hand } from '../core/Hand';
import { Move, createPassMove } from '../core/Move';
import { GameRules } from '../core/GameRules';
import { Player } from '../shared/RoomManager';
import { AI_THINK_DELAY } from '../shared/Constants';

/** AI决策上下文 */
interface AIMoveContext {
    hand: Hand;
    lastMove: Move | null;
    playerId: number;
    isStarting: boolean; // 是否是重新开始一轮
}

export class AIDecisionMaker {
    private player: Player;

    constructor(player: Player) {
        this.player = player;
    }

    /**
     * 决定出牌
     */
    async decideMove(lastMove: Move | null, isStarting: boolean = false): Promise<Move> {
        // 模拟思考时间
        await this.delay(AI_THINK_DELAY);

        const context: AIMoveContext = {
            hand: this.player.hand,
            lastMove,
            playerId: this.player.id,
            isStarting,
        };

        const validMoves = GameRules.generateValidMoves(
            this.player.hand,
            lastMove,
            this.player.id
        );

        if (validMoves.length === 0) {
            return createPassMove(this.player.id);
        }

        // 过滤掉 PASS
        const actualPlays = validMoves.filter(m => m.cards.length > 0);

        if (actualPlays.length === 0) {
            return createPassMove(this.player.id);
        }

        // 决策策略
        return this.selectBestMove(actualPlays, context);
    }

    /**
     * 选择最佳出牌（中等难度策略）
     */
    private selectBestMove(moves: Move[], context: AIMoveContext): Move {
        // 如果是开局第一轮，出最小的牌
        if (!context.lastMove || context.lastMove.cards.length === 0 || context.isStarting) {
            return this.selectLowValueMove(moves);
        }

        // 能压则压，选择最小的胜牌
        const beatingMoves = moves.filter(m => GameRules.canBeat(m, context.lastMove));
        if (beatingMoves.length > 0) {
            return this.selectMinimumWinningMove(beatingMoves);
        }

        // 不能压，出最小的一张（如果只能出单张的话）
        return this.selectLowValueMove(moves);
    }

    /**
     * 选择最小牌力的出牌（开局用）
     */
    private selectLowValueMove(moves: Move[]): Move {
        // 按主值排序，选择最小的
        const sorted = [...moves].sort((a, b) => {
            // 优先选择非炸弹
            if (a.pattern.type === CardPatternType.BOMB && b.pattern.type !== CardPatternType.BOMB) return 1;
            if (b.pattern.type === CardPatternType.BOMB && a.pattern.type !== CardPatternType.BOMB) return -1;

            // 优先选择非火箭
            if (a.pattern.type === CardPatternType.ROCKET && b.pattern.type !== CardPatternType.ROCKET) return 1;
            if (b.pattern.type === CardPatternType.ROCKET && a.pattern.type !== CardPatternType.ROCKET) return -1;

            return a.pattern.primaryValue - b.pattern.primaryValue;
        });

        return sorted[0];
    }

    /**
     * 选择最小能赢的出牌
     */
    private selectMinimumWinningMove(moves: Move[]): Move {
        // 按主值排序
        const sorted = [...moves].sort((a, b) => a.pattern.primaryValue - b.pattern.primaryValue);

        // 选择最小值
        const minValue = sorted[0].pattern.primaryValue;

        // 如果有多个相同值的，选择牌数最少的（减少手牌数）
        const minMoves = sorted.filter(m => m.pattern.primaryValue === minValue);
        return minMoves.sort((a, b) => a.cards.length - b.cards.length)[0];
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
