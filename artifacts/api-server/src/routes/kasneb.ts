import { Router, type IRouter } from "express";
import {
  CreateCourseBody,
  CreateResourceBody,
  EnrollCourseParams,
  GetCourseParams,
  GetPaymentParams,
  InitiateMpesaPaymentBody,
  SubmitContactBody,
  UpdateCourseBody,
  UpdateCourseParams,
  UpdateProgressBody,
  UpdateProgressParams,
} from "@workspace/api-zod";
import {
  contactMessages,
  courses,
  enrollments,
  payments,
  resources,
  units,
  type Course,
  type Payment,
  type Resource,
} from "../lib/demoData";

const router: IRouter = Router();

function getCourse(courseId: string) {
  return courses.find(
    (course) => course.id === courseId || course.slug === courseId,
  );
}

function paymentForResponse(payment: Payment) {
  return {
    ...payment,
    createdAt: payment.createdAt.toISOString(),
  };
}

router.get("/courses", (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.toLowerCase() : "";
  const unit = typeof req.query.unit === "string" ? req.query.unit.toLowerCase() : "";
  const level = typeof req.query.level === "string" ? req.query.level : undefined;
  const featured = req.query.featured === "true";

  const filtered = courses.filter((course) => {
    const matchesSearch =
      !search ||
      course.title.toLowerCase().includes(search) ||
      course.description.toLowerCase().includes(search);
    const matchesUnit = !unit || course.unitCode.toLowerCase().includes(unit);
    const matchesLevel = !level || course.level === level;
    const matchesFeatured = !featured || course.featured;
    return matchesSearch && matchesUnit && matchesLevel && matchesFeatured;
  });

  res.json(filtered);
});

router.post("/courses", (req, res) => {
  const parsed = CreateCourseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const course: Course = {
    id: `course-${Date.now()}`,
    slug: data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title: data.title,
    unitCode: data.unitCode,
    level: data.level,
    price: data.price,
    description: data.description,
    duration: data.duration,
    students: 0,
    rating: 0,
    featured: data.featured ?? false,
    accent: data.accent ?? "violet",
    image: data.image ?? "new-course",
    resourceCount: 0,
  };
  courses.unshift(course);
  res.status(201).json(course);
});

router.get("/courses/:courseId", (req, res) => {
  const params = GetCourseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const course = getCourse(params.data.courseId);
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }

  res.json({
    ...course,
    units: units[course.id] ?? [],
  });
});

router.patch("/courses/:courseId", (req, res) => {
  const params = UpdateCourseParams.safeParse(req.params);
  const parsed = UpdateCourseBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const course = getCourse(params.data.courseId);
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  Object.assign(course, parsed.data);
  res.json(course);
});

router.get("/dashboard", (_req, res) => {
  res.json({
    greeting: "Good morning, Amina",
    streak: 6,
    hoursLearned: 24.5,
    coursesInProgress: enrollments.filter((item) => item.progress < 100).length,
    completedCourses: 1,
    enrollments,
    upcomingExam: {
      title: "November 2026 KASNEB sitting",
      date: "2026-11-18",
      daysLeft: 66,
    },
  });
});

router.post("/courses/:courseId/enroll", (req, res) => {
  const params = EnrollCourseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const course = getCourse(params.data.courseId);
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  const existing = enrollments.find((item) => item.courseId === course.id);
  if (existing) {
    res.status(201).json(existing);
    return;
  }
  course.students += 1;
  const enrollment = {
    id: `enrollment-${Date.now()}`,
    courseId: course.id,
    courseTitle: course.title,
    progress: 0,
    lastLesson: "Not started",
    nextLesson: units[course.id]?.[0]?.title ?? "First lesson",
    updatedAt: new Date(),
  };
  enrollments.push(enrollment);
  res.status(201).json(enrollment);
});

router.patch("/enrollments/:enrollmentId/progress", (req, res) => {
  const params = UpdateProgressParams.safeParse(req.params);
  const parsed = UpdateProgressBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const enrollment = enrollments.find((item) => item.id === params.data.enrollmentId);
  if (!enrollment) {
    res.status(404).json({ error: "Enrollment not found" });
    return;
  }
  enrollment.progress = parsed.data.progress;
  enrollment.lastLesson = parsed.data.lesson;
  enrollment.updatedAt = new Date();
  res.json(enrollment);
});

router.post("/resources", (req, res) => {
  const parsed = CreateResourceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const resource: Resource = {
    id: `resource-${Date.now()}`,
    courseId: data.courseId,
    title: data.title,
    type: data.type,
    description: data.description,
    duration: data.duration ?? "New",
    size: data.size ?? "Pending",
    isLocked: true,
    url: data.url ?? "",
  };
  resources.push(resource);
  const course = getCourse(data.courseId);
  if (course) course.resourceCount += 1;
  res.status(201).json(resource);
});

router.post("/payments/mpesa/stk-push", (req, res) => {
  const parsed = InitiateMpesaPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const course = getCourse(parsed.data.courseId);
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  const payment: Payment = {
    id: `payment-${Date.now()}`,
    courseId: course.id,
    amount: course.price,
    phoneNumber: parsed.data.phoneNumber,
    status: "pending",
    message: process.env.DARAJA_CONSUMER_KEY
      ? "STK push sent. Check your phone to complete payment."
      : "Demo checkout created. Add Daraja credentials to send a live STK push.",
    createdAt: new Date(),
  };
  payments.unshift(payment);
  res.status(201).json(paymentForResponse(payment));
});

router.get("/payments/:paymentId", (req, res) => {
  const params = GetPaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const payment = payments.find((item) => item.id === params.data.paymentId);
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }
  res.json(paymentForResponse(payment));
});

router.get("/admin/overview", (_req, res) => {
  const completed = payments.filter((payment) => payment.status === "completed");
  const counts = resources.reduce<Record<string, number>>((acc, resource) => {
    acc[resource.type] = (acc[resource.type] ?? 0) + 1;
    return acc;
  }, {});
  res.json({
    totalRevenue: completed.reduce((total, payment) => total + payment.amount, 0),
    paidOrders: completed.length,
    students: courses.reduce((total, course) => total + course.students, 0),
    publishedResources: resources.length,
    recentOrders: payments.slice(0, 5).map(paymentForResponse),
    resourcesByType: Object.entries(counts).map(([type, count]) => ({ type, count })),
  });
});

router.post("/contact", (req, res) => {
  const parsed = SubmitContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const message = {
    id: `message-${Date.now()}`,
    ...parsed.data,
    status: "received" as const,
  };
  contactMessages.unshift(message);
  res.status(201).json(message);
});

export default router;