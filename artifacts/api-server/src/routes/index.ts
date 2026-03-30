import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import formsRouter from "./forms.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(formsRouter);

export default router;
