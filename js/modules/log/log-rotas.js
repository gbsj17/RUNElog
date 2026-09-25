// ----------------------------------------------------
        // TODO: BLOCO 7.3-5: GERENCIAMENTO E CRIAÇÃO DE ROTAS
        // ----------------------------------------------------

        // ----------------------------------------------------
        // TODO: BLOCO 7.3-5A: MODAIS DE CONFIRMAÇÃO E EXCLUSÃO
        // ----------------------------------------------------
        window.pedirConfirmacao = (titulo, mensagem, acao) => {
            document.getElementById('confirmTitle').innerText = titulo;
            document.getElementById('confirmMessage').innerText = mensagem;
            const btn = document.getElementById('confirmBtnAction');
            btn.onclick = async () => {
                await acao();
                window.fecharModalConfirmacao();
            };
            document.getElementById('confirmModal').classList.remove('hidden');
        };

        window.fecharModalConfirmacao = () => {
            document.getElementById('confirmModal').classList.add('hidden');
        };

        window.removerAdmin = (id) => {
            if (allAdmins.length <= 1) return showToast("Atenção: Não é possível remover o único administrador do sistema.", "error");
            window.pedirConfirmacao("Remover Admin", "Tem certeza que deseja remover este administrador?", async () => {
                if (useFirebase) {
                    const { error } = await db.rpc('delete_team_member', { p_role: 'admin', p_id: id });
                    if (error) return showToast("Erro ao remover administrador: " + error.message, "error");
                } else {
                    const admins = LocalDb.get('admins').filter(d => d.id !== id);
                    LocalDb.set('admins', admins);
                }
                showToast("Administrador removido", "success");
            });
        };

        window.removerMotorista = (id) => {
            window.pedirConfirmacao("Remover Motorista", "Tem certeza que deseja remover este motorista?", async () => {
                if (useFirebase) {
                    const { error } = await db.rpc('delete_team_member', { p_role: 'driver', p_id: id });
                    if (error) return showToast("Erro ao remover motorista: " + error.message, "error");
                } else {
                    const drivers = LocalDb.get('drivers').filter(d => d.id !== id);
                    LocalDb.set('drivers', drivers);
                }
                showToast("Motorista removido", "success");
                renderAdminDriversList();
            });
        };

        window.removerRepresentante = (id) => {
            window.pedirConfirmacao("Remover Representante", "Tem certeza que deseja remover este representante?", async () => {
                if (useFirebase) {
                    const { error } = await db.rpc('delete_team_member', { p_role: 'representative', p_id: id });
                    if (error) return showToast("Erro ao remover representante: " + error.message, "error");
                } else {
                    const reps = LocalDb.get('representatives').filter(r => r.id !== id);
                    LocalDb.set('representatives', reps);
                }
                showToast("Representante removido", "success");
                renderAdminRepsList();
            });
        };


        // ----------------------------------------------------
        // TODO: BLOCO 7.3-5B: PROCESSAMENTO DE URL E FORMATAÇÃO DE PARADAS
        // ----------------------------------------------------
        function extrairPontosDaUrl(url) {
            let pontos = [];
            try {
                if (url.includes('/dir/')) {
                    const trechoDir = url.split('/dir/')[1].split('/@')[0].split('?')[0];
                    const segmentos = trechoDir.split('/');
                    for (let seg of segmentos) {
                        let limpo = decodeURIComponent(seg.replace(/\+/g, ' ')).trim();
                        if (limpo && !limpo.startsWith('data=') && !limpo.startsWith('am=') && !limpo.includes('!3m')) {
                            pontos.push(limpo);
                        }
                    }
                } else if (url.includes('/place/')) {
                    const trechoPlace = url.split('/place/')[1].split('/@')[0].split('?')[0];
                    let limpo = decodeURIComponent(trechoPlace.replace(/\+/g, ' ')).trim();
                    if (limpo) pontos.push(limpo);
                }
            } catch(e) {}

            if (pontos.length === 0) {
                pontos = url.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
            }
            return pontos;
        }

        function formatarTextoParada(textoOriginal, isFirst, isLast) {
            if (!textoOriginal) return '';
            let textoLower = textoOriginal.toLowerCase();
            let ehJequie = textoLower.includes('jequié') || textoLower.includes('jequie');

            if (isFirst) {
                if (ehJequie) return "Iniciar Rota";
                else return `${textoOriginal} - Iniciar Rota`;
            } else if (isLast) {
                if (ehJequie) return "Finalizar Rota";
                else return `${textoOriginal} - Finalizar Rota`;
            }
            return textoOriginal;
        }

        function formatarDataHora(timestamp) {
            if (!timestamp) return '-';
            const d = new Date(timestamp);
            return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`;
        }


        // ----------------------------------------------------
        // TODO: BLOCO 7.3-5C: CRIAÇÃO E ATRIBUIÇÃO DE ROTAS
        // ----------------------------------------------------
        window.gerarEAtribuirRota = async () => {
            const rawInput = document.getElementById('urlInput').value.trim();
            const cargoNumber = document.getElementById('cargoNumberInput').value.trim();
            const driverNameInput = document.getElementById('selectDriverForRoute').value.trim();
            const repNameInput = document.getElementById('selectRepForRoute').value.trim();

            if (!rawInput) return showToast("Cole um link do Maps ou digite os endereços.", "error");
            if (!driverNameInput) return showToast("Selecione um motorista.", "error");

            const driver = allDrivers.find(d => d.name.toLowerCase() === driverNameInput.toLowerCase());
            if (!driver) return showToast("Motorista não encontrado cadastrado no sistema.", "error");

            const rep = repNameInput ? allReps.find(r => r.name.toLowerCase() === repNameInput.toLowerCase()) : null;

            try {
                let pontosText = extrairPontosDaUrl(rawInput);
                if (pontosText.length === 0) throw new Error("Não foi possível identificar paradas válidas.");

                const stops = pontosText.map((texto, idx) => {
                    const isFirst = (idx === 0);
                    const isLast = (idx === pontosText.length - 1);
                    return {
                        textoOriginal: texto,
                        texto: formatarTextoParada(texto, isFirst, isLast),
                        concluido: false
                    };
                });

                const nowTime = Date.now();
                const repArray = rep ? [{ id: rep.id, name: rep.name }] : [];
                const routeData = {
                    driverId: driver.id,
                    driverName: driver.name,
                    repId: rep ? rep.id : null,
                    repName: rep ? rep.name : null,
                    representantes: repArray,
                    numeroCarga: cargoNumber,
                    stops: stops,
                    rawUrl: rawInput,
                    companyId: window.currentCompanyId,
                    createdAt: nowTime,
                    startedAt: nowTime,
                    finishedAt: null,
                    status: 'active'
                };

                if (useFirebase) {
                    await db.from('routes').insert(routeData);
                } else {
                    const routes = LocalDb.get('routes');
                    routes.push({ id: `route_${Date.now()}`, ...routeData });
                    LocalDb.set('routes', routes);
                }

                if (rep) {
                    enviarNotificacaoLocal("Nova Carga Atribuída!", `Carga ${cargoNumber || ''} atribuída ao motorista ${driver.name}.`);
                }

                document.getElementById('urlInput').value = '';
                document.getElementById('cargoNumberInput').value = '';
                document.getElementById('selectDriverForRoute').value = '';
                document.getElementById('selectRepForRoute').value = '';
                showToast("Rota criada com sucesso!", "success");

                document.getElementById('searchRoutesInput')?.scrollIntoView({ behavior: 'smooth' });
                renderAdminDashboard();

            } catch (err) {
                showToast(err.message || "Erro ao processar rota", "error");
            }
        };


        // ---------------------------------------------------------
        // TODO: BLOCO 7.3-5D: GESTÃO DE VÍNCULOS COM REPRESENTANTES
        // ---------------------------------------------------------
        window.abrirModalEnviarRep = (routeId) => {
            const container = document.getElementById('checkboxRepsContainer');
            const route = allRoutes.find(r => r.id === routeId);
            const currentReps = route?.representantes || (route?.repName ? [{id: route.repId, name: route.repName}] : []);

            if (container) {
                container.innerHTML = '';
                if (allReps.length === 0) {
                    container.innerHTML = `<p class="text-xs text-slate-500 italic">Nenhum representante cadastrado.</p>`;
                } else {
                    allReps.forEach(r => {
                        const isChecked = currentReps.some(cr => cr.name.toLowerCase() === r.name.toLowerCase());
                        const label = document.createElement('label');
                        label.className = "flex items-center gap-2.5 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors";
                        label.innerHTML = `
                            <input type="checkbox" value="${r.name}" data-id="${r.id}" ${isChecked ? 'checked' : ''} class="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4">
                            <span class="text-xs font-bold text-slate-800">${r.name}</span>
                        `;
                        container.appendChild(label);
                    });
                }
            }
            document.getElementById('targetRouteIdForRep').value = routeId;
            document.getElementById('modalAssignRep').classList.remove('hidden');
        };

        window.fecharModalAssignRep = () => {
            document.getElementById('modalAssignRep').classList.add('hidden');
        };

        window.salvarRepresentantesRota = async () => {
            const routeId = document.getElementById('targetRouteIdForRep').value;
            const checkboxes = document.querySelectorAll('#checkboxRepsContainer input[type="checkbox"]:checked');
            
            let selectedReps = [];
            checkboxes.forEach(chk => {
                selectedReps.push({ id: chk.getAttribute('data-id'), name: chk.value });
            });

            const primaryRep = selectedReps.length > 0 ? selectedReps[0] : null;

            if (useFirebase) {
                await db.from('routes').update({
                    repId: primaryRep ? primaryRep.id : null,
                    repName: primaryRep ? primaryRep.name : null,
                    representantes: selectedReps
                }).eq('id', routeId);
            } else {
                const routes = LocalDb.get('routes');
                const idx = routes.findIndex(r => r.id === routeId);
                if (idx !== -1) {
                    routes[idx].repId = primaryRep ? primaryRep.id : null;
                    routes[idx].repName = primaryRep ? primaryRep.name : null;
                    routes[idx].representantes = selectedReps;
                    LocalDb.set('routes', routes);
                }
            }

            window.fecharModalAssignRep();
            showToast(selectedReps.length > 0 ? `Rota vinculada a ${selectedReps.length} representante(s)!` : "Vínculos com representantes removidos.", "success");
        };

        window.abrirModalListaRepresentantes = (routeId) => {
            const route = allRoutes.find(r => r.id === routeId);
            if (!route) return;

            const repsList = route.representantes && route.representantes.length > 0 
                ? route.representantes 
                : (route.repName ? [{id: route.repId, name: route.repName}] : []);

            const container = document.getElementById('modalMultiRepsList');
            if (container) {
                container.innerHTML = '';
                if (repsList.length === 0) {
                    container.innerHTML = `<p class="text-xs text-slate-500 italic">Nenhum representante vinculado a esta carga.</p>`;
                } else {
                    repsList.forEach(r => {
                        const div = document.createElement('div');
                        div.className = "flex items-center gap-3 p-3 rounded-xl bg-purple-50 border border-purple-100";
                        div.innerHTML = `
                            <div class="w-8 h-8 rounded-full bg-purple-200 text-purple-800 flex items-center justify-center font-bold text-xs">
                                <i class="fa-solid fa-briefcase"></i>
                            </div>
                            <span class="text-sm font-bold text-purple-900">${r.name}</span>
                        `;
                        container.appendChild(div);
                    });
                }
            }
            document.getElementById('modalMultiReps')?.classList.remove('hidden');
        };

        window.fecharModalMultiReps = () => {
            document.getElementById('modalMultiReps')?.classList.add('hidden');
        };

        // ----------------------------------------------------------------------
        // TODO: BLOCO 7.3-5E: RENDERIZAÇÃO, ARQUIVAMENTO E VISUALIZAÇÃO DE ROTAS
        // ----------------------------------------------------------------------
        // ----------------------------------------------------------------------
        // TODO: BLOCO 7.3-5E1: RENDERIZAÇÃO DE ROTAS ATIVAS
        // ----------------------------------------------------------------------
        window.renderAdminRoutesList = () => {
            const list = document.getElementById('adminRoutesList');
            const summaryText = document.getElementById('adminActiveCountSummary');
            const searchTerm = (document.getElementById('searchRoutesInput')?.value || '').toLowerCase().trim();
            if (!list) return;
            list.innerHTML = '';
            
            let activeRoutes = allRoutes.filter(r => r.status === 'active').sort((a,b) => b.createdAt - a.createdAt);

            if (summaryText) {
                summaryText.innerText = `Total de ${activeRoutes.length} carga(s) ativa(s) no momento`;
            }

            if (searchTerm) {
                activeRoutes = activeRoutes.filter(r => {
                    const matchDriver = (r.driverName || '').toLowerCase().includes(searchTerm);
                    const matchRep = (r.repName || '').toLowerCase().includes(searchTerm) || (r.representantes || []).some(x => x.name.toLowerCase().includes(searchTerm));
                    const matchCarga = (r.numeroCarga || '').toLowerCase().includes(searchTerm);
                    const matchStops = r.stops?.some(s => (s.texto || s.textoOriginal || '').toLowerCase().includes(searchTerm));
                    return matchDriver || matchRep || matchCarga || matchStops;
                });
            }

            if (activeRoutes.length === 0) {
                list.innerHTML = `<p class="text-sm text-slate-500 italic p-3">Nenhuma rota ativa encontrada.</p>`;
                return;
            }

            activeRoutes.forEach(route => {
                const entregas = window.obterParadasValidas(route.stops);
                const totalCidades = entregas.length;
                const concluidasCidades = entregas.filter(s => s.concluido).length;
                const percent = totalCidades > 0 ? Math.round((concluidasCidades / totalCidades) * 100) : 0;
                
                let mapsHref = "https://www.google.com/maps";
                if (route.rawUrl && route.rawUrl.trim() !== '') {
                    let link = route.rawUrl.trim();
                    if (link.startsWith('http://') || link.startsWith('https://')) {
                        mapsHref = link;
                    } else {
                        mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(link)}`;
                    }
                }

                const div = document.createElement('div');
                div.className = "bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3";
                div.innerHTML = `
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div class="space-y-1">
                            <div class="flex items-center gap-2 flex-wrap">
                                <p class="font-bold text-slate-800 text-sm flex items-center gap-1.5"><i class="fa-solid fa-truck text-emerald-500"></i> ${route.driverName}</p>
                                ${route.numeroCarga ? `<span class="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-md border border-emerald-100 whitespace-nowrap inline-flex items-center gap-1"><i class="fa-solid fa-barcode text-[10px]"></i>Carga: ${route.numeroCarga}</span>` : ''}
                            </div>
                            <p class="text-xs text-slate-500">Início: ${formatarDataHora(route.startedAt || route.createdAt)} • ${totalCidades} cidades</p>
                        </div>
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <a href="${mapsHref}" target="_blank" class="flex-1 sm:flex-initial text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-lg transition-all font-medium flex items-center justify-center gap-1 whitespace-nowrap">
                                <i class="fa-solid fa-map-location-dot text-xs"></i> Maps
                            </a>
                            <button onclick="abrirModalEnviarRep('${route.id}')" class="flex-1 sm:flex-initial text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-lg transition-all font-medium flex items-center justify-center gap-1 whitespace-nowrap">
                                <i class="fa-solid fa-paper-plane text-xs"></i> Enviar Rep
                            </button>
                            <button onclick="visualizarRotaAdmin('${route.id}')" class="flex-1 sm:flex-initial text-xs text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-lg transition-all font-medium flex items-center justify-center gap-1 whitespace-nowrap">
                                <i class="fa-solid fa-eye text-xs"></i> Visualizar
                            </button>
                            <button onclick="encerrarRotaAdmin('${route.id}')" class="flex-1 sm:flex-initial text-xs text-rose-500 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-lg transition-all font-medium flex items-center justify-center gap-1 whitespace-nowrap">
                                Encerrar
                            </button>
                        </div>
                    </div>
                    <div>
                        <div class="flex items-center justify-between text-xs font-semibold mb-1">
                            <span class="text-slate-600">Progresso</span>
                            <span class="text-emerald-600">${concluidasCidades}/${totalCidades} (${percent}%)</span>
                        </div>
                        <div class="w-full bg-slate-100 rounded-full h-1.5">
                            <div class="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style="width: ${percent}%"></div>
                        </div>
                    </div>
                `;
                list.appendChild(div);
            });
        };

        // --------------------------------------------------------------------
        // TODO: BLOCO 7.3-5E2: RENDERIZAÇÃO DE ROTAS ARQUIVADAS E RESUMO MENSAL
        // --------------------------------------------------------------------
        window.renderAdminArchivedRoutesList = () => {
            const list = document.getElementById('adminArchivedRoutesList');
            const summaryContainer = document.getElementById('adminArchivedSummary');
            const searchTerm = (document.getElementById('searchArchivedRoutesInput')?.value || '').toLowerCase().trim();
            
            if (!list || !summaryContainer) return;

            let archivedRoutes = allRoutes.filter(r => r.status === 'archived').sort((a,b) => (b.finishedAt || b.createdAt) - (a.finishedAt || a.createdAt));

            let monthlyCounts = {};
            archivedRoutes.forEach(r => {
                const dateObj = new Date(r.finishedAt || r.createdAt);
                const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                monthlyCounts[capitalized] = (monthlyCounts[capitalized] || 0) + 1;
            });

            summaryContainer.innerHTML = '';
            const monthsKeys = Object.keys(monthlyCounts);
            if (monthsKeys.length === 0) {
                summaryContainer.innerHTML = `<div class="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-500 col-span-3 text-center">Nenhum mês registrado com cargas finalizadas.</div>`;
            } else {
                monthsKeys.forEach(mKey => {
                    const cardM = document.createElement('div');
                    cardM.className = "bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between";
                    cardM.innerHTML = `
                        <div>
                            <p class="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">${mKey}</p>
                            <p class="text-sm font-extrabold text-emerald-900">${monthlyCounts[mKey]} Carga(s) Entregue(s)</p>
                        </div>
                        <div class="w-8 h-8 rounded-lg bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold">
                            <i class="fa-solid fa-calendar-days"></i>
                        </div>
                    `;
                    summaryContainer.appendChild(cardM);
                });
            }

            if (searchTerm) {
                archivedRoutes = archivedRoutes.filter(r => {
                    const matchDriver = (r.driverName || '').toLowerCase().includes(searchTerm);
                    const matchRep = (r.repName || '').toLowerCase().includes(searchTerm);
                    const matchCarga = (r.numeroCarga || '').toLowerCase().includes(searchTerm);
                    return matchDriver || matchRep || matchCarga;
                });
            }

            list.innerHTML = '';
            if (archivedRoutes.length === 0) {
                list.innerHTML = `<p class="text-sm text-slate-500 italic p-3">Nenhuma rota finalizada armazenada.</p>`;
                return;
            }

            archivedRoutes.forEach(route => {
                const entregas = window.obterParadasValidas(route.stops);
                const totalCidades = entregas.length;

                const div = document.createElement('div');
                div.className = "bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3";
                div.innerHTML = `
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                        <input type="checkbox" value="${route.id}" class="checkbox-carga-finalizada rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 shrink-0">
                        <div class="space-y-1 min-w-0 flex-1">
                            <div class="flex items-center gap-2 flex-wrap">
                                <p class="font-bold text-slate-800 text-sm"><i class="fa-solid fa-truck text-emerald-600 mr-1"></i> ${route.driverName}</p>
                                ${route.numeroCarga ? `<span class="bg-slate-100 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded border border-slate-200">Carga: ${route.numeroCarga}</span>` : ''}
                            </div>
                            <p class="text-xs text-slate-400">Finalizada em: ${formatarDataHora(route.finishedAt || route.createdAt)} • Total: ${totalCidades} cidades entregues</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <button onclick="visualizarRotaAdmin('${route.id}')" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all">
                            <i class="fa-solid fa-eye mr-1"></i> Ver Detalhes
                        </button>
                    </div>
                `;
                list.appendChild(div);
            });
        };

        // --------------------------------------------------------------------
        // TODO: BLOCO 7.3-5E3: EXCLUSÃO DE CARGAS FINALIZADAS
        // --------------------------------------------------------------------
        window.apagarCargasSelecionadasAdmin = async () => {
            const checkboxes = document.querySelectorAll('.checkbox-carga-finalizada:checked');
            if (checkboxes.length === 0) {
                return showToast("Selecione ao menos uma carga na lista de finalizadas para apagar.", "error");
            }

            let idsParaApagar = [];
            let contemNaoFinalizada = false;

            checkboxes.forEach(chk => {
                const rId = chk.value;
                const rObj = allRoutes.find(r => r.id === rId);
                if (rObj) {
                    if (rObj.status !== 'archived') {
                        contemNaoFinalizada = true;
                    } else {
                        idsParaApagar.push(rId);
                    }
                }
            });

            if (contemNaoFinalizada) {
                return showToast("Atenção: O sistema exige que a carga esteja totalmente finalizada e arquivada antes de permitir a exclusão definitiva.", "error");
            }

            window.pedirConfirmacao("Apagar Cargas", `Tem certeza que deseja apagar permanentemente ${idsParaApagar.length} carga(s) selecionada(s)?`, async () => {
                if (useFirebase) {
                    await db.from('routes').delete().in('id', idsParaApagar);
                } else {
                    let routes = LocalDb.get('routes');
                    routes = routes.filter(r => !idsParaApagar.includes(r.id));
                    LocalDb.set('routes', routes);
                }
                showToast("Carga(s) excluída(s) com sucesso!", "success");
                renderAdminArchivedRoutesList();
                renderAdminDashboard();
            });
        };

        // --------------------------------------------------------------------
        // TODO: BLOCO 7.3-5E4: VISUALIZAÇÃO E ENCERRAMENTO DE ROTAS
        // --------------------------------------------------------------------
        window.visualizarRotaAdmin = (routeId) => {
            const route = allRoutes.find(r => r.id === routeId);
            if (!route) return;

            const entregas = window.obterParadasValidas(route.stops);
            const totalCidades = entregas.length;
            const concluidasCidades = entregas.filter(s => s.concluido).length;
            const percent = totalCidades > 0 ? Math.round((concluidasCidades / totalCidades) * 100) : 0;

            const isRep = (currentUserRole === 'representative');
            const primaryColorClass = 'bg-[#152e50]';
            const primaryTextClass = isRep ? 'text-slate-300' : 'text-slate-300';

            document.getElementById('modalRouteHeader').className = `${primaryColorClass} p-4 text-white flex items-center justify-between`;
            document.getElementById('modalRouteDriver').innerHTML = `<i class="fa-solid fa-truck ${primaryTextClass}"></i> ${route.driverName}`;
            document.getElementById('modalRouteSubtitle').innerText = route.numeroCarga ? `Carga: ${route.numeroCarga}${route.repName ? ' | Rep: ' + route.repName : ''} • ${totalCidades} cidades` : `${totalCidades} cidades`;

            document.getElementById('modalRouteProgressText').innerText = `${concluidasCidades} de ${totalCidades} cidades (${percent}%)`;
            document.getElementById('modalRouteProgressBar').className = `${primaryColorClass} h-2 rounded-full transition-all duration-300`;
            document.getElementById('modalRouteProgressBar').style.width = `${percent}%`;

            const stopsList = document.getElementById('modalRouteStopsList');
            stopsList.innerHTML = '';

            entregas.forEach((stop, idx) => {
                const isFirst = (idx === 0);
                const isLast = (idx === entregas.length - 1);
                const txt = stop.texto || stop.textoOriginal;

                let badgeContent = isFirst ? '<i class="fa-solid fa-play text-[10px]"></i>' : isLast ? '<i class="fa-solid fa-flag-checkered text-[10px]"></i>' : idx + 1;

                const item = document.createElement('div');
                item.className = `p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${stop.concluido ? 'bg-emerald-50/80 border-emerald-200' : 'bg-white border-slate-200 shadow-sm'}`;

                item.innerHTML = `
                    <div class="flex items-center gap-2.5 min-w-0 flex-1">
                        <span class="w-6 h-6 rounded-full ${stop.concluido ? 'bg-emerald-500' : isFirst ? primaryColorClass : isLast ? 'bg-rose-600' : 'bg-slate-700'} text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                            ${stop.concluido ? '<i class="fa-solid fa-check text-[10px]"></i>' : badgeContent}
                        </span>
                        <span class="font-medium truncate ${stop.concluido ? 'line-through text-emerald-800' : 'text-slate-800'}">${txt}</span>
                    </div>
                    <span class="px-2 py-0.5 rounded-md font-bold text-[10px] shrink-0 ${stop.concluido ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">
                        ${stop.concluido ? 'Concluída' : 'Pendente'}
                    </span>
                `;
                stopsList.appendChild(item);
            });

            document.getElementById('modalViewRoute').classList.remove('hidden');
        };

        window.fecharModalVisualizarRota = () => {
            document.getElementById('modalViewRoute').classList.add('hidden');
        };

        window.encerrarRotaAdmin = (id) => {
            window.pedirConfirmacao("Encerrar Rota", "Deseja encerrar e arquivar esta rota?", async () => {
                const nowTime = Date.now();
                if (useFirebase) {
                    await db.from('routes').update({ status: 'archived', finishedAt: nowTime }).eq('id', id);
                } else {
                    const routes = LocalDb.get('routes');
                    const idx = routes.findIndex(r => r.id === id);
                    if (idx !== -1) { routes[idx].status = 'archived'; routes[idx].finishedAt = nowTime; LocalDb.set('routes', routes); }
                }
                showToast("Rota encerrada e movida para finalizadas.", "success");
                renderAdminRoutesList();
                renderAdminArchivedRoutesList();
                renderAdminDashboard();
            });
        };  

// --------------------------------------------------------------------
// TODO: BLOCO 7.3-5E5: CONTROLE DE 3 SUB-ABAS (PRODUTOS, CIDADES, ROTAS)
// --------------------------------------------------------------------

window.alternarAbaRotasProdutos = function(aba) {
    const secoes = ['produtos', 'cidades', 'rotas'];

    secoes.forEach(s => {
        const elSecao = document.getElementById(`rotasProdSection${s.charAt(0).toUpperCase() + s.slice(1)}`);
        const btn = document.getElementById(`rotasProdTabHeader${s.charAt(0).toUpperCase() + s.slice(1)}`);

        if (elSecao) elSecao.classList.toggle('hidden', aba !== s);
        if (btn) {
            btn.className = aba === s
                ? "flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-[#152e50] text-[#fac043] shadow-sm transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                : "flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap";
        }
    });

    if (aba === 'produtos' && typeof window.renderizarTabelaProdutos === 'function') window.renderizarTabelaProdutos();
    if (aba === 'cidades' && typeof window.renderizarTabelaCidades === 'function') window.renderizarTabelaCidades();
    if (aba === 'rotas' && typeof window.renderizarTabelaRotas === 'function') window.renderizarTabelaRotas();
};

// --------------------------------------------------------------------
// TODO: BLOCO 7.3-5E6: RENDERIZAÇÃO E GESTÃO DE PRODUTOS
// --------------------------------------------------------------------
window.renderizarTabelaProdutos = function() {
    const container = document.getElementById('rotasProdSectionProdutos');
    if (!container) return;

    if (!window.produtosState) {
        window.produtosState = [
            { id: 'P1', nome: 'Tanque Polietileno 5.000L', categoria: 'Tanques', pesoMedio: '180 KG' },
            { id: 'P2', nome: 'Caixa D’Água 1.000L', categoria: 'Caixas', pesoMedio: '25 KG' }
        ];
    }

    let htmlItens = window.produtosState.map(p => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="p-3 font-bold text-[#152e50]">${p.id}</td>
            <td class="p-3 font-medium text-slate-700">${p.nome}</td>
            <td class="p-3"><span class="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">${p.categoria}</span></td>
            <td class="p-3 text-right font-mono">${p.pesoMedio}</td>
            <td class="p-3 text-center">
                <button onclick="removerProduto('${p.id}')" class="text-rose-500 hover:text-rose-700 p-1 cursor-pointer">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div class="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h3 class="font-extrabold text-slate-800 text-sm">Catálogo de Produtos</h3>
                <p class="text-xs text-slate-500 mt-0.5">Gestão de itens para cálculo de peso/cubagem</p>
            </div>
            <button onclick="abrirModalNovoProduto()" class="px-4 py-2.5 bg-[#152e50] hover:bg-[#10223d] text-[#fac043] font-extrabold rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer shrink-0">
                <i class="fa-solid fa-plus"></i> Novo Produto
            </button>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr class="bg-slate-50 text-slate-400 uppercase font-bold border-b border-slate-100 text-[10px]">
                            <th class="p-3">Código</th><th class="p-3">Nome do Produto</th><th class="p-3">Categoria</th><th class="p-3 text-right">Peso Médio</th><th class="p-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">${htmlItens}</tbody>
                </table>
            </div>
        </div>
    `;
};

// --------------------------------------------------------------------
// TODO: BLOCO 7.3-5E7: RENDERIZAÇÃO DE CIDADES E PRAÇAS
// --------------------------------------------------------------------
window.renderizarTabelaCidades = function() {
    const container = document.getElementById('rotasProdSectionCidades');
    if (!container) return;

    if (!window.cidadesState) {
        window.cidadesState = [
            { id: 'C1', nome: 'Teresina', uf: 'PI', regiao: 'Nordeste' },
            { id: 'C2', nome: 'Timon', uf: 'MA', regiao: 'Nordeste' },
            { id: 'C3', nome: 'Caxias', uf: 'MA', regiao: 'Nordeste' },
            { id: 'C4', nome: 'Fortaleza', uf: 'CE', regiao: 'Nordeste' }
        ];
    }

    let htmlCidades = window.cidadesState.map(c => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="p-3 font-bold text-[#152e50]">${c.id}</td>
            <td class="p-3 font-medium text-slate-700">${c.nome} - ${c.uf}</td>
            <td class="p-3 text-slate-500">${c.regiao}</td>
            <td class="p-3 text-center">
                <button onclick="removerCidade('${c.id}')" class="text-rose-500 hover:text-rose-700 p-1 cursor-pointer">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div class="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h3 class="font-extrabold text-slate-800 text-sm">Cidades e Praças de Atuação</h3>
                <p class="text-xs text-slate-500 mt-0.5">Cadastre destinos individuais para aglomerar nas rotas depois</p>
            </div>
            <button onclick="abrirModalNovaCidade()" class="px-4 py-2.5 bg-[#152e50] hover:bg-[#10223d] text-[#fac043] font-extrabold rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer shrink-0">
                <i class="fa-solid fa-plus"></i> Nova Cidade
            </button>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr class="bg-slate-50 text-slate-400 uppercase font-bold border-b border-slate-100 text-[10px]">
                            <th class="p-3">Código</th><th class="p-3">Cidade / UF</th><th class="p-3">Região</th><th class="p-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">${htmlCidades}</tbody>
                </table>
            </div>
        </div>
    `;
};

// --------------------------------------------------------------------
// TODO: BLOCO 7.3-5E8: RENDERIZAÇÃO E GESTÃO DE ROTAS (AGLOMERADOS)
// --------------------------------------------------------------------
window.renderizarTabelaRotas = function() {
    const container = document.getElementById('rotasProdSectionRotas');
    if (!container) return;

    if (!window.rotasState) {
        window.rotasState = [
            { id: 'R1', nome: 'Rota Piauí/Maranhão', cidades: ['Teresina-PI', 'Timon-MA', 'Caxias-MA'], distancia: '1.254 KM', status: 'Ativa' },
            { id: 'R2', nome: 'Rota Ceará Expresso', cidades: ['Fortaleza-CE', 'Caucaia-CE'], distancia: '1.100 KM', status: 'Ativa' }
        ];
    }

    let htmlRotas = window.rotasState.map(r => {
        let tagsCidades = r.cidades.map(c => `<span class="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap">${c}</span>`).join(' ');
        
        return `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="p-3 font-bold text-[#152e50]">${r.id}</td>
            <td class="p-3 font-bold text-slate-700">${r.nome}</td>
            <td class="p-3">
                <div class="flex flex-wrap gap-1.5">${tagsCidades}</div>
            </td>
            <td class="p-3 text-right font-mono">${r.distancia}</td>
            <td class="p-3 text-center"><span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">${r.status}</span></td>
        </tr>
    `}).join('');

    container.innerHTML = `
        <div class="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h3 class="font-extrabold text-slate-800 text-sm">Gestão de Rotas (Aglomerados)</h3>
                <p class="text-xs text-slate-500 mt-0.5">Agrupe cidades cadastradas para formar uma rota de entrega</p>
            </div>
            <button onclick="abrirModalNovaRota()" class="px-4 py-2.5 bg-[#152e50] hover:bg-[#10223d] text-[#fac043] font-extrabold rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer shrink-0">
                <i class="fa-solid fa-plus"></i> Nova Rota
            </button>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr class="bg-slate-50 text-slate-400 uppercase font-bold border-b border-slate-100 text-[10px]">
                            <th class="p-3 w-16">Código</th><th class="p-3 w-48">Nome da Rota</th><th class="p-3">Cidades Aglomeradas</th><th class="p-3 text-right w-24">Distância</th><th class="p-3 text-center w-20">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">${htmlRotas}</tbody>
                </table>
            </div>
        </div>
    `;
};

// --------------------------------------------------------------------
// TODO: BLOCO 7.3-5E9: MODAIS SIMPLIFICADOS
// --------------------------------------------------------------------
window.abrirModalNovoProduto = function() {
    const nome = prompt("Digite o nome do produto (ex: Tanque 3.000L):");
    if (!nome) return;
    const categoria = prompt("Digite a categoria (ex: Tanques ou Caixas):") || "Geral";
    const pesoMedio = prompt("Digite o peso médio (ex: 120 KG):") || "0 KG";

    const novoId = 'P' + (window.produtosState.length + 1);
    window.produtosState.push({ id: novoId, nome, categoria, pesoMedio });
    window.renderizarTabelaProdutos();
};

window.removerProduto = function(id) {
    if (!confirm("Deseja realmente excluir este produto?")) return;
    window.produtosState = window.produtosState.filter(p => p.id !== id);
    window.renderizarTabelaProdutos();
};

window.abrirModalNovaCidade = function() {
    const nome = prompt("Nome da Cidade:");
    if (!nome) return;
    const uf = prompt("UF (ex: BA, PI, MA):") || "BA";
    
    const novoId = 'C' + (window.cidadesState.length + 1);
    window.cidadesState.push({ id: novoId, nome, uf, regiao: 'Nordeste' });
    window.renderizarTabelaCidades();
};

window.removerCidade = function(id) {
    if (!confirm("Deseja excluir esta cidade?")) return;
    window.cidadesState = window.cidadesState.filter(c => c.id !== id);
    window.renderizarTabelaCidades();
};

window.abrirModalNovaRota = function() {
    const nome = prompt("Digite o Nome da Rota (ex: Rota Litoral Sul):");
    if (!nome) return;
    const cidadesInput = prompt("Quais cidades fazem parte dessa rota?\n(Digite separando por vírgula. Ex: Teresina-PI, Timon-MA)");
    const cidades = cidadesInput ? cidadesInput.split(',').map(c => c.trim()) : [];
    const distancia = prompt("Distância total estimada (ex: 450 KM):") || "0 KM";

    const novoId = 'R' + (window.rotasState.length + 1);
    window.rotasState.push({ id: novoId, nome, cidades, distancia, status: 'Ativa' });
    window.renderizarTabelaRotas();
};