// --------------------------------------------------------------------
// MÓDULO: LOG-METRICAS.JS (ANÁLISES, BI E PROJEÇÕES)
// --------------------------------------------------------------------
// Métricas calculadas em cima das cotações já fechadas na tela de Fretes
// (tabela cargas_prontas — ver cargas-prontas-store.js). Não depende de
// nenhuma tabela nova: usa freteTotal/distancia/motorista já capturados
// quando o usuário clica em "Salvar Cotação".

// Mesma lógica de parse de números que log-fretes.js usa (não dá pra
// importar de lá: log-fretes.js já importa este módulo, ciclo).
function paraNumero(valor) {
    if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
    if (!valor) return null;
    const limpo = String(valor)
        .replace(/[^\d,.-]/g, '')
        .replace(/\.(?=\d{3}(?:\D|$))/g, '')
        .replace(',', '.');
    const n = parseFloat(limpo);
    return Number.isFinite(n) ? n : null;
}

function formatarMoeda(n) {
    if (n === null || n === undefined || Number.isNaN(n)) return 'R$ 0,00';
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function noMes(timestamp, mes, ano) {
    if (!timestamp) return false;
    const d = new Date(timestamp);
    return d.getMonth() === mes && d.getFullYear() === ano;
}

function calcularMetricas(cargas) {
    const now = new Date();
    const mesAtual = now.getMonth();
    const anoAtual = now.getFullYear();
    const mesAnteriorDate = new Date(anoAtual, mesAtual - 1, 1);
    const mesAnterior = mesAnteriorDate.getMonth();
    const anoDoMesAnterior = mesAnteriorDate.getFullYear();

    const cargasMesAtual = cargas.filter(c => noMes(c._createdAt, mesAtual, anoAtual));
    const cargasMesAnterior = cargas.filter(c => noMes(c._createdAt, mesAnterior, anoDoMesAnterior));

    const somaFrete = (lista) => lista.reduce((acc, c) => acc + (paraNumero(c.freteTotal) || 0), 0);
    const mediaKm = (lista) => {
        const kms = lista.map(c => paraNumero(c.distancia)).filter(n => n !== null);
        if (kms.length === 0) return 0;
        return kms.reduce((a, b) => a + b, 0) / kms.length;
    };

    const custoTotalMes = somaFrete(cargasMesAtual);
    const custoTotalMesAnterior = somaFrete(cargasMesAnterior);
    const variacaoCusto = custoTotalMesAnterior > 0
        ? ((custoTotalMes - custoTotalMesAnterior) / custoTotalMesAnterior) * 100
        : null;

    return {
        custoTotalMes,
        variacaoCusto,
        mediaKm: mediaKm(cargasMesAtual),
        cargasTerceirizadasMes: cargasMesAtual.length,
        cargasTerceirizadasMesAnterior: cargasMesAnterior.length
    };
}

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
                    <span id="fretesMetricasStatus" class="px-3 py-1 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold border border-amber-200">
                        <i class="fa-solid fa-circle-notch fa-spin mr-1.5 text-[10px]"></i> Carregando...
                    </span>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custo Total em Fretes</p>
                    <p id="metricCustoTotal" class="text-lg font-extrabold text-[#152e50] mt-1 font-mono">R$ 0,00</p>
                    <p id="metricCustoVariacao" class="text-[11px] text-slate-500 font-medium mt-1">Baseado no mês atual</p>
                </div>
                <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Média por Rota (KM)</p>
                    <p id="metricMediaKm" class="text-lg font-extrabold text-[#152e50] mt-1 font-mono">0.0 KM</p>
                    <p class="text-[11px] text-slate-500 font-medium mt-1">Eficiência de quilometragem</p>
                </div>
                <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cargas Terceirizadas</p>
                    <p id="metricCargasTerceirizadas" class="text-lg font-extrabold text-[#152e50] mt-1 font-mono">0</p>
                    <p id="metricCargasVariacao" class="text-[11px] text-amber-600 font-medium mt-1"><i class="fa-solid fa-truck-ramp-box mr-1"></i> Ordens de Carregamento no mês</p>
                </div>
            </div>

            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
                <h4 class="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-2">
                    <i class="fa-solid fa-chart-line text-[#152e50]"></i> Comparativo: Mês Atual x Mês Anterior
                </h4>
                <div id="fretesMetricasComparativo" class="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-slate-400 text-xs font-medium">
                    Carregando comparativo...
                </div>
            </div>
        </div>
    `;

    carregarEExibirMetricas();
}

async function carregarEExibirMetricas() {
    const statusEl = document.getElementById('fretesMetricasStatus');
    let cargas = [];

    try {
        const modulo = await import('./cargas-prontas-store.js');
        const { cargas: lista, erro } = await modulo.carregarCargasProntas();
        if (erro) throw erro;
        cargas = lista;
    } catch (e) {
        console.warn('Não foi possível carregar métricas de fretes:', e);
        if (statusEl) {
            statusEl.className = "px-3 py-1 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold border border-rose-200";
            statusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1.5 text-[10px]"></i> Erro ao carregar`;
        }
        return;
    }

    if (statusEl) {
        statusEl.className = "px-3 py-1 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200";
        statusEl.innerHTML = `<i class="fa-solid fa-circle-dot mr-1.5 text-[10px]"></i> Sistema Sincronizado`;
    }

    const m = calcularMetricas(cargas);

    const custoTotalEl = document.getElementById('metricCustoTotal');
    if (custoTotalEl) custoTotalEl.innerText = formatarMoeda(m.custoTotalMes);

    const custoVariacaoEl = document.getElementById('metricCustoVariacao');
    if (custoVariacaoEl) {
        if (m.variacaoCusto === null) {
            custoVariacaoEl.innerHTML = `Baseado no mês atual`;
            custoVariacaoEl.className = "text-[11px] text-slate-500 font-medium mt-1";
        } else {
            const subiu = m.variacaoCusto >= 0;
            custoVariacaoEl.innerHTML = `<i class="fa-solid ${subiu ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'} mr-1"></i> ${subiu ? '+' : ''}${m.variacaoCusto.toFixed(1)}% vs mês anterior`;
            custoVariacaoEl.className = `text-[11px] font-medium mt-1 ${subiu ? 'text-rose-600' : 'text-emerald-600'}`;
        }
    }

    const mediaKmEl = document.getElementById('metricMediaKm');
    if (mediaKmEl) mediaKmEl.innerText = `${m.mediaKm.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} KM`;

    const cargasTercEl = document.getElementById('metricCargasTerceirizadas');
    if (cargasTercEl) cargasTercEl.innerText = m.cargasTerceirizadasMes;

    const comparativoEl = document.getElementById('fretesMetricasComparativo');
    if (comparativoEl) {
        if (m.cargasTerceirizadasMes === 0 && m.cargasTerceirizadasMesAnterior === 0) {
            comparativoEl.innerHTML = `Nenhuma cotação fechada ainda. O comparativo aparece assim que houver cargas salvas em pelo menos um mês.`;
        } else {
            const maxCargas = Math.max(m.cargasTerceirizadasMes, m.cargasTerceirizadasMesAnterior, 1);
            comparativoEl.className = "space-y-3";
            comparativoEl.innerHTML = `
                <div class="space-y-1">
                    <div class="flex justify-between text-xs font-semibold">
                        <span class="text-[#152e50]">Mês Atual</span>
                        <span class="text-[#152e50] font-bold">${m.cargasTerceirizadasMes} carga(s) · ${formatarMoeda(m.custoTotalMes)}</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-2">
                        <div class="bg-[#152e50] h-2 rounded-full transition-all duration-500" style="width: ${Math.round((m.cargasTerceirizadasMes / maxCargas) * 100)}%"></div>
                    </div>
                </div>
                <div class="space-y-1">
                    <div class="flex justify-between text-xs font-semibold">
                        <span class="text-slate-500">Mês Anterior</span>
                        <span class="text-slate-500 font-bold">${m.cargasTerceirizadasMesAnterior} carga(s)</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-2">
                        <div class="bg-slate-400 h-2 rounded-full transition-all duration-500" style="width: ${Math.round((m.cargasTerceirizadasMesAnterior / maxCargas) * 100)}%"></div>
                    </div>
                </div>
            `;
        }
    }
}
