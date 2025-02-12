import express from "express";
import rantRoutes from "./routes/rant.routes";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/rant", rantRoutes);
app.listen(PORT, () => console.log(`Server is running on: ${PORT}`));

export default app;
