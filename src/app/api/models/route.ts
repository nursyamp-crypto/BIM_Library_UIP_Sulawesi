import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateFileType, validateFileSize, sanitizeFilename, getFileExtension, createAuditLog } from "@/lib/utils";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// GET /api/models - List models with search, filter, sort, pagination
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const format = searchParams.get("format") || "";
    const uploader = searchParams.get("uploader") || "";
    const sort = searchParams.get("sort") || "newest";

    const where: any = {};

    if (search) {
        where.OR = [
            { title: { contains: search } },
            { description: { contains: search } },
        ];
    }

    if (category) {
        where.categoryId = category;
    }

    if (format) {
        where.fileFormat = format;
    }

    if (uploader) {
        where.uploaderId = uploader;
    }

    let orderBy: any = {};
    switch (sort) {
        case "newest":
            orderBy = { createdAt: "desc" };
            break;
        case "oldest":
            orderBy = { createdAt: "asc" };
            break;
        case "name":
            orderBy = { title: "asc" };
            break;
        case "popular":
            orderBy = { downloadCount: "desc" };
            break;
        case "size":
            orderBy = { fileSize: "desc" };
            break;
        default:
            orderBy = { createdAt: "desc" };
    }

    const skip = (page - 1) * limit;

    const [models, total] = await Promise.all([
        prisma.model3D.findMany({
            where,
            orderBy,
            skip,
            take: limit,
            include: {
                category: true,
                uploader: {
                    select: { id: true, username: true, email: true },
                },
                tags: {
                    include: { tag: true },
                },
            },
        }),
        prisma.model3D.count({ where }),
    ]);

    return NextResponse.json({
        models,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
}

// POST /api/models - Upload a new model
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const title = formData.get("title") as string;
        const description = (formData.get("description") as string) || "";
        const categoryId = (formData.get("categoryId") as string) || null;
        const tagsStr = (formData.get("tags") as string) || "";
        const thumbnail = formData.get("thumbnail") as File | null;
        const latStr = formData.get("latitude") as string | null;
        const lngStr = formData.get("longitude") as string | null;
        const latitude = latStr ? parseFloat(latStr) : null;
        const longitude = lngStr ? parseFloat(lngStr) : null;

        if (!file || !title) {
            return NextResponse.json(
                { error: "File dan judul wajib diisi" },
                { status: 400 }
            );
        }

        // Validate file type
        if (!validateFileType(file.name)) {
            return NextResponse.json(
                { error: "Tipe file tidak didukung. Format yang diperbolehkan: .skp, .obj, .fbx, .stl, .glb, .gltf, .ifc, .rvt, .rfa" },
                { status: 400 }
            );
        }

        // Validate file size
        if (!validateFileSize(file.size)) {
            return NextResponse.json(
                { error: "Ukuran file melebihi batas maksimum (100MB)" },
                { status: 400 }
            );
        }

        // Create upload directory
        const uploadDir = path.join(process.cwd(), "uploads", "models");
        await mkdir(uploadDir, { recursive: true });

        // Generate unique filename
        const fileId = uuidv4();
        const ext = getFileExtension(file.name);
        const safeOriginalName = sanitizeFilename(file.name);
        const fileName = `${fileId}${ext}`;
        const filePath = path.join(uploadDir, fileName);

        // Write file
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filePath, buffer);

        // Handle thumbnail
        let thumbnailPath: string | null = null;
        if (thumbnail && thumbnail.size > 0) {
            const thumbDir = path.join(process.cwd(), "uploads", "thumbnails");
            await mkdir(thumbDir, { recursive: true });
            const thumbExt = getFileExtension(thumbnail.name);
            const thumbFileName = `${fileId}${thumbExt}`;
            const thumbPath = path.join(thumbDir, thumbFileName);
            const thumbBuffer = Buffer.from(await thumbnail.arrayBuffer());
            await writeFile(thumbPath, thumbBuffer);
            thumbnailPath = `/api/uploads/thumbnails/${thumbFileName}`;
        }

        // Parse tags
        const tagNames = tagsStr
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean);

        // Create model record
        const model = await prisma.model3D.create({
            data: {
                title,
                description,
                fileName,
                originalName: safeOriginalName,
                filePath: `/api/uploads/models/${fileName}`,
                fileSize: file.size,
                fileFormat: ext,
                thumbnailPath,
                latitude: latitude && !isNaN(latitude) ? latitude : null,
                longitude: longitude && !isNaN(longitude) ? longitude : null,
                categoryId: categoryId || undefined,
                uploaderId: (session.user as any).id,
                tags: {
                    create: await Promise.all(
                        tagNames.map(async (tagName: string) => {
                            const tag = await prisma.tag.upsert({
                                where: { name: tagName.toLowerCase() },
                                update: {},
                                create: { name: tagName.toLowerCase() },
                            });
                            return { tagId: tag.id };
                        })
                    ),
                },
            },
            include: {
                category: true,
                uploader: {
                    select: { id: true, username: true },
                },
                tags: {
                    include: { tag: true },
                },
            },
        });

        // Audit log
        await createAuditLog(
            (session.user as any).id,
            "UPLOAD",
            "MODEL",
            model.id,
            `Uploaded model: ${title}`
        );

        return NextResponse.json({ model }, { status: 201 });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: "Gagal mengupload file" },
            { status: 500 }
        );
    }
}
