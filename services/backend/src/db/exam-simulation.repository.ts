/**
 * Exam Simulation Repository
 * Manages mock exams with realistic time constraints
 */

import { getDb } from './index';

export interface ExamSession {
  id: string;
  user_id: string;
  exam_type: 'full_mock' | 'section' | 'time_trial';
  total_questions: number;
  duration_seconds: number;
  time_started: string;
  time_ended: string | null;
  is_completed: boolean;
  score: number | null;
  accuracy_percent: number | null;
}

export interface ExamResult {
  session_id: string;
  score: number;
  accuracy_percent: number;
  time_management: { onTime: number; late: number };
  recommendations: string[];
}

const generateRecommendations = (accuracy: number): string[] => {
  const recs: string[] = [];
  if (accuracy < 50) recs.push('⚠️ Temel konuları tekrar gözden geçir');
  if (accuracy < 70) recs.push('📚 Zayıf konularda ekstra çalış');
  if (accuracy >= 80) recs.push('🌟 Harika başarı! Çalışmalara devam et');
  return recs;
};

export const ExamSimulationRepository = {
  async createSession(userId: string, examType: 'full_mock' | 'section' | 'time_trial', totalQuestions: number, durationSeconds: number): Promise<ExamSession> {
    const db = getDb();
    const result = await db.query<ExamSession>(
      `INSERT INTO exam_sessions (user_id, exam_type, total_questions, duration_seconds, time_started)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [userId, examType, totalQuestions, durationSeconds]
    );
    return result.rows[0];
  },

  async endSession(sessionId: string, score: number, accuracy: number): Promise<ExamSession> {
    const db = getDb();
    const result = await db.query<ExamSession>(
      `UPDATE exam_sessions 
       SET is_completed = TRUE, time_ended = NOW(), score = $1, accuracy_percent = $2
       WHERE id = $3
       RETURNING *`,
      [score, accuracy, sessionId]
    );
    return result.rows[0];
  },

  async getSessionResults(sessionId: string): Promise<ExamResult> {
    const db = getDb();
    const sessionResult = await db.query<ExamSession>(
      'SELECT * FROM exam_sessions WHERE id = $1',
      [sessionId]
    );
    const session = sessionResult.rows[0];

    const answersResult = await db.query<{ onTime: number; late: number }>(
      `SELECT
        SUM(CASE WHEN NOT time_limit_exceeded THEN 1 ELSE 0 END) as onTime,
        SUM(CASE WHEN time_limit_exceeded THEN 1 ELSE 0 END) as late
       FROM exam_session_answers WHERE session_id = $1`,
      [sessionId]
    );
    const timing = answersResult.rows[0];

    return {
      session_id: sessionId,
      score: session.score || 0,
      accuracy_percent: session.accuracy_percent || 0,
      time_management: {
        onTime: timing.onTime || 0,
        late: timing.late || 0,
      },
      recommendations: generateRecommendations(session.accuracy_percent || 0),
    };
  },

  async recordAnswer(sessionId: string, questionId: string, userAnswer: string, isCorrect: boolean, timeSpent: number, timeLimitExceeded: boolean): Promise<void> {
    const db = getDb();
    await db.query(
      `INSERT INTO exam_session_answers (session_id, question_id, user_answer, is_correct, time_spent_seconds, time_limit_exceeded)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId, questionId, userAnswer, isCorrect, timeSpent, timeLimitExceeded]
    );
  },
};
