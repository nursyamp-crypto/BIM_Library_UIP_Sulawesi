"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
    Upload,
    X,
    FileBox,
    Image as ImageIcon,
    Loader2,
    CheckCircle,
    MapPin,
    Camera,
    Box
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Canvas, useThree } from "@react-three/fiber";
import { Stage, useGLTF } from "@react-three/drei";

interface Category {
    id: string;
    name: string;
}

const ALLOWED_FORMATS = [".skp", ".obj", ".fbx", ".stl", ".glb", ".gltf", ".ifc", ".rvt", ".rfa"];
const MAX_SIZE = 1024 * 1024 * 1024; // 1GB

function formatSize(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const s = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + s[i];
}

import * as THREE from "three";

function ModelLoader({ url, onLoaded }: { url: string, onLoaded: (gl: any, scene: any, camera: any) => void }) {
    const { scene: modelScene } = useGLTF(url);
    const { gl, camera, scene: rootScene } = useThree();

    useEffect(() => {
        if (modelScene) {
            onLoaded(gl, rootScene, camera);
        }
    }, [modelScene, gl, rootScene, camera, onLoaded]);

    return (
        <Stage intensity={1} environment="city" adjustCamera={true}>
            <ambientLight intensity={2.5} />
            <directionalLight position={[10, 10, 10]} intensity={3.5} />
            <directionalLight position={[-10, 5, -10]} intensity={1.5} />
            <primitive object={modelScene} />
        </Stage>
    );
}

function AutoThumbnailGenerator({ file, onGenerated }: { file: File, onGenerated: (file: File) => void }) {
    const [url, setUrl] = useState("");

    useEffect(() => {
        const u = URL.createObjectURL(file);
        setUrl(u);
        return () => URL.revokeObjectURL(u);
    }, [file]);

    if (!url) return null;

    return (
        <div style={{ position: "fixed", top: "-2000px", left: "-2000px", width: "512px", height: "512px", opacity: 0.01, pointerEvents: "none", zIndex: -100 }}>
            <Canvas gl={{ preserveDrawingBuffer: true, alpha: true }}>
                <Suspense fallback={null}>
                    <ModelLoader url={url} onLoaded={(gl, scene, camera) => {
                        setTimeout(() => {
                            // Ensure background is solid white/gray instead of transparent which turns black in some formats
                            gl.setClearColor(0xf1f5f9, 1);
                            scene.background = new THREE.Color(0xf1f5f9);
                            gl.render(scene, camera);
                            
                            gl.domElement.toBlob((blob: Blob | null) => {
                                if (blob) {
                                    // Use PNG to preserve transparency just in case, avoiding JPEG black-bg issue
                                    const thumbName = file.name.replace(/\.[^/.]+$/, ".png");
                                    const thumbFile = new File([blob], thumbName, { type: "image/png" });
                                    onGenerated(thumbFile);
                                }
                            }, 'image/png');
                        }, 1500); // 1.5s wait helps to ensure textures and Stage are fully lit
                    }} />
                </Suspense>
            </Canvas>
        </div>
    );
}

export default function UploadPage() {
    const router = useRouter();
    const fileRef = useRef<HTMLInputElement>(null);
    const glbRef = useRef<HTMLInputElement>(null);
    const thumbRef = useRef<HTMLInputElement>(null);

    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [glbDragOver, setGlbDragOver] = useState(false);

    const [file, setFile] = useState<File | null>(null);
    const [glbFile, setGlbFile] = useState<File | null>(null);
    const [thumbnail, setThumbnail] = useState<File | null>(null);
    const [generatingThumb, setGeneratingThumb] = useState(false);

    const requiresGlb = file && !(file.name.toLowerCase().endsWith(".glb") || file.name.toLowerCase().endsWith(".gltf"));
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
            toast.error("Ukuran file melebihi 1GB");
            return false;
        }
        return true;
    };

    const processFileSelection = (f: File) => {
        if (validateFile(f)) {
            setFile(f);
            if (!title) setTitle(f.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "));
            
            // Auto generate thumb for 3D formats
            setThumbnail(null);
            setGlbFile(null);
            const ext = f.name.toLowerCase();
            if (ext.endsWith(".glb") || ext.endsWith(".gltf")) {
                setGeneratingThumb(true);
            } else {
                setGeneratingThumb(false);
            }
        }
    };

    const processGlbSelection = (f: File) => {
        const ext = f.name.toLowerCase();
        if (ext.endsWith(".glb") || ext.endsWith(".gltf")) {
            setGlbFile(f);
            setGeneratingThumb(true);
        } else {
            toast.error("File preview harus berformat .glb atau .gltf");
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) processFileSelection(f);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) processFileSelection(f);
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

        if (requiresGlb && !glbFile) {
            toast.error("File .glb pendamping wajib diupload untuk format ini");
            return;
        }

        setLoading(true);
        try {
            const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();

            // 1. Upload Model File to Supabase
            const ext = file.name.substring(file.name.lastIndexOf("."));
            const fileName = `${uniqueId}${ext}`;
            
            const { error: modelUploadError } = await supabase.storage
                .from('models')
                .upload(fileName, file, { cacheControl: '3600', upsert: false });

            if (modelUploadError) throw new Error("Gagal mengupload file asli ke penyimpanan");

            const { data: { publicUrl: fileUrl } } = supabase.storage.from('models').getPublicUrl(fileName);

            // 2. Upload GLB File if required
            let glbFileUrl: string | null = null;
            if (requiresGlb && glbFile) {
                const glbExt = glbFile.name.substring(glbFile.name.lastIndexOf("."));
                const glbName = `${uniqueId}_preview${glbExt}`;
                const { error: glbUploadError } = await supabase.storage
                    .from('models')
                    .upload(glbName, glbFile, { cacheControl: '3600', upsert: false });
                
                if (glbUploadError) throw new Error("Gagal mengupload file preview GLB");
                const { data: glbData } = supabase.storage.from('models').getPublicUrl(glbName);
                glbFileUrl = glbData.publicUrl;
            }

            // 3. Upload Thumbnail if exists
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
                glbFileUrl: glbFileUrl,
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

            {generatingThumb && (file || glbFile) && (
                <AutoThumbnailGenerator 
                    file={glbFile || file!} 
                    onGenerated={(thumbFile) => {
                        setThumbnail(thumbFile);
                        setGeneratingThumb(false);
                        toast.success("Thumbnail 3D berhasil di-generate secara otomatis!");
                    }} 
                />
            )}

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
                                onClick={(e) => { e.stopPropagation(); setFile(null); setGlbFile(null); setThumbnail(null); setGeneratingThumb(false); }}
                                style={{ fontSize: "12px", padding: "6px 14px" }}
                            >
                                <X size={12} />
                                Ganti File Asli
                            </button>
                        </div>
                    ) : (
                        <div>
                            <FileBox size={40} style={{ color: "var(--text-muted)", marginBottom: "12px" }} />
                            <div style={{ fontSize: "15px", fontWeight: "500", marginBottom: "6px" }}>
                                Drag & drop file asli di sini
                            </div>
                            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "4px" }}>
                                format asli seperti .rvt, .skp, dll
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                Format: {ALLOWED_FORMATS.join(", ")} • Max: 1GB
                            </div>
                        </div>
                    )}
                </div>

                {/* GLB Upload Zone (if required) */}
                {requiresGlb && (
                    <div style={{ marginBottom: "24px" }}>
                        <label className="label">File Preview (.glb / .gltf) <span style={{color: "var(--accent)"}}>*Wajib</span></label>
                        <div
                            className={`upload-zone ${glbDragOver ? "dragover" : ""}`}
                            onDragOver={(e) => { e.preventDefault(); setGlbDragOver(true); }}
                            onDragLeave={() => setGlbDragOver(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setGlbDragOver(false);
                                const f = e.dataTransfer.files[0];
                                if (f) processGlbSelection(f);
                            }}
                            onClick={() => glbRef.current?.click()}
                            style={{ 
                                padding: "24px", 
                                background: glbFile ? "rgba(16, 185, 129, 0.05)" : "rgba(30, 41, 59, 0.3)",
                                borderStyle: glbFile ? "solid" : "dashed",
                                borderColor: glbFile ? "var(--success)" : "var(--accent)"
                            }}
                        >
                            <input
                                ref={glbRef}
                                type="file"
                                accept=".glb,.gltf"
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) processGlbSelection(f);
                                }}
                                style={{ display: "none" }}
                            />
                            {glbFile ? (
                                <div>
                                    <CheckCircle size={32} style={{ color: "var(--success)", marginBottom: "8px" }} />
                                    <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>
                                        {glbFile.name}
                                    </div>
                                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
                                        {formatSize(glbFile.size)} • Siap dipreview
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={(e) => { e.stopPropagation(); setGlbFile(null); setThumbnail(null); setGeneratingThumb(false); }}
                                        style={{ fontSize: "12px", padding: "4px 12px" }}
                                    >
                                        <X size={12} />
                                        Ganti GLB
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <Box size={32} style={{ color: "var(--accent)", marginBottom: "8px" }} />
                                    <div style={{ fontSize: "14px", fontWeight: "500", marginBottom: "4px" }}>
                                        Upload versi ekspor (.glb)
                                    </div>
                                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                        Diperlukan agar model bisa diputar di web
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

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
                            {generatingThumb ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "var(--accent)", padding: "8px 0" }}>
                                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                                    <span>Sedang men-generate thumbnail 3D otomatis...</span>
                                </div>
                            ) : (
                                <>
                                    {thumbnail ? (
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                            <div style={{ 
                                                width: "60px", 
                                                height: "60px", 
                                                borderRadius: "8px", 
                                                overflow: "hidden",
                                                border: "1px solid var(--border)"
                                            }}>
                                                <img 
                                                    src={URL.createObjectURL(thumbnail)} 
                                                    alt="Thumbnail Preview" 
                                                    style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                                                />
                                            </div>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                                <span style={{ fontSize: "13px", color: "var(--success)", display: "flex", alignItems: "center", gap: "4px" }}>
                                                    <Camera size={14} /> Thumbnail siap
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => thumbRef.current?.click()}
                                                    style={{ fontSize: "12px", background: "none", border: "none", color: "var(--accent-light)", cursor: "pointer", padding: 0, textAlign: "left" }}
                                                >
                                                    Ganti Manual
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            onClick={() => thumbRef.current?.click()}
                                            style={{ fontSize: "13px" }}
                                        >
                                            <ImageIcon size={14} />
                                            Pilih Thumbnail
                                        </button>
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
                                </>
                            )}
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
                        disabled={loading || !file || generatingThumb || (!!requiresGlb && !glbFile)}
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
