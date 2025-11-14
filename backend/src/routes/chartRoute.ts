import { Router } from "express";
import * as chartController from "../controllers/chartController.js";

const router = Router();

router.post("/getChartData", chartController.getChartData);

export default router;