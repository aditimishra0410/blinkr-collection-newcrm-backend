import ApiError from "../utils/ApiError.js";

export function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body ?? {}, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const message = error.details.map((d) => d.message).join(", ");
      throw new ApiError(400, message);
    }
    req.body = value;
    next();
  }
}