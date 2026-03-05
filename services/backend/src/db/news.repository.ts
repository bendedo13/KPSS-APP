import { db } from './index';

export interface News {
  id: number;
  title: string;
  content: string;
  category: 'mevzuat' | 'haberler' | 'sınav-takvimi' | 'öğrendimi-ipuçları';
  source: string | null;
  source_url: string | null;
  thumbnail_url: string | null;
  published_at: Date;
  created_at: Date;
  updated_at: Date;
  important: boolean;
  views_count: number;
}

export interface UserNewsRead {
  id: number;
  user_id: number;
  news_id: number;
  read_at: Date;
}

export interface NewsBookmark {
  id: number;
  user_id: number;
  news_id: number;
  bookmarked_at: Date;
}

export const NewsRepository = {
  async create(
    title: string,
    content: string,
    category: News['category'],
    source: string | null,
    sourceUrl: string | null,
    thumbnailUrl: string | null,
    important: boolean = false
  ): Promise<News> {
    const result = await db.query(
      `INSERT INTO news (title, content, category, source, source_url, thumbnail_url, important)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, content, category, source, sourceUrl, thumbnailUrl, important]
    );
    return result.rows[0];
  },

  async findById(id: number): Promise<News | null> {
    const result = await db.query('SELECT * FROM news WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    
    // Increment views
    await db.query('UPDATE news SET views_count = views_count + 1 WHERE id = $1', [id]);
    return result.rows[0];
  },

  async findByCategory(category: News['category'], limit: number = 20, offset: number = 0): Promise<News[]> {
    const result = await db.query(
      `SELECT * FROM news WHERE category = $1 ORDER BY published_at DESC LIMIT $2 OFFSET $3`,
      [category, limit, offset]
    );
    return result.rows;
  },

  async findLatest(limit: number = 10): Promise<News[]> {
    const result = await db.query(
      `SELECT * FROM news ORDER BY published_at DESC LIMIT $1`,
      [limit]
    );
    return result.rows;
  },

  async findImportant(limit: number = 5): Promise<News[]> {
    const result = await db.query(
      `SELECT * FROM news WHERE important = TRUE ORDER BY published_at DESC LIMIT $1`,
      [limit]
    );
    return result.rows;
  },

  async search(query: string, limit: number = 20): Promise<News[]> {
    const searchQuery = `%${query}%`;
    const result = await db.query(
      `SELECT * FROM news 
       WHERE title ILIKE $1 OR content ILIKE $1 
       ORDER BY published_at DESC LIMIT $2`,
      [searchQuery, limit]
    );
    return result.rows;
  },

  async getCategoryStats(): Promise<Record<string, number>> {
    const result = await db.query(
      `SELECT category, COUNT(*) as count FROM news GROUP BY category`
    );
    const stats: Record<string, number> = {};
    result.rows.forEach(row => {
      stats[row.category] = parseInt(row.count);
    });
    return stats;
  },

  async saveUserRead(userId: number, newsId: number): Promise<UserNewsRead> {
    const result = await db.query(
      `INSERT INTO user_news_reads (user_id, news_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, news_id) DO UPDATE SET read_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, newsId]
    );
    return result.rows[0];
  },

  async getUserReadNews(userId: number, limit: number = 50): Promise<News[]> {
    const result = await db.query(
      `SELECT n.* FROM news n
       INNER JOIN user_news_reads unr ON n.id = unr.news_id
       WHERE unr.user_id = $1
       ORDER BY unr.read_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  },

  async bookmarkNews(userId: number, newsId: number): Promise<NewsBookmark> {
    const result = await db.query(
      `INSERT INTO news_bookmarks (user_id, news_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, news_id) DO NOTHING
       RETURNING *`,
      [userId, newsId]
    );
    if (result.rows.length === 0) {
      // Already bookmarked, return existing
      const existing = await db.query(
        `SELECT * FROM news_bookmarks WHERE user_id = $1 AND news_id = $2`,
        [userId, newsId]
      );
      return existing.rows[0];
    }
    return result.rows[0];
  },

  async removeBookmark(userId: number, newsId: number): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM news_bookmarks WHERE user_id = $1 AND news_id = $2`,
      [userId, newsId]
    );
    return result.rowCount > 0;
  },

  async getUserBookmarks(userId: number, limit: number = 50): Promise<News[]> {
    const result = await db.query(
      `SELECT n.* FROM news n
       INNER JOIN news_bookmarks nb ON n.id = nb.news_id
       WHERE nb.user_id = $1
       ORDER BY nb.bookmarked_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  },

  async isBookmarked(userId: number, newsId: number): Promise<boolean> {
    const result = await db.query(
      `SELECT 1 FROM news_bookmarks WHERE user_id = $1 AND news_id = $2`,
      [userId, newsId]
    );
    return result.rows.length > 0;
  },

  async update(
    id: number,
    updates: Partial<Omit<News, 'id' | 'created_at' | 'published_at'>>
  ): Promise<News> {
    const allowedFields = ['title', 'content', 'category', 'source', 'source_url', 'thumbnail_url', 'important'];
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return await this.findById(id) as News;
    }

    values.push(id);
    const query = `UPDATE news SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
                   WHERE id = $${paramIndex}
                   RETURNING *`;
    
    const result = await db.query(query, values);
    return result.rows[0];
  },

  async delete(id: number): Promise<boolean> {
    const result = await db.query('DELETE FROM news WHERE id = $1', [id]);
    return result.rowCount > 0;
  },

  async getTrendingNews(days: number = 7, limit: number = 5): Promise<News[]> {
    const result = await db.query(
      `SELECT * FROM news 
       WHERE published_at > CURRENT_TIMESTAMP - INTERVAL '1 day' * $1
       ORDER BY views_count DESC
       LIMIT $2`,
      [days, limit]
    );
    return result.rows;
  },
};
