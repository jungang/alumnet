/**
 * 微信小程序登录服务
 * OAuth2.0 流程：wx.login → code → openid → 自动匹配校友档案
 * 需要配置环境变量: WECHAT_APPID, WECHAT_SECRET
 */

import { pool } from '../config/database';
import logger from '../config/logger';

const WECHAT_APPID = process.env.WECHAT_APPID || '';
const WECHAT_SECRET = process.env.WECHAT_SECRET || '';

interface WechatSession {
  openid: string;
  session_key: string;
  unionid?: string;
}

class WechatAuthService {
  /**
   * 微信小程序登录
   * 1. 用 code 换取 openid
   * 2. 通过 openid 查找已绑定的校友
   * 3. 未绑定则返回临时会话，等待绑定
   */
  async login(code: string): Promise<{
    token: string;
    refreshToken: string;
    isBound: boolean;
    alumniProfile?: any;
    wechatOpenid: string;
  }> {
    if (!WECHAT_APPID || !WECHAT_SECRET) {
      throw new Error('微信小程序未配置（WECHAT_APPID / WECHAT_SECRET）');
    }

    // 1. code → openid
    const wechatSession = await this.code2Session(code);

    // 2. 查找已绑定的校友
    const bound = await this.findBoundAlumni(wechatSession.openid);

    if (bound) {
      // 已绑定 — 生成 token
      const { authService } = await import('./authService');
      const tokens = authService.generateTokenPair({
        role: 'verified_alumni',
        alumniId: bound.id,
      });

      return {
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        isBound: true,
        alumniProfile: bound,
        wechatOpenid: wechatSession.openid,
      };
    }

    // 未绑定 — 生成临时 token（仅用于绑定流程）
    const { authService } = await import('./authService');
    const tokens = authService.generateTokenPair({ role: 'guest' });

    return {
      token: tokens.token,
      refreshToken: tokens.refreshToken,
      isBound: false,
      wechatOpenid: wechatSession.openid,
    };
  }

  /**
   * 绑定微信 openid 到校友档案
   */
  async bindAlumni(openid: string, studentId: string, name: string): Promise<any> {
    const alumni = await pool.query(
      'SELECT * FROM alumni_system.alumni WHERE student_id = $1 AND name = $2',
      [studentId, name]
    );
    if (!alumni.rows[0]) {
      throw new Error('校友信息不匹配');
    }

    // 存储 openid 到 extra_info
    await pool.query(
      `UPDATE alumni_system.alumni SET extra_info = COALESCE(extra_info, '{}') || jsonb_build_object('wechat_openid', $1) WHERE id = $2`,
      [openid, alumni.rows[0].id]
    );

    logger.info({ alumniId: alumni.rows[0].id, openid }, '微信绑定成功');
    return alumni.rows[0];
  }

  /**
   * 用 code 换取微信 session
   */
  private async code2Session(code: string): Promise<WechatSession> {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}&js_code=${code}&grant_type=authorization_code`;

    const response = await fetch(url);
    const data = await response.json() as any;

    if (data.errcode) {
      throw new Error(`微信登录失败: ${data.errmsg}`);
    }

    return {
      openid: data.openid,
      session_key: data.session_key,
      unionid: data.unionid,
    };
  }

  /**
   * 通过 openid 查找已绑定的校友
   */
  private async findBoundAlumni(openid: string): Promise<any | null> {
    const result = await pool.query(
      `SELECT * FROM alumni_system.alumni WHERE extra_info->>'wechat_openid' = $1`,
      [openid]
    );
    return result.rows[0] || null;
  }
}

export const wechatAuthService = new WechatAuthService();
