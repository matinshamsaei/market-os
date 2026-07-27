import type { PaginateArgs, PaginatedResult, PaginationMeta, PrismaModelDelegate } from './types';

export const toSkipTake = (page: number, perPage: number) => ({
  skip: (page - 1) * perPage,
  take: perPage,
});

export const buildPaginationMeta = (
  total: number,
  page: number,
  perPage: number,
): PaginationMeta => ({
  page,
  perPage,
  total,
  totalPages: Math.ceil(total / perPage) || 0,
});

export const buildOrderBy = <T extends string>(
  sortBy: T | undefined,
  sortOrder: 'asc' | 'desc' | undefined,
  allowedFields: readonly T[],
  defaultField: T,
) => {
  const field = sortBy && allowedFields.includes(sortBy) ? sortBy : defaultField;
  const direction = sortOrder ?? 'desc';
  return [{ [field]: direction }, { id: 'asc' }] as const;
};

export async function paginate<T>(
  model: PrismaModelDelegate<T>,
  { where, orderBy, page = 1, perPage = 10 }: PaginateArgs,
): Promise<PaginatedResult<T>> {
  const { skip, take } = toSkipTake(page, perPage);
  const [data, total] = await Promise.all([
    model.findMany({ where, orderBy, skip, take }),
    model.count({ where }),
  ]);
  return {
    data,
    meta: buildPaginationMeta(total, page, perPage),
  };
}
