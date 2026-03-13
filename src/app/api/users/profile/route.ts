import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// GET /api/users/profile - Fetch current user profile
export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || !(session.user as any)?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: (session.user as any).id },
            select: {
                id: true,
                email: true,
                username: true,
                avatar: true,
                role: true,
                fullName: true,
                birthPlace: true,
                birthDate: true,
                address: true,
                division: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ user });
    } catch (error) {
        console.error("Profile fetch error:", error);
        return NextResponse.json({ error: "Gagal mengambil data profil" }, { status: 500 });
    }
}

// PATCH /api/users/profile - Update user profile
export async function PATCH(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session || !(session.user as any)?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const username = formData.get("username") as string | null;
        const password = formData.get("password") as string | null;
        const avatarFile = formData.get("avatar") as File | null;

        // New identity fields
        const fullName = formData.get("fullName") as string | null;
        const birthPlace = formData.get("birthPlace") as string | null;
        const birthDate = formData.get("birthDate") as string | null;
        const address = formData.get("address") as string | null;
        const division = formData.get("division") as string | null;

        const userId = (session.user as any).id;

        const updateData: any = {};

        if (username) {
            // Check if username is already taken by someone else
            const existingUser = await prisma.user.findFirst({
                where: {
                    username,
                    NOT: { id: userId }
                }
            });

            if (existingUser) {
                return NextResponse.json(
                    { error: "Username sudah digunakan oleh pengguna lain" },
                    { status: 400 }
                );
            }
            updateData.username = username;
        }

        if (password) {
            if (password.length < 6) {
                return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
            }
            const hashedPassword = await bcrypt.hash(password, 12);
            updateData.password = hashedPassword;
        }

        if (avatarFile && avatarFile.size > 0) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!validTypes.includes(avatarFile.type)) {
                return NextResponse.json({ error: "Format gambar tidak didukung (gunakan JPG, PNG, atau WEBP)" }, { status: 400 });
            }

            // Generate unique filename
            const ext = avatarFile.name.split('.').pop() || 'png';
            const fileName = `${userId}-${crypto.randomBytes(4).toString("hex")}.${ext}`;

            // Convert to buffer
            const buffer = Buffer.from(await avatarFile.arrayBuffer());

            // Upload directly to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, buffer, {
                    contentType: avatarFile.type,
                    upsert: true
                });

            if (uploadError) {
                console.error("Supabase Upload Error:", uploadError);
                return NextResponse.json({ error: "Gagal mengunggah gambar ke cloud storage" }, { status: 500 });
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            updateData.avatar = publicUrl;
        }

        // Identity fields — allow setting to empty string (clearing)
        if (fullName !== null) updateData.fullName = fullName || null;
        if (birthPlace !== null) updateData.birthPlace = birthPlace || null;
        if (birthDate !== null) updateData.birthDate = birthDate ? new Date(birthDate) : null;
        if (address !== null) updateData.address = address || null;
        if (division !== null) updateData.division = division || null;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ message: "Tidak ada perubahan" });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

        return NextResponse.json({
            message: "Profil berhasil diperbarui",
            user: {
                username: updatedUser.username,
                avatar: updatedUser.avatar,
                fullName: updatedUser.fullName,
                birthPlace: updatedUser.birthPlace,
                birthDate: updatedUser.birthDate,
                address: updatedUser.address,
                division: updatedUser.division,
            }
        });

    } catch (error) {
        console.error("Profile update error:", error);
        return NextResponse.json(
            { error: "Gagal memperbarui profil" },
            { status: 500 }
        );
    }
}
