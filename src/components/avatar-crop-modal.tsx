"use client";

import { useEffect, useRef, useState } from "react";

const VIEWPORT = 260;
const OUTPUT_SIZE = 512;
const MAX_ZOOM = 3;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

// A minimal pan/zoom crop dialog: drag to reposition, slider to zoom, a
// circular mask previews exactly what will end up in the profile picture
// (and the passport photo, which uses the same square source image). No
// cropping library -- just canvas math -- since the transform from
// viewport space to the source image's natural pixels is simple enough
// to do by hand: everything visible inside the VIEWPORT-sized box is the
// crop, so the source rectangle is a direct inverse of the current
// offset/scale.
export default function AvatarCropModal({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number } | null>(
    null,
  );

  // Object URL creation and revocation must be paired within the same
  // effect invocation, not split across a useMemo (create) and a
  // separately-keyed cleanup effect (revoke) -- Strict Mode's dev-only
  // mount -> cleanup -> mount double-invoke would then revoke the blob
  // right as the <img> below is decoding it, leaving a permanently
  // broken image (naturalWidth stuck at 0) instead of a benign
  // no-op double-create.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizing with the browser's object-URL registry, not deriving state from props
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!imgUrl) return null;

  const baseScale = natural ? Math.max(VIEWPORT / natural.w, VIEWPORT / natural.h) : 1;
  const scale = baseScale * zoom;
  const displayW = (natural?.w ?? VIEWPORT) * scale;
  const displayH = (natural?.h ?? VIEWPORT) * scale;

  function clampOffset(x: number, y: number, w: number, h: number) {
    const minX = VIEWPORT - w;
    const minY = VIEWPORT - h;
    return { x: clamp(x, minX, 0), y: clamp(y, minY, 0) };
  }

  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const w = e.currentTarget.naturalWidth;
    const h = e.currentTarget.naturalHeight;
    setNatural({ w, h });
    const base = Math.max(VIEWPORT / w, VIEWPORT / h);
    setOffset({ x: (VIEWPORT - w * base) / 2, y: (VIEWPORT - h * base) / 2 });
  }

  function handleZoomChange(next: number) {
    setZoom(next);
    if (!natural) return;
    const nextScale = baseScale * next;
    const w = natural.w * nextScale;
    const h = natural.h * nextScale;
    // Keep the crop centered on the same point as the zoom changes rather
    // than anchoring to the image's top-left corner.
    const cx = offset.x + displayW / 2;
    const cy = offset.y + displayH / 2;
    setOffset(clampOffset(cx - w / 2, cy - h / 2, w, h));
  }

  function onPointerDown(e: React.PointerEvent) {
    dragState.current = { startX: e.clientX, startY: e.clientY, offsetX: offset.x, offsetY: offset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragState.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    setOffset(clampOffset(drag.offsetX + dx, drag.offsetY + dy, displayW, displayH));
  }

  function onPointerUp() {
    dragState.current = null;
  }

  function handleConfirm() {
    if (!natural || !imgUrl) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new window.Image();
    img.onload = () => {
      const sx = -offset.x / scale;
      const sy = -offset.y / scale;
      const sSize = VIEWPORT / scale;
      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      canvas.toBlob(
        (blob) => {
          if (blob) onConfirm(blob);
        },
        "image/jpeg",
        0.92,
      );
    };
    img.src = imgUrl;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl bg-background p-5 shadow-xl">
        <p className="self-start text-sm font-medium">Drag to reposition, zoom to fit</p>
        <div
          className="relative overflow-hidden rounded-full border border-black/10 dark:border-white/20"
          style={{ width: VIEWPORT, height: VIEWPORT, touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- live crop preview needs a plain img, not next/image's layout pipeline */}
          <img
            src={imgUrl}
            alt=""
            onLoad={handleImageLoad}
            draggable={false}
            className="absolute max-w-none cursor-grab select-none active:cursor-grabbing"
            style={{
              left: offset.x,
              top: offset.y,
              width: displayW || undefined,
              height: displayH || undefined,
            }}
          />
        </div>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => handleZoomChange(Number(e.target.value))}
          className="w-full"
          aria-label="Zoom"
        />
        <div className="flex w-full gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-black/10 px-4 py-2 text-sm dark:border-white/20"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!natural}
            className="flex-1 rounded-xl bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
          >
            Use photo
          </button>
        </div>
      </div>
    </div>
  );
}
