import { escapeHtml, getRitualPosition, hasAnyDiaryData, isValidDiaryState } from './src/diario-core.mjs';

// =========================================================================
        // DATI STATICI DEL PERCORSO (dal diario del Set 01)
        // =========================================================================
        // Gli id interni (eucalipto, limone, geranio, garofano) sono "slot": nel Set 02 contengono altri profumi.
        const SET_DEFS = {
            set01: { name: "Set 01", scents: [
            { id: "eucalipto", name: "Eucalipto", character: "Fresco e pungente", hint: "Aria balsamica, tra foglie verdi e caramelle all'eucalipto.", colorClass: "emerald", badgeBg: "bg-emerald-100 text-emerald-800", activeBtn: "bg-emerald-600 text-white border-emerald-600" },
            { id: "limone", name: "Limone", character: "Fresco e agrumato", hint: "La scorza appena grattugiata.", colorClass: "amber", badgeBg: "bg-amber-100 text-amber-800", activeBtn: "bg-amber-500 text-white border-amber-500" },
            { id: "geranio", name: "Geranio rosato", character: "Floreale, con un'eco di rosa", hint: "Foglie profumate di geranio, con una sfumatura rosata.", colorClass: "pink", badgeBg: "bg-pink-100 text-pink-800", activeBtn: "bg-pink-600 text-white border-pink-600" },
            { id: "garofano", name: "Chiodi di garofano", character: "Caldo e speziato", hint: "Le spezie dei dolci e delle tisane d'inverno.", colorClass: "orange", badgeBg: "bg-orange-100 text-amber-900", activeBtn: "bg-amber-800 text-white border-amber-800" }
            ] },
            set02: { name: "Set 02", scents: [
            { id: "eucalipto", name: "Lavanda", character: "Floreale con un tocco erbaceo", hint: "Un sacchettino di lavanda nel cassetto, o i fiori in campo.", colorClass: "violet", badgeBg: "bg-violet-100 text-violet-800", activeBtn: "bg-violet-600 text-white border-violet-600" },
            { id: "limone", name: "Mandarino", character: "Dolce e agrumato", hint: "Gli spicchi dolci e il profumo che resta sulle dita.", colorClass: "orange", badgeBg: "bg-orange-100 text-orange-800", activeBtn: "bg-orange-500 text-white border-orange-500" },
            { id: "geranio", name: "Menta piperita", character: "Fresca e mentolata", hint: "Foglioline di menta tra le dita. Il fresco in bocca non conta come odore.", colorClass: "teal", badgeBg: "bg-teal-100 text-teal-800", activeBtn: "bg-teal-600 text-white border-teal-600" },
            { id: "garofano", name: "Timo", character: "Aromatico e intenso", hint: "Rametti di timo in cucina, tra arrosti e orto.", colorClass: "lime", badgeBg: "bg-lime-100 text-lime-800", activeBtn: "bg-lime-700 text-white border-lime-700" }
            ] }
        };
        let SCENTS = SET_DEFS.set01.scents;
        function applySet(id) { SCENTS = (SET_DEFS[id] || SET_DEFS.set01).scents; }
        const PALETTE = {
            emerald: { c: 'bg-emerald-50/60 border border-emerald-200/70', i: 'bg-emerald-100 text-emerald-700', t: 'text-emerald-700' },
            amber: { c: 'bg-amber-50/60 border border-amber-200/70', i: 'bg-amber-100 text-amber-700', t: 'text-amber-700' },
            pink: { c: 'bg-pink-50/60 border border-pink-200/70', i: 'bg-pink-100 text-pink-700', t: 'text-pink-700' },
            orange: { c: 'bg-orange-50/60 border border-orange-200/70', i: 'bg-orange-100 text-orange-700', t: 'text-orange-800' },
            violet: { c: 'bg-violet-50/60 border border-violet-200/70', i: 'bg-violet-100 text-violet-700', t: 'text-violet-700' },
            teal: { c: 'bg-teal-50/60 border border-teal-200/70', i: 'bg-teal-100 text-teal-700', t: 'text-teal-700' },
            lime: { c: 'bg-lime-50/60 border border-lime-200/70', i: 'bg-lime-100 text-lime-700', t: 'text-lime-800' }
        };

        const SCALE_LABELS = {
            0: 'Nessun odore',
            1: 'Molto debole',
            2: 'Debole',
            3: 'Media',
            4: 'Forte',
            5: 'Molto forte'
        };

        const WEEKS_META = [
            { num: 1, stage: "Tappa 1 • Avvio", title: "Il tuo angolo", desc: "Fissa due momenti della giornata, ad esempio dopo colazione e prima di coricarti, e tieni il kit dove lo vedi.", question: "Che cosa mi aiuta a iniziare?" },
            { num: 2, stage: "Tappa 1 • Avvio", title: "Vedere con la mente", desc: "Mentre annusi, visualizza la pianta o il frutto. Va bene anche se all'inizio non senti niente.", question: "Quale immagine collego a uno dei profumi?" },
            { num: 3, stage: "Tappa 1 • Avvio", title: "Con parole mie", desc: "Descrivi un profumo come ti viene. «Strano», «diverso» o «ancora niente» sono risposte valide.", question: "Quale parola rende meglio la mia impressione?" },
            { num: 4, stage: "Tappa 1 • Avvio", title: "Primo bilancio", desc: "Riguarda il punto di partenza e annota cosa vedi, senza forzare nessun cambiamento.", question: "Che differenze noto rispetto all'inizio?" },
            { num: 5, stage: "Tappa 2 • Scoperta", title: "Ricordi", desc: "Associa un profumo a una scena che conosci. Prenditi un attimo di calma per farlo.", question: "A quale luogo o momento mi fa pensare?" },
            { num: 6, stage: "Tappa 2 • Scoperta", title: "Gli odori di ogni giorno", desc: "Senza sforzo, nota un odore familiare della giornata, come il caffè. Annotare che non senti nulla è lecito.", question: "Quale odore quotidiano voglio segnare?" },
            { num: 7, stage: "Tappa 2 • Scoperta", title: "Somiglianze e differenze", desc: "Oggi, quali profumi ti sembrano vicini e quali lontani? La tua descrizione è solo tua.", question: "Che differenze sento tra i profumi?" },
            { num: 8, stage: "Tappa 2 • Scoperta", title: "Secondo bilancio", desc: "Confronta le note delle settimane 4 e 8 e guarda come il rituale è entrato nelle tue giornate.", question: "Che cosa è rimasto uguale e che cosa è cambiato?" },
            { num: 9, stage: "Tappa 3 • Continuità", title: "Sfumature", desc: "Floreale, fruttato, erbaceo, speziato: quale parola si adatta a un profumo? Usa pure parole tue.", question: "Quale altra sfumatura riconosco?" },
            { num: 10, stage: "Tappa 3 • Continuità", title: "Tieni il ritmo", desc: "Quale piccola abitudine ti aiuta a non mollare? Tienila e rendi tutto il più semplice possibile.", question: "Quale abitudine voglio conservare?" },
            { num: 11, stage: "Tappa 3 • Continuità", title: "Da ricordare", desc: "Magari c'è stato un momento legato a un profumo che vuoi ricordare. C'è posto anche per i dubbi e per le impressioni rimaste identiche.", question: "Che cosa vorrei rileggere in futuro?" },
            { num: 12, stage: "Tappa 3 • Continuità", title: "Un passo alla volta", desc: "Rileggi le note, compila il riepilogo e decidi con calma come continuare.", question: "Che cosa mi porto dietro da queste dodici settimane?" }
        ];

        const DAY_NAMES = ['Giorno 01', 'Giorno 02', 'Giorno 03', 'Giorno 04', 'Giorno 05', 'Giorno 06', 'Giorno 07'];

        // =========================================================================
        // STATO IN-MEMORY DELL'APPLICAZIONE
        // =========================================================================
        function createDefaultState() {
            const _n = new Date();
            const todayStr = `${_n.getFullYear()}-${String(_n.getMonth() + 1).padStart(2, '0')}-${String(_n.getDate()).padStart(2, '0')}`;
            const weeks = {};
            for (let w = 1; w <= 12; w++) {
                weeks[w] = {
                    days: Array.from({ length: 7 }, () => ({ morning: false, evening: false })),
                    scents: {
                        eucalipto: { score: null, impression: '' },
                        limone: { score: null, impression: '' },
                        geranio: { score: null, impression: '' },
                        garofano: { score: null, impression: '' }
                    },
                    reflection: '',
                    otherNotes: ''
                };
            }
            return {
                refill: { last: null },
                setId: 'set01',
                nextChoice: null,
                archive: [],
                currentWeek: 1,
                profile: {
                    name: '',
                    startDate: todayStr,
                    morningTime: '08:00',
                    eveningTime: '19:00',
                    initialNotes: '',
                    finalReflection: '',
                    nextStep: ''
                },
                baseline: {
                    eucalipto: { score: null, impression: '' },
                    limone: { score: null, impression: '' },
                    geranio: { score: null, impression: '' },
                    garofano: { score: null, impression: '' }
                },
                pauses: {
                    4: { q1: '', q2: '', q3: '' },
                    8: { q1: '', q2: '', q3: '' }
                },
                weeks
            };
        }

        let appState = createDefaultState();
        let activeTab = 'calendario';

        // =========================================================================
        // ICONE (SVG inline, nessuna libreria esterna)
        // =========================================================================
        const LUCIDE_ICONS = {"bar-chart-2": "<path d=\"M5 21v-6\" /><path d=\"M12 21V3\" /><path d=\"M19 21V9\" />", "book-open": "<path d=\"M12 5v16\" /><path d=\"M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z\" />", "calendar": "<path d=\"M8 2v3\" /><path d=\"M16 2v3\" /><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" /><path d=\"M3 9h18\" />", "check": "<path d=\"M20 6 9 17l-5-5\" />", "check-circle-2": "<circle cx=\"12\" cy=\"12\" r=\"10\" /><path d=\"m16 9-5.5 5.5L8 12\" />", "chevron-left": "<path d=\"m15 18-6-6 6-6\" />", "chevron-right": "<path d=\"m9 18 6-6-6-6\" />", "coffee": "<path d=\"M10 2v2\" /><path d=\"M14 2v2\" /><path d=\"M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1\" /><path d=\"M6 2v2\" />", "compass": "<circle cx=\"12\" cy=\"12\" r=\"10\" /><path d=\"m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z\" />", "download": "<path d=\"M12 15V3\" /><path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\" /><path d=\"m7 10 5 5 5-5\" />", "flame": "<path d=\"M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4\" />", "flower-2": "<path d=\"M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1\" /><circle cx=\"12\" cy=\"8\" r=\"2\" /><path d=\"M12 10v12\" /><path d=\"M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z\" /><path d=\"M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z\" />", "leaf": "<path d=\"M11 20a10 10 0 0010-10 25.9 25.9 0 00-1.04-7.281 1 1 0 00-1.755-.325C15.833 5.5 13 5.5 9.8 6.1A7 7 0 0011 20\" /><path d=\"M2 21a5 5 0 012.911-4.544C7.613 15.212 8.351 15.24 11 13\" />", "moon": "<path d=\"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401\" />", "pause": "<rect x=\"14\" y=\"3\" width=\"5\" height=\"18\" rx=\"1\" /><rect x=\"5\" y=\"3\" width=\"5\" height=\"18\" rx=\"1\" />", "play": "<path d=\"M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z\" />", "shield-alert": "<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\" /><path d=\"M12 8v4\" /><path d=\"M12 16h.01\" />", "sprout": "<path d=\"M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3\" /><path d=\"M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4\" /><path d=\"M5 21h14\" />", "sun": "<circle cx=\"12\" cy=\"12\" r=\"4\" /><path d=\"M12 2v2\" /><path d=\"M12 20v2\" /><path d=\"m4.93 4.93 1.41 1.41\" /><path d=\"m17.66 17.66 1.41 1.41\" /><path d=\"M2 12h2\" /><path d=\"M20 12h2\" /><path d=\"m6.34 17.66-1.41 1.41\" /><path d=\"m19.07 4.93-1.41 1.41\" />", "timer": "<line x1=\"10\" x2=\"14\" y1=\"2\" y2=\"2\" /><line x1=\"12\" x2=\"15\" y1=\"14\" y2=\"11\" /><circle cx=\"12\" cy=\"14\" r=\"8\" />", "upload": "<path d=\"M12 3v12\" /><path d=\"m17 8-5-5-5 5\" /><path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\" />", "x": "<path d=\"M18 6 6 18\" /><path d=\"m6 6 12 12\" />"};
        const lucide = {
            createIcons() {
                document.querySelectorAll('i[data-lucide]').forEach(el => {
                    const name = el.getAttribute('data-lucide');
                    const inner = LUCIDE_ICONS[name];
                    if (!inner) { console.warn('Icona mancante:', name); return; }
                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('width', '24'); svg.setAttribute('height', '24');
                    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
                    svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2');
                    svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
                    svg.setAttribute('aria-hidden', 'true');
                    svg.setAttribute('class', ('lucide lucide-' + name + ' ' + (el.getAttribute('class') || '')).trim());
                    svg.innerHTML = inner;
                    el.replaceWith(svg);
                });
            }
        };

        // =========================================================================
        // SALVATAGGIO LOCALE (localStorage del browser, nessun dato esce dal dispositivo)
        // =========================================================================
        const STORAGE_KEY = 'diario-olfattivo-v1';
        const LEGACY_KEY = 'sos-smell-journey-set01-v1';   // versione precedente: letta una volta e copiata nella chiave nuova
        let saveTimeout = null;

        function updateSyncBadge(status) {
            const badge = document.getElementById('sync-status-badge');
            if (!badge) return;
            if (status === 'saving') {
                badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span><span class="text-amber-700">Salvataggio...</span>`;
            } else if (status === 'saved') {
                badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span class="text-emerald-700">Salvato su questo dispositivo</span>`;
            } else if (status === 'error') {
                badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-red-500"></span><span class="text-red-600">NON salvato: esporta un backup</span>`;
            }
        }

        // Unisce i dati salvati alla struttura di default: campi mancanti non rompono nulla
        function deepMerge(base, saved) {
            if (Array.isArray(base)) {
                return (Array.isArray(saved) && saved.length === base.length)
                    ? base.map((b, i) => deepMerge(b, saved[i]))
                    : base;
            }
            if (base !== null && typeof base === 'object') {
                const out = {};
                for (const k of Object.keys(base)) {
                    out[k] = (saved && typeof saved === 'object' && k in saved) ? deepMerge(base[k], saved[k]) : base[k];
                }
                return out;
            }
            return (saved === undefined) ? base : saved;
        }

        function hydrateState(saved) {
            const st = deepMerge(createDefaultState(), saved);
            st.setId = (saved && SET_DEFS[saved.setId]) ? saved.setId : 'set01';
            applySet(st.setId);
            if (!(st.currentWeek >= 1 && st.currentWeek <= 12)) st.currentWeek = 1;
            st.archive = (saved && Array.isArray(saved.archive)) ? saved.archive : [];
            return st;
        }

        function saveNow() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: new Date().toISOString(), state: appState }));
                updateSyncBadge('saved');
                updateBackupInfo();
                updateRefillInfo();
                renderNextChoice();
                return true;
            } catch (err) {
                console.error('Errore salvataggio locale:', err);
                updateSyncBadge('error');
                return false;
            }
        }

        // Salvataggio automatico dopo ogni modifica (piccolo ritardo mentre scrivi)
        function scheduleAutoSave() {
            updateSyncBadge('saving');
            if (saveTimeout) clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => { saveTimeout = null; saveNow(); }, 300);
        }

        function flushSave() {
            if (saveTimeout) { clearTimeout(saveTimeout); saveTimeout = null; saveNow(); }
        }

        // ---------- Promemoria backup ----------
        const BACKUP_KEY = STORAGE_KEY + '-lastbackup';
        let backupBannerDismissed = false;

        function daysSinceBackup() {
            try {
                const v = localStorage.getItem(BACKUP_KEY) || localStorage.getItem(LEGACY_KEY + '-lastbackup');
                if (!v) return null;
                const t = new Date(v).getTime();
                if (isNaN(t)) return null;
                return Math.max(0, Math.floor((Date.now() - t) / 86400000));
            } catch (e) { return null; }
        }

        function hasAnyData() {
            return hasAnyDiaryData(appState, localDateStr());
        }

        
        function updateBackupInfo() {
            const days = daysSinceBackup();
            const stale = days === null || days >= 7;
            const status = document.getElementById('backup-status');
            if (status) {
                let txt, cls;
                if (days === null) { txt = 'Nessun backup scaricato finora.'; cls = 'text-amber-700'; }
                else if (days === 0) { txt = 'Ultimo backup: oggi.'; cls = 'text-emerald-700'; }
                else if (days === 1) { txt = 'Ultimo backup: ieri.'; cls = 'text-stone-500'; }
                else { txt = `Ultimo backup: ${days} giorni fa.`; cls = days >= 7 ? 'text-amber-700' : 'text-stone-500'; }
                status.textContent = txt;
                status.className = 'block mt-1.5 text-xs font-medium ' + cls;
            }
            const banner = document.getElementById('backup-banner');
            if (banner) {
                const show = stale && hasAnyData() && !backupBannerDismissed;
                banner.classList.toggle('hidden', !show);
                const t = document.getElementById('backup-banner-text');
                if (show && t) {
                    t.textContent = days === null
                        ? 'Non hai ancora scaricato un backup: i dati sono solo in questo browser.'
                        : `Ultimo backup ${days} giorni fa. Scarica una copia aggiornata.`;
                }
            }
        }

        function dismissBackupBanner() {
            backupBannerDismissed = true;
            updateBackupInfo();
        }

        // ---------- Scelta, nuovo percorso e archivio ----------
        function otherSetId() { return appState.setId === 'set01' ? 'set02' : 'set01'; }
        function setNextChoice(v) {
            appState.nextChoice = (appState.nextChoice === v) ? null : v;
            scheduleAutoSave();
            renderNextChoice();
            updateNotices();
        }
        function renderNextChoice() {
            const c = appState.nextChoice === 'set02' ? 'other' : appState.nextChoice;
            const cur = SET_DEFS[appState.setId] || SET_DEFS.set01, oth = SET_DEFS[otherSetId()];
            const names = d => d.scents.map(x => x.name).join(' · ');
            const base = 'text-left p-4 rounded-2xl border transition ';
            const on = 'border-botanical-700 bg-botanical-50 ring-1 ring-inset ring-botanical-700', off = 'border-stone-200 bg-white hover:bg-stone-50';
            const bs = document.getElementById('choice-same'), bo = document.getElementById('choice-other');
            if (!bs || !bo) return;
            bs.className = base + (c === 'same' ? on : off);
            bo.className = base + (c === 'other' ? on : off);
            document.getElementById('choice-same-title').textContent = `Continuo con il ${cur.name}`;
            document.getElementById('choice-same-sub').textContent = names(cur);
            document.getElementById('choice-other-title').textContent = `Passo al ${oth.name}`;
            document.getElementById('choice-other-sub').textContent = names(oth);
            document.getElementById('choice-detail-same').classList.toggle('hidden', c !== 'same');
            document.getElementById('choice-detail-other').classList.toggle('hidden', c !== 'other');
            document.getElementById('btn-new-same').textContent = `Inizia nuovo percorso con il ${cur.name}`;
            document.getElementById('btn-new-other').textContent = `Inizia nuovo percorso con il ${oth.name}`;
            const wb = document.getElementById('w12-btn-same'), wo = document.getElementById('w12-btn-other');
            if (wb && wo) { wb.textContent = `Inizia nuovo percorso con il ${cur.name}`; wo.textContent = `Inizia nuovo percorso con il ${oth.name}`; }
            document.getElementById('other-scents').innerHTML = oth.scents
                .map(x => `<span class="px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-800 text-xs font-medium">${x.name}</span>`).join('');
        }
        function fmtDate(str, addDays = 0) {
            const p = str.split('-'); const d = new Date(p[0], p[1] - 1, p[2]); d.setDate(d.getDate() + addDays);
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        }
        function renderArchive() {
            const card = document.getElementById('archive-card'), list = document.getElementById('archive-list');
            if (!card || !list) return;
            const arch = appState.archive || [];
            card.classList.toggle('hidden', arch.length === 0);
            list.innerHTML = arch.slice().reverse().map(e => {
                const st = e.state, def = SET_DEFS[e.setId] || SET_DEFS.set01;
                const sess = Object.values(st.weeks).reduce((n, w) => n + w.days.filter(d => d.morning).length + w.days.filter(d => d.evening).length, 0);
                const val = v => escapeHtml((v === null || v === undefined) ? '–' : v);
                const rows = def.scents.map(x => `<li>${x.name}: ${[st.baseline[x.id].score, st.weeks[4].scents[x.id].score, st.weeks[8].scents[x.id].score, st.weeks[12].scents[x.id].score].map(val).join(' → ')}</li>`).join('');
                return `<div class="rounded-2xl border border-stone-200 p-4"><div class="font-bold text-sm text-stone-900">${def.name} · ${fmtDate(st.profile.startDate)} – ${fmtDate(st.profile.startDate, 83)}</div><div class="text-xs text-stone-500 mt-0.5">${sess}/168 sessioni · punteggi: inizio → sett. 4 → 8 → 12</div><ul class="mt-2 space-y-0.5 text-xs text-stone-600">${rows}</ul></div>`;
            }).join('');
        }
        function applySetStatics() {
            const set = SET_DEFS[appState.setId] || SET_DEFS.set01;
            ['set-badge', 'guide-set-badge'].forEach(id => { const e = document.getElementById(id); if (e) e.textContent = set.name; });
            document.querySelectorAll('[data-scent-th]').forEach(th => { th.textContent = SCENTS[+th.dataset.scentTh].name.split(' ')[0]; });
            const gs = document.getElementById('guide-scents');
            if (gs) gs.innerHTML = SCENTS.map(x => { const p = PALETTE[x.colorClass]; return `<div class="p-5 rounded-2xl ${p.c} flex gap-4"><div class="w-12 h-12 rounded-2xl ${p.i} flex items-center justify-center shrink-0"><i data-lucide="sprout" class="w-6 h-6"></i></div><div><h3 class="font-bold text-stone-900 text-base">${x.name}</h3><p class="text-xs font-semibold ${p.t} mt-0.5">${x.character}</p><p class="text-sm text-stone-600 mt-2">${x.hint}</p></div></div>`; }).join('');
            const oh = [...document.querySelectorAll('h3')].find(e => e.textContent.trim() === 'I tuoi quattro oli');
            if (oh && oh.parentElement) oh.parentElement.classList.toggle('hidden', appState.setId !== 'set01');
            renderNextChoice();
            renderArchive();
            lucide.createIcons();
        }
        let pendingSet = null;
        function openNewPathDialog(targetSet) {
            pendingSet = targetSet;
            const d = daysSince(appState.profile.startDate);
            const warn = document.getElementById('np-warning');
            if (d !== null && d < 84) {
                warn.textContent = `Attenzione: il percorso attuale non è ancora finito (mancano ${84 - Math.max(d, 0)} giorni alla fine della settimana 12). Le settimane non svolte resteranno vuote nell'archivio.`;
                warn.classList.remove('hidden');
            } else warn.classList.add('hidden');
            document.getElementById('np-set').textContent = `i profumi del ${(SET_DEFS[targetSet] || SET_DEFS.set01).name}`;
            document.getElementById('newpath-modal').classList.remove('hidden');
        }
        function openCurrentSetNewPathDialog() {
            openNewPathDialog(appState.setId);
        }

        function closeNewPathDialog() { pendingSet = null; document.getElementById('newpath-modal').classList.add('hidden'); }
        function confirmNewPath() { const t = pendingSet; closeNewPathDialog(); if (t) startNewPath(t); }
        function startNewPath(targetSet) {
            const prev = appState;
            const old = JSON.parse(JSON.stringify(prev)); delete old.archive;
            const archive = (prev.archive || []).concat([{ archivedAt: new Date().toISOString(), setId: prev.setId, state: old }]);
            applySet(targetSet);
            appState = createDefaultState();
            appState.setId = targetSet;
            appState.archive = archive;
            ['name', 'morningTime', 'eveningTime'].forEach(k => { appState.profile[k] = prev.profile[k]; });
            if (targetSet === prev.setId) appState.refill = prev.refill;
            viewPause = 0; lastPillsWeek = null;
            saveNow();
            applySetStatics();
            switchTab('partenza');
            showToast('Nuovo percorso iniziato: compila il punto di partenza');
        }

        // ---------- Avvisi all'apertura ----------
        const dismissedNotices = {};
        function dismissNotice(k) { dismissedNotices[k] = true; updateNotices(); }
        function goToWeekPoints() { const tw = getTodayWeek(); if (tw !== -1) selectWeek(tw); }
        function updateNotices() {
            const tw = getTodayWeek();
            const wk = document.getElementById('weekly-banner');
            if (wk) {
                const isDay7 = tw !== -1 && getTodayIndexInWeek(tw) === 6;
                const missing = isDay7 && Object.values(appState.weeks[tw].scents).some(x => x.score === null);
                const show = missing && !dismissedNotices.weekly;
                wk.classList.toggle('hidden', !show);
                const t = document.getElementById('weekly-banner-text');
                if (show && t) t.textContent = `Oggi è il giorno del punto sui profumi (settimana ${tw}): dai un punteggio ai 4 profumi e annota le impressioni.`;
            }
            const fb = document.getElementById('finish-banner');
            if (fb) {
                const d = daysSince(appState.profile.startDate);
                const show = d !== null && d >= 77 && !dismissedNotices.finish;
                fb.classList.toggle('hidden', !show);
                const ft = document.getElementById('finish-banner-text');
                if (show && ft) ft.textContent = d >= 84
                    ? 'Percorso completato: per continuare a registrare inizia un nuovo percorso (stesso set o altri profumi).'
                    : 'Sei alla settimana 12: compila il riepilogo e scegli come continuare (stesso set o altri profumi).';
            }
        }

        // ---------- Ricarica degli oli ----------
        function localDateStr(d = new Date()) {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        function daysSince(dateStr) {
            if (!dateStr) return null;
            const p = dateStr.split('-');
            const d = new Date(p[0], p[1] - 1, p[2]);
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            return Math.round((today - d) / 86400000);
        }
        let refillBannerDismissed = false;
        function markRefilled() {
            appState.refill.last = localDateStr();
            scheduleAutoSave();
            updateRefillInfo();
            showToast('Ricarica registrata');
        }
        function dismissRefillBanner() { refillBannerDismissed = true; updateRefillInfo(); }
        function updateRefillInfo() {
            updateNotices();
            const last = appState.refill && appState.refill.last;
            const days = daysSince(last || appState.profile.startDate);
            const status = document.getElementById('refill-status');
            if (status) {
                status.textContent = last
                    ? (days === 0 ? 'Ultima ricarica: oggi.' : days === 1 ? 'Ultima ricarica: ieri.' : `Ultima ricarica: ${days} giorni fa.`)
                    : 'Nessuna ricarica registrata finora.';
            }
            const banner = document.getElementById('refill-banner');
            if (banner) {
                const due = days !== null && days >= 14 && !refillBannerDismissed;
                banner.classList.toggle('hidden', !due);
                const t = document.getElementById('refill-banner-text');
                if (due && t) {
                    t.textContent = `${last ? 'Ultima ricarica' : 'Dall\'inizio'}: ${days} giorni fa. Consigliate 3–5 gocce per vasetto ogni 2 settimane, o prima se il profumo si attenua.`;
                }
            }
        }

        function initLocalSave() {
            let loaded = false;
            let fromLegacy = false;
            try {
                let raw = localStorage.getItem(STORAGE_KEY);
                if (!raw) { raw = localStorage.getItem(LEGACY_KEY); fromLegacy = !!raw; }
                if (raw) {
                    const parsed = JSON.parse(raw);
                    appState = hydrateState(parsed.state || parsed);
                    loaded = true;
                }
            } catch (err) {
                console.error('Errore lettura dati locali:', err);
            }
            if (loaded && !fromLegacy) updateSyncBadge('saved'); else saveNow();
            updateBackupInfo();
            updateRefillInfo();
            applySetStatics();
            jumpToToday();
            try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
            if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
            window.addEventListener('pagehide', flushSave);
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') flushSave();
                else if (todayKey() !== renderedDay) { jumpToToday(); renderActiveTab(); updateNotices(); updateRefillInfo(); updateBackupInfo(); }
            });
        }

        function renderActiveTab() {
            if (activeTab === 'riepilogo') renderSummaryView();
            else if (activeTab === 'partenza') renderBaselineView();
            else if (activeTab === 'calendario') renderCalendarView();
            lucide.createIcons();
        }

        // =========================================================================
        // GESTIONE NAVIGAZIONE E RENDERING
        // =========================================================================
        function switchTab(tabName) {
            activeTab = tabName;
            ['calendario', 'partenza', 'riepilogo', 'guida'].forEach(t => {
                document.getElementById(`view-${t}`).classList.add('hidden');
                const btn = document.getElementById(`nav-${t}`);
                btn.classList.remove('bg-white', 'text-botanical-900', 'shadow-sm');
                btn.classList.add('text-stone-600');
            });

            document.getElementById(`view-${tabName}`).classList.remove('hidden');
            const activeBtn = document.getElementById(`nav-${tabName}`);
            activeBtn.classList.add('bg-white', 'text-botanical-900', 'shadow-sm');
            activeBtn.classList.remove('text-stone-600');

            renderActiveTab();
        }

        let viewPause = 0;   // 4 o 8 = si sta guardando il momento di riflessione dopo quella settimana
        function activePause() { return (viewPause && viewPause === appState.currentWeek) ? viewPause : 0; }
        function stepList() {
            const a = [];
            for (let i = 1; i <= 12; i++) { a.push({ w: i, pause: 0 }); if (i === 4 || i === 8) a.push({ w: i, pause: i }); }
            return a;
        }
        function currentStepIndex() { const p = activePause(); return stepList().findIndex(x => x.w === appState.currentWeek && x.pause === p); }
        function changeWeek(delta) {
            const steps = stepList();
            const i = currentStepIndex() + delta;
            if (i >= 0 && i < steps.length) {
                appState.currentWeek = steps[i].w;
                viewPause = steps[i].pause;
                renderCalendarView();
                scheduleAutoSave();
            }
        }
        function selectWeek(weekNum) {
            appState.currentWeek = weekNum;
            viewPause = 0;
            renderCalendarView();
            scheduleAutoSave();
        }
        function selectPause(weekNum) {
            appState.currentWeek = weekNum;
            viewPause = weekNum;
            renderCalendarView();
            scheduleAutoSave();
        }

        // Calcola le date reali dei 7 giorni della settimana selezionata partendo da startDate
        let lastPillsWeek = null;
        const WEEKDAY_ABBR = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
        function getWeekDates(weekNum, withDay = false) {
            if (!appState.profile.startDate) return Array(7).fill('');
            const parts = appState.profile.startDate.split('-');
            const start = new Date(parts[0], parts[1] - 1, parts[2]);
            start.setDate(start.getDate() + (weekNum - 1) * 7);

            const dates = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                dates.push((withDay ? WEEKDAY_ABBR[d.getDay()] + ' ' : '') + `${dd}/${mm}`);
            }
            return dates;
        }

        function renderCalendarView() {
            const w = appState.currentWeek;
            const inPause = activePause() !== 0;
            const meta = WEEKS_META[w - 1];
            const weekData = appState.weeks[w];
            const dates = getWeekDates(w);
            const todayIdx = getTodayIndexInWeek(w);
            const datesDay = getWeekDates(w, true);
            const todayWeek = getTodayWeek();
            const todayButton = document.getElementById('btn-go-today');
            todayButton.classList.toggle('hidden', todayWeek === -1 || (w === todayWeek && !inPause));

            // Intestazione settimana (o momento di riflessione)
            const pad2 = n => String(n).padStart(2, '0');
            if (inPause) {
                document.getElementById('stage-badge').textContent = 'Momento di riflessione';
                document.getElementById('week-title').textContent = `Pausa — dopo la settimana ${pad2(w)}`;
                document.getElementById('week-prompt-desc').textContent = 'Non è una vera pausa: il rituale continua ogni giorno, mattina e sera. È solo un momento per rileggere le tue note.';
                document.getElementById('week-counter').textContent = 'Pausa';
                document.getElementById('week-dates-label').textContent = `tra Sett ${pad2(w)} e Sett ${pad2(w + 1)}`;
            } else {
                document.getElementById('stage-badge').textContent = meta.stage;
                document.getElementById('week-title').textContent = `Settimana ${pad2(w)} — ${meta.title}`;
                document.getElementById('week-prompt-desc').textContent = meta.desc;
                document.getElementById('week-counter').textContent = `${pad2(w)} / 12`;
                document.getElementById('week-dates-label').textContent = dates[0] ? `${dates[0]} – ${dates[6]}` : '';
            }
            document.getElementById('main-grid').classList.toggle('hidden', inPause);
            document.getElementById('week12-finish').classList.toggle('hidden', !(w === 12 && !inPause));

            document.getElementById('btn-prev-week').disabled = (currentStepIndex() === 0);
            document.getElementById('btn-next-week').disabled = (currentStepIndex() === stepList().length - 1);

            // Pillole 1-12
            const pillsContainer = document.getElementById('week-pills-container');
            const prevScroll = pillsContainer.scrollLeft;
            pillsContainer.innerHTML = '';
            let selectedPillEl = null;
            for (let i = 1; i <= 12; i++) {
                const isSelected = i === w && !inPause;
                const wSessions = appState.weeks[i].days.reduce((acc, d) => acc + (d.morning ? 1 : 0) + (d.evening ? 1 : 0), 0);
                const hasEval = Object.values(appState.weeks[i].scents).some(s => s.score !== null);

                const btn = document.createElement('button');
                btn.onclick = () => selectWeek(i);
                btn.className = `px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 border ${
                    isSelected 
                        ? 'bg-botanical-800 text-white border-botanical-800 shadow-sm' 
                        : 'bg-stone-50 text-stone-600 border-stone-200/80 hover:bg-botanical-50'
                }`;
                btn.setAttribute('aria-current', isSelected ? 'step' : 'false');
                btn.setAttribute('aria-label', `Vai alla settimana ${i}`);
                btn.innerHTML = `
                    <span>Sett ${String(i).padStart(2, '0')}</span>
                    ${(wSessions > 0 || hasEval) ? `<span class="w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-300' : 'bg-botanical-500'}"></span>` : ''}
                `;
                if (i === getTodayWeek()) btn.classList.add('ring-2', 'ring-inset', 'ring-emerald-400');
                if (isSelected) selectedPillEl = btn;
                pillsContainer.appendChild(btn);
                if (i === 4 || i === 8) {
                    const pb = document.createElement('button');
                    const pSel = inPause && w === i;
                    pb.onclick = () => selectPause(i);
                    pb.className = `px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all border border-dashed ${pSel ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'}`;
                    pb.textContent = 'Pausa';
                    if (pSel) selectedPillEl = pb;
                    pillsContainer.appendChild(pb);
                }
            }

            // Le pillole vengono ricreate a ogni render: ripristina lo scorrimento e, se la settimana
            // è cambiata, porta la pillola selezionata al centro (animazione fluida)
            if (pillsContainer.clientWidth > 0) {
                pillsContainer.scrollLeft = prevScroll;
                const sel = selectedPillEl;
                const pillKey = inPause ? 'p' + w : w;
                if (sel && pillKey !== lastPillsWeek) {
                    const cr = pillsContainer.getBoundingClientRect();
                    const br = sel.getBoundingClientRect();
                    const target = Math.max(0, pillsContainer.scrollLeft + (br.left - cr.left) - (cr.width - br.width) / 2);
                    const behavior = lastPillsWeek === null ? 'auto' : 'smooth';
                    if (typeof pillsContainer.scrollTo === 'function') pillsContainer.scrollTo({ left: target, behavior });
                    else pillsContainer.scrollLeft = target;
                    lastPillsWeek = pillKey;
                }
            }

            // Banner Pausa (dopo settimana 4 e settimana 8)
            const pauseBanner = document.getElementById('pause-reflection-banner');
            if (inPause) {
                pauseBanner.classList.remove('hidden');
                document.getElementById('pause-q1').value = appState.pauses[w].q1 || '';
                document.getElementById('pause-q2').value = appState.pauses[w].q2 || '';
                document.getElementById('pause-q3').value = appState.pauses[w].q3 || '';
            } else {
                pauseBanner.classList.add('hidden');
            }

            // Giorni e sessioni Mattino/Sera
            const daysContainer = document.getElementById('days-list-container');
            daysContainer.innerHTML = '';
            let completedCount = 0;

            weekData.days.forEach((dayObj, idx) => {
                if (dayObj.morning) completedCount++;
                if (dayObj.evening) completedCount++;

                const row = document.createElement('div');
                const isToday = idx === todayIdx;
                row.className = 'grid grid-cols-12 items-center py-2.5 px-2 transition ' + (isToday ? 'my-1 rounded-xl border border-emerald-300 bg-emerald-50' : 'border-b border-stone-100 last:border-b-0 hover:bg-stone-50/80');
                row.innerHTML = `
                    <div class="col-span-6 flex items-center gap-2">
                        <span class="text-xs font-bold text-stone-400 w-5">${String(idx + 1).padStart(2, '0')}</span>
                        <div>
                            <div class="text-sm font-medium text-stone-800">${DAY_NAMES[idx]}${isToday ? ' <span class="ml-1 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-semibold uppercase tracking-wide align-middle">Oggi</span>' : ''}</div>
                            <div class="text-xs text-stone-500">${datesDay[idx] || ''}</div>
                        </div>
                    </div>
                    <div class="col-span-3 flex justify-center">
                        <button onclick="toggleSession(${idx}, 'morning')" aria-label="Segna sessione del mattino per ${DAY_NAMES[idx]} ${datesDay[idx] || ''}" aria-pressed="${dayObj.morning}" title="Mattino" class="diary-session-toggle w-9 h-9 rounded-xl border flex items-center justify-center transition-all active:scale-90 ${
                            dayObj.morning 
                                ? 'bg-amber-500 border-amber-500 text-white shadow-sm' 
                                : 'bg-white border-stone-200 text-transparent hover:border-amber-300'
                        }">
                            <i data-lucide="check" class="w-5 h-5 stroke-[2.5]"></i>
                        </button>
                    </div>
                    <div class="col-span-3 flex justify-center">
                        <button onclick="toggleSession(${idx}, 'evening')" aria-label="Segna sessione della sera per ${DAY_NAMES[idx]} ${datesDay[idx] || ''}" aria-pressed="${dayObj.evening}" title="Sera" class="diary-session-toggle w-9 h-9 rounded-xl border flex items-center justify-center transition-all active:scale-90 ${
                            dayObj.evening 
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                                : 'bg-white border-stone-200 text-transparent hover:border-indigo-300'
                        }">
                            <i data-lucide="check" class="w-5 h-5 stroke-[2.5]"></i>
                        </button>
                    </div>
                `;
                daysContainer.appendChild(row);
            });

            const weeklyPercent = Math.round((completedCount / 14) * 100);
            document.getElementById('weekly-sessions-badge').textContent = `${completedCount} / 14 sessioni`;
            document.getElementById('weekly-sessions-progress-track').setAttribute('aria-valuenow', String(completedCount));
            document.getElementById('weekly-sessions-progress').style.width = `${weeklyPercent}%`;
            document.getElementById('weekly-progress-text').textContent = completedCount === 14
                ? 'Hai registrato tutte le 14 sessioni possibili questa settimana.'
                : `Hai registrato ${completedCount} sessioni su 14 possibili.`;
            document.getElementById('schedule-times-display').textContent = `Orari target: ${appState.profile.morningTime} e ${appState.profile.eveningTime}`;

            // Note settimanali
            document.getElementById('reflection-question-label').textContent = meta.question;
            document.getElementById('week-reflection-input').value = weekData.reflection || '';
            document.getElementById('week-other-notes-input').value = weekData.otherNotes || '';

            // Valutazione 4 Profumi a fine settimana
            const scentsContainer = document.getElementById('scents-evaluation-container');
            scentsContainer.innerHTML = '';

            SCENTS.forEach(scent => {
                const sData = weekData.scents[scent.id];
                const card = document.createElement('div');
                card.className = 'p-4 rounded-2xl border border-stone-200/80 bg-stone-50/40 space-y-3';
                
                // Bottoni punteggio 0..5
                let scaleButtonsHtml = '';
                for (let val = 0; val <= 5; val++) {
                    const isSelected = sData.score === val;
                    scaleButtonsHtml += `
                        <button onclick="setScentScore(${w}, '${scent.id}', ${val})" aria-label="Valutazione ${scent.name}: ${val} - ${SCALE_LABELS[val]}" aria-pressed="${isSelected}" title="${SCALE_LABELS[val]}" class="diary-score-button flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all active:scale-95 ${
                            isSelected 
                                ? scent.activeBtn + ' shadow-sm' 
                                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                        }">
                            ${val}
                        </button>
                    `;
                }

                card.innerHTML = `
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${scent.badgeBg}">${scent.name}</span>
                            <span class="text-xs text-stone-500 hidden sm:inline">${scent.character}</span>
                        </div>
                        <span class="text-xs font-medium text-stone-500">
                            ${sData.score !== null ? `${sData.score} — ${SCALE_LABELS[sData.score]}` : 'Non valutato'}
                        </span>
                    </div>
                    <div class="flex items-center gap-1.5" role="group" aria-label="Scala di intensità per ${scent.name}, da 0 a 5">
                        ${scaleButtonsHtml}
                    </div>
                    <div>
                        <input type="text" value="${escapeHtml(sData.impression)}" oninput="setScentImpression(${w}, '${scent.id}', this.value)" placeholder="Impressione (es. debole, agrumato, insolito, ancora nulla...)" class="w-full text-xs sm:text-sm rounded-xl border border-stone-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-botanical-500">
                    </div>
                `;
                scentsContainer.appendChild(card);
            });

            lucide.createIcons();
        }

        // =========================================================================
        // RENDERING PUNTO DI PARTENZA (BASELINE)
        // =========================================================================
        function renderBaselineView() {
            document.getElementById('setup-name').value = appState.profile.name;
            document.getElementById('setup-start-date').value = appState.profile.startDate;
            document.getElementById('setup-morning-time').value = appState.profile.morningTime;
            document.getElementById('setup-evening-time').value = appState.profile.eveningTime;
            document.getElementById('setup-initial-notes').value = appState.profile.initialNotes;

            const container = document.getElementById('baseline-scents-container');
            container.innerHTML = '';

            SCENTS.forEach(scent => {
                const bData = appState.baseline[scent.id];
                let btns = '';
                for (let val = 0; val <= 5; val++) {
                    const isSelected = bData.score === val;
                    btns += `
                        <button onclick="setBaselineScore('${scent.id}', ${val})" class="flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                            isSelected ? scent.activeBtn : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                        }">${val}</button>
                    `;
                }

                const card = document.createElement('div');
                card.className = 'p-4 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-3';
                card.innerHTML = `
                    <div class="flex items-center justify-between">
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${scent.badgeBg}">${scent.name}</span>
                        <span class="text-xs text-stone-500">${bData.score !== null ? SCALE_LABELS[bData.score] : 'Non valutato'}</span>
                    </div>
                    <div class="flex gap-1.5">${btns}</div>
                    <input type="text" value="${escapeHtml(bData.impression)}" oninput="setBaselineImpression('${scent.id}', this.value)" placeholder="Impressione iniziale..." class="w-full text-xs sm:text-sm rounded-xl border border-stone-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-botanical-500">
                `;
                container.appendChild(card);
            });
        }

        // =========================================================================
        // RENDERING RIEPILOGO (PAGINA 21 DEL PDF)
        // =========================================================================
        function renderSummaryView() {
            // Calcolo sessioni totali
            let totalSessions = 0;
            for (let w = 1; w <= 12; w++) {
                totalSessions += appState.weeks[w].days.reduce((acc, d) => acc + (d.morning ? 1 : 0) + (d.evening ? 1 : 0), 0);
            }
            document.getElementById('total-sessions-stat').textContent = `${totalSessions} / 168`;

            // Griglia Confronto Tappe Chiave (Inizio, Sett 4, Sett 8, Sett 12)
            const milestonesGrid = document.getElementById('summary-milestones-grid');
            milestonesGrid.innerHTML = '';

            const milestones = [
                { label: 'Inizio', getVal: (id) => appState.baseline[id] },
                { label: 'Settimana 4', getVal: (id) => appState.weeks[4].scents[id] },
                { label: 'Settimana 8', getVal: (id) => appState.weeks[8].scents[id] },
                { label: 'Settimana 12', getVal: (id) => appState.weeks[12].scents[id] }
            ];

            SCENTS.forEach(scent => {
                let rowsHtml = '';
                milestones.forEach(m => {
                    const item = m.getVal(scent.id);
                    const score = item.score;
                    let dotsHtml = '';
                    for (let i = 0; i <= 5; i++) {
                        const active = score === i;
                        dotsHtml += `<span class="w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center border ${
                            active ? scent.activeBtn : 'border-stone-200 text-stone-300 bg-white'
                        }">${i}</span>`;
                    }
                    rowsHtml += `
                        <div class="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                            <div>
                                <div class="text-xs font-semibold text-stone-700">${m.label}</div>
                                <div class="text-[11px] text-stone-400 truncate max-w-[130px]">${escapeHtml(item.impression || '—')}</div>
                            </div>
                            <div class="flex gap-1">${dotsHtml}</div>
                        </div>
                    `;
                });

                const card = document.createElement('div');
                card.className = 'p-5 rounded-2xl border border-stone-200 bg-stone-50/40';
                card.innerHTML = `
                    <div class="flex items-center justify-between mb-3">
                        <span class="px-2.5 py-1 rounded-full text-xs font-bold ${scent.badgeBg}">${scent.name}</span>
                        <span class="text-xs text-stone-400">${scent.character}</span>
                    </div>
                    <div class="divide-y divide-stone-100">${rowsHtml}</div>
                `;
                milestonesGrid.appendChild(card);
            });

            // Tabella completa 12 settimane
            const tbody = document.getElementById('summary-full-table');
            tbody.innerHTML = '';
            for (let w = 1; w <= 12; w++) {
                const wData = appState.weeks[w];
                const sess = wData.days.reduce((acc, d) => acc + (d.morning ? 1 : 0) + (d.evening ? 1 : 0), 0);
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-stone-50 cursor-pointer';
                tr.onclick = () => { appState.currentWeek = w; switchTab('calendario'); };
                tr.innerHTML = `
                    <td class="py-2.5 px-3 font-medium text-stone-800">Settimana ${String(w).padStart(2, '0')}</td>
                    <td class="py-2.5 px-3 text-xs text-stone-500">${sess}/14</td>
                    <td class="py-2.5 px-3 font-bold text-stone-800">${escapeHtml(wData.scents.eucalipto.score ?? '—')}</td>
                    <td class="py-2.5 px-3 font-bold text-stone-800">${escapeHtml(wData.scents.limone.score ?? '—')}</td>
                    <td class="py-2.5 px-3 font-bold text-stone-800">${escapeHtml(wData.scents.geranio.score ?? '—')}</td>
                    <td class="py-2.5 px-3 font-bold text-stone-800">${escapeHtml(wData.scents.garofano.score ?? '—')}</td>
                `;
                tbody.appendChild(tr);
            }

            document.getElementById('final-summary-q1').value = appState.profile.finalReflection || '';
            document.getElementById('final-summary-q2').value = appState.profile.nextStep || '';
        }

        // =========================================================================
        // MUTAZIONI DELLO STATO
        // =========================================================================
        function toggleSession(dayIdx, period) {
            const w = appState.currentWeek;
            appState.weeks[w].days[dayIdx][period] = !appState.weeks[w].days[dayIdx][period];
            renderCalendarView();
            scheduleAutoSave();
        }

        function setScentScore(weekNum, scentId, val) {
            const current = appState.weeks[weekNum].scents[scentId].score;
            // Se riclicco lo stesso numero, torna null ("Vuoto = non valutato" come nel PDF)
            appState.weeks[weekNum].scents[scentId].score = (current === val) ? null : val;
            renderCalendarView();
            scheduleAutoSave();
        }

        function setScentImpression(weekNum, scentId, text) {
            appState.weeks[weekNum].scents[scentId].impression = text;
            scheduleAutoSave();
        }

        function updateWeekNote(field, text) {
            appState.weeks[appState.currentWeek][field] = text;
            scheduleAutoSave();
        }

        function savePauseNote(qNum, text) {
            const w = appState.currentWeek;
            if (appState.pauses[w]) {
                appState.pauses[w][`q${qNum}`] = text;
                scheduleAutoSave();
            }
        }

        function updateProfile(field, value) {
            appState.profile[field] = value;
            scheduleAutoSave();
            if (field === 'startDate') showToast('Date del calendario aggiornate');
        }

        function setBaselineScore(scentId, val) {
            const current = appState.baseline[scentId].score;
            appState.baseline[scentId].score = (current === val) ? null : val;
            renderBaselineView();
            scheduleAutoSave();
        }

        function setBaselineImpression(scentId, text) {
            appState.baseline[scentId].impression = text;
            scheduleAutoSave();
        }

        // Export / Import JSON
        function markBackupDone() {
            try { localStorage.setItem(BACKUP_KEY, new Date().toISOString()); } catch (e) {}
            updateBackupInfo();
        }

        function downloadBackup(json, name) {
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = name + '.json';
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            markBackupDone();
            showToast('Backup scaricato');
        }

        // Su Android apre il menu Condividi (Drive, email, WhatsApp, "Salva"...); altrimenti scarica il file
        async function exportData() {
            const json = JSON.stringify(appState, null, 2);
            const name = `Diario-Olfattivo-${appState.profile.startDate || 'diario'}`;
            try {
                if (navigator.share && navigator.canShare) {
                    const candidates = [
                        new File([json], name + '.json', { type: 'application/json' }),
                        new File([json], name + '.txt', { type: 'text/plain' })
                    ];
                    const file = candidates.find(f => navigator.canShare({ files: [f] }));
                    if (file) {
                        await navigator.share({ files: [file], title: 'Backup Diario Olfattivo' });
                        markBackupDone();
                        showToast('Backup condiviso');
                        return;
                    }
                }
            } catch (e) {
                if (e && e.name === 'AbortError') return;   // chiuso senza salvare: non conta come backup
            }
            downloadBackup(json, name);
        }

        function importData(event) {
            const input = event.target;
            const file = input.files && input.files[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
                showToast('Backup troppo grande (massimo 5 MB)');
                input.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parsed = JSON.parse(e.target.result);
                    const candidate = isPlainObject(parsed) &&
                        Object.prototype.hasOwnProperty.call(parsed, 'state') ? parsed.state : parsed;
                    if (!isValidDiaryState(candidate)) {
                        showToast('Backup non valido o danneggiato');
                        return;
                    }
                    if (!confirm('Importando questo file sostituisci tutti i dati attuali del diario. Continuare?')) return;
                    appState = hydrateState(candidate);
                    applySetStatics();
                    switchTab('calendario');
                    saveNow();
                    showToast('Diario importato');
                } catch (err) {
                    console.error('Errore importazione backup:', err);
                    showToast('File non valido');
                } finally {
                    input.value = '';
                }
            };
            reader.onerror = () => {
                input.value = '';
                showToast('Impossibile leggere il file');
            };
            reader.readAsText(file);
        }

        // =========================================================================
        // TIMER GUIDATO DEL RITUALE (20s annusa / 10s pausa x 4 profumi)
        // =========================================================================
        let timerInterval = null;
        let timerRunning = false;
        let timerScentIdx = 0; // 0..3
        let timerPhase = 'sniff'; // 'sniff' (20s) | 'rest' (10s)
        let timerRemaining = 20;

        let audioCtx = null;
        function playGentleChime(freq = 528) {
            try {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) return;
                if (!audioCtx) audioCtx = new AC();
                if (audioCtx.state === 'suspended') audioCtx.resume();
                const t = audioCtx.currentTime;
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.0001, t);
                gain.gain.exponentialRampToValueAtTime(0.25, t + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(t);
                osc.stop(t + 1.5);
            } catch (e) { /* ignore audio errors */ }
        }

        function openRitualModal() {
            resetTimerState();
            document.getElementById('ritual-modal').classList.remove('hidden');
            lucide.createIcons();
        }

        function closeRitualModal() {
            stopTimer();
            document.getElementById('ritual-modal').classList.add('hidden');
        }

        function resetTimerState() {
            stopTimer();
            timerScentIdx = 0;
            timerPhase = 'sniff';
            timerRemaining = 20;
            document.getElementById('timer-controls').classList.remove('hidden');
            document.getElementById('timer-complete-actions').classList.add('hidden');
            updateTimerUI();
        }

        function toggleTimer() {
            if (timerRunning) {
                stopTimer();
            } else {
                startTimer();
            }
        }

        // ---------- Timer: tempi reali, schermo acceso, vibrazione ----------
        let timerPhaseEnd = 0;   // istante (ms) in cui finisce la fase corrente
        let wakeLock = null;

        function buzz(pattern) { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {} }

        async function requestWakeLock() {
            try {
                if ('wakeLock' in navigator && !wakeLock) {
                    wakeLock = await navigator.wakeLock.request('screen');
                    wakeLock.addEventListener('release', () => { wakeLock = null; });
                }
            } catch (e) { wakeLock = null; }
        }
        function releaseWakeLock() {
            try { if (wakeLock) wakeLock.release(); } catch (e) {}
            wakeLock = null;
        }
        // Il blocco dello schermo cade se l'app va in secondo piano: riprendilo al ritorno
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && timerRunning) requestWakeLock();
        });

        function tickTimer() {
            const remaining = Math.ceil((timerPhaseEnd - Date.now()) / 1000);
            if (remaining <= 0) advanceTimerPhase();
            else if (remaining !== timerRemaining) { timerRemaining = remaining; updateTimerUI(); }
        }

        function startTimer() {
            timerRunning = true;
            timerPhaseEnd = Date.now() + timerRemaining * 1000;
            playGentleChime(528);
            buzz(120);
            requestWakeLock();
            updateTimerUI();
            timerInterval = setInterval(tickTimer, 250);
        }

        function stopTimer() {
            if (timerRunning) timerRemaining = Math.max(1, Math.ceil((timerPhaseEnd - Date.now()) / 1000));
            timerRunning = false;
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = null;
            releaseWakeLock();
            updateTimerUI();
        }

        function skipTimerPhase() {
            advanceTimerPhase();
        }

        function advanceTimerPhase() {
            if (timerPhase === 'sniff') {
                if (timerScentIdx === 3) {
                    // Fine del 4° profumo: rituale completato!
                    stopTimer();
                    playGentleChime(660);
                    buzz([200, 100, 200, 100, 300]);
                    document.getElementById('timer-phase-label').textContent = 'Completato';
                    document.getElementById('timer-seconds').textContent = '✓';
                    document.getElementById('timer-controls').classList.add('hidden');
                    document.getElementById('timer-complete-actions').classList.remove('hidden');
                    return;
                }
                // Passa alla pausa di 10s
                timerPhase = 'rest';
                timerRemaining = 10;
                playGentleChime(440);
                buzz(150);
            } else {
                // Passa al profumo successivo (20s)
                timerScentIdx++;
                timerPhase = 'sniff';
                timerRemaining = 20;
                playGentleChime(528);
                buzz([120, 80, 120]);
            }
            timerPhaseEnd = Date.now() + timerRemaining * 1000;
            updateTimerUI();
        }

        function updateTimerUI() {
            const scent = SCENTS[timerScentIdx];
            const circle = document.getElementById('timer-circle');
            const toggleBtn = document.getElementById('btn-timer-toggle');

            document.getElementById('timer-scent-name').textContent = timerPhase === 'sniff' ? scent.name : 'Pausa (10s)';
            document.getElementById('timer-scent-hint').textContent = timerPhase === 'sniff' 
                ? scent.hint 
                : `Richiudi il vasetto e preparati per: ${SCENTS[timerScentIdx + 1]?.name || ''}`;
            
            document.getElementById('timer-phase-label').textContent = timerPhase === 'sniff' ? 'Annusa calma' : 'Riposa';
            document.getElementById('timer-seconds').textContent = timerRemaining;
            document.getElementById('timer-step-indicator').textContent = `Profumo ${timerScentIdx + 1} di 4`;

            if (timerPhase === 'sniff') {
                circle.className = 'w-44 h-44 rounded-full border-8 border-botanical-500 flex flex-col items-center justify-center bg-botanical-50 transition-all duration-500 ' + (timerRunning ? 'animate-breathe' : '');
            } else {
                circle.className = 'w-44 h-44 rounded-full border-8 border-amber-300 flex flex-col items-center justify-center bg-amber-50/60 transition-all duration-500';
            }

            for (let i = 0; i < 4; i++) {
                const dot = document.getElementById(`step-dot-${i}`);
                dot.className = `h-1.5 rounded-full transition-all ${i <= timerScentIdx ? 'bg-botanical-600' : 'bg-stone-200'}`;
            }

            toggleBtn.innerHTML = timerRunning 
                ? `<i data-lucide="pause" class="w-4 h-4"></i><span>Pausa</span>`
                : `<i data-lucide="play" class="w-4 h-4 fill-current"></i><span>${timerRemaining < 20 || timerScentIdx > 0 ? 'Riprendi' : 'Inizia'}</span>`;
            lucide.createIcons();
        }

        // Settimana (1-12) che contiene oggi, oppure -1 se oggi è fuori dal percorso
        function getTodayWeek() {
            return getRitualPosition(appState.profile.startDate)?.week ?? -1;
        }

        let renderedDay = null;
        function todayKey() { const n = new Date(); return n.getFullYear() + '-' + n.getMonth() + '-' + n.getDate(); }
        function jumpToToday() {
            const tw = getTodayWeek();
            if (tw !== -1) appState.currentWeek = tw;
            viewPause = 0;
            renderedDay = todayKey();
        }

        function goToToday() {
            if (getTodayWeek() === -1) return;
            jumpToToday();
            renderCalendarView();
            scheduleAutoSave();
        }

        // Indice (0-6) di oggi nella settimana indicata, oppure -1 se oggi non ne fa parte
        function getTodayIndexInWeek(weekNum) {
            const position = getRitualPosition(appState.profile.startDate);
            return position && position.week === weekNum ? position.dayIndex : -1;
        }

        function logCompletedRitual(period) {
            if (period !== 'morning' && period !== 'evening') return;

            const todayWeek = getTodayWeek();
            if (todayWeek === -1) {
                closeRitualModal();
                showToast('Oggi è fuori dalle 12 settimane del percorso: avvia un nuovo percorso per registrare altre sessioni.');
                return;
            }

            const todayDayIdx = getTodayIndexInWeek(todayWeek);
            if (todayDayIdx === -1) {
                closeRitualModal();
                showToast('Non riesco a individuare oggi nel calendario del percorso.');
                return;
            }

            // Il timer registra sempre la data reale di oggi, mai un giorno libero di una settimana selezionata.
            appState.currentWeek = todayWeek;
            viewPause = 0;
            jumpToToday();
            appState.weeks[todayWeek].days[todayDayIdx][period] = true;

            closeRitualModal();
            switchTab('calendario');
            scheduleAutoSave();
            showToast(`Sessione ${period === 'morning' ? 'del mattino' : 'della sera'} registrata!`);
        }

        // =========================================================================
        // ESPOSIZIONE FUNZIONI GLOBALI PER GLI EVENTI HTML INLINE
        // =========================================================================
        Object.assign(window, {
            switchTab,
            changeWeek,
            goToToday,
            selectWeek,
            toggleSession,
            setScentScore,
            setScentImpression,
            updateWeekNote,
            savePauseNote,
            updateProfile,
            setBaselineScore,
            setBaselineImpression,
            exportData,
            dismissBackupBanner,
            selectPause,
            setNextChoice,
            startNewPath,
            openNewPathDialog,
            openCurrentSetNewPathDialog,
            closeNewPathDialog,
            confirmNewPath,
            otherSetId,
            dismissNotice,
            goToWeekPoints,
            markRefilled,
            dismissRefillBanner,
            importData,
            openRitualModal,
            closeRitualModal,
            toggleTimer,
            skipTimerPhase,
            logCompletedRitual
        });

        // =========================================================================
        // UTILITY
        // =========================================================================
        function showToast(msg) {
            const toast = document.getElementById('toast');
            document.getElementById('toast-message').textContent = msg;
            toast.classList.remove('translate-y-20', 'opacity-0');
            setTimeout(() => {
                toast.classList.add('translate-y-20', 'opacity-0');
            }, 2800);
        }

        

        // Inizializzazione al caricamento
        window.addEventListener('DOMContentLoaded', () => {
            initLocalSave();
            renderCalendarView();
            lucide.createIcons();
        });
    