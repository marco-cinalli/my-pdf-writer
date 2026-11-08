import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { PDFDocument, rgb, StandardFonts, degrees, PDFFont } from 'pdf-lib';
import {
  DetectedPdfTextItem,
  InkColorMode,
  PageItem,
  PdfFontFamily,
  PdfSourceFile,
  PdfTextAnnotation,
  PlacedSignature,
  SignatureAsset,
} from '../types/pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * Loads a PDF ArrayBuffer and generates page metadata + thumbnails
 */
export async function loadPdfDocumentPages(
  sourceId: string,
  fileName: string,
  buffer: ArrayBuffer
): Promise<PageItem[]> {
  const bufferCopy = buffer.slice(0);
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bufferCopy) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const items: PageItem[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const baseRotation = page.rotate || 0;
    const viewportPts = page.getViewport({ scale: 1.0, rotation: baseRotation });

    const thumbScale = Math.min(1.0, 240 / Math.max(viewportPts.width, 1));
    const thumbViewport = page.getViewport({ scale: thumbScale, rotation: baseRotation });

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(thumbViewport.width);
    canvas.height = Math.ceil(thumbViewport.height);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport: thumbViewport,
    }).promise;

    items.push({
      id: `${sourceId}_p${i}_${Math.random().toString(36).slice(2, 7)}`,
      sourcePdfId: sourceId,
      sourceFileName: fileName,
      originalPageIndex: i - 1,
      widthPts: viewportPts.width,
      heightPts: viewportPts.height,
      baseRotation,
      addedRotation: 0,
      thumbnailDataUrl: canvas.toDataURL('image/jpeg', 0.82),
    });
  }

  return items;
}

/**
 * Re-renders a thumbnail when user rotates a page
 */
export async function renderRotatedThumbnail(
  buffer: ArrayBuffer,
  originalPageIndex: number,
  totalRotation: number
): Promise<{ thumbnailDataUrl: string; widthPts: number; heightPts: number }> {
  const bufferCopy = buffer.slice(0);
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bufferCopy) });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(originalPageIndex + 1);

  const normalizedRot = ((totalRotation % 360) + 360) % 360;
  const viewportPts = page.getViewport({ scale: 1.0, rotation: normalizedRot });
  const thumbScale = Math.min(1.0, 240 / Math.max(viewportPts.width, 1));
  const thumbViewport = page.getViewport({ scale: thumbScale, rotation: normalizedRot });

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(thumbViewport.width);
  canvas.height = Math.ceil(thumbViewport.height);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport: thumbViewport,
  }).promise;

  return {
    thumbnailDataUrl: canvas.toDataURL('image/jpeg', 0.82),
    widthPts: viewportPts.width,
    heightPts: viewportPts.height,
  };
}

/**
 * Renders a PDF page onto the main interactive canvas
 */
export async function renderPdfPageToCanvas(
  buffer: ArrayBuffer,
  originalPageIndex: number,
  totalRotation: number,
  scale: number,
  canvas: HTMLCanvasElement
): Promise<{ cssWidth: number; cssHeight: number }> {
  const bufferCopy = buffer.slice(0);
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bufferCopy) });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(originalPageIndex + 1);

  const normalizedRot = ((totalRotation % 360) + 360) % 360;
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const cssViewport = page.getViewport({ scale, rotation: normalizedRot });
  const renderViewport = page.getViewport({ scale: scale * dpr, rotation: normalizedRot });

  canvas.width = Math.floor(renderViewport.width);
  canvas.height = Math.floor(renderViewport.height);
  canvas.style.width = `${Math.floor(cssViewport.width)}px`;
  canvas.style.height = `${Math.floor(cssViewport.height)}px`;

  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport: renderViewport,
  }).promise;

  return {
    cssWidth: Math.floor(cssViewport.width),
    cssHeight: Math.floor(cssViewport.height),
  };
}

/**
 * Extracts clickable text blocks from a PDF page using pdf.js getTextContent()
 * so the user can click any existing text on the PDF to edit/replace it.
 */
export async function extractPageTextItems(
  buffer: ArrayBuffer,
  originalPageIndex: number,
  totalRotation: number
): Promise<DetectedPdfTextItem[]> {
  try {
    const bufferCopy = buffer.slice(0);
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bufferCopy) });
    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(originalPageIndex + 1);

    const normalizedRot = ((totalRotation % 360) + 360) % 360;
    const viewport = page.getViewport({ scale: 1.0, rotation: normalizedRot });
    const textContent = await page.getTextContent();

    const rawBlocks: {
      text: string;
      x: number;
      y: number;
      width: number;
      height: number;
      fontSize: number;
      fontFamily: PdfFontFamily;
    }[] = [];

    for (const item of textContent.items) {
      if (!('str' in item)) continue;
      const textStr = item.str.trim();
      if (!textStr) continue;

      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
      const fontHeight = Math.hypot(tx[2], tx[3]) || Math.hypot(tx[0], tx[1]) || 11;
      const itemWidth = Math.max(item.width || textStr.length * (fontHeight * 0.52), 8);

      const left = tx[4];
      const top = tx[5] - fontHeight * 0.88;
      const height = fontHeight * 1.2;

      const rawFont = (item.fontName || '').toLowerCase();
      const fontFamily: PdfFontFamily =
        rawFont.includes('times') || rawFont.includes('serif')
          ? 'serif'
          : rawFont.includes('courier') || rawFont.includes('mono')
          ? 'mono'
          : 'sans';

      rawBlocks.push({
        text: item.str,
        x: left,
        y: top,
        width: itemWidth,
        height,
        fontSize: Math.max(7, Math.min(42, Math.round(fontHeight * 10) / 10)),
        fontFamily,
      });
    }

    const merged: typeof rawBlocks = [];
    for (const block of rawBlocks) {
      const prev = merged[merged.length - 1];
      if (
        prev &&
        Math.abs(prev.y - block.y) < prev.fontSize * 0.45 &&
        block.x >= prev.x &&
        block.x - (prev.x + prev.width) < prev.fontSize * 1.6
      ) {
        const needsSpace =
          !prev.text.endsWith(' ') &&
          !block.text.startsWith(' ') &&
          block.x - (prev.x + prev.width) > prev.fontSize * 0.18;
        prev.text = `${prev.text}${needsSpace ? ' ' : ''}${block.text}`;
        prev.width = Math.max(prev.width, block.x + block.width - prev.x);
        prev.height = Math.max(prev.height, block.height);
      } else {
        merged.push({ ...block });
      }
    }

    const vw = Math.max(1, viewport.width);
    const vh = Math.max(1, viewport.height);

    return merged.map((b, idx) => ({
      id: `det_p${originalPageIndex}_${idx}`,
      text: b.text.trim(),
      xRatio: Math.max(0, Math.min(0.98, b.x / vw)),
      yRatio: Math.max(0, Math.min(0.98, b.y / vh)),
      widthRatio: Math.max(0.02, Math.min(1 - b.x / vw, (b.width + 6) / vw)),
      heightRatio: Math.max(0.014, Math.min(0.25, b.height / vh)),
      fontSizePts: b.fontSize,
      fontFamily: b.fontFamily,
    }));
  } catch (err) {
    console.error('Error extracting PDF text:', err);
    return [];
  }
}

/**
 * Decodes a signature file (.bmp, .pdf, .png, .jpg) into a raw data URL
 */
export async function decodeSignatureFile(
  file: File
): Promise<{ rawDataUrl: string; sourceFormat: 'BMP' | 'PDF' | 'PNG' }> {
  const lowerName = file.name.toLowerCase();
  const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
  const isBmp =
    file.type === 'image/bmp' ||
    file.type === 'image/x-bmp' ||
    lowerName.endsWith('.bmp') ||
    lowerName.endsWith('.dib');

  if (isPdf) {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 2.5 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    return {
      rawDataUrl: canvas.toDataURL('image/png'),
      sourceFormat: 'PDF',
    };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(objectUrl);
    const canvas = document.createElement('canvas');
    const maxDim = 1600;
    let w = img.naturalWidth || img.width || 400;
    let h = img.naturalHeight || img.height || 200;
    if (w > maxDim || h > maxDim) {
      const ratio = Math.min(maxDim / w, maxDim / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, w, h);

    return {
      rawDataUrl: canvas.toDataURL('image/png'),
      sourceFormat: isBmp ? 'BMP' : 'PNG',
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Unable to decode signature image file.'));
    img.src = src;
  });
}

/**
 * Processes a raw signature image to remove white background (make white transparent),
 * apply optional ink recoloring, and auto-crop empty space around the signature.
 */
export async function processSignatureTransparency(
  rawDataUrl: string,
  options: {
    transparentWhite: boolean;
    threshold: number;
    inkColor: InkColorMode;
    autoCrop: boolean;
  }
): Promise<{ processedDataUrl: string; width: number; height: number }> {
  const img = await loadImageElement(rawDataUrl);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const cutoff = 255 - Math.round((options.threshold / 100) * 145);
  const featherRange = 22;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    let a = data[i + 3];

    if (a === 0) continue;

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (options.transparentWhite) {
      if (lum >= cutoff) {
        a = 0;
      } else if (lum >= cutoff - featherRange) {
        const factor = (cutoff - lum) / featherRange;
        a = Math.round(a * Math.max(0, Math.min(1, factor)));
      }
    }

    if (a > 0 && options.inkColor !== 'original') {
      const darkness = Math.max(0.15, 1 - lum / 255);
      if (options.inkColor === 'blue') {
        data[i] = Math.round(20 * darkness);
        data[i + 1] = Math.round(54 * darkness);
        data[i + 2] = Math.round(158 * (0.65 + 0.35 * darkness));
      } else if (options.inkColor === 'black') {
        data[i] = Math.round(15 * (1 - darkness * 0.7));
        data[i + 1] = Math.round(23 * (1 - darkness * 0.7));
        data[i + 2] = Math.round(42 * (1 - darkness * 0.7));
      }
      if (options.transparentWhite) {
        a = Math.min(255, Math.round(a * 1.15));
      }
    }

    data[i + 3] = a;
  }

  ctx.putImageData(imageData, 0, 0);

  if (options.autoCrop) {
    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    let foundPixel = false;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const alpha = data[idx + 3];
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        const isInk = options.transparentWhite ? alpha > 20 : alpha > 20 && lum < 245;
        if (isInk) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
          foundPixel = true;
        }
      }
    }

    if (foundPixel && maxX >= minX && maxY >= minY) {
      const pad = 10;
      const cropX = Math.max(0, minX - pad);
      const cropY = Math.max(0, minY - pad);
      const cropW = Math.min(w - cropX, maxX - minX + 1 + pad * 2);
      const cropH = Math.min(h - cropY, maxY - minY + 1 + pad * 2);

      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = cropW;
      croppedCanvas.height = cropH;
      const croppedCtx = croppedCanvas.getContext('2d')!;
      croppedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      return {
        processedDataUrl: croppedCanvas.toDataURL('image/png'),
        width: cropW,
        height: cropH,
      };
    }
  }

  return {
    processedDataUrl: canvas.toDataURL('image/png'),
    width: w,
    height: h,
  };
}

function parseHexToRgb(hex: string) {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return rgb(0.06, 0.09, 0.16);
  const r = Number.parseInt(clean.slice(0, 2), 16) / 255;
  const g = Number.parseInt(clean.slice(2, 4), 16) / 255;
  const b = Number.parseInt(clean.slice(4, 6), 16) / 255;
  return rgb(
    Number.isNaN(r) ? 0 : r,
    Number.isNaN(g) ? 0 : g,
    Number.isNaN(b) ? 0 : b
  );
}

function sanitizePdfText(input: string): string {
  return input
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013|\u2014/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '');
}

/**
 * Compiles the final PDF preserving original vector structure, applying rotations,
 * merging multiple PDF sources, extracting optional page subsets, writing edited/added
 * vector text annotations, and embedding transparent PNG signatures.
 */
export async function compileFinalPdf(params: {
  sources: Map<string, PdfSourceFile>;
  pages: PageItem[];
  placedSignatures: PlacedSignature[];
  signatureAssets: SignatureAsset[];
  textAnnotations?: PdfTextAnnotation[];
  pageIndicesSubset?: number[];
}): Promise<Uint8Array> {
  const {
    sources,
    pages,
    placedSignatures,
    signatureAssets,
    textAnnotations = [],
    pageIndicesSubset,
  } = params;

  const outPdf = await PDFDocument.create();

  const fontMap: Record<string, PDFFont> = {
    'sans-normal': await outPdf.embedFont(StandardFonts.Helvetica),
    'sans-bold': await outPdf.embedFont(StandardFonts.HelveticaBold),
    'serif-normal': await outPdf.embedFont(StandardFonts.TimesRoman),
    'serif-bold': await outPdf.embedFont(StandardFonts.TimesRomanBold),
    'mono-normal': await outPdf.embedFont(StandardFonts.Courier),
    'mono-bold': await outPdf.embedFont(StandardFonts.CourierBold),
  };

  const loadedSourceDocs = new Map<string, PDFDocument>();
  for (const [sourceId, srcFile] of sources.entries()) {
    const doc = await PDFDocument.load(srcFile.data.slice(0), { ignoreEncryption: true });
    loadedSourceDocs.set(sourceId, doc);
  }

  const embeddedImages = new Map<string, Awaited<ReturnType<PDFDocument['embedPng']>>>();

  const targetPages = pageIndicesSubset
    ? pageIndicesSubset.map((idx) => pages[idx]).filter(Boolean)
    : pages;

  for (const pageItem of targetPages) {
    const srcDoc = loadedSourceDocs.get(pageItem.sourcePdfId);
    if (!srcDoc) continue;

    const [copiedPage] = await outPdf.copyPages(srcDoc, [pageItem.originalPageIndex]);
    const totalRot = (((pageItem.baseRotation + pageItem.addedRotation) % 360) + 360) % 360;
    copiedPage.setRotation(degrees(totalRot));

    outPdf.addPage(copiedPage);

    const { width: rawW, height: rawH } = copiedPage.getSize();
    const isSwapped = totalRot === 90 || totalRot === 270;
    const visW = isSwapped ? rawH : rawW;
    const visH = isSwapped ? rawW : rawH;

    // 1. Render Text Annotations
    const textsForPage = textAnnotations.filter((t) => t.pageId === pageItem.id);
    for (const txt of textsForPage) {
      const boxW = txt.widthRatio * visW;
      const boxH = txt.heightRatio * visH;
      const visX = txt.xRatio * visW;
      const visYTop = txt.yRatio * visH;
      const visYBottom = visH - visYTop - boxH;

      const fontKey = `${txt.fontFamily}-${txt.isBold ? 'bold' : 'normal'}`;
      const pdfFont = fontMap[fontKey] || fontMap['sans-normal'];
      const textColor = parseHexToRgb(txt.colorHex);
      const maskColor = parseHexToRgb(txt.maskColorHex || '#FFFFFF');

      if (txt.maskBackground) {
        const pad = 1.5;
        if (totalRot === 0) {
          copiedPage.drawRectangle({
            x: Math.max(0, visX - pad),
            y: Math.max(0, visYBottom - pad),
            width: boxW + pad * 2,
            height: boxH + pad * 2,
            color: maskColor,
          });
        } else if (totalRot === 90) {
          copiedPage.drawRectangle({
            x: visYTop + boxH + pad,
            y: Math.max(0, visX - pad),
            width: boxW + pad * 2,
            height: boxH + pad * 2,
            rotate: degrees(90),
            color: maskColor,
          });
        } else if (totalRot === 180) {
          copiedPage.drawRectangle({
            x: rawW - visX + pad,
            y: rawH - visYBottom + pad,
            width: boxW + pad * 2,
            height: boxH + pad * 2,
            rotate: degrees(180),
            color: maskColor,
          });
        } else if (totalRot === 270) {
          copiedPage.drawRectangle({
            x: rawW - visYTop - boxH - pad,
            y: rawH - visX + pad,
            width: boxW + pad * 2,
            height: boxH + pad * 2,
            rotate: degrees(270),
            color: maskColor,
          });
        }
      }

      const cleanedText = sanitizePdfText(txt.text);
      if (cleanedText.trim().length > 0) {
        const lines = cleanedText.split('\n');
        const fontSize = Math.max(6, txt.fontSizePts || 11);
        const lineHeight = fontSize * 1.22;

        lines.forEach((lineStr, lineIdx) => {
          if (!lineStr) return;
          const lineOffsetFromTop = fontSize * 0.86 + lineIdx * lineHeight;
          const lineVisYBottom = visH - (visYTop + lineOffsetFromTop);

          if (totalRot === 0) {
            copiedPage.drawText(lineStr, {
              x: visX,
              y: lineVisYBottom,
              size: fontSize,
              font: pdfFont,
              color: textColor,
            });
          } else if (totalRot === 90) {
            copiedPage.drawText(lineStr, {
              x: visYTop + lineOffsetFromTop,
              y: visX,
              size: fontSize,
              font: pdfFont,
              color: textColor,
              rotate: degrees(90),
            });
          } else if (totalRot === 180) {
            copiedPage.drawText(lineStr, {
              x: rawW - visX,
              y: rawH - lineVisYBottom,
              size: fontSize,
              font: pdfFont,
              color: textColor,
              rotate: degrees(180),
            });
          } else if (totalRot === 270) {
            copiedPage.drawText(lineStr, {
              x: rawW - (visYTop + lineOffsetFromTop),
              y: rawH - visX,
              size: fontSize,
              font: pdfFont,
              color: textColor,
              rotate: degrees(270),
            });
          }
        });
      }
    }

    // 2. Render Placed Signatures
    const sigsForPage = placedSignatures.filter((s) => s.pageId === pageItem.id);
    for (const placed of sigsForPage) {
      const asset = signatureAssets.find((a) => a.id === placed.signatureAssetId);
      if (!asset) continue;

      let pngImage = embeddedImages.get(asset.id);
      if (!pngImage) {
        pngImage = await outPdf.embedPng(asset.processedDataUrl);
        embeddedImages.set(asset.id, pngImage);
      }

      const boxW = placed.widthRatio * visW;
      const boxH = placed.heightRatio * visH;
      const visX = placed.xRatio * visW;
      const visYTop = placed.yRatio * visH;
      const visYBottom = visH - visYTop - boxH;

      if (totalRot === 0) {
        copiedPage.drawImage(pngImage, {
          x: visX,
          y: visYBottom,
          width: boxW,
          height: boxH,
          opacity: placed.opacity,
        });
      } else if (totalRot === 90) {
        copiedPage.drawImage(pngImage, {
          x: visYTop + boxH,
          y: visX,
          width: boxW,
          height: boxH,
          rotate: degrees(90),
          opacity: placed.opacity,
        });
      } else if (totalRot === 180) {
        copiedPage.drawImage(pngImage, {
          x: rawW - visX,
          y: rawH - visYBottom,
          width: boxW,
          height: boxH,
          rotate: degrees(180),
          opacity: placed.opacity,
        });
      } else if (totalRot === 270) {
        copiedPage.drawImage(pngImage, {
          x: rawW - visYTop - boxH,
          y: rawH - visX,
          width: boxW,
          height: boxH,
          rotate: degrees(270),
          opacity: placed.opacity,
        });
      }
    }
  }

  return await outPdf.save();
}

/**
 * Parses a page range string like "1-3, 5, 7-8" into 0-based indices
 */
export function parsePageRangeString(
  input: string,
  maxPages: number
): { indices: number[]; error: string | null } {
  const cleaned = input.trim();
  if (!cleaned) {
    return { indices: [], error: 'Enter a page range (e.g. 1-2, 4).' };
  }

  const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
  const indexSet = new Set<number>();

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map((s) => s.trim());
      const start = Number.parseInt(startStr, 10);
      const end = Number.parseInt(endStr, 10);

      if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        start < 1 ||
        end > maxPages ||
        start > end
      ) {
        return {
          indices: [],
          error: `Invalid range "${part}" (document has ${maxPages} pages).`,
        };
      }
      for (let p = start; p <= end; p++) {
        indexSet.add(p - 1);
      }
    } else {
      const pageNum = Number.parseInt(part, 10);
      if (Number.isNaN(pageNum) || pageNum < 1 || pageNum > maxPages) {
        return {
          indices: [],
          error: `Page "${part}" is out of bounds (1–${maxPages}).`,
        };
      }
      indexSet.add(pageNum - 1);
    }
  }

  return {
    indices: Array.from(indexSet).sort((a, b) => a - b),
    error: null,
  };
}

/**
 * Generates a realistic 3-page sample PDF document in English so users can immediately test
 * signing, text editing, rotating, merging, and extracting page ranges.
 */
export async function generateSampleContractPdf(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageTitles = [
    'PERSONAL AUTHORIZATION & SERVICE AGREEMENT',
    'GENERAL TERMS & PRIVACY COMPLIANCE STATEMENT',
    'TECHNICAL SCHEDULE & FINAL SIGNATURE ACKNOWLEDGMENT',
  ];

  for (let p = 0; p < 3; p++) {
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    page.drawText('FOLIOSIGN STUDIO — LOCAL INTERACTIVE SAMPLE DOCUMENT', {
      x: 50,
      y: height - 48,
      size: 9,
      font: fontBold,
      color: rgb(0.35, 0.42, 0.52),
    });

    page.drawText(`Page ${p + 1} of 3`, {
      x: width - 105,
      y: height - 48,
      size: 9,
      font: fontRegular,
      color: rgb(0.35, 0.42, 0.52),
    });

    page.drawLine({
      start: { x: 50, y: height - 58 },
      end: { x: width - 50, y: height - 58 },
      thickness: 1,
      color: rgb(0.82, 0.85, 0.9),
    });

    page.drawText(pageTitles[p], {
      x: 50,
      y: height - 95,
      size: 15,
      font: fontBold,
      color: rgb(0.06, 0.09, 0.16),
    });

    page.drawText(
      `Reference No. FS-2026-0${p + 1}84   |   Date: ${new Date().toLocaleDateString('en-US')}   |   Signatory: Alex Morgan`,
      {
        x: 50,
        y: height - 118,
        size: 9.5,
        font: fontRegular,
        color: rgb(0.3, 0.35, 0.45),
      }
    );

    const paragraphs = [
      '1. Purpose of Agreement: This document demonstrates local graphical signature placement',
      'using FolioSign Studio, ensuring that the original vector layout, typography, and page',
      'dimensions remain completely unaltered when exporting the final signed PDF file.',
      '',
      '2. PDF Text Editing & Local Vault: Switch to the "Edit PDF Text" tool to click on any line',
      'of text in this document (such as the signatory name, reference number, or city) to edit',
      'it inline, or insert new custom text boxes anywhere on the page.',
      '',
      '3. Quick Start Guide:',
      '   - Upload a .BMP or .PDF signature file in the right panel (white background becomes transparent).',
      '   - Click "Edit PDF Text" to modify existing text blocks or add new vector annotations.',
      '   - All changes are automatically saved in your local browser vault on the Home Page.',
    ];

    let curY = height - 165;
    for (const line of paragraphs) {
      page.drawText(line, {
        x: 50,
        y: curY,
        size: 10.5,
        font:
          line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.')
            ? fontBold
            : fontRegular,
        color: rgb(0.15, 0.2, 0.28),
      });
      curY -= 19;
    }

    page.drawRectangle({
      x: 50,
      y: height - 510,
      width: width - 100,
      height: 95,
      borderColor: rgb(0.8, 0.84, 0.9),
      borderWidth: 1,
      color: rgb(0.97, 0.98, 0.99),
    });

    page.drawText('DECLARATION OF COMPLIANCE & EXPRESS APPROVAL', {
      x: 66,
      y: height - 438,
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });

    page.drawText(
      'The undersigned hereby confirms having reviewed the entire document and approves all terms',
      {
        x: 66,
        y: height - 460,
        size: 9.5,
        font: fontRegular,
        color: rgb(0.25, 0.3, 0.38),
      }
    );
    page.drawText(
      'and conditions by applying a transparent graphical signature below.',
      {
        x: 66,
        y: height - 478,
        size: 9.5,
        font: fontRegular,
        color: rgb(0.25, 0.3, 0.38),
      }
    );

    const boxY = 160;
    const boxW = 225;
    const boxH = 105;

    page.drawRectangle({
      x: 50,
      y: boxY,
      width: boxW,
      height: boxH,
      borderColor: rgb(0.72, 0.78, 0.86),
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });
    page.drawText('LOCATION & DATE OF EXECUTION', {
      x: 64,
      y: boxY + boxH - 22,
      size: 8.5,
      font: fontBold,
      color: rgb(0.4, 0.46, 0.56),
    });
    page.drawText(`London, ${new Date().toLocaleDateString('en-US')}`, {
      x: 64,
      y: boxY + 34,
      size: 11,
      font: fontRegular,
      color: rgb(0.12, 0.16, 0.24),
    });
    page.drawLine({
      start: { x: 64, y: boxY + 24 },
      end: { x: 50 + boxW - 14, y: boxY + 24 },
      thickness: 0.75,
      color: rgb(0.75, 0.8, 0.86),
    });

    const rightBoxX = width - 50 - boxW;
    page.drawRectangle({
      x: rightBoxX,
      y: boxY,
      width: boxW,
      height: boxH,
      borderColor: rgb(0.55, 0.65, 0.82),
      borderWidth: 1.2,
      color: rgb(1, 1, 1),
    });
    page.drawText('AUTHORIZED SIGNATURE (PLACE HERE)', {
      x: rightBoxX + 14,
      y: boxY + boxH - 22,
      size: 8.5,
      font: fontBold,
      color: rgb(0.15, 0.32, 0.68),
    });
    page.drawText('X', {
      x: rightBoxX + 16,
      y: boxY + 30,
      size: 12,
      font: fontBold,
      color: rgb(0.55, 0.63, 0.75),
    });
    page.drawLine({
      start: { x: rightBoxX + 14, y: boxY + 24 },
      end: { x: rightBoxX + boxW - 14, y: boxY + 24 },
      thickness: 0.8,
      color: rgb(0.65, 0.72, 0.82),
    });
  }

  return await pdfDoc.save();
}

/**
 * Generates a realistic calligraphic signature on a solid white background
 */
export function createSampleSignatureDataUrl(labelName = 'Alex Morgan'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 520;
  canvas.height = 200;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#142E75';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.lineWidth = 3.2;
  ctx.moveTo(65, 145);
  ctx.bezierCurveTo(180, 115, 340, 110, 455, 128);
  ctx.bezierCurveTo(420, 142, 260, 156, 135, 162);
  ctx.stroke();

  ctx.beginPath();
  ctx.lineWidth = 4.2;
  ctx.moveTo(75, 125);
  ctx.bezierCurveTo(85, 50, 105, 48, 112, 115);
  ctx.bezierCurveTo(118, 65, 136, 62, 144, 112);
  ctx.bezierCurveTo(152, 72, 168, 70, 178, 108);
  ctx.bezierCurveTo(195, 85, 215, 84, 232, 106);
  ctx.stroke();

  ctx.beginPath();
  ctx.lineWidth = 3.8;
  ctx.moveTo(260, 52);
  ctx.bezierCurveTo(272, 122, 286, 124, 312, 58);
  ctx.bezierCurveTo(324, 96, 355, 112, 385, 82);
  ctx.bezierCurveTo(405, 68, 425, 98, 458, 76);
  ctx.stroke();

  ctx.font = 'italic 600 28px Georgia, serif';
  ctx.fillStyle = '#142E75';
  ctx.fillText(labelName, 140, 102);

  return canvas.toDataURL('image/png');
}

/**
 * Encodes a dataUrl into a valid uncompressed 24-bit .BMP binary Blob
 */
export async function createBmpBlobFromDataUrl(dataUrl: string): Promise<Blob> {
  const img = await loadImageElement(dataUrl);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, width, height).data;
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  view.setUint8(0, 0x42);
  view.setUint8(1, 0x4d);
  view.setUint32(2, fileSize, true);
  view.setUint32(6, 0, true);
  view.setUint32(10, 54, true);

  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(30, 0, true);
  view.setUint32(34, pixelArraySize, true);
  view.setInt32(38, 2835, true);
  view.setInt32(42, 2835, true);
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  const outBytes = new Uint8Array(buffer);
  for (let y = 0; y < height; y++) {
    const bmpRow = height - 1 - y;
    const rowOffset = 54 + bmpRow * rowSize;
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = rowOffset + x * 3;
      outBytes[dstIdx] = imageData[srcIdx + 2];
      outBytes[dstIdx + 1] = imageData[srcIdx + 1];
      outBytes[dstIdx + 2] = imageData[srcIdx];
    }
  }

  return new Blob([buffer], { type: 'image/bmp' });
}

/**
 * Generates a 1-page vector PDF containing a handwritten signature on white background
 */
export async function createPdfSignatureBlob(dataUrl: string): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([320, 140]);
  const pngImage = await pdfDoc.embedPng(dataUrl);
  page.drawImage(pngImage, {
    x: 10,
    y: 10,
    width: 300,
    height: 120,
  });
  const bytes = await pdfDoc.save();
  return new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
}
