// ==========================================================
// MÓDULO DE GESTÃO DE FRETES TERCEIRIZADOS (HOMEPAGE + DASHBOARD + FORM)
// ==========================================================

import { renderAbasMetricasFretes } from "./log-metricas.js";
import { salvarCargaPronta } from "./cargas-prontas-store.js";

// ==========================================================
// TODO 1: ESTADO GLOBAL E DADOS DE CARGAS ATIVAS
// ==========================================================
window.fretesState = {
    viewModo: 'lista', // 'lista' ou 'editor'
    cargaSelecionadaId: null,
    termoBuscaAtivas: '',
    painelEditor: 'resumo', // 'resumo' | 'mapa' | 'operacional' | 'produtos'
    mapaExpandidoId: undefined, // numeroCarga com o mapa embutido aberto no painel "Mapa & Status"; undefined = ainda não decidido (auto-abre), null = fechado de propósito pelo usuário
    cargasAtivas: [
        {
            id: 'CG-8849',
            nome: 'CG-8849 (TERESINA-PI)',
            motorista: 'GILMAR J. ALVES JR',
            cpf: '054.286.645-50',
            placa: 'OES-8H09',
            carregamento: '',
            coleta: 'JEQUIÉ, BA',
            material: 'TANQUES & CAIXAS',
            peso: '4.703,00 KG',
            distancia: '1.254 KM',
            carroceria: '0,00 M',
            freteTotal: 'R$ 6.900,00',
            qtdEntregas: '03',
            cidadesEntrega: ['TERESINA - PI', 'TIMON - MA', 'CAXIAS - MA'],
            status: 'Em Trânsito',
            agendamento: { dataHora: '', tipoVeiculo: 'TRUCK', complemento: '' },
            textoColeta: '',
            itensNecessarios: 'UM ROLO DE CORDAS DE 240M, 8 CINTAS OU MAIS E UMA LONA PARA APOIO, SE NECESSÁRIO.'
        },
        {
            id: 'CG-8902',
            nome: 'CG-8902 (FORTALEZA-CE)',
            motorista: 'ANTONIO SILVA',
            cpf: '123.456.789-00',
            placa: 'JEQ-2026',
            carregamento: '',
            coleta: 'JEQUIÉ, BA',
            material: 'TANQUES PE',
            peso: '3.200,00 KG',
            distancia: '1.100 KM',
            carroceria: '0,00 M',
            freteTotal: 'R$ 5.800,00',
            qtdEntregas: '02',
            cidadesEntrega: ['FORTALEZA - CE', 'CAUCAIA - CE'],
            status: 'Aguardando Embarque',
            agendamento: { dataHora: '', tipoVeiculo: 'TRUCK', complemento: '' },
            textoColeta: '',
            itensNecessarios: 'UM ROLO DE CORDAS DE 240M, 8 CINTAS OU MAIS E UMA LONA PARA APOIO, SE NECESSÁRIO.'
        }
    ]
};

// ==========================================================
// TODO 1.1: HELPERS NUMÉRICOS E DE FORMATAÇÃO (cálculo cruzado com o Excel)
// ==========================================================
// Aceita tanto números quanto os textos já formatados que o form usa
// ("R$ 6.900,00", "1.254 KM") e devolve um número puro, ou null se não
// der pra converter (mantém "-" na tela em vez de virar NaN/0 errado).
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
    if (n === null || n === undefined || Number.isNaN(n)) return '-';
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarNumeroBR(n, casas = 2) {
    if (n === null || n === undefined || Number.isNaN(n)) return '-';
    return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

// Calcula os números da "Negociação de Frete" a partir do frete combinado e
// do KM rodado da carga - mesma lógica da planilha (R$/KM = valor / km,
// adiantamento e saldo em 50%/50%). O rateio por tanque/caixa e a tabela
// "Valor Base de Frete 2026" dependem do peso por item, que ainda não é
// cadastrado (cf. pedido do usuário) - por isso continuam como "-" por ora.
function calcularNegociacaoFrete(carga) {
    const kmRodado = paraNumero(carga.distancia);
    const freteTotal = paraNumero(carga.freteTotal);
    const rsPorKm = (kmRodado && freteTotal) ? freteTotal / kmRodado : null;
    const adiantamento = freteTotal !== null ? freteTotal * 0.5 : null;
    const saldo = freteTotal !== null ? freteTotal - adiantamento : null;

    return { kmRodado, freteTotal, rsPorKm, adiantamento, saldo };
}

// ==========================================================
// TODO 1.2: INTEGRAÇÃO COM O IMPORTADOR (ROTINA 335 DO WINTHOR)
// ==========================================================
// A carga real (motorista NÃO incluso - isso é dado nosso) já vem pronta em
// window.allImportCargas, alimentada pelo Importador de Cargas / rotina 335.
// Essas funções acham o registro vinculado a uma cotação e agrupam os
// produtos que ele carrega, pra eliminar redigitação manual dos itens.

// window.allImportCargas pode ter mais de uma linha com o mesmo "numeroCarga"
// (ex.: reimportação da planilha com o número lido de forma levemente
// diferente). Sem isso, a mesma carga aparece duplicada no seletor de
// Carregamento - em uma cópia "montada" e em outra "aguardando". Aqui a gente
// deduplica por numeroCarga, priorizando sempre a linha com montada=true e,
// em empate, a mais recente.
function obterImportCargasUnicas() {
    const porNumero = new Map();
    (window.allImportCargas || []).forEach(c => {
        const chave = String(c.numeroCarga || '').trim();
        if (!chave) return;

        const atual = porNumero.get(chave);
        if (!atual) { porNumero.set(chave, c); return; }

        if (atual.montada === c.montada) {
            const dataAtual = new Date(atual.updatedAt || atual.createdAt || 0);
            const dataNova = new Date(c.updatedAt || c.createdAt || 0);
            if (dataNova > dataAtual) porNumero.set(chave, c);
        } else if (c.montada === true) {
            porNumero.set(chave, c);
        }
    });
    return Array.from(porNumero.values());
}

function obterRegistroImportVinculado(carga) {
    if (!carga || !carga.carregamento) return null;
    return obterImportCargasUnicas().find(c => c.numeroCarga === carga.carregamento) || null;
}

function agruparProdutosPorCidade(registro) {
    const dados = registro?.dados || {};
    const clientes = dados.clientes || {};
    const ordemCidades = Array.isArray(dados.cidades) ? dados.cidades : [];
    const mapa = {};

    Object.values(clientes).forEach(cli => {
        (cli.pedidos || []).forEach(ped => {
            const cidade = (ped.cidade || cli.cidade || 'CIDADE NÃO INFORMADA').toString().toUpperCase().trim();
            if (!mapa[cidade]) mapa[cidade] = { cidade, itens: {}, totalVolumes: 0 };

            (ped.itens || []).forEach(item => {
                if (!mapa[cidade].itens[item.codigo]) {
                    mapa[cidade].itens[item.codigo] = { codigo: item.codigo, descricao: item.descricao, quantidade: 0 };
                }
                mapa[cidade].itens[item.codigo].quantidade += (item.quantidade || 0);
                mapa[cidade].totalVolumes += (item.quantidade || 0);
            });
        });
    });

    const indiceDaCidade = (cidade) => {
        const i = ordemCidades.findIndex(c => (c || '').toString().toUpperCase().trim() === cidade);
        return i === -1 ? 999 : i;
    };

    return Object.values(mapa)
        .map(grupo => ({ ...grupo, itens: Object.values(grupo.itens) }))
        .sort((a, b) => indiceDaCidade(a.cidade) - indiceDaCidade(b.cidade));
}

function agruparProdutosDaCarga(registro) {
    const totais = {};
    agruparProdutosPorCidade(registro).forEach(grupo => {
        grupo.itens.forEach(item => {
            if (!totais[item.codigo]) totais[item.codigo] = { codigo: item.codigo, descricao: item.descricao, quantidade: 0 };
            totais[item.codigo].quantidade += item.quantidade;
        });
    });
    return Object.values(totais);
}

function gerarTextoColeta(carga) {
    const linhas = [
        `COLETA: ${carga.coleta || '-'}`,
        `CARGA: ${carga.id || '-'}${carga.carregamento ? ' | CARREGAMENTO Nº ' + carga.carregamento : ''}`,
        `MOTORISTA: ${carga.motorista || '-'}${carga.placa ? ' | VEÍCULO: ' + carga.placa : ''}`,
        `ENTREGAS (${carga.qtdEntregas || '00'}): ${(carga.cidadesEntrega || []).join(', ')}`,
        carga.agendamento?.dataHora ? `AGENDAMENTO: ${new Date(carga.agendamento.dataHora).toLocaleString('pt-BR')}` : null,
        'VESTIMENTA: CALÇA, BLUSA E SAPATO. PROIBIDO SOM/BEBIDA ALCOÓLICA/FUMAR/FOTOS.'
    ].filter(Boolean);
    return linhas.join('\n');
}

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
    window.fretesState.painelEditor = 'resumo';
    window.fretesState.mapaExpandidoId = undefined; // reseta o auto-abrir do mapa pra carga nova
    if (cargaId === null) window.fretesState.novaCotacaoDraft = null;
    window.renderPainelFretes();
};

// ==========================================================
// TODO 3.1: SELEÇÃO DE UMA CARGA REAL (Importador de Cargas) PARA A COTAÇÃO
// ==========================================================
// Preenche o rascunho da "Nova Cotação" com os dados reais da carga escolhida
// (window.allImportCargas, vindo da tabela import_cargas no Supabase - a mesma
// que o Importador de Cargas grava, alimentada pela rotina 335 do WinThor) em
// vez dos dados fixos de exemplo. Isso elimina a redigitação manual de
// entregas, cidades e itens transportados.
window.aoSelecionarCargaParaCotacao = function(numeroCarga) {
    if (!numeroCarga) {
        window.fretesState.novaCotacaoDraft = null;
        window.renderPainelFretes();
        return;
    }

    const registro = (window.allImportCargas || []).find(c => c.numeroCarga === numeroCarga);
    if (!registro) return;

    window.fretesState.mapaExpandidoId = undefined; // novo carregamento vinculado -> deixa o mapa auto-abrir de novo

    const dados = registro.dados || {};
    const cidadesEntrega = Array.isArray(dados.cidades) ? dados.cidades : [];
    const qtdEntregas = dados.totalPedidosCount || Object.keys(dados.clientes || {}).length || cidadesEntrega.length;

    window.fretesState.novaCotacaoDraft = {
        // "id" (o código definitivo "CG-XXXX") só é atribuído ao salvar (ver
        // salvarCotacaoFrete) - até lá fica "NOVA", senão os campos CARGA e
        // CARREGAMENTO mostram o mesmo número duas vezes na tela.
        id: 'NOVA',
        _cargaId: registro.numeroCarga,
        motorista: '-',
        cpf: '-',
        placa: '-',
        carregamento: registro.numeroCarga,
        coleta: 'JEQUIÉ, BA',
        material: 'TANQUES & CAIXAS',
        peso: '0,00 KG',
        distancia: '0 KM',
        carroceria: '0,00 M',
        freteTotal: '-',
        qtdEntregas: String(qtdEntregas).padStart(2, '0'),
        cidadesEntrega: cidadesEntrega.length ? cidadesEntrega : ['-'],
        status: registro.montada ? 'Aguardando Embarque' : 'Em Montagem',
        agendamento: { dataHora: '', tipoVeiculo: 'TRUCK', complemento: '' },
        textoColeta: '',
        itensNecessarios: 'UM ROLO DE CORDAS DE 240M, 8 CINTAS OU MAIS E UMA LONA PARA APOIO, SE NECESSÁRIO.'
    };

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
// TODO 3.2: SALVAR COTAÇÃO (nomeação fixa + envio pra "Cargas Prontas")
// ==========================================================
// Ao fechar a cotação: se ainda não tem um código definitivo, gera um
// (número sequencial fixo "CG-XXXX" + o nome que o usuário decidir agora),
// manda o snapshot pro Supabase (tabela cargas_prontas) e tira a carga da
// lista de pendentes - resolve o bug de fretes já montados continuando
// visíveis na tela principal.
function proximoNumeroSequencialCarga() {
    const numeros = (window.fretesState.cargasAtivas || [])
        .map(c => parseInt(String(c.id).replace(/\D/g, ''), 10))
        .filter(n => Number.isFinite(n));
    const maior = numeros.length ? Math.max(...numeros) : 8902;
    return maior + 1;
}

window.salvarCotacaoFrete = async function() {
    const carga = window.fretesState.cargasAtivas.find(c => c.id === window.fretesState.cargaSelecionadaId)
        || (window.fretesState.cargaSelecionadaId === null ? window.fretesState.novaCotacaoDraft : null);

    if (!carga) {
        if (window.showToast) window.showToast("Preencha e selecione uma carga antes de salvar.", "error");
        return;
    }

    const jaTinhaCodigo = window.fretesState.cargasAtivas.some(c => c.id === carga.id);

    if (!jaTinhaCodigo) {
        const nome = prompt("Nome/identificação para esta carga (ex: destino final ou cliente principal):", (carga.cidadesEntrega || [])[0] || '');
        if (nome === null) return; // cancelou

        const numero = proximoNumeroSequencialCarga();
        carga.id = `CG-${numero}`;
        carga._numeroCarregamentoOrigem = carga.carregamento;
        carga.nome = nome.trim() ? `${carga.id} (${nome.trim().toUpperCase()})` : carga.id;

        window.fretesState.cargasAtivas.push(carga);
        window.fretesState.novaCotacaoDraft = null;
        window.fretesState.cargaSelecionadaId = carga.id;
    }

    const resultado = await salvarCargaPronta(carga);
    if (!resultado.ok) {
        if (window.showToast) window.showToast("Não foi possível sincronizar com o Supabase agora. A cotação segue salva localmente.", "error");
    } else if (window.showToast) {
        window.showToast("Cotação salva em Cargas Prontas!", "success");
    }

    // Sai da lista de pendentes - já foi para "cargas prontas".
    window.fretesState.cargasAtivas = window.fretesState.cargasAtivas.filter(c => c.id !== carga.id);
    window.voltarParaListaFretes();
};

// ==========================================================
// TODO 4: RENDERIZAÇÃO DA LISTA DE CARGAS ATIVAS (HOME)
// ==========================================================
window.renderCardsCargasAtivasHTML = function() {
    const termo = window.fretesState.termoBuscaAtivas;
    const cargas = window.fretesState.cargasAtivas.filter(c =>
        c.id.toLowerCase().includes(termo) ||
        c.motorista.toLowerCase().includes(termo) ||
        (c.cidadesEntrega || []).join(' ').toLowerCase().includes(termo)
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
                    <h4 class="font-extrabold text-[#152e50] text-sm mt-1">${(c.cidadesEntrega || [])[0] || c.id}</h4>
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
    const { adiantamento, saldo } = calcularNegociacaoFrete(carga);

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
                        <span class="uppercase text-slate-500">Carregamento:</span>
                        ${!carga.carregamento ? `
                        <select id="freteSelectCargaOrigem" onchange="aoSelecionarCargaParaCotacao(this.value)" class="bg-[#152e50] text-[#fac043] font-bold rounded px-2 py-1 text-xs outline-none max-w-[160px]">
                            <option value="">--► SELECIONAR CARGA</option>
                            ${obterImportCargasUnicas()
                                .filter(c => c.montada === true)
                                .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                                .map(c => `<option value="${c.numeroCarga}">${c.numeroCarga}</option>`)
                                .join('')}
                        </select>
                        ` : `
                        <span class="bg-[#152e50] text-[#fac043] font-bold rounded px-2 py-0.5 text-xs">Nº ${carga.carregamento}</span>
                        `}
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
                        <div class="flex justify-between"><span>ADIANTAMENTO (50%):</span><span class="font-bold text-slate-800">${formatarMoeda(adiantamento)}</span></div>
                        <div class="flex justify-between"><span>SALDO (50%):</span><span class="font-bold text-slate-800">${formatarMoeda(saldo)}</span></div>
                    </div>
                </div>
            </div>
        </div>
    `;
};

window.renderFormColuna2HTML = function(carga) {
    const { kmRodado, freteTotal, rsPorKm } = calcularNegociacaoFrete(carga);
    const kmTxt = kmRodado !== null ? `${formatarNumeroBR(kmRodado, 0)} KM` : (carga.distancia || '-');
    const percentualPago = freteTotal !== null ? '100,00%' : '0,00%';

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
                            <tr class="bg-slate-50 font-bold"><td class="p-1.5 text-[#152e50]">${kmTxt}</td><td>-</td><td>-</td><td>-</td><td>-</td><td class="text-rose-600">-</td></tr>
                            <tr><td class="p-1.5 text-left font-bold text-slate-800">TANQUE PE:</td><td class="text-rose-600 font-bold">R$ -</td><td>R$ -</td><td>R$ -</td><td>R$ -</td><td class="text-rose-600">-</td></tr>
                            <tr><td class="p-1.5 text-left font-bold text-slate-800">CAIXAS:</td><td class="text-rose-600 font-bold">R$ -</td><td>R$ -</td><td>R$ -</td><td>R$ -</td><td class="text-rose-600">R$ -</td></tr>
                            <tr class="bg-[#152e50] text-[#fac043] font-extrabold"><td class="p-1.5 text-left">TOTAL:</td><td>R$ -</td><td>R$ -</td><td>R$ -</td><td>R$ -</td><td>-</td></tr>
                        </tbody>
                    </table>
                    <p class="text-slate-400 font-medium normal-case mt-1.5 text-[9px]">* Rateio por tanque/caixa entra quando o peso por item for cadastrado.</p>
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
                            <tr class="bg-slate-50 font-bold">
                                <td class="p-1.5 text-[#152e50]">${kmTxt}</td>
                                <td>${carga.peso}</td>
                                <td class="text-rose-600 font-bold">${formatarMoeda(freteTotal)}</td>
                                <td>${formatarMoeda(freteTotal)}</td>
                                <td>${percentualPago}</td>
                                <td class="bg-slate-100 text-rose-600 font-extrabold text-sm align-middle">${rsPorKm !== null ? formatarMoeda(rsPorKm) : '-'}</td>
                            </tr>
                            <tr class="bg-[#152e50] text-[#fac043] font-extrabold"><td class="p-1.5 text-left">TOTAL:</td><td>${carga.peso}</td><td>${formatarMoeda(freteTotal)}</td><td>${formatarMoeda(freteTotal)}</td><td>${percentualPago}</td><td class="text-white text-[9px]">FIBRASOL</td></tr>
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
                                <td class="p-1.5 font-extrabold text-[#152e50]">${kmTxt}</td>
                                <td class="p-1.5"><select class="bg-rose-500 text-white font-extrabold px-1.5 py-0.5 rounded outline-none"><option>5</option></select></td>
                                <td class="p-1.5"><input type="checkbox" class="w-4 h-4 text-[#152e50] rounded"></td>
                                <td class="p-1.5 text-rose-600">R$ -</td>
                                <td class="p-1.5 text-rose-600">R$ -</td>
                                <td class="p-1.5 text-rose-600 font-extrabold">R$ -</td>
                            </tr>
                        </tbody>
                    </table>
                    <p class="text-slate-400 font-medium normal-case text-[9px]">* Coeficientes oficiais da tabela ANTT por eixo ainda precisam ser cadastrados para preencher o piso mínimo automaticamente.</p>
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
                    <div class="flex justify-between border-b border-slate-100 pb-1"><span class="text-slate-400">CARREGAMENTO:</span><span class="text-[#152e50]">${carga.carregamento || '-'}</span></div>
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
    const registro = obterRegistroImportVinculado(carga);
    const produtos = registro ? agruparProdutosDaCarga(registro) : [];
    const totalUn = produtos.reduce((acc, p) => acc + (p.quantidade || 0), 0);

    const listaHtml = produtos.length
        ? produtos.map(p => `
            <div class="flex justify-between border-b border-dashed border-slate-200 pb-0.5">
                <span>• ${p.descricao}</span>
                <span class="text-rose-600 font-bold">${String(p.quantidade).padStart(2, '0')} UN</span>
            </div>
        `).join('')
        : `<p class="text-slate-400 italic text-center pt-4">Selecione um carregamento vinculado para listar os itens automaticamente.</p>`;

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
                    ${listaHtml}
                </div>
                <div class="bg-[#152e50] text-[#fac043] font-extrabold text-right p-2 text-xs shrink-0">
                    TOTAL: <span class="text-white">${String(totalUn).padStart(3, '0')} UN.</span>
                </div>
            </div>
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-2">
                <div class="bg-[#152e50] p-2 text-center border-b-2 border-[#fac043]">
                    <h4 class="text-[#fac043] font-bold text-[11px] uppercase">Descrição da Carga</h4>
                </div>
                <div class="p-3 text-[9px] text-slate-600 font-mono leading-tight space-y-1 font-bold bg-slate-50 border-t border-slate-100">
                    <p>QUANTIDADE DE ENTREGAS: ${carga.qtdEntregas} | PESO: ${carga.peso} | DISTÂNCIA: ${carga.distancia}</p>
                    <p class="text-[#152e50] border-t border-slate-200 pt-1">• VAMOS PRECISAR DOS SEGUINTES ITENS: ${carga.itensNecessarios || '-'}</p>
                </div>
            </div>
        </div>
    `;
};

// ==========================================================
// TODO 6.6: PAINÉIS LATERAIS (Mapa & Status | Operacional | Produtos)
// ==========================================================
// O mapa (Leaflet + roteirização) já existe e funciona dentro de
// import-cargas.html - é a mesma tela que a "Nova Janela" abre navegando de
// verdade pra "import-cargas.html?janelaRota=<numeroCarga>" (mesma origem,
// sem clonar DOM entre documentos, o que já resolveu o bloqueio dos tiles do
// OSM). Em vez de duplicar essa lógica de mapa aqui, a gente reaproveita a
// MESMA url dentro de um <iframe>, só carregado quando o usuário pede pra ver
// a rota de uma carga específica (evita subir N mapas/Leaflet de uma vez).
function renderCardMapaRotaHTML(c, aberto) {
    const cidades = (c.cidadesEntrega || []).filter(x => x && x !== '-');
    return `
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="space-y-1 min-w-0">
                    <p class="font-bold text-slate-800 text-sm flex items-center gap-1.5"><i class="fa-solid fa-truck text-emerald-500"></i> ${c.motorista} <span class="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-100">Montada</span></p>
                    <p class="text-xs text-slate-500">${c.id} • Carregamento ${c.carregamento} • ${cidades.join(' → ') || 'Sem cidades cadastradas'}</p>
                </div>
                <button onclick="alternarMapaRotaFrete('${c.carregamento}')" class="text-xs ${aberto ? 'bg-[#152e50] text-[#fac043]' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'} px-3 py-2 rounded-lg transition-all font-bold flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer">
                    <i class="fa-solid fa-map-location-dot"></i> ${aberto ? 'Fechar Mapa' : 'Ver Mapa da Rota'}
                </button>
            </div>
            ${aberto ? `
            <div class="border-t border-slate-200">
                <iframe src="import-cargas.html?janelaRota=${encodeURIComponent(c.carregamento)}" class="w-full h-[600px] border-0" title="Mapa da rota - Carregamento ${c.carregamento}"></iframe>
            </div>
            ` : ''}
        </div>
    `;
}

// `cargaAtual` é a carga aberta no editor agora - o mapa dela aparece direto,
// sem precisar já ter sido salva (o rascunho de uma cotação nova nunca fica
// em fretesState.cargasAtivas, só entra lá quando a cotação é salva, e nesse
// ponto o botão "Salvar" já tira a carga da lista de pendentes - por isso
// olhar só pra cargasAtivas deixava o mapa inalcançável na prática).
window.renderPainelMapaStatusHTML = function(cargaAtual) {
    const unicas = obterImportCargasUnicas();
    const expandidoId = window.fretesState.mapaExpandidoId;

    const registroAtual = cargaAtual && cargaAtual.carregamento
        ? unicas.find(r => r.numeroCarga === cargaAtual.carregamento)
        : null;

    let blocoAtual;
    if (!cargaAtual || !cargaAtual.carregamento) {
        blocoAtual = `<div class="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-400 text-xs font-medium">Selecione um Carregamento na Cotação para ver o mapa desta carga.</div>`;
    } else if (registroAtual && registroAtual.montada === true) {
        // Auto-expande o mapa da carga que está sendo editada agora - só na
        // primeira vez que o painel abre pra ela (expandidoId undefined).
        // "null" quer dizer que o usuário clicou em "Fechar Mapa" de propósito.
        if (expandidoId === undefined) window.fretesState.mapaExpandidoId = cargaAtual.carregamento;
        blocoAtual = renderCardMapaRotaHTML(cargaAtual, window.fretesState.mapaExpandidoId === cargaAtual.carregamento);
    } else {
        blocoAtual = `<div class="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold p-4 rounded-xl">Carregamento ${cargaAtual.carregamento} ainda não está com status "montada" no Importador de Cargas - o mapa fica disponível assim que a rota for concluída lá.</div>`;
    }

    const outras = window.fretesState.cargasAtivas.filter(c => {
        if (cargaAtual && c.id === cargaAtual.id) return false;
        const registro = unicas.find(r => r.numeroCarga === c.carregamento);
        return registro && registro.montada === true;
    });

    const outrasHtml = outras.length ? `
        <div class="pt-2">
            <p class="text-[10px] uppercase font-extrabold text-slate-400 mb-2 border-b pb-1">Outras cotações com carga montada</p>
            <div class="space-y-3">${outras.map(c => renderCardMapaRotaHTML(c, window.fretesState.mapaExpandidoId === c.carregamento)).join('')}</div>
        </div>
    ` : '';

    return `
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 class="font-extrabold text-slate-800 text-sm flex items-center gap-2"><i class="fa-solid fa-map-location-dot text-[#152e50]"></i> Mapa & Status (cargas montadas)</h3>
            ${blocoAtual}
            ${outrasHtml}
        </div>
    `;
};

window.renderPainelOperacionalHTML = function(carga) {
    if (!carga.textoColeta) carga.textoColeta = gerarTextoColeta(carga);
    const ag = carga.agendamento || (carga.agendamento = { dataHora: '', tipoVeiculo: 'TRUCK', complemento: '' });

    return `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            ${window.renderFormColuna3HTML(carga)}
            <div class="space-y-4">
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="bg-[#152e50] p-2 text-center border-b-2 border-[#fac043]">
                        <h3 class="text-[#fac043] font-bold text-xs uppercase flex items-center justify-center gap-1.5"><i class="fa-solid fa-calendar-check"></i> Agendamento</h3>
                    </div>
                    <div class="p-3 space-y-2 text-[11px] font-bold text-slate-700">
                        <div class="flex justify-between items-center gap-2">
                            <span class="uppercase text-slate-500 shrink-0">Data/Hora:</span>
                            <input type="datetime-local" value="${ag.dataHora || ''}" onchange="atualizarAgendamentoFrete('${carga.id}', 'dataHora', this.value)" class="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs outline-none w-full">
                        </div>
                        <div class="flex justify-between items-center gap-2">
                            <span class="uppercase text-slate-500 shrink-0">Veículo:</span>
                            <select onchange="atualizarAgendamentoFrete('${carga.id}', 'tipoVeiculo', this.value)" class="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs outline-none w-full">
                                ${['TRUCK', 'CARRETA', 'BITREM', 'RODOTREM'].map(t => `<option value="${t}" ${ag.tipoVeiculo === t ? 'selected' : ''}>${t}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <span class="uppercase text-slate-500 block mb-1">Complemento:</span>
                            <textarea onchange="atualizarAgendamentoFrete('${carga.id}', 'complemento', this.value)" rows="2" class="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs outline-none w-full font-medium">${ag.complemento || ''}</textarea>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="bg-[#152e50] p-2.5 flex items-center justify-between border-b-2 border-[#fac043]">
                        <h3 class="text-[#fac043] font-bold text-xs uppercase flex items-center gap-1.5"><i class="fa-solid fa-clipboard-list"></i> Texto de Coleta</h3>
                        <button onclick="copiarTextoColetaFrete('${carga.id}')" class="text-[10px] bg-[#fac043] text-[#152e50] font-extrabold px-2 py-1 rounded flex items-center gap-1 cursor-pointer">
                            <i class="fa-solid fa-copy"></i> Copiar
                        </button>
                    </div>
                    <div class="p-3">
                        <textarea id="textoColetaFrete_${carga.id}" onchange="atualizarTextoColetaFrete('${carga.id}', this.value)" rows="6" class="w-full bg-slate-50 border border-slate-200 rounded p-2 text-[11px] font-mono text-slate-700 outline-none">${carga.textoColeta}</textarea>
                    </div>
                </div>
            </div>
        </div>
    `;
};

window.renderPainelProdutosHTML = function(carga) {
    const registro = obterRegistroImportVinculado(carga);
    if (!registro) {
        return `<div class="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 font-medium text-xs">Vincule um carregamento (aba Cotação) para ver os produtos agrupados por entrega.</div>`;
    }

    const grupos = agruparProdutosPorCidade(registro);
    const gruposHtml = grupos.length ? grupos.map(g => `
        <div class="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div class="bg-slate-100 p-2.5 px-4 flex justify-between items-center border-b border-slate-200">
                <span class="font-bold text-xs text-[#152e50] flex items-center gap-1.5"><i class="fa-solid fa-location-dot text-amber-500"></i> ${g.cidade}</span>
                <span class="text-[11px] font-bold text-slate-500">${g.totalVolumes} vol.</span>
            </div>
            <div class="p-3 bg-white divide-y divide-slate-100 text-xs">
                ${g.itens.map(it => `
                    <div class="py-1.5 flex justify-between items-center">
                        <span class="text-slate-700"><strong>${it.codigo}</strong> - ${it.descricao}</span>
                        <span class="font-black text-amber-600 px-2 py-0.5 bg-amber-50 rounded border border-amber-100">${it.quantidade}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('') : `<p class="text-xs text-slate-400 italic text-center p-6">Nenhum produto encontrado para este carregamento.</p>`;

    return `
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <h3 class="font-extrabold text-slate-800 text-sm flex items-center gap-2 mb-3"><i class="fa-solid fa-boxes-stacked text-[#152e50]"></i> Produtos por Entrega/Rota — Carregamento ${carga.carregamento}</h3>
            <div class="space-y-3">${gruposHtml}</div>
        </div>
    `;
};

window.atualizarAgendamentoFrete = function(cargaId, campo, valor) {
    const carga = window.fretesState.cargasAtivas.find(c => c.id === cargaId) || window.fretesState.novaCotacaoDraft;
    if (!carga) return;
    if (!carga.agendamento) carga.agendamento = { dataHora: '', tipoVeiculo: 'TRUCK', complemento: '' };
    carga.agendamento[campo] = valor;
};

window.atualizarTextoColetaFrete = function(cargaId, valor) {
    const carga = window.fretesState.cargasAtivas.find(c => c.id === cargaId) || window.fretesState.novaCotacaoDraft;
    if (carga) carga.textoColeta = valor;
};

window.copiarTextoColetaFrete = function(cargaId) {
    const el = document.getElementById(`textoColetaFrete_${cargaId}`);
    if (!el) return;
    navigator.clipboard.writeText(el.value).then(() => {
        if (window.showToast) window.showToast("Texto de coleta copiado!", "success");
    }).catch(() => {
        el.select();
        document.execCommand('copy');
        if (window.showToast) window.showToast("Texto de coleta copiado!", "success");
    });
};

// ==========================================================
// TODO 6.7: TROCA DE PAINEL LATERAL (navegação vertical)
// ==========================================================
window.mudarPainelEditorFrete = function(painel) {
    window.fretesState.painelEditor = painel;
    window.renderPainelFretes();
};

window.alternarMapaRotaFrete = function(numeroCarregamento) {
    window.fretesState.mapaExpandidoId = (window.fretesState.mapaExpandidoId === numeroCarregamento) ? null : numeroCarregamento;
    window.renderPainelFretes();
};

// ===========================================================
// TODO 6.5: FORMULÁRIO PRINCIPAL DA PLANILHA (MONTAGEM GERAL)
// ===========================================================
window.renderFormularioPlanilhaHTML = function() {
    const atualId = window.fretesState.cargaSelecionadaId;
    const carga = window.fretesState.cargasAtivas.find(c => c.id === atualId)
        || (atualId === null && window.fretesState.novaCotacaoDraft)
        || {
        id: 'NOVA',
        motorista: '',
        carregamento: '',
        coleta: 'JEQUIÉ, BA',
        material: 'TANQUES & CAIXAS',
        peso: '0,00 KG',
        distancia: '0 KM',
        carroceria: '0,00 M',
        freteTotal: '-',
        qtdEntregas: '00',
        cpf: '-',
        placa: '-',
        cidadesEntrega: ['-', '-', '-', '-'],
        agendamento: { dataHora: '', tipoVeiculo: 'TRUCK', complemento: '' },
        textoColeta: '',
        itensNecessarios: '-'
    };

    const painel = window.fretesState.painelEditor;
    const botoes = [
        { id: 'resumo', icon: 'fa-pen-to-square', titulo: 'Cotação (Resumo)' },
        { id: 'mapa', icon: 'fa-map-location-dot', titulo: 'Mapa e Status' },
        { id: 'operacional', icon: 'fa-id-card', titulo: 'Operacional' },
        { id: 'produtos', icon: 'fa-boxes-stacked', titulo: 'Produtos' }
    ];

    const conteudoPrincipal = painel === 'resumo'
        ? `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[280px_1fr_260px_300px] gap-4 flex-1 w-full text-xs">
                ${window.renderFormColuna1HTML(carga)}
                ${window.renderFormColuna2HTML(carga)}
                ${window.renderFormColuna3HTML(carga)}
                ${window.renderFormColuna4HTML(carga)}
           </div>`
        : `<div class="flex-1 w-full text-xs space-y-4">
                ${window.renderFormColuna1HTML(carga)}
                <div id="painelLateralFreteAnimado" class="opacity-0 -translate-y-2 transition-all duration-300 ease-out">
                    ${painel === 'mapa' ? window.renderPainelMapaStatusHTML(carga)
                        : painel === 'operacional' ? window.renderPainelOperacionalHTML(carga)
                        : window.renderPainelProdutosHTML(carga)}
                </div>
           </div>`;

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
                    ${botoes.map(b => `
                    <button onclick="mudarPainelEditorFrete('${b.id}')" title="${b.titulo}" class="w-10 h-10 rounded-xl ${painel === b.id ? 'bg-[#fac043] text-[#152e50]' : 'bg-white/10 text-slate-300 hover:bg-[#fac043] hover:text-[#152e50]'} flex items-center justify-center transition-all cursor-pointer">
                        <i class="fa-solid ${b.icon} text-base"></i>
                    </button>
                    `).join('')}
                    <button onclick="salvarCotacaoFrete()" title="Salvar Cotação" class="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-all shadow-md cursor-pointer">
                        <i class="fa-solid fa-check text-base"></i>
                    </button>
                </div>
                ${conteudoPrincipal}
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

    // Bug corrigido: o "menu pílula" (Cotação/Métricas/Lançamentos) fica
    // escondido enquanto a cotação está em modo editor - ele não faz sentido
    // sobre a planilha em tela cheia, e criava a impressão de um menu duplicado.
    const pillNav = document.getElementById('fretesPillNavWrapper');
    if (pillNav) pillNav.classList.toggle('hidden', window.fretesState.viewModo === 'editor');

    if (window.fretesState.viewModo === 'editor') {
        container.innerHTML = window.renderFormularioPlanilhaHTML();
        const animado = document.getElementById('painelLateralFreteAnimado');
        if (animado) {
            requestAnimationFrame(() => {
                animado.classList.remove('opacity-0', '-translate-y-2');
                animado.classList.add('opacity-100', 'translate-y-0');
            });
        }
        return;
    }

    const emAndamento = window.fretesState.cargasAtivas;
    const aguardando = emAndamento.filter(c => c.status === 'Aguardando Embarque').length;
    const emTransito = emAndamento.filter(c => c.status === 'Em Trânsito').length;

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
                        <h3 class="text-2xl font-extrabold text-[#152e50] mt-1">${emAndamento.length} Cargas Em Aberto</h3>
                        <div class="flex items-center gap-3 text-[11px] text-slate-500 font-medium mt-1">
                            <span>Aguardando Embarque: <strong class="text-amber-600 font-bold">${aguardando}</strong></span>
                            <span>•</span>
                            <span>Em Trânsito: <strong class="text-blue-600 font-bold">${emTransito}</strong></span>
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
