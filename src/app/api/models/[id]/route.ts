import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/utils";
import { unlink } from "fs/promises";
import path from "path";

// GET /api/models/[id] - Get model detail
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const model = await prisma.model3D.findUnique({
        where: { id },
        include: {
            category: true,
            uploader: {
                select: { id: true, username: true, email: true },
            },
            tags: {
                include: { tag: true },
            },
            versions: {
                orderBy: { createdAt: "desc" }
            }
        },
    });

    if (!model) {
        return NextResponse.json({ error: "Model tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ model });
}

// DELETE /api/models/[id] - Delete model (admin or owner only)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const model = await prisma.model3D.findUnique({ where: { id } });

    if (!model) {
        return NextResponse.json({ error: "Model tidak ditemukan" }, { status: 404 });
    }

    // Only admin can delete models
    if (userRole !== "ADMIN") {
        return NextResponse.json({ error: "Hanya Admin yang dapat menghapus model" }, { status: 403 });
    }

    // Delete file from disk
    try {
        const filePath = path.join(process.cwd(), "uploads", "models", model.fileName);
        await unlink(filePath).catch(() => { });

        if (model.thumbnailPath) {
            const thumbName = model.thumbnailPath.split("/").pop();
            if (thumbName) {
                const thumbPath = path.join(process.cwd(), "uploads", "thumbnails", thumbName);
                await unlink(thumbPath).catch(() => { });
            }
        }
    } catch (e) {
        // File might not exist, continue
    }

    // Delete tags associations then model
    await prisma.modelTag.deleteMany({ where: { modelId: id } });
    await prisma.model3D.delete({ where: { id } });

    // Audit log
    await createAuditLog(userId, "DELETE", "MODEL", id, `Deleted model: ${model.title}`);

    return NextResponse.json({ message: "Model berhasil dihapus" });
}

// PATCH /api/models/[id] - Update model title
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const model = await prisma.model3D.findUnique({ where: { id } });
    if (!model) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const currentUser = session.user as any;
    if (currentUser.role !== "ADMIN" && model.uploaderId !== currentUser.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (body.title) {
        await prisma.model3D.update({
            where: { id },
            data: { title: body.title }
        });
        await createAuditLog(currentUser.id, "UPDATE", "MODEL", id, `Renamed model to: ${body.title}`);
    }

    return NextResponse.json({ success: true });
}

