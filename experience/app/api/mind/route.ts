/**
 * KUDOS Mind · endpoint API para preguntar a Claude sobre un POI.
 *
 * POST /api/mind
 *   body: { poi: { id, name, country }, question, context?: string }
 *   resp: { answer: string }  o  { error: string }
 *
 * Requiere variable de entorno ANTHROPIC_API_KEY (server-side, NUNCA NEXT_PUBLIC_*).
 * En Render: Settings → Environment → Add ANTHROPIC_API_KEY = sk-ant-...
 */

import { NextRequest, NextResponse } from "next/server";

// Edge no soporta el SDK clásico; usamos fetch directo
export const runtime = "nodejs";


interface MindRequest {
  poi: { id: string; name: string; country?: string };
  question: string;
  context?: string;
}


export async function POST(req: NextRequest) {
  let body: MindRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido en la petición." }, { status: 400 });
  }

  const { poi, question, context } = body ?? {};
  if (!poi?.name || !question?.trim()) {
    return NextResponse.json({ error: "Falta poi.name o question." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      error: "KUDOS Mind no está configurado. Para activarlo: añade ANTHROPIC_API_KEY en Render → Settings → Environment.",
    }, { status: 503 });
  }

  const system = [
    "Eres KUDOS Mind, un asistente cultural que ayuda a entender lugares del mundo.",
    "Respondes en español, en 2-4 frases evocadoras y precisas, con tono cinematográfico tipo documental.",
    "Si no estás seguro de un dato, dilo brevemente. Nunca inventes fechas o cifras concretas.",
    "Cierra siempre con una pregunta que invite a seguir explorando.",
  ].join(" ");

  const userText = [
    `Lugar: ${poi.name}${poi.country ? ` (${poi.country})` : ""}`,
    context ? `Contexto conocido: ${context.slice(0, 600)}` : "",
    `Pregunta del usuario: ${question.trim()}`,
  ].filter(Boolean).join("\n\n");

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system,
        messages: [{ role: "user", content: userText }],
      }),
    });

    if (!r.ok) {
      const text = await r.text();
      console.error("[mind] anthropic error", r.status, text);
      return NextResponse.json({
        error: `Anthropic respondió HTTP ${r.status}. ${text.slice(0, 200)}`,
      }, { status: 502 });
    }

    const data = await r.json();
    const blocks = Array.isArray(data?.content) ? data.content : [];
    const answer = blocks
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n")
      .trim();

    if (!answer) {
      return NextResponse.json({ error: "Respuesta vacía de Anthropic." }, { status: 502 });
    }

    return NextResponse.json({ answer });
  } catch (e) {
    console.error("[mind] fetch error", e);
    return NextResponse.json({
      error: `Error de red contactando Anthropic: ${String(e)}`,
    }, { status: 500 });
  }
}
