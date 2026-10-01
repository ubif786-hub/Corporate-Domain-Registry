"use client";

import { useEffect, useState, type FormEvent } from "react";
import { WarningAlt } from "@carbon/icons-react";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { api, ApiError } from "../lib/api";
import { AuthFrame } from "../ui/AuthFrame";
import { Skel } from "../ui/bits";
import { passwordChecks, PasswordRules } from "../ui/PasswordRules";

interface Who { name: string; email: string; first_time: boolean }

export function SetupView() {
  const [token, setToken] = useState<string | null>(null);
  const [who, setWho] = useState<Who | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token") ?? "";
    // The token is in the address, which is only readable after mount here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(t);
    // Keep the token out of the browser history and out of any address shared from here on.
    window.history.replaceState(null, "", "/admin/setup/");
    if (!t) { setLinkError("This page needs the setup link an owner sent you. Open the whole link."); return; }
    api<Who>(`/setup?token=${encodeURIComponent(t)}`, { redirectOn401: false })
      .then(setWho)
      .catch((e: ApiError) => setLinkError(e.message));
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!who || !token) return;
    const d = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setErrors({});
    if (!passwordChecks(d.password, who.email).every((c) => c.ok)) { setErrors({ password: "The password does not meet the rules below." }); return; }
    if (d.password !== d.repeat) { setErrors({ repeat: "The two passwords are different." }); return; }
    setBusy(true);
    try {
      await api("/setup", { method: "POST", body: { token, password: d.password }, redirectOn401: false });
      window.location.replace("/admin/");
    } catch (err) {
      const e2 = err as ApiError;
      if (e2.code === "expired") setLinkError(e2.message);
      else setErrors({ [e2.field ?? "password"]: e2.message });
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      title={who && !who.first_time ? "Choose a new password" : "Set up your sign-in"}
      intro={who ? `For ${who.name}, ${who.email}. You sign in with this email and the password you choose here.` : undefined}
      foot={<>Already set up? <a href="/admin/sign-in/">Sign in</a></>}
    >
      {linkError ? (
        <div className="adm-notice" data-tone="danger" role="alert">
          <WarningAlt size={16} aria-hidden="true" /><p>{linkError}</p>
        </div>
      ) : null}
      {!who && !linkError ? <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }} aria-busy="true"><Skel width="70%" /><Skel size="lg" /><Skel size="lg" /></div> : null}
      {who ? (
        <form className="adm-form" onSubmit={submit} noValidate>
          <input type="text" name="username" autoComplete="username" value={who.email} readOnly hidden />
          <TextField id="su-password" name="password" type="password" label="New password" autoComplete="new-password" required reveal autoFocus
            error={errors.password} onChange={(e) => setPassword(e.currentTarget.value)} />
          <PasswordRules password={password} email={who.email} />
          <TextField id="su-repeat" name="repeat" type="password" label="New password again" autoComplete="new-password" required reveal error={errors.repeat} />
          <div><Button type="submit" variant="primary" size="lg" disabled={busy}>{busy ? "Saving…" : "Save and sign in"}</Button></div>
        </form>
      ) : null}
    </AuthFrame>
  );
}
