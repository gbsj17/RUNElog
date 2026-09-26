// ==========================================================
// RUNEmaster: núcleo do painel do dono da plataforma
// ==========================================================

window.iniciarPainelMaster = function() {
    if (window.mostrarTelaComAnimacao) window.mostrarTelaComAnimacao('dashboardMaster');
    window.startMasterListeners();
    window.alternarAbaMaster('empresas');
};

window.startMasterListeners = function() {
    if (!window.useFirebase) return;
    // Sem filtro de companyId: o master enxerga todas as empresas.
    if (!window.unsubCompanies) window.unsubCompanies = window.subscribeTable('companies', data => {
        window.allCompanies = data;
        if (window.renderCompaniesList) window.renderCompaniesList();
        if (window.renderPlanosFuncoesList) window.renderPlanosFuncoesList();
        if (window.renderMasterMetrics) window.renderMasterMetrics();
    });
    if (!window.unsubDrivers) window.unsubDrivers = window.subscribeTable('drivers', data => {
        window.allDrivers = data;
        if (window.renderMasterMetrics) window.renderMasterMetrics();
    });
    if (!window.unsubAdmins) window.unsubAdmins = window.subscribeTable('admins', data => {
        window.allAdmins = data;
        if (window.renderCompaniesList) window.renderCompaniesList();
    });
    if (!window.unsubRoutes) window.unsubRoutes = window.subscribeTable('routes', data => {
        window.allRoutes = data;
        if (window.renderMasterMetrics) window.renderMasterMetrics();
    });
};

// Colapsa/expande a sidebar do master, mesmo padrão de alternarModoSidebar() do admin
// (js/modules/log/log-core.js), só que apontando pros ids do RUNEmaster.
window.alternarModoSidebarMaster = function() {
    const sidebar = document.getElementById('mainMasterSidebar');
    const toggleIcon = document.getElementById('sidebarToggleIconMaster');
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

window.alternarAbaMaster = function(tab) {
    window.masterCurrentTab = tab;

    const secoes = ['empresas', 'planos', 'metricas'];
    secoes.forEach(s => {
        const btn = document.getElementById('nav-master-' + s);
        if (btn) {
            btn.className = s === tab
                ? "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white/15 text-[#fac043] transition-all font-bold cursor-pointer"
                : "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition-all cursor-pointer";
        }
    });

    // Bottom nav mobile (mesmo padrão de troca de classe usado no rodapé do Representante)
    const mobileBtns = {
        'empresas': document.getElementById('mobileMasterTabEmpresas'),
        'planos': document.getElementById('mobileMasterTabPlanos'),
        'metricas': document.getElementById('mobileMasterTabMetricas')
    };
    Object.keys(mobileBtns).forEach(key => {
        const btn = mobileBtns[key];
        if (!btn) return;
        btn.className = key === tab
            ? "flex flex-col items-center gap-1.5 text-[11px] font-bold text-[#152e50] bottom-nav-active"
            : "flex flex-col items-center gap-1.5 text-[11px] font-medium text-slate-400";
    });

    const conteudos = {
        'empresas': document.getElementById('contentMasterEmpresas'),
        'planos': document.getElementById('contentMasterPlanos'),
        'metricas': document.getElementById('contentMasterMetricas')
    };
    Object.keys(conteudos).forEach(key => {
        const el = conteudos[key];
        if (!el) return;
        el.classList.toggle('hidden', key !== tab);
    });

    const headerInfo = {
        'empresas': { title: 'Empresas Clientes', subtitle: 'Cadastro e status das empresas na plataforma' },
        'planos': { title: 'Funções & Planos', subtitle: 'Ative módulos e planos por empresa' },
        'metricas': { title: 'Métricas Gerais', subtitle: 'Visão agregada de todos os clientes RUNElog' }
    };
    const info = headerInfo[tab];
    if (info) {
        const titleEl = document.getElementById('masterHeaderTitle');
        const subEl = document.getElementById('masterHeaderSubtitle');
        if (titleEl) titleEl.innerText = info.title;
        if (subEl) subEl.innerText = info.subtitle;
    }

    if (tab === 'empresas' && window.renderCompaniesList) window.renderCompaniesList();
    if (tab === 'planos' && window.renderPlanosFuncoesList) window.renderPlanosFuncoesList();
    if (tab === 'metricas' && window.renderMasterMetrics) window.renderMasterMetrics();
};

window.renderMasterMetrics = function() {
    const companies = window.allCompanies || [];
    const drivers = window.allDrivers || [];
    const routes = window.allRoutes || [];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const totalEmpresas = companies.filter(c => c.status === 'active').length;
    const totalMotoristas = drivers.length;
    const rotasAtivas = routes.filter(r => r.status === 'active').length;
    const rotasConcluidas = routes.filter(r => {
        if (r.status !== 'archived' || !r.finishedAt) return false;
        const d = new Date(r.finishedAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const elEmpresas = document.getElementById('metricTotalEmpresas');
    const elMotoristas = document.getElementById('metricTotalMotoristas');
    const elAtivas = document.getElementById('metricRotasAtivas');
    const elConcluidas = document.getElementById('metricRotasConcluidas');
    if (elEmpresas) elEmpresas.innerText = totalEmpresas;
    if (elMotoristas) elMotoristas.innerText = totalMotoristas;
    if (elAtivas) elAtivas.innerText = rotasAtivas;
    if (elConcluidas) elConcluidas.innerText = rotasConcluidas;

    const byCompanyEl = document.getElementById('masterMetricsByCompany');
    if (!byCompanyEl) return;

    if (companies.length === 0) {
        byCompanyEl.innerHTML = `<div class="p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">Nenhuma empresa cadastrada ainda.</div>`;
        return;
    }

    byCompanyEl.innerHTML = companies.map(c => {
        const driversCount = drivers.filter(d => d.companyId === c.id).length;
        const routesCount = routes.filter(r => r.companyId === c.id).length;
        const activeCount = routes.filter(r => r.companyId === c.id && r.status === 'active').length;
        return `
            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <h4 class="font-bold text-slate-800 text-sm">${c.name}</h4>
                    <p class="text-[11px] text-slate-500 mt-0.5">${driversCount} motorista(s) · ${routesCount} rota(s) · ${activeCount} ativa(s)</p>
                </div>
                <span class="text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${c.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}">${c.status}</span>
            </div>
        `;
    }).join('');
};
