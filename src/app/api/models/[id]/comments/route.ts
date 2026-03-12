import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/models/[id]/comments - Get comments for a model
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const comments = await prisma.comment.findMany({
            where: { modelId: id },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        role: true,
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return NextResponse.json({ comments });
    } catch (error) {
        return NextResponse.json({ error: "Gagal mengambil komentar" }, { status: 500 });
    }
}

// POST /api/models/[id]/comments - Add a new comment
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const { content } = await req.json();
        const userId = (session.user as any).id;

        if (!content || content.trim() === "") {
            return NextResponse.json({ error: "Komentar tidak boleh kosong" }, { status: 400 });
        }

        // Verify model exists
        const model = await prisma.model3D.findUnique({ where: { id } });
        if (!model) {
            return NextResponse.json({ error: "Model tidak ditemukan" }, { status: 404 });
        }

        const comment = await prisma.comment.create({
            data: {
                content: content.trim(),
                modelId: id,
                userId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        role: true,
                    }
                }
            }
        });

        return NextResponse.json({ comment }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Gagal menambahkan komentar" }, { status: 500 });
    }
}
