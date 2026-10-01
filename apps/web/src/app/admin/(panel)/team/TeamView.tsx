"use client";

import { useState, type FormEvent } from "react";
import { Copy, UserFollow } from "@carbon/icons-react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Select } from "@/components/Select";
import { TextField } from "@/components/TextField";
import { api, ApiError, useApi } from "../../lib/api";
import { ago, stamp, when } from "../../lib/format";
import { useSession, type AdminUser } from "../../lib/session";
import type { AuditEntry, Team } from "../../lib/types";
import { AUDIT_ACTION } from "../../lib/words";
import { Empty, ErrorNotice, PageHead, Panel, SkelRows } from "../../ui/bits";

interface Made { name: string; link: string; expires: string }

function LinkBox({ made, onDone }: { made: Made; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="adm-notice" data-tone="success" role="status" style={{ flexDirection: "column", alignItems: "stretch", gap: "var(--space-sm)" }}>
      <p><strong>Setup link for {made.name}.</strong> Send it to them yourself, by email or message. It works once, until {when(made.expires)}, and they choose their own password with it.</p>
      <div className="adm-link-box">
        <label className="sr-only" htmlFor="adm-link">Setup link</label>
        <input id="adm-link" className="adm-input" readOnly value={made.link} onFocus={(e) => e.currentTarget.select()} />
        <Button variant="primary" size="sm" icon={<Copy size={16} />} onClick={async () => {
          try { await navigator.clipboard.writeText(made.link); setCopied(true); } catch { setCopied(false); }
        }}>{copied ? "Copied" : "Copy"}</Button>
      </div>
      <div><Button variant="ghost" size="xs" onClick={onDone}>Done</Button></div>
    </div>
  );
}

function AddPerson({ onAdded }: { onAdded: (m: Made) => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setBusy(true); setErrors({}); setProblem(null);
    try {
      const r = await api<{ user: AdminUser; link: string; expires: string }>("/team", { method: "POST", body: data });
      form.reset();
      onAdded({ name: r.user.name, link: r.link, expires: r.expires });
    } catch (err) {
      const e2 = err as ApiError;
      if (e2.field) setErrors({ [e2.field]: e2.message }); else setProblem(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="adm-panel-body adm-form" onSubmit={submit} noValidate style={{ maxWidth: "40rem" }}>
      <TextField id="t-name" name="name" label="Name" autoComplete="off" required error={errors.name} />
      <TextField id="t-email" name="email" type="email" label="Email" autoComplete="off" required error={errors.email} />
      <Select id="t-role" name="role" label="Role" defaultValue="staff" helper="Staff see orders, domains and customers. Owners can also add people and turn off access."
        options={[{ value: "staff", label: "Staff" }, { value: "owner", label: "Owner" }]} />
      {problem ? <p className="adm-notice" data-tone="danger" role="alert">{problem}</p> : null}
      <div><Button type="submit" variant="primary" icon={<UserFollow size={16} />} disabled={busy}>{busy ? "Adding…" : "Add and make a setup link"}</Button></div>
    </form>
  );
}

/** Who did it: the person, or the server command, or for a failed sign-in the email typed. */
function actor(a: AuditEntry): string {
  if (a.who) return a.who;
  if (a.detail?.via === "cli") return "Server command";
  if (a.action.startsWith("sign_in") && typeof a.detail?.email === "string") return a.detail.email;
  return "Someone";
}

function statusBadge(u: AdminUser) {
  if (u.status === "disabled") return <Badge tone="neutral" textCase="sentence" icon={false}>Turned off</Badge>;
  if (u.status === "invited") return <Badge tone="warning" textCase="sentence" icon={false}>Not set up yet</Badge>;
  return <Badge tone="success" textCase="sentence" icon={false}>Active</Badge>;
}

export function TeamView() {
  const { me } = useSession();
  const { data, error, loading, reload } = useApi<Team>("/team");
  const [made, setMade] = useState<Made | null>(null);
  const [actionError, setActionError] = useState<ApiError | null>(null);
  const [working, setWorking] = useState<number | null>(null);
  const owner = me?.user.role === "owner";

  async function act(u: AdminUser, path: string, body?: unknown, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setWorking(u.id); setActionError(null);
    try {
      const r = await api<{ link?: string; expires?: string }>(`/team/${u.id}/${path}`, { method: "POST", body: body ?? {} });
      if (r.link && r.expires) setMade({ name: u.name, link: r.link, expires: r.expires });
      reload();
    } catch (e) {
      setActionError(e as ApiError);
    } finally {
      setWorking(null);
    }
  }

  return (
    <>
      <PageHead title="Team" intro={owner
        ? "Who can sign in to this panel. Everyone has their own email and password; nobody shares a sign-in."
        : "Who can sign in to this panel. Ask an owner to add someone or to send a new setup link."} />

      {made ? <LinkBox made={made} onDone={() => setMade(null)} /> : null}
      <ErrorNotice error={error ?? actionError} onRetry={error ? reload : undefined} />

      <div className={owner ? "adm-split" : undefined}>
        <div className="adm-stack">
          <Panel title="People" id="people">
            {loading && !data ? <SkelRows rows={3} label="Loading the team" /> : null}
            {data && !data.users.length ? <Empty title="Nobody yet" /> : null}
            {data?.users.length ? (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <caption className="sr-only">People who can sign in</caption>
                  <thead>
                    <tr>
                      <th scope="col">Person</th>
                      <th scope="col">Role</th>
                      <th scope="col">Status</th>
                      <th scope="col">Last sign-in</th>
                      {owner ? <th scope="col"><span className="sr-only">Actions</span></th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((u) => {
                      const self = u.id === me?.user.id;
                      return (
                        <tr key={u.id}>
                          <td>
                            <span className="strong">{u.name}</span>{self ? <span className="quiet"> (you)</span> : null}
                            <span className="adm-cell-sub">{u.email}</span>
                          </td>
                          <td>{u.role === "owner" ? "Owner" : "Staff"}</td>
                          <td>
                            {statusBadge(u)}
                            {u.status === "invited" && u.setup_expires_at ? <span className="adm-cell-sub">Link works until {when(u.setup_expires_at)}</span> : null}
                          </td>
                          <td className="nowrap" title={when(u.last_sign_in_at)}>{u.last_sign_in_at ? ago(u.last_sign_in_at) : <span className="muted">Never</span>}</td>
                          {owner ? (
                            <td>
                              <div style={{ display: "flex", gap: "var(--space-2xs)", flexWrap: "wrap", justifyContent: "flex-end" }}>
                                {u.status !== "disabled" && !self ? (
                                  <Button variant="secondary" size="xs" disabled={working === u.id} onClick={() => act(u, "link")}>
                                    {u.status === "invited" ? "New setup link" : "Password reset link"}
                                  </Button>
                                ) : null}
                                {!self ? (
                                  <Button variant="secondary" size="xs" disabled={working === u.id} onClick={() => act(u, "role", { role: u.role === "owner" ? "staff" : "owner" })}>
                                    {u.role === "owner" ? "Make staff" : "Make owner"}
                                  </Button>
                                ) : null}
                                {!self ? (
                                  u.status === "disabled"
                                    ? <Button variant="secondary" size="xs" disabled={working === u.id} onClick={() => act(u, "enable")}>Turn on</Button>
                                    : <Button variant="ghost" size="xs" disabled={working === u.id} onClick={() => act(u, "disable", undefined, `Turn off ${u.name}'s access? They are signed out at once and cannot sign in until an owner turns them back on.`)}>Turn off</Button>
                                ) : null}
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </Panel>

          {owner && data?.activity ? (
            <Panel title="Activity" id="activity">
              {!data.activity.length ? <Empty title="Nothing yet">Sign-ins, team changes and downloads are listed here.</Empty> : (
                <ol className="adm-history" aria-label="Activity, newest first">
                  {data.activity.map((a, i) => (
                    <li key={i}>
                      <time dateTime={a.at} title={when(a.at)}>{stamp(a.at)}</time>
                      <span>
                        <span className="strong">{actor(a)}</span>
                        {" "}{(AUDIT_ACTION[a.action] ?? a.action).toLowerCase()}
                        {a.action === "user_added" && typeof a.detail?.email === "string" ? <>: {a.detail.email}</> : null}
                        {typeof a.detail?.order === "string" ? <> on <span className="mono">{a.detail.order}</span></> : null}
                        {a.ip ? <span className="quiet"> from <span className="mono">{a.ip}</span></span> : null}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          ) : null}
        </div>

        {owner ? (
          <Panel title="Add a person" id="add">
            <AddPerson onAdded={(m) => { setMade(m); reload(); window.scrollTo({ top: 0 }); }} />
          </Panel>
        ) : null}
      </div>
    </>
  );
}
