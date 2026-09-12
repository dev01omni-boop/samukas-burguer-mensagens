# CLAUDE.md

## Escopo obrigatório: Supabase e n8n são compartilhados entre clientes

Este projeto (SAMUKAS BURGUER) usa uma infraestrutura **compartilhada** com outros clientes da OMNI AUTOMAÇÕES (ex: Visi Marketing, Ricc OS, Dra. Livia, e a própria Omni). Os MCPs de Supabase e n8n configurados aqui apontam para essa infraestrutura compartilhada, não para um ambiente isolado do Samukas.

**Regra:** ao usar os MCPs `supabase` e `n8n-mcp`, só é permitido ler, criar, alterar ou apagar recursos que pertencem à Samukas Burguer. Nunca toque em recursos de outros clientes, mesmo que a tarefa pareça exigir isso — pare e avise o usuário.

### Supabase

- Só podem ser lidas/alteradas tabelas cujo nome comece com o prefixo `samukas_` (ex: `samukas_leads`, `samukas_mensagens`, `samukas_vendas`).
- Nunca fazer `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `ALTER`, migrations ou qualquer outra operação em tabelas sem esse prefixo (ex: `usuarios`, `negocios`, `clientes`, `financeiro_receitas`, `kanban_*`, etc.) — essas pertencem a outros clientes ou ao CRM interno da Omni.
- Antes de qualquer migration ou alteração de schema, confirmar que todas as tabelas afetadas começam com `samukas_`.

### n8n

- Só podem ser lidos/alterados workflows cujo nome ou tag identifique claramente **"Samukas Burguer"** (ex: nome iniciando com `🟢Samukas Burguer | ...` ou tag `SAMUKAS BURGUER`).
- Nunca criar, editar, ativar/desativar, excluir ou disparar execuções de workflows de outros clientes (Omni, Visi Marketing, Ricc OS, Dra. Livia, etc.), mesmo que pareçam relacionados.
- Ao listar workflows, sempre filtrar/verificar pela tag ou prefixo do nome antes de agir sobre um deles.

### Em caso de dúvida

Se não for possível confirmar com certeza que uma tabela ou um workflow pertence à Samukas Burguer, **não execute a ação** — pergunte ao usuário antes de prosseguir.
