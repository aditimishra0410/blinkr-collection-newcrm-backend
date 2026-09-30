import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import errorHandler from "./middlewares/errorHandler.js";
import ApiError from "./utils/ApiError.js";
import cors from "cors";
import env from "./config/env.js";
import { generalLimiter } from "./middlewares/rateLimiter.js";
import morgan from "morgan";
import logger from "./lib/logger.js";
import prisma from "./lib/prisma.js";
import authRoutes from "./modules/auth/auth.routes.js";


const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({
  origin: env.allowedOrigins,
  credentials: true,
}));

app.use(generalLimiter)

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(morgan("tiny", {
  stream: {
    write: (message) => {
      logger.info(message.trim());
    }
  }
}))
app.get("/", (req, res) => {
  res.send("Hello from new collection backend");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    success: true,
  });
});

app.get("/health/db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      message: "Database is healthy",
      timestamp: new Date().toISOString(),
      success: true,
    })
  } catch (error) {
    throw new ApiError(503, "Database is not reachable");
  }
});

 app.use("/api/v1/auth", authRoutes);

app.use((req, res, next) => {
  next(new ApiError(404, "Route not found " + req.originalUrl));
});

app.use(errorHandler)
export default app;
