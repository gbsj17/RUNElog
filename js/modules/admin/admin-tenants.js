// ==========================================================
// RUNEmaster: cadastro e gestão de empresas clientes (tenants)
// ==========================================================

// Catálogo de planos: sugestão de valor/módulos ao escolher no cadastro.
// Tudo continua editável depois (inclusive pro "Personalizado") — não é preço fixo.
const PLANOS_CATALOGO = {
    basico:        { label: 'Básico',        valorSugerido: 149.90, features: { fretes: false, rotasProdutos: false } },
    profissional:  { label: 'Profissional',  valorSugerido: 349.90, features: { fretes: true,  rotasProdutos: false } },
    corporativo:   { label: 'Corporativo',   valorSugerido: 699.90, features: { fretes: true,  rotasProdutos: true  } },
    personalizado: { label: 'Personalizado', valorSugerido: null,   features: { fretes: true,  rotasProdutos: true  } }
};

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
                        <option value="basico">Básico</option>
                        <option value="profissional">Profissional</option>
                        <option value="corporativo">Corporativo</option>
                        <option value="personalizado">Personalizado</option>
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
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Nome do Admin *</label>
                <input type="text" id="modalCompanyAdminName" placeholder="Ex: Carlos Mendes" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#152e50] outline-none">
            </div>
            <div>
                <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">PIN / Senha de Acesso</label>
                <input type="text" id="modalCompanyAdminPin" placeholder="Ex: 1234 (Gerado se vazio)" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
            </div>
        </div>
    `;

    window.abrirModalPersistente(`Criar Admin${companyName ? ' — ' + companyName : ''}`, html, async () => {
        const name = document.getElementById('modalCompanyAdminName')?.value.trim();
        const pin = document.getElementById('modalCompanyAdminPin')?.value.trim() || Math.floor(1000 + Math.random() * 9000).toString();

        if (!name) {
            alert("Preencha o nome do Admin.");
            return false;
        }

        const { error } = await window.db.rpc('create_team_member', {
            p_role: 'admin', p_name: name, p_pin: pin, p_cpf: null, p_phone: null, p_company_id: companyId
        });
        if (error) {
            if (window.showToast) window.showToast("Erro ao criar Admin: " + error.message, "error");
            return false;
        }

        if (window.showToast) window.showToast(`Admin "${name}" criado. PIN: ${pin}`, "success");
        return true;
    });
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
            : `<p class="text-[11px] text-emerald-700 font-medium mt-1.5"><i class="fa-solid fa-user-shield mr-1.5 text-[#152e50]"></i> Admin: ${admins.map(a => a.name).join(', ')}</p>`;

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
                <p class="text-xs text-slate-500 mt-1"><i class="fa-solid fa-tag mr-1.5 text-[#152e50]"></i> Plano: ${c.plan || 'básico'}</p>
                ${adminsHtml}
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
