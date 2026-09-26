// --------------------------------------------------------------------
// TODO: BLOCO 7.4-1 (PARTE REPRESENTANTE): GESTO DE SWIPE E INICIALIZAÇÃO
// --------------------------------------------------------------------
let repTouchStartX = 0;
let repTouchEndX = 0;

document.addEventListener('DOMContentLoaded', () => {
    const repDashboard = document.getElementById('dashboardRepresentative');
    if (!repDashboard) return;

    repDashboard.addEventListener('touchstart', e => {
        repTouchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    repDashboard.addEventListener('touchend', e => {
        repTouchEndX = e.changedTouches[0].screenX;
        tratarSwipeRepresentante();
    }, { passive: true });
});

function tratarSwipeRepresentante() {
    if (window.innerWidth >= 640) return; // Apenas para telas mobile

    const threshold = 50; // Distância mínima em pixels para considerar o gesto
    const diff = repTouchEndX - repTouchStartX;

    if (Math.abs(diff) < threshold) return;

    const tabs = ['inicio', 'ativas', 'concluidas'];
    const currentIndex = tabs.indexOf(typeof repCurrentTab !== 'undefined' ? repCurrentTab : 'inicio');

    if (currentIndex === -1) return;

    if (diff < 0 && currentIndex < tabs.length - 1) {
        // Deslizou para a esquerda -> Próxima aba (avança)
        alternarAbaRepresentante(tabs[currentIndex + 1], 'left');
    } else if (diff > 0 && currentIndex > 0) {
        // Deslizou para a direita -> Aba anterior (volta)
        alternarAbaRepresentante(tabs[currentIndex - 1], 'right');
    }
}

window.iniciarPainelRepresentante = function(rep) {
    mostrarTelaComAnimacao('dashboardRepresentative');
    const nameElem = document.getElementById('repWelcomeName');
    if (nameElem) {
        nameElem.innerText = `Rep: ${rep ? rep.name : 'Logado'}`;
        nameElem.className = "font-bold text-base sm:text-sm text-slate-900 sm:text-white";
    }
    startRepListeners();
    alternarAbaRepresentante('inicio', 'none');
};
// ---------------------------------------------------------------------------------
// TODO: BLOCO 7.4-3: ALTERNÂNCIA DE ABAS E GESTÃO DE ACOMPANHAMENTO (REPRESENTANTE)
// ---------------------------------------------------------------------------------
window.alternarAbaRepresentante = (tab, direction = 'none') => {
    window.repCurrentTab = tab;

    const secInicio = document.getElementById('repSectionInicio');
    const secAtivas = document.getElementById('repSectionAtivas');
    const secConcluidas = document.getElementById('repSectionConcluidas');

    const secoes = { 'inicio': secInicio, 'ativas': secAtivas, 'concluidas': secConcluidas };

    // Aplicação da animação fluida estilo WhatsApp nas abas mobile
    if (window.innerWidth < 640) {
        Object.keys(secoes).forEach(key => {
            const el = secoes[key];
            if (!el) return;

            if (key === tab) {
                el.classList.remove('hidden');
                el.classList.add('tab-pane-transition');

                if (direction === 'left') {
                    el.style.transform = 'translateX(25px)';
                    el.style.opacity = '0';
                } else if (direction === 'right') {
                    el.style.transform = 'translateX(-25px)';
                    el.style.opacity = '0';
                } else {
                    el.style.transform = 'translateX(0)';
                    el.style.opacity = '1';
                }

                setTimeout(() => {
                    el.style.transform = 'translateX(0)';
                    el.style.opacity = '1';
                }, 10);
            } else {
                el.classList.add('hidden');
            }
        });
    } else {
        // Comportamento fixo padrão para desktop
        if (secInicio) secInicio.classList.toggle('hidden', tab !== 'inicio');
        if (secAtivas) secAtivas.classList.toggle('hidden', tab !== 'ativas');
        if (secConcluidas) secConcluidas.classList.toggle('hidden', tab !== 'concluidas');
    }

    const btnDInicio = document.getElementById('repTabHeaderInicio');
    const btnDAtivas = document.getElementById('repTabHeaderAtivas');
    const btnDConcluidas = document.getElementById('repTabHeaderConcluidas');

    [btnDInicio, btnDAtivas, btnDConcluidas].forEach(b => {
        if (b) b.className = "flex-1 min-w-[120px] py-4 px-4 text-center text-slate-500 transition-all hover:bg-slate-50 flex items-center justify-center gap-2 cursor-pointer";
    });

    const btnMInicio = document.getElementById('mobileRepTabInicio');
    const btnMAtivas = document.getElementById('mobileRepTabAtivas');
    const btnMConcluidas = document.getElementById('mobileRepTabConcluidas');

    [btnMInicio, btnMAtivas, btnMConcluidas].forEach(b => {
        if (b) b.className = "flex flex-col items-center gap-1.5 text-[11px] font-medium text-slate-400";
    });

    if (tab === 'inicio') {
        if (btnDInicio) btnDInicio.className = "flex-1 min-w-[120px] py-4 px-4 text-center tab-active flex items-center justify-center gap-2 transition-all cursor-pointer";
        if (btnMInicio) btnMInicio.className = "flex flex-col items-center gap-1.5 text-[11px] font-bold text-[#152e50] bottom-nav-active";
    } else if (tab === 'ativas') {
        if (btnDAtivas) btnDAtivas.className = "flex-1 min-w-[160px] py-4 px-4 text-center tab-active flex items-center justify-center gap-2 transition-all cursor-pointer";
        if (btnMAtivas) btnMAtivas.className = "flex flex-col items-center gap-1.5 text-[11px] font-bold text-[#152e50] bottom-nav-active";
    } else if (tab === 'concluidas') {
        if (btnDConcluidas) btnDConcluidas.className = "flex-1 min-w-[160px] py-4 px-4 text-center tab-active flex items-center justify-center gap-2 transition-all cursor-pointer";
        if (btnMConcluidas) btnMConcluidas.className = "flex flex-col items-center gap-1.5 text-[11px] font-bold text-[#152e50] bottom-nav-active";
    }

    if (typeof window.renderRepDashboard === 'function') {
        window.renderRepDashboard();
    }
};

window.adicionarAcompanhamentoRep = (routeId) => {
    let tracked = JSON.parse(localStorage.getItem(`app_rep_tracked_${currentRepId}`) || "[]");
    if (!tracked.includes(routeId)) {
        tracked.push(routeId);
        localStorage.setItem(`app_rep_tracked_${currentRepId}`, JSON.stringify(tracked));
    }
    if (window.showToast) window.showToast("Carga adicionada aos seus acompanhamentos!", "success");
    if (typeof window.renderRepDashboard === 'function') window.renderRepDashboard();
};

window.deixarDeAcompanharRep = (routeId) => {
    if (window.pedirConfirmacao) {
        window.pedirConfirmacao("Deixar de Acompanhar", "Tem certeza que deseja remover esta carga do seu painel?", () => {
            let tracked = JSON.parse(localStorage.getItem(`app_rep_tracked_${currentRepId}`) || "[]");
            tracked = tracked.filter(id => id !== routeId);
            localStorage.setItem(`app_rep_tracked_${currentRepId}`, JSON.stringify(tracked));
            if (window.showToast) window.showToast("Carga removida do acompanhamento.", "success");
            if (typeof window.renderRepDashboard === 'function') window.renderRepDashboard();
        });
    }
};

window.filtrarCargasAtivasRep = () => {
    if (typeof window.renderRepDashboard === 'function') window.renderRepDashboard();
};

window.filtrarCargasConcluidasRep = () => {
    if (typeof window.renderRepDashboard === 'function') window.renderRepDashboard();
};
// --------------------------------------------------------
// TODO: BLOCO 7.4-4: DASHBOARD E MÉTRICAS DO REPRESENTANTE
// --------------------------------------------------------
window.renderRepDashboard = function() {
    let trackedIds = JSON.parse(localStorage.getItem(`app_rep_tracked_${currentRepId}`) || "[]");
    
    const allMyTrackedActive = allRoutes.filter(r => {
        const isTracked = trackedIds.includes(r.id) || r.repId === currentRepId || (r.representantes || []).some(x => x.id === currentRepId);
        return isTracked && r.status === 'active';
    });

    const allMyTrackedArchived = allRoutes.filter(r => {
        const isTracked = trackedIds.includes(r.id) || r.repId === currentRepId || (r.representantes || []).some(x => x.id === currentRepId);
        return isTracked && r.status === 'archived';
    });

    let totalCidadesItinerario = 0;
    let totalEntregasConcluidasRep = 0;
    let totalEntregasGeralRep = 0;
    let countEmAndamento = allMyTrackedActive.length;
    let countProximasConclusao = 0;

    allMyTrackedActive.forEach(r => {
        const entregas = window.obterParadasValidas ? window.obterParadasValidas(r.stops) : (r.stops || []);
        totalCidadesItinerario += entregas.length;
        const concluidas = entregas.filter(s => s.concluido).length;
        totalEntregasConcluidasRep += concluidas;
        totalEntregasGeralRep += entregas.length;

        const pct = entregas.length > 0 ? (concluidas / entregas.length) : 0;
        if (pct >= 0.7 && concluidas < entregas.length) {
            countProximasConclusao++;
        }
    });

    const taxaConclusaoGeral = totalEntregasGeralRep > 0 ? Math.round((totalEntregasConcluidasRep / totalEntregasGeralRep) * 100) : 0;

    const metricActive = document.getElementById('repMetricActive');
    const metricCities = document.getElementById('repMetricCities');
    const metricRate = document.getElementById('repMetricRate');
    const statusAndamento = document.getElementById('repStatusAndamento');
    const statusProximas = document.getElementById('repStatusProximas');

    if (metricActive) metricActive.innerText = allMyTrackedActive.length;
    if (metricCities) metricCities.innerText = totalCidadesItinerario;
    if (metricRate) metricRate.innerText = `${taxaConclusaoGeral}%`;
    if (statusAndamento) statusAndamento.innerText = countEmAndamento;
    if (statusProximas) statusProximas.innerText = countProximasConclusao;

    // Ranking de cidades: mesma lógica do dashboard do Admin (log-core.js),
    // só que escopada às cargas que este representante acompanha.
    const citiesRankingElem = document.getElementById('repCitiesRankingList');
    if (citiesRankingElem) {
        const cityCounts = {};
        [...allMyTrackedActive, ...allMyTrackedArchived].forEach(r => {
            const entregas = window.obterParadasValidas ? window.obterParadasValidas(r.stops) : (r.stops || []);
            entregas.forEach(stop => {
                let cityName = (stop.textoOriginal || stop.texto || '').trim();
                cityName = cityName.replace(/ - Iniciar Rota/gi, '').replace(/ - Finalizar Rota/gi, '').trim();
                if (cityName && cityName.toLowerCase() !== 'iniciar rota' && cityName.toLowerCase() !== 'finalizar rota') {
                    cityCounts[cityName] = (cityCounts[cityName] || 0) + 1;
                }
            });
        });

        const sortedCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        if (sortedCities.length === 0) {
            citiesRankingElem.innerHTML = `<p class="text-xs text-slate-500 italic">Nenhuma cidade registrada ainda.</p>`;
        } else {
            const maxCount = sortedCities[0][1] || 1;
            citiesRankingElem.innerHTML = sortedCities.map(([cityName, count], index) => `
                <div class="space-y-1">
                    <div class="flex justify-between text-xs font-semibold">
                        <span class="text-[#152e50]"><strong class="text-[#fac043]">${index + 1}º</strong> ${cityName}</span>
                        <span class="text-[#152e50] font-bold">${count} ocorrência(s)</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-1.5">
                        <div class="bg-[#152e50] h-1.5 rounded-full transition-all duration-500" style="width: ${Math.round((count / maxCount) * 100)}%"></div>
                    </div>
                </div>
            `).join('');
        }
    }

    // Comparativo de entregas concluídas: mês atual x mês anterior.
    const comparativoElem = document.getElementById('repComparativoMeses');
    if (comparativoElem) {
        const agora = new Date();
        const mesAtualIdx = agora.getMonth();
        const anoAtual = agora.getFullYear();
        const dataMesAnterior = new Date(anoAtual, mesAtualIdx - 1, 1);
        const mesAnteriorIdx = dataMesAnterior.getMonth();
        const anoMesAnterior = dataMesAnterior.getFullYear();

        const contarNoMes = (mes, ano) => allMyTrackedArchived.filter(r => {
            if (!r.finishedAt) return false;
            const d = new Date(r.finishedAt);
            return d.getMonth() === mes && d.getFullYear() === ano;
        }).length;

        const concluidasMesAtual = contarNoMes(mesAtualIdx, anoAtual);
        const concluidasMesAnterior = contarNoMes(mesAnteriorIdx, anoMesAnterior);

        if (concluidasMesAtual === 0 && concluidasMesAnterior === 0) {
            comparativoElem.innerHTML = `<p class="text-xs text-slate-400 italic text-center py-2">Nenhuma carga concluída ainda para comparar.</p>`;
        } else {
            const maxBarra = Math.max(concluidasMesAtual, concluidasMesAnterior, 1);
            comparativoElem.innerHTML = `
                <div class="space-y-1">
                    <div class="flex justify-between text-xs font-semibold">
                        <span class="text-[#152e50]">Mês Atual</span>
                        <span class="text-[#152e50] font-bold">${concluidasMesAtual} carga(s)</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-2">
                        <div class="bg-[#152e50] h-2 rounded-full transition-all duration-500" style="width: ${Math.round((concluidasMesAtual / maxBarra) * 100)}%"></div>
                    </div>
                </div>
                <div class="space-y-1">
                    <div class="flex justify-between text-xs font-semibold">
                        <span class="text-slate-500">Mês Anterior</span>
                        <span class="text-slate-500 font-bold">${concluidasMesAnterior} carga(s)</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-2">
                        <div class="bg-slate-400 h-2 rounded-full transition-all duration-500" style="width: ${Math.round((concluidasMesAnterior / maxBarra) * 100)}%"></div>
                    </div>
                </div>
            `;
        }
    }

    const noRoutesDiv = document.getElementById('repNoRoutes');

    const inicioList = document.getElementById('repInicioActiveList');
    if (inicioList) {
        inicioList.innerHTML = '';
        if (allMyTrackedActive.length === 0) {
            inicioList.innerHTML = `<p class="text-xs text-slate-500 italic p-3 text-center bg-white rounded-xl border border-slate-200">Nenhuma carga em andamento no momento.</p>`;
        } else {
            allMyTrackedActive.slice(0, 3).forEach(route => {
                inicioList.appendChild(criarCardCargaInicioRep(route));
            });
        }
    }

    const activeList = document.getElementById('repActiveRoutesList');
    const searchActiveTerm = (document.getElementById('searchRepUnifiedActiveInput')?.value || '').toLowerCase().trim();
    if (activeList) {
        activeList.innerHTML = '';
        let listActiveToRender = allMyTrackedActive;

        if (searchActiveTerm) {
            listActiveToRender = listActiveToRender.filter(r => {
                const matchCarga = (r.numeroCarga || '').toLowerCase().includes(searchActiveTerm);
                const matchDriver = (r.driverName || '').toLowerCase().includes(searchActiveTerm);
                const matchTitle = (r.titulo || r.nomeCarga || '').toLowerCase().includes(searchActiveTerm);
                return matchCarga || matchDriver || matchTitle;
            });
        }

        if (listActiveToRender.length === 0) {
            activeList.innerHTML = `<p class="text-xs text-slate-500 italic p-4 text-center bg-white rounded-xl border border-slate-200">Nenhuma carga em andamento encontrada.</p>`;
        } else {
            listActiveToRender.forEach(route => {
                activeList.appendChild(criarCardCargaRep(route));
            });
        }
    }

    const archivedList = document.getElementById('repArchivedRoutesList');
    const searchArchivedTerm = (document.getElementById('searchRepUnifiedArchivedInput')?.value || '').toLowerCase().trim();
    if (archivedList) {
        archivedList.innerHTML = '';
        let listArchivedToRender = allMyTrackedArchived;

        if (searchArchivedTerm) {
            listArchivedToRender = listArchivedToRender.filter(r => {
                const matchCarga = (r.numeroCarga || '').toLowerCase().includes(searchArchivedTerm);
                const matchDriver = (r.driverName || '').toLowerCase().includes(searchArchivedTerm);
                const matchTitle = (r.titulo || r.nomeCarga || '').toLowerCase().includes(searchArchivedTerm);
                return matchCarga || matchDriver || matchTitle;
            });
        }

        if (listArchivedToRender.length === 0) {
            archivedList.innerHTML = `<p class="text-xs text-slate-500 italic p-4 text-center bg-white rounded-xl border border-slate-200">Nenhuma carga concluída encontrada no histórico.</p>`;
        } else {
            listArchivedToRender.forEach(route => {
                archivedList.appendChild(criarCardCargaRep(route));
            });
        }
    }

    if (noRoutesDiv) noRoutesDiv.classList.add('hidden');
};

// -----------------------------------------------------------------
// TODO: BLOCO 7.4-5: CRIAÇÃO DE CARDS DE CARGA PARA O REPRESENTANTE
// -----------------------------------------------------------------
function criarCardCargaInicioRep(route) {
    const entregas = window.obterParadasValidas ? window.obterParadasValidas(route.stops) : (route.stops || []);
    const totalCidades = entregas.length;
    const concluidasCidades = entregas.filter(s => s.concluido).length;
    const percent = totalCidades > 0 ? Math.round((concluidasCidades / totalCidades) * 100) : 0;

    const completedStops = entregas.filter(s => s.concluido);
    const hasCompleted = completedStops.length > 0;
    const lastCompleted = hasCompleted ? (completedStops[completedStops.length - 1].texto || 'Início') : 'Nenhuma realizada';
    const lastCompletedIcon = hasCompleted
        ? '<i class="fa-solid fa-check text-emerald-600 mr-1.5 text-[10px]"></i>'
        : '<i class="fa-solid fa-circle-minus text-slate-300 mr-1.5 text-[10px]"></i>';

    const pendingStops = entregas.filter(s => !s.concluido);
    const nextPending = pendingStops.length > 0 ? (pendingStops[0].texto || 'Destino') : 'Todas concluídas';

    const card = document.createElement('div');
    card.className = "bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3";

    card.innerHTML = `
        <div class="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div class="space-y-1 min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                    <h3 class="font-bold text-slate-800 text-sm truncate">
                        ${route.numeroCarga ? `Carga: ${route.numeroCarga}` : (route.titulo || 'Carga sem número')}
                    </h3>
                    <span class="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2 py-0.5 rounded-md border border-emerald-100 truncate">
                        <i class="fa-solid fa-truck mr-1"></i>${route.driverName || 'Motorista'}
                    </span>
                </div>
            </div>
        </div>

        <div class="flex items-center gap-2.5">
            <div class="flex-1 h-2 bg-[#152e50]/10 rounded-full overflow-hidden">
                <div class="h-full bg-[#fac043] rounded-full transition-all duration-500" style="width: ${percent}%"></div>
            </div>
            <span class="text-[11px] font-bold text-[#152e50] whitespace-nowrap">${concluidasCidades}/${totalCidades} (${percent}%)</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-0.5">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Última Realizada</span>
                <p class="font-semibold text-slate-700 truncate">${lastCompletedIcon}${lastCompleted}</p>
            </div>
            <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-0.5">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Próxima Parada</span>
                <p class="font-semibold text-[#152e50] truncate"><i class="fa-solid fa-clock text-amber-500 mr-1.5 text-[10px]"></i>${nextPending}</p>
            </div>
        </div>
    `;
    return card;
}

function criarCardCargaRep(route) {
    const entregas = window.obterParadasValidas ? window.obterParadasValidas(route.stops) : (route.stops || []);
    const totalCidades = entregas.length;
    const concluidasCidades = entregas.filter(s => s.concluido).length;

    let mapsHref = "https://www.google.com/maps";
    if (route.rawUrl && route.rawUrl.trim() !== '') {
        let link = route.rawUrl.trim();
        mapsHref = (link.startsWith('http://') || link.startsWith('https://')) ? link : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(link)}`;
    }

    const card = document.createElement('div');
    card.className = "bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4";

    card.innerHTML = `
        <div class="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div class="space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                    <h3 class="font-bold text-slate-800 text-base">
                        ${route.numeroCarga ? `Carga: ${route.numeroCarga}` : (route.titulo || 'Carga sem número')}
                    </h3>
                    <span class="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-md border border-emerald-100">
                        <i class="fa-solid fa-truck mr-1"></i>Motorista: ${route.driverName}
                    </span>
                </div>
                <p class="text-xs text-slate-400">Início: ${window.formatarDataHora ? window.formatarDataHora(route.startedAt || route.createdAt) : '-'}</p>
            </div>
            <div class="flex items-center gap-2">
                <span class="${route.status === 'archived' ? 'bg-emerald-100 text-emerald-800' : 'bg-[#152e50]/10 text-[#152e50]'} text-xs font-bold px-3 py-1.5 rounded-full shrink-0">
                    ${route.status === 'archived' ? 'Concluída' : `Cidades: ${concluidasCidades}/${totalCidades}`}
                </span>
                <button onclick="deixarDeAcompanharRep('${route.id}')" class="text-slate-400 hover:text-rose-600 p-1.5" title="Deixar de acompanhar">
                    <i class="fa-solid fa-xmark text-sm"></i>
                </button>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-2.5">
            <button onclick="visualizarRotaAdmin('${route.id}')" class="w-full py-3 bg-[#152e50]/10 hover:bg-[#152e50]/20 text-[#152e50] font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 border border-[#152e50]/20">
                <i class="fa-solid fa-eye"></i> Visualizar Rota
            </button>
            <a href="${mapsHref}" target="_blank" class="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 border border-emerald-200">
                <i class="fa-solid fa-map-location-dot"></i> Ver no Maps
            </a>
        </div>
    `;
    return card;
}
