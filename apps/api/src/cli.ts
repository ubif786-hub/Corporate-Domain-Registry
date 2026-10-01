// Admin accounts from the command line, for the first owner and for a locked-out team.
// It prints a setup link; the person opens it and chooses their own password, so no password is
// ever typed into a terminal or kept in a shell history.
//
// On the droplet, as root (it runs as the API's user, with the API's settings):
//   runuser -u cdr -- env CDR_CONFIG=/srv/cdr/cdr.env node /srv/cdr/api/cli.js add-user --email you@example.com --name "Your Name" --role owner
//   runuser -u cdr -- env CDR_CONFIG=/srv/cdr/cdr.env node /srv/cdr/api/cli.js link --email you@example.com
//   runuser -u cdr -- env CDR_CONFIG=/srv/cdr/cdr.env node /srv/cdr/api/cli.js list
//
// --password sets a password directly instead of printing a link (add-user, set-password). It is
// for a temporary password the person changes on first use: one that breaks the rules is allowed
// here and flagged (weak_password) until it is changed. It stays in the shell history,
// so prefer the setup link.
//
// Locally: CDR_CONFIG=cdr.env npx tsx src/cli.ts <command> ... (from apps/api)

import { parseArgs } from "node:util";
import { closeDatabase } from "./core/db";
import { addUser, audit, findUser, findUserByEmail, isEmail, listUsers, newSetupLink, normaliseEmail, publicUser, setDisabled, setPasswordDirectly } from "./features/admin/admin.accounts";
import { ADMIN_ROLES, type AdminRole } from "./features/admin/admin.schema";

const USAGE = `Usage:
  cli.js add-user --email <email> --name "<name>" [--role owner|staff] [--password <temporary>]
                                                                        add a person: a setup link, or this password
  cli.js link --email <email>                                           a new setup link (forgotten password)
  cli.js set-password --email <email> --password <temporary>            set a password directly
  cli.js enable --email <email>                                         turn a disabled person back on
  cli.js list                                                           everyone, with their status`;

async function passwordSet(userId: number, password: string): Promise<number> {
  if (password.length < 8) { console.error("Use at least 8 characters, even for a temporary password."); return 2; }
  const user = (await findUser(userId))!;
  const weak = await setPasswordDirectly(user, password);
  await audit("password_set", null, null, { user: user.id, via: "cli", weak });
  console.log(`Password set for ${user.email}. They can sign in at /admin/sign-in/ now.`);
  if (weak) console.log("WARNING: this password breaks the rules (12+ characters, hard to guess). Change it under Your account before payments go live.");
  return 0;
}

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  const { values } = parseArgs({
    args: rest,
    options: { email: { type: "string" }, name: { type: "string" }, role: { type: "string" }, password: { type: "string" } },
    allowPositionals: false,
  });
  const email = normaliseEmail(values.email);

  switch (command) {
    case "add-user": {
      const name = (values.name ?? "").replace(/\s+/g, " ").trim();
      const role = (values.role ?? "staff") as AdminRole;
      if (!isEmail(email) || name.length < 2 || !(ADMIN_ROLES as readonly string[]).includes(role)) {
        console.error(USAGE);
        return 2;
      }
      try {
        const { user, link, expires } = await addUser({ email, name, role, createdBy: null });
        await audit("user_added", null, null, { user: user.id, email, role, via: "cli" });
        console.log(`Added ${user.name} <${user.email}> as ${user.role}.`);
        if (values.password !== undefined) return await passwordSet(user.id, values.password);
        console.log(`Setup link (works once, until ${expires.toISOString().slice(0, 16).replace("T", " ")} UTC):`);
        console.log(link);
        return 0;
      } catch (e) {
        if ((e as Error).message === "exists") {
          console.error(`${email} is already on the team. Use: cli.js link --email ${email}`);
          return 1;
        }
        throw e;
      }
    }
    case "link": {
      const user = isEmail(email) ? await findUserByEmail(email) : null;
      if (!user) { console.error(`Nobody with the email ${email || "(none given)"}.`); return 1; }
      if (user.disabledAt) { console.error(`${user.email} is turned off. Use: cli.js enable --email ${user.email}`); return 1; }
      const made = await newSetupLink(user.id);
      await audit("setup_link", null, null, { user: user.id, via: "cli" });
      console.log(`Setup link for ${user.name} (works once, until ${made!.expires.toISOString().slice(0, 16).replace("T", " ")} UTC):`);
      console.log(made!.link);
      return 0;
    }
    case "set-password": {
      const user = isEmail(email) ? await findUserByEmail(email) : null;
      if (!user) { console.error(`Nobody with the email ${email || "(none given)"}.`); return 1; }
      if (values.password === undefined) { console.error(USAGE); return 2; }
      return await passwordSet(user.id, values.password);
    }
    case "enable": {
      const user = isEmail(email) ? await findUserByEmail(email) : null;
      if (!user) { console.error(`Nobody with the email ${email || "(none given)"}.`); return 1; }
      await setDisabled(user.id, false);
      await audit("user_enabled", null, null, { user: user.id, via: "cli" });
      console.log(`${user.email} can sign in again.`);
      return 0;
    }
    case "list": {
      const users = (await listUsers()).map(publicUser);
      if (!users.length) console.log("Nobody yet. Add the first owner with add-user --role owner.");
      for (const u of users) console.log(`${u.email}\t${u.name}\t${u.role}\t${u.status}\tlast sign-in ${u.last_sign_in_at ?? "never"}`);
      return 0;
    }
    default:
      console.error(USAGE);
      return 2;
  }
}

main(process.argv.slice(2))
  .then(async (code) => { await closeDatabase(); process.exit(code); })
  .catch(async (e) => {
    console.error(e instanceof Error ? e.message : e);
    await closeDatabase();
    process.exit(1);
  });
