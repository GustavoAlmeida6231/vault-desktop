# Como o Vault é versionado

Usamos **versionamento semântico**: `MAIOR.MENOR.CORREÇÃO` (ex.: `1.3.0`).

| Parte | Quando sobe | Exemplos |
| --- | --- | --- |
| **CORREÇÃO** (`1.3.0` → `1.3.1`) | Conserta um erro ou melhora algo sem mudar o que a pessoa faz | bug do microfone, cor de ícone, mais velocidade |
| **MENOR** (`1.3.1` → `1.4.0`) | Funcionalidade nova que não quebra nada | notificações, nova tela, novo tipo de aviso |
| **MAIOR** (`1.4.0` → `2.0.0`) | Mudança grande ou que exige ação (banco incompatível, refazer o fluxo de uso) | trocar a estrutura de dados, redesenho completo |

Ao subir MENOR, a CORREÇÃO volta a 0. Ao subir MAIOR, MENOR e CORREÇÃO voltam a 0.

## Toda atualização publicada precisa, no mesmo commit:

1. Subir a versão em `package.json` **e** em `lib/version.ts`.
2. Escrever a entrada nova no topo do `CHANGELOG.md` (versão, data e o que mudou em linguagem simples).
3. Se tiver arquivo SQL novo em `supabase/`, avisar no changelog: **Requer SQL**.
4. Depois do deploy, criar a Release `vX.Y.Z` no GitHub (cria a etiqueta da versão).

## App do computador (`vault-desktop`)

Tem versão própria, em `package.json` do repositório do app. A Release `vX.Y.Z` é criada automaticamente a cada push, e o app instalado se atualiza sozinho. Por isso **todo push do app precisa subir a versão** (o publicador recusa uma versão que já existe). Mesmas regras acima.

O número do site e o do app não precisam ser iguais: cada um sobe só quando muda.
