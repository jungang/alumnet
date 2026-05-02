#!/usr/bin/env python3
"""
测试管理后台仪表板页面 http://localhost:5002/xyl/admin/dashboard
"""
from playwright.sync_api import sync_playwright
import sys
import os

ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'changeme')

def test_dashboard():
    url = 'http://localhost:5002/xyl/admin/dashboard'
    login_url = 'http://localhost:5002/xyl/admin/login'
    
    print('='*70)
    print(f'测试目标: {url}')
    print('='*70)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # 非headless模式以便观察
        context = browser.new_context()
        page = context.new_page()
        
        # 1. 先登录
        print('\n1. 访问登录页面...')
        page.goto(login_url)
        page.wait_for_load_state('networkidle')
        
        # 检查是否在登录页
        if '/login' in page.url or page.locator('input[type="text"]').count() > 0:
            print('   检测到登录页面，开始登录...')
            page.fill('input[type="text"]', 'admin')
            page.fill('input[type="password"]', ADMIN_PASSWORD)
            page.click('button:has-text("登录")')
            page.wait_for_load_state('networkidle')
            print(f'   登录后跳转至: {page.url}')
        
        # 2. 访问仪表板
        print('\n2. 访问仪表板页面...')
        page.goto(url)
        page.wait_for_load_state('networkidle')
        
        print(f'   当前URL: {page.url}')
        print(f'   页面标题: {page.title()}')
        
        # 3. 检查页面内容
        print('\n3. 检查页面元素...')
        
        # 检查是否有错误提示
        error_selectors = [
            '.el-message--error',
            '[class*="error"]',
            'text=加载失败',
            'text=需要管理员权限',
        ]
        
        errors_found = []
        for selector in error_selectors:
            try:
                if page.locator(selector).count() > 0:
                    errors_found.append(selector)
            except:
                pass
        
        if errors_found:
            print(f'   ⚠ 发现错误提示: {errors_found}')
        else:
            print('   ✓ 未发现错误提示')
        
        # 4. 检查关键元素
        print('\n4. 检查关键UI元素...')
        
        key_elements = {
            '侧边导航': '.sidebar, aside, [class*="sidebar"], [class*="menu"]',
            '主内容区': 'main, .main-content, [class*="main"], [class*="content"]',
            '统计卡片': '[class*="stat"], [class*="card"], .el-card',
            '图表区域': '[class*="chart"], canvas, svg',
        }
        
        for name, selector in key_elements.items():
            try:
                count = page.locator(selector).count()
                status = '✓' if count > 0 else '✗'
                print(f'   {status} {name}: 找到 {count} 个元素')
            except Exception as e:
                print(f'   ✗ {name}: 检查失败 - {e}')
        
        # 5. 检查左侧菜单
        print('\n5. 检查左侧菜单...')
        menu_items = [
            '数据仪表盘',
            '校友管理',
            '杰出校友',
            '毕业照管理',
            '校友动态',
            '状元榜管理',
            '时空长廊',
            '互动寄语',
            '留言管理',
            '知识库',
            '系统设置',
        ]
        
        found_menus = []
        for item in menu_items:
            try:
                if page.locator(f'text={item}').count() > 0:
                    found_menus.append(item)
            except:
                pass
        
        print(f'   找到 {len(found_menus)}/{len(menu_items)} 个菜单项')
        for item in found_menus[:5]:  # 只显示前5个
            print(f'     - {item}')
        if len(found_menus) > 5:
            print(f'     ... 还有 {len(found_menus)-5} 个')
        
        # 6. 截图
        print('\n6. 保存截图...')
        screenshot_path = 'd:/校友录/tests/e2e/dashboard_test.png'
        page.screenshot(path=screenshot_path, full_page=True)
        print(f'   ✓ 截图保存至: {screenshot_path}')
        
        # 7. 检查网络请求
        print('\n7. 检查API调用...')
        
        # 重新加载页面以捕获网络请求
        page.goto(url)
        
        # 监控响应
        api_responses = []
        def handle_response(response):
            if '/api/admin' in response.url:
                api_responses.append({
                    'url': response.url,
                    'status': response.status,
                })
        
        page.on('response', handle_response)
        page.wait_for_load_state('networkidle')
        
        # 等待几秒让API调用完成
        page.wait_for_timeout(2000)
        
        if api_responses:
            print(f'   检测到 {len(api_responses)} 个管理API调用:')
            for resp in api_responses[:5]:
                status_icon = '✓' if 200 <= resp['status'] < 300 else '✗'
                print(f'     {status_icon} {resp["url"].split("/")[-1]}: {resp["status"]}')
        else:
            print('   未检测到管理API调用（可能需要登录）')
        
        browser.close()
        
        print('\n' + '='*70)
        print('测试完成')
        print('='*70)
        
        return len(errors_found) == 0

if __name__ == '__main__':
    success = test_dashboard()
    sys.exit(0 if success else 1)
