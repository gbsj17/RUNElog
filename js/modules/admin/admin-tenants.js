// ==========================================================
// RUNEmaster: cadastro e gestão de empresas clientes (tenants)
// ==========================================================

// Catálogo de planos: sugestão de valor/módulos/limites de licença ao
// escolher no cadastro. Tudo continua editável depois (inclusive pro
// "Personalizado") — não é preço nem limite fixo, é só o ponto de partida.
// As chaves de "limits" batem com as usadas nas RPCs (create_team_member/
// create_vehicle) pra checar licença disponível.
const PLANOS_CATALOGO = {
    basico: {
        label: 'Básico', valorSugerido: 149.90, features: { fretes: false, rotasProdutos: false },
        limits: { admins: 1, logistics: 2, drivers: 15, representatives: 5, vehicles: 20 }
    },
    profissional: {
        label: 'Profissional', valorSugerido: 349.90, features: { fretes: true, rotasProdutos: false },
        limits: { admins: 1, logistics: 5, drivers: 50, representatives: 20, vehicles: 100 }
    },
    corporativo: {
        label: 'Enterprise', valorSugerido: 699.90, features: { fretes: true, rotasProdutos: true },
        limits: { admins: 3, logistics: 15, drivers: 200, representatives: 80, vehicles: 400 }
    },
    personalizado: {
        label: 'Personalizado', valorSugerido: null, features: { fretes: true, rotasProdutos: true },
        limits: { admins: 1, logistics: 2, drivers: 15, representatives: 5, vehicles: 20 }
    }
};

const LIMITE_LABELS = { admins: 'Admins', logistics: 'Logística', drivers: 'Motoristas', representatives: 'Representantes', vehicles: 'Veículos' };

function mascararCNPJ(valor) {
    return (valor || '')
        .replace(/\D/g, '')
        .slice(0, 14)
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
}

function validarCNPJ(cnpjMascarado) {
    const cnpj = (cnpjMascarado || '').replace(/\D/g, '');
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1+$/.test(cnpj)) return false;

    const calcularDigito = (base) => {
        const pesos = base.length === 12
            ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
            : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        let soma = 0;
        for (let i = 0; i < base.length; i++) soma += parseInt(base[i], 10) * pesos[i];
        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    };

    const base12 = cnpj.slice(0, 12);
    const digito1 = calcularDigito(base12);
    const digito2 = calcularDigito(base12 + digito1);
    return cnpj === base12 + String(digito1) + String(digito2);
}

function mascararCEP(valor) {
    return (valor || '').replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
}

function mascararTelefone(valor) {
    const digitos = (valor || '').replace(/\D/g, '').slice(0, 11);
    if (digitos.length <= 10) {
        return digitos.replace(/(\d{2})(\d{4})(\d{0,4})/, (m, ddd, p1, p2) => p2 ? `(${ddd}) ${p1}-${p2}` : (p1 ? `(${ddd}) ${p1}` : ddd));
    }
    return digitos.replace(/(\d{2})(\d{5})(\d{0,4})/, (m, ddd, p1, p2) => p2 ? `(${ddd}) ${p1}-${p2}` : `(${ddd}) ${p1}`);
}

window.aoDigitarCnpjEmpresaForm = function(el) {
    el.value = mascararCNPJ(el.value);
};

window.aoDigitarCepEmpresaForm = function(el) {
    el.value = mascararCEP(el.value);
};

window.aoDigitarTelefoneEmpresaForm = function(el) {
    el.value = mascararTelefone(el.value);
};

window.aoBlurCepEmpresaForm = async function() {
    const cepEl = document.getElementById('modalCompanyCep');
    const cep = (cepEl?.value || '').replace(/\D/g, '');
    if (cep.length !== 8) return;

    try {
        const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await resp.json();
        if (data.erro) {
            if (window.showToast) window.showToast("CEP não encontrado.", "error");
            return;
        }
        document.getElementById('modalCompanyLogradouro').value = data.logradouro || '';
        document.getElementById('modalCompanyBairro').value = data.bairro || '';
        document.getElementById('modalCompanyCidade').value = data.localidade || '';
        document.getElementById('modalCompanyUf').value = data.uf || '';
    } catch (e) {
        if (window.showToast) window.showToast("Não foi possível buscar o CEP agora.", "error");
    }
};

window.aoMudarPlanoEmpresaForm = function() {
    const plano = document.getElementById('modalCompanyPlan')?.value;
    const catalogo = PLANOS_CATALOGO[plano];
    if (!catalogo) return;

    const valorEl = document.getElementById('modalCompanyValue');
    if (valorEl && catalogo.valorSugerido !== null) {
        valorEl.value = catalogo.valorSugerido.toFixed(2);
    }

    // Preenche os limites com o padrão do plano escolhido — o master ainda
    // pode ajustar manualmente antes de salvar, inclusive fora do
    // "Personalizado".
    Object.entries(LIMITE_LABELS).forEach(([key]) => {
        const el = document.getElementById(`modalCompanyLimit_${key}`);
        if (el && catalogo.limits) el.value = catalogo.limits[key];
    });
};

window.abrirModalNovaEmpresa = function() {
    const html = `
        <div class="space-y-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Nome Fantasia *</label>
                    <input type="text" id="modalCompanyName" placeholder="Ex: Fibrasol Logística" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#152e50] outline-none">
                </div>
                <div>
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">CNPJ *</label>
                    <input type="text" id="modalCompanyCnpj" oninput="aoDigitarCnpjEmpresaForm(this)" placeholder="00.000.000/0000-00" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
                </div>
            </div>

            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Razão Social *</label>
                <input type="text" id="modalCompanyRazaoSocial" placeholder="Ex: Fibrasol Transportes Ltda" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Telefone</label>
                    <input type="text" id="modalCompanyPhone" oninput="aoDigitarTelefoneEmpresaForm(this)" placeholder="(00) 00000-0000" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
                </div>
            </div>

            <div class="pt-2 border-t border-slate-100 space-y-3">
                <label class="block text-[11px] font-bold uppercase text-slate-600">Endereço</label>
                <div class="grid grid-cols-2 gap-3">
                    <input type="text" id="modalCompanyCep" oninput="aoDigitarCepEmpresaForm(this)" onblur="aoBlurCepEmpresaForm()" placeholder="CEP: 00000-000" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
                    <input type="text" id="modalCompanyNumero" placeholder="Número" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                </div>
                <input type="text" id="modalCompanyLogradouro" placeholder="Logradouro / Rua" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div class="grid grid-cols-5 gap-3">
                    <input type="text" id="modalCompanyBairro" placeholder="Bairro" class="w-full col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <input type="text" id="modalCompanyCidade" placeholder="Cidade" class="w-full col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <input type="text" id="modalCompanyUf" placeholder="UF" maxlength="2" class="w-full col-span-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase text-center">
                </div>
            </div>

            <div class="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="sm:col-span-1">
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Plano</label>
                    <select id="modalCompanyPlan" onchange="aoMudarPlanoEmpresaForm()" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs bg-white">
                        ${Object.entries(PLANOS_CATALOGO).map(([key, p]) => `<option value="${key}">${p.label}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Valor (R$)</label>
                    <input type="number" id="modalCompanyValue" step="0.01" placeholder="149.90" value="149.90" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                </div>
                <div>
                    <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Ciclo</label>
                    <select id="modalCompanyBillingCycle" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs bg-white">
                        <option value="mensal">Mensal</option>
                        <option value="anual">Anual</option>
                    </select>
                </div>
            </div>

            <div class="pt-2 border-t border-slate-100 space-y-2">
                <label class="block text-[11px] font-bold uppercase text-slate-600">Limites de Licença (editável, inclusive no Personalizado)</label>
                <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    ${Object.entries(LIMITE_LABELS).map(([key, label]) => `
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 mb-0.5">${label}</label>
                            <input type="number" min="0" id="modalCompanyLimit_${key}" value="${PLANOS_CATALOGO.basico.limits[key]}" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    window.abrirModalPersistente("Cadastrar Nova Empresa", html, async () => {
        const name = document.getElementById('modalCompanyName')?.value.trim();
        const razaoSocial = document.getElementById('modalCompanyRazaoSocial')?.value.trim();
        const cnpj = document.getElementById('modalCompanyCnpj')?.value.trim();
        const phone = document.getElementById('modalCompanyPhone')?.value.trim();
        const cep = document.getElementById('modalCompanyCep')?.value.trim();
        const numero = document.getElementById('modalCompanyNumero')?.value.trim();
        const logradouro = document.getElementById('modalCompanyLogradouro')?.value.trim();
        const bairro = document.getElementById('modalCompanyBairro')?.value.trim();
        const cidade = document.getElementById('modalCompanyCidade')?.value.trim();
        const uf = document.getElementById('modalCompanyUf')?.value.trim().toUpperCase();
        const plan = document.getElementById('modalCompanyPlan')?.value || 'basico';
        const planValue = parseFloat(document.getElementById('modalCompanyValue')?.value) || 0;
        const billingCycle = document.getElementById('modalCompanyBillingCycle')?.value || 'mensal';
        const planLimits = {};
        Object.keys(LIMITE_LABELS).forEach(key => {
            planLimits[key] = parseInt(document.getElementById(`modalCompanyLimit_${key}`)?.value, 10) || 0;
        });

        if (!name || !razaoSocial) {
            alert("Preencha o Nome Fantasia e a Razão Social.");
            return false;
        }
        if (!validarCNPJ(cnpj)) {
            alert("CNPJ inválido. Confira os números digitados.");
            return false;
        }

        const { data, error } = await window.db.from('companies').insert({
            name,
            razaoSocial,
            cnpj,
            phone,
            cep,
            numero,
            logradouro,
            bairro,
            cidade,
            uf,
            plan,
            planValue,
            billingCycle,
            planLimits,
            status: 'active',
            features: PLANOS_CATALOGO[plan]?.features || { fretes: true, rotasProdutos: true },
            createdAt: Date.now()
        }).select('id, name').single();

        if (error) {
            if (window.showToast) window.showToast("Erro ao criar empresa: " + error.message, "error");
            return false;
        }

        // Empresa criada, mas sem login algum ainda — encadeia direto pro
        // cadastro do Admin dela, pra não deixar o master ter que caçar
        // esse passo em outro lugar (ou pior, não existir botão nenhum).
        if (data?.id) {
            setTimeout(() => window.abrirModalNovoAdminEmpresa(data.id, data.name), 350);
        }

        return true;
    });
};

// Cria o login do Admin de uma empresa (nova ou já existente). É a única
// forma, hoje, de dar acesso a uma empresa sem entrar direto no Supabase:
// bootstrap_admin() existe no banco mas não tem grant pro app chamar.
window.abrirModalNovoAdminEmpresa = function(companyId, companyName) {
    const html = `
        <div class="space-y-3">
            <p class="text-xs font-bold text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <i class="fa-solid fa-building mr-1.5 text-[#152e50]"></i> Empresa: ${companyName || '—'}
            </p>
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Nome Completo *</label>
                <input type="text" id="modalCompanyAdminFullName" placeholder="Ex: Carlos Mendes Souza" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#152e50] outline-none">
            </div>
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Nome de Usuário (login) *</label>
                <input type="text" id="modalCompanyAdminName" placeholder="Ex: carlos.mendes" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#152e50] outline-none">
                <p class="text-[10px] text-slate-400 mt-1">Não pode repetir dentro da mesma empresa.</p>
            </div>
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Senha *</label>
                <input type="text" id="modalCompanyAdminPin" placeholder="Ex: 1234 (Gerado se vazio)" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
            </div>
        </div>
    `;

    window.abrirModalPersistente(`Criar Admin${companyName ? ' — ' + companyName : ''}`, html, async () => {
        const fullName = document.getElementById('modalCompanyAdminFullName')?.value.trim();
        const name = document.getElementById('modalCompanyAdminName')?.value.trim();
        const pin = document.getElementById('modalCompanyAdminPin')?.value.trim() || Math.floor(1000 + Math.random() * 9000).toString();

        if (!fullName || !name) {
            alert("Preencha o Nome Completo e o Nome de Usuário do Admin.");
            return false;
        }

        const { error } = await window.db.rpc('create_team_member', {
            p_role: 'admin', p_name: name, p_pin: pin, p_cpf: null, p_phone: null, p_company_id: companyId, p_full_name: fullName
        });
        if (error) {
            if (window.showToast) window.showToast("Erro ao criar Admin: " + error.message, "error");
            return false;
        }

        if (window.showToast) window.showToast(`Admin "${fullName}" criado. Usuário: ${name} · Senha: ${pin}`, "success");
        return true;
    });
};

// Conta quanto do plano já foi consumido — usado tanto no card da empresa
// (painel do Master) quanto no widget de licenças do painel do Admin.
window.calcularUsoLicencas = function(companyId) {
    return {
        admins: (window.allAdmins || []).filter(a => a.companyId === companyId).length,
        logistics: (window.allLogistics || []).filter(l => l.companyId === companyId).length,
        drivers: (window.allDrivers || []).filter(d => d.companyId === companyId).length,
        representatives: (window.allReps || []).filter(r => r.companyId === companyId).length,
        vehicles: (window.allVehicles || []).filter(v => v.companyId === companyId).length
    };
};

window.renderCompaniesList = function() {
    const container = document.getElementById('masterCompaniesList');
    if (!container) return;

    const query = (document.getElementById('searchCompaniesInput')?.value || "").toLowerCase().trim();
    const companies = (window.allCompanies || []).filter(c => (c.name || '').toLowerCase().includes(query));

    if (companies.length === 0) {
        container.innerHTML = `<div class="col-span-full p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">Nenhuma empresa encontrada.</div>`;
        return;
    }

    container.innerHTML = companies.map(c => {
        const admins = (window.allAdmins || []).filter(a => a.companyId === c.id);
        const adminsHtml = admins.length === 0
            ? `<p class="text-[11px] text-amber-600 font-bold mt-1.5"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Sem Admin cadastrado</p>`
            : `<p class="text-[11px] text-emerald-700 font-medium mt-1.5"><i class="fa-solid fa-user-shield mr-1.5 text-[#152e50]"></i> Admin: ${admins.map(a => a.fullName || a.name).join(', ')}</p>`;

        const uso = window.calcularUsoLicencas(c.id);
        const limits = c.planLimits || {};
        const totalUsado = Object.keys(LIMITE_LABELS).reduce((soma, k) => soma + (uso[k] || 0), 0);
        const totalLimite = Object.keys(LIMITE_LABELS).reduce((soma, k) => soma + (limits[k] || 0), 0);

        const linhasLicenca = Object.entries(LIMITE_LABELS).map(([key, label]) => {
            const usado = uso[key] || 0;
            const limite = limits[key] ?? 0;
            const restante = limite - usado;
            const esgotado = limite > 0 && restante <= 0;
            const pertoDoLimite = limite > 0 && !esgotado && restante <= Math.max(1, Math.ceil(limite * 0.1));
            const corClasse = esgotado ? 'text-rose-600' : pertoDoLimite ? 'text-amber-600' : 'text-slate-500';
            return `<div class="flex justify-between ${corClasse}"><span>${label}</span><span class="font-bold">${usado}/${limite}${esgotado ? ' · esgotado' : pertoDoLimite ? ' · quase no limite' : ''}</span></div>`;
        }).join('');

        return `
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
            <div>
                <div class="flex items-center justify-between">
                    <h4 class="font-bold text-slate-800 text-sm">${c.name}</h4>
                    <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${c.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}">${c.status}</span>
                </div>
                ${c.razaoSocial ? `<p class="text-xs text-slate-500 mt-1.5"><i class="fa-solid fa-building mr-1.5 text-[#152e50]"></i> ${c.razaoSocial}</p>` : ''}
                ${c.cnpj ? `<p class="text-xs text-slate-500 mt-1"><i class="fa-solid fa-id-card mr-1.5 text-[#152e50]"></i> ${c.cnpj}</p>` : ''}
                ${c.cidade ? `<p class="text-xs text-slate-500 mt-1"><i class="fa-solid fa-location-dot mr-1.5 text-[#152e50]"></i> ${c.cidade}${c.uf ? '/' + c.uf : ''}</p>` : ''}
                <p class="text-xs text-slate-500 mt-1"><i class="fa-solid fa-tag mr-1.5 text-[#152e50]"></i> Plano: ${PLANOS_CATALOGO[c.plan]?.label || c.plan || 'Básico'}</p>
                ${adminsHtml}

                <div class="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1">
                    <div class="flex justify-between text-[11px] font-bold text-slate-700">
                        <span>Licenças usadas</span>
                        <span>${totalUsado}/${totalLimite}</span>
                    </div>
                    <div class="text-[11px] space-y-0.5">${linhasLicenca}</div>
                </div>
            </div>
            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button onclick="abrirModalNovoAdminEmpresa('${c.id}', '${(c.name || '').replace(/'/g, "\\'")}')" class="text-[#152e50] hover:bg-[#152e50]/5 p-2 rounded-lg text-xs font-bold transition-all cursor-pointer">
                    <i class="fa-solid fa-user-plus"></i> Criar Admin
                </button>
                <button onclick="alternarStatusEmpresa('${c.id}')" class="text-slate-600 hover:bg-slate-50 p-2 rounded-lg text-xs font-bold transition-all cursor-pointer">
                    <i class="fa-solid fa-power-off"></i> ${c.status === 'active' ? 'Suspender' : 'Reativar'}
                </button>
            </div>
        </div>
    `;
    }).join('');
};

window.alternarStatusEmpresa = async function(companyId) {
    const company = (window.allCompanies || []).find(c => c.id === companyId);
    if (!company) return;
    const novoStatus = company.status === 'active' ? 'suspended' : 'active';

    const { error } = await window.db.from('companies').update({ status: novoStatus }).eq('id', companyId);
    if (error) {
        if (window.showToast) window.showToast("Erro ao atualizar empresa: " + error.message, "error");
        return;
    }
    if (window.showToast) window.showToast(`Empresa ${novoStatus === 'active' ? 'reativada' : 'suspensa'}.`, "success");
};
