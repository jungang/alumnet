import { Router, Request, Response } from 'express';
import { authService } from '../services/authService';

const router: Router = Router();

// 校友身份验证（学号+姓名）
router.post('/verify/student', async (req: Request, res: Response) => {
  try {
    const { studentId, name } = req.body;
    
    if (!studentId || !name) {
      return res.status(400).json({ 
        success: false, 
        message: '请提供学号和姓名' 
      });
    }

    const session = await authService.verifyAlumniByStudentId(studentId, name);
    
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        message: '验证失败，请检查学号和姓名是否正确' 
      });
    }

    const token = authService.generateToken({
      role: session.role,
      alumniId: session.alumniId,
      className: session.className,
    });

    res.json({ 
      success: true, 
      data: { token, session } 
    });
  } catch (error) {
    console.error('身份验证失败:', error);
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
        message: '请提供手机号和验证码' 
      });
    }

    const session = await authService.verifyAlumniByPhone(phone, otp);
    
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        message: '验证失败，请检查手机号和验证码' 
      });
    }

    const token = authService.generateToken({
      role: session.role,
      alumniId: session.alumniId,
      className: session.className,
    });

    res.json({ 
      success: true, 
      data: { token, session } 
    });
  } catch (error) {
    console.error('手机验证失败:', error);
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
        message: '请提供用户名和密码' 
      });
    }

    const result = await authService.adminLogin(username, password);
    
    if (!result) {
      return res.status(401).json({ 
        success: false, 
        message: '用户名或密码错误' 
      });
    }

    res.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error('管理员登录失败:', error);
    res.status(500).json({ success: false, message: '登录服务异常' });
  }
});

// 获取Guest Token（用于未验证用户）
router.get('/guest', (_req: Request, res: Response) => {
  const session = authService.getGuestSession();
  const token = authService.generateToken({ role: 'guest' });
  
  res.json({ 
    success: true, 
    data: { token, session } 
  });
});

export default router;
