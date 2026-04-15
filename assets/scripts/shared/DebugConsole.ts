/**
 * 全局调试日志面板
 * 自动创建UI，固定在右下角，点击展开
 */

import { _decorator, Component, Node, Label, UITransform, Sprite, Color, Button, UIOpacity } from 'cc';
import { director } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('DebugConsole')
export class DebugConsole extends Component {

    private panel: Node = null;
    private content: Node = null;
    private countLabel: Label = null;
    private isVisible: boolean = false;
    private maxLogs: number = 50;
    private static logs: string[] = [];  // 静态存储，跨场景保留
    private originalLog: any = null;
    private originalWarn: any = null;
    private originalError: any = null;
    private static instance: DebugConsole = null;

    start() {
        if (DebugConsole.instance) {
            this.destroy();
            return;
        }
        DebugConsole.instance = this;

        this.createUI();
        this.hookConsole();
    }

    private createUI(): void {
        const scene = director.getScene();
        if (!scene) return;

        // 查找Canvas
        const canvas = scene.getChildByName('Canvas');
        if (!canvas) return;

        // 清理旧场景残留的节点
        const oldButton = scene.getChildByName('DebugButton');
        if (oldButton) oldButton.destroy();
        const oldPanel = scene.getChildByName('DebugPanel');
        if (oldPanel) oldPanel.destroy();

        // 获取Canvas的尺寸来计算位置
        const canvasTrans = canvas.getComponent(UITransform);
        const canvasSize = canvasTrans ? canvasTrans.contentSize : { width: 1280, height: 720 };

        // 创建右下角按钮容器
        const button = new Node('DebugButton');
        button.parent = canvas;

        const buttonTrans = button.addComponent(UITransform);
        buttonTrans.setContentSize(60, 60);
        buttonTrans.setAnchorPoint(0.5, 0.5);
        button.setPosition(600, 250, 0);  // 固定位置测试
        button.setSiblingIndex(65534);

        // 直接用Label作为按钮显示
        const label = button.addComponent(Label);
        label.string = 'LOG';
        label.color = new Color(0, 255, 0);
        label.fontSize = 16;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;

        // 添加Button组件
        const btn = button.addComponent(Button);
        btn.target = button;

        // 点击事件
        button.on('click', this.togglePanel, this);

        // 创建日志面板
        this.panel = new Node('DebugPanel');
        this.panel.parent = canvas;
        this.panel.active = false;  // 默认隐藏

        const panelTrans = this.panel.addComponent(UITransform);
        panelTrans.setContentSize(400, 300);
        panelTrans.setAnchorPoint(0, 0);
        this.panel.setSiblingIndex(65533);
        this.panel.setPosition(0, 0, 0);

        // 面板背景用 UIOpacity 可见性
        const opacity = this.panel.addComponent(UIOpacity);
        opacity.opacity = 230;

        // 添加Button组件使其可以点击
        const panelBtn = this.panel.addComponent(Button);
        panelBtn.target = this.panel;

        // 创建标题
        const title = new Node('Title');
        title.parent = this.panel;

        const titleTrans = title.addComponent(UITransform);
        titleTrans.setContentSize(400, 30);
        titleTrans.setAnchorPoint(0.5, 1);
        title.setPosition(0, 140, 0);

        const titleLabel = title.addComponent(Label);
        titleLabel.string = '调试日志 (点击关闭)';
        titleLabel.color = new Color(255, 255, 255);
        titleLabel.fontSize = 14;

        // 点击关闭
        this.panel.on('click', this.togglePanel, this);

        // 创建日志内容
        this.content = new Node('Content');
        this.content.parent = this.panel;

        const contentTrans = this.content.addComponent(UITransform);
        contentTrans.setContentSize(380, 240);
        contentTrans.setAnchorPoint(0, 1);
        this.content.setPosition(-190, 115, 0);

        const contentLabel = this.content.addComponent(Label);
        contentLabel.string = '';
        contentLabel.fontSize = 12;
        contentLabel.lineHeight = 16;
        contentLabel.verticalAlign = Label.VerticalAlign.TOP;

        // 创建计数
        const countNode = new Node('Count');
        countNode.parent = this.panel;

        const countTrans = countNode.addComponent(UITransform);
        countTrans.setContentSize(50, 20);
        countTrans.setAnchorPoint(0, 0);
        countNode.setPosition(-190, -135, 0);

        this.countLabel = countNode.addComponent(Label);
        this.countLabel.string = '0';
        this.countLabel.fontSize = 12;

        // 创建清除按钮
        const clearBtn = new Node('ClearBtn');
        clearBtn.parent = this.panel;

        const clearTrans = clearBtn.addComponent(UITransform);
        clearTrans.setContentSize(60, 25);
        clearTrans.setAnchorPoint(0, 0);
        clearBtn.setPosition(-120, -135, 0);

        const clearLabel = clearBtn.addComponent(Label);
        clearLabel.string = '清除';
        clearLabel.color = new Color(255, 200, 0);
        clearLabel.fontSize = 14;

        const clearBtnComp = clearBtn.addComponent(Button);
        clearBtnComp.target = clearBtn;

        clearBtn.on('click', this.clearLogs, this);

        // 创建复制按钮
        const copyBtn = new Node('CopyBtn');
        copyBtn.parent = this.panel;

        const copyTrans = copyBtn.addComponent(UITransform);
        copyTrans.setContentSize(60, 25);
        copyTrans.setAnchorPoint(0, 0);
        copyBtn.setPosition(-50, -135, 0);

        const copyLabel = copyBtn.addComponent(Label);
        copyLabel.string = '复制';
        copyLabel.color = new Color(100, 200, 255);
        copyLabel.fontSize = 14;

        const copyBtnComp = copyBtn.addComponent(Button);
        copyBtnComp.target = copyBtn;

        copyBtn.on('click', this.copyLogs, this);

        this.addLog('LOG', '调试面板已启动');
    }

    private hookConsole(): void {
        const self = this;

        // Hook console.log/warn/error
        if (typeof console !== 'undefined') {
            this.originalLog = console.log.bind(console);
            this.originalWarn = console.warn.bind(console);
            this.originalError = console.error.bind(console);

            console.log = function(...args: any[]) {
                self.originalLog(...args);
                self.addLog('LOG', args);
            };
            console.warn = function(...args: any[]) {
                self.originalWarn(...args);
                self.addLog('WARN', args, '#ffcc00');
            };
            console.error = function(...args: any[]) {
                self.originalError(...args);
                self.addLog('ERROR', args, '#ff4444');
            };
        }

        // 捕获全局错误（window.onerror）- 浏览器/微信小游戏
        if (typeof window !== 'undefined') {
            (window as any).onerror = (message: any, _source?: any, _lineno?: any, _colno?: any, error?: any) => {
                const errMsg = error?.stack || message || 'Unknown error';
                this.addLog('ERROR', `全局错误: ${errMsg}`, '#ff4444');
                return false; // 不阻止默认错误处理
            };

            (window as any).onunhandledrejection = (event: any) => {
                const errMsg = event.reason?.stack || event.reason || 'Unhandled Promise Rejection';
                this.addLog('ERROR', `Promise错误: ${errMsg}`, '#ff4444');
            };
        }

        // 微信小游戏全局错误捕获
        const wxEnv = typeof globalThis !== 'undefined' ? (globalThis as any).wx : null;
        if (wxEnv && wxEnv.onError) {
            wxEnv.onError((res: any) => {
                this.addLog('ERROR', `微信错误: ${res.message || JSON.stringify(res)}`, '#ff4444');
            });
        }
    }

    private formatArgs(args: any[]): string {
        return args.map(arg => {
            if (arg === null) return 'null';
            if (arg === undefined) return 'undefined';
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg);
                } catch {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');
    }

    private addLog(type: string, args: any[] | string, color?: string): void {
        const time = new Date().toLocaleTimeString();
        const text = typeof args === 'string' ? args : this.formatArgs(args);
        const log = color ? `<color=${color}>[${time}] [${type}] ${text}</color>` : `[${time}] [${type}] ${text}`;

        DebugConsole.logs.push(log);
        if (DebugConsole.logs.length > this.maxLogs) {
            DebugConsole.logs.shift();
        }

        this.updateDisplay();
    }

    private updateDisplay(): void {
        if (!this.content) return;

        const label = this.content.getComponent(Label);
        if (label) {
            label.string = DebugConsole.logs.join('\n');
        }

        if (this.countLabel) {
            this.countLabel.string = `${DebugConsole.logs.length}`;
        }
    }

    private togglePanel(): void {
        this.isVisible = !this.isVisible;
        if (this.panel) {
            this.panel.active = this.isVisible;
        }
    }

    private clearLogs(): void {
        DebugConsole.logs = [];
        this.updateDisplay();
    }

    private copyLogs(): void {
        const text = DebugConsole.logs.join('\n');
        // 浏览器环境
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                this.addLog('LOG', '日志已复制到剪贴板');
            }).catch(() => {
                this.addLog('ERROR', '复制失败');
            });
        } else {
            // 其他环境不支持复制
            this.addLog('ERROR', '复制功能仅支持浏览器');
        }
    }

    public addMessage(msg: string): void {
        this.addLog('LOG', msg);
    }

    onDestroy() {
        if (DebugConsole.instance === this) {
            DebugConsole.instance = null;
        }
        if (this.originalLog) console.log = this.originalLog;
        if (this.originalWarn) console.warn = this.originalWarn;
        if (this.originalError) console.error = this.originalError;
    }
}
