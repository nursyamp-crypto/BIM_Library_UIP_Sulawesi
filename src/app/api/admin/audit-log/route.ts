import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/audit-log - List audit logs (admin only)
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const targetType = searchParams.get("targetType");
    const userId = searchParams.get("userId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");

    // Build where clause
    const where: any = {};

    if (action) {
        where.action = { contains: action, mode: "insensitive" };
    }
    if (targetType) {
        where.targetType = { equals: targetType, mode: "insensitive" };
    }
    if (userId) {
        where.userId = userId;
    }
    if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) {
            const end = new Date(dateTo);
            end.setHours(23, 59, 59, 999);
            where.createdAt.lte = end;
        }
    }
    if (search) {
        where.details = { contains: search, mode: "insensitive" };
    }

    const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
            user: {
                select: { id: true, username: true, email: true },
            },
        },
    });

    // Also return distinct values for filter dropdowns
    const distinctActions = await prisma.auditLog.findMany({
        select: { action: true },
        distinct: ["action"],
        orderBy: { action: "asc" },
    });

    const distinctTargetTypes = await prisma.auditLog.findMany({
        select: { targetType: true },
        distinct: ["targetType"],
        orderBy: { targetType: "asc" },
    });

    const distinctUsers = await prisma.auditLog.findMany({
        select: {
            userId: true,
            user: { select: { username: true } },
        },
        distinct: ["userId"],
    });

    return NextResponse.json({
        logs,
        filterOptions: {
            actions: distinctActions.map((a) => a.action),
            targetTypes: distinctTargetTypes.map((t) => t.targetType),
            users: distinctUsers.map((u) => ({ id: u.userId, username: u.user.username })),
        },
    });
}
