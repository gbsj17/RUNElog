// --------------------------------------------------------------------
// TODO: BLOCO 7.4-1 (PARTE MOTORISTA): INICIALIZAÇÃO DO PAINEL
// --------------------------------------------------------------------
window.iniciarPainelMotorista = function(driver) {
    mostrarTelaComAnimacao('dashboardDriver');
    document.getElementById('driverWelcomeName').innerText = `Motorista: ${driver ? driver.name : 'Logado'}`;
    startDriverListeners();
    renderDriverDashboard();
};

// --------------------------------------------------------------
// TODO: BLOCO 7.4-2: PAINEL DO MOTORISTA E CHECKLIST DE ENTREGAS
// --------------------------------------------------------------
window.renderDriverDashboard = function() {
    const currentDriver = allDrivers.find(d => d.id === currentDriverId);
    const myRoutes = allRoutes.filter(r => r.driverId === currentDriverId);
    const activeRoutes = myRoutes.filter(r => r.status === 'active');

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyRoutes = myRoutes.filter(r => {
        const routeDate = new Date(r.finishedAt || r.createdAt);
        return routeDate.getMonth() === currentMonth && routeDate.getFullYear() === currentYear;
    });

    const monthlyCargosElem = document.getElementById('driverMonthlyCargosSummary');
    if (monthlyCargosElem) monthlyCargosElem.innerText = monthlyRoutes.length;

    // Resumo do Mês: roda sempre (independe de ter rota ativa agora), por
    // isso fica antes do "return" antecipado de quando não há rota ativa.
    let entregasConcluidasMes = 0;
    let entregasTotaisMes = 0;
    let kmEstimadoMes = 0;
    monthlyRoutes.forEach(r => {
        const entregas = window.obterParadasValidas ? window.obterParadasValidas(r.stops) : (r.stops || []);
        entregasConcluidasMes += entregas.filter(s => s.concluido).length;
        entregasTotaisMes += entregas.length;
        kmEstimadoMes += entregas.length * 45;
    });
    const taxaConclusaoMes = entregasTotaisMes > 0 ? Math.round((entregasConcluidasMes / entregasTotaisMes) * 100) : 0;

    const monthlyDeliveriesElem = document.getElementById('driverMonthlyDeliveries');
    const monthlyRateElem = document.getElementById('driverMonthlyRate');
    const monthlyKmElem = document.getElementById('driverMonthlyKm');
    if (monthlyDeliveriesElem) monthlyDeliveriesElem.innerText = entregasConcluidasMes;
    if (monthlyRateElem) monthlyRateElem.innerText = `${taxaConclusaoMes}%`;
    if (monthlyKmElem) monthlyKmElem.innerText = `${kmEstimadoMes.toLocaleString('pt-BR')} km`;

    const historyListElem = document.getElementById('driverHistoryList');
    if (historyListElem) {
        const rotasConcluidas = myRoutes
            .filter(r => r.status === 'archived' && r.finishedAt)
            .sort((a, b) => b.finishedAt - a.finishedAt)
            .slice(0, 5);

        if (rotasConcluidas.length === 0) {
            historyListElem.innerHTML = `<p class="text-xs text-slate-500 italic p-3 text-center bg-slate-50 rounded-xl border border-slate-100">Nenhuma rota concluída no histórico ainda.</p>`;
        } else {
            historyListElem.innerHTML = rotasConcluidas.map(r => {
                const entregas = window.obterParadasValidas ? window.obterParadasValidas(r.stops) : (r.stops || []);
                const dataFmt = window.formatarDataHora ? window.formatarDataHora(r.finishedAt) : new Date(r.finishedAt).toLocaleDateString('pt-BR');
                return `
                    <div class="flex items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <div class="min-w-0 flex-1">
                            <p class="text-xs font-bold text-slate-700 truncate">${r.numeroCarga ? `Carga: ${r.numeroCarga}` : 'Rota concluída'}</p>
                            <p class="text-[11px] text-slate-400">${dataFmt}</p>
                        </div>
                        <span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 shrink-0">${entregas.length} cidade(s)</span>
                    </div>
                `;
            }).join('');
        }
    }

    const noRouteDiv = document.getElementById('driverNoRoute');
    const activeRouteDiv = document.getElementById('driverActiveRoute');
    
    if (activeRoutes.length === 0) {
        if (noRouteDiv) noRouteDiv.classList.remove('hidden');
        if (activeRouteDiv) activeRouteDiv.classList.add('hidden');
        const daysSummary = document.getElementById('driverDaysSummary');
        const kmSummary = document.getElementById('driverKmSummary');
        if (daysSummary) daysSummary.innerText = "0 dias";
        if (kmSummary) kmSummary.innerText = "-- km";
        return;
    }

    const activeRoute = activeRoutes.sort((a,b) => b.createdAt - a.createdAt)[0];
    if (noRouteDiv) noRouteDiv.classList.add('hidden');
    if (activeRouteDiv) activeRouteDiv.classList.remove('hidden');

    const startMs = activeRoute.startedAt || activeRoute.createdAt;
    const diffDays = Math.max(1, Math.ceil((Date.now() - startMs) / (1000 * 60 * 60 * 24)));
    const daysSummary = document.getElementById('driverDaysSummary');
    if (daysSummary) daysSummary.innerText = `${diffDays} dia(s)`;

    const entregas = window.obterParadasValidas ? window.obterParadasValidas(activeRoute.stops) : activeRoute.stops;
    
    const totalStopsCount = entregas.length;
    const kmSummary = document.getElementById('driverKmSummary');
    if (kmSummary) kmSummary.innerText = totalStopsCount > 0 ? `~${totalStopsCount * 45} km` : "-- km";

    const totalCidades = entregas.length;
    const concluidasCidades = entregas.filter(s => s.concluido).length;
    const percent = totalCidades > 0 ? Math.round((concluidasCidades / totalCidades) * 100) : 0;

    const cargoDisplay = document.getElementById('driverCargoNumberDisplay');
    if (cargoDisplay) {
        if (activeRoute.numeroCarga) {
            cargoDisplay.innerHTML = `<i class="fa-solid fa-barcode text-xs mr-1"></i> Carga: ${activeRoute.numeroCarga}`;
            cargoDisplay.classList.remove('hidden');
        } else {
            cargoDisplay.classList.add('hidden');
        }
    }

    const progressBadge = document.getElementById('driverProgressBadge');
    const progressBar = document.getElementById('driverProgressBar');
    if (progressBadge) progressBadge.innerText = `${concluidasCidades}/${totalCidades} (${percent}%)`;
    if (progressBar) progressBar.style.width = `${percent}%`;

    const startTimeElem = document.getElementById('driverStartTime');
    const endTimeElem = document.getElementById('driverEndTime');
    if (startTimeElem) startTimeElem.innerText = window.formatarDataHora ? window.formatarDataHora(activeRoute.startedAt || activeRoute.createdAt) : '-';
    if (endTimeElem) {
        endTimeElem.innerText = activeRoute.finishedAt 
            ? (window.formatarDataHora ? window.formatarDataHora(activeRoute.finishedAt) : '-') 
            : (concluidasCidades === totalCidades && totalCidades > 0 
                ? (window.formatarDataHora ? window.formatarDataHora(Date.now()) : '-') 
                : 'Em andamento');
    }

    const list = document.getElementById('driverStopsList');
    if (!list) return;
    list.innerHTML = '';

    entregas.forEach((stop, index) => {
        const isFirst = (index === 0);
        const isLast = (index === entregas.length - 1);
        const textoExibicao = stop.texto || stop.textoOriginal;
        
        let badgeContent = isFirst ? '<i class="fa-solid fa-play text-xs"></i>' : isLast ? '<i class="fa-solid fa-flag-checkered text-xs"></i>' : index + 1;

        const div = document.createElement('div');
        div.className = `p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${stop.concluido ? 'bg-emerald-50/70 border-emerald-200' : 'bg-white border-slate-200 shadow-sm'}`;

        div.innerHTML = `
            <div class="flex items-center gap-3 min-w-0 flex-1">
                <span class="w-8 h-8 rounded-full ${stop.concluido ? 'bg-emerald-500' : isFirst ? 'bg-emerald-600' : isLast ? 'bg-rose-600' : 'bg-slate-700'} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                    ${stop.concluido ? '<i class="fa-solid fa-check text-sm"></i>' : badgeContent}
                </span>
                <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold ${stop.concluido ? 'line-through text-emerald-800' : 'text-slate-800'} truncate">${textoExibicao}</p>
                    <span class="text-xs ${stop.concluido ? 'text-emerald-600 font-bold' : 'text-slate-400'} font-medium">
                        ${stop.concluido ? '✓ Concluído' : isFirst ? 'Início da Rota' : isLast ? 'Fim da Rota' : 'Entrega'}
                    </span>
                </div>
            </div>
            <button onclick="toggleStopStatus('${activeRoute.id}', ${stop.originalIndex ?? index}, ${stop.concluido})" class="shrink-0 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${stop.concluido ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200'}">
                <i class="fa-solid ${stop.concluido ? 'fa-undo' : 'fa-check'} text-sm"></i>
                <span>${stop.concluido ? 'Desfazer' : 'Concluir'}</span>
            </button>
        `;
        list.appendChild(div);
    });
};

window.toggleStopStatus = async (routeId, stopIndex, currentStatus) => {
    const route = allRoutes.find(r => r.id === routeId);
    if (!route) return;

    if (window.vibrarDispositivo) window.vibrarDispositivo([100, 30, 100]);

    const newStops = [...route.stops];
    newStops[stopIndex].concluido = !currentStatus;

    const entregas = window.obterParadasValidas ? window.obterParadasValidas(newStops) : newStops;
    const todasConcluidas = entregas.length > 0 && entregas.every(s => s.concluido);
    const nowTime = Date.now();
    const finishedAtTime = todasConcluidas ? nowTime : null;

    if (useFirebase) {
        await db.from('routes').update({
            stops: newStops,
            finishedAt: finishedAtTime,
            startedAt: route.startedAt || route.createdAt
        }).eq('id', routeId);
    } else {
        const routes = LocalDb.get('routes');
        const idx = routes.findIndex(r => r.id === routeId);
        if (idx !== -1) { 
            routes[idx].stops = newStops; 
            routes[idx].finishedAt = finishedAtTime;
            if (!routes[idx].startedAt) routes[idx].startedAt = routes[idx].createdAt;
            LocalDb.set('routes', routes); 
        }
    }

    if (!currentStatus) {
        if (typeof notificationSound !== 'undefined' && notificationSound && typeof notificationSound.play === 'function') {
            notificationSound.play().catch(e => {});
        }
        const stopName = newStops[stopIndex].texto || 'Parada';
        if (window.enviarNotificacaoLocal) {
            window.enviarNotificacaoLocal("Parada Concluída!", `${route.driverName} concluiu: ${stopName}`);
        }
    }
};