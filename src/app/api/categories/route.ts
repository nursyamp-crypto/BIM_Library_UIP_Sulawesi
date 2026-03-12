import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/categories - List all categories
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
        orderBy: { name: "asc" },
        include: {
            _count: {
                select: { models: true },
            },
        },
    });

    return NextResponse.json({ categories });
}

// POST /api/categories - Create category (admin only)
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { name, description } = await req.json();

        if (!name) {
            return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });
        }

        const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

        const category = await prisma.category.create({
            data: { name, slug, description: description || "" },
        });

        return NextResponse.json({ category }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Kategori sudah ada" }, { status: 400 });
    }
}
