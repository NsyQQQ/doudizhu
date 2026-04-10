/**
 * 事件总线 - 跨模块通信
 */

type EventCallback = (...args: any[]) => void;

class EventBusClass {
    private listeners: Map<string, EventCallback[]> = new Map();

    /** 发送事件 */
    emit(event: string, ...args: any[]): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(cb => {
                try {
                    cb(...args);
                } catch (e) {}
            });
        }
    }

    /** 监听事件 */
    on(event: string, callback: EventCallback): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }

    /** 取消监听 */
    off(event: string, callback: EventCallback): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index >= 0) {
                callbacks.splice(index, 1);
            }
        }
    }

    /** 清空所有监听 */
    clear(): void {
        this.listeners.clear();
    }
}

export const EventBus = new EventBusClass();

/** 游戏事件名称 */
export const GameEvents = {
    GAME_STARTED: 'game:started',
    GAME_DEALT: 'game:dealt',
    LANDLORD_SELECTED: 'game:landlordSelected',
    TURN_CHANGED: 'game:turnChanged',
    CARDS_PLAYED: 'game:cardsPlayed',
    PLAYER_PASSED: 'game:playerPassed',
    ROUND_CLEARED: 'game:roundCleared',
    GAME_OVER: 'game:gameOver',
    CARD_SELECTED: 'ui:cardSelected',
    PLAY_REQUESTED: 'ui:playRequested',
    PASS_REQUESTED: 'ui:passRequested',
    HINT_REQUESTED: 'ui:hintRequested',
    CARD_DEALT: 'game:cardDealt',
    SELECT_LANDLORD_CARDS: 'ui:selectLandlordCards',
} as const;
