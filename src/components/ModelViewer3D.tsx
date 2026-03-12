"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, useGLTF } from "@react-three/drei";
import { Suspense } from "react";

function Model({ url }: { url: string }) {
    const { scene } = useGLTF(url);
    return <primitive object={scene} />;
}

export default function ModelViewer3D({ modelPath }: { modelPath: string }) {
    return (
        <div style={{ width: "100%", height: "100%", background: "#0f172a", borderRadius: "12px", overflow: "hidden" }}>
            <Canvas
                camera={{ position: [3, 3, 3], fov: 50 }}
                style={{ width: "100%", height: "100%" }}
            >
                <Suspense fallback={null}>
                    <Stage environment="city" intensity={0.6}>
                        <Model url={modelPath} />
                    </Stage>
                    <OrbitControls
                        autoRotate
                        autoRotateSpeed={1}
                        enablePan
                        enableZoom
                        enableRotate
                    />
                </Suspense>
            </Canvas>
            <div style={{
                position: "absolute",
                bottom: "12px",
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: "11px",
                color: "var(--text-muted)",
                background: "rgba(0,0,0,0.5)",
                padding: "4px 12px",
                borderRadius: "6px",
                pointerEvents: "none",
            }}>
                Drag to rotate • Scroll to zoom • Shift+drag to pan
            </div>
        </div>
    );
}
