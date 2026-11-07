import { SavedPdfProject } from '../types/pdf';

const DB_NAME = 'foliosign_projects_db_v1';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Loads all saved PDF projects from local IndexedDB sorted by most recently updated
 */
export async function getAllSavedProjects(): Promise<SavedPdfProject[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const items: SavedPdfProject[] = Array.isArray(req.result) ? req.result : [];
        items.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Errore apertura IndexedDB:', err);
    return [];
  }
}

/**
 * Saves or updates a PDF project in local IndexedDB
 */
export async function saveProjectToVault(project: SavedPdfProject): Promise<void> {
  try {
    const db = await openDatabase();
    // Ensure ArrayBuffers are cloned cleanly before structured cloning into IDB
    const cleanProject: SavedPdfProject = {
      ...project,
      sources: project.sources.map((src) => ({
        ...src,
        data: src.data.slice(0),
      })),
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(cleanProject);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Errore salvataggio progetto in IndexedDB:', err);
  }
}

/**
 * Deletes a single project from local IndexedDB
 */
export async function deleteProjectFromVault(projectId: string): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(projectId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Errore eliminazione progetto da IndexedDB:', err);
  }
}

/**
 * Clears all saved PDF projects from local IndexedDB
 */
export async function clearAllProjectsFromVault(): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Errore svuotamento archivio IndexedDB:', err);
  }
}
