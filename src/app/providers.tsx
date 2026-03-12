"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            {children}
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: "#1e293b",
                        color: "#f1f5f9",
                        border: "1px solid rgba(99, 102, 241, 0.3)",
                    },
                    success: {
                        iconTheme: {
                            primary: "#22c55e",
                            secondary: "#f1f5f9",
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: "#ef4444",
                            secondary: "#f1f5f9",
                        },
                    },
                }}
            />
        </SessionProvider>
    );
}
