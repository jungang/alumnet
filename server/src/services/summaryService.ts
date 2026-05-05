/**
 * 智能摘要服务
 * 生成活动/捐赠/通知的摘要信息
 */

import { pool } from '../config/database';
import logger from '../config/logger';

interface Summary {
  title: string;
  count: number;
  details: any[];
}

interface AllSummary {
  activities: Summary;
  donations: Summary;
  notices: Summary;
}

class SummaryService {
  async summarizeActivities(limit: number = 5): Promise<Summary> {
    const result = await pool.query(
      `SELECT id, title, type, location, start_time, registered_count, capacity
       FROM alumni_system.activities 
       ORDER BY start_time DESC
       LIMIT $1`,
      [limit]
    );

    return {
      title: '近期活动',
      count: result.rows.length,
      details: result.rows,
    };
  }

  async summarizeDonations(limit: number = 5): Promise<Summary> {
    const result = await pool.query(
      `SELECT project_id, SUM(amount) as total, COUNT(*) as count
       FROM alumni_system.donations 
       GROUP BY project_id
       ORDER BY total DESC
       LIMIT $1`,
      [limit]
    );

    return {
      title: '捐赠项目',
      count: result.rows.length,
      details: result.rows,
    };
  }

  async summarizeNotices(limit: number = 5): Promise<Summary> {
    const result = await pool.query(
      `SELECT id, title, type, created_at
       FROM alumni_system.notices 
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    return {
      title: '最新通知',
      count: result.rows.length,
      details: result.rows,
    };
  }

  async summarizeAll(): Promise<AllSummary> {
    const [activities, donations, notices] = await Promise.all([
      this.summarizeActivities(5),
      this.summarizeDonations(5),
      this.summarizeNotices(5),
    ]);

    return { activities, donations, notices };
  }
}

export const summaryService = new SummaryService();
