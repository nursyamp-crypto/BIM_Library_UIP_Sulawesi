import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET /api/admin/users - List all users (admin only)
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            username: true,
            role: true,
            approved: true,
            createdAt: true,
            _count: {
                select: { models: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
}

// POST /api/admin/users - Create user (admin only)
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { email, username, password, role } = await req.json();

        if (!email || !username || !password) {
            return NextResponse.json(
                { error: "Semua field wajib diisi" },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
                role: role || "USER",
                approved: true, // Auto decide that admin creations are approved
            },
        });

        return NextResponse.json(
            {
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: "Email atau username sudah digunakan" },
            { status: 400 }
        );
    }
}

// DELETE /api/admin/users - Delete user (admin only)
export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("id");

    if (!userId) {
        return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Don't allow deleting yourself
    if (userId === (session.user as any).id) {
        return NextResponse.json(
            { error: "Tidak bisa menghapus akun sendiri" },
            { status: 400 }
        );
    }

    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ message: "User berhasil dihapus" });
}

// PATCH /api/admin/users - Toggle user approval
export async function PATCH(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id, approved } = await req.json();

        if (!id) {
            return NextResponse.json({ error: "User ID required" }, { status: 400 });
        }

        // Don't allow changing your own approval status
        if (id === (session.user as any).id) {
            return NextResponse.json(
                { error: "Tidak bisa mengubah status diri sendiri" },
                { status: 400 }
            );
        }

        const user = await prisma.user.update({
            where: { id },
            data: { approved },
        });

        return NextResponse.json({ message: "Status user berhasil diubah", user });
    } catch (error) {
        return NextResponse.json(
            { error: "Gagal mengubah status user" },
            { status: 500 }
        );
    }
}

