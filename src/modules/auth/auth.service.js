import prisma from "../../lib/prisma.js";
import ApiError from "../../utils/ApiError.js";
import bcrypt from "bcrypt";
import env from "../../config/env.js";
import jsonwebtoken from "jsonwebtoken";


const ALLOWED_ROLES = [
  "COLLECTION-HEAD",
  "COLLECTION-EXECUTIVE",
  "ADMIN",
  "ACM",
];
export async function login(email, password) {
  const employee = await prisma.employee.findUnique({
    where: { email },
    include: { roles: { include: { role: true } } },
  });
  if (employee === null) {
    throw new ApiError(404, "Employee not found.");
  }
  const roleNames = employee.roles.map((r) => r.role.role_name);
  if (!ALLOWED_ROLES.some((r) => roleNames.includes(r))) {
    throw new ApiError(403, "Access denied. Insufficient permissions.");
  }

  if (!employee.password) {
    throw new ApiError(401, "Invalid credentials.");
  }

  const isValidPassword = await bcrypt.compare(password, employee.password);
  if (!isValidPassword) {
    throw new ApiError(401, "Invalid credentials.");
  }

  await prisma.employee.update({
    where: { id: employee.id },
    data: {
      is_logged_in: true,
      last_logged_in: new Date(),
    },
  });
  const payload = {
    id: employee.id,
    email: employee.email,
    roles: roleNames
  };
  const token = jsonwebtoken.sign(payload, env.crmJwt, { expiresIn: "2d" })
   return { token, employee, roles: roleNames };
}
