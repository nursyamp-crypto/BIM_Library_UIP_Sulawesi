import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/utils";
import { readFile } from "fs/promises";
import path from "path";

// GET /api/models/[id]/download - Download model file
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const model = await prisma.model3D.findUnique({ where: { id } });

    if (!model) {
        return NextResponse.json({ error: "Model tidak ditemukan" }, { status: 404 });
    }

    try {
        const filePath = path.join(process.cwd(), "uploads", "models", model.fileName);
        const fileBuffer = await readFile(filePath);

        // Increment download count
        await prisma.model3D.update({
            where: { id },
            data: { downloadCount: { increment: 1 } },
        });

        // Audit log
        await createAuditLog(
            (session.user as any).id,
            "DOWNLOAD",
            "MODEL",
            id,
            `Downloaded model: ${model.title}`
        );

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": "application/octet-stream",
                "Content-Disposition": `attachment; filename="${model.originalName}"`,
                "Content-Length": model.fileSize.toString(),
            },
        });
    } catch (error) {
        return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
    }
}
