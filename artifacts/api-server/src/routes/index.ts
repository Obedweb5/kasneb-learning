import { Router, type IRouter } from "express";
import healthRouter from "./health";
import kasnebRouter from "./kasneb";

const router: IRouter = Router();

router.use(healthRouter);
router.use(kasnebRouter);

export default router;
