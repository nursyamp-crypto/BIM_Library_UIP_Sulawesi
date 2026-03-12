import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = "nursyamp@gmail.com";
  let user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    user = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN', approved: true },
    });
    console.log(`Updated existing user ${email} to ADMIN.`);
  } else {
    const hashedPassword = await bcrypt.hash('password123', 10);
    user = await prisma.user.create({
      data: {
        email,
        username: "nursyamp",
        password: hashedPassword,
        role: "ADMIN",
        approved: true,
        fullName: "Admin Nursyam",
      },
    });
    console.log(`Created new admin user ${email} with password "password123".`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
