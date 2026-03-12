"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { User, Lock, Save, Loader2, Camera, IdCard } from "lucide-react";

export default function ProfilePage() {
    const { data: session, update } = useSession();
    const [username, setUsername] = useState(session?.user?.name || "");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>((session?.user as any)?.avatar || null);
    const [loading, setLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Identity fields
    const [fullName, setFullName] = useState("");
    const [birthPlace, setBirthPlace] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [address, setAddress] = useState("");
    const [division, setDivision] = useState("");

    // Original values for dirty-checking
    const [original, setOriginal] = useState({
        fullName: "", birthPlace: "", birthDate: "", address: "", division: "",
    });

    useEffect(() => {
        if (session) fetchProfile();
    }, [session]);

    const fetchProfile = async () => {
        try {
            const res = await fetch("/api/users/profile");
            if (res.ok) {
                const data = await res.json();
                const u = data.user;
                setFullName(u.fullName || "");
                setBirthPlace(u.birthPlace || "");
                setBirthDate(u.birthDate ? u.birthDate.substring(0, 10) : "");
                setAddress(u.address || "");
                setDivision(u.division || "");
                setOriginal({
                    fullName: u.fullName || "",
                    birthPlace: u.birthPlace || "",
                    birthDate: u.birthDate ? u.birthDate.substring(0, 10) : "",
                    address: u.address || "",
                    division: u.division || "",
                });
            }
        } catch (error) {
            console.error("Failed to fetch profile:", error);
        } finally {
            setProfileLoading(false);
        }
    };

    const identityChanged =
        fullName !== original.fullName ||
        birthPlace !== original.birthPlace ||
        birthDate !== original.birthDate ||
        address !== original.address ||
        division !== original.division;

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password && password !== confirmPassword) {
            toast.error("Password baru tidak cocok");
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            if (username && username !== session?.user?.name) {
                formData.append("username", username);
            }
            if (password) {
                formData.append("password", password);
            }
            if (avatarFile) {
                formData.append("avatar", avatarFile);
            }

            // Identity fields
            if (identityChanged) {
                formData.append("fullName", fullName);
                formData.append("birthPlace", birthPlace);
                formData.append("birthDate", birthDate);
                formData.append("address", address);
                formData.append("division", division);
            }

            const res = await fetch("/api/users/profile", {
                method: "PATCH",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Gagal memperbarui profil");
            }

            toast.success("Profil berhasil diperbarui!");

            // Force session update to reflect new username and/or avatar in the UI
            if ((username && username !== session?.user?.name) || data.user.avatar) {
                await update({
                    name: username || session?.user?.name,
                    avatar: data.user.avatar || (session?.user as any)?.avatar
                });
            }

            // Update original values so dirty-check resets
            setOriginal({
                fullName: data.user.fullName || fullName,
                birthPlace: data.user.birthPlace || birthPlace,
                birthDate: data.user.birthDate ? data.user.birthDate.substring(0, 10) : birthDate,
                address: data.user.address || address,
                division: data.user.division || division,
            });

            // Clear password fields
            setPassword("");
            setConfirmPassword("");

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            toast.error("Format gambar tidak didukung");
            return;
        }

        if (file.size > 2 * 1024 * 1024) { // 2MB
            toast.error("Ukuran maksimal gambar adalah 2MB");
            return;
        }

        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const isFormDirty = !!(password || (username !== session?.user?.name) || avatarFile || identityChanged);

    return (
        <div className="fade-in" style={{ maxWidth: "600px", margin: "0 auto" }}>
            <div className="page-header">
                <h1 className="page-title">Profil Saya</h1>
                <p className="page-subtitle">Kelola informasi akun Anda</p>
            </div>

            <div className="glass-card" style={{ padding: "32px", marginTop: "24px" }}>
                <form onSubmit={handleUpdateProfile}>

                    {/* Avatar Section */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "32px" }}>
                        <div
                            style={{
                                position: "relative",
                                width: "100px",
                                height: "100px",
                                borderRadius: "50%",
                                overflow: "hidden",
                                background: "var(--surface)",
                                border: "2px solid var(--border)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                marginBottom: "16px"
                            }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                                <User size={40} style={{ color: "var(--text-muted)" }} />
                            )}

                            <div style={{
                                position: "absolute",
                                bottom: 0,
                                left: 0,
                                right: 0,
                                background: "rgba(0,0,0,0.5)",
                                padding: "4px",
                                display: "flex",
                                justifyContent: "center",
                                color: "white"
                            }}>
                                <Camera size={14} />
                            </div>
                        </div>
                        <input
                            type="file"
                            accept="image/jpeg, image/png, image/webp"
                            ref={fileInputRef}
                            onChange={handleAvatarChange}
                            style={{ display: "none" }}
                        />
                        <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: "12px", padding: "6px 12px" }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Ubah Foto...
                        </button>
                    </div>

                    <div style={{ height: "1px", background: "var(--border)", margin: "0 0 32px 0" }}></div>

                    {/* Username Update */}
                    <div style={{ marginBottom: "24px" }}>
                        <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                            <User size={18} style={{ color: "var(--accent)" }} />
                            Informasi Dasar
                        </h3>

                        <div style={{ marginBottom: "16px" }}>
                            <label className="label">Email</label>
                            <input
                                className="input"
                                type="email"
                                value={session?.user?.email || ""}
                                disabled
                                style={{ opacity: 0.6, cursor: "not-allowed" }}
                            />
                            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}>Email tidak dapat diubah</p>
                        </div>

                        <div>
                            <label className="label">Username</label>
                            <input
                                className="input"
                                type="text"
                                placeholder="Username baru"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                minLength={3}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ height: "1px", background: "var(--border)", margin: "32px 0" }}></div>

                    {/* Identity Section */}
                    <div style={{ marginBottom: "24px" }}>
                        <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                            <IdCard size={18} style={{ color: "var(--accent)" }} />
                            Identitas Diri
                        </h3>

                        {profileLoading ? (
                            <div style={{ display: "flex", justifyContent: "center", padding: "24px" }}>
                                <div className="spinner" />
                            </div>
                        ) : (
                            <>
                                <div style={{ marginBottom: "16px" }}>
                                    <label className="label">Nama Lengkap</label>
                                    <input
                                        className="input"
                                        type="text"
                                        placeholder="Masukkan nama lengkap"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                    />
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                    <div>
                                        <label className="label">Tempat Lahir</label>
                                        <input
                                            className="input"
                                            type="text"
                                            placeholder="Kota kelahiran"
                                            value={birthPlace}
                                            onChange={(e) => setBirthPlace(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Tanggal Lahir</label>
                                        <input
                                            className="input"
                                            type="date"
                                            value={birthDate}
                                            onChange={(e) => setBirthDate(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginBottom: "16px" }}>
                                    <label className="label">Alamat</label>
                                    <textarea
                                        className="input"
                                        placeholder="Masukkan alamat lengkap"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        rows={3}
                                        style={{ resize: "vertical", minHeight: "80px" }}
                                    />
                                </div>

                                <div>
                                    <label className="label">Unit / Divisi</label>
                                    <input
                                        className="input"
                                        type="text"
                                        placeholder="Contoh: Divisi IT"
                                        value={division}
                                        onChange={(e) => setDivision(e.target.value)}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div style={{ height: "1px", background: "var(--border)", margin: "32px 0" }}></div>

                    {/* Password Update */}
                    <div style={{ marginBottom: "32px" }}>
                        <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                            <Lock size={18} style={{ color: "var(--accent)" }} />
                            Ubah Password
                        </h3>
                        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>Biarkan kosong jika tidak ingin mengubah password.</p>

                        <div style={{ marginBottom: "16px" }}>
                            <label className="label">Password Baru</label>
                            <input
                                className="input"
                                type="password"
                                placeholder="Minimal 6 karakter"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={6}
                            />
                        </div>

                        <div>
                            <label className="label">Konfirmasi Password Baru</label>
                            <input
                                className="input"
                                type="password"
                                placeholder="Ulangi password baru"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                minLength={6}
                            />
                        </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading || !isFormDirty}
                            style={{ minWidth: "140px", justifyContent: "center" }}
                        >
                            {loading ? (
                                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                            ) : (
                                <>
                                    <Save size={16} />
                                    Simpan Profil
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
