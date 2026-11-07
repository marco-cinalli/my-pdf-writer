# FolioSign Studio (my-pdf-writer)

**Suite web 100% locale per firmare documenti PDF con firme in formato `.PDF` e `.BMP` (con scontorno automatico dello sfondo bianco), modificare i testi dei PDF, unire più documenti, ruotare ed estrarre intervalli di pagine in totale privacy.**

---

## Caratteristiche Principali

- **Firma Grafica da `.BMP` e `.PDF` con Trasparenza del Bianco**:
  - Importa file di firma in formato `.bmp`, `.pdf`, `.png` o `.jpg` tramite drag-and-drop, oppure disegna la firma a mano libera o genera un timbro data/testo.
  - **Luminance Keying in tempo reale**: rimuove automaticamente lo sfondo bianco delle scansioni rendendolo trasparente, con cursore di **Tolleranza del bianco** (`5% – 90%`), ritaglio automatico dei margini vuoti e ricolorazione opzionale dell'inchiostro (*Originale*, *Blu Penna*, *Nero*).
  - **Posizionamento e Ridimensionamento Libero**: trascina la firma ovunque sulla pagina, ridimensionala con le maniglie angolari (con blocco proporzioni attivabile), regola l'opacità o copiala nella stessa posizione su tutte le pagine del documento.

- **Editor del Testo PDF (Testo Esistente + Nuovo Testo)**:
  - **Modifica del testo già presente nel PDF**: rileva automaticamente le righe di testo del documento originale; basta cliccare su una frase tratteggiata per correggerla, sostituirla o sbiancarla mantenendo la copertura pulita del testo sottostante.
  - **Nuove Caselle di Testo Libero**: aggiungi testo vettoriale ovunque sul foglio scegliendo carattere (*Helvetica / Sans*, *Times / Serif*, *Courier / Mono*), dimensione (`6pt – 48pt`), stile grassetto e colore.

- **Unione (Merge), Rotazione ed Estrazione Range di Pagine**:
  - **Unione PDF**: trascina più file PDF per accodarne le pagine nel documento attivo e riordinale dalla barra laterale.
  - **Rotazione Nativa**: ruota di `-90°` o `+90°` la singola pagina o l'intero documento.
  - **Estrazione Pagine**: esporta un nuovo file PDF indicando un intervallo di pagine (es. `1-3, 5, 7-9`) o selezionando visivamente le miniature.

- **Archivio Locale Persistente (`IndexedDB`) & 100% Privacy**:
  - Tutte le operazioni avvengono esclusivamente nella memoria del tuo browser (`pdf-lib` + `pdfjs-dist`). Nessun documento o firma viene mai caricato su server esterni.
  - I documenti aperti e le relative modifiche vengono salvati automaticamente nell'archivio locale del browser (`IndexedDB`) e restano disponibili nella **Home Page** finché non scegli di eliminarli.
  - Supporto nativo **Dark Mode / Light Mode**.

---

## Installazione e Avvio Rapido in Locale

### Prerequisiti
- [Node.js](https://nodejs.org/) (versione **20 LTS** o **22 LTS** consigliata)

### 1. Scarica il repository
```bash
git clone https://github.com/marco-cinalli/my-pdf-writer.git
cd my-pdf-writer
```

### 2. Avvio su Windows con un clic (Consigliato)
Fai doppio clic sul file **`avvia_foliosign.bat`** presente nella cartella del progetto:
- Controlla automaticamente eventuali aggiornamenti da GitHub (`git pull`)
- Installa/verifica le dipendenze (`npm install --legacy-peer-deps`)
- Avvia il server locale e apre automaticamente il browser su **`http://localhost:3000`**

### 3. Avvio manuale da terminale (Windows / macOS / Linux)
```bash
npm install --legacy-peer-deps
npm run dev
```
Poi apri **`http://localhost:3000`** nel browser.

---

## Tecnologie Utilizzate

- **React 19 + TypeScript + Vite**
- **Tailwind CSS v4** (con supporto Dual-Theme Light/Dark)
- **`pdf-lib`** — Modifica strutturale binaria del PDF, incorporamento firme PNG trasparenti, scrittura testo vettoriale, rotazione, merge ed estrazione pagine senza perdita di qualità
- **`pdfjs-dist`** — Rendering ad alta definizione delle pagine PDF, anteprime miniature ed estrazione coordinate dei blocchi di testo esistenti
- **`IndexedDB` & `HTML5 Canvas`** — Archivio progetti persistente locale ed elaborazione canale alfa delle firme `.BMP` / `.PDF`
