export type CreateThreadDTO = {
  title: string;
  userId: string;
};

export type FindAllThreadDTO = {
  userId: string;
  pageNumber: number;
  perPage: number;
};
