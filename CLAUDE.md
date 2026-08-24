# CLAUDE.md

Este arquivo fornece orientações ao Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

## Comandos

- `bun install` — instala as dependências (lockfile é `bun.lock`)
- `bun run dev` — inicia o servidor de dev do Vite (abre o navegador automaticamente, ver `vite.config.ts`)
- `bun run build` — checa os tipos (`tsc -b`) e depois faz o build de produção
- `bun run preview` — faz o preview local do build de produção
- `bun run lint` / `bun run lint:fix` — executa o ESLint (flat config em `eslint.config.js`)
- `bun run format` / `bun run format:check` — Prettier em modo write/check
- `bun run storybook` — executa o Storybook localmente na porta 6006 (documentação de componentes)
- `bun run build-storybook` — gera o site estático do Storybook em `storybook-static/` (ignorado pelo git)
- `bun run test` — executa a suíte do Vitest uma vez (`vitest run`)
- `bun run test:watch` — executa o Vitest em modo watch
- Para rodar um único arquivo de teste: `bunx vitest run src/ds-components/atoms/Text/Text.test.tsx` (ou remova o `run` para modo watch apenas nesse arquivo)
- `bun run e2e` — executa a suíte E2E do Playwright (`playwright test`) contra `e2e/`, ver a seção sobre Playwright abaixo

**Não reinstale `@storybook/addon-vitest` ou `@chromatic-com/storybook`** — o `storybook init` os adiciona por padrão, mas foram removidos deliberadamente (ver a seção sobre Storybook abaixo). Os testes unitários deste projeto usam uma configuração simples e independente do Vitest, propositalmente não integrada ao Storybook.

Para checar tipos sem fazer build: `bunx tsc -b --noEmit` (o projeto usa TS project references — `tsconfig.app.json` para `src/`, `tsconfig.node.json` para a configuração do Vite).

## Arquitetura

Esta é uma aplicação React 19 + TypeScript + Vite, construída do zero sobre uma camada customizada de design tokens em `src/foundation/`. A estilização é feita com `styled-components` (sem arquivos CSS puros) — o reset global que antes ficava em `index.css` agora é `src/styles/GlobalStyle.ts`, um `createGlobalStyle`, renderizado uma única vez em `main.tsx` junto com o router.

### Roteamento

`src/routes/routes.tsx` (reexportado via `src/routes/index.ts`, então é importado como `from "./routes"`/`from "@/routes"`) é a fonte única das definições de rota, exportando um `router` construído com o `createBrowserRouter` do `react-router-dom` (um array plano de entradas `{ element, path }` — ainda sem rotas aninhadas/layout). `main.tsx` renderiza `<RouterProvider router={router} />` (não existe `App.tsx` — esse placeholder foi substituído por `src/pages/` assim que o roteamento entrou). O `element` de cada rota é um componente de `src/pages/<PageName>/`, importado via o barrel `@/pages`. Um `<Link>` é renderizado via a prop polimórfica `as` do `Text` (`<Text as={Link} to="/experimental">`) em vez de uma `<a>` crua, do mesmo jeito que qualquer outro alvo de `as`.

### `src/pages/` guarda as views roteadas, e fica propositalmente fora de `src/ds-components/`

`src/pages/<PageName>/` segue o mesmo formato de pasta por componente que `src/ds-components/` (`PageName.tsx` + `PageName.styles.ts` + `index.ts`, com o `index.ts` de cada pasta de camada reexportando todas as páginas — ver `src/pages/index.ts`), mas páginas **não** fazem parte das camadas de componentes do Atomic Design abaixo e não recebem `.stories.tsx`/`.test.tsx`: são composições roteadas de atoms/molecules/organisms, não peças reutilizáveis do design system documentadas no Storybook ou testadas unitariamente de forma isolada.

**As props JSX de um componente, dentro de uma página, seguem uma ordem específica** — não a ordem puramente alfabética que o `perfectionist` impõe para os object literals de `src/ds-components/`/`src/components/` (ver a seção de convenções de ESLint/Prettier abaixo), já que atributos JSX não são cobertos por essa regra de forma alguma. Ordene assim: primeiro as props não booleanas e que não sejam `style`, em ordem alfabética; depois as props booleanas abreviadas (shorthand), também em ordem alfabética entre si; e por fim `style`, sempre por último. Dentro do próprio objeto `style`, as chaves ficam em ordem alfabética independente do tipo de propriedade CSS que representam. Não é imposto por lint — revise manualmente. Exemplo, o primeiro `Card` em `Login.tsx`:

```tsx
<Card
  borderRadius="5xl"
  translucent="high"
  elevated
  style={{
    display: "flex",
    flexDirection: "column",
    gap: spacing[20],
    padding: spacing[40],
  }}
>
```

`borderRadius`/`translucent` (alfabéticas, não booleanas, não `style`) vêm primeiro, `elevated` (a única booleana) vem em seguida, e `style` vem por último com suas próprias chaves (`display`/`flexDirection`/`gap`/`padding`) em ordem alfabética.

Uma exceção: as props de breakpoint do `Grid.Col` (`xs`/`sm`/`md`/`lg`/`xl`/`xxl`) são ordenadas do menor para o maior, não alfabeticamente — ex.: `<Grid.Col xs={12} md={6}>`, não `<Grid.Col md={6} xs={12}>`.

### `src/utils/` guarda funções puras e transversais

`src/utils/<moduleName>/` é para funções simples, agnósticas de framework, reutilizadas em múltiplos componentes/páginas — não vinculadas à pasta de um único componente. Cada módulo tem sua própria pasta espelhando o formato de pasta de componente (`<moduleName>.ts` + `index.ts` reexportando-o, ex.: `export * from "./formats"`) e um `<moduleName>.test.ts` co-localizado (ver `src/utils/formats/`). O `src/utils/index.ts` no topo reexporta cada pasta de módulo por sua vez, para que consumidores importem diretamente de `@/utils`. Os módulos usam apenas named exports, nunca export default. `formats/formats.ts` é a fonte única de verdade para formatação de exibição (`formatCpf`, `formatCnpj`, `formatCep`, `formatPhone`, `formatCreditCard`, `formatCurrency`, `formatExpiry`) — cada uma recebe uma `string` bruta/possivelmente "suja" e retorna a string formatada para exibição, fazendo internamente sua própria extração de dígitos e, quando o formato tem tamanho fixo, o truncamento. A prop `mask` do `Input` (`src/ds-components/molecules/Input/Input.masks.ts`) é um despachante fino sobre essas mesmas funções em vez de ter implementação própria — não duplique a lógica de um formatador dentro de um componente quando o valor puder, em vez disso, ser formatado para exibição via `@/utils/formats` a partir de qualquer lugar da aplicação. `loadingStore/loadingStore.ts` é outro módulo desse tipo — ver a seção `src/services/httpClient/` abaixo para entender sua finalidade.

- **Nunca use `.replace(/\D/g, "")` inline para remover caracteres não numéricos.** Use `stripNonDigits`, exportado de `@/utils/formats` (ver seu uso no tratamento `numeric` de `Input.tsx` e em `viaCep.ts`). Manter isso em um único lugar significa que uma mudança futura no que conta como "um dígito" (ou a troca da implementação) só precisa acontecer uma vez.

### `src/services/` guarda as chamadas a APIs externas

`src/services/<serviceName>/` segue o mesmo formato de pasta por módulo que `src/utils/` (`<serviceName>.ts` + `index.ts` reexportando-o, ex.: `export * from "./viaCep"`), reexportado por sua vez através do `src/services/index.ts` no topo. Apenas named exports, nunca export default. **Diferente de toda outra camada deste projeto, services não recebem testes unitários** — não há `<serviceName>.test.ts` para escrever, nem mockado nem de outra forma (`httpClient` é a única exceção, justamente por não ser uma chamada de rede simples — ver abaixo).

### `src/services/httpClient/` e o overlay global de Loading

Todo service **deve** chamar a API através do `httpClient` compartilhado (`src/services/httpClient/httpClient.ts`, reexportado via `@/services`) em vez de importar o `axios` diretamente (ver `viaCep.ts`) — seus interceptors de request/response são o que faz o overlay `Loading` (`src/components/Loading/`) aparecer automaticamente em toda chamada de API, sem nenhuma conexão manual por ponto de chamada:

- `GlobalLoading` (`src/components/GlobalLoading/`) é montado uma única vez em `main.tsx`, junto com o router. Ele assina `src/utils/loadingStore` (um contador simples de requisições pendentes, com um par subscribe/notify, testado unitariamente como qualquer outro util) via `useSyncExternalStore`, e renderiza `<Loading />` sempre que esse contador estiver acima de zero.
- Os interceptors do `httpClient` chamam `startLoading()`/`stopLoading()` em toda request/response (ou erro) — essa é a única conexão entre uma chamada de API e o contador, então um novo service ganha o overlay automaticamente de graça só por usar o `httpClient`.
- A assinatura pública de toda função de service **deve** aceitar os argumentos próprios da requisição mais um parâmetro final e opcional `config: RequestConfig` (ex.: `getAddressByCep(cep: string, config?: RequestConfig)`), repassado diretamente como o segundo argumento do `httpClient`. `RequestConfig` (exportado de `httpClient.ts`) hoje é `Pick<AxiosRequestConfig, "showLoading">` — um objeto deliberadamente restrito e construído para esse propósito (não o `AxiosRequestConfig` completo) — então quem chama e não quer o overlay global para uma chamada específica passa `{ showLoading: false }`; qualquer outra coisa (inclusive omitir `config`) exibe o overlay. Adicione novos campos à mesma augmentation `declare module "axios"` em `httpClient.ts` e inclua-os em `RequestConfig` via `Pick` conforme surgirem novas opções transversais por chamada, em vez de fazer crescer a lista de parâmetros de cada service individualmente.

### `src/models/` guarda os tipos de cada service

`src/models/<serviceName>/` espelha um a um a pasta do `src/services/<serviceName>/` correspondente (`<serviceName>.ts` + `index.ts` reexportando-o, ex.: `export * from "./viaCep"`, reexportado por sua vez através do `src/models/index.ts` no topo). Guarda todo tipo ligado aos endpoints daquele service — parâmetros de requisição, formatos de resposta (ver `ViaCepAddress` em `models/viaCep/viaCep.ts`) — de modo que o próprio arquivo do service só importa tipos de `@/models`, nunca declara os seus. Apenas named exports, nunca export default, e — assim como `src/services/` — sem testes unitários, já que são declarações somente de tipos, sem nada para executar.

### `src/foundation/` é a fonte única dos design tokens

`src/foundation/` define um sistema de tokens baseado em código (colors, spacing, typography, motion, radius, shadows, opacity, zIndex, breakpoints), exportado através de `src/foundation/index.ts`. É o único sistema de design tokens do projeto — novas UIs devem consumir valores de `src/foundation` dentro das definições de `styled-components` (ex.: `colors.primary[500]`, `spacing[16]`) em vez de fixar cores/espaçamentos/etc. diretamente no código. Note que atualmente não há variantes de dark mode.

`spacing` e `colors.primary`/`colors.neutral` são escalas com chaves numéricas, mas não significam a mesma coisa: as chaves de `spacing` são o próprio valor em pixels (`spacing[16]` é `"16px"`, `spacing[24]` é `"24px"`, ...), enquanto as escalas de cor usam números de passo abstratos (`colors.primary[500]` é o azul base da marca, não "500px" de nada). Não assuma que uma convenção de chave numérica se aplica às duas.

### Os componentes seguem o Atomic Design, dentro de `src/ds-components/`

Os componentes de UI ficam em `src/ds-components/<layer>/<ComponentName>/`, onde `<layer>` é uma de `atoms`, `molecules`, `organisms`, `templates` (páginas roteadas ficam em `src/pages/` — ver acima). Cada componente tem sua própria pasta em PascalCase contendo:

- `ComponentName.tsx` — o componente como named export (ex.: `export const Text = ...`) mais seu `export type ComponentNameProps`.
- `ComponentName.styles.ts` — as definições `styled-components`, importadas em `ComponentName.tsx`. Mantenha as declarações de estilo fora do próprio arquivo do componente.
- `index.ts` — barrel reexportando tudo do arquivo do componente, ex.: `export * from "./ComponentName"`.

Cada pasta de camada (`atoms/`, `molecules/`, ...) também tem seu próprio barrel `index.ts` reexportando todo componente daquela camada, ex.: `export * from "./Text"` (ver `src/ds-components/atoms/index.ts`) — adicione novos componentes a esse barrel também.

`src/ds-components/atoms/Text/` é a implementação de referência: deriva suas variantes de `size`/`weight` diretamente de `typography.fontSize`/`fontWeight`/`lineHeight` e suas variantes de `color` a partir de um mapa semântico (`default`/`secondary`/`muted`/`inverse`/`brand`/`success`/`warning`/`danger`/`info`) apoiado em `colors` — siga esse padrão (valores de prop semânticos mapeados para tokens de `src/foundation`, não valores brutos em hex/px) para novos atoms/molecules/organisms.

Todo componente também aceita uma prop `style?: CSSProperties` (importada como `import type { CSSProperties } from "react"`), repassada diretamente ao elemento estilizado raiz (ex.: `<StyledText style={style}>`) como uma via de escape para estilo inline pontual, além das props de variante — ver `Text.tsx`/`Text.styles.ts`.

### `src/components/` guarda componentes que não fazem parte do design system ds-components

Diferente de `src/ds-components/`, `src/components/<ComponentName>/` é plano (sem o segmento `<layer>` do Atomic Design) e guarda componentes que não são feitos para ser peças reutilizáveis e documentadas do design system — o `Loading` (um overlay de tela cheia ligado a estados assíncronos no nível da aplicação) fica aqui. Ainda assim segue o mesmo formato de pasta por componente (`ComponentName.tsx` + `.styles.ts` + `index.ts` + `.stories.tsx` + `.test.tsx`) e as mesmas convenções (styled-components, tokens de `@/foundation`, props `style`/`className`, ordem alfabética de props via `eslint-plugin-perfectionist` — ver seu glob `files` em `eslint.config.js`, que cobre tanto essa pasta quanto `src/ds-components/`). Tem seu próprio barrel `src/components/index.ts` no topo, igual a qualquer outra camada.

### `Tooltip` e a convenção da prop `tooltip`

`src/ds-components/atoms/Tooltip/` fornece o balão de tooltip que segue o cursor, além do hook `useTooltip`, que qualquer componente usa para aderir a uma prop `tooltip?: string`:

- `Tooltip.tsx` é o balão apresentacional — recebe `x`/`y` (coordenadas de viewport) e `children`, e renderiza via `createPortal(..., document.body)` para não ser cortado por ancestrais com `overflow: hidden` e para sempre ficar acima do resto do conteúdo (`zIndex.tooltip`). Não tem lógica própria de visibilidade/hover — sempre renderiza quando montado.
- `useTooltip(tooltip?: string)` (em `useTooltip.tsx`, co-localizado com `Tooltip` por ser fortemente acoplado a ele — note a extensão `.tsx`, necessária porque o hook retorna JSX) é o dono do estado de hover/rastreamento do mouse e retorna `{ tooltipElement, tooltipHandlers }`. `tooltipHandlers` (`onMouseEnter`/`onMouseMove`/`onMouseLeave`) é espalhado no elemento estilizado raiz do componente para rastrear o cursor e alternar a visibilidade; `tooltipElement` é o `<Tooltip>` já construído (ou `null` quando não há hover / nenhum texto de `tooltip` foi passado) para ser renderizado como irmão.
- Para adicionar isso a um novo componente: adicione `tooltip?: string` às suas próprias props (na posição alfabética entre as props opcionais), chame `const { tooltipElement, tooltipHandlers } = useTooltip(tooltip)`, espalhe `{...tooltipHandlers}` no elemento estilizado raiz (depois de `{...rest}`, para que sempre prevaleça sobre qualquer prop de mesmo nome repassada por quem chama), envolva o retorno em um fragment, e renderize `{tooltipElement}` como irmão depois do elemento raiz — ver `Text.tsx` para a conexão de referência.

### Estilização com `styled-components`

- Arquivos `.css` puros não são mais usados em nenhum lugar de `src/` — escreva todos os estilos com `styled-components`.
- Os styled components específicos de cada componente ficam em `ComponentName.styles.ts`, não inline no arquivo `.tsx`.
- Props passadas a um styled component que existem puramente para controlar CSS (não são atributos DOM válidos) devem usar o prefixo transitório `$` (ex.: `$size`, `$color`) para que o `styled-components` não as repasse ao nó do DOM — ver `Text.styles.ts`.
- A renderização polimórfica de tag (ex.: a prop `as` do `Text`) deve se apoiar no suporte nativo à prop `as` do próprio `styled-components`, em vez de trocar o elemento renderizado manualmente. Para ter os atributos próprios da tag renderizada tipados e repassados (ex.: `href` quando `as="a"`), torne as props do componente genéricas sobre `C extends ElementType` — as props próprias ficam em um tipo `TextOwnProps<C>`, e o `TextProps<C extends ElementType = "p">` exportado o intersecta com `Omit<ComponentPropsWithoutRef<C>, keyof TextOwnProps<C>>`. O próprio componente vira `<C extends ElementType = "p">(props: TextProps<C>) => {...}`, desestruturando as props conhecidas mais `...rest` e espalhando `rest` no elemento estilizado. Ver `Text.tsx`. (Um genérico solto como `<T>(props) => ...` é ambíguo com JSX em um arquivo `.tsx` e precisa de uma vírgula final — `<T,>` — ou de uma cláusula `extends` para desambiguar; como esse genérico já tem `extends ElementType`, a vírgula final não é necessária aqui.)
- Estilos globais/de reset ficam em `src/styles/GlobalStyle.ts` via `createGlobalStyle`, renderizado uma única vez em `main.tsx`.
- **Valores de token nos estilos devem usar os tokens de `src/foundation`, nunca literais fixos no código.** Toda propriedade CSS cujo valor tenha um token correspondente na foundation deve referenciar esse token — nunca escreva o valor bruto diretamente em um arquivo `.styles.ts` ou em um objeto `style={{...}}`:
  - Medidas em pixel → `spacing` (ex.: `padding: ${spacing[24]}`, `gap: ${spacing[8]}`)
  - Opacidade → `opacity` (ex.: `opacity: ${opacity.disabled}` em vez de `opacity: 0.5`)
  - Outros tipos de token seguem a mesma regra: `radius`, `shadows`, `colors`, `zIndex`, `typography`, `motion`, `translucency`
  - Exceções: valores sem token correspondente (bordas de `1px`, unidades de porcentagem/viewport, valores computados dinamicamente) e valores já derivados de outro token (ex.: `${typography.fontSize.sm}px`).

### Adicionando ou alterando props

Sempre que uma nova prop é adicionada a um componente (ou uma prop existente é alterada ou removida), dois arquivos **devem** ser atualizados na mesma mudança:

1. **`ComponentName.stories.tsx`** — adicione ou atualize a entrada de `argTypes` da prop (com o tipo de `control` e `description`) e adicione uma story dedicada que exercite o novo comportamento, caso ainda não esteja coberto.
2. **`ComponentName.test.tsx`** — adicione ou atualize os casos de teste que cobrem o comportamento da nova prop.

Isso não são follow-ups opcionais: documentação e testes fazem parte da mesma unidade de trabalho que a própria prop.

### Todo componente é documentado com Storybook

Cada pasta de componente também recebe um `ComponentName.stories.tsx` co-localizado (formato CSF3), junto com `ComponentName.tsx`/`.styles.ts`/`index.ts` — ver `Text.stories.tsx`. Convenções:

- O `title` no `meta` da story espelha o caminho do Atomic Design, ex.: `"Atoms/Text"`.
- `tags: ["autodocs"]` no `meta`, para que o Storybook gere a página de docs automaticamente a partir de `argTypes`/props, em vez de exigir um `.mdx` escrito à mão.
- Apenas dois addons do Storybook estão instalados: `@storybook/addon-docs` (autodocs) e `@storybook/addon-a11y` (checagens de acessibilidade), configurados em `.storybook/main.ts`. **Não adicione addons `@storybook/addon-vitest`/Chromatic/MCP** sem pedido explícito — o `storybook init` inclui esses por padrão, mas eles trazem junto os binários de navegador do Vitest + Playwright puramente para testes de componente, o que está fora do escopo (não há test runner de componentes neste projeto).
- `.storybook/preview.tsx` envolve toda story em `<GlobalStyle />` (de `src/styles/GlobalStyle.ts`) via um decorator, para que as stories renderizem com o mesmo reset da aplicação real.
- Toda story exportada (incluindo `Default`) recebe um comentário de uma linha logo acima descrevendo o que ela demonstra, ex.: `// The elevated prop adding a drop shadow and removing the border` — descreva a prop/comportamento/variante mostrada, não apenas repita o nome da story.
- **Este design system é voltado a um produto em português do Brasil (pt-BR)** — o conteúdo de exemplo renderizado pelas stories (valores de `args` como `children`/`title`/`placeholder`/`helperText`, e qualquer texto fixo dentro de um `render()` customizado) deve ser escrito em pt-BR, ex.: `title: "E-mail"`, `placeholder: "Digite algo..."` (ver `Input.stories.tsx`). Isso **não** se estende às strings de `argTypes[...].description`, aos comentários de story, nem a nada mais no código — esses permanecem em inglês, como o resto do código. Também não traduza valores que fazem parte, literalmente, da superfície de API do componente (ex.: `color="default"`/`color="brand"` demonstrados renderizando o próprio nome do token, ou o slug `name` de um `Icon`) — traduzir esses faria o rótulo exibido mentir sobre o valor real da prop.
- **Sempre que um componente de `src/ds-components/` (ou de `src/components/`) for implementado ou modificado, republique o Storybook rodando `bun run deploy-storybook`** (build + `firebase deploy --only hosting` para o projeto `school-flow-360-storybook`, ver a seção Comandos) como parte da mesma unidade de trabalho — não um follow-up opcional, no mesmo espírito da regra de "Adicionando ou alterando props" acima. O link publicado (`https://school-flow-360-storybook.web.app`) é a forma como o time revisa os componentes fora do código, e fica desatualizado silenciosamente se o deploy não for refeito a cada mudança no DS.

### Testes unitários com Vitest + React Testing Library

- Cada pasta de componente também recebe um `ComponentName.test.tsx` co-localizado — ver `Text.test.tsx`. Teste o comportamento renderizado (conteúdo de texto, nome da tag, atributos/classes) via `render`/`screen` do `@testing-library/react`, não detalhes de implementação.
- O Vitest é configurado diretamente em `vite.config.ts` (`test: { environment: "jsdom", exclude: [...], setupFiles: ["./src/test/setup.ts"] }`) — não há um `vitest.config.ts` separado. A tipagem do campo `test` vem do `import { configDefaults } from "vitest/config"` (também usado para estender a lista padrão de exclusões e ignorar `e2e/**`, ver a seção sobre Playwright abaixo), não mais de uma diretiva triple-slash — o `eslint-plugin-typescript-eslint` rejeita `/// <reference ... />` quando o mesmo módulo já é importado normalmente.
- `src/test/setup.ts` importa `@testing-library/jest-dom/vitest` (o entry point específico do Vitest, não o genérico `@testing-library/jest-dom`) para registrar matchers como `toHaveClass`/`toBeInTheDocument` no `expect` do Vitest.
- Importe `describe`/`it`/`expect` explicitamente de `"vitest"` em todo arquivo de teste — `globals` não está habilitado na configuração do Vitest, alinhado com a preferência deste projeto por imports explícitos em vez de globais ambientes.
- `@testing-library/dom` é uma peer dependency obrigatória de `@testing-library/react` e deve permanecer instalada mesmo que nada a importe diretamente.
- `src/test/setup.ts` também chama `afterEach(() => cleanup())` explicitamente. O auto-cleanup do React Testing Library só se registra sozinho quando detecta um `afterEach` global (ex.: Jest, ou Vitest com `globals: true`); como a configuração do Vitest deste projeto mantém `globals` desligado, o auto-cleanup nunca dispara sem isso — e sem ele, cada `render()` em um arquivo continua se acumulando em `document.body` entre os blocos `it` (mais visível em componentes baseados em portal, como `Tooltip`, ou em texto repetido entre testes).

### Testes E2E com Playwright

- `e2e/<fluxo>.spec.ts` guarda os testes de ponta a ponta, um arquivo por fluxo/página (ex.: `e2e/home.spec.ts`, `e2e/login.spec.ts`) — não é o mesmo diretório nem a mesma ferramenta dos testes unitários (`ComponentName.test.tsx` com Vitest + RTL, ver acima). Importe `expect`/`test` de `"@playwright/test"`, nunca de `"vitest"`, e prefira locators por role/label (`page.getByRole(...)`, `page.getByLabel(...)`) em vez de seletores CSS/`data-testid`, na mesma linha do RTL usado nos testes unitários.
- `playwright.config.ts` (raiz) define `testDir: "./e2e"` e um `webServer` que sobe `bun run dev -- --port 5174 --strictPort` automaticamente antes da suíte (`reuseExistingServer` fora de CI, então um `bun run dev` já rodando localmente é reaproveitado). Não é preciso subir o servidor manualmente antes de `bun run e2e`.
- `vite.config.ts` desliga a abertura automática do navegador (`server.open`) quando a env var `PLAYWRIGHT` está definida — é o `webServer.env` do `playwright.config.ts` quem a define, então isso é interno à suíte E2E e não afeta `bun run dev` no dia a dia.
- `tsconfig.e2e.json` (espelhando `tsconfig.node.json`) cobre `e2e/` e `playwright.config.ts` no `tsc -b`, e o bloco de globals Node do `eslint.config.js` (originalmente só para `scripts/`) também cobre esses arquivos — ambos rodam em Node, não no browser.
- Os testes E2E cobrem fluxos reais de navegação/interação do usuário através de páginas inteiras (`src/pages/`) — não são um substituto para os testes unitários por componente, e não geram uma story nem alteram a regra de "Adicionando ou alterando props" (isso continua sendo Storybook + Vitest).
- `playwright-report/`, `test-results/` e `blob-report/` (gerados por `bun run e2e`) são ignorados pelo git.

### Convenções de `src/foundation/`

Todo módulo de token segue o mesmo formato — siga-o ao adicionar um novo ou editar os existentes:

```ts
export const tokenName = { ... }
export type TokenNameType = typeof tokenName
```

- Apenas named exports — **sem `export default`**. O barrel (`src/foundation/index.ts`) reexporta tudo via `export *`, que não repassa export defaults, então um default seria código morto.
- Os exports do barrel são ordenados alfabeticamente por nome de arquivo; mantenha novos módulos nessa ordem.
- Os object literals não usam `as const` — os valores são ampliados para `string`/`number` nos tipos `*Type` derivados, em vez de manter tipos literais.
- `breakpoints.ts` é a única exceção à regra "um objeto + um tipo por módulo": exporta tanto `breakpoints` (valores brutos em pixels) quanto `media` (os mesmos valores já envolvidos em strings `(min-width: ...)`), cada um com seu próprio `BreakpointsType`/`MediaType`.

### Notas sobre a configuração do TypeScript

- `verbatimModuleSyntax: true` (`tsconfig.app.json`) — imports/exports somente de tipo devem usar `import type` / `export type` explicitamente; imports mistos falharão na compilação.
- `erasableSyntaxOnly: true` — evite sintaxe do TS que exija transformação em runtime (ex.: enums, parameter properties, namespaces).
- `noUnusedLocals` / `noUnusedParameters` estão habilitados — bindings não usados quebram o build, não só o lint.
- **O path alias `@/*` mapeia para `src/*`** — configurado tanto em `tsconfig.app.json` (`paths`, sem `baseUrl`; obsoleto nesta versão do TS) quanto em `vite.config.ts` (`resolve.alias`, via `path.resolve(import.meta.dirname, "src")`). Os dois devem permanecer sincronizados — o TS só faz a checagem de tipos do alias, é o Vite quem de fato o resolve em build/dev/test.
- Use `@/...` para imports transversais (ex.: `@/foundation`, `@/styles/GlobalStyle`) para evitar cadeias no estilo `../../../` conforme os componentes se aninham mais fundo nas camadas do Atomic Design. Mantenha imports relativos simples (`./Text.styles`) para arquivos co-localizados na mesma pasta de componente — o alias é para cruzar para uma preocupação de nível superior diferente, não para arquivos irmãos.
- **Cada bloco de `compilerOptions` em `tsconfig.app.json` deve ter suas chaves organizadas em ordem alfabética.** O arquivo já é dividido em blocos por comentário (`/* Bundler mode */`, `/* Linting */`, e o bloco inicial sem comentário) — a ordem alfabética se aplica dentro de cada bloco, não ao arquivo inteiro. Não é imposto por lint (JSON com comentários não é coberto pelo `eslint-plugin-perfectionist`) — revise manualmente.

### Convenções de ESLint/Prettier

- A ordem dos imports é imposta pelo `eslint-plugin-simple-import-sort` (`simple-import-sort/imports` e `/exports` são `error`, não warnings) — deixe o `lint:fix` ou uma integração do editor ordenar os imports, em vez de ordená-los manualmente.
- Configuração do Prettier (`.prettierrc`): sem ponto e vírgula, aspas duplas, trailing commas em todo lugar, largura de impressão de 120, quebras de linha LF.
- **Arrow functions são preferidas em todo lugar** — imposto via `func-style: ["error", "expression", { allowArrowFunctions: true }]` (proíbe declarações `function foo() {}`) e `prefer-arrow-callback: "error"` (proíbe expressões `function` passadas como callback, ex.: `arr.map(function (x) {...})`). Sempre escreva `const foo = () => {...}`, inclusive para componentes (ver `Text.tsx`) e hooks.
- **Nunca use ternários aninhados.** Quando mais de uma condição precisa ser resolvida, use cadeias `if/else` ou early returns em vez disso. Um único ternário (`a ? b : c`) está ok; aninhar outro dentro dos ramos não está.
- **Nunca desestruture parâmetros de função inline.** Receba o `props` completo (ou outro argumento único) e desestruture-o na primeira linha do corpo: `const { a, b } = props`, não `({ a, b }: Props) => {}`. Isso vale tanto para componentes quanto para funções simples, incluindo callbacks de interpolação do `styled-components` (ver `Text.styles.ts`, onde o objeto de props inteiro é desestruturado uma vez dentro do corpo da função de interpolação, em vez de na sua lista de parâmetros). Não é imposto por lint no momento — nenhuma regra do ESLint cobre isso, então revise manualmente.
- **Prefira `async`/`await` a cadeias `.then()`/`.catch()`.** Escreva `const data = await getAddressByCep(cep)` dentro de uma função `async`, em vez de `getAddressByCep(cep).then(setData)`. Não é imposto por lint — revise manualmente.
- **Prefira `try`/`catch` a `.catch()` para tratamento de erro**, uma vez que a função que chama seja `async` (ver a regra anterior) — envolva o `await` em `try`/`catch` em vez de encadear `.catch()` na promise. Note que um callback de `useEffect` não pode ser `async` (seu valor de retorno é reservado para uma função de cleanup opcional), então quando um effect precisa dar `await` em algo, declare uma função `async` separada dentro do effect e a chame, em vez de tornar o callback do effect `async` ou cair para `.then()`/`.catch()` — ver `Experimental.tsx`.
- **Ordem alfabética de propriedades, obrigatórias antes de opcionais**, imposta pelo `eslint-plugin-perfectionist`, mas restrita a `files: ["src/ds-components/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"]` (ver `eslint.config.js`) — deliberadamente **não** aplicada a `src/foundation/`, cujas escalas de token (`xs`→`4xl`, `50`→`900`) são ordenadas por tamanho, não alfabeticamente:
  - `perfectionist/sort-object-types` ordena os membros de tipos de prop (`type FooProps = {...}`) alfabeticamente dentro de dois grupos, nesta ordem: `required-property` primeiro, depois `optional-property` (cada grupo alfabético dentro de si — ver `TextProps`/`StyledTextProps`).
  - `perfectionist/sort-objects` ordena object literals e padrões desestruturados (ex.: `const { a, b } = props`) de forma puramente alfabética — não há conceito de obrigatório/opcional no nível da desestruturação.
- **As propriedades de `interface` e `type` devem estar em ordem alfabética em todo o projeto**, não só onde o `perfectionist` já impõe isso via lint (`src/ds-components/`/`src/components/`, acima). Fora desse escopo (ex.: `src/models/`, `src/utils/`, `src/pages/`) não é imposto por lint — revise manualmente. Ver `ViaCepAddress` em `src/models/viaCep/viaCep.ts` e `ParsedDate`/`FormatDateOptions` em `src/utils/dates/dates.ts` como exemplos já conformes.
- **Os blocos `scripts`, `dependencies` e `devDependencies` em `package.json` devem estar em ordem alfabética.** Não é imposto por lint (`perfectionist` não cobre arquivos `.json`) — revise manualmente ao adicionar, renomear ou remover um script/dependência.

## Ordenação do corpo do componente

Dentro de um componente, as constantes devem seguir esta sequência (quando cada tipo estiver presente), com cada bloco separado por exatamente uma linha em branco:

1. Chamadas de **`useRef`**
2. **Hooks customizados** (ex.: `useTooltip`, qualquer hook de `src/ds-components` ou de uma pasta `hooks/` compartilhada)
3. Chamadas de **`useState`**
4. **Constantes derivadas** (booleanos e outros valores calculados a partir de props/state)

A desestruturação de props que abre o corpo da função não conta como um bloco — a primeira linha em branco aparece depois dela, antes de qualquer que seja o bloco que vier primeiro. Uma linha em branco também segue o último bloco, antes do `return`.

```tsx
export const Example = (props: ExampleProps) => {
  const { disabled, label, tooltip } = props

  const inputRef = useRef<HTMLInputElement>(null)

  const { tooltipElement, tooltipHandlers } = useTooltip(tooltip)

  const [open, setOpen] = useState(false)

  const isActive = open && !disabled

  return (...)
}
```

## Regras específicas do React

- O `eslint-plugin-react-refresh` é configurado com o preset do Vite, que habilita `react-refresh/only-export-components`. **Um arquivo que exporta um componente React deve exportar apenas componentes** (mais, opcionalmente, constantes usadas puramente em padrões seguros para fast refresh, como `displayName`) — não adicione hooks, funções utilitárias ou constantes que não sejam componentes no mesmo arquivo de um componente, ou o Fast Refresh quebra e o lint vai apontar. Coloque hooks/utils compartilhados em seu próprio arquivo.
- As regras recomendadas do `eslint-plugin-react-hooks` estão ativas (`rules-of-hooks`, `exhaustive-deps`) — trate os avisos de `exhaustive-deps` como bugs reais a corrigir, não para suprimir com um comentário de disable inline.
- Apenas componentes de função, sem componentes de classe — alinhado com o código existente e com a configuração de ESLint baseada em hooks.
- `react/prop-types` está desligado e não há validação de props em runtime — as props devem ser tipadas com interfaces/types do TypeScript, já que essa é a única camada de segurança de tipos para os contratos de componente.

## Convenções de Git

- As mensagens de commit seguem **Conventional Commits**: prefixe o assunto com um tipo (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`, `style:`, `perf:`, `build:`, `ci:`, `revert:`, opcionalmente `type(scope):`) dependendo da mudança (ex.: `feat: add Text atom`, `fix: correct zIndex layer gaps`).
- Mantenha a **primeira linha com menos de 72 caracteres**. Coloque qualquer detalhe adicional no corpo do commit depois de uma linha em branco, em vez de deixar o assunto ficar longo demais.
- **Sempre execute `bun run test` antes de commitar** — nunca commite com a suíte de testes falhando.

### Estas regras são impostas pelo Husky, não apenas documentadas

- `core.hooksPath` está definido como `.husky/_` (via `husky init`); o script `prepare` (`"prepare": "husky"`) refaz esse link a cada `bun install`, para que os hooks funcionem para qualquer pessoa que clone o repositório — não apague o script `prepare`.
- `.husky/pre-commit` executa `bunx lint-staged && bun run test` — o commit só chega a rodar a suíte de testes se o `lint-staged` passar, e é bloqueado se qualquer um dos dois falhar. `lint-staged.config.js` (na raiz) roda `eslint --fix` + `prettier --write` nos arquivos `.js`/`.jsx`/`.mjs`/`.cjs`/`.ts`/`.tsx` staged e só `prettier --write` em `.json`/`.css`/`.md`/`.html` staged — o `lint-staged` já re-adiciona ao stage os arquivos que ele corrigir.
- `.husky/commit-msg` executa `bunx commitlint --edit "$1"`, que rejeita o commit se a linha de assunto não seguir o formato `type:`/`type(scope):` do Conventional Commits ou exceder 72 caracteres. `commitlint.config.js` (na raiz) estende o preset `@commitlint/config-conventional` (que já traz a lista padrão de tipos — `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `style`, `perf`, `build`, `ci`, `revert`) e sobrescreve apenas `header-max-length` (72) — para restringir novamente a lista de tipos permitidos, adicione uma regra `type-enum` lá.
- Scripts Node-only (git hooks auxiliares, etc.) vão em `scripts/` e recebem um bloco dedicado no `eslint.config.js` com `globals.node` (para `process`, etc.) em vez do `globals.browser` usado em todo o resto — a pasta está vazia hoje (a validação de commit foi migrada para o `commitlint`), mas continua sendo o lugar certo para qualquer script Node futuro.
- Os arquivos de hook em `.husky/` devem manter o bit de execução (`100755`) no git, não `100644` — sistemas de arquivos do Windows não rastreiam isso nativamente, então depois de criar/editar um arquivo de hook, corrija-o explicitamente com `git update-index --chmod=+x .husky/<hook-name>` caso `git ls-files --stage .husky/<hook-name>` mostre `100644`.
