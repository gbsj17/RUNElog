// ==========================================================
// RUNEmaster: liberação de funções e planos por empresa
// ==========================================================

const FEATURES_DISPONIVEIS = [
    { key: 'fretes', label: 'Gestão de Fretes Terceirizados' },
    { key: 'rotasProdutos', label: 'Gestão de Rotas e Produtos' }
];

const PLANOS_DISPONIVEIS = ['basico', 'profissional', 'corporativo', 'personalizado'];
const PLANOS_LABEL = { basico: 'Básico', profissional: 'Profissional', corporativo: 'Corporativo', personalizado: 'Personalizado' };

function formatarMoeda(valor) {
    const numero = Number(valor) || 0;
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

window.renderPlanosFuncoesList = function() {
    const container = document.getElementById('masterPlanosList');
    if (!container) return;

    const companies = window.allCompanies || [];
    if (companies.length === 0) {
        container.innerHTML = `<div class="p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">Nenhuma empresa cadastrada ainda.</div>`;
        return;
    }

    container.innerHTML = companies.map(c => {
        const features = c.features || {};
        const checkboxes = FEATURES_DISPONIVEIS.map(f => `
            <label class="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" ${features[f.key] !== false ? 'checked' : ''}
                    onchange="atualizarFeatureEmpresa('${c.id}', '${f.key}', this.checked)"
                    class="rounded border-slate-300 text-[#152e50] focus:ring-[#152e50] w-4 h-4">
                ${f.label}
            </label>
        `).join('');

        const planOptions = PLANOS_DISPONIVEIS.map(p =>
            `<option value="${p}" ${c.plan === p ? 'selected' : ''}>${PLANOS_LABEL[p]}</option>`
        ).join('');

        const modulosInclusos = FEATURES_DISPONIVEIS.filter(f => features[f.key] !== false).map(f => f.label);
        const cicloLabel = c.billingCycle === 'anual' ? '/ ano' : '/ mês';

        return `
            <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div class="flex items-center justify-between flex-wrap gap-2">
                    <h4 class="font-bold text-slate-800 text-sm">${c.name}</h4>
                    <select onchange="atualizarPlanoEmpresa('${c.id}', this.value)" class="text-xs font-bold border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
                        ${planOptions}
                    </select>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    ${checkboxes}
                </div>

                <div class="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div>
                        <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Valor (R$)</label>
                        <input type="number" step="0.01" value="${c.planValue ?? ''}"
                            onchange="atualizarAssinaturaEmpresa('${c.id}', 'planValue', parseFloat(this.value) || 0)"
                            class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Ciclo</label>
                        <select onchange="atualizarAssinaturaEmpresa('${c.id}', 'billingCycle', this.value)" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs bg-white">
                            <option value="mensal" ${c.billingCycle !== 'anual' ? 'selected' : ''}>Mensal</option>
                            <option value="anual" ${c.billingCycle === 'anual' ? 'selected' : ''}>Anual</option>
                        </select>
                    </div>
                </div>

                <div class="bg-[#152e50] rounded-xl p-4 text-white">
                    <p class="text-[10px] uppercase tracking-wider text-[#fac043] font-bold">Resumo da Assinatura</p>
                    <p class="text-sm font-extrabold mt-1">${PLANOS_LABEL[c.plan] || 'Básico'}</p>
                    <p class="text-[11px] text-slate-300 mt-1">${modulosInclusos.length > 0 ? modulosInclusos.join(' · ') : 'Sem módulos extras inclusos'}</p>
                    <p class="text-xl font-extrabold mt-2 text-[#fac043]">${formatarMoeda(c.planValue)} <span class="text-xs font-semibold text-slate-300">${cicloLabel}</span></p>
                </div>
            </div>
        `;
    }).join('');
};

window.atualizarFeatureEmpresa = async function(companyId, featureKey, valor) {
    const company = (window.allCompanies || []).find(c => c.id === companyId);
    if (!company) return;

    const features = { ...(company.features || {}), [featureKey]: valor };
    const { error } = await window.db.from('companies').update({ features }).eq('id', companyId);

    if (error) {
        if (window.showToast) window.showToast("Erro ao atualizar função: " + error.message, "error");
        return;
    }
    if (window.showToast) window.showToast("Função atualizada.", "success");
};

window.atualizarPlanoEmpresa = async function(companyId, novoPlano) {
    const { error } = await window.db.from('companies').update({ plan: novoPlano }).eq('id', companyId);
    if (error) {
        if (window.showToast) window.showToast("Erro ao atualizar plano: " + error.message, "error");
        return;
    }
    if (window.showToast) window.showToast("Plano atualizado.", "success");
};

window.atualizarAssinaturaEmpresa = async function(companyId, campo, valor) {
    const { error } = await window.db.from('companies').update({ [campo]: valor }).eq('id', companyId);
    if (error) {
        if (window.showToast) window.showToast("Erro ao atualizar assinatura: " + error.message, "error");
        return;
    }
    if (window.showToast) window.showToast("Assinatura atualizada.", "success");
};
