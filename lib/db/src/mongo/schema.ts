export type CourseLevel = "foundation" | "intermediate" | "advanced";
export type ResourceType = "video" | "notes" | "past-paper";
export type PurchaseStatus = "pending" | "completed" | "failed";

export interface CourseDoc {
  _id: string; // slug, e.g. "cpa-financial-reporting"
  slug: string;
  title: string;
  unitCode: string;
  level: CourseLevel;
  description: string;
  duration: string;
  accent: string;
  image: string;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UnitDoc {
  _id: string;
  courseId: string;
  title: string;
  code: string;
  description: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceDoc {
  _id: string;
  unitId: string;
  courseId: string;
  title: string;
  type: ResourceType;
  description: string;
  price: number; // KES, this specific item's own price
  fileKey: string; // object storage key
  fileSize: number; // bytes
  durationSeconds?: number; // videos
  pageCount?: number; // notes / past papers
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentDoc {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: Date;
}

export interface PurchaseDoc {
  _id: string;
  studentId: string;
  resourceId: string;
  amount: number;
  status: PurchaseStatus;
  mpesaCheckoutRequestId?: string;
  mpesaReceiptNumber?: string;
  createdAt: Date;
  completedAt?: Date;
}
