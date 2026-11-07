import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Download,
  CheckCircle2,
  AlertCircle,
  FileUp,
} from 'lucide-react';
import {
  AppViewMode,
  DetectedPdfTextItem,
  InkColorMode,
  PageItem,
  PdfSourceFile,
  PdfTextAnnotation,
  PlacedSignature,
  RotationAngle,
  SavedPdfProject,
  SignatureAsset,
  WorkspaceTab,
} from './types/pdf';
import {
  compileFinalPdf,
  createBmpBlobFromDataUrl,
  createPdfSignatureBlob,
  createSampleSignatureDataUrl,
  decodeSignatureFile,
  generateSampleContractPdf,
  loadPdfDocumentPages,
  parsePageRangeString,
  processSignatureTransparency,
  renderRotatedThumbnail,
} from './utils/pdfEngine';
import {
  clearAllProjectsFromVault,
  deleteProjectFromVault,
  getAllSavedProjects,
  saveProjectToVault,
} from './utils/projectVault';
import { PageSidebar } from './components/PageSidebar';
import { PdfCanvasStage } from './components/PdfCanvasStage';
import { RightInspectorPanel } from './components/RightInspectorPanel';
import { SignatureDrawModal } from './components/SignatureDrawModal';
import { HomeVaultView } from './components/HomeVaultView';

const LOCAL_STORAGE_SIG_KEY = 'foliosign_saved_signatures_v1';
const LOCAL_STORAGE_THEME_KEY = 'foliosign_theme_v1';

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return true; // Default to architectural Slate Dark Mode as requested
    } catch {
      return true;
    }
  });

  const [viewMode, setViewMode] = useState<AppViewMode>('home');
  const [savedProjects, setSavedProjects] = useState<SavedPdfProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeProjectName, setActiveProjectName] = useState<string>('Documento PDF');
  const [activeProjectCreatedAt, setActiveProjectCreatedAt] = useState<number>(Date.now());

  const [sources, setSources] = useState<Map<string, PdfSourceFile>>(new Map());
  const [pages, setPages] = useState<PageItem[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);

  const [signatureAssets, setSignatureAssets] = useState<SignatureAsset[]>([]);
  const [activeSignatureAssetId, setActiveSignatureAssetId] = useState<string | null>(null);
  const [placedSignatures, setPlacedSignatures] = useState<PlacedSignature[]>([]);
  const [selectedPlacedId, setSelectedPlacedId] = useState<string | null>(null);

  // Text editing state
  const [textAnnotations, setTextAnnotations] = useState<PdfTextAnnotation[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('sign');
  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false);

  // Extract range state
  const [extractRangeInput, setExtractRangeInput] = useState('1-3');
  const [selectedExtractIndices, setSelectedExtractIndices] = useState<number[]>([0, 1, 2]);
  const [extractRangeError, setExtractRangeError] = useState<string | null>(null);

  // Global status toast & drag overlay
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isGlobalDragOver, setIsGlobalDragOver] = useState(false);

  const openNewPdfInputRef = useRef<HTMLInputElement>(null);

  // Sync `.dark` class on `<html>` and persist preference
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem(LOCAL_STORAGE_THEME_KEY, isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage error
    }
  }, [isDark]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3800);
  }, []);

  /**
   * Loads a SavedPdfProject into the active Editor state
   */
  const activateProjectInEditor = useCallback(
    (proj: SavedPdfProject, initialTab: WorkspaceTab = 'sign') => {
      const srcMap = new Map<string, PdfSourceFile>();
      for (const s of proj.sources) {
        srcMap.set(s.id, s);
      }
      setActiveProjectId(proj.id);
      setActiveProjectName(proj.name);
      setActiveProjectCreatedAt(proj.createdAt);
      setSources(srcMap);
      setPages(proj.pages);
      setPlacedSignatures(proj.placedSignatures || []);
      setTextAnnotations(proj.textAnnotations || []);
      setSelectedPlacedId(null);
      setSelectedTextId(null);

      if (proj.pages.length > 0) {
        setActivePageId(proj.pages[0].id);
        setExtractRangeInput(`1-${proj.pages.length}`);
        setSelectedExtractIndices(proj.pages.map((_, idx) => idx));
      }
      setActiveTab(initialTab);
      setViewMode('editor');
    },
    []
  );

  /**
   * Creates a sample 3-page project and saves it into IndexedDB
   */
  const createAndStoreSampleProject = useCallback(
    async (firstSigId?: string): Promise<SavedPdfProject> => {
      const sampleBytes = await generateSampleContractPdf();
      const sampleBuffer = new Uint8Array(sampleBytes).buffer;
      const sourceId = `src_demo_${Date.now()}`;
      const fileName = 'Modulo_Autorizzazione_Personale.pdf';
      const loadedPages = await loadPdfDocumentPages(sourceId, fileName, sampleBuffer);

      const srcEntry: PdfSourceFile = {
        id: sourceId,
        name: fileName,
        sizeBytes: sampleBuffer.byteLength,
        pageCount: loadedPages.length,
        data: sampleBuffer,
        addedAt: Date.now(),
      };

      const sigToUse = firstSigId || signatureAssets[0]?.id;
      const initialPlaced: PlacedSignature[] =
        sigToUse && loadedPages.length > 0
          ? [
              {
                id: `placed_init_${Date.now()}`,
                pageId: loadedPages[0].id,
                signatureAssetId: sigToUse,
                xRatio: 0.56,
                yRatio: 0.72,
                widthRatio: 0.3,
                heightRatio: 0.085,
                opacity: 1.0,
              },
            ]
          : [];

      const newProj: SavedPdfProject = {
        id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: fileName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalSizeBytes: sampleBuffer.byteLength,
        coverThumbnailDataUrl: loadedPages[0]?.thumbnailDataUrl || '',
        sources: [srcEntry],
        pages: loadedPages,
        placedSignatures: initialPlaced,
        textAnnotations: [],
      };

      await saveProjectToVault(newProj);
      return newProj;
    },
    [signatureAssets]
  );

  // Bootstrap Signatures & Persistent IndexedDB Projects on mount
  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        let loadedAssets: SignatureAsset[] = [];
        try {
          const savedRaw = localStorage.getItem(LOCAL_STORAGE_SIG_KEY);
          if (savedRaw) {
            const parsed = JSON.parse(savedRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              loadedAssets = parsed;
            }
          }
        } catch {
          // Ignore parse error
        }

        if (loadedAssets.length === 0) {
          const rawSampleSig = createSampleSignatureDataUrl('Marco Valeri');
          const processed = await processSignatureTransparency(rawSampleSig, {
            transparentWhite: true,
            threshold: 35,
            inkColor: 'original',
            autoCrop: true,
          });

          loadedAssets = [
            {
              id: 'sig_sample_default',
              name: 'Firma Marco Valeri.bmp',
              sourceFormat: 'BMP',
              rawDataUrl: rawSampleSig,
              processedDataUrl: processed.processedDataUrl,
              width: processed.width,
              height: processed.height,
              transparentWhite: true,
              threshold: 35,
              inkColor: 'original',
              autoCrop: true,
              createdAt: Date.now(),
            },
          ];
        }

        if (!mounted) return;
        setSignatureAssets(loadedAssets);
        setActiveSignatureAssetId(loadedAssets[0].id);

        let vaultProjects = await getAllSavedProjects();
        if (vaultProjects.length === 0) {
          const demoProj = await createAndStoreSampleProject(loadedAssets[0].id);
          vaultProjects = [demoProj];
        }

        if (!mounted) return;
        setSavedProjects(vaultProjects);

        if (vaultProjects[0]) {
          const first = vaultProjects[0];
          const srcMap = new Map<string, PdfSourceFile>();
          for (const s of first.sources) srcMap.set(s.id, s);
          setActiveProjectId(first.id);
          setActiveProjectName(first.name);
          setActiveProjectCreatedAt(first.createdAt);
          setSources(srcMap);
          setPages(first.pages);
          setPlacedSignatures(first.placedSignatures || []);
          setTextAnnotations(first.textAnnotations || []);
          if (first.pages.length > 0) {
            setActivePageId(first.pages[0].id);
            setExtractRangeInput(`1-${first.pages.length}`);
            setSelectedExtractIndices(first.pages.map((_, idx) => idx));
          }
        }
      } catch (err) {
        console.error('Errore avvio applicazione:', err);
      }
    }

    bootstrap();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save active project to IndexedDB whenever pages, signatures, text annotations, or name change
  useEffect(() => {
    if (!activeProjectId || pages.length === 0 || sources.size === 0) return;

    const timer = setTimeout(async () => {
      const srcArray = Array.from(sources.values());
      const totalBytes = srcArray.reduce((acc, s) => acc + s.sizeBytes, 0);
      const updatedProj: SavedPdfProject = {
        id: activeProjectId,
        name: activeProjectName,
        createdAt: activeProjectCreatedAt,
        updatedAt: Date.now(),
        totalSizeBytes: totalBytes,
        coverThumbnailDataUrl: pages[0]?.thumbnailDataUrl || '',
        sources: srcArray,
        pages,
        placedSignatures,
        textAnnotations,
      };

      await saveProjectToVault(updatedProj);
      setSavedProjects((prev) => {
        const exists = prev.some((p) => p.id === updatedProj.id);
        const list = exists
          ? prev.map((p) => (p.id === updatedProj.id ? updatedProj : p))
          : [updatedProj, ...prev];
        return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [
    activeProjectId,
    activeProjectName,
    activeProjectCreatedAt,
    sources,
    pages,
    placedSignatures,
    textAnnotations,
  ]);

  // Sync signature library to localStorage
  useEffect(() => {
    if (signatureAssets.length === 0) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_SIG_KEY, JSON.stringify(signatureAssets.slice(0, 8)));
    } catch {
      // Ignore quota errors
    }
  }, [signatureAssets]);

  // Keep extract range string & indices synchronized when page count changes
  useEffect(() => {
    if (pages.length === 0) return;
    const { indices, error } = parsePageRangeString(extractRangeInput, pages.length);
    if (!error) {
      setSelectedExtractIndices(indices);
      setExtractRangeError(null);
    } else {
      setExtractRangeError(error);
    }
  }, [extractRangeInput, pages.length]);

  /**
   * Uploads one or more PDF files from Home Page into IndexedDB and opens the latest one
   */
  const handleUploadNewPdfsToVault = async (
    fileList: FileList | File[],
    openImmediately = true
  ) => {
    const files = Array.from(fileList).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (files.length === 0) {
      showToast('Seleziona almeno un file PDF valido.', 'error');
      return;
    }

    try {
      let lastCreated: SavedPdfProject | null = null;
      const createdList: SavedPdfProject[] = [];

      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const sourceId = `src_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const docPages = await loadPdfDocumentPages(sourceId, file.name, buffer);

        const srcEntry: PdfSourceFile = {
          id: sourceId,
          name: file.name,
          sizeBytes: buffer.byteLength,
          pageCount: docPages.length,
          data: buffer,
          addedAt: Date.now(),
        };

        const newProj: SavedPdfProject = {
          id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          totalSizeBytes: buffer.byteLength,
          coverThumbnailDataUrl: docPages[0]?.thumbnailDataUrl || '',
          sources: [srcEntry],
          pages: docPages,
          placedSignatures: [],
          textAnnotations: [],
        };

        await saveProjectToVault(newProj);
        createdList.push(newProj);
        lastCreated = newProj;
      }

      const all = await getAllSavedProjects();
      setSavedProjects(all);

      if (openImmediately && lastCreated) {
        activateProjectInEditor(lastCreated, 'sign');
        showToast(
          `Documento "${lastCreated.name}" salvato in memoria locale e aperto nell'editor.`
        );
      } else {
        showToast(
          `${createdList.length} ${
            createdList.length === 1 ? 'documento salvato' : 'documenti salvati'
          } nella memoria locale.`
        );
      }
    } catch (err) {
      console.error(err);
      showToast('Impossibile leggere il file PDF selezionato.', 'error');
    }
  };

  /**
   * Appends/merges additional PDF files into the currently active project in Editor
   */
  const handleMergePdfFilesInEditor = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (files.length === 0) {
      showToast('Seleziona almeno un file PDF valido da unire.', 'error');
      return;
    }

    try {
      const newSources = new Map(sources);
      let newPages: PageItem[] = [...pages];

      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const sourceId = `src_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const docPages = await loadPdfDocumentPages(sourceId, file.name, buffer);

        newSources.set(sourceId, {
          id: sourceId,
          name: file.name,
          sizeBytes: buffer.byteLength,
          pageCount: docPages.length,
          data: buffer,
          addedAt: Date.now(),
        });

        newPages = [...newPages, ...docPages];
      }

      setSources(newSources);
      setPages(newPages);
      if (!activePageId && newPages.length > 0) {
        setActivePageId(newPages[0].id);
      }
      setExtractRangeInput(`1-${newPages.length}`);
      showToast(`Aggiunti ${files.length} PDF (${newPages.length} pagine totali).`);
    } catch (err) {
      console.error(err);
      showToast("Errore durante l'unione dei file PDF.", 'error');
    }
  };

  /**
   * Imports signature files (.BMP, .PDF, .PNG, .JPG), removes white background, and adds to library
   */
  const handleUploadSignatureFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    for (const file of files) {
      try {
        const { rawDataUrl, sourceFormat } = await decodeSignatureFile(file);
        const processed = await processSignatureTransparency(rawDataUrl, {
          transparentWhite: true,
          threshold: 35,
          inkColor: 'original',
          autoCrop: true,
        });

        const newAsset: SignatureAsset = {
          id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          sourceFormat,
          rawDataUrl,
          processedDataUrl: processed.processedDataUrl,
          width: processed.width,
          height: processed.height,
          transparentWhite: true,
          threshold: 35,
          inkColor: 'original',
          autoCrop: true,
          createdAt: Date.now(),
        };

        setSignatureAssets((prev) => [newAsset, ...prev]);
        setActiveSignatureAssetId(newAsset.id);
        showToast(
          `Firma "${file.name}" (${sourceFormat}) importata con sfondo bianco reso trasparente.`
        );
      } catch (err) {
        console.error(err);
        showToast(`Errore nel caricamento della firma "${file.name}".`, 'error');
      }
    }
  };

  /**
   * Updates white transparency / tolerance / ink color on a signature asset
   */
  const handleUpdateSignatureOptions = async (
    assetId: string,
    patch: Partial<{
      transparentWhite: boolean;
      threshold: number;
      inkColor: InkColorMode;
      autoCrop: boolean;
    }>
  ) => {
    const target = signatureAssets.find((a) => a.id === assetId);
    if (!target) return;

    const updatedOptions = {
      transparentWhite: patch.transparentWhite ?? target.transparentWhite,
      threshold: patch.threshold ?? target.threshold,
      inkColor: patch.inkColor ?? target.inkColor,
      autoCrop: patch.autoCrop ?? target.autoCrop,
    };

    try {
      const processed = await processSignatureTransparency(target.rawDataUrl, updatedOptions);
      setSignatureAssets((prev) =>
        prev.map((a) =>
          a.id === assetId
            ? {
                ...a,
                ...updatedOptions,
                processedDataUrl: processed.processedDataUrl,
                width: processed.width,
                height: processed.height,
              }
            : a
        )
      );
    } catch (err) {
      console.error('Errore elaborazione trasparenza firma:', err);
    }
  };

  /**
   * Places a signature on the currently active PDF page
   */
  const handlePlaceSignatureOnPage = (
    assetId: string,
    customXRatio?: number,
    customYRatio?: number
  ) => {
    if (!activePageId) return;
    const asset = signatureAssets.find((a) => a.id === assetId);
    if (!asset) return;

    const activePage = pages.find((p) => p.id === activePageId);
    const pageAspect = activePage ? activePage.widthPts / activePage.heightPts : 0.707;
    const sigAspect = Math.max(0.3, asset.width / Math.max(1, asset.height));

    const widthRatio = 0.28;
    const heightRatio = Math.min(0.25, Math.max(0.04, (widthRatio * pageAspect) / sigAspect));

    const xRatio =
      customXRatio !== undefined
        ? Math.max(0, Math.min(1 - widthRatio, customXRatio - widthRatio / 2))
        : 0.54;
    const yRatio =
      customYRatio !== undefined
        ? Math.max(0, Math.min(1 - heightRatio, customYRatio - heightRatio / 2))
        : 0.72;

    const newPlaced: PlacedSignature = {
      id: `placed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      pageId: activePageId,
      signatureAssetId: asset.id,
      xRatio,
      yRatio,
      widthRatio,
      heightRatio,
      opacity: 1.0,
    };

    setPlacedSignatures((prev) => [...prev, newPlaced]);
    setSelectedPlacedId(newPlaced.id);
    setSelectedTextId(null);
    showToast('Firma inserita nella pagina.');
  };

  /**
   * Creates an editable text replacement annotation when the user clicks an existing PDF text block
   */
  const handleCreateTextFromDetected = (det: DetectedPdfTextItem) => {
    if (!activePageId) return;
    const newAnnotation: PdfTextAnnotation = {
      id: `txt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      pageId: activePageId,
      mode: 'replace',
      detectedItemId: det.id,
      originalText: det.text,
      text: det.text,
      xRatio: det.xRatio,
      yRatio: det.yRatio,
      widthRatio: Math.min(1 - det.xRatio, Math.max(det.widthRatio * 1.12, 0.14)),
      heightRatio: Math.max(det.heightRatio, 0.02),
      fontSizePts: det.fontSizePts,
      fontFamily: det.fontFamily,
      isBold: false,
      colorHex: '#0F172A',
      maskBackground: true,
      maskColorHex: '#FFFFFF',
    };

    setTextAnnotations((prev) => [...prev, newAnnotation]);
    setSelectedTextId(newAnnotation.id);
    setSelectedPlacedId(null);
    setActiveTab('text');
  };

  /**
   * Creates a new free-form text box on the active page
   */
  const handleCreateFreeTextAt = (customXRatio?: number, customYRatio?: number) => {
    if (!activePageId) return;
    const widthRatio = 0.34;
    const heightRatio = 0.032;
    const xRatio =
      customXRatio !== undefined
        ? Math.max(0, Math.min(1 - widthRatio, customXRatio))
        : 0.12;
    const yRatio =
      customYRatio !== undefined
        ? Math.max(0, Math.min(1 - heightRatio, customYRatio))
        : 0.25;

    const newAnnotation: PdfTextAnnotation = {
      id: `txt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      pageId: activePageId,
      mode: 'add',
      text: 'Nuovo testo...',
      xRatio,
      yRatio,
      widthRatio,
      heightRatio,
      fontSizePts: 11,
      fontFamily: 'sans',
      isBold: false,
      colorHex: '#0F172A',
      maskBackground: false,
      maskColorHex: '#FFFFFF',
    };

    setTextAnnotations((prev) => [...prev, newAnnotation]);
    setSelectedTextId(newAnnotation.id);
    setSelectedPlacedId(null);
    setActiveTab('text');
  };

  /**
   * Rotates a single page by +90 or -90 degrees and updates its thumbnail
   */
  const handleRotatePage = async (pageId: string, delta: 90 | -90) => {
    const target = pages.find((p) => p.id === pageId);
    if (!target) return;
    const src = sources.get(target.sourcePdfId);
    if (!src) return;

    const newAddedRot = (((target.addedRotation + delta) % 360) + 360) % 360 as RotationAngle;
    const totalRot = (((target.baseRotation + newAddedRot) % 360) + 360) % 360;

    try {
      const { thumbnailDataUrl, widthPts, heightPts } = await renderRotatedThumbnail(
        src.data,
        target.originalPageIndex,
        totalRot
      );
      setPages((prev) =>
        prev.map((p) =>
          p.id === pageId
            ? {
                ...p,
                addedRotation: newAddedRot,
                thumbnailDataUrl,
                widthPts,
                heightPts,
              }
            : p
        )
      );
    } catch (err) {
      console.error('Errore rotazione pagina:', err);
    }
  };

  /**
   * Rotates all pages in the document
   */
  const handleRotateAllPages = async (delta: 90 | -90) => {
    const updated: PageItem[] = [];
    for (const p of pages) {
      const src = sources.get(p.sourcePdfId);
      if (!src) {
        updated.push(p);
        continue;
      }
      const newAddedRot = (((p.addedRotation + delta) % 360) + 360) % 360 as RotationAngle;
      const totalRot = (((p.baseRotation + newAddedRot) % 360) + 360) % 360;
      const { thumbnailDataUrl, widthPts, heightPts } = await renderRotatedThumbnail(
        src.data,
        p.originalPageIndex,
        totalRot
      );
      updated.push({
        ...p,
        addedRotation: newAddedRot,
        thumbnailDataUrl,
        widthPts,
        heightPts,
      });
    }
    setPages(updated);
    showToast('Tutte le pagine sono state ruotate di 90°.');
  };

  /**
   * Reorders a page up or down
   */
  const handleMovePage = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= pages.length) return;
    setPages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(targetIdx, 0, item);
      return copy;
    });
  };

  /**
   * Deletes a page from the document
   */
  const handleDeletePage = (pageId: string) => {
    if (pages.length <= 1) return;
    const idx = pages.findIndex((p) => p.id === pageId);
    const remaining = pages.filter((p) => p.id !== pageId);
    setPages(remaining);
    setPlacedSignatures((prev) => prev.filter((s) => s.pageId !== pageId));
    setTextAnnotations((prev) => prev.filter((t) => t.pageId !== pageId));
    if (activePageId === pageId && remaining.length > 0) {
      const nextIdx = Math.min(idx, remaining.length - 1);
      setActivePageId(remaining[nextIdx].id);
    }
    setExtractRangeInput(`1-${remaining.length}`);
  };

  /**
   * Exports either the complete signed/edited PDF or an extracted page range subset
   */
  const handleExportPdf = async (subsetIndices?: number[], customSuffix = 'Firmato') => {
    if (pages.length === 0) return;
    setIsExporting(true);
    try {
      const pdfBytes = await compileFinalPdf({
        sources,
        pages,
        placedSignatures,
        signatureAssets,
        textAnnotations,
        pageIndicesSubset: subsetIndices,
      });

      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const baseName = activeProjectName.replace(/\.pdf$/i, '') || 'Documento';

      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}_${customSuffix}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(`File "${baseName}_${customSuffix}.pdf" esportato con successo!`);
    } catch (err) {
      console.error('Errore esportazione PDF:', err);
      showToast('Errore durante la generazione del file PDF finale.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Exports a project directly from the Home Page Vault
   */
  const handleExportProjectDirect = async (proj: SavedPdfProject) => {
    setIsExporting(true);
    try {
      const srcMap = new Map<string, PdfSourceFile>();
      for (const s of proj.sources) srcMap.set(s.id, s);

      const pdfBytes = await compileFinalPdf({
        sources: srcMap,
        pages: proj.pages,
        placedSignatures: proj.placedSignatures || [],
        signatureAssets,
        textAnnotations: proj.textAnnotations || [],
      });

      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const baseName = proj.name.replace(/\.pdf$/i, '') || 'Documento';

      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}_Esportato.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(`Documento "${baseName}_Esportato.pdf" scaricato!`);
    } catch (err) {
      console.error(err);
      showToast("Errore durante l'esportazione del documento.", 'error');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Toggle a single page index in Extract Range mode
   */
  const handleToggleExtractIndex = (idx: number) => {
    const exists = selectedExtractIndices.includes(idx);
    const next = exists
      ? selectedExtractIndices.filter((i) => i !== idx)
      : [...selectedExtractIndices, idx].sort((a, b) => a - b);
    setSelectedExtractIndices(next);
    setExtractRangeInput(next.map((i) => i + 1).join(', '));
    setExtractRangeError(next.length === 0 ? 'Seleziona almeno una pagina.' : null);
  };

  /**
   * Range presets for Extract tab
   */
  const handleApplyRangePreset = (preset: 'all' | 'current' | 'odd' | 'even') => {
    if (pages.length === 0) return;
    if (preset === 'all') {
      setExtractRangeInput(`1-${pages.length}`);
    } else if (preset === 'current') {
      const curIdx = Math.max(
        0,
        pages.findIndex((p) => p.id === activePageId)
      );
      setExtractRangeInput(`${curIdx + 1}`);
    } else if (preset === 'odd') {
      const oddPages = pages
        .map((_, i) => i + 1)
        .filter((n) => n % 2 === 1)
        .join(', ');
      setExtractRangeInput(oddPages);
    } else if (preset === 'even') {
      const evenPages = pages
        .map((_, i) => i + 1)
        .filter((n) => n % 2 === 0)
        .join(', ');
      setExtractRangeInput(evenPages || '1');
    }
  };

  const activePageIndex = Math.max(
    0,
    pages.findIndex((p) => p.id === activePageId)
  );
  const activePage = pages[activePageIndex] || null;

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors"
      onDragOver={(e) => {
        e.preventDefault();
        setIsGlobalDragOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsGlobalDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsGlobalDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const dropped = Array.from(e.dataTransfer.files);
          const sigFiles = dropped.filter((f) =>
            /\.(bmp|dib|png|jpg|jpeg)$/i.test(f.name)
          );
          const pdfFiles = dropped.filter((f) => /\.pdf$/i.test(f.name));
          if (sigFiles.length > 0) {
            handleUploadSignatureFiles(sigFiles);
          }
          if (pdfFiles.length > 0) {
            if (viewMode === 'home') {
              handleUploadNewPdfsToVault(pdfFiles, false);
            } else {
              handleUploadNewPdfsToVault(pdfFiles, true);
            }
          }
        }
      }}
    >
      {/* Top Bar Contract: 3 Zones separated by gap-8 */}
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between gap-8 shrink-0 z-30 transition-colors">
        {/* Zone 1: Brand Wordmark (single text element, one line) */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            setViewMode('home');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap shrink-0 font-display"
        >
          FolioSign Studio
        </a>

        {/* Zone 2: 5 Concise Single-line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <a
            href="#archivio"
            onClick={(e) => {
              e.preventDefault();
              setViewMode('home');
            }}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 ${
              viewMode === 'home'
                ? 'text-blue-700 dark:text-blue-400 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Archivio PDF ({savedProjects.length})
          </a>
          <a
            href="#firma"
            onClick={(e) => {
              e.preventDefault();
              setViewMode('editor');
              setActiveTab('sign');
            }}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 ${
              viewMode === 'editor' && activeTab === 'sign'
                ? 'text-blue-700 dark:text-blue-400 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Firma PDF
          </a>
          <a
            href="#testo"
            onClick={(e) => {
              e.preventDefault();
              setViewMode('editor');
              setActiveTab('text');
            }}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 ${
              viewMode === 'editor' && activeTab === 'text'
                ? 'text-amber-700 dark:text-amber-400 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Modifica Testo
          </a>
          <a
            href="#unisci"
            onClick={(e) => {
              e.preventDefault();
              setViewMode('editor');
              setActiveTab('merge');
            }}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 ${
              viewMode === 'editor' && activeTab === 'merge'
                ? 'text-blue-700 dark:text-blue-400 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Unisci PDF
          </a>
          <a
            href="#estrai"
            onClick={(e) => {
              e.preventDefault();
              setViewMode('editor');
              setActiveTab('extract');
            }}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 ${
              viewMode === 'editor' && activeTab === 'extract'
                ? 'text-blue-700 dark:text-blue-400 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Estrai Pagine
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action Button */}
        <div className="flex items-center shrink-0">
          {viewMode === 'home' ? (
            <button
              type="button"
              onClick={() => openNewPdfInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-600 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>Carica PDF in Memoria</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isExporting || pages.length === 0}
              onClick={() => handleExportPdf(undefined, 'Firmato')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-600 disabled:opacity-50 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Esportazione...' : 'Esporta PDF Finale'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Hidden File Input for Top CTA */}
      <input
        ref={openNewPdfInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUploadNewPdfsToVault(e.target.files, true);
            e.target.value = '';
          }
        }}
      />

      {/* Main Content Area: Home Vault OR 3-Column Editor */}
      <main className="flex-1 flex overflow-hidden relative">
        {viewMode === 'home' ? (
          <HomeVaultView
            projects={savedProjects}
            activeProjectId={activeProjectId}
            signatureAssets={signatureAssets}
            isDark={isDark}
            onToggleTheme={setIsDark}
            onOpenProject={(proj, initialTab = 'sign') =>
              activateProjectInEditor(proj, initialTab)
            }
            onUploadNewPdfFiles={(files) => handleUploadNewPdfsToVault(files, false)}
            onUploadSignatureFiles={handleUploadSignatureFiles}
            onOpenDrawModal={() => setIsDrawModalOpen(true)}
            onExportProjectDirect={handleExportProjectDirect}
            onDuplicateProject={async (proj) => {
              const copy: SavedPdfProject = {
                ...proj,
                id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                name: `${proj.name.replace(/\.pdf$/i, '')} (Copia).pdf`,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                sources: proj.sources.map((s) => ({ ...s, data: s.data.slice(0) })),
              };
              await saveProjectToVault(copy);
              const all = await getAllSavedProjects();
              setSavedProjects(all);
              showToast(`Documento "${copy.name}" duplicato in memoria.`);
            }}
            onDeleteProject={async (projectId) => {
              await deleteProjectFromVault(projectId);
              const remaining = await getAllSavedProjects();
              setSavedProjects(remaining);
              if (activeProjectId === projectId) {
                if (remaining[0]) {
                  activateProjectInEditor(remaining[0], 'sign');
                  setViewMode('home');
                } else {
                  setActiveProjectId(null);
                  setPages([]);
                  setSources(new Map());
                }
              }
              showToast('Documento eliminato dalla memoria locale.');
            }}
            onRenameProject={async (projectId, newName) => {
              const target = savedProjects.find((p) => p.id === projectId);
              if (!target) return;
              const updated: SavedPdfProject = {
                ...target,
                name: newName,
                updatedAt: Date.now(),
              };
              await saveProjectToVault(updated);
              if (activeProjectId === projectId) {
                setActiveProjectName(newName);
              }
              const all = await getAllSavedProjects();
              setSavedProjects(all);
            }}
            onClearAllProjects={async () => {
              await clearAllProjectsFromVault();
              setSavedProjects([]);
              setActiveProjectId(null);
              setPages([]);
              setSources(new Map());
              showToast('Archivio locale svuotato.');
            }}
            onCreateSampleProject={async () => {
              const demo = await createAndStoreSampleProject();
              const all = await getAllSavedProjects();
              setSavedProjects(all);
              showToast(`Generato "${demo.name}" nella memoria locale.`);
            }}
          />
        ) : (
          <>
            {/* Left Page Thumbnails Sidebar */}
            <PageSidebar
              pages={pages}
              activePageId={activePageId}
              placedSignatures={placedSignatures}
              selectedExtractIndices={selectedExtractIndices}
              isExtractMode={activeTab === 'extract'}
              onSelectPage={(id) => {
                setActivePageId(id);
                setSelectedPlacedId(null);
                setSelectedTextId(null);
              }}
              onRotatePage={handleRotatePage}
              onRotateAllPages={handleRotateAllPages}
              onMovePage={handleMovePage}
              onDeletePage={handleDeletePage}
              onToggleExtractIndex={handleToggleExtractIndex}
              onAddPdfFiles={handleMergePdfFilesInEditor}
            />

            {/* Center Interactive PDF Viewport */}
            <PdfCanvasStage
              activePage={activePage}
              pageIndex={activePageIndex}
              totalPages={pages.length}
              sources={sources}
              placedSignatures={placedSignatures}
              signatureAssets={signatureAssets}
              selectedPlacedId={selectedPlacedId}
              activeSignatureAssetId={activeSignatureAssetId}
              isDark={isDark}
              onToggleTheme={setIsDark}
              onSelectPlaced={setSelectedPlacedId}
              onUpdatePlaced={(id, patch) => {
                setPlacedSignatures((prev) =>
                  prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
                );
              }}
              onDeletePlaced={(id) => {
                setPlacedSignatures((prev) => prev.filter((item) => item.id !== id));
                if (selectedPlacedId === id) setSelectedPlacedId(null);
              }}
              onDuplicatePlaced={(id) => {
                const orig = placedSignatures.find((item) => item.id === id);
                if (!orig) return;
                const copy: PlacedSignature = {
                  ...orig,
                  id: `placed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                  xRatio: Math.min(1 - orig.widthRatio, orig.xRatio + 0.03),
                  yRatio: Math.min(1 - orig.heightRatio, orig.yRatio + 0.03),
                };
                setPlacedSignatures((prev) => [...prev, copy]);
                setSelectedPlacedId(copy.id);
              }}
              onApplyPlacedToAllPages={(id) => {
                const orig = placedSignatures.find((item) => item.id === id);
                if (!orig) return;
                const additions: PlacedSignature[] = [];
                for (const p of pages) {
                  if (p.id === orig.pageId) continue;
                  additions.push({
                    ...orig,
                    id: `placed_${p.id}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                    pageId: p.id,
                  });
                }
                setPlacedSignatures((prev) => [...prev, ...additions]);
                showToast(
                  `Firma copiata nella stessa posizione su tutte le ${pages.length} pagine.`
                );
              }}
              onPlaceActiveSignatureAt={(xRatio, yRatio) => {
                if (activeSignatureAssetId) {
                  handlePlaceSignatureOnPage(activeSignatureAssetId, xRatio, yRatio);
                }
              }}
              isTextEditMode={activeTab === 'text'}
              onToggleTextEditMode={(enabled) => setActiveTab(enabled ? 'text' : 'sign')}
              textAnnotations={textAnnotations}
              selectedTextId={selectedTextId}
              onSelectTextAnnotation={setSelectedTextId}
              onCreateTextFromDetected={handleCreateTextFromDetected}
              onCreateFreeTextAt={handleCreateFreeTextAt}
              onUpdateTextAnnotation={(id, patch) => {
                setTextAnnotations((prev) =>
                  prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
                );
              }}
              onDeleteTextAnnotation={(id) => {
                setTextAnnotations((prev) => prev.filter((t) => t.id !== id));
                if (selectedTextId === id) setSelectedTextId(null);
              }}
              onRotateActivePage={(delta) => {
                if (activePageId) handleRotatePage(activePageId, delta);
              }}
              onNavigatePage={(delta) => {
                const nextIdx = activePageIndex + delta;
                if (nextIdx >= 0 && nextIdx < pages.length) {
                  setActivePageId(pages[nextIdx].id);
                  setSelectedPlacedId(null);
                  setSelectedTextId(null);
                }
              }}
              onDropFilesOnCanvas={(files) => {
                const arr = Array.from(files);
                const sigs = arr.filter((f) => /\.(bmp|dib|png|jpg|jpeg)$/i.test(f.name));
                const pdfs = arr.filter((f) => /\.pdf$/i.test(f.name));
                if (sigs.length > 0) handleUploadSignatureFiles(sigs);
                if (pdfs.length > 0) handleUploadNewPdfsToVault(pdfs, true);
              }}
            />

            {/* Right Contextual Inspector */}
            <RightInspectorPanel
              activeTab={activeTab}
              onChangeTab={setActiveTab}
              signatureAssets={signatureAssets}
              activeSignatureAssetId={activeSignatureAssetId}
              onSelectSignatureAsset={setActiveSignatureAssetId}
              onUploadSignatureFiles={handleUploadSignatureFiles}
              onUpdateSignatureOptions={handleUpdateSignatureOptions}
              onDeleteSignatureAsset={(id) => {
                setSignatureAssets((prev) => prev.filter((a) => a.id !== id));
                setPlacedSignatures((prev) => prev.filter((p) => p.signatureAssetId !== id));
                if (activeSignatureAssetId === id) {
                  const rem = signatureAssets.filter((a) => a.id !== id);
                  setActiveSignatureAssetId(rem[0]?.id || null);
                }
              }}
              onPlaceSignatureOnPage={(assetId) => handlePlaceSignatureOnPage(assetId)}
              onOpenDrawModal={() => setIsDrawModalOpen(true)}
              onDownloadSampleBmp={async () => {
                const rawUrl = createSampleSignatureDataUrl('Elena Rossini');
                const bmpBlob = await createBmpBlobFromDataUrl(rawUrl);
                const url = URL.createObjectURL(bmpBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'Firma_Esempio_Bianco.bmp';
                a.click();
                URL.revokeObjectURL(url);
                showToast('Scaricato "Firma_Esempio_Bianco.bmp". Trascinalo nel riquadro firma!');
              }}
              onDownloadSamplePdfSig={async () => {
                const rawUrl = createSampleSignatureDataUrl('Elena Rossini');
                const pdfBlob = await createPdfSignatureBlob(rawUrl);
                const url = URL.createObjectURL(pdfBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'Firma_Vettoriale_Esempio.pdf';
                a.click();
                URL.revokeObjectURL(url);
                showToast(
                  'Scaricato "Firma_Vettoriale_Esempio.pdf". Trascinalo nel riquadro firma!'
                );
              }}
              activePageId={activePageId}
              textAnnotations={textAnnotations}
              selectedTextId={selectedTextId}
              onSelectTextAnnotation={setSelectedTextId}
              onCreateFreeText={() => handleCreateFreeTextAt()}
              onUpdateTextAnnotation={(id, patch) => {
                setTextAnnotations((prev) =>
                  prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
                );
              }}
              onDeleteTextAnnotation={(id) => {
                setTextAnnotations((prev) => prev.filter((t) => t.id !== id));
                if (selectedTextId === id) setSelectedTextId(null);
              }}
              sources={sources}
              pages={pages}
              onAddPdfFiles={handleMergePdfFilesInEditor}
              extractRangeInput={extractRangeInput}
              onChangeExtractRangeInput={setExtractRangeInput}
              selectedExtractIndices={selectedExtractIndices}
              extractRangeError={extractRangeError}
              onApplyRangePreset={handleApplyRangePreset}
              onExportExtractedPages={() =>
                handleExportPdf(
                  selectedExtractIndices,
                  `Estratto_${extractRangeInput.replace(/\s+/g, '')}`
                )
              }
              isExporting={isExporting}
            />
          </>
        )}

        {/* Global Drag-and-Drop Overlay */}
        {isGlobalDragOver && (
          <div className="pointer-events-none absolute inset-0 z-40 bg-blue-900/30 backdrop-blur-[2px] flex items-center justify-center p-8">
            <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-blue-600 dark:border-blue-500 rounded-2xl px-10 py-8 shadow-xl text-center max-w-md">
              <FileUp className="w-10 h-10 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
              <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                Rilascia i file per salvarli in memoria locale
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Rilascia un documento <span className="font-mono font-semibold">.PDF</span> per archiviarlo, oppure una firma <span className="font-mono font-semibold">.BMP / .PDF</span> per rimuovere lo sfondo bianco.
              </p>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toast && (
          <div className="fixed bottom-11 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg border bg-slate-900 dark:bg-slate-800 text-white border-slate-700 text-xs font-medium">
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        )}
      </main>

      {/* Freehand Draw / Date Stamp Modal */}
      <SignatureDrawModal
        isOpen={isDrawModalOpen}
        onClose={() => setIsDrawModalOpen(false)}
        onSaveSignature={async (rawDataUrl, name, format) => {
          const processed = await processSignatureTransparency(rawDataUrl, {
            transparentWhite: true,
            threshold: 35,
            inkColor: 'original',
            autoCrop: true,
          });
          const newAsset: SignatureAsset = {
            id: `sig_${Date.now()}`,
            name,
            sourceFormat: format,
            rawDataUrl,
            processedDataUrl: processed.processedDataUrl,
            width: processed.width,
            height: processed.height,
            transparentWhite: true,
            threshold: 35,
            inkColor: 'original',
            autoCrop: true,
            createdAt: Date.now(),
          };
          setSignatureAssets((prev) => [newAsset, ...prev]);
          setActiveSignatureAssetId(newAsset.id);
          if (viewMode === 'editor') {
            handlePlaceSignatureOnPage(newAsset.id);
          } else {
            showToast(`Firma "${name}" salvata nella tua libreria firme.`);
          }
        }}
      />
    </div>
  );
}
