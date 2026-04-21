"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, Key } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);
    
    // Steps: 1 = Enter Email, 2 = Enter OTP and New Password
    const [step, setStep] = useState(1);
    const router = useRouter();

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/auth/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error);
            } else {
                toast.success("Kode OTP telah dikirim ke email");
                setStep(2);
            }
        } catch (error) {
            toast.error("Terjadi kesalahan");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otpCode, newPassword }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error);
            } else {
                toast.success("Password berhasil diubah! Silakan login.");
                router.push("/login");
            }
        } catch (error) {
            toast.error("Terjadi kesalahan");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
            backgroundImage: "linear-gradient(rgba(10, 14, 26, 0.5), rgba(10, 14, 26, 0.8)), url('/bg-login.png?v=2')",
            backgroundSize: "cover", backgroundPosition: "center", padding: "20px", position: "relative",
        }}>
            <div className="fade-in" style={{ width: "100%", maxWidth: "420px" }}>
                <div style={{ textAlign: "center", marginBottom: "36px" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "28px" }}>
                        <img src="/pln-logo.svg?v=2" alt="PT PLN" style={{ height: "80px", objectFit: "contain", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }} />
                    </div>
                </div>

                <div className="glass-card" style={{ padding: "32px", position: "relative" }}>
                    <Link href="/login" style={{ position: "absolute", top: "24px", left: "24px", color: "var(--text-muted)", display: "flex", alignItems: "center", textDecoration: "none", fontSize: "12px" }}>
                        <ArrowLeft size={14} style={{ marginRight: "4px" }} /> Kembali
                    </Link>
                    
                    <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px", marginTop: "16px", textAlign: "center" }}>
                        Lupa Password?
                    </h2>
                    
                    {step === 1 ? (
                        <>
                            <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", marginBottom: "24px" }}>
                                Masukkan alamat email yang terdaftar, kami akan mengirimkan OTP untuk mereset password Anda.
                            </p>
                            <form onSubmit={handleRequestOtp}>
                                <div style={{ marginBottom: "24px" }}>
                                    <label className="label">Email</label>
                                    <input
                                        className="input"
                                        type="email"
                                        placeholder="nama@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "12px" }}>
                                    {loading ? <Loader2 size={18} className="spin" /> : "Kirim Kode OTP"}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", marginBottom: "24px" }}>
                                Kode OTP telah dikirim ke <b>{email}</b>. Masukkan kode tersebut dan password baru Anda.
                            </p>
                            <form onSubmit={handleResetPassword}>
                                <div style={{ marginBottom: "20px" }}>
                                    <label className="label">Kode OTP</label>
                                    <input
                                        className="input"
                                        type="text"
                                        placeholder="XXXXXX"
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value)}
                                        required
                                        maxLength={6}
                                        style={{ textAlign: "center", letterSpacing: "8px", fontSize: "18px", fontWeight: "600" }}
                                    />
                                </div>
                                <div style={{ marginBottom: "24px" }}>
                                    <label className="label">Password Baru</label>
                                    <input
                                        className="input"
                                        type="password"
                                        placeholder="Min. 6 karakter"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "12px" }}>
                                    {loading ? <Loader2 size={18} className="spin" /> : "Simpan Password Baru"}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
