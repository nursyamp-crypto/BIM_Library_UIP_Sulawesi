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
        { name: "Architecture", slug: "architecture", description: "Architectural models and buildings" },
        { name: "Furniture", slug: "furniture", description: "Interior furniture and fixtures" },
        { name: "Mechanical", slug: "mechanical", description: "Mechanical parts and assemblies" },
        { name: "Nature", slug: "nature", description: "Trees, plants, and natural elements" },
        { name: "Vehicles", slug: "vehicles", description: "Cars, trucks, and transportation" },
        { name: "Characters", slug: "characters", description: "Human and character models" },
        { name: "Electronics", slug: "electronics", description: "Electronic devices and gadgets" },
        { name: "Infrastructure", slug: "infrastructure", description: "Roads, bridges, and infrastructure" },
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
