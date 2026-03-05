/**
 * Notification Repository
 * Smart notifications with 7 types and user preferences
 */

import { getDb } from './index';

export type NotificationType = 'weak_topic' | 'exam_suggestion' | 'streak_milestone' | 'new_content' | 'friend_joined' | 'achievement_earned' | 'system_update';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  weak_topic_enabled: boolean;
  exam_suggestion_enabled: boolean;
  streak_milestone_enabled: boolean;
  new_content_enabled: boolean;
  friend_joined_enabled: boolean;
  achievement_earned_enabled: boolean;
  system_update_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

export const NotificationRepository = {
  async create(userId: string, type: NotificationType, title: string, message: string, relatedId?: string): Promise<Notification> {
    const db = getDb();
    const result = await db.query<Notification>(
      `INSERT INTO notifications (user_id, type, title, message, related_id, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, FALSE, NOW())
       RETURNING *`,
      [userId, type, title, message, relatedId || null]
    );
    return result.rows[0];
  },

  async findById(notificationId: string): Promise<Notification | null> {
    const db = getDb();
    const result = await db.query<Notification>(
      'SELECT * FROM notifications WHERE id = $1',
      [notificationId]
    );
    return result.rows[0] || null;
  },

  async findByUserId(userId: string, limit: number = 20): Promise<Notification[]> {
    const db = getDb();
    const result = await db.query<Notification>(
      `SELECT * FROM notifications 
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  },

  async findUnread(userId: string): Promise<Notification[]> {
    const db = getDb();
    const result = await db.query<Notification>(
      `SELECT * FROM notifications 
       WHERE user_id = $1 AND is_read = FALSE
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async markAsRead(notificationId: string): Promise<Notification | null> {
    const db = getDb();
    const result = await db.query<Notification>(
      `UPDATE notifications 
       SET is_read = TRUE 
       WHERE id = $1 
       RETURNING *`,
      [notificationId]
    );
    return result.rows[0] || null;
  },

  async markAllAsRead(userId: string): Promise<void> {
    const db = getDb();
    await db.query(
      `UPDATE notifications 
       SET is_read = TRUE 
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
  },

  async delete(notificationId: string): Promise<void> {
    const db = getDb();
    await db.query(
      'DELETE FROM notifications WHERE id = $1',
      [notificationId]
    );
  },

  async deleteExpired(): Promise<void> {
    const db = getDb();
    await db.query(
      `DELETE FROM notifications 
       WHERE expires_at IS NOT NULL AND expires_at < NOW()`
    );
  },

  async getPreferences(userId: string): Promise<NotificationPreference | null> {
    const db = getDb();
    const result = await db.query<NotificationPreference>(
      'SELECT * FROM notification_preferences WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  },

  async createDefaultPreferences(userId: string): Promise<NotificationPreference> {
    const db = getDb();
    const result = await db.query<NotificationPreference>(
      `INSERT INTO notification_preferences 
       (user_id, weak_topic_enabled, exam_suggestion_enabled, streak_milestone_enabled, 
        new_content_enabled, friend_joined_enabled, achievement_earned_enabled, system_update_enabled)
       VALUES ($1, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, TRUE)
       RETURNING *`,
      [userId]
    );
    return result.rows[0];
  },

  async updatePreferences(userId: string, updates: Partial<NotificationPreference>): Promise<NotificationPreference | null> {
    const db = getDb();
    const updateFields: string[] = [];
    const values: any[] = [userId];
    let paramCount = 2;

    const preferenceFields: (keyof NotificationPreference)[] = [
      'weak_topic_enabled',
      'exam_suggestion_enabled',
      'streak_milestone_enabled',
      'new_content_enabled',
      'friend_joined_enabled',
      'achievement_earned_enabled',
      'system_update_enabled',
      'quiet_hours_start',
      'quiet_hours_end',
    ];

    for (const field of preferenceFields) {
      if (field in updates && updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramCount}`);
        values.push(updates[field]);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      return this.getPreferences(userId);
    }

    const result = await db.query<NotificationPreference>(
      `UPDATE notification_preferences 
       SET ${updateFields.join(', ')} 
       WHERE user_id = $1 
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  // Notification type helpers
  async notifyWeakTopic(userId: string, topic: string, accuracy: number): Promise<Notification> {
    return this.create(
      userId,
      'weak_topic',
      `⚠️ Zayıf Konu: ${topic}`,
      `${topic} konusunda %${Math.round(accuracy)} doğru oranı ile başarısız harita. Pratik yapmanız tavsiye ediliyor.`,
      topic
    );
  },

  async notifyExamSuggestion(userId: string): Promise<Notification> {
    return this.create(
      userId,
      'exam_suggestion',
      '📝 Yeni Sınav Önerisi',
      'Günlük çalışma hedeflerinize ulaştınız! Yeni bir sınav almanız tavsiye ediliyor.',
      null
    );
  },

  async notifyStreakMilestone(userId: string, streakCount: number): Promise<Notification> {
    const emoji = streakCount === 7 ? '🔥' : streakCount === 30 ? '🌟' : '⭐';
    return this.create(
      userId,
      'streak_milestone',
      `${emoji} Çalışma Serisi Başarısı!`,
      `${streakCount} günlük çalışma serinizi devam ettiriyorsunuz! Harika!`,
      null
    );
  },

  async notifyNewContent(userId: string, contentType: string): Promise<Notification> {
    return this.create(
      userId,
      'new_content',
      `📚 Yeni ${contentType}`,
      `${contentType} kategorisinde yeni içerik eklendi. Hemen göz atın!`,
      contentType
    );
  },

  async notifyFriendJoined(userId: string, friendName: string): Promise<Notification> {
    return this.create(
      userId,
      'friend_joined',
      `👥 Arkadaş Katıldı`,
      `${friendName} uygulamaya katıldı. Liderlik tablosunda onunla rekabet edin!`,
      friendName
    );
  },

  async notifyAchievementEarned(userId: string, achievementName: string): Promise<Notification> {
    return this.create(
      userId,
      'achievement_earned',
      `🏆 Başarı Kazandı`,
      `${achievementName} başarısını kazandınız! Arkadaşlarınıza gösterin.`,
      achievementName
    );
  },

  async notifySystemUpdate(userId: string, updateTitle: string): Promise<Notification> {
    return this.create(
      userId,
      'system_update',
      `⚙️ ${updateTitle}`,
      'uygulamada yeni özellikler ve iyileştirmeler eklenmiştir.',
      null
    );
  },
};
