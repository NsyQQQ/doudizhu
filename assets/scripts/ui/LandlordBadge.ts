/**
 * 地主标识 - 显示地主皇冠
 */

import { _decorator, Component, Sprite, Node } from 'cc';
import { EventBus, GameEvents } from '../shared/EventBus';

const { ccclass, property } = _decorator;

@ccclass('LandlordBadge')
export class LandlordBadge extends Component {
    @property(Sprite)
    crownSprite: Sprite = null!;

    private playerId: number = -1;

    // 存储绑定函数
    private boundOnLandlordSelected: (data: any) => void = null!;

    start() {
        this.boundOnLandlordSelected = this.onLandlordSelected.bind(this);
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        EventBus.on(GameEvents.LANDLORD_SELECTED, this.boundOnLandlordSelected);
    }

    private onLandlordSelected(data: { playerId: number }): void {
        this.playerId = data.playerId;
        this.node.active = true;
    }

    bindToPlayer(playerNode: Node, playerId: number): void {
        playerNode.addChild(this.node);
        this.playerId = playerId;
        this.node.active = false;
    }

    isForPlayer(playerId: number): boolean {
        return this.playerId === playerId;
    }

    show(show: boolean): void {
        this.node.active = show;
    }

    onDestroy(): void {
        EventBus.off(GameEvents.LANDLORD_SELECTED, this.boundOnLandlordSelected);
    }
}
