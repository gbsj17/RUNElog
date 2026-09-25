
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
    
    const secoesSidebar = ['rotas', 'fretes', 'dashboard', 'frota', 'rotas-produtos'];
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
        'rotas': { title: 'Gestão Operacional de Rotas', subtitle: 'Cargas em andamento e novas rotas', icon: 'fa-route' },
        'fretes': { title: 'Gestão de Fretes Terceirizados', subtitle: 'Gerenciamento financeiro e emissão de OC', icon: 'fa-calculator' },
        'dashboard': { title: 'Visão Geral & Métricas', subtitle: 'Desempenho e relatórios estratégicos', icon: 'fa-chart-pie' },
        'frota': { title: 'Gestão de Frota e Funcionários', subtitle: 'Controle de motoristas, veículos e equipes', icon: 'fa-truck-front' },
        'rotas-produtos': { title: 'Gestão de Rotas e Produtos', subtitle: 'Cadastros centrais de apoio logístico', icon: 'fa-boxes-stacked' }
    };

    const currentInfo = headerInfo[tab] || headerInfo['rotas'];

    const hTitle = document.getElementById('logHeaderTitle');
    if (hTitle) hTitle.innerText = currentInfo.title;

    const hSubtitle = document.getElementById('logHeaderSubtitle');
    if (hSubtitle) hSubtitle.innerText = currentInfo.subtitle;

    const hIcon = document.getElementById('logHeaderMobileIcon');
    if (hIcon) hIcon.className = `fa-solid ${currentInfo.icon}`;

    if (tab === 'dashboard' && window.renderAdminDashboard) {
        window.renderAdminDashboard();
    } else if (tab === 'fretes' && window.renderPainelFretes) {
        window.renderPainelFretes();
    } else if (tab === 'frota') {
        if (window.renderlogDriversList) window.renderlogDriversList();
        if (window.renderlogVehiclesList) window.renderlogVehiclesList();
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

// -----------------------------------------------------
// TODO: BLOCO 7.3-2: SUB-ABAS (PÍLULAS INTERNAS)
// -----------------------------------------------------
window.mudarSubAbaFrota = function(aba) {
    const btnM = document.getElementById('tabSubMotoristas');
    const btnV = document.getElementById('tabSubVeiculos');
    const contentM = document.getElementById('subAbaMotoristasContent');
    const contentV = document.getElementById('subAbaVeiculosContent');

    if (aba === 'motoristas') {
        if (btnM) btnM.className = "flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#152e50] text-[#fac043] shadow-sm transition-all text-center cursor-pointer flex items-center justify-center gap-1.5";
        if (btnV) btnV.className = "flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all text-center cursor-pointer flex items-center justify-center gap-1.5";
        if (contentM) contentM.classList.remove('hidden');
        if (contentV) contentV.classList.add('hidden');
    } else {
        if (btnV) btnV.className = "flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#152e50] text-[#fac043] shadow-sm transition-all text-center cursor-pointer flex items-center justify-center gap-1.5";
        if (btnM) btnM.className = "flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all text-center cursor-pointer flex items-center justify-center gap-1.5";
        if (contentV) contentV.classList.remove('hidden');
        if (contentM) contentM.classList.add('hidden');
    }
};

window.mudarSubAbaRepsLog = function(aba) {
    const btnR = document.getElementById('tabSubReps');
    const btnC = document.getElementById('tabSubCobertura');
    const btnL = document.getElementById('tabSubLogUsers');
    const contentR = document.getElementById('subAbaRepsContent');
    const contentC = document.getElementById('subAbaCoberturaContent');
    const contentL = document.getElementById('subAbaLogUsersContent');

    [btnR, btnC, btnL].forEach(b => {
        if (b) b.className = "flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all text-center cursor-pointer flex items-center justify-center gap-1.5";
    });
    [contentR, contentC, contentL].forEach(c => {
        if (c) c.classList.add('hidden');
    });

    if (aba === 'reps') {
        if (btnR) btnR.className = "flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-[#152e50] text-[#fac043] shadow-sm transition-all text-center cursor-pointer flex items-center justify-center gap-1.5";
        if (contentR) contentR.classList.remove('hidden');
    } else if (aba === 'cobertura') {
        if (btnC) btnC.className = "flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-[#152e50] text-[#fac043] shadow-sm transition-all text-center cursor-pointer flex items-center justify-center gap-1.5";
        if (contentC) contentC.classList.remove('hidden');
    } else if (aba === 'logusers') {
        if (btnL) btnL.className = "flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-[#152e50] text-[#fac043] shadow-sm transition-all text-center cursor-pointer flex items-center justify-center gap-1.5";
        if (contentL) contentL.classList.remove('hidden');
    }
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

// 1. MOTORISTAS
window.abrirModalNovoMotorista = function() {
    const html = `
        <div class="space-y-3">
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Nome Completo *</label>
                <input type="text" id="modalDrvName" placeholder="Ex: João da Silva" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#152e50] outline-none">
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">CPF *</label>
                    <input type="text" id="modalDrvCpf" placeholder="000.000.000-00" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                </div>
                <div>
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Telefone / WhatsApp</label>
                    <input type="text" id="modalDrvPhone" placeholder="(73) 99999-9999" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                </div>
            </div>
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">PIN / Senha de Acesso</label>
                <input type="text" id="modalDrvPin" placeholder="Ex: 1234 (Gerado se vazio)" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
            </div>
        </div>
    `;

    window.abrirModalPersistente("Cadastrar Novo Motorista", html, async () => {
        const name = document.getElementById('modalDrvName')?.value.trim();
        const cpf = document.getElementById('modalDrvCpf')?.value.trim();
        const phone = document.getElementById('modalDrvPhone')?.value.trim();
        const pin = document.getElementById('modalDrvPin')?.value.trim() || Math.floor(1000 + Math.random() * 9000).toString();

        if (!name || !cpf) {
            alert("Preencha o Nome e o CPF do motorista.");
            return false;
        }

        const novoDriver = { name, cpf, phone, pin, companyId: window.currentCompanyId, createdAt: Date.now() };

        if (window.useFirebase) {
            const { error } = await window.db.rpc('create_team_member', { p_role: 'driver', p_name: name, p_pin: pin, p_cpf: cpf, p_phone: phone });
            if (error) {
                if (window.showToast) window.showToast("Erro ao salvar motorista: " + error.message, "error");
                return false;
            }
        } else {
            novoDriver.id = 'drv_' + Date.now();
            const drivers = window.LocalDb.get('drivers');
            drivers.push(novoDriver);
            window.LocalDb.set('drivers', drivers);
        }

        if (window.renderlogDriversList) window.renderlogDriversList();
        return true;
    });
};

window.renderlogDriversList = function() {
    const container = document.getElementById('logDriversList');
    const select = document.getElementById('selectDriverForRoute');
    const query = (document.getElementById('searchDriversInput')?.value || "").toLowerCase().trim();

    if (select) {
        const currentVal = select.value;
        select.innerHTML = '<option value="">Selecione o Motorista...</option>';
        (window.allDrivers || []).forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.name;
            opt.textContent = d.name;
            if (d.name === currentVal) opt.selected = true;
            select.appendChild(opt);
        });
    }

    if (!container) return;
    const drivers = window.allDrivers || [];
    const filtrados = drivers.filter(d => 
        (d.name || "").toLowerCase().includes(query) || 
        (d.cpf || "").toLowerCase().includes(query)
    );

    if (filtrados.length === 0) {
        container.innerHTML = `<div class="col-span-full p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">Nenhum motorista encontrado.</div>`;
        return;
    }

    container.innerHTML = filtrados.map(d => `
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
            <div>
                <div class="flex items-center justify-between">
                    <h4 class="font-bold text-slate-800 text-sm">${d.name}</h4>
                    <span class="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md font-mono">PIN: ${d.pin}</span>
                </div>
                <p class="text-xs text-slate-500 mt-1.5"><i class="fa-solid fa-id-card mr-1.5 text-[#152e50]"></i> CPF: ${d.cpf || 'Não informado'}</p>
                <p class="text-xs text-slate-500 mt-1"><i class="fa-solid fa-phone mr-1.5 text-[#152e50]"></i> Tel: ${d.phone || 'Não informado'}</p>
            </div>
            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button onclick="removerMotorista('${d.id}')" class="text-rose-500 hover:bg-rose-50 p-2 rounded-lg text-xs font-bold transition-all cursor-pointer" title="Remover">
                    <i class="fa-solid fa-trash-can"></i> Excluir
                </button>
            </div>
        </div>
    `).join('');
};


// 2. VEÍCULOS & FROTA
window.abrirModalNovoVeiculo = function() {
    const html = `
        <div class="space-y-3">
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Motorista Vinculado</label>
                <select id="modalVecDriver" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                    ${(window.allDrivers || []).map(d => `<option value="${d.name}">${d.name} (CPF: ${d.cpf || 'N/A'})</option>`).join('')}
                </select>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Placa (Cavalo / Truck) *</label>
                    <input type="text" id="modalVecPlaca" placeholder="ABC-1D23" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-mono">
                </div>
                <div>
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Qtd. Eixos</label>
                    <input type="number" id="modalVecEixos" min="2" max="10" value="3" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                </div>
            </div>
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Tipo de Veículo</label>
                <select id="modalVecTipo" onchange="verificarRegrasDollyModal(this.value)" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                    <option value="Truck">Truck (Toco/3 Eixos)</option>
                    <option value="Carreta Simples">Carreta Simples</option>
                    <option value="Bitrem">Bitrem</option>
                    <option value="Rodotrem">Rodotrem</option>
                    <option value="Dolly">Dolly / Reboque Intermediário</option>
                </select>
            </div>
            <div id="modalBoxCarroceria" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Carroceria</label>
                    <select id="modalVecCarroceria" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        <option value="Aberta">Aberta</option>
                        <option value="Baú">Fechada / Baú</option>
                        <option value="Sider">Sider</option>
                        <option value="Prancha">Prancha</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Tipo de Grade</label>
                    <select id="modalVecGrade" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        <option value="Baixa">Grade Baixa</option>
                        <option value="Alta">Grade Alta</option>
                        <option value="Graneleiro">Graneleiro</option>
                        <option value="Sem Grade">Sem Grade</option>
                    </select>
                </div>
            </div>
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Reboque / Dolly Detalhes</label>
                <input type="text" id="modalVecReboque" placeholder="Ex: 2 reboques - 12.5m cada" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            </div>
        </div>
    `;

    window.abrirModalPersistente("Cadastrar Veículo & Frota", html, () => {
        const driver = document.getElementById('modalVecDriver')?.value;
        const placa = document.getElementById('modalVecPlaca')?.value.trim().toUpperCase();
        const tipo = document.getElementById('modalVecTipo')?.value;
        const eixos = document.getElementById('modalVecEixos')?.value;
        const reboque = document.getElementById('modalVecReboque')?.value.trim();

        if (!placa) {
            alert("Informe a placa do veículo.");
            return false;
        }

        if (!window.allVehicles) window.allVehicles = [];
        window.allVehicles.push({ id: 'vec_' + Date.now(), driver, placa, tipo, eixos, reboque });

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

    const vehicles = window.allVehicles || [];
    const filtrados = vehicles.filter(v => 
        (v.placa || "").toLowerCase().includes(query) || 
        (v.driver || "").toLowerCase().includes(query)
    );

    if (filtrados.length === 0) {
        container.innerHTML = `<div class="col-span-full p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">Nenhum veículo cadastrado.</div>`;
        return;
    }

    container.innerHTML = filtrados.map(v => `
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
            <div>
                <div class="flex items-center justify-between">
                    <h4 class="font-bold text-slate-800 text-sm font-mono">${v.placa}</h4>
                    <span class="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-md">${v.tipo}</span>
                </div>
                <p class="text-xs text-slate-600 mt-2 font-medium"><i class="fa-solid fa-user mr-1 text-[#152e50]"></i> Mot: ${v.driver || 'Não atribuído'}</p>
                <p class="text-xs text-slate-500 mt-1"><i class="fa-solid fa-truck-front mr-1 text-[#152e50]"></i> Eixos: ${v.eixos} | Reboque: ${v.reboque || 'Nenhum'}</p>
            </div>
            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button onclick="removerVeiculo('${v.id}')" class="text-rose-500 hover:bg-rose-50 p-2 rounded-lg text-xs font-bold transition-all cursor-pointer" title="Excluir">
                    <i class="fa-solid fa-trash-can"></i> Excluir
                </button>
            </div>
        </div>
    `).join('');
};

window.removerVeiculo = function(id) {
    if (window.allVehicles) {
        window.allVehicles = window.allVehicles.filter(v => v.id !== id);
        window.renderlogVehiclesList();
    }
};


// 3. REPRESENTANTES COMERCIAIS
window.abrirModalNovoRep = function() {
    const html = `
        <div class="space-y-3">
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Nome / Empresa Representante *</label>
                <input type="text" id="modalRepName" placeholder="Ex: Carlos Representações" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#152e50] outline-none">
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">CPF / CNPJ *</label>
                    <input type="text" id="modalRepCpf" placeholder="00.000.000/0001-00" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                </div>
                <div>
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Telefone / WhatsApp</label>
                    <input type="text" id="modalRepPhone" placeholder="(73) 99999-9999" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                </div>
            </div>
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">PIN / Senha de Acesso</label>
                <input type="text" id="modalRepPin" placeholder="Ex: 1234 (Gerado se vazio)" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
            </div>
        </div>
    `;

    window.abrirModalPersistente("Cadastrar Representante Comercial", html, async () => {
        const name = document.getElementById('modalRepName')?.value.trim();
        const cpf = document.getElementById('modalRepCpf')?.value.trim();
        const phone = document.getElementById('modalRepPhone')?.value.trim();
        const pin = document.getElementById('modalRepPin')?.value.trim() || Math.floor(1000 + Math.random() * 9000).toString();

        if (!name || !cpf) {
            alert("Preencha o Nome e o CPF/CNPJ.");
            return false;
        }

        const novoRep = { name, cpf, phone, pin, companyId: window.currentCompanyId, createdAt: Date.now() };

        if (window.useFirebase) {
            const { error } = await window.db.rpc('create_team_member', { p_role: 'representative', p_name: name, p_pin: pin, p_cpf: cpf, p_phone: phone });
            if (error) {
                if (window.showToast) window.showToast("Erro ao salvar representante: " + error.message, "error");
                return false;
            }
        } else {
            novoRep.id = 'rep_' + Date.now();
            const reps = window.LocalDb.get('representatives');
            reps.push(novoRep);
            window.LocalDb.set('representatives', reps);
        }

        if (window.renderlogRepsList) window.renderlogRepsList();
        return true;
    });
};

window.renderlogRepsList = function() {
    const container = document.getElementById('logRepsList');
    const selectRoute = document.getElementById('selectRepForRoute');
    const query = (document.getElementById('searchRepsInput')?.value || "").toLowerCase().trim();

    if (selectRoute) {
        const currentVal = selectRoute.value;
        selectRoute.innerHTML = '<option value="">Nenhum Representante</option>';
        (window.allReps || []).forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.name;
            opt.textContent = r.name;
            if (r.name === currentVal) opt.selected = true;
            selectRoute.appendChild(opt);
        });
    }

    if (!container) return;
    const reps = window.allReps || [];
    const filtrados = reps.filter(r => 
        (r.name || "").toLowerCase().includes(query) || 
        (r.cpf || "").toLowerCase().includes(query)
    );

    if (filtrados.length === 0) {
        container.innerHTML = `<div class="col-span-full p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">Nenhum representante encontrado.</div>`;
        return;
    }

    container.innerHTML = filtrados.map(r => `
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
            <div>
                <div class="flex items-center justify-between">
                    <h4 class="font-bold text-slate-800 text-sm">${r.name}</h4>
                    <span class="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md font-mono">PIN: ${r.pin}</span>
                </div>
                <p class="text-xs text-slate-500 mt-1.5"><i class="fa-solid fa-id-card mr-1.5 text-[#152e50]"></i> CPF/CNPJ: ${r.cpf || 'Não informado'}</p>
                <p class="text-xs text-slate-500 mt-1"><i class="fa-solid fa-phone mr-1.5 text-[#152e50]"></i> Tel: ${r.phone || 'Não informado'}</p>
            </div>
            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button onclick="removerRepresentante('${r.id}')" class="text-rose-500 hover:bg-rose-50 p-2 rounded-lg text-xs font-bold transition-all cursor-pointer" title="Remover">
                    <i class="fa-solid fa-trash-can"></i> Excluir
                </button>
            </div>
        </div>
    `).join('');
};


// 4. USUÁRIOS DA LOGÍSTICA
window.abrirModalNovoLogUser = function() {
    const html = `
        <div class="space-y-3">
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Nome do Funcionário *</label>
                <input type="text" id="modalLogName" placeholder="Ex: Ana Operações" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#152e50] outline-none">
            </div>
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Usuário de Acesso (Login) *</label>
                <input type="text" id="modalLogUser" placeholder="Ex: ana.log" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            </div>
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Senha / PIN</label>
                <input type="text" id="modalLogPin" placeholder="Ex: 1234 (Gerado se vazio)" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
            </div>
        </div>
    `;

    window.abrirModalPersistente("Cadastrar Usuário da Logística", html, () => {
        const name = document.getElementById('modalLogName')?.value.trim();
        const username = document.getElementById('modalLogUser')?.value.trim();
        const pin = document.getElementById('modalLogPin')?.value.trim() || Math.floor(1000 + Math.random() * 9000).toString();

        if (!name || !username) {
            alert("Preencha o Nome e o Usuário.");
            return false;
        }

        if (!window.allLogUsers) window.allLogUsers = [];
        window.allLogUsers.push({ id: 'log_' + Date.now(), name, username, pin });

        if (window.renderlogUsersList) window.renderlogUsersList();
        return true;
    });
};

window.renderlogUsersList = function() {
    const container = document.getElementById('logUsersList');
    const query = (document.getElementById('searchLogUsersInput')?.value || "").toLowerCase().trim();
    if (!container) return;

    const users = window.allLogUsers || [];
    const filtrados = users.filter(u => 
        (u.name || "").toLowerCase().includes(query) || 
        (u.username || "").toLowerCase().includes(query)
    );

    if (filtrados.length === 0) {
        container.innerHTML = `<div class="col-span-full p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">Nenhum usuário logístico cadastrado.</div>`;
        return;
    }

    container.innerHTML = filtrados.map(u => `
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
            <div>
                <div class="flex items-center justify-between">
                    <h4 class="font-bold text-slate-800 text-sm">${u.name}</h4>
                    <span class="text-[10px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-md font-mono">Login: ${u.username}</span>
                </div>
                <p class="text-xs text-slate-500 mt-2"><i class="fa-solid fa-shield-halved mr-1 text-[#152e50]"></i> Acesso Restrito à Logística</p>
            </div>
            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button onclick="removerLogUser('${u.id}')" class="text-rose-500 hover:bg-rose-50 p-2 rounded-lg text-xs font-bold transition-all cursor-pointer" title="Excluir">
                    <i class="fa-solid fa-trash-can"></i> Excluir
                </button>
            </div>
        </div>
    `).join('');
};

window.removerLogUser = function(id) {
    if (window.allLogUsers) {
        window.allLogUsers = window.allLogUsers.filter(u => u.id !== id);
        window.renderlogUsersList();
    }
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

window.removerAdmin = async (id) => {
    if (window.pedirConfirmacao) {
        window.pedirConfirmacao("Remover Administrador", "Deseja realmente remover este usuário?", async () => {
            if (window.useFirebase) {
                await window.db.rpc('delete_team_member', { p_role: 'admin', p_id: id });
            } else {
                let list = LocalDb.get('admins').filter(item => item.id !== id);
                LocalDb.set('admins', list);
            }
            if (window.renderloglogsList) window.renderloglogsList();
        });
    }
};

window.removerMotorista = async (id) => {
    if (window.allDrivers) {
        window.allDrivers = window.allDrivers.filter(d => d.id !== id);
        if (window.renderlogDriversList) window.renderlogDriversList();
    }
};

window.removerRepresentante = async (id) => {
    if (window.allReps) {
        window.allReps = window.allReps.filter(r => r.id !== id);
        if (window.renderlogRepsList) window.renderlogRepsList();
    }
};