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
const locationCount = await prisma.location.count();
if (locationCount === 0) {
  await prisma.location.createMany({
    data: [
      { region: "North", state: "Delhi", city: "New Delhi", pincode: "110001" },
      { region: "North", state: "Delhi", city: "New Delhi", pincode: "110002" },
      { region: "North", state: "Uttar Pradesh", city: "Lucknow", pincode: "226001" },
      { region: "North", state: "Uttar Pradesh", city: "Noida", pincode: "201301" },
      { region: "West", state: "Maharashtra", city: "Mumbai", pincode: "400001" },
      { region: "West", state: "Maharashtra", city: "Pune", pincode: "411001" },
      { region: "West", state: "Maharashtra", city: "Pune", pincode: "411002", status: false },
    ],
  });
}
console.log("Locations ready:", await prisma.location.count());