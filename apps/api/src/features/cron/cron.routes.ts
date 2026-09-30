// GET /api/cron/?token=<CRON_TOKEN> — runs the sweep now and reports what it did. The sweep also
// runs by itself every 5 minutes (server.ts); this is for a manual nudge or an outside monitor.
// Without the right token it does not exist (404).

import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { tryConfig } from "../../core/config";
import { allow, HttpError, sendJson } from "../../core/http";
import { sweep } from "./sweep.service";

export const cronRouter = Router();

cronRouter.all("/api/cron", allow("GET", "POST"), async (req, res) => {
  const expected = tryConfig()?.cronToken ?? "";
  const given = typeof req.query.token === "string" ? req.query.token : "";
  const ok = expected !== "" && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) throw new HttpError(404, "not_found", "Not found.");
  sendJson(res, 200, await sweep(25));
});
