"use client";

import { Suspense, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { X, Info, RefreshCw, Hand, Focus, Maximize, Minimize, Ruler, Scissors, Triangle, Crosshair, Trash, Settings, Check, BoxSelect, SplitSquareVertical, SplitSquareHorizontal, Layers, Move, RefreshCcw, Maximize2 } from "lucide-react";
import * as THREE from "three";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Stage, useGLTF, Line, Html, TransformControls } from "@react-three/drei";

const ToolbarButton = ({ icon, active, onClick, title, children }: { icon?: React.ReactNode, active?: boolean, onClick: () => void, title: string, children?: React.ReactNode }) => (
    <button
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        title={title}
        style={{
            background: active ? "rgba(33, 150, 243, 0.2)" : "transparent",
            color: active ? "#2196F3" : "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
            fontSize: "12px",
            fontWeight: "bold",
            gap: "6px"
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = active ? "rgba(33, 150, 243, 0.3)" : "rgba(255, 255, 255, 0.1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = active ? "rgba(33, 150, 243, 0.2)" : "transparent"; }}
    >
        {icon}
        {children}
    </button>
);

const flattenObject = (obj: any, prefix = ""): Record<string, string> => {
    let result: Record<string, string> = {};
    if (!obj) return result;
    
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === "function" || key.startsWith("_")) continue;
        
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            if ((value as any).isObject3D || (value as any).isMaterial || (value as any).isBufferGeometry || key === "gltfExtensions") continue;
            
            const nestedPrefix = prefix ? `${prefix}${key} / ` : `${key} / `;
            const nested = flattenObject(value, nestedPrefix);
            result = { ...result, ...nested };
        } else if (Array.isArray(value)) {
            result[`${prefix}${key}`] = value.join(", ");
        } else {
            result[`${prefix}${key}`] = String(value);
        }
    }
    return result;
};

type MeasureMode = 'distance' | 'angle' | 'laser';
type SectionMode = 'x' | 'y' | 'z' | 'box';
type TransformMode = 'translate' | 'rotate' | 'scale';

interface Measurement {
    id: string;
    type: MeasureMode;
    points: THREE.Vector3[];
}

// ==========================================
// ClippingManager: Sets gl.clippingPlanes to REFERENCES of the mutating planes
//
// KEY INSIGHT: SectionPlaneHelper mutates clipping planes IN-PLACE via useFrame.
// R3F runs ALL useFrame callbacks BEFORE calling gl.render().  
// gl.render() resets _currentMaterialId = -1, so refreshMaterial=true for all
// materials, ensuring clipping uniforms are uploaded every frame.
//
// We use useEffect (not useFrame) to set gl.clippingPlanes to the SAME plane
// objects that SectionPlaneHelper mutates. No cloning needed — the in-place
// mutations are automatically visible to gl.render().
// ==========================================
function ClippingManager({ activeTool, sectionMode, clippingPlanes }: {
    activeTool: string;
    sectionMode: SectionMode;
    clippingPlanes: THREE.Plane[];
}) {
    const { gl } = useThree();
    // Stable array reference for single-plane mode to avoid creating new arrays
    const singlePlaneRef = useRef<THREE.Plane[]>([clippingPlanes[0]]);
    
    useEffect(() => {
        gl.localClippingEnabled = true;
    }, [gl]);
    
    useEffect(() => {
        if (activeTool === 'section') {
            if (sectionMode === 'box') {
                gl.clippingPlanes = clippingPlanes; // all 6 planes, stable ref from useMemo
            } else {
                singlePlaneRef.current[0] = clippingPlanes[0]; // update the entry
                gl.clippingPlanes = singlePlaneRef.current; // stable array ref
            }
        } else {
            gl.clippingPlanes = [];
        }
        
        return () => {
            gl.clippingPlanes = [];
        };
    }, [activeTool, sectionMode, clippingPlanes, gl]);
    
    return null;
}

// ==========================================
// BoxResizeHandles: Face-based resize for section box
// ==========================================
const FACE_CONFIGS = [
    { dir: new THREE.Vector3(1, 0, 0), pos: new THREE.Vector3(0.5, 0, 0), axis: 'x', sign: 1 },
    { dir: new THREE.Vector3(-1, 0, 0), pos: new THREE.Vector3(-0.5, 0, 0), axis: 'x', sign: -1 },
    { dir: new THREE.Vector3(0, 1, 0), pos: new THREE.Vector3(0, 0.5, 0), axis: 'y', sign: 1 },
    { dir: new THREE.Vector3(0, -1, 0), pos: new THREE.Vector3(0, -0.5, 0), axis: 'y', sign: -1 },
    { dir: new THREE.Vector3(0, 0, 1), pos: new THREE.Vector3(0, 0, 0.5), axis: 'z', sign: 1 },
    { dir: new THREE.Vector3(0, 0, -1), pos: new THREE.Vector3(0, 0, -0.5), axis: 'z', sign: -1 },
] as const;

function BoxResizeFaces({ boxRef, controlsRef }: { boxRef: React.RefObject<THREE.Mesh | null>, controlsRef: any }) {
    const { camera, gl } = useThree();
    const dragRef = useRef<{
        faceIdx: number;
        startScale: THREE.Vector3;
        startPos: THREE.Vector3;
        dragPlane: THREE.Plane;
        startHit: THREE.Vector3;
        worldNormal: THREE.Vector3;
    } | null>(null);
    const [hovered, setHovered] = useState<number | null>(null);
    const raycaster = useMemo(() => new THREE.Raycaster(), []);

    const handlePointerDown = (e: any, faceIdx: number) => {
        e.stopPropagation();
        if (!boxRef.current) return;
        
        const worldPos = new THREE.Vector3();
        const worldScale = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        boxRef.current.getWorldPosition(worldPos);
        boxRef.current.getWorldScale(worldScale);
        boxRef.current.getWorldQuaternion(worldQuat);
        
        const config = FACE_CONFIGS[faceIdx];
        
        // Face normal in world space
        const worldNormal = config.dir.clone().applyQuaternion(worldQuat).normalize();
        
        // Face center in world space
        const localCenter = config.pos.clone().multiply(worldScale);
        const worldCenter = localCenter.applyQuaternion(worldQuat).add(worldPos);
        
        // Create a drag plane facing the camera, passing through the face center
        const camDir = camera.getWorldDirection(new THREE.Vector3());
        const dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(camDir.negate(), worldCenter);
        
        const mouse = new THREE.Vector2(
            (e.clientX / gl.domElement.clientWidth) * 2 - 1,
            -(e.clientY / gl.domElement.clientHeight) * 2 + 1
        );
        
        raycaster.setFromCamera(mouse, camera);
        const startHit = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlane, startHit);
        
        dragRef.current = {
            faceIdx,
            startScale: worldScale.clone(),
            startPos: worldPos.clone(),
            dragPlane,
            startHit: startHit || worldCenter.clone(),
            worldNormal
        };
        
        // Disable orbit controls reliably via the ref
        if (controlsRef && controlsRef.current) {
            controlsRef.current.enabled = false;
        }
        gl.domElement.style.cursor = 'grabbing';
        
        const onMove = (ev: PointerEvent) => {
            if (!dragRef.current || !boxRef.current) return;
            const { startScale, startPos, dragPlane: dp, startHit: sh, faceIdx: fi, worldNormal } = dragRef.current;
            
            const m = new THREE.Vector2(
                (ev.clientX / gl.domElement.clientWidth) * 2 - 1,
                -(ev.clientY / gl.domElement.clientHeight) * 2 + 1
            );
            raycaster.setFromCamera(m, camera);
            const hit = new THREE.Vector3();
            if (!raycaster.ray.intersectPlane(dp, hit)) return;
            
            const delta = hit.clone().sub(sh);
            
            // Project delta onto the face normal to get movement scalar
            const moveAmt = delta.dot(worldNormal);
            
            const config = FACE_CONFIGS[fi];
            
            const newScaleX = config.axis === 'x' ? Math.max(0.1, startScale.x + moveAmt) : startScale.x;
            const newScaleY = config.axis === 'y' ? Math.max(0.1, startScale.y + moveAmt) : startScale.y;
            const newScaleZ = config.axis === 'z' ? Math.max(0.1, startScale.z + moveAmt) : startScale.z;
            
            // Move the center by half the amount it scaled, in the direction of the normal 
            // This keeps the opposite face fixed
            const scaleDiff = (config.axis === 'x' ? newScaleX - startScale.x : 
                              config.axis === 'y' ? newScaleY - startScale.y : 
                                                    newScaleZ - startScale.z);
                                                    
            const posOff = worldNormal.clone().multiplyScalar(scaleDiff / 2);
            
            boxRef.current.scale.set(newScaleX, newScaleY, newScaleZ);
            boxRef.current.position.copy(startPos).add(posOff);
            boxRef.current.updateMatrixWorld();
        };
        
        const onUp = () => {
            dragRef.current = null;
            gl.domElement.style.cursor = '';
            if (controlsRef && controlsRef.current) {
                controlsRef.current.enabled = true;
            }
            gl.domElement.removeEventListener('pointermove', onMove);
            gl.domElement.removeEventListener('pointerup', onUp);
        };
        
        gl.domElement.addEventListener('pointermove', onMove);
        gl.domElement.addEventListener('pointerup', onUp);
    };
    
    return (
        <group>
            {FACE_CONFIGS.map((config, i) => {
                const isX = config.axis === 'x';
                const isY = config.axis === 'y';
                const isZ = config.axis === 'z';
                
                // Create planes that cover the sides
                // Since the parent box is unit size (1x1x1) we make the planes 1x1
                const planeGeomArgs: [number, number] = [1, 1];
                
                // Rotate the plane to face the right direction
                const rotation: [number, number, number] = 
                    isX ? [0, config.sign * Math.PI / 2, 0] :
                    isY ? [-config.sign * Math.PI / 2, 0, 0] :
                    [0, config.sign === -1 ? Math.PI : 0, 0];
                    
                return (
                    <mesh
                        key={i}
                        position={config.pos}
                        rotation={rotation}
                        onPointerDown={(e) => handlePointerDown(e, i)}
                        onPointerOver={() => { setHovered(i); gl.domElement.style.cursor = 'grab'; }}
                        onPointerOut={() => { setHovered(null); gl.domElement.style.cursor = ''; }}
                    >
                        <planeGeometry args={planeGeomArgs} />
                        <meshBasicMaterial
                            color={hovered === i ? '#facc15' : '#0ea5e9'}
                            transparent
                            opacity={hovered === i ? 0.3 : 0.0}
                            side={THREE.DoubleSide}
                            depthWrite={false}
                            polygonOffset
                            polygonOffsetFactor={-1}
                            polygonOffsetUnits={-1}
                        />
                    </mesh>
                );
            })}
        </group>
    );
}

// ==========================================
// SectionPlaneHelper: The draggable plane/box visual
// ==========================================
function SectionPlaneHelper({ mode, tMode, modelPath, activeTool, clippingPlanes, controlsRef }: { 
    mode: SectionMode, 
    tMode: TransformMode, 
    modelPath: string, 
    activeTool: string,
    clippingPlanes: THREE.Plane[],
    controlsRef: any
}) {
    const meshRef = useRef<THREE.Mesh>(null);
    const boxRef = useRef<THREE.Mesh>(null);
    const { scene } = useGLTF(modelPath);

    const [meshObj, setMeshObj] = useState<THREE.Mesh | null>(null);
    const [boxObj, setBoxObj] = useState<THREE.Mesh | null>(null);

    // Sync state so TransformControls can attach
    useEffect(() => {
        if (meshRef.current !== meshObj) setMeshObj(meshRef.current);
        if (boxRef.current !== boxObj) setBoxObj(boxRef.current);
    }, [mode, activeTool, tMode]);

    const modelBounds = useMemo(() => {
        if (!scene) return { size: new THREE.Vector3(10,10,10), center: new THREE.Vector3(0,0,0), max: 10 };
        const box = new THREE.Box3().setFromObject(scene);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        return { 
            size: size.clone().multiplyScalar(1.05), // slightly larger than model
            center,
            max: Math.max(size.x, size.y, size.z) * 1.2 || 10
        };
    }, [scene]);

    // Reset transform when mode changes
    useEffect(() => {
        if (activeTool !== 'section') return;

        if (mode !== 'box') {
            const normal = new THREE.Vector3();
            if (mode === 'x') normal.set(1, 0, 0);
            if (mode === 'y') normal.set(0, 1, 0);
            if (mode === 'z') normal.set(0, 0, 1);
            
            if (meshRef.current) {
                meshRef.current.position.set(0,0,0); // planes start at origin
                meshRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), normal);
                meshRef.current.updateMatrixWorld();
            }
        } else {
            if (boxRef.current) {
                // Box starts covering the whole model
                boxRef.current.position.copy(modelBounds.center);
                boxRef.current.scale.copy(modelBounds.size);
                boxRef.current.quaternion.identity();
                boxRef.current.updateMatrixWorld();
            }
        }
    }, [mode, activeTool, modelBounds]);

    // Sync clipping planes with transform gizmo position every frame
    // CRITICAL: TransformControls moves a PARENT GROUP, not the mesh itself.
    // So meshRef.current.position is always (0,0,0) locally!
    // Must use getWorldPosition/getWorldQuaternion to get actual world transform.
    useFrame(() => {
        if (activeTool !== 'section') return;

        if (mode !== 'box' && meshRef.current) {
            const worldPos = new THREE.Vector3();
            const worldQuat = new THREE.Quaternion();
            meshRef.current.getWorldPosition(worldPos);
            meshRef.current.getWorldQuaternion(worldQuat);
            
            const normal = new THREE.Vector3(0,0,1).applyQuaternion(worldQuat).normalize();
            clippingPlanes[0].setFromNormalAndCoplanarPoint(normal.negate(), worldPos);
        } else if (mode === 'box' && boxRef.current) {
            const worldPos = new THREE.Vector3();
            const worldQuat = new THREE.Quaternion();
            const worldScale = new THREE.Vector3();
            boxRef.current.getWorldPosition(worldPos);
            boxRef.current.getWorldQuaternion(worldQuat);
            boxRef.current.getWorldScale(worldScale);
            
            const hw = worldScale.x / 2;
            const hh = worldScale.y / 2;
            const hd = worldScale.z / 2;

            const nX = new THREE.Vector3(1,0,0).applyQuaternion(worldQuat);
            const nNegX = new THREE.Vector3(-1,0,0).applyQuaternion(worldQuat);
            const nY = new THREE.Vector3(0,1,0).applyQuaternion(worldQuat);
            const nNegY = new THREE.Vector3(0,-1,0).applyQuaternion(worldQuat);
            const nZ = new THREE.Vector3(0,0,1).applyQuaternion(worldQuat);
            const nNegZ = new THREE.Vector3(0,0,-1).applyQuaternion(worldQuat);

            const pX = worldPos.clone().add(nX.clone().multiplyScalar(hw));
            const pNegX = worldPos.clone().add(nNegX.clone().multiplyScalar(hw));
            const pY = worldPos.clone().add(nY.clone().multiplyScalar(hh));
            const pNegY = worldPos.clone().add(nNegY.clone().multiplyScalar(hh));
            const pZ = worldPos.clone().add(nZ.clone().multiplyScalar(hd));
            const pNegZ = worldPos.clone().add(nNegZ.clone().multiplyScalar(hd));

            clippingPlanes[0].setFromNormalAndCoplanarPoint(nNegX, pX); 
            clippingPlanes[1].setFromNormalAndCoplanarPoint(nX, pNegX); 
            clippingPlanes[2].setFromNormalAndCoplanarPoint(nNegY, pY); 
            clippingPlanes[3].setFromNormalAndCoplanarPoint(nY, pNegY); 
            clippingPlanes[4].setFromNormalAndCoplanarPoint(nNegZ, pZ); 
            clippingPlanes[5].setFromNormalAndCoplanarPoint(nZ, pNegZ); 
        }
    });

    if (activeTool !== 'section') return null;

    return (
        <group>
            {/* The individual plane mesh, always rendered but sometimes invisible */}
            <mesh ref={meshRef} visible={mode !== 'box'}>
                <planeGeometry args={[modelBounds.max*3, modelBounds.max*3]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.15} side={THREE.DoubleSide} depthWrite={false} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
            </mesh>
            
            {/* The box mesh, always rendered but sometimes invisible */}
            <mesh ref={boxRef} visible={mode === 'box'}>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color="#0ea5e9" transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
                {mode === 'box' && tMode === 'scale' && (
                    <BoxResizeFaces boxRef={boxRef} controlsRef={controlsRef} />
                )}
            </mesh>

            {/* Transform Controls attached dynamically */}
            {mode !== 'box' && meshObj && (
                <TransformControls mode={tMode} size={1} object={meshObj} />
            )}
            {mode === 'box' && tMode !== 'scale' && boxObj && (
                <TransformControls mode={tMode} size={1} object={boxObj} />
            )}
        </group>
    )
}

// ==========================================
// MeasureGraphics
// ==========================================
function MeasureGraphics({ measurement, settings, isPending }: { measurement: Measurement, settings: any, isPending?: boolean }) {
    const { type, points } = measurement;
    
    const formatDistance = (val: number) => {
        let v = val;
        if (settings.unit === 'mm') v *= 1000;
        if (settings.unit === 'cm') v *= 100;
        return `~ ${(v).toFixed(settings.precision)} ${settings.unit}`;
    };

    const formatAngle = (val: number) => {
        return `~ ${val.toFixed(settings.precision)} °`;
    };

    const badgeStyle = {
        background: '#0ea5e9',
        color: 'white', 
        padding: '4px 10px', 
        borderRadius: '16px', 
        fontSize: '11px', 
        fontWeight: '600', 
        pointerEvents: 'none', 
        whiteSpace: 'nowrap',
        border: '1px solid rgba(255,255,255,0.4)',
        boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
    } as React.CSSProperties;
    
    const color = isPending ? "#fb923c" : "#0ea5e9";

    if (type === 'distance') {
        return (
            <group>
                {points.map((p, i) => (
                    <mesh key={i} position={p}>
                        <sphereGeometry args={[0.03, 16, 16]} />
                        <meshBasicMaterial color={color} depthTest={false} />
                    </mesh>
                ))}
                {points.length === 2 && (
                    <>
                        <Line points={[points[0], points[1]]} color={color} lineWidth={4} depthTest={false} />
                        <Html position={points[0].clone().lerp(points[1], 0.5)} center zIndexRange={[100, 0]}>
                            <div style={badgeStyle}>{formatDistance(points[0].distanceTo(points[1]))}</div>
                        </Html>
                    </>
                )}
            </group>
        );
    }
    
    if (type === 'angle') {
        let angleDeg: number | null = null;
        if (points.length === 3) {
            const dir1 = points[0].clone().sub(points[1]).normalize();
            const dir2 = points[2].clone().sub(points[1]).normalize();
            angleDeg = dir1.angleTo(dir2) * (180 / Math.PI);
        }
        
        return (
            <group>
                {points.map((p, i) => (
                    <mesh key={i} position={p}>
                        <sphereGeometry args={[0.03, 16, 16]} />
                        <meshBasicMaterial color={color} depthTest={false} />
                    </mesh>
                ))}
                {points.length >= 2 && <Line points={[points[0], points[1]]} color={color} lineWidth={4} depthTest={false} />}
                {points.length >= 3 && <Line points={[points[1], points[2]]} color={color} lineWidth={4} depthTest={false} />}
                
                {angleDeg !== null && (
                    <Html position={points[1]} center zIndexRange={[100, 0]}>
                        <div style={{...badgeStyle, marginTop: '30px'}}>{formatAngle(angleDeg)}</div>
                    </Html>
                )}
            </group>
        )
    }

    if (type === 'laser') {
        return (
            <group>
                <mesh position={points[0]}>
                    <sphereGeometry args={[0.03, 16, 16]} />
                    <meshBasicMaterial color={color} depthTest={false} />
                </mesh>
                <Html position={points[0]} center zIndexRange={[100, 0]}>
                    <div style={{...badgeStyle, textAlign: 'left', marginTop: '50px', display: 'flex', flexDirection: 'column'}}>
                        <span>X: {formatDistance(points[0].x).replace('~ ','')}</span>
                        <span>Y: {formatDistance(points[0].y).replace('~ ','')}</span>
                        <span>Z: {formatDistance(points[0].z).replace('~ ','')}</span>
                    </div>
                </Html>
            </group>
        )
    }
    
    return null;
}

// ==========================================
// Model: The main GLTF scene rendering + interaction
// ==========================================
function Model({ 
    url, 
    selectedUuid, 
    onSelect, 
    activeTool, 
    measureMode,
    measurements,
    currentMeasurePoints, 
    setCurrentMeasurePoints,
    onMeasureComplete,
    measureSettings,
    fitTrigger,
    controlsRef,
    setSnapPoint
}: { 
    url: string; 
    selectedUuid: string | null; 
    onSelect: (data: Record<string, any>, name: string, uuid: string) => void;
    activeTool: 'orbit' | 'pan' | 'measure' | 'section';
    measureMode: MeasureMode;
    measurements: Measurement[];
    currentMeasurePoints: THREE.Vector3[];
    setCurrentMeasurePoints: React.Dispatch<React.SetStateAction<THREE.Vector3[]>>;
    onMeasureComplete: (mode: MeasureMode, pts: THREE.Vector3[]) => void;
    measureSettings: any;
    fitTrigger: number;
    controlsRef: any;
    setSnapPoint: React.Dispatch<React.SetStateAction<THREE.Vector3 | null>>;
}) {
    const { scene } = useGLTF(url);
    const { camera } = useThree();
    
    // Fit to View logic
    useEffect(() => {
        if (fitTrigger > 0 && controlsRef.current && scene) {
            const box = new THREE.Box3().setFromObject(scene);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z) || 10;
            const distance = maxDim * 1.5;
            
            camera.position.set(center.x + distance, center.y + distance, center.z + distance);
            controlsRef.current.target.copy(center);
            controlsRef.current.update();
        }
    }, [fitTrigger, scene, camera, controlsRef]);

    // Highlight Logic
    useEffect(() => {
        scene.traverse((child: any) => {
            if (child.isMesh && child.userData._originalMaterial) {
                child.material = child.userData._originalMaterial;
                delete child.userData._originalMaterial;
            }
        });

        if (selectedUuid && activeTool !== 'measure') {
            const selectedObj = scene.getObjectByProperty('uuid', selectedUuid);
            if (selectedObj) {
                selectedObj.traverse((child: any) => {
                    if (child.isMesh) {
                        child.userData._originalMaterial = child.material;
                        
                        const createHighlight = (mat: any) => {
                            const m = mat.clone();
                            const highlightHex = 0x0059d6;
                            
                            m.transparent = true;
                            m.opacity = 0.6;
                            m.depthWrite = false; 
                            
                            if (m.color !== undefined) {
                                m.color.setHex(highlightHex);
                            }
                            
                            if (m.emissive !== undefined) {
                                m.emissive.setHex(highlightHex);
                                m.emissiveIntensity = 0.6; 
                            }
                            
                            return m;
                        };

                        child.material = Array.isArray(child.material)
                            ? child.material.map(createHighlight)
                            : createHighlight(child.material);
                    }
                });
            }
        }
    }, [selectedUuid, scene, activeTool]);

    const getSnapPoint = (e: any) => {
        if (measureSettings.freeMeasure) return e.point;
        
        if (e.object && e.face && e.object.geometry) {
            const geom = e.object.geometry;
            const posAttr = geom.attributes.position;
            if (!posAttr) return e.point;

            const a = e.face.a, b = e.face.b, c = e.face.c;
            if (a === undefined || b === undefined || c === undefined) return e.point;

            const vA = new THREE.Vector3().fromBufferAttribute(posAttr, a);
            const vB = new THREE.Vector3().fromBufferAttribute(posAttr, b);
            const vC = new THREE.Vector3().fromBufferAttribute(posAttr, c);

            e.object.localToWorld(vA);
            e.object.localToWorld(vB);
            e.object.localToWorld(vC);

            const distA = e.point.distanceTo(vA);
            const distB = e.point.distanceTo(vB);
            const distC = e.point.distanceTo(vC);

            let closest = vA;
            let minDist = distA;
            if (distB < minDist) { closest = vB; minDist = distB; }
            if (distC < minDist) { closest = vC; minDist = distC; }
            
            return closest;
        }
        return e.point;
    };

    const handlePointerMove = (e: any) => {
        if (activeTool !== 'measure') return;
        e.stopPropagation();
        setSnapPoint(getSnapPoint(e));
    };

    const handlePointerOut = () => {
        if (activeTool === 'measure') setSnapPoint(null);
    };

    const handleClick = (e: any) => {
        e.stopPropagation();
        
        if (activeTool === 'measure') {
            const pointToUse = getSnapPoint(e);
            const newPoints = [...currentMeasurePoints, pointToUse];
            
            if (measureMode === 'distance') {
                if (newPoints.length === 2) {
                    onMeasureComplete(measureMode, newPoints);
                } else {
                    setCurrentMeasurePoints(newPoints);
                }
            } else if (measureMode === 'angle') {
                if (newPoints.length === 3) {
                    onMeasureComplete(measureMode, newPoints);
                } else {
                    setCurrentMeasurePoints(newPoints);
                }
            } else if (measureMode === 'laser') {
                onMeasureComplete(measureMode, newPoints);
            }
            return;
        }

        if (activeTool === 'section') return;
        
        let obj = e.object;
        let rawData = obj.userData;
        
        while (obj && Object.keys(rawData).length === 0 && obj.parent) {
            obj = obj.parent;
            rawData = obj.userData;
        }

        const objectName = e.object.name || obj?.name || "Unnamed Object";
        const flatData = flattenObject(rawData);
        
        if (Object.keys(flatData).length > 0) {
            onSelect(flatData, objectName, obj.uuid);
        } else {
            onSelect({ _info: "Tidak ada informasi metadata pada objek ini." }, objectName, obj.uuid);
        }
    };

    return (
        <group>
            <primitive object={scene} onClick={handleClick} onPointerMove={handlePointerMove} onPointerOut={handlePointerOut} />
        </group>
    );
}

// ==========================================
// Main ModelViewer3D
// ==========================================
export default function ModelViewer3D({ modelPath }: { modelPath: string }) {
    const [selectedObject, setSelectedObject] = useState<{uuid: string; name: string; data: Record<string, any>} | null>(null);
    const [activeTool, setActiveTool] = useState<'orbit' | 'pan' | 'measure' | 'section'>('orbit');
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Measurement states
    const [measureMode, setMeasureMode] = useState<MeasureMode>('distance');
    const [measurements, setMeasurements] = useState<Measurement[]>([]);
    const [currentMeasurePoints, setCurrentMeasurePoints] = useState<THREE.Vector3[]>([]);
    const [measureSettings, setMeasureSettings] = useState({ unit: 'mm', precision: 1, freeMeasure: false });
    const [showMeasureSettings, setShowMeasureSettings] = useState(false);
    const [snapPoint, setSnapPoint] = useState<THREE.Vector3 | null>(null);
    
    // Section states
    const [sectionMode, setSectionMode] = useState<SectionMode>('y');
    const [transformMode, setTransformMode] = useState<TransformMode>('translate');
    
    // Shared clipping planes (stable references, mutated in-place by SectionPlaneHelper)
    const clippingPlanes = useMemo(() => [
        new THREE.Plane(new THREE.Vector3(1, 0, 0), 0),
        new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),
        new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
        new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
        new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
        new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
    ], []);
    
    const [fitTrigger, setFitTrigger] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const controlsRef = useRef<any>(null);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    const handleFitToView = () => {
        setFitTrigger(prev => prev + 1);
        window.dispatchEvent(new Event('resize'));
    };

    const handleMeasureComplete = (mode: MeasureMode, pts: THREE.Vector3[]) => {
        setMeasurements(prev => [...prev, { id: Date.now().toString(), type: mode, points: pts }]);
        setCurrentMeasurePoints([]);
    };

    useEffect(() => {
        setCurrentMeasurePoints([]);
        if (activeTool !== 'section') {
            setTransformMode('translate');
        }
    }, [activeTool, measureMode]);

    return (
        <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%", background: "#f1f5f9", borderRadius: isFullscreen ? "0" : "12px", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
                <Canvas
                    camera={{ position: [3, 3, 3], fov: 50 }}
                    style={{ width: "100%", height: "100%" }}
                    onPointerMissed={() => setSelectedObject(null)}
                    gl={{ localClippingEnabled: true }}
                >
                    <Suspense fallback={null}>

                        {/* Adding generic lighting to prevent darkness when remote HDR map fails */}
                        <ambientLight intensity={1.0} />
                        <directionalLight position={[10, 10, 10]} intensity={1.5} />
                        <directionalLight position={[-10, -10, -10]} intensity={0.5} />
                        
                        {/* Disable remote HDR fetch by setting environment={null} */}
                        <Stage environment={null} intensity={0.6}>
                            <Model 
                                url={modelPath} 
                                selectedUuid={selectedObject?.uuid || null}
                                onSelect={(data, name, uuid) => setSelectedObject({ uuid, name, data })}
                                activeTool={activeTool}
                                measureMode={measureMode}
                                measurements={measurements}
                                currentMeasurePoints={currentMeasurePoints}
                                setCurrentMeasurePoints={setCurrentMeasurePoints}
                                onMeasureComplete={handleMeasureComplete}
                                measureSettings={measureSettings}
                                fitTrigger={fitTrigger}
                                controlsRef={controlsRef}
                                setSnapPoint={setSnapPoint}
                            />
                        </Stage>
                        
                        {/* Clipping Manager - manages renderer + material clipping */}
                        <ClippingManager 
                            activeTool={activeTool}
                            sectionMode={sectionMode}
                            clippingPlanes={clippingPlanes}
                        />
                        
                        {/* Interactive Clipping Planes helper */}
                        <SectionPlaneHelper 
                            mode={sectionMode} 
                            tMode={transformMode} 
                            activeTool={activeTool}
                            modelPath={modelPath}
                            clippingPlanes={clippingPlanes}
                            controlsRef={controlsRef}
                        />
                        
                        {/* Measurements */}
                        {activeTool === 'measure' && measurements.map(m => (
                            <MeasureGraphics key={m.id} measurement={m} settings={measureSettings} />
                        ))}
                        {activeTool === 'measure' && currentMeasurePoints.length > 0 && (
                            <MeasureGraphics 
                                measurement={{ id: 'current', type: measureMode, points: currentMeasurePoints }} 
                                settings={measureSettings} 
                                isPending={true} 
                            />
                        )}
                        {activeTool === 'measure' && snapPoint && (
                            <mesh position={snapPoint}>
                                <sphereGeometry args={[0.04, 16, 16]} />
                                <meshBasicMaterial color="#ef4444" transparent opacity={0.8} depthTest={false} />
                            </mesh>
                        )}

                        <OrbitControls
                            ref={controlsRef}
                            makeDefault
                            autoRotate={!selectedObject && activeTool === 'orbit'} 
                            autoRotateSpeed={1}
                            enablePan
                            enableZoom
                            enableRotate
                            mouseButtons={
                                activeTool === 'pan' 
                                ? { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
                                : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }
                            }
                        />
                    </Suspense>
                </Canvas>
            </div>

            <div style={{
                position: "absolute",
                top: "16px",
                left: "16px",
                fontSize: "11px",
                color: "#1e293b",
                background: "rgba(255,255,255,0.7)",
                padding: "8px 16px",
                borderRadius: "20px",
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backdropFilter: "blur(4px)",
                border: "1px solid rgba(0,0,0,0.1)",
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                zIndex: 10
            }}>
                <Info size={14} />
                <span>Navigasi: Kiri click memutar layar (Orbit) dan shift klik untuk Pan.</span>
            </div>

            {/* Autodesk-style Toolbar */}
            <div style={{
                position: "absolute",
                bottom: "24px",
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
                zIndex: 20,
                pointerEvents: "none" 
            }}>
                
                {activeTool === 'measure' && showMeasureSettings && (
                    <div style={{
                        background: "#fff", 
                        padding: "20px",
                        borderRadius: "12px",
                        pointerEvents: "auto",
                        boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
                        minWidth: "240px",
                        color: "#333",
                        fontSize: "13px"
                    }}>
                        <h4 style={{ margin: "0 0 16px 0", fontSize: "14px" }}>Pengaturan Pengukuran</h4>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <label style={{ fontWeight: 500, color: '#64748b' }}>Unit Type</label>
                            <select 
                                value={measureSettings.unit} 
                                onChange={(e) => setMeasureSettings({...measureSettings, unit: e.target.value})} 
                                style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none' }}
                            >
                                <option value="m">Meters</option>
                                <option value="cm">Centimeters</option>
                                <option value="mm">Millimeters</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <label style={{ fontWeight: 500, color: '#64748b' }}>Precision</label>
                            <select 
                                value={measureSettings.precision} 
                                onChange={(e) => setMeasureSettings({...measureSettings, precision: parseInt(e.target.value)})} 
                                style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none' }}
                            >
                                <option value="0">0</option>
                                <option value="1">0.1</option>
                                <option value="2">0.01</option>
                                <option value="3">0.001</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontWeight: 500, color: '#64748b' }}>Enable free measure</label>
                            <input 
                                type="checkbox"
                                checked={measureSettings.freeMeasure} 
                                onChange={(e) => setMeasureSettings({...measureSettings, freeMeasure: e.target.checked})} 
                            />
                        </div>
                    </div>
                )}

                {/* Measure Sub-Toolbar */}
                {activeTool === 'measure' && (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "rgba(30, 30, 30, 0.95)", 
                        padding: "8px 12px",
                        borderRadius: "10px",
                        backdropFilter: "blur(10px)",
                        pointerEvents: "auto",
                        boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
                    }}>
                        <ToolbarButton icon={<Ruler size={16} />} active={measureMode === 'distance'} onClick={() => setMeasureMode('distance')} title="Distance" />
                        <ToolbarButton icon={<Triangle size={16} />} active={measureMode === 'angle'} onClick={() => setMeasureMode('angle')} title="Angle" />
                        <ToolbarButton icon={<Crosshair size={16} />} active={measureMode === 'laser'} onClick={() => setMeasureMode('laser')} title="Laser (Coordinate)" />
                        
                        <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.2)", margin: "0 6px" }} />
                        
                        <ToolbarButton icon={<Trash size={16} />} onClick={() => { setMeasurements([]); setCurrentMeasurePoints([]); }} title="Clear All Measurements" />
                        <ToolbarButton icon={<Settings size={16} />} active={showMeasureSettings} onClick={() => setShowMeasureSettings(!showMeasureSettings)} title="Measure Settings" />
                        
                        <button 
                            onClick={() => {
                                setActiveTool('orbit');
                                setShowMeasureSettings(false);
                            }} 
                            style={{ 
                                background: "#0ea5e9", 
                                color: "#fff", 
                                border: "none", 
                                borderRadius: "6px", 
                                padding: "8px 16px", 
                                fontWeight: "600", 
                                fontSize: "12px", 
                                cursor: "pointer", 
                                marginLeft: "8px" 
                            }}>
                            Done
                        </button>
                    </div>
                )}
                
                {/* Section Sub-Toolbar */}
                {activeTool === 'section' && (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "rgba(30, 30, 30, 0.95)", 
                        padding: "8px 12px",
                        borderRadius: "10px",
                        backdropFilter: "blur(10px)",
                        pointerEvents: "auto",
                        boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
                    }}>
                        <ToolbarButton icon={<SplitSquareVertical size={16} />} active={sectionMode === 'x'} onClick={() => setSectionMode('x')} title="X Plane" />
                        <ToolbarButton icon={<SplitSquareHorizontal size={16} />} active={sectionMode === 'y'} onClick={() => setSectionMode('y')} title="Y Plane" />
                        <ToolbarButton icon={<Layers size={16} />} active={sectionMode === 'z'} onClick={() => setSectionMode('z')} title="Z Plane" />
                        <ToolbarButton icon={<BoxSelect size={16} />} active={sectionMode === 'box'} onClick={() => setSectionMode('box')} title="Section Box" />
                        
                        {sectionMode === 'box' && (
                            <>
                                <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.2)", margin: "0 6px" }} />
                                
                                <ToolbarButton icon={<Move size={16} />} active={transformMode === 'translate'} onClick={() => setTransformMode('translate')} title="Translate (Geser)">Geser</ToolbarButton>
                                <ToolbarButton icon={<RefreshCcw size={16} />} active={transformMode === 'rotate'} onClick={() => setTransformMode('rotate')} title="Rotate (Putar)">Putar</ToolbarButton>
                                <ToolbarButton icon={<Maximize2 size={16} />} active={transformMode === 'scale'} onClick={() => setTransformMode('scale')} title="Scale (Ubah Ukuran)">Resize</ToolbarButton>
                            </>
                        )}
                        
                        <button 
                            onClick={() => setActiveTool('orbit')} 
                            style={{ 
                                background: "#0ea5e9", 
                                color: "#fff", 
                                border: "none", 
                                borderRadius: "6px", 
                                padding: "8px 16px", 
                                fontWeight: "600", 
                                fontSize: "12px", 
                                cursor: "pointer", 
                                marginLeft: "8px" 
                            }}>
                            Done
                        </button>
                    </div>
                )}

                {/* Main Toolbar */}
                <div style={{
                    display: activeTool === 'measure' || activeTool === 'section' ? 'none' : 'flex', 
                    gap: "6px",
                    background: "rgba(30, 30, 30, 0.9)", 
                    padding: "6px 12px",
                    borderRadius: "10px",
                    backdropFilter: "blur(10px)",
                    pointerEvents: "auto",
                    boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
                }}>
                    <ToolbarButton 
                        icon={<RefreshCw size={18} strokeWidth={2.5} />} 
                        active={activeTool === 'orbit'} 
                        onClick={() => setActiveTool('orbit')} 
                        title="Orbit" 
                    />
                    <ToolbarButton 
                        icon={<Hand size={18} strokeWidth={2.5} />} 
                        active={activeTool === 'pan'} 
                        onClick={() => setActiveTool('pan')} 
                        title="Pan" 
                    />
                    <div style={{ width: "1px", background: "rgba(255,255,255,0.2)", margin: "4px 6px" }} />
                    <ToolbarButton 
                        icon={<Ruler size={18} strokeWidth={2.5} />} 
                        active={activeTool === 'measure'} 
                        onClick={() => { setActiveTool('measure'); setShowMeasureSettings(false); }} 
                        title="Measure (Ukur Jarak)" 
                    />
                    <ToolbarButton 
                        icon={<Scissors size={18} strokeWidth={2.5} />} 
                        active={activeTool === 'section'} 
                        onClick={() => setActiveTool('section')} 
                        title="Section Analysis (Potongan)" 
                    />
                    <div style={{ width: "1px", background: "rgba(255,255,255,0.2)", margin: "4px 6px" }} />
                    <ToolbarButton 
                        icon={<Focus size={18} strokeWidth={2.5} />} 
                        onClick={handleFitToView} 
                        title="Fit to View" 
                    />
                    <div style={{ width: "1px", background: "rgba(255,255,255,0.2)", margin: "4px 6px" }} />
                    <ToolbarButton 
                        icon={isFullscreen ? <Minimize size={18} strokeWidth={2.5} /> : <Maximize size={18} strokeWidth={2.5} />} 
                        onClick={toggleFullscreen} 
                        title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"} 
                    />
                </div>
            </div>

            {selectedObject && activeTool === 'orbit' && (
                <div style={{
                    position: "absolute",
                    top: "16px",
                    right: "16px",
                    width: "300px",
                    maxHeight: "calc(100% - 32px)",
                    background: "rgba(255, 255, 255, 0.9)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(0, 0, 0, 0.1)",
                    borderRadius: "12px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                    overflowY: "auto",
                    color: "#0f172a",
                    zIndex: 10
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid rgba(0,0,0,0.1)", paddingBottom: "12px" }}>
                        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: "8px" }} title={selectedObject.name}>
                            {selectedObject.name}
                        </h3>
                        <button 
                            onClick={() => setSelectedObject(null)}
                            style={{ background: "transparent", border: "none", color: "rgba(15,23,42,0.6)", cursor: "pointer", padding: "4px" }}
                        >
                            <X size={18} />
                        </button>
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                        {selectedObject.data._info ? (
                            <div style={{ color: "rgba(15,23,42,0.5)", fontStyle: "italic", padding: "12px 0", textAlign: "center" }}>
                                {selectedObject.data._info}
                            </div>
                        ) : (
                            Object.entries(selectedObject.data).map(([key, value]) => {
                                return (
                                    <div key={key} style={{ display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.04)", padding: "8px 10px", borderRadius: "6px" }}>
                                        <span style={{ fontSize: "11px", color: "rgba(15,23,42,0.6)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
                                            {key}
                                        </span>
                                        <span style={{ fontWeight: "500", wordBreak: "break-word" }}>
                                            {String(value)}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
