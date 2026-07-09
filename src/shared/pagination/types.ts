export type PaginationMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

export type PaginatedResult<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type PaginateArgs = {
  where?: Record<string, unknown>;
  orderBy?: unknown;
  page?: number;
  perPage?: number;
};

export type PrismaModelDelegate<T> = {
  findMany: (args: unknown) => Promise<T[]>;
  count: (args: { where?: unknown }) => Promise<number>;
};
