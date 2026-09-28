import app from "./app.js";
import env from "./config/env.js";
import logger from "./lib/logger.js";
import prisma from "./lib/prisma.js";

try {
  await prisma.$connect()
  logger.info("Database Connected")
} catch (error) {
  logger.error("Database connection failed", {reason: error.message})
  process.exit(1);
}
const server = app.listen(env.port, () => {
  logger.info(`Server is running on port ${env.port}`)
})

let shutdownWindow = false
function shutdown(signal) {
  if (shutdownWindow) return
  shutdownWindow = true
  logger.info(`Received signal ${signal}, shutting down`)
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("Database disconnected")
    process.exit(0);
  })
}

process.on("SIGINT", () => shutdown("SIGINT"))
process.on("SIGTERM", () => shutdown("SIGTERM"))
