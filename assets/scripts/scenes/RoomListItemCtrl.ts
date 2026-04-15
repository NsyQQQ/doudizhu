/**
 * 房间列表项控制器
 */

import { _decorator, Component, Button, Label, Node } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('RoomListItemCtrl')
export class RoomListItemCtrl extends Component {
    @property(Label)
    gameLabel: Label = null!;

    @property(Label)
    statusLabel: Label = null!;

    @property(Label)
    playerCountLabel: Label = null!;

    @property(Button)
    joinButton: Button = null!;

    private roomData: any = null;
    private onJoinCallback: ((roomCode: string) => void) | null = null;

    start() {
        if (this.joinButton) {
            this.joinButton.node.on('click', this.onJoinClicked, this);
        }
    }

    /** 设置房间数据 */
    setRoomData(data: any): void {
        this.roomData = data;

        if (this.gameLabel) {
            this.gameLabel.string = `${data.gameTypeName || `玩法${data.gameType}`} ${data.roomTypeName || `房间类型${data.roomType}`}`;
        }

        if (this.statusLabel) {
            const statusText = this.getStatusText(data.status);
            this.statusLabel.string = statusText;
        }

        if (this.playerCountLabel) {
            this.playerCountLabel.string = `${data.playerCount}/${data.maxPlayers}`;
        }

        // 只有等待中的房间显示加入按钮
        if (this.joinButton) {
            this.joinButton.node.active = data.status === 'waiting';
        }
    }

    /** 设置加入按钮回调 */
    setOnJoinCallback(callback: (roomCode: string) => void): void {
        this.onJoinCallback = callback;
    }

    /** 获取状态文本 */
    private getStatusText(status: string): string {
        switch (status) {
            case 'waiting':
                return '等待中';
            case 'playing':
                return '游戏中';
            case 'ended':
                return '已结束';
            default:
                return status;
        }
    }

    /** 加入按钮点击 */
    private onJoinClicked(): void {
        if (this.onJoinCallback && this.roomData) {
            this.onJoinCallback(this.roomData.roomCode);
        }
    }

    onDestroy(): void {
        if (this.joinButton?.node) {
            this.joinButton.node.off('click', this.onJoinClicked, this);
        }
    }
}
