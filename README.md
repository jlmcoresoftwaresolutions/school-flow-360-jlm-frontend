# SchoolFlow360

Aplicação de gestão escolar SaaS white-label multi-tenant, construída com React 19 + TypeScript + Vite sobre um design system próprio em `src/ds-components/`.

## Storybook

O design system está publicado no Firebase Hosting e pode ser acessado por qualquer pessoa, sem precisar instalar o projeto:

**https://school-flow-360-storybook.web.app**

Para publicar uma nova versão depois de alterar componentes:

```
bun run deploy-storybook
```

## Comandos

- `bun install` — instala as dependências
- `bun run dev` — inicia o servidor de desenvolvimento
- `bun run build` — checa os tipos e gera o build de produção
- `bun run test` — executa a suíte de testes (Vitest)
- `bun run storybook` — executa o Storybook localmente na porta 6006
- `bun run lint` / `bun run format` — ESLint / Prettier

Veja [CLAUDE.md](./CLAUDE.md) para a documentação completa de arquitetura e convenções do projeto.
