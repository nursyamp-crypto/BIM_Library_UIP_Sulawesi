import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import crypto from "crypto";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const model = await prisma.model3D.findUnique({ where: { id } });
    if (!model) return NextResponse.json({ error: "Model not found" }, { status: 404 });

    const currentUser = session.user as any;
    if (currentUser.role !== "ADMIN" && model.uploaderId !== currentUser.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const glbFile = formData.get("glbFile") as File;
        const changeNote = formData.get("changeNote") as string;

        if (!file || !glbFile || !changeNote) {
            return NextResponse.json({ error: "File, glbFile, and changeNote required" }, { status: 400 });
        }

        // 1. Upload new file (using Supabase storage for simplicity, or we could use local fs)
        const ext = file.name.split('.').pop();
        const uniqueFileName = `${currentUser.id}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        const { data, error } = await supabase.storage
            .from("models")
            .upload(`replacements/${uniqueFileName}`, buffer, {
                contentType: file.type || "application/octet-stream",
            });

        if (error) {
            console.error("Upload error:", error);
            return NextResponse.json({ error: "Gagal upload file baru" }, { status: 500 });
        }

        const { data: { publicUrl } } = supabase.storage.from("models").getPublicUrl(`replacements/${uniqueFileName}`);

        // Upload GLB File
        const extGlb = glbFile.name.split('.').pop();
        const uniqueGlbFileName = `${currentUser.id}-glb-${crypto.randomBytes(8).toString('hex')}.${extGlb}`;
        const bufferGlb = Buffer.from(await glbFile.arrayBuffer());

        const { error: glbError } = await supabase.storage
            .from("models")
            .upload(`replacements/${uniqueGlbFileName}`, bufferGlb, {
                contentType: glbFile.type || "application/octet-stream",
            });

        if (glbError) {
            console.error("Upload GLB error:", glbError);
            return NextResponse.json({ error: "Gagal upload file GLB baru" }, { status: 500 });
        }

        const { data: { publicUrl: publicGlbUrl } } = supabase.storage.from("models").getPublicUrl(`replacements/${uniqueGlbFileName}`);

        // 2. Save current model data to ModelVersion history
        await prisma.modelVersion.create({
            data: {
                modelId: id,
                version: model.version,
                fileName: model.fileName,
                originalName: model.originalName,
                filePath: model.filePath,
                fileSize: model.fileSize,
                fileFormat: model.fileFormat,
                glbFilePath: model.glbFilePath,
                changeNote: changeNote,
            }
        });

        // 3. Update Model3D with new file and increment version
        await prisma.model3D.update({
            where: { id },
            data: {
                version: model.version + 1,
                fileName: uniqueFileName,
                originalName: file.name,
                filePath: publicUrl,
                fileSize: file.size,
                fileFormat: `.${ext}`,
                glbFilePath: publicGlbUrl,
                thumbnailPath: null, // Reset thumbnail to force regeneration metadata
            }
        });

        await createAuditLog(currentUser.id, "UPDATE", "MODEL", id, `Replaced model with v${model.version + 1}. Note: ${changeNote}`);

        return NextResponse.json({ success: true, version: model.version + 1 });
    } catch (e: any) {
        console.error("Replace model error:", e);
        return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
    }
}
