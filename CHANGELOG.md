# Histórico de versões do Vault Desktop

Segue o versionamento semântico (MAIOR.MENOR.CORREÇÃO): correção de erro sobe o último número, novidade sobe o do meio, mudança grande sobe o primeiro. A versão vem do `package.json`, e todo push precisa subir a versão (o publicador recusa uma versão que já existe).

## 1.7.0 — 2026-11-07
- Contingência > Proxies (site 1.7.0): mostra qual proxy está em uso por qual conta, os livres e os divididos entre contas. O app já mostra ao reabrir; o app em si não mudou, o número sobe junto com o do site.

## 1.6.1 — 2026-11-07
- Ajuste no botão Baixar para Windows do site (sempre a versão mais nova, sem atraso). O app em si não mudou: o número sobe junto com o do site.

## 1.6.0 — 2026-11-07
- O site ganhou o botão **Baixar para Windows** (Configurações e tela de login), que sempre baixa a última versão deste app. O app em si não mudou: o número sobe junto com o do site.

## 1.5.1 — 2026-11-07
- Apagar workspace e Renomear canal não funcionavam no app (usavam uma caixa de texto que o Electron não tem). Agora usam uma janela do próprio Vault (site 1.5.1), que o app já mostra ao reabrir. O app em si não mudou: o número sobe junto com o do site.

## 1.5.0 — 2026-11-07
- Site e app passam a andar com o mesmo número de versão (esta é a 1.5.0 dos dois).
- Novidades do site que o app já mostra ao reabrir o Vault: o Dono pode apagar mensagens de qualquer pessoa e qualquer Dono pode apagar o workspace (Configurações > Conta). Requer rodar o SQL `04-dono-apaga-mensagens-e-workspace.sql` no Supabase.
- Chamadas: se a ligação com alguém não fecha, o Vault reinicia a busca de caminho aos 10 s e avisa o motivo aos 25 s (site 1.4.4).

## 1.4.3 — 2026-11-07
- Chamadas: novo item na bandeja, **Testar conexão das chamadas**. Ele checa se este computador consegue falar por UDP com a internet e se o roteador/operadora deixa a ligação direta fechar, e explica o que fazer quando a chamada fica em "Conectando..." (firewall do Windows, VPN, CGNAT/servidor TURN).
- O app desktop carrega o site, então a nova busca de caminho das chamadas (site 1.4.4: reinicia aos 10 s e avisa o motivo aos 25 s) já vale aqui ao reabrir o Vault.

## 1.4.2 — 2026-11-06
- Conexão: se o Vault abrir sem internet (por exemplo junto com o Windows, antes da rede subir) ou a rede cair, o app mostra "Sem conexão" e tenta de novo sozinho (a cada 3 s, depois até 15 s) até conectar, sem precisar clicar. Ao voltar do repouso ou desbloquear a tela ele também tenta na hora.
- Se a página do Vault travar ou for encerrada pelo sistema, o app recarrega sozinho em vez de ficar em branco.

## 1.4.1 — 2026-11-06
- Voltando do repouso (ou ao desbloquear a tela) o Vault confere na hora se chegou mensagem ou lançamento novo, para o aviso não se perder.
- O motor do app (Electron) passa a ter a versão fixa (43.8.7): cada atualização do app usa exatamente o mesmo motor já testado, sem mudar sozinho.

## 1.4.0 — 2026-11-06
- Abre sozinho junto com o Windows, escondido na bandeja, para as notificações (mensagem, entrada de dinheiro, meta batida) chegarem como no Discord sem você abrir o app. Dá para desligar no menu da bandeja ("Abrir o Vault ao ligar o computador").
- Novidades do Vault 1.4.0 chegam pelo próprio site dentro do app: espelhamento da câmera, aba Contingência, respostas e reações no chat, imagens no chat, painel e lousa na call.

## 1.3.0 — 2026-11-06
- Clicar numa notificação do Vault traz a janela para a frente, mesmo escondida na bandeja.
- A versão passa a vir do `package.json` (antes era um número automático da execução).

## 1.2.4 — 2026-11-06
- Primeira publicação do clique em notificação (numeração automática antiga).

## 1.2.3 — 2026-11-06
- Ícone do app em preto e branco.

## 1.2.0 a 1.2.2
- App para Windows com atualização automática (ícone verde no canto superior esquerdo), bandeja e atalhos globais.
