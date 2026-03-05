/**
 * Notification Repository
 * Manages user notifications and preferences
 */

import { BaseRepository } from './repository';
import { db } from './index';
import type { PaginationParams, PaginationResult } from '@kpss/shared';

export type NotificationType =
  | 'weak_topic'
  | 'daily_goal_reminder'
  | 'srs_review'
  | 'test_completed'
  | 'goal_progress'
  | 'streak_reminder'
  | 'ui_update';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  weak_topic_enabled: boolean;
  daily_goal_enabled: boolean;
  srs_review_enabled: boolean;
  test_completed_enabled: boolean;
  goal_progress_enabled: boolean;
  streak_reminder_enabled: boolean;
  daily_reminder_time: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  action_url?: string;
  expires_at?: string;
}

export class NotificationRepository extends BaseRepository {
  async create(userId: string, input: CreateNotificationInput): Promise<Notification> {
    const result = await db.query<Notification>(
      `INSERT INTO notifications 
       (user_id, type, title, message, data, action_url, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        input.type,
        input.title,
        input.message,
        JSON.stringify(input.data || {}),
        input.action_url || null,
        input.expires_at || null,
      ]
    );

    return result.rows[0];
  }

  async findById(id: string): Promise<Notification | null> {
    const result = await db.query<Notification>(
      'SELECT * FROM notifications WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  async findByUserId(userId: string, pagination: PaginationParams): Promise<PaginationResult<Notification>> {
    const offset = (pagination.page - 1) * pagination.limit;

    const countResult = await db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1',
      [userId]
    );

    const dataResult = await db.query<Notification>(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, pagination.limit, offset]
    );

    return {
      data: dataResult.rows,
      pagination: {
        total: countResult.rows[0]?.count || 0,
        page: pagination.page,
        limit: pagination.limit,
        pages: Math.ceil((countResult.rows[0]?.count || 0) / pagination.limit),
      },
    };
  }

  async findUnread(userId: string): Promise<Notification[]> {
    const result = await db.query<Notification>(
      `SELECT * FROM notifications 
       WHERE user_id = $1 AND is_read = FALSE 
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  async markAsRead(id: string): Promise<Notification> {
    const result = await db.query<Notification>(
      `UPDATE notifications SET is_read = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error('Notification not found');
    }

    return result.rows[0];
  }

  async markAllAsRead(userId: string): Promise<void> {
    await db.query(
      'UPDATE notifications SET is_read = TRUE, updated_at = NOW() WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );
  }

  async delete(id: string): Promise<void> {
    await db.query('DELETE FROM notifications WHERE id = $1', [id]);
  }

  async deleteExpired(): Promise<number> {
    const result = await db.query(
      'DELETE FROM notifications WHERE expires_at IS NOT NULL AND expires_at < NOW()',
      []
    );

    return result.rowCount || 0;
  }

  // Preferences
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const result = await db.query<NotificationPreferences>(
      'SELECT * FROM notification_preferences WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Create default preferences
      return this.createDefaultPreferences(userId);
    }

    return result.rows[0];
  }

  async createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
    const result = await db.query<NotificationPreferences>(
      `INSERT INTO notification_preferences (user_id) VALUES ($1) RETURNING *`,
      [userId]
    );

    return result.rows[0];
  }

  async updatePreferences(userId: string, updates: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.weak_topic_enabled !== undefined) {
      fields.push(`weak_topic_enabled = $${paramCount++}`);
      values.push(updates.weak_topic_enabled);
    }
    if (updates.daily_goal_enabled !== undefined) {
      fields.push(`daily_goal_enabled = $${paramCount++}`);
      values.push(updates.daily_goal_enabled);
    }
    if (updates.srs_review_enabled !== undefined) {
      fields.push(`srs_review_enabled = $${paramCount++}`);
      values.push(updates.srs_review_enabled);
    }
    if (updates.test_completed_enabled !== undefined) {
      fields.push(`test_completed_enabled = $${paramCount++}`);
      values.push(updates.test_completed_enabled);
    }
    if (updates.goal_progress_enabled !== undefined) {
      fields.push(`goal_progress_enabled = $${paramCount++}`);
      values.push(updates.goal_progress_enabled);
    }
    if (updates.streak_reminder_enabled !== undefined) {
      fields.push(`streak_reminder_enabled = $${paramCount++}`);
      values.push(updates.streak_reminder_enabled);
    }
    if (updates.daily_reminder_time !== undefined) {
      fields.push(`daily_reminder_time = $${paramCount++}`);
      values.push(updates.daily_reminder_time);
    }

    fields.push('updated_at = NOW()');
    values.push(userId);

    const result = await db.query<NotificationPreferences>(
      `UPDATE notification_preferences SET ${fields.join(', ')} WHERE user_id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Preferences not found');
    }

    return result.rows[0];
  }

  // Helper functions for creating notifications
  async notifyWeakTopic(userId: string, topic: string, accuracy: number): Promise<Notification> {
    return this.create(userId, {
      type: 'weak_topic',
      title: '📌 Zayıf Konu Uyarısı',
      message: `"${topic}" konusunda ${accuracy}% başarı oranı - daha fazla çalışmaya ihtiyacı var`,
      data: { topic, accuracy },
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    });
  }

  async notifyDailyReminder(userId: string, goalMinutes: number): Promise<Notification> {
    return this.create(userId, {
      type: 'daily_goal_reminder',
      title: '📚 Günlük Çalışma Hatırlatması',
      message: `Bugünün ${goalMinutes} dakikalık çalışma hedefini tamamlamak için harekete geç!`,
      data: { goalMinutes },
      action_url: '/flashcards',
    });
  }

  async notifySRSReview(userId: string, dueLessonCount: number): Promise<Notification> {
    return this.create(userId, {
      type: 'srs_review',
      title: '🔄 SRS Kartları Gözden Geçirmesi',
      message: `${dueLessonCount} SRS kartı gözden geçirmeye hazır!`,
      data: { dueLessonCount },
      action_url: '/flashcards',
    });
  }

  async notifyTestCompleted(userId: string, score: number, totalQuestions: number): Promise<Notification> {
    const percentage = Math.round((score / totalQuestions) * 100);
    return this.create(userId, {
      type: 'test_completed',
      title: '✅ Test Tamamlandı',
      message: `${score}/${totalQuestions} doğru (%${percentage} başarı oranı)`,
      data: { score, totalQuestions, percentage },
      action_url: '/analytics',
      expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
    });
  }

  async notifyGoalProgress(userId: string, progressPercent: number, gapScore: number): Promise<Notification> {
    return this.create(userId, {
      type: 'goal_progress',
      title: '📈 Hedef İlerlemesi',
      message: `Hedefe %${progressPercent} ulaştın! ${gapScore} puan daha gerekli.`,
      data: { progressPercent, gapScore },
      action_url: '/learning-goal',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );

    return result.rows[0]?.count || 0;
  }
}

export const notificationRepository = new NotificationRepository();
