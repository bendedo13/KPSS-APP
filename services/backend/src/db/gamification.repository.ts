/**
 * Gamification Repository
 * Streaks and achievements/badges
 */

import { getDb } from './index';

export interface StudyStreak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_studied_at: string | null;
}

export interface Badge {
  id: string;
  badge_type: string;
  title: string;
  description: string;
  icon: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
}

export const GamificationRepository = {
  async getOrCreateStreak(userId: string): Promise<StudyStreak> {
    const db = getDb();
    let result = await db.query<StudyStreak>(
      'SELECT * FROM study_streaks WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      result = await db.query<StudyStreak>(
        'INSERT INTO study_streaks (user_id) VALUES ($1) RETURNING *',
        [userId]
      );
    }

    return result.rows[0];
  },

  async updateStreak(userId: string): Promise<StudyStreak> {
    const db = getDb();
    const streak = await this.getOrCreateStreak(userId);
    const now = new Date();
    const lastDate = streak.last_studied_at ? new Date(streak.last_studied_at) : null;

    let newCurrentStreak = streak.current_streak;
    const daysSinceLastStudy = lastDate ? Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)) : null;

    if (daysSinceLastStudy === null || daysSinceLastStudy === 0) {
      // Same day, no change
      newCurrentStreak = streak.current_streak;
    } else if (daysSinceLastStudy === 1) {
      // Consecutive day, increment streak
      newCurrentStreak = streak.current_streak + 1;
    } else {
      // More than 1 day passed, reset streak
      newCurrentStreak = 1;
    }

    const newLongestStreak = newCurrentStreak > streak.longest_streak ? newCurrentStreak : streak.longest_streak;

    const result = await db.query<StudyStreak>(
      `UPDATE study_streaks 
       SET current_streak = $1, longest_streak = $2, last_studied_at = NOW(), updated_at = NOW()
       WHERE user_id = $3
       RETURNING *`,
      [newCurrentStreak, newLongestStreak, userId]
    );

    return result.rows[0];
  },

  async getAllBadges(): Promise<Badge[]> {
    const db = getDb();
    const result = await db.query<Badge>(
      'SELECT id, badge_type, title, description, icon FROM badges ORDER BY badge_type',
      []
    );
    return result.rows;
  },

  async getUserBadges(userId: string): Promise<UserBadge[]> {
    const db = getDb();
    const result = await db.query<UserBadge & { badge_title: string; badge_description: string; badge_icon: string }>(
      `SELECT 
        ub.id, ub.user_id, ub.badge_id, ub.earned_at,
        b.badge_type, b.title as badge_title, b.description as badge_description, b.icon as badge_icon
       FROM user_badges ub
       JOIN badges b ON ub.badge_id = b.id
       WHERE ub.user_id = $1
       ORDER BY ub.earned_at DESC`,
      [userId]
    );

    return result.rows.map((row: UserBadge & { badge_title: string; badge_description: string; badge_icon: string }) => ({
      id: row.id,
      user_id: row.user_id,
      badge_id: row.badge_id,
      earned_at: row.earned_at,
      badge: {
        id: row.badge_id,
        badge_type: row.badge_type,
        title: row.badge_title,
        description: row.badge_description,
        icon: row.badge_icon,
      }
    }));
  },

  async awardBadge(userId: string, badgeType: string): Promise<UserBadge | null> {
    const db = getDb();
    // Get badge ID from type
    const badgeResult = await db.query<{ id: string }>(
      'SELECT id FROM badges WHERE badge_type = $1',
      [badgeType]
    );

    if (badgeResult.rows.length === 0) return null;

    const badgeId = badgeResult.rows[0].id;

    // Check if user already has this badge
    const existingResult = await db.query(
      'SELECT id FROM user_badges WHERE user_id = $1 AND badge_id = $2',
      [userId, badgeId]
    );

    if (existingResult.rows.length > 0) return null; // Already has badge

    // Award badge
    const result = await db.query<UserBadge>(
      `INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2) RETURNING *`,
      [userId, badgeId]
    );

    return result.rows[0];
  },
};
