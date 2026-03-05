import { db } from './index';

export interface VoiceQuestion {
  id: number;
  test_id: number;
  question_id: number;
  voice_prompt_url: string;
  voice_prompt_duration_seconds: number | null;
  voice_prompt_language: string;
  created_at: Date;
}

export interface UserVoiceAnswer {
  id: number;
  user_id: number;
  voice_question_id: number;
  voice_answer_url: string | null;
  answer_text: string | null;
  recognized_text: string | null;
  accuracy_percent: number | null;
  duration_seconds: number | null;
  answered_at: Date;
  created_at: Date;
}

export interface VoiceTranscription {
  id: number;
  voice_answer_id: number;
  original_text: string;
  transcribed_text: string;
  confidence_score: number;
  language: string;
  processed_at: Date;
}

export const VoiceQuestionRepository = {
  async createVoiceQuestion(
    testId: number,
    questionId: number,
    voicePromptUrl: string,
    durationSeconds?: number,
    language: string = 'tr'
  ): Promise<VoiceQuestion> {
    const result = await db.query(
      `INSERT INTO voice_questions (test_id, question_id, voice_prompt_url, voice_prompt_duration_seconds, voice_prompt_language)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [testId, questionId, voicePromptUrl, durationSeconds, language]
    );
    return result.rows[0];
  },

  async findVoiceQuestionById(id: number): Promise<VoiceQuestion | null> {
    const result = await db.query(
      'SELECT * FROM voice_questions WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async findVoiceQuestionsByTest(testId: number): Promise<VoiceQuestion[]> {
    const result = await db.query(
      'SELECT * FROM voice_questions WHERE test_id = $1 ORDER BY created_at',
      [testId]
    );
    return result.rows;
  },

  async findVoiceQuestionsByQuestion(questionId: number): Promise<VoiceQuestion[]> {
    const result = await db.query(
      'SELECT * FROM voice_questions WHERE question_id = $1 ORDER BY created_at',
      [questionId]
    );
    return result.rows;
  },

  async recordVoiceAnswer(
    userId: number,
    voiceQuestionId: number,
    voiceAnswerUrl: string,
    answerText: string,
    durationSeconds: number
  ): Promise<UserVoiceAnswer> {
    const result = await db.query(
      `INSERT INTO user_voice_answers (user_id, voice_question_id, voice_answer_url, answer_text, duration_seconds)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, voiceQuestionId, voiceAnswerUrl, answerText, durationSeconds]
    );
    return result.rows[0];
  },

  async updateVoiceAnswerAccuracy(
    voiceAnswerId: number,
    recognizedText: string,
    accuracyPercent: number
  ): Promise<UserVoiceAnswer> {
    const result = await db.query(
      `UPDATE user_voice_answers
       SET recognized_text = $1, accuracy_percent = $2
       WHERE id = $3
       RETURNING *`,
      [recognizedText, accuracyPercent, voiceAnswerId]
    );
    return result.rows[0];
  },

  async getUserVoiceAnswers(userId: number, limit: number = 50): Promise<UserVoiceAnswer[]> {
    const result = await db.query(
      `SELECT * FROM user_voice_answers WHERE user_id = $1 ORDER BY answered_at DESC LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  },

  async getVoiceAnswersByQuestion(questionId: number, userId: number): Promise<UserVoiceAnswer[]> {
    const result = await db.query(
      `SELECT uva.* FROM user_voice_answers uva
       INNER JOIN voice_questions vq ON uva.voice_question_id = vq.id
       WHERE vq.question_id = $1 AND uva.user_id = $2
       ORDER BY uva.answered_at DESC`,
      [questionId, userId]
    );
    return result.rows;
  },

  async recordTranscription(
    voiceAnswerId: number,
    originalText: string,
    transcribedText: string,
    confidenceScore: number,
    language: string = 'tr'
  ): Promise<VoiceTranscription> {
    const result = await db.query(
      `INSERT INTO voice_transcriptions (voice_answer_id, original_text, transcribed_text, confidence_score, language)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [voiceAnswerId, originalText, transcribedText, confidenceScore, language]
    );
    return result.rows[0];
  },

  async getTranscription(voiceAnswerId: number): Promise<VoiceTranscription | null> {
    const result = await db.query(
      'SELECT * FROM voice_transcriptions WHERE voice_answer_id = $1',
      [voiceAnswerId]
    );
    return result.rows[0] || null;
  },

  async getVoiceAnswerAnalytics(userId: number): Promise<{
    total_voice_answers: number;
    average_accuracy: number;
    total_duration_minutes: number;
    last_answer_date: string | null;
  }> {
    const result = await db.query(
      `SELECT
        COUNT(*) as total_voice_answers,
        AVG(accuracy_percent) as average_accuracy,
        SUM(duration_seconds) / 60 as total_duration_minutes,
        MAX(answered_at) as last_answer_date
       FROM user_voice_answers
       WHERE user_id = $1 AND accuracy_percent IS NOT NULL`,
      [userId]
    );
    const row = result.rows[0];
    return {
      total_voice_answers: parseInt(row.total_voice_answers),
      average_accuracy: row.average_accuracy ? Math.round(row.average_accuracy) : 0,
      total_duration_minutes: row.total_duration_minutes ? Math.round(row.total_duration_minutes * 10) / 10 : 0,
      last_answer_date: row.last_answer_date,
    };
  },

  async getTestVoicePerformance(testId: number, userId: number): Promise<{
    total_voice_questions: number;
    answered_count: number;
    average_accuracy: number;
    completion_percent: number;
  }> {
    const result = await db.query(
      `SELECT
        COUNT(DISTINCT vq.id) as total_voice_questions,
        COUNT(DISTINCT uva.id) as answered_count,
        AVG(uva.accuracy_percent) as average_accuracy
       FROM voice_questions vq
       LEFT JOIN user_voice_answers uva ON vq.id = uva.voice_question_id AND uva.user_id = $1
       WHERE vq.test_id = $2`,
      [userId, testId]
    );
    const row = result.rows[0];
    const totalQuestions = parseInt(row.total_voice_questions);
    const answeredCount = parseInt(row.answered_count);
    return {
      total_voice_questions: totalQuestions,
      answered_count: answeredCount,
      average_accuracy: row.average_accuracy ? Math.round(row.average_accuracy) : 0,
      completion_percent: totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0,
    };
  },

  async deleteVoiceQuestion(id: number): Promise<boolean> {
    const result = await db.query('DELETE FROM voice_questions WHERE id = $1', [id]);
    return result.rowCount > 0;
  },
};
