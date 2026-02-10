import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { authMiddleware } from "./middlewares/authMiddleware";
import { errorHandler } from "./middlewares/errorHandler";
import agentRoutes from "./routes/agentRoutes";
import authRoutes from "./routes/authRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import taskRoutes from "./routes/taskRoutes";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(authMiddleware);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/notifications", notificationRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Global error handler (should be after routes)
app.use(errorHandler);

export default app;
