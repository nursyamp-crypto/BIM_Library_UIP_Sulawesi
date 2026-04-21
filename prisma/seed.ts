import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();


async function main() {
    console.log("🌱 Seeding database...");

    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 12);
    const admin = await prisma.user.upsert({
        where: { email: "admin@warehouse.local" },
        update: {},
        create: {
            email: "admin@warehouse.local",
            username: "admin",
            password: adminPassword,
            role: "ADMIN",
            approved: true,
        },
    });
    console.log(`✅ Admin user created: ${admin.email}`);

    // Create demo user
    const userPassword = await bcrypt.hash("user123", 12);
    const user = await prisma.user.upsert({
        where: { email: "user@warehouse.local" },
        update: {},
        create: {
            email: "user@warehouse.local",
            username: "demouser",
            password: userPassword,
            role: "USER",
            approved: true,
        },
    });
    console.log(`✅ Demo user created: ${user.email}`);

    // Create categories
    const categories = [
        { name: "Arsitektur", slug: "arsitektur", description: "BIM models for architecture" },
        { name: "Struktur", slug: "struktur", description: "Structural elements and engineering" },
        { name: "Mekanikal", slug: "mekanikal", description: "Mechanical parts and assemblies (HVAC)" },
        { name: "Elektrikal", slug: "elektrikal", description: "Electrical grids, substations, and equipment" },
        { name: "Infrastruktur", slug: "infrastruktur", description: "Roads, bridges, and infrastructure" },
        { name: "Landscape", slug: "landscape", description: "Terrain, landscaping, and outdoor environments" },
    ];

    for (const cat of categories) {
        await prisma.category.upsert({
            where: { slug: cat.slug },
            update: {},
            create: cat,
        });
    }
    console.log(`✅ ${categories.length} categories created`);

    // Create tags
    const tags = ["modern", "classic", "industrial", "minimalist", "detailed", "low-poly", "high-poly", "textured", "animated", "BIM"];
    for (const tagName of tags) {
        await prisma.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName },
        });
    }
    console.log(`✅ ${tags.length} tags created`);

    console.log("🎉 Seeding complete!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
