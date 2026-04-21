"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { Box, Eye, EyeOff, Loader2, Mail, ShieldAlert } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState("");
    const [loginError, setLoginError] = useState("");
    
    const [otpStep, setOtpStep] = useState(false);
    const [otpCode, setOtpCode] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setLoginError("");

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                // Check if it's a held/suspended account error
                if (result.error.includes("ditangguhkan")) {
                    setLoginError(result.error);
                } else {
                    toast.error(result.error);
                }
            } else {
                toast.success("Login berhasil!");
                router.push("/dashboard");
                router.refresh();
            }
        } catch (error) {
            toast.error("Terjadi kesalahan");
        } finally {
            setLoading(false);
        }
    };

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
                setOtpStep(true);
            }
        } catch (error) {
            toast.error("Terjadi kesalahan");
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterWithOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, username, password, otpCode }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error);
            } else {
                toast.success("Registrasi berhasil! Silakan login.");
                setIsRegister(false);
                setOtpStep(false);
                setOtpCode("");
            }
        } catch (error) {
            toast.error("Terjadi kesalahan");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundImage: "linear-gradient(rgba(10, 14, 26, 0.5), rgba(10, 14, 26, 0.8)), url('/bg-login.png?v=2')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            padding: "20px",
            position: "relative",
        }}>
            {/* Background decoration */}
            <div style={{
                position: "fixed", top: "10%", left: "20%", width: "300px", height: "300px",
                background: "radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)",
                borderRadius: "50%", pointerEvents: "none",
            }} />
            <div style={{
                position: "fixed", bottom: "20%", right: "15%", width: "400px", height: "400px",
                background: "radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)",
                borderRadius: "50%", pointerEvents: "none",
            }} />

            <div className="fade-in" style={{ width: "100%", maxWidth: "420px" }}>
                <div style={{ textAlign: "center", marginBottom: "36px" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "28px" }}>
                        <img src="/pln-logo.svg?v=2" alt="PT PLN" style={{ height: "80px", objectFit: "contain", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }} />
                    </div>
                    <h1 style={{ fontSize: "24px", fontWeight: "700", letterSpacing: "-0.02em", color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
                        BIM Library PLN
                    </h1>
                    <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>
                        {isRegister ? (otpStep ? "Masukkan kode OTP dari Email" : "Buat akun baru") : "Masuk ke akun Anda"}
                    </p>
                </div>

                <div className="glass-card" style={{ padding: "32px" }}>
                    {/* Held account alert */}
                    {loginError && (
                        <div style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "12px",
                            padding: "14px 16px",
                            borderRadius: "10px",
                            background: "#7f1d1d",
                            border: "1px solid #dc2626",
                            marginBottom: "20px",
                            animation: "fadeIn 0.3s ease",
                        }}>
                            <ShieldAlert size={20} style={{ color: "#fca5a5", flexShrink: 0, marginTop: "1px" }} />
                            <div>
                                <div style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff", marginBottom: "4px" }}>
                                    Akun Ditangguhkan
                                </div>
                                <div style={{ fontSize: "12px", color: "#fecaca", lineHeight: "1.5" }}>
                                    {loginError}
                                </div>
                            </div>
                        </div>
                    )}
                    {otpStep ? (
                        <form onSubmit={handleRegisterWithOtp}>
                            <div style={{ marginBottom: "20px", textAlign: "center" }}>
                                <Mail size={40} style={{ color: "var(--accent)", margin: "0 auto 12px" }} />
                                <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                                    Kode 6 digit telah dikirim ke<br/><b>{email}</b>
                                </div>
                            </div>
                            <div style={{ marginBottom: "24px" }}>
                                <label className="label" style={{ textAlign: "center" }}>Kode OTP</label>
                                <input
                                    className="input"
                                    type="text"
                                    placeholder="XXXXXX"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value)}
                                    required
                                    maxLength={6}
                                    style={{ textAlign: "center", letterSpacing: "8px", fontSize: "20px", fontWeight: "600" }}
                                />
                            </div>
                            <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "12px" }}>
                                {loading ? <Loader2 size={18} className="spin" /> : "Verifikasi & Daftar"}
                            </button>
                            <div style={{ textAlign: "center", marginTop: "16px" }}>
                                <button type="button" onClick={() => setOtpStep(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "12px", cursor: "pointer" }}>
                                    Kembali
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={isRegister ? handleRequestOtp : handleLogin}>
                            <div style={{ marginBottom: "20px" }}>
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

                            {isRegister && (
                                <div style={{ marginBottom: "20px" }}>
                                    <label className="label">Username</label>
                                    <input
                                        className="input"
                                        type="text"
                                        placeholder="username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        minLength={3}
                                    />
                                </div>
                            )}

                            <div style={{ marginBottom: "24px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <label className="label">Password</label>
                                    {!isRegister && (
                                        <Link href="/forgot-password" style={{ fontSize: "12px", color: "var(--accent-light)", textDecoration: "none" }}>
                                            Lupa Password?
                                        </Link>
                                    )}
                                </div>
                                <div style={{ position: "relative" }}>
                                    <input
                                        className="input"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        style={{ paddingRight: "44px" }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "12px" }}>
                                {loading ? <Loader2 size={18} className="spin" /> : (isRegister ? "Kirim Kode OTP" : "Masuk")}
                            </button>
                        </form>
                    )}

                    {!otpStep && (
                        <div style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "var(--text-muted)" }}>
                            {isRegister ? (
                                <>Sudah punya akun? <button onClick={() => setIsRegister(false)} style={{ background: "none", border: "none", color: "var(--accent-light)", cursor: "pointer", fontWeight: "600" }}>Masuk</button></>
                            ) : (
                                <>Belum punya akun? <button onClick={() => setIsRegister(true)} style={{ background: "none", border: "none", color: "var(--accent-light)", cursor: "pointer", fontWeight: "600" }}>Daftar</button></>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
