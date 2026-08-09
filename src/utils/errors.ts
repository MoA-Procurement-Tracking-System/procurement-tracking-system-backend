export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  code: string;
  fields: FieldError[] | undefined;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: FieldError[],
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  static badRequest(message: string, fields?: FieldError[]) {
    return new ApiError(400, 'BAD_REQUEST', message, fields);
  }
  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'You do not have permission to do this') {
    return new ApiError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string, fields?: FieldError[]) {
    return new ApiError(409, 'CONFLICT', message, fields);
  }
}
