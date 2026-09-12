// ==============================================
// TODO: BLOCO 7.2: AUTENTICAÇÃO, MODAIS E SESSÃO
// ==============================================

import { doc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Função global de Toast para alertas visuais
window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    let bgColors = 'bg-[#152e50] text-white';
    let iconClass = 'fa-circle-info text-blue-400';

    if (type === 'success') {
        bgColors = 'bg-emerald-600 text-white';
        iconClass = 'fa-circle-check text-emerald-200';
    } else if (type === 'error') {
        bgColors = 'bg-rose-600 text-white';
        iconClass = 'fa-triangle-exclamation text-rose-200';
    }

    toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl ${bgColors} text-xs font-semibold screen-android-animate`;
    toast.innerHTML = `
        <i class="fa-solid ${iconClass} text-base"></i>
        <span class="flex-1">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
};

// Gerenciamento de Navegação (Botão Voltar do Android)
window.history.pushState({ page: 'app_fibrasol_root' }, '', window.location.href);
window.addEventListener('popstate', (event) => {
    const modalsAbertos = [
        'modalConfig', 'modalTrocaSenhaPessoal', 'modalMultiReps', 
        'pwaInstallGuideModal', 'confirmModal', 'modalEditPassword', 
        'modalAssignRep', 'modalViewRoute'
    ];
    let fechouAlgum = false;
    modalsAbertos.forEach(modalId => {
        const el = document.getElementById(modalId);
        if (el && !el.classList.contains('hidden')) {
            el.classList.add('hidden');
            fechouAlgum = true;
        }
    });

    if (fechouAlgum) {
        window.history.pushState({ page: 'app_fibrasol_root' }, '', window.location.href);
        return;
    }

    if (window.currentUserRole || window.selectedRoleForLogin) {
        window.currentUserRole = null;
        window.selectedRoleForLogin = null;
        window.mostrarTelaComAnimacao('screenInitial');
        window.history.pushState({ page: 'app_fibrasol_root' }, '', window.location.href);
    } else {
        window.history.pushState({ page: 'app_fibrasol_root' }, '', window.location.href);
    }
});

window.abrirModalConfig = () => {
    const modal = document.getElementById('modalConfig');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.remove('screen-android-animate');
        void modal.offsetWidth;
        modal.classList.add('screen-android-animate');
    }
    localStorage.setItem('app_last_read_version', window.CURRENT_VERSION || '');
    document.querySelectorAll('.patch-badge-notice').forEach(b => b.classList.add('hidden'));
};

window.fecharModalConfig = () => {
    const modal = document.getElementById('modalConfig');
    if (modal) {
        modal.style.animation = 'androidFadeOut 0.50s ease-out forwards';
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.style.animation = '';
            document.getElementById('patchNotesBox')?.classList.add('hidden');
        }, 500);
    } else {
        document.getElementById('patchNotesBox')?.classList.add('hidden');
    }
};

window.alternarPatchNotesBox = () => {
    document.getElementById('patchNotesBox')?.classList.toggle('hidden');
};

window.forcarAtualizacaoPwa = () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            for (let registration of registrations) {
                registration.unregister();
            }
            window.location.reload(true);
        });
    } else {
        window.location.reload(true);
    }
};

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        ativarModoAtualizacaoDisponivel();
                    }
                });
            }
        });
    });
}

function ativarModoAtualizacaoDisponivel() {
    const btn = document.getElementById('btnPwaUpdateNotice');
    const text = document.getElementById('textPwaUpdate');
    const icon = document.getElementById('iconPwaUpdate');

    if (btn && text && icon) {
        btn.className = "bg-[#fac043] hover:brightness-95 active:scale-95 text-slate-900 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-[#fac043]/30 transition-all duration-300 animate-pulse";
        text.classList.remove('hidden');
        icon.classList.add('animate-spin');
    }
}

window.abrirModalTrocaSenhaPessoal = () => {
    if (!window.currentUserRole) {
        return window.showToast("Você precisa estar logado para alterar sua senha.", "error");
    }
    window.fecharModalConfig();
    document.getElementById('modalTrocaSenhaPessoal').classList.remove('hidden');
};

window.fecharModalTrocaSenhaPessoal = () => {
    document.getElementById('modalTrocaSenhaPessoal').classList.add('hidden');
    document.getElementById('pwdAtualPessoal').value = '';
    document.getElementById('pwdNovaPessoal').value = '';
    document.getElementById('pwdConfirmaPessoal').value = '';
};

window.salvarNovaSenhaPessoal = async (e) => {
    e.preventDefault();
    const atual = document.getElementById('pwdAtualPessoal').value.trim();
    const nova = document.getElementById('pwdNovaPessoal').value.trim();
    const confirma = document.getElementById('pwdConfirmaPessoal').value.trim();

    if (nova !== confirma) return window.showToast("A nova senha e a confirmação não coincidem.", "error");
    
    let collectionName, userObj;
    if (window.currentUserRole === 'admin') {
        const legacyUser = JSON.parse(localStorage.getItem('app_admin_settings') || '{"username": "gbsj17", "password": "1234"}');
        userObj = (window.allAdmins || []).find(a => (a.pin || '').toString() === atual);
        if (!userObj && atual === legacyUser.password) {
            legacyUser.password = nova;
            localStorage.setItem('app_admin_settings', JSON.stringify(legacyUser));
            window.fecharModalTrocaSenhaPessoal();
            return window.showToast("Senha do Administrador Padrão alterada com sucesso!", "success");
        }
        collectionName = 'admins';
    } else if (window.currentUserRole === 'driver') {
        userObj = (window.allDrivers || []).find(d => d.id === window.currentDriverId);
        collectionName = 'drivers';
    } else if (window.currentUserRole === 'representative') {
        userObj = (window.allReps || []).find(r => r.id === window.currentRepId);
        collectionName = 'representatives';
    }

    if (!userObj || (userObj.pin || '').toString() !== atual) {
        return window.showToast("A senha atual informada está incorreta.", "error");
    }

    if (window.useFirebase) {
        try {
            await updateDoc(doc(window.db, `artifacts/${window.appId}/public/data/${collectionName}`, userObj.id), { pin: nova });
        } catch(err) {
            return window.showToast("Erro ao salvar no banco: " + err.message, "error");
        }
    } else {
        const list = window.LocalDb.get(collectionName);
        const idx = list.findIndex(item => item.id === userObj.id);
        if (idx !== -1) {
            list[idx].pin = nova;
            window.LocalDb.set(collectionName, list);
        }
    }

    window.fecharModalTrocaSenhaPessoal();
    window.showToast("Senha alterada com sucesso!", "success");
};

window.esconderTodasTelas = () => {
    const telas = [
        'screenInitial',
        'screenUnifiedLogin',
        'dashboardAdmin',
        'dashboardDriver',
        'dashboardRepresentative'
    ];
    
    telas.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
};

window.mostrarTelaComAnimacao = (idTela) => {
    window.esconderTodasTelas();
    const el = document.getElementById(idTela);
    if (el) {
        el.classList.remove('hidden');
        el.classList.remove('screen-android-animate');
        void el.offsetWidth;
        el.classList.add('screen-android-animate');
    }
};

// ----------------------------------------------------
// LOGIN UNIFICADO (COM DELAY PROPOSITAL DE 1.5s E ANIMAÇÃO)
// ----------------------------------------------------
window.realizarLoginUnificado = async (e) => {
    if (e) e.preventDefault();
    const typedName = document.getElementById('unifiedUserInput').value.trim().toLowerCase();
    const typedPin = document.getElementById('unifiedPinInput').value.trim();

    if (!typedName || !typedPin) return window.showToast("Preencha usuário e senha.", "error");

    const loginForm = e.target;
    const btnSubmit = loginForm?.querySelector('button[type="submit"]');
    let textoOriginal = "Acessar Painel";

    // 1. ATIVA A ANIMAÇÃO E O SPINNER IMEDIATAMENTE NO BOTÃO
    if (btnSubmit) {
        textoOriginal = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.className = "w-full py-4 bg-[#152e50]/90 text-[#fac043] font-bold rounded-2xl shadow-md flex items-center justify-center gap-2.5 transition-all cursor-wait";
        btnSubmit.innerHTML = `
            <i class="fa-solid fa-circle-notch fa-spin text-base"></i>
            <span class="text-sm font-semibold tracking-wide">Acessando...</span>
        `;
    }

    // 2. DELAY OBRIGATÓRIO DE 1500ms PARA A ANIMAÇÃO EXECUTAR COMPLETA
    await new Promise(resolve => setTimeout(resolve, 1500));

    const restaurarBotao = () => {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.className = "w-full py-4 bg-[#152e50] hover:bg-[#0f223d] active:scale-[0.98] text-[#fac043] font-bold rounded-2xl shadow-lg shadow-[#152e50]/25 transition-all text-sm cursor-pointer";
            btnSubmit.innerHTML = textoOriginal;
        }
    };

    // 3. APÓS O DELAY, REALIZA A VALIDAÇÃO DOS DADOS DE ACESSO

    // Fallback Master de Emergência
    if ((typedName === 'gbsj17' || typedName === 'adm_gbsj17') && (typedPin === '1234' || typedPin === 'admin')) {
        window.currentUserRole = 'admin';
        salvarSessao();
        if (window.iniciarPainelAdmin) window.iniciarPainelAdmin();
        document.getElementById('unifiedPinInput').value = '';
        restaurarBotao();
        window.showToast("Acesso Master liberado!", "success");
        return;
    }

    // Busca Remota Direta no Firestore (Garante login se o estado local ainda não carregou)
    if (window.useFirebase && window.db) {
        try {
            const appId = window.appId || "rune-byte-logistics-v1";

            // Admins
            const admSnap = await getDocs(collection(window.db, `artifacts/${appId}/public/data/admins`));
            let admFound = null;
            admSnap.forEach(docSnap => {
                const data = docSnap.data();
                if ((data.name?.toLowerCase() === typedName || docSnap.id === typedName) && String(data.pin) === typedPin) {
                    admFound = { id: docSnap.id, ...data };
                }
            });

            if (admFound) {
                window.currentUserRole = 'admin';
                salvarSessao();
                if (window.iniciarPainelAdmin) window.iniciarPainelAdmin();
                document.getElementById('unifiedPinInput').value = '';
                restaurarBotao();
                window.showToast(`Bem-vindo, ${admFound.name}!`, "success");
                return;
            }

            // Motoristas
            const drvSnap = await getDocs(collection(window.db, `artifacts/${appId}/public/data/drivers`));
            let drvFound = null;
            drvSnap.forEach(docSnap => {
                const data = docSnap.data();
                if ((data.name?.toLowerCase() === typedName || docSnap.id === typedName) && String(data.pin) === typedPin) {
                    drvFound = { id: docSnap.id, ...data };
                }
            });

            if (drvFound) {
                window.currentUserRole = 'driver';
                window.currentDriverId = drvFound.id;
                salvarSessao();
                if (window.iniciarPainelMotorista) window.iniciarPainelMotorista(drvFound);
                document.getElementById('unifiedPinInput').value = '';
                restaurarBotao();
                window.showToast(`Bem-vindo, ${drvFound.name}!`, "success");
                return;
            }

            // Representantes
            const repSnap = await getDocs(collection(window.db, `artifacts/${appId}/public/data/representatives`));
            let repFound = null;
            repSnap.forEach(docSnap => {
                const data = docSnap.data();
                if ((data.name?.toLowerCase() === typedName || docSnap.id === typedName) && String(data.pin) === typedPin) {
                    repFound = { id: docSnap.id, ...data };
                }
            });

            if (repFound) {
                window.currentUserRole = 'representative';
                window.currentRepId = repFound.id;
                salvarSessao();
                if (window.iniciarPainelRepresentante) window.iniciarPainelRepresentante(repFound);
                document.getElementById('unifiedPinInput').value = '';
                restaurarBotao();
                window.showToast(`Bem-vindo, ${repFound.name}!`, "success");
                return;
            }

        } catch (err) {
            console.error("Erro na busca remota do login:", err);
        }
    }

    // Busca nos Arrays Locais (LocalStorage / Fallback)
    const legacyAdmin = JSON.parse(localStorage.getItem('app_admin_settings') || '{"username": "gbsj17", "password": "1234"}');
    const foundAdmin = (window.allAdmins || []).find(a => (a.name || '').toLowerCase() === typedName && (a.pin || '').toString() === typedPin);
    if (foundAdmin || (typedName === legacyAdmin.username.toLowerCase() && typedPin === legacyAdmin.password)) {
        window.currentUserRole = 'admin';
        salvarSessao();
        if (window.iniciarPainelAdmin) window.iniciarPainelAdmin();
        document.getElementById('unifiedPinInput').value = '';
        restaurarBotao();
        return;
    }

    const foundDriver = (window.allDrivers || []).find(d => (d.name || '').toLowerCase() === typedName && (d.pin || '').toString() === typedPin);
    if (foundDriver) {
        window.currentUserRole = 'driver';
        window.currentDriverId = foundDriver.id;
        salvarSessao();
        if (window.iniciarPainelMotorista) window.iniciarPainelMotorista(foundDriver);
        document.getElementById('unifiedPinInput').value = '';
        restaurarBotao();
        return;
    }

    const foundRep = (window.allReps || []).find(r => (r.name || '').toLowerCase() === typedName && (r.pin || '').toString() === typedPin);
    if (foundRep) {
        window.currentUserRole = 'representative';
        window.currentRepId = foundRep.id;
        salvarSessao();
        if (window.iniciarPainelRepresentante) window.iniciarPainelRepresentante(foundRep);
        document.getElementById('unifiedPinInput').value = '';
        restaurarBotao();
        return;
    }

    // 4. FALHA NO LOGIN: RESTAURA O BOTÃO E EXIBE O ALERTA
    restaurarBotao();
    window.showToast("Usuário ou senha incorretos", "error");
};

function salvarSessao() {
    localStorage.setItem('app_session', JSON.stringify({
        role: window.currentUserRole,
        driverId: window.currentDriverId,
        repId: window.currentRepId
    }));
}

window.fazerLogout = () => {
    window.fecharModalConfig();
    localStorage.removeItem('app_session');
    window.currentUserRole = null;
    window.currentDriverId = null;
    window.currentRepId = null;
    
    if (window.unsubDrivers) window.unsubDrivers();
    if (window.unsubReps) window.unsubReps();
    if (window.unsubRoutes) window.unsubRoutes();
    if (window.unsubAdmins) window.unsubAdmins();

    window.mostrarTelaComAnimacao('screenInitial');
    window.showToast("Sessão encerrada com sucesso");
};