import type { Pool } from 'pg';

interface DuplicateCheckResult {
  isDuplicate: boolean;
  similarQuestionId?: string;
  similarity?: number;
}

/**
 * Check if a similar question already exists in the database.
 *
 * TODO: Use pg_trgm extension for real trigram similarity matching:
 *   SELECT id, similarity(text, $1) AS sim
 *   FROM questions
 *   WHERE similarity(text, $1) > 0.6
 *   ORDER BY sim DESC
 *   LIMIT 1;
 *
 * Requires: CREATE EXTENSION IF NOT EXISTS pg_trgm;
 * And a GIN/GiST index: CREATE INDEX idx_questions_text_trgm ON questions USING gin (text gin_trgm_ops);
 */
export async function checkDuplicate(
  questionText: string,
  db: Pool,
): Promise<DuplicateCheckResult> {
  try {
    // Stub: In production, use pg_trgm similarity() for fuzzy matching
    const result = await db.query(
      `SELECT id, text FROM questions WHERE text = $1 LIMIT 1`,
      [questionText],
    );

    if (result.rows.length > 0) {
      return {
        isDuplicate: true,
        similarQuestionId: result.rows[0].id,
        similarity: 1.0,
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('Duplicate check failed, treating as non-duplicate:', error);
    return { isDuplicate: false };
  }
}
