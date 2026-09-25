// ==========================================================================
// Persistência do Importador de Cargas (import-cargas.html) no Supabase.
//
// Uma linha por carga na tabela `import_cargas` (ver
// supabase/import-cargas-migration.sql). O RLS garante que só o admin da
// empresa (ou o master) lê e grava. O localStorage fica só como cópia de
// segurança: se o Supabase falhar, a tela abre com a última cópia e as
// cargas não enviadas ficam marcadas como pendentes até o próximo salvamento.
// ==========================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../config/supabase-keys.js";

const TABELA = 'import_cargas';
const CACHE_KEY = 'runelog_import_cargas_cache';
const CACHE_LEGADO = 'fibrasol_banco_cargas'; // formato antigo, só localStorage
const LOTE_UPSERT = 50;

// Mesmo storage padrão do app principal (mesma origem), então reaproveita a
// sessão do Supabase Auth de quem está logado no RUNElog.
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let perfilCache = null;

// `cidades` é um Set em memória (a ordem de inserção é a ordem da rota);
// JSON não serializa Set, então vai e volta como array.
function paraJson(carga) {
    return { ...carga, cidades: Array.from(carga.cidades || []) };
}

function daJson(dados) {
    return { ...dados, cidades: new Set(dados.cidades || []) };
}

function lerCache() {
    try {
        return JSON.parse(localStorage.getItem(CACHE_KEY)) || { cargas: {}, pendentes: [] };
    } catch (e) {
        return { cargas: {}, pendentes: [] };
    }
}

function gravarCache(banco, pendentes) {
    try {
        const cargas = {};
        Object.keys(banco).forEach(id => { cargas[id] = paraJson(banco[id]); });
        // Guarda de qual empresa é a cópia, pra não misturar se outro admin
        // usar o mesmo navegador.
        const companyId = perfilCache ? perfilCache.companyId : lerCache().companyId;
        localStorage.setItem(CACHE_KEY, JSON.stringify({ companyId, cargas, pendentes: Array.from(pendentes) }));
    } catch (e) {
        console.warn('Não foi possível gravar a cópia local das cargas:', e);
    }
}

function lerCacheLegado() {
    try {
        const dados = JSON.parse(localStorage.getItem(CACHE_LEGADO));
        return dados && typeof dados === 'object' ? dados : null;
    } catch (e) {
        return null;
    }
}

async function obterPerfil() {
    if (perfilCache) return perfilCache;

    const { data: { session } } = await db.auth.getSession();
    if (!session) throw new Error('Sessão expirada. Entre no RUNElog novamente.');

    const { data, error } = await db.rpc('current_profile');
    if (error) throw error;

    const perfil = Array.isArray(data) ? data[0] : data;
    if (!perfil || !['admin', 'master'].includes(perfil.role)) {
        throw new Error('Apenas administradores podem usar o Importador de Cargas.');
    }
    perfilCache = perfil;
    return perfil;
}

async function upsertCargas(banco, ids) {
    const perfil = await obterPerfil();
    const linhas = ids
        .filter(id => banco[id])
        .map(id => ({
            companyId: perfil.companyId,
            numeroCarga: String(id),
            montada: banco[id].montada === true,
            dados: paraJson(banco[id])
        }));

    for (let i = 0; i < linhas.length; i += LOTE_UPSERT) {
        const { error } = await db
            .from(TABELA)
            .upsert(linhas.slice(i, i + LOTE_UPSERT), { onConflict: 'companyId,numeroCarga' });
        if (error) throw error;
    }
}

// Retorna { cargas, origem: 'supabase' | 'cache', erro? }. `cargas` já vem com
// `cidades` como Set, pronto pra ir pro bancoCargasGlobal.
export async function carregarCargas() {
    try {
        const perfil = await obterPerfil();

        let query = db.from(TABELA).select('numeroCarga, montada, dados');
        query = perfil.companyId ? query.eq('companyId', perfil.companyId) : query.is('companyId', null);
        const { data, error } = await query;
        if (error) throw error;

        const cargas = {};
        (data || []).forEach(linha => {
            cargas[linha.numeroCarga] = daJson({ ...linha.dados, montada: linha.montada });
        });

        // Envia o que ficou pendente numa sessão anterior sem conexão, e migra
        // uma única vez o banco antigo que só existia no localStorage.
        const cacheLido = lerCache();
        const mesmaEmpresa = cacheLido.companyId === undefined || cacheLido.companyId === perfil.companyId;
        const cache = mesmaEmpresa ? cacheLido : { cargas: {}, pendentes: [] };
        const legado = lerCacheLegado();
        const pendentes = new Set(cache.pendentes || []);
        (cache.pendentes || []).forEach(id => {
            if (cache.cargas[id]) cargas[id] = daJson(cache.cargas[id]);
        });
        if (legado) {
            Object.keys(legado).forEach(id => {
                if (!cargas[id]) {
                    cargas[id] = daJson(legado[id]);
                    pendentes.add(id);
                }
            });
        }

        if (pendentes.size > 0) {
            await upsertCargas(cargas, Array.from(pendentes));
        }
        if (legado) localStorage.removeItem(CACHE_LEGADO);

        gravarCache(cargas, []);
        return { cargas, origem: 'supabase' };
    } catch (erro) {
        console.error('Erro ao carregar cargas do Supabase:', erro);
        const cache = lerCache();
        const base = Object.keys(cache.cargas).length ? cache.cargas : (lerCacheLegado() || {});
        const cargas = {};
        Object.keys(base).forEach(id => { cargas[id] = daJson(base[id]); });
        return { cargas, origem: 'cache', erro };
    }
}

// Salva no Supabase as cargas de `ids` (mais qualquer pendência anterior).
// Retorna { ok, erro? }. Em caso de falha a cópia local guarda as pendências.
export async function salvarCargas(banco, ids) {
    const pendentes = new Set([...(lerCache().pendentes || []), ...ids.map(String)]);
    gravarCache(banco, pendentes);

    try {
        await upsertCargas(banco, Array.from(pendentes));
        gravarCache(banco, []);
        return { ok: true };
    } catch (erro) {
        console.error('Erro ao salvar cargas no Supabase:', erro);
        return { ok: false, erro };
    }
}
