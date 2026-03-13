"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
    Upload,
    X,
    FileBox,
    Image,
    Loader2,
    CheckCircle,
    MapPin,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Category {
    id: string;
    name: string;
}

const ALLOWED_FORMATS = [".skp", ".obj", ".fbx", ".stl", ".glb", ".gltf", ".ifc", ".rvt", ".rfa"];
const MAX_SIZE = 100 * 1024 * 1024; // 100MB

function formatSize(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const s = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + s[i];
}

export default function UploadPage() {
    const router = useRouter();
    const fileRef = useRef<HTMLInputElement>(null);
    const thumbRef = useRef<HTMLInputElement>(null);

    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const [file, setFile] = useState<File | null>(null);
    const [thumbnail, setThumbnail] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [tags, setTags] = useState("");
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [geoStatus, setGeoStatus] = useState<string>("Mendeteksi lokasi...");

    useEffect(() => {
        fetch("/api/categories")
            .then((r) => r.json())
            .then((d) => setCategories(d.categories || []))
            .catch(() => { });

        // Request geolocation
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setGeoStatus("Lokasi terdeteksi");
                },
                (err) => {
                    console.warn("Geolocation error:", err.message);
                    setGeoStatus("Lokasi tidak tersedia");
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        } else {
            setGeoStatus("Browser tidak mendukung geolokasi");
        }
    }, []);

    const validateFile = (f: File): boolean => {
        const ext = f.name.toLowerCase().substring(f.name.lastIndexOf("."));
        if (!ALLOWED_FORMATS.includes(ext)) {
            toast.error(`Format ${ext} tidak didukung`);
            return false;
        }
        if (f.size > MAX_SIZE) {
            toast.error("Ukuran file melebihi 100MB");
            return false;
        }
        return true;
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f && validateFile(f)) {
            setFile(f);
            if (!title) setTitle(f.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "));
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f && validateFile(f)) {
            setFile(f);
            if (!title) setTitle(f.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            toast.error("Pilih file model 3D");
            return;
        }
        if (!title.trim()) {
            toast.error("Judul wajib diisi");
            return;
        }

        setLoading(true);
        try {
            // 1. Upload Model File to Supabase
            const ext = file.name.substring(file.name.lastIndexOf("."));
            const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
            const fileName = `${uniqueId}${ext}`;
            
            const { error: modelUploadError } = await supabase.storage
                .from('models')
                .upload(fileName, file, { cacheControl: '3600', upsert: false });

            if (modelUploadError) {
                console.error("Supabase Upload Error:", modelUploadError);
                throw new Error("Gagal mengupload file ke penyimpanan (pastikan bucket 'models' sudah diset)");
            }

            const { data: { publicUrl: fileUrl } } = supabase.storage.from('models').getPublicUrl(fileName);

            // 2. Upload Thumbnail if exists
            let thumbnailUrl: string | null = null;
            if (thumbnail) {
                const thumbExt = thumbnail.name.substring(thumbnail.name.lastIndexOf("."));
                const thumbFileName = `${uniqueId}${thumbExt}`;
                const { error: thumbUploadError } = await supabase.storage
                    .from('thumbnails')
                    .upload(thumbFileName, thumbnail, { cacheControl: '3600', upsert: false });

                if (!thumbUploadError) {
                    const { data: thumbData } = supabase.storage.from('thumbnails').getPublicUrl(thumbFileName);
                    thumbnailUrl = thumbData.publicUrl;
                } else {
                    console.error("Thumbnail Upload Error:", thumbUploadError);
                }
            }

            // 3. Send metadata to Vercel API
            const payload = {
                title: title.trim(),
                description: description.trim(),
                categoryId: categoryId || null,
                tagsStr: tags,
                fileUrl: fileUrl,
                fileName: fileName,
                originalName: file.name,
                fileSize: file.size,
                fileFormat: ext.toLowerCase(),
                thumbnailUrl: thumbnailUrl,
                latitude: coords ? coords.lat : null,
                longitude: coords ? coords.lng : null
            };

            const res = await fetch("/api/models", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Gagal menyimpan data model");
            }

            const data = await res.json();
            toast.success("Model berhasil diupload!");
            router.push(`/models/${data.model.id}`);
        } catch (error: any) {
            toast.error(error.message || "Gagal mengupload model");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fade-in" style={{ maxWidth: "740px" }}>
            <div className="page-header">
                <h1 className="page-title">Upload Model 3D</h1>
                <p className="page-subtitle">Upload file model 3D ke warehouse</p>
            </div>

            <form onSubmit={handleSubmit}>
                {/* File Upload Zone */}
                <div
                    className={`upload-zone ${dragOver ? "dragover" : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    style={{ marginBottom: "24px" }}
                >
                    <input
                        ref={fileRef}
                        type="file"
                        accept={ALLOWED_FORMATS.join(",")}
                        onChange={handleFileSelect}
                        style={{ display: "none" }}
                    />
                    {file ? (
                        <div>
                            <CheckCircle size={40} style={{ color: "var(--success)", marginBottom: "12px" }} />
                            <div style={{ fontSize: "15px", fontWeight: "600", marginBottom: "6px" }}>
                                {file.name}
                            </div>
                            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "12px" }}>
                                {formatSize(file.size)} • {file.name.substring(file.name.lastIndexOf(".")).toUpperCase()}
                            </div>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                style={{ fontSize: "12px", padding: "6px 14px" }}
                            >
                                <X size={12} />
                                Ganti File
                            </button>
                        </div>
                    ) : (
                        <div>
                            <FileBox size={40} style={{ color: "var(--text-muted)", marginBottom: "12px" }} />
                            <div style={{ fontSize: "15px", fontWeight: "500", marginBottom: "6px" }}>
                                Drag & drop file di sini
                            </div>
                            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "4px" }}>
                                atau klik untuk memilih file
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                Format: {ALLOWED_FORMATS.join(", ")} • Max: 100MB
                            </div>
                        </div>
                    )}
                </div>

                {/* Model Info Form */}
                <div style={{
                    background: "rgba(30, 41, 59, 0.5)",
                    borderRadius: "16px",
                    border: "1px solid var(--border)",
                    padding: "24px",
                }}>
                    <div style={{ marginBottom: "20px" }}>
                        <label className="label">Judul Model *</label>
                        <input
                            className="input"
                            type="text"
                            placeholder="Nama model 3D"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                        <label className="label">Deskripsi</label>
                        <textarea
                            className="textarea"
                            placeholder="Deskripsikan model 3D Anda..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                        <div>
                            <label className="label">Kategori</label>
                            <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                                <option value="">Pilih kategori</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Tags (pisahkan dengan koma)</label>
                            <input
                                className="input"
                                type="text"
                                placeholder="modern, detailed, textured"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Thumbnail */}
                    <div style={{ marginBottom: "24px" }}>
                        <label className="label">Thumbnail / Preview Image</label>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => thumbRef.current?.click()}
                                style={{ fontSize: "13px" }}
                            >
                                <Image size={14} />
                                {thumbnail ? "Ganti Thumbnail" : "Pilih Thumbnail"}
                            </button>
                            {thumbnail && (
                                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                    {thumbnail.name}
                                </span>
                            )}
                            <input
                                ref={thumbRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) setThumbnail(e.target.files[0]);
                                }}
                                style={{ display: "none" }}
                            />
                        </div>
                    </div>

                    {/* Geolocation Info */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "12px 16px",
                        background: coords ? "rgba(22, 163, 74, 0.08)" : "rgba(245, 158, 11, 0.08)",
                        border: `1px solid ${coords ? "rgba(22, 163, 74, 0.2)" : "rgba(245, 158, 11, 0.2)"}`,
                        borderRadius: "10px",
                        marginBottom: "24px",
                    }}>
                        <MapPin size={16} style={{ color: coords ? "var(--success)" : "var(--warning)", flexShrink: 0 }} />
                        <div>
                            <div style={{ fontSize: "12px", fontWeight: "600", color: coords ? "var(--success)" : "var(--warning)" }}>
                                {geoStatus}
                            </div>
                            {coords && (
                                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                                    {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading || !file}
                        style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "15px" }}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                                Mengupload...
                            </>
                        ) : (
                            <>
                                <Upload size={18} />
                                Upload Model
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
