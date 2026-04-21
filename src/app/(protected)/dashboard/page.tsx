"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
    Upload,
    Box,
    Download,
    TrendingUp,
    ArrowRight,
    FileBox,
    Crown,
    MessageCircle,
    Users,
    User,
    Trophy,
    Medal,
    Star,
    MapPin,
} from "lucide-react";

const UploaderMap = dynamic(() => import("@/components/UploaderMap"), {
    ssr: false,
    loading: () => (
        <div style={{ height: "400px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.5)", borderRadius: "12px", border: "1px solid var(--border)" }}>
            <div className="spinner" />
        </div>
    ),
});

interface Model {
    id: string;
    title: string;
    fileFormat: string;
    fileSize: number;
    downloadCount: number;
    thumbnailPath: string | null;
    createdAt: string;
}

interface RankedUser {
    id: string;
    username: string;
    avatar: string | null;
    role: string;
    count: number;
}

interface RankedModel {
    id: string;
    title: string;
    thumbnailPath: string | null;
    downloadCount: number;
    fileFormat: string;
    uploader: { id: string; username: string; avatar: string | null };
}

interface GlobalStats {
    totalUsers: number;
    totalModels: number;
    totalComments: number;
}

interface ModelLocation {
    id: string;
    title: string;
    fileFormat: string;
    latitude: number;
    longitude: number;
    createdAt: string;
    uploader: {
        id: string;
        username: string;
        avatar: string | null;
    };
}

function formatSize(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const s = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + s[i];
}

const RANK_COLORS = [
    { bg: "linear-gradient(135deg, #fbbf24, #f59e0b)", text: "#92400e", border: "rgba(251, 191, 36, 0.5)" },    // Gold
    { bg: "linear-gradient(135deg, #d1d5db, #9ca3af)", text: "#374151", border: "rgba(156, 163, 175, 0.5)" },    // Silver
    { bg: "linear-gradient(135deg, #d97706, #b45309)", text: "#fffbeb", border: "rgba(217, 119, 6, 0.5)" },      // Bronze
];

const RANK_ICONS = [Crown, Medal, Star];

export default function DashboardPage() {
    const { data: session } = useSession();
    const [models, setModels] = useState<Model[]>([]);
    const [stats, setStats] = useState({ totalModels: 0, totalDownloads: 0, totalSize: 0 });
    const [loading, setLoading] = useState(true);

    // Rankings state
    const [topUploaders, setTopUploaders] = useState<RankedUser[]>([]);
    const [topCommenters, setTopCommenters] = useState<RankedUser[]>([]);
    const [popularModels, setPopularModels] = useState<RankedModel[]>([]);
    const [globalStats, setGlobalStats] = useState<GlobalStats>({ totalUsers: 0, totalModels: 0, totalComments: 0 });
    const [modelLocations, setModelLocations] = useState<ModelLocation[]>([]);
    const [rankingsLoading, setRankingsLoading] = useState(true);

    // Slideshow state
    const plnSlides = ["/pln-banner-1.png", "/pln-banner-2.png", "/pln-banner-3.png"];
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        fetchMyModels();
        fetchRankings();
    }, [session]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % plnSlides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const fetchMyModels = async () => {
        if (!session) return;
        try {
            const res = await fetch(`/api/models?uploader=${(session.user as any).id}&limit=6&sort=newest`);
            const data = await res.json();
            setModels(data.models || []);

            const allRes = await fetch(`/api/models?uploader=${(session.user as any).id}&limit=1000`);
            const allData = await allRes.json();
            const allModels = allData.models || [];

            setStats({
                totalModels: allData.pagination?.total || 0,
                totalDownloads: allModels.reduce((sum: number, m: any) => sum + m.downloadCount, 0),
                totalSize: allModels.reduce((sum: number, m: any) => sum + m.fileSize, 0),
            });
        } catch (error) {
            console.error("Failed to fetch models:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRankings = async () => {
        try {
            const res = await fetch("/api/dashboard");
            if (res.ok) {
                const data = await res.json();
                setTopUploaders(data.topUploaders || []);
                setTopCommenters(data.topCommenters || []);
                setPopularModels(data.popularModels || []);
                setGlobalStats(data.globalStats || { totalUsers: 0, totalModels: 0, totalComments: 0 });
                setModelLocations(data.modelLocations || []);
            }
        } catch (error) {
            console.error("Failed to fetch rankings:", error);
        } finally {
            setRankingsLoading(false);
        }
    };

    const statCards = [
        {
            label: "Total Model",
            value: stats.totalModels,
            icon: Box,
            color: "#00A2E9",
            bg: "rgba(0, 162, 233, 0.12)",
        },
        {
            label: "Total Download",
            value: stats.totalDownloads,
            icon: Download,
            color: "#16a34a",
            bg: "rgba(22, 163, 74, 0.12)",
        },
        {
            label: "Total Ukuran",
            value: formatSize(stats.totalSize),
            icon: TrendingUp,
            color: "#d97706",
            bg: "rgba(217, 119, 6, 0.12)",
        },
    ];

    const globalStatCards = [
        { label: "Total Pengguna", value: globalStats.totalUsers, icon: Users, color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.12)" },
        { label: "Total Model", value: globalStats.totalModels, icon: Box, color: "#00A2E9", bg: "rgba(0, 162, 233, 0.12)" },
        { label: "Total Komentar", value: globalStats.totalComments, icon: MessageCircle, color: "#ec4899", bg: "rgba(236, 72, 153, 0.12)" },
    ];

    const renderRankItem = (
        index: number,
        name: string,
        avatarUrl: string | null,
        count: number,
        countLabel: string,
        href?: string,
    ) => {
        const rank = RANK_COLORS[index] || RANK_COLORS[3];
        const RankIcon = RANK_ICONS[index];

        return (
            <div
                key={index}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    background: index < 3 ? "rgba(255, 255, 255, 0.6)" : "transparent",
                    border: index < 3 ? `1px solid ${rank.border}` : "none",
                    transition: "all 0.2s ease",
                }}
            >
                {/* Rank badge */}
                <div style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    background: rank.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: "12px",
                    fontWeight: "700",
                    color: index < 3 ? rank.text : "var(--text-muted)",
                }}>
                    {RankIcon ? <RankIcon size={14} /> : index + 1}
                </div>

                {/* Avatar */}
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt={name}
                        style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "2px solid var(--border)",
                            flexShrink: 0,
                        }}
                    />
                ) : (
                    <div style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, var(--accent), #007bc4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                    }}>
                        <User size={16} style={{ color: "white" }} />
                    </div>
                )}

                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {href ? (
                        <Link href={href} style={{
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "var(--text-primary)",
                            textDecoration: "none",
                            display: "block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}>
                            {name}
                        </Link>
                    ) : (
                        <span style={{
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "var(--text-primary)",
                            display: "block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}>
                            {name}
                        </span>
                    )}
                </div>

                {/* Count */}
                <div style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "var(--accent)",
                    whiteSpace: "nowrap",
                }}>
                    {count} <span style={{ fontSize: "11px", fontWeight: "400", color: "var(--text-muted)" }}>{countLabel}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">
                    Selamat datang, <strong>{session?.user?.name}</strong>!
                </p>
            </div>

            {/* PLN Profile Slideshow */}
            <div className="dashboard-slideshow" style={{
                position: "relative",
                borderRadius: "16px",
                overflow: "hidden",
                marginBottom: "36px",
                border: "1px solid var(--border)",
                boxShadow: "0 4px 24px rgba(0, 162, 233, 0.08)",
                aspectRatio: "16 / 5",
            }}>
                {plnSlides.map((src, i) => (
                    <img
                        key={i}
                        src={src}
                        alt={`PLN Profile ${i + 1}`}
                        style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            opacity: currentSlide === i ? 1 : 0,
                            transition: "opacity 0.8s ease-in-out",
                        }}
                    />
                ))}
                {/* Dot indicators */}
                <div style={{
                    position: "absolute",
                    bottom: "12px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    gap: "8px",
                    zIndex: 2,
                }}>
                    {plnSlides.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentSlide(i)}
                            style={{
                                width: currentSlide === i ? "24px" : "8px",
                                height: "8px",
                                borderRadius: "4px",
                                border: "none",
                                background: currentSlide === i ? "#00A2E9" : "rgba(255,255,255,0.6)",
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                                padding: 0,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Quick actions */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "36px", flexWrap: "wrap" }}>
                <Link href="/upload">
                    <button className="btn-primary">
                        <Upload size={16} />
                        Upload Model Baru
                    </button>
                </Link>
                <Link href="/models">
                    <button className="btn-secondary">
                        <FileBox size={16} />
                        Lihat Katalog
                    </button>
                </Link>
            </div>

            {/* ===== LEADERBOARD SECTION ===== */}
            <div style={{ marginBottom: "40px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                    <Trophy size={20} style={{ color: "#f59e0b" }} />
                    <h2 style={{ fontSize: "18px", fontWeight: "600" }}>Leaderboard</h2>
                </div>

                {/* Global Stats */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "12px",
                    marginBottom: "24px",
                }}>
                    {globalStatCards.map((stat) => (
                        <div key={stat.label} style={{
                            background: "rgba(255, 255, 255, 0.7)",
                            backdropFilter: "blur(12px)",
                            border: "1px solid var(--border)",
                            borderRadius: "10px",
                            padding: "14px 18px",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                        }}>
                            <div style={{
                                width: "38px",
                                height: "38px",
                                borderRadius: "10px",
                                background: stat.bg,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}>
                                <stat.icon size={18} style={{ color: stat.color }} />
                            </div>
                            <div>
                                <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>
                                    {stat.value}
                                </div>
                                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                    {stat.label}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Rankings Grid */}
                {rankingsLoading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
                        <div className="spinner" />
                    </div>
                ) : (
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                        gap: "20px",
                    }}>
                        {/* Top Uploaders */}
                        <div style={{
                            background: "rgba(255, 255, 255, 0.7)",
                            backdropFilter: "blur(16px)",
                            border: "1px solid var(--border)",
                            borderRadius: "14px",
                            padding: "20px",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                                <Upload size={16} style={{ color: "#00A2E9" }} />
                                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)" }}>
                                    Top Uploaders
                                </h3>
                            </div>
                            {topUploaders.length === 0 ? (
                                <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>
                                    Belum ada data
                                </p>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    {topUploaders.map((user, i) =>
                                        renderRankItem(i, user.username, user.avatar, user.count, "model")
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Top Commenters */}
                        <div style={{
                            background: "rgba(255, 255, 255, 0.7)",
                            backdropFilter: "blur(16px)",
                            border: "1px solid var(--border)",
                            borderRadius: "14px",
                            padding: "20px",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                                <MessageCircle size={16} style={{ color: "#ec4899" }} />
                                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)" }}>
                                    Top Commenters
                                </h3>
                            </div>
                            {topCommenters.length === 0 ? (
                                <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>
                                    Belum ada data
                                </p>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    {topCommenters.map((user, i) =>
                                        renderRankItem(i, user.username, user.avatar, user.count, "komentar")
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Most Popular Models */}
                        <div style={{
                            background: "rgba(255, 255, 255, 0.7)",
                            backdropFilter: "blur(16px)",
                            border: "1px solid var(--border)",
                            borderRadius: "14px",
                            padding: "20px",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                                <Download size={16} style={{ color: "#16a34a" }} />
                                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)" }}>
                                    Model Terpopuler
                                </h3>
                            </div>
                            {popularModels.length === 0 ? (
                                <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>
                                    Belum ada data
                                </p>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    {popularModels.map((model, i) =>
                                        renderRankItem(
                                            i,
                                            model.title,
                                            model.thumbnailPath,
                                            model.downloadCount,
                                            "download",
                                            `/models/${model.id}`,
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ===== UPLOADER MAP ===== */}
            <div style={{ marginBottom: "40px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                    <MapPin size={20} style={{ color: "var(--accent)" }} />
                    <h2 style={{ fontSize: "18px", fontWeight: "600" }}>Peta Lokasi Upload</h2>
                    {modelLocations.length > 0 && (
                        <span style={{
                            fontSize: "11px",
                            padding: "3px 10px",
                            borderRadius: "20px",
                            background: "rgba(0, 162, 233, 0.1)",
                            color: "var(--accent)",
                            fontWeight: "600",
                        }}>
                            {modelLocations.length} lokasi
                        </span>
                    )}
                </div>
                <UploaderMap locations={modelLocations} />
            </div>

            {/* Recent Models */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: "600" }}>Model Terbaru Anda</h2>
                {stats.totalModels > 6 && (
                    <Link href={`/models?uploader=${(session?.user as any)?.id}`} style={{ color: "var(--accent-light)", fontSize: "13px", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
                        Lihat Semua <ArrowRight size={14} />
                    </Link>
                )}
            </div>

            {loading ? (
                <div className="model-grid">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="skeleton" style={{ height: "240px" }} />
                    ))}
                </div>
            ) : models.length === 0 ? (
                <div style={{
                    textAlign: "center",
                    padding: "60px 20px",
                    background: "rgba(255, 255, 255, 0.5)",
                    borderRadius: "16px",
                    border: "1px solid var(--border)",
                }}>
                    <Box size={48} style={{ color: "var(--text-muted)", margin: "0 auto 16px" }} />
                    <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>
                        Belum ada model
                    </h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "20px" }}>
                        Mulai upload model 3D pertama Anda
                    </p>
                    <Link href="/upload">
                        <button className="btn-primary">
                            <Upload size={16} />
                            Upload Model
                        </button>
                    </Link>
                </div>
            ) : (
                <div className="model-grid">
                    {models.map((model) => (
                        <Link key={model.id} href={`/models/${model.id}`} style={{ textDecoration: "none" }}>
                            <div className="glass-card" style={{ overflow: "hidden", cursor: "pointer" }}>
                                <div style={{
                                    height: "160px",
                                    background: "linear-gradient(135deg, #1a1040, #1e293b)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    position: "relative",
                                }}>
                                    {model.thumbnailPath ? (
                                        <img src={model.thumbnailPath} alt={model.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                        <Box size={40} style={{ color: "var(--text-muted)" }} />
                                    )}
                                    <span className="badge badge-format" style={{
                                        position: "absolute",
                                        top: "10px",
                                        right: "10px",
                                    }}>
                                        {model.fileFormat}
                                    </span>
                                </div>
                                <div style={{ padding: "16px" }}>
                                    <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "var(--text-primary)" }}>
                                        {model.title}
                                    </h3>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)" }}>
                                        <span>{formatSize(model.fileSize)}</span>
                                        <span>{model.downloadCount} downloads</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
