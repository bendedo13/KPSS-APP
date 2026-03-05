/**
 * Analytics Repository
 * Generates advanced analytics: heatmaps, time analysis, progress tracking
 */

import { BaseRepository } from './repository';
import { db } from './index';

export interface TopicHeatmap {
  topic: string;
  total_attempted: number;
  total_correct: number;
  accuracy_percent: number;
  error_count: number;
  last_reviewed: string | null;
}

export interface DifficultyAnalysis {
  difficulty: string;
  total_attempted: number;
  total_correct: number;
  accuracy_percent: number;
  avg_time_seconds: number;
}

export interface TimeManagementAnalysis {
  total_tests: number;
  avg_time_per_question: number;
  avg_actual_time: number;
  time_efficiency_percent: number;
  questions_under_time: number;
  questions_over_time: number;
}

export interface ProgressTrend {
  date: string;
  accuracy_percent: number;
  questions_attempted: number;
  topics_reviewed: number;
}

export interface DetailedAnalytics {
  heatmap: TopicHeatmap[];
  difficulty_breakdown: DifficultyAnalysis[];
  time_management: TimeManagementAnalysis;
  progress_trends: ProgressTrend[];
  weak_topics: TopicHeatmap[];
}

export class AnalyticsRepository extends BaseRepository {
  /**
   * Get topic heatmap - which topics have errors
   */
  async getTopicHeatmap(userId: string): Promise<TopicHeatmap[]> {
    const result = await db.query<TopicHeatmap>(
      `SELECT
        q.topic,
        COUNT(ta.id) as total_attempted,
        SUM(CASE WHEN ta.is_correct THEN 1 ELSE 0 END) as total_correct,
        ROUND(SUM(CASE WHEN ta.is_correct THEN 1 ELSE 0 END)::NUMERIC / COUNT(ta.id) * 100) as accuracy_percent,
        SUM(CASE WHEN NOT ta.is_correct THEN 1 ELSE 0 END) as error_count,
        MAX(ta.created_at) as last_reviewed
       FROM test_answers ta
       JOIN questions q ON ta.question_id = q.id
       JOIN tests t ON ta.test_id = t.id
       WHERE t.user_id = $1
       GROUP BY q.topic
       ORDER BY accuracy_percent ASC, error_count DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Get difficulty-based analysis
   */
  async getDifficultyBreakdown(userId: string): Promise<DifficultyAnalysis[]> {
    const result = await db.query<DifficultyAnalysis>(
      `SELECT
        q.difficulty,
        COUNT(ta.id) as total_attempted,
        SUM(CASE WHEN ta.is_correct THEN 1 ELSE 0 END) as total_correct,
        ROUND(SUM(CASE WHEN ta.is_correct THEN 1 ELSE 0 END)::NUMERIC / COUNT(ta.id) * 100) as accuracy_percent,
        ROUND(AVG(ta.time_spent_seconds)) as avg_time_seconds
       FROM test_answers ta
       JOIN questions q ON ta.question_id = q.id
       JOIN tests t ON ta.test_id = t.id
       WHERE t.user_id = $1
       GROUP BY q.difficulty
       ORDER BY q.difficulty`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Get time management analysis
   */
  async getTimeManagementAnalysis(userId: string): Promise<TimeManagementAnalysis> {
    const result = await db.query<{
      total_tests: number;
      total_questions: number;
      total_time: number;
      total_estimated_time: number;
      under_time: number;
      over_time: number;
    }>(
      `SELECT
        COUNT(DISTINCT t.id) as total_tests,
        COUNT(ta.id) as total_questions,
        COALESCE(SUM(ta.time_spent_seconds), 0) as total_time,
        COALESCE(SUM(q.estimated_time_seconds), 0) as total_estimated_time,
        COUNT(CASE WHEN ta.time_spent_seconds <= q.estimated_time_seconds THEN 1 END) as under_time,
        COUNT(CASE WHEN ta.time_spent_seconds > q.estimated_time_seconds THEN 1 END) as over_time
       FROM tests t
       LEFT JOIN test_answers ta ON t.id = ta.test_id
       LEFT JOIN questions q ON ta.question_id = q.id
       WHERE t.user_id = $1`,
      [userId]
    );

    const data = result.rows[0] || {
      total_tests: 0,
      total_questions: 0,
      total_time: 0,
      total_estimated_time: 0,
      under_time: 0,
      over_time: 0,
    };

    const avgTimePerQuestion = data.total_questions > 0 ? Math.round(data.total_time / data.total_questions) : 0;
    const avgEstimatedTime =
      data.total_questions > 0 ? Math.round(data.total_estimated_time / data.total_questions) : 0;
    const timeEfficiency = avgEstimatedTime > 0 ? Math.round((avgEstimatedTime / avgTimePerQuestion) * 100) : 100;

    return {
      total_tests: data.total_tests,
      avg_time_per_question: avgTimePerQuestion,
      avg_actual_time: avgEstimatedTime,
      time_efficiency_percent: timeEfficiency,
      questions_under_time: data.under_time,
      questions_over_time: data.over_time,
    };
  }

  /**
   * Get progress trends over time
   */
  async getProgressTrends(userId: string, days: number = 30): Promise<ProgressTrend[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const result = await db.query<ProgressTrend>(
      `SELECT
        DATE(t.created_at) as date,
        ROUND(SUM(CASE WHEN ta.is_correct THEN 1 ELSE 0 END)::NUMERIC / COUNT(ta.id) * 100) as accuracy_percent,
        COUNT(DISTINCT ta.id) as questions_attempted,
        COUNT(DISTINCT q.topic) as topics_reviewed
       FROM tests t
       LEFT JOIN test_answers ta ON t.id = ta.test_id
       LEFT JOIN questions q ON ta.question_id = q.id
       WHERE t.user_id = $1 AND DATE(t.created_at) >= $2
       GROUP BY DATE(t.created_at)
       ORDER BY date ASC`,
      [userId, startDate]
    );

    return result.rows;
  }

  /**
   * Get weak topics that need attention
   */
  async getWeakTopics(userId: string, limit: number = 5): Promise<TopicHeatmap[]> {
    const result = await db.query<TopicHeatmap>(
      `SELECT
        q.topic,
        COUNT(ta.id) as total_attempted,
        SUM(CASE WHEN ta.is_correct THEN 1 ELSE 0 END) as total_correct,
        ROUND(SUM(CASE WHEN ta.is_correct THEN 1 ELSE 0 END)::NUMERIC / COUNT(ta.id) * 100) as accuracy_percent,
        SUM(CASE WHEN NOT ta.is_correct THEN 1 ELSE 0 END) as error_count,
        MAX(ta.created_at) as last_reviewed
       FROM test_answers ta
       JOIN questions q ON ta.question_id = q.id
       JOIN tests t ON ta.test_id = t.id
       WHERE t.user_id = $1
       GROUP BY q.topic
       HAVING COUNT(ta.id) >= 5
       ORDER BY accuracy_percent ASC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }

  /**
   * Get comprehensive analytics
   */
  async getDetailedAnalytics(userId: string): Promise<DetailedAnalytics> {
    const [heatmap, difficulty, timeAnalysis, trends, weakTopics] = await Promise.all([
      this.getTopicHeatmap(userId),
      this.getDifficultyBreakdown(userId),
      this.getTimeManagementAnalysis(userId),
      this.getProgressTrends(userId),
      this.getWeakTopics(userId),
    ]);

    return {
      heatmap,
      difficulty_breakdown: difficulty,
      time_management: timeAnalysis,
      progress_trends: trends,
      weak_topics: weakTopics,
    };
  }

  /**
   * Get topic-specific detailed analysis
   */
  async getTopicAnalysis(userId: string, topic: string) {
    const result = await db.query(
      `SELECT
        q.topic,
        COUNT(ta.id) as total_attempted,
        SUM(CASE WHEN ta.is_correct THEN 1 ELSE 0 END) as total_correct,
        ROUND(SUM(CASE WHEN ta.is_correct THEN 1 ELSE 0 END)::NUMERIC / COUNT(ta.id) * 100) as accuracy_percent,
        AVG(ta.time_spent_seconds) as avg_time_seconds,
        COUNT(DISTINCT q.id) as unique_questions,
        MAX(ta.created_at) as last_reviewed
       FROM test_answers ta
       JOIN questions q ON ta.question_id = q.id
       JOIN tests t ON ta.test_id = t.id
       WHERE t.user_id = $1 AND LOWER(q.topic) = LOWER($2)
       GROUP BY q.topic`,
      [userId, topic]
    );

    return result.rows[0] || null;
  }

  /**
   * Get recommendations based on performance
   */
  async getRecommendations(userId: string) {
    const weakTopics = await this.getWeakTopics(userId, 3);
    const timeAnalysis = await this.getTimeManagementAnalysis(userId);
    const difficultyBreakdown = await this.getDifficultyBreakdown(userId);

    const recommendations: string[] = [];

    // Weak topics
    weakTopics.forEach((topic) => {
      if (topic.accuracy_percent < 50) {
        recommendations.push(
          `⚠️ "${topic.topic}" konusunda ${topic.accuracy_percent}% başarı oranı - daha fazla çalışmaya ihtiyacı var`
        );
      } else if (topic.accuracy_percent < 70) {
        recommendations.push(
          `📌 "${topic.topic}" konusunda iyileştirme gerekli - ${topic.accuracy_percent}% başarı oranı`
        );
      }
    });

    // Time management
    if (timeAnalysis.time_efficiency_percent < 80) {
      recommendations.push(
        `⏱️ Zaman yönetimine dikkat et - şu anda planlanan sürenin %${timeAnalysis.time_efficiency_percent}'ini kullanıyor`
      );
    }

    // Difficulty progression
    const hardDifficulty = difficultyBreakdown.find((d) => d.difficulty === 'hard');
    if (hardDifficulty && hardDifficulty.accuracy_percent < 40) {
      recommendations.push(`💪 Zor soruları çözmek için ekstra pratik yap`);
    }

    return recommendations;
  }
}

export const analyticsRepository = new AnalyticsRepository();
