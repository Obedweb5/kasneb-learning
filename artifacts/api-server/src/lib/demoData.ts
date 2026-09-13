export type CourseLevel = "foundation" | "intermediate" | "advanced";
export type ResourceType = "video" | "notes" | "past-paper" | "quiz";
export type PaymentStatus = "pending" | "completed" | "failed";
export type StudentStatus = "active" | "suspended";

export interface Course {
  id: string;
  slug: string;
  title: string;
  unitCode: string;
  level: CourseLevel;
  price: number;
  description: string;
  duration: string;
  students: number;
  rating: number;
  featured: boolean;
  accent: string;
  image: string;
  resourceCount: number;
}

export interface Unit {
  id: string;
  title: string;
  code: string;
  description: string;
  resourceCount: number;
  completed: boolean;
}

export interface Resource {
  id: string;
  courseId: string;
  title: string;
  type: ResourceType;
  description: string;
  duration: string;
  size: string;
  isLocked: boolean;
  url: string;
}

export interface Payment {
  id: string;
  courseId: string;
  amount: number;
  phoneNumber: string;
  status: PaymentStatus;
  message: string;
  createdAt: Date;
}

export interface Enrollment {
  id: string;
  courseId: string;
  courseTitle: string;
  progress: number;
  lastLesson: string;
  nextLesson: string;
  updatedAt: Date;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  status: StudentStatus;
  joinedAt: Date;
  enrolledCourses: number;
  progress: number;
  lastActive: string;
}

export interface PlatformSettings {
  siteName: string;
  supportEmail: string;
  supportPhone: string;
  defaultCurrency: string;
  examSitting: string;
  maintenanceMode: boolean;
  allowNewEnrollments: boolean;
  showFeaturedCourses: boolean;
}

export const courses: Course[] = [
  {
    id: "cpa-financial-reporting",
    slug: "financial-reporting",
    title: "Financial Reporting",
    unitCode: "CPA 11",
    level: "intermediate",
    price: 1800,
    description:
      "Build confidence in IFRS, preparation of financial statements, and the adjustments KASNEB examiners test most.",
    duration: "12 weeks",
    students: 384,
    rating: 4.9,
    featured: true,
    accent: "violet",
    image: "financial-reporting",
    resourceCount: 42,
  },
  {
    id: "cpa-management-accounting",
    slug: "management-accounting",
    title: "Management Accounting",
    unitCode: "CPA 12",
    level: "intermediate",
    price: 1600,
    description:
      "Master costing, budgeting, variance analysis, and decision-making with guided practice and timed past papers.",
    duration: "10 weeks",
    students: 268,
    rating: 4.8,
    featured: true,
    accent: "amber",
    image: "management-accounting",
    resourceCount: 36,
  },
  {
    id: "cpa-auditing-assurance",
    slug: "auditing-assurance",
    title: "Auditing & Assurance",
    unitCode: "CPA 13",
    level: "advanced",
    price: 2000,
    description:
      "Learn the audit cycle, professional ethics, risk assessment, and exam-ready answer structures from experienced tutors.",
    duration: "12 weeks",
    students: 191,
    rating: 4.7,
    featured: false,
    accent: "teal",
    image: "auditing-assurance",
    resourceCount: 31,
  },
  {
    id: "cpa-business-data-analytics",
    slug: "business-data-analytics",
    title: "Business Data Analytics",
    unitCode: "CPA 14",
    level: "foundation",
    price: 1400,
    description:
      "A practical introduction to business data, interpretation, dashboards, and the core ideas that support modern accountants.",
    duration: "8 weeks",
    students: 143,
    rating: 4.6,
    featured: false,
    accent: "sky",
    image: "business-data-analytics",
    resourceCount: 24,
  },
];

export const units: Record<string, Unit[]> = {
  "cpa-financial-reporting": [
    {
      id: "fr-01",
      title: "The reporting framework",
      code: "FR 01",
      description: "Conceptual framework, qualitative characteristics, and standard-setting.",
      resourceCount: 6,
      completed: true,
    },
    {
      id: "fr-02",
      title: "Financial statements",
      code: "FR 02",
      description: "Statement of profit or loss, financial position, and changes in equity.",
      resourceCount: 9,
      completed: true,
    },
    {
      id: "fr-03",
      title: "Assets and liabilities",
      code: "FR 03",
      description: "Property, plant and equipment, impairment, provisions, and leases.",
      resourceCount: 11,
      completed: false,
    },
    {
      id: "fr-04",
      title: "Groups and analysis",
      code: "FR 04",
      description: "Consolidated statements, cash flows, and exam-focused interpretation.",
      resourceCount: 16,
      completed: false,
    },
  ],
  "cpa-management-accounting": [
    {
      id: "ma-01",
      title: "Cost classification",
      code: "MA 01",
      description: "Cost behaviour, cost centres, and the language of management accounting.",
      resourceCount: 8,
      completed: false,
    },
    {
      id: "ma-02",
      title: "Budgeting",
      code: "MA 02",
      description: "Flexible budgets, cash budgets, and planning under uncertainty.",
      resourceCount: 10,
      completed: false,
    },
    {
      id: "ma-03",
      title: "Variance analysis",
      code: "MA 03",
      description: "Material, labour, overhead, and sales variances explained step by step.",
      resourceCount: 9,
      completed: false,
    },
  ],
  "cpa-auditing-assurance": [
    {
      id: "au-01",
      title: "Audit fundamentals",
      code: "AU 01",
      description: "Purpose, scope, assurance levels, and the audit engagement.",
      resourceCount: 7,
      completed: false,
    },
    {
      id: "au-02",
      title: "Risk and internal control",
      code: "AU 02",
      description: "Understanding risk, controls, and designing responsive procedures.",
      resourceCount: 12,
      completed: false,
    },
    {
      id: "au-03",
      title: "Evidence and reporting",
      code: "AU 03",
      description: "Audit evidence, completion, opinions, and professional judgement.",
      resourceCount: 12,
      completed: false,
    },
  ],
  "cpa-business-data-analytics": [
    {
      id: "bd-01",
      title: "Data for decisions",
      code: "BD 01",
      description: "Data quality, sources, governance, and the accountant's role.",
      resourceCount: 8,
      completed: false,
    },
    {
      id: "bd-02",
      title: "Interpreting business data",
      code: "BD 02",
      description: "Trends, ratios, visual thinking, and communicating insight.",
      resourceCount: 8,
      completed: false,
    },
    {
      id: "bd-03",
      title: "Practice assessment",
      code: "BD 03",
      description: "A timed mixed assessment with feedback and revision prompts.",
      resourceCount: 8,
      completed: false,
    },
  ],
};

export const resources: Resource[] = [
  {
    id: "res-fr-standards",
    courseId: "cpa-financial-reporting",
    title: "IFRS standards quick revision guide",
    type: "notes",
    description: "A concise set of definitions, formats, and examiner tips.",
    duration: "28 pages",
    size: "2.4 MB",
    isLocked: false,
    url: "/demo/ifrs-revision-guide.pdf",
  },
  {
    id: "res-fr-video",
    courseId: "cpa-financial-reporting",
    title: "How to approach consolidation questions",
    type: "video",
    description: "Tutor-led walkthrough of a typical group accounts question.",
    duration: "18 min",
    size: "108 MB",
    isLocked: true,
    url: "/demo/consolidation-walkthrough.mp4",
  },
  {
    id: "res-fr-paper",
    courseId: "cpa-financial-reporting",
    title: "Financial Reporting past paper — May 2024",
    type: "past-paper",
    description: "Timed paper with marking guide and examiner commentary.",
    duration: "3 hours",
    size: "1.8 MB",
    isLocked: true,
    url: "/demo/financial-reporting-may-2024.pdf",
  },
  {
    id: "res-ma-video",
    courseId: "cpa-management-accounting",
    title: "Variance analysis made simple",
    type: "video",
    description: "A practical class on turning variance data into a clear answer.",
    duration: "24 min",
    size: "142 MB",
    isLocked: true,
    url: "/demo/variance-analysis.mp4",
  },
  {
    id: "res-ma-notes",
    courseId: "cpa-management-accounting",
    title: "Management Accounting formula sheet",
    type: "notes",
    description: "Key formulas and worked examples for quick revision.",
    duration: "14 pages",
    size: "1.2 MB",
    isLocked: false,
    url: "/demo/management-accounting-formulas.pdf",
  },
];

export const enrollments: Enrollment[] = [
  {
    id: "enrollment-fr",
    courseId: "cpa-financial-reporting",
    courseTitle: "Financial Reporting",
    progress: 68,
    lastLesson: "IAS 16: Property, plant and equipment",
    nextLesson: "IAS 36: Impairment of assets",
    updatedAt: new Date("2026-09-11T08:00:00.000Z"),
  },
  {
    id: "enrollment-ma",
    courseId: "cpa-management-accounting",
    courseTitle: "Management Accounting",
    progress: 32,
    lastLesson: "Cost behaviour and contribution",
    nextLesson: "Preparing a flexible budget",
    updatedAt: new Date("2026-09-08T14:30:00.000Z"),
  },
];

export const payments: Payment[] = [
  {
    id: "pay-demo-001",
    courseId: "cpa-financial-reporting",
    amount: 1800,
    phoneNumber: "254712345678",
    status: "completed",
    message: "Payment received and course access granted.",
    createdAt: new Date("2026-09-10T09:15:00.000Z"),
  },
  {
    id: "pay-demo-002",
    courseId: "cpa-management-accounting",
    amount: 1600,
    phoneNumber: "254798765432",
    status: "completed",
    message: "Payment received and course access granted.",
    createdAt: new Date("2026-09-07T11:20:00.000Z"),
  },
];

export const contactMessages: Array<{
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "received" | "replied";
}> = [];

export const students: Student[] = [
  {
    id: "student-amina",
    name: "Amina Mwangi",
    email: "amina@example.com",
    status: "active",
    joinedAt: new Date("2026-07-02T08:00:00.000Z"),
    enrolledCourses: 2,
    progress: 64,
    lastActive: "Today",
  },
  {
    id: "student-brian",
    name: "Brian Otieno",
    email: "brian@example.com",
    status: "active",
    joinedAt: new Date("2026-06-18T10:30:00.000Z"),
    enrolledCourses: 1,
    progress: 42,
    lastActive: "Yesterday",
  },
  {
    id: "student-wanjiku",
    name: "Wanjiku Njeri",
    email: "wanjiku@example.com",
    status: "suspended",
    joinedAt: new Date("2026-05-11T07:45:00.000Z"),
    enrolledCourses: 3,
    progress: 27,
    lastActive: "12 days ago",
  },
];

export const platformSettings: PlatformSettings = {
  siteName: "KASNEB Learning Hub",
  supportEmail: "hello@kasneblearning.co.ke",
  supportPhone: "+254 700 000 000",
  defaultCurrency: "KES",
  examSitting: "November 2026 KASNEB sitting",
  maintenanceMode: false,
  allowNewEnrollments: true,
  showFeaturedCourses: true,
};