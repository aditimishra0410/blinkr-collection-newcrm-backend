import joi from "joi";

export const loginSchema = joi.object({
  email: joi.string().trim().lowercase().email().required(),
  password: joi.string().required(),
});
