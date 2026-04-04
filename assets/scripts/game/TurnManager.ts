/**
 * 回合管理器
 */

import { EventBus, GameEvents } from '../shared/EventBus';
import { PLAYER_ID } from '../shared/Constants';
import { Move } from '../core/Move';

export class TurnManager {
    private currentPlayerId: number = PLAYER_ID.HUMAN;
    private passCount: number = 0;

    constructor() {
        this.currentPlayerId = PLAYER_ID.HUMAN;
        this.passCount = 0;
    }

    /** 获取当前玩家ID */
    get currentPlayer(): number {
        return this.currentPlayerId;
    }

    /** 获取下一个玩家ID */
    getNextPlayer(): number {
        return (this.currentPlayerId + 1) % 3;
    }

    /** 玩家出牌 */
    play(move: Move): void {
        if (move.cards.length === 0) {
            // 不出
            this.passCount++;
        } else {
            // 出牌
            this.passCount = 0;
        }

        // 切换到下一个玩家
        this.currentPlayerId = this.getNextPlayer();
    }

    /** 检查是否重新开始一轮（连续2人不出） */
    isRoundCleared(): boolean {
        return this.passCount >= 2;
    }

    /** 开始新的一轮 */
    startNewRound(): void {
        this.passCount = 0;
    }

    /** 获取连续不出的次数 */
    getPassCount(): number {
        return this.passCount;
    }

    /** 重置 */
    reset(startPlayerId?: number): void {
        this.currentPlayerId = startPlayerId ?? PLAYER_ID.HUMAN;
        this.passCount = 0;
    }
}
