import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get("text");

    if (!text) {
      return new NextResponse("Missing text parameter", { status: 400 });
    }

    // Mengambil hingga 200 karakter pertama agar request tidak gagal di sisi Google
    const safeText = encodeURIComponent(text.substring(0, 200));
    
    // Fitur Rahasia: Menggunakan Google Translate TTS endpoint untuk mendapatkan mp3 murni
    const targetUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${safeText}&tl=id&client=tw-ob`;

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        // Menyamarkan request
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://translate.google.com/"
      }
    });

    if (!response.ok) {
      return new NextResponse("Gagal mengambil audio TTS dari provider", { status: response.status });
    }

    // Mengubah stream response menjadi array buffer blob untuk di-proxy ke client
    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400"
      }
    });

  } catch (error) {
    console.error("TTS API Proxy Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
