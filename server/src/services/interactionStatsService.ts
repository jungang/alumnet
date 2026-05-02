import { pool } from '../config/database';
import { 
  InteractionStats, 
  InteractionTrendData,
  DateRange
} from '../types/models';
import { messageRepository } from '../repositories/messageRepository';
import { searchNoticeRepository } from '../repositories/searchNoticeRepository';
import { videoGreetingRepository } from '../repositories/videoGreetingRepository';

export class InteractionStatsService {
  /**
   * 获取综合统计概览
   */
  async getOverview(): Promise<InteractionStats> {
    const [messageStats, noticeStats, videoStats, categoryStats, trends, avgReviewTime] = await Promise.all([
      messageRepository.getStats(),
      searchNoticeRepository.getStats(),
      videoGreetingRepository.getStats(),
      messageRepository.getCategoryStats(),
      this.getTrends(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date(), 'day'),
      this.getAverageReviewTime(),
    ]);

    return {
      messages: {
        ...messageStats,
        byCategory: categoryStats,
      },
      searchNotices: noticeStats,
      videoGreetings: videoStats,
      trends,
      averageReviewTime: avgReviewTime,
    };
  }

  /**
   * 获取趋势数据
   */
  async getTrends(
    startDate: Date, 
    endDate: Date, 
    granularity: 'day' | 'week' | 'month' = 'day'
  ): Promise<InteractionTrendData[]> {
    let dateFormat: string;
    let interval: string;

    switch (granularity) {
      case 'week':
        dateFormat = 'IYYY-IW';
        interval = '1 week';
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        interval = '1 month';
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
        interval = '1 day';
    }

    const result = await pool.query(`
      WITH date_series AS (
        SELECT generate_series($1::date, $2::date, $3::interval)::date as date
      ),
      message_counts AS (
        SELECT TO_CHAR(created_at, $4) as period, COUNT(*) as count
        FROM alumni_system.messages
        WHERE created_at BETWEEN $1 AND $2
        GROUP BY period
      ),
      notice_counts AS (
        SELECT TO_CHAR(created_at, $4) as period, COUNT(*) as count
        FROM alumni_system.search_notices
        WHERE created_at BETWEEN $1 AND $2
        GROUP BY period
      ),
      video_counts AS (
        SELECT TO_CHAR(created_at, $4) as period, COUNT(*) as count
        FROM alumni_system.video_greetings
        WHERE created_at BETWEEN $1 AND $2
        GROUP BY period
      )
      SELECT 
        TO_CHAR(ds.date, $4) as date,
        COALESCE(mc.count, 0) as messages,
        COALESCE(nc.count, 0) as notices,
        COALESCE(vc.count, 0) as videos
      FROM date_series ds
      LEFT JOIN message_counts mc ON TO_CHAR(ds.date, $4) = mc.period
      LEFT JOIN notice_counts nc ON TO_CHAR(ds.date, $4) = nc.period
      LEFT JOIN video_counts vc ON TO_CHAR(ds.date, $4) = vc.period
      ORDER BY ds.date
    `, [startDate, endDate, interval, dateFormat]);

    return result.rows.map(row => ({
      date: row.date,
      messages: parseInt(row.messages),
      notices: parseInt(row.notices),
      videos: parseInt(row.videos),
    }));
  }

  /**
   * 获取平均审核时间（秒）
   */
  async getAverageReviewTime(): Promise<{ messages: number; videos: number }> {
    const result = await pool.query(`
      SELECT 
        (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at))), 0)
         FROM alumni_system.messages 
         WHERE reviewed_at IS NOT NULL) as message_avg,
        (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at))), 0)
         FROM alumni_system.video_greetings 
         WHERE reviewed_at IS NOT NULL) as video_avg
    `);

    return {
      messages: Math.round(parseFloat(result.rows[0].message_avg)),
      videos: Math.round(parseFloat(result.rows[0].video_avg)),
    };
  }

  /**
   * 导出数据为CSV格式
   */
  async exportData(
    type: 'messages' | 'notices' | 'videos',
    dateRange: DateRange
  ): Promise<string> {
    let query: string;
    let headers: string[];

    switch (type) {
      case 'messages':
        headers = ['ID', '内容', '分类', '作者', '班级', '状态', '创建时间', '审核时间'];
        query = `
          SELECT id, content, category, author_name, author_class, status, 
                 TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
                 TO_CHAR(reviewed_at, 'YYYY-MM-DD HH24:MI:SS') as reviewed_at
          FROM alumni_system.messages
          WHERE created_at BETWEEN $1 AND $2
          ORDER BY created_at DESC
        `;
        break;
      case 'notices':
        headers = ['ID', '寻找对象', '班级', '描述', '状态', '创建时间'];
        query = `
          SELECT id, target_name, target_class, description, status,
                 TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
          FROM alumni_system.search_notices
          WHERE created_at BETWEEN $1 AND $2
          ORDER BY created_at DESC
        `;
        break;
      case 'videos':
        headers = ['ID', '标题', '校友姓名', '班级', '状态', '观看次数', '创建时间', '审核时间'];
        query = `
          SELECT id, title, alumni_name, alumni_class, status, view_count,
                 TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
                 TO_CHAR(reviewed_at, 'YYYY-MM-DD HH24:MI:SS') as reviewed_at
          FROM alumni_system.video_greetings
          WHERE created_at BETWEEN $1 AND $2
          ORDER BY created_at DESC
        `;
        break;
    }

    const result = await pool.query(query, [dateRange.startDate, dateRange.endDate]);

    // 生成CSV
    const csvRows = [headers.join(',')];
    for (const row of result.rows) {
      const values = Object.values(row).map(val => {
        if (val === null || val === undefined) return '';
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') || str.includes('"') || str.includes('\n') 
          ? `"${str}"` 
          : str;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }
}

export const interactionStatsService = new InteractionStatsService();

