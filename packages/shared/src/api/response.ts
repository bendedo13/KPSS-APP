export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

export function successResponse<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function errorResponse(
  code: string,
  message: string,
  details?: unknown,
): ApiError {
  return { success: false, error: { code, message, details } };
}

export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): ApiSuccess<PaginatedData<T>> {
  return successResponse({
    items,
    total,
    page,
    pageSize,
    hasNextPage: page * pageSize < total,
  });
}
