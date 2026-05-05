import { alumniRepository } from '../repositories/alumniRepository';
import { Alumni, UserRole } from '../types/models';

/**
 * 校友推荐服务
 * 提供基于多维度的校友推荐和活跃度评分功能
 */
export class AlumniRecommendationService {
  /**
   * 同班推荐
   * @param alumniId 校友ID
   * @param limit 返回数量限制
   * @returns 同班同学列表（排除自己）
   */
  async recommendByClassmates(alumniId: string, limit: number = 5): Promise<Alumni[]> {
    const classmates = await alumniRepository.getClassmates(alumniId);

    // 排除已推荐过的校友（简化实现，实际可扩展为参数传入已推荐列表）
    // 分页支持
    return classmates.slice(0, limit);
  }

  /**
   * 同行业推荐
   * @param alumniId 校友ID
   * @param limit 返回数量限制
   * @returns 同行业校友列表
   */
  async recommendByIndustry(alumniId: string, limit: number = 5): Promise<Alumni[]> {
    // 获取目标校友的行业信息
    const targetAlumni = await alumniRepository.findById(alumniId);
    if (!targetAlumni || !targetAlumni.industry) {
      return [];
    }

    // 查找同行业的其他校友
    const result = await alumniRepository.search({
      industry: targetAlumni.industry,
      page: 1,
      pageSize: limit + 1, // 多查一条用于排除
    });

    // 排除自己
    return result.items.filter((alumni) => alumni.id !== alumniId).slice(0, limit);
  }

  /**
   * 同城市推荐
   * @param alumniId 校友ID
   * @param limit 返回数量限制
   * @returns 同城市校友列表
   */
  async recommendByLocation(alumniId: string, limit: number = 5): Promise<Alumni[]> {
    // 获取目标校友的城市信息
    const targetAlumni = await alumniRepository.findById(alumniId);
    if (!targetAlumni || !targetAlumni.currentCity) {
      return [];
    }

    // 查找同城市的其他校友
    const result = await alumniRepository.search({
      keyword: targetAlumni.currentCity,
      page: 1,
      pageSize: limit + 1,
    });

    // 排除自己
    // 注意：这里使用(keyword匹配)的方式查找，实际生产中建议添加city字段的数据库索引
    const filtered = result.items.filter(
      (alumni) => alumni.id !== alumniId && alumni.currentCity === targetAlumni.currentCity
    );

    return filtered.slice(0, limit);
  }

  /**
   * 计算校友活跃度分数
   * 综合考虑：参与度 + 捐赠 + 互动
   *
   * 分数结构：
   * - 参与度 (0-40分)：登录次数、访问时长、活动参与
   * - 捐赠 (0-30分)：捐赠次数、捐赠金额
   * - 互动 (0-30分)：留言次数、评论次数、帖子互动
   *
   * @param alumniId 校友ID
   * @returns 活跃度分数详情
   */
  async getProfileScores(alumniId: string): Promise<{
    alumniId: string;
    totalScore: number;
    breakdown: {
      engagement: {
        score: number;
        max: number;
        details: {
          loginCount: number;
          totalVisitMinutes: number;
          activityCount: number;
        };
      };
      donation: {
        score: number;
        max: number;
        details: {
          donationCount: number;
          totalAmount: number;
          lastDonationDate?: Date;
        };
      };
      interaction: {
        score: number;
        max: number;
        details: {
          messageCount: number;
          commentCount: number;
          postLikeCount: number;
        };
      };
    };
    grade: 'S' | 'A' | 'B' | 'C' | 'D';
    level: 'high' | 'medium' | 'low';
  }> {
    // 从数据库统计各项数据
    const [loginStats, donationStats, interactionStats] = await Promise.all([
      this.getEngagementStats(alumniId),
      this.getDonationStats(alumniId),
      this.getInteractionStats(alumniId),
    ]);

    // 计算各项分数（满分100）
    const engagementScore = Math.min(40, loginStats.score);
    const donationScore = Math.min(30, donationStats.score);
    const interactionScore = Math.min(30, interactionStats.score);

    const totalScore = engagementScore + donationScore + interactionScore;

    // 确定等级
    let grade: 'S' | 'A' | 'B' | 'C' | 'D';
    if (totalScore >= 90) grade = 'S';
    else if (totalScore >= 80) grade = 'A';
    else if (totalScore >= 70) grade = 'B';
    else if (totalScore >= 60) grade = 'C';
    else grade = 'D';

    // 确定活跃度级别
    let level: 'high' | 'medium' | 'low';
    if (totalScore >= 70) level = 'high';
    else if (totalScore >= 50) level = 'medium';
    else level = 'low';

    return {
      alumniId,
      totalScore,
      breakdown: {
        engagement: {
          score: engagementScore,
          max: 40,
          details: loginStats.details,
        },
        donation: {
          score: donationScore,
          max: 30,
          details: donationStats.details,
        },
        interaction: {
          score: interactionScore,
          max: 30,
          details: interactionStats.details,
        },
      },
      grade,
      level,
    };
  }

  /**
   * 获取活跃度概况（所有校友）
   * @returns 活跃度排行榜
   */
  async getTopActiveAlumni(limit: number = 10): Promise<
    {
      alumniId: string;
      name: string;
      className?: string;
      totalScore: number;
      grade: string;
    }[]
  > {
    // 这是一个简化实现，实际应根据业务需求优化
    // 可以考虑添加数据库视图或物化视图来加速查询
    return [];
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 获取 Engagement（参与度）统计
   * @param alumniId 校友ID
   */
  private async getEngagementStats(alumniId: string): Promise<{
    score: number;
    details: {
      loginCount: number;
      totalVisitMinutes: number;
      activityCount: number;
    };
  }> {
    // 这里使用简化逻辑，实际应查询日志表
    // 假设数据来自ISV Analytics或日志表
    const loginCount = 12; // 示例值：最近30天登录12次
    const totalVisitMinutes = 45; // 示例值：总访问时长45分钟
    const activityCount = 3; // 示例值：参与3次活动

    // 简单评分逻辑（可后续调整）
    const score = Math.min(40, loginCount * 2 + totalVisitMinutes / 5 + activityCount * 5);

    return {
      score,
      details: {
        loginCount,
        totalVisitMinutes,
        activityCount,
      },
    };
  }

  /**
   * 获取 Donation（捐赠）统计
   * @param alumniId 校友ID
   */
  private async getDonationStats(alumniId: string): Promise<{
    score: number;
    details: {
      donationCount: number;
      totalAmount: number;
      lastDonationDate?: Date;
    };
  }> {
    // 这里需要查询捐赠记录表
    // 暂时使用示例数据
    const donationCount = 1; // 示例值：捐赠1次
    const totalAmount = 500; // 示例值：总额500元
    const lastDonationDate = new Date('2025-01-15'); // 示例值

    // 简单评分逻辑（可后续调整）
    // 每次捐赠 +10分，每100元 +1分，上限30分
    const score = Math.min(30, donationCount * 10 + totalAmount / 100);

    return {
      score,
      details: {
        donationCount,
        totalAmount,
        lastDonationDate,
      },
    };
  }

  /**
   * 获取 Interaction（互动）统计
   * @param alumniId 校友ID
   */
  private async getInteractionStats(alumniId: string): Promise<{
    score: number;
    details: {
      messageCount: number;
      commentCount: number;
      postLikeCount: number;
    };
  }> {
    // 这里需要查询留言、评论、互动表
    // 暂时使用示例数据
    const messageCount = 5; // 示例值：留言5条
    const commentCount = 3; // 示例值：评论3次
    const postLikeCount = 2; // 示例值：点赞2次

    // 简单评分逻辑（可后续调整）
    // 每条留言 +2分，每条评论 +3分，每次点赞 +1分，上限30分
    const score = Math.min(30, messageCount * 2 + commentCount * 3 + postLikeCount * 1);

    return {
      score,
      details: {
        messageCount,
        commentCount,
        postLikeCount,
      },
    };
  }
}

export const alumniRecommendationService = new AlumniRecommendationService();
