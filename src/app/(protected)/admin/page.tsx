"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
    Users,
    FileBox,
    Shield,
    Trash2,
    Plus,
    Activity,
    X,
    Check,
    Loader2,
    Filter,
    Search,
    Calendar,
    RotateCcw,
    ChevronDown,
    ChevronUp,
    PauseCircle,
    PlayCircle,
} from "lucide-react";

interface UserItem {
    id: string;
    email: string;
    username: string;
    role: string;
    approved: boolean;
    held: boolean;
    createdAt: string;
    _count: { models: number };
}

interface AuditLogItem {
    id: string;
    action: string;
    targetType: string;
    targetId: string;
    details: string;
    createdAt: string;
    user: { id: string; username: string; email: string };
}

interface FilterOptions {
    actions: string[];
    targetTypes: string[];
    users: { id: string; username: string }[];
}

export default function AdminPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"users" | "audit">("users");
    const [users, setUsers] = useState<UserItem[]>([]);
    const [logs, setLogs] = useState<AuditLogItem[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showAddUser, setShowAddUser] = useState(false);
    const [newUser, setNewUser] = useState({ email: "", username: "", password: "", role: "USER" });
    const [adding, setAdding] = useState(false);

    // Filter states
    const [showFilters, setShowFilters] = useState(false);
    const [filterAction, setFilterAction] = useState("");
    const [filterTargetType, setFilterTargetType] = useState("");
    const [filterUserId, setFilterUserId] = useState("");
    const [filterDateFrom, setFilterDateFrom] = useState("");
    const [filterDateTo, setFilterDateTo] = useState("");
    const [filterSearch, setFilterSearch] = useState("");
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({ actions: [], targetTypes: [], users: [] });
    // Pending filters (only applied when "Terapkan" is clicked)
    const [pendingAction, setPendingAction] = useState("");
    const [pendingTargetType, setPendingTargetType] = useState("");
    const [pendingUserId, setPendingUserId] = useState("");
    const [pendingDateFrom, setPendingDateFrom] = useState("");
    const [pendingDateTo, setPendingDateTo] = useState("");
    const [pendingSearch, setPendingSearch] = useState("");

    const isAdmin = (session?.user as any)?.role === "ADMIN";

    // Count active filters
    const activeFilterCount = [filterAction, filterTargetType, filterUserId, filterDateFrom, filterDateTo, filterSearch].filter(Boolean).length;

    useEffect(() => {
        if (!isAdmin) {
            router.push("/dashboard");
            return;
        }
        fetchData();
    }, [activeTab, isAdmin]);

    const fetchData = useCallback(async (overrideFilters?: {
        action?: string; targetType?: string; userId?: string; dateFrom?: string; dateTo?: string; search?: string;
    }) => {
        setLoading(true);
        try {
            if (activeTab === "users") {
                const res = await fetch("/api/admin/users");
                const data = await res.json();
                setUsers(data.users || []);
            } else {
                const fa = overrideFilters?.action ?? filterAction;
                const ft = overrideFilters?.targetType ?? filterTargetType;
                const fu = overrideFilters?.userId ?? filterUserId;
                const fd = overrideFilters?.dateFrom ?? filterDateFrom;
                const fdt = overrideFilters?.dateTo ?? filterDateTo;
                const fs = overrideFilters?.search ?? filterSearch;

                const params = new URLSearchParams();
                if (fa) params.set("action", fa);
                if (ft) params.set("targetType", ft);
                if (fu) params.set("userId", fu);
                if (fd) params.set("dateFrom", fd);
                if (fdt) params.set("dateTo", fdt);
                if (fs) params.set("search", fs);

                const qs = params.toString();
                const res = await fetch(`/api/admin/audit-log${qs ? `?${qs}` : ""}`);
                const data = await res.json();
                setLogs(data.logs || []);
                if (data.filterOptions) {
                    setFilterOptions(data.filterOptions);
                }
            }

            // Always fetch stats for dashboard
            const stRes = await fetch("/api/admin/stats");
            const stData = await stRes.json();
            setStats(stData.stats);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [activeTab, filterAction, filterTargetType, filterUserId, filterDateFrom, filterDateTo, filterSearch]);

    const handleApplyFilters = () => {
        setFilterAction(pendingAction);
        setFilterTargetType(pendingTargetType);
        setFilterUserId(pendingUserId);
        setFilterDateFrom(pendingDateFrom);
        setFilterDateTo(pendingDateTo);
        setFilterSearch(pendingSearch);
        // Fetch with the pending values directly since state update is async
        fetchDataWithFilters(pendingAction, pendingTargetType, pendingUserId, pendingDateFrom, pendingDateTo, pendingSearch);
    };

    const fetchDataWithFilters = async (action: string, targetType: string, userId: string, dateFrom: string, dateTo: string, search: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (action) params.set("action", action);
            if (targetType) params.set("targetType", targetType);
            if (userId) params.set("userId", userId);
            if (dateFrom) params.set("dateFrom", dateFrom);
            if (dateTo) params.set("dateTo", dateTo);
            if (search) params.set("search", search);

            const qs = params.toString();
            const res = await fetch(`/api/admin/audit-log${qs ? `?${qs}` : ""}`);
            const data = await res.json();
            setLogs(data.logs || []);
            if (data.filterOptions) {
                setFilterOptions(data.filterOptions);
            }

            const stRes = await fetch("/api/admin/stats");
            const stData = await stRes.json();
            setStats(stData.stats);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleResetFilters = () => {
        setPendingAction("");
        setPendingTargetType("");
        setPendingUserId("");
        setPendingDateFrom("");
        setPendingDateTo("");
        setPendingSearch("");
        setFilterAction("");
        setFilterTargetType("");
        setFilterUserId("");
        setFilterDateFrom("");
        setFilterDateTo("");
        setFilterSearch("");
        fetchDataWithFilters("", "", "", "", "", "");
    };

    const removeFilter = (key: string) => {
        const newFilters = {
            action: key === "action" ? "" : filterAction,
            targetType: key === "targetType" ? "" : filterTargetType,
            userId: key === "userId" ? "" : filterUserId,
            dateFrom: key === "dateFrom" ? "" : filterDateFrom,
            dateTo: key === "dateTo" ? "" : filterDateTo,
            search: key === "search" ? "" : filterSearch,
        };
        if (key === "action") { setFilterAction(""); setPendingAction(""); }
        if (key === "targetType") { setFilterTargetType(""); setPendingTargetType(""); }
        if (key === "userId") { setFilterUserId(""); setPendingUserId(""); }
        if (key === "dateFrom") { setFilterDateFrom(""); setPendingDateFrom(""); }
        if (key === "dateTo") { setFilterDateTo(""); setPendingDateTo(""); }
        if (key === "search") { setFilterSearch(""); setPendingSearch(""); }
        fetchDataWithFilters(newFilters.action, newFilters.targetType, newFilters.userId, newFilters.dateFrom, newFilters.dateTo, newFilters.search);
    };

    // Sync pending with active when panel opens
    useEffect(() => {
        if (showFilters) {
            setPendingAction(filterAction);
            setPendingTargetType(filterTargetType);
            setPendingUserId(filterUserId);
            setPendingDateFrom(filterDateFrom);
            setPendingDateTo(filterDateTo);
            setPendingSearch(filterSearch);
        }
    }, [showFilters]);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setAdding(true);
        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newUser),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            toast.success("User berhasil ditambahkan");
            setShowAddUser(false);
            setNewUser({ email: "", username: "", password: "", role: "USER" });
            fetchData();
        } catch (e: any) {
            toast.error(e.message || "Gagal menambahkan user");
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteUser = async (id: string, username: string) => {
        if (!confirm(`Hapus user "${username}"?`)) return;
        try {
            const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            toast.success("User berhasil dihapus");
            fetchData();
        } catch (e: any) {
            toast.error(e.message || "Gagal menghapus user");
        }
    };

    const handleToggleApproval = async (id: string, currentStatus: boolean) => {
        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, approved: !currentStatus }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            toast.success(`User berhasil ${!currentStatus ? 'di-approve' : 'di-remove'}`);
            fetchData();
        } catch (e: any) {
            toast.error(e.message || "Gagal mengubah status user");
        }
    };

    const handleToggleRole = async (id: string, username: string, currentRole: string) => {
        const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
        if (!confirm(`Ubah role "${username}" menjadi ${newRole}?`)) return;

        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, role: newRole }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            toast.success(`Role user berhasil diubah menjadi ${newRole}`);
            fetchData();
        } catch (e: any) {
            toast.error(e.message || "Gagal mengubah role user");
        }
    };

    const handleToggleHold = async (id: string, username: string, currentHeld: boolean) => {
        const action = currentHeld ? "mengaktifkan kembali" : "menangguhkan sementara";
        if (!confirm(`${currentHeld ? "Aktifkan kembali" : "Tangguhkan sementara"} akun "${username}"?`)) return;

        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, held: !currentHeld }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            toast.success(`Akun user berhasil ${action}`);
            fetchData();
        } catch (e: any) {
            toast.error(e.message || `Gagal ${action} akun user`);
        }
    };

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

    const tabs = [
        { id: "users" as const, label: "Users", icon: Users },
        { id: "audit" as const, label: "Audit Log", icon: Activity },
    ];

    const getAuditBadgeClass = (action: string) => {
        if (action.includes("DELETE") || action.includes("REMOVE")) return "badge-admin"; // Red
        if (action.includes("CREATE") || action.includes("REGISTER") || action.includes("APPROVE")) return "badge-user"; // Green
        if (action.includes("UPLOAD") || action.includes("DOWNLOAD") || action.includes("LOGIN")) return "badge-format"; // Blue
        if (action.includes("ROLE") || action.includes("PROFILE")) return "badge-admin";
        if (action.includes("HOLD") || action.includes("UNHOLD")) return "badge-category"; // Orange/Warning
        return "badge-user";
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1 className="page-title">Admin Panel</h1>
                <p className="page-subtitle">Kelola user dan pantau aktivitas</p>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={activeTab === tab.id ? "btn-primary" : "btn-secondary"}
                        style={{ fontSize: "13px", padding: "8px 18px" }}
                    >
                        <tab.icon size={15} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Users Tab */}
            {activeTab === "users" && (
                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <h2 style={{ fontSize: "16px", fontWeight: "600" }}>
                            Daftar User ({users.length})
                        </h2>
                        <button className="btn-primary" onClick={() => setShowAddUser(!showAddUser)} style={{ fontSize: "13px", padding: "8px 16px" }}>
                            {showAddUser ? <X size={14} /> : <Plus size={14} />}
                            {showAddUser ? "Batal" : "Tambah User"}
                        </button>
                    </div>

                    {/* Add user form */}
                    {showAddUser && (
                        <div style={{
                            background: "rgba(30, 41, 59, 0.5)",
                            borderRadius: "12px",
                            border: "1px solid var(--border)",
                            padding: "20px",
                            marginBottom: "16px",
                            animation: "fadeIn 0.2s ease",
                        }}>
                            <form onSubmit={handleAddUser}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 120px", gap: "12px", alignItems: "end" }}>
                                    <div>
                                        <label className="label">Email</label>
                                        <input className="input" type="email" placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="label">Username</label>
                                        <input className="input" type="text" placeholder="Username" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="label">Password</label>
                                        <input className="input" type="password" placeholder="Password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required />
                                    </div>
                                    <div style={{ display: "flex", gap: "8px" }}>
                                        <select className="select" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} style={{ width: "100%" }}>
                                            <option value="USER">User</option>
                                            <option value="ADMIN">Admin</option>
                                        </select>
                                    </div>
                                </div>
                                <button type="submit" className="btn-primary" disabled={adding} style={{ marginTop: "12px", fontSize: "13px" }}>
                                    {adding ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={14} />}
                                    Simpan
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Users table */}
                    {loading ? (
                        <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
                            <div className="spinner" />
                        </div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th>Email</th>
                                        <th>Status</th>
                                        <th>Role</th>
                                        <th>Models</th>
                                        <th>Bergabung</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => (
                                        <tr key={u.id}>
                                            <td style={{ fontWeight: "500" }}>{u.username}</td>
                                            <td style={{ color: "var(--text-secondary)" }}>{u.email}</td>
                                            <td>
                                                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                                    <span className={`badge ${u.approved ? "badge-user" : "badge-admin"}`}>
                                                        {u.approved ? "Approved" : "Pending"}
                                                    </span>
                                                    {u.held && (
                                                        <span className="badge badge-category" style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                                                            <PauseCircle size={10} />
                                                            Hold
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${u.role === "ADMIN" ? "badge-admin" : "badge-format"}`}>
                                                    {u.role === "ADMIN" ? <Shield size={10} /> : <Users size={10} />}
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td>{u._count.models}</td>
                                            <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>{formatDate(u.createdAt)}</td>
                                            <td>
                                                <div style={{ display: "flex", gap: "6px" }}>
                                                    {u.id !== (session?.user as any)?.id && (
                                                        <>
                                                            <button
                                                                className={u.approved ? "btn-secondary" : "btn-primary"}
                                                                onClick={() => u.approved ? handleDeleteUser(u.id, u.username) : handleToggleApproval(u.id, u.approved)}
                                                                style={{ padding: "4px 10px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}
                                                            >
                                                                {u.approved ? <Trash2 size={12} /> : <Check size={12} />}
                                                                {u.approved ? "Hapus" : "Approve"}
                                                            </button>
                                                            <button
                                                                className="btn-secondary"
                                                                onClick={() => handleToggleHold(u.id, u.username, u.held)}
                                                                style={{
                                                                    padding: "4px 10px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px",
                                                                    background: u.held ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                                                                    color: u.held ? "#6ee7b7" : "#fbbf24",
                                                                    borderColor: u.held ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                                                                }}
                                                            >
                                                                {u.held ? <PlayCircle size={12} /> : <PauseCircle size={12} />}
                                                                {u.held ? "Aktifkan" : "Hold"}
                                                            </button>
                                                            <button
                                                                className="btn-secondary"
                                                                onClick={() => handleToggleRole(u.id, u.username, u.role)}
                                                                style={{ padding: "4px 10px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", background: "rgba(139, 92, 246, 0.1)", color: "#c4b5fd", borderColor: "rgba(139, 92, 246, 0.2)" }}
                                                            >
                                                                <Shield size={12} />
                                                                {u.role === "ADMIN" ? "Jadikan User" : "Jadikan Admin"}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Audit Log Tab */}
            {activeTab === "audit" && (
                <div>
                    {/* Admin Dashboard Stats Summary */}
                    {stats && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                            <div className="glass-card" style={{ padding: "20px", borderLeft: "4px solid var(--accent)" }}>
                                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>Total Users</div>
                                <div style={{ fontSize: "24px", fontWeight: "700" }}>{stats.totalUsers}</div>
                                {stats.pendingUsers > 0 && <div style={{ fontSize: "11px", color: "var(--warning)", marginTop: "4px" }}>{stats.pendingUsers} Menunggu Persetujuan</div>}
                            </div>
                            <div className="glass-card" style={{ padding: "20px", borderLeft: "4px solid var(--accent-light)" }}>
                                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>Total Model 3D</div>
                                <div style={{ fontSize: "24px", fontWeight: "700" }}>{stats.totalModels}</div>
                            </div>
                            <div className="glass-card" style={{ padding: "20px", borderLeft: "4px solid #10b981" }}>
                                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>Aktivitas (30 Hari)</div>
                                <div style={{ fontSize: "24px", fontWeight: "700" }}>{stats.recentActivities}</div>
                            </div>
                        </div>
                    )}

                    {/* Header + Filter toggle */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <h2 style={{ fontSize: "16px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
                            Audit Log Aktivitas
                            {!loading && <span style={{ fontSize: "12px", fontWeight: "400", color: "var(--text-muted)" }}>({logs.length} hasil)</span>}
                        </h2>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                className={showFilters ? "btn-primary" : "btn-secondary"}
                                onClick={() => setShowFilters(!showFilters)}
                                style={{ fontSize: "13px", padding: "8px 14px", position: "relative" }}
                            >
                                <Filter size={14} />
                                Filter
                                {activeFilterCount > 0 && (
                                    <span style={{
                                        position: "absolute",
                                        top: "-6px",
                                        right: "-6px",
                                        background: "var(--danger)",
                                        color: "white",
                                        fontSize: "10px",
                                        fontWeight: "700",
                                        width: "18px",
                                        height: "18px",
                                        borderRadius: "50%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}>
                                        {activeFilterCount}
                                    </span>
                                )}
                                {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                        </div>
                    </div>

                    {/* Filter Panel */}
                    {showFilters && (
                        <div style={{
                            background: "rgba(255, 255, 255, 0.6)",
                            backdropFilter: "blur(12px)",
                            borderRadius: "12px",
                            border: "1px solid var(--border)",
                            padding: "20px",
                            marginBottom: "16px",
                            animation: "fadeIn 0.25s ease",
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <Filter size={14} />
                                    Filter Audit Log
                                    {activeFilterCount > 0 && (
                                        <span className="badge badge-format" style={{ fontSize: "10px", padding: "2px 6px" }}>
                                            {activeFilterCount} aktif
                                        </span>
                                    )}
                                </div>
                                {activeFilterCount > 0 && (
                                    <button
                                        onClick={handleResetFilters}
                                        className="btn-secondary"
                                        style={{ fontSize: "12px", padding: "4px 10px", display: "flex", alignItems: "center", gap: "4px" }}
                                    >
                                        <RotateCcw size={12} />
                                        Reset
                                    </button>
                                )}
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
                                {/* Action filter */}
                                <div>
                                    <label className="label" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <Activity size={12} />
                                        Jenis Aksi
                                    </label>
                                    <select
                                        className="select"
                                        value={pendingAction}
                                        onChange={(e) => setPendingAction(e.target.value)}
                                        style={{ padding: "8px 12px", fontSize: "13px" }}
                                    >
                                        <option value="">Semua Aksi</option>
                                        {filterOptions.actions.map((a) => (
                                            <option key={a} value={a}>{a}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Target Type filter */}
                                <div>
                                    <label className="label" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <FileBox size={12} />
                                        Tipe Target
                                    </label>
                                    <select
                                        className="select"
                                        value={pendingTargetType}
                                        onChange={(e) => setPendingTargetType(e.target.value)}
                                        style={{ padding: "8px 12px", fontSize: "13px" }}
                                    >
                                        <option value="">Semua Tipe</option>
                                        {filterOptions.targetTypes.map((t) => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* User filter */}
                                <div>
                                    <label className="label" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <Users size={12} />
                                        User
                                    </label>
                                    <select
                                        className="select"
                                        value={pendingUserId}
                                        onChange={(e) => setPendingUserId(e.target.value)}
                                        style={{ padding: "8px 12px", fontSize: "13px" }}
                                    >
                                        <option value="">Semua User</option>
                                        {filterOptions.users.map((u) => (
                                            <option key={u.id} value={u.id}>{u.username}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Date From */}
                                <div>
                                    <label className="label" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <Calendar size={12} />
                                        Dari Tanggal
                                    </label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={pendingDateFrom}
                                        onChange={(e) => setPendingDateFrom(e.target.value)}
                                        style={{ padding: "8px 12px", fontSize: "13px" }}
                                    />
                                </div>

                                {/* Date To */}
                                <div>
                                    <label className="label" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <Calendar size={12} />
                                        Sampai Tanggal
                                    </label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={pendingDateTo}
                                        onChange={(e) => setPendingDateTo(e.target.value)}
                                        style={{ padding: "8px 12px", fontSize: "13px" }}
                                    />
                                </div>

                                {/* Search details */}
                                <div>
                                    <label className="label" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <Search size={12} />
                                        Cari Detail
                                    </label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Kata kunci..."
                                        value={pendingSearch}
                                        onChange={(e) => setPendingSearch(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") handleApplyFilters(); }}
                                        style={{ padding: "8px 12px", fontSize: "13px" }}
                                    />
                                </div>
                            </div>

                            {/* Apply button */}
                            <div style={{ marginTop: "16px", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                <button
                                    onClick={handleApplyFilters}
                                    className="btn-primary"
                                    style={{ fontSize: "13px", padding: "8px 20px" }}
                                >
                                    <Search size={14} />
                                    Terapkan Filter
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Active filter chips */}
                    {activeFilterCount > 0 && !showFilters && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                            {filterAction && (
                                <span className="badge badge-format" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }} onClick={() => removeFilter("action")}>
                                    Aksi: {filterAction} <X size={10} />
                                </span>
                            )}
                            {filterTargetType && (
                                <span className="badge badge-format" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }} onClick={() => removeFilter("targetType")}>
                                    Tipe: {filterTargetType} <X size={10} />
                                </span>
                            )}
                            {filterUserId && (
                                <span className="badge badge-format" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }} onClick={() => removeFilter("userId")}>
                                    User: {filterOptions.users.find(u => u.id === filterUserId)?.username || filterUserId} <X size={10} />
                                </span>
                            )}
                            {filterDateFrom && (
                                <span className="badge badge-format" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }} onClick={() => removeFilter("dateFrom")}>
                                    Dari: {filterDateFrom} <X size={10} />
                                </span>
                            )}
                            {filterDateTo && (
                                <span className="badge badge-format" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }} onClick={() => removeFilter("dateTo")}>
                                    Sampai: {filterDateTo} <X size={10} />
                                </span>
                            )}
                            {filterSearch && (
                                <span className="badge badge-format" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }} onClick={() => removeFilter("search")}>
                                    Cari: &quot;{filterSearch}&quot; <X size={10} />
                                </span>
                            )}
                            <span
                                className="badge badge-admin"
                                style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                                onClick={handleResetFilters}
                            >
                                <RotateCcw size={10} /> Hapus semua
                            </span>
                        </div>
                    )}

                    {loading ? (
                        <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
                            <div className="spinner" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div style={{
                            textAlign: "center",
                            padding: "40px",
                            background: "rgba(241, 245, 249, 0.8)",
                            borderRadius: "12px",
                            border: "1px solid var(--border)",
                            color: "var(--text-muted)",
                        }}>
                            {activeFilterCount > 0
                                ? "Tidak ada aktivitas yang cocok dengan filter"
                                : "Belum ada aktivitas"}
                        </div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Waktu</th>
                                        <th>User</th>
                                        <th>Aksi</th>
                                        <th>Tipe Target</th>
                                        <th>Detail</th>
                                        <th>Device Info</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log: any) => (
                                        <tr key={log.id}>
                                            <td style={{ fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                                                {formatDate(log.createdAt)}
                                            </td>
                                            <td style={{ fontWeight: "500" }}>{log.user?.username || "System/Deleted User"}</td>
                                            <td>
                                                <span className={`badge ${getAuditBadgeClass(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                                {log.targetType}
                                            </td>
                                            <td style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                                                {log.details || "-"}
                                            </td>
                                            <td style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                                <div>{log.ipAddress || "N/A"}</div>
                                                <div style={{ maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.userAgent}>
                                                    {log.userAgent || "Unknown"}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
