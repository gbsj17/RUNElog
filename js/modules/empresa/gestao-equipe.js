// ==========================================================================
// Painel de Gestão do Admin — EXCLUSIVO do papel "admin".
//
// Não usa nada de js/modules/log/log-core.js, log-rotas.js ou log-fretes.js
// (esses são exclusivos da Logística: rotas, fretes, importador). Só reaproveita
// helpers de UI genéricos já usados também pelo RUNEmaster — abrirModalPersistente/
// pedirConfirmacao/showToast (log-core.js) e calcularUsoLicencas (admin-tenants.js)
// — que são utilitários de interface, não função de negócio da Logística.
//
// Funções: cadastro/edição/ativação de Motoristas, Representantes e Logística,
// cadastro de Veículos, visão de Licenças e definição de Permissões por
// pessoa da Logística. Nada de rotas, fretes, cidades ou métricas operacionais.
// ==========================================================================

const ADMGESTAO_LIMITE_LABELS = { admins: 'Admins', logistics: 'Logística', drivers: 'Motoristas', representatives: 'Representantes', vehicles: 'Veículos' };

window.iniciarPainelAdminGestao = function() {
    if (window.mostrarTelaComAnimacao) window.mostrarTelaComAnimacao('dashboardAdminGestao');
    window.startAdminGestaoListeners();
    window.alternarAbaAdminGestao('usuarios');
    window.mudarSubAbaAdmGestaoUsuarios('motoristas');
};

// Listeners próprios (não usa startAdminListeners/carregarDadosIniciais de
// app.js, que agora são exclusivos do fluxo operacional da Logística) —
// mesmo padrão de isolamento que o RUNEmaster já usa (startMasterListeners).
window.startAdminGestaoListeners = function() {
    if (!window.useFirebase) return;
    const companyFilter = { companyId: window.currentCompanyId };

    if (!window.unsubDrivers) window.unsubDrivers = window.subscribeTable('drivers', data => {
        window.allDrivers = data;
        if (window.currentUserRole === 'admin') { renderAdmGestaoMembros('driver'); renderAdmGestaoMetricas(); renderAdmGestaoLicencas(); }
    }, companyFilter);
    if (!window.unsubReps) window.unsubReps = window.subscribeTable('representatives', data => {
        window.allReps = data;
        if (window.currentUserRole === 'admin') { renderAdmGestaoMembros('representative'); renderAdmGestaoMetricas(); renderAdmGestaoLicencas(); }
    }, companyFilter);
    if (!window.unsubLogistics) window.unsubLogistics = window.subscribeTable('logistics_users', data => {
        window.allLogistics = data;
        if (window.currentUserRole === 'admin') { renderAdmGestaoMembros('logistics'); renderAdmGestaoPermissoes(); renderAdmGestaoMetricas(); renderAdmGestaoLicencas(); }
    }, companyFilter);
    if (!window.unsubAdmins) window.unsubAdmins = window.subscribeTable('admins', data => {
        window.allAdmins = data;
        if (window.currentUserRole === 'admin') renderAdmGestaoLicencas();
    }, companyFilter);
    if (!window.unsubVehicles) window.unsubVehicles = window.subscribeTable('vehicles', data => {
        window.allVehicles = data;
        if (window.currentUserRole === 'admin') { renderAdmGestaoVehiclesList(); renderAdmGestaoMetricas(); renderAdmGestaoLicencas(); }
    }, companyFilter);
};

window.alternarModoSidebarAdminGestao = function() {
    const sidebar = document.getElementById('mainAdminGestaoSidebar');
    const toggleIcon = document.getElementById('sidebarToggleIconAdminGestao');
    const textElements = sidebar ? sidebar.querySelectorAll('.sidebar-text-element') : [];
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

window.alternarAbaAdminGestao = function(tab) {
    window.admGestaoCurrentTab = tab;

    const secoes = ['usuarios', 'veiculos', 'licencas', 'permissoes', 'metricas'];
    secoes.forEach(s => {
        const btn = document.getElementById('nav-admgestao-' + s);
        if (btn) {
            btn.className = s === tab
                ? "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white/15 text-[#fac043] transition-all font-bold cursor-pointer"
                : "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition-all cursor-pointer";
        }
        const mobileBtn = document.getElementById('mobileAdmGestaoTab' + s.charAt(0).toUpperCase() + s.slice(1));
        if (mobileBtn) {
            mobileBtn.className = s === tab
                ? "flex flex-col items-center gap-1.5 text-[11px] font-bold text-[#152e50] bottom-nav-active"
                : "flex flex-col items-center gap-1.5 text-[11px] font-medium text-slate-400";
        }
    });

    const conteudos = {
        usuarios: document.getElementById('contentAdmGestaoUsuarios'),
        veiculos: document.getElementById('contentAdmGestaoVeiculos'),
        licencas: document.getElementById('contentAdmGestaoLicencas'),
        permissoes: document.getElementById('contentAdmGestaoPermissoes'),
        metricas: document.getElementById('contentAdmGestaoMetricas')
    };
    Object.keys(conteudos).forEach(key => {
        const el = conteudos[key];
        if (el) el.classList.toggle('hidden', key !== tab);
    });

    const headerInfo = {
        usuarios: { title: 'Usuários', subtitle: 'Cadastro, edição e ativação de usuários da empresa' },
        veiculos: { title: 'Veículos', subtitle: 'Cadastro e edição da frota' },
        licencas: { title: 'Licenças', subtitle: 'Uso do plano contratado' },
        permissoes: { title: 'Permissões', subtitle: 'Módulos liberados por pessoa da Logística' },
        metricas: { title: 'Métricas', subtitle: 'Visão geral de cadastros e uso' }
    };
    const info = headerInfo[tab];
    if (info) {
        const t = document.getElementById('admGestaoHeaderTitle');
        const s = document.getElementById('admGestaoHeaderSubtitle');
        if (t) t.innerText = info.title;
        if (s) s.innerText = info.subtitle;
    }

    if (tab === 'veiculos') renderAdmGestaoVehiclesList();
    if (tab === 'licencas') renderAdmGestaoLicencas();
    if (tab === 'permissoes') renderAdmGestaoPermissoes();
    if (tab === 'metricas') renderAdmGestaoMetricas();
};

window.mudarSubAbaAdmGestaoUsuarios = function(sub) {
    const botoes = {
        motoristas: document.getElementById('tabSubAdmGestaoMotoristas'),
        representantes: document.getElementById('tabSubAdmGestaoRepresentantes'),
        logistica: document.getElementById('tabSubAdmGestaoLogistica')
    };
    const conteudos = {
        motoristas: document.getElementById('subAbaAdmGestaoMotoristasContent'),
        representantes: document.getElementById('subAbaAdmGestaoRepresentantesContent'),
        logistica: document.getElementById('subAbaAdmGestaoLogisticaContent')
    };
    Object.keys(botoes).forEach(key => {
        const btn = botoes[key];
        if (btn) {
            btn.className = key === sub
                ? "flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#152e50] text-[#fac043] shadow-sm transition-all text-center cursor-pointer"
                : "flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all text-center cursor-pointer";
        }
        const content = conteudos[key];
        if (content) content.classList.toggle('hidden', key !== sub);
    });

    const tipoPorSub = { motoristas: 'driver', representantes: 'representative', logistica: 'logistics' };
    renderAdmGestaoMembros(tipoPorSub[sub]);
};

// --------------------------------------------------------------------------
// Cadastro de equipe (Motorista/Representante/Logística) — CRUD + ativar/
// inativar. Autocontido: não depende do TEAM_CONFIGS de log-core.js.
// --------------------------------------------------------------------------
const ADMGESTAO_TEAM_CONFIGS = {
    driver: {
        role: 'driver', label: 'Motorista', stateKey: 'allDrivers', containerId: 'admGestaoDriversList',
        searchInputId: 'searchAdmGestaoDriversInput', pinBadgeClass: 'bg-blue-50 text-blue-700',
        nomePlaceholder: 'Ex: João da Silva', cpfObrigatorio: true, cpfLabel: 'CPF *'
    },
    representative: {
        role: 'representative', label: 'Representante', stateKey: 'allReps', containerId: 'admGestaoRepsList',
        searchInputId: 'searchAdmGestaoRepsInput', pinBadgeClass: 'bg-emerald-50 text-emerald-700',
        nomePlaceholder: 'Ex: Carlos Representações', cpfObrigatorio: true, cpfLabel: 'CPF / CNPJ *'
    },
    logistics: {
        role: 'logistics', label: 'Membro de Logística', stateKey: 'allLogistics', containerId: 'admGestaoLogisticsList',
        searchInputId: 'searchAdmGestaoLogisticsInput', pinBadgeClass: 'bg-blue-50 text-blue-700',
        nomePlaceholder: 'Ex: Maria Souza', cpfObrigatorio: false, cpfLabel: 'CPF'
    }
};

function admGestaoFormularioMembroHtml(cfg, prefill) {
    prefill = prefill || {};
    const esc = (v) => (v || '').toString().replace(/"/g, '&quot;');
    return `
        <div class="space-y-3">
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Nome Completo *</label>
                <input type="text" id="modalAdmGestaoFullName" value="${esc(prefill.fullName)}" placeholder="${cfg.nomePlaceholder}" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#152e50] outline-none">
            </div>
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Nome de Usuário (login) *</label>
                <input type="text" id="modalAdmGestaoName" value="${esc(prefill.name)}" placeholder="Ex: joao.silva" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#152e50] outline-none">
                <p class="text-[10px] text-slate-400 mt-1">Não pode repetir dentro da empresa.</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">${cfg.cpfLabel}</label>
                    <input type="text" id="modalAdmGestaoCpf" value="${esc(prefill.cpf)}" placeholder="000.000.000-00" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                </div>
                <div>
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Telefone / WhatsApp</label>
                    <input type="text" id="modalAdmGestaoPhone" value="${esc(prefill.phone)}" placeholder="(73) 99999-9999" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                </div>
            </div>
            ${prefill.isEdit ? '' : `
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Senha / PIN</label>
                <input type="text" id="modalAdmGestaoPin" placeholder="Ex: 1234 (Gerado se vazio)" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
            </div>`}
        </div>
    `;
}

window.abrirModalAdmGestaoNovoMembro = function(tipo) {
    const cfg = ADMGESTAO_TEAM_CONFIGS[tipo];
    if (!cfg) return;

    window.abrirModalPersistente(`Cadastrar ${cfg.label}`, admGestaoFormularioMembroHtml(cfg), async () => {
        const fullName = document.getElementById('modalAdmGestaoFullName')?.value.trim();
        const name = document.getElementById('modalAdmGestaoName')?.value.trim();
        const cpf = document.getElementById('modalAdmGestaoCpf')?.value.trim();
        const phone = document.getElementById('modalAdmGestaoPhone')?.value.trim();
        const pin = document.getElementById('modalAdmGestaoPin')?.value.trim() || Math.floor(1000 + Math.random() * 9000).toString();

        if (!fullName || !name) {
            alert("Preencha o Nome Completo e o Nome de Usuário.");
            return false;
        }
        if (cfg.cpfObrigatorio && !cpf) {
            alert(`Preencha o ${cfg.cpfLabel.replace(' *', '')}.`);
            return false;
        }

        const { error } = await window.db.rpc('create_team_member', {
            p_role: cfg.role, p_name: name, p_pin: pin, p_cpf: cpf || null, p_phone: phone || null, p_full_name: fullName
        });
        if (error) {
            if (window.showToast) window.showToast(`Erro ao salvar ${cfg.label.toLowerCase()}: ` + error.message, "error");
            return false;
        }

        renderAdmGestaoMembros(tipo);
        return true;
    });
};

window.abrirModalAdmGestaoEditarMembro = function(tipo, id) {
    const cfg = ADMGESTAO_TEAM_CONFIGS[tipo];
    if (!cfg) return;
    const membro = (window[cfg.stateKey] || []).find(m => m.id === id);
    if (!membro) return;

    window.abrirModalPersistente(`Editar ${cfg.label}`, admGestaoFormularioMembroHtml(cfg, { ...membro, isEdit: true }), async () => {
        const fullName = document.getElementById('modalAdmGestaoFullName')?.value.trim();
        const name = document.getElementById('modalAdmGestaoName')?.value.trim();
        const cpf = document.getElementById('modalAdmGestaoCpf')?.value.trim();
        const phone = document.getElementById('modalAdmGestaoPhone')?.value.trim();

        if (!fullName || !name) {
            alert("Preencha o Nome Completo e o Nome de Usuário.");
            return false;
        }

        const { error } = await window.db.rpc('update_team_member', {
            p_role: cfg.role, p_id: id, p_name: name, p_full_name: fullName, p_cpf: cpf || null, p_phone: phone || null
        });
        if (error) {
            if (window.showToast) window.showToast("Erro ao editar: " + error.message, "error");
            return false;
        }

        renderAdmGestaoMembros(tipo);
        return true;
    });
};

window.alternarAtivoAdmGestaoMembro = async function(tipo, id, novoAtivo) {
    const { error } = await window.db.rpc('set_member_active', { p_role: tipo, p_id: id, p_active: novoAtivo });
    if (error) {
        if (window.showToast) window.showToast("Erro ao alterar acesso: " + error.message, "error");
        return;
    }
    if (window.showToast) window.showToast(novoAtivo ? "Acesso reativado." : "Acesso desativado.", "success");
    renderAdmGestaoMembros(tipo);
};

window.removerAdmGestaoMembro = function(tipo, id) {
    const cfg = ADMGESTAO_TEAM_CONFIGS[tipo];
    if (!cfg) return;
    const membro = (window[cfg.stateKey] || []).find(m => m.id === id);
    if (!membro) return;

    window.pedirConfirmacao(`Excluir ${cfg.label}`, `Excluir "${membro.fullName || membro.name}"? Essa ação não pode ser desfeita.`, async () => {
        const { error } = await window.db.rpc('delete_team_member', { p_role: tipo, p_id: id });
        if (error) {
            if (window.showToast) window.showToast("Erro ao excluir: " + error.message, "error");
            return;
        }
        if (window.showToast) window.showToast(`${cfg.label} excluído.`, "success");
        renderAdmGestaoMembros(tipo);
    });
};

window.abrirModalAdmGestaoEditarSenha = function(tipo, id, nome) {
    const html = `
        <div class="space-y-3">
            <p class="text-xs font-bold text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <i class="fa-solid fa-user mr-1.5 text-[#152e50]"></i> ${nome}
            </p>
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Nova Senha *</label>
                <input type="text" id="modalAdmGestaoNovaSenha" placeholder="Ex: 1234" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
            </div>
        </div>
    `;
    window.abrirModalPersistente(`Gerenciar Credenciais — ${nome}`, html, async () => {
        const novaSenha = document.getElementById('modalAdmGestaoNovaSenha')?.value.trim();
        if (!novaSenha) {
            alert("Informe a nova senha.");
            return false;
        }
        const { error } = await window.db.rpc('set_member_pin', { p_role: tipo, p_id: id, p_new_pin: novaSenha });
        if (error) {
            if (window.showToast) window.showToast("Erro ao trocar senha: " + error.message, "error");
            return false;
        }
        if (window.showToast) window.showToast("Senha atualizada.", "success");
        return true;
    });
};

window.renderAdmGestaoMembros = function(tipo) {
    const cfg = ADMGESTAO_TEAM_CONFIGS[tipo];
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
        const nomeExibicao = (m.fullName || m.name).replace(/'/g, "\\'");
        const dataCadastro = m.createdAt ? new Date(m.createdAt).toLocaleDateString('pt-BR') : '-';
        const ativo = m.active !== false;
        return `
        <div class="bg-white p-5 rounded-2xl border ${ativo ? 'border-slate-200' : 'border-rose-200 bg-rose-50/30'} shadow-sm flex flex-col justify-between space-y-3">
            <div>
                <div class="flex items-center justify-between gap-2">
                    <h4 class="font-bold text-slate-800 text-sm truncate">${m.fullName || m.name}</h4>
                    <div class="flex items-center gap-1.5 shrink-0">
                        ${m.code ? `<span class="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md font-mono">${m.code}</span>` : ''}
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-md ${ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-100 text-rose-700'}">${ativo ? 'Ativo' : 'Inativo'}</span>
                    </div>
                </div>
                <p class="text-xs text-slate-500 mt-1.5"><i class="fa-solid fa-user mr-1.5 text-[#152e50]"></i> Usuário: ${m.name}</p>
                <p class="text-xs text-slate-500 mt-1"><i class="fa-solid fa-id-card mr-1.5 text-[#152e50]"></i> CPF: ${m.cpf || 'Não informado'}</p>
                <p class="text-xs text-slate-500 mt-1"><i class="fa-solid fa-phone mr-1.5 text-[#152e50]"></i> Tel: ${m.phone || 'Não informado'}</p>
                <p class="text-[11px] text-slate-400 mt-1.5"><i class="fa-solid fa-calendar-plus mr-1.5"></i> Cadastrado em: ${dataCadastro}</p>
            </div>
            <div class="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100 flex-wrap">
                <button onclick="abrirModalAdmGestaoEditarMembro('${tipo}', '${m.id}')" class="text-slate-600 hover:bg-slate-50 p-2 rounded-lg text-xs font-bold transition-all cursor-pointer" title="Editar">
                    <i class="fa-solid fa-pen"></i> Editar
                </button>
                <button onclick="abrirModalAdmGestaoEditarSenha('${tipo}', '${m.id}', '${nomeExibicao}')" class="text-[#152e50] hover:bg-[#152e50]/5 p-2 rounded-lg text-xs font-bold transition-all cursor-pointer" title="Editar Senha">
                    <i class="fa-solid fa-key"></i> Senha
                </button>
                <button onclick="alternarAtivoAdmGestaoMembro('${tipo}', '${m.id}', ${!ativo})" class="${ativo ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'} p-2 rounded-lg text-xs font-bold transition-all cursor-pointer" title="${ativo ? 'Inativar' : 'Ativar'}">
                    <i class="fa-solid ${ativo ? 'fa-toggle-off' : 'fa-toggle-on'}"></i> ${ativo ? 'Inativar' : 'Ativar'}
                </button>
                <button onclick="removerAdmGestaoMembro('${tipo}', '${m.id}')" class="text-rose-500 hover:bg-rose-50 p-2 rounded-lg text-xs font-bold transition-all cursor-pointer" title="Excluir">
                    <i class="fa-solid fa-trash-can"></i> Excluir
                </button>
            </div>
        </div>
        `;
    }).join('');
};

// --------------------------------------------------------------------------
// Veículos — mesmo formulário/RPCs de create_vehicle/update_vehicle/delete_vehicle
// já usados pela Logística, reescrito autocontido aqui.
// --------------------------------------------------------------------------
function admGestaoFormularioVeiculoHtml(prefill) {
    prefill = prefill || {};
    const esc = (v) => (v || '').toString().replace(/"/g, '&quot;');
    return `
        <div class="space-y-3">
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Motorista Vinculado</label>
                <select id="modalAdmGestaoVecDriver" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                    <option value="">Nenhum</option>
                    ${(window.allDrivers || []).map(d => `<option value="${d.id}" ${prefill.driverId === d.id ? 'selected' : ''}>${d.fullName || d.name}</option>`).join('')}
                </select>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Placa *</label>
                    <input type="text" id="modalAdmGestaoVecPlaca" value="${esc(prefill.placa)}" placeholder="ABC-1D23" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-mono">
                </div>
                <div>
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Qtd. Eixos</label>
                    <input type="number" id="modalAdmGestaoVecEixos" min="2" max="10" value="${prefill.eixos || 3}" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                </div>
            </div>
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Tipo de Veículo</label>
                <select id="modalAdmGestaoVecTipo" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                    ${['Truck', 'Carreta Simples', 'Bitrem', 'Rodotrem', 'Dolly'].map(t => `<option value="${t}" ${prefill.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Carroceria</label>
                    <select id="modalAdmGestaoVecCarroceria" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        ${['Aberta', 'Baú', 'Sider', 'Prancha'].map(c => `<option value="${c}" ${prefill.carroceria === c ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Tipo de Grade</label>
                    <select id="modalAdmGestaoVecGrade" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        ${['Baixa', 'Alta', 'Graneleiro', 'Sem Grade'].map(g => `<option value="${g}" ${prefill.grade === g ? 'selected' : ''}>${g}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Reboque / Dolly Detalhes</label>
                <input type="text" id="modalAdmGestaoVecReboque" value="${esc(prefill.reboque)}" placeholder="Ex: 2 reboques - 12.5m cada" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            </div>
        </div>
    `;
}

window.abrirModalAdmGestaoNovoVeiculo = function() {
    window.abrirModalPersistente("Cadastrar Veículo", admGestaoFormularioVeiculoHtml(), async () => {
        const driverId = document.getElementById('modalAdmGestaoVecDriver')?.value || null;
        const placa = document.getElementById('modalAdmGestaoVecPlaca')?.value.trim().toUpperCase();
        const tipo = document.getElementById('modalAdmGestaoVecTipo')?.value;
        const carroceria = document.getElementById('modalAdmGestaoVecCarroceria')?.value;
        const grade = document.getElementById('modalAdmGestaoVecGrade')?.value;
        const eixos = parseInt(document.getElementById('modalAdmGestaoVecEixos')?.value, 10) || null;
        const reboque = document.getElementById('modalAdmGestaoVecReboque')?.value.trim();

        if (!placa) {
            alert("Informe a placa do veículo.");
            return false;
        }

        const { error } = await window.db.rpc('create_vehicle', {
            p_placa: placa, p_tipo: tipo, p_carroceria: carroceria, p_driver_id: driverId,
            p_grade: grade, p_eixos: eixos, p_reboque: reboque
        });
        if (error) {
            if (window.showToast) window.showToast("Erro ao salvar veículo: " + error.message, "error");
            return false;
        }

        renderAdmGestaoVehiclesList();
        return true;
    });
};

window.abrirModalAdmGestaoEditarVeiculo = function(id) {
    const veiculo = (window.allVehicles || []).find(v => v.id === id);
    if (!veiculo) return;

    window.abrirModalPersistente("Editar Veículo", admGestaoFormularioVeiculoHtml(veiculo), async () => {
        const driverId = document.getElementById('modalAdmGestaoVecDriver')?.value || null;
        const placa = document.getElementById('modalAdmGestaoVecPlaca')?.value.trim().toUpperCase();
        const tipo = document.getElementById('modalAdmGestaoVecTipo')?.value;
        const carroceria = document.getElementById('modalAdmGestaoVecCarroceria')?.value;
        const grade = document.getElementById('modalAdmGestaoVecGrade')?.value;
        const eixos = parseInt(document.getElementById('modalAdmGestaoVecEixos')?.value, 10) || null;
        const reboque = document.getElementById('modalAdmGestaoVecReboque')?.value.trim();

        if (!placa) {
            alert("Informe a placa do veículo.");
            return false;
        }

        const { error } = await window.db.rpc('update_vehicle', {
            p_id: id, p_placa: placa, p_tipo: tipo, p_carroceria: carroceria, p_driver_id: driverId,
            p_grade: grade, p_eixos: eixos, p_reboque: reboque
        });
        if (error) {
            if (window.showToast) window.showToast("Erro ao editar veículo: " + error.message, "error");
            return false;
        }

        renderAdmGestaoVehiclesList();
        return true;
    });
};

window.removerAdmGestaoVeiculo = function(id) {
    window.pedirConfirmacao("Remover Veículo", "Tem certeza que deseja remover este veículo?", async () => {
        const { error } = await window.db.rpc('delete_vehicle', { p_id: id });
        if (error) {
            if (window.showToast) window.showToast("Erro ao remover veículo: " + error.message, "error");
            return;
        }
        if (window.showToast) window.showToast("Veículo removido.", "success");
        renderAdmGestaoVehiclesList();
    });
};

window.renderAdmGestaoVehiclesList = function() {
    const container = document.getElementById('admGestaoVehiclesList');
    if (!container) return;
    const query = (document.getElementById('searchAdmGestaoVehiclesInput')?.value || "").toLowerCase().trim();

    const driversById = {};
    (window.allDrivers || []).forEach(d => { driversById[d.id] = d.fullName || d.name; });

    const filtrados = (window.allVehicles || []).filter(v =>
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
                <button onclick="abrirModalAdmGestaoEditarVeiculo('${v.id}')" class="text-slate-600 hover:bg-slate-50 p-2 rounded-lg text-xs font-bold transition-all cursor-pointer" title="Editar">
                    <i class="fa-solid fa-pen"></i> Editar
                </button>
                <button onclick="removerAdmGestaoVeiculo('${v.id}')" class="text-rose-500 hover:bg-rose-50 p-2 rounded-lg text-xs font-bold transition-all cursor-pointer" title="Excluir">
                    <i class="fa-solid fa-trash-can"></i> Excluir
                </button>
            </div>
        </div>
        `;
    }).join('');
};

// --------------------------------------------------------------------------
// Licenças — mesma conta de window.calcularUsoLicencas (admin-tenants.js),
// só que numa tela cheia pro Admin em vez do widget compacto no dashboard.
// --------------------------------------------------------------------------
function renderAdmGestaoLicencas() {
    const planoElem = document.getElementById('admGestaoLicencasPlano');
    const usoElem = document.getElementById('admGestaoLicencasUso');
    if (!usoElem || !window.currentCompanyId) return;

    const planoLabels = { basico: 'Básico', profissional: 'Profissional', corporativo: 'Enterprise', personalizado: 'Personalizado' };
    if (planoElem) planoElem.innerText = `Plano: ${planoLabels[window.companyPlan] || 'Contratado'}`;

    const uso = window.calcularUsoLicencas ? window.calcularUsoLicencas(window.currentCompanyId) : {};
    const limits = window.companyPlanLimits || {};

    usoElem.innerHTML = Object.entries(ADMGESTAO_LIMITE_LABELS).map(([key, label]) => {
        const usado = uso[key] || 0;
        const limite = limits[key] ?? 0;
        const restante = limite - usado;
        const esgotado = limite > 0 && restante <= 0;
        const pertoDoLimite = limite > 0 && !esgotado && restante <= Math.max(1, Math.ceil(limite * 0.1));
        const pct = limite > 0 ? Math.min(100, Math.round((usado / limite) * 100)) : 0;
        const corBarra = esgotado ? 'bg-rose-500' : pertoDoLimite ? 'bg-amber-500' : 'bg-[#152e50]';
        return `
            <div class="space-y-1.5">
                <div class="flex justify-between text-xs font-semibold">
                    <span class="text-slate-600">${label}</span>
                    <span class="${esgotado ? 'text-rose-600' : pertoDoLimite ? 'text-amber-600' : 'text-slate-600'} font-bold">${usado}/${limite}${esgotado ? ' · esgotado' : ''}</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2">
                    <div class="${corBarra} h-2 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

// --------------------------------------------------------------------------
// Permissões — só se aplica à Logística (único papel com tela de múltiplas
// abas operacionais pra restringir). RPC set_logistics_permissions.
// --------------------------------------------------------------------------
const ADMGESTAO_MODULOS_LOGISTICA = {
    importador: 'Importador de Cargas', rotas: 'Gestão de Rotas', fretes: 'Gestão de Fretes',
    frota: 'Frota e Funcionários', rotasProdutos: 'Rotas & Produtos'
};

function renderAdmGestaoPermissoes() {
    const container = document.getElementById('admGestaoPermissoesList');
    if (!container) return;

    const membros = window.allLogistics || [];
    if (membros.length === 0) {
        container.innerHTML = `<div class="p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">Nenhuma pessoa da Logística cadastrada ainda.</div>`;
        return;
    }

    container.innerHTML = membros.map(m => {
        const perms = m.permissions || {};
        const checkboxes = Object.entries(ADMGESTAO_MODULOS_LOGISTICA).map(([key, label]) => `
            <label class="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                <input type="checkbox" data-perm-key="${key}" ${perms[key] !== false ? 'checked' : ''} class="w-4 h-4 accent-[#152e50]">
                ${label}
            </label>
        `).join('');
        return `
        <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3" data-admgestao-perm-card="${m.id}">
            <h4 class="font-bold text-slate-800 text-sm">${m.fullName || m.name}</h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">${checkboxes}</div>
            <div class="flex justify-end pt-2 border-t border-slate-100">
                <button onclick="salvarAdmGestaoPermissoes('${m.id}')" class="px-3 py-2 bg-[#152e50] hover:bg-[#0f223d] text-[#fac043] rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer">
                    <i class="fa-solid fa-floppy-disk mr-1.5"></i> Salvar Acessos
                </button>
            </div>
        </div>
        `;
    }).join('');
}

window.salvarAdmGestaoPermissoes = async function(id) {
    const card = document.querySelector(`[data-admgestao-perm-card="${id}"]`);
    if (!card) return;

    const permissions = {};
    card.querySelectorAll('input[data-perm-key]').forEach(input => {
        permissions[input.dataset.permKey] = input.checked;
    });

    const { error } = await window.db.rpc('set_logistics_permissions', { p_id: id, p_permissions: permissions });
    if (error) {
        if (window.showToast) window.showToast("Erro ao salvar acessos: " + error.message, "error");
        return;
    }
    if (window.showToast) window.showToast("Acessos atualizados.", "success");
};

// --------------------------------------------------------------------------
// Métricas — só contagem de cadastro/licença, nada de rotas/cidades/fretes.
// --------------------------------------------------------------------------
function renderAdmGestaoMetricas() {
    const container = document.getElementById('admGestaoMetricasCards');
    if (!container) return;

    const drivers = window.allDrivers || [];
    const reps = window.allReps || [];
    const logistics = window.allLogistics || [];
    const vehicles = window.allVehicles || [];

    const cards = [
        { label: 'Motoristas', total: drivers.length, ativos: drivers.filter(d => d.active !== false).length, icon: 'fa-truck' },
        { label: 'Representantes', total: reps.length, ativos: reps.filter(r => r.active !== false).length, icon: 'fa-handshake' },
        { label: 'Logística', total: logistics.length, ativos: logistics.filter(l => l.active !== false).length, icon: 'fa-users-gear' },
        { label: 'Veículos', total: vehicles.length, ativos: null, icon: 'fa-truck-front' }
    ];

    container.innerHTML = cards.map(c => `
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p class="text-[10px] font-bold uppercase text-slate-400"><i class="fa-solid ${c.icon} mr-1"></i> ${c.label}</p>
            <p class="text-2xl font-extrabold text-slate-800 mt-1">${c.total}</p>
            ${c.ativos !== null ? `<p class="text-[11px] text-slate-500 mt-0.5">${c.ativos} ativo(s)</p>` : ''}
        </div>
    `).join('');
}
