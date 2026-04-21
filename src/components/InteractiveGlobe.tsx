"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface GlobeLocation {
    ip: string;
    lat: number;
    lng: number;
    label?: string;
}

interface InteractiveGlobeProps {
    locations: GlobeLocation[];
    height?: number;
}

export default function InteractiveGlobe({ locations, height = 400 }: InteractiveGlobeProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<maplibregl.Marker[]>([]);
    const [mapMode, setMapMode] = useState<"satellite" | "hybrid" | "dark">("satellite");
    const [currentZoom, setCurrentZoom] = useState(1.5);

    // Tile source definitions
    const SOURCES = {
        satellite: {
            type: "raster" as const,
            tiles: [
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
        },
        labels: {
            type: "raster" as const,
            tiles: [
                "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            ],
            tileSize: 256,
            maxzoom: 19,
        },
        dark: {
            type: "raster" as const,
            tiles: [
                "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
                "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
                "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        },
    };

    // Build the MapLibre style object for a given mode
    function buildStyle(mode: "satellite" | "hybrid" | "dark") {
        const sources: any = {};
        const layers: any[] = [];

        if (mode === "dark") {
            sources["dark-tiles"] = SOURCES.dark;
            layers.push({
                id: "dark-layer",
                type: "raster",
                source: "dark-tiles",
            });
        } else {
            sources["satellite-tiles"] = SOURCES.satellite;
            layers.push({
                id: "satellite-layer",
                type: "raster",
                source: "satellite-tiles",
            });

            if (mode === "hybrid") {
                sources["label-tiles"] = SOURCES.labels;
                layers.push({
                    id: "labels-layer",
                    type: "raster",
                    source: "label-tiles",
                });
            }
        }

        return {
            version: 8 as const,
            sources,
            layers,
            // Space background color (visible when globe is shown)
            sky: {
                "sky-color": "#000008",
                "horizon-color": "#000010",
                "fog-color": "#000008",
                "sky-horizon-blend": 0.5,
            },
        };
    }

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = new maplibregl.Map({
            container: containerRef.current,
            style: buildStyle(mapMode) as any,
            center: [118, -2.5], // Indonesia
            zoom: 1.5,
            minZoom: 0.5,
            maxZoom: 19,
            attributionControl: false,
            antialias: true,
        } as any);

        // Enable globe projection if supported
        try {
            (map as any).setProjection?.({ type: "globe" });
        } catch (e) {
            // Globe projection not supported in this version, fall back to mercator
        }

        // Add compact attribution
        map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

        // Add navigation controls (zoom +/-)
        map.addControl(new maplibregl.NavigationControl({
            showCompass: true,
            showZoom: true,
            visualizePitch: true,
        }), "bottom-right");

        // Track zoom
        map.on("zoom", () => {
            setCurrentZoom(Math.round(map.getZoom() * 10) / 10);
        });

        // Set atmosphere/sky for globe mode
        map.on("load", () => {
            try {
                // Set sky properties for realistic atmosphere
                (map as any).setSky?.({
                    "sky-color": "#000008",
                    "horizon-color": "#050520",
                    "fog-color": "#000008",
                    "sky-horizon-blend": 1,
                });

                // Set fog for depth
                (map as any).setFog?.({
                    color: "rgba(0, 0, 10, 0.8)",
                    "high-color": "rgba(20, 30, 80, 0.5)",
                    "horizon-blend": 0.02,
                    "space-color": "rgba(0, 0, 8, 1)",
                    "star-intensity": 0.6,
                });
            } catch (e) {
                // Sky/fog might not be supported in all versions
            }
        });

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // Handle map mode switch
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Wait for map to be loaded
        const applyStyle = () => {
            const currentCenter = map.getCenter();
            const currentZoom = map.getZoom();
            const currentPitch = map.getPitch();
            const currentBearing = map.getBearing();

            map.setStyle(buildStyle(mapMode) as any);

            // Restore camera position after style change
            map.once("styledata", () => {
                map.jumpTo({
                    center: currentCenter,
                    zoom: currentZoom,
                    pitch: currentPitch,
                    bearing: currentBearing,
                });

                // Re-add markers after style change
                updateMarkers();

                // Re-apply sky
                try {
                    (map as any).setSky?.({
                        "sky-color": "#000008",
                        "horizon-color": "#050520",
                        "fog-color": "#000008",
                        "sky-horizon-blend": 1,
                    });
                    (map as any).setFog?.({
                        color: "rgba(0, 0, 10, 0.8)",
                        "high-color": "rgba(20, 30, 80, 0.5)",
                        "horizon-blend": 0.02,
                        "space-color": "rgba(0, 0, 8, 1)",
                        "star-intensity": 0.6,
                    });
                } catch (e) {}
            });
        };

        if (map.loaded()) {
            applyStyle();
        } else {
            map.on("load", applyStyle);
        }
    }, [mapMode]);

    // Create/update markers
    const updateMarkers = () => {
        const map = mapRef.current;
        if (!map) return;

        // Remove existing markers
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        if (locations.length === 0) return;

        const bounds = new maplibregl.LngLatBounds();

        locations.forEach((loc) => {
            bounds.extend([loc.lng, loc.lat]);

            // Create custom marker element
            const el = document.createElement("div");
            el.className = "globe-marker-container";
            el.innerHTML = `
                <div class="globe-marker-pulse"></div>
                <div class="globe-marker-dot"></div>
            `;

            // Create popup
            const popup = new maplibregl.Popup({
                offset: 20,
                closeButton: true,
                className: "globe-popup",
                maxWidth: "260px",
            }).setHTML(`
                <div style="
                    font-family: system-ui, -apple-system, sans-serif;
                    padding: 4px;
                ">
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        margin-bottom: 10px;
                        padding-bottom: 8px;
                        border-bottom: 1px solid rgba(255,255,255,0.1);
                    ">
                        <div style="
                            width: 10px; height: 10px; border-radius: 50%;
                            background: linear-gradient(135deg, #ff9500, #ff6b00);
                            box-shadow: 0 0 8px rgba(255, 149, 0, 0.5);
                            flex-shrink: 0;
                        "></div>
                        <span style="font-weight: 700; font-size: 13px; color: #fff;">
                            Lokasi Download
                        </span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <div style="display: flex; justify-content: space-between; font-size: 11px;">
                            <span style="color: rgba(255,255,255,0.5);">IP Address</span>
                            <span style="color: #ff9500; font-weight: 600; font-family: 'SF Mono', 'Cascadia Code', monospace;">${loc.ip}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 11px;">
                            <span style="color: rgba(255,255,255,0.5);">Latitude</span>
                            <span style="color: rgba(255,255,255,0.85); font-weight: 500;">${loc.lat.toFixed(6)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 11px;">
                            <span style="color: rgba(255,255,255,0.5);">Longitude</span>
                            <span style="color: rgba(255,255,255,0.85); font-weight: 500;">${loc.lng.toFixed(6)}</span>
                        </div>
                    </div>
                </div>
            `);

            const marker = new maplibregl.Marker({ element: el, anchor: "center" })
                .setLngLat([loc.lng, loc.lat])
                .setPopup(popup)
                .addTo(map);

            markersRef.current.push(marker);
        });

        // Fit to bounds
        if (locations.length === 1) {
            map.flyTo({ center: [locations[0].lng, locations[0].lat], zoom: 10, duration: 2000 });
        } else if (locations.length > 1) {
            map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 2000 });
        }
    };

    // Update markers when locations change
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        if (map.loaded()) {
            updateMarkers();
        } else {
            map.on("load", updateMarkers);
        }
    }, [locations]);

    return (
        <div style={{ position: "relative", width: "100%" }}>
            <div
                ref={containerRef}
                style={{
                    width: "100%",
                    height: `${height}px`,
                    borderRadius: "16px",
                    overflow: "hidden",
                    border: "1px solid rgba(0, 162, 233, 0.12)",
                    boxShadow: "0 4px 30px rgba(0, 0, 0, 0.3), 0 0 40px rgba(0, 80, 180, 0.06)",
                    background: "#000008",
                }}
            />

            {/* Map mode switcher */}
            <div style={{
                position: "absolute",
                top: "12px",
                right: "14px",
                display: "flex",
                gap: "2px",
                zIndex: 10,
                background: "rgba(8, 12, 24, 0.85)",
                backdropFilter: "blur(12px)",
                borderRadius: "10px",
                padding: "3px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
            }}>
                {([
                    { mode: "satellite" as const, label: "Satellite", icon: "🛰️" },
                    { mode: "hybrid" as const, label: "Hybrid", icon: "🗺️" },
                    { mode: "dark" as const, label: "Dark", icon: "🌙" },
                ]).map(({ mode, label, icon }) => (
                    <button
                        key={mode}
                        onClick={() => setMapMode(mode)}
                        style={{
                            padding: "6px 12px",
                            borderRadius: "8px",
                            border: "none",
                            background: mapMode === mode
                                ? "linear-gradient(135deg, rgba(0, 162, 233, 0.3), rgba(0, 120, 200, 0.2))"
                                : "transparent",
                            color: mapMode === mode ? "#fff" : "rgba(255, 255, 255, 0.5)",
                            fontSize: "10px",
                            fontWeight: mapMode === mode ? "700" : "500",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            transition: "all 0.2s ease",
                            whiteSpace: "nowrap",
                        }}
                    >
                        <span style={{ fontSize: "12px" }}>{icon}</span>
                        {label}
                    </button>
                ))}
            </div>

            {/* Top-left info */}
            <div style={{
                position: "absolute",
                top: "12px",
                left: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                zIndex: 10,
            }}>
                {/* Location badge */}
                {locations.length > 0 && (
                    <div style={{
                        background: "rgba(8, 12, 24, 0.85)",
                        backdropFilter: "blur(12px)",
                        padding: "6px 14px",
                        borderRadius: "20px",
                        fontSize: "11px",
                        color: "#ff9500",
                        fontWeight: "600",
                        border: "1px solid rgba(255, 149, 0, 0.2)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
                    }}>
                        <div style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: "#ff9500",
                            animation: "globePulse 2s ease-in-out infinite",
                            boxShadow: "0 0 6px rgba(255, 149, 0, 0.5)",
                        }} />
                        {locations.length} lokasi terdeteksi
                    </div>
                )}

                {/* Zoom indicator */}
                <div style={{
                    background: "rgba(8, 12, 24, 0.75)",
                    backdropFilter: "blur(8px)",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "9px",
                    color: "rgba(255, 255, 255, 0.45)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                    </svg>
                    Zoom: {currentZoom.toFixed(1)}x •{" "}
                    {currentZoom >= 16 ? "Street" : currentZoom >= 12 ? "City" : currentZoom >= 8 ? "Region" : currentZoom >= 4 ? "Country" : currentZoom >= 2 ? "Continent" : "🌍 Globe"}
                </div>
            </div>

            {/* Styles */}
            <style>{`
                @keyframes globePulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(0.8); }
                }

                @keyframes markerPulseAnim {
                    0% { transform: scale(1); opacity: 0.6; }
                    100% { transform: scale(3); opacity: 0; }
                }

                .globe-marker-container {
                    width: 32px;
                    height: 32px;
                    position: relative;
                    cursor: pointer;
                }

                .globe-marker-dot {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #ff9500, #ff6b00);
                    border: 2.5px solid rgba(255, 255, 255, 0.9);
                    box-shadow: 0 0 12px rgba(255, 149, 0, 0.6), 0 0 24px rgba(255, 149, 0, 0.3);
                    z-index: 2;
                }

                .globe-marker-pulse {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background: rgba(255, 149, 0, 0.4);
                    animation: markerPulseAnim 2s ease-out infinite;
                    z-index: 1;
                }

                /* Dark-themed popup */
                .globe-popup .maplibregl-popup-content {
                    background: rgba(10, 14, 28, 0.95) !important;
                    backdrop-filter: blur(16px) !important;
                    border: 1px solid rgba(255, 149, 0, 0.2) !important;
                    border-radius: 12px !important;
                    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 149, 0, 0.08) !important;
                    color: #fff !important;
                    padding: 12px 14px !important;
                }

                .globe-popup .maplibregl-popup-tip {
                    border-top-color: rgba(10, 14, 28, 0.95) !important;
                }

                .globe-popup .maplibregl-popup-close-button {
                    color: rgba(255, 255, 255, 0.4) !important;
                    font-size: 18px !important;
                    padding: 4px 8px !important;
                }

                .globe-popup .maplibregl-popup-close-button:hover {
                    color: #ff9500 !important;
                    background: transparent !important;
                }

                /* Dark nav controls */
                .maplibregl-ctrl-group {
                    background: rgba(10, 14, 28, 0.85) !important;
                    backdrop-filter: blur(8px) !important;
                    border: 1px solid rgba(255, 255, 255, 0.08) !important;
                    border-radius: 10px !important;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3) !important;
                    overflow: hidden;
                }

                .maplibregl-ctrl-group button {
                    background: transparent !important;
                    border-color: rgba(255, 255, 255, 0.06) !important;
                    width: 32px !important;
                    height: 32px !important;
                }

                .maplibregl-ctrl-group button:hover {
                    background: rgba(0, 162, 233, 0.2) !important;
                }

                .maplibregl-ctrl-group button .maplibregl-ctrl-icon {
                    filter: invert(1) brightness(0.7);
                }

                .maplibregl-ctrl-group button:hover .maplibregl-ctrl-icon {
                    filter: invert(1) brightness(1);
                }

                /* Dark attribution */
                .maplibregl-ctrl-attrib {
                    background: rgba(10, 14, 28, 0.7) !important;
                    color: rgba(255, 255, 255, 0.3) !important;
                    font-size: 9px !important;
                    border-radius: 4px !important;
                }

                .maplibregl-ctrl-attrib a {
                    color: rgba(0, 162, 233, 0.6) !important;
                }

                .maplibregl-ctrl-attrib-button {
                    filter: invert(1) brightness(0.5);
                }

                /* Globe canvas background */
                .maplibregl-canvas {
                    outline: none;
                }
            `}</style>
        </div>
    );
}
