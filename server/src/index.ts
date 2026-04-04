import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import { testConnection } from './db/database';
import { wsHandler } from './websocket/WebSocketHandler';
import { userRoutes } from './routes/user';
import { roomRoutes } from './routes/room';

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 请求日志
app.use((req: Request, res: Response, next: NextFunction) => {
  next();
});

// 路由
app.use('/api/user', userRoutes);
app.use('/api/room', roomRoutes);

// 健康检查
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 错误处理
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 创建HTTP服务器
const server = http.createServer(app);

// 初始化WebSocket
wsHandler.initialize(server);

// 启动服务器
async function start() {
  // 测试数据库连接
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('[Server] Database connection failed, please check your MySQL configuration');
  }

  server.listen(PORT, () => {
  });
}

start();