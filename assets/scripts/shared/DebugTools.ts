/**
 * 调试工具 - 在任何场景都可以调用
 * 使用方法：在 Chrome 控制台输入 debugSetHand(['3','3','3','4','4'])
 */

// 初始化调试接口
function initDebugTools(): void {
    const debugObj: any = window;
    debugObj.debugSetHand = (rankStrs: string[]) => {
        (window as any).__debugHand = rankStrs;
    };
    debugObj.debugClearHand = () => {
        (window as any).__debugHand = null;
    };
    debugObj.debugGetHand = () => {
        return (window as any).__debugHand;
    };
}

// 页面加载后立即初始化
initDebugTools();
