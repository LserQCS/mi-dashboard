/**
 * IAAnalysis — Componente de análisis con Claude IA.
 * Muestra un botón que al presionarlo hace streaming del análisis.
 *
 * Props:
 *   panel  : "disponibilidad" | "operacional"
 *   datos  : objeto con los datos del dashboard para el prompt
 *   label  : texto del botón (opcional)
 */
import { useState, useRef, useCallback } from "react";

// ── Paleta compartida ──────────────────────────────────────────────────────────
const BLUE   = "#3b82f6";
const GREEN  = "#22c55e";
const RED    = "#ef4444";
const YELLOW = "#eab308";
const MUTED  = "#94a3b8";
const BORDER = "#334155";
const SURFACE = "#1e293b";
const BG      = "#0f172a";

// ── Mini markdown renderer ─────────────────────────────────────────────────────
function renderMd(text) {
  const lines = text.split("\n");
  const out   = [];
  let key     = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // H2: ## Título
    if (line.startsWith("## ")) {
      out.push(
        <div key={key++} style={{
          fontSize: "0.92rem", fontWeight: 700, color: "#e2e8f0",
          margin: i === 0 ? "0 0 10px" : "20px 0 8px",
          paddingBottom: 6, borderBottom: `1px solid ${BORDER}`,
          letterSpacing: "0.01em",
        }}>
          {inlineMd(line.slice(3))}
        </div>
      );
      continue;
    }

    // H3: ### Título
    if (line.startsWith("### ")) {
      out.push(
        <div key={key++} style={{ fontSize: "0.82rem", fontWeight: 700, color: MUTED, margin: "14px 0 5px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {line.slice(4)}
        </div>
      );
      continue;
    }

    // Bullet: - item o * item
    if (/^[-*] /.test(line)) {
      out.push(
        <div key={key++} style={{ display: "flex", gap: 8, marginBottom: 5, paddingLeft: 4 }}>
          <span style={{ color: BLUE, fontWeight: 700, marginTop: 1, flexShrink: 0 }}>›</span>
          <span style={{ color: "#cbd5e1", fontSize: "0.82rem", lineHeight: 1.55 }}>{inlineMd(line.slice(2))}</span>
        </div>
      );
      continue;
    }

    // Línea numerada: 1. item
    if (/^\d+\. /.test(line)) {
      const num = line.match(/^(\d+)\. /)[1];
      out.push(
        <div key={key++} style={{ display: "flex", gap: 8, marginBottom: 6, paddingLeft: 4 }}>
          <span style={{ color: BLUE, fontWeight: 700, minWidth: 18, fontSize: "0.82rem" }}>{num}.</span>
          <span style={{ color: "#cbd5e1", fontSize: "0.82rem", lineHeight: 1.55 }}>{inlineMd(line.slice(num.length + 2))}</span>
        </div>
      );
      continue;
    }

    // Línea vacía
    if (line.trim() === "") {
      out.push(<div key={key++} style={{ height: 4 }} />);
      continue;
    }

    // Párrafo normal
    out.push(
      <p key={key++} style={{ color: "#cbd5e1", fontSize: "0.82rem", lineHeight: 1.65, margin: "0 0 8px" }}>
        {inlineMd(line)}
      </p>
    );
  }

  return out;
}

// Inline: **bold** y `code`
function inlineMd(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={i} style={{ color: "#f1f5f9", fontWeight: 700 }}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`"))
      return <code key={i} style={{ background: "#0f172a", color: YELLOW, padding: "1px 5px", borderRadius: 4, fontSize: "0.78rem", fontFamily: "monospace" }}>{p.slice(1, -1)}</code>;
    return p;
  });
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function IAAnalysis({ panel = "disponibilidad", datos = {}, label }) {
  const [open,    setOpen]    = useState(false);
  const [text,    setText]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [ts,      setTs]      = useState(null);   // timestamp del último análisis
  const abortRef = useRef(null);

  const analizar = useCallback(async () => {
    // Cancelar análisis anterior si está corriendo
    abortRef.current?.abort();

    setLoading(true);
    setText("");
    setError(null);
    setOpen(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ClaudeAnalysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panel, datos }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? res.statusText);
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const payload = part.slice(6).trim();
          if (payload === "[DONE]") { setLoading(false); setTs(new Date()); return; }
          try {
            const { text: chunk, error: sseErr } = JSON.parse(payload);
            if (sseErr) throw new Error(sseErr);
            if (chunk)  setText((prev) => prev + chunk);
          } catch (parseErr) {
            // ignorar líneas mal formadas
          }
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message);
    }

    setLoading(false);
    setTs(new Date());
  }, [panel, datos]);

  const cancelar = () => {
    abortRef.current?.abort();
    setLoading(false);
  };

  const copiar = () => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const cerrar = () => {
    setOpen(false);
    setTs(null);
  };

  // ── Estilos ──────────────────────────────────────────────────────────────────
  const btnBase = {
    display: "inline-flex", alignItems: "center", gap: 7,
    padding: "7px 16px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600,
    cursor: loading ? "wait" : "pointer", transition: "all 0.15s",
    border: "none", outline: "none",
  };

  const btnPrimary = {
    ...btnBase,
    background: loading
      ? "linear-gradient(135deg, #1e40af, #312e81)"
      : "linear-gradient(135deg, #2563eb, #7c3aed)",
    color: "#fff",
    boxShadow: loading ? "none" : "0 0 16px rgba(99,102,241,0.35)",
  };

  const btnSecondary = {
    ...btnBase,
    background: "transparent",
    border: `1px solid ${BORDER}`,
    color: MUTED,
    fontSize: "0.74rem",
    padding: "4px 10px",
  };

  // Dots animados para el estado "generando"
  const dots = loading && text ? "…" : "";

  return (
    <div style={{ marginBottom: "1.25rem" }}>

      {/* ── Botón principal ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button style={btnPrimary} onClick={loading ? cancelar : analizar} disabled={false}>
          {loading ? (
            <>
              <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "ia-spin 0.8s linear infinite" }} />
              Analizando… (cancelar)
            </>
          ) : (
            <>
              <span style={{ fontSize: "1rem" }}>✦</span>
              {label ?? (open && text ? "Regenerar análisis IA" : "Analizar con IA")}
            </>
          )}
        </button>

        {open && text && !loading && (
          <>
            <button style={btnSecondary} onClick={copiar}>📋 Copiar</button>
            <button style={btnSecondary} onClick={cerrar}>✕ Cerrar</button>
            {ts && (
              <span style={{ color: MUTED, fontSize: "0.7rem" }}>
                Generado {ts.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </>
        )}
      </div>

      {/* ── Panel de análisis ───────────────────────────────────────────────── */}
      {open && (
        <div style={{
          marginTop: 12,
          background: BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 16px",
            background: "linear-gradient(90deg, rgba(37,99,235,0.15), rgba(124,58,237,0.15))",
            borderBottom: `1px solid ${BORDER}`,
          }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#a5b4fc" }}>✦ Claude IA</span>
            <span style={{ fontSize: "0.72rem", color: MUTED }}>
              — Análisis de {panel === "operacional" ? "Productividad Operacional" : "Disponibilidad de Drivers"}
            </span>
            {loading && (
              <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "#818cf8" }}>
                {text.length > 0 ? `${text.split(" ").length} palabras…` : "Conectando…"}
              </span>
            )}
          </div>

          {/* Contenido */}
          <div style={{ padding: "16px 20px", minHeight: 60 }}>
            {!text && loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: MUTED, fontSize: "0.8rem" }}>
                <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(129,140,248,0.3)", borderTopColor: "#818cf8", borderRadius: "50%", animation: "ia-spin 0.8s linear infinite" }} />
                Procesando datos del dashboard…
              </div>
            )}
            {error && (
              <div style={{ color: RED, fontSize: "0.8rem", padding: "8px 12px", background: "rgba(239,68,68,0.08)", borderRadius: 8, border: `1px solid rgba(239,68,68,0.2)` }}>
                <strong>Error:</strong> {error}
                {error.includes("ANTHROPIC_API_KEY") && (
                  <div style={{ marginTop: 6, color: YELLOW, fontSize: "0.75rem" }}>
                    → Agrega <code style={{ background: "#1e293b", padding: "1px 5px", borderRadius: 3 }}>ANTHROPIC_API_KEY</code> en Vercel → Settings → Environment Variables
                  </div>
                )}
              </div>
            )}
            {text && (
              <div style={{ lineHeight: 1.6 }}>
                {renderMd(text)}
                {loading && (
                  <span style={{ display: "inline-block", width: 8, height: 14, background: "#818cf8", borderRadius: 2, animation: "ia-blink 0.9s ease-in-out infinite", verticalAlign: "text-bottom", marginLeft: 2 }} />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes ia-spin  { to { transform: rotate(360deg); } }
        @keyframes ia-blink { 0%,100% { opacity:1; } 50% { opacity:0; } }
      `}</style>
    </div>
  );
}
