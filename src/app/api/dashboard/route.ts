import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/dashboard - Get dashboard rankings / leaderboard data
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Top Uploaders: users with most models
        const topUploaders = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                avatar: true,
                role: true,
                _count: { select: { models: true } },
            },
            orderBy: { models: { _count: "desc" } },
            take: 3,
        });

        // Top Commenters: users with most comments
        const topCommenters = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                avatar: true,
                role: true,
                _count: { select: { comments: true } },
            },
            orderBy: { comments: { _count: "desc" } },
            take: 3,
        });

        // Most Popular Models: highest download count
        const popularModels = await prisma.model3D.findMany({
            select: {
                id: true,
                title: true,
                thumbnailPath: true,
                downloadCount: true,
                fileFormat: true,
                uploader: {
                    select: { id: true, username: true, avatar: true },
                },
            },
            orderBy: { downloadCount: "desc" },
            take: 3,
        });

        // Model locations for map (only models with coordinates)
        const modelLocations = await prisma.model3D.findMany({
            where: {
                latitude: { not: null },
                longitude: { not: null },
            },
            select: {
                id: true,
                title: true,
                fileFormat: true,
                latitude: true,
                longitude: true,
                createdAt: true,
                uploader: {
                    select: { id: true, username: true, avatar: true },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        });

        // Global stats
        const [totalUsers, totalModels, totalComments] = await Promise.all([
            prisma.user.count(),
            prisma.model3D.count(),
            prisma.comment.count(),
        ]);

        return NextResponse.json({
            topUploaders: topUploaders.map((u) => ({
                id: u.id,
                username: u.username,
                avatar: u.avatar,
                role: u.role,
                count: u._count.models,
            })),
            topCommenters: topCommenters.map((u) => ({
                id: u.id,
                username: u.username,
                avatar: u.avatar,
                role: u.role,
                count: u._count.comments,
            })),
            popularModels: popularModels.map((m) => ({
                id: m.id,
                title: m.title,
                thumbnailPath: m.thumbnailPath,
                downloadCount: m.downloadCount,
                fileFormat: m.fileFormat,
                uploader: m.uploader,
            })),
            globalStats: { totalUsers, totalModels, totalComments },
            modelLocations,
        });
    } catch (error) {
        console.error("Dashboard API error:", error);
        return NextResponse.json(
            { error: "Gagal mengambil data dashboard" },
            { status: 500 }
        );
    }
}
