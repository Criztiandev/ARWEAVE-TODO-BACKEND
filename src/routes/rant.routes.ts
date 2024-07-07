import express from "express";
import rantController from "../controller/rant.controller";

const router = express.Router();

router.get("/get-all", rantController.fetchAllRants);
router.get("/details/:id", rantController.fetchRantById);
router.post("/create", rantController.createRant);
router.post("/comment/:id", rantController.commentRant);

export default router;
