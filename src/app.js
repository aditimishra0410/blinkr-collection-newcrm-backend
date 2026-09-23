import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";

const app = express();
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.get("/", (req, res) => {
  res.send("Hello from new collection backend");
});
app.get("/health", (req, res) => {
  res.status(200).json(
    {
      message: "Server is healthy",
      timestamp: new Date().toISOString(),
      success: true
    }
  );
});

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found " + req.originalUrl,
    timestamp: new Date().toISOString(),
    success: false
  });
});



export default app;
