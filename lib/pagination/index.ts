export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export type PaginationInput = {
  page?: number;
  pageSize?: number;
};

export type PaginationParams = {
  page: number;
  pageSize: number;
  offset: number;
  limit: number;
};

/**
 * Bound list queries — never allow unbounded admin/judge list fetches.
 */
export function parsePagination(input: PaginationInput = {}): PaginationParams {
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const rawSize = Math.floor(input.pageSize ?? DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, rawSize));
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset, limit: pageSize };
}
