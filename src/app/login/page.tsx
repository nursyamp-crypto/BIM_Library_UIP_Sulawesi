"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Box, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                toast.error(result.error);
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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, username, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error);
            } else {
                toast.success("Registrasi berhasil! Silakan login.");
                setIsRegister(false);
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
            backgroundImage: "linear-gradient(rgba(10, 14, 26, 0.5), rgba(10, 14, 26, 0.8)), url('/bg-login.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            padding: "20px",
            position: "relative",
        }}>
            {/* Background decoration */}
            <div style={{
                position: "fixed",
                top: "10%",
                left: "20%",
                width: "300px",
                height: "300px",
                background: "radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)",
                borderRadius: "50%",
                pointerEvents: "none",
            }} />
            <div style={{
                position: "fixed",
                bottom: "20%",
                right: "15%",
                width: "400px",
                height: "400px",
                background: "radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)",
                borderRadius: "50%",
                pointerEvents: "none",
            }} />

            <div className="fade-in" style={{
                width: "100%",
                maxWidth: "420px",
            }}>
                <div style={{
                    textAlign: "center",
                    marginBottom: "36px",
                }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "28px" }}>
                        <img src="/pln-logo.svg" alt="PT PLN" style={{ height: "80px", objectFit: "contain", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }} />
                    </div>
                    <h1 style={{
                        fontSize: "24px",
                        fontWeight: "700",
                        letterSpacing: "-0.02em",
                        color: "#fff",
                        textShadow: "0 2px 10px rgba(0,0,0,0.3)",
                    }}>
                        BIM Library PLN
                    </h1>
                    <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>
                        {isRegister ? "Buat akun baru" : "Masuk ke akun Anda"}
                    </p>
                </div>

                {/* Form */}
                <div className="glass-card" style={{ padding: "32px" }}>
                    <form onSubmit={isRegister ? handleRegister : handleLogin}>
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
                            <label className="label">Password</label>
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
                                    style={{
                                        position: "absolute",
                                        right: "12px",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        background: "none",
                                        border: "none",
                                        color: "var(--text-muted)",
                                        cursor: "pointer",
                                        padding: "4px",
                                    }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                            style={{ width: "100%", justifyContent: "center", padding: "12px" }}
                        >
                            {loading ? (
                                <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                            ) : (
                                isRegister ? "Daftar" : "Masuk"
                            )}
                        </button>
                    </form>

                    <div style={{
                        textAlign: "center",
                        marginTop: "20px",
                        fontSize: "13px",
                        color: "var(--text-muted)",
                    }}>
                        {isRegister ? (
                            <>
                                Sudah punya akun?{" "}
                                <button
                                    onClick={() => setIsRegister(false)}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--accent-light)",
                                        cursor: "pointer",
                                        fontWeight: "600",
                                    }}
                                >
                                    Masuk
                                </button>
                            </>
                        ) : (
                            <>
                                Belum punya akun?{" "}
                                <button
                                    onClick={() => setIsRegister(true)}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--accent-light)",
                                        cursor: "pointer",
                                        fontWeight: "600",
                                    }}
                                >
                                    Daftar
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
