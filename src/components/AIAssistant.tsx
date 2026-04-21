"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Paperclip, AlertTriangle, User, Bot, Upload, Volume2, VolumeX, Mic } from "lucide-react";

import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float } from "@react-three/drei";

function RobotHead() {
  const headRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (headRef.current) {
      // Robot head follows the pointer naturally exactly like before
      const target = new THREE.Vector3(state.pointer.x * 2, state.pointer.y * 2, 5);
      headRef.current.lookAt(target);
    }
  });

  return (
    <group ref={headRef} position={[0, 0.2, 0]}>
      {/* 1. Base Head (Baby Blue Sphere, slightly squashed) */}
      <mesh position={[0, -0.2, 0]}>
        <sphereGeometry args={[0.9, 64, 64]} />
        <meshStandardMaterial color="#bae6fd" metalness={0.1} roughness={0.4} />
      </mesh>

      {/* 2. Helmet Top (Darker Blue Half-Sphere) */}
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.95, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#0284c7" metalness={0.3} roughness={0.2} />
      </mesh>

      {/* 3. Helmet Rim (Darker Blue Torus) */}
      <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.95, 0.08, 16, 64]} />
        <meshStandardMaterial color="#0284c7" metalness={0.3} roughness={0.2} />
      </mesh>

      {/* 4. PLN Logo Plate (Yellow Box) */}
      <mesh position={[0, 0.6, 0.85]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[0.25, 0.25, 0.15]} />
        <meshStandardMaterial color="#facc15" metalness={0.2} roughness={0.4} />
      </mesh>

      {/* 5. Dark Face Screen area */}
      <mesh position={[0, -0.2, 0.4]} scale={[1, 0.65, 0.6]}>
        <sphereGeometry args={[0.91, 64, 64]} />
        <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* 6. Glowing Cyan Eyes */}
      <mesh position={[-0.3, -0.1, 0.92]} rotation={[-0.1, -0.2, 0]}>
        <sphereGeometry args={[0.16, 32, 32]} />
        <meshStandardMaterial color="#e0f2fe" emissive="#0ea5e9" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>

      <mesh position={[0.3, -0.1, 0.92]} rotation={[-0.1, 0.2, 0]}>
        <sphereGeometry args={[0.16, 32, 32]} />
        <meshStandardMaterial color="#e0f2fe" emissive="#0ea5e9" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>

      {/* 7. Smile (A curved torus rotated to look like a smile) */}
      <mesh position={[0, -0.35, 0.93]} rotation={[0.1, 0, Math.PI]}>
        <torusGeometry args={[0.15, 0.04, 16, 32, Math.PI]} />
        <meshStandardMaterial color="#e0f2fe" emissive="#0ea5e9" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>

      {/* 8. Earpieces (Left & Right Yellow/Blue Cylinders) */}
      <group position={[-1.0, -0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <cylinderGeometry args={[0.35, 0.35, 0.2, 64]} />
          <meshStandardMaterial color="#0284c7" metalness={0.3} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.1, 64]} />
          <meshStandardMaterial color="#facc15" metalness={0.2} roughness={0.4} />
        </mesh>
      </group>
      
      <group position={[1.0, -0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <cylinderGeometry args={[0.35, 0.35, 0.2, 64]} />
          <meshStandardMaterial color="#0284c7" metalness={0.3} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.1, 64]} />
          <meshStandardMaterial color="#facc15" metalness={0.2} roughness={0.4} />
        </mesh>
      </group>

      {/* 9. Antennae (Blue stalks + Yellow balls) */}
      <mesh position={[-1.08, 0.3, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.8, 16]} />
        <meshStandardMaterial color="#93c5fd" metalness={0.3} roughness={0.3} />
      </mesh>
      <mesh position={[-1.08, 0.7, 0]}>
        <sphereGeometry args={[0.1, 32, 32]} />
        <meshStandardMaterial color="#facc15" metalness={0.2} roughness={0.4} />
      </mesh>

      <mesh position={[1.08, 0.3, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.8, 16]} />
        <meshStandardMaterial color="#93c5fd" metalness={0.3} roughness={0.3} />
      </mesh>
      <mesh position={[1.08, 0.7, 0]}>
        <sphereGeometry args={[0.1, 32, 32]} />
        <meshStandardMaterial color="#facc15" metalness={0.2} roughness={0.4} />
      </mesh>

      {/* 10. Neck (Stack of dark cylinders) */}
      {[-0.9, -1.0, -1.1].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.08, 32]} />
          <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

const Interactive3DRobot = () => {
    return (
        <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }} style={{ pointerEvents: 'auto', background: 'transparent', width: '100%', height: '100%' }}>
          <ambientLight intensity={1.5} />
          <directionalLight position={[10, 10, 10]} intensity={2.5} />
          <directionalLight position={[-10, 10, 5]} intensity={1.5} />
          <pointLight position={[0, -10, 10]} intensity={1.2} />
          <Float speed={2.5} rotationIntensity={0.2} floatIntensity={0.8}>
            <RobotHead />
          </Float>
        </Canvas>
    )
}

type Message = {
  id: string;
  sender: "user" | "bot";
  text: string;
  image?: string;
};

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      sender: "bot",
      text: "Halo! Saya adalah Virtual Assistant 3D PLN... Ada yang bisa saya bantu hari ini? Atau mungkin, Anda ingin melaporkan sesuatu?",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  useEffect(() => {
    // Preload browser voices for optimal TTS selection
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const speakText = (text: string) => {
    if (!isSoundEnabled) return;
    
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel(); // Stop current speech
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = 1.0;
      utterance.pitch = 1.1; // Slightly higher pitch for a friendly AI character
      
      // Auto-select Indonesian voice if available
      const idVoice = voices.find(
        (v) => v.lang.includes("id") || v.name.toLowerCase().includes("indonesia")
      );
      
      if (idVoice) {
        utterance.voice = idVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendMessage = () => {
    if (!inputText.trim() && !selectedImage) return;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: inputText,
      image: selectedImage || undefined,
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputText("");
    setSelectedImage(null);

    // Simulate Bot Response
    setTimeout(() => {
      const responseText = "Pesan Anda telah diterima. Fitur ini masih dalam tahap demonstrasi antarmuka (UI). Integrasi backend akan segera dilakukan.";
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: responseText,
      };
      setMessages((prev) => [...prev, botResponse]);
      speakText(responseText);
    }, 1000);
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = "id-ID";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => prev + (prev ? " " : "") + transcript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } else {
      alert("Browser Anda tidak mendukung fitur input suara.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerReportErrorTemplate = () => {
    setInputText("Saya menemukan error pada halaman ini.");
  };

  return (
    <div className="fixed bottom-6 right-6 z-[99999] flex flex-col items-end font-sans">
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes shimmer {
            100% { transform: translateX(100%); }
          }
        `
      }} />

      {/* Chat Window */}
      <div
        className={`mb-4 overflow-hidden rounded-2xl border border-cyan-500/40 bg-slate-950/80 backdrop-blur-2xl shadow-[0_0_40px_rgba(6,182,212,0.2)] transition-all duration-400 origin-bottom-right flex flex-col relative before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] before:from-cyan-900/20 before:via-transparent before:to-transparent before:pointer-events-none ${
          isOpen
            ? "scale-100 opacity-100 h-[550px] w-[360px] sm:w-[420px]"
            : "scale-0 opacity-0 h-0 w-0"
        }`}
      >
        {/* Glow effect lines top/bottom */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-70"></div>
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-30"></div>

        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-cyan-500/20 bg-slate-900/60 p-4 overflow-hidden">
          <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent animate-[shimmer_3s_infinite]"></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-slate-800 to-slate-900 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.4)] group overflow-hidden">
              <Interactive3DRobot />
            </div>
            <div>
              <h3 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wide">Virtual Assistant</h3>
              <p className="text-[10px] uppercase font-mono tracking-widest text-cyan-500/70">Online & Ready</p>
            </div>
          </div>
          <div className="flex items-center gap-1 z-10">
            <button
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              className="rounded-full p-2 text-cyan-600 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors"
              title={isSoundEnabled ? "Matikan Suara" : "Nyalakan Suara"}
            >
              {isSoundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-2 text-cyan-600 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages Layout */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat">
          <div className="flex justify-center mb-6">
            <div className="px-4 py-1.5 bg-cyan-950/30 rounded-md text-[10px] font-mono uppercase tracking-widest text-cyan-400/80 border border-cyan-500/20 backdrop-blur-sm shadow-[0_0_10px_rgba(6,182,212,0.1)]">
              &gt;_ SECURE CONNECTION
            </div>
          </div>

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex w-full ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              } animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div
                className={`flex max-w-[85%] gap-3 ${
                  msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`mt-auto flex h-8 w-8 items-center justify-center flex-shrink-0 rounded-full border ${
                    msg.sender === "user"
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                      : "bg-slate-900 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.4)] overflow-hidden"
                  }`}
                >
                  {msg.sender === "user" ? <User size={14} /> : <Interactive3DRobot />}
                </div>

                <div
                  className={`flex flex-col gap-2 rounded-xl p-3.5 text-sm backdrop-blur-md relative overflow-hidden ${
                    msg.sender === "user"
                      ? "rounded-br-sm bg-blue-900/40 text-blue-50 border border-blue-500/30"
                      : "rounded-bl-sm bg-slate-800/60 text-cyan-50 border border-cyan-500/20"
                  }`}
                >
                  <div className={`absolute inset-0 opacity-20 pointer-events-none ${
                    msg.sender === "user" ? "bg-gradient-to-br from-blue-400 to-transparent" : "bg-gradient-to-br from-cyan-400 to-transparent"
                  }`}></div>

                  {msg.image && (
                    <img
                      src={msg.image}
                      alt="Uploaded attachment"
                      className="rounded-lg object-cover w-full max-h-48 border border-white/10 relative z-10"
                    />
                  )}
                  {msg.text && <p className="leading-relaxed whitespace-pre-wrap relative z-10">{msg.text}</p>}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Action Chips */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={triggerReportErrorTemplate}
            className="whitespace-nowrap flex items-center gap-1.5 rounded-md border border-red-500/40 bg-red-950/40 px-3 py-1.5 text-[11px] font-mono text-red-400 hover:bg-red-900/60 hover:text-red-300 transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
          >
            <AlertTriangle size={12} />
            REPORT_ISSUE
          </button>
        </div>

        {/* Input Area */}
        <div className="border-t border-cyan-500/30 bg-slate-900/80 p-3 flex flex-col gap-2 relative z-10">
          {selectedImage && (
            <div className="relative inline-block w-fit mb-1">
              <img
                src={selectedImage}
                alt="Preview"
                className="h-16 w-16 rounded-md object-cover border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -right-2 -top-2 rounded-full bg-red-500/80 p-1 text-white hover:bg-red-500 border border-red-400 backdrop-blur-sm transition-colors"
              >
                <X size={10} />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 relative">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-cyan-600 hover:text-cyan-300 rounded-lg hover:bg-cyan-500/10 transition-colors border border-transparent hover:border-cyan-500/20"
              title="Upload Foto/Screenshot"
            >
              <Paperclip size={18} />
            </button>
            <button
              onClick={toggleListening}
              className={`p-2 rounded-lg transition-all border border-transparent ${
                isListening
                  ? "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                  : "text-cyan-600 hover:text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-500/20"
              }`}
              title="Input Suara (Diktek)"
            >
              <Mic size={18} />
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                }}
                placeholder={isListening ? "Mendengarkan..." : "Initialize query..."}
                className="w-full bg-slate-950/50 border border-cyan-500/30 rounded-lg pl-4 pr-10 py-2.5 text-sm text-cyan-100 placeholder-cyan-700/50 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all font-mono"
              />
              <div className={`absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-4 bg-cyan-500/50 ${isListening ? "animate-bounce" : "animate-pulse"}`}></div>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() && !selectedImage}
              className="p-2 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30 disabled:opacity-30 disabled:hover:bg-cyan-600/20 transition-all hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95"
            >
              <Send size={18} className={`${inputText.trim() || selectedImage ? "translate-x-0.5 -translate-y-0.5 transition-transform" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative group flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-900 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:shadow-[0_0_35px_rgba(6,182,212,0.9)] transition-all duration-300 hover:-translate-y-1 hover:scale-110 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="absolute inset-[-2px] bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 opacity-20 blur-md group-hover:opacity-40 animate-pulse"></div>
        
        {/* Corner accents */}
        <span className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400 transition-all group-hover:w-3 group-hover:h-3"></span>
        <span className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-400 transition-all group-hover:w-3 group-hover:h-3"></span>
        <span className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyan-400 transition-all group-hover:w-3 group-hover:h-3"></span>
        <span className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-400 transition-all group-hover:w-3 group-hover:h-3"></span>

        <div className="relative z-10 transition-transform duration-300 w-full h-full p-0.5 pointer-events-none">
          {isOpen ? (
            <div className="w-full h-full flex items-center justify-center bg-transparent rounded-xl">
              <X size={32} className="text-red-400" />
            </div>
          ) : (
             <Interactive3DRobot />
          )}
        </div>
      </button>
    </div>
  );
}
