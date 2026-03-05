import { FastifyInstance } from 'fastify';
import { NewsRepository } from '../db/news.repository';
import { requireAuth } from '../middleware/auth';

export async function registerNewsRoutes(app: FastifyInstance) {
  // Get latest news - public
  app.get('/news/latest', async (request, reply) => {
    const limit = parseInt(request.query?.limit as string) || 10;
    const news = await NewsRepository.findLatest(limit);
    reply.send(news);
  });

  // Get important news - public
  app.get('/news/important', async (request, reply) => {
    const limit = parseInt(request.query?.limit as string) || 5;
    const news = await NewsRepository.findImportant(limit);
    reply.send(news);
  });

  // Get news by category
  app.get<{ Params: { category: string } }>(
    '/news/category/:category',
    async (request, reply) => {
      const { category } = request.params;
      const limit = parseInt(request.query?.limit as string) || 20;
      const offset = parseInt(request.query?.offset as string) || 0;
      const news = await NewsRepository.findByCategory(
        category as any,
        limit,
        offset
      );
      reply.send(news);
    }
  );

  // Search news - public
  app.get<{ Querystring: { q: string } }>(
    '/news/search',
    async (request, reply) => {
      const { q } = request.query;
      if (!q || q.length < 2) {
        reply.code(400).send({ error: 'Query must be at least 2 characters' });
        return;
      }
      const news = await NewsRepository.search(q, 20);
      reply.send(news);
    }
  );

  // Get single news - public
  app.get<{ Params: { id: string } }>(
    '/news/:id',
    async (request, reply) => {
      const { id } = request.params;
      const news = await NewsRepository.findById(parseInt(id));
      if (!news) {
        reply.code(404).send({ error: 'News not found' });
        return;
      }
      reply.send(news);
    }
  );

  // Get category stats - public
  app.get('/news/stats/categories', async (request, reply) => {
    const stats = await NewsRepository.getCategoryStats();
    reply.send(stats);
  });

  // Get trending news - public
  app.get<{ Querystring: { days: string; limit: string } }>(
    '/news/trending',
    async (request, reply) => {
      const days = parseInt(request.query?.days as string) || 7;
      const limit = parseInt(request.query?.limit as string) || 5;
      const news = await NewsRepository.getTrendingNews(days, limit);
      reply.send(news);
    }
  );

  // Mark news as read - protected
  app.post<{ Params: { id: string } }>(
    '/news/:id/read',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params;
      const userId = (request as any).userId;
      const read = await NewsRepository.saveUserRead(userId, parseInt(id));
      reply.send(read);
    }
  );

  // Get user's read history - protected
  app.get(
    '/news/user/history',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const userId = (request as any).userId;
      const limit = parseInt(request.query?.limit as string) || 50;
      const news = await NewsRepository.getUserReadNews(userId, limit);
      reply.send(news);
    }
  );

  // Bookmark news - protected
  app.post<{ Params: { id: string } }>(
    '/news/:id/bookmark',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params;
      const userId = (request as any).userId;
      const bookmark = await NewsRepository.bookmarkNews(userId, parseInt(id));
      reply.code(201).send(bookmark);
    }
  );

  // Remove bookmark - protected
  app.delete<{ Params: { id: string } }>(
    '/news/:id/bookmark',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params;
      const userId = (request as any).userId;
      const removed = await NewsRepository.removeBookmark(userId, parseInt(id));
      if (removed) {
        reply.send({ success: true });
      } else {
        reply.code(404).send({ error: 'Bookmark not found' });
      }
    }
  );

  // Get user's bookmarks - protected
  app.get(
    '/news/user/bookmarks',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const userId = (request as any).userId;
      const limit = parseInt(request.query?.limit as string) || 50;
      const bookmarks = await NewsRepository.getUserBookmarks(userId, limit);
      reply.send(bookmarks);
    }
  );

  // Check if bookmarked - protected
  app.get<{ Params: { id: string } }>(
    '/news/:id/is-bookmarked',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params;
      const userId = (request as any).userId;
      const isBookmarked = await NewsRepository.isBookmarked(userId, parseInt(id));
      reply.send({ isBookmarked });
    }
  );

  // Admin: Create news
  app.post<{ Body: any }>(
    '/admin/news',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const { title, content, category, source, sourceUrl, thumbnailUrl, important } = request.body;
      const news = await NewsRepository.create(
        title,
        content,
        category,
        source,
        sourceUrl,
        thumbnailUrl,
        important
      );
      reply.code(201).send(news);
    }
  );

  // Admin: Update news
  app.put<{ Params: { id: string }; Body: any }>(
    '/admin/news/:id',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params;
      const updated = await NewsRepository.update(parseInt(id), request.body);
      reply.send(updated);
    }
  );

  // Admin: Delete news
  app.delete<{ Params: { id: string } }>(
    '/admin/news/:id',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params;
      const deleted = await NewsRepository.delete(parseInt(id));
      if (deleted) {
        reply.send({ success: true });
      } else {
        reply.code(404).send({ error: 'News not found' });
      }
    }
  );
}
