# Histórico de versões do Vault Desktop

Segue o versionamento semântico (MAIOR.MENOR.CORREÇÃO): correção de erro sobe o último número, novidade sobe o do meio, mudança grande sobe o primeiro. A versão vem do `package.json`, e todo push precisa subir a versão (o publicador recusa uma versão que já existe).

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
