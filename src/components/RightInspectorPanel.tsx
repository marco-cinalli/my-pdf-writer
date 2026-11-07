import React, { useRef, useState } from 'react';
import {
  Upload,
  Sliders,
  PenTool,
  Trash2,
  FilePlus2,
  Scissors,
  FileText,
  Type,
  Plus,
  RotateCcw,
} from 'lucide-react';
import {
  InkColorMode,
  PageItem,
  PdfFontFamily,
  PdfSourceFile,
  PdfTextAnnotation,
  SignatureAsset,
  WorkspaceTab,
} from '../types/pdf';

interface RightInspectorPanelProps {
  activeTab: WorkspaceTab;
  onChangeTab: (tab: WorkspaceTab) => void;
  signatureAssets: SignatureAsset[];
  activeSignatureAssetId: string | null;
  onSelectSignatureAsset: (id: string) => void;
  onUploadSignatureFiles: (files: FileList | File[]) => void;
  onUpdateSignatureOptions: (
    id: string,
    patch: Partial<{
      transparentWhite: boolean;
      threshold: number;
      inkColor: InkColorMode;
      autoCrop: boolean;
    }>
  ) => void;
  onDeleteSignatureAsset: (id: string) => void;
  onPlaceSignatureOnPage: (assetId: string) => void;
  onOpenDrawModal: () => void;
  onDownloadSampleBmp: () => void;
  onDownloadSamplePdfSig: () => void;
  // Text tab props
  activePageId: string | null;
  textAnnotations: PdfTextAnnotation[];
  selectedTextId: string | null;
  onSelectTextAnnotation: (id: string | null) => void;
  onCreateFreeText: () => void;
  onUpdateTextAnnotation: (id: string, patch: Partial<PdfTextAnnotation>) => void;
  onDeleteTextAnnotation: (id: string) => void;
  // Merge tab props
  sources: Map<string, PdfSourceFile>;
  pages: PageItem[];
  onAddPdfFiles: (files: FileList | File[]) => void;
  // Extract tab props
  extractRangeInput: string;
  onChangeExtractRangeInput: (val: string) => void;
  selectedExtractIndices: number[];
  extractRangeError: string | null;
  onApplyRangePreset: (preset: 'all' | 'current' | 'odd' | 'even') => void;
  onExportExtractedPages: () => void;
  isExporting: boolean;
}

export const RightInspectorPanel: React.FC<RightInspectorPanelProps> = ({
  activeTab,
  onChangeTab,
  signatureAssets,
  activeSignatureAssetId,
  onSelectSignatureAsset,
  onUploadSignatureFiles,
  onUpdateSignatureOptions,
  onDeleteSignatureAsset,
  onPlaceSignatureOnPage,
  onOpenDrawModal,
  onDownloadSampleBmp,
  onDownloadSamplePdfSig,
  activePageId,
  textAnnotations,
  selectedTextId,
  onSelectTextAnnotation,
  onCreateFreeText,
  onUpdateTextAnnotation,
  onDeleteTextAnnotation,
  sources,
  pages,
  onAddPdfFiles,
  extractRangeInput,
  onChangeExtractRangeInput,
  selectedExtractIndices,
  extractRangeError,
  onApplyRangePreset,
  onExportExtractedPages,
  isExporting,
}) => {
  const sigInputRef = useRef<HTMLInputElement>(null);
  const mergeInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingSig, setIsDraggingSig] = useState(false);

  const activeAsset =
    signatureAssets.find((a) => a.id === activeSignatureAssetId) || signatureAssets[0] || null;

  const pageTextAnnotations = textAnnotations.filter((t) => t.pageId === activePageId);
  const selectedText =
    textAnnotations.find((t) => t.id === selectedTextId) || pageTextAnnotations[0] || null;

  return (
    <aside className="w-86 shrink-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col select-none">
      {/* Segmented Tool Selector (4 Tools) */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800">
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => onChangeTab('sign')}
            className={`py-1.5 px-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'sign' || activeTab === 'library'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Firma
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('text')}
            className={`py-1.5 px-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'text'
                ? 'bg-white dark:bg-slate-950 text-amber-800 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Testo PDF
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('merge')}
            className={`py-1.5 px-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'merge'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Unisci
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('extract')}
            className={`py-1.5 px-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'extract'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Estrai
          </button>
        </div>
      </div>

      {/* Scrollable Inspector Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {(activeTab === 'sign' || activeTab === 'library') && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  1. Carica Firma (.PDF o .BMP)
                </h3>
                <button
                  type="button"
                  onClick={onOpenDrawModal}
                  className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  + Disegna / Data
                </button>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingSig(true);
                }}
                onDragLeave={() => setIsDraggingSig(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingSig(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    onUploadSignatureFiles(e.dataTransfer.files);
                  }
                }}
                onClick={() => sigInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-3.5 text-center transition-colors cursor-pointer ${
                  isDraggingSig
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40'
                    : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-slate-50/60 dark:bg-slate-950/50'
                }`}
              >
                <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  Trascina file firma <span className="font-mono">.bmp</span> o{' '}
                  <span className="font-mono">.pdf</span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Sfondo bianco convertito in trasparente
                </p>
                <input
                  ref={sigInputRef}
                  type="file"
                  accept=".bmp,.dib,.pdf,.png,.jpg,.jpeg,image/bmp,application/pdf,image/png,image/jpeg"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      onUploadSignatureFiles(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                <span>File di test:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onDownloadSampleBmp}
                    className="hover:text-slate-900 dark:hover:text-slate-200 underline cursor-pointer"
                    title="Scarica un file firma .BMP di esempio per testare il caricamento"
                  >
                    Scarica firma .BMP
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={onDownloadSamplePdfSig}
                    className="hover:text-slate-900 dark:hover:text-slate-200 underline cursor-pointer"
                    title="Scarica un file firma .PDF di esempio per testare il caricamento"
                  >
                    Scarica firma .PDF
                  </button>
                </div>
              </div>
            </div>

            {/* Saved Signatures Library Strip */}
            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  2. Firme Disponibili ({signatureAssets.length})
                </h3>
                <span className="text-[11px] text-slate-400">Clicca per usare</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
                {signatureAssets.map((asset) => {
                  const isSelected = activeAsset?.id === asset.id;
                  return (
                    <div
                      key={asset.id}
                      onClick={() => onSelectSignatureAsset(asset.id)}
                      className={`p-2 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 dark:border-blue-500 bg-blue-50/25 dark:bg-blue-950/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                            {asset.name}
                          </span>
                          <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            {asset.sourceFormat}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlaceSignatureOnPage(asset.id);
                            }}
                            className="px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded transition-colors cursor-pointer"
                          >
                            Incolla
                          </button>
                          {signatureAssets.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSignatureAsset(asset.id);
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                              title="Rimuovi dalla libreria"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="h-14 bg-checkerboard rounded border border-slate-200/80 dark:border-slate-700 flex items-center justify-center p-1.5 overflow-hidden">
                        <img
                          src={asset.processedDataUrl}
                          alt={asset.name}
                          referrerPolicy="no-referrer"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Signature Transparency & Ink Controls */}
            {activeAsset && (
              <div className="space-y-3.5 border-t border-slate-200 dark:border-slate-800 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>3. Trasparenza e Scontorno Bianco</span>
                  </h3>
                </div>

                <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <span>Considera il bianco trasparente</span>
                  <input
                    type="checkbox"
                    checked={activeAsset.transparentWhite}
                    onChange={(e) =>
                      onUpdateSignatureOptions(activeAsset.id, {
                        transparentWhite: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </label>

                {activeAsset.transparentWhite && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400">
                        Tolleranza del bianco
                      </span>
                      <span className="font-mono tabular-nums font-medium text-slate-800 dark:text-slate-200">
                        {activeAsset.threshold}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={90}
                      value={activeAsset.threshold}
                      onChange={(e) =>
                        onUpdateSignatureOptions(activeAsset.id, {
                          threshold: Number(e.target.value),
                        })
                      }
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Aumenta per rimuovere aloni grigi da scansioni BMP o PDF.
                    </p>
                  </div>
                )}

                <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <span>Ritaglia margini bianchi superflui</span>
                  <input
                    type="checkbox"
                    checked={activeAsset.autoCrop}
                    onChange={(e) =>
                      onUpdateSignatureOptions(activeAsset.id, {
                        autoCrop: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </label>

                <div className="space-y-1.5">
                  <span className="block text-xs text-slate-600 dark:text-slate-400">
                    Colore Inchiostro
                  </span>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    {(
                      [
                        { id: 'original', label: 'Originale' },
                        { id: 'blue', label: 'Blu Penna' },
                        { id: 'black', label: 'Nero' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          onUpdateSignatureOptions(activeAsset.id, {
                            inkColor: opt.id,
                          })
                        }
                        className={`py-1 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                          activeAsset.inkColor === opt.id
                            ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onPlaceSignatureOnPage(activeAsset.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-600 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Incolla Firma sulla Pagina Attiva</span>
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'text' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Editor del Testo PDF</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Clicca su qualsiasi{' '}
                <span className="text-amber-700 dark:text-amber-400 font-medium">
                  blocco tratteggiato
                </span>{' '}
                sul foglio per modificare un testo già presente nel PDF, oppure inserisci una nuova casella di testo libero.
              </p>
            </div>

            <button
              type="button"
              onClick={onCreateFreeText}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Aggiungi Nuova Casella di Testo</span>
            </button>

            {selectedText ? (
              <div className="space-y-3.5 border-t border-slate-200 dark:border-slate-800 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {selectedText.mode === 'replace'
                      ? 'Modifica Testo PDF Rilevato'
                      : 'Casella di Testo Libero'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteTextAnnotation(selectedText.id)}
                    className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline font-medium cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>
                      {selectedText.mode === 'replace' ? 'Ripristina PDF' : 'Elimina'}
                    </span>
                  </button>
                </div>

                {selectedText.originalText && (
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Originale:{' '}
                    </span>
                    <span className="italic">"{selectedText.originalText}"</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Contenuto Testo (svuota per sbiancare)
                  </label>
                  <textarea
                    value={selectedText.text}
                    onChange={(e) =>
                      onUpdateTextAnnotation(selectedText.id, { text: e.target.value })
                    }
                    rows={3}
                    placeholder="Inserisci il testo..."
                    className="w-full px-2.5 py-2 text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-600 dark:text-slate-400">
                      Carattere
                    </label>
                    <select
                      value={selectedText.fontFamily}
                      onChange={(e) =>
                        onUpdateTextAnnotation(selectedText.id, {
                          fontFamily: e.target.value as PdfFontFamily,
                        })
                      }
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    >
                      <option value="sans">Helvetica (Sans)</option>
                      <option value="serif">Times (Serif)</option>
                      <option value="mono">Courier (Mono)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs text-slate-600 dark:text-slate-400">
                      Dimensione ({Math.round(selectedText.fontSizePts)} pt)
                    </label>
                    <input
                      type="number"
                      min={6}
                      max={48}
                      value={Math.round(selectedText.fontSizePts)}
                      onChange={(e) =>
                        onUpdateTextAnnotation(selectedText.id, {
                          fontSizePts: Math.max(
                            6,
                            Math.min(48, Number(e.target.value) || 11)
                          ),
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-md"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedText.isBold}
                      onChange={(e) =>
                        onUpdateTextAnnotation(selectedText.id, {
                          isBold: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                    />
                    <span>Stile Grassetto</span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    {(
                      [
                        { hex: '#0F172A', label: 'Nero' },
                        { hex: '#1D4ED8', label: 'Blu' },
                        { hex: '#DC2626', label: 'Rosso' },
                      ] as const
                    ).map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() =>
                          onUpdateTextAnnotation(selectedText.id, { colorHex: c.hex })
                        }
                        style={{ backgroundColor: c.hex }}
                        className={`w-5 h-5 rounded-full border cursor-pointer ${
                          selectedText.colorHex === c.hex
                            ? 'ring-2 ring-offset-1 ring-amber-600 border-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                        title={`Colore ${c.label}`}
                      />
                    ))}
                  </div>
                </div>

                <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                  <span>Copri il testo originale sottostante (Bianco)</span>
                  <input
                    type="checkbox"
                    checked={selectedText.maskBackground}
                    onChange={(e) =>
                      onUpdateTextAnnotation(selectedText.id, {
                        maskBackground: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                  />
                </label>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-300">
                Nessun blocco di testo selezionato. Fai clic su una frase del documento PDF al centro per modificarla subito.
              </div>
            )}

            {pageTextAnnotations.length > 0 && (
              <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Testi Modificati nella Pagina ({pageTextAnnotations.length})
                </span>
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {pageTextAnnotations.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onSelectTextAnnotation(item.id)}
                      className={`p-2 rounded-md border text-xs flex items-center justify-between gap-2 cursor-pointer ${
                        selectedText?.id === item.id
                          ? 'border-amber-600 bg-amber-50/40 dark:bg-amber-950/40'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                        {item.text || '(Testo cancellato / sbiancato)'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTextAnnotation(item.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                        title="Rimuovi modifica"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'merge' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Unisci più Documenti PDF
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Aggiungi altri file PDF per accodare le loro pagine al documento corrente. Puoi riordinare o ruotare ogni singola pagina dalla barra laterale a sinistra.
              </p>
            </div>

            <div
              onClick={() => mergeInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  onAddPdfFiles(e.dataTransfer.files);
                }
              }}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-slate-50/70 dark:bg-slate-950/50 rounded-lg p-5 text-center transition-colors cursor-pointer"
            >
              <FilePlus2 className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Seleziona o trascina PDF da unire
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                I file vengono uniti localmente mantenendo il formato originale
              </p>
              <input
                ref={mergeInputRef}
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

            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  File PDF Sorgenti ({sources.size})
                </span>
                <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  Totale: {pages.length} pag.
                </span>
              </div>

              <div className="space-y-2">
                {Array.from(sources.values()).map((src) => (
                  <div
                    key={src.id}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                          {src.name}
                        </p>
                        <p className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          {src.pageCount} {src.pageCount === 1 ? 'pagina' : 'pagine'} ·{' '}
                          {(src.sizeBytes / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'extract' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Estrai Pagine in un Range
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Indica gli intervalli di pagine da estrarre (es.{' '}
                <span className="font-mono">1-2, 4</span>) oppure seleziona le caselle sulle miniature a sinistra per generare un nuovo PDF contenente solo le pagine scelte.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Intervallo Pagine (1 – {pages.length})
              </label>
              <input
                type="text"
                value={extractRangeInput}
                onChange={(e) => onChangeExtractRangeInput(e.target.value)}
                placeholder={`Es. 1-${Math.min(2, pages.length)}, ${pages.length}`}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600"
              />
              {extractRangeError ? (
                <p className="text-xs text-red-600 dark:text-red-400">{extractRangeError}</p>
              ) : (
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  {selectedExtractIndices.length}{' '}
                  {selectedExtractIndices.length === 1
                    ? 'pagina selezionata'
                    : 'pagine selezionate'}{' '}
                  per l'estrazione
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs text-slate-600 dark:text-slate-400">
                Selezione Rapida
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onApplyRangePreset('all')}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                >
                  Tutte (1-{pages.length})
                </button>
                <button
                  type="button"
                  onClick={() => onApplyRangePreset('current')}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                >
                  Solo Pagina Attiva
                </button>
                <button
                  type="button"
                  onClick={() => onApplyRangePreset('odd')}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                >
                  Pagine Dispari
                </button>
                <button
                  type="button"
                  onClick={() => onApplyRangePreset('even')}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                >
                  Pagine Pari
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={
                isExporting ||
                Boolean(extractRangeError) ||
                selectedExtractIndices.length === 0
              }
              onClick={onExportExtractedPages}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-600 disabled:opacity-45 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>
                Esporta {selectedExtractIndices.length}{' '}
                {selectedExtractIndices.length === 1 ? 'Pagina' : 'Pagine'} in PDF
              </span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
