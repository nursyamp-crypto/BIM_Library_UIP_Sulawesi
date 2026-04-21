import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
    try {
        const { email, otpCode, newPassword } = await req.json();

        if (!email || !otpCode || !newPassword) {
            return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
        }

        // Check if user exists
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return NextResponse.json({ error: "Email tidak terdaftar" }, { status: 404 });
        }

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

        // Hash new password and update
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        // Clean up OTP
        await prisma.oTP.deleteMany({ where: { email } });

        return NextResponse.json({ success: true, message: "Password berhasil diubah" });
    } catch (error) {
        console.error("Reset password error:", error);
        return NextResponse.json({ error: "Gagal mereset password" }, { status: 500 });
    }
}
