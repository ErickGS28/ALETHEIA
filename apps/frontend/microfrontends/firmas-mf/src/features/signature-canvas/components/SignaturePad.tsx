'use client';

import { Button } from '@aletheia/frontend-commons';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface SignaturePadHandle {
  /** Limpia el lienzo. */
  clear: () => void;
  /** Devuelve el contenido como dataURL base64, o null si está vacío. */
  toDataURL: () => string | null;
  /** Indica si hay algún trazo dibujado. */
  isEmpty: () => boolean;
}

interface SignaturePadProps {
  /** Notifica si el lienzo tiene algún trazo (para habilitar "Guardar"). */
  onDirtyChange?: (hasDrawing: boolean) => void;
  /** Recibe la API imperativa del lienzo (o null al desmontar). */
  padRef?: (handle: SignaturePadHandle | null) => void;
}

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 220;

/**
 * Lienzo de firma interactivo. Usa pointer events para soportar mouse y touch.
 * El ref del canvas se gestiona localmente; el componente expone una API
 * imperativa (clear / toDataURL / isEmpty) vía callback `ref` del padre.
 */
export function SignaturePad({ onDirtyChange, padRef }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const dirtyRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawing, setHasDrawing] = useState(false);

  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  const resetCanvasStyle = useCallback(() => {
    const ctx = getContext();
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000000';
  }, [getContext]);

  // Inicializa el lienzo con fondo blanco (necesario para un PNG legible).
  useEffect(() => {
    const ctx = getContext();
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    resetCanvasStyle();
  }, [getContext, resetCanvasStyle]);

  const pointFromEvent = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    // Escala las coordenadas del puntero al tamaño interno del canvas.
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const ctx = getContext();
      if (!ctx) return;
      canvasRef.current?.setPointerCapture(e.pointerId);
      drawingRef.current = true;
      const point = pointFromEvent(e);
      lastPointRef.current = point;
      // Dibuja un punto inicial para taps sin movimiento.
      ctx.beginPath();
      ctx.arc(point.x, point.y, 1.25, 0, Math.PI * 2);
      ctx.fill();
    },
    [getContext, pointFromEvent],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      e.preventDefault();
      const ctx = getContext();
      if (!ctx) return;
      const point = pointFromEvent(e);
      const last = lastPointRef.current ?? point;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      lastPointRef.current = point;
      if (!dirtyRef.current) {
        dirtyRef.current = true;
        setHasDrawing(true);
        onDirtyChange?.(true);
      }
    },
    [getContext, pointFromEvent, onDirtyChange],
  );

  const endStroke = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    canvasRef.current?.releasePointerCapture(e.pointerId);
  }, []);

  const clear = useCallback(() => {
    const ctx = getContext();
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    resetCanvasStyle();
    dirtyRef.current = false;
    setHasDrawing(false);
    onDirtyChange?.(false);
  }, [getContext, resetCanvasStyle, onDirtyChange]);

  // Expone la API imperativa al padre.
  useEffect(() => {
    if (!padRef) return;
    const handle: SignaturePadHandle = {
      clear,
      isEmpty: () => !dirtyRef.current,
      toDataURL: () => {
        if (!dirtyRef.current) return null;
        return canvasRef.current?.toDataURL('image/png') ?? null;
      },
    };
    padRef(handle);
    return () => padRef(null);
  }, [padRef, clear]);

  return (
    <div className="space-y-3">
      <div className="rounded-base border-2 border-border bg-background shadow-shadow overflow-hidden">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
          onPointerCancel={endStroke}
          className="block w-full touch-none cursor-crosshair bg-background"
          style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="font-sans text-xs text-foreground/50">
          {hasDrawing ? 'Trazo capturado' : 'Dibuja tu firma en el recuadro'}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={clear} disabled={!hasDrawing}>
          Limpiar
        </Button>
      </div>
    </div>
  );
}
