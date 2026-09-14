import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { getMongoDb } from "@workspace/db/mongo";
import type { StudentDoc } from "@workspace/db/mongo/schema";
import { hashPassword, signStudentToken, verifyPassword } from "../lib/auth";

const router: IRouter = Router();

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (!name || !email || !password) {
    res
      .status(400)
      .json({ message: "name, email, and password are required." });
    return;
  }

  const db = await getMongoDb();
  const students = db.collection<StudentDoc>("students");

  const existing = await students.findOne({ email });
  if (existing) {
    res
      .status(409)
      .json({ message: "An account with this email already exists." });
    return;
  }

  const { hash, salt } = hashPassword(password);
  const student: StudentDoc = {
    _id: randomUUID(),
    name,
    email,
    passwordHash: hash,
    passwordSalt: salt,
    createdAt: new Date(),
  };
  await students.insertOne(student);

  const token = signStudentToken(student._id);
  res.status(201).json({
    token,
    student: { id: student._id, name: student.name, email: student.email },
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ message: "email and password are required." });
    return;
  }

  const db = await getMongoDb();
  const student = await db
    .collection<StudentDoc>("students")
    .findOne({ email });

  if (
    !student ||
    !verifyPassword(password, student.passwordHash, student.passwordSalt)
  ) {
    res.status(401).json({ message: "Invalid email or password." });
    return;
  }

  const token = signStudentToken(student._id);
  res.status(200).json({
    token,
    student: { id: student._id, name: student.name, email: student.email },
  });
});

export default router;
