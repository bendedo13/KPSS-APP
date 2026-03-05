import { FastifyInstance } from 'fastify';
import { SocialGamificationRepository } from '../db/social-gamification.repository';
import { requireAuth } from '../middleware/auth';

export async function registerSocialRoutes(app: FastifyInstance) {
  // Global leaderboard
  app.get<{ Querystring: { limit: string } }>(
    '/leaderboard/global',
    async (request, reply) => {
      const limit = Math.min(parseInt(request.query?.limit as string) || 50, 100);
      const leaderboard = await SocialGamificationRepository.getGlobalLeaderboard(limit);
      reply.send(leaderboard);
    }
  );

  // Period-based leaderboard (weekly/monthly)
  app.get<{ Params: { period: string } }>(
    '/leaderboard/:period',
    async (request, reply) => {
      const { period } = request.params;
      if (!['weekly', 'monthly'].includes(period)) {
        reply.code(400).send({ error: 'Invalid period' });
        return;
      }
      const limit = Math.min(parseInt(request.query?.limit as string) || 50, 100);
      const leaderboard = await SocialGamificationRepository.getPeriodLeaderboard(
        period as any,
        limit
      );
      reply.send(leaderboard);
    }
  );

  // User's leaderboard rank - protected
  app.get(
    '/user/leaderboard-rank',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      try {
        const userId = (request as any).userId;
        const rank = await SocialGamificationRepository.getUserLeaderboardRank(userId);
        reply.send(rank);
      } catch {
        reply.code(404).send({ error: 'Not found on leaderboard' });
      }
    }
  );

  // Share achievement - protected
  app.post<{ Body: any }>(
    '/achievements/share',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const userId = (request as any).userId;
      const { type, data, text } = request.body;
      const achievement = await SocialGamificationRepository.shareAchievement(userId, type, data, text);
      reply.code(201).send(achievement);
    }
  );

  // Get achievement feed
  app.get<{ Querystring: { limit: string; offset: string } }>(
    '/achievements/feed',
    async (request, reply) => {
      const limit = Math.min(parseInt(request.query?.limit as string) || 20, 50);
      const offset = parseInt(request.query?.offset as string) || 0;
      const feed = await SocialGamificationRepository.getFeedAchievements(limit, offset);
      reply.send(feed);
    }
  );

  // Get user's achievements
  app.get<{ Params: { userId: string } }>(
    '/achievements/user/:userId',
    async (request, reply) => {
      const { userId } = request.params;
      const limit = parseInt(request.query?.limit as string) || 20;
      const achievements = await SocialGamificationRepository.getUserAchievements(parseInt(userId), limit);
      reply.send(achievements);
    }
  );

  // Like achievement - protected
  app.post<{ Params: { achievementId: string } }>(
    '/achievements/:achievementId/like',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const userId = (request as any).userId;
      const { achievementId } = request.params;
      await SocialGamificationRepository.likeAchievement(parseInt(achievementId), userId);
      reply.send({ success: true });
    }
  );

  // Unlike achievement - protected
  app.delete<{ Params: { achievementId: string } }>(
    '/achievements/:achievementId/like',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const userId = (request as any).userId;
      const { achievementId } = request.params;
      await SocialGamificationRepository.unlikeAchievement(parseInt(achievementId), userId);
      reply.send({ success: true });
    }
  );

  // Comment on achievement - protected
  app.post<{ Params: { achievementId: string }; Body: any }>(
    '/achievements/:achievementId/comment',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const userId = (request as any).userId;
      const { achievementId } = request.params;
      const { text } = request.body;
      const comment = await SocialGamificationRepository.commentOnAchievement(
        parseInt(achievementId),
        userId,
        text
      );
      reply.code(201).send(comment);
    }
  );

  // Get achievement comments
  app.get<{ Params: { achievementId: string } }>(
    '/achievements/:achievementId/comments',
    async (request, reply) => {
      const { achievementId } = request.params;
      const limit = parseInt(request.query?.limit as string) || 20;
      const comments = await SocialGamificationRepository.getAchievementComments(
        parseInt(achievementId),
        limit
      );
      reply.send(comments);
    }
  );

  // Follow user - protected
  app.post<{ Params: { userId: string } }>(
    '/users/:userId/follow',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const followerId = (request as any).userId;
      const { userId } = request.params;
      try {
        await SocialGamificationRepository.followUser(followerId, parseInt(userId));
        reply.send({ success: true });
      } catch (error) {
        reply.code(400).send({ error: (error as any).message });
      }
    }
  );

  // Unfollow user - protected
  app.delete<{ Params: { userId: string } }>(
    '/users/:userId/follow',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const followerId = (request as any).userId;
      const { userId } = request.params;
      await SocialGamificationRepository.unfollowUser(followerId, parseInt(userId));
      reply.send({ success: true });
    }
  );

  // Get user's followers
  app.get<{ Params: { userId: string } }>(
    '/users/:userId/followers',
    async (request, reply) => {
      const { userId } = request.params;
      const followers = await SocialGamificationRepository.getFollowers(parseInt(userId));
      reply.send(followers);
    }
  );

  // Get user's following
  app.get<{ Params: { userId: string } }>(
    '/users/:userId/following',
    async (request, reply) => {
      const { userId } = request.params;
      const following = await SocialGamificationRepository.getFollowing(parseInt(userId));
      reply.send(following);
    }
  );

  // Check if following - protected
  app.get<{ Params: { userId: string } }>(
    '/users/:userId/is-following',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const followerId = (request as any).userId;
      const { userId } = request.params;
      const isFollowing = await SocialGamificationRepository.isFollowing(followerId, parseInt(userId));
      reply.send({ isFollowing });
    }
  );

  // Get followers count
  app.get<{ Params: { userId: string } }>(
    '/users/:userId/followers-count',
    async (request, reply) => {
      const { userId } = request.params;
      const count = await SocialGamificationRepository.getFollowersCount(parseInt(userId));
      reply.send({ count });
    }
  );

  // Get following count
  app.get<{ Params: { userId: string } }>(
    '/users/:userId/following-count',
    async (request, reply) => {
      const { userId } = request.params;
      const count = await SocialGamificationRepository.getFollowingCount(parseInt(userId));
      reply.send({ count });
    }
  );

  // Delete achievement - protected
  app.delete<{ Params: { achievementId: string } }>(
    '/achievements/:achievementId',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const { achievementId } = request.params;
      const deleted = await SocialGamificationRepository.deleteAchievement(parseInt(achievementId));
      if (deleted) {
        reply.send({ success: true });
      } else {
        reply.code(404).send({ error: 'Achievement not found' });
      }
    }
  );
}
