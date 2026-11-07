import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Copy,
  Layers,
  PenTool,
  Maximize2,
  Type,
  Bold,
  EyeOff,
  Sun,
  Moon,
} from 'lucide-react';
import {
  DetectedPdfTextItem,
  PageItem,
  PdfSourceFile,
  PdfTextAnnotation,
  PlacedSignature,
  SignatureAsset,
} from '../types/pdf';
import { extractPageTextItems, renderPdfPageToCanvas } from '../utils/pdfEngine';

interface PdfCanvasStageProps {
  activePage: PageItem | null;
  pageIndex: number;
  totalPages: number;
  sources: Map<string, PdfSourceFile>;
  placedSignatures: PlacedSignature[];
  signatureAssets: SignatureAsset[];
  selectedPlacedId: string | null;
  activeSignatureAssetId: string | null;
  isDark: boolean;
  onToggleTheme: (dark: boolean) => void;
  onSelectPlaced: (id: string | null) => void;
  onUpdatePlaced: (id: string, patch: Partial<PlacedSignature>) => void;
  onDeletePlaced: (id: string) => void;
  onDuplicatePlaced: (id: string) => void;
  onApplyPlacedToAllPages: (id: string) => void;
  onPlaceActiveSignatureAt: (xRatio?: number, yRatio?: number) => void;
  // Text editing props
  isTextEditMode: boolean;
  onToggleTextEditMode: (enabled: boolean) => void;
  textAnnotations: PdfTextAnnotation[];
  selectedTextId: string | null;
  onSelectTextAnnotation: (id: string | null) => void;
  onCreateTextFromDetected: (detected: DetectedPdfTextItem) => void;
  onCreateFreeTextAt: (xRatio?: number, yRatio?: number) => void;
  onUpdateTextAnnotation: (id: string, patch: Partial<PdfTextAnnotation>) => void;
  onDeleteTextAnnotation: (id: string) => void;
  // Page navigation & rotation
  onRotateActivePage: (delta: 90 | -90) => void;
  onNavigatePage: (delta: -1 | 1) => void;
  onDropFilesOnCanvas: (files: FileList) => void;
}

type DragInteraction =
  | {
      type: 'move-sig';
      placedId: string;
      startX: number;
      startY: number;
      initialXRatio: number;
      initialYRatio: number;
      widthRatio: number;
      heightRatio: number;
    }
  | {
      type: 'resize-sig';
      placedId: string;
      handle: 'nw' | 'ne' | 'sw' | 'se';
      startX: number;
      startY: number;
      initialXRatio: number;
      initialYRatio: number;
      initialW: number;
      initialH: number;
      aspectRatio: number;
    }
  | {
      type: 'move-text';
      textId: string;
      startX: number;
      startY: number;
      initialXRatio: number;
      initialYRatio: number;
      widthRatio: number;
      heightRatio: number;
    }
  | {
      type: 'resize-text';
      textId: string;
      startX: number;
      startY: number;
      initialW: number;
      initialH: number;
      xRatio: number;
      yRatio: number;
    };

export const PdfCanvasStage: React.FC<PdfCanvasStageProps> = ({
  activePage,
  pageIndex,
  totalPages,
  sources,
  placedSignatures,
  signatureAssets,
  selectedPlacedId,
  activeSignatureAssetId,
  isDark,
  onToggleTheme,
  onSelectPlaced,
  onUpdatePlaced,
  onDeletePlaced,
  onDuplicatePlaced,
  onApplyPlacedToAllPages,
  onPlaceActiveSignatureAt,
  isTextEditMode,
  onToggleTextEditMode,
  textAnnotations,
  selectedTextId,
  onSelectTextAnnotation,
  onCreateTextFromDetected,
  onCreateFreeTextAt,
  onUpdateTextAnnotation,
  onDeleteTextAnnotation,
  onRotateActivePage,
  onNavigatePage,
  onDropFilesOnCanvas,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageOverlayRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState<number>(1.05);
  const [canvasCssSize, setCanvasCssSize] = useState<{ width: number; height: number }>({
    width: 620,
    height: 877,
  });
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [interaction, setInteraction] = useState<DragInteraction | null>(null);
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true);
  const [detectedTextItems, setDetectedTextItems] = useState<DetectedPdfTextItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function renderCurrentPage() {
      if (!activePage || !canvasRef.current) return;
      const src = sources.get(activePage.sourcePdfId);
      if (!src) return;

      setIsRendering(true);
      try {
        const totalRotation =
          (((activePage.baseRotation + activePage.addedRotation) % 360) + 360) % 360;
        const { cssWidth, cssHeight } = await renderPdfPageToCanvas(
          src.data,
          activePage.originalPageIndex,
          totalRotation,
          zoom,
          canvasRef.current
        );
        if (!cancelled) {
          setCanvasCssSize({ width: cssWidth, height: cssHeight });
        }
      } catch (err) {
        console.error('Errore rendering pagina PDF:', err);
      } finally {
        if (!cancelled) {
          setIsRendering(false);
        }
      }
    }
    renderCurrentPage();
    return () => {
      cancelled = true;
    };
  }, [activePage, sources, zoom]);

  useEffect(() => {
    let cancelled = false;
    async function loadTextBlocks() {
      if (!activePage) {
        setDetectedTextItems([]);
        return;
      }
      const src = sources.get(activePage.sourcePdfId);
      if (!src) return;
      const totalRotation =
        (((activePage.baseRotation + activePage.addedRotation) % 360) + 360) % 360;
      const items = await extractPageTextItems(
        src.data,
        activePage.originalPageIndex,
        totalRotation
      );
      if (!cancelled) {
        setDetectedTextItems(items);
      }
    }
    loadTextBlocks();
    return () => {
      cancelled = true;
    };
  }, [activePage, sources]);

  const handleWindowMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!interaction || !pageOverlayRef.current) return;
      const rect = pageOverlayRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dxRatio = (e.clientX - interaction.startX) / rect.width;
      const dyRatio = (e.clientY - interaction.startY) / rect.height;

      if (interaction.type === 'move-sig') {
        const clampedX = Math.max(
          0,
          Math.min(1 - interaction.widthRatio, interaction.initialXRatio + dxRatio)
        );
        const clampedY = Math.max(
          0,
          Math.min(1 - interaction.heightRatio, interaction.initialYRatio + dyRatio)
        );
        onUpdatePlaced(interaction.placedId, {
          xRatio: clampedX,
          yRatio: clampedY,
        });
      } else if (interaction.type === 'resize-sig') {
        let newX = interaction.initialXRatio;
        let newY = interaction.initialYRatio;
        let newW = interaction.initialW;
        let newH = interaction.initialH;

        const minSize = 0.03;

        if (interaction.handle.includes('e')) {
          newW = Math.max(minSize, Math.min(1 - newX, interaction.initialW + dxRatio));
        }
        if (interaction.handle.includes('s')) {
          newH = Math.max(minSize, Math.min(1 - newY, interaction.initialH + dyRatio));
        }
        if (interaction.handle.includes('w')) {
          const maxDeltaX = interaction.initialW - minSize;
          const clampedDx = Math.max(-interaction.initialXRatio, Math.min(maxDeltaX, dxRatio));
          newX = interaction.initialXRatio + clampedDx;
          newW = interaction.initialW - clampedDx;
        }
        if (interaction.handle.includes('n')) {
          const maxDeltaY = interaction.initialH - minSize;
          const clampedDy = Math.max(-interaction.initialYRatio, Math.min(maxDeltaY, dyRatio));
          newY = interaction.initialYRatio + clampedDy;
          newH = interaction.initialH - clampedDy;
        }

        if (lockAspectRatio && !e.shiftKey) {
          const pageAspect = rect.width / rect.height;
          const targetH = (newW * pageAspect) / interaction.aspectRatio;
          if (newY + targetH <= 1 && targetH >= minSize) {
            if (interaction.handle.includes('n')) {
              newY = interaction.initialYRatio + (interaction.initialH - targetH);
            }
            newH = targetH;
          }
        }

        onUpdatePlaced(interaction.placedId, {
          xRatio: newX,
          yRatio: newY,
          widthRatio: newW,
          heightRatio: newH,
        });
      } else if (interaction.type === 'move-text') {
        const clampedX = Math.max(
          0,
          Math.min(1 - interaction.widthRatio, interaction.initialXRatio + dxRatio)
        );
        const clampedY = Math.max(
          0,
          Math.min(1 - interaction.heightRatio, interaction.initialYRatio + dyRatio)
        );
        onUpdateTextAnnotation(interaction.textId, {
          xRatio: clampedX,
          yRatio: clampedY,
        });
      } else if (interaction.type === 'resize-text') {
        const newW = Math.max(
          0.04,
          Math.min(1 - interaction.xRatio, interaction.initialW + dxRatio)
        );
        const newH = Math.max(
          0.015,
          Math.min(1 - interaction.yRatio, interaction.initialH + dyRatio)
        );
        onUpdateTextAnnotation(interaction.textId, {
          widthRatio: newW,
          heightRatio: newH,
        });
      }
    },
    [interaction, lockAspectRatio, onUpdatePlaced, onUpdateTextAnnotation]
  );

  const handleWindowMouseUp = useCallback(() => {
    if (interaction) {
      setInteraction(null);
    }
  }, [interaction]);

  useEffect(() => {
    if (!interaction) return;
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [interaction, handleWindowMouseMove, handleWindowMouseUp]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (selectedPlacedId) {
        const current = placedSignatures.find((s) => s.id === selectedPlacedId);
        if (!current) return;

        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          onDeletePlaced(selectedPlacedId);
        } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
          const step = e.shiftKey ? 0.015 : 0.003;
          let nx = current.xRatio;
          let ny = current.yRatio;
          if (e.key === 'ArrowLeft') nx = Math.max(0, nx - step);
          if (e.key === 'ArrowRight') nx = Math.min(1 - current.widthRatio, nx + step);
          if (e.key === 'ArrowUp') ny = Math.max(0, ny - step);
          if (e.key === 'ArrowDown') ny = Math.min(1 - current.heightRatio, ny + step);
          onUpdatePlaced(selectedPlacedId, { xRatio: nx, yRatio: ny });
        }
      } else if (selectedTextId && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        onDeleteTextAnnotation(selectedTextId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedPlacedId,
    selectedTextId,
    placedSignatures,
    onDeletePlaced,
    onUpdatePlaced,
    onDeleteTextAnnotation,
  ]);

  if (!activePage) {
    return null;
  }

  const pageSignatures = placedSignatures.filter((s) => s.pageId === activePage.id);
  const pageTexts = textAnnotations.filter((t) => t.pageId === activePage.id);
  const replacedDetectedIds = new Set(
    pageTexts.map((t) => t.detectedItemId).filter(Boolean) as string[]
  );

  const totalRotation =
    (((activePage.baseRotation + activePage.addedRotation) % 360) + 360) % 360;
  const scaleFactor = canvasCssSize.width / Math.max(1, activePage.widthPts);

  return (
    <section
      className="flex-1 flex flex-col bg-canvas-grid overflow-hidden select-none"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          onDropFilesOnCanvas(e.dataTransfer.files);
        }
      }}
    >
      {/* Top Contextual Canvas Toolbar */}
      <div className="h-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between gap-4 shrink-0">
        {/* Left: Page Navigation & Rotation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md p-0.5">
            <button
              type="button"
              disabled={pageIndex <= 0}
              onClick={() => onNavigatePage(-1)}
              className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-35 rounded transition-colors cursor-pointer"
              title="Pagina precedente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 text-xs font-mono tabular-nums font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap">
              Pag. {pageIndex + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={pageIndex >= totalPages - 1}
              onClick={() => onNavigatePage(1)}
              className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-35 rounded transition-colors cursor-pointer"
              title="Pagina successiva"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
            |
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onRotateActivePage(-90)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Ruota pagina -90°"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>-90°</span>
            </button>
            <button
              type="button"
              onClick={() => onRotateActivePage(90)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Ruota pagina +90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>+90°</span>
            </button>
            <span className="text-xs font-mono tabular-nums text-slate-400 dark:text-slate-500">
              ({totalRotation}°)
            </span>
          </div>
        </div>

        {/* Center: Quick Actions for Signature & Text Editing */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleTextEditMode(!isTextEditMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isTextEditMode
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
            title="Attiva il rilevamento del testo esistente nel PDF per modificarlo o aggiungere nuovo testo"
          >
            <Type className="w-3.5 h-3.5" />
            <span>
              {isTextEditMode ? 'Modifica Testo PDF: Attiva' : 'Modifica Testo PDF'}
            </span>
          </button>

          {isTextEditMode ? (
            <button
              type="button"
              onClick={() => onCreateFreeTextAt()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>+ Nuova Casella Testo</span>
            </button>
          ) : (
            <>
              {activeSignatureAssetId && (
                <button
                  type="button"
                  onClick={() => onPlaceActiveSignatureAt()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Incolla Firma</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setLockAspectRatio((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  lockAspectRatio
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Mantieni o sblocca le proporzioni durante il ridimensionamento della firma"
              >
                <Maximize2 className="w-3 h-3" />
                <span>{lockAspectRatio ? 'Proporzioni Fisse' : 'Proporzioni Libere'}</span>
              </button>
            </>
          )}
        </div>

        {/* Right: Zoom Controls + Theme Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
              className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded transition-colors cursor-pointer"
              title="Riduci zoom"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1.05)}
              className="px-2 text-xs font-mono tabular-nums font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              title="Reimposta zoom al 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
              className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded transition-colors cursor-pointer"
              title="Aumenta zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onToggleTheme(!isDark)}
            className="p-1.5 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
            title={isDark ? 'Passa al Tema Chiaro' : 'Passa al Tema Scuro'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Scrollable Document Stage */}
      <div
        className="flex-1 overflow-auto flex items-start justify-center p-8"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            onSelectPlaced(null);
            onSelectTextAnnotation(null);
          }
        }}
      >
        <div
          ref={pageOverlayRef}
          style={{
            width: `${canvasCssSize.width}px`,
            height: `${canvasCssSize.height}px`,
          }}
          onMouseDown={(e) => {
            if (e.target === canvasRef.current || e.target === pageOverlayRef.current) {
              onSelectPlaced(null);
              onSelectTextAnnotation(null);
            }
          }}
          onDoubleClick={(e) => {
            if (
              pageOverlayRef.current &&
              (e.target === canvasRef.current || e.target === pageOverlayRef.current)
            ) {
              const rect = pageOverlayRef.current.getBoundingClientRect();
              const xRatio = (e.clientX - rect.left) / rect.width;
              const yRatio = (e.clientY - rect.top) / rect.height;
              if (isTextEditMode) {
                onCreateFreeTextAt(xRatio, yRatio);
              } else if (activeSignatureAssetId) {
                onPlaceActiveSignatureAt(xRatio, yRatio);
              }
            }
          }}
          className="relative bg-white shadow-xl border border-slate-300 dark:border-slate-700 transition-opacity"
        >
          {/* Underlying PDF Page Canvas (Always true white paper for WYSIWYG accuracy) */}
          <canvas ref={canvasRef} className="block pointer-events-none" />

          {isRendering && (
            <div className="absolute inset-0 bg-white/40 flex items-center justify-center pointer-events-none">
              <span className="text-xs font-medium text-slate-600 bg-white px-3 py-1.5 rounded border border-slate-200 shadow-xs">
                Aggiornamento pagina...
              </span>
            </div>
          )}

          {/* Layer 1: Detected Existing PDF Text Blocks */}
          {isTextEditMode &&
            detectedTextItems.map((det) => {
              if (replacedDetectedIds.has(det.id)) return null;
              return (
                <div
                  key={det.id}
                  style={{
                    left: `${det.xRatio * 100}%`,
                    top: `${det.yRatio * 100}%`,
                    width: `${det.widthRatio * 100}%`,
                    height: `${det.heightRatio * 100}%`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateTextFromDetected(det);
                  }}
                  title={`Clicca per modificare: "${det.text}"`}
                  className="absolute z-10 border border-dashed border-amber-400/75 hover:border-amber-600 hover:bg-amber-200/25 rounded-[2px] cursor-text transition-colors"
                />
              );
            })}

          {/* Layer 2: Active / Modified PDF Text Annotations */}
          {pageTexts.map((txt) => {
            const isSelected = txt.id === selectedTextId;
            const cssFontSize = Math.max(8, txt.fontSizePts * scaleFactor);
            const fontClass =
              txt.fontFamily === 'serif'
                ? 'font-serif'
                : txt.fontFamily === 'mono'
                ? 'font-mono'
                : 'font-sans';

            return (
              <div
                key={txt.id}
                style={{
                  left: `${txt.xRatio * 100}%`,
                  top: `${txt.yRatio * 100}%`,
                  width: `${txt.widthRatio * 100}%`,
                  minHeight: `${txt.heightRatio * 100}%`,
                  backgroundColor: txt.maskBackground
                    ? txt.maskColorHex || '#FFFFFF'
                    : 'transparent',
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onSelectPlaced(null);
                  onSelectTextAnnotation(txt.id);
                }}
                className={`group absolute z-20 flex items-start ${
                  isSelected
                    ? 'ring-2 ring-amber-600 shadow-xs'
                    : isTextEditMode
                    ? 'ring-1 ring-amber-400/80 hover:ring-amber-600'
                    : 'hover:ring-1 hover:ring-blue-400/60'
                }`}
              >
                {isSelected && (
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setInteraction({
                        type: 'move-text',
                        textId: txt.id,
                        startX: e.clientX,
                        startY: e.clientY,
                        initialXRatio: txt.xRatio,
                        initialYRatio: txt.yRatio,
                        widthRatio: txt.widthRatio,
                        heightRatio: txt.heightRatio,
                      });
                    }}
                    title="Trascina per spostare la casella di testo"
                    className="w-2.5 self-stretch bg-amber-500/80 hover:bg-amber-600 cursor-move shrink-0"
                  />
                )}

                {isSelected ? (
                  <textarea
                    value={txt.text}
                    onChange={(e) =>
                      onUpdateTextAnnotation(txt.id, { text: e.target.value })
                    }
                    rows={Math.max(1, txt.text.split('\n').length)}
                    style={{
                      fontSize: `${cssFontSize}px`,
                      lineHeight: 1.18,
                      color: txt.colorHex,
                      fontWeight: txt.isBold ? 700 : 400,
                    }}
                    className={`w-full h-full bg-transparent resize-none focus:outline-none px-0.5 py-0 ${fontClass}`}
                  />
                ) : (
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onSelectPlaced(null);
                      onSelectTextAnnotation(txt.id);
                      setInteraction({
                        type: 'move-text',
                        textId: txt.id,
                        startX: e.clientX,
                        startY: e.clientY,
                        initialXRatio: txt.xRatio,
                        initialYRatio: txt.yRatio,
                        widthRatio: txt.widthRatio,
                        heightRatio: txt.heightRatio,
                      });
                    }}
                    style={{
                      fontSize: `${cssFontSize}px`,
                      lineHeight: 1.18,
                      color: txt.colorHex,
                      fontWeight: txt.isBold ? 700 : 400,
                    }}
                    className={`w-full h-full whitespace-pre-wrap cursor-move px-0.5 ${fontClass}`}
                  >
                    {txt.text || ' '}
                  </div>
                )}

                {isSelected && (
                  <>
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setInteraction({
                          type: 'resize-text',
                          textId: txt.id,
                          startX: e.clientX,
                          startY: e.clientY,
                          initialW: txt.widthRatio,
                          initialH: txt.heightRatio,
                          xRatio: txt.xRatio,
                          yRatio: txt.yRatio,
                        });
                      }}
                      title="Trascina per allargare la casella di testo"
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-amber-600 rounded-xs cursor-nwse-resize"
                    />

                    <div
                      onMouseDown={(e) => e.stopPropagation()}
                      className="absolute -top-10 left-0 flex items-center gap-1.5 bg-slate-900 text-white px-2.5 py-1 rounded-md shadow-md whitespace-nowrap z-30"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateTextAnnotation(txt.id, {
                            fontSizePts: Math.max(6, Math.round(txt.fontSizePts - 1)),
                          })
                        }
                        className="px-1.5 py-0.5 text-xs hover:bg-slate-800 rounded cursor-pointer"
                        title="Riduci dimensione testo"
                      >
                        A-
                      </button>
                      <span className="text-[11px] font-mono tabular-nums text-amber-300">
                        {Math.round(txt.fontSizePts)}pt
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateTextAnnotation(txt.id, {
                            fontSizePts: Math.min(48, Math.round(txt.fontSizePts + 1)),
                          })
                        }
                        className="px-1.5 py-0.5 text-xs hover:bg-slate-800 rounded cursor-pointer"
                        title="Aumenta dimensione testo"
                      >
                        A+
                      </button>

                      <span className="text-slate-700">|</span>

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateTextAnnotation(txt.id, { isBold: !txt.isBold })
                        }
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          txt.isBold
                            ? 'bg-amber-600 text-white'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                        title="Grassetto"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateTextAnnotation(txt.id, {
                            maskBackground: !txt.maskBackground,
                          })
                        }
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                          txt.maskBackground
                            ? 'bg-slate-700 text-white'
                            : 'text-slate-400 hover:bg-slate-800'
                        }`}
                        title="Copri il testo originale sottostante con sfondo bianco"
                      >
                        <EyeOff className="w-3 h-3" />
                        <span>Copri fondo</span>
                      </button>

                      <span className="text-slate-700">|</span>

                      <button
                        type="button"
                        onClick={() => onDeleteTextAnnotation(txt.id)}
                        className="p-1 hover:bg-red-900/60 rounded text-red-300 hover:text-red-200 transition-colors cursor-pointer"
                        title="Annulla modifica testo / Rimuovi casella"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Layer 3: Interactive Placed Signatures Overlay */}
          {pageSignatures.map((placed) => {
            const asset = signatureAssets.find((a) => a.id === placed.signatureAssetId);
            if (!asset) return null;
            const isSelected = placed.id === selectedPlacedId;
            const assetAspect = Math.max(0.2, asset.width / Math.max(1, asset.height));

            return (
              <div
                key={placed.id}
                style={{
                  left: `${placed.xRatio * 100}%`,
                  top: `${placed.yRatio * 100}%`,
                  width: `${placed.widthRatio * 100}%`,
                  height: `${placed.heightRatio * 100}%`,
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onSelectTextAnnotation(null);
                  onSelectPlaced(placed.id);
                  setInteraction({
                    type: 'move-sig',
                    placedId: placed.id,
                    startX: e.clientX,
                    startY: e.clientY,
                    initialXRatio: placed.xRatio,
                    initialYRatio: placed.yRatio,
                    widthRatio: placed.widthRatio,
                    heightRatio: placed.heightRatio,
                  });
                }}
                className={`group absolute cursor-move select-none ${
                  isSelected
                    ? 'ring-2 ring-blue-600 bg-blue-500/5 z-30'
                    : 'hover:ring-1 hover:ring-blue-400 z-25'
                }`}
              >
                <img
                  src={asset.processedDataUrl}
                  alt={asset.name}
                  referrerPolicy="no-referrer"
                  draggable={false}
                  style={{ opacity: placed.opacity }}
                  className="w-full h-full object-fill pointer-events-none select-none"
                />

                {isSelected && (
                  <>
                    {(['nw', 'ne', 'sw', 'se'] as const).map((handle) => {
                      const posClasses = {
                        nw: '-top-1.5 -left-1.5 cursor-nwse-resize',
                        ne: '-top-1.5 -right-1.5 cursor-nesw-resize',
                        sw: '-bottom-1.5 -left-1.5 cursor-nesw-resize',
                        se: '-bottom-1.5 -right-1.5 cursor-nwse-resize',
                      }[handle];

                      return (
                        <div
                          key={handle}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setInteraction({
                              type: 'resize-sig',
                              placedId: placed.id,
                              handle,
                              startX: e.clientX,
                              startY: e.clientY,
                              initialXRatio: placed.xRatio,
                              initialYRatio: placed.yRatio,
                              initialW: placed.widthRatio,
                              initialH: placed.heightRatio,
                              aspectRatio: assetAspect,
                            });
                          }}
                          className={`absolute w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-xs shadow-xs ${posClasses}`}
                        />
                      );
                    })}

                    <div
                      onMouseDown={(e) => e.stopPropagation()}
                      className="absolute -top-10 left-0 flex items-center gap-1.5 bg-slate-900 text-white px-2.5 py-1 rounded-md shadow-md whitespace-nowrap z-30"
                    >
                      <span className="text-[11px] font-mono tabular-nums text-slate-300">
                        {Math.round(placed.widthRatio * activePage.widthPts)}×
                        {Math.round(placed.heightRatio * activePage.heightPts)} pt
                      </span>

                      <span className="text-slate-700">|</span>

                      <label className="flex items-center gap-1 text-[11px] text-slate-300">
                        <span>Opacità</span>
                        <input
                          type="range"
                          min={30}
                          max={100}
                          value={Math.round(placed.opacity * 100)}
                          onChange={(e) =>
                            onUpdatePlaced(placed.id, {
                              opacity: Number(e.target.value) / 100,
                            })
                          }
                          className="w-14 accent-blue-400 cursor-pointer"
                        />
                      </label>

                      <span className="text-slate-700">|</span>

                      <button
                        type="button"
                        onClick={() => onDuplicatePlaced(placed.id)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-200 hover:text-white transition-colors cursor-pointer"
                        title="Duplica firma sulla pagina"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {totalPages > 1 && (
                        <button
                          type="button"
                          onClick={() => onApplyPlacedToAllPages(placed.id)}
                          className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-slate-800 rounded text-[11px] text-blue-300 hover:text-blue-200 transition-colors cursor-pointer"
                          title="Copia questa firma nella stessa posizione su tutte le pagine"
                        >
                          <Layers className="w-3 h-3" />
                          <span>Tutte le pag.</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onDeletePlaced(placed.id)}
                        className="p-1 hover:bg-red-900/60 rounded text-red-300 hover:text-red-200 transition-colors cursor-pointer"
                        title="Rimuovi firma dalla pagina (Canc)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Subtle Bottom Hint Bar */}
      <div className="h-8 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
        <div className="flex items-center gap-2 truncate">
          {isTextEditMode ? (
            <span className="text-amber-700 dark:text-amber-400 font-medium">
              Modalità Testo Attiva: clicca su qualsiasi frase tratteggiata del PDF per modificarla, oppure fai doppio clic per aggiungere nuovo testo.
            </span>
          ) : (
            <span>
              Suggerimento: fai doppio clic sul foglio per incollare la firma attiva, oppure attiva "Modifica Testo PDF" per correggere i testi.
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 font-mono tabular-nums text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
          <span>
            {Math.round(activePage.widthPts)} × {Math.round(activePage.heightPts)} pt
          </span>
          <span aria-hidden="true">·</span>
          <span>Auto-salvataggio Locale Attivo</span>
        </div>
      </div>
    </section>
  );
};
