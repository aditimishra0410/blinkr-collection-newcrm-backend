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

app.get("/boom", (req, res) => {
  throw new ApiError(500, "somthing broken");
});

app.use((req, res, next) => {
  next(new ApiError(404, "Route not found " + req.originalUrl));
});

app.use(errorHandler)
export default app;
