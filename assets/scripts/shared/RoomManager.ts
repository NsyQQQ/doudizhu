/**
 * 房间管理模块
 */

import { Hand } from '../core/Hand';

/** 玩家接口（游戏逻辑用） */
export interface Player {
    id: number;
    name: string;
    avatar: string;
    hand: Hand;
    isLandlord: boolean;
    isHuman: boolean;
}

/** 创建玩家 */
export function createPlayer(id: number, name: string, isHuman: boolean, avatar: string = ''): Player {
    return {
        id,
        name,
        avatar,
        hand: new Hand(),
        isLandlord: false,
        isHuman,
    };
}

/** 玩家信息（房间管理用） */
export interface PlayerInfoData {
    id: number;
    name: string;
    avatar: string;
    isReady: boolean;
    isHost: boolean;
    isAI: boolean;
    isEmpty?: boolean;
}

/** 房间信息 */
export interface RoomInfo {
    id: number;
    type: number;      // 房间类型 1-6
    playerCount: number;
    status: 'waiting' | 'playing' | 'ended';
    players: PlayerInfoData[];  // 玩家列表
}

/** 房间管理器 */
export class RoomManager {
    private static instance: RoomManager;
    /** 房间列表：key 是房间类型(1-6)，value 是该类型下的房间数组 */
    private rooms: Map<number, RoomInfo[]> = new Map();

    private constructor() {
        // 初始化6种房间类型
        for (let i = 1; i <= 6; i++) {
            this.rooms.set(i, []);
        }
    }

    static getInstance(): RoomManager {
        if (!RoomManager.instance) {
            RoomManager.instance = new RoomManager();
        }
        return RoomManager.instance;
    }

    /** 创建房间 */
    createRoom(type: number): RoomInfo {
        const roomId = Math.floor(Math.random() * 9000) + 1000; // 4位数
        const room: RoomInfo = {
            id: roomId,
            type,
            playerCount: 1,
            status: 'waiting',
            players: [{
                id: 0,
                name: '你',
                avatar: '',
                isReady: true,
                isHost: true,
                isAI: false,
                isEmpty: false
            }]
        };
        this.rooms.get(type)?.push(room);
        return room;
    }

    /** 根据房间ID查找房间 */
    findRoomById(roomId: number): RoomInfo | undefined {
        for (const rooms of this.rooms.values()) {
            const found = rooms.find(r => r.id === roomId);
            if (found) return found;
        }
        return undefined;
    }

    /** 获取指定类型的房间列表 */
    getRoomsByType(type: number): RoomInfo[] {
        return this.rooms.get(type) || [];
    }

    /** 获取所有房间 */
    getAllRooms(): RoomInfo[] {
        const all: RoomInfo[] = [];
        for (const rooms of this.rooms.values()) {
            all.push(...rooms);
        }
        return all;
    }

    /** 获取房间人数 */
    getRoomPlayerCount(roomId: number): number {
        const room = this.findRoomById(roomId);
        return room ? room.playerCount : 0;
    }

    /** 获取房间玩家列表 */
    getRoomPlayers(roomId: number): PlayerInfoData[] {
        const room = this.findRoomById(roomId);
        return room ? room.players : [];
    }

    /** 更新房间玩家列表 */
    updateRoomPlayers(roomId: number, players: PlayerInfoData[]): void {
        const room = this.findRoomById(roomId);
        if (room) {
            room.players = players;
            room.playerCount = players.filter(p => !p.isEmpty).length;
        }
    }

    /** 加入房间 */
    joinRoom(roomId: number): boolean {
        const room = this.findRoomById(roomId);
        if (room && room.status === 'waiting') {
            room.playerCount++;
            return true;
        }
        return false;
    }

    /** 离开房间 */
    leaveRoom(roomId: number): void {
        const room = this.findRoomById(roomId);
        if (room && room.playerCount > 0) {
            room.playerCount--;
            if (room.playerCount <= 0) {
                this.removeRoom(roomId);
            }
        }
    }

    /** 删除房间 */
    removeRoom(roomId: number): void {
        for (const [, rooms] of this.rooms) {
            const index = rooms.findIndex(r => r.id === roomId);
            if (index !== -1) {
                rooms.splice(index, 1);
                break;
            }
        }
    }

    /** 更新房间状态 */
    updateRoomStatus(roomId: number, status: RoomInfo['status']): void {
        const room = this.findRoomById(roomId);
        if (room) {
            room.status = status;
        }
    }

    /** 清空所有房间 */
    clearAll(): void {
        for (const rooms of this.rooms.values()) {
            rooms.length = 0;
        }
    }
}