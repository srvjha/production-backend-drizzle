import { Response } from "express";

interface ApiResponseT<T = unknown> {
  res: Response;
  message: string;
  data?: T | null;
}
class ApiResponse {
  private static send<T>(
    res: Response,
    statusCode: number,
    message: string,
    data: T | null,
  ) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static ok<T>({ res, message, data = null }: ApiResponseT<T>) {
    return this.send(res, 200, message, data);
  }

  static created<T>({ res, message, data = null }: ApiResponseT<T>) {
    return this.send(res, 201, message, data);
  }

  static noContent({ res }: Pick<ApiResponseT, "res">) {
    return res.status(204).send();
  }
}

export default ApiResponse;
