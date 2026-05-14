import { Router, type IRouter } from "express";
import healthRouter from "./health";
import lottoProxyRouter from "./lottoProxy";
import savedNumbersRouter from "./savedNumbers";
import emailResultsRouter from "./emailResults";

const router: IRouter = Router();

router.use(healthRouter);
router.use(lottoProxyRouter);
router.use(savedNumbersRouter);
router.use(emailResultsRouter);

export default router;
