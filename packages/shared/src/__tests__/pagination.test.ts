import { toPaginationOffset, parsePaginationQuery } from '../utils/pagination';

describe('toPaginationOffset', () => {
  it('converts page 1 correctly', () => {
    const result = toPaginationOffset({ page: 1, pageSize: 10 });
    expect(result).toEqual({ limit: 10, offset: 0 });
  });

  it('converts page 2 correctly', () => {
    const result = toPaginationOffset({ page: 2, pageSize: 10 });
    expect(result).toEqual({ limit: 10, offset: 10 });
  });

  it('clamps page to minimum of 1', () => {
    const result = toPaginationOffset({ page: 0, pageSize: 20 });
    expect(result.offset).toBe(0);
  });

  it('clamps pageSize to maximum of 100', () => {
    const result = toPaginationOffset({ page: 1, pageSize: 500 });
    expect(result.limit).toBe(100);
  });
});

describe('parsePaginationQuery', () => {
  it('parses numeric page and pageSize', () => {
    const result = parsePaginationQuery({ page: '2', pageSize: '15' });
    expect(result).toEqual({ page: 2, pageSize: 15 });
  });

  it('uses defaults for missing values', () => {
    const result = parsePaginationQuery({});
    expect(result).toEqual({ page: 1, pageSize: 20 });
  });
});
