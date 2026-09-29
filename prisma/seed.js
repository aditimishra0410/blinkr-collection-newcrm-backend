import prisma from "../src/lib/prisma.js";
import bcrypt from "bcrypt";

const role = await prisma.role.upsert({
  where: { role_name:  "COLLECTION-EXECUTIVE" },
  update: {},
    create: { role_name: "COLLECTION-EXECUTIVE" },
});
console.log("Role ready:", role);
const hashedPassword = await bcrypt.hash("Test@123", 10);

const employee = await prisma.employee.upsert({
  where: { email: "test.exec@example.com" },
  update: { password: hashedPassword },
  create: {
    emp_id: "EMP-TEST-001",
    email: "test.exec@example.com",
    password: hashedPassword,
    f_name: "Test",
    l_name: "Executive",
    gender: "F",
    is_logged_in: false,
  }
})
await prisma.employee_Role.upsert({
  where: {
    employee_id_role_id: { employee_id: employee.id, role_id: role.id },
  },
  update: {},
  create: { employee_id: employee.id, role_id: role.id },
});
console.log("Role assigned:", employee.email, "→", role.role_name);
console.log("Employee ready:", employee.id, employee.email);
await prisma.$disconnect();