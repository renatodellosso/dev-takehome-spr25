export enum HTTP_STATUS_CODE {
  BAD_REQUEST = 400,
  OK = 200,
  CREATED = 201,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  INTERNAL_SERVER_ERROR = 500,
}

export enum ResponseType {
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  INVALID_INPUT = "INVALID_INPUT",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CREATED = "CREATED",
  SUCCESS = "SUCCESS",
}

export const RESPONSES: Record<
  ResponseType,
  { message: string; code: number }
> = {
  [ResponseType.UNKNOWN_ERROR]: {
    message: "An unknown error occurred.",
    code: HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
  },
  [ResponseType.INVALID_INPUT]: {
    message: "Invalid input was received.",
    code: HTTP_STATUS_CODE.BAD_REQUEST,
  },
  [ResponseType.UNAUTHORIZED]: {
    message: "Unauthorized access.",
    code: HTTP_STATUS_CODE.UNAUTHORIZED,
  },
  [ResponseType.FORBIDDEN]: {
    message: "Forbidden access.",
    code: HTTP_STATUS_CODE.FORBIDDEN,
  },
  [ResponseType.NOT_FOUND]: {
    message: "Resource not found.",
    code: HTTP_STATUS_CODE.NOT_FOUND,
  },
  [ResponseType.CREATED]: {
    message: "Resource created successfully.",
    code: HTTP_STATUS_CODE.CREATED,
  },
  [ResponseType.SUCCESS]: {
    message: "Request processed successfully.",
    code: HTTP_STATUS_CODE.OK,
  },
};
