/**
 * Analytics Repository
 * Topic heatmaps, difficulty breakdown, and time management analytics
 */

import { getDb } from './index';

export interface TopicAnalytic {
  topic: string;
  accuracy_percent: number;
  total_questions: number;
  correct_count: number;
  average_time_seconds: number;
}

export interface DifficultyBreakdown {
  difficulty: string;
  correct_count: number;
  total_questions: number;
  accuracy_percent: number;
}

export interface TimeManagementAnalytic {
  total_questions: number;
  under_time: number;
  over_time: number;
  average_time_seconds: number;
}

export const AnalyticsRepository = {
  async getTopicHeatmap(userId: string): Promise<TopicAnalytic[]> {
    const db = getDb();
    const result = await db.query<TopicAnalytic>(
      `SELECT 
        q.topic,
        ROUND(100.0 * COUNT(CASE WHEN ta.is_correct THEN 1 END) / COUNT(*), 2) as accuracy_percent,
        COUNT(*) as total_questions,
        COUNT(CASE WHEN ta.is_correct THEN 1 END) as correct_count,
        ROUND(AVG(EXTRACT(EPOCH FROM (ta.time_spent))), 2) as average_time_seconds
       FROM test_answers ta
       JOIN questions q ON ta.question_id = q.id
       JOIN tests t ON ta.test_id = t.id
       WHERE t.user_id = $1
       GROUP BY q.topic
       ORDER BY accuracy_percent ASC`,
      [userId]
    );
    return result.rows;
  },

  async getDifficultyBreakdown(userId: string): Promise<DifficultyBreakdown[]> {
    const db = getDb();
    const result = await db.query<DifficultyBreakdown>(
      `SELECT 
        q.difficulty,
        COUNT(CASE WHEN ta.is_correct THEN 1 END) as correct_count,
        COUNT(*) as total_questions,
        ROUND(100.0 * COUNT(CASE WHEN ta.is_correct THEN 1 END) / COUNT(*), 2) as accuracy_percent
       FROM test_answers ta
       JOIN questions q ON ta.question_id = q.id
       JOIN tests t ON ta.test_id = t.id
       WHERE t.user_id = $1
       GROUP BY q.difficulty
       ORDER BY 
        CASE q.difficulty 
          WHEN 'easy' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'hard' THEN 3 
        END`,
      [userId]
    );
    return result.rows;
  },

  async getTimeManagementAnalysis(userId: string): Promise<TimeManagementAnalytic> {
    const db = getDb();
    const result = await db.query<TimeManagementAnalytic>(
      `SELECT 
        COUNT(*) as total_questions,
        COUNT(CASE WHEN time_limit_exceeded = false THEN 1 END) as under_time,
        COUNT(CASE WHEN time_limit_exceeded = true THEN 1 END) as over_time,
        ROUND(AVG(EXTRACT(EPOCH FROM (time_spent))), 2) as average_time_seconds
       FROM exam_session_answers ea
       JOIN exam_sessions es ON ea.session_id = es.id
       WHERE es.user_id = $1`,
      [userId]
    );
    return result.rows[0];
  },

  async getProgressTrends(userId: string, limit: number = 10): Promise<any[]> {
    const db = getDb();
    const result = await db.query<any>(
      `SELECT 
        t.id,
        t.topic,
        ROUND(100.0 * t.correct_count / t.total_questions, 2) as accuracy,
        t.completed_at,
        COUNT(CASE WHEN ta.is_correct THEN 1 END) as correct,
        COUNT(*) as total
       FROM tests t
       JOIN test_answers ta ON t.id = ta.test_id
       WHERE t.user_id = $1
       GROUP BY t.id, t.topic, t.completed_at
       ORDER BY t.completed_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  },

  async getWeakTopics(userId: string, limit: number = 5): Promise<TopicAnalytic[]> {
    const db = getDb();
    const result = await db.query<TopicAnalytic>(
      `SELECT 
        q.topic,
        ROUND(100.0 * COUNT(CASE WHEN ta.is_correct THEN 1 END) / COUNT(*), 2) as accuracy_percent,
        COUNT(*) as total_questions,
        COUNT(CASE WHEN ta.is_correct THEN 1 END) as correct_count,
        ROUND(AVG(EXTRACT(EPOCH FROM (ta.time_spent))), 2) as average_time_seconds
       FROM test_answers ta
       JOIN questions q ON ta.question_id = q.id
       JOIN tests t ON ta.test_id = t.id
       WHERE t.user_id = $1
       GROUP BY q.topic
       HAVING COUNT(*) >= 3
       ORDER BY accuracy_percent ASC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  },

  async getDetailedAnalytics(userId: string): Promise<any> {
    const db = getDb();
    const heatmap = await this.getTopicHeatmap(userId);
    const difficulty = await this.getDifficultyBreakdown(userId);
    const timeManagement = await this.getTimeManagementAnalysis(userId);
    const trends = await this.getProgressTrends(userId);
    const weakTopics = await this.getWeakTopics(userId);

    return {
      topicHeatmap: heatmap,
      difficultyBreakdown: difficulty,
      timeManagement,
      progressTrends: trends,
      weakTopics,
    };
  },

  async getTopicAnalysis(userId: string, topic: string): Promise<any> {
    const db = getDb();
    const result = await db.query<any>(
      `SELECT 
        q.id,
        q.text,
        q.difficulty,
        ta.is_correct,
        ta.time_spent
       FROM test_answers ta
       JOIN questions q ON ta.question_id = q.id
       JOIN tests t ON ta.test_id = t.id
       WHERE t.user_id = $1 AND q.topic = $2
       ORDER BY ta.created_at DESC`,
      [userId, topic]
    );
    
    const accuracy = result.rows.length > 0 
      ? (result.rows.filter((r: any) => r.is_correct).length / result.rows.length) * 100 
      : 0;

    return {
      topic,
      totalQuestions: result.rows.length,
      accuracy: Math.round(accuracy * 100) / 100,
      questions: result.rows,
    };
  },

  async getRecommendations(userId: string): Promise<string[]> {
    const weakTopics = await this.getWeakTopics(userId, 3);
    const timeManagement = await this.getTimeManagementAnalysis(userId);
    const recommendations: string[] = [];

    // Weak topic recommendations
    if (weakTopics.length > 0) {
      const topicNames = weakTopics.map((t: any) => t.topic).join(', ');
      recommendations.push(`${topicNames} konularında daha fazla pratik yapmanız tavsiye ediliyor.`);
    }

    // Time management recommendations
    if (timeManagement && timeManagement.over_time > timeManagement.under_time) {
      recommendations.push('Zaman yönetiminizi geliştirmek için süreli uygulamalar yapın.');
    }

    // Performance recommendations
    const db = getDb();
    const allAnswers = await db.query<any>(
      `SELECT ta.is_correct FROM test_answers ta
       JOIN tests t ON ta.test_id = t.id
       WHERE t.user_id = $1`,
      [userId]
    );
    
    const avgAccuracy = allAnswers.rows.length > 0
      ? (allAnswers.rows.filter((r: any) => r.is_correct).length / allAnswers.rows.length) * 100
      : 0;
    
    if (avgAccuracy >= 80) {
      recommendations.push('🌟 Güzel ilerleme gösteriyor! Üst level sorulara geçebilirsiniz.');
    } else if (avgAccuracy >= 60) {
      recommendations.push('Temel konuları pekiştirmek için tekrar deneyin.');
    } else {
      recommendations.push('Daha fazla kaynak yardımı ve video izlemeyi düşünün.');
    }

    return recommendations;
  },
};
