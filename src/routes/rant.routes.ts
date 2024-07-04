import express from "express";
import rantController from "../controller/rant.controller";

const router = express.Router();

router.get("/get-all", rantController.fetchAllRant);
router.post("/create", rantController.createRant);
router.get("/greet", rantController.greet);

export default router;
