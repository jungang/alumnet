#!/usr/bin/env python3
"""
管理后台端到端测试脚本
"""
import requests
import json
import sys
import os

ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'changeme')

base_url = 'http://localhost:3000'
token = None
headers = {}

def test_admin_login():
    global token, headers
    print('='*70)
    print('1. 测试管理员登录')
    print('='*70)
    
    login_data = {'username': 'admin', 'password': ADMIN_PASSWORD}
    
    try:
        resp = requests.post(f'{base_url}/api/auth/admin/login', json=login_data, timeout=5)
        print(f'  登录状态: {resp.status_code}')
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                token = data['data']['token']
                headers = {'Authorization': f'Bearer {token}'}
                print('  [OK] 登录成功，获取到 token')
                return True
            else:
                msg = data.get('message', '未知错误')
                print(f'  [FAIL] 登录失败: {msg}')
                return False
        else:
            print(f'  [FAIL] 登录请求失败')
            return False
    except Exception as e:
        print(f'  [ERROR] {e}')
        return False

def test_admin_apis():
    print()
    print('='*70)
    print('2. 测试管理后台API')
    print('='*70)
    
    admin_apis = [
        '/api/admin/alumni',
        '/api/admin/distinguished',
        '/api/admin/photos',
        '/api/admin/messages',
        '/api/admin/stats/overview',
        '/api/admin/donation-projects',
        '/api/admin/associations',
    ]
    
    results = {}
    for endpoint in admin_apis:
        try:
            url = f'{base_url}{endpoint}'
            response = requests.get(url, headers=headers, timeout=5)
            ok = response.status_code == 200
            status = 'OK' if ok else 'FAIL'
            print(f'  [{status}] {endpoint}: {response.status_code}')
            results[endpoint] = ok
        except Exception as e:
            print(f'  [ERROR] {endpoint}: {e}')
            results[endpoint] = False
    
    return results

def test_crud_operations():
    print()
    print('='*70)
    print('3. 测试增删改查操作')
    print('='*70)
    
    results = {}
    
    # 3.1 创建校友（Create）
    print('\n  3.1 创建校友（Create）')
    new_alumni = {
        'name': '测试校友',
        'studentId': 'TEST001',
        'graduationYear': 2020,
        'className': '测试班级',
        'industry': '科技',
        'currentCity': '北京',
        'workUnit': '测试公司',
        'phone': '13800138000',
        'email': 'test@example.com',
        'biography': '这是一个测试校友'
    }
    
    try:
        resp = requests.post(f'{base_url}/api/admin/alumni', 
                           json=new_alumni, headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                alumni_id = data['data']['id']
                print(f'    [OK] 创建校友成功，ID: {alumni_id}')
                results['create'] = {'success': True, 'id': alumni_id}
            else:
                msg = data.get('message', '未知错误')
                print(f'    [WARN] 创建校友返回失败: {msg}')
                results['create'] = {'success': False, 'error': msg}
        else:
            print(f'    [WARN] 创建校友 HTTP {resp.status_code}')
            results['create'] = {'success': False, 'status': resp.status_code}
    except Exception as e:
        print(f'    [ERROR] 创建校友错误: {e}')
        results['create'] = {'success': False, 'error': str(e)}
    
    # 3.2 查询校友列表（Read）
    print('\n  3.2 查询校友列表（Read）')
    try:
        resp = requests.get(f'{base_url}/api/admin/alumni?page=1&pageSize=10', 
                          headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                items = data.get('data', {}).get('items', [])
                total = data.get('data', {}).get('total', 0)
                print(f'    [OK] 查询成功，共 {total} 条记录，本页 {len(items)} 条')
                results['read'] = {'success': True, 'count': len(items), 'total': total}
            else:
                msg = data.get('message', '未知错误')
                print(f'    [WARN] 查询返回失败: {msg}')
                results['read'] = {'success': False, 'error': msg}
        else:
            print(f'    [WARN] 查询 HTTP {resp.status_code}')
            results['read'] = {'success': False, 'status': resp.status_code}
    except Exception as e:
        print(f'    [ERROR] 查询错误: {e}')
        results['read'] = {'success': False, 'error': str(e)}
    
    # 3.3 更新校友（Update）
    print('\n  3.3 更新校友（Update）')
    if results.get('create', {}).get('success'):
        alumni_id = results['create']['id']
        update_data = {'workUnit': '更新后的公司', 'currentCity': '上海'}
        try:
            resp = requests.put(f'{base_url}/api/admin/alumni/{alumni_id}',
                              json=update_data, headers=headers, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                if data.get('success'):
                    print('    [OK] 更新校友成功')
                    results['update'] = {'success': True}
                else:
                    msg = data.get('message', '未知错误')
                    print(f'    [WARN] 更新返回失败: {msg}')
                    results['update'] = {'success': False, 'error': msg}
            else:
                print(f'    [WARN] 更新 HTTP {resp.status_code}')
                results['update'] = {'success': False, 'status': resp.status_code}
        except Exception as e:
            print(f'    [ERROR] 更新错误: {e}')
            results['update'] = {'success': False, 'error': str(e)}
    else:
        print('    [SKIP] 跳过（创建失败）')
        results['update'] = {'success': False, 'skipped': True}
    
    # 3.4 删除校友（Delete）
    print('\n  3.4 删除校友（Delete）')
    if results.get('create', {}).get('success'):
        alumni_id = results['create']['id']
        try:
            resp = requests.delete(f'{base_url}/api/admin/alumni/{alumni_id}',
                                 headers=headers, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                if data.get('success'):
                    print('    [OK] 删除校友成功')
                    results['delete'] = {'success': True}
                else:
                    msg = data.get('message', '未知错误')
                    print(f'    [WARN] 删除返回失败: {msg}')
                    results['delete'] = {'success': False, 'error': msg}
            else:
                print(f'    [WARN] 删除 HTTP {resp.status_code}')
                results['delete'] = {'success': False, 'status': resp.status_code}
        except Exception as e:
            print(f'    [ERROR] 删除错误: {e}')
            results['delete'] = {'success': False, 'error': str(e)}
    else:
        print('    [SKIP] 跳过（创建失败）')
        results['delete'] = {'success': False, 'skipped': True}
    
    return results

def seed_test_data():
    print()
    print('='*70)
    print('4. 检查并填充测试数据')
    print('='*70)
    
    seeded = {}
    
    # 检查校友数量
    try:
        resp = requests.get(f'{base_url}/api/admin/alumni?page=1&pageSize=1', 
                          headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            total = data.get('data', {}).get('total', 0)
            print(f'  当前校友数量: {total}')
            
            if total < 5:
                print('  数据量不足，开始填充测试数据...')
                
                test_alumni_list = [
                    {'name': '张三', 'studentId': '2018001', 'graduationYear': 2018, 'className': '高三1班', 'industry': '科技', 'currentCity': '北京'},
                    {'name': '李四', 'studentId': '2018002', 'graduationYear': 2018, 'className': '高三1班', 'industry': '金融', 'currentCity': '上海'},
                    {'name': '王五', 'studentId': '2019001', 'graduationYear': 2019, 'className': '高三2班', 'industry': '教育', 'currentCity': '广州'},
                    {'name': '赵六', 'studentId': '2020001', 'graduationYear': 2020, 'className': '高三3班', 'industry': '医疗', 'currentCity': '深圳'},
                    {'name': '钱七', 'studentId': '2021001', 'graduationYear': 2021, 'className': '高三1班', 'industry': '文化', 'currentCity': '杭州'},
                ]
                
                success_count = 0
                for alumni in test_alumni_list:
                    try:
                        resp = requests.post(f'{base_url}/api/admin/alumni',
                                           json=alumni, headers=headers, timeout=5)
                        if resp.status_code == 200 and resp.json().get('success'):
                            success_count += 1
                    except:
                        pass
                
                print(f'  [OK] 成功填充 {success_count} 条校友数据')
                seeded['alumni'] = success_count
            else:
                print('  [OK] 校友数据充足，无需填充')
                seeded['alumni'] = 0
    except Exception as e:
        print(f'  [ERROR] 检查数据失败: {e}')
        seeded['error'] = str(e)
    
    return seeded

def generate_report(login_ok, api_results, crud_results, seeded):
    print()
    print('='*70)
    print('测试报告')
    print('='*70)
    
    print('\n[登录测试]')
    status = '[OK] 通过' if login_ok else '[FAIL] 失败'
    print(f'  {status}')
    
    print('\n[API可用性测试]')
    api_passed = sum(1 for v in api_results.values() if v)
    api_total = len(api_results)
    print(f'  通过: {api_passed}/{api_total}')
    for endpoint, ok in api_results.items():
        status = 'OK' if ok else 'FAIL'
        print(f'  [{status}] {endpoint}')
    
    print('\n[CRUD功能测试]')
    for op, result in crud_results.items():
        if result.get('success'):
            print(f'  [OK] {op.upper()}: 成功')
        elif result.get('skipped'):
            print(f'  [SKIP] {op.upper()}: 跳过')
        else:
            err = result.get('error') or result.get('status') or 'unknown'
            print(f'  [FAIL] {op.upper()}: 失败 - {err}')
    
    print('\n[数据填充]')
    for key, count in seeded.items():
        if key != 'error':
            print(f'  [OK] {key}: 新增 {count} 条记录')
    
    print('\n[总体状态]')
    crud_ok = all(r.get('success') for r in crud_results.values() if not r.get('skipped'))
    all_ok = login_ok and all(api_results.values()) and crud_ok
    if all_ok:
        print('  [OK] 所有测试通过')
    else:
        print('  [WARN] 部分测试失败，需要修复')
    
    return all_ok

if __name__ == '__main__':
    print('开始管理后台端到端测试...')
    print(f'目标服务器: {base_url}')
    
    login_ok = test_admin_login()
    
    if not login_ok:
        print('\n[FAIL] 登录失败，终止测试')
        sys.exit(1)
    
    api_results = test_admin_apis()
    crud_results = test_crud_operations()
    seeded = seed_test_data()
    
    all_ok = generate_report(login_ok, api_results, crud_results, seeded)
    
    sys.exit(0 if all_ok else 1)
