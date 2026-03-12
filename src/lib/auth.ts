import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email dan password harus diisi");
                }

                const user = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { email: credentials.email },
                            { username: credentials.email },
                        ],
                    },
                });

                if (!user) {
                    throw new Error("Akun tidak ditemukan");
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isPasswordValid) {
                    throw new Error("Password salah");
                }

                if (!user.approved && user.role !== "ADMIN") {
                    throw new Error("Akun Anda belum disetujui oleh Administrator");
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.username,
                    role: user.role,
                    avatar: user.avatar,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (trigger === "update" && session?.name) {
                token.name = session.name;
            }
            if (trigger === "update" && session?.avatar !== undefined) {
                token.avatar = session.avatar;
            }

            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
                token.name = user.name;
                token.avatar = user.avatar;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
                session.user.name = token.name as string;
                session.user.avatar = token.avatar as string | null;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 24 hours
    },
    secret: process.env.NEXTAUTH_SECRET,
};
