# 斗地主游戏服务器

## 环境要求

- Node.js >= 16
- MySQL >= 5.7

## 配置

1. 创建 `.env` 文件：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=doudizhu
PORT=3000
```

2. 初始化数据库：

```bash
mysql -u root -p < src/db/init.sql
```

## 启动

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

## API 接口

### 用户

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/user/login | 登录/注册 |
| GET | /api/user/:id | 获取用户信息 |

### 房间

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/room/create | 创建房间 |
| GET | /api/room/:roomCode | 获取房间信息 |
| DELETE | /api/room/:roomCode | 删除房间 |

## WebSocket 接口

连接地址：`ws://localhost:3000`

### 消息格式

```json
{
  "type": "room/create",
  "data": { ... },
  "timestamp": 1234567890
}
```

### 消息类型

| 类型 | 说明 |
|------|------|
| auth | 认证 |
| room/create | 创建房间 |
| room/join | 加入房间 |
| room/leave | 离开房间 |
| room/player_ready | 玩家准备 |
| room/player_join | 玩家加入（广播） |
| room/player_leave | 玩家离开（广播） |
| room/players_update | 玩家列表更新（广播） |
| game/start | 开始游戏 |
| game/action | 游戏动作（出牌/不出） |
| heartbeat | 心跳 |
