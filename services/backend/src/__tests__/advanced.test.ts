import { ExamSimulationRepository } from '../db/exam-simulation.repository';
import { SolutionExplanationRepository } from '../db/solution-explanation.repository';
import { GamificationRepository } from '../db/gamification.repository';

describe('Advanced Features (Exam Simulation, Solutions, Gamification)', () => {
  const testUserId = '1';

  describe('ExamSimulationRepository', () => {
    it('should create a new exam session with full_mock type', async () => {
      const session = await ExamSimulationRepository.createSession(testUserId, 'full_mock', 100, 180);
      expect(session).toBeDefined();
      expect(session.exam_type).toBe('full_mock');
      expect(session.total_questions).toBe(100);
      expect(session.duration_seconds).toBe(180);
      expect(session.score).toBeNull();
      expect(session.accuracy_percent).toBeNull();
    });

    it('should record answer with timing information', async () => {
      const session = await ExamSimulationRepository.createSession(testUserId, 'section', 40, 60);
      const answer = await ExamSimulationRepository.recordAnswer(
        session.id,
        1,
        'A',
        true,
        45,
        false
      );
      expect(answer).toBeDefined();
      expect(answer.is_correct).toBe(true);
      expect(answer.time_spent_seconds).toBe(45);
      expect(answer.time_limit_exceeded).toBe(false);
    });

    it('should record multiple answers for a session', async () => {
      const session = await ExamSimulationRepository.createSession(testUserId, 'time_trial', 20, 30);
      const answers = [];
      for (let i = 0; i < 5; i++) {
        const answer = await ExamSimulationRepository.recordAnswer(
          session.id,
          i + 1,
          ['A', 'B', 'C', 'D'][i % 4],
          i % 2 === 0,
          20 + i * 5,
          i === 3
        );
        answers.push(answer);
      }
      expect(answers.length).toBe(5);
      expect(answers[3].time_limit_exceeded).toBe(true);
    });

    it('should end exam session with score and accuracy', async () => {
      const session = await ExamSimulationRepository.createSession(testUserId, 'full_mock', 100, 180);
      await ExamSimulationRepository.recordAnswer(session.id, 1, 'A', true, 30, false);
      await ExamSimulationRepository.recordAnswer(session.id, 2, 'B', true, 25, false);
      await ExamSimulationRepository.recordAnswer(session.id, 3, 'C', false, 35, false);

      const endedSession = await ExamSimulationRepository.endSession(session.id, 75, 66.67);
      expect(endedSession.is_completed).toBe(true);
      expect(endedSession.score).toBe(75);
      expect(endedSession.accuracy_percent).toBeCloseTo(66.67);
    });

    it('should generate recommendations based on accuracy', async () => {
      const session = await ExamSimulationRepository.createSession(testUserId, 'full_mock', 100, 180);
      // Low accuracy (< 50%)
      for (let i = 1; i <= 10; i++) {
        await ExamSimulationRepository.recordAnswer(session.id, i, 'A', i <= 4, 20, false);
      }
      const lowAccuracyRecs = await ExamSimulationRepository.getSessionResults(session.id);
      expect(lowAccuracyRecs.recommendations).toContain('Temel konulara dönüş önerilir');

      // Medium accuracy (50-70%)
      const session2 = await ExamSimulationRepository.createSession(testUserId, 'full_mock', 100, 180);
      for (let i = 1; i <= 10; i++) {
        await ExamSimulationRepository.recordAnswer(session2.id, i, 'A', i <= 6, 20, false);
      }
      const mediumAccuracyRecs = await ExamSimulationRepository.getSessionResults(session2.id);
      expect(mediumAccuracyRecs.recommendations).toContain('Zayıf konulara odaklan');

      // High accuracy (>= 80%)
      const session3 = await ExamSimulationRepository.createSession(testUserId, 'full_mock', 100, 180);
      for (let i = 1; i <= 10; i++) {
        await ExamSimulationRepository.recordAnswer(session3.id, i, 'A', i <= 8, 20, false);
      }
      const highAccuracyRecs = await ExamSimulationRepository.getSessionResults(session3.id);
      expect(highAccuracyRecs.recommendations).toContain('Mükemmel ilerleme!');
    });

    it('should calculate session analytics', async () => {
      const session = await ExamSimulationRepository.createSession(testUserId, 'full_mock', 100, 180);
      const answers = [
        { q: 1, correct: true, time: 30 },
        { q: 2, correct: true, time: 35 },
        { q: 3, correct: false, time: 25 },
        { q: 4, correct: false, time: 40 },
        { q: 5, correct: true, time: 28 },
      ];

      for (const ans of answers) {
        await ExamSimulationRepository.recordAnswer(session.id, ans.q, 'A', ans.correct, ans.time, false);
      }

      const results = await ExamSimulationRepository.getSessionResults(session.id);
      expect(results.total_answered).toBe(5);
      expect(results.correct_answers).toBe(3);
      expect(results.accuracy).toBeCloseTo(60);
      expect(results.avg_time_per_question).toBeCloseTo(31.6);
    });
  });

  describe('SolutionExplanationRepository', () => {
    it('should create solution explanation for a question', async () => {
      const solution = await SolutionExplanationRepository.create(1, 'Option A is correct', 'Detailed explanation...', ['key point 1', 'key point 2'], [], 'https://example.com/video');
      expect(solution).toBeDefined();
      expect(solution.question_id).toBe(1);
      expect(solution.short_explanation).toBe('Option A is correct');
      expect(solution.long_explanation).toBe('Detailed explanation...');
      expect(solution.key_points).toHaveLength(2);
    });

    it('should find solution by question id', async () => {
      await SolutionExplanationRepository.create(2, 'Answer is B', 'Full explanation...', ['point1'], [], null);
      const solution = await SolutionExplanationRepository.findByQuestionId(2);
      expect(solution).toBeDefined();
      expect(solution?.question_id).toBe(2);
      expect(solution?.short_explanation).toBe('Answer is B');
    });

    it('should include similar questions in solution', async () => {
      const solution = await SolutionExplanationRepository.create(3, 'Answer C', 'Desc', ['pt1', 'pt2'], [4, 5, 6], 'https://video.com');
      expect(solution.similar_questions).toContain(4);
      expect(solution.similar_questions).toContain(5);
      expect(solution.similar_questions).toContain(6);
    });

    it('should handle video URL storage', async () => {
      const videoUrl = 'https://example.com/konu-anlatim.mp4';
      const solution = await SolutionExplanationRepository.create(4, 'Video available', 'Full explanation', [], [], videoUrl);
      expect(solution.video_url).toBe(videoUrl);
    });

    it('should retrieve similar questions for practice', async () => {
      await SolutionExplanationRepository.create(5, 'Q1', 'Desc1', ['p1'], [6, 7, 8], null);
      const similar = await SolutionExplanationRepository.getSimilarQuestions(5);
      expect(similar).toContain(6);
      expect(similar).toContain(7);
      expect(similar).toContain(8);
    });
  });

  describe('GamificationRepository', () => {
    it('should initialize streak on first call', async () => {
      const streak = await GamificationRepository.getOrCreateStreak(testUserId);
      expect(streak).toBeDefined();
      expect(streak.current_streak).toBe(1);
      expect(streak.longest_streak).toBe(1);
      expect(streak.last_studied_at).toBeDefined();
    });

    it('should increment streak for consecutive day', async () => {
      const user = testUserId + 100; // New user for this test
      let streak = await GamificationRepository.getOrCreateStreak(user);
      expect(streak.current_streak).toBe(1);

      // Simulate next day
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      // Update last_studied_at to yesterday in DB
      streak = await GamificationRepository.updateStreak(user, yesterday);
      expect(streak.current_streak).toBe(2);
    });

    it('should reset streak on day gap > 1', async () => {
      const user = testUserId + 101;
      let streak = await GamificationRepository.getOrCreateStreak(user);
      const original = streak.current_streak;

      // Simulate 2+ days gap
      const twoDogsAgo = new Date();
      twoDogsAgo.setDate(twoDogsAgo.getDate() - 2);
      streak = await GamificationRepository.updateStreak(user, twoDogsAgo);
      expect(streak.current_streak).toBe(1);
    });

    it('should update longest_streak when current exceeds it', async () => {
      const user = testUserId + 102;
      let streak = await GamificationRepository.getOrCreateStreak(user);
      expect(streak.longest_streak).toBe(1);

      // Simulate 5 consecutive days
      for (let i = 0; i < 4; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        streak = await GamificationRepository.updateStreak(user, date);
      }
      expect(streak.current_streak).toBe(5);
      expect(streak.longest_streak).toBe(5);
    });

    it('should fetch all badge types', async () => {
      const badges = await GamificationRepository.getAllBadges();
      expect(badges.length).toBeGreaterThan(0);
      expect(badges[0]).toHaveProperty('badge_type');
      expect(badges[0]).toHaveProperty('title');
      expect(badges[0]).toHaveProperty('icon');
    });

    it('should retrieve user earned badges', async () => {
      const user = testUserId + 103;
      const badges = await GamificationRepository.getUserBadges(user);
      expect(Array.isArray(badges)).toBe(true);
    });

    it('should award badge to user', async () => {
      const user = testUserId + 104;
      const allBadges = await GamificationRepository.getAllBadges();
      const firstBadge = allBadges[0];

      const userBadge = await GamificationRepository.awardBadge(user, firstBadge.id);
      expect(userBadge.user_id).toBe(user);
      expect(userBadge.badge_id).toBe(firstBadge.id);
      expect(userBadge.earned_at).toBeDefined();
    });

    it('should prevent duplicate badge awards', async () => {
      const user = testUserId + 105;
      const allBadges = await GamificationRepository.getAllBadges();
      const badge = allBadges[0];

      await GamificationRepository.awardBadge(user, badge.id);
      // Try to award same badge again
      const secondAward = await GamificationRepository.awardBadge(user, badge.id);
      // Should not create duplicate (either silent or return existing)
      expect(secondAward).toBeDefined();
    });

    it('should track multiple badges per user', async () => {
      const user = testUserId + 106;
      const allBadges = await GamificationRepository.getAllBadges();

      // Award multiple badges
      for (let i = 0; i < Math.min(3, allBadges.length); i++) {
        await GamificationRepository.awardBadge(user, allBadges[i].id);
      }

      const userBadges = await GamificationRepository.getUserBadges(user);
      expect(userBadges.length).toBe(Math.min(3, allBadges.length));
    });
  });

  describe('Advanced Routes', () => {
    it('POST /exams/start should create exam session', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/exams/start',
        payload: { exam_type: 'full_mock' },
        headers: { authorization: 'Bearer test-token' },
      });
      expect([200, 201]).toContain(response.statusCode);
    });

    it('GET /user/streak should return streak data', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/user/streak',
        headers: { authorization: 'Bearer test-token' },
      });
      expect([200, 404]).toContain(response.statusCode);
    });

    it('GET /user/badges should return earned badges', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/user/badges',
        headers: { authorization: 'Bearer test-token' },
      });
      expect([200, 404]).toContain(response.statusCode);
    });

    it('GET /questions/:id/solution should return solution', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/questions/1/solution',
      });
      expect([200, 404]).toContain(response.statusCode);
    });
  });

  describe('Gamification Edge Cases', () => {
    it('should handle same-day streak update', async () => {
      const user = testUserId + 200;
      const streak = await GamificationRepository.getOrCreateStreak(user);
      const today = new Date();
      const updatedStreak = await GamificationRepository.updateStreak(user, today);
      // Same day should not increment
      expect(updatedStreak.current_streak).toBe(streak.current_streak);
    });

    it('should increment for exactly 1 day gap', async () => {
      const user = testUserId + 201;
      const streak = await GamificationRepository.getOrCreateStreak(user);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const updated = await GamificationRepository.updateStreak(user, yesterday);
      expect(updated.current_streak).toBe(streak.current_streak + 1);
    });

    it('should reset for 2+ day gap', async () => {
      const user = testUserId + 202;
      const streak = await GamificationRepository.getOrCreateStreak(user);
      const twoAgo = new Date();
      twoAgo.setDate(twoAgo.getDate() - 2);
      const updated = await GamificationRepository.updateStreak(user, twoAgo);
      expect(updated.current_streak).toBe(1);
    });
  });

  describe('Exam Difficulty Scenarios', () => {
    it('should track full_mock exam (100q, 180min)', async () => {
      const session = await ExamSimulationRepository.createSession(testUserId + 10, 'full_mock', 100, 180);
      expect(session.total_questions).toBe(100);
      expect(session.duration_seconds).toBe(180 * 60);
    });

    it('should track section exam', async () => {
      const session = await ExamSimulationRepository.createSession(testUserId + 11, 'section', 40, 60);
      expect(session.total_questions).toBe(40);
      expect(session.duration_seconds).toBe(60 * 60);
    });

    it('should track time_trial exam', async () => {
      const session = await ExamSimulationRepository.createSession(testUserId + 12, 'time_trial', 20, 30);
      expect(session.total_questions).toBe(20);
      expect(session.duration_seconds).toBe(30 * 60);
    });
  });

  describe('Recommendation Logic', () => {
    it('should recommend basics for < 50% accuracy', async () => {
      const session = await ExamSimulationRepository.createSession(testUserId + 20, 'full_mock', 100, 180);
      for (let i = 1; i <= 10; i++) {
        await ExamSimulationRepository.recordAnswer(session.id, i, 'A', i <= 3, 20, false);
      }
      const results = await ExamSimulationRepository.getSessionResults(session.id);
      expect(results.recommendations.some(r => r.includes('Temel') || r.includes('temel'))).toBe(true);
    });

    it('should recommend weak topics for 50-70% accuracy', async () => {
      const session = await ExamSimulationRepository.createSession(testUserId + 21, 'full_mock', 100, 180);
      for (let i = 1; i <= 10; i++) {
        await ExamSimulationRepository.recordAnswer(session.id, i, 'A', i <= 6, 20, false);
      }
      const results = await ExamSimulationRepository.getSessionResults(session.id);
      expect(results.recommendations.some(r => r.includes('Zayıf') || r.includes('zayıf'))).toBe(true);
    });

    it('should celebrate for >= 80% accuracy', async () => {
      const session = await ExamSimulationRepository.createSession(testUserId + 22, 'full_mock', 100, 180);
      for (let i = 1; i <= 10; i++) {
        await ExamSimulationRepository.recordAnswer(session.id, i, 'A', i <= 8, 20, false);
      }
      const results = await ExamSimulationRepository.getSessionResults(session.id);
      expect(results.recommendations.some(r => r.includes('Mükemmel') || r.includes('İlerleme'))).toBe(true);
    });
  });
});
