// How every endpoint answers: JSON, never cached, never indexed. A refusal is an HttpError thrown
// anywhere in a handler; the error middleware (app.ts) turns it into { error, message, ...extra }.

import type { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export function noStore(res: Response): void {
  res.set("Cache-Control", "no-store");
  res.set("X-Robots-Tag", "noindex");
}

export function sendJson(res: Response, status: number, body: unknown): void {
  noStore(res);
  res.status(status).json(body);
}

/** Only these methods reach the handler; anything else is a 405 naming them. */
export function allow(...methods: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (methods.includes(req.method) || (req.method === "HEAD" && methods.includes("GET"))) return next();
    res.set("Allow", methods.join(", "));
    next(new HttpError(405, "method", `Use ${methods.join(" or ")}.`));
  };
}

/**
 * Work that carries on after the reply has gone (registering a domain can take longer than Stripe
 * or a browser should wait). Errors are logged, never thrown: the response is already sent.
 * Tracked, so a shutdown can wait for it (server.ts).
 */
const inFlight = new Set<Promise<unknown>>();

export function afterReply(label: string, work: () => Promise<unknown>): void {
  const p = work()
    .catch((e) => console.error(`[after-reply] ${label}:`, e instanceof Error ? e.message : e))
    .finally(() => inFlight.delete(p));
  inFlight.add(p);
}

export async function settleInFlight(timeoutMs: number): Promise<void> {
  if (!inFlight.size) return;
  await Promise.race([Promise.allSettled([...inFlight]), new Promise((r) => setTimeout(r, timeoutMs))]);
}
