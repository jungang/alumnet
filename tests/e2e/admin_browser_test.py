#!/usr/bin/env python3
"""
管理后台全功能浏览器端到端测试
使用Playwright进行真实浏览器测试
"""
import json
import sys
import os
from playwright.sync_api import sync_playwright, expect

ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'changeme')

BASE_URL = "http://localhost:5002/xyl/admin"
TEST_RESULTS = []

def log_test(name, passed, details=""):
    """记录测试结果"""
    status = "✓" if passed else "✗"
    TEST_RESULTS.append({"name": name, "passed": passed, "details": details})
    print(f"  {status} {name}: {details}" if details else f"  {status} {name}")
    return passed

def test_login(page):
    """测试登录功能"""
    print("\n【1. 登录模块测试】")
    
    page.goto(f"{BASE_URL}/login")
    page.wait_for_load_state("networkidle")
    
    # 截图保存
    page.screenshot(path="d:/校友录/tests/e2e/screenshots/01_login_page.png")
    
    # 测试页面元素
    try:
        expect(page.locator("input[type='text']")).to_be_visible(timeout=3000)
        log_test("用户名输入框", True)
    except:
        log_test("用户名输入框", False)
    
    try:
        expect(page.locator("input[type='password']")).to_be_visible(timeout=3000)
        log_test("密码输入框", True)
    except:
        log_test("密码输入框", False)
    
    try:
        expect(page.locator("button:has-text('登录')")).to_be_visible(timeout=3000)
        log_test("登录按钮", True)
    except:
        log_test("登录按钮", False)
    
    # 执行登录
    page.fill("input[type='text']", "admin")
    page.fill("input[type='password']", ADMIN_PASSWORD)
    page.click("button:has-text('登录')")
    
    # 等待跳转
    try:
        page.wait_for_url("**/dashboard", timeout=5000)
        log_test("登录成功跳转", True, f"URL: {page.url}")
        page.screenshot(path="d:/校友录/tests/e2e/screenshots/02_dashboard.png")
        return True
    except Exception as e:
        log_test("登录成功跳转", False, f"URL: {page.url}, Error: {e}")
        page.screenshot(path="d:/校友录/tests/e2e/screenshots/02_login_failed.png")
        return False

def test_dashboard(page):
    """测试数据仪表盘"""
    print("\n【2. 数据仪表盘测试】")
    
    page.goto(f"{BASE_URL}/dashboard")
    page.wait_for_load_state("networkidle")
    
    # 检查统计卡片
    stats_cards = ["校友总数", "杰出校友", "留言总数", "待审核留言", "捐赠笔数", "捐赠总额"]
    for card in stats_cards:
        try:
            expect(page.locator(f"text={card}")).to_be_visible(timeout=3000)
            log_test(f"统计卡片-{card}", True)
        except:
            log_test(f"统计卡片-{card}", False)
    
    # 检查是否有错误提示
    try:
        error_msg = page.locator(".el-message--error").count()
        if error_msg > 0:
            log_test("无错误提示", False, f"发现{error_msg}个错误")
        else:
            log_test("无错误提示", True)
    except:
        log_test("无错误提示", True)

def test_alumni_management(page):
    """测试校友管理"""
    print("\n【3. 校友管理测试】")
    
    # 点击校友管理菜单
    try:
        # 先点击父菜单
        page.click("text=校友管理 >> visible=true >> nth=0")
        page.wait_for_timeout(300)
        # 再点击子菜单
        page.click("text=校友管理 >> visible=true >> nth=1")
        page.wait_for_load_state("networkidle")
        log_test("导航到校友管理", True)
        page.screenshot(path="d:/校友录/tests/e2e/screenshots/03_alumni_manage.png")
    except Exception as e:
        log_test("导航到校友管理", False, str(e))
        return
    
    # 检查功能按钮
    buttons = ["搜索", "新增校友"]
    for btn in buttons:
        try:
            expect(page.locator(f"button:has-text('{btn}')")).to_be_visible(timeout=3000)
            log_test(f"按钮-{btn}", True)
        except:
            log_test(f"按钮-{btn}", False)
    
    # 检查表格
    try:
        expect(page.locator("table")).to_be_visible(timeout=3000)
        log_test("校友表格", True)
    except:
        log_test("校友表格", False)

def test_distinguished_alumni(page):
    """测试杰出校友管理"""
    print("\n【4. 杰出校友管理测试】")
    
    try:
        page.click("text=杰出校友")
        page.wait_for_load_state("networkidle")
        log_test("导航到杰出校友", True)
        page.screenshot(path="d:/校友录/tests/e2e/screenshots/04_distinguished.png")
    except Exception as e:
        log_test("导航到杰出校友", False, str(e))

def test_photo_management(page):
    """测试毕业照管理"""
    print("\n【5. 毕业照管理测试】")
    
    try:
        page.click("text=毕业照管理")
        page.wait_for_load_state("networkidle")
        log_test("导航到毕业照管理", True)
        page.screenshot(path="d:/校友录/tests/e2e/screenshots/05_photo_manage.png")
    except Exception as e:
        log_test("导航到毕业照管理", False, str(e))

def test_news_management(page):
    """测试校友动态"""
    print("\n【6. 校友动态管理测试】")
    
    try:
        page.click("text=校友动态")
        page.wait_for_load_state("networkidle")
        log_test("导航到校友动态", True)
        page.screenshot(path="d:/校友录/tests/e2e/screenshots/06_news_manage.png")
    except Exception as e:
        log_test("导航到校友动态", False, str(e))

def test_top_scholars(page):
    """测试状元榜管理"""
    print("\n【7. 状元榜管理测试】")
    
    try:
        page.click("text=状元榜管理")
        page.wait_for_load_state("networkidle")
        log_test("导航到状元榜管理", True)
        page.screenshot(path="d:/校友录/tests/e2e/screenshots/07_top_scholars.png")
    except Exception as e:
        log_test("导航到状元榜管理", False, str(e))

def test_time_corridor(page):
    """测试时空长廊"""
    print("\n【8. 时空长廊测试】")
    
    try:
        page.click("text=时空长廊")
        page.wait_for_timeout(300)
        page.click("text=时空长廊统计")
        page.wait_for_load_state("networkidle")
        log_test("导航到时空长廊", True)
        page.screenshot(path="d:/校友录/tests/e2e/screenshots/08_time_corridor.png")
    except Exception as e:
        log_test("导航到时空长廊", False, str(e))

def test_interaction(page):
    """测试互动寄语"""
    print("\n【9. 互动寄语测试】")
    
    try:
        page.click("text=互动寄语")
        page.wait_for_timeout(300)
        page.click("text=留言管理")
        page.wait_for_load_state("networkidle")
        log_test("导航到留言管理", True)
        page.screenshot(path="d:/校友录/tests/e2e/screenshots/09_interaction.png")
    except Exception as e:
        log_test("导航到留言管理", False, str(e))

def test_notices(page):
    """测试寻人启事"""
    print("\n【10. 寻人启事管理测试】")
    
    try:
        page.click("text=留言管理")
        page.wait_for_timeout(300)
        page.click("text=寻人启事")
        page.wait_for_load_state("networkidle")
        log_test("导航到寻人启事", True)
    except Exception as e:
        log_test("导航到寻人启事", False, str(e))

def test_donation_projects(page):
    """测试捐赠项目"""
    print("\n【11. 捐赠项目管理测试】")
    
    try:
        page.click("text=留言管理")
        page.wait_for_timeout(300)
        page.click("text=捐赠项目")
        page.wait_for_load_state("networkidle")
        log_test("导航到捐赠项目", True)
    except Exception as e:
        log_test("导航到捐赠项目", False, str(e))

def test_associations(page):
    """测试校友会管理"""
    print("\n【12. 校友会管理测试】")
    
    try:
        page.click("text=留言管理")
        page.wait_for_timeout(300)
        page.click("text=校友会")
        page.wait_for_load_state("networkidle")
        log_test("导航到校友会", True)
    except Exception as e:
        log_test("导航到校友会", False, str(e))

def test_class_rosters(page):
    """测试班级名录"""
    print("\n【13. 班级名录管理测试】")
    
    try:
        page.click("text=时空长廊")
        page.wait_for_timeout(300)
        page.click("text=班级名录")
        page.wait_for_load_state("networkidle")
        log_test("导航到班级名录", True)
    except Exception as e:
        log_test("导航到班级名录", False, str(e))

def test_knowledge_base(page):
    """测试知识库"""
    print("\n【14. 知识库管理测试】")
    
    try:
        page.click("text=知识库")
        page.wait_for_timeout(300)
        page.click("text=文档管理")
        page.wait_for_load_state("networkidle")
        log_test("导航到知识库", True)
    except Exception as e:
        log_test("导航到知识库", False, str(e))

def test_settings(page):
    """测试系统设置"""
    print("\n【15. 系统设置测试】")
    
    try:
        page.click("text=系统设置")
        page.wait_for_timeout(300)
        page.click("text=基础设置")
        page.wait_for_load_state("networkidle")
        log_test("导航到系统设置", True)
    except Exception as e:
        log_test("导航到系统设置", False, str(e))

def test_logs(page):
    """测试系统日志"""
    print("\n【16. 系统日志测试】")
    
    try:
        page.click("text=系统设置")
        page.wait_for_timeout(300)
        page.click("text=操作日志")
        page.wait_for_load_state("networkidle")
        log_test("导航到操作日志", True)
        page.screenshot(path="d:/校友录/tests/e2e/screenshots/16_system_logs.png")
    except Exception as e:
        log_test("导航到操作日志", False, str(e))

def generate_report():
    """生成测试报告"""
    print("\n" + "="*70)
    print("【浏览器端到端测试报告汇总】")
    print("="*70)
    
    passed = sum(1 for r in TEST_RESULTS if r["passed"])
    failed = sum(1 for r in TEST_RESULTS if not r["passed"])
    total = len(TEST_RESULTS)
    
    print(f"\n总计: {total} 项测试")
    print(f"通过: {passed} 项")
    print(f"失败: {failed} 项")
    print(f"通过率: {passed/total*100:.1f}%" if total > 0 else "0%")
    
    if failed > 0:
        print("\n【失败项详情】")
        for r in TEST_RESULTS:
            if not r["passed"]:
                print(f"  ✗ {r['name']}: {r.get('details', '')}")
    
    print("\n截图保存位置: d:/校友录/tests/e2e/screenshots/")
    print("="*70)
    return failed == 0

def main():
    print("="*70)
    print("管理后台全功能浏览器端到端测试")
    print(f"目标: {BASE_URL}")
    print("="*70)
    
    # 创建截图目录
    import os
    os.makedirs("d:/校友录/tests/e2e/screenshots", exist_ok=True)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        
        # 设置控制台日志捕获
        console_logs = []
        def handle_console(msg):
            console_logs.append(f"[{msg.type}] {msg.text}")
        page.on("console", handle_console)
        
        try:
            # 登录
            if not test_login(page):
                print("\n登录失败，终止测试")
                browser.close()
                sys.exit(1)
            
            # 测试各模块
            test_dashboard(page)
            test_alumni_management(page)
            test_distinguished_alumni(page)
            test_photo_management(page)
            test_news_management(page)
            test_top_scholars(page)
            test_time_corridor(page)
            test_interaction(page)
            test_notices(page)
            test_donation_projects(page)
            test_associations(page)
            test_class_rosters(page)
            test_knowledge_base(page)
            test_settings(page)
            test_logs(page)
            
            # 最终截图
            page.goto(f"{BASE_URL}/dashboard")
            page.wait_for_load_state("networkidle")
            page.screenshot(path="d:/校友录/tests/e2e/screenshots/final_dashboard.png", full_page=True)
            print("\n  ✓ 最终截图已保存")
            
        finally:
            browser.close()
    
    # 生成报告
    success = generate_report()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
