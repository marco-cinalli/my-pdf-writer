import React, { useRef, useState } from 'react';
import {
  RotateCw,
  RotateCcw,
  Trash2,
  ArrowUp,
  ArrowDown,
  FilePlus2,
  CheckSquare,
  Square,
} from 'lucide-react';
import { PageItem, PlacedSignature } from '../types/pdf';

interface PageSidebarProps {
  pages: PageItem[];
  activePageId: string | null;
  placedSignatures: PlacedSignature[];
  selectedExtractIndices: number[];
  isExtractMode: boolean;
  onSelectPage: (pageId: string) => void;
  onRotatePage: (pageId: string, delta: 90 | -90) => void;
  onRotateAllPages: (delta: 90 | -90) => void;
  onMovePage: (index: number, direction: 'up' | 'down') => void;
  onDeletePage: (pageId: string) => void;
  onToggleExtractIndex: (index: number) => void;
  onAddPdfFiles: (files: FileList | File[]) => void;
}

export const PageSidebar: React.FC<PageSidebarProps> = ({
  pages,
  activePageId,
  placedSignatures,
  selectedExtractIndices,
  isExtractMode,
  onSelectPage,
  onRotatePage,
  onRotateAllPages,
  onMovePage,
  onDeletePage,
  onToggleExtractIndex,
  onAddPdfFiles,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddPdfFiles(e.dataTransfer.files);
    }
  };

  return (
    <aside
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
      className={`w-68 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col select-none transition-colors ${
        isDraggingOver ? 'bg-blue-50/60 dark:bg-blue-950/40' : ''
      }`}
    >
      {/* Sidebar Top Controls */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Pagine Documento
          </span>
          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {pages.length} {pages.length === 1 ? 'pagina' : 'pagine'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Unisci un altro PDF accodando le sue pagine"
          >
            <FilePlus2 className="w-3.5 h-3.5 shrink-0" />
            <span>Unisci PDF</span>
          </button>

          <button
            type="button"
            onClick={() => onRotateAllPages(90)}
            disabled={pages.length === 0}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Ruota tutte le pagine di 90° in senso orario"
          >
            <RotateCw className="w-3.5 h-3.5 shrink-0" />
            <span>Ruota Tutte</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onAddPdfFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />
      </div>

      {/* Pages Scrollable List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {pages.map((page, idx) => {
          const isActive = page.id === activePageId;
          const sigCount = placedSignatures.filter((s) => s.pageId === page.id).length;
          const isSelectedForExtract = selectedExtractIndices.includes(idx);
          const totalRotation = ((page.baseRotation + page.addedRotation) % 360 + 360) % 360;

          return (
            <div
              key={page.id}
              onClick={() => onSelectPage(page.id)}
              className={`group relative rounded-lg border p-2.5 transition-all cursor-pointer ${
                isActive
                  ? 'border-blue-600 dark:border-blue-500 bg-blue-50/30 dark:bg-blue-950/30 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Top Row: Page Number & Extract Checkbox / Source Info */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {isExtractMode && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleExtractIndex(idx);
                      }}
                      className="text-blue-700 dark:text-blue-400 hover:text-blue-800 cursor-pointer"
                      title="Includi o escludi pagina dall'estrazione"
                    >
                      {isSelectedForExtract ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      )}
                    </button>
                  )}
                  <span
                    className={`text-xs font-mono tabular-nums font-semibold ${
                      isActive
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    Pag. {idx + 1}
                  </span>
                  {totalRotation !== 0 && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-amber-700 dark:text-amber-400">
                        {totalRotation}°
                      </span>
                    </>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {sigCount > 0 ? (
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                      {sigCount} {sigCount === 1 ? 'firma' : 'firme'}
                    </span>
                  ) : (
                    <span>
                      {Math.round(page.widthPts)}×{Math.round(page.heightPts)}
                    </span>
                  )}
                </div>
              </div>

              {/* Thumbnail Preview */}
              <div className="relative flex items-center justify-center bg-slate-100 dark:bg-slate-950 rounded border border-slate-200/80 dark:border-slate-800 overflow-hidden py-2 min-h-32">
                <img
                  src={page.thumbnailDataUrl}
                  alt={`Anteprima pagina ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  className="max-h-36 w-auto object-contain shadow-xs bg-white"
                />
              </div>

              {/* Source filename + Per-page Action Strip */}
              <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                <span
                  className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-24"
                  title={page.sourceFileName}
                >
                  {page.sourceFileName}
                </span>

                <div
                  className="flex items-center gap-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onRotatePage(page.id, -90)}
                    className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                    title="Ruota pagina -90°"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRotatePage(page.id, 90)}
                    className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                    title="Ruota pagina +90°"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => onMovePage(idx, 'up')}
                    className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 rounded transition-colors cursor-pointer"
                    title="Sposta pagina in alto"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === pages.length - 1}
                    onClick={() => onMovePage(idx, 'down')}
                    className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 rounded transition-colors cursor-pointer"
                    title="Sposta pagina in basso"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={pages.length <= 1}
                    onClick={() => onDeletePage(page.id)}
                    className="p-1 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 disabled:opacity-30 rounded transition-colors cursor-pointer"
                    title="Rimuovi pagina dal documento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
