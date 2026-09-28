import { PrismaClient } from "@prisma/client";
import { log, warn } from "winston";

const prisma = new PrismaClient();

new PrismaClient({ log: ["Warn", "error"] })

