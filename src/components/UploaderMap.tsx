"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface ModelLocation {
    id: string;
    title: string;
    fileFormat: string;
    latitude: number;
    longitude: number;
    createdAt: string;
    uploader: {
        id: string;
        username: string;
        avatar: string | null;
    };
}

interface UploaderMapProps {
    locations: ModelLocation[];
}

export default function UploaderMap({ locations }: UploaderMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        // Default center: Indonesia (Sulawesi)
        const defaultCenter: [number, number] = [-2.5, 120.5];
        const defaultZoom = 5;

        const map = L.map(mapRef.current, {
            center: defaultCenter,
            zoom: defaultZoom,
            scrollWheelZoom: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || locations.length === 0) return;

        // Clear existing markers
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });

        // Custom icon
        const markerIcon = L.divIcon({
            className: "custom-map-marker",
            html: `<div style="
                width: 28px;
                height: 28px;
                background: linear-gradient(135deg, #00A2E9, #007bc4);
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
            </div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -16],
        });

        const bounds: [number, number][] = [];

        locations.forEach((loc) => {
            const latLng: [number, number] = [loc.latitude, loc.longitude];
            bounds.push(latLng);

            const date = new Date(loc.createdAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
            });

            const popup = L.popup({ className: "custom-map-popup" }).setContent(`
                <div style="font-family: system-ui, sans-serif; min-width: 180px;">
                    <a href="/models/${loc.id}" style="font-weight: 700; font-size: 13px; margin-bottom: 6px; color: #0f172a; text-decoration: none; display: block;">
                        ${loc.title}
                    </a>
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                        ${loc.uploader.avatar
                    ? `<img src="${loc.uploader.avatar}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;" />`
                    : `<div style="width: 20px; height: 20px; border-radius: 50%; background: linear-gradient(135deg, #00A2E9, #007bc4); display: flex; align-items: center; justify-content: center;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            </div>`
                }
                        <span style="font-size: 12px; color: #334155;">${loc.uploader.username}</span>
                    </div>
                    <div style="font-size: 11px; color: #64748b;">
                        ${loc.fileFormat.toUpperCase()} • ${date}
                    </div>
                    <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">
                        ${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}
                    </div>
                    <a href="/models?uploader=${loc.uploader.id}" style="
                        display: block;
                        margin-top: 8px;
                        padding: 6px 12px;
                        background: linear-gradient(135deg, #00A2E9, #007bc4);
                        color: white;
                        text-decoration: none;
                        text-align: center;
                        border-radius: 6px;
                        font-size: 11px;
                        font-weight: 600;
                    ">Lihat Semua Model ${loc.uploader.username}</a>
                </div>
            `);

            L.marker(latLng, { icon: markerIcon })
                .bindPopup(popup)
                .addTo(map);
        });

        // Fit map to markers
        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
        }
    }, [locations]);

    return (
        <div style={{ position: "relative" }}>
            <div
                ref={mapRef}
                style={{
                    height: "400px",
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                }}
            />
            {locations.length === 0 && (
                <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(248, 250, 252, 0.85)",
                    borderRadius: "12px",
                    flexDirection: "column",
                    gap: "8px",
                }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                        Belum ada data lokasi upload
                    </p>
                </div>
            )}
        </div>
    );
}
