import app from "./app.js";
import env from "./config/env.js"
import ApiError from "./utils/ApiError.js";

const server = app.listen(env.port, () => {
  console.log(`Server is running on port ${env.port}`)
})

function shutdown(signal) {
  console.log(`Received signal ${signal}, shutting down`)
  server.close(() => {
    process.exit(0);
  })
}

const testError = new ApiError(404, "test error");
// console.log("statusCode:", testError.statusCode);
// console.log("message:", testError.message);
// console.log(testError)
process.on("SIGINT", () => shutdown("SIGINT"))
process.on("SIGTERM", () => shutdown("SIGTERM"))
