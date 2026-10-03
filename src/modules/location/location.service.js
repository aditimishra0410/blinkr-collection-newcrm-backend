import prisma from "../../lib/prisma.js";

export async function getStates() {
  const rows = await prisma.location.findMany({
    where: {
      status: true,
      state: { not: null },
      NOT: { state: "" },
    },
    distinct: ["state"],
    select: { state: true },
    orderBy: { state: "asc" },
  })
  return rows.map((row) => row.state);
}