import mysql, { Pool, PoolOptions } from 'mysql2/promise';
import { DB_CONFIG } from '../config';

const config: PoolOptions = {
  host: DB_CONFIG.host,
  port: DB_CONFIG.port,
  user: DB_CONFIG.user,
  password: DB_CONFIG.password,
  database: DB_CONFIG.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
};

export const pool: Pool = mysql.createPool(config);

/** 测试数据库连接 */
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    connection.release();
    return true;
  } catch (error) {
    console.error('[Database] MySQL connection failed:', error);
    return false;
  }
}