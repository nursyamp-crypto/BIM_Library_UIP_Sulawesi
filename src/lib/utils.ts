import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

const ALLOWED_FORMATS = [".skp", ".obj", ".fbx", ".stl", ".glb", ".gltf", ".ifc", ".rvt", ".rfa"];

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "104857600"); // 100MB

export function validateFileType(filename: string): boolean {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf("."));
    return ALLOWED_FORMATS.includes(ext);
}

export function getFileExtension(filename: string): string {
    return filename.toLowerCase().substring(filename.lastIndexOf("."));
}

export function validateFileSize(size: number): boolean {
    return size <= MAX_FILE_SIZE;
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/_{2,}/g, "_")
        .substring(0, 200);
}

export async function createAuditLog(
    userId: string,
    action: string,
    targetType: string,
    targetId?: string,
    details?: string,
    ipAddress?: string,
    userAgent?: string
) {
    await prisma.auditLog.create({
        data: {
            userId,
            action,
            targetType,
            targetId: targetId || null,
            details: details || "",
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
        },
    });
}

export { ALLOWED_FORMATS, MAX_FILE_SIZE };
