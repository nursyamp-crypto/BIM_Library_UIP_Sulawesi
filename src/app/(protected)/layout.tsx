"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
    Box,
    LayoutDashboard,
    Upload,
    Grid3X3,
    Shield,
    LogOut,
    Menu,
    X,
    User,
    Settings,
} from "lucide-react";
import { useState } from "react";

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const isAdmin = (session?.user as any)?.role === "ADMIN";

    const links = [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/models", label: "Katalog Model", icon: Grid3X3 },
        { href: "/upload", label: "Upload Model", icon: Upload },
        { href: "/profile", label: "Profil Saya", icon: Settings },
        ...(isAdmin ? [{ href: "/admin", label: "Admin Panel", icon: Shield }] : []),
    ];

    return (
        <div>
            {/* Mobile menu button */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{
                    position: "fixed",
                    top: "16px",
                    left: "16px",
                    zIndex: 100,
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "10px",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    display: "none",
                }}
                className="mobile-menu-btn"
            >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
                {/* Logo */}
                <div style={{
                    padding: "24px 20px",
                    borderBottom: "1px solid var(--border)",
                }}>
                    <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "16px", justifyContent: "center" }}>
                        <img src="/danantara-logo.svg" alt="Danantara" style={{ height: "28px", objectFit: "contain" }} />
                        <div style={{ height: "24px", width: "2px", background: "var(--border)", borderRadius: "2px" }}></div>
                        <img src="/pln-logo.svg" alt="PT PLN" style={{ height: "34px", objectFit: "contain" }} />
                    </Link>
                    <div style={{ display: "flex", justifyContent: "center", marginTop: "10px" }}>
                        <img src="/uip-sulawesi-logo.png" alt="UIP Sulawesi" style={{ height: "40px", objectFit: "contain" }} />
                    </div>
                    <div style={{ textAlign: "center", marginTop: "8px" }}>
                        <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-secondary)", letterSpacing: "0.03em", lineHeight: "1.4" }}>
                            Unit Induk Pembangunan Sulawesi
                        </div>
                        <div style={{ fontSize: "11px", fontWeight: "500", color: "var(--text-muted)", marginTop: "2px" }}>
                            BIM Library
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav style={{ padding: "16px 12px", flex: "1" }}>
                    <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", padding: "4px 12px", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Menu
                    </div>
                    {links.map((link) => {
                        const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                        const Icon = link.icon;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setSidebarOpen(false)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    padding: "10px 12px",
                                    borderRadius: "10px",
                                    textDecoration: "none",
                                    fontSize: "14px",
                                    fontWeight: isActive ? "600" : "400",
                                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                                    background: isActive ? "rgba(99, 102, 241, 0.12)" : "transparent",
                                    marginBottom: "4px",
                                    transition: "all 0.2s ease",
                                }}
                            >
                                <Icon size={18} style={{ color: isActive ? "var(--accent-light)" : "var(--text-muted)" }} />
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* User */}
                <div style={{
                    padding: "16px 16px 20px",
                    borderTop: "1px solid var(--border)",
                }}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "12px",
                    }}>
                        <div style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "10px",
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            overflow: "hidden"
                        }}>
                            {(session?.user as any)?.avatar ? (
                                <img src={(session?.user as any)?.avatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                                <User size={16} color="white" />
                            )}
                        </div>
                        <div style={{ overflow: "hidden" }}>
                            <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {session?.user?.name}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {session?.user?.email}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            padding: "8px",
                            borderRadius: "8px",
                            background: "rgba(239, 68, 68, 0.1)",
                            border: "1px solid rgba(239, 68, 68, 0.2)",
                            color: "#fca5a5",
                            fontSize: "13px",
                            fontWeight: "500",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                        }}
                    >
                        <LogOut size={14} />
                        Keluar
                    </button>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    style={{
                        position: "fixed",
                        inset: "0",
                        background: "rgba(0,0,0,0.5)",
                        zIndex: 40,
                    }}
                />
            )}

            {/* Main content */}
            <main className="main-content">
                {children}
            </main>

            <style jsx>{`
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: block !important;
          }
        }
      `}</style>
        </div>
    );
}
