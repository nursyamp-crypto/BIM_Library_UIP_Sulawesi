import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/utils";

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

// POST /api/models - Create a new model record (after client-side upload)
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const {
            title,
            description,
            categoryId,
            tagsStr,
            fileUrl,
            fileName,
            originalName,
            fileSize,
            fileFormat,
            thumbnailUrl,
            glbFileUrl,
            latitude,
            longitude
        } = body;

        if (!fileUrl || !title || !fileName || !fileSize || !fileFormat) {
            return NextResponse.json(
                { error: "Data model tidak lengkap" },
                { status: 400 }
            );
        }

        // Parse tags
        const tagNames = (tagsStr || "")
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean);

        // Create model record
        const model = await prisma.model3D.create({
            data: {
                title,
                description: description || "",
                fileName,
                originalName: originalName || fileName,
                filePath: fileUrl,
                fileSize,
                fileFormat,
                thumbnailPath: thumbnailUrl || null,
                glbFilePath: glbFileUrl || null,
                latitude: latitude !== null && latitude !== undefined && !isNaN(latitude) ? latitude : null,
                longitude: longitude !== null && longitude !== undefined && !isNaN(longitude) ? longitude : null,
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
        console.error("Create model record error:", error);
        return NextResponse.json(
            { error: "Gagal menyimpan data model" },
            { status: 500 }
        );
    }
}

