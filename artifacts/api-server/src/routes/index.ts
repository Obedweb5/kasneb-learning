import { Router, type IRouter } from "express";
import healthRouter from "./health";
import kasnebRouter from "./kasneb";
import authRouter from "./auth";
import adminContentRouter from "./admin-content";
import adminAuthRouter from "./admin-auth";
import resourcesRouter from "./resources";
import publicContentRouter from "./public-content";

const router: IRouter = Router();

router.use(healthRouter);
router.use(publicContentRouter);
router.use(kasnebRouter);
router.use("/auth", authRouter);
router.use("/admin/auth", adminAuthRouter);
router.use("/admin", adminContentRouter);
router.use(resourcesRouter);

export default router;
