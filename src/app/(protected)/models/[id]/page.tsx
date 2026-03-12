"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";
import {
    ArrowLeft,
    Download,
    Trash2,
    Calendar,
    User,
    HardDrive,
    Tag,
    Folder,
    Box,
    Eye,
    Loader2,
    MessageCircle,
    Send,
    Shield,
} from "lucide-react";

const ModelViewer3D = dynamic(() => import("@/components/ModelViewer3D"), {
    ssr: false,
    loading: () => (
        <div style={{ height: "400px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(30,41,59,0.5)", borderRadius: "12px" }}>
            <div className="spinner" />
        </div>
    ),
});

interface ModelDetail {
    id: string;
    title: string;
    description: string;
    fileName: string;
    originalName: string;
    filePath: string;
    fileSize: number;
    fileFormat: string;
    thumbnailPath: string | null;
    downloadCount: number;
    createdAt: string;
    updatedAt: string;
    category: { id: string; name: string } | null;
    uploader: { id: string; username: string; email: string };
    tags: { tag: { id: string; name: string } }[];
}

interface Comment {
    id: string;
    content: string;
    createdAt: string;
    user: {
        id: string;
        username: string;
        avatar: string | null;
        role: string;
    };
}

function formatSize(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const s = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + s[i];
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function timeAgo(dateStr: string) {
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now.getTime() - past.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "Baru saja";
    if (diffMin < 60) return `${diffMin} menit lalu`;
    if (diffHour < 24) return `${diffHour} jam lalu`;
    if (diffDay < 30) return `${diffDay} hari lalu`;
    return formatDate(dateStr);
}

export default function ModelDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const [model, setModel] = useState<ModelDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [show3D, setShow3D] = useState(false);

    // Comments state
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(true);
    const [commentText, setCommentText] = useState("");
    const [submittingComment, setSubmittingComment] = useState(false);

    const isAdmin = (session?.user as any)?.role === "ADMIN";
    const canDelete = isAdmin;
    const is3DViewable = model?.fileFormat === ".glb" || model?.fileFormat === ".gltf";

    const fetchComments = useCallback(async () => {
        try {
            const res = await fetch(`/api/models/${params.id}/comments`);
            if (res.ok) {
                const data = await res.json();
                setComments(data.comments || []);
            }
        } catch (e) {
            console.error("Failed to fetch comments:", e);
        } finally {
            setCommentsLoading(false);
        }
    }, [params.id]);

    useEffect(() => {
        fetchModel();
        fetchComments();
    }, [params.id]);

    const fetchModel = async () => {
        try {
            const res = await fetch(`/api/models/${params.id}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setModel(data.model);
        } catch (e) {
            toast.error("Model tidak ditemukan");
            router.push("/models");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!model) return;
        setDownloading(true);
        try {
            const res = await fetch(`/api/models/${model.id}/download`);
            if (!res.ok) throw new Error();
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = model.originalName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success("Download berhasil!");
            setModel({ ...model, downloadCount: model.downloadCount + 1 });
        } catch (e) {
            toast.error("Gagal mengunduh file");
        } finally {
            setDownloading(false);
        }
    };

    const handleDelete = async () => {
        if (!model || !confirm("Yakin ingin menghapus model ini?")) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/models/${model.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            toast.success("Model berhasil dihapus");
            router.push("/models");
        } catch (e) {
            toast.error("Gagal menghapus model");
        } finally {
            setDeleting(false);
        }
    };

    const handleSubmitComment = async () => {
        if (!commentText.trim()) return;
        setSubmittingComment(true);
        try {
            const res = await fetch(`/api/models/${params.id}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: commentText.trim() }),
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setComments([data.comment, ...comments]);
            setCommentText("");
            toast.success("Komentar berhasil ditambahkan!");
        } catch (e) {
            toast.error("Gagal menambahkan komentar");
        } finally {
            setSubmittingComment(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
                <div className="spinner" />
            </div>
        );
    }

    if (!model) return null;

    return (
        <div className="fade-in">
            {/* Back button */}
            <Link href="/models" style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--text-secondary)",
                textDecoration: "none",
                fontSize: "14px",
                marginBottom: "24px",
                transition: "color 0.2s",
            }}>
                <ArrowLeft size={16} />
                Kembali ke Katalog
            </Link>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "32px", alignItems: "start" }}>
                {/* Left - Preview */}
                <div>
                    {/* 3D Viewer or Thumbnail */}
                    <div style={{
                        background: "rgba(30, 41, 59, 0.5)",
                        borderRadius: "16px",
                        border: "1px solid var(--border)",
                        overflow: "hidden",
                        marginBottom: "24px",
                    }}>
                        {show3D && is3DViewable ? (
                            <div style={{ height: "450px" }}>
                                <ModelViewer3D modelPath={model.filePath} />
                            </div>
                        ) : (
                            <div style={{
                                height: "400px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "linear-gradient(135deg, #1a1040, #1e293b)",
                                position: "relative",
                            }}>
                                {model.thumbnailPath ? (
                                    <img src={model.thumbnailPath} alt={model.title} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                                ) : (
                                    <Box size={80} style={{ color: "var(--text-muted)", opacity: 0.3 }} />
                                )}
                            </div>
                        )}

                        {is3DViewable && (
                            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "center" }}>
                                <button
                                    className="btn-secondary"
                                    onClick={() => setShow3D(!show3D)}
                                    style={{ fontSize: "13px", padding: "8px 20px" }}
                                >
                                    <Eye size={14} />
                                    {show3D ? "Tampilkan Thumbnail" : "Preview 3D"}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    {model.description && (
                        <div style={{
                            background: "rgba(30, 41, 59, 0.5)",
                            borderRadius: "12px",
                            border: "1px solid var(--border)",
                            padding: "20px",
                        }}>
                            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "10px", color: "var(--text-secondary)" }}>
                                Deskripsi
                            </h3>
                            <p style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-primary)" }}>
                                {model.description}
                            </p>
                        </div>
                    )}
                </div>

                {/* Right - Info Panel */}
                <div>
                    <div style={{
                        background: "rgba(30, 41, 59, 0.5)",
                        borderRadius: "16px",
                        border: "1px solid var(--border)",
                        padding: "24px",
                    }}>
                        {/* Title */}
                        <h1 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "16px", lineHeight: "1.3" }}>
                            {model.title}
                        </h1>

                        {/* Format badge */}
                        <div style={{ marginBottom: "20px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <span className="badge badge-format">{model.fileFormat}</span>
                            {model.category && <span className="badge badge-category">{model.category.name}</span>}
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
                            <button
                                className="btn-primary"
                                onClick={handleDownload}
                                disabled={downloading}
                                style={{ flex: "1", justifyContent: "center" }}
                            >
                                {downloading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={16} />}
                                {downloading ? "Downloading..." : "Download"}
                            </button>
                            {canDelete && (
                                <button
                                    className="btn-danger"
                                    onClick={handleDelete}
                                    disabled={deleting}
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>

                        {/* Info List */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                                <User size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                                <span style={{ color: "var(--text-secondary)" }}>Uploader</span>
                                <span style={{ marginLeft: "auto", fontWeight: "500" }}>{model.uploader.username}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                                <HardDrive size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                                <span style={{ color: "var(--text-secondary)" }}>Ukuran</span>
                                <span style={{ marginLeft: "auto", fontWeight: "500" }}>{formatSize(model.fileSize)}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                                <Download size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                                <span style={{ color: "var(--text-secondary)" }}>Download</span>
                                <span style={{ marginLeft: "auto", fontWeight: "500" }}>{model.downloadCount} kali</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                                <Calendar size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                                <span style={{ color: "var(--text-secondary)" }}>Upload</span>
                                <span style={{ marginLeft: "auto", fontWeight: "500", fontSize: "12px" }}>{formatDate(model.createdAt)}</span>
                            </div>
                            {model.category && (
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                                    <Folder size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                                    <span style={{ color: "var(--text-secondary)" }}>Kategori</span>
                                    <span style={{ marginLeft: "auto", fontWeight: "500" }}>{model.category.name}</span>
                                </div>
                            )}
                        </div>

                        {/* Tags */}
                        {model.tags.length > 0 && (
                            <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px", fontSize: "13px", color: "var(--text-secondary)" }}>
                                    <Tag size={14} />
                                    Tags
                                </div>
                                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                    {model.tags.map((t) => (
                                        <span key={t.tag.id} style={{
                                            fontSize: "12px",
                                            padding: "4px 10px",
                                            borderRadius: "6px",
                                            background: "rgba(99, 102, 241, 0.1)",
                                            color: "var(--accent-light)",
                                            border: "1px solid rgba(99, 102, 241, 0.15)",
                                        }}>
                                            {t.tag.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* File info */}
                        <div style={{
                            marginTop: "20px",
                            paddingTop: "16px",
                            borderTop: "1px solid var(--border)",
                            fontSize: "12px",
                            color: "var(--text-muted)",
                        }}>
                            <div>File: {model.originalName}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== COMMENTS SECTION ===== */}
            <div style={{ marginTop: "40px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                    <MessageCircle size={20} style={{ color: "var(--accent)" }} />
                    <h2 style={{ fontSize: "18px", fontWeight: "600" }}>
                        Komentar ({comments.length})
                    </h2>
                </div>

                {/* Comment Input */}
                <div style={{
                    background: "rgba(255, 255, 255, 0.7)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "24px",
                }}>
                    <textarea
                        className="textarea"
                        placeholder="Tulis komentar Anda..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        style={{ minHeight: "80px", marginBottom: "12px" }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                handleSubmitComment();
                            }
                        }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            Ctrl+Enter untuk mengirim
                        </span>
                        <button
                            className="btn-primary"
                            onClick={handleSubmitComment}
                            disabled={submittingComment || !commentText.trim()}
                            style={{ padding: "8px 20px", fontSize: "13px" }}
                        >
                            {submittingComment ? (
                                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                            ) : (
                                <Send size={14} />
                            )}
                            {submittingComment ? "Mengirim..." : "Kirim"}
                        </button>
                    </div>
                </div>

                {/* Comments List */}
                {commentsLoading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
                        <div className="spinner" />
                    </div>
                ) : comments.length === 0 ? (
                    <div style={{
                        textAlign: "center",
                        padding: "40px 20px",
                        background: "rgba(255, 255, 255, 0.5)",
                        borderRadius: "12px",
                        border: "1px solid var(--border)",
                    }}>
                        <MessageCircle size={36} style={{ color: "var(--text-muted)", margin: "0 auto 12px", opacity: 0.4 }} />
                        <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                            Belum ada komentar. Jadilah yang pertama berkomentar!
                        </p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {comments.map((comment) => (
                            <div
                                key={comment.id}
                                style={{
                                    background: "rgba(255, 255, 255, 0.7)",
                                    backdropFilter: "blur(12px)",
                                    border: "1px solid var(--border)",
                                    borderRadius: "12px",
                                    padding: "16px 20px",
                                    transition: "border-color 0.2s",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                                    {/* Avatar */}
                                    {comment.user.avatar ? (
                                        <img
                                            src={comment.user.avatar}
                                            alt={comment.user.username}
                                            style={{
                                                width: "36px",
                                                height: "36px",
                                                borderRadius: "50%",
                                                objectFit: "cover",
                                                border: "2px solid var(--border)",
                                            }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: "36px",
                                            height: "36px",
                                            borderRadius: "50%",
                                            background: "linear-gradient(135deg, var(--accent), #007bc4)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                        }}>
                                            <User size={18} style={{ color: "white" }} />
                                        </div>
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                                                {comment.user.username}
                                            </span>
                                            {comment.user.role === "ADMIN" && (
                                                <span style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "3px",
                                                    fontSize: "10px",
                                                    fontWeight: "600",
                                                    padding: "2px 8px",
                                                    borderRadius: "4px",
                                                    background: "rgba(239, 68, 68, 0.1)",
                                                    color: "#b91c1c",
                                                    border: "1px solid rgba(239, 68, 68, 0.2)",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.05em",
                                                }}>
                                                    <Shield size={10} />
                                                    Admin
                                                </span>
                                            )}
                                        </div>
                                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                            {timeAgo(comment.createdAt)}
                                        </span>
                                    </div>
                                </div>
                                <p style={{
                                    fontSize: "14px",
                                    lineHeight: "1.6",
                                    color: "var(--text-primary)",
                                    margin: 0,
                                    paddingLeft: "48px",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                }}>
                                    {comment.content}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style jsx>{`
        @media (max-width: 900px) {
          div > div:last-child {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
        </div>
    );
}
