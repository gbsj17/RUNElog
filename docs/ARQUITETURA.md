# Arquitetura do RUNElog (pós-migração Supabase + RUNEmaster)

Este documento descreve como o backend e o modelo multi-tenant funcionam por baixo do capô,
para quem for dar manutenção no projeto depois. Não é documentação de usuário — isso fica no
[README.md](../README.md).

## 1. Stack e padrão de código

- Sem build step: tudo é HTML/CSS/JS puro, `<script type="module">` carregado direto pelo
  navegador. Bibliotecas (Tailwind, Supabase JS, Leaflet, xlsx) vêm de CDN.
- Módulos ES compartilham estado global via `window.*` em vez de `import`/`export` entre si.
  Um identificador solto (`db`, `appId`, `useFirebase`, `allDrivers`...) referenciado sem
  `window.` funciona porque a resolução de escopo do JS cai pro objeto global — mas só se o
  módulo que o define (`js/config/supabase-config.js`) já rodou antes. A ordem dos `<script>`
  em [`index.html`](../index.html) importa.
- `js/config/supabase-config.js` é o único arquivo que sabe falar com o Supabase diretamente
  (client, realtime). Todo o resto usa `window.db.from(...)` e `window.subscribeTable(...)`.

## 2. Modelo de dados

Tabelas (ver [`supabase/schema.sql`](../supabase/schema.sql) para o DDL completo):

| Tabela | Escopo | Descrição |
|---|---|---|
| `master_users` | Global | Login do dono da plataforma (RUNEmaster). Isolado, não tem `companyId`. |
| `companies` | Global (só master lê/escreve sem filtro) | Uma linha por empresa cliente: identidade (nome, razão social, CNPJ, endereço), `status` (active/suspended), `plan`, `planValue`, `billingCycle` e `features` (jsonb com flags de módulo). |
| `admins` | Por empresa | Usuários "logística" de uma empresa — o antigo papel único da Fibrasol. |
| `drivers` | Por empresa | Motoristas. |
| `representatives` | Por empresa | Representantes comerciais. |
| `routes` | Por empresa | Cargas/rotas, com `stops` e `representantes` como colunas `jsonb`. |
| `settings` | Legado | Doc único de fallback do admin padrão (pré-Supabase); baixo uso hoje. |

Todas as tabelas "por empresa" têm uma coluna `companyId` (uuid, FK pra `companies.id`). Uma
linha sem `companyId` (ex.: dados anteriores à migração multi-tenant que não passaram pelo
backfill) fica "órfã" e não aparece pra nenhum admin de empresa — só o master a vê, sem filtro.

**Isolamento de tenant é feito no client, não no banco.** As policies de RLS são
`for all using (true)` (acesso aberto pra anon key). Ver a nota de segurança no README.

## 3. Fluxo de login (`js/auth/auth.js`)

`realizarLoginUnificado` tenta, em sequência, até achar um usuário com nome+PIN batendo:

1. **Backdoor de emergência** (`gbsj17`/`1234` ou `adm_gbsj17`/`admin`) — vira `admin` da empresa
   que tiver um registro com esse nome em `admins` (consulta rápida por `companyId`); se não achar
   nenhuma, fica sem empresa (`currentCompanyId = null`, enxerga tudo — só deve acontecer antes de
   qualquer backfill rodar).
2. `master_users` — vira role `master`, abre o RUNEmaster.
3. `admins` — vira role `admin`, guarda `companyId` do registro, carrega `companyFeatures` da
   empresa (pra esconder itens de menu desligados).
4. `drivers` — vira role `driver`, guarda `companyId`.
5. `representatives` — vira role `representative`, guarda `companyId`.
6. Fallback pros arrays locais (`window.allAdmins` etc.) quando offline/`useFirebase` é falso.

A sessão persiste em `localStorage.app_session` como
`{ role, driverId, repId, companyId }`. Ao restaurar sessão (`app.js:verificarSessaoSalva`), o
`companyId` volta do localStorage e, pra admin, `companyFeatures` é recarregado do Supabase antes
de abrir o painel — sem isso, o gating de menu ficaria destravado até o próximo login manual.

## 4. Tempo real (`window.subscribeTable`)

Substitui o `onSnapshot` do Firestore. Assinatura:

```js
window.subscribeTable(table, callback, filters)
```

- Faz um `select('*')` inicial (com `.eq()` pra cada chave de `filters` que não for `null`/`undefined`)
  e chama `callback(rows)`.
- Assina um canal Realtime do Supabase (`postgres_changes`, evento `*`) com nome **único por
  chamada** (`table-<nome>-<contador>`) — importante: nomes fixos colidem quando a mesma tabela é
  assinada mais de uma vez (ex.: um listener geral + um do painel específico), e o Supabase lança
  erro ao tentar reusar um canal já inscrito.
- A cada mudança, refaz o `select('*')` inteiro e chama `callback` de novo (sempre entrega o
  snapshot completo, nunca um diff) — mais simples e menos propenso a bugs de patch incremental,
  ao custo de reconsultar a tabela inteira a cada evento (aceitável no volume atual de dados).
- `filters` com `companyId: window.currentCompanyId` é o padrão usado por admin/driver/rep. O
  master chama sem `filters` (ou com `companyId: null`), então não filtra nada.

## 5. Gating de funcionalidade por empresa

`window.companyFeatures` (carregado no login) é um objeto tipo `{ fretes: true, rotasProdutos: false }`.
`window.aplicarFeaturesDaEmpresa()` ([`js/modules/log/log-core.js`](../js/modules/log/log-core.js))
esconde/mostra `#nav-fretes` e `#nav-rotas-produtos` no sidebar do admin.

**Cuidado:** `window.alternarAbalog(tab)` (troca de aba do admin) reescreve o `className` inteiro
dos botões do sidebar a cada clique — por isso `aplicarFeaturesDaEmpresa()` é chamado de novo no
final de `alternarAbalog`, não só uma vez no login. Se um novo botão de sidebar for adicionado e
tiver sua visibilidade controlada por feature flag, replicar esse mesmo cuidado.

## 6. RUNEmaster (`js/modules/admin/admin-*.js`)

Três arquivos que existiam vazios no projeto (indício de que o multi-tenant já era planejado)
viraram o núcleo do painel do master:

- **`admin-dashboard.js`** — `iniciarPainelMaster`, `alternarAbaMaster` (troca as 3 abas + a
  bottom nav mobile), `alternarModoSidebarMaster` (colapsar sidebar, mesmo padrão do admin) e
  `renderMasterMetrics` (métricas agregadas, sem filtro de `companyId`).
- **`admin-tenants.js`** — cadastro completo de empresa (máscaras de CNPJ/CEP, validação de CNPJ,
  integração ViaCEP) e `renderCompaniesList`/`alternarStatusEmpresa` (suspender é soft-delete via
  `status`, nunca apaga a linha).
- **`admin-planos.js`** — catálogo de planos (`PLANOS_CATALOGO`, só sugestão de valor/módulos,
  tudo editável depois), checkboxes de feature flag, campos de valor/ciclo e o card de resumo da
  assinatura — tudo derivado de `companies.features`/`plan`/`planValue`/`billingCycle`, sem
  estrutura de dados paralela.

## 7. Onde mexer para adicionar uma nova feature flag

1. Adicionar a chave em `PLANOS_CATALOGO[*].features` (`admin-tenants.js`) e em
   `FEATURES_DISPONIVEIS` (`admin-planos.js`) — isso já cobre o checkbox na aba Funções & Planos
   e a sugestão no cadastro.
2. Adicionar o `#nav-<algo>` correspondente no sidebar do admin e um `if` em
   `aplicarFeaturesDaEmpresa()` (`log-core.js`) escondendo esse item quando a flag for `false`.
3. Não é necessário mexer em schema — `features` é `jsonb`, aceita chaves novas sem migração.
