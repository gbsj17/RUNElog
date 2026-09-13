// ==========================================================
// MÓDULO DE GESTÃO DE FRETES TERCEIRIZADOS (HOMEPAGE + DASHBOARD + FORM)
// ==========================================================

import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { renderAbasMetricasFretes } from "./log-metricas.js";

// ==========================================================
// TODO 1: ESTADO GLOBAL E DADOS DE CARGAS ATIVAS
// ==========================================================
window.fretesState = {
    viewModo: 'lista', // 'lista' ou 'editor'
    cargaSelecionadaId: null,
    termoBuscaAtivas: '',
    cargasAtivas: [
        {
            id: 'CG-8849',
            nome: 'CG-8849 (TERESINA-PI)',
            motorista: 'GILMAR J. ALVES JR',
            cpf: '054.286.645-50',
            placa: 'OES-8H09',
            rota: 'TERESINA-PI',
            coleta: 'JEQUIÉ, BA',
            material: 'TANQUES & CAIXAS',
            peso: '4.703,00 KG',
            distancia: '1.254 KM',
            carroceria: '0,00 M',
            freteTotal: 'R$ 6.900,00',
            adiantamento: 'R$ 4.830,00',
            saldo: 'R$ 2.070,00',
            qtdEntregas: '03',
            cidadesEntrega: ['TERESINA - PI', 'TIMON - MA', 'CAXIAS - MA'],
            status: 'Em Trânsito'
        },
        {
            id: 'CG-8902',
            nome: 'CG-8902 (FORTALEZA-CE)',
            motorista: 'ANTONIO SILVA',
            cpf: '123.456.789-00',
            placa: 'JEQ-2026',
            rota: 'FORTALEZA-CE',
            coleta: 'JEQUIÉ, BA',
            material: 'TANQUES PE',
            peso: '3.200,00 KG',
            distancia: '1.100 KM',
            carroceria: '0,00 M',
            freteTotal: 'R$ 5.800,00',
            adiantamento: 'R$ 4.060,00',
            saldo: 'R$ 1.740,00',
            qtdEntregas: '02',
            cidadesEntrega: ['FORTALEZA - CE', 'CAUCAIA - CE'],
            status: 'Aguardando Embarque'
        }
    ]
};

// =============================================================
// TODO 2: NAVEGAÇÃO DE SUB-ABAS PRINCIPAIS (PÍLULAS SUPERIORES)
// =============================================================
window.mudarSubAbaFretes = function(subAba) {
    const ids = ['subFretesCotacao', 'subFretesMetricas', 'subFretesLancamentos'];
    const tabs = ['tabFreteCotacao', 'tabFreteMetricas', 'tabFreteLancamentos'];

    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    tabs.forEach(tabId => {
        const btn = document.getElementById(tabId);
        if (btn) {
            btn.className = "flex-1 py-2 px-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all text-center cursor-pointer flex items-center justify-center gap-1.5";
        }
    });

    const activeClass = "flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-[#152e50] text-[#fac043] shadow-sm transition-all text-center cursor-pointer flex items-center justify-center gap-1.5";

    if (subAba === 'cotacao') {
        const el = document.getElementById('subFretesCotacao');
        if (el) el.classList.remove('hidden');
        const btn = document.getElementById('tabFreteCotacao');
        if (btn) btn.className = activeClass;
    } else if (subAba === 'metricas') {
        const el = document.getElementById('subFretesMetricas');
        if (el) el.classList.remove('hidden');
        const btn = document.getElementById('tabFreteMetricas');
        if (btn) btn.className = activeClass;
        
        if (typeof renderAbasMetricasFretes === 'function') {
            renderAbasMetricasFretes();
        }
    } else if (subAba === 'lancamentos') {
        const el = document.getElementById('subFretesLancamentos');
        if (el) el.classList.remove('hidden');
        const btn = document.getElementById('tabFreteLancamentos');
        if (btn) btn.className = activeClass;
    }
};

// ==========================================================
// TODO 3: CONTROLE DE NAVEGAÇÃO ENTRE LISTA E EDITOR
// ==========================================================
window.abrirEditorCotacao = function(cargaId = null) {
    window.fretesState.viewModo = 'editor';
    window.fretesState.cargaSelecionadaId = cargaId;
    window.renderPainelFretes();
};

window.voltarParaListaFretes = function() {
    window.fretesState.viewModo = 'lista';
    window.fretesState.cargaSelecionadaId = null;
    window.renderPainelFretes();
};

window.filtrarCargasAtivasNaTela = function(termo) {
    window.fretesState.termoBuscaAtivas = termo.toLowerCase();
    const container = document.getElementById('gridCargasAtivasResumo');
    if (!container) return;
    container.innerHTML = window.renderCardsCargasAtivasHTML();
};

// ==========================================================
// TODO 4: RENDERIZAÇÃO DA LISTA DE CARGAS ATIVAS (HOME)
// ==========================================================
window.renderCardsCargasAtivasHTML = function() {
    const termo = window.fretesState.termoBuscaAtivas;
    const cargas = window.fretesState.cargasAtivas.filter(c => 
        c.id.toLowerCase().includes(termo) ||
        c.motorista.toLowerCase().includes(termo) ||
        c.rota.toLowerCase().includes(termo)
    );

    if (cargas.length === 0) {
        return `
            <div class="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 font-medium text-xs">
                Nenhuma carga ativa encontrada para esta pesquisa.
            </div>
        `;
    }

    return cargas.map(c => `
        <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3">
            <div class="flex justify-between items-start border-b border-slate-100 pb-2">
                <div>
                    <span class="bg-[#152e50] text-[#fac043] text-[10px] font-extrabold px-2 py-0.5 rounded">${c.id}</span>
                    <h4 class="font-extrabold text-[#152e50] text-sm mt-1">${c.rota}</h4>
                </div>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === 'Em Trânsito' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}">
                    ${c.status}
                </span>
            </div>

            <div class="space-y-1 text-xs text-slate-600 font-medium">
                <p class="flex justify-between"><span>Motorista:</span> <strong class="text-slate-800">${c.motorista}</strong></p>
                <p class="flex justify-between"><span>Peso Total:</span> <strong class="text-slate-800">${c.peso}</strong></p>
                <p class="flex justify-between"><span>Frete Combinado:</span> <strong class="text-rose-600 font-extrabold">${c.freteTotal}</strong></p>
            </div>

            <button onclick="abrirEditorCotacao('${c.id}')" class="w-full py-2 bg-slate-100 hover:bg-[#152e50] hover:text-[#fac043] text-[#152e50] font-extrabold rounded-xl transition-all text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200">
                <i class="fa-solid fa-pen-to-square"></i> Editar / Visualizar Cotação
            </button>
        </div>
    `).join('');
};

// ==========================================================
// TODO 5: BARRA DE PÍLULAS DE CARGAS NO MODO EDITOR
// ==========================================================
window.renderPilulasCargasHTML = function() {
    const cargas = window.fretesState.cargasAtivas;
    const atualId = window.fretesState.cargaSelecionadaId;

    let html = `
        <button onclick="voltarParaListaFretes()" class="py-1.5 px-3 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-all flex items-center gap-1 cursor-pointer">
            <i class="fa-solid fa-arrow-left"></i> Voltar
        </button>
        <button onclick="abrirEditorCotacao(null)" class="py-1.5 px-3 rounded-xl text-xs font-bold ${atualId === null ? 'bg-[#152e50] text-[#fac043] shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'} transition-all flex items-center gap-1 cursor-pointer">
            <i class="fa-solid fa-plus text-xs"></i> + Nova Cotação
        </button>
    `;

    cargas.forEach(c => {
        const active = (c.id === atualId);
        html += `
            <button onclick="abrirEditorCotacao('${c.id}')" class="py-1.5 px-3 rounded-xl text-xs font-bold ${active ? 'bg-[#152e50] text-[#fac043] shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'} transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                <i class="fa-solid fa-truck"></i> ${c.nome}
            </button>
        `;
    });

    return html;
};

// ==========================================================
// TODO 6.1 a 6.4: SUB-COMPONENTES DAS COLUNAS DA PLANILHA
// ==========================================================
window.renderFormColuna1HTML = function(carga) {
    return `
        <div class="space-y-4">
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="bg-[#152e50] p-3 text-center border-b-4 border-[#fac043]">
                    <h1 class="italic font-extrabold text-white text-xl tracking-wider uppercase mb-0.5" style="font-family: 'Handel Gothic D', 'Handel Gothic', sans-serif;">FIBRASOL</h1>
                    <h2 class="text-[#fac043] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-calculator text-[#fac043]"></i> Cotação de Frete
                    </h2>
                </div>
                <div class="p-3 space-y-2 font-bold text-slate-700 text-[11px]">
                    <div class="flex justify-between items-center">
                        <span class="uppercase text-slate-500">Motorista:</span>
                        <select id="freteSelectMotorista" class="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-[#152e50] outline-none">
                            <option value="">${carga.motorista || 'GILMAR J. ALVES JR'}</option>
                        </select>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="uppercase text-slate-500">Carga:</span>
                        <span class="text-slate-700 font-mono font-bold">${carga.id}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="uppercase text-slate-500">Rota:</span>
                        <select class="bg-[#152e50] text-[#fac043] font-bold rounded px-2 py-0.5 text-xs outline-none">
                            <option>--► ${carga.rota}</option>
                        </select>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="uppercase text-slate-500">Qtd. Entregas:</span>
                        <span class="text-rose-600 font-extrabold">&gt;&gt; ${carga.qtdEntregas} &lt;&lt;</span>
                    </div>
                    <div class="flex justify-between items-center pt-1 border-t border-slate-100">
                        <span class="text-[#152e50] flex items-center gap-1"><i class="fa-solid fa-location-dot text-rose-500"></i> Coleta:</span>
                        <span class="bg-[#152e50] text-white px-2 py-0.5 rounded text-[10px]">${carga.coleta}</span>
                    </div>
                    <div class="pt-2">
                        <p class="text-[10px] uppercase font-extrabold text-slate-400 mb-1 border-b pb-0.5">Cidades para Entrega:</p>
                        <div class="bg-slate-50 rounded p-2 space-y-1 text-[10px] font-mono text-slate-600 border border-slate-100 text-center">
                            ${(carga.cidadesEntrega || []).map(c => `<p class="border-b border-dashed border-slate-200 pb-0.5">${c}</p>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="bg-[#152e50] p-2 text-center border-b-2 border-[#fac043]">
                    <h3 class="text-[#fac043] font-bold text-xs uppercase flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-box-open"></i> Dados da Carga
                    </h3>
                </div>
                <div class="p-3 space-y-1.5 text-[11px] font-bold text-slate-700">
                    <div class="flex justify-between border-b border-slate-100 pb-1"><span class="text-slate-400">MATERIAL:</span><span class="text-[#152e50]">${carga.material}</span></div>
                    <div class="flex justify-between border-b border-slate-100 pb-1"><span class="text-slate-400">PESO:</span><span>${carga.peso}</span></div>
                    <div class="flex justify-between border-b border-slate-100 pb-1"><span class="text-slate-400">DISTÂNCIA:</span><span>${carga.distancia}</span></div>
                    <div class="flex justify-between border-b border-slate-100 pb-1"><span class="text-slate-400">CARROCERIA:</span><span class="text-rose-600 font-extrabold">${carga.carroceria}</span></div>
                    <div class="bg-[#152e50] text-white p-2 rounded-xl flex justify-between items-center mt-2">
                        <span class="text-[#fac043] uppercase text-[10px]">Frete Total:</span>
                        <span class="text-sm font-extrabold">${carga.freteTotal}</span>
                    </div>
                    <div class="text-[10px] text-slate-500 space-y-0.5 pt-1">
                        <div class="flex justify-between"><span>ADIANTAMENTO (60%):</span><span class="font-bold text-slate-800">${carga.adiantamento}</span></div>
                        <div class="flex justify-between"><span>SALDO (40%):</span><span class="font-bold text-slate-800">${carga.saldo}</span></div>
                    </div>
                </div>
            </div>
        </div>
    `;
};

window.renderFormColuna2HTML = function(carga) {
    return `
        <div class="space-y-4">
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="bg-[#152e50] p-2 text-center border-b-2 border-[#fac043]">
                    <h3 class="text-[#fac043] font-bold text-xs uppercase">Valor Base de Frete 2026</h3>
                </div>
                <div class="p-3 overflow-x-auto text-[10px]">
                    <table class="w-full text-center border-collapse">
                        <thead>
                            <tr class="bg-amber-100 text-[#152e50] font-bold">
                                <th class="p-1 border border-amber-200">KM RODADO</th>
                                <th class="p-1 border border-amber-200">R$ FATURADO</th>
                                <th class="p-1 border border-amber-200">R$</th>
                                <th class="p-1 border border-amber-200">R$</th>
                                <th class="p-1 border border-amber-200">R$</th>
                                <th class="p-1 border border-amber-200 text-rose-600">R$</th>
                            </tr>
                        </thead>
                        <tbody class="font-medium text-slate-700 divide-y divide-slate-100">
                            <tr class="bg-slate-50 font-bold"><td class="p-1.5 text-[#152e50]">${carga.distancia}</td><td>-</td><td>-</td><td>-</td><td>-</td><td class="text-rose-600">-</td></tr>
                            <tr><td class="p-1.5 text-left font-bold text-slate-800">TANQUE PE:</td><td class="text-rose-600 font-bold">R$ -</td><td>R$ -</td><td>R$ -</td><td>R$ -</td><td class="text-rose-600">-</td></tr>
                            <tr><td class="p-1.5 text-left font-bold text-slate-800">CAIXAS:</td><td class="text-rose-600 font-bold">R$ -</td><td>R$ -</td><td>R$ -</td><td>R$ -</td><td class="text-rose-600">R$ -</td></tr>
                            <tr class="bg-[#152e50] text-[#fac043] font-extrabold"><td class="p-1.5 text-left">TOTAL:</td><td>R$ -</td><td>R$ -</td><td>R$ -</td><td>R$ -</td><td>-</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="bg-[#152e50] p-2.5 flex justify-between items-center border-b-4 border-[#fac043]">
                    <h3 class="text-[#fac043] font-bold text-xs uppercase flex items-center gap-1.5">
                        <i class="fa-solid fa-handshake"></i> Negociação de Frete
                    </h3>
                </div>
                <div class="p-3 overflow-x-auto">
                    <table class="w-full text-[10px] text-center border-collapse">
                        <thead>
                            <tr class="bg-slate-100 text-slate-700 font-bold">
                                <th class="p-1.5 border border-slate-200 text-left">KM RODADO</th>
                                <th class="p-1.5 border border-slate-200">KG CARREGADO</th>
                                <th class="p-1.5 border border-slate-200">R$ FATURADO</th>
                                <th class="p-1.5 border border-slate-200">R$ PAGO S/ IMP.</th>
                                <th class="p-1.5 border border-slate-200">PERCENTUAL PAGO</th>
                                <th class="p-1.5 border border-slate-200">R$ / KM RODADO</th>
                            </tr>
                        </thead>
                        <tbody class="text-slate-700 font-medium divide-y divide-slate-100">
                            <tr class="bg-slate-50 font-bold"><td class="p-1.5 text-[#152e50]">${carga.distancia}</td><td>${carga.peso}</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>
                            <tr><td class="p-1.5 text-left font-bold text-[#152e50]">TANQUE PE:</td><td>0,00 KG</td><td class="text-rose-600 font-bold">R$ -</td><td>R$ -</td><td>0,00%</td><td rowspan="2" class="bg-slate-100 text-rose-600 font-extrabold text-sm align-middle">R$ -</td></tr>
                            <tr><td class="p-1.5 text-left font-bold text-[#152e50]">CAIXAS:</td><td>0,00 KG</td><td class="text-rose-600 font-bold">R$ -</td><td>R$ -</td><td>0,00%</td></tr>
                            <tr class="bg-[#152e50] text-[#fac043] font-extrabold"><td class="p-1.5 text-left">TOTAL:</td><td>${carga.peso}</td><td>R$ -</td><td>R$ -</td><td>0,00%</td><td class="text-white text-[9px]">FIBRASOL</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="bg-[#152e50] p-2 text-center border-b-2 border-[#fac043]">
                    <h3 class="text-[#fac043] font-bold text-xs uppercase flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-scale-balanced"></i> Tabela de Fretes - ANTT
                    </h3>
                </div>
                <div class="p-3 space-y-3">
                    <table class="w-full text-center text-[10px] border-collapse font-bold">
                        <thead>
                            <tr class="bg-slate-100 text-slate-700">
                                <th class="p-1.5 border border-slate-200">DISTÂNCIA</th>
                                <th class="p-1.5 border border-slate-200">EIXOS</th>
                                <th class="p-1.5 border border-slate-200">CARRETA</th>
                                <th class="p-1.5 border border-slate-200">C.C.D</th>
                                <th class="p-1.5 border border-slate-200">C.C</th>
                                <th class="p-1.5 border border-slate-200">FRETE</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="text-slate-700">
                                <td class="p-1.5 font-extrabold text-[#152e50]">${carga.distancia}</td>
                                <td class="p-1.5"><select class="bg-rose-500 text-white font-extrabold px-1.5 py-0.5 rounded outline-none"><option>5</option></select></td>
                                <td class="p-1.5"><input type="checkbox" class="w-4 h-4 text-[#152e50] rounded"></td>
                                <td class="p-1.5 text-rose-600">R$ -</td>
                                <td class="p-1.5 text-rose-600">R$ -</td>
                                <td class="p-1.5 text-rose-600 font-extrabold">R$ -</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
};

window.renderFormColuna3HTML = function(carga) {
    return `
        <div class="space-y-4">
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="bg-[#152e50] p-3 text-center border-b-4 border-[#fac043]">
                    <h1 class="italic font-extrabold text-white text-xl tracking-wider uppercase mb-0.5" style="font-family: 'Handel Gothic D', 'Handel Gothic', sans-serif;">FIBRASOL</h1>
                    <h2 class="text-[#fac043] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-file-contract text-[#fac043]"></i> Ordem de Carregamento
                    </h2>
                </div>
                <div class="p-3 space-y-1.5 text-[11px] font-bold text-slate-700">
                    <div class="flex justify-between border-b border-slate-100 pb-1"><span class="text-slate-400">COLETA:</span><span>${carga.coleta}</span></div>
                    <div class="flex justify-between border-b border-slate-100 pb-1"><span class="text-slate-400">DOCA:</span><span>DOCA 02</span></div>
                    <div class="flex justify-between border-b border-slate-100 pb-1"><span class="text-slate-400">CARGA:</span><span>${carga.id}</span></div>
                    <div class="flex justify-between border-b border-slate-100 pb-1"><span class="text-slate-400">ROTA:</span><span class="text-[#152e50]">${carga.rota}</span></div>
                </div>
                <div class="bg-slate-50 border-t border-b border-slate-200 p-2 text-center">
                    <h4 class="text-[#152e50] font-extrabold text-[11px] uppercase flex items-center justify-center gap-1">
                        <i class="fa-solid fa-truck"></i> Condutor & Veículo
                    </h4>
                </div>
                <div class="p-3 space-y-1 text-[11px] font-bold text-slate-700">
                    <div class="flex justify-between"><span class="text-slate-400">CONDUTOR:</span><span class="text-rose-600 font-extrabold">${carga.motorista || '-'}</span></div>
                    <div class="flex justify-between"><span class="text-slate-400">CPF:</span><span class="font-mono">${carga.cpf || '-'}</span></div>
                    <div class="flex justify-between"><span class="text-slate-400">VEÍCULO:</span><span class="font-mono">${carga.placa || '-'}</span></div>
                </div>
                <div class="bg-rose-50 p-3 border-t border-rose-100 space-y-1 text-[10px] font-bold text-rose-900 leading-relaxed">
                    <p class="uppercase font-extrabold text-[#152e50] text-[10px] border-b border-rose-200 pb-0.5 mb-1 flex items-center gap-1">
                        <i class="fa-solid fa-shield-cat text-rose-600"></i> Regras de Acesso
                    </p>
                    <p>👖 VESTIMENTA: CALÇA, BLUSA E SAPATO.</p>
                    <p>🔈 PROIBIDO SOM, E USO BEBIDA ALCOÓLICA.</p>
                    <p>🚬 PROIBIDO FUMAR.</p>
                    <p>📸 PROIBIDO TIRAR FOTOS OU FILMAR.</p>
                </div>
            </div>
        </div>
    `;
};

window.renderFormColuna4HTML = function(carga) {
    return `
        <div class="space-y-4">
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[380px]">
                <div class="bg-[#152e50] p-3 text-center border-b-4 border-[#fac043] shrink-0">
                    <h1 class="italic font-extrabold text-white text-xl tracking-wider uppercase mb-0.5" style="font-family: 'Handel Gothic D', 'Handel Gothic', sans-serif;">FIBRASOL</h1>
                    <div class="text-[#fac043] font-bold text-xs uppercase flex justify-between px-1 mt-1">
                        <span>📦 Descrição do Item</span>
                        <span>Quant.</span>
                    </div>
                </div>
                <div class="p-2 overflow-y-auto flex-1 text-[10px] font-mono space-y-1 text-slate-500">
                    <div class="flex justify-between border-b border-dashed border-slate-200 pb-0.5"><span>• CAIXA D'ÁGUA 1000L</span><span class="text-rose-600 font-bold">12 UN</span></div>
                    <div class="flex justify-between border-b border-dashed border-slate-200 pb-0.5"><span>• TANQUE PE 5000L</span><span class="text-rose-600 font-bold">04 UN</span></div>
                </div>
                <div class="bg-[#152e50] text-[#fac043] font-extrabold text-right p-2 text-xs shrink-0">
                    TOTAL: <span class="text-white">016 UN.</span>
                </div>
            </div>
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-2">
                <div class="bg-[#152e50] p-2 text-center border-b-2 border-[#fac043]">
                    <h4 class="text-[#fac043] font-bold text-[11px] uppercase">Descrição da Carga</h4>
                </div>
                <div class="p-3 text-[9px] text-slate-600 font-mono leading-tight space-y-1 font-bold bg-slate-50 border-t border-slate-100">
                    <p>QUANTIDADE DE ENTREGAS: ${carga.qtdEntregas} | PESO: ${carga.peso} | DISTÂNCIA: ${carga.distancia}</p>
                    <p class="text-[#152e50] border-t border-slate-200 pt-1">• VAMOS PRECISAR DOS SEGUINTES ITENS: UM ROLO DE CORDAS DE 240M, 8 CINTAS OU MAIS E UMA LONA PARA APOIO, SE NECESSÁRIO.</p>
                </div>
            </div>
        </div>
    `;
};

// ===========================================================
// TODO 6.5: FORMULÁRIO PRINCIPAL DA PLANILHA (MONTAGEM GERAL)
// ===========================================================
window.renderFormularioPlanilhaHTML = function() {
    const atualId = window.fretesState.cargaSelecionadaId;
    const carga = window.fretesState.cargasAtivas.find(c => c.id === atualId) || {
        id: 'NOVA',
        motorista: '',
        rota: 'SELECIONAR ROTA',
        coleta: 'JEQUIÉ, BA',
        material: 'TANQUES & CAIXAS',
        peso: '0,00 KG',
        distancia: '0 KM',
        carroceria: '0,00 M',
        freteTotal: '-',
        adiantamento: '-',
        saldo: '-',
        qtdEntregas: '00',
        cpf: '-',
        placa: '-',
        cidadesEntrega: ['-', '-', '-', '-']
    };

    return `
        <div class="space-y-4 w-full">
            <div class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 overflow-x-auto">
                ${window.renderPilulasCargasHTML()}
            </div>
            <div class="flex flex-col lg:flex-row gap-4 items-start w-full">
                <div class="flex lg:flex-col gap-2 shrink-0 bg-[#152e50] p-2 rounded-2xl shadow-sm border border-slate-700">
                    <button onclick="voltarParaListaFretes()" title="Início / Voltar" class="w-10 h-10 rounded-xl bg-white/10 hover:bg-[#fac043] hover:text-[#152e50] text-[#fac043] flex items-center justify-center transition-all cursor-pointer">
                        <i class="fa-solid fa-house text-base"></i>
                    </button>
                    <button title="Modo Edição" class="w-10 h-10 rounded-xl bg-amber-500/20 hover:bg-[#fac043] hover:text-[#152e50] text-[#fac043] flex items-center justify-center transition-all cursor-pointer border border-amber-500/30">
                        <i class="fa-solid fa-pen-to-square text-base"></i>
                    </button>
                    <button title="Calculadora ANTT" class="w-10 h-10 rounded-xl bg-white/10 hover:bg-[#fac043] hover:text-[#152e50] text-slate-300 flex items-center justify-center transition-all cursor-pointer">
                        <i class="fa-solid fa-scale-balanced text-base"></i>
                    </button>
                    <button title="Motorista & Veículo" class="w-10 h-10 rounded-xl bg-white/10 hover:bg-[#fac043] hover:text-[#152e50] text-slate-300 flex items-center justify-center transition-all cursor-pointer">
                        <i class="fa-solid fa-id-card text-base"></i>
                    </button>
                    <button title="Rotas & Coleta" class="w-10 h-10 rounded-xl bg-white/10 hover:bg-[#fac043] hover:text-[#152e50] text-slate-300 flex items-center justify-center transition-all cursor-pointer">
                        <i class="fa-solid fa-map-location-dot text-base"></i>
                    </button>
                    <button title="Salvar Cotação" class="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-all shadow-md cursor-pointer">
                        <i class="fa-solid fa-check text-base"></i>
                    </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[280px_1fr_260px_300px] gap-4 flex-1 w-full text-xs">
                    ${window.renderFormColuna1HTML(carga)}
                    ${window.renderFormColuna2HTML(carga)}
                    ${window.renderFormColuna3HTML(carga)}
                    ${window.renderFormColuna4HTML(carga)}
                </div>
            </div>
        </div>
    `;
};

// ==========================================================
// TODO 7: FUNÇÃO PRINCIPAL DE RENDERIZAÇÃO DO MÓDULO
// ==========================================================
window.renderPainelFretes = function() {
    const container = document.getElementById('logSectionContentFretes');
    if (!container) return;

    if (window.fretesState.viewModo === 'editor') {
        container.innerHTML = window.renderFormularioPlanilhaHTML();
        return;
    }

    container.innerHTML = `
        <div class="space-y-6 w-full">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-gradient-to-br from-[#152e50] to-[#0f223d] p-5 rounded-2xl shadow-md border border-[#0f223d] text-white flex flex-col justify-between space-y-3">
                    <div>
                        <span class="bg-[#fac043] text-[#152e50] text-[10px] font-black px-2 py-0.5 rounded uppercase">Novo Frete</span>
                        <h3 class="text-lg font-extrabold text-[#fac043] mt-2">Iniciar Cotação</h3>
                        <p class="text-xs text-slate-300">Preencha os dados da carga, motorista e calcule o valor negociado.</p>
                    </div>
                    <button onclick="abrirEditorCotacao(null)" class="w-full py-3 bg-[#fac043] hover:bg-amber-400 text-[#152e50] font-extrabold rounded-xl shadow transition-all text-xs uppercase flex items-center justify-center gap-2 cursor-pointer">
                        <i class="fa-solid fa-plus-circle"></i> Criar Nova Cotação
                    </button>
                </div>

                <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between space-y-3">
                    <div>
                        <div class="flex justify-between items-start">
                            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Cotações Ativas</p>
                            <div class="w-9 h-9 rounded-xl bg-amber-50 text-[#152e50] flex items-center justify-center text-base shrink-0">
                                <i class="fa-solid fa-truck-fast"></i>
                            </div>
                        </div>
                        <h3 class="text-2xl font-extrabold text-[#152e50] mt-1">${window.fretesState.cargasAtivas.length} Cargas Em Aberto</h3>
                        <div class="flex items-center gap-3 text-[11px] text-slate-500 font-medium mt-1">
                            <span>Aguardando Embarque: <strong class="text-amber-600 font-bold">1</strong></span>
                            <span>•</span>
                            <span>Em Trânsito: <strong class="text-blue-600 font-bold">1</strong></span>
                        </div>
                    </div>
                    <button onclick="abrirEditorCotacao(window.fretesState.cargasAtivas[0]?.id || null)" class="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-[#152e50] font-bold rounded-xl transition-all text-xs uppercase flex items-center justify-center gap-2 cursor-pointer border border-slate-300">
                        <i class="fa-solid fa-eye text-[#152e50]"></i> Visualizar Cargas
                    </button>
                </div>

                <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between space-y-3">
                    <div>
                        <span class="bg-emerald-100 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">Integração Automática</span>
                        <h3 class="text-base font-bold text-slate-800 mt-2">Transferência de Cargas</h3>
                        <p class="text-xs text-slate-500">Transfere dados da cotação aprovada diretamente para o faturamento.</p>
                    </div>
                    <button onclick="mudarSubAbaFretes('lancamentos')" class="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-[#152e50] font-bold rounded-xl transition-all text-xs uppercase flex items-center justify-center gap-2 cursor-pointer border border-slate-300">
                        <i class="fa-solid fa-arrow-right-to-bracket"></i> Ver Cargas Faturadas
                    </button>
                </div>
            </div>

            <div class="space-y-4">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h3 class="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                        <i class="fa-solid fa-list-check text-[#152e50]"></i> Cotações em Andamento
                    </h3>
                    <div class="relative w-full sm:w-72">
                        <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                        <input type="text" oninput="filtrarCargasAtivasNaTela(this.value)" placeholder="Buscar carga ativa, motorista ou rota..." class="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#152e50] shadow-sm">
                    </div>
                </div>
                <div id="gridCargasAtivasResumo" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${window.renderCardsCargasAtivasHTML()}
                </div>
            </div>
        </div>
    `;
};