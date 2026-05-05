/**
 * 捐赠服务 — 进度跟踪 + 感谢信模板 + 捐赠证书
 */
import { pool } from '../config/database';
import logger from '../config/logger';

interface DonationProject {
  id: string;
  name: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  status: string;
  createdAt: string;
  progress: number; // 0-100
  donorCount: number;
}

interface DonationRecord {
  id: string;
  donorName: string;
  amount: number;
  message: string;
  createdAt: string;
  isAnonymous: boolean;
}

class DonationService {
  /** 获取公示项目列表（含进度） */
  async getPublicProjects(): Promise<DonationProject[]> {
    const result = await pool.query(`
      SELECT p.*, 
        COUNT(d.id) as donor_count,
        CASE WHEN p.target_amount > 0 
          THEN ROUND((p.current_amount / p.target_amount) * 100, 1)
          ELSE 0 END as progress
      FROM alumni_system.donation_projects p
      LEFT JOIN alumni_system.donations d ON d.project_id = p.id::text
      WHERE p.status IN ('active', 'completed')
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);

    return result.rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      targetAmount: parseFloat(r.target_amount),
      currentAmount: parseFloat(r.current_amount),
      status: r.status,
      createdAt: r.created_at,
      progress: parseFloat(r.progress),
      donorCount: parseInt(r.donor_count),
    }));
  }

  /** 获取项目捐赠记录（公示用） */
  async getPublicRecords(projectId: string): Promise<DonationRecord[]> {
    const result = await pool.query(`
      SELECT id, donor_name, amount, message, created_at
      FROM alumni_system.donations
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `, [projectId]);

    return result.rows.map(r => ({
      id: r.id,
      donorName: r.donor_name,
      amount: parseFloat(r.amount),
      message: r.message,
      createdAt: r.created_at,
      isAnonymous: r.donor_name === '匿名',
    }));
  }

  /** 生成感谢信（Markdown 格式） */
  generateThankYouLetter(donorName: string, amount: number, projectName: string, schoolName: string = '母校'): string {
    return `
# 感谢信

亲爱的${donorName}校友：

感谢您对"${projectName}"项目的慷慨捐赠（¥${amount.toLocaleString()}）。

您的善举不仅是对${schoolName}发展的有力支持，更是对后辈学子最温暖的鼓励。每一份捐赠都将用于改善教学条件、资助优秀学子、推动科研创新。

我们郑重承诺，所有捐赠将严格按照项目规划使用，并定期公示资金使用情况。

再次感谢您的无私奉献！

**${schoolName}校友会**
${new Date().toLocaleDateString('zh-CN')}
    `.trim();
  }

  /** 生成捐赠证书（Markdown 格式） */
  generateCertificate(donorName: string, amount: number, projectName: string, schoolName: string = '母校'): string {
    const certNo = `DC-${Date.now().toString(36).toUpperCase()}`;
    return `
# 🎓 捐赠证书

**证书编号：${certNo}**

---

兹证明

## ${donorName}

于 ${new Date().toLocaleDateString('zh-CN')} 向"${projectName}"项目捐赠

## ¥${amount.toLocaleString()}

感谢您对${schoolName}发展的关心与支持！

您的善举将被永远铭记。

---

**${schoolName}校友会**
    `.trim();
  }
}

export const donationService = new DonationService();
