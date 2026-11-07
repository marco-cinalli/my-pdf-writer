export type RotationAngle = 0 | 90 | 180 | 270;

export type InkColorMode = 'original' | 'blue' | 'black';

export type WorkspaceTab = 'sign' | 'text' | 'merge' | 'extract' | 'library';

export type AppViewMode = 'home' | 'editor';

export type PdfFontFamily = 'sans' | 'serif' | 'mono';

export interface PdfSourceFile {
  id: string;
  name: string;
  sizeBytes: number;
  pageCount: number;
  data: ArrayBuffer;
  addedAt: number;
}

export interface PageItem {
  id: string;
  sourcePdfId: string;
  sourceFileName: string;
  originalPageIndex: number; // 0-based index inside sourcePdfId
  widthPts: number;
  heightPts: number;
  baseRotation: number; // Rotation already present in original PDF
  addedRotation: RotationAngle; // User-applied rotation (0, 90, 180, 270)
  thumbnailDataUrl: string;
}

export interface SignatureAsset {
  id: string;
  name: string;
  sourceFormat: 'BMP' | 'PDF' | 'PNG' | 'DRAW' | 'STAMP';
  rawDataUrl: string; // Unprocessed image data URL
  processedDataUrl: string; // Transparent PNG data URL
  width: number;
  height: number;
  transparentWhite: boolean;
  threshold: number; // 1 to 100 (white tolerance sensitivity)
  inkColor: InkColorMode;
  autoCrop: boolean;
  createdAt: number;
}

export interface PlacedSignature {
  id: string;
  pageId: string;
  signatureAssetId: string;
  // Normalized 0..1 coordinates relative to the visible (rotated) page dimensions
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
  opacity: number; // 0.2 .. 1.0
}

/**
 * A text block automatically detected on the PDF page via pdf.js getTextContent()
 */
export interface DetectedPdfTextItem {
  id: string;
  text: string;
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
  fontSizePts: number;
  fontFamily: PdfFontFamily;
}

/**
 * A user-created or modified text annotation on a PDF page
 */
export interface PdfTextAnnotation {
  id: string;
  pageId: string;
  mode: 'replace' | 'add'; // 'replace' masks original PDF text; 'add' inserts new text box
  detectedItemId?: string; // If created by clicking an existing PDF text item
  originalText?: string;
  text: string;
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
  fontSizePts: number;
  fontFamily: PdfFontFamily;
  isBold: boolean;
  colorHex: string; // e.g. '#0F172A', '#1D4ED8', '#DC2626'
  maskBackground: boolean; // Whether to paint a solid rectangle underneath to cover original PDF text
  maskColorHex: string; // Default '#FFFFFF'
}

/**
 * Complete project stored persistently in local IndexedDB
 */
export interface SavedPdfProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  totalSizeBytes: number;
  coverThumbnailDataUrl: string;
  sources: PdfSourceFile[];
  pages: PageItem[];
  placedSignatures: PlacedSignature[];
  textAnnotations: PdfTextAnnotation[];
}
