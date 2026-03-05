import { successResponse, errorResponse, paginatedResponse } from '../api/response';
import { ErrorCode } from '../api/errors';

describe('successResponse', () => {
  it('returns success true with data', () => {
    const result = successResponse({ id: '1', name: 'Test' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: '1', name: 'Test' });
  });
});

describe('errorResponse', () => {
  it('returns success false with error details', () => {
    const result = errorResponse(ErrorCode.NOT_FOUND, 'Resource not found');
    expect(result.success).toBe(false);
    expect(result.error.code).toBe(ErrorCode.NOT_FOUND);
    expect(result.error.message).toBe('Resource not found');
  });

  it('includes optional details', () => {
    const result = errorResponse(ErrorCode.VALIDATION_ERROR, 'Bad input', { field: 'email' });
    expect(result.error.details).toEqual({ field: 'email' });
  });
});

describe('paginatedResponse', () => {
  it('computes hasNextPage correctly', () => {
    const result = paginatedResponse(['a', 'b', 'c'], 30, 1, 10);
    expect(result.success).toBe(true);
    expect(result.data.hasNextPage).toBe(true);
    expect(result.data.total).toBe(30);
  });

  it('returns hasNextPage false on last page', () => {
    const result = paginatedResponse(['a'], 21, 3, 10);
    expect(result.data.hasNextPage).toBe(false);
  });
});
