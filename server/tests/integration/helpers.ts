/**
 * 集成测试辅助 - 创建测试用 Express 应用实例
 * 
 * 避免 `app.listen()` 被调用，由 supertest 自动管理端口
 */

import request from 'supertest';
import { AppModule } from '../../src/app';

// 缓存 app 实例（同一测试文件内复用）
let appInstance: any = null;

/**
 * 获取测试用的 Express 应用实例
 * 不启动监听端口，由 supertest 自动处理
 */
export function getTestApp() {
  if (!appInstance) {
    // 导入 app 模块，但避免调用 listen
    // app.ts 必须导出 app 实例（或我们直接构造）
    try {
      appInstance = require('../../src/app').app || require('../../src/app').default;
    } catch {
      // 如果 app.ts 不直接导出 express 实例，则构造
      const express = require('express');
      appInstance = express();
    }
  }
  return appInstance;
}

/**
 * 创建 supertest 请求器
 * 用法：const api = createTestClient(); await api.get('/alumni/search')
 */
export function createTestClient() {
  return request(getTestApp());
}

/**
 * 带认证的请求器
 * 用法：const auth = createAuthClient('admin-token'); await auth.get('/admin/...')
 */
export function createAuthClient(token: string) {
  const req = request(getTestApp());
  return {
    get: (url: string) => req.get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => req.post(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) => req.put(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) => req.delete(url).set('Authorization', `Bearer ${token}`),
    patch: (url: string) => req.patch(url).set('Authorization', `Bearer ${token}`),
  };
}
