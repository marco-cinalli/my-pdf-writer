# FolioSign Studio (my-pdf-writer)

**A 100% local, privacy-first desktop web suite to sign PDF documents using `.PDF` and `.BMP` signatures (with automatic white-background transparency), edit existing PDF text, merge multiple PDFs, rotate pages, and extract page ranges.**

---

## Key Features

- **`.BMP` & `.PDF` Signature Import with White-to-Transparent Keying**:
  - Drag and drop signature files in `.bmp`, `.pdf`, `.png`, or `.jpg` format, draw a freehand signature, or create a custom date/text stamp.
  - **Real-Time Luminance Keying**: Automatically converts white scan backgrounds into alpha transparency, featuring a live **White Tolerance** slider (`5% – 90%`), automatic empty-margin cropping, and optional ink recoloring (*Original*, *Fountain Pen Blue*, *Deep Black*).
  - **Free Positioning & Resizing**: Drag signatures anywhere on the page, resize via 4 corner handles (with toggleable aspect-ratio lock), adjust opacity, duplicate, or copy a signature to the exact same position across all pages in one click.

- **PDF Text Editor (Existing PDF Text + Free Text Boxes)**:
  - **Edit Existing PDF Text**: Automatically detects text blocks inside the original PDF (`pdf.js` `getTextContent`). Click any dashed text block to edit, replace, or blank it out while seamlessly masking the original underlying text.
  - **Add Free Text Boxes**: Insert new vector text anywhere on the page with customizable font family (*Helvetica / Sans*, *Times / Serif*, *Courier / Mono*), font size (`6pt – 48pt`), bold weight, and ink color.

- **Merge, Rotate & Extract Page Ranges**:
  - **Merge PDFs**: Drag and drop multiple PDF documents to append their pages into the active workspace and reorder or delete individual pages from the sidebar.
  - **Lossless Page Rotation**: Rotate individual pages or the entire document by `-90°` or `+90°`.
  - **Extract Page Ranges**: Export a new standalone PDF containing specific page ranges (e.g., `1-3, 5, 7-9`) or visually selected thumbnails while preserving original vector quality.

- **Persistent Local Vault (`IndexedDB`) & 100% Client-Side Privacy**:
  - Every operation runs entirely inside your browser memory (`pdf-lib` + `pdfjs-dist`). No document or signature ever leaves your device.
  - Uploaded PDFs and all edits (signatures, modified text, page rotations) are automatically saved in your browser's local `IndexedDB` vault and remain available on the **Home Page** until you delete them.
  - Built-in **Architectural Dark Mode & Light Mode**.

---

## Quick Start (Local Installation)

### Prerequisites
- [Node.js](https://nodejs.org/) (**v20 LTS** or **v22 LTS** recommended)

### 1. Clone the repository
```bash
git clone https://github.com/marco-cinalli/my-pdf-writer.git
cd my-pdf-writer
```

### 2. One-Click Standalone App Launch on Windows (Recommended)
Double-click **`start_foliosign.bat`** (or **`avvia_foliosign.bat`**) in the project folder:
- Automatically pulls any updates from GitHub (`git pull`)
- Verifies and installs dependencies (`npm install --legacy-peer-deps`)
- Starts the local server and opens **FolioSign Studio** in an **isolated, maximized standalone desktop app window** (`--app=http://localhost:3000 --start-maximized`) without browser tabs or address bars.

### 3. Manual Terminal Launch (Windows / macOS / Linux)
```bash
npm install --legacy-peer-deps
npm run dev
```
Then open **`http://localhost:3000`** in your browser.

---

## Tech Stack

- **React 19 + TypeScript + Vite**
- **Tailwind CSS v4** (with Dual-Theme Light/Dark architecture)
- **`pdf-lib`** — Lossless binary PDF modification, transparent PNG signature embedding, vector text writing, rotation, merging, and page extraction
- **`pdfjs-dist`** — High-DPI canvas page rendering, thumbnail generation, and existing text coordinate extraction
- **`IndexedDB` & `HTML5 Canvas`** — Persistent local document vault and real-time `.BMP` / `.PDF` alpha-channel processing
