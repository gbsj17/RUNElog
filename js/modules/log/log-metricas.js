// --------------------------------------------------------------------
// MÓDULO: LOG-METRICAS.JS (ANÁLISES, BI E PROJEÇÕES)
// --------------------------------------------------------------------

export function renderAbasMetricasFretes() {
    const container = document.getElementById('subFretesMetricas');
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-4 pt-2">
            <div class="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h3 class="font-extrabold text-slate-800 text-sm">Dashboard de Métricas & Projeções de Fretes</h3>
                    <p class="text-[11px] text-slate-500">Análise de custos, volumes transportados e indicadores de desempenho (BI)</p>
                </div>
                <div class="flex items-center gap-2">
                    <span class="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200">
                        <i class="fa-solid fa-circle-dot mr-1.5 text-[10px]"></i> Sistema Sincronizado
                    </span>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custo Total em Fretes</p>
                    <p class="text-lg font-extrabold text-[#152e50] mt-1 font-mono">R$ 0,00</p>
                    <p class="text-[11px] text-emerald-600 font-medium mt-1"><i class="fa-solid fa-arrow-trend-down mr-1"></i> Baseado no mês atual</p>
                </div>
                <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Média por Rota (KM)</p>
                    <p class="text-lg font-extrabold text-[#152e50] mt-1 font-mono">0.0 KM</p>
                    <p class="text-[11px] text-slate-500 font-medium mt-1">Eficiência de quilometragem</p>
                </div>
                <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cargas Terceirizadas</p>
                    <p class="text-lg font-extrabold text-[#152e50] mt-1 font-mono">0</p>
                    <p class="text-[11px] text-amber-600 font-medium mt-1"><i class="fa-solid fa-truck-ramp-box mr-1"></i> Ordens de Carregamento</p>
                </div>
            </div>

            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
                <h4 class="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-2">
                    <i class="fa-solid fa-chart-line text-[#152e50]"></i> Projeção de Custos e Desempenho Operacional
                </h4>
                <div class="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-slate-400 text-xs font-medium">
                    Os gráficos analíticos e projeções serão preenchidos automaticamente conforme o lançamento de novas rotas e fretes.
                </div>
            </div>
        </div>
    `;
}