import { Request, Response, NextFunction } from "express";

export const notFound = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new Error(`Not Found - ${req.originalUrl}`) as any;
  res.status(404);
  next(error);
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  if (err.name === "MongoServerError") {
    const key = Object.keys(err.keyValue)[0]?.substring(
      Object.keys(err.keyValue)[0]?.indexOf(".") + 1
    );
    message = `Error: ${key} already exists, please try again`;
  }

  if (err.name === "CastError" || err.kind === "ObjectId") {
    statusCode = 404;
    message = "Resource not found";
  }

  res.status(statusCode).json({
    error: message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};
