/**
 * Persistence semplice del diario: una sola chiave principale.
 * La chiave legacy viene letta soltanto per migrare installazioni precedenti.
 */

function extractState(raw, validateState) {
    const parsed = JSON.parse(raw);
    const hasEnvelope = parsed !== null &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed) &&
        Object.prototype.hasOwnProperty.call(parsed, 'state');
    const state = hasEnvelope ? parsed.state : parsed;

    if (!state || typeof state !== 'object' || Array.isArray(state)) {
        throw new Error('I dati locali non contengono uno stato valido');
    }
    if (typeof validateState === 'function' && !validateState(state)) {
        throw new Error('La struttura dei dati locali non è valida');
    }
    return state;
}

/**
 * Scrive e rilegge la stessa chiave prima di confermare il salvataggio.
 * Non crea bozze né seleziona copie alternative.
 */
export function saveDiarySnapshot(storage, {
    key,
    state,
    savedAt = new Date().toISOString(),
    validateState
} = {}) {
    if (!storage || typeof storage.setItem !== 'function' ||
        typeof storage.getItem !== 'function') {
        throw new TypeError('Memoria locale non disponibile');
    }
    if (typeof key !== 'string' || !key) {
        throw new TypeError('Chiave del diario non valida');
    }
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
        throw new TypeError('Stato del diario non valido');
    }
    if (typeof validateState === 'function' && !validateState(state)) {
        throw new Error('Lo stato del diario non supera la validazione');
    }

    const raw = JSON.stringify({ savedAt, state });
    if (typeof raw !== 'string') throw new Error('Impossibile serializzare il diario');

    storage.setItem(key, raw);
    const persisted = storage.getItem(key);
    if (persisted !== raw) {
        throw new Error('La verifica del salvataggio locale non è riuscita');
    }

    // Verifica anche che la copia appena riletta sia ancora interpretabile.
    extractState(persisted, validateState);
    return true;
}

/**
 * Carica la chiave principale; usa quella legacy solo quando la principale è assente.
 * Non legge né considera copie di recupero o bozze secondarie.
 */
export function loadDiarySnapshot(storage, {
    key,
    legacyKey,
    validateState
} = {}) {
    if (!storage || typeof storage.getItem !== 'function') {
        throw new TypeError('Memoria locale non disponibile');
    }
    if (typeof key !== 'string' || !key) {
        throw new TypeError('Chiave del diario non valida');
    }

    let raw = storage.getItem(key);
    let fromLegacy = false;

    if (!raw && typeof legacyKey === 'string' && legacyKey) {
        raw = storage.getItem(legacyKey);
        fromLegacy = Boolean(raw);
    }

    if (!raw) {
        return { found: false, state: null, fromLegacy: false };
    }

    return {
        found: true,
        state: extractState(raw, validateState),
        fromLegacy
    };
}
