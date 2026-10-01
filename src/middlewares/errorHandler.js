import logger from "../lib/logger.js";
import ApiError from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isOurError = err instanceof ApiError || statusCode < 500;
  const message = isOurError ? err.message : "Internal Server Error";

  if (statusCode >= 500) {
    logger.error(err.message, { path: req.originalUrl, stack: err.stack });
  } else {
    logger.error(err.message, { path: req.originalUrl });
  }
  res.status(statusCode).json({
    success: false,
    message,
  });
};
export default errorHandler;
