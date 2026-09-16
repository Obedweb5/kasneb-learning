import { Router, type IRouter } from "express";
import { getMongoDb } from "@workspace/db/mongo";
import type {
  CourseDoc,
  ResourceDoc,
  UnitDoc,
} from "@workspace/db/mongo/schema";
import { createDownloadUrl } from "../lib/storage";

const router: IRouter = Router();

/**
 * Real, database-backed browsing for the public "Library" section of the
 * site. No login or admin key required — anyone can see what's published
 * and download it. If paid access is wanted later, add a purchase check
 * before generating the download URL below (the resources.ts router has
 * a working M-Pesa-gated example of that pattern to copy from).
 */

router.get("/library/courses", async (_req, res) => {
  const db = await getMongoDb();
  const courses = await db
    .collection<CourseDoc>("courses")
    .find()
    .sort({ createdAt: -1 })
    .toArray();

  const resourceCounts = await db
    .collection<ResourceDoc>("resources")
    .aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$courseId", count: { $sum: 1 } } },
    ])
    .toArray();
  const countByCourse = new Map(
    resourceCounts.map((item) => [item._id, item.count]),
  );

  res.json(
    courses.map((course) => ({
      ...course,
      resourceCount: countByCourse.get(course._id) ?? 0,
    })),
  );
});

router.get("/library/courses/:courseId", async (req, res) => {
  const { courseId } = req.params;
  const db = await getMongoDb();
  const course = await db
    .collection<CourseDoc>("courses")
    .findOne({ _id: courseId as string });
  if (!course) {
    res.status(404).json({ message: "Course not found." });
    return;
  }

  const units = await db
    .collection<UnitDoc>("units")
    .find({ courseId: courseId as string })
    .sort({ order: 1 })
    .toArray();

  const resourceCounts = await db
    .collection<ResourceDoc>("resources")
    .aggregate<{ _id: string; count: number }>([
      { $match: { courseId: courseId as string } },
      { $group: { _id: "$unitId", count: { $sum: 1 } } },
    ])
    .toArray();
  const countByUnit = new Map(
    resourceCounts.map((item) => [item._id, item.count]),
  );

  res.json({
    ...course,
    units: units.map((unit) => ({
      ...unit,
      resourceCount: countByUnit.get(unit._id) ?? 0,
    })),
  });
});

router.get(
  "/library/courses/:courseId/units/:unitId/resources",
  async (req, res) => {
    const { unitId } = req.params;
    const db = await getMongoDb();
    const list = await db
      .collection<ResourceDoc>("resources")
      .find({ unitId: unitId as string })
      .sort({ type: 1, createdAt: 1 })
      .toArray();

    // fileKey is intentionally left out — the download endpoint below
    // issues a short-lived signed URL instead of exposing the raw key.
    res.json(
      list.map(({ fileKey: _fileKey, ...rest }) => rest),
    );
  },
);

router.get(
  "/library/resources/:resourceId/download",
  async (req, res) => {
    const { resourceId } = req.params;
    const db = await getMongoDb();
    const resource = await db
      .collection<ResourceDoc>("resources")
      .findOne({ _id: resourceId as string });
    if (!resource) {
      res.status(404).json({ message: "Resource not found." });
      return;
    }

    const url = await createDownloadUrl(resource.fileKey);
    res.json({ url });
  },
);

export default router;
