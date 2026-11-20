/**
 * Funzioni pure condivise da Diario e dalla suite di test.
 * Questo modulo non accede al DOM, al browser storage o a servizi esterni.
 */

function isPlainObject(value) {
            return value !== null && typeof value === 'object' && !Array.isArray(value);
        }

        function isValidDateOnly(value) {
            if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
            const [year, month, day] = value.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
        }

        function isValidOptionalDate(value) {
            return value === undefined || value === '' || isValidDateOnly(value);
        }

        function isValidOptionalTime(value) {
            return value === undefined || value === '' ||
                (typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value));
        }

        function isValidTextValue(value, maxLength = 20000) {
            return value === undefined || (typeof value === 'string' && value.length <= maxLength);
        }

        function isValidScentRecord(record) {
            return isPlainObject(record) &&
                (record.score === undefined || record.score === null ||
                    (Number.isInteger(record.score) && record.score >= 0 && record.score <= 5)) &&
                isValidTextValue(record.impression, 5000);
        }

        // Verifica il formato prima di passare i dati a hydrateState/rendering.
        // I campi assenti restano compatibili con backup precedenti: deepMerge li completa.
        export function isValidDiaryState(candidate, includeArchive = true) {
            if (!isPlainObject(candidate) || !isPlainObject(candidate.weeks)) return false;

            if (candidate.setId !== undefined && !['set01', 'set02'].includes(candidate.setId)) return false;
            if (candidate.currentWeek !== undefined &&
                (!Number.isInteger(candidate.currentWeek) || candidate.currentWeek < 1 || candidate.currentWeek > 12)) return false;
            if (candidate.nextChoice !== undefined &&
                candidate.nextChoice !== null && !['same', 'other', 'set02'].includes(candidate.nextChoice)) return false;

            if (candidate.profile !== undefined) {
                if (!isPlainObject(candidate.profile)) return false;
                const p = candidate.profile;
                if (!isValidTextValue(p.name, 200) ||
                    !isValidOptionalDate(p.startDate) ||
                    !isValidOptionalTime(p.morningTime) ||
                    !isValidOptionalTime(p.eveningTime) ||
                    !isValidTextValue(p.initialNotes) ||
                    !isValidTextValue(p.finalReflection) ||
                    !isValidTextValue(p.nextStep)) return false;
            }

            const scentIds = ['eucalipto', 'limone', 'geranio', 'garofano'];
            if (candidate.baseline !== undefined) {
                if (!isPlainObject(candidate.baseline)) return false;
                for (const id of scentIds) {
                    if (candidate.baseline[id] !== undefined && !isValidScentRecord(candidate.baseline[id])) return false;
                }
            }

            for (let weekNum = 1; weekNum <= 12; weekNum++) {
                const week = candidate.weeks[weekNum];
                if (week === undefined) continue;
                if (!isPlainObject(week)) return false;

                if (week.days !== undefined) {
                    if (!Array.isArray(week.days) || week.days.length !== 7 ||
                        week.days.some(day => !isPlainObject(day) ||
                            (day.morning !== undefined && typeof day.morning !== 'boolean') ||
                            (day.evening !== undefined && typeof day.evening !== 'boolean'))) return false;
                }
                if (week.scents !== undefined) {
                    if (!isPlainObject(week.scents)) return false;
                    for (const id of scentIds) {
                        if (week.scents[id] !== undefined && !isValidScentRecord(week.scents[id])) return false;
                    }
                }
                if (!isValidTextValue(week.reflection) || !isValidTextValue(week.otherNotes)) return false;
            }

            if (candidate.pauses !== undefined) {
                if (!isPlainObject(candidate.pauses)) return false;
                for (const pauseNum of ['4', '8']) {
                    const pause = candidate.pauses[pauseNum];
                    if (pause === undefined) continue;
                    if (!isPlainObject(pause) ||
                        !isValidTextValue(pause.q1) ||
                        !isValidTextValue(pause.q2) ||
                        !isValidTextValue(pause.q3)) return false;
                }
            }

            if (candidate.refill !== undefined) {
                if (!isPlainObject(candidate.refill) ||
                    (candidate.refill.last !== undefined && candidate.refill.last !== null &&
                        !isValidDateOnly(candidate.refill.last))) return false;
            }

            if (!includeArchive) {
                // L'archivio viene mostrato direttamente: richiede quindi una fotografia completa.
                if (candidate.archive !== undefined ||
                    !isPlainObject(candidate.profile) ||
                    !isValidDateOnly(candidate.profile.startDate) ||
                    !isPlainObject(candidate.baseline) ||
                    scentIds.some(id => !isValidScentRecord(candidate.baseline[id]))) return false;
                for (let weekNum = 1; weekNum <= 12; weekNum++) {
                    const week = candidate.weeks[weekNum];
                    if (!isPlainObject(week) ||
                        !Array.isArray(week.days) || week.days.length !== 7 ||
                        week.days.some(day => !isPlainObject(day) ||
                            typeof day.morning !== 'boolean' || typeof day.evening !== 'boolean') ||
                        !isPlainObject(week.scents) ||
                        scentIds.some(id => !isValidScentRecord(week.scents[id]))) return false;
                }
            }
            if (includeArchive && candidate.archive !== undefined) {
                if (!Array.isArray(candidate.archive) || candidate.archive.length > 500) return false;
                for (const entry of candidate.archive) {
                    if (!isPlainObject(entry) ||
                        (entry.setId !== undefined && !['set01', 'set02'].includes(entry.setId)) ||
                        (entry.archivedAt !== undefined &&
                            (typeof entry.archivedAt !== 'string' || !Number.isFinite(Date.parse(entry.archivedAt)))) ||
                        !isValidDiaryState(entry.state, false)) return false;
                }
            }

            return true;
        }

export function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
        }

function localDateString(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Indica se il diario contiene almeno un dato che merita un backup. */
export function hasAnyDiaryData(appState, today = localDateString()) {
    if (!appState || typeof appState !== 'object') return false;
    
                const hasText = value => typeof value === 'string' && value.trim().length > 0;
                const hasScoresOrNotes = records => Object.values(records || {}).some(item =>
                    item && ((item.score !== null && item.score !== undefined) || hasText(item.impression))
                );
                const weeks = Object.values(appState.weeks || {});
                const hasWeekData = weeks.some(week =>
                    (Array.isArray(week.days) && week.days.some(day => day.morning || day.evening)) ||
                    hasScoresOrNotes(week.scents) ||
                    hasText(week.reflection) ||
                    hasText(week.otherNotes)
                );
                const hasPauseData = Object.values(appState.pauses || {}).some(pause =>
                    pause && Object.values(pause).some(hasText)
                );
                const profile = appState.profile || {};
                const hasProfileData =
                    hasText(profile.name) ||
                    hasText(profile.initialNotes) ||
                    hasText(profile.finalReflection) ||
                    hasText(profile.nextStep) ||
                    (profile.morningTime && profile.morningTime !== '08:00') ||
                    (profile.eveningTime && profile.eveningTime !== '19:00');
    
                return hasWeekData ||
                    hasScoresOrNotes(appState.baseline) ||
                    hasPauseData ||
                    hasProfileData ||
                    !!(appState.refill && appState.refill.last) ||
                    !!appState.nextChoice ||
                    (appState.setId && appState.setId !== 'set01') ||
                    (profile.startDate && profile.startDate !== today) ||
                    (Array.isArray(appState.archive) && appState.archive.length > 0);
            
}

/**
 * Indica se un percorso contiene attività reale, escludendo preferenze e metadati.
 */
export function hasPathProgress(state) {
    if (!state || typeof state !== 'object') return false;
    const hasText = value => typeof value === 'string' && value.trim().length > 0;
    const hasRecords = records => Object.values(records || {}).some(item =>
        item && ((item.score !== null && item.score !== undefined) || hasText(item.impression))
    );
    const weekData = Object.values(state.weeks || {}).some(week => week && (
        (Array.isArray(week.days) && week.days.some(day => day && (day.morning || day.evening))) ||
        hasRecords(week.scents) || hasText(week.reflection) || hasText(week.otherNotes)
    ));
    const pauseData = Object.values(state.pauses || {}).some(pause =>
        pause && Object.values(pause).some(hasText)
    );
    const profile = state.profile || {};
    return weekData || hasRecords(state.baseline) || pauseData ||
        hasText(profile.initialNotes) || hasText(profile.finalReflection) || hasText(profile.nextStep);
}

/** Associa l'indice originale a ogni voce prima di invertirne l'ordine di visualizzazione. */
export function getArchiveEntriesNewestFirst(archive) {
    return (Array.isArray(archive) ? archive : [])
        .map((entry, index) => ({ entry, index }))
        .reverse();
}

/**
 * Riprende una voce dell'archivio senza perdere il percorso corrente né le preferenze globali.
 * Restituisce null per una voce non valida o quando l'archivio è al limite e non può contenere
 * anche il percorso corrente.
 */
export function restoreArchivedPath(currentState, archiveIndex, archivedAt = new Date().toISOString()) {
    if (!currentState || typeof currentState !== 'object' ||
        !Array.isArray(currentState.archive) ||
        !Number.isInteger(archiveIndex) || archiveIndex < 0 || archiveIndex >= currentState.archive.length) {
        return null;
    }
    const entry = currentState.archive[archiveIndex];
    if (!entry || !['set01', 'set02'].includes(entry.setId) ||
        !isValidDiaryState(entry.state, false) ||
        typeof archivedAt !== 'string' || !Number.isFinite(Date.parse(archivedAt))) {
        return null;
    }

    const clone = value => JSON.parse(JSON.stringify(value));
    const nextArchive = currentState.archive.slice();
    nextArchive.splice(archiveIndex, 1);
    // Una ricarica isolata va archiviata soltanto quando si cambia set:
    // se il set coincide, la data viene trasferita direttamente al percorso ripreso.
    const currentHasProgress = hasPathProgress(currentState) ||
        (currentState.setId !== entry.setId && isValidDateOnly(currentState.refill?.last));
    if (currentHasProgress) {
        if (nextArchive.length >= 500) return null;
        const previous = clone(currentState);
        delete previous.archive;
        nextArchive.push({
            archivedAt,
            setId: currentState.setId,
            state: previous
        });
    }

    const restored = clone(entry.state);
    restored.archive = nextArchive;
    restored.setId = entry.setId;
    restored.profile = restored.profile || {};
    const currentProfile = currentState.profile || {};
    for (const key of ['name', 'morningTime', 'eveningTime']) {
        if (typeof currentProfile[key] === 'string') restored.profile[key] = currentProfile[key];
    }
    if (currentState.setId === restored.setId && currentState.refill &&
        (currentState.refill.last === null ||
            (typeof currentState.refill.last === 'string' &&
                /^\d{4}-\d{2}-\d{2}$/.test(currentState.refill.last)))) {
        restored.refill = clone(currentState.refill);
    }
    return restored;
}

/**
 * Restituisce la posizione del giorno corrente nel percorso:
 * { week: 1..12, dayIndex: 0..6 }, oppure null fuori dal percorso.
 * Usa giorni UTC costruiti dai componenti locali della data per evitare
 * slittamenti dovuti ai cambi dell'ora legale.
 */
export function getRitualPosition(startDate, today = new Date()) {
    if (!isValidDateOnly(startDate) || !(today instanceof Date) || Number.isNaN(today.getTime())) {
        return null;
    }

    const [year, month, day] = startDate.split('-').map(Number);
    const startUtc = Date.UTC(year, month - 1, day);
    const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const elapsedDays = Math.round((todayUtc - startUtc) / 86400000);

    if (elapsedDays < 0) return null;

    const week = Math.floor(elapsedDays / 7) + 1;
    if (week > 12) return null;

    return { week, dayIndex: elapsedDays % 7 };
}


/**
 * Costruisce i 13 punti della serie olfattiva: rilevazione iniziale e settimane 1–12.
 * I punteggi mancanti o non validi restano null: non vengono interpolati.
 */
export function getScentTrendPoints(baseline, weeks, scentId) {
    const readScore = record => {
        const score = record?.score;
        return Number.isInteger(score) && score >= 0 && score <= 5 ? score : null;
    };

    const points = [
        { label: 'Inizio', week: 0, score: readScore(baseline?.[scentId]) }
    ];

    for (let week = 1; week <= 12; week++) {
        points.push({
            label: `Settimana ${week}`,
            week,
            score: readScore(weeks?.[week]?.scents?.[scentId])
        });
    }

    return points;
}
