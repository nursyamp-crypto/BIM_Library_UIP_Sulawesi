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
    ChevronLeft,
    ChevronRight,
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
    const [sidebarMinimized, setSidebarMinimized] = useState(false);

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
            <aside className={`sidebar ${sidebarOpen ? "open" : ""} ${sidebarMinimized ? "minimized" : ""}`}>
                {/* Minimize toggle button */}
                <button
                    onClick={() => setSidebarMinimized(!sidebarMinimized)}
                    className="sidebar-toggle-btn"
                    title={sidebarMinimized ? "Perluas sidebar" : "Kecilkan sidebar"}
                >
                    {sidebarMinimized ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>

                {/* Logo */}
                <div style={{
                    padding: sidebarMinimized ? "24px 8px" : "24px 20px",
                    borderBottom: "1px solid rgba(255,255,255,0.15)",
                    transition: "padding 0.3s ease",
                }}>
                    <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: sidebarMinimized ? "0" : "16px", justifyContent: "center", transition: "gap 0.3s ease" }}>
                        {sidebarMinimized ? (
                            <img src="/pln-logo-white.svg" alt="PT PLN" style={{ height: "30px", objectFit: "contain" }} />
                        ) : (
                            <>
                                <img src="/danantara-logo-white.svg" alt="Danantara" style={{ height: "28px", objectFit: "contain" }} />
                                <div style={{ height: "24px", width: "2px", background: "rgba(255,255,255,0.3)", borderRadius: "2px" }}></div>
                                <img src="/pln-logo-white.svg" alt="PT PLN" style={{ height: "34px", objectFit: "contain" }} />
                            </>
                        )}
                    </Link>
                    {!sidebarMinimized && (
                        <div style={{ textAlign: "center", marginTop: "8px" }}>
                            <div style={{ fontSize: "12px", fontWeight: "700", color: "rgba(255,255,255,0.9)", letterSpacing: "0.03em", lineHeight: "1.4" }}>
                                Unit Induk Pembangunan Sulawesi
                            </div>
                            <div style={{ fontSize: "22px", fontWeight: "800", color: "#ffffff", marginTop: "8px", letterSpacing: "0.1em", textTransform: "uppercase", textShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                                BIM Library
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav style={{ padding: sidebarMinimized ? "16px 8px" : "16px 12px", flex: "1", transition: "padding 0.3s ease" }}>
                    {links.map((link) => {
                        const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                        const Icon = link.icon;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setSidebarOpen(false)}
                                title={sidebarMinimized ? link.label : undefined}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: sidebarMinimized ? "center" : "flex-start",
                                    gap: sidebarMinimized ? "0" : "12px",
                                    padding: sidebarMinimized ? "12px" : "10px 12px",
                                    borderRadius: "10px",
                                    textDecoration: "none",
                                    fontSize: "14px",
                                    fontWeight: isActive ? "600" : "400",
                                    color: isActive ? "#ffffff" : "rgba(255,255,255,0.7)",
                                    background: isActive ? "rgba(255, 255, 255, 0.2)" : "transparent",
                                    marginBottom: "4px",
                                    transition: "all 0.2s ease",
                                }}
                            >
                                <Icon size={18} style={{ color: isActive ? "#ffffff" : "rgba(255,255,255,0.6)", flexShrink: 0 }} />
                                {!sidebarMinimized && link.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* User */}
                <div style={{
                    padding: sidebarMinimized ? "12px 8px 16px" : "16px 16px 20px",
                    borderTop: "1px solid rgba(255,255,255,0.15)",
                    transition: "padding 0.3s ease",
                }}>
                    {sidebarMinimized ? (
                        /* Minimized: only avatar + logout icon */
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                            <div style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "10px",
                                background: "rgba(255,255,255,0.2)",
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
                            <button
                                onClick={() => signOut({ callbackUrl: "/login" })}
                                title="Keluar"
                                className="sidebar-logout-btn"
                                style={{
                                    width: "36px",
                                    height: "36px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderRadius: "10px",
                                    background: "rgba(255,255,255,0.1)",
                                    border: "1px solid rgba(255,255,255,0.25)",
                                    color: "rgba(255,255,255,0.8)",
                                    cursor: "pointer",
                                    transition: "all 0.25s ease",
                                }}
                            >
                                <LogOut size={14} />
                            </button>
                        </div>
                    ) : (
                        /* Expanded: full user info */
                        <>
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
                                    background: "rgba(255,255,255,0.2)",
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
                                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {session?.user?.name}
                                    </div>
                                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {session?.user?.email}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => signOut({ callbackUrl: "/login" })}
                                className="sidebar-logout-btn"
                                style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    padding: "10px",
                                    borderRadius: "10px",
                                    background: "rgba(255,255,255,0.1)",
                                    border: "1px solid rgba(255,255,255,0.25)",
                                    color: "#ffffff",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    transition: "all 0.25s ease",
                                    letterSpacing: "0.02em",
                                }}
                            >
                                <LogOut size={14} />
                                Keluar
                            </button>

                            <div style={{
                                marginTop: "16px",
                                textAlign: "center",
                                fontSize: "11px",
                                color: "rgba(255,255,255,0.5)",
                                display: "flex",
                                flexDirection: "column",
                                gap: "2px"
                            }}>
                                <span>Versi 1.0.0</span>
                                <span>&copy; UIP Sulawesi</span>
                            </div>
                        </>
                    )}
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
            <main className={`main-content ${sidebarMinimized ? "sidebar-minimized" : ""}`}>
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
