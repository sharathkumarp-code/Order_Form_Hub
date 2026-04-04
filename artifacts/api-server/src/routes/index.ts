import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import formsRouter from "./forms.js";
import authRouter from "./auth.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(formsRouter);
router.use(authRouter);

export default router;
