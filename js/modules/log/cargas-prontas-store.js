// ==========================================================================
// Persistência da tabela `cargas_prontas` (ver supabase/cargas-prontas-migration.sql).
//
// Uma cotação de frete "fechada" no Gestão de Fretes Terceirizados vira uma
// linha aqui. Usa o mesmo cliente Supabase já autenticado pelo app principal
// (window.db, criado em js/config/supabase-config.js) em vez de abrir uma
// conexão nova.
// ==========================================================================

const TABELA = 'cargas_prontas';

// Salva (upsert) uma cotação fechada. `carga` é o objeto inteiro do
// fretesState.cargasAtivas - vai como está para a coluna jsonb `dados`.
export async function salvarCargaPronta(carga) {
    if (!window.db || !window.useFirebase) {
        return { ok: false, erro: new Error('Sem conexão com o Supabase no momento.') };
    }

    try {
        const linha = {
            companyId: window.currentCompanyId,
            numeroCarga: String(carga.id),
            numeroCarregamento: carga.carregamento ? String(carga.carregamento) : null,
            dados: carga
        };

        const { error } = await window.db
            .from(TABELA)
            .upsert(linha, { onConflict: 'companyId,numeroCarga' });

        if (error) throw error;
        return { ok: true };
    } catch (erro) {
        console.error('Erro ao salvar carga pronta no Supabase:', erro);
        return { ok: false, erro };
    }
}

// Lista as cargas prontas da empresa logada (usada na aba "Lançamentos & Cargas Faturadas").
export async function carregarCargasProntas() {
    if (!window.db || !window.useFirebase) return { cargas: [], erro: new Error('Sem conexão com o Supabase.') };

    try {
        let query = window.db.from(TABELA).select('numeroCarga, numeroCarregamento, dados, createdAt');
        query = window.currentCompanyId ? query.eq('companyId', window.currentCompanyId) : query.is('companyId', null);
        const { data, error } = await query.order('createdAt', { ascending: false });
        if (error) throw error;
        // `_createdAt` vai junto do snapshot pra dar pra filtrar por mês nas
        // métricas (mês em que a cotação foi fechada), sem mexer no formato
        // que o resto da tela já espera de "dados".
        return { cargas: (data || []).map(linha => ({ ...linha.dados, _createdAt: linha.createdAt })), erro: null };
    } catch (erro) {
        console.error('Erro ao carregar cargas prontas do Supabase:', erro);
        return { cargas: [], erro };
    }
}
