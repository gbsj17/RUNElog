
// -----------------------------------------------------
// TODO: BLOCO 7.3-1: INICIALIZAÇÃO, ABAS E SWIPE MOBILE
// -----------------------------------------------------

let logTouchStartX = 0;
let logTouchEndX = 0;

document.addEventListener('DOMContentLoaded', () => {
    const logDashboard = document.getElementById('dashboardAdmin');
    if (!logDashboard) return;

    logDashboard.addEventListener('touchstart', e => {
        logTouchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    logDashboard.addEventListener('touchend', e => {
        logTouchEndX = e.changedTouches[0].screenX;
        window.tratarSwipeLog();
    }, { passive: true });
});

// CONTROLE DO MODO COMPACTO DA SIDEBAR (BOTÃO FLUTUANTE COM ALTERNÂNCIA DE SETAS < E >)
window.alternarModoSidebar = function() {
    const sidebar = document.getElementById('mainAdminSidebar');
    const toggleIcon = document.getElementById('sidebarToggleIcon');
    const textElements = document.querySelectorAll('.sidebar-text-element');

    if (!sidebar || !toggleIcon) return;

    const isCompact = sidebar.classList.contains('w-20');

    if (isCompact) {
        sidebar.classList.remove('w-20');
        sidebar.classList.add('w-72');
        toggleIcon.className = 'fa-solid fa-chevron-left text-xs font-bold';
        textElements.forEach(el => el.classList.remove('hidden'));
    } else {
        sidebar.classList.remove('w-72');
        sidebar.classList.add('w-20');
        toggleIcon.className = 'fa-solid fa-chevron-right text-xs font-bold';
        textElements.forEach(el => el.classList.add('hidden'));
    }
};

window.tratarSwipeLog = function() {
    if (window.innerWidth >= 640) return;

    const threshold = 50;
    const diff = logTouchEndX - logTouchStartX;

    if (Math.abs(diff) < threshold) return;

    const logTabs = ['rotas', 'fretes', 'dashboard', 'frota', 'rotas-produtos'];
    const currentIndex = logTabs.indexOf(typeof window.logCurrentTab !== 'undefined' ? window.logCurrentTab : 'rotas');

    if (currentIndex === -1) return;

    if (diff < 0 && currentIndex < logTabs.length - 1) {
        window.alternarAbalog(logTabs[currentIndex + 1], 'left');
    } else if (diff > 0 && currentIndex > 0) {
        window.alternarAbalog(logTabs[currentIndex - 1], 'right');
    }
};

window.iniciarPainelAdmin = function() {
    if (window.mostrarTelaComAnimacao) window.mostrarTelaComAnimacao('dashboardAdmin');
    if (window.startAdminListeners) window.startAdminListeners();
    if (window.renderlogDriversList) window.renderlogDriversList();
    if (window.renderlogVehiclesList) window.renderlogVehiclesList();
    if (window.renderlogRoutesList) window.renderlogRoutesList();
    if (window.renderlogArchivedRoutesList) window.renderlogArchivedRoutesList();
    if (window.renderAdminDashboard) window.renderAdminDashboard();
    window.alternarAbalog('rotas', 'none');
};

// Esconde itens do sidebar que a empresa logada não tem liberado (RUNEmaster > Funções & Planos).
window.aplicarFeaturesDaEmpresa = function() {
    const features = window.companyFeatures || { fretes: true, rotasProdutos: true };
    const navFretes = document.getElementById('nav-fretes');
    const navRotasProdutos = document.getElementById('nav-rotas-produtos');
    if (navFretes) navFretes.classList.toggle('hidden', features.fretes === false);
    if (navRotasProdutos) navRotasProdutos.classList.toggle('hidden', features.rotasProdutos === false);
};

window.alternarAbalog = (tab, direction = 'none') => {
    window.logCurrentTab = tab;
    
    const secoesSidebar = ['importador', 'rotas', 'fretes', 'dashboard', 'frota', 'rotas-produtos'];
    secoesSidebar.forEach(s => {
        const btn = document.getElementById('nav-' + s);
        if (btn) {
            if (s === tab) {
                btn.className = "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white/15 text-[#fac043] transition-all font-bold cursor-pointer";
            } else {
                btn.className = "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition-all cursor-pointer";
            }
        }
    });

    const secoesLog = {
        'importador': document.getElementById('contentImportador'),
        'rotas': document.getElementById('contentRotas'),
        'fretes': document.getElementById('contentFretes'),
        'dashboard': document.getElementById('contentDashboard'),
        'frota': document.getElementById('contentFrota'),
        'rotas-produtos': document.getElementById('contentRotasProdutos')
    };

    Object.keys(secoesLog).forEach(key => {
        const el = secoesLog[key];
        if (!el) return;

        if (key === tab) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });

    const headerInfo = {
        'importador': { title: 'Importador de Cargas', subtitle: 'Importação de planilhas WinThor e montagem de rotas', icon: 'fa-file-excel' },
        'rotas': { title: 'Gestão Operacional de Rotas', subtitle: 'Cargas em andamento e novas rotas', icon: 'fa-route' },
        'fretes': { title: 'Gestão de Fretes Terceirizados', subtitle: 'Gerenciamento financeiro e emissão de OC', icon: 'fa-calculator' },
        'dashboard': { title: 'Visão Geral & Métricas', subtitle: 'Desempenho e relatórios estratégicos', icon: 'fa-chart-pie' },
        'frota': { title: 'Gestão de Frota e Funcionários', subtitle: 'Motoristas, veículos e representantes', icon: 'fa-truck-front' },
        'rotas-produtos': { title: 'Gestão de Rotas e Produtos', subtitle: 'Cadastros centrais de apoio logístico', icon: 'fa-boxes-stacked' }
    };

    const currentInfo = headerInfo[tab] || headerInfo['rotas'];

    const hTitle = document.getElementById('logHeaderTitle');
    if (hTitle) hTitle.innerText = currentInfo.title;

    const hSubtitle = document.getElementById('logHeaderSubtitle');
    if (hSubtitle) hSubtitle.innerText = currentInfo.subtitle;

    const hIcon = document.getElementById('logHeaderMobileIcon');
    if (hIcon) hIcon.className = `fa-solid ${currentInfo.icon}`;

    const btnImportarDados = document.getElementById('btnImportarDadosHeader');
    if (btnImportarDados) btnImportarDados.classList.toggle('hidden', tab !== 'importador');

    if (tab === 'importador') {
        // Lazy-load: só carrega o iframe na primeira vez que a aba é aberta,
        // pra não pagar o custo de XLSX/Leaflet em toda sessão do admin.
        const iframeImportador = document.getElementById('iframeImportador');
        if (iframeImportador && !iframeImportador.getAttribute('src')) {
            iframeImportador.setAttribute('src', 'import-cargas.html');
        }
    } else if (tab === 'dashboard' && window.renderAdminDashboard) {
        window.renderAdminDashboard();
    } else if (tab === 'fretes' && window.renderPainelFretes) {
        window.renderPainelFretes();
    } else if (tab === 'frota') {
        if (window.renderlogDriversList) window.renderlogDriversList();
        if (window.renderlogVehiclesList) window.renderlogVehiclesList();
        if (window.renderlogRepsList) window.renderlogRepsList();
        if (window.renderlogLogisticsList) window.renderlogLogisticsList();
        // Só o Admin cadastra/remove Logística (o próprio backend também bloqueia,
        // isso aqui é só pra não mostrar uma opção que vai dar erro de permissão).
        const tabLogistica = document.getElementById('tabSubLogistica');
        if (tabLogistica) tabLogistica.classList.toggle('hidden', window.currentUserRole !== 'admin');
    } else if (tab === 'rotas-produtos') {
        if (window.alternarAbaRotasProdutos) {
            window.alternarAbaRotasProdutos('produtos');
        } else if (window.renderizarTabelaProdutos) {
            window.renderizarTabelaProdutos();
        }
    }

    // Reaplica o gating de funções da empresa: o loop acima reescreve o className
    // inteiro dos botões do sidebar, o que apagaria a classe "hidden" aplicada por
    // aplicarFeaturesDaEmpresa() se não fosse refeita a cada troca de aba.
    if (window.aplicarFeaturesDaEmpresa) window.aplicarFeaturesDaEmpresa();
};

// Aciona o input de arquivo do Importador de Cargas, que vive dentro do
// iframe (mesma origem, então dá pra alcançar o contentDocument direto).
// O botão que chama isso mora no cabeçalho do RUNElog, fora do iframe -
// o próprio Importador não tem mais um botão de importar visível.
window.dispararImportacaoCargas = function() {
    const iframe = document.getElementById('iframeImportador');
    const input = iframe?.contentDocument?.getElementById('inputXlsx');
    if (input) input.click();
};

// -----------------------------------------------------
// TODO: BLOCO 7.3-2: SUB-ABAS (PÍLULAS INTERNAS)
// -----------------------------------------------------
window.mudarSubAbaFrota = function(aba) {
    const botoes = {
        motoristas: document.getElementById('tabSubMotoristas'),
        veiculos: document.getElementById('tabSubVeiculos'),
        representantes: document.getElementById('tabSubRepresentantes'),
        logistica: document.getElementById('tabSubLogistica')
    };
    const conteudos = {
        motoristas: document.getElementById('subAbaMotoristasContent'),
        veiculos: document.getElementById('subAbaVeiculosContent'),
        representantes: document.getElementById('subAbaRepresentantesContent'),
        logistica: document.getElementById('subAbaLogisticaContent')
    };

    Object.keys(botoes).forEach(key => {
        const btn = botoes[key];
        const content = conteudos[key];
        if (btn) {
            btn.className = key === aba
                ? "flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#152e50] text-[#fac043] shadow-sm transition-all text-center cursor-pointer flex items-center justify-center gap-1.5"
                : "flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all text-center cursor-pointer flex items-center justify-center gap-1.5";
        }
        if (content) content.classList.toggle('hidden', key !== aba);
    });

    if (aba === 'representantes' && window.renderlogRepsList) window.renderlogRepsList();
    if (aba === 'logistica' && window.renderlogLogisticsList) window.renderlogLogisticsList();
};

// -----------------------------------------------------
// TODO: BLOCO 7.3-3: MODAL PERSISTENTE E SPLASH 3 SEGUNDOS
// -----------------------------------------------------
window.abrirModalPersistente = function(titulo, htmlConteudo, callbackSalvar) {
    const modal = document.getElementById('modalPersistente');
    const titleEl = document.getElementById('modalPersistenteTitle');
    const bodyEl = document.getElementById('modalPersistenteBody');
    
    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-user-plus mr-1"></i> ${titulo}`;
    if (bodyEl) bodyEl.innerHTML = htmlConteudo;
    
    window.currentSaveCallback = callbackSalvar;
    if (modal) modal.classList.remove('hidden');
};

window.fecharModalPersistente = function() {
    const modal = document.getElementById('modalPersistente');
    if (modal) modal.classList.add('hidden');
};

// --------------------------------------------------------------------
// GERENCIAR CREDENCIAIS: reseta o PIN de um motorista/representante/
// membro de logística direto do card dele, usando a mesma RPC
// set_member_pin que a troca de senha pessoal (auth.js) já usa.
// --------------------------------------------------------------------
window.abrirModalEditarSenha = function(userId, userType, userName) {
    const display = document.getElementById('editUserDisplay');
    if (display) display.innerText = userName || 'Usuário';
    const idInput = document.getElementById('editUserId');
    const typeInput = document.getElementById('editUserType');
    const pinInput = document.getElementById('newPasswordInput');
    if (idInput) idInput.value = userId;
    if (typeInput) typeInput.value = userType;
    if (pinInput) pinInput.value = '';
    document.getElementById('modalEditPassword')?.classList.remove('hidden');
};

window.fecharModalEditarSenha = function() {
    document.getElementById('modalEditPassword')?.classList.add('hidden');
    const pinInput = document.getElementById('newPasswordInput');
    if (pinInput) pinInput.value = '';
};

window.salvarNovaSenha = async function() {
    const userId = document.getElementById('editUserId')?.value;
    const userType = document.getElementById('editUserType')?.value;
    const novaSenha = document.getElementById('newPasswordInput')?.value.trim();

    if (!userId || !userType) return;
    if (!novaSenha) {
        if (window.showToast) window.showToast("Digite a nova senha/PIN.", "error");
        return;
    }

    const collectionByType = { driver: 'drivers', representative: 'representatives', logistics: 'logistics_users', admin: 'admins' };
    const collectionName = collectionByType[userType];

    if (window.useFirebase) {
        const { error } = await window.db.rpc('set_member_pin', { p_role: userType, p_id: userId, p_new_pin: novaSenha });
        if (error) {
            if (window.showToast) window.showToast("Erro ao alterar senha: " + error.message, "error");
            return;
        }
    } else if (collectionName) {
        const list = window.LocalDb.get(collectionName);
        const idx = list.findIndex(item => item.id === userId);
        if (idx !== -1) {
            list[idx].pin = novaSenha;
            window.LocalDb.set(collectionName, list);
        }
    }

    window.fecharModalEditarSenha();
    if (window.showToast) window.showToast("Senha alterada com sucesso!", "success");
};

window.executarSalvarComSplash = async function() {
    if (window.currentSaveCallback) {
        const dadosValidos = await window.currentSaveCallback();
        if (dadosValidos === false) return;
    }

    fecharModalPersistente();

    const splash = document.getElementById('splashSalvando');
    const bar = document.getElementById('splashSalvarBar');
    const text = document.getElementById('splashSalvarText');
    
    if (splash) splash.classList.remove('hidden');

    let progresso = 0;
    const duracaoTotal = 3000;
    const intervalo = 30;
    const incremento = 100 / (duracaoTotal / intervalo);

    const timer = setInterval(() => {
        progresso += incremento;
        if (progresso >= 100) {
            progresso = 100;
            clearInterval(timer);

            setTimeout(() => {
                if (splash) splash.classList.add('hidden');
                if (bar) bar.style.width = '0%';
                if (text) text.innerText = '0%';
                
                if (window.showToast) {
                    window.showToast("Registro salvo e sincronizado com sucesso!", "success");
                }
            }, 200);
        }

        if (bar) bar.style.width = `${progresso}%`;
        if (text) text.innerText = `${Math.round(progresso)}%`;
    }, intervalo);
};


// -----------------------------------------------------------------
// TODO: BLOCO 7.3-4: CADASTROS, FORMULÁRIOS E CARDS
// -----------------------------------------------------------------

// --------------------------------------------------------------------
// CADASTRO DE EQUIPE (motorista/representante/logística): os 3 fluxos
// são quase idênticos (nome completo + usuário de login + PIN, código
// sequencial gerado pelo servidor, editar, excluir) — centralizados
// aqui pra não repetir a mesma lógica 3 vezes.
// --------------------------------------------------------------------
const TEAM_CONFIGS = {
    driver: {
        role: 'driver', label: 'Motorista', collectionName: 'drivers',
        stateKey: 'allDrivers', containerId: 'logDriversList', searchInputId: 'searchDriversInput',
        removerFn: 'removerMotorista', pinBadgeClass: 'bg-blue-50 text-blue-700',
        nomePlaceholder: 'Ex: João da Silva', cpfObrigatorio: true, cpfLabel: 'CPF *'
    },
    representative: {
        role: 'representative', label: 'Representante', collectionName: 'representatives',
        stateKey: 'allReps', containerId: 'logRepsList', searchInputId: 'searchRepsInput',
        removerFn: 'removerRepresentante', pinBadgeClass: 'bg-emerald-50 text-emerald-700',
        nomePlaceholder: 'Ex: Carlos Representações', cpfObrigatorio: true, cpfLabel: 'CPF / CNPJ *'
    },
    logistics: {
        role: 'logistics', label: 'Membro de Logística', collectionName: 'logistics_users',
        stateKey: 'allLogistics', containerId: 'logLogisticsList', searchInputId: 'searchLogisticsInput',
        removerFn: 'removerLogistica', pinBadgeClass: 'bg-blue-50 text-blue-700',
        nomePlaceholder: 'Ex: Maria Souza', cpfObrigatorio: false, cpfLabel: 'CPF'
    }
};

function formularioMembroHtml(cfg, prefill) {
    prefill = prefill || {};
    const esc = (v) => (v || '').toString().replace(/"/g, '&quot;');
    return `
        <div class="space-y-3">
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Nome Completo *</label>
                <input type="text" id="modalMembroFullName" value="${esc(prefill.fullName)}" placeholder="${cfg.nomePlaceholder}" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#152e50] outline-none">
            </div>
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Nome de Usuário (login) *</label>
                <input type="text" id="modalMembroName" value="${esc(prefill.name)}" placeholder="Ex: joao.silva" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#152e50] outline-none">
                <p class="text-[10px] text-slate-400 mt-1">Não pode repetir dentro da empresa.</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">${cfg.cpfLabel}</label>
                    <input type="text" id="modalMembroCpf" value="${esc(prefill.cpf)}" placeholder="000.000.000-00" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                </div>
                <div>
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Telefone / WhatsApp</label>
                    <input type="text" id="modalMembroPhone" value="${esc(prefill.phone)}" placeholder="(73) 99999-9999" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                </div>
            </div>
            ${prefill.isEdit ? '' : `
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Senha / PIN</label>
                <input type="text" id="modalMembroPin" placeholder="Ex: 1234 (Gerado se vazio)" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
            </div>`}
        </div>
    `;
}

window.abrirModalNovoMembro = function(tipo) {
    const cfg = TEAM_CONFIGS[tipo];
    if (!cfg) return;

    window.abrirModalPersistente(`Cadastrar ${cfg.label}`, formularioMembroHtml(cfg), async () => {
        const fullName = document.getElementById('modalMembroFullName')?.value.trim();
        const name = document.getElementById('modalMembroName')?.value.trim();
        const cpf = document.getElementById('modalMembroCpf')?.value.trim();
        const phone = document.getElementById('modalMembroPhone')?.value.trim();
        const pin = document.getElementById('modalMembroPin')?.value.trim() || Math.floor(1000 + Math.random() * 9000).toString();

        if (!fullName || !name) {
            alert("Preencha o Nome Completo e o Nome de Usuário.");
            return false;
        }
        if (cfg.cpfObrigatorio && !cpf) {
            alert(`Preencha o ${cfg.cpfLabel.replace(' *', '')}.`);
            return false;
        }

        if (window.useFirebase) {
            const { error } = await window.db.rpc('create_team_member', {
                p_role: cfg.role, p_name: name, p_pin: pin, p_cpf: cpf || null, p_phone: phone || null, p_full_name: fullName
            });
            if (error) {
                if (window.showToast) window.showToast(`Erro ao salvar ${cfg.label.toLowerCase()}: ` + error.message, "error");
                return false;
            }
        } else {
            const lista = window.LocalDb.get(cfg.collectionName);
            lista.push({ id: cfg.role + '_' + Date.now(), name, fullName, code: null, cpf, phone, pin, companyId: window.currentCompanyId, createdAt: Date.now() });
            window.LocalDb.set(cfg.collectionName, lista);
        }

        renderMembrosList(tipo);
        return true;
    });
};

window.abrirModalEditarMembro = function(tipo, id) {
    const cfg = TEAM_CONFIGS[tipo];
    if (!cfg) return;
    const membro = (window[cfg.stateKey] || []).find(m => m.id === id);
    if (!membro) return;

    window.abrirModalPersistente(`Editar ${cfg.label}`, formularioMembroHtml(cfg, { ...membro, isEdit: true }), async () => {
        const fullName = document.getElementById('modalMembroFullName')?.value.trim();
        const name = document.getElementById('modalMembroName')?.value.trim();
        const cpf = document.getElementById('modalMembroCpf')?.value.trim();
        const phone = document.getElementById('modalMembroPhone')?.value.trim();

        if (!fullName || !name) {
            alert("Preencha o Nome Completo e o Nome de Usuário.");
            return false;
        }

        if (window.useFirebase) {
            const { error } = await window.db.rpc('update_team_member', {
                p_role: cfg.role, p_id: id, p_name: name, p_full_name: fullName, p_cpf: cpf || null, p_phone: phone || null
            });
            if (error) {
                if (window.showToast) window.showToast("Erro ao editar: " + error.message, "error");
                return false;
            }
        } else {
            const lista = window.LocalDb.get(cfg.collectionName);
            const idx = lista.findIndex(m => m.id === id);
            if (idx !== -1) {
                lista[idx] = { ...lista[idx], name, fullName, cpf, phone };
                window.LocalDb.set(cfg.collectionName, lista);
            }
        }

        renderMembrosList(tipo);
        return true;
    });
};

function renderMembrosList(tipo) {
    const cfg = TEAM_CONFIGS[tipo];
    if (!cfg) return;
    const container = document.getElementById(cfg.containerId);
    if (!container) return;

    const query = (document.getElementById(cfg.searchInputId)?.value || "").toLowerCase().trim();
    const lista = window[cfg.stateKey] || [];
    const filtrados = lista.filter(m =>
        (m.fullName || '').toLowerCase().includes(query) ||
        (m.name || '').toLowerCase().includes(query) ||
        (m.cpf || '').toLowerCase().includes(query) ||
        (m.code || '').toLowerCase().includes(query)
    );

    if (filtrados.length === 0) {
        container.innerHTML = `<div class="col-span-full p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">Nenhum ${cfg.label.toLowerCase()} encontrado.</div>`;
        return;
    }

    container.innerHTML = filtrados.map(m => {
        const nomeExibicao = m.fullName || m.name;
        const dataCadastro = m.createdAt ? new Date(m.createdAt).toLocaleDateString('pt-BR') : '-';
        return `
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
            <div>
                <div class="flex items-center justify-between gap-2">
                    <h4 class="font-bold text-slate-800 text-sm truncate">${nomeExibicao}</h4>
                    ${m.code ? `<span class="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md font-mono shrink-0">${m.code}</span>` : ''}
                </div>
                <p class="text-xs text-slate-500 mt-1.5"><i class="fa-solid fa-user mr-1.5 text-[#152e50]"></i> Usuário: ${m.name} <span class="${cfg.pinBadgeClass} font-bold px-1.5 py-0.5 rounded font-mono ml-1">PIN: ${m.pin}</span></p>
                <p class="text-xs text-slate-500 mt-1"><i class="fa-solid fa-id-card mr-1.5 text-[#152e50]"></i> CPF: ${m.cpf || 'Não informado'}</p>
                <p class="text-xs text-slate-500 mt-1"><i class="fa-solid fa-phone mr-1.5 text-[#152e50]"></i> Tel: ${m.phone || 'Não informado'}</p>
                <p class="text-[11px] text-slate-400 mt-1.5"><i class="fa-solid fa-calendar-plus mr-1.5"></i> Cadastrado em: ${dataCadastro}</p>
            </div>
            <div class="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100 flex-wrap">
                <button onclick="abrirModalEditarMembro('${tipo}', '${m.id}')" class="text-slate-600 hover:bg-slate-50 p-2 rounded-lg text-xs font-bold transition-all cursor-pointer" title="Editar">
                    <i class="fa-solid fa-pen"></i> Editar
                </button>
                <button onclick="abrirModalEditarSenha('${m.id}', '${tipo}', '${nomeExibicao.replace(/'/g, "\\'")}')" class="text-[#152e50] hover:bg-[#152e50]/5 p-2 rounded-lg text-xs font-bold transition-all cursor-pointer" title="Editar Senha">
                    <i class="fa-solid fa-key"></i> Senha
                </button>
                <button onclick="${cfg.removerFn}('${m.id}')" class="text-rose-500 hover:bg-rose-50 p-2 rounded-lg text-xs font-bold transition-all cursor-pointer" title="Remover">
                    <i class="fa-solid fa-trash-can"></i> Excluir
                </button>
            </div>
        </div>
        `;
    }).join('');
}

// 1. MOTORISTAS
window.abrirModalNovoMotorista = () => window.abrirModalNovoMembro('driver');

window.renderlogDriversList = function() {
    const select = document.getElementById('selectDriverForRoute');
    if (select) {
        const currentVal = select.value;
        select.innerHTML = '<option value="">Selecione o Motorista...</option>';
        (window.allDrivers || []).forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.name;
            opt.textContent = d.fullName || d.name;
            if (d.name === currentVal) opt.selected = true;
            select.appendChild(opt);
        });
    }
    renderMembrosList('driver');
};

// 1.1 LOGÍSTICA (Funcionário de Logística — criado/removido só pelo Admin)
window.abrirModalNovoLogistica = () => window.abrirModalNovoMembro('logistics');
window.renderlogLogisticsList = () => renderMembrosList('logistics');


// 2. VEÍCULOS & FROTA (tabela real "vehicles" no Supabase — antes era só
// um array em memória que se perdia a cada recarregamento da página)
function formularioVeiculoHtml(prefill) {
    prefill = prefill || {};
    const esc = (v) => (v || '').toString().replace(/"/g, '&quot;');
    return `
        <div class="space-y-3">
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Motorista Vinculado</label>
                <select id="modalVecDriver" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                    <option value="">Nenhum</option>
                    ${(window.allDrivers || []).map(d => `<option value="${d.id}" ${prefill.driverId === d.id ? 'selected' : ''}>${d.fullName || d.name} (CPF: ${d.cpf || 'N/A'})</option>`).join('')}
                </select>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Placa (Cavalo / Truck) *</label>
                    <input type="text" id="modalVecPlaca" value="${esc(prefill.placa)}" placeholder="ABC-1D23" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-mono">
                </div>
                <div>
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Qtd. Eixos</label>
                    <input type="number" id="modalVecEixos" min="2" max="10" value="${prefill.eixos || 3}" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                </div>
            </div>
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Tipo de Veículo</label>
                <select id="modalVecTipo" onchange="verificarRegrasDollyModal(this.value)" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                    ${['Truck', 'Carreta Simples', 'Bitrem', 'Rodotrem', 'Dolly'].map(t => `<option value="${t}" ${prefill.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
            </div>
            <div id="modalBoxCarroceria" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Carroceria</label>
                    <select id="modalVecCarroceria" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        ${['Aberta', 'Baú', 'Sider', 'Prancha'].map(c => `<option value="${c}" ${prefill.carroceria === c ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Tipo de Grade</label>
                    <select id="modalVecGrade" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        ${['Baixa', 'Alta', 'Graneleiro', 'Sem Grade'].map(g => `<option value="${g}" ${prefill.grade === g ? 'selected' : ''}>${g}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Reboque / Dolly Detalhes</label>
                <input type="text" id="modalVecReboque" value="${esc(prefill.reboque)}" placeholder="Ex: 2 reboques - 12.5m cada" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            </div>
        </div>
    `;
}

window.abrirModalNovoVeiculo = function() {
    window.abrirModalPersistente("Cadastrar Veículo & Frota", formularioVeiculoHtml(), async () => {
        const driverId = document.getElementById('modalVecDriver')?.value || null;
        const placa = document.getElementById('modalVecPlaca')?.value.trim().toUpperCase();
        const tipo = document.getElementById('modalVecTipo')?.value;
        const carroceria = document.getElementById('modalVecCarroceria')?.value;
        const grade = document.getElementById('modalVecGrade')?.value;
        const eixos = parseInt(document.getElementById('modalVecEixos')?.value, 10) || null;
        const reboque = document.getElementById('modalVecReboque')?.value.trim();

        if (!placa) {
            alert("Informe a placa do veículo.");
            return false;
        }

        if (window.useFirebase) {
            const { error } = await window.db.rpc('create_vehicle', {
                p_placa: placa, p_tipo: tipo, p_carroceria: carroceria, p_driver_id: driverId,
                p_grade: grade, p_eixos: eixos, p_reboque: reboque
            });
            if (error) {
                if (window.showToast) window.showToast("Erro ao salvar veículo: " + error.message, "error");
                return false;
            }
        } else {
            const veiculos = window.LocalDb.get('vehicles');
            veiculos.push({ id: 'vec_' + Date.now(), placa, tipo, carroceria, grade, eixos, reboque, driverId, companyId: window.currentCompanyId, createdAt: Date.now() });
            window.LocalDb.set('vehicles', veiculos);
        }

        if (window.renderlogVehiclesList) window.renderlogVehiclesList();
        return true;
    });
};

window.abrirModalEditarVeiculo = function(id) {
    const veiculo = (window.allVehicles || []).find(v => v.id === id);
    if (!veiculo) return;

    window.abrirModalPersistente("Editar Veículo", formularioVeiculoHtml(veiculo), async () => {
        const driverId = document.getElementById('modalVecDriver')?.value || null;
        const placa = document.getElementById('modalVecPlaca')?.value.trim().toUpperCase();
        const tipo = document.getElementById('modalVecTipo')?.value;
        const carroceria = document.getElementById('modalVecCarroceria')?.value;
        const grade = document.getElementById('modalVecGrade')?.value;
        const eixos = parseInt(document.getElementById('modalVecEixos')?.value, 10) || null;
        const reboque = document.getElementById('modalVecReboque')?.value.trim();

        if (!placa) {
            alert("Informe a placa do veículo.");
            return false;
        }

        if (window.useFirebase) {
            const { error } = await window.db.rpc('update_vehicle', {
                p_id: id, p_placa: placa, p_tipo: tipo, p_carroceria: carroceria, p_driver_id: driverId,
                p_grade: grade, p_eixos: eixos, p_reboque: reboque
            });
            if (error) {
                if (window.showToast) window.showToast("Erro ao editar veículo: " + error.message, "error");
                return false;
            }
        } else {
            const veiculos = window.LocalDb.get('vehicles');
            const idx = veiculos.findIndex(v => v.id === id);
            if (idx !== -1) {
                veiculos[idx] = { ...veiculos[idx], placa, tipo, carroceria, grade, eixos, reboque, driverId };
                window.LocalDb.set('vehicles', veiculos);
            }
        }

        if (window.renderlogVehiclesList) window.renderlogVehiclesList();
        return true;
    });
};

window.verificarRegrasDollyModal = function(tipo) {
    const box = document.getElementById('modalBoxCarroceria');
    if (box) {
        if (tipo === 'Dolly') box.classList.add('hidden');
        else box.classList.remove('hidden');
    }
};

window.renderlogVehiclesList = function() {
    const container = document.getElementById('logVehiclesList');
    const query = (document.getElementById('searchVehiclesInput')?.value || "").toLowerCase().trim();
    if (!container) return;

    const driversById = {};
    (window.allDrivers || []).forEach(d => { driversById[d.id] = d.fullName || d.name; });

    const vehicles = window.allVehicles || [];
    const filtrados = vehicles.filter(v =>
        (v.placa || "").toLowerCase().includes(query) ||
        (driversById[v.driverId] || "").toLowerCase().includes(query) ||
        (v.code || "").toLowerCase().includes(query)
    );

    if (filtrados.length === 0) {
        container.innerHTML = `<div class="col-span-full p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">Nenhum veículo cadastrado.</div>`;
        return;
    }

    container.innerHTML = filtrados.map(v => {
        const dataCadastro = v.createdAt ? new Date(v.createdAt).toLocaleDateString('pt-BR') : '-';
        return `
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
            <div>
                <div class="flex items-center justify-between gap-2">
                    <h4 class="font-bold text-slate-800 text-sm font-mono">${v.placa}</h4>
                    <div class="flex items-center gap-1.5 shrink-0">
                        ${v.code ? `<span class="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md font-mono">${v.code}</span>` : ''}
                        <span class="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-md">${v.tipo || '-'}</span>
                    </div>
                </div>
                <p class="text-xs text-slate-600 mt-2 font-medium"><i class="fa-solid fa-user mr-1 text-[#152e50]"></i> Mot: ${driversById[v.driverId] || 'Não atribuído'}</p>
                <p class="text-xs text-slate-500 mt-1"><i class="fa-solid fa-truck-front mr-1 text-[#152e50]"></i> Eixos: ${v.eixos || '-'} | Reboque: ${v.reboque || 'Nenhum'}</p>
                <p class="text-[11px] text-slate-400 mt-1.5"><i class="fa-solid fa-calendar-plus mr-1.5"></i> Cadastrado em: ${dataCadastro}</p>
            </div>
            <div class="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                <button onclick="abrirModalEditarVeiculo('${v.id}')" class="text-slate-600 hover:bg-slate-50 p-2 rounded-lg text-xs font-bold transition-all cursor-pointer" title="Editar">
                    <i class="fa-solid fa-pen"></i> Editar
                </button>
                <button onclick="removerVeiculo('${v.id}')" class="text-rose-500 hover:bg-rose-50 p-2 rounded-lg text-xs font-bold transition-all cursor-pointer" title="Excluir">
                    <i class="fa-solid fa-trash-can"></i> Excluir
                </button>
            </div>
        </div>
        `;
    }).join('');
};

window.removerVeiculo = function(id) {
    window.pedirConfirmacao("Remover Veículo", "Tem certeza que deseja remover este veículo?", async () => {
        if (window.useFirebase) {
            const { error } = await window.db.rpc('delete_vehicle', { p_id: id });
            if (error) {
                if (window.showToast) window.showToast("Erro ao remover veículo: " + error.message, "error");
                return;
            }
        } else {
            window.allVehicles = (window.allVehicles || []).filter(v => v.id !== id);
            window.LocalDb.set('vehicles', window.allVehicles);
        }
        if (window.showToast) window.showToast("Veículo removido", "success");
        window.renderlogVehiclesList();
    });
};


// 3. REPRESENTANTES COMERCIAIS
window.abrirModalNovoRep = () => window.abrirModalNovoMembro('representative');

window.renderlogRepsList = function() {
    const selectRoute = document.getElementById('selectRepForRoute');
    if (selectRoute) {
        const currentVal = selectRoute.value;
        selectRoute.innerHTML = '<option value="">Nenhum Representante</option>';
        (window.allReps || []).forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.name;
            opt.textContent = r.fullName || r.name;
            if (r.name === currentVal) opt.selected = true;
            selectRoute.appendChild(opt);
        });
    }
    renderMembrosList('representative');
};


// ----------------------------------------------------
// TODO: BLOCO 7.3-5: DASHBOARD, MÉTRICAS E RANKINGS
// ----------------------------------------------------
window.renderAdminDashboard = () => {
    const activeCountElem = document.getElementById('dashActiveCount');
    const proximasElem = document.getElementById('dashProximasConclusaoCount');
    const citiesCountElem = document.getElementById('dashCitiesCount');
    const driversMonthlyListElem = document.getElementById('dashDriversMonthlyList');
    const citiesRankingListElem = document.getElementById('dashCitiesRankingList');

    if (!activeCountElem) return;

    const licencasElem = document.getElementById('dashLicencasUso');
    if (licencasElem && window.calcularUsoLicencas && window.currentCompanyId) {
        const uso = window.calcularUsoLicencas(window.currentCompanyId);
        const limits = window.companyPlanLimits || {};
        const labels = { admins: 'Admins', logistics: 'Logística', drivers: 'Motoristas', representatives: 'Representantes', vehicles: 'Veículos' };

        licencasElem.innerHTML = Object.entries(labels).map(([key, label]) => {
            const usado = uso[key] || 0;
            const limite = limits[key] ?? 0;
            const restante = limite - usado;
            const esgotado = limite > 0 && restante <= 0;
            const pertoDoLimite = limite > 0 && !esgotado && restante <= Math.max(1, Math.ceil(limite * 0.1));
            const pct = limite > 0 ? Math.min(100, Math.round((usado / limite) * 100)) : 0;
            const corBarra = esgotado ? 'bg-rose-500' : pertoDoLimite ? 'bg-amber-500' : 'bg-[#152e50]';
            return `
                <div class="space-y-1">
                    <div class="flex justify-between text-[11px] font-semibold">
                        <span class="text-slate-600">${label}</span>
                        <span class="${esgotado ? 'text-rose-600' : pertoDoLimite ? 'text-amber-600' : 'text-slate-600'} font-bold">${usado}/${limite}</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-1.5">
                        <div class="${corBarra} h-1.5 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    const activeRoutes = (window.allRoutes || []).filter(r => r.status === 'active');
    activeCountElem.innerText = activeRoutes.length;

    let proximasConclusao = 0;
    activeRoutes.forEach(r => {
        const entregas = window.obterParadasValidas ? window.obterParadasValidas(r.stops) : (r.stops || []);
        const concluidas = entregas.filter(s => s.concluido).length;
        const pct = entregas.length > 0 ? (concluidas / entregas.length) : 0;
        if (pct >= 0.7 && concluidas < entregas.length) {
            proximasConclusao++;
        }
    });
    if (proximasElem) proximasElem.innerText = proximasConclusao;

    const comparativoElem = document.getElementById('dashComparativoMeses');
    if (comparativoElem) {
        const agora = new Date();
        const mesAtualIdx = agora.getMonth();
        const anoAtual = agora.getFullYear();
        const dataMesAnterior = new Date(anoAtual, mesAtualIdx - 1, 1);
        const mesAnteriorIdx = dataMesAnterior.getMonth();
        const anoMesAnterior = dataMesAnterior.getFullYear();

        const rotasConcluidas = (window.allRoutes || []).filter(r => r.status === 'archived' && r.finishedAt);
        const contarNoMes = (mes, ano) => rotasConcluidas.filter(r => {
            const d = new Date(r.finishedAt);
            return d.getMonth() === mes && d.getFullYear() === ano;
        }).length;

        const concluidasMesAtual = contarNoMes(mesAtualIdx, anoAtual);
        const concluidasMesAnterior = contarNoMes(mesAnteriorIdx, anoMesAnterior);

        if (concluidasMesAtual === 0 && concluidasMesAnterior === 0) {
            comparativoElem.innerHTML = `<p class="text-xs text-slate-400 italic text-center py-2">Nenhuma rota concluída ainda para comparar.</p>`;
        } else {
            const maxBarra = Math.max(concluidasMesAtual, concluidasMesAnterior, 1);
            const variacao = concluidasMesAnterior > 0
                ? Math.round(((concluidasMesAtual - concluidasMesAnterior) / concluidasMesAnterior) * 100)
                : null;
            const tendenciaHtml = variacao === null
                ? ''
                : `<span class="text-[11px] font-bold ${variacao >= 0 ? 'text-emerald-600' : 'text-rose-600'} ml-2"><i class="fa-solid ${variacao >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'} mr-1"></i>${variacao >= 0 ? '+' : ''}${variacao}%</span>`;

            comparativoElem.innerHTML = `
                <div class="space-y-1">
                    <div class="flex justify-between text-xs font-semibold">
                        <span class="text-[#152e50]">Mês Atual ${tendenciaHtml}</span>
                        <span class="text-[#152e50] font-bold">${concluidasMesAtual} rota(s)</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-2">
                        <div class="bg-[#152e50] h-2 rounded-full transition-all duration-500" style="width: ${Math.round((concluidasMesAtual / maxBarra) * 100)}%"></div>
                    </div>
                </div>
                <div class="space-y-1">
                    <div class="flex justify-between text-xs font-semibold">
                        <span class="text-slate-500">Mês Anterior</span>
                        <span class="text-slate-500 font-bold">${concluidasMesAnterior} rota(s)</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-2">
                        <div class="bg-slate-400 h-2 rounded-full transition-all duration-500" style="width: ${Math.round((concluidasMesAnterior / maxBarra) * 100)}%"></div>
                    </div>
                </div>
            `;
        }
    }

    let cityCounts = {};
    let totalCidadesAtendidas = 0;

    (window.allRoutes || []).forEach(r => {
        if (r.stops && r.stops.length > 0) {
            const paradasValidas = window.obterParadasValidas ? window.obterParadasValidas(r.stops) : r.stops;
            paradasValidas.forEach((stop) => {
                let cityName = (stop.textoOriginal || stop.texto || '').trim();
                cityName = cityName.replace(/ - Iniciar Rota/gi, '').replace(/ - Finalizar Rota/gi, '').trim();
                
                if (cityName && cityName.toLowerCase() !== 'iniciar rota' && cityName.toLowerCase() !== 'finalizar rota') {
                    cityCounts[cityName] = (cityCounts[cityName] || 0) + 1;
                    if (stop.concluido) {
                        totalCidadesAtendidas++;
                    }
                }
            });
        }
    });

    if (citiesCountElem) citiesCountElem.innerText = totalCidadesAtendidas;

    if (citiesRankingListElem) {
        citiesRankingListElem.innerHTML = '';
        const sortedCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

        if (sortedCities.length === 0) {
            citiesRankingListElem.innerHTML = `<p class="text-xs text-slate-500 italic">Nenhuma cidade registrada nas rotas ainda.</p>`;
        } else {
            const maxCount = sortedCities[0][1] || 1;
            sortedCities.forEach(([cityName, count], index) => {
                const pctBar = Math.round((count / maxCount) * 100);
                const row = document.createElement('div');
                row.className = "space-y-1";
                row.innerHTML = `
                    <div class="flex justify-between text-xs font-semibold">
                        <span class="text-[#152e50]"><strong class="text-[#fac043]">${index + 1}º</strong> ${cityName}</span>
                        <span class="text-[#152e50] font-bold">${count} ocorrência(s)</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-1.5">
                        <div class="bg-[#152e50] h-1.5 rounded-full transition-all duration-500" style="width: ${pctBar}%"></div>
                    </div>
                `;
                citiesRankingListElem.appendChild(row);
            });
        }
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let driverCounts = {};
    (window.allDrivers || []).forEach(d => { driverCounts[d.name] = 0; });

    (window.allRoutes || []).forEach(r => {
        const routeDate = new Date(r.finishedAt || r.createdAt);
        if (routeDate.getMonth() === currentMonth && routeDate.getFullYear() === currentYear) {
            if (r.driverName) {
                driverCounts[r.driverName] = (driverCounts[r.driverName] || 0) + 1;
            }
        }
    });

    if (driversMonthlyListElem) {
        driversMonthlyListElem.innerHTML = '';
        const driverNames = Object.keys(driverCounts);
        if (driverNames.length === 0) {
            driversMonthlyListElem.innerHTML = `<p class="text-xs text-slate-500 italic col-span-2">Nenhum motorista registrado este mês.</p>`;
            return;
        }

        driverNames.forEach(dName => {
            const card = document.createElement('div');
            card.className = "bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between";
            card.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-[#152e50]/10 text-[#152e50] flex items-center justify-center font-bold text-xs">
                        <i class="fa-solid fa-truck"></i>
                    </div>
                    <div>
                        <p class="font-bold text-slate-800 text-xs">${dName}</p>
                        <p class="text-[11px] text-slate-500">Cargas carregadas no mês</p>
                    </div>
                </div>
                <span class="px-3 py-1 rounded-lg bg-[#152e50] text-white font-extrabold text-xs shadow-sm">${driverCounts[dName]}</span>
            `;
            driversMonthlyListElem.appendChild(card);
        });
    }
};

// removerAdmin / removerMotorista / removerRepresentante ficam definidos em
// log-rotas.js (única fonte da verdade — usam a RPC delete_team_member).