# 📋 Diretrizes do Projeto — Samukas Burguer

## 1. 🗄️ Supabase
- Utilizar **EXCLUSIVAMENTE** tabelas com o prefixo `samukas` (ex: `samukas_leads`, `samukas_vendas`, `samukas_mensagens`).
- **IGNORAR COMPLETAMENTE** todas as outras tabelas do banco que não pertencem ao contexto do Samukas Burguer.

## 2. ⚡ n8n (Automações)
- Considerar **APENAS** as automações que contenham `"Samukas"` no nome.
- **IGNORAR COMPLETAMENTE** automações de outros projetos/clientes.

### 🟡 / 🟢 Convenção de Nomenclatura dos Workflows
- **Nova Automação (Em desenvolvimento):** Usar o círculo amarelo `🟡` no nome.  
  *Exemplo:* `🟡 Nome da Automação (Samukas)`
- **Finalizada / Publicada (Produção):** Atualizar o círculo para verde `🟢`.  
  *Exemplo:* `🟢 Nome da Automação (Samukas)`

### ⚙️ Configurações Obrigatórias ao Publicar no n8n
Sempre que criar ou publicar uma automação no n8n, garantir as seguintes configurações em `settings`:
1. **Fuso Horário (Timezone):** Configurar obrigatoriamente para `America/Sao_Paulo` (`"timezone": "America/Sao_Paulo"`).
2. **Notificação de Erros (Error Workflow):** Definir o campo `errorWorkflow` com o ID `"l-fP7Ezi_AGWW03hdCWJQ"` (`🟢 Notificar ERRO em Automação`).
