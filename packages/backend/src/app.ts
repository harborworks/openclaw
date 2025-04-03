import cors from "cors";
import express from "express";
import { authMiddleware, errorHandler } from "./middlewares";
import helloRoutes from "./routes/helloRoutes";
import itemRoutes from "./routes/itemRoutes";
import jobRoutes from "./routes/jobRoutes";
import membershipRoutes from "./routes/membershipRoutes";
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
app.use("/api/memberships", membershipRoutes);
app.use("/api", jobRoutes);

// Global error handler (should be after routes)
app.use(errorHandler);

export default app;
