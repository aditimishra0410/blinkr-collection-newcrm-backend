import rateLimit from "express-rate-limit";

export const generalLimiter = rateLimit({
  windowMs: 12 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,

})

export const loginLimiter = rateLimit({
  windowMs: 12 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: "Too many login attempts. Please try again after 12 minutes." },
})
