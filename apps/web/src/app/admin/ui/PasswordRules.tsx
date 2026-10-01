"use client";

import { Checkmark, CircleDash } from "@carbon/icons-react";

// The same rules the API applies (admin.password.ts), ticked as they are met.
export function passwordChecks(password: string, email: string) {
  const local = (email.split("@")[0] ?? "").toLowerCase();
  return [
    { ok: password.length >= 12, label: "At least 12 characters" },
    { ok: new Set(password).size >= 5, label: "At least 5 different characters" },
    { ok: password.length > 0 && !(local.length >= 4 && password.toLowerCase().includes(local)), label: "Not your email address" },
  ];
}

export function PasswordRules({ password, email }: { password: string; email: string }) {
  return (
    <ul className="adm-rules" aria-label="Password rules">
      {passwordChecks(password, email).map((c) => (
        <li key={c.label} data-ok={c.ok}>
          {c.ok ? <Checkmark size={16} aria-hidden="true" /> : <CircleDash size={16} aria-hidden="true" />}
          <span>{c.label}<span className="sr-only">{c.ok ? ", done" : ", not yet"}</span></span>
        </li>
      ))}
    </ul>
  );
}
