import { pool } from '../db/database';
import { Room, RoomPlayer, GameRecord } from '../models';
import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';

export class RoomService {
  /** 生成6位房间号 */
  private generateRoomCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /** 创建房间 */
  async createRoom(hostId: number, type: number = 1): Promise<Room | null> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const roomCode = this.generateRoomCode();
      const initialPlayer: RoomPlayer = {
        id: hostId,
        openid: '',
        nickname: '你',
        avatar: '',
        isReady: true,
        isHost: true,
        isAI: false,
        isEmpty: false
      };

      const [result] = await connection.query<ResultSetHeader>(
        'INSERT INTO rooms (room_code, type, status, host_id, players) VALUES (?, ?, ?, ?, ?)',
        [roomCode, type, 'waiting', hostId, JSON.stringify([initialPlayer])]
      );

      await connection.commit();

      if (result.affectedRows > 0) {
        return {
          id: result.insertId,
          room_code: roomCode,
          type,
          status: 'waiting',
          host_id: hostId,
          players: [initialPlayer],
          create_time: new Date(),
          update_time: new Date()
        };
      }

      return null;
    } catch (error) {
      await connection.rollback();
      console.error('[RoomService] createRoom error:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /** 根据房间号查找房间 */
  async findByRoomCode(roomCode: string): Promise<Room | null> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM rooms WHERE room_code = ?',
        [roomCode]
      );

      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        ...row,
        players: JSON.parse(row.players as string)
      } as Room;
    } catch (error) {
      console.error('[RoomService] findByRoomCode error:', error);
      throw error;
    }
  }

  /** 根据ID查找房间 */
  async findById(id: number): Promise<Room | null> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM rooms WHERE id = ?',
        [id]
      );

      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        ...row,
        players: JSON.parse(row.players as string)
      } as Room;
    } catch (error) {
      console.error('[RoomService] findById error:', error);
      throw error;
    }
  }

  /** 更新房间玩家列表 */
  async updatePlayers(roomId: number, players: RoomPlayer[]): Promise<boolean> {
    try {
      const [result] = await pool.query<ResultSetHeader>(
        'UPDATE rooms SET players = ? WHERE id = ?',
        [JSON.stringify(players), roomId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('[RoomService] updatePlayers error:', error);
      throw error;
    }
  }

  /** 更新房间状态 */
  async updateStatus(roomId: number, status: Room['status']): Promise<boolean> {
    try {
      const [result] = await pool.query<ResultSetHeader>(
        'UPDATE rooms SET status = ? WHERE id = ?',
        [status, roomId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('[RoomService] updateStatus error:', error);
      throw error;
    }
  }

  /** 添加玩家到房间 */
  async addPlayer(roomCode: string, player: RoomPlayer): Promise<Room | null> {
    const room = await this.findByRoomCode(roomCode);
    if (!room) return null;

    // 查找空位
    const emptyIndex = room.players.findIndex(p => p.isEmpty);
    if (emptyIndex === -1) return null; // 房间已满

    room.players[emptyIndex] = { ...player, isEmpty: false };
    await this.updatePlayers(room.id, room.players);

    return room;
  }

  /** 移除玩家从房间 */
  async removePlayer(roomCode: string, playerId: number): Promise<Room | null> {
    const room = await this.findByRoomCode(roomCode);
    if (!room) return null;

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return null;

    // 标记为空位
    room.players[playerIndex] = {
      ...room.players[playerIndex],
      isEmpty: true,
      isReady: false,
      isAI: false
    };

    await this.updatePlayers(room.id, room.players);
    return room;
  }

  /** 删除房间 */
  async deleteRoom(roomId: number): Promise<boolean> {
    try {
      const [result] = await pool.query<ResultSetHeader>(
        'DELETE FROM rooms WHERE id = ?',
        [roomId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('[RoomService] deleteRoom error:', error);
      throw error;
    }
  }

  /** 保存游戏记录 */
  async saveGameRecord(record: Omit<GameRecord, 'id' | 'create_time'>): Promise<number | null> {
    try {
      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO game_records (room_id, room_code, landlord_id, winner_id, player_scores, base_score, multiple)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [record.room_id, record.room_code, record.landlord_id, record.winner_id,
         JSON.stringify(record.player_scores), record.base_score, record.multiple]
      );
      return result.insertId;
    } catch (error) {
      console.error('[RoomService] saveGameRecord error:', error);
      throw error;
    }
  }
}

export const roomService = new RoomService();