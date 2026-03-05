import { db } from './index';

export interface Leaderboard {
  id: number;
  user_id: number;
  rank: number | null;
  total_score: number;
  tests_completed: number;
  avg_accuracy: number;
  streak_count: number;
  badges_earned: number;
  updated_at: Date;
  created_at: Date;
}

export interface LeaderboardPeriod {
  id: number;
  period_type: 'weekly' | 'monthly' | 'all-time';
  user_id: number;
  rank: number | null;
  score: number;
  period_start: Date | null;
  period_end: Date | null;
  created_at: Date;
}

export interface SharedAchievement {
  id: number;
  user_id: number;
  achievement_type: string;
  achievement_data: Record<string, any>;
  shared_text: string | null;
  likes_count: number;
  comments_count: number;
  shared_at: Date;
  created_at: Date;
}

export interface AchievementLike {
  id: number;
  achievement_id: number;
  user_id: number;
  liked_at: Date;
}

export interface AchievementComment {
  id: number;
  achievement_id: number;
  user_id: number;
  comment_text: string;
  likes_count: number;
  commented_at: Date;
}

export interface Follow {
  id: number;
  follower_id: number;
  following_id: number;
  followed_at: Date;
}

export const SocialGamificationRepository = {
  // Leaderboard methods
  async updateUserLeaderboard(userId: number): Promise<Leaderboard> {
    const userStats = await db.query(
      `SELECT
        SUM(upr.score) as total_score,
        COUNT(DISTINCT upr.test_id) as tests_completed,
        AVG(upr.accuracy) as avg_accuracy,
        COALESCE(ss.current_streak, 0) as streak_count,
        (SELECT COUNT(*) FROM user_badges WHERE user_id = $1) as badges_earned
       FROM user_progress upr
       LEFT JOIN study_streaks ss ON ss.user_id = $1
       WHERE upr.user_id = $1`,
      [userId]
    );

    const stats = userStats.rows[0];
    const result = await db.query(
      `INSERT INTO leaderboards (user_id, total_score, tests_completed, avg_accuracy, streak_count, badges_earned)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET
        total_score = $2,
        tests_completed = $3,
        avg_accuracy = $4,
        streak_count = $5,
        badges_earned = $6,
        updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, stats.total_score || 0, stats.tests_completed || 0, stats.avg_accuracy || 0, stats.streak_count || 0, stats.badges_earned || 0]
    );
    return result.rows[0];
  },

  async getGlobalLeaderboard(limit: number = 50): Promise<any[]> {
    const result = await db.query(
      `SELECT 
        l.*,
        u.name as user_name,
        u.avatar_url
       FROM leaderboards l
       INNER JOIN users u ON l.user_id = u.id
       ORDER BY l.total_score DESC
       LIMIT $1`,
      [limit]
    );
    
    // Add ranks
    return result.rows.map((row, idx) => ({ ...row, rank: idx + 1 }));
  },

  async getUserLeaderboardRank(userId: number): Promise<Leaderboard & { user_name: string; percentage: number }> {
    const result = await db.query(
      `SELECT 
        l.*,
        u.name as user_name,
        COUNT(*) OVER() as total_users
       FROM leaderboards l
       INNER JOIN users u ON l.user_id = u.id
       WHERE l.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found in leaderboard');
    }

    const row = result.rows[0];
    const totalUsers = parseInt(row.total_users);
    const userRank = await db.query(
      `SELECT COUNT(*) as rank_position FROM leaderboards WHERE total_score > (SELECT total_score FROM leaderboards WHERE user_id = $1) + 1`,
      [userId]
    );

    return {
      ...row,
      rank: parseInt(userRank.rows[0].rank_position) + 1,
      percentage: Math.round(((totalUsers - (parseInt(userRank.rows[0].rank_position) + 1)) / totalUsers) * 100),
    };
  },

  async getPeriodLeaderboard(periodType: 'weekly' | 'monthly', limit: number = 50): Promise<any[]> {
    const result = await db.query(
      `SELECT 
        lp.*,
        u.name as user_name,
        u.avatar_url
       FROM leaderboard_periods lp
       INNER JOIN users u ON lp.user_id = u.id
       WHERE lp.period_type = $1
       ORDER BY lp.score DESC
       LIMIT $2`,
      [periodType, limit]
    );

    return result.rows.map((row, idx) => ({ ...row, rank: idx + 1 }));
  },

  // Shared Achievements methods
  async shareAchievement(userId: number, type: string, data: Record<string, any>, text?: string): Promise<SharedAchievement> {
    const result = await db.query(
      `INSERT INTO shared_achievements (user_id, achievement_type, achievement_data, shared_text)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, type, JSON.stringify(data), text]
    );
    return result.rows[0];
  },

  async getFeedAchievements(limit: number = 20, offset: number = 0): Promise<any[]> {
    const result = await db.query(
      `SELECT 
        sa.*,
        u.name as user_name,
        u.avatar_url
       FROM shared_achievements sa
       INNER JOIN users u ON sa.user_id = u.id
       ORDER BY sa.shared_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  },

  async getUserAchievements(userId: number, limit: number = 20): Promise<SharedAchievement[]> {
    const result = await db.query(
      `SELECT * FROM shared_achievements WHERE user_id = $1 ORDER BY shared_at DESC LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  },

  async likeAchievement(achievementId: number, userId: number): Promise<AchievementLike> {
    const result = await db.query(
      `INSERT INTO achievement_likes (achievement_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [achievementId, userId]
    );

    await db.query(
      `UPDATE shared_achievements SET likes_count = likes_count + 1 WHERE id = $1`,
      [achievementId]
    );

    return result.rows[0];
  },

  async unlikeAchievement(achievementId: number, userId: number): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM achievement_likes WHERE achievement_id = $1 AND user_id = $2`,
      [achievementId, userId]
    );

    if (result.rowCount > 0) {
      await db.query(
        `UPDATE shared_achievements SET likes_count = likes_count - 1 WHERE id = $1`,
        [achievementId]
      );
    }

    return result.rowCount > 0;
  },

  async commentOnAchievement(achievementId: number, userId: number, text: string): Promise<AchievementComment> {
    const result = await db.query(
      `INSERT INTO achievement_comments (achievement_id, user_id, comment_text)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [achievementId, userId, text]
    );

    await db.query(
      `UPDATE shared_achievements SET comments_count = comments_count + 1 WHERE id = $1`,
      [achievementId]
    );

    return result.rows[0];
  },

  async getAchievementComments(achievementId: number, limit: number = 20): Promise<any[]> {
    const result = await db.query(
      `SELECT 
        ac.*,
        u.name as user_name,
        u.avatar_url
       FROM achievement_comments ac
       INNER JOIN users u ON ac.user_id = u.id
       WHERE ac.achievement_id = $1
       ORDER BY ac.commented_at DESC
       LIMIT $2`,
      [achievementId, limit]
    );
    return result.rows;
  },

  // Social Follow methods
  async followUser(followerId: number, followingId: number): Promise<Follow> {
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    const result = await db.query(
      `INSERT INTO social_follows (follower_id, following_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [followerId, followingId]
    );
    return result.rows[0];
  },

  async unfollowUser(followerId: number, followingId: number): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM social_follows WHERE follower_id = $1 AND following_id = $2`,
      [followerId, followingId]
    );
    return result.rowCount > 0;
  },

  async getFollowers(userId: number): Promise<any[]> {
    const result = await db.query(
      `SELECT 
        u.*,
        sf.followed_at
       FROM social_follows sf
       INNER JOIN users u ON sf.follower_id = u.id
       WHERE sf.following_id = $1
       ORDER BY sf.followed_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async getFollowing(userId: number): Promise<any[]> {
    const result = await db.query(
      `SELECT 
        u.*,
        sf.followed_at
       FROM social_follows sf
       INNER JOIN users u ON sf.following_id = u.id
       WHERE sf.follower_id = $1
       ORDER BY sf.followed_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    const result = await db.query(
      `SELECT 1 FROM social_follows WHERE follower_id = $1 AND following_id = $2`,
      [followerId, followingId]
    );
    return result.rows.length > 0;
  },

  async getFollowersCount(userId: number): Promise<number> {
    const result = await db.query(
      `SELECT COUNT(*) as count FROM social_follows WHERE following_id = $1`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  },

  async getFollowingCount(userId: number): Promise<number> {
    const result = await db.query(
      `SELECT COUNT(*) as count FROM social_follows WHERE follower_id = $1`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  },

  async deleteAchievement(id: number): Promise<boolean> {
    const result = await db.query('DELETE FROM shared_achievements WHERE id = $1', [id]);
    return result.rowCount > 0;
  },
};
