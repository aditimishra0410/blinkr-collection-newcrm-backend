import ApiError from "../utils/ApiError.js";
import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";
import env from "../config/env.js";

export async function authenticate(req, res, next) {
  let token = req.cookies?.employee_jwt;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }
  if (!token) {
    throw new ApiError(401, "Not authorised. Please login");
  }

  let decode;
  try {
    decode = jwt.verify(token, env.crmJwt);
  } catch (error) {
    throw new ApiError(401, "Invalid or expired token.");
  }
  const employee = await prisma.employee.findUnique({
    where: { id: decode.id },
    include: { roles: { include: { role: true } } },
  });
  if (!employee || !employee.is_active) {
    throw new ApiError(401, "Employee not found or inactive.");
  }
  req.employee = {
    id: employee.id,
    email: employee.email,
    f_name: employee.f_name,
    l_name: employee.l_name,
    roles: employee.roles.map((r) => r.role.role_name),
  };

  next();
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const hasRole = req.employee.roles.some((role) =>
      allowedRoles.includes(role),
    );
    if (!hasRole) {
      throw new ApiError(403, "Access denied. Insufficient permissions.");
    }
    next();
  };
}
