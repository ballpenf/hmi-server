import { Router } from "express";
import * as dataController from "../controllers/dataController.js";

const router = Router();

router.post("/getValues", dataController.getValues);
router.post("/setValues", dataController.setValues);

export default router;
