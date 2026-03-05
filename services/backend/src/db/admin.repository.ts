/**
 * Admin Repository
 * Admin panel işlemleri ve yönetimi
 */

import { getDb } from './index';
import * as bcrypt from 'bcrypt';

export interface Admin {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  changes: any;
  ip_address: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface ModerationItem {
  id: string;
  content_type: string;
  content_id: string;
  submitted_by: string;
  submission_data: any;
  reason: string | null;
  status: string;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string | null;
  is_public: boolean;
  updated_by: string | null;
  updated_at: string;
}

export const AdminRepository = {
  // Admin Authentication
  async createAdmin(email: string, passwordHash: string, fullName: string, role: string = 'admin'): Promise<Admin> {
    const db = getDb();
    const hashedPassword = await bcrypt.hash(passwordHash, 10);
    
    const result = await db.query<Admin>(
      `INSERT INTO admins (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [email, hashedPassword, fullName, role]
    );
    return result.rows[0];
  },

  async findAdminByEmail(email: string): Promise<Admin | null> {
    const db = getDb();
    const result = await db.query<Admin & { password_hash: string }>(
      'SELECT * FROM admins WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  },

  async findAdminById(adminId: string): Promise<Admin | null> {
    const db = getDb();
    const result = await db.query<Admin>(
      'SELECT id, email, full_name, role, is_active, last_login, created_at, updated_at FROM admins WHERE id = $1',
      [adminId]
    );
    return result.rows[0] || null;
  },

  async verifyAdminPassword(admin: any, password: string): Promise<boolean> {
    return bcrypt.compare(password, admin.password_hash);
  },

  async updateLastLogin(adminId: string): Promise<void> {
    const db = getDb();
    await db.query(
      'UPDATE admins SET last_login = NOW(), updated_at = NOW() WHERE id = $1',
      [adminId]
    );
  },

  async getAllAdmins(): Promise<Admin[]> {
    const db = getDb();
    const result = await db.query<Admin>(
      `SELECT id, email, full_name, role, is_active, last_login, created_at, updated_at 
       FROM admins ORDER BY created_at DESC`
    );
    return result.rows;
  },

  async updateAdmin(adminId: string, updates: Partial<Admin>): Promise<Admin | null> {
    const db = getDb();
    const updateFields: string[] = [];
    const values: any[] = [adminId];
    let paramCount = 2;

    const allowedFields: (keyof Admin)[] = ['full_name', 'role', 'is_active'];
    for (const field of allowedFields) {
      if (field in updates && updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramCount}`);
        values.push(updates[field]);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      return this.findAdminById(adminId);
    }

    updateFields.push(`updated_at = NOW()`);

    const result = await db.query<Admin>(
      `UPDATE admins SET ${updateFields.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  // Admin Activity Logging
  async logAdminAction(
    adminId: string,
    action: string,
    resourceType: string,
    resourceId: string | null,
    changes: any,
    ipAddress: string | null = null,
    userAgent: string | null = null,
    status: string = 'success',
    errorMessage: string | null = null
  ): Promise<AdminLog> {
    const db = getDb();
    const result = await db.query<AdminLog>(
      `INSERT INTO admin_logs (admin_id, action, resource_type, resource_id, changes, ip_address, user_agent, status, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [adminId, action, resourceType, resourceId, JSON.stringify(changes), ipAddress, userAgent, status, errorMessage]
    );
    return result.rows[0];
  },

  async getAdminLogs(adminId: string, limit: number = 50): Promise<AdminLog[]> {
    const db = getDb();
    const result = await db.query<AdminLog>(
      `SELECT * FROM admin_logs 
       WHERE admin_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [adminId, limit]
    );
    return result.rows;
  },

  async getAllLogs(limit: number = 100, offset: number = 0): Promise<AdminLog[]> {
    const db = getDb();
    const result = await db.query<AdminLog>(
      `SELECT * FROM admin_logs 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  },

  async getLogsByResource(resourceType: string, resourceId: string): Promise<AdminLog[]> {
    const db = getDb();
    const result = await db.query<AdminLog>(
      `SELECT * FROM admin_logs 
       WHERE resource_type = $1 AND resource_id = $2 
       ORDER BY created_at DESC`,
      [resourceType, resourceId]
    );
    return result.rows;
  },

  // System Settings
  async getSetting(settingKey: string): Promise<SystemSetting | null> {
    const db = getDb();
    const result = await db.query<SystemSetting>(
      'SELECT * FROM system_settings WHERE setting_key = $1',
      [settingKey]
    );
    return result.rows[0] || null;
  },

  async getAllSettings(publicOnly: boolean = false): Promise<SystemSetting[]> {
    const db = getDb();
    let query = 'SELECT * FROM system_settings';
    const values: any[] = [];

    if (publicOnly) {
      query += ' WHERE is_public = TRUE';
    }

    query += ' ORDER BY setting_key ASC';

    const result = await db.query<SystemSetting>(query, values);
    return result.rows;
  },

  async updateSetting(settingKey: string, settingValue: any, updatedBy: string): Promise<SystemSetting | null> {
    const db = getDb();
    const result = await db.query<SystemSetting>(
      `UPDATE system_settings 
       SET setting_value = $1, updated_by = $2, updated_at = NOW() 
       WHERE setting_key = $3 
       RETURNING *`,
      [JSON.stringify(settingValue), updatedBy, settingKey]
    );
    return result.rows[0] || null;
  },

  // Moderation Queue
  async addToModerationQueue(contentType: string, contentId: string, submittedBy: string, submissionData: any, reason: string | null = null): Promise<ModerationItem> {
    const db = getDb();
    const result = await db.query<ModerationItem>(
      `INSERT INTO moderation_queue (content_type, content_id, submitted_by, submission_data, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [contentType, contentId, submittedBy, JSON.stringify(submissionData), reason]
    );
    return result.rows[0];
  },

  async getPendingModerations(limit: number = 20): Promise<ModerationItem[]> {
    const db = getDb();
    const result = await db.query<ModerationItem>(
      `SELECT * FROM moderation_queue 
       WHERE status = 'pending' 
       ORDER BY created_at ASC 
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  },

  async reviewModeration(
    moderationId: string,
    status: 'approved' | 'rejected' | 'flagged',
    adminId: string,
    notes: string | null = null
  ): Promise<ModerationItem | null> {
    const db = getDb();
    const result = await db.query<ModerationItem>(
      `UPDATE moderation_queue 
       SET status = $1, assigned_to = $2, notes = $3, reviewed_at = NOW() 
       WHERE id = $4 
       RETURNING *`,
      [status, adminId, notes, moderationId]
    );
    return result.rows[0] || null;
  },

  async getModerationQueue(status: string = 'all'): Promise<ModerationItem[]> {
    const db = getDb();
    let query = 'SELECT * FROM moderation_queue';
    const values: any[] = [];

    if (status !== 'all') {
      query += ' WHERE status = $1';
      values.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query<ModerationItem>(query, values);
    return result.rows;
  },

  // Dashboard Statistics
  async getDashboardStats(): Promise<any> {
    const db = getDb();
    
    const totalUsersResult = await db.query('SELECT COUNT(*) as count FROM users');
    const totalQuestionsResult = await db.query('SELECT COUNT(*) as count FROM questions');
    const totalTestsResult = await db.query('SELECT COUNT(*) as count FROM tests');
    const activeUsersResult = await db.query(
      "SELECT COUNT(*) as count FROM users WHERE last_activity > NOW() - INTERVAL '7 days'"
    );
    const pendingModerationsResult = await db.query(
      "SELECT COUNT(*) as count FROM moderation_queue WHERE status = 'pending'"
    );

    return {
      total_users: parseInt(totalUsersResult.rows[0]?.count || 0),
      total_questions: parseInt(totalQuestionsResult.rows[0]?.count || 0),
      total_tests: parseInt(totalTestsResult.rows[0]?.count || 0),
      active_users_week: parseInt(activeUsersResult.rows[0]?.count || 0),
      pending_moderations: parseInt(pendingModerationsResult.rows[0]?.count || 0),
    };
  },

  // User Management
  async getUserStats(): Promise<any> {
    const db = getDb();
    const result = await db.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_this_month,
        COUNT(CASE WHEN last_activity > NOW() - INTERVAL '7 days' THEN 1 END) as active_last_week
       FROM users`
    );
    return result.rows[0];
  },

  async getTopPerformingUsers(limit: number = 10): Promise<any[]> {
    const db = getDb();
    const result = await db.query(
      `SELECT u.id, u.name, u.email, COUNT(t.id) as tests_taken, AVG(t.score) as avg_score
       FROM users u
       LEFT JOIN tests t ON u.id = t.user_id
       GROUP BY u.id
       ORDER BY avg_score DESC NULLS LAST
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  },

  // Question Management
  async getQuestionStats(): Promise<any> {
    const db = getDb();
    const result = await db.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
       FROM questions`
    );
    return result.rows[0];
  },

  async getQuestionsByDifficulty(): Promise<any[]> {
    const db = getDb();
    const result = await db.query(
      `SELECT difficulty, COUNT(*) as count FROM questions 
       GROUP BY difficulty 
       ORDER BY difficulty`
    );
    return result.rows;
  },

  async getQuestionsByTopic(): Promise<any[]> {
    const db = getDb();
    const result = await db.query(
      `SELECT topic, COUNT(*) as count, AVG(CAST(difficulty AS FLOAT)) as avg_difficulty
       FROM questions 
       GROUP BY topic 
       ORDER BY count DESC`
    );
    return result.rows;
  },
};
