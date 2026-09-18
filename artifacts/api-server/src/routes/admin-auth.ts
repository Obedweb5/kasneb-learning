import { randomBytes, randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { getMongoDb } from "@workspace/db/mongo";
import type { AdminDoc } from "@workspace/db/mongo/schema";
import {
  ADMIN_COOKIE_NAME,
  hashPassword,
  requireAdminAuth,
  requireOwner,
  signAdminToken,
  verifyPassword,
  type AuthedAdminRequest,
} from "../lib/auth";

const router: IRouter = Router();

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 12 * 60 * 60 * 1000, // 12h, matches the token's own expiry
};

function adminForResponse(admin: AdminDoc) {
  return {
    id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    status: admin.status,
    createdAt: admin.createdAt,
  };
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ message: "email and password are required." });
    return;
  }

  const db = await getMongoDb();
  const admin = await db
    .collection<AdminDoc>("admins")
    .findOne({ email: String(email).toLowerCase(), status: "active" });

  if (
    !admin ||
    !admin.passwordHash ||
    !admin.passwordSalt ||
    !verifyPassword(password, admin.passwordHash, admin.passwordSalt)
  ) {
    res.status(401).json({ message: "Invalid email or password." });
    return;
  }

  const token = signAdminToken(admin._id, admin.role);
  res.cookie(ADMIN_COOKIE_NAME, token, cookieOptions);
  res.status(200).json({ token, admin: adminForResponse(admin) });
});

router.post("/logout", (_req, res) => {
  res.clearCookie(ADMIN_COOKIE_NAME);
  res.status(204).send();
});

router.get("/me", requireAdminAuth, async (req: AuthedAdminRequest, res) => {
  const db = await getMongoDb();
  const admin = await db
    .collection<AdminDoc>("admins")
    .findOne({ _id: req.adminId as string, status: "active" });
  if (!admin) {
    res.status(401).json({ message: "Session no longer valid." });
    return;
  }
  res.json(adminForResponse(admin));
});

// Owner-only: invite a new admin. There is no outgoing email here —
// the owner shares the returned inviteUrl with the person directly.
router.post("/invite", requireAdminAuth, requireOwner, async (req: AuthedAdminRequest, res) => {
  const { name, email } = req.body ?? {};
  if (!name || !email) {
    res.status(400).json({ message: "name and email are required." });
    return;
  }

  const db = await getMongoDb();
  const admins = db.collection<AdminDoc>("admins");
  const normalizedEmail = String(email).toLowerCase();

  const existing = await admins.findOne({ email: normalizedEmail });
  if (existing) {
    res.status(409).json({ message: "An admin with this email already exists." });
    return;
  }

  const now = new Date();
  const inviteToken = randomBytes(24).toString("hex");
  const admin: AdminDoc = {
    _id: randomUUID(),
    name,
    email: normalizedEmail,
    role: "admin",
    status: "invited",
    invitedBy: req.adminId,
    inviteToken,
    inviteTokenExpiresAt: new Date(now.getTime() + INVITE_TTL_MS),
    createdAt: now,
    updatedAt: now,
  };
  await admins.insertOne(admin);

  res.status(201).json({ ...adminForResponse(admin), inviteToken });
});

router.post("/accept-invite", async (req, res) => {
  const { token, password } = req.body ?? {};
  if (!token || !password) {
    res.status(400).json({ message: "token and password are required." });
    return;
  }

  const db = await getMongoDb();
  const admins = db.collection<AdminDoc>("admins");
  const admin = await admins.findOne({ inviteToken: token, status: "invited" });

  if (!admin || !admin.inviteTokenExpiresAt || admin.inviteTokenExpiresAt < new Date()) {
    res.status(400).json({ message: "This invite link is invalid or has expired." });
    return;
  }

  const { hash, salt } = hashPassword(password);
  await admins.updateOne(
    { _id: admin._id },
    {
      $set: { passwordHash: hash, passwordSalt: salt, status: "active", updatedAt: new Date() },
      $unset: { inviteToken: "", inviteTokenExpiresAt: "" },
    },
  );

  const jwtToken = signAdminToken(admin._id, admin.role);
  res.cookie(ADMIN_COOKIE_NAME, jwtToken, cookieOptions);
  res.status(200).json({
    token: jwtToken,
    admin: adminForResponse({ ...admin, status: "active" }),
  });
});

// Owner-only: manage the admin roster.
router.get("/admins", requireAdminAuth, requireOwner, async (_req, res) => {
  const db = await getMongoDb();
  const list = await db.collection<AdminDoc>("admins").find().sort({ createdAt: 1 }).toArray();
  res.json(list.map(adminForResponse));
});

router.delete(
  "/admins/:adminId",
  requireAdminAuth,
  requireOwner,
  async (req: AuthedAdminRequest, res) => {
    const { adminId } = req.params;
    if (adminId === req.adminId) {
      res.status(400).json({ message: "You can't remove your own account." });
      return;
    }

    const db = await getMongoDb();
    const admins = db.collection<AdminDoc>("admins");
    const target = await admins.findOne({ _id: adminId as string });
    if (!target) {
      res.status(404).json({ message: "Admin not found." });
      return;
    }
    if (target.role === "owner") {
      const ownerCount = await admins.countDocuments({ role: "owner" });
      if (ownerCount <= 1) {
        res.status(400).json({ message: "At least one owner must remain." });
        return;
      }
    }

    await admins.deleteOne({ _id: adminId as string });
    res.status(204).send();
  },
);

export default router;
