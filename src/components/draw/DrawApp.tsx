"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Brush,
  Circle,
  Eraser,
  FileImage,
  FilePlus2,
  FolderOpen,
  ImageDown,
  Minus,
  Moon,
  MoveUpRight,
  PaintBucket,
  Pipette,
  Redo2,
  Save,
  Square,
  Sun,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";

const W = 1600;
const H = 1000;

const PALETTE = [
  "#000000",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#facc15",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#92400e",
  "#6b7280",
  "#0f172a",
];

type Tool =
  | "brush"
  | "eraser"
  | "line"
  | "arrow"
  | "rect"
  | "ellipse"
  | "fill"
  | "text"
  | "picker";

interface ProjectFile {
  app: "vortex-draw";
  version: 1;
  width: number;
  height: number;
  bg: "white" | "dark";
  dataUrl: string;
}

interface Pt {
  x: number;
  y: number;
}

const TOOLS: {
  id: Tool;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  key: string;
}[] = [
  { id: "brush", label: "Pincel", icon: Brush, key: "B" },
  { id: "eraser", label: "Borrador", icon: Eraser, key: "E" },
  { id: "line", label: "Línea", icon: Minus, key: "L" },
  { id: "arrow", label: "Flecha", icon: MoveUpRight, key: "A" },
  { id: "rect", label: "Rectángulo", icon: Square, key: "R" },
  { id: "ellipse", label: "Elipse", icon: Circle, key: "O" },
  { id: "fill", label: "Relleno", icon: PaintBucket, key: "G" },
  { id: "text", label: "Texto", icon: Type, key: "T" },
  { id: "picker", label: "Cuentagotas", icon: Pipette, key: "I" },
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0"))
      .join("")
  );
}

function download(url: string, name: string, mime: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.type = mime;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function SwirlLogo() {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="10" fill="#161616" />
      <circle cx="24" cy="24" r="17" fill="none" stroke="#ec4899" strokeWidth="3.5" />
      <path
        d="M24 10a14 14 0 1 1-9.9 4.1"
        fill="none"
        stroke="#f472b6"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M24 17a7 7 0 1 0 7 7"
        fill="none"
        stroke="#f472b6"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="24" cy="24" r="3" fill="#f472b6" />
    </svg>
  );
}

function Btn({
  onClick,
  icon: Icon,
  label,
  disabled,
  danger,
  short,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  short?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
        danger
          ? "border-red-900/60 text-red-300 hover:bg-red-950/40"
          : "border-[#2b2b31] bg-[#1e1e22] text-[#ececf1] hover:border-[#3a3a42] hover:bg-[#26262b]"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      <Icon size={15} />
      <span className={short ? "hidden sm:inline" : ""}>{label}</span>
    </button>
  );
}

export default function DrawApp() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const drawing = useRef(false);
  const startPt = useRef<Pt | null>(null);
  const lastPt = useRef<Pt | null>(null);

  const [tool, setTool] = useState<Tool>("brush");
  const [color, setColor] = useState("#ec4899");
  const [size, setSize] = useState(8);
  const [opacity, setOpacity] = useState(1);
  const [bg, setBg] = useState<"white" | "dark">("white");
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [textPos, setTextPos] = useState<Pt | null>(null);
  const [textValue, setTextValue] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const getCtx = () => canvasRef.current!.getContext("2d")!;
  const getPrevCtx = () => previewRef.current!.getContext("2d")!;

  const pushHistory = useCallback(() => {
    const url = canvasRef.current?.toDataURL();
    if (!url) return;
    setUndoStack((s) => [...s.slice(-29), url]);
    setRedoStack([]);
  }, []);

  const restore = useCallback((url: string) => {
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = url;
  }, []);

  const doUndo = () => {
    if (!undoStack.length) return;
    const pre = undoStack[undoStack.length - 1];
    const cur = canvasRef.current?.toDataURL();
    if (cur) setRedoStack((r) => [...r.slice(-29), cur]);
    setUndoStack((s) => s.slice(0, -1));
    restore(pre);
  };

  const doRedo = () => {
    if (!redoStack.length) return;
    const nxt = redoStack[redoStack.length - 1];
    const cur = canvasRef.current?.toDataURL();
    if (cur) setUndoStack((s) => [...s.slice(-29), cur]);
    setRedoStack((r) => r.slice(0, -1));
    restore(nxt);
  };

  const toCanvas = (e: React.PointerEvent): Pt => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * W) / r.width,
      y: ((e.clientY - r.top) * H) / r.height,
    };
  };

  const paintShape = (ctx: CanvasRenderingContext2D, s: Pt, p: Pt) => {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    if (tool === "line") {
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    } else if (tool === "arrow") {
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      const ang = Math.atan2(p.y - s.y, p.x - s.x);
      const hl = Math.max(10, size * 3);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - hl * Math.cos(ang - Math.PI / 7), p.y - hl * Math.sin(ang - Math.PI / 7));
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - hl * Math.cos(ang + Math.PI / 7), p.y - hl * Math.sin(ang + Math.PI / 7));
      ctx.stroke();
    } else if (tool === "rect") {
      ctx.strokeRect(
        Math.min(s.x, p.x),
        Math.min(s.y, p.y),
        Math.abs(p.x - s.x),
        Math.abs(p.y - s.y)
      );
    } else if (tool === "ellipse") {
      ctx.ellipse(
        (s.x + p.x) / 2,
        (s.y + p.y) / 2,
        Math.abs(p.x - s.x) / 2,
        Math.abs(p.y - s.y) / 2,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
    ctx.restore();
  };

  const strokeDot = (p: Pt) => {
    const ctx = getCtx();
    ctx.save();
    ctx.globalAlpha = opacity;
    if (tool === "eraser") ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const strokeTo = (p: Pt) => {
    const ctx = getCtx();
    ctx.save();
    ctx.globalAlpha = opacity;
    if (tool === "eraser") ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPt.current!.x, lastPt.current!.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.restore();
    lastPt.current = p;
  };

  const floodFill = (sx: number, sy: number) => {
    if (sx < 0 || sy < 0 || sx >= W || sy >= H) return;
    const ctx = getCtx();
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    const i0 = (sy * W + sx) * 4;
    const tr = d[i0];
    const tg = d[i0 + 1];
    const tb = d[i0 + 2];
    const ta = d[i0 + 3];
    const [fr, fg, fb] = hexToRgb(color);
    const fa = Math.round(opacity * 255);
    if (fr === tr && fg === tg && fb === tb && fa === ta) return;
    const tol = 40;
    const visited = new Uint8Array(W * H);
    const stack: number[] = [sy * W + sx];
    while (stack.length) {
      const pi = stack.pop()!;
      if (visited[pi]) continue;
      const i = pi * 4;
      const dr = d[i] - tr;
      const dg = d[i + 1] - tg;
      const db = d[i + 2] - tb;
      const da = d[i + 3] - ta;
      if (dr * dr + dg * dg + db * db + da * da > tol * tol * 4) continue;
      visited[pi] = 1;
      d[i] = fr;
      d[i + 1] = fg;
      d[i + 2] = fb;
      d[i + 3] = fa;
      const x = pi % W;
      const y = (pi / W) | 0;
      if (x > 0) stack.push(pi - 1);
      if (x < W - 1) stack.push(pi + 1);
      if (y > 0) stack.push(pi - W);
      if (y < H - 1) stack.push(pi + W);
    }
    ctx.putImageData(img, 0, 0);
    showToast("Relleno aplicado");
  };

  const pick = (x: number, y: number) => {
    const px = Math.round(Math.min(W - 1, Math.max(0, x)));
    const py = Math.round(Math.min(H - 1, Math.max(0, y)));
    const d = getCtx().getImageData(px, py, 1, 1).data;
    const hex =
      d[3] === 0 ? (bg === "white" ? "#ffffff" : "#101014") : rgbToHex(d[0], d[1], d[2]);
    setColor(hex);
    showToast("Color tomado: " + hex);
  };

  const drawImageFit = (img: HTMLImageElement) => {
    const ctx = getCtx();
    const r = Math.min(W / img.width, H / img.height);
    const dw = img.width * r;
    const dh = img.height * r;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  };

  const openFile = (f: File) => {
    const r = new FileReader();
    r.onload = () => {
      const res = String(r.result);
      if (f.type.startsWith("image/")) {
        const img = new Image();
        img.onload = () => {
          pushHistory();
          drawImageFit(img);
          showToast("Imagen añadida al lienzo");
        };
        img.src = res;
      } else {
        try {
          const pr = JSON.parse(res) as ProjectFile;
          if (pr?.app !== "vortex-draw" || typeof pr.dataUrl !== "string")
            throw new Error("bad");
          pushHistory();
          setBg(pr.bg === "dark" ? "dark" : "white");
          restore(pr.dataUrl);
          showToast("Proyecto cargado");
        } catch {
          showToast("Archivo de proyecto no válido");
        }
      }
    };
    r.readAsDataURL(f);
  };

  const saveProject = () => {
    const url = canvasRef.current?.toDataURL();
    if (!url) return;
    const data: ProjectFile = {
      app: "vortex-draw",
      version: 1,
      width: W,
      height: H,
      bg,
      dataUrl: url,
    };
    download(JSON.stringify(data, null, 2), "dibujo.vortex-draw.json", "application/json");
    showToast("Proyecto guardado (.vortex-draw.json)");
  };

  const exportImage = (kind: "png" | "jpg") => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = kind === "jpg" ? "#ffffff" : bg === "white" ? "#ffffff" : "#101014";
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(canvasRef.current!, 0, 0);
    download(
      c.toDataURL(kind === "jpg" ? "image/jpeg" : "image/png", 0.92),
      `vortex-draw.${kind}`,
      kind === "jpg" ? "image/jpeg" : "image/png"
    );
    showToast(`Exportado en ${kind.toUpperCase()}`);
  };

  const clearAll = () => {
    pushHistory();
    getCtx().clearRect(0, 0, W, H);
  };

  const newCanvas = () => {
    pushHistory();
    getCtx().clearRect(0, 0, W, H);
    setBg("white");
    showToast("Lienzo nuevo");
  };

  const commitText = () => {
    if (!textPos) return;
    if (textValue.trim()) {
      pushHistory();
      const ctx = getCtx();
      const fs = Math.max(12, size * 6);
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.font = `600 ${fs}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textBaseline = "top";
      ctx.fillText(textValue, textPos.x, textPos.y - fs / 2);
      ctx.restore();
    }
    setTextPos(null);
    setTextValue("");
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (textPos) return;
    const p = toCanvas(e);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    if (tool === "picker") {
      pick(p.x, p.y);
      return;
    }
    if (tool === "fill") {
      pushHistory();
      floodFill(Math.round(p.x), Math.round(p.y));
      return;
    }
    if (tool === "text") {
      setTextPos(p);
      setTextValue("");
      return;
    }
    pushHistory();
    drawing.current = true;
    startPt.current = p;
    lastPt.current = p;
    if (tool === "brush" || tool === "eraser") strokeDot(p);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const p = toCanvas(e);
    if (tool === "brush" || tool === "eraser") {
      strokeTo(p);
    } else if (startPt.current) {
      const pv = getPrevCtx();
      pv.clearRect(0, 0, W, H);
      paintShape(pv, startPt.current, p);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const p = toCanvas(e);
    if (tool !== "brush" && tool !== "eraser" && startPt.current) {
      paintShape(getCtx(), startPt.current, p);
      getPrevCtx().clearRect(0, 0, W, H);
    }
    drawing.current = false;
    startPt.current = null;
    lastPt.current = null;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && k === "z") {
        e.preventDefault();
        if (!typing) doUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (k === "y" || (e.shiftKey && k === "z"))) {
        e.preventDefault();
        if (!typing) doRedo();
        return;
      }
      if (typing) return;
      if (k === "escape" && textPos) {
        setTextPos(null);
        setTextValue("");
        return;
      }
      const map: Record<string, Tool> = {
        b: "brush",
        e: "eraser",
        l: "line",
        a: "arrow",
        r: "rect",
        o: "ellipse",
        g: "fill",
        t: "text",
        i: "picker",
      };
      if (map[k] && !e.ctrlKey && !e.metaKey && !e.altKey) setTool(map[k]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const activeTool = TOOLS.find((t) => t.id === tool);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Barra superior */}
      <header className="flex items-center gap-3 border-b border-[#2b2b31] bg-[#17171a] px-4 py-2.5">
        <SwirlLogo />
        <div className="mr-2">
          <div className="text-sm font-bold tracking-wide">Vórtex Draw</div>
          <div className="hidden text-[11px] text-[#9b9ba4] sm:block">
            Dibuja, sin límites · 100% local en tu navegador
          </div>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Btn onClick={newCanvas} icon={FilePlus2} label="Nuevo" short />
          <Btn
            onClick={() => fileRef.current?.click()}
            icon={FolderOpen}
            label="Abrir"
            short
          />
          <Btn onClick={saveProject} icon={Save} label="Proyecto" short />
          <Btn onClick={() => exportImage("png")} icon={ImageDown} label="PNG" short />
          <Btn onClick={() => exportImage("jpg")} icon={FileImage} label="JPG" short />
          <Btn onClick={doUndo} icon={Undo2} label="Deshacer" disabled={!undoStack.length} short />
          <Btn onClick={doRedo} icon={Redo2} label="Rehacer" disabled={!redoStack.length} short />
          <Btn onClick={clearAll} icon={Trash2} label="Limpiar" danger short />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".vortex-draw.json,application/json,image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) openFile(f);
            e.currentTarget.value = "";
          }}
        />
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Barra de herramientas */}
        <aside className="flex w-14 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-[#2b2b31] bg-[#17171a] py-2">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            const active = tool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                title={`${t.label} (${t.key})`}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border transition ${
                  active
                    ? "border-[#ec4899]/70 bg-[#ec4899]/15 text-[#f472b6]"
                    : "border-transparent text-[#9b9ba4] hover:bg-[#1e1e22] hover:text-[#ececf1]"
                }`}
              >
                <Icon size={19} />
              </button>
            );
          })}
        </aside>

        {/* Lienzo */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#121214] p-4">
            <div
              className={`relative touch-none select-none shadow-2xl ring-1 ${
                bg === "white" ? "bg-white ring-black/10" : "bg-[#101014] ring-white/10"
              }`}
              style={{
                aspectRatio: `${W} / ${H}`,
                width: "min(100%, calc((100dvh - 210px) * 1.6))",
                cursor: "crosshair",
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            >
              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                className="absolute inset-0 h-full w-full"
              />
              <canvas
                ref={previewRef}
                width={W}
                height={H}
                className="pointer-events-none absolute inset-0 h-full w-full"
              />
              {textPos && (
                <input
                  autoFocus
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitText();
                    if (e.key === "Escape") {
                      setTextPos(null);
                      setTextValue("");
                    }
                  }}
                  onBlur={commitText}
                  placeholder="Escribe y pulsa Enter"
                  className="absolute z-10 rounded-md border border-[#ec4899] bg-[#17171a] px-2 py-1 text-sm text-[#ececf1] outline-none"
                  style={{
                    left: `${(textPos.x / W) * 100}%`,
                    top: `${(textPos.y / H) * 100}%`,
                    transform: "translateY(-50%)",
                    minWidth: 160,
                    maxWidth: "60%",
                  }}
                />
              )}
            </div>
          </div>

          {/* Barra de opciones */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#2b2b31] bg-[#17171a] px-4 py-2.5">
            <span className="min-w-24 text-xs font-semibold text-[#f472b6]">
              {activeTool?.label ?? "—"}
            </span>
            <label className="flex items-center gap-2 text-xs text-[#9b9ba4]">
              Tamaño
              <input
                type="range"
                min={1}
                max={80}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="w-28"
              />
              <span className="w-6 tabular-nums text-[#ececf1]">{size}</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-[#9b9ba4]">
              Opacidad
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.05}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-28"
              />
              <span className="w-9 tabular-nums text-[#ececf1]">
                {Math.round(opacity * 100)}%
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                title="Color personalizado"
                className="h-7 w-9 rounded border border-[#2b2b31]"
              />
              <div className="flex flex-wrap gap-1">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    title={c}
                    className={`h-6 w-6 rounded-full border transition ${
                      color.toLowerCase() === c.toLowerCase()
                        ? "border-[#f472b6] ring-2 ring-[#ec4899]/40"
                        : "border-white/15 hover:border-white/40"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#9b9ba4]">
              Fondo
              <button
                onClick={() => setBg("white")}
                title="Fondo blanco"
                className={`flex h-7 w-7 items-center justify-center rounded-md border ${
                  bg === "white"
                    ? "border-[#ec4899]/70 bg-[#ec4899]/15 text-[#f472b6]"
                    : "border-[#2b2b31] text-[#9b9ba4] hover:bg-[#1e1e22]"
                }`}
              >
                <Sun size={14} />
              </button>
              <button
                onClick={() => setBg("dark")}
                title="Fondo oscuro"
                className={`flex h-7 w-7 items-center justify-center rounded-md border ${
                  bg === "dark"
                    ? "border-[#ec4899]/70 bg-[#ec4899]/15 text-[#f472b6]"
                    : "border-[#2b2b31] text-[#9b9ba4] hover:bg-[#1e1e22]"
                }`}
              >
                <Moon size={14} />
              </button>
            </div>
            <span className="ml-auto hidden text-[11px] text-[#6f6f78] lg:block">
              Atajos: B E L A R O G T I · Ctrl+Z deshacer · Ctrl+Y rehacer
            </span>
          </div>
        </main>
      </div>

      {/* Marca */}
      <footer className="border-t border-[#2b2b31] bg-[#0f0f10] px-4 py-1.5 text-center text-[11px] text-[#6f6f78]">
        Vórtex Draw · Derechos Reservados © 2026 Vortex Company · Soporte:
        vortexmusic.soporte.app@gmail.com · Gratis, sin anuncios
      </footer>

      {toast && (
        <div className="fixed bottom-10 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[#2b2b31] bg-[#1e1e22] px-4 py-1.5 text-xs text-[#ececf1] shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
