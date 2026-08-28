# 📋 Diretrizes de Desenvolvimento — Samukas Burguer

Este documento define as regras estritas e padrões de operação para o projeto **Samukas Burguer** na integração com o **Supabase** e o **n8n**.

---

## 1. 🗄️ Supabase (Banco de Dados)

* **Escopo Estrito de Tabelas:** Utilizar **EXCLUSIVAMENTE** tabelas que possuem o prefixo `samukas` (ex: `samukas_leads`, `samukas_vendas`, `samukas_mensagens`).
* **Regra de Exclusão:** **IGNORAR COMPLETAMENTE** qualquer outra tabela existente no banco que não pertença ao contexto do Samukas Burguer (ex: `clientes`, `kanban_*`, `financeiro_*`, etc.).

---

## 2. ⚡ n8n (Automações e Workflows)

* **Escopo Estrito de Workflows:** Considerar e manipular **APENAS** as automações/workflows que contenham o termo `"Samukas"` no nome (ex: `🟢Sync Saipos (Samukas)`).
* **Regra de Exclusão:** **IGNORAR COMPLETAMENTE** automações relativas a outros clientes ou projetos da conta.

### 🟡 / 🟢 Padronização de Nomenclatura e Status de Workflows

Sempre que formos criar ou atualizar automações no n8n, devemos seguir o ciclo de vida do emoji no título:

1. **Em Desenvolvimento / Nova Automação:**
   * Usar obrigatoriamente o emoji de **círculo amarelo** (`🟡`) no início do nome.
   * *Exemplo:* `🟡 Envio de Oferta Especial (Samukas)`
2. **Publicado / Em Produção:**
   * Quando o desenvolvimento for finalizado e a automação for publicada para produção de fato, atualizar o nome substituindo o círculo amarelo pelo **círculo verde** (`🟢`).
   * *Exemplo:* `🟢 Envio de Oferta Especial (Samukas)`

### ⚙️ Configurações Obrigatórias do Workflow (`settings`)

Ao publicar ou salvar qualquer automação do projeto no n8n:
1. **Timezone:** O fuso horário do workflow DEVE estar configurado para `America/Sao_Paulo`.
2. **Worklow de Erro:** O campo de erro do workflow (`errorWorkflow`) DEVE apontar obrigatoriamente para o ID `l-fP7Ezi_AGWW03hdCWJQ` (`🟢 Notificar ERRO em Automação`).

---

## 3. 🎯 Resumo de Boas Práticas

| Recurso | Regra Principal |
| :--- | :--- |
| **Tabelas Supabase** | Apenas com prefixo `samukas_*` |
| **Workflows n8n** | Apenas que contenham `"Samukas"` no nome |
| **Novas Automações (Dev)** | Iniciar com emoji `🟡` |
| **Automações Finalizadas (Prod)** | Atualizar para emoji `🟢` |
| **Timezone n8n** | `America/Sao_Paulo` |
| **Workflow de Erro n8n** | ID `l-fP7Ezi_AGWW03hdCWJQ` |
