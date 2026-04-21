import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/utils";
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
            held: true,
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
                approved: true,
            },
        });

        await createAuditLog(
            (session.user as any).id,
            "CREATE_USER",
            "USER",
            user.id,
            `Created user: ${username} (${email}) with role ${user.role}`
        );

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

    // Get user info before deleting for audit log
    const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, email: true },
    });

    await prisma.user.delete({ where: { id: userId } });

    await createAuditLog(
        (session.user as any).id,
        "DELETE_USER",
        "USER",
        userId,
        `Deleted user: ${targetUser?.username} (${targetUser?.email})`
    );

    return NextResponse.json({ message: "User berhasil dihapus" });
}

// PATCH /api/admin/users - Toggle user approval or change role
export async function PATCH(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id, approved, role, held } = await req.json();

        if (!id) {
            return NextResponse.json({ error: "User ID required" }, { status: 400 });
        }

        // Don't allow changing your own status
        if (id === (session.user as any).id) {
            return NextResponse.json(
                { error: "Tidak bisa mengubah status diri sendiri" },
                { status: 400 }
            );
        }

        const updateData: any = {};
        if (approved !== undefined) {
            updateData.approved = approved;
        }
        if (role !== undefined) {
            updateData.role = role;
        }
        if (held !== undefined) {
            updateData.held = held;
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
        });

        // Audit log
        if (role !== undefined) {
            await createAuditLog(
                (session.user as any).id,
                "CHANGE_ROLE",
                "USER",
                id,
                `Changed role of ${user.username} to ${role}`
            );
        }
        if (approved !== undefined) {
            await createAuditLog(
                (session.user as any).id,
                approved ? "APPROVE_USER" : "REMOVE_USER",
                "USER",
                id,
                `${approved ? "Approved" : "Removed"} user: ${user.username}`
            );
        }
        if (held !== undefined) {
            await createAuditLog(
                (session.user as any).id,
                held ? "HOLD_USER" : "UNHOLD_USER",
                "USER",
                id,
                `${held ? "Held (suspended)" : "Unhold (reactivated)"} user: ${user.username}`
            );
        }

        return NextResponse.json({ message: "Status user berhasil diubah", user });
    } catch (error) {
        return NextResponse.json(
            { error: "Gagal mengubah status user" },
            { status: 500 }
        );
    }
}
