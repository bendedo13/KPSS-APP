export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginationOffset {
  limit: number;
  offset: number;
}

/**
 * Converts page/pageSize to SQL LIMIT/OFFSET values.
 * Centralised to avoid the same arithmetic being repeated across every route handler.
 */
export function toPaginationOffset(params: PaginationParams): PaginationOffset {
  const page = Math.max(1, params.page);
  const pageSize = Math.min(100, Math.max(1, params.pageSize));
  return {
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };
}

export function parsePaginationQuery(
  query: Record<string, unknown>,
  defaults: PaginationParams = { page: 1, pageSize: 20 },
): PaginationParams {
  const page = Number(query['page']) || defaults.page;
  const pageSize = Number(query['pageSize']) || defaults.pageSize;
  return { page, pageSize };
}
