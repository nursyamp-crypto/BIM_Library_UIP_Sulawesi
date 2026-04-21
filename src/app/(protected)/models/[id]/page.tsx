"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import {
    ArrowLeft, Download, Trash2, Calendar, User, HardDrive, Tag, Folder, 
    Box, Eye, Loader2, MessageCircle, Send, Shield, Paperclip, BarChart2, 
    X, Plus, Edit2, UploadCloud, History
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
    glbFilePath: string | null;
    downloadCount: number;
    createdAt: string;
    updatedAt: string;
    version: number;
    category: { id: string; name: string } | null;
    uploader: { id: string; username: string; email: string };
    tags: { tag: { id: string; name: string } }[];
    versions?: {
        id: string;
        version: number;
        originalName: string;
        changeNote: string;
        createdAt: string;
    }[];
}

interface Comment {
    id: string;
    content: string;
    attachments: any;
    pollOptions: any;
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
        day: "numeric", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function timeAgo(dateStr: string) {
    const now = new Date();
    const past = new Date(dateStr);
    const diffSec = Math.floor((now.getTime() - past.getTime()) / 1000);
    if (diffSec < 60) return "Baru saja";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit lalu`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
    return `${Math.floor(diffSec / 86400)} hari lalu`;
}

export default function ModelDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    
    // Model state
    const [model, setModel] = useState<ModelDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [show3D, setShow3D] = useState(true);
    
    // Comments state
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(true);
    const [commentText, setCommentText] = useState("");
    const [submittingComment, setSubmittingComment] = useState(false);
    
    // Features state (Task 5)
    // Attachments
    const [attachments, setAttachments] = useState<any[]>([]);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);
    const attachRef = useRef<HTMLInputElement>(null);
    // Polling
    const [showPollForm, setShowPollForm] = useState(false);
    const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

    // Manage model state (Task 6)
    const [showManageModal, setShowManageModal] = useState(false);
    const [manageTab, setManageTab] = useState<"rename" | "replace">("rename");
    const [newTitle, setNewTitle] = useState("");
    const [replaceFile, setReplaceFile] = useState<File | null>(null);
    const [replaceGlbFile, setReplaceGlbFile] = useState<File | null>(null);
    const [changeNote, setChangeNote] = useState("");
    const [managing, setManaging] = useState(false);

    const currentUser = session?.user as any;
    const isAdmin = currentUser?.role === "ADMIN";
    const canDelete = isAdmin || model?.uploader.id === currentUser?.id;
    const is3DViewable = model?.fileFormat === ".glb" || model?.fileFormat === ".gltf" || !!model?.glbFilePath;

    const fetchModel = useCallback(async () => {
        try {
            const res = await fetch(`/api/models/${params.id}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setModel(data.model);
            setNewTitle(data.model.title);
        } catch (e) {
            toast.error("Model tidak ditemukan");
            router.push("/models");
        } finally {
            setLoading(false);
        }
    }, [params.id, router]);

    const fetchComments = useCallback(async () => {
        try {
            const res = await fetch(`/api/models/${params.id}/comments`);
            if (res.ok) {
                const data = await res.json();
                setComments(data.comments || []);
            }
        } catch (e) {
            console.error("Failed to fetch comments", e);
        } finally {
            setCommentsLoading(false);
        }
    }, [params.id]);

    useEffect(() => {
        fetchModel();
        fetchComments();
    }, [fetchModel, fetchComments]);

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

    // ----- Comments Form Logic (Task 5) -----
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingAttachment(true);
        try {
            const ext = file.name.split('.').pop() || 'tmp';
            const fileName = `attach_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
            const { data, error } = await supabase.storage.from("models").upload(`attachments/${fileName}`, file);
            
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from("models").getPublicUrl(`attachments/${fileName}`);
            
            setAttachments([...attachments, { 
                name: file.name, 
                url: publicUrl, 
                type: file.type.startsWith("image/") ? "image" : "document" 
            }]);
        } catch (err: any) {
            toast.error("Gagal upload lampiran");
        } finally {
            setUploadingAttachment(false);
        }
    };

    const handleSubmitComment = async () => {
        const validPollOptions = pollOptions.filter(o => o.trim()).map((o, i) => ({ id: i, text: o, votes: [] }));
        if (!commentText.trim() && attachments.length === 0 && validPollOptions.length === 0) return;
        
        setSubmittingComment(true);
        try {
            const res = await fetch(`/api/models/${params.id}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    content: commentText.trim(),
                    attachments: attachments.length > 0 ? attachments : null,
                    pollOptions: validPollOptions.length > 0 ? validPollOptions : null
                }),
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setComments([data.comment, ...comments]);
            setCommentText("");
            setAttachments([]);
            setShowPollForm(false);
            setPollOptions(["", ""]);
            toast.success("Komentar berhasil ditambahkan!");
        } catch (e) {
            toast.error("Gagal menambahkan komentar");
        } finally {
            setSubmittingComment(false);
        }
    };

    // Replace & Rename (Task 6)
    const handleManageSubmit = async () => {
        if (!model) return;
        setManaging(true);

        try {
            if (manageTab === "rename") {
                // simple rename (need an API route mapping: PUT /api/models/[id])
                const res = await fetch(`/api/models/${model.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: newTitle }),
                });
                if (!res.ok) throw new Error("Gagal merubah judul");
                toast.success("Judul model diperbarui");
                setModel({ ...model, title: newTitle });
            } else if (manageTab === "replace") {
                if (!replaceFile) {
                    toast.error("Pilih file baru!");
                    return;
                }
                if (!replaceGlbFile) {
                    toast.error("File .glb wajib diunggah untuk versi baru!");
                    return;
                }
                if (!changeNote.trim()) {
                    toast.error("Isi catatan perubahan!");
                    return;
                }

                // Simulate uploading the new file and replacement
                const formData = new FormData();
                formData.append("file", replaceFile);
                formData.append("glbFile", replaceGlbFile);
                formData.append("changeNote", changeNote);
                
                const res = await fetch(`/api/models/${model.id}/replace`, {
                    method: "POST",
                    body: formData,
                });
                if (!res.ok) throw new Error("Gagal mengganti model");
                toast.success("Model berhasil diperbarui ke versi baru");
                fetchModel(); // Refetch completely
            }
            setShowManageModal(false);
            setReplaceFile(null);
            setReplaceGlbFile(null);
            setChangeNote("");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setManaging(false);
        }
    };

    if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}><div className="spinner" /></div>;
    if (!model) return null;

    return (
        <div className="fade-in" style={{ padding: "0 10px" }}>
            <Link href="/models" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", textDecoration: "none", fontSize: "14px", marginBottom: "24px" }}>
                <ArrowLeft size={16} /> Kembali ke Katalog
            </Link>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "32px", alignItems: "start" }}>
                {/* Left - Preview */}
                <div>
                    <div style={{ background: "#e2e8f0", borderRadius: "16px", border: "1px solid var(--border)", overflow: "hidden", marginBottom: "24px" }}>
                        {show3D && is3DViewable ? (
                            <div style={{ height: "75vh", minHeight: "500px" }}>
                                <ModelViewer3D modelPath={model.glbFilePath || model.filePath} />
                            </div>
                        ) : (
                            <div style={{ height: "400px", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #1a1040, #1e293b)", position: "relative" }}>
                                {model.thumbnailPath ? (
                                    <img src={model.thumbnailPath} alt={model.title} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                                ) : (
                                    <Box size={80} style={{ color: "var(--text-muted)", opacity: 0.3 }} />
                                )}
                            </div>
                        )}
                        {is3DViewable && (
                            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "center" }}>
                                <button className="btn-secondary" onClick={() => setShow3D(!show3D)} style={{ fontSize: "13px", padding: "8px 20px" }}>
                                    <Eye size={14} /> {show3D ? "Tampilkan Thumbnail" : "Preview 3D"}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Versions / History Tab (Task 6) */}
                    {model.versions && model.versions.length > 0 && (
                        <div style={{ background: "#e2e8f0", borderRadius: "12px", border: "1px solid var(--border)", padding: "20px", marginBottom: "24px" }}>
                            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "8px" }}>
                                <History size={16} /> Riwayat Versi Model
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <div style={{ padding: "12px", background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: "8px", fontSize: "13px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                        <span style={{ fontWeight: "600", color: "var(--accent-light)" }}>Versi Saat Ini (V{model.version})</span>
                                        <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>{formatDate(model.updatedAt)}</span>
                                    </div>
                                    <div style={{ color: "var(--text-primary)" }}>{model.originalName}</div>
                                </div>
                                
                                {model.versions.map(v => (
                                    <div key={v.id} style={{ padding: "12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                            <span style={{ fontWeight: "600" }}>Versi {v.version}</span>
                                            <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>{formatDate(v.createdAt)}</span>
                                        </div>
                                        <div style={{ color: "var(--text-secondary)", marginBottom: "4px" }}>{v.originalName}</div>
                                        <div style={{ color: "var(--text-muted)", fontStyle: "italic", borderLeft: "2px solid var(--border)", paddingLeft: "8px", marginTop: "8px" }}>
                                            Catatan: {v.changeNote}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right - Info Panel */}
                <div>
                    <div style={{ background: "#e2e8f0", borderRadius: "16px", border: "1px solid var(--border)", padding: "24px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                            <h1 style={{ fontSize: "22px", fontWeight: "700", lineHeight: "1.3" }}>
                                {model.title} <span style={{ fontSize: "14px", color: "var(--accent-light)", fontWeight: "500" }}>(V{model.version})</span>
                            </h1>
                            {canDelete && (
                                <button className="btn-secondary" onClick={() => setShowManageModal(true)} style={{ padding: "6px", flexShrink: 0 }} title="Kelola Model">
                                    <Edit2 size={16} />
                                </button>
                            )}
                        </div>

                        <div style={{ marginBottom: "20px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <span className="badge badge-format">{model.fileFormat}</span>
                            {model.category && <span className="badge badge-category">{model.category.name}</span>}
                        </div>

                        <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
                            <button className="btn-primary" onClick={handleDownload} disabled={downloading} style={{ flex: "1", justifyContent: "center" }}>
                                {downloading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={16} />}
                                {downloading ? "Downloading..." : "Download"}
                            </button>
                            {canDelete && (
                                <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                                <User size={15} style={{ color: "var(--text-muted)" }} />
                                <span style={{ color: "var(--text-secondary)" }}>Uploader</span>
                                <span style={{ marginLeft: "auto", fontWeight: "500" }}>{model.uploader.username}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                                <HardDrive size={15} style={{ color: "var(--text-muted)" }} />
                                <span style={{ color: "var(--text-secondary)" }}>Ukuran</span>
                                <span style={{ marginLeft: "auto", fontWeight: "500" }}>{formatSize(model.fileSize)}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                                <Download size={15} style={{ color: "var(--text-muted)" }} />
                                <span style={{ color: "var(--text-secondary)" }}>Download</span>
                                <span style={{ marginLeft: "auto", fontWeight: "500" }}>{model.downloadCount} kali</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                                <Calendar size={15} style={{ color: "var(--text-muted)" }} />
                                <span style={{ color: "var(--text-secondary)" }}>Upload</span>
                                <span style={{ marginLeft: "auto", fontWeight: "500", fontSize: "12px" }}>{formatDate(model.createdAt)}</span>
                            </div>
                        </div>

                        {model.tags.length > 0 && (
                            <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                    {model.tags.map((t) => (
                                        <span key={t.tag.id} className="badge" style={{ background: "rgba(99,102,241,0.1)", color: "var(--accent-light)", border: "1px solid rgba(99,102,241,0.15)" }}>
                                            {t.tag.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ===== COMMENTS SECTION (Task 5) ===== */}
            <div style={{ marginTop: "40px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                    <MessageCircle size={20} style={{ color: "var(--accent)" }} />
                    <h2 style={{ fontSize: "18px", fontWeight: "600" }}>Komentar ({comments.length})</h2>
                </div>

                {/* Comment Input */}
                <div style={{ background: "rgba(255, 255, 255, 0.7)", backdropFilter: "blur(16px)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
                    <textarea
                        className="textarea"
                        placeholder="Tulis komentar Anda..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        style={{ minHeight: "80px", marginBottom: "12px" }}
                    />
                    
                    {/* Attachments Preview */}
                    {attachments.length > 0 && (
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px", padding: "8px", background: "rgba(0,0,0,0.05)", borderRadius: "8px" }}>
                            {attachments.map((att, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", background: "var(--bg-card)", padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border)" }}>
                                    <Paperclip size={10} /> {att.name}
                                    <button onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: "4px" }}>
                                        <X size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Poll Form Preview */}
                    {showPollForm && (
                        <div style={{ marginBottom: "12px", padding: "12px", background: "rgba(0,0,0,0.03)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                            <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                                Pilihan Polling
                                <X size={14} style={{ cursor: "pointer" }} onClick={() => setShowPollForm(false)} />
                            </div>
                            {pollOptions.map((opt, i) => (
                                <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                                    <input type="text" className="input" placeholder={`Opsi ${i+1}`} value={opt} onChange={e => {
                                        const newOpts = [...pollOptions];
                                        newOpts[i] = e.target.value;
                                        setPollOptions(newOpts);
                                    }} style={{ padding: "6px 10px", fontSize: "13px" }} />
                                    {i > 1 && <button onClick={() => setPollOptions(pollOptions.filter((_, idx)=>idx !== i))} className="btn-danger" style={{ padding: "6px" }}><Trash2 size={14}/></button>}
                                </div>
                            ))}
                            <button onClick={() => setPollOptions([...pollOptions, ""])} className="btn-secondary" style={{ fontSize: "12px", padding: "4px 8px" }}><Plus size={12}/> Tambah Opsi</button>
                        </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <input type="file" ref={attachRef} style={{ display: "none" }} onChange={handleFileUpload} />
                            <button className="btn-secondary" onClick={() => attachRef.current?.click()} disabled={uploadingAttachment} style={{ padding: "6px 12px", fontSize: "12px" }}>
                                {uploadingAttachment ? <Loader2 size={14} className="spin" /> : <Paperclip size={14} />} Foto/Dokumen
                            </button>
                            <button className="btn-secondary" onClick={() => setShowPollForm(true)} style={{ padding: "6px 12px", fontSize: "12px" }}>
                                <BarChart2 size={14} /> Buat Polling
                            </button>
                        </div>
                        <button className="btn-primary" onClick={handleSubmitComment} disabled={submittingComment} style={{ padding: "8px 20px", fontSize: "13px" }}>
                            {submittingComment ? <Loader2 size={14} className="spin" /> : <Send size={14} />} Kirim
                        </button>
                    </div>
                </div>

                {/* Comments List */}
                {commentsLoading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}><div className="spinner" /></div>
                ) : comments.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 20px", background: "rgba(255, 255, 255, 0.5)", borderRadius: "12px", border: "1px solid var(--border)" }}>
                        <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Belum ada komentar.</p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {comments.map((comment) => (
                            <div key={comment.id} style={{ background: "rgba(255, 255, 255, 0.7)", backdropFilter: "blur(12px)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px 20px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                                    {comment.user.avatar ? (
                                        <img src={comment.user.avatar} alt="Avatar" style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }} />
                                    ) : (
                                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}><User size={18} color="white" /></div>
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: "600", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                                            {comment.user.username}
                                            {comment.user.role === "ADMIN" && <span style={{ fontSize: "10px", background: "rgba(239,68,68,0.1)", color: "#b91c1c", padding: "2px 6px", borderRadius: "4px" }}>Admin</span>}
                                        </div>
                                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{timeAgo(comment.createdAt)}</div>
                                    </div>
                                </div>
                                {comment.content && <p style={{ fontSize: "14px", color: "var(--text-primary)", paddingLeft: "48px", whiteSpace: "pre-wrap", marginBottom: "8px" }}>{comment.content}</p>}
                                
                                {/* Render Attachments */}
                                {comment.attachments && Array.isArray(comment.attachments) && (
                                    <div style={{ paddingLeft: "48px", display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                                        {comment.attachments.map((att, i) => (
                                            <a key={i} href={att.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "rgba(99,102,241,0.1)", borderRadius: "8px", fontSize: "12px", textDecoration: "none", color: "var(--accent)" }}>
                                                {att.type === "image" ? <Eye size={12}/> : <Download size={12}/>} {att.name}
                                            </a>
                                        ))}
                                    </div>
                                )}

                                {/* Render Poll */}
                                {comment.pollOptions && Array.isArray(comment.pollOptions) && (
                                    <div style={{ paddingLeft: "48px", marginTop: "12px" }}>
                                        <div style={{ background: "rgba(0,0,0,0.03)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                                            <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}><BarChart2 size={14}/> Polling</div>
                                            {comment.pollOptions.map((opt, i) => (
                                                <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                                    <button className="btn-secondary" style={{ flex: 1, justifyContent: "space-between", padding: "8px 12px", fontSize: "13px" }}>
                                                        {opt.text} <span style={{ background: "var(--border)", padding: "2px 6px", borderRadius: "10px", fontSize: "10px" }}>{opt.votes?.length || 0}</span>
                                                    </button>
                                                </div>
                                            ))}
                                            <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "8px", textAlign: "right" }}>Fitur Vote interaktif tersedia di update selanjutnya.</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Manage Model Modal (Task 6) */}
            {showManageModal && (
                <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
                    <div style={{ background: "var(--bg)", width: "450px", borderRadius: "16px", padding: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                            <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#ffffff" }}>Kelola Model</h3>
                            <button onClick={() => setShowManageModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={20}/></button>
                        </div>
                        
                        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
                            <button className={manageTab === "rename" ? "btn-primary" : "btn-secondary"} style={{ flex: 1 }} onClick={() => setManageTab("rename")}>Ubah Judul</button>
                            <button className={manageTab === "replace" ? "btn-primary" : "btn-secondary"} style={{ flex: 1 }} onClick={() => setManageTab("replace")}>Ganti File (Versi Baru)</button>
                        </div>

                        {manageTab === "rename" && (
                            <div>
                                <label className="label" style={{ color: "#ffffff", fontWeight: "500", fontSize: "14px" }}>Judul Model</label>
                                <input type="text" className="input" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={{ marginBottom: "20px" }} />
                                <button className="btn-primary" style={{ width: "100%", justifyContent: "center", fontWeight: "600" }} onClick={handleManageSubmit} disabled={managing || newTitle === model.title}>{managing ? "Menyimpan..." : "Simpan Perubahan"}</button>
                            </div>
                        )}

                        {manageTab === "replace" && (
                            <div>
                                <label className="label" style={{ color: "#ffffff", fontWeight: "500", fontSize: "14px" }}>File 3D Pengganti (Original)</label>
                                <input type="file" className="input" onChange={e => setReplaceFile(e.target.files?.[0] || null)} style={{ marginBottom: "12px", color: "#fff" }} />
                                
                                <label className="label" style={{ color: "#ffffff", fontWeight: "500", fontSize: "14px" }}>Format View 3D (.glb) *Wajib</label>
                                <input type="file" className="input" accept=".glb,.gltf" onChange={e => setReplaceGlbFile(e.target.files?.[0] || null)} style={{ marginBottom: "16px", color: "#fff" }} />

                                <label className="label" style={{ color: "#ffffff", fontWeight: "500", fontSize: "14px" }}>Catatan Perubahan (Changelog)</label>
                                <textarea className="textarea" placeholder="Apa yang baru di versi ini?" value={changeNote} onChange={e => setChangeNote(e.target.value)} style={{ minHeight: "80px", marginBottom: "20px" }} />

                                <div style={{ fontSize: "12px", color: "var(--warning)", marginBottom: "20px", display: "flex", gap: "6px" }}>
                                    <UploadCloud size={16} /> File baru akan dicatat sebagai Versi {model.version + 1}.
                                </div>

                                <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={handleManageSubmit} disabled={managing || !replaceFile || !replaceGlbFile || !changeNote}>{managing ? "Mengunggah..." : "Unggah Versi Baru"}</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
