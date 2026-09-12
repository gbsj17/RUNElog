// ==========================================================
// TODO: MÓDULO DE FRETE, COTAÇÃO E ORDEM DE CARREGAMENTO (OC)
// ==========================================================

import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

window.renderPainelFretes = function() {
    const container = document.getElementById('adminSectionContentFretes');
    if (!container) return;

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
            
            <!-- COLUNA 1: COTAÇÃO E DADOS DA CARGA -->
            <div class="space-y-4">
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="bg-[#152e50] p-3 text-center border-b-4 border-[#fac043]">
                        <h2 class="text-[#fac043] font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                            <i class="fa-solid fa-chart-line"></i> Cotação de Frete
                        </h2>
                    </div>
                    <div class="p-4 grid grid-cols-[100px_1fr] gap-x-2 text-[11px] font-bold items-center text-slate-700">
                        <div class="text-right">MOTORISTA:</div>
                        <div class="text-rose-600 text-center py-0.5 dotted-line">-► 70% (Adiant.)</div>
                        
                        <div class="text-right mt-1">ROTA:</div>
                        <div class="bg-[#152e50] text-[#fac043] rounded-full text-center py-0.5 mt-1 font-bold">TERESINA-PI</div>
                        
                        <div class="text-right mt-1">ENTREGAS:</div>
                        <div class="text-rose-600 text-center py-0.5 dotted-line mt-1">>> 03 Paradas <<</div>
                        
                        <div class="text-right text-[#152e50] mt-1"><i class="fa-solid fa-location-dot text-rose-500 mr-1"></i>COLETA:</div>
                        <div class="bg-[#152e50] text-white text-center py-0.5 mt-1 rounded-sm">JEQUIÉ, BA</div>
                    </div>
                </div>

                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="bg-[#152e50] p-3 text-center border-b-4 border-[#fac043]">
                        <h2 class="text-[#fac043] font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                            <i class="fa-solid fa-box-open"></i> Resumo da Carga
                        </h2>
                    </div>
                    <div class="p-4 grid grid-cols-[100px_1fr] gap-x-2 text-[11px] font-bold items-center text-slate-700">
                        <div class="text-right">MATERIAL:</div>
                        <div class="text-center py-0.5 dotted-line">TANQUES & CAIXAS</div>
                        
                        <div class="text-right mt-1">PESO TOTAL:</div>
                        <div class="text-center py-0.5 dotted-line mt-1">4.703,00 KG</div>
                        
                        <div class="text-right mt-1">DISTÂNCIA:</div>
                        <div class="text-center py-0.5 dotted-line mt-1">1.254 KM</div>
                        
                        <div class="text-right text-[#152e50] mt-3 text-xs"><i class="fa-solid fa-money-bill text-emerald-500 mr-1"></i>FRETE BRUTO:</div>
                        <div class="bg-[#152e50] text-white text-center py-1.5 mt-3 text-xs rounded-sm font-extrabold">R$ 6.900,00</div>
                    </div>
                </div>
            </div>

            <!-- COLUNA 2: NEGOCIAÇÃO E TABELA ANTT -->
            <div class="xl:col-span-2 space-y-4">
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="bg-[#152e50] p-3 border-b-4 border-[#fac043] flex justify-between items-center">
                        <h2 class="text-[#fac043] font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                            <i class="fa-solid fa-handshake"></i> Negociação de Frete
                        </h2>
                        <span class="bg-[#fac043] text-[#152e50] text-[10px] font-bold px-2 py-1 rounded">R$ 5,50 / KM</span>
                    </div>
                    <div class="p-4 overflow-x-auto">
                        <table class="w-full text-left border-collapse text-xs whitespace-nowrap">
                            <thead>
                                <tr class="text-slate-500 uppercase border-b border-slate-200">
                                    <th class="pb-2 font-bold">1.254 KM</th>
                                    <th class="pb-2 font-bold text-right">KG (Carregado)</th>
                                    <th class="pb-2 font-bold text-right">R$ (Faturado)</th>
                                    <th class="pb-2 font-bold text-right">R$ (Pago s/ imp.)</th>
                                    <th class="pb-2 font-bold text-right">% Pago</th>
                                </tr>
                            </thead>
                            <tbody class="text-slate-700 font-medium">
                                <tr class="border-b border-slate-100">
                                    <td class="py-2 font-bold text-[#152e50]">TANQUE PE</td>
                                    <td class="py-2 text-right">384,00 KG</td>
                                    <td class="py-2 text-right text-rose-600 font-bold">R$ 18.560,00</td>
                                    <td class="py-2 text-right">R$ 2.300,00</td>
                                    <td class="py-2 text-right">12,39%</td>
                                </tr>
                                <tr class="border-b border-slate-100">
                                    <td class="py-2 font-bold text-[#152e50]">CAIXAS</td>
                                    <td class="py-2 text-right">4.319,00 KG</td>
                                    <td class="py-2 text-right text-rose-600 font-bold">R$ 90.191,50</td>
                                    <td class="py-2 text-right">R$ 4.600,00</td>
                                    <td class="py-2 text-right">5,10%</td>
                                </tr>
                                <tr class="bg-slate-50 font-bold text-[#152e50]">
                                    <td class="py-2 px-1">TOTAL</td>
                                    <td class="py-2 px-1 text-right">4.703,00 KG</td>
                                    <td class="py-2 px-1 text-right">R$ 108.751,50</td>
                                    <td class="py-2 px-1 text-right">R$ 6.900,00</td>
                                    <td class="py-2 px-1 text-right">6,34%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- TABELA ANTT -->
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="bg-[#152e50] p-3 border-b-4 border-[#fac043]">
                        <h2 class="text-[#fac043] font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                            <i class="fa-solid fa-scale-balanced"></i> Tabela de Fretes - ANTT
                        </h2>
                    </div>
                    <div class="p-4 flex items-center justify-between text-xs font-bold text-slate-700">
                        <div class="text-center">
                            <span class="block text-[10px] text-slate-400">DISTÂNCIA</span>
                            <span>1.254 KM</span>
                        </div>
                        <div class="text-center">
                            <span class="block text-[10px] text-slate-400">EIXOS</span>
                            <span class="bg-[#fac043] text-[#152e50] px-2 py-0.5 rounded">5</span>
                        </div>
                        <div class="text-center bg-rose-50 border border-rose-200 p-2 rounded">
                            <span class="block text-[10px] text-rose-500">FRETE ANTT</span>
                            <span class="text-rose-700 text-sm">R$ 9.024,00</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- COLUNA 3: ORDEM DE CARREGAMENTO & REGRAS -->
            <div class="space-y-4">
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="bg-[#152e50] p-3 text-center border-b-4 border-[#fac043]">
                        <h2 class="text-[#fac043] font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                            <i class="fa-solid fa-file-contract"></i> Regras de Embarque (OC)
                        </h2>
                    </div>
                    <div class="bg-rose-50 p-4 border-t border-rose-100 text-[10px] font-bold text-rose-800 space-y-1.5 leading-relaxed">
                        <p class="uppercase text-[11px] mb-2 flex items-center gap-1"><i class="fa-solid fa-triangle-exclamation"></i> Normas de Acesso na Fábrica</p>
                        <p>👖 VESTIMENTA: CALÇA, BLUSA E SAPATO FECHADO.</p>
                        <p>🔈 PROIBIDO SOM ALTO OU BEBIDA ALCOÓLICA.</p>
                        <p>🚬 PROIBIDO FUMAR NAS DEPENDÊNCIAS.</p>
                        <p>📸 PROIBIDO TIRAR FOTOS OU FILMAR.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
};