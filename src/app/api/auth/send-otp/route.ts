import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
        }

        // Validate if user exists (for registration, they shouldn't exist yet, but for password reset they should)
        // We'll pass action: 'register' or 'reset'
        // For simplicity now, let's just generate the OTP.

        // Generate 6 digit OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Expires in 15 minutes
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        // Delete old OTPs for this email to prevent spam
        await prisma.oTP.deleteMany({
            where: { email }
        });

        await prisma.oTP.create({
            data: {
                email,
                code,
                expiresAt,
            }
        });

        // Send Email
        const html = `
            <h2>Verifikasi OTP</h2>
            <p>Gunakan kode OTP berikut untuk melanjutkan proses:</p>
            <h1 style="background: #f1f5f9; padding: 10px; display: inline-block; letter-spacing: 2px;">${code}</h1>
            <p>Kode ini berlaku selama 15 menit.</p>
        `;

        await sendEmail({
            to: email,
            subject: "Kode OTP Verifikasi Anda",
            html
        });

        return NextResponse.json({ success: true, message: "OTP berhasil dikirim ke email" });
    } catch (error) {
        console.error("Send OTP error:", error);
        return NextResponse.json({ error: "Gagal mengirim OTP" }, { status: 500 });
    }
}
