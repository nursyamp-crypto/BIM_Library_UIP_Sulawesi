"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { User, Lock, Save, Loader2, Camera, IdCard, Activity, BarChart, Download, MessageSquare, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const InteractiveGlobe = dynamic(() => import("@/components/InteractiveGlobe"), {
    ssr: false,
    loading: () => (
        <div style={{ height: "350px", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(ellipse at center, #0a0e1a 0%, #030508 100%)", borderRadius: "16px", border: "1px solid rgba(0, 162, 233, 0.15)" }}>
            <div className="spinner" />
        </div>
    ),
});

export default function ProfilePage() {
    const router = useRouter();
    const { data: session, update } = useSession();
    const [username, setUsername] = useState(session?.user?.name || "");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>((session?.user as any)?.avatar || null);
    const [loading, setLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Chart interactive states (Comment)
    const [hoveredDate, setHoveredDate] = useState<string | null>(null);
    const [rangeStart, setRangeStart] = useState<string>("");
    const [rangeEnd, setRangeEnd] = useState<string>("");
    // Chart interactive states (Download)
    const [hoveredDlDate, setHoveredDlDate] = useState<string | null>(null);
    const [dlRangeStart, setDlRangeStart] = useState<string>("");
    const [dlRangeEnd, setDlRangeEnd] = useState<string>("");

    // Identity fields
    const [fullName, setFullName] = useState("");
    const [birthPlace, setBirthPlace] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [address, setAddress] = useState("");
    const [division, setDivision] = useState("");

    const [stats, setStats] = useState<any>(null);

    // Original values for dirty-checking
    const [original, setOriginal] = useState({
        fullName: "", birthPlace: "", birthDate: "", address: "", division: "",
    });

    useEffect(() => {
        if (session) {
            fetchProfile();
            fetchStats();
        }
    }, [session]);

    const fetchStats = async () => {
        try {
            const res = await fetch("/api/users/profile/stats");
            if (res.ok) {
                const data = await res.json();
                setStats(data);
                if (data.commentFrequency && data.commentFrequency.length > 0) {
                    setRangeStart(data.commentFrequency[0].date);
                    setRangeEnd(data.commentFrequency[data.commentFrequency.length - 1].date);
                }
                if (data.downloadFrequency && data.downloadFrequency.length > 0) {
                    setDlRangeStart(data.downloadFrequency[0].date);
                    setDlRangeEnd(data.downloadFrequency[data.downloadFrequency.length - 1].date);
                } else if (data.commentFrequency && data.commentFrequency.length > 0) {
                    // Fallback: use comment date range so the download chart still renders
                    setDlRangeStart(data.commentFrequency[0].date);
                    setDlRangeEnd(data.commentFrequency[data.commentFrequency.length - 1].date);
                } else {
                    const today = new Date().toISOString().split('T')[0];
                    setDlRangeStart(today);
                    setDlRangeEnd(today);
                }
            }
        } catch(e) {}
    }

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
        <div className="fade-in" style={{ padding: "0 10px" }}>
            <div className="page-header" style={{ marginBottom: "20px" }}>
                <h1 className="page-title">Profil Saya</h1>
                <p className="page-subtitle">Kelola informasi akun Anda dan pantau performa model 3D Anda</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
                {/* Form Profile */}
                <div className="glass-card" style={{ padding: "32px" }}>
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
                
                {/* Dashboard Stats */}
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <div className="glass-card" style={{ padding: "32px" }}>
                        <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                            <Activity size={18} style={{ color: "var(--success)" }} />
                            Performa Model 3D Anda
                        </h3>
                        
                        {!stats ? (
                            <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
                                <div className="spinner" />
                            </div>
                        ) : (
                            <>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                                    <div style={{ background: "rgba(30, 41, 59, 0.4)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border)" }}>
                                        <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>Total Upload</div>
                                        <div style={{ fontSize: "24px", fontWeight: "700" }}>{stats.stats?.totalModels || 0}</div>
                                    </div>
                                    <div style={{ background: "rgba(30, 41, 59, 0.4)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border)" }}>
                                        <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>Total Download</div>
                                        <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--success)" }}>{stats.stats?.totalDownloads || 0}</div>
                                    </div>
                                    <div style={{ background: "rgba(30, 41, 59, 0.4)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border)" }}>
                                        <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>Jumlah Comment</div>
                                        <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--accent)" }}>{stats.stats?.totalComments || 0}</div>
                                    </div>
                                    <div style={{ background: "rgba(30, 41, 59, 0.4)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border)" }}>
                                        <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>User Pendownload</div>
                                        <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--warning)" }}>{stats.stats?.totalUniqueDownloaders || 0}</div>
                                    </div>
                                </div>
                                
                                {stats.commenters?.length > 0 && (
                                    <div style={{ marginBottom: "24px" }}>
                                        <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "12px" }}>Siapa saja yang comment:</div>
                                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                            {stats.commenters.map((c: any) => (
                                                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--bg-card)", padding: "6px 12px", borderRadius: "20px", border: "1px solid var(--border)", fontSize: "12px" }}>
                                                    {c.avatar ? <img src={c.avatar} style={{width: 16, height: 16, borderRadius: "50%"}} /> : <User size={12} />}
                                                    {c.username}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {stats.commentFrequency?.length > 0 && (() => {
                                    const rawData = stats.commentFrequency;
                                    let sDate = rangeStart || rawData[0]?.date || new Date().toISOString().split('T')[0];
                                    let eDate = rangeEnd || rawData[rawData.length - 1]?.date || new Date().toISOString().split('T')[0];
                                    
                                    if (sDate > eDate) { const t = sDate; sDate = eDate; eDate = t; }

                                    const rawSDateMs = new Date(rawData[0]?.date || new Date().toISOString().split('T')[0]).getTime();
                                    const rawEDateMs = new Date(rawData[rawData.length - 1]?.date || new Date().toISOString().split('T')[0]).getTime();
                                    const msPerDay = 86400000;

                                    const startOffset = Math.round((new Date(sDate).getTime() - rawSDateMs) / msPerDay);
                                    const endOffset = Math.round((new Date(eDate).getTime() - rawSDateMs) / msPerDay);
                                    const rawMaxOffset = Math.round((rawEDateMs - rawSDateMs) / msPerDay);

                                    const minBound = Math.min(0, startOffset, endOffset);
                                    const maxBound = Math.max(rawMaxOffset, startOffset, endOffset, 1);


                                    const dataMap = new Map();
                                    rawData.forEach((d: any) => dataMap.set(d.date, d));

                                    const chartData: any[] = [];
                                    let current = new Date(sDate);
                                    const end = new Date(eDate);
                                    
                                    let loops = 0;
                                    while (current <= end && loops < 365) { // Max limit 365 hari mencegah memory leak
                                        const dateStr = current.toISOString().split('T')[0];
                                        chartData.push(dataMap.get(dateStr) || { date: dateStr, count: 0, details: [] });
                                        current.setDate(current.getDate() + 1);
                                        loops++;
                                    }

                                    return (
                                        <div style={{ marginBottom: "32px" }}>
                                            <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <span>Frekuensi Comment:</span>
                                            </div>
                                            <div style={{ position: "relative", height: "160px", width: "100%", padding: "0 15px 0 35px", marginTop: "10px", marginBottom: "30px" }}>
                                                <div style={{ position: "relative", width: "100%", height: "100%" }}>
                                                    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}>
                                                        {(() => {
                                                            const maxVal = Math.max(1, ...chartData.map((x:any) => x.count));
                                                            const N = chartData.length;
                                                            
                                                            const getX = (i: number) => (N === 1 ? 50 : (i / (N - 1)) * 100);
                                                            const getY = (val: number) => 100 - ((val / maxVal) * 85); 
                                                            
                                                            let dCurve = "";
                                                            let dArea = "";
                                                            
                                                            if (N === 1) {
                                                                dCurve = `M 0,${getY(chartData[0].count)} L 100,${getY(chartData[0].count)}`;
                                                                dArea = `${dCurve} L 100,100 L 0,100 Z`;
                                                            } else {
                                                                dCurve = `M ${getX(0)},${getY(chartData[0].count)}`;
                                                                for (let i = 0; i < N - 1; i++) {
                                                                    const currX = getX(i);
                                                                    const currY = getY(chartData[i].count);
                                                                    const nextX = getX(i + 1);
                                                                    const nextY = getY(chartData[i + 1].count);
                                                                    
                                                                    const cpX = (currX + nextX) / 2;
                                                                    dCurve += ` C ${cpX},${currY} ${cpX},${nextY} ${nextX},${nextY}`;
                                                                }
                                                                dArea = `${dCurve} L 100,100 L 0,100 Z`;
                                                            }
                                                            
                                                            // Skala Horizontal Lines (Grid)
                                                            const gridTicks = [0, 0.25, 0.5, 0.75, 1];
                                                            
                                                            return (
                                                                <>
                                                                    {gridTicks.map((t) => {
                                                                        const val = t * maxVal;
                                                                        const strokeOpacity = t === 0 ? "0.6" : "0.15";
                                                                        const strokeDash = t === 0 ? "0" : "4 4";
                                                                        return (
                                                                            <line key={`grid-${t}`} x1="0" y1={getY(val)} x2="100" y2={getY(val)} stroke="var(--border)" strokeWidth="1" strokeDasharray={strokeDash} opacity={strokeOpacity} vectorEffect="non-scaling-stroke" />
                                                                        );
                                                                    })}
                                                                    <defs>
                                                                        <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                                                                            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
                                                                            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
                                                                        </linearGradient>
                                                                    </defs>
                                                                    <path d={dArea} fill="url(#curveGradient)" />
                                                                    <path d={dCurve} fill="none" stroke="var(--accent)" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                                                                </>
                                                            );
                                                        })()}
                                                    </svg>

                                                    {/* Overlay HTML murni (Titik, Tooltips, dan Skala Teks Y-Axis & X-Axis) */}
                                                    {(() => {
                                                        const maxVal = Math.max(1, ...chartData.map((x:any) => x.count));
                                                        const N = chartData.length;
                                                        const getX = (i: number) => (N === 1 ? 50 : (i / (N - 1)) * 100);
                                                        const getY = (val: number) => 100 - ((val / maxVal) * 85); 
                                                        
                                                        const gridTicks = [0, 0.25, 0.5, 0.75, 1];
                                                        const uniqueLabels = Array.from(new Set(gridTicks.map(t => Math.round(t * maxVal))));

                                                        return (
                                                            <>
                                                                {/* Render Y-Axis Scale Labels (Jumlah Comment) */}
                                                                {uniqueLabels.map(val => (
                                                                    <div key={`y-${val}`} style={{ position: "absolute", left: "-32px", top: `${getY(val)}%`, transform: "translateY(-50%)", fontSize: "10px", color: "var(--text-muted)", width: "24px", textAlign: "right", fontWeight: "600" }}>
                                                                        {val}
                                                                    </div>
                                                                ))}

                                                                {/* Render X-Axis Scale Labels (Tanggal di Dasar Grafik) */}
                                                                {chartData.map((f: any, i: number) => {
                                                                    const px = getX(i);
                                                                    // Only render labels optionally if it's too dense (skip logic if N > 14)
                                                                    if (N > 14 && i % Math.ceil(N/7) !== 0 && i !== N-1 && i !== 0) return null;
                                                                    
                                                                    const formattedDate = f.date.split('-').reverse().join('/');
                                                                    return (
                                                                        <div key={`x-${f.date}`} style={{ position: "absolute", left: `${px}%`, bottom: "-25px", transform: "translateX(-50%)", fontSize: "9px", color: "var(--text-muted)", fontWeight: "500", whiteSpace: "nowrap" }}>
                                                                            {formattedDate}
                                                                        </div>
                                                                    )
                                                                })}

                                                                {/* Render Data Points (Lingkaran Hover) */}
                                                                {chartData.map((f: any, i: number) => {
                                                                    const px = getX(i);
                                                                    const py = getY(f.count);
                                                                    const isHovered = hoveredDate === f.date;
                                                                    
                                                                    return (
                                                                        <div 
                                                                            key={`point-${f.date}`} 
                                                                            style={{ 
                                                                                position: "absolute", left: `${px}%`, top: `${py}%`, 
                                                                                transform: "translate(-50%, -50%)", zIndex: isHovered ? 50 : 10, 
                                                                                display: "flex", flexDirection: "column", alignItems: "center",
                                                                                cursor: "pointer"
                                                                            }}
                                                                            onMouseEnter={() => setHoveredDate(f.date)}
                                                                            onMouseLeave={() => setHoveredDate(null)}
                                                                        >
                                                                            {/* Hanya tampilkan angka counter permanen jika lebih dari nol, tapi jika di hover semuanya muncul */}
                                                                            {(f.count > 0 || isHovered) && (
                                                                                <div style={{ position: "absolute", top: "-22px", fontSize: "12px", fontWeight: "bold", color: "var(--text-primary)" }}>{f.count}</div>
                                                                            )}
                                                                            <div style={{ width: isHovered ? "12px" : "9px", height: isHovered ? "12px" : "9px", borderRadius: "50%", background: (f.count > 0 || isHovered) ? "var(--accent)" : "var(--bg-card)", border: "2px solid var(--accent)", transition: "all 0.2s", transform: isHovered ? "scale(1.2)" : "scale(1)", opacity: f.count === 0 && !isHovered ? 0.3 : 1 }}></div>
                                                                            
                                                                            {/* Tooltip Kustom */}
                                                                            {isHovered && f.count > 0 && f.details && f.details.length > 0 && (
                                                                                <div style={{
                                                                                    position: "absolute", bottom: "25px", width: "220px", background: "var(--surface)", border: "1px solid var(--border)",
                                                                                    borderRadius: "8px", padding: "10px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)", pointerEvents: "auto", 
                                                                                    display: "flex", flexDirection: "column", gap: "8px",
                                                                                }}>
                                                                                    <div style={{ fontSize: "11px", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", paddingBottom: "4px", marginBottom: "4px" }}>Komentar pada {f.date.split('-').reverse().join('/')}</div>
                                                                                    {f.details.map((c: any, idx: number) => (
                                                                                        <div key={idx} onClick={() => router.push(`/models/${c.modelId}`)}
                                                                                            style={{ background: "var(--bg-card)", padding: "6px", borderRadius: "4px", fontSize: "11px", display: "flex", flexDirection: "column", borderLeft: "2px solid var(--accent)" }}
                                                                                            className="hover-card">
                                                                                            <span style={{ fontWeight: "600", color: "var(--accent)", marginBottom: "2px" }}>@{c.username}</span>
                                                                                            <span style={{ color: "var(--text-primary)", whiteSpace: "normal", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>"{c.text}"</span>
                                                                                            <span style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "4px" }}>Model: {c.modelTitle}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                    <div style={{ position: "absolute", bottom: "-5px", left: "50%", transform: "translateX(-50%) rotate(45deg)", width: "10px", height: "10px", background: "var(--surface)", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}></div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )
                                                                })}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Date Pickers */}
                                            <div style={{ display: "flex", gap: "16px" }}>
                                                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px", background: "var(--bg-card)", padding: "10px 16px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                                                    <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Batas Awal:</span>
                                                    <input 
                                                        type="date"
                                                        value={sDate}
                                                        onChange={(e) => setRangeStart(e.target.value)}
                                                        style={{ 
                                                            background: "transparent", border: "none", 
                                                            color: "var(--text-primary)", fontSize: "12px", outline: "none",
                                                            colorScheme: "dark", width: "100%", fontWeight: "bold"
                                                        }}
                                                    />
                                                </div>
                                                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px", background: "var(--bg-card)", padding: "10px 16px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                                                    <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Batas Akhir:</span>
                                                    <input 
                                                        type="date"
                                                        value={eDate}
                                                        onChange={(e) => setRangeEnd(e.target.value)}
                                                        style={{ 
                                                            background: "transparent", border: "none", 
                                                            color: "var(--text-primary)", fontSize: "12px", outline: "none",
                                                            colorScheme: "dark", width: "100%", fontWeight: "bold"
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* === DOWNLOAD FREQUENCY CHART === */}
                                {stats && (() => {
                                    const rawData = stats.downloadFrequency || [];
                                    let sDate = dlRangeStart || rawData[0]?.date || new Date().toISOString().split('T')[0];
                                    let eDate = dlRangeEnd || rawData[rawData.length - 1]?.date || new Date().toISOString().split('T')[0];
                                    
                                    if (sDate > eDate) { const t = sDate; sDate = eDate; eDate = t; }

                                    const dataMap = new Map();
                                    rawData.forEach((d: any) => dataMap.set(d.date, d));

                                    const chartData: any[] = [];
                                    let current = new Date(sDate);
                                    const end = new Date(eDate);
                                    
                                    let loops = 0;
                                    while (current <= end && loops < 365) {
                                        const dateStr = current.toISOString().split('T')[0];
                                        chartData.push(dataMap.get(dateStr) || { date: dateStr, count: 0, details: [] });
                                        current.setDate(current.getDate() + 1);
                                        loops++;
                                    }

                                    return (
                                        <div style={{ marginBottom: "32px" }}>
                                            <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <span>Frekuensi Download:</span>
                                            </div>
                                            <div style={{ position: "relative", height: "160px", width: "100%", padding: "0 15px 0 35px", marginTop: "10px", marginBottom: "30px" }}>
                                                <div style={{ position: "relative", width: "100%", height: "100%" }}>
                                                    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}>
                                                        {(() => {
                                                            const maxVal = Math.max(1, ...chartData.map((x:any) => x.count));
                                                            const N = chartData.length;
                                                            
                                                            const getX = (i: number) => (N === 1 ? 50 : (i / (N - 1)) * 100);
                                                            const getY = (val: number) => 100 - ((val / maxVal) * 85); 
                                                            
                                                            let dCurve = "";
                                                            let dArea = "";
                                                            
                                                            if (N === 1) {
                                                                dCurve = `M 0,${getY(chartData[0].count)} L 100,${getY(chartData[0].count)}`;
                                                                dArea = `${dCurve} L 100,100 L 0,100 Z`;
                                                            } else {
                                                                dCurve = `M ${getX(0)},${getY(chartData[0].count)}`;
                                                                for (let i = 0; i < N - 1; i++) {
                                                                    const currX = getX(i);
                                                                    const currY = getY(chartData[i].count);
                                                                    const nextX = getX(i + 1);
                                                                    const nextY = getY(chartData[i + 1].count);
                                                                    
                                                                    const cpX = (currX + nextX) / 2;
                                                                    dCurve += ` C ${cpX},${currY} ${cpX},${nextY} ${nextX},${nextY}`;
                                                                }
                                                                dArea = `${dCurve} L 100,100 L 0,100 Z`;
                                                            }
                                                            
                                                            const gridTicks = [0, 0.25, 0.5, 0.75, 1];
                                                            
                                                            return (
                                                                <>
                                                                    {gridTicks.map((t) => {
                                                                        const val = t * maxVal;
                                                                        const strokeOpacity = t === 0 ? "0.6" : "0.15";
                                                                        const strokeDash = t === 0 ? "0" : "4 4";
                                                                        return (
                                                                            <line key={`dl-grid-${t}`} x1="0" y1={getY(val)} x2="100" y2={getY(val)} stroke="var(--border)" strokeWidth="1" strokeDasharray={strokeDash} opacity={strokeOpacity} vectorEffect="non-scaling-stroke" />
                                                                        );
                                                                    })}
                                                                    <defs>
                                                                        <linearGradient id="dlCurveGradient" x1="0" y1="0" x2="0" y2="1">
                                                                            <stop offset="0%" stopColor="var(--success)" stopOpacity="0.35" />
                                                                            <stop offset="100%" stopColor="var(--success)" stopOpacity="0.0" />
                                                                        </linearGradient>
                                                                    </defs>
                                                                    <path d={dArea} fill="url(#dlCurveGradient)" />
                                                                    <path d={dCurve} fill="none" stroke="var(--success)" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                                                                </>
                                                            );
                                                        })()}
                                                    </svg>

                                                    {/* Overlay HTML (Points, Tooltips, Scales) */}
                                                    {(() => {
                                                        const maxVal = Math.max(1, ...chartData.map((x:any) => x.count));
                                                        const N = chartData.length;
                                                        const getX = (i: number) => (N === 1 ? 50 : (i / (N - 1)) * 100);
                                                        const getY = (val: number) => 100 - ((val / maxVal) * 85); 
                                                        
                                                        const gridTicks = [0, 0.25, 0.5, 0.75, 1];
                                                        const uniqueLabels = Array.from(new Set(gridTicks.map(t => Math.round(t * maxVal))));

                                                        return (
                                                            <>
                                                                {/* Y-Axis Labels */}
                                                                {uniqueLabels.map(val => (
                                                                    <div key={`dl-y-${val}`} style={{ position: "absolute", left: "-32px", top: `${getY(val)}%`, transform: "translateY(-50%)", fontSize: "10px", color: "var(--text-muted)", width: "24px", textAlign: "right", fontWeight: "600" }}>
                                                                        {val}
                                                                    </div>
                                                                ))}

                                                                {/* X-Axis Labels */}
                                                                {chartData.map((f: any, i: number) => {
                                                                    const px = getX(i);
                                                                    if (N > 14 && i % Math.ceil(N/7) !== 0 && i !== N-1 && i !== 0) return null;
                                                                    const formattedDate = f.date.split('-').reverse().join('/');
                                                                    return (
                                                                        <div key={`dl-x-${f.date}`} style={{ position: "absolute", left: `${px}%`, bottom: "-25px", transform: "translateX(-50%)", fontSize: "9px", color: "var(--text-muted)", fontWeight: "500", whiteSpace: "nowrap" }}>
                                                                            {formattedDate}
                                                                        </div>
                                                                    )
                                                                })}

                                                                {/* Data Points */}
                                                                {chartData.map((f: any, i: number) => {
                                                                    const px = getX(i);
                                                                    const py = getY(f.count);
                                                                    const isHovered = hoveredDlDate === f.date;
                                                                    
                                                                    return (
                                                                        <div 
                                                                            key={`dl-point-${f.date}`} 
                                                                            style={{ 
                                                                                position: "absolute", left: `${px}%`, top: `${py}%`, 
                                                                                transform: "translate(-50%, -50%)", zIndex: isHovered ? 50 : 10, 
                                                                                display: "flex", flexDirection: "column", alignItems: "center",
                                                                                cursor: "pointer"
                                                                            }}
                                                                            onMouseEnter={() => setHoveredDlDate(f.date)}
                                                                            onMouseLeave={() => setHoveredDlDate(null)}
                                                                        >
                                                                            {(f.count > 0 || isHovered) && (
                                                                                <div style={{ position: "absolute", top: "-22px", fontSize: "12px", fontWeight: "bold", color: "var(--text-primary)" }}>{f.count}</div>
                                                                            )}
                                                                            <div style={{ width: isHovered ? "12px" : "9px", height: isHovered ? "12px" : "9px", borderRadius: "50%", background: (f.count > 0 || isHovered) ? "var(--success)" : "var(--bg-card)", border: "2px solid var(--success)", transition: "all 0.2s", transform: isHovered ? "scale(1.2)" : "scale(1)", opacity: f.count === 0 && !isHovered ? 0.3 : 1 }}></div>
                                                                            
                                                                            {/* Tooltip */}
                                                                            {isHovered && f.count > 0 && f.details && f.details.length > 0 && (
                                                                                <div style={{
                                                                                    position: "absolute", bottom: "25px", width: "220px", background: "var(--surface)", border: "1px solid var(--border)",
                                                                                    borderRadius: "8px", padding: "10px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)", pointerEvents: "auto", 
                                                                                    display: "flex", flexDirection: "column", gap: "8px",
                                                                                }}>
                                                                                    <div style={{ fontSize: "11px", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", paddingBottom: "4px", marginBottom: "4px" }}>Download pada {f.date.split('-').reverse().join('/')}</div>
                                                                                    {f.details.map((c: any, idx: number) => (
                                                                                        <div key={idx} onClick={() => router.push(`/models/${c.modelId}`)}
                                                                                            style={{ background: "var(--bg-card)", padding: "6px", borderRadius: "4px", fontSize: "11px", display: "flex", flexDirection: "column", borderLeft: "2px solid var(--success)" }}
                                                                                            className="hover-card">
                                                                                            <span style={{ fontWeight: "600", color: "var(--success)", marginBottom: "2px" }}>@{c.username}</span>
                                                                                            <span style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "2px" }}>Model: {c.modelTitle}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                    <div style={{ position: "absolute", bottom: "-5px", left: "50%", transform: "translateX(-50%) rotate(45deg)", width: "10px", height: "10px", background: "var(--surface)", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}></div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )
                                                                })}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Date Pickers */}
                                            <div style={{ display: "flex", gap: "16px" }}>
                                                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px", background: "var(--bg-card)", padding: "10px 16px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                                                    <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Batas Awal:</span>
                                                    <input 
                                                        type="date"
                                                        value={sDate}
                                                        onChange={(e) => setDlRangeStart(e.target.value)}
                                                        style={{ 
                                                            background: "transparent", border: "none", 
                                                            color: "var(--text-primary)", fontSize: "12px", outline: "none",
                                                            colorScheme: "dark", width: "100%", fontWeight: "bold"
                                                        }}
                                                    />
                                                </div>
                                                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px", background: "var(--bg-card)", padding: "10px 16px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                                                    <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Batas Akhir:</span>
                                                    <input 
                                                        type="date"
                                                        value={eDate}
                                                        onChange={(e) => setDlRangeEnd(e.target.value)}
                                                        style={{ 
                                                            background: "transparent", border: "none", 
                                                            color: "var(--text-primary)", fontSize: "12px", outline: "none",
                                                            colorScheme: "dark", width: "100%", fontWeight: "bold"
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div>
                                    <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                                        <MapPin size={14} style={{ color: "var(--warning)" }}/>
                                        Peta Lokasi User Pendownload:
                                    </div>
                                    <InteractiveGlobe 
                                        locations={stats.mapLocations || []} 
                                        height={350}
                                    />
                                    <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>
                                        Estimasi lokasi berdasarkan data IP pendownload. Drag untuk memutar globe, scroll untuk zoom.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
