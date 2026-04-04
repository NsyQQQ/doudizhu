/**
 * 简单事件发射器
 */

type EventCallback = (data?: any) => void;

export class EventEmitter {
    private listeners: Map<string, EventCallback[]> = new Map();
    private onceListeners: Map<string, EventCallback[]> = new Map();

    /**
     * 监听事件
     * @param type 事件类型
     * @param callback 回调函数
     */
    on(type: string, callback: EventCallback): void {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type)!.push(callback);
    }

    /**
     * 监听一次性事件
     * @param type 事件类型
     * @param callback 回调函数
     */
    once(type: string, callback: EventCallback): void {
        if (!this.onceListeners.has(type)) {
            this.onceListeners.set(type, []);
        }
        this.onceListeners.get(type)!.push(callback);
    }

    /**
     * 取消监听
     * @param type 事件类型
     * @param callback 回调函数
     */
    off(type: string, callback: EventCallback): void {
        const callbacks = this.listeners.get(type);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * 触发事件
     * @param type 事件类型
     * @param data 事件数据
     */
    emit(type: string, data?: any): void {
        // 执行普通监听器
        const callbacks = this.listeners.get(type);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }

        // 执行一次性监听器并移除
        const onceCallbacks = this.onceListeners.get(type);
        if (onceCallbacks) {
            onceCallbacks.forEach(callback => callback(data));
            this.onceListeners.delete(type);
        }
    }

    /**
     * 移除所有监听
     */
    removeAllListeners(): void {
        this.listeners.clear();
        this.onceListeners.clear();
    }

    /**
     * 获取监听器数量
     */
    listenerCount(type: string): number {
        return (this.listeners.get(type)?.length || 0) + (this.onceListeners.get(type)?.length || 0);
    }
}