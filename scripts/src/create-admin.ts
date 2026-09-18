// Bootstraps the first ("owner") admin account. There is no public
// signup for admins — this is the only way to create the very first
// one; after that, the owner can invite more from the Team page.
//
// Usage:
//   pnpm --filter scripts create-admin -- --name "Amina Otieno" --email amina@example.com --password "a strong password"
//
// Requires MONGODB_URI to be set in the environment (same one the
// api-server uses).

import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { getMongoDb, closeMongoConnection } from "@workspace/db/mongo";
import type { AdminDoc } from "@workspace/db/mongo/schema";

function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

function readArg(name: string): string | undefined {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const name = readArg("name");
  const email = readArg("email")?.toLowerCase();
  const password = readArg("password");

  if (!name || !email || !password) {
    console.error(
      'Usage: pnpm --filter scripts create-admin -- --name "Your Name" --email you@example.com --password "a strong password"',
    );
    process.exitCode = 1;
    return;
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exitCode = 1;
    return;
  }

  const db = await getMongoDb();
  const admins = db.collection<AdminDoc>("admins");

  const existing = await admins.findOne({ email });
  if (existing) {
    console.error(`An admin with email ${email} already exists (role: ${existing.role}, status: ${existing.status}).`);
    process.exitCode = 1;
    return;
  }

  const { hash, salt } = hashPassword(password);
  const now = new Date();
  const admin: AdminDoc = {
    _id: randomUUID(),
    name,
    email,
    role: "owner",
    status: "active",
    passwordHash: hash,
    passwordSalt: salt,
    createdAt: now,
    updatedAt: now,
  };
  await admins.insertOne(admin);

  console.log(`Owner admin created: ${name} <${email}>`);
  console.log("You can now sign in at /admin/login. From there, invite more admins from the Team page.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeMongoConnection());
