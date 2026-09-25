// =======================================================
// TODO: BLOCO 7.5.1: PATCH NOTES & VERSÕES DINÂMICAS
// =======================================================

let globalLatestVersion = 'v2.0.0';

// Busca e renderiza o patch-notes.json dinamicamente sem travar o app
window.carregarPatchNotesDinamico = async function() {
    const container = document.getElementById('patchNotesDynamicContainer');

    try {
        const response = await fetch('patch-notes.json?v=' + Date.now());
        if (!response.ok) throw new Error("Erro ao carregar arquivo de notas");
        
        const data = await response.json();
        const patchesList = data.patches || [];
        globalLatestVersion = patchesList.length > 0 ? patchesList[0].version : 'v2.0.0';

        if (!window.CURRENT_VERSION) {
            window.CURRENT_VERSION = globalLatestVersion;
            localStorage.setItem('app_installed_version', window.CURRENT_VERSION);
        }

        document.querySelectorAll('.app-version-text').forEach(el => {
            el.innerText = window.CURRENT_VERSION;
        });
        document.querySelectorAll('.app-version-title-text').forEach(el => {
            el.innerText = `Notas da Versão (${globalLatestVersion})`;
        });
        document.querySelectorAll('.app-history-title-text').forEach(el => {
            el.innerText = `Histórico de Versões (${globalLatestVersion})`;
        });

        const vAtual = String(window.CURRENT_VERSION || '').trim().toLowerCase();
        const vNova = String(globalLatestVersion || '').trim().toLowerCase();
        const hasNewVersion = (vAtual !== '' && vNova !== '' && vAtual !== vNova);

        document.querySelectorAll('.patch-badge-notice').forEach(b => {
            if (hasNewVersion) b.classList.remove('hidden');
            else b.classList.add('hidden');
        });

        const topSyncBtn = document.getElementById('btnPwaUpdateNotice');
        const topSyncIcon = document.getElementById('iconPwaUpdate');
        const topSyncText = document.getElementById('textPwaUpdate');

        if (topSyncBtn) {
            if (hasNewVersion) {
                topSyncBtn.className = "bg-[#fac043] hover:brightness-95 active:scale-95 text-slate-900 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-[#fac043]/30 transition-all duration-300 animate-pulse";
                if (topSyncText) {
                    topSyncText.classList.remove('hidden');
                    topSyncText.innerText = `Nova Versão (${globalLatestVersion})`;
                }
                if (topSyncIcon) topSyncIcon.className = "fa-solid fa-arrow-up text-sm";

                topSyncBtn.onclick = () => {
                    localStorage.setItem('app_installed_version', globalLatestVersion);
                    window.location.reload(true);
                };
            } else {
                topSyncBtn.className = "w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#152e50] flex items-center justify-center transition-all duration-300 active:scale-95 shadow-sm";
                if (topSyncText) topSyncText.classList.add('hidden');
                if (topSyncIcon) topSyncIcon.className = "fa-solid fa-rotate text-sm";
                topSyncBtn.onclick = () => window.location.reload(true);
            }
        }

        if (!container) return;

        let html = '';
        const ultimasCinco = patchesList.slice(0, 5);

        ultimasCinco.forEach((patch, index) => {
            const isNovo = index === 0 && hasNewVersion;
            const iconClass = isNovo ? 'fa-box-open text-slate-400' : 'fa-box-archive text-slate-400';
            const titleColor = isNovo ? 'text-[#152e50]' : 'text-slate-700';

            const itemsList = (patch.details || []).map(item => `<li>${item}</li>`).join('');

            html += `
                <div class="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    <button onclick="togglePatch('${patch.id}')" class="w-full p-2.5 text-left flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
                        <span class="text-xs font-bold ${titleColor} flex items-center gap-2">
                            <i class="fa-solid ${iconClass}"></i> ${patch.version}
                            ${isNovo ? '<span class="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">Novo</span>' : ''}
                        </span>
                        <i id="icon-${patch.id}" class="fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform"></i>
                    </button>
                    <div id="${patch.id}" class="hidden p-3 text-[11px] text-slate-600 border-t border-slate-100 bg-slate-50">
                        <ul class="list-disc pl-4 space-y-1.5">
                            ${itemsList}
                        </ul>
                    </div>
                </div>
            `;
        });

        container.className = "max-h-[260px] overflow-y-auto pr-1 space-y-2";
        container.innerHTML = html;

    } catch (error) {
        console.error('Erro ao carregar Patch Notes:', error);
        if (container) {
            container.innerHTML = '<p class="text-xs text-rose-500 p-2 text-center">Erro ao carregar notas. Verifique se o arquivo patch-notes.json está na pasta do projeto.</p>';
        }
    }
};

window.togglePatch = (patchId) => {
    const patchEl = document.getElementById(patchId);
    const iconEl = document.getElementById(`icon-${patchId}`);
    
    if (patchEl) {
        patchEl.classList.toggle('hidden');
        if (iconEl) {
            iconEl.classList.toggle('rotate-180');
        }
    }
};

// =======================================================
// TODO: BLOCO 7.5.2: LISTENERS E TEMPO REAL
// =======================================================

window.startAdminListeners = function() {
    if (window.useFirebase) {
        const companyFilter = { companyId: window.currentCompanyId };
        if (!window.unsubDrivers) window.unsubDrivers = window.subscribeTable('drivers', data => {
            window.allDrivers = data;
            if (window.currentUserRole === 'admin') {
                if (window.renderlogDriversList) window.renderlogDriversList();
                if (window.renderAdminDashboard) window.renderAdminDashboard();
            }
        }, companyFilter);
        if (!window.unsubReps) window.unsubReps = window.subscribeTable('representatives', data => {
            window.allReps = data;
            if (window.currentUserRole === 'admin' && window.renderlogRepsList) window.renderlogRepsList();
        }, companyFilter);
        if (!window.unsubAdmins) window.unsubAdmins = window.subscribeTable('admins', data => {
            window.allAdmins = data;
            if (window.currentUserRole === 'admin' && window.renderloglogsList) window.renderloglogsList();
        }, companyFilter);
    } else {
        window.unsubDrivers = LocalDb.subscribe('drivers', data => { 
            window.allDrivers = data; 
            if(window.currentUserRole === 'admin') { 
                if (window.renderlogDriversList) window.renderlogDriversList(); 
                if (window.renderAdminDashboard) window.renderAdminDashboard(); 
            } 
        });
        window.unsubReps = LocalDb.subscribe('representatives', data => { 
            window.allReps = data; 
            if(window.currentUserRole === 'admin' && window.renderlogRepsList) window.renderlogRepsList(); 
        });
        window.unsubAdmins = LocalDb.subscribe('admins', data => { 
            window.allAdmins = data; 
            if(window.currentUserRole === 'admin' && window.renderloglogsList) window.renderloglogsList(); 
        });
        window.unsubRoutes = LocalDb.subscribe('routes', data => { 
            window.allRoutes = data; 
            if(window.currentUserRole === 'admin') {
                if (window.renderlogRoutesList) window.renderlogRoutesList();
                if (window.renderlogArchivedRoutesList) window.renderlogArchivedRoutesList();
                if (window.renderAdminDashboard) window.renderAdminDashboard();
            } else if(window.currentUserRole === 'representative') {
                if (window.renderRepDashboard) window.renderRepDashboard();
            }
        });
    }
};

window.startDriverListeners = function() {
    if (window.useFirebase) {
        if (!window.unsubRoutes) window.unsubRoutes = window.subscribeTable('routes', data => {
            window.allRoutes = data;
            if (window.currentUserRole === 'driver' && window.renderDriverDashboard) window.renderDriverDashboard();
        }, { companyId: window.currentCompanyId });
    } else {
        window.unsubRoutes = LocalDb.subscribe('routes', data => { 
            window.allRoutes = data; 
            if(window.currentUserRole === 'driver' && window.renderDriverDashboard) window.renderDriverDashboard(); 
        });
    }
};

window.startRepListeners = function() {
    if (window.useFirebase) {
        if (!window.unsubRoutes) window.unsubRoutes = window.subscribeTable('routes', data => {
            window.allRoutes = data;
            if (window.currentUserRole === 'representative' && window.renderRepDashboard) window.renderRepDashboard();
        }, { companyId: window.currentCompanyId });
    } else {
        window.unsubRoutes = LocalDb.subscribe('routes', data => { 
            window.allRoutes = data; 
            if(window.currentUserRole === 'representative' && window.renderRepDashboard) window.renderRepDashboard(); 
        });
    }
};

// =======================================================
// TODO: BLOCO 7.5.3: INICIALIZAÇÃO, SPLASH SCREEN E SESSÕES
// =======================================================

// Sem Supabase configurado (fallback local), cria uma conta admin inicial com PIN
// aleatório — nunca um usuário/senha previsível — e avisa o dono no console.
async function inicializarContaAdminPadrao() {
    if (window.useFirebase) return;
    const admins = LocalDb.get('admins');
    if (admins.length === 0) {
        const pinInicial = String(Math.floor(1000 + Math.random() * 9000));
        admins.push({ id: 'adm_default', name: 'admin', pin: pinInicial, createdAt: Date.now() });
        LocalDb.set('admins', admins);
        console.warn(`RUNElog: conta admin inicial criada — usuário "admin", PIN ${pinInicial}. Troque assim que possível.`);
    }
}

function atualizarBadgeConexao() {
    const dot = document.getElementById('webConnectionBadgeDot');
    const text = document.getElementById('webConnectionBadgeText');
    if (!dot || !text) return;

    if (window.useFirebase) {
        dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse";
        text.innerText = "Online";
    } else {
        dot.className = "w-2.5 h-2.5 rounded-full bg-amber-500";
        text.innerText = "Offline";
    }
}

function atualizarTextosVersaoGerais() {
    if (window.CURRENT_VERSION) {
        document.querySelectorAll('.app-version-text').forEach(el => {
            el.innerText = window.CURRENT_VERSION;
        });
    }
}

// INICIALIZAÇÃO DA SPLASH SCREEN (3 SEGUNDOS DE PROGRESSO)
window.addEventListener('DOMContentLoaded', async () => {
    try {
        if (window.solicitarPermissaoNotificacoes) window.solicitarPermissaoNotificacoes();
        await inicializarContaAdminPadrao();
        atualizarBadgeConexao();
        atualizarTextosVersaoGerais();

        if (window.carregarPatchNotesDinamico) {
            await window.carregarPatchNotesDinamico().catch(e => console.warn(e));
        }
    } catch (err) {
        console.error("Erro na inicialização:", err);
    }

    // Cronômetro progressivo de 0 a 100% em 3000ms
    const progressBar = document.getElementById('splashProgressBar');
    const progressText = document.getElementById('splashProgressText');
    const splashScreen = document.getElementById('splashScreen');

    let progress = 0;
    const totalDuration = 3000;
    const intervalTime = 30;
    const step = 100 / (totalDuration / intervalTime);

    const progressInterval = setInterval(() => {
        progress += step;

        if (progress >= 100) {
            progress = 100;
            clearInterval(progressInterval);

            setTimeout(() => {
                if (splashScreen) {
                    splashScreen.classList.add('splash-fade-out');
                    setTimeout(() => {
                        splashScreen.style.display = 'none';
                        verificarSessaoSalva();
                    }, 400);
                } else {
                    verificarSessaoSalva();
                }
            }, 150);
        }

        if (progressBar) progressBar.style.width = `${progress}%`;
        if (progressText) progressText.innerText = `${Math.round(progress)}%`;
    }, intervalTime);
});

async function verificarSessaoSalva() {
    const session = JSON.parse(localStorage.getItem('app_session') || "null");
    if (!session) {
        carregarDadosIniciais();
        if (window.mostrarTelaComAnimacao) window.mostrarTelaComAnimacao('screenInitial');
        return;
    }

    // Com Supabase, o cache local só serve de atalho de UI — quem manda é a
    // sessão de verdade do Supabase Auth. Sem uma sessão válida ali, não há
    // como o RLS liberar nada, então volta pra tela de login.
    if (window.useFirebase && window.db) {
        try {
            const { data: { session: authSession } } = await window.db.auth.getSession();
            if (!authSession) {
                localStorage.removeItem('app_session');
                carregarDadosIniciais();
                if (window.mostrarTelaComAnimacao) window.mostrarTelaComAnimacao('screenInitial');
                return;
            }
            const { data: profileRows } = await window.db.rpc('current_profile');
            const perfil = Array.isArray(profileRows) ? profileRows[0] : profileRows;
            if (!perfil?.role) {
                localStorage.removeItem('app_session');
                carregarDadosIniciais();
                if (window.mostrarTelaComAnimacao) window.mostrarTelaComAnimacao('screenInitial');
                return;
            }
            session.role = perfil.role;
            session.companyId = perfil.companyId || null;
            if (perfil.role === 'driver') session.driverId = perfil.id;
            if (perfil.role === 'representative') session.repId = perfil.id;
            if (perfil.role === 'admin') session.adminId = perfil.id;
        } catch (e) {
            console.error("Erro ao revalidar sessão do Supabase Auth:", e);
        }
    }

    window.currentUserRole = session.role;
    window.currentDriverId = session.driverId;
    window.currentRepId = session.repId;
    window.currentAdminId = session.adminId;
    window.currentCompanyId = session.companyId || null;

    if (window.currentUserRole === 'master') {
        if (window.iniciarPainelMaster) window.iniciarPainelMaster();
        return;
    }

    carregarDadosIniciais(async () => {
        if (window.currentUserRole === 'admin' && window.iniciarPainelAdmin) {
            if (window.carregarFeaturesDaEmpresaLogada) await window.carregarFeaturesDaEmpresaLogada();
            window.iniciarPainelAdmin();
        } else if (window.currentUserRole === 'driver' && window.iniciarPainelMotorista) {
            const driver = window.allDrivers.find(d => d.id === window.currentDriverId);
            window.iniciarPainelMotorista(driver || { id: window.currentDriverId, name: 'Motorista' });
        } else if (window.currentUserRole === 'representative' && window.iniciarPainelRepresentante) {
            const rep = window.allReps.find(r => r.id === window.currentRepId);
            window.iniciarPainelRepresentante(rep || { id: window.currentRepId, name: 'Representante' });
        }
    });
}

function carregarDadosIniciais(callback) {
    if (window.useFirebase) {
        // Antes do login, window.currentCompanyId é undefined e o filtro vira no-op
        // (precisa buscar em todas as empresas pra achar quem está logando).
        // Depois de restaurar sessão, currentCompanyId já vem preenchido e escopa certo.
        const companyFilter = { companyId: window.currentCompanyId };
        window.subscribeTable('drivers', data => {
            window.allDrivers = data;
            if (window.currentUserRole === 'admin') {
                if (window.renderlogDriversList) window.renderlogDriversList();
                if (window.renderAdminDashboard) window.renderAdminDashboard();
            }
            if (callback) callback();
        }, companyFilter);
        window.subscribeTable('representatives', data => {
            window.allReps = data;
            if (window.currentUserRole === 'admin' && window.renderlogRepsList) window.renderlogRepsList();
        }, companyFilter);
        window.subscribeTable('admins', async data => {
            window.allAdmins = data;
            if (window.currentUserRole === 'admin' && window.renderloglogsList) window.renderloglogsList();
        }, companyFilter);
        window.subscribeTable('routes', data => {
            window.allRoutes = data;
            if (window.currentUserRole === 'admin') {
                if (window.renderlogRoutesList) window.renderlogRoutesList();
                if (window.renderlogArchivedRoutesList) window.renderlogArchivedRoutesList();
                if (window.renderAdminDashboard) window.renderAdminDashboard();
            } else if (window.currentUserRole === 'representative') {
                if (window.renderRepDashboard) window.renderRepDashboard();
            } else if (window.currentUserRole === 'driver') {
                if (window.renderDriverDashboard) window.renderDriverDashboard();
            }
        }, companyFilter);
    } else {
        window.allDrivers = LocalDb.get('drivers');
        window.allReps = LocalDb.get('representatives');
        window.allRoutes = LocalDb.get('routes');
        window.allAdmins = LocalDb.get('admins');
        if (callback) callback();
    }
}