// routes/marathonRoutes.js
import express from "express";
import { addMarathon } from "../controllers/marathonController.js";

const router = express.Router();

router.post("/add", addMarathon);

export default router;
