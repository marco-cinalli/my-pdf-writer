import React, { useRef, useState } from 'react';
import {
  FileUp,
  Search,
  FolderOpen,
  Download,
  Trash2,
  Copy,
  PenTool,
  Type,
  HardDrive,
  Sun,
  Moon,
  FilePlus2,
  Scissors,
  ArrowUpRight,
  Upload,
} from 'lucide-react';
import { SavedPdfProject, SignatureAsset, WorkspaceTab } from '../types/pdf';

interface HomeVaultViewProps {
  projects: SavedPdfProject[];
  activeProjectId: string | null;
  signatureAssets: SignatureAsset[];
  isDark: boolean;
  onToggleTheme: (dark: boolean) => void;
  onOpenProject: (project: SavedPdfProject, initialTab?: WorkspaceTab) => void;
  onUploadNewPdfFiles: (files: FileList | File[]) => void;
  onUploadSignatureFiles: (files: FileList | File[]) => void;
  onOpenDrawModal: () => void;
  onExportProjectDirect: (project: SavedPdfProject) => void;
  onDuplicateProject: (project: SavedPdfProject) => void;
  onDeleteProject: (projectId: string) => void;
  onRenameProject: (projectId: string, newName: string) => void;
  onClearAllProjects: () => void;
  onCreateSampleProject: () => void;
}

export const HomeVaultView: React.FC<HomeVaultViewProps> = ({
  projects,
  activeProjectId,
  signatureAssets,
  isDark,
  onToggleTheme,
  onOpenProject,
  onUploadNewPdfFiles,
  onUploadSignatureFiles,
  onOpenDrawModal,
  onExportProjectDirect,
  onDuplicateProject,
  onDeleteProject,
  onRenameProject,
  onClearAllProjects,
  onCreateSampleProject,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'modified' | 'unmodified'>('all');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const totalBytes = projects.reduce((acc, p) => acc + (p.totalSizeBytes || 0), 0);
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);
  const totalPagesCount = projects.reduce((acc, p) => acc + (p.pages?.length || 0), 0);
  const totalSignaturesPlaced = projects.reduce(
    (acc, p) => acc + (p.placedSignatures?.length || 0),
    0
  );
  const totalTextsEdited = projects.reduce(
    (acc, p) => acc + (p.textAnnotations?.length || 0),
    0
  );

  const primaryProject =
    projects.find((p) => p.id === activeProjectId) || projects[0] || null;

  const filteredProjects = projects.filter((proj) => {
    const matchesSearch = proj.name
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase());
    if (!matchesSearch) return false;

    const editCount =
      (proj.placedSignatures?.length || 0) + (proj.textAnnotations?.length || 0);
    if (statusFilter === 'modified') return editCount > 0;
    if (statusFilter === 'unmodified') return editCount === 0;
    return true;
  });

  const handleQuickToolLaunch = (tab: WorkspaceTab) => {
    if (primaryProject) {
      onOpenProject(primaryProject, tab);
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Section 1: Editorial Asymmetric Hero Split (items-stretch) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Editorial Brand & Studio Controls */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-7 flex flex-col justify-between">
            <div className="space-y-5">
              {/* Top Kicker Row + Theme Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <HardDrive className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Archivio Locale IndexedDB</span>
                  <span aria-hidden="true">·</span>
                  <span>Zero Cloud</span>
                </div>

                {/* Interactive Theme Segmented Control */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => onToggleTheme(false)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      !isDark
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Chiaro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleTheme(true)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isDark
                        ? 'bg-slate-950 text-slate-100 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Scuro</span>
                  </button>
                </div>
              </div>

              {/* Balanced Editorial Headline */}
              <div className="space-y-3">
                <h1
                  style={{ textWrap: 'balance' }}
                  className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 font-display leading-[1.15]"
                >
                  Studio digitale privato per firmare, correggere e unire i tuoi PDF.
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
                  Applica firme da file <span className="font-mono text-slate-800 dark:text-slate-200">.BMP</span> e{' '}
                  <span className="font-mono text-slate-800 dark:text-slate-200">.PDF</span> con scontorno automatico dello sfondo bianco, modifica i testi esistenti nel documento, ruota, unisci ed estrai intervalli di pagine. Tutto resta salvato esclusivamente nella memoria del tuo browser.
                </p>
              </div>
            </div>

            {/* Bottom Hero Action Row */}
            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-600 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <FileUp className="w-4 h-4" />
                  <span>Carica Nuovo PDF</span>
                </button>
                <button
                  type="button"
                  onClick={onCreateSampleProject}
                  className="px-3.5 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  + Genera Contratto di Prova
                </button>
              </div>

              <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                <span>{projects.length} PDF in memoria</span>
                <span className="mx-1.5" aria-hidden="true">
                  ·
                </span>
                <span>{totalMb} MB</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Drag-and-Drop Stage */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const dropped = Array.from(e.dataTransfer.files);
                const sigs = dropped.filter((f) => /\.(bmp|dib|png|jpg|jpeg)$/i.test(f.name));
                const pdfs = dropped.filter((f) => /\.pdf$/i.test(f.name));
                if (sigs.length > 0) onUploadSignatureFiles(sigs);
                if (pdfs.length > 0) onUploadNewPdfFiles(pdfs);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`lg:col-span-6 rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
              isDraggingOver
                ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30'
                : 'border-slate-300 dark:border-slate-700 hover:border-blue-600 dark:hover:border-blue-500 bg-white dark:bg-slate-900'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center mb-4">
              <FileUp className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-display">
              Rilascia qui i tuoi documenti PDF da archiviare
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md leading-relaxed">
              I file vengono indicizzati localmente in <span className="font-mono">IndexedDB</span> e restano pronti all'uso anche se chiudi il browser. Puoi trascinare anche file firma <span className="font-mono">.BMP</span> o <span className="font-mono">.PDF</span>.
            </p>

            <div
              className="mt-6 flex flex-wrap items-center justify-center gap-2.5"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-xs font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sfoglia Documenti (.PDF)
              </button>
              <button
                type="button"
                onClick={() => sigInputRef.current?.click()}
                className="px-4 py-2 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/70 dark:border-blue-800/70 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Importa Firma (.BMP / .PDF)
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
                  onUploadNewPdfFiles(e.target.files);
                  e.target.value = '';
                }
              }}
            />
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
        </section>

        {/* Section 2: 4-Column Functional Tool Strip & Vault Metrics (Full-Width Row below Hero) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => handleQuickToolLaunch('sign')}
            className="text-left bg-white dark:bg-slate-900 hover:border-blue-600 dark:hover:border-blue-500 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span className="font-mono tabular-nums">01. Sottoscrizione</span>
              <PenTool className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Firma PDF & Scontorno Bianco
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
              {signatureAssets.length} firme in libreria · {totalSignaturesPlaced} applicate
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleQuickToolLaunch('text')}
            className="text-left bg-white dark:bg-slate-900 hover:border-amber-600 dark:hover:border-amber-500 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span className="font-mono tabular-nums">02. Correzione Vettoriale</span>
              <Type className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Modifica Testo PDF Esistente
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
              {totalTextsEdited} blocchi di testo editati · Rilevamento attivo
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleQuickToolLaunch('merge')}
            className="text-left bg-white dark:bg-slate-900 hover:border-blue-600 dark:hover:border-blue-500 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span className="font-mono tabular-nums">03. Assemblaggio</span>
              <FilePlus2 className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Unisci e Ruota Pagine PDF
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
              {totalPagesCount} pagine totali indicizzate · Rotazione ±90°
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleQuickToolLaunch('extract')}
            className="text-left bg-white dark:bg-slate-900 hover:border-blue-600 dark:hover:border-blue-500 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span className="font-mono tabular-nums">04. Divisione Range</span>
              <Scissors className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Estrai Pagine per Intervallo
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
              Esportazione selettiva (es. 1-3, 5) · Formato originale
            </p>
          </button>
        </section>

        {/* Section 3: Saved Documents Header, Search & Filter Bar */}
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4 flex-1 min-w-64">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display whitespace-nowrap">
                Archivio Documenti ({filteredProjects.length})
              </h2>

              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cerca documento per nome..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Segmented Filter */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {(
                  [
                    { id: 'all', label: 'Tutti' },
                    { id: 'modified', label: 'Firmati / Modificati' },
                    { id: 'unmodified', label: 'Originali' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      statusFilter === tab.id
                        ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {projects.length > 0 && (
                <div>
                  {!confirmClearAll ? (
                    <button
                      type="button"
                      onClick={() => setConfirmClearAll(true)}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Svuota Archivio
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onClearAllProjects();
                          setConfirmClearAll(false);
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md cursor-pointer"
                      >
                        Conferma Elimina Tutti
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClearAll(false)}
                        className="px-2 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
                      >
                        Annulla
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Document Cards Grid */}
          {filteredProjects.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
              <FolderOpen className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {projects.length === 0
                  ? 'Nessun documento PDF presente nella memoria locale'
                  : 'Nessun documento corrisponde ai filtri selezionati'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {projects.length === 0
                  ? 'Trascina un file PDF nel riquadro superiore oppure genera un documento dimostrativo per testare subito firma e modifica del testo.'
                  : 'Prova a cambiare i termini di ricerca o mostra "Tutti".'}
              </p>
              {projects.length === 0 && (
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-600 rounded-lg cursor-pointer"
                  >
                    Carica Primo PDF
                  </button>
                  <button
                    type="button"
                    onClick={onCreateSampleProject}
                    className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                  >
                    Genera PDF Dimostrativo
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((proj) => {
                const isCurrent = proj.id === activeProjectId;
                const sigCount = proj.placedSignatures?.length || 0;
                const txtCount = proj.textAnnotations?.length || 0;
                const pageCount = proj.pages?.length || 0;
                const sizeKb = Math.max(1, Math.round((proj.totalSizeBytes || 0) / 1024));
                const updatedStr = new Date(proj.updatedAt).toLocaleString('it-IT', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <article
                    key={proj.id}
                    className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all flex flex-col overflow-hidden ${
                      isCurrent
                        ? 'border-blue-600 dark:border-blue-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Large Document Cover Passepartout */}
                    <div
                      onClick={() => onOpenProject(proj, 'sign')}
                      className="h-56 bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-center relative cursor-pointer group overflow-hidden"
                    >
                      {proj.coverThumbnailDataUrl ? (
                        <img
                          src={proj.coverThumbnailDataUrl}
                          alt={proj.name}
                          referrerPolicy="no-referrer"
                          className="max-h-full w-auto object-contain bg-white shadow-sm rounded-xs group-hover:scale-[1.03] transition-transform duration-200"
                        />
                      ) : (
                        <div className="text-xs text-slate-400">Anteprima PDF</div>
                      )}

                      {/* Subtle Hover Open Action */}
                      <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors flex items-end justify-end p-3">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900/90 text-white text-xs font-medium shadow-sm">
                          <span>Apri nello Studio</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>

                    {/* Card Details & Actions */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-1.5">
                        {editingTitleId === proj.id ? (
                          <input
                            type="text"
                            autoFocus
                            value={editingTitleValue}
                            onChange={(e) => setEditingTitleValue(e.target.value)}
                            onBlur={() => {
                              if (editingTitleValue.trim()) {
                                onRenameProject(proj.id, editingTitleValue.trim());
                              }
                              setEditingTitleId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (editingTitleValue.trim()) {
                                  onRenameProject(proj.id, editingTitleValue.trim());
                                }
                                setEditingTitleId(null);
                              } else if (e.key === 'Escape') {
                                setEditingTitleId(null);
                              }
                            }}
                            className="w-full px-2 py-1 text-sm font-semibold bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-blue-600 rounded focus:outline-none"
                          />
                        ) : (
                          <h3
                            onClick={() => {
                              setEditingTitleId(proj.id);
                              setEditingTitleValue(proj.name);
                            }}
                            title="Clicca per rinominare il documento"
                            className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 font-display"
                          >
                            {proj.name}
                          </h3>
                        )}

                        {/* Clean Unboxed Metadata */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          <span>{pageCount} pag.</span>
                          <span aria-hidden="true">·</span>
                          <span>{sizeKb} KB</span>
                          <span aria-hidden="true">·</span>
                          <span>Modificato {updatedStr}</span>
                        </div>

                        {/* Activity Status */}
                        <div className="pt-1 text-xs">
                          {sigCount > 0 || txtCount > 0 ? (
                            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                              <span>{sigCount} firme applicate</span>
                              <span aria-hidden="true">·</span>
                              <span>{txtCount} testi modificati</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">
                              Documento integro (nessuna modifica applicata)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenProject(proj, 'sign')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-600 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                            <span>Firma</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenProject(proj, 'text')}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            title="Apri direttamente nello strumento Modifica Testo PDF"
                          >
                            <Type className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Modifica Testo</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => onExportProjectDirect(proj)}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-md transition-colors cursor-pointer"
                            title="Esporta e scarica PDF finale"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDuplicateProject(proj)}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                            title="Duplica documento in memoria"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteProject(proj.id)}
                            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-md transition-colors cursor-pointer"
                            title="Elimina definitivamente dalla memoria locale"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 4: Local Transparent Signatures Vault Preview */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
                La tua Libreria Firme Trasparenti ({signatureAssets.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Firme scontornate da file <span className="font-mono">.BMP</span> e <span className="font-mono">.PDF</span> pronte per essere incollate su qualsiasi documento.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => sigInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Carica Firma (.BMP / .PDF)</span>
              </button>
              <button
                type="button"
                onClick={onOpenDrawModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Disegna o Crea Timbro</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {signatureAssets.map((sig) => (
              <div
                key={sig.id}
                onClick={() => handleQuickToolLaunch('sign')}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                    {sig.name}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400 shrink-0 ml-2">
                    {sig.sourceFormat}
                  </span>
                </div>
                <div className="h-16 bg-checkerboard rounded-lg border border-slate-200/80 dark:border-slate-700 flex items-center justify-center p-2 overflow-hidden">
                  <img
                    src={sig.processedDataUrl}
                    alt={sig.name}
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
