import cors from "cors";
import express from "express";
import { authMiddleware } from "./middlewares/authMiddleware.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import adminRoutes from "./routes/adminRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import orgRoutes from "./routes/orgRoutes.js";
import secretRoutes from "./routes/secretRoutes.js";

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(authMiddleware);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/orgs", orgRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/secrets", secretRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Global error handler (should be after routes)
app.use(errorHandler);

export default app;
