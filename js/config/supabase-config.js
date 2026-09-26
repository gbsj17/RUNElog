// ==========================================================
// TODO: Bloco 7.1: CONFIGURAÇÕES, SUPABASE E ESTADO GLOBAL (RUNEBYTE)
// ==========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-keys.js";

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('RuneByte PWA: Service Worker registrado com sucesso!'))
        .catch(err => console.error('RuneByte PWA: Erro ao registrar Service Worker:', err));
}

// Vinculação explícita no escopo global (window)
window.db = null;
window.useFirebase = false;
window.appId = "rune-byte-logistics-v1";

// Sem valor fixo no fallback: se ficasse "v2.0.0" hardcoded aqui, todo
// usuário novo (localStorage vazio) carregava com essa versão "instalada"
// e via o aviso de "Nova Versão" na hora, mesmo nunca tendo usado o app
// antes — e como o clique em "Atualizar" era o único jeito de gravar
// app_installed_version, quem ignorava o aviso via ele pra sempre. Com
// null aqui, carregarPatchNotesDinamico() (app.js) detecta a ausência e
// já inicializa direto com a versão mais recente do patch-notes.json.
window.CURRENT_VERSION = localStorage.getItem('app_installed_version') || null;

window.solicitarPermissaoNotificacoes = function() {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                if (window.showToast) window.showToast("Notificações ativadas no dispositivo!", "success");
            }
        });
    }
};

window.vibrarDispositivo = function(pattern = [100, 50, 100]) {
    if ("vibrate" in navigator) {
        try {
            navigator.vibrate(pattern);
        } catch (e) {}
    }
};

window.enviarNotificacaoLocal = function(titulo, corpo) {
    window.vibrarDispositivo([150, 50, 150]);
    if ("Notification" in window && Notification.permission === "granted") {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(titulo, {
                    body: corpo,
                    icon: 'icon.png',
                    vibrate: [150, 50, 150]
                });
            });
        } else {
            new Notification(titulo, { body: corpo, vibrate: [150, 50, 150] });
        }
    }
};

window.atualizarStatusConexao = function(conectado) {
    const dot = document.getElementById('firebaseStatusDot');
    const text = document.getElementById('firebaseStatusText');
    const webDot = document.getElementById('webConnectionBadgeDot');
    const webText = document.getElementById('webConnectionBadgeText');

    // Atualizado para a nova ID do cabeçalho de logística
    const logDot = document.getElementById('logHeaderStatusDot');

    if (dot && text) {
        if (conectado) {
            dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]";
            text.innerText = "Online";
        } else {
            dot.className = "w-2.5 h-2.5 rounded-full bg-slate-500";
            text.innerText = "Offline";
        }
    }
    if (webDot && webText) {
        if (conectado) {
            webDot.className = "w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]";
            webText.innerText = "Online";
        } else {
            webDot.className = "w-2.5 h-2.5 rounded-full bg-slate-400";
            webText.innerText = "Offline";
        }
    }
    if (logDot) {
        if (conectado) {
            logDot.className = "w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-[0_0_6px_#34d399]";
        } else {
            logDot.className = "w-2 h-2 rounded-full bg-slate-400 inline-block";
        }
    }
};

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
        window.db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.useFirebase = true;
        window.atualizarStatusConexao(true);
    } catch (e) {
        console.warn("Erro ao inicializar Supabase. Usando LocalStorage Fallback.", e);
        window.useFirebase = false;
        window.atualizarStatusConexao(false);
    }
} else {
    window.atualizarStatusConexao(false);
}

window.addEventListener('online', () => { if(window.useFirebase) window.atualizarStatusConexao(true); });
window.addEventListener('offline', () => { window.atualizarStatusConexao(false); });

// ----------------------------------------------------------------
// Helper de tempo real: substitui o onSnapshot do Firestore.
// Sempre entrega a tabela inteira (mesmo comportamento do onSnapshot),
// evitando lógica de patch incremental nos módulos que consomem isso.
// Retorna uma função de "unsubscribe" compatível com window.unsubDrivers etc.
// ----------------------------------------------------------------
let subscribeTableCounter = 0;

// `filters`: objeto simples { coluna: valor } aplicado com .eq() no select inicial e
// como filtro do Realtime (ex.: { companyId: window.currentCompanyId }). Omitido ou com
// valores nulos/undefined, não filtra nada — usado pelo RUNEmaster, que enxerga tudo.
window.subscribeTable = function(table, callback, filters) {
    let cancelled = false;
    const activeFilters = Object.entries(filters || {}).filter(([, v]) => v !== null && v !== undefined);

    const fetchAndEmit = async () => {
        let query = window.db.from(table).select('*');
        activeFilters.forEach(([col, val]) => { query = query.eq(col, val); });
        const { data, error } = await query;
        if (cancelled) return;
        if (error) {
            console.error(`Erro ao ler tabela "${table}":`, error);
            return;
        }
        callback(data || []);
    };

    fetchAndEmit();

    // Nome único por assinatura: evita colisão quando a mesma tabela é
    // assinada mais de uma vez (ex.: carregarDadosIniciais + startAdminListeners).
    const channelName = `table-${table}-${++subscribeTableCounter}`;
    const postgresChangesConfig = { event: '*', schema: 'public', table };
    if (activeFilters.length > 0) {
        postgresChangesConfig.filter = activeFilters.map(([col, val]) => `${col}=eq.${val}`).join(',');
    }
    const channel = window.db
        .channel(channelName)
        .on('postgres_changes', postgresChangesConfig, fetchAndEmit)
        .subscribe();

    return () => {
        cancelled = true;
        window.db.removeChannel(channel);
    };
};

class LocalStorageManager {
    constructor() {
        this.listeners = {};
    }
    get(key) {
        return JSON.parse(localStorage.getItem(`app_${key}`) || "[]");
    }
    set(key, val) {
        localStorage.setItem(`app_${key}`, JSON.stringify(val));
        if (this.listeners[key]) {
            this.listeners[key].forEach(cb => cb(val));
        }
    }
    subscribe(key, cb) {
        if (!this.listeners[key]) this.listeners[key] = [];
        this.listeners[key].push(cb);
        cb(this.get(key));
        return () => {
            this.listeners[key] = this.listeners[key].filter(fn => fn !== cb);
        };
    }
}
window.LocalDb = new LocalStorageManager();

window.currentUserRole = null;
window.currentDriverId = null;
window.currentRepId = null;
window.selectedRoleForLogin = null;
window.repCurrentTab = 'ativas';

window.allDrivers = [];
window.allReps = [];
window.allRoutes = [];
window.allAdmins = [];

window.unsubDrivers = null;
window.unsubReps = null;
window.unsubRoutes = null;
window.unsubAdmins = null;
window.unsubCompanies = null;
window.currentCompanyId = null;
window.companyFeatures = null;

window.notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

window.installPwa = () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => {
            deferredPrompt = null;
        });
    } else {
        window.abrirGuiaInstalacaoPwa();
    }
};

window.abrirGuiaInstalacaoPwa = () => {
    document.getElementById('pwaInstallGuideModal')?.classList.remove('hidden');
};

window.fecharGuiaInstalacaoPwa = () => {
    document.getElementById('pwaInstallGuideModal')?.classList.add('hidden');
};

// -------------------------------------------------------------------------
// FILTRO GLOBAL DE PARADAS: Oculta a parada se for Jequié e nas extremidades
// -------------------------------------------------------------------------
window.obterParadasValidas = (stops) => {
    if (!stops || !Array.isArray(stops)) return [];
    return stops.map((stop, index) => ({ ...stop, originalIndex: index }))
        .filter(stop => {
            const isFirst = stop.originalIndex === 0;
            const isLast = stop.originalIndex === stops.length - 1;
            const textoLower = (stop.textoOriginal || stop.texto || '').toLowerCase();
            const ehJequie = textoLower.includes('jequié') || textoLower.includes('jequie');

            if (isFirst && ehJequie) return false;
            if (isLast && ehJequie && stops.length > 1) return false;

            return true;
        });
};

export const db = window.db;
export const useFirebase = window.useFirebase;
