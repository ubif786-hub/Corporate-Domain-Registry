"use client";

import { useState, type FormEvent } from "react";
import { CheckmarkOutline } from "@carbon/icons-react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { api, ApiError, useApi } from "../../lib/api";
import { ago, when } from "../../lib/format";
import { useSession, type AdminUser } from "../../lib/session";
import type { SessionInfo } from "../../lib/types";
import { ErrorNotice, PageHead, Panel, SkelRows } from "../../ui/bits";
import { passwordChecks, PasswordRules } from "../../ui/PasswordRules";

function Done({ children }: { children: string }) {
  return (
    <div className="adm-notice" data-tone="success" role="status">
      <CheckmarkOutline size={16} aria-hidden="true" /><p>{children}</p>
    </div>
  );
}

function NameForm({ user }: { user: AdminUser }) {
  const { setUser } = useSession();
  const [error, setError] = useState<string | undefined>();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") ?? "");
    setBusy(true); setError(undefined); setDone(false);
    try {
      const r = await api<{ user: AdminUser }>("/account", { method: "PATCH", body: { name } });
      setUser(r.user);
      setDone(true);
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="adm-panel-body adm-form" onSubmit={submit} noValidate>
      <TextField id="a-name" name="name" label="Name" defaultValue={user.name} autoComplete="name" required error={error}
        helper="Shown in the top bar and in the team's activity." />
      <TextField id="a-email" name="email" label="Email" value={user.email} readOnly helper="You sign in with this. An owner can add a new email for you." />
      {done ? <Done>Saved.</Done> : null}
      <div><Button type="submit" variant="secondary" disabled={busy}>{busy ? "Saving…" : "Save name"}</Button></div>
    </form>
  );
}

function PasswordForm({ user, onChanged }: { user: AdminUser; onChanged: () => void }) {
  const { refresh } = useSession();
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setErrors({}); setDone(false);
    if (!passwordChecks(d.password, user.email).every((c) => c.ok)) { setErrors({ password: "The new password does not meet the rules below." }); return; }
    if (d.password !== d.repeat) { setErrors({ repeat: "The two new passwords are different." }); return; }
    setBusy(true);
    try {
      await api("/account/password", { method: "POST", body: { current: d.current, password: d.password } });
      form.reset(); setPassword(""); setDone(true); onChanged(); refresh();
    } catch (err) {
      const e2 = err as ApiError;
      setErrors({ [e2.field ?? "current"]: e2.message });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="adm-panel-body adm-form" onSubmit={submit} noValidate>
      <input type="text" name="username" autoComplete="username" value={user.email} readOnly hidden />
      <TextField id="p-current" name="current" type="password" label="Current password" autoComplete="current-password" required reveal error={errors.current} />
      <TextField id="p-new" name="password" type="password" label="New password" autoComplete="new-password" required reveal error={errors.password}
        onChange={(e) => setPassword(e.currentTarget.value)} />
      <PasswordRules password={password} email={user.email} />
      <TextField id="p-repeat" name="repeat" type="password" label="New password again" autoComplete="new-password" required reveal error={errors.repeat} />
      {done ? <Done>Password changed. Every other browser signed in as you was signed out.</Done> : null}
      <div><Button type="submit" variant="primary" disabled={busy}>{busy ? "Changing…" : "Change password"}</Button></div>
    </form>
  );
}

function Sessions({ version }: { version: number }) {
  const { data, error, loading, reload } = useApi<{ sessions: SessionInfo[] }>(`/account/sessions${version ? `?v=${version}` : ""}`);
  const [ended, setEnded] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const others = data?.sessions.filter((s) => !s.current).length ?? 0;
  async function endOthers() {
    setBusy(true);
    try {
      const r = await api<{ ended: number }>("/account/sessions/end-others", { method: "POST" });
      setEnded(r.ended); reload();
    } finally { setBusy(false); }
  }
  return (
    <>
      <ErrorNotice error={error} onRetry={reload} />
      {loading && !data ? <SkelRows rows={2} label="Loading browsers" /> : null}
      {data ? (
        <ul className="adm-list">
          {data.sessions.map((s, i) => (
            <li key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-sm)", alignItems: "flex-start" }}>
                <div>
                  <div className="strong">{s.device}</div>
                  <div className="quiet">
                    {s.ip ? <span className="mono">{s.ip}</span> : "Unknown address"}, active {ago(s.last_seen_at)}
                    <span title={when(s.created_at)}>, signed in {ago(s.created_at)}</span>
                  </div>
                </div>
                {s.current ? <Badge tone="info" textCase="sentence" icon={false}>This browser</Badge> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="adm-panel-body tight" style={{ borderTop: "var(--rule-weight) solid var(--border-positive-secondary)", display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        {ended !== null ? <Done>{ended ? `Signed out ${ended} other ${ended === 1 ? "browser" : "browsers"}.` : "No other browsers were signed in."}</Done> : null}
        <p className="quiet" style={{ margin: 0 }}>Sessions end after 12 hours without use, and always after 14 days.</p>
        <div><Button variant="secondary" size="sm" disabled={busy || others === 0} onClick={endOthers}>Sign out everywhere else</Button></div>
      </div>
    </>
  );
}

export function AccountView() {
  const { me } = useSession();
  const [version, setVersion] = useState(0);
  return (
    <>
      <PageHead title="Your account" intro={me ? `Signed in as ${me.user.email}, ${me.user.role === "owner" ? "an owner" : "staff"}.` : undefined} />
      {me ? (
        <div className="adm-split">
          <div className="adm-stack">
            <Panel title="Profile" id="profile"><NameForm user={me.user} /></Panel>
            <Panel title="Password" id="password"><PasswordForm user={me.user} onChanged={() => setVersion((v) => v + 1)} /></Panel>
          </div>
          <Panel title="Signed-in browsers" id="sessions"><Sessions version={version} /></Panel>
        </div>
      ) : <Panel><SkelRows rows={4} /></Panel>}
    </>
  );
}
