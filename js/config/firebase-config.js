// ==========================================================
// TODO: Bloco 7.1: CONFIGURAÇÕES, FIREBASE E ESTADO GLOBAL (RUNEBYTE)
// ==========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('RuneByte PWA: Service Worker registrado com sucesso!'))
        .catch(err => console.error('RuneByte PWA: Erro ao registrar Service Worker:', err));
}

// Vinculação explícita no escopo global (window)
window.db = null;
window.useFirebase = false;
window.appId = "rune-byte-logistics-v1";

window.CURRENT_VERSION = localStorage.getItem('app_installed_version') || 'v1.3.0';

const firebaseConfig = {
    apiKey: "AIzaSyAUCNdX_mMJ2IiMrDGYpMF6qs1USC5KJ0k",
    authDomain: "app-de-entregas-e5f57.firebaseapp.com",
    projectId: "app-de-entregas-e5f57",
    storageBucket: "app-de-entregas-e5f57.firebasestorage.app",
    messagingSenderId: "995676671271",
    appId: "1:995676671271:web:6a8a4e25cb0380993fed02",
    measurementId: "G-SP7RC3KSL2"
};

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

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    try {
        const app = initializeApp(firebaseConfig);
        window.db = getFirestore(app);
        window.useFirebase = true;
        window.atualizarStatusConexao(true);
    } catch (e) {
        console.warn("Erro ao inicializar Firebase. Usando LocalStorage Fallback.", e);
        window.useFirebase = false;
        window.atualizarStatusConexao(false);
    }
} else {
    window.atualizarStatusConexao(false);
}

window.addEventListener('online', () => { if(window.useFirebase) window.atualizarStatusConexao(true); });
window.addEventListener('offline', () => { window.atualizarStatusConexao(false); });

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