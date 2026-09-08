import type { UIMessage } from "ai";

const DB_NAME = "gamelia_chat_cache";
const DB_VERSION = 1;
const STORE_NAME = "game_messages";

interface CacheRecord {
  gameId: string;
  messages: UIMessage[];
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "gameId" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.warn("IndexedDB open error:", request.error);
      resolve(null);
    };
  });
}

export async function getCachedMessages(
  gameId: string,
): Promise<UIMessage[] | null> {
  try {
    const db = await openDB();
    if (!db) return null;

    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(gameId);

      request.onsuccess = () => {
        const record = request.result as CacheRecord | undefined;
        resolve(record ? record.messages : null);
      };

      request.onerror = () => {
        console.warn("IndexedDB get error:", request.error);
        resolve(null);
      };
    });
  } catch (error) {
    console.warn("Failed to get cached messages:", error);
    return null;
  }
}

export async function setCachedMessages(
  gameId: string,
  messages: UIMessage[],
): Promise<void> {
  try {
    const db = await openDB();
    if (!db) return;

    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const record: CacheRecord = {
        gameId,
        messages,
        updatedAt: Date.now(),
      };
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.warn("IndexedDB put error:", request.error);
        resolve();
      };
    });
  } catch (error) {
    console.warn("Failed to save cached messages:", error);
  }
}

export async function clearCachedMessages(gameId: string): Promise<void> {
  try {
    const db = await openDB();
    if (!db) return;

    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(gameId);

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch (error) {
    console.warn("Failed to clear cached messages:", error);
  }
}
