import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getDb } from '../db';

describe('Notifications', () => {
  const db = getDb();
  let userId: string;

  beforeEach(async () => {
    // Setup: Create test user
    await db.query(
      'DELETE FROM notification_preferences WHERE user_id IN (SELECT id FROM users WHERE email = $1)',
      ['test-notifications@example.com']
    );
    await db.query(
      'DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email = $1)',
      ['test-notifications@example.com']
    );
    await db.query('DELETE FROM users WHERE email = $1', ['test-notifications@example.com']);

    const userResult = await db.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id`,
      ['test-notifications@example.com', 'hash', 'Test Notifications']
    );

    userId = userResult.rows[0].id;
  });

  afterEach(async () => {
    // Cleanup
    await db.query(
      'DELETE FROM notification_preferences WHERE user_id IN (SELECT id FROM users WHERE email = $1)',
      ['test-notifications@example.com']
    );
    await db.query(
      'DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email = $1)',
      ['test-notifications@example.com']
    );
    await db.query('DELETE FROM users WHERE email = $1', ['test-notifications@example.com']);
  });

  describe('Create Notification', () => {
    it('should create a notification', async () => {
      const result = await db.query(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, 'weak_topic', 'Test Title', 'Test Message']
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].type).toBe('weak_topic');
      expect(result.rows[0].is_read).toBe(false);
    });

    it('should create notification with data', async () => {
      const result = await db.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          userId,
          'test_completed',
          'Test Tamamlandı',
          'Sonuç: 80/100',
          JSON.stringify({ score: 80, total: 100 }),
        ]
      );

      expect(result.rows[0].data).toEqual({ score: 80, total: 100 });
    });

    it('should set expiration time', async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const result = await db.query(
        `INSERT INTO notifications (user_id, type, title, message, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, 'daily_goal_reminder', 'Hatırlatma', 'Çalış', expiresAt]
      );

      expect(result.rows[0].expires_at).toBeTruthy();
    });
  });

  describe('Read Notifications', () => {
    it('should mark notification as read', async () => {
      const createResult = await db.query<{ id: string }>(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [userId, 'weak_topic', 'Title', 'Message']
      );

      const notifId = createResult.rows[0].id;

      const updateResult = await db.query<{ is_read: boolean }>(
        `UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING is_read`,
        [notifId]
      );

      expect(updateResult.rows[0].is_read).toBe(true);
    });

    it('should get unread notifications', async () => {
      // Create 3 notifications
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message) VALUES
         ($1, $2, $3, $4),
         ($1, $2, $3, $4),
         ($1, $2, $3, $4)`,
        [userId, 'weak_topic', 'Title', 'Message']
      );

      const result = await db.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
        [userId]
      );

      expect(result.rows[0].count).toBe(3);
    });

    it('should mark all as read', async () => {
      // Create notifications
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message) VALUES
         ($1, $2, $3, $4),
         ($1, $2, $3, $4)`,
        [userId, 'weak_topic', 'Title', 'Message']
      );

      // Mark all as read
      await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [userId]);

      const result = await db.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = TRUE',
        [userId]
      );

      expect(result.rows[0].count).toBe(2);
    });
  });

  describe('Delete Notifications', () => {
    it('should delete a notification', async () => {
      const createResult = await db.query<{ id: string }>(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [userId, 'weak_topic', 'Title', 'Message']
      );

      const notifId = createResult.rows[0].id;

      await db.query('DELETE FROM notifications WHERE id = $1', [notifId]);

      const checkResult = await db.query(
        'SELECT * FROM notifications WHERE id = $1',
        [notifId]
      );

      expect(checkResult.rows).toHaveLength(0);
    });

    it('should delete expired notifications', async () => {
      const expiredTime = new Date(Date.now() - 1000).toISOString();
      const futureTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Create one expired and one valid
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, expires_at) VALUES
         ($1, $2, $3, $4, $5),
         ($1, $2, $3, $4, $6)`,
        [userId, 'weak_topic', 'Title', 'Message', expiredTime, futureTime]
      );

      // Delete expired
      await db.query(
        'DELETE FROM notifications WHERE expires_at IS NOT NULL AND expires_at < NOW()',
        []
      );

      const result = await db.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1',
        [userId]
      );

      expect(result.rows[0].count).toBe(1);
    });
  });

  describe('Notification Preferences', () => {
    it('should create default preferences', async () => {
      const result = await db.query<{ weak_topic_enabled: boolean }>(
        `INSERT INTO notification_preferences (user_id) VALUES ($1) RETURNING *`,
        [userId]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].weak_topic_enabled).toBe(true);
    });

    it('should update preferences', async () => {
      await db.query(`INSERT INTO notification_preferences (user_id) VALUES ($1)`, [userId]);

      const result = await db.query<{ weak_topic_enabled: boolean }>(
        `UPDATE notification_preferences SET weak_topic_enabled = FALSE WHERE user_id = $1 RETURNING weak_topic_enabled`,
        [userId]
      );

      expect(result.rows[0].weak_topic_enabled).toBe(false);
    });
  });
});
