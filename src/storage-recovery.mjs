/**
 * Conserva una fotografia grezza dei dati locali prima che possano essere sovrascritti.
 * Non sostituisce una copia precedente diversa e verifica la scrittura rileggendo il valore.
 */
export function preserveCorruptSnapshot(storage, key, raw) {
    if (!storage || typeof storage.getItem !== 'function' ||
        typeof storage.setItem !== 'function' || typeof key !== 'string' ||
        key.length === 0 || typeof raw !== 'string') return false;
    try {
        const existing = storage.getItem(key);
        if (existing !== null && existing !== raw) return false;
        storage.setItem(key, raw);
        return storage.getItem(key) === raw;
    } catch (error) {
        return false;
    }
}
