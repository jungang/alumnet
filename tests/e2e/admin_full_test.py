#!/usr/bin/env python3
"""
管理后台全功能端到端测试脚本
覆盖所有模块、菜单、按钮、功能点
"""
import requests
import json
import sys
import os
from datetime import datetime

ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'changeme')

base_url = 'http://localhost:3000'
token = None
headers = {}
test_results = []

def log(test_name, status, detail=''):
    """记录测试结果"""
    icon = '✓' if status else '✗'
    test_results.append({
        'name': test_name,
        'status': status,
        'detail': detail
    })
    print(f'  {icon} {test_name}: {detail}' if detail else f'  {icon} {test_name}')
    return status

def admin_login():
    """1. 测试登录模块"""
    global token, headers
    print('='*70)
    print('【1. 登录模块测试】')
    print('='*70)
    
    # 1.1 正常登录
    try:
        resp = requests.post(f'{base_url}/api/auth/admin/login',
                           json={'username': 'admin', 'password': ADMIN_PASSWORD},
                           timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                token = data['data']['token']
                headers = {'Authorization': f'Bearer {token}'}
                log('正常登录', True, f'获取token成功')
            else:
                log('正常登录', False, data.get('message'))
                return False
        else:
            log('正常登录', False, f'HTTP {resp.status_code}')
            return False
    except Exception as e:
        log('正常登录', False, str(e))
        return False
    
    # 1.2 错误密码登录
    try:
        resp = requests.post(f'{base_url}/api/auth/admin/login',
                           json={'username': 'admin', 'password': 'wrong'},
                           timeout=3)
        if resp.status_code == 200:
            data = resp.json()
            log('错误密码拒绝', not data.get('success'), '正确拒绝错误密码')
        else:
            log('错误密码拒绝', True, f'HTTP {resp.status_code}')
    except Exception as e:
        log('错误密码拒绝', False, str(e))
    
    return True

def test_dashboard():
    """2. 测试数据仪表盘"""
    print('\n' + '='*70)
    print('【2. 数据仪表盘测试】')
    print('='*70)
    
    try:
        resp = requests.get(f'{base_url}/api/admin/stats/overview',
                          headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                stats = data.get('data', {})
                checks = [
                    ('totalAlumni', '校友总数'),
                    ('totalDistinguished', '杰出校友数'),
                    ('totalMessages', '留言总数'),
                    ('pendingMessages', '待审核留言'),
                    ('totalDonations', '捐赠笔数'),
                    ('totalDonationAmount', '捐赠总额'),
                ]
                for key, name in checks:
                    val = stats.get(key)
                    if val is not None:
                        log(f'{name}统计', True, f'{val}')
                    else:
                        log(f'{name}统计', False, '字段缺失')
            else:
                log('统计数据加载', False, data.get('message'))
        else:
            log('统计数据加载', False, f'HTTP {resp.status_code}')
    except Exception as e:
        log('统计数据加载', False, str(e))

def test_alumni_management():
    """3. 测试校友管理"""
    print('\n' + '='*70)
    print('【3. 校友管理测试】')
    print('='*70)
    
    test_id = None
    
    # 3.1 创建校友
    try:
        new_alumni = {
            'name': '测试校友-' + datetime.now().strftime('%H%M%S'),
            'studentId': 'TEST' + datetime.now().strftime('%H%M%S'),
            'graduationYear': 2020,
            'className': '测试班级',
            'industry': '科技',
            'currentCity': '北京',
            'workUnit': '测试公司',
            'phone': '13800138000',
            'email': 'test@example.com',
        }
        resp = requests.post(f'{base_url}/api/admin/alumni',
                           json=new_alumni, headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                test_id = data['data']['id']
                log('创建校友', True, f'ID: {test_id[:8]}...')
            else:
                log('创建校友', False, data.get('message'))
        else:
            log('创建校友', False, f'HTTP {resp.status_code}')
    except Exception as e:
        log('创建校友', False, str(e))
    
    # 3.2 查询校友列表
    try:
        resp = requests.get(f'{base_url}/api/admin/alumni?page=1&pageSize=10',
                          headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                total = data['data'].get('total', 0)
                items = len(data['data'].get('items', []))
                log('查询校友列表', True, f'共{total}条，本页{items}条')
            else:
                log('查询校友列表', False, data.get('message'))
        else:
            log('查询校友列表', False, f'HTTP {resp.status_code}')
    except Exception as e:
        log('查询校友列表', False, str(e))
    
    # 3.3 搜索校友
    try:
        resp = requests.get(f'{base_url}/api/admin/alumni?keyword=测试&page=1&pageSize=10',
                          headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                log('搜索校友', True, '搜索功能正常')
            else:
                log('搜索校友', False, data.get('message'))
        else:
            log('搜索校友', False, f'HTTP {resp.status_code}')
    except Exception as e:
        log('搜索校友', False, str(e))
    
    # 3.4 更新校友
    if test_id:
        try:
            update_data = {'workUnit': '更新后的公司', 'currentCity': '上海'}
            resp = requests.put(f'{base_url}/api/admin/alumni/{test_id}',
                              json=update_data, headers=headers, timeout=5)
            if resp.status_code == 200 and resp.json().get('success'):
                log('更新校友', True, '更新成功')
            else:
                log('更新校友', False, f'HTTP {resp.status_code}')
        except Exception as e:
            log('更新校友', False, str(e))
        
        # 3.5 删除校友
        try:
            resp = requests.delete(f'{base_url}/api/admin/alumni/{test_id}',
                                 headers=headers, timeout=5)
            if resp.status_code == 200 and resp.json().get('success'):
                log('删除校友', True, '删除成功')
            else:
                log('删除校友', False, f'HTTP {resp.status_code}')
        except Exception as e:
            log('删除校友', False, str(e))

def test_distinguished_management():
    """4. 测试杰出校友管理"""
    print('\n' + '='*70)
    print('【4. 杰出校友管理测试】')
    print('='*70)
    
    # 4.1 获取分类列表
    try:
        resp = requests.get(f'{base_url}/api/admin/distinguished-categories',
                          headers=headers, timeout=5)
        log('获取分类列表', resp.status_code == 200)
    except Exception as e:
        log('获取分类列表', False, str(e))
    
    # 4.2 获取杰出校友列表
    try:
        resp = requests.get(f'{base_url}/api/admin/distinguished?page=1&pageSize=10',
                          headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                total = data['data'].get('total', 0)
                log('查询杰出校友列表', True, f'共{total}条')
            else:
                log('查询杰出校友列表', False, data.get('message'))
        else:
            log('查询杰出校友列表', False, f'HTTP {resp.status_code}')
    except Exception as e:
        log('查询杰出校友列表', False, str(e))

def test_photo_management():
    """5. 测试毕业照管理"""
    print('\n' + '='*70)
    print('【5. 毕业照管理测试】')
    print('='*70)
    
    # 5.1 获取毕业照列表
    try:
        resp = requests.get(f'{base_url}/api/admin/photos?page=1&pageSize=10',
                          headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                total = data['data'].get('total', 0)
                log('查询毕业照列表', True, f'共{total}条')
            else:
                log('查询毕业照列表', False, data.get('message'))
        else:
            log('查询毕业照列表', False, f'HTTP {resp.status_code}')
    except Exception as e:
        log('查询毕业照列表', False, str(e))
    
    # 5.2 获取筛选项
    try:
        resp = requests.get(f'{base_url}/api/admin/photos/options',
                          headers=headers, timeout=5)
        log('获取毕业照筛选项', resp.status_code == 200)
    except Exception as e:
        log('获取毕业照筛选项', False, str(e))

def test_news_management():
    """6. 测试校友动态/新闻管理"""
    print('\n' + '='*70)
    print('【6. 校友动态管理测试】')
    print('='*70)
    
    try:
        resp = requests.get(f'{base_url}/api/admin/news?page=1&pageSize=10',
                          headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                total = data['data'].get('total', 0)
                log('查询校友动态列表', True, f'共{total}条')
            else:
                log('查询校友动态列表', False, data.get('message'))
        else:
            log('查询校友动态列表', False, f'HTTP {resp.status_code}')
    except Exception as e:
        log('查询校友动态列表', False, str(e))

def test_top_scholar_management():
    """7. 测试状元榜管理"""
    print('\n' + '='*70)
    print('【7. 状元榜管理测试】')
    print('='*70)
    
    try:
        resp = requests.get(f'{base_url}/api/admin/top-scholars?page=1&pageSize=10',
                          headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                total = data['data'].get('total', 0)
                log('查询状元榜列表', True, f'共{total}条')
            else:
                log('查询状元榜列表', False, data.get('message'))
        else:
            log('查询状元榜列表', False, f'HTTP {resp.status_code}')
    except Exception as e:
        log('查询状元榜列表', False, str(e))

def test_time_corridor():
    """8. 测试时空长廊"""
    print('\n' + '='*70)
    print('【8. 时空长廊测试】')
    print('='*70)
    
    # 8.1 时空长廊统计
    try:
        resp = requests.get(f'{base_url}/api/admin/stats/time-corridor',
                          headers=headers, timeout=5)
        log('时空长廊统计', resp.status_code == 200)
    except Exception as e:
        log('时空长廊统计', False, str(e))
    
    # 8.2 毕业照年份统计
    try:
        resp = requests.get(f'{base_url}/api/admin/stats/photos-by-year',
                          headers=headers, timeout=5)
        log('毕业照年份统计', resp.status_code == 200)
    except Exception as e:
        log('毕业照年份统计', False, str(e))
    
    # 8.3 老物件管理
    try:
        resp = requests.get(f'{base_url}/api/admin/vintage-items?page=1&pageSize=10',
                          headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                total = data['data'].get('total', 0)
                log('查询老物件列表', True, f'共{total}条')
            else:
                log('查询老物件列表', False, data.get('message'))
        else:
            log('查询老物件列表', False, f'HTTP {resp.status_code}')
    except Exception as e:
        log('查询老物件列表', False, str(e))

def test_interaction():
    """9. 测试互动寄语"""
    print('\n' + '='*70)
    print('【9. 互动寄语测试】')
    print('='*70)
    
    # 9.1 留言管理
    try:
        resp = requests.get(f'{base_url}/api/admin/messages?page=1&pageSize=10',
                          headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                total = data['data'].get('total', 0)
                log('查询留言列表', True, f'共{total}条')
            else:
                log('查询留言列表', False, data.get('message'))
        else:
            log('查询留言列表', False, f'HTTP {resp.status_code}')
    except Exception as e:
        log('查询留言列表', False, str(e))
    
    # 9.2 视频寄语管理
    try:
        resp = requests.get(f'{base_url}/api/admin/video-greetings?page=1&pageSize=10',
                          headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                total = data['data'].get('total', 0)
                log('查询视频寄语列表', True, f'共{total}条')
            else:
                log('查询视频寄语列表', False, data.get('message'))
        else:
            log('查询视频寄语列表', False, f'HTTP {resp.status_code}')
    except Exception as e:
        log('查询视频寄语列表', False, str(e))
    
    # 9.3 互动统计
    try:
        resp = requests.get(f'{base_url}/api/admin/interaction-stats',
                          headers=headers, timeout=5)
        log('互动统计', resp.status_code == 200)
    except Exception as e:
        log('互动统计', False, str(e))

def test_notices():
    """10. 测试寻人启事管理"""
    print('\n' + '='*70)
    print('【10. 寻人启事管理测试】')
    print('='*70)
    
    try:
        resp = requests.get(f'{base_url}/api/admin/notices?page=1&pageSize=10',
                          headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                total = data['data'].get('total', 0)
                log('查询寻人启事列表', True, f'共{total}条')
            else:
                log('查询寻人启事列表', False, data.get('message'))
        else:
            log('查询寻人启事列表', False, f'HTTP {resp.status_code}')
    except Exception as e:
        log('查询寻人启事列表', False, str(e))

def test_donation_projects():
    """11. 测试捐赠项目管理"""
    print('\n' + '='*70)
    print('【11. 捐赠项目管理测试】')
    print('='*70)
    
    try:
        resp = requests.get(f'{base_url}/api/admin/donation-projects?page=1&pageSize=10',
                          headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                total = data['data'].get('total', 0)
                log('查询捐赠项目列表', True, f'共{total}条')
            else:
                log('查询捐赠项目列表', False, data.get('message'))
        else:
            log('查询捐赠项目列表', False, f'HTTP {resp.status_code}')
    except Exception as e:
        log('查询捐赠项目列表', False, str(e))

def test_associations():
    """12. 测试校友会管理"""
    print('\n' + '='*70)
    print('【12. 校友会管理测试】')
    print('='*70)
    
    try:
        resp = requests.get(f'{base_url}/api/admin/associations?page=1&pageSize=10',
                          headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                total = data['data'].get('total', 0)
                log('查询校友会列表', True, f'共{total}条')
            else:
                log('查询校友会列表', False, data.get('message'))
        else:
            log('查询校友会列表', False, f'HTTP {resp.status_code}')
    except Exception as e:
        log('查询校友会列表', False, str(e))

def test_class_rosters():
    """13. 测试班级名录管理"""
    print('\n' + '='*70)
    print('【13. 班级名录管理测试】')
    print('='*70)
    
    try:
        resp = requests.get(f'{base_url}/api/admin/class-rosters?page=1&pageSize=10',
                          headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                total = data['data'].get('total', 0)
                log('查询班级名录列表', True, f'共{total}条')
            else:
                log('查询班级名录列表', False, data.get('message'))
        else:
            log('查询班级名录列表', False, f'HTTP {resp.status_code}')
    except Exception as e:
        log('查询班级名录列表', False, str(e))

def test_knowledge_base():
    """14. 测试知识库管理"""
    print('\n' + '='*70)
    print('【14. 知识库管理测试】')
    print('='*70)
    
    try:
        resp = requests.get(f'{base_url}/api/admin/knowledge-base?page=1&pageSize=10',
                          headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                total = data['data'].get('total', 0)
                log('查询知识库列表', True, f'共{total}条')
            else:
                log('查询知识库列表', False, data.get('message'))
        else:
            log('查询知识库列表', False, f'HTTP {resp.status_code}')
    except Exception as e:
        log('查询知识库列表', False, str(e))

def test_system_config():
    """15. 测试系统设置"""
    print('\n' + '='*70)
    print('【15. 系统设置测试】')
    print('='*70)
    
    try:
        resp = requests.get(f'{base_url}/api/admin/config',
                          headers=headers, timeout=5)
        log('获取系统配置', resp.status_code == 200)
    except Exception as e:
        log('获取系统配置', False, str(e))

def test_system_logs():
    """16. 测试系统日志"""
    print('\n' + '='*70)
    print('【16. 系统日志测试】')
    print('='*70)
    
    try:
        resp = requests.get(f'{base_url}/api/admin/logs?page=1&pageSize=10',
                          headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                total = data['data'].get('total', 0)
                log('查询系统日志', True, f'共{total}条')
            else:
                log('查询系统日志', False, data.get('message'))
        else:
            log('查询系统日志', False, f'HTTP {resp.status_code}')
    except Exception as e:
        log('查询系统日志', False, str(e))

def generate_report():
    """生成测试报告"""
    print('\n' + '='*70)
    print('【测试报告汇总】')
    print('='*70)
    
    passed = sum(1 for r in test_results if r['status'])
    failed = sum(1 for r in test_results if not r['status'])
    total = len(test_results)
    
    print(f'\n总计: {total} 项测试')
    print(f'通过: {passed} 项')
    print(f'失败: {failed} 项')
    print(f'通过率: {passed/total*100:.1f}%' if total > 0 else '0%')
    
    if failed > 0:
        print('\n【失败项详情】')
        for r in test_results:
            if not r['status']:
                print(f'  ✗ {r["name"]}: {r.get("detail", "")}')
    
    print('\n' + '='*70)
    return failed == 0

if __name__ == '__main__':
    print('开始管理后台全功能端到端测试...')
    print(f'目标服务器: {base_url}')
    print(f'测试时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    
    # 执行所有测试
    if not admin_login():
        print('\n登录失败，终止测试')
        sys.exit(1)
    
    test_dashboard()
    test_alumni_management()
    test_distinguished_management()
    test_photo_management()
    test_news_management()
    test_top_scholar_management()
    test_time_corridor()
    test_interaction()
    test_notices()
    test_donation_projects()
    test_associations()
    test_class_rosters()
    test_knowledge_base()
    test_system_config()
    test_system_logs()
    
    # 生成报告
    all_passed = generate_report()
    
    sys.exit(0 if all_passed else 1)
