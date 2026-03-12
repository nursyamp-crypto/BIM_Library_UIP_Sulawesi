import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const registerSchema = z.object({
    email: z.string().email("Email tidak valid"),
    username: z.string().min(3, "Username minimal 3 karakter").max(30),
    password: z.string().min(6, "Password minimal 6 karakter"),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, username, password } = registerSchema.parse(body);

        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { username }],
            },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Email atau username sudah digunakan" },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
                role: "USER",
            },
        });

        return NextResponse.json(
            {
                message: "Registrasi berhasil",
                user: { id: user.id, email: user.email, username: user.username },
            },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: (error as any).errors[0].message },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: "Terjadi kesalahan server" },
            { status: 500 }
        );
    }
}
