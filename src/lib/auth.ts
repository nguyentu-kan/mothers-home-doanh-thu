import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function findActiveUserByUsername(username: string) {
  return prisma.user.findFirst({
    where: { username, active: true },
  });
}

export async function listActiveUsersForLogin() {
  return prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, username: true },
    orderBy: { name: "asc" },
  });
}
