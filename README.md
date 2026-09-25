# 🚚 RUNElog — Plataforma SaaS de Gestão de Rotas

O **RUNElog** é uma aplicação web progressiva (PWA) multi-tenant para gestão de rotas e entregas
em tempo real. A plataforma é operada pelo **RUNEmaster** (painel do dono do SaaS), que cadastra
empresas clientes e libera funcionalidades por plano; cada empresa cliente (ex.: **Fibrasol**, a
primeira cadastrada) opera seu próprio painel administrativo, motoristas e representantes de forma
isolada das demais.

---

## 📌 Estrutura de Papéis (Roles)

### 👑 RUNEmaster (dono da plataforma)
* **Cadastro de Empresas:** Razão Social, CNPJ (com validação de dígitos verificadores) e endereço
  completo com autopreenchimento via ViaCEP a partir do CEP.
* **Planos & Assinatura:** Seletor de plano (Básico / Profissional / Corporativo / Personalizado)
  com valor e ciclo de cobrança editáveis por empresa, e card de resumo da assinatura contratada.
* **Liberação de Funções:** Ativa ou desativa módulos (Fretes Terceirizados, Rotas e Produtos)
  individualmente por empresa — o item some do menu do cliente quando desligado.
* **Métricas Gerais:** Visão agregada de todas as empresas (motoristas, rotas ativas, rotas
  concluídas no mês).
* Login isolado em tabela própria (`master_users`), sem qualquer vínculo com os dados dos clientes.

### 👨‍💼 Painel Admin (por empresa cliente)
* **Gestão de Rotas:** Importação automática de itinerários via links do Google Maps ou listas de endereços.
* **Atribuição Dinâmica:** Envio imediato de cargas para motoristas e vínculo de representantes para acompanhamento.
* **Histórico e Relatórios:** Agrupamento de cargas finalizadas por mês, métricas de cidades atendidas e estatísticas de desempenho individual.
* **Gestão de Acessos:** Cadastro, alteração de credenciais/PINs e controle de sessões para Admins, Motoristas e Representantes da própria empresa.
* Só enxerga e opera sobre os dados da própria empresa (isolamento por `companyId`).

### 🚛 Painel do Motorista
* **Acompanhamento Passo a Passo:** Checklist dinâmico das paradas da rota com atualização em tempo real.
* **Integração GPS:** Botão direto para navegação via Google Maps.
* **Modo Resumo:** Estatísticas rápidas de quilometragem estimada, dias de viagem e cargas concluídas no mês.

### 💼 Painel do Representante
* **Acompanhamento de Cargas:** Busca rápida por número de carga ou motorista para adicionar itinerários ao painel de monitoramento.
* **Status em Tempo Real:** Visualização do progresso das entregas por cidade e histórico de cargas concluídas.

---

## 🚀 Tecnologias Utilizadas

* **Frontend:** HTML5, Tailwind CSS (via CDN), Font Awesome — sem bundler/build step.
* **Backend & Banco de Dados:** [Supabase](https://supabase.com) (Postgres + Realtime), com fallback
  inteligente para LocalStorage quando offline.
* **Arquitetura PWA:** Service Worker (`sw.js`) para suporte a instalação mobile e funcionamento otimizado.
* **Hospedagem:** GitHub Pages (ou qualquer host de arquivos estáticos).

---

## 🗄️ Configuração do Backend (Supabase)

1. Crie um projeto em [supabase.com](https://supabase.com) e pegue a **URL** e a **anon/publishable key**
   em *Project Settings → API*.
2. Preencha essas credenciais em [`js/config/supabase-config.js`](js/config/supabase-config.js).
3. No **SQL Editor** do Supabase, rode nesta ordem:
   - [`supabase/schema.sql`](supabase/schema.sql) — cria todas as tabelas (`admins`, `drivers`,
     `representatives`, `routes`, `settings`, `companies`, `master_users`), habilita Row Level
     Security com política de acesso aberto (equivalente ao Firestore em modo teste) e liga o
     Realtime. Idempotente — pode rodar de novo sem erro.
   - [`supabase/backfill-fibrasol.sql`](supabase/backfill-fibrasol.sql) — roda **uma única vez**,
     cria a empresa "Fibrasol" e vincula a ela os dados já existentes, além de criar um login
     RUNEmaster de teste (`master` / `9090` — troque depois).

⚠️ **Nota de segurança consciente:** o isolamento de dados entre empresas é feito por filtro
`companyId` nas consultas do client, não por política de Row Level Security no banco (a anon key
tem acesso de leitura/escrita a todas as tabelas). Isso é aceitável para o estágio atual do
produto, mas antes de operar dados sensíveis de clientes reais em produção, vale evoluir para
Supabase Auth + RLS por tenant.

---

## 📋 Histórico de Versões (Patch Notes)

Consulte [`patch-notes.json`](patch-notes.json) para o histórico completo e atualizado — ele é
carregado dinamicamente pelo próprio app (modal de Configurações → Notas da Versão).

---

## 📱 Como Instalar como PWA no Celular

### Android (Chrome)
1. Acesse o link da aplicação no Chrome.
2. Toque nos três pontos (**⋮**) no canto superior direito.
3. Selecione **"Adicionar à tela inicial"** ou **"Instalar aplicativo"**.

### iPhone (Safari)
1. Acesse o link da aplicação no Safari.
2. Toque no botão de **Compartilhar** no rodapé.
3. Role e selecione **"Adicionar à Tela de Início"**.

---

Desenvolvido pela **RUNEbyte** • *RUNElog — Conectando Rotas e Destinos*
