import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const totalUsers = await prisma.user.count();
        const pendingUsers = await prisma.user.count({ where: { approved: false } });
        const totalModels = await prisma.model3D.count();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentActivities = await prisma.auditLog.count({
            where: { createdAt: { gte: thirtyDaysAgo } }
        });
        
        // Count activities by type
        const actionCounts = await prisma.auditLog.groupBy({
            by: ['action'],
            _count: { action: true },
        });

        return NextResponse.json({
            stats: {
                totalUsers,
                pendingUsers,
                totalModels,
                recentActivities,
                actionCounts
            }
        });
    } catch (e) {
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
