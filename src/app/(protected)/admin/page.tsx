"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
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
} from "lucide-react";

interface UserItem {
    id: string;
    email: string;
    username: string;
    role: string;
    approved: boolean;
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

export default function AdminPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"users" | "audit">("users");
    const [users, setUsers] = useState<UserItem[]>([]);
    const [logs, setLogs] = useState<AuditLogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddUser, setShowAddUser] = useState(false);
    const [newUser, setNewUser] = useState({ email: "", username: "", password: "", role: "USER" });
    const [adding, setAdding] = useState(false);

    const isAdmin = (session?.user as any)?.role === "ADMIN";

    useEffect(() => {
        if (!isAdmin) {
            router.push("/dashboard");
            return;
        }
        fetchData();
    }, [activeTab, isAdmin]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === "users") {
                const res = await fetch("/api/admin/users");
                const data = await res.json();
                setUsers(data.users || []);
            } else {
                const res = await fetch("/api/admin/audit-log");
                const data = await res.json();
                setLogs(data.logs || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

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
            toast.success(`User berhasil ${!currentStatus ? 'di-approve' : 'di-revoke'}`);
            fetchData();
        } catch (e: any) {
            toast.error(e.message || "Gagal mengubah status user");
        }
    };

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

    const tabs = [
        { id: "users" as const, label: "Users", icon: Users },
        { id: "audit" as const, label: "Audit Log", icon: Activity },
    ];

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
                                                <span className={`badge ${u.approved ? "badge-user" : "badge-admin"}`}>
                                                    {u.approved ? "Approved" : "Pending"}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${u.role === "ADMIN" ? "badge-admin" : "badge-format"}`}>
                                                    {u.role === "ADMIN" ? <Shield size={10} /> : null}
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
                                                                onClick={() => handleToggleApproval(u.id, u.approved)}
                                                                style={{ padding: "4px 10px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}
                                                            >
                                                                {u.approved ? <X size={12} /> : <Check size={12} />}
                                                                {u.approved ? "Revoke" : "Approve"}
                                                            </button>
                                                            <button className="btn-danger" onClick={() => handleDeleteUser(u.id, u.username)} style={{ padding: "4px 10px", fontSize: "11px" }}>
                                                                <Trash2 size={12} />
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
                    <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>
                        Audit Log Terbaru
                    </h2>
                    {loading ? (
                        <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
                            <div className="spinner" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div style={{
                            textAlign: "center",
                            padding: "40px",
                            background: "rgba(30, 41, 59, 0.3)",
                            borderRadius: "12px",
                            border: "1px solid var(--border)",
                            color: "var(--text-muted)",
                        }}>
                            Belum ada aktivitas
                        </div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Waktu</th>
                                        <th>User</th>
                                        <th>Aksi</th>
                                        <th>Detail</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id}>
                                            <td style={{ fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                                                {formatDate(log.createdAt)}
                                            </td>
                                            <td style={{ fontWeight: "500" }}>{log.user.username}</td>
                                            <td>
                                                <span className={`badge ${log.action === "UPLOAD" ? "badge-user" :
                                                    log.action === "DELETE" ? "badge-admin" :
                                                        "badge-format"
                                                    }`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                                                {log.details || "-"}
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
