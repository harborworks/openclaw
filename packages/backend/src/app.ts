import cors from "cors";
import express from "express";
import { authMiddleware, errorHandler } from "./middlewares";
import helloRoutes from "./routes/helloRoutes";
import itemRoutes from "./routes/itemRoutes";
import orgRoutes from "./routes/orgRoutes";
import userRoutes from "./routes/userRoutes";

const app = express();

app.use(express.json());
app.use(cors());
app.use(authMiddleware);
// Routes
app.use("/", helloRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orgs", orgRoutes);

// Global error handler (should be after routes)
app.use(errorHandler);

export default app;
