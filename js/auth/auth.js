// ==============================================
// TODO: BLOCO 7.2: AUTENTICAÇÃO, MODAIS E SESSÃO
// ==============================================

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
//
// Isso existe só pra impedir que o botão físico de "voltar" do Android feche
// o app (o PWA não tem outra tela pra voltar). Qualquer navegação de volta no
// histórico - botão físico do Android, botão "voltar" do mouse, Alt+Seta -
// dispara o mesmo evento popstate, sem jeito de diferenciar a origem. Por
// isso esse handler NUNCA pode derrubar a sessão: ele só fecha um modal
// aberto (se houver) e sempre recoloca o mesmo estado no histórico, mantendo
// o usuário exatamente na tela e no perfil em que já estava. O logoff de
// verdade só acontece via window.fazerLogout(), chamado por um clique
// explícito no botão de sair.
window.history.pushState({ page: 'app_fibrasol_root' }, '', window.location.href);
window.addEventListener('popstate', (event) => {
    const modalsAbertos = [
        'modalConfig', 'modalTrocaSenhaPessoal', 'modalMultiReps',
        'pwaInstallGuideModal', 'confirmModal', 'modalEditPassword',
        'modalAssignRep', 'modalViewRoute'
    ];
    modalsAbertos.forEach(modalId => {
        const el = document.getElementById(modalId);
        if (el && !el.classList.contains('hidden')) {
            el.classList.add('hidden');
        }
    });

    window.history.pushState({ page: 'app_fibrasol_root' }, '', window.location.href);
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
    
    let collectionName, userObj, rpcRole;
    if (window.currentUserRole === 'admin') {
        userObj = (window.allAdmins || []).find(a => a.id === window.currentAdminId);
        collectionName = 'admins';
        rpcRole = 'admin';
    } else if (window.currentUserRole === 'driver') {
        userObj = (window.allDrivers || []).find(d => d.id === window.currentDriverId);
        collectionName = 'drivers';
        rpcRole = 'driver';
    } else if (window.currentUserRole === 'representative') {
        userObj = (window.allReps || []).find(r => r.id === window.currentRepId);
        collectionName = 'representatives';
        rpcRole = 'representative';
    } else if (window.currentUserRole === 'logistics') {
        userObj = (window.allLogistics || []).find(l => l.id === window.currentLogisticsId);
        collectionName = 'logistics_users';
        rpcRole = 'logistics';
    }

    if (!userObj || (userObj.pin || '').toString() !== atual) {
        return window.showToast("A senha atual informada está incorreta.", "error");
    }

    if (window.useFirebase) {
        const { error } = await window.db.rpc('set_member_pin', { p_role: rpcRole, p_id: userObj.id, p_new_pin: nova });
        if (error) {
            return window.showToast("Erro ao salvar no banco: " + error.message, "error");
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
        'dashboardAdminGestao',
        'dashboardDriver',
        'dashboardRepresentative',
        'dashboardMaster'
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

    // Login via Supabase Auth: descobre o e-mail técnico do usuário e autentica
    // de verdade (a senha é validada pelo próprio Supabase, nunca no navegador).
    if (window.useFirebase && window.db) {
        try {
            const { data: email } = await window.db.rpc('login_email_for', { p_name: typedName });

            if (email) {
                const { error: signInError } = await window.db.auth.signInWithPassword({ email, password: typedPin });

                if (!signInError) {
                    const { data: profileRows } = await window.db.rpc('current_profile');
                    const perfil = Array.isArray(profileRows) ? profileRows[0] : profileRows;

                    if (perfil?.role) {
                        window.currentUserRole = perfil.role;
                        window.currentCompanyId = perfil.companyId || null;
                        if (perfil.role === 'driver') window.currentDriverId = perfil.id;
                        if (perfil.role === 'representative') window.currentRepId = perfil.id;
                        if (perfil.role === 'admin') window.currentAdminId = perfil.id;
                        if (perfil.role === 'logistics') window.currentLogisticsId = perfil.id;

                        if (perfil.role === 'master') {
                            salvarSessao();
                            if (window.iniciarPainelMaster) window.iniciarPainelMaster();
                        } else if (perfil.role === 'admin') {
                            await carregarFeaturesDaEmpresaLogada();
                            salvarSessao();
                            if (window.iniciarPainelAdminGestao) window.iniciarPainelAdminGestao();
                        } else if (perfil.role === 'logistics') {
                            await carregarFeaturesDaEmpresaLogada();
                            salvarSessao();
                            if (window.iniciarPainelLogistica) window.iniciarPainelLogistica();
                        } else if (perfil.role === 'driver') {
                            salvarSessao();
                            if (window.iniciarPainelMotorista) window.iniciarPainelMotorista({ id: perfil.id, name: perfil.name });
                        } else if (perfil.role === 'representative') {
                            salvarSessao();
                            if (window.iniciarPainelRepresentante) window.iniciarPainelRepresentante({ id: perfil.id, name: perfil.name });
                        }

                        document.getElementById('unifiedPinInput').value = '';
                        restaurarBotao();
                        window.showToast(`Bem-vindo, ${perfil.name}!`, "success");
                        return;
                    }

                    // Login/senha corretos (signInError é null), mas current_profile() não
                    // devolveu nenhuma linha: só acontece se o usuário foi inativado (current_profile
                    // agora exige active = true pra driver/representative/logistics). Credencial
                    // certa, mas sem acesso — mensagem diferente de "usuário ou senha incorretos".
                    await window.db.auth.signOut();
                    restaurarBotao();
                    window.showToast("Este acesso foi desativado. Fale com o administrador da empresa.", "error");
                    return;
                }
            }
        } catch (err) {
            console.error("Erro no login via Supabase Auth:", err);
        }
    }

    // Busca nos Arrays Locais (LocalStorage / Fallback)
    const foundAdmin = (window.allAdmins || []).find(a => (a.name || '').toLowerCase() === typedName && (a.pin || '').toString() === typedPin);
    if (foundAdmin) {
        window.currentUserRole = 'admin';
        window.currentAdminId = foundAdmin.id;
        window.currentCompanyId = foundAdmin?.companyId || null;
        await carregarFeaturesDaEmpresaLogada();
        salvarSessao();
        if (window.iniciarPainelAdminGestao) window.iniciarPainelAdminGestao();
        document.getElementById('unifiedPinInput').value = '';
        restaurarBotao();
        return;
    }

    const foundLogistics = (window.allLogistics || []).find(l => (l.name || '').toLowerCase() === typedName && (l.pin || '').toString() === typedPin && l.active !== false);
    if (foundLogistics) {
        window.currentUserRole = 'logistics';
        window.currentLogisticsId = foundLogistics.id;
        window.currentCompanyId = foundLogistics?.companyId || null;
        await carregarFeaturesDaEmpresaLogada();
        salvarSessao();
        if (window.iniciarPainelLogistica) window.iniciarPainelLogistica();
        document.getElementById('unifiedPinInput').value = '';
        restaurarBotao();
        return;
    }

    const foundDriver = (window.allDrivers || []).find(d => (d.name || '').toLowerCase() === typedName && (d.pin || '').toString() === typedPin && d.active !== false);
    if (foundDriver) {
        window.currentUserRole = 'driver';
        window.currentDriverId = foundDriver.id;
        window.currentCompanyId = foundDriver.companyId || null;
        salvarSessao();
        if (window.iniciarPainelMotorista) window.iniciarPainelMotorista(foundDriver);
        document.getElementById('unifiedPinInput').value = '';
        restaurarBotao();
        return;
    }

    const foundRep = (window.allReps || []).find(r => (r.name || '').toLowerCase() === typedName && (r.pin || '').toString() === typedPin && r.active !== false);
    if (foundRep) {
        window.currentUserRole = 'representative';
        window.currentRepId = foundRep.id;
        window.currentCompanyId = foundRep.companyId || null;
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
    // Cache só pra UI abrir o painel certo instantaneamente ao recarregar a página.
    // Quem garante o acesso de verdade é a sessão do Supabase Auth (JWT) + RLS no banco.
    localStorage.setItem('app_session', JSON.stringify({
        role: window.currentUserRole,
        driverId: window.currentDriverId,
        repId: window.currentRepId,
        adminId: window.currentAdminId,
        logisticsId: window.currentLogisticsId,
        companyId: window.currentCompanyId || null
    }));
}

// Busca as feature flags da empresa do admin logado (controla itens do sidebar).
// Sem companyId (login antigo/legado sem empresa vinculada), libera tudo por padrão.
window.carregarFeaturesDaEmpresaLogada = async function() {
    window.companyFeatures = { fretes: true, rotasProdutos: true };
    window.companyPlanLimits = null;
    window.currentLogisticsPermissions = null;
    if (!window.useFirebase || !window.db || !window.currentCompanyId) return;
    try {
        const { data } = await window.db.from('companies').select('features, planLimits, plan').eq('id', window.currentCompanyId).maybeSingle();
        if (data?.features) window.companyFeatures = data.features;
        if (data?.planLimits) window.companyPlanLimits = data.planLimits;
        if (data?.plan) window.companyPlan = data.plan;
    } catch (e) {}

    // Permissões por módulo, só existem pra Logística — o Admin define quem
    // vê Importador/Rotas/Fretes/Frota/Rotas & Produtos (gestao-equipe.js).
    if (window.currentUserRole === 'logistics') {
        try {
            const { data: permissions } = await window.db.rpc('current_logistics_permissions');
            window.currentLogisticsPermissions = permissions || null;
        } catch (e) {}
    }
}

window.fazerLogout = async () => {
    window.fecharModalConfig();
    if (window.useFirebase && window.db) {
        try { await window.db.auth.signOut(); } catch (e) {}
    }
    localStorage.removeItem('app_session');
    window.currentUserRole = null;
    window.currentDriverId = null;
    window.currentRepId = null;
    window.currentAdminId = null;
    window.currentLogisticsId = null;
    window.currentCompanyId = null;
    window.companyFeatures = null;

    // Zera cada unsub depois de chamar: sem isso, o guard "if (!window.unsubX)"
    // usado em startAdminListeners()/startAdminGestaoListeners()/startMasterListeners()
    // pulava a nova inscrição ao logar de novo (com outro papel/empresa) na mesma aba,
    // deixando a tela nova com dados vazios ou da sessão anterior.
    if (window.unsubDrivers) { window.unsubDrivers(); window.unsubDrivers = null; }
    if (window.unsubReps) { window.unsubReps(); window.unsubReps = null; }
    if (window.unsubRoutes) { window.unsubRoutes(); window.unsubRoutes = null; }
    if (window.unsubAdmins) { window.unsubAdmins(); window.unsubAdmins = null; }
    if (window.unsubLogistics) { window.unsubLogistics(); window.unsubLogistics = null; }
    if (window.unsubVehicles) { window.unsubVehicles(); window.unsubVehicles = null; }
    if (window.unsubCompanies) { window.unsubCompanies(); window.unsubCompanies = null; }
    if (window.unsubImportCargas) { window.unsubImportCargas(); window.unsubImportCargas = null; }

    window.mostrarTelaComAnimacao('screenInitial');
    window.showToast("Sessão encerrada com sucesso");
};