import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import errorHandler from "./middlewares/errorHandler.js";
import ApiError from "./utils/ApiError.js";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

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

// app.use((req, res) => {
//   res.status(404).json({
//     message: "Route not found " + req.originalUrl,
//     timestamp: new Date().toISOString(),
//     success: false,
//   });
// });

// app.use((req, res, next) => {
//   next(new ApiError(404, "Route not found" + req.originalUrl));
// });
// app.use(errorHandler);

app.get("/boom", (req, res) => {
  throw new ApiError(500, "somthing broken");
});

app.use((req, res, next) => {
  next(new ApiError(404, "Route not found" + req.originalUrl));
});

app.use(errorHandler)
export default app;
