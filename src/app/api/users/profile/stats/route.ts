import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || !(session.user as any)?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    try {
        // 1. Get user's models
        const models = await prisma.model3D.findMany({
            where: { uploaderId: userId },
            select: { id: true, title: true, downloadCount: true }
        });

        const modelIds = models.map(m => m.id);
        const totalDownloads = models.reduce((acc, m) => acc + m.downloadCount, 0);

        // 2. Get comments on these models
        const comments = await prisma.comment.findMany({
            where: { modelId: { in: modelIds } },
            include: { 
                user: { select: { id: true, username: true, avatar: true } },
                model: { select: { id: true, title: true } } // Include model info for linking
            },
            orderBy: { createdAt: 'asc' }
        });

        const totalComments = comments.length;
        
        // Unique commenters
        const uniqueCommentersMap = new Map();
        comments.forEach(c => {
            if (!uniqueCommentersMap.has(c.userId)) {
                uniqueCommentersMap.set(c.userId, c.user);
            }
        });
        const commenters = Array.from(uniqueCommentersMap.values());

        // Comment frequency (group by date)
        const commentFrequencyMap = new Map();
        comments.forEach(c => {
            const dateStr = c.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
            if (!commentFrequencyMap.has(dateStr)) {
                commentFrequencyMap.set(dateStr, { count: 0, details: [] });
            }
            const record = commentFrequencyMap.get(dateStr);
            record.count += 1;
            record.details.push({
                id: c.id,
                text: c.content,
                modelId: c.model.id,
                modelTitle: c.model.title,
                username: c.user?.username || "Unknown"
            });
        });
        
        const commentFrequency = Array.from(commentFrequencyMap.entries()).map(([date, data]: any) => ({ 
            date, 
            count: data.count,
            details: data.details
        }));

        // 3. Get download logs for these models
        const downloadLogs = await prisma.auditLog.findMany({
            where: { targetType: "MODEL", action: "DOWNLOAD", targetId: { in: modelIds } },
            include: { user: { select: { id: true, username: true } } },
            orderBy: { createdAt: 'asc' }
        });

        // Unique downloaders
        const uniqueDownloadersMap = new Set(downloadLogs.map(log => log.userId));
        const totalUniqueDownloaders = uniqueDownloadersMap.size;

        // Download frequency (group by date)
        const downloadFrequencyMap = new Map();
        downloadLogs.forEach(log => {
            const dateStr = log.createdAt.toISOString().split('T')[0];
            if (!downloadFrequencyMap.has(dateStr)) {
                downloadFrequencyMap.set(dateStr, { count: 0, details: [] });
            }
            const record = downloadFrequencyMap.get(dateStr);
            record.count += 1;
            record.details.push({
                id: log.id,
                username: log.user?.username || "Guest",
                modelTitle: models.find(m => m.id === log.targetId)?.title || "Unknown Model",
                modelId: log.targetId,
                text: "Download Model"
            });
        });
        
        const downloadFrequency = Array.from(downloadFrequencyMap.entries()).map(([date, data]: any) => ({ 
            date, 
            count: data.count,
            details: data.details
        }));

        // IPs for map
        const uniqueIPs = new Set(downloadLogs.map(log => log.ipAddress).filter(Boolean));
        
        // Note: For a real map we would resolve these IPs to coordinates (e.g. using ip-api.com).
        // Since we are mocking/limiting external API calls, we'll return the IPs. The frontend can resolve them or we can send some mock coordinates.
        // We will generate rough unique mock coordinates for demonstration if IP resolving isn't available.
        const mapLocations = Array.from(uniqueIPs).map((ip, index) => ({
            ip,
            lat: -5.1476 + (Math.random() * 0.1 - 0.05), // near Makassar
            lng: 119.4327 + (Math.random() * 0.1 - 0.05)
        }));

        return NextResponse.json({
            stats: {
                totalModels: models.length,
                totalDownloads,
                totalComments,
                totalUniqueDownloaders,
            },
            commenters,
            commentFrequency,
            downloadFrequency,
            mapLocations
        });
    } catch (error) {
        console.error("Profile stats fetch error:", error);
        return NextResponse.json({ error: "Gagal mengambil statistik" }, { status: 500 });
    }
}
