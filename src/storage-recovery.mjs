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
        if (existing === raw) return true;
        if (existing !== null) return false;
        storage.setItem(key, raw);
        return storage.getItem(key) === raw;
    } catch (error) {
        return false;
    }
}

/**
 * Raccoglie in sola lettura tutte le copie note e le fotografie tenute in memoria.
 * Valori diversi della stessa chiave restano entrambi nel pacchetto.
 */
export function collectRecoverySnapshots(storage, keys = [], pending = []) {
    const snapshots = [];
    const unreadableKeys = [];

    const add = (key, raw) => {
        if (typeof key !== 'string' || typeof raw !== 'string') return;
        if (!snapshots.some(item => item.key === key && item.raw === raw)) {
            snapshots.push({ key, raw });
        }
    };

    for (const item of pending) {
        if (item && typeof item === 'object') add(item.key, item.raw);
    }

    for (const key of keys) {
        if (!storage || typeof storage.getItem !== 'function') {
            unreadableKeys.push(key);
            continue;
        }
        try {
            const raw = storage.getItem(key);
            if (raw !== null) add(key, raw);
        } catch (error) {
            unreadableKeys.push(key);
        }
    }

    return { snapshots, unreadableKeys };
}

/** Produce un contenitore di recupero che conserva i valori originali senza alterarli. */
export function createRecoveryBundle(recovery, exportedAt = new Date().toISOString()) {
    const snapshots = Array.isArray(recovery?.snapshots) ? recovery.snapshots : [];
    const unreadableKeys = Array.isArray(recovery?.unreadableKeys) ? recovery.unreadableKeys : [];
    return JSON.stringify({
        format: 'diario-olfattivo-recovery',
        version: 1,
        exportedAt,
        snapshots: snapshots
            .filter(item => item && typeof item.key === 'string' && typeof item.raw === 'string')
            .map(item => ({ key: item.key, raw: item.raw })),
        unreadableKeys: unreadableKeys.filter(key => typeof key === 'string')
    }, null, 2);
}

/**
 * Decide se l'avvio può scrivere la struttura iniziale.
 * In presenza di un recupero necessario non deve mai essere scritto lo stato vuoto.
 */
export function shouldWriteInitialState({ loaded = false, fromLegacy = false, recoveryRequired = false } = {}) {
    return !recoveryRequired && (!loaded || fromLegacy);
}

/**
 * Sceglie la migliore copia valida: privilegia una copia con progressi rispetto a
 * una struttura vuota e, a parità, mantiene la chiave primaria come fonte principale.
 */
export function selectBestRecoverySnapshot(
    candidates,
    hasProgress = () => false,
    primaryKey = 'diario-olfattivo-v1',
    draftKey = null
) {
    const valid = Array.isArray(candidates)
        ? candidates.filter(item => item && typeof item.key === 'string' && item.state && typeof item.state === 'object')
        : [];
    // Una bozza valida è una fotografia esplicita delle modifiche salvate
    // durante il recupero. Va preferita anche quando contiene soltanto dati che
    // hasProgress non classifica come attività (per esempio la data di inizio).
    // Altrimenti al riavvio verrebbe scelta una copia storica e la bozza ignorata.
    return valid.find(item => item.key === draftKey) ||
        valid.find(item => hasProgress(item.state)) ||
        valid.find(item => item.key === primaryKey) ||
        valid[0] ||
        null;
}

/**
 * Salva i dati in uno spazio separato mentre è attiva la modalità di recupero.
 * La chiave originale resta intatta fino alla conferma esplicita.
 * Ogni scrittura viene riletta e verificata prima di dichiararla riuscita.
 */
export function persistDiarySnapshot(storage, {
    primaryKey,
    draftKey,
    state,
    savedAt,
    recoveryMode = false
} = {}) {
    if (!storage || typeof storage.setItem !== 'function' ||
        typeof storage.getItem !== 'function' ||
        typeof primaryKey !== 'string' || !primaryKey ||
        typeof draftKey !== 'string' || !draftKey ||
        !state || typeof state !== 'object' ||
        typeof savedAt !== 'string') {
        return { saved: false, key: null, error: new Error('Parametri di salvataggio non validi') };
    }

    const key = recoveryMode ? draftKey : primaryKey;
    try {
        const raw = JSON.stringify({ savedAt, state });
        storage.setItem(key, raw);
        if (storage.getItem(key) !== raw) {
            return { saved: false, key, error: new Error('Verifica del salvataggio non riuscita') };
        }

        if (!recoveryMode) {
            // Dopo aver verificato la copia principale, elimina la bozza. Se la
            // rimozione non è consentita, riallineala al valore principale appena
            // scritto: non deve poter ripristinare una versione più vecchia.
            try {
                if (typeof storage.removeItem === 'function') {
                    storage.removeItem(draftKey);
                }
                if (storage.getItem(draftKey) !== null) {
                    storage.setItem(draftKey, raw);
                }
            } catch (cleanupError) {
                try { storage.setItem(draftKey, raw); } catch (ignore) {}
            }
        }

        return { saved: true, key, raw };
    } catch (error) {
        return { saved: false, key, error };
    }
}
