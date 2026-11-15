import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";

export function validateRequest(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array().map((e: any) => ({
        field: e.path || e.param,
        message: e.msg,
      })),
    });
  }
  return next();
}
