type CustomSuccessResponse<
  T = {
    isOk: true;
  }
> = {
  isOk: true;
  data: T;
};

type CustomErrorResponse = {
  isOk: false;
  error?: string;
  status?: number;
};

export type CustomResponse<T> = CustomSuccessResponse<T> | CustomErrorResponse;
