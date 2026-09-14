import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { getMongoDb } from "@workspace/db/mongo";
import type {
  PurchaseDoc,
  ResourceDoc,
  ResourceType,
} from "@workspace/db/mongo/schema";
import { type AuthedRequest, requireAuth } from "../lib/auth";
import { createDownloadUrl } from "../lib/storage";
import { initiateStkPush } from "../lib/mpesa";

const router: IRouter = Router();

interface CatalogItem {
  id: string;
  title: string;
  description: string;
  price: number;
  owned: boolean;
  durationSeconds?: number;
  pageCount?: number;
}

// The "smart table" data source: every resource for a unit, grouped
// by category, each flagged with whether this student already owns it.
router.get("/units/:unitId/resources", requireAuth, async (req: AuthedRequest, res) => {
  const studentId = req.studentId as string;
  const db = await getMongoDb();

  const list = await db
    .collection<ResourceDoc>("resources")
    .find({ unitId: req.params["unitId"] as string })
    .toArray();

  const purchases = await db
    .collection<PurchaseDoc>("purchases")
    .find({
      studentId,
      status: "completed",
      resourceId: { $in: list.map((r) => r._id) },
    })
    .toArray();
  const ownedIds = new Set(purchases.map((p) => p.resourceId));

  const grouped: Record<ResourceType, CatalogItem[]> = {
    video: [],
    notes: [],
    "past-paper": [],
  };

  for (const resource of list) {
    grouped[resource.type].push({
      id: resource._id,
      title: resource.title,
      description: resource.description,
      price: resource.price,
      owned: ownedIds.has(resource._id),
      durationSeconds: resource.durationSeconds,
      pageCount: resource.pageCount,
    });
  }

  res.json(grouped);
});

router.post(
  "/resources/:resourceId/purchase",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const studentId = req.studentId as string;
    const { phoneNumber } = req.body ?? {};
    if (!phoneNumber) {
      res.status(400).json({ message: "phoneNumber is required." });
      return;
    }

    const db = await getMongoDb();
    const resource = await db
      .collection<ResourceDoc>("resources")
      .findOne({ _id: req.params["resourceId"] as string });
    if (!resource) {
      res.status(404).json({ message: "Resource not found." });
      return;
    }

    const purchases = db.collection<PurchaseDoc>("purchases");
    const alreadyOwned = await purchases.findOne({
      studentId,
      resourceId: resource._id,
      status: "completed",
    });
    if (alreadyOwned) {
      res.status(409).json({ message: "You already own this item." });
      return;
    }

    const stk = await initiateStkPush({
      phoneNumber,
      amount: resource.price,
      accountReference: resource._id,
      transactionDesc: resource.title,
    });

    const purchase: PurchaseDoc = {
      _id: randomUUID(),
      studentId,
      resourceId: resource._id,
      amount: resource.price,
      status: "pending",
      mpesaCheckoutRequestId: stk.CheckoutRequestID,
      createdAt: new Date(),
    };
    await purchases.insertOne(purchase);

    res.status(202).json({
      message: "STK push sent — enter your M-Pesa PIN to complete payment.",
      checkoutRequestId: stk.CheckoutRequestID,
    });
  },
);

// Daraja posts the payment result here once the student enters their PIN.
router.post("/mpesa/callback", async (req, res) => {
  const callback = req.body?.Body?.stkCallback;
  // Always ack 200 so Daraja doesn't retry — errors here are logged,
  // not surfaced to Safaricom.
  if (!callback) {
    res.status(200).json({ ResultCode: 0 });
    return;
  }

  const db = await getMongoDb();
  const purchases = db.collection<PurchaseDoc>("purchases");
  const purchase = await purchases.findOne({
    mpesaCheckoutRequestId: callback.CheckoutRequestID,
  });
  if (!purchase) {
    res.status(200).json({ ResultCode: 0 });
    return;
  }

  if (callback.ResultCode === 0) {
    const receiptItem = callback.CallbackMetadata?.Item?.find(
      (item: { Name: string; Value: unknown }) =>
        item.Name === "MpesaReceiptNumber",
    );
    await purchases.updateOne(
      { _id: purchase._id },
      {
        $set: {
          status: "completed",
          completedAt: new Date(),
          mpesaReceiptNumber: receiptItem?.Value,
        },
      },
    );
  } else {
    await purchases.updateOne(
      { _id: purchase._id },
      { $set: { status: "failed" } },
    );
  }

  res.status(200).json({ ResultCode: 0 });
});

// Only issues a real, working link once the purchase is confirmed paid.
router.get(
  "/resources/:resourceId/download",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const studentId = req.studentId as string;
    const db = await getMongoDb();

    const purchase = await db.collection<PurchaseDoc>("purchases").findOne({
      studentId,
      resourceId: req.params["resourceId"] as string,
      status: "completed",
    });
    if (!purchase) {
      res.status(403).json({ message: "Purchase this item to download it." });
      return;
    }

    const resource = await db
      .collection<ResourceDoc>("resources")
      .findOne({ _id: req.params["resourceId"] as string });
    if (!resource) {
      res.status(404).json({ message: "Resource not found." });
      return;
    }

    const url = await createDownloadUrl(resource.fileKey);
    res.json({ url });
  },
);

export default router;
