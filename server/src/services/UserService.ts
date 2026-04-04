import { pool } from '../db/database';
import { User, RoomPlayer } from '../models';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class UserService {
  /** 根据openid查找或创建用户 */
  async findOrCreateByOpenid(openid: string, nickname: string = '', avatar: string = ''): Promise<User | null> {
    try {
      // 查找现有用户
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM users WHERE openid = ?',
        [openid]
      );

      if (rows.length > 0) {
        return rows[0] as User;
      }

      // 创建新用户
      const [result] = await pool.query<ResultSetHeader>(
        'INSERT INTO users (openid, nickname, avatar) VALUES (?, ?, ?)',
        [openid, nickname, avatar]
      );

      if (result.affectedRows > 0) {
        const [newRows] = await pool.query<RowDataPacket[]>(
          'SELECT * FROM users WHERE id = ?',
          [result.insertId]
        );
        return newRows[0] as User;
      }

      return null;
    } catch (error) {
      console.error('[UserService] findOrCreateByOpenid error:', error);
      throw error;
    }
  }

  /** 根据openid查找用户（不创建） */
  async findByOpenid(openid: string): Promise<User | null> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM users WHERE openid = ?',
        [openid]
      );
      return rows.length > 0 ? rows[0] as User : null;
    } catch (error) {
      console.error('[UserService] findByOpenid error:', error);
      throw error;
    }
  }

  /** 根据ID查找用户 */
  async findById(id: number): Promise<User | null> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      return rows.length > 0 ? rows[0] as User : null;
    } catch (error) {
      console.error('[UserService] findById error:', error);
      throw error;
    }
  }

  /** 更新用户房间ID */
  async updateRoomId(userId: number, roomId: number): Promise<boolean> {
    try {
      const [result] = await pool.query<ResultSetHeader>(
        'UPDATE users SET room_id = ? WHERE id = ?',
        [roomId, userId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('[UserService] updateRoomId error:', error);
      throw error;
    }
  }

  /** 更新用户战绩 */
  async updateGameStats(userId: number, isWin: boolean): Promise<boolean> {
    try {
      const [result] = await pool.query<ResultSetHeader>(
        'UPDATE users SET total_games = total_games + 1, win_games = win_games + ? WHERE id = ?',
        [isWin ? 1 : 0, userId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('[UserService] updateGameStats error:', error);
      throw error;
    }
  }

  /** 获取用户信息 */
  async getUserInfo(userId: number): Promise<{ total_games: number; win_games: number; win_rate: number } | null> {
    try {
      const user = await this.findById(userId);
      if (!user) return null;

      const winRate = user.total_games > 0 ? (user.win_games / user.total_games * 100).toFixed(1) : '0.0';

      return {
        total_games: user.total_games,
        win_games: user.win_games,
        win_rate: Number(winRate)
      };
    } catch (error) {
      console.error('[UserService] getUserInfo error:', error);
      throw error;
    }
  }
}

export const userService = new UserService();