import { Router, Request, Response } from 'express';
import { userService } from '../services/UserService';

const router = Router();

/** 登录/注册（简化版，实际应该用微信登录） */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { openid, nickname, avatar } = req.body;

    if (!openid) {
      res.status(400).json({ error: 'openid is required' });
      return;
    }

    const user = await userService.findOrCreateByOpenid(openid, nickname, avatar);
    if (!user) {
      res.status(500).json({ error: 'Login failed' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        openid: user.openid,
        nickname: user.nickname,
        avatar: user.avatar,
        room_id: user.room_id
      }
    });
  } catch (error) {
    console.error('[UserRoutes] /login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/** 获取用户信息 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const userInfo = await userService.getUserInfo(userId);

    if (!userInfo) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ success: true, data: userInfo });
  } catch (error) {
    console.error('[UserRoutes] /:id error:', error);
    res.status(500).json({ error: 'Get user info failed' });
  }
});

/** 检查账号是否存在 */
router.get('/check/:openid', async (req: Request, res: Response) => {
  try {
    const { openid } = req.params;

    const user = await userService.findByOpenid(openid);
    if (!user) {
      res.json({ exists: false });
      return;
    }

    res.json({
      exists: true,
      data: {
        id: user.id,
        openid: user.openid,
        nickname: user.nickname,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('[UserRoutes] /check/:openid error:', error);
    res.status(500).json({ error: 'Check failed' });
  }
});

/** 更新用户信息 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { nickname, avatar } = req.body;

    // TODO: 实现更新逻辑
    res.json({ success: true });
  } catch (error) {
    console.error('[UserRoutes] /:id PUT error:', error);
    res.status(500).json({ error: 'Update failed' });
  }
});

export { router as userRoutes };