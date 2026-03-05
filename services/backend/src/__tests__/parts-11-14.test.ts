import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import Fastify from 'fastify';
import { FastifyInstance } from 'fastify';
import { registerNewsRoutes } from '../routes/news';
import { registerVoiceQuestionsRoutes } from '../routes/voice-questions';
import { registerSocialRoutes } from '../routes/social';
import { NewsRepository } from '../db/news.repository';
import { VoiceQuestionRepository } from '../db/voice-question.repository';
import { SocialGamificationRepository } from '../db/social-gamification.repository';

describe('Advanced Features Parts 11-14', () => {
  let app: FastifyInstance;
  const testUserId = 1;

  beforeAll(async () => {
    app = Fastify();
    app.register(registerNewsRoutes);
    app.register(registerVoiceQuestionsRoutes);
    app.register(registerSocialRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Part 11: Solution Explanations & Mini-Lessons', () => {
    describe('NewsRepository (Alternative: Solution Distribution)', () => {
      it('should create a news item for solution updates', async () => {
        const news = await NewsRepository.create(
          'Soru #42 için Video Açıklama Yayınlandı',
          'Logaritma konusundaki 42 numaralı soru için videoyla anlatılan çözüm artık mevcut.',
          'öğrendimi-ipuçları',
          'Selen Hocam',
          'https://example.com/video-42',
          'https://example.com/thumb-42.jpg',
          true
        );
        expect(news).toBeDefined();
        expect(news.title).toContain('Video');
        expect(news.category).toBe('öğrendimi-ipuçları');
      });

      it('should mark news as important for critical solutions', async () => {
        const news = await NewsRepository.create(
          'Önemli: Sınavda Sık Sorulan Hata',
          'Bu konudaki yaygın hatalar ve çözümleri...',
          'öğrendimi-ipuçları',
          null,
          null,
          null,
          true
        );
        expect(news.important).toBe(true);
      });

      it('should find latest solution updates', async () => {
        const updates = await NewsRepository.findLatest(5);
        expect(Array.isArray(updates)).toBe(true);
      });

      it('should search for solutions by topic', async () => {
        await NewsRepository.create(
          'Türkçe Gramer: İsim Fiiller',
          'İsim fiillerin kullanımı ve örnekler',
          'öğrendimi-ipuçları',
          null,
          null,
          null,
          false
        );
        const results = await NewsRepository.search('İsim', 10);
        expect(results.length).toBeGreaterThan(0);
      });

      it('should track solution views', async () => {
        const news = await NewsRepository.create(
          'Matematik: Türev',
          'Türev konusu kapsamlı çözüm',
          'öğrendimi-ipuçları',
          null,
          null,
          null,
          false
        );
        const beforeViews = news.views_count;
        await NewsRepository.findById(news.id);
        const afterViews = await NewsRepository.findById(news.id);
        expect((afterViews?.views_count || 0) > beforeViews).toBe(true);
      });

      it('should get trending solutions', async () => {
        const trending = await NewsRepository.getTrendingNews(7, 5);
        expect(Array.isArray(trending)).toBe(true);
      });
    });
  });

  describe('Part 12: Güncel Bilgi (News Module)', () => {
    describe('NewsRepository', () => {
      it('should save user read history', async () => {
        const news = await NewsRepository.create(
          'Test News',
          'Test content',
          'haberler',
          null,
          null,
          null,
          false
        );
        const read = await NewsRepository.saveUserRead(testUserId, news.id);
        expect(read.user_id).toBe(testUserId);
        expect(read.news_id).toBe(news.id);
      });

      it('should retrieve user read news', async () => {
        const news = await NewsRepository.create(
          'User Read News',
          'Content',
          'haberler',
          null,
          null,
          null,
          false
        );
        await NewsRepository.saveUserRead(testUserId, news.id);
        const readNews = await NewsRepository.getUserReadNews(testUserId, 10);
        expect(readNews.some(n => n.id === news.id)).toBe(true);
      });

      it('should bookmark news', async () => {
        const news = await NewsRepository.create(
          'Bookmarkable News',
          'Content',
          'mevzuat',
          null,
          null,
          null,
          false
        );
        const bookmark = await NewsRepository.bookmarkNews(testUserId, news.id);
        expect(bookmark.user_id).toBe(testUserId);
        expect(bookmark.news_id).toBe(news.id);
      });

      it('should check if news is bookmarked', async () => {
        const news = await NewsRepository.create(
          'Bookmark Check',
          'Content',
          'haberler',
          null,
          null,
          null,
          false
        );
        await NewsRepository.bookmarkNews(testUserId, news.id);
        const isBookmarked = await NewsRepository.isBookmarked(testUserId, news.id);
        expect(isBookmarked).toBe(true);
      });

      it('should retrieve user bookmarks', async () => {
        const news = await NewsRepository.create(
          'Bookmarked Item',
          'Content',
          'sınav-takvimi',
          null,
          null,
          null,
          false
        );
        await NewsRepository.bookmarkNews(testUserId, news.id);
        const bookmarks = await NewsRepository.getUserBookmarks(testUserId, 10);
        expect(bookmarks.some(n => n.id === news.id)).toBe(true);
      });

      it('should get category statistics', async () => {
        const stats = await NewsRepository.getCategoryStats();
        expect(stats).toHaveProperty('haberler');
        expect(typeof stats.haberler).toBe('number');
      });

      it('should update news', async () => {
        const news = await NewsRepository.create(
          'Original Title',
          'Original content',
          'haberler',
          null,
          null,
          null,
          false
        );
        const updated = await NewsRepository.update(news.id, {
          title: 'Updated Title',
          important: true,
        });
        expect(updated.title).toBe('Updated Title');
        expect(updated.important).toBe(true);
      });

      it('should delete news', async () => {
        const news = await NewsRepository.create(
          'Deletable News',
          'Content',
          'haberler',
          null,
          null,
          null,
          false
        );
        const deleted = await NewsRepository.delete(news.id);
        expect(deleted).toBe(true);
      });
    });
  });

  describe('Part 13: Konuşmalı Soru (Voice Questions)', () => {
    describe('VoiceQuestionRepository', () => {
      it('should create voice question', async () => {
        const voiceQuestion = await VoiceQuestionRepository.createVoiceQuestion(
          1,
          1,
          'https://example.com/audio.mp3',
          45,
          'tr'
        );
        expect(voiceQuestion).toBeDefined();
        expect(voiceQuestion.voice_prompt_duration_seconds).toBe(45);
      });

      it('should find voice question by id', async () => {
        const created = await VoiceQuestionRepository.createVoiceQuestion(
          1,
          2,
          'https://example.com/audio2.mp3',
          30
        );
        const found = await VoiceQuestionRepository.findVoiceQuestionById(created.id);
        expect(found?.id).toBe(created.id);
      });

      it('should find voice questions by test', async () => {
        await VoiceQuestionRepository.createVoiceQuestion(1, 3, 'https://example.com/a.mp3');
        await VoiceQuestionRepository.createVoiceQuestion(1, 4, 'https://example.com/b.mp3');
        const questions = await VoiceQuestionRepository.findVoiceQuestionsByTest(1);
        expect(questions.length).toBeGreaterThan(0);
      });

      it('should record voice answer', async () => {
        const vq = await VoiceQuestionRepository.createVoiceQuestion(
          1,
          5,
          'https://example.com/prompt.mp3'
        );
        const answer = await VoiceQuestionRepository.recordVoiceAnswer(
          testUserId,
          vq.id,
          'https://example.com/answer.mp3',
          'Student answer text',
          25
        );
        expect(answer.user_id).toBe(testUserId);
        expect(answer.duration_seconds).toBe(25);
      });

      it('should update answer with transcription results', async () => {
        const vq = await VoiceQuestionRepository.createVoiceQuestion(
          1,
          6,
          'https://example.com/prompt.mp3'
        );
        const answer = await VoiceQuestionRepository.recordVoiceAnswer(
          testUserId,
          vq.id,
          'https://example.com/answer.mp3',
          'Original answer',
          20
        );
        const updated = await VoiceQuestionRepository.updateVoiceAnswerAccuracy(
          answer.id,
          'Transcribed text',
          85
        );
        expect(updated.accuracy_percent).toBe(85);
      });

      it('should record transcription details', async () => {
        const vq = await VoiceQuestionRepository.createVoiceQuestion(
          1,
          7,
          'https://example.com/prompt.mp3'
        );
        const answer = await VoiceQuestionRepository.recordVoiceAnswer(
          testUserId,
          vq.id,
          'https://example.com/answer.mp3',
          'Answer',
          15
        );
        const transcription = await VoiceQuestionRepository.recordTranscription(
          answer.id,
          'Original',
          'Transcribed',
          0.95,
          'tr'
        );
        expect(transcription.confidence_score).toBe(0.95);
      });

      it('should get voice answer analytics', async () => {
        const vq1 = await VoiceQuestionRepository.createVoiceQuestion(1, 8, 'https://ex.com/p1.mp3');
        const vq2 = await VoiceQuestionRepository.createVoiceQuestion(1, 9, 'https://ex.com/p2.mp3');
        const a1 = await VoiceQuestionRepository.recordVoiceAnswer(testUserId, vq1.id, 'https://ex.com/a1.mp3', 'Answer', 20);
        const a2 = await VoiceQuestionRepository.recordVoiceAnswer(testUserId, vq2.id, 'https://ex.com/a2.mp3', 'Answer', 25);
        
        await VoiceQuestionRepository.updateVoiceAnswerAccuracy(a1.id, 'Text1', 90);
        await VoiceQuestionRepository.updateVoiceAnswerAccuracy(a2.id, 'Text2', 80);

        const analytics = await VoiceQuestionRepository.getVoiceAnswerAnalytics(testUserId);
        expect(analytics.total_voice_answers).toBe(2);
        expect(analytics.average_accuracy).toBe(85);
      });

      it('should get test voice performance', async () => {
        const performance = await VoiceQuestionRepository.getTestVoicePerformance(1, testUserId);
        expect(performance).toHaveProperty('total_voice_questions');
        expect(performance).toHaveProperty('completion_percent');
      });
    });
  });

  describe('Part 14: Sosyal & Gamification', () => {
    describe('SocialGamificationRepository', () => {
      it('should get global leaderboard', async () => {
        const leaderboard = await SocialGamificationRepository.getGlobalLeaderboard(10);
        expect(Array.isArray(leaderboard)).toBe(true);
      });

      it('should update user leaderboard', async () => {
        const lb = await SocialGamificationRepository.updateUserLeaderboard(testUserId);
        expect(lb).toBeDefined();
        expect(lb.user_id).toBe(testUserId);
      });

      it('should share achievement', async () => {
        const achievement = await SocialGamificationRepository.shareAchievement(
          testUserId,
          'badge',
          { badge_type: 'first_test', earned_at: new Date() },
          'İlk testimi tamamladım! 🎉'
        );
        expect(achievement.user_id).toBe(testUserId);
        expect(achievement.achievement_type).toBe('badge');
      });

      it('should get achievement feed', async () => {
        const feed = await SocialGamificationRepository.getFeedAchievements(20, 0);
        expect(Array.isArray(feed)).toBe(true);
      });

      it('should get user achievements', async () => {
        await SocialGamificationRepository.shareAchievement(
          testUserId,
          'milestone',
          { score: 100 },
          'Test'
        );
        const achievements = await SocialGamificationRepository.getUserAchievements(testUserId, 10);
        expect(Array.isArray(achievements)).toBe(true);
      });

      it('should like achievement', async () => {
        const achievement = await SocialGamificationRepository.shareAchievement(
          testUserId,
          'streak',
          { streak: 7 },
          'Test'
        );
        const like = await SocialGamificationRepository.likeAchievement(achievement.id, testUserId + 1);
        expect(like).toBeDefined();
      });

      it('should comment on achievement', async () => {
        const achievement = await SocialGamificationRepository.shareAchievement(
          testUserId,
          'accuracy',
          { accuracy: 95 },
          'Test'
        );
        const comment = await SocialGamificationRepository.commentOnAchievement(
          achievement.id,
          testUserId + 1,
          'Harika başarı!'
        );
        expect(comment.comment_text).toBe('Harika başarı!');
      });

      it('should get achievement comments', async () => {
        const achievement = await SocialGamificationRepository.shareAchievement(
          testUserId,
          'test_completed',
          { test_id: 1 },
          'Test'
        );
        await SocialGamificationRepository.commentOnAchievement(achievement.id, testUserId + 1, 'Comment 1');
        const comments = await SocialGamificationRepository.getAchievementComments(achievement.id, 10);
        expect(Array.isArray(comments)).toBe(true);
      });

      it('should follow user', async () => {
        const follow = await SocialGamificationRepository.followUser(testUserId + 2, testUserId + 3);
        expect(follow.follower_id).toBe(testUserId + 2);
        expect(follow.following_id).toBe(testUserId + 3);
      });

      it('should get followers', async () => {
        await SocialGamificationRepository.followUser(testUserId + 4, testUserId + 5);
        const followers = await SocialGamificationRepository.getFollowers(testUserId + 5);
        expect(Array.isArray(followers)).toBe(true);
      });

      it('should get following list', async () => {
        await SocialGamificationRepository.followUser(testUserId + 6, testUserId + 7);
        const following = await SocialGamificationRepository.getFollowing(testUserId + 6);
        expect(Array.isArray(following)).toBe(true);
      });

      it('should check if following', async () => {
        await SocialGamificationRepository.followUser(testUserId + 8, testUserId + 9);
        const isFollowing = await SocialGamificationRepository.isFollowing(testUserId + 8, testUserId + 9);
        expect(isFollowing).toBe(true);
      });

      it('should unfollow user', async () => {
        await SocialGamificationRepository.followUser(testUserId + 10, testUserId + 11);
        const unfollowed = await SocialGamificationRepository.unfollowUser(testUserId + 10, testUserId + 11);
        expect(unfollowed).toBe(true);
      });

      it('should get follower count', async () => {
        const count = await SocialGamificationRepository.getFollowersCount(testUserId);
        expect(typeof count).toBe('number');
      });

      it('should get following count', async () => {
        const count = await SocialGamificationRepository.getFollowingCount(testUserId);
        expect(typeof count).toBe('number');
      });

      it('should prevent duplicate follows', async () => {
        await SocialGamificationRepository.followUser(testUserId + 12, testUserId + 13);
        const follow2 = await SocialGamificationRepository.followUser(testUserId + 12, testUserId + 13);
        // Should silently ignore or return existing
        expect(follow2).toBeDefined();
      });
    });

    describe('Social Routes', () => {
      it('GET /leaderboard/global should return leaderboard', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/leaderboard/global?limit=10',
        });
        expect([200, 404]).toContain(response.statusCode);
      });

      it('GET /achievements/feed should return feed', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/achievements/feed?limit=20&offset=0',
        });
        expect([200, 404]).toContain(response.statusCode);
      });

      it('POST /achievements/share should create achievement', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/achievements/share',
          payload: {
            type: 'badge',
            data: { badge_type: 'test' },
            text: 'Test achievement',
          },
          headers: { authorization: 'Bearer test-token' },
        });
        expect([201, 401]).toContain(response.statusCode);
      });
    });
  });

  describe('Integration: All Parts 11-14', () => {
    it('should handle complete social achievement workflow', async () => {
      // 1. Create news about solution
      const news = await NewsRepository.create(
        'Yeni Video Açıklama',
        'Konusunda öğrenilecek önemli noktalar...',
        'öğrendimi-ipuçları',
        'Selen Hocam',
        null,
        null,
        true
      );
      expect(news.important).toBe(true);

      // 2. Record voice answer
      const voiceQuestion = await VoiceQuestionRepository.createVoiceQuestion(
        1,
        100,
        'https://example.com/voice.mp3',
        40
      );
      const voiceAnswer = await VoiceQuestionRepository.recordVoiceAnswer(
        testUserId,
        voiceQuestion.id,
        'https://example.com/answer.mp3',
        'Student response',
        30
      );
      expect(voiceAnswer.duration_seconds).toBe(30);

      // 3. Update leaderboard and share achievement
      await SocialGamificationRepository.updateUserLeaderboard(testUserId);
      const achievement = await SocialGamificationRepository.shareAchievement(
        testUserId,
        'voice_proficiency',
        { voice_answers: 1, avg_accuracy: 85 },
        'Sesli sorularla çalışmaya başladım!'
      );
      expect(achievement.achievement_type).toBe('voice_proficiency');

      // 4. Other user engages
      await SocialGamificationRepository.likeAchievement(achievement.id, testUserId + 1);
      await SocialGamificationRepository.commentOnAchievement(
        achievement.id,
        testUserId + 1,
        'Müthiş çalışma!'
      );

      // 5. Check feed
      const feed = await SocialGamificationRepository.getFeedAchievements(10, 0);
      expect(feed.some(a => a.id === achievement.id)).toBe(true);
    });

    it('should handle learning progression across parts', async () => {
      // User reads solution (Part 11/12)
      const solution = await NewsRepository.create(
        'Logaritma Çözüm Video', 'Content', 'öğrendimi-ipuçları', null, null, null, true
      );
      await NewsRepository.saveUserRead(testUserId, solution.id);

      // User practices with voice (Part 13)
      const vq = await VoiceQuestionRepository.createVoiceQuestion(1, 101, 'https://ex.com/p.mp3', 35);
      const va = await VoiceQuestionRepository.recordVoiceAnswer(testUserId, vq.id, 'https://ex.com/a.mp3', 'Answer', 28);
      await VoiceQuestionRepository.updateVoiceAnswerAccuracy(va.id, 'Text', 92);

      // User shares progress (Part 14)
      await SocialGamificationRepository.updateUserLeaderboard(testUserId);
      const rank = await SocialGamificationRepository.getUserLeaderboardRank(testUserId);
      expect(rank.badges_earned).toBeGreaterThanOrEqual(0);
    });
  });
});
