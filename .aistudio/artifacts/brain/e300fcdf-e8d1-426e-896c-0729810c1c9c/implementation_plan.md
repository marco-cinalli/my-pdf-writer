# FolioSign Studio — Dark Mode Architetturale & Restyling Editoriale della Home Page

Questo aggiornamento introduce un **sistema Dual-Theme (Light / Dark Mode)** completo basato su tonalità **Slate profondo architetturale e grafite** con persistenza automatica della preferenza utente, affiancato da una **Home Page riprogettata in stile editoriale** con Hero asimmetrico, barra di accesso rapido agli strumenti (Firma, Modifica Testo, Unisci, Estrai), metriche dell'archivio locale e schede documento ingrandite con anteprima copertina ad alta definizione.

## User Review & Critical Decisions

> [!IMPORTANT]
> Le tue scelte sono state recepite nel piano. Approva il piano per procedere all'aggiornamento del codice.

- **Decisione Confermata 1 — Tema Scuro Slate Profondo Architetturale**: Sfondo canvas in `#0B0F19` / `slate-950`, superfici strutturali e schede in grafite `#0F172A` / `slate-900`, bordi sottili `1px solid #1E293B` (`slate-800`) e accenti nitidi in blu reale (`#3B82F6`) e ambra (`#F59E0B`), garantendo contrasto WCAG AA su ogni componente senza mai alterare i colori reali del foglio PDF in fase di modifica.
- **Decisione Confermata 2 — Home Page con Hero Editoriale, Azioni Rapide e Schede Grandi**:
  - **Hero Split Asimmetrico (12 colonne)**: A sinistra presentazione tipografica ad alto impatto con selettore rapido Light/Dark Mode e creazione documento di prova; a destra zona di rilascio drag-and-drop interattiva.
  - **Striscia a 4 Colonne (KPI & Accesso Rapido Strumenti)**: Quattro blocchi funzionali sotto l'Hero che mostrano le statistiche reali dell'archivio (`Documenti Salvati`, `Firme & Testi Applicati`, `Firme in Libreria`, `Memoria Locale IndexedDB`) e consentono di saltare con un clic allo strumento desiderato.
  - **Griglia Schede Documento Grandi**: Miniature copertina ampie su passepartout contrastato, titolo editabile in linea, metadati tipografici puliti e barra di azioni rapide (`Apri e Firma`, `Modifica Testo`, `Esporta PDF`, `Duplica`, `Elimina`).

---

## 1. Overview & Core Concept

- **Cosa cambia**:
  1. **Architettura Dual-Theme Completa (Tailwind v4 `@custom-variant dark`)**: Tutti i componenti (`HomeVaultView`, `PageSidebar`, `PdfCanvasStage`, `RightInspectorPanel`, `SignatureDrawModal` e `App`) supportano nativamente sia il tema Chiaro sia il tema Scuro, con compensazione ottica del testo su sfondo scuro e griglia puntinata scura attorno al foglio PDF nell'editor.
  2. **Rifinitura Estetica della Home Page**: Trasforma la schermata iniziale in uno studio digitale curato, dove l'utente ha subito sott'occhio i propri documenti salvati, la libreria delle proprie firme trasparenti (`.BMP` / `.PDF`) e le scorciatoie dirette per firmare, modificare il testo, unire o estrarre pagine.

---

## 2. User Experience & Visual Design

### Palette Dual-Theme (Regola 60-30-10)
- **Light Mode (*Swiss Daylight*)**:
  - *60% Canvas*: `#F8FAFC` (`slate-50`)
  - *30% Superfici*: `#FFFFFF` con divisori `#E2E8F0` (`slate-200`) e testo `#0F172A` (`slate-900`)
  - *10% Accenti*: Blu inchiostro `#1D4ED8` (`blue-700`) e Ambra `#D97706` (`amber-600`)
- **Dark Mode (*Architectural Slate & Graphite*)**:
  - *60% Canvas*: `#090D16` (`slate-950`) con griglia tecnica `#1E293B` nel tavolo da disegno PDF
  - *30% Superfici*: `#0F172A` (`slate-900`) e `#1E293B` (`slate-800/70`) con bordi `#1E293B` (`slate-800`) e testo `#F8FAFC` (`slate-50`)
  - *10% Accenti*: Blu luminoso `#3B82F6` (`blue-500`) e Ambra `#F59E0B` (`amber-500`)

### Layout della Nuova Home Page
1. **Sezione Hero (Split 7/5 con `items-stretch`)**:
   - Colonna sinistra editoriale con selettore tema **Chiaro / Scuro**, titolo bilanciato (`text-wrap: balance`), descrizione della privacy locale e pulsanti di avvio rapido.
   - Colonna destra con dropzone interattiva multi-file per trascinare PDF e firme `.BMP`/`.PDF`.
2. **Striscia Funzionale a 4 Colonne (Sotto l'Hero)**:
   - `01. Firma PDF & Scontorno BMP/PDF`: apre l'ultimo documento direttamente nello strumento Firma o permette di caricare una nuova firma.
   - `02. Modifica Testo PDF`: apre il rilevamento dei blocchi di testo esistenti sul PDF.
   - `03. Unisci & Riordina PDF`: apre lo strumento di fusione multi-documento.
   - `04. Estrai Range di Pagine`: apre l'estrattore per intervalli di pagine (`es. 1-3, 5`).
3. **Galleria Documenti Salvati (Schede Grandi)**:
   - Passepartout alto (`h-56`) che valorizza la miniatura del documento PDF con ombra realistica, pulsante rapido in sovrimpressione per aprire il documento, titolo editabile con un clic e indicatori chiari di firme e testi modificati.

---

## 3. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        Gestore Tema (Light / Dark)                         │
│  • Tailwind v4: `@custom-variant dark (&:where(.dark, .dark *));`          │
│  • Sync su `<html class="dark">` + persistenza in `localStorage`           │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┴─────────────────────────────┐
        ▼                                                           ▼
┌──────────────────────────────────────┐   ┌─────────────────────────────────┐
│     Home Page Editoriale Rinnovata   │   │    Workspace Editor Dual-Theme  │
├──────────────────────────────────────┤   ├─────────────────────────────────┤
│ • Hero Split + Switch Tema           │   │ • Sidebar Pagine Slate-900      │
│ • Strip 4 Strumenti & Metriche Vault │   │ • Tavolo PDF con Griglia Scura  │
│ • Schede Documento Grandi (h-56)     │   │ • Ispettore Firme / Testo /     │
│ • Anteprima Firme Salvate (.BMP/.PDF)│   │   Unisci / Estrai in Dark Mode  │
└──────────────────────────────────────┘   └─────────────────────────────────┘
```
