# Vault para Windows

Programa do Vault (metas, chat e chamadas) para Windows. Ele abre o Vault em https://vault-omega-cyan.vercel.app numa janela própria, com:

- seletor de **tela inteira ou janela** com o **som do computador** (no Windows 11 a voz da chamada fica de fora, sem eco)
- uso da **placa de vídeo** e sem perder desempenho quando fica atrás de um jogo
- atalhos globais: **Ctrl+Shift+M** muta e **Ctrl+Shift+D** ensurdece
- clicar no **X** deixa o Vault na **bandeja** (perto do relógio). Para fechar de vez: botão direito no ícone → **Sair do Vault**
- **atualização automática**: quando sai uma versão nova, ela é baixada sozinha e aparece uma **seta verde** no canto superior esquerdo. Clique nela para reiniciar já atualizado

## Instalar

Baixe o `Vault-Setup-x.y.z.exe` mais recente em [Releases](../../releases/latest) e abra.
Como o programa não é assinado, o Windows mostra um aviso na primeira vez: clique em **Mais informações → Executar assim mesmo**.

## Como sai uma versão nova

Qualquer mudança enviada para a branch `main` dispara o GitHub Actions, que gera o instalador e publica em Releases com o número `1.2.N`.
Os Vaults instalados procuram atualização ao abrir e a cada 30 minutos.

Mudanças no site (telas, chat, chamadas) não precisam de versão nova do programa: ele sempre abre o site atualizado.

## Rodar sem instalar

```bash
npm install
npm start
```
