import type { Problem } from "./types";

export class HttpError extends Error {
  readonly status: number;
  readonly problem?: Problem;

  constructor(status: number, message: string, problem?: Problem) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.problem = problem;
  }
}
