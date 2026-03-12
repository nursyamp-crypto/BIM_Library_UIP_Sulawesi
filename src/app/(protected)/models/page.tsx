"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, SlidersHorizontal, Box, Download, ChevronDown } from "lucide-react";

interface Model {
    id: string;
    title: string;
    description: string;
    fileFormat: string;
    fileSize: number;
    downloadCount: number;
    thumbnailPath: string | null;
    createdAt: string;
    category: { id: string; name: string } | null;
    uploader: { id: string; username: string };
    tags: { tag: { id: string; name: string } }[];
}

interface Category {
    id: string;
    name: string;
    slug: string;
    _count: { models: number };
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
        month: "short",
        year: "numeric",
    });
}

function ModelsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [models, setModels] = useState<Model[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [showFilters, setShowFilters] = useState(false);

    // Filters
    const [search, setSearch] = useState(searchParams.get("search") || "");
    const [category, setCategory] = useState(searchParams.get("category") || "");
    const [format, setFormat] = useState(searchParams.get("format") || "");
    const [sort, setSort] = useState(searchParams.get("sort") || "newest");
    const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));

    const formats = [".skp", ".obj", ".fbx", ".stl", ".glb", ".gltf", ".ifc", ".rvt", ".rfa"];

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchModels();
    }, [page, category, format, sort]);

    const fetchCategories = async () => {
        try {
            const res = await fetch("/api/categories");
            const data = await res.json();
            setCategories(data.categories || []);
        } catch (e) { }
    };

    const fetchModels = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("page", page.toString());
            params.set("limit", "12");
            if (search) params.set("search", search);
            if (category) params.set("category", category);
            if (format) params.set("format", format);
            params.set("sort", sort);

            const uploaderParam = searchParams.get("uploader");
            if (uploaderParam) params.set("uploader", uploaderParam);

            const res = await fetch(`/api/models?${params.toString()}`);
            const data = await res.json();
            setModels(data.models || []);
            setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchModels();
    };

    const clearFilters = () => {
        setSearch("");
        setCategory("");
        setFormat("");
        setSort("newest");
        setPage(1);
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1 className="page-title">Katalog Model 3D</h1>
                <p className="page-subtitle">
                    {pagination.total} model tersedia
                </p>
            </div>

            {/* Search & Filters */}
            <div style={{ marginBottom: "24px" }}>
                <form onSubmit={handleSearch} style={{ display: "flex", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
                    <div style={{ flex: "1", minWidth: "250px", position: "relative" }}>
                        <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                        <input
                            className="input"
                            type="text"
                            placeholder="Cari model..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ paddingLeft: "40px" }}
                        />
                    </div>
                    <button type="submit" className="btn-primary">
                        <Search size={16} />
                        Cari
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => setShowFilters(!showFilters)}>
                        <SlidersHorizontal size={16} />
                        Filter
                        <ChevronDown size={14} style={{ transform: showFilters ? "rotate(180deg)" : "none", transition: "0.2s" }} />
                    </button>
                </form>

                {showFilters && (
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: "12px",
                        padding: "16px",
                        background: "rgba(30, 41, 59, 0.5)",
                        borderRadius: "12px",
                        border: "1px solid var(--border)",
                        animation: "fadeIn 0.2s ease",
                    }}>
                        <div>
                            <label className="label">Kategori</label>
                            <select className="select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
                                <option value="">Semua Kategori</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name} ({cat._count.models})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Format File</label>
                            <select className="select" value={format} onChange={(e) => { setFormat(e.target.value); setPage(1); }}>
                                <option value="">Semua Format</option>
                                {formats.map((f) => (
                                    <option key={f} value={f}>{f.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Urutkan</label>
                            <select className="select" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
                                <option value="newest">Terbaru</option>
                                <option value="oldest">Terlama</option>
                                <option value="name">Nama (A-Z)</option>
                                <option value="popular">Terpopuler</option>
                                <option value="size">Ukuran File</option>
                            </select>
                        </div>
                        <div style={{ display: "flex", alignItems: "flex-end" }}>
                            <button className="btn-secondary" onClick={clearFilters} style={{ width: "100%" }}>
                                Reset Filter
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Model Grid */}
            {loading ? (
                <div className="model-grid">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="skeleton" style={{ height: "280px" }} />
                    ))}
                </div>
            ) : models.length === 0 ? (
                <div style={{
                    textAlign: "center",
                    padding: "60px 20px",
                    background: "rgba(30, 41, 59, 0.3)",
                    borderRadius: "16px",
                    border: "1px solid var(--border)",
                }}>
                    <Box size={48} style={{ color: "var(--text-muted)", margin: "0 auto 16px" }} />
                    <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>
                        Tidak ada model ditemukan
                    </h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                        Coba ubah filter pencarian Anda
                    </p>
                </div>
            ) : (
                <>
                    <div className="model-grid">
                        {models.map((model) => (
                            <Link key={model.id} href={`/models/${model.id}`} style={{ textDecoration: "none" }}>
                                <div className="glass-card" style={{ overflow: "hidden", cursor: "pointer", height: "100%" }}>
                                    {/* Thumbnail */}
                                    <div style={{
                                        height: "170px",
                                        background: "linear-gradient(135deg, #1a1040, #1e293b)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        position: "relative",
                                        overflow: "hidden",
                                    }}>
                                        {model.thumbnailPath ? (
                                            <img src={model.thumbnailPath} alt={model.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        ) : (
                                            <Box size={44} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                                        )}
                                        <span className="badge badge-format" style={{ position: "absolute", top: "10px", right: "10px" }}>
                                            {model.fileFormat}
                                        </span>
                                    </div>

                                    {/* Info */}
                                    <div style={{ padding: "16px" }}>
                                        <h3 style={{
                                            fontSize: "15px",
                                            fontWeight: "600",
                                            marginBottom: "6px",
                                            color: "var(--text-primary)",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}>
                                            {model.title}
                                        </h3>

                                        {model.description && (
                                            <p style={{
                                                fontSize: "12px",
                                                color: "var(--text-muted)",
                                                marginBottom: "10px",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                display: "-webkit-box",
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: "vertical",
                                                lineHeight: "1.4",
                                            }}>
                                                {model.description}
                                            </p>
                                        )}

                                        {/* Tags */}
                                        {model.tags.length > 0 && (
                                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "10px" }}>
                                                {model.tags.slice(0, 3).map((t) => (
                                                    <span key={t.tag.id} style={{
                                                        fontSize: "10px",
                                                        padding: "2px 8px",
                                                        borderRadius: "4px",
                                                        background: "rgba(99, 102, 241, 0.1)",
                                                        color: "var(--accent-light)",
                                                    }}>
                                                        {t.tag.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Meta */}
                                        <div style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            fontSize: "11px",
                                            color: "var(--text-muted)",
                                            borderTop: "1px solid var(--border)",
                                            paddingTop: "10px",
                                            marginTop: "4px",
                                        }}>
                                            <span>{model.uploader.username}</span>
                                            <div style={{ display: "flex", gap: "12px" }}>
                                                <span>{formatSize(model.fileSize)}</span>
                                                <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                                                    <Download size={10} /> {model.downloadCount}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="pagination">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage(page - 1)}
                            >
                                Prev
                            </button>
                            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                let pageNum;
                                if (pagination.totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (page <= 3) {
                                    pageNum = i + 1;
                                } else if (page >= pagination.totalPages - 2) {
                                    pageNum = pagination.totalPages - 4 + i;
                                } else {
                                    pageNum = page - 2 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        className={page === pageNum ? "active" : ""}
                                        onClick={() => setPage(pageNum)}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button
                                disabled={page >= pagination.totalPages}
                                onClick={() => setPage(page + 1)}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default function ModelsPage() {
    return (
        <Suspense fallback={<div className="fade-in"><div className="page-header"><h1 className="page-title">Katalog Model 3D</h1><div style={{ height: "400px", display: "flex", alignItems: "center", justifyContent: "center" }}><div className="spinner" /></div></div></div>}>
            <ModelsContent />
        </Suspense>
    );
}
