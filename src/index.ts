import express from "express";
import transactionRoutes from "./routes/transaction.routes";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(
  cors({
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE"], // Allow specific HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allow specific headers
    credentials: true, // Allow cookies to be sent
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/transaction", transactionRoutes);

app.listen(PORT, () => console.log(`Server is running on: ${PORT}`));

export default app;
