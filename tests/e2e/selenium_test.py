#!/usr/bin/env python3
"""
使用Selenium进行浏览器端到端测试
"""
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time
import sys
import os

ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'changeme')

def test_admin_dashboard():
    print("="*70)
    print("Selenium浏览器端到端测试")
    print("目标: http://localhost:5002/xyl/admin")
    print("="*70)
    
    # 配置Chrome选项
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--window-size=1920,1080')
    
    try:
        print("\n1. 启动Chrome浏览器...")
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
        print("   ✓ 浏览器启动成功")
        
        # 测试登录
        print("\n2. 测试登录功能...")
        driver.get('http://localhost:5002/xyl/admin/login')
        time.sleep(2)
        
        # 检查页面元素
        try:
            username_input = driver.find_element(By.CSS_SELECTOR, "input[type='text']")
            print("   ✓ 用户名输入框存在")
        except:
            print("   ✗ 用户名输入框不存在")
            return False
        
        try:
            password_input = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
            print("   ✓ 密码输入框存在")
        except:
            print("   ✗ 密码输入框不存在")
            return False
        
        # 输入登录信息
        username_input.send_keys('admin')
        password_input.send_keys(ADMIN_PASSWORD)
        
        # 点击登录按钮
        login_btn = driver.find_element(By.CSS_SELECTOR, "button")
        login_btn.click()
        print("   ✓ 点击登录按钮")
        
        time.sleep(3)
        
        # 检查登录后的页面
        if 'dashboard' in driver.current_url:
            print(f"   ✓ 登录成功，当前URL: {driver.current_url}")
        else:
            print(f"   ✗ 登录可能失败，当前URL: {driver.current_url}")
            driver.save_screenshot('d:/校友录/tests/e2e/selenium_login_failed.png')
            driver.quit()
            return False
        
        # 截图保存
        driver.save_screenshot('d:/校友录/tests/e2e/selenium_dashboard.png')
        print("   ✓ 截图已保存: selenium_dashboard.png")
        
        # 测试各个菜单
        menus = [
            ("校友管理", "alumni"),
            ("杰出校友", "distinguished"),
            ("毕业照管理", "photo"),
            ("校友动态", "news"),
            ("状元榜管理", "top-scholars"),
        ]
        
        print("\n3. 测试各模块导航...")
        for menu_name, keyword in menus:
            try:
                # 点击菜单
                xpath_expr = "//*[contains(text(), '" + menu_name + "')]"
                menu = driver.find_element(By.XPATH, xpath_expr)
                menu.click()
                time.sleep(2)
                print(f"   ✓ {menu_name} 可点击")
            except Exception as e:
                print(f"   ✗ {menu_name} 点击失败: {str(e)[:50]}")
        
        driver.quit()
        print("\n   ✓ 浏览器测试完成")
        return True
        
    except Exception as e:
        print(f"\n   ✗ 测试出错: {e}")
        return False

if __name__ == "__main__":
    success = test_admin_dashboard()
    sys.exit(0 if success else 1)
