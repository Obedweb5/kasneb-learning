import { randomUUID } from "node:crypto";
import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { getMongoDb } from "@workspace/db/mongo";
import type {
  CourseDoc,
  ResourceDoc,
  UnitDoc,
} from "@workspace/db/mongo/schema";
import { createUploadUrl, deleteFile } from "../lib/storage";

const router: IRouter = Router();

/**
 * Minimal stopgap so these endpoints aren't wide open: every request
 * must send the shared admin key. This is NOT a real admin-accounts
 * system (no per-admin login, no audit trail) — treat ADMIN_API_KEY
 * like a password and rotate it if it ever leaks. Replace this with
 * proper admin auth before this matters for anything beyond a small
 * trusted team.
 */
function requireAdminKey(req: Request, res: Response, next: NextFunction) {
  const expected = process.env["ADMIN_API_KEY"];
  if (!expected) {
    res
      .status(500)
      .json({ message: "ADMIN_API_KEY is not configured on the server." });
    return;
  }
  if (req.headers["x-admin-key"] !== expected) {
    res.status(401).json({ message: "Invalid admin key." });
    return;
  }
  next();
}

router.use(requireAdminKey);

// ---------- Courses ----------

router.post("/courses", async (req, res) => {
  const { slug, title, unitCode, level, description, duration, accent, image, featured } =
    req.body ?? {};
  if (!slug || !title || !unitCode || !level) {
    res
      .status(400)
      .json({ message: "slug, title, unitCode, and level are required." });
    return;
  }

  const db = await getMongoDb();
  const courses = db.collection<CourseDoc>("courses");

  const existing = await courses.findOne({ _id: slug });
  if (existing) {
    res.status(409).json({ message: "A course with this slug already exists." });
    return;
  }

  const now = new Date();
  const course: CourseDoc = {
    _id: slug,
    slug,
    title,
    unitCode,
    level,
    description: description ?? "",
    duration: duration ?? "",
    accent: accent ?? "violet",
    image: image ?? slug,
    featured: Boolean(featured),
    createdAt: now,
    updatedAt: now,
  };
  await courses.insertOne(course);
  res.status(201).json(course);
});

router.get("/courses", async (_req, res) => {
  const db = await getMongoDb();
  const list = await db
    .collection<CourseDoc>("courses")
    .find()
    .sort({ createdAt: -1 })
    .toArray();
  res.json(list);
});

// Cascade delete: removes the course, its units, its resources, and every
// uploaded file those resources point to in object storage.
router.delete("/courses/:courseId", async (req, res) => {
  const { courseId } = req.params;
  const db = await getMongoDb();
  const course = await db
    .collection<CourseDoc>("courses")
    .findOne({ _id: courseId as string });
  if (!course) {
    res.status(404).json({ message: "Course not found." });
    return;
  }

  const resources = await db
    .collection<ResourceDoc>("resources")
    .find({ courseId: courseId as string })
    .toArray();
  await Promise.all(resources.map((resource) => deleteFile(resource.fileKey)));

  await db
    .collection<ResourceDoc>("resources")
    .deleteMany({ courseId: courseId as string });
  await db
    .collection<UnitDoc>("units")
    .deleteMany({ courseId: courseId as string });
  await db.collection<CourseDoc>("courses").deleteOne({ _id: courseId as string });

  res.status(204).send();
});

// ---------- Units ----------

router.post("/courses/:courseId/units", async (req, res) => {
  const { courseId } = req.params;
  const { title, code, description, order } = req.body ?? {};
  if (!title || !code) {
    res.status(400).json({ message: "title and code are required." });
    return;
  }

  const db = await getMongoDb();
  const course = await db
    .collection<CourseDoc>("courses")
    .findOne({ _id: courseId });
  if (!course) {
    res.status(404).json({ message: "Course not found." });
    return;
  }

  const now = new Date();
  const unit: UnitDoc = {
    _id: randomUUID(),
    courseId,
    title,
    code,
    description: description ?? "",
    order: typeof order === "number" ? order : 0,
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<UnitDoc>("units").insertOne(unit);
  res.status(201).json(unit);
});

router.get("/courses/:courseId/units", async (req, res) => {
  const db = await getMongoDb();
  const list = await db
    .collection<UnitDoc>("units")
    .find({ courseId: req.params["courseId"] as string })
    .sort({ order: 1 })
    .toArray();
  res.json(list);
});

router.delete("/units/:unitId", async (req, res) => {
  const { unitId } = req.params;
  const db = await getMongoDb();
  const unit = await db
    .collection<UnitDoc>("units")
    .findOne({ _id: unitId as string });
  if (!unit) {
    res.status(404).json({ message: "Unit not found." });
    return;
  }

  const resources = await db
    .collection<ResourceDoc>("resources")
    .find({ unitId: unitId as string })
    .toArray();
  await Promise.all(resources.map((resource) => deleteFile(resource.fileKey)));

  await db
    .collection<ResourceDoc>("resources")
    .deleteMany({ unitId: unitId as string });
  await db.collection<UnitDoc>("units").deleteOne({ _id: unitId as string });

  res.status(204).send();
});

// ---------- Resources (notes / past papers / video tutorials) ----------

// Step 1: get a presigned URL; the admin's browser uploads the raw
// file straight to object storage.
router.post("/units/:unitId/resources/upload-url", async (req, res) => {
  const { contentType, type } = req.body ?? {};
  if (!contentType || !type) {
    res.status(400).json({ message: "contentType and type are required." });
    return;
  }

  const { uploadUrl, fileKey } = await createUploadUrl({
    contentType,
    folder: `resources/${req.params["unitId"]}/${type}`,
  });
  res.json({ uploadUrl, fileKey });
});

// Step 2: once the upload finishes, save the resource record —
// including its own price.
router.post("/units/:unitId/resources", async (req, res) => {
  const { unitId } = req.params;
  const {
    title,
    type,
    description,
    price,
    fileKey,
    fileSize,
    durationSeconds,
    pageCount,
  } = req.body ?? {};

  if (!title || !type || price === undefined || !fileKey) {
    res
      .status(400)
      .json({ message: "title, type, price, and fileKey are required." });
    return;
  }
  if (!["video", "notes", "past-paper", "image"].includes(type)) {
    res
      .status(400)
      .json({
        message: "type must be 'video', 'notes', 'past-paper', or 'image'.",
      });
    return;
  }

  const db = await getMongoDb();
  const unit = await db
    .collection<UnitDoc>("units")
    .findOne({ _id: unitId as string });
  if (!unit) {
    res.status(404).json({ message: "Unit not found." });
    return;
  }

  const now = new Date();
  const resource: ResourceDoc = {
    _id: randomUUID(),
    unitId: unitId as string,
    courseId: unit.courseId,
    title,
    type,
    description: description ?? "",
    price: Number(price),
    fileKey,
    fileSize: typeof fileSize === "number" ? fileSize : 0,
    durationSeconds:
      typeof durationSeconds === "number" ? durationSeconds : undefined,
    pageCount: typeof pageCount === "number" ? pageCount : undefined,
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<ResourceDoc>("resources").insertOne(resource);
  res.status(201).json(resource);
});

// Full list for the admin's own management table (all resources for
// a unit, regardless of type — the frontend groups them for display).
router.get("/units/:unitId/resources", async (req, res) => {
  const db = await getMongoDb();
  const list = await db
    .collection<ResourceDoc>("resources")
    .find({ unitId: req.params["unitId"] as string })
    .sort({ type: 1, createdAt: 1 })
    .toArray();
  res.json(list);
});

router.patch("/resources/:resourceId", async (req, res) => {
  const { title, description, price } = req.body ?? {};
  const update: Partial<ResourceDoc> = { updatedAt: new Date() };
  if (title !== undefined) update.title = title;
  if (description !== undefined) update.description = description;
  if (price !== undefined) update.price = Number(price);

  const db = await getMongoDb();
  const result = await db
    .collection<ResourceDoc>("resources")
    .findOneAndUpdate(
      { _id: req.params["resourceId"] as string },
      { $set: update },
      { returnDocument: "after" },
    );
  if (!result) {
    res.status(404).json({ message: "Resource not found." });
    return;
  }
  res.json(result);
});

router.delete("/resources/:resourceId", async (req, res) => {
  const db = await getMongoDb();
  const resources = db.collection<ResourceDoc>("resources");
  const resource = await resources.findOne({
    _id: req.params["resourceId"] as string,
  });
  if (!resource) {
    res.status(404).json({ message: "Resource not found." });
    return;
  }
  await deleteFile(resource.fileKey);
  await resources.deleteOne({ _id: resource._id });
  res.status(204).send();
});

export default router;
