import logger from "../lib/logger.js";


const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error"

  logger.error(err);
  res.status(statusCode).json({
    success: false,
    message,
  })
}
export default errorHandler;