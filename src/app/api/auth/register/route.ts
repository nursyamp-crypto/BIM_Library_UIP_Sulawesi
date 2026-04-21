import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/utils";
import { z } from "zod";

const registerSchema = z.object({
    email: z.string().email("Email tidak valid"),
    username: z.string().min(3, "Username minimal 3 karakter").max(30),
    password: z.string().min(6, "Password minimal 6 karakter"),
    otpCode: z.string().length(6, "Kode OTP harus 6 karakter"),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, username, password, otpCode } = registerSchema.parse(body);

        // Verify OTP
        const otpRecord = await prisma.oTP.findFirst({
            where: { email, code: otpCode },
            orderBy: { createdAt: "desc" }
        });

        if (!otpRecord) {
            return NextResponse.json({ error: "Kode OTP salah" }, { status: 400 });
        }

        if (otpRecord.expiresAt < new Date()) {
            return NextResponse.json({ error: "Kode OTP kadaluarsa" }, { status: 400 });
        }

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

        // Extract IP and MAC (User-Agent since real MAC isn't available)
        const ipAddress = req.headers.get("x-forwarded-for") || "Unknown IP";
        const userAgent = req.headers.get("user-agent") || "Unknown Device";

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
                role: "USER",
                ipAddress,
                userAgent,
            },
        });

        // Clean up OTP
        await prisma.oTP.deleteMany({ where: { email } });

        // Audit log
        await createAuditLog(
            user.id,
            "REGISTER",
            "USER",
            user.id,
            `New user registered. IP: ${ipAddress}, Agent: ${userAgent}`
        );

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
