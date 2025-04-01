import cors from "cors";
import express from "express";
import { errorHandler } from "./middlewares/errorHandler";
import helloRoutes from "./routes/helloRoutes";
import itemRoutes from "./routes/itemRoutes";

const app = express();

app.use(express.json());
app.use(cors());

// Routes
app.use("/", helloRoutes);
app.use("/api/items", itemRoutes);

// Global error handler (should be after routes)
app.use(errorHandler);

export default app;
