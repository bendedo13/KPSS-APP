import { successResponse, errorResponse, ErrorCode } from '@kpss/shared';

describe('API Response Helpers', () => {
  describe('successResponse', () => {
    it('should create success response with data', () => {
      const data = { id: '123', name: 'Test' };
      const response = successResponse(data);
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
    });
  });

  describe('errorResponse', () => {
    it('should create error response with code and message', () => {
      const response = errorResponse(ErrorCode.NOT_FOUND, 'Resource not found');
      
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(ErrorCode.NOT_FOUND);
      expect(response.error?.message).toBe('Resource not found');
    });

    it('should include details when provided', () => {
      const details = { field: 'email', issue: 'invalid format' };
      const response = errorResponse(ErrorCode.VALIDATION_ERROR, 'Validation failed', details);
      
      expect(response.error?.details).toEqual(details);
    });
  });
});

describe('Error Codes', () => {
  it('should have all required error codes', () => {
    expect(ErrorCode.VALIDATION_ERROR).toBeDefined();
    expect(ErrorCode.UNAUTHORIZED).toBeDefined();
    expect(ErrorCode.FORBIDDEN).toBeDefined();
    expect(ErrorCode.NOT_FOUND).toBeDefined();
    expect(ErrorCode.CONFLICT).toBeDefined();
    expect(ErrorCode.INTERNAL_ERROR).toBeDefined();
  });
});
