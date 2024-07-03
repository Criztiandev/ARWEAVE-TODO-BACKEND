import express from "express";
import transactionController from "../controller/transaction.controller";

const router = express.Router();

router.get("/get-all", transactionController.fetchAllTodo);
router.post("/create-todo", transactionController.createTodo);

export default router;
