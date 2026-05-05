import { Router, Request, Response } from 'express';
import { authService } from '../services/authService';
import { wechatAuthService } from '../services/wechatAuthService';
import logger from '../config/logger';

const router: Router = Router();

// 校友身份验证（学号+姓名）
router.post('/verify/student', async (req: Request, res: Response) => {
  try {
    const { studentId, name } = req.body;

    if (!studentId || !name) {
      return res.status(400).json({
        success: false,
        message: '请提供学号和姓名',
      });
    }

    const session = await authService.verifyAlumniByStudentId(studentId, name);

    if (!session) {
      return res.status(401).json({
        success: false,
        message: '验证失败，请检查学号和姓名是否正确',
      });
    }

    const tokens = authService.generateTokenPair({
      role: session.role,
      alumniId: session.alumniId,
      className: session.className,
    });

    res.json({
      success: true,
      data: { token: tokens.token, refreshToken: tokens.refreshToken, session },
    });
  } catch (error) {
    logger.error({ err: error }, '身份验证失败');
    res.status(500).json({ success: false, message: '验证服务异常' });
  }
});

// 校友身份验证（手机OTP）
router.post('/verify/phone', async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: '请提供手机号和验证码',
      });
    }

    const session = await authService.verifyAlumniByPhone(phone, otp);

    if (!session) {
      return res.status(401).json({
        success: false,
        message: '验证失败，请检查手机号和验证码',
      });
    }

    const tokens = authService.generateTokenPair({
      role: session.role,
      alumniId: session.alumniId,
      className: session.className,
    });

    res.json({
      success: true,
      data: { token: tokens.token, refreshToken: tokens.refreshToken, session },
    });
  } catch (error) {
    logger.error({ err: error }, '手机验证失败');
    res.status(500).json({ success: false, message: '验证服务异常' });
  }
});

// 管理员登录
router.post('/admin/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '请提供用户名和密码',
      });
    }

    const result = await authService.adminLogin(username, password);

    if (!result) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误',
      });
    }

    // 使用 token pair
    const tokens = authService.generateTokenPair({
      userId: result.user.id,
      role: result.user.role === 'super_admin' ? 'super_admin' : 'admin',
      alumniId: result.user.alumniId,
    });

    res.json({
      success: true,
      data: {
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        user: result.user,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '管理员登录失败');
    res.status(500).json({ success: false, message: '登录服务异常' });
  }
});

// 获取Guest Token
router.get('/guest', (_req: Request, res: Response) => {
  const session = authService.getGuestSession();
  const token = authService.generateToken({ role: 'guest' });

  res.json({
    success: true,
    data: { token, session },
  });
});

// ---- Refresh Token ----
router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ success: false, message: '请提供 refresh token' });
  }

  const result = authService.refreshAccessToken(refreshToken);
  if (!result) {
    return res.status(401).json({ success: false, message: 'Refresh token 无效或已过期' });
  }

  res.json({ success: true, data: result });
});

// ---- Logout（Token 黑名单）----
router.post('/logout', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const { refreshToken } = req.body;

  if (token) authService.blacklistToken(token);
  if (refreshToken) authService.blacklistToken(refreshToken, 30 * 24 * 3600 * 1000);

  res.json({ success: true, message: '已安全退出' });
});

// ---- 微信小程序登录 ----
router.post('/wechat/login', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: '缺少微信登录 code' });

    const result = await wechatAuthService.login(code);
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error({ err: error }, '微信登录失败');
    res.status(500).json({ success: false, message: error.message || '微信登录失败' });
  }
});

// ---- 微信绑定校友档案 ----
router.post('/wechat/bind', async (req: Request, res: Response) => {
  try {
    const { openid, studentId, name } = req.body;
    if (!openid || !studentId || !name) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const alumni = await wechatAuthService.bindAlumni(openid, studentId, name);

    // 绑定成功，生成正式 token
    const tokens = authService.generateTokenPair({
      role: 'verified_alumni',
      alumniId: alumni.id,
    });

    res.json({ success: true, data: { token: tokens.token, refreshToken: tokens.refreshToken, alumni } });
  } catch (error: any) {
    logger.error({ err: error }, '微信绑定失败');
    res.status(400).json({ success: false, message: error.message || '绑定失败' });
  }
});

export default router;
