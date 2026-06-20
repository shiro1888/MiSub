function createMemoryStorage() {
  const items = new Map();

  return {
    clear() {
      items.clear();
    },
    getItem(key) {
      const storageKey = String(key);
      return items.has(storageKey) ? items.get(storageKey) : null;
    },
    key(index) {
      return Array.from(items.keys())[index] ?? null;
    },
    removeItem(key) {
      items.delete(String(key));
    },
    setItem(key, value) {
      items.set(String(key), String(value));
    },
    get length() {
      return items.size;
    }
  };
}

function installStorage(name) {
  const storage = createMemoryStorage();

  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: storage,
    writable: true
  });

  if (globalThis.window) {
    Object.defineProperty(globalThis.window, name, {
      configurable: true,
      value: storage,
      writable: true
    });
  }
}

installStorage('localStorage');
installStorage('sessionStorage');
