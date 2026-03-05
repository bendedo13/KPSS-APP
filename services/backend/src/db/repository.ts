import type { Pool, QueryResultRow } from 'pg';
import { toPaginationOffset } from '@kpss/shared';
import type { PaginationParams } from '@kpss/shared';

const ALLOWED_TABLES = new Set([
  'questions',
  'tests',
  'users',
  'flashcards',
  'wrong_book',
  'ai_jobs',
  'user_progress',
  'test_answers',
]);

/**
 * Generic base repository that provides reusable CRUD helpers.
 *
 * Without this abstraction, the same findById / findAll / create / update / delete
 * SQL boilerplate would be duplicated for every entity (questions, tests, users, …).
 */
export abstract class BaseRepository<T extends QueryResultRow> {
  constructor(
    protected readonly db: Pool,
    protected readonly tableName: string,
  ) {
    if (!ALLOWED_TABLES.has(tableName)) {
      throw new Error(
        `Repository: "${tableName}" is not an allowed table name.`,
      );
    }
  }

  async findById(id: string): Promise<T | null> {
    const result = await this.db.query<T>(
      `SELECT * FROM ${this.tableName} WHERE id = $1 LIMIT 1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findAll(pagination: PaginationParams): Promise<{ rows: T[]; total: number }> {
    const { limit, offset } = toPaginationOffset(pagination);
    const [rows, count] = await Promise.all([
      this.db.query<T>(
        `SELECT * FROM ${this.tableName} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset],
      ),
      this.db.query<{ count: string }>(
        `SELECT COUNT(*)::text FROM ${this.tableName}`,
      ),
    ]);
    return {
      rows: rows.rows,
      total: parseInt(count.rows[0]?.count ?? '0', 10),
    };
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM ${this.tableName} WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
