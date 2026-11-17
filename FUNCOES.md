# Referência rápida das funções

Este documento resume o propósito das funções encontradas na API e no frontend, organizadas por módulo e arquivo.

## API

### Inicialização e banco de dados

#### [`api/src/index.js`](./api/src/index.js)

- Rota `GET /`: consulta e retorna a versão do PostgreSQL; em caso de falha, responde com erro.
- Callback de `app.listen`: inicia o servidor e registra no console a porta utilizada.
- Callback de `.then`: extrai as linhas da resposta da consulta de verificação do banco.

#### [`api/src/configs/index.js`](./api/src/configs/index.js)

- `query`: encaminha uma consulta SQL e seus parâmetros ao pool do PostgreSQL.
- `getClient`: obtém uma conexão individual do pool, usada em transações.

#### [`api/src/middleware/auth.js`](./api/src/middleware/auth.js)

- `authenticate`: valida o token Bearer JWT, confirma que ele contém um usuário e disponibiliza os dados em `req.user`.

### Serviços

#### [`api/src/services/choices.js`](./api/src/services/choices.js)

- `getChoiceByID`: busca uma escolha pelo identificador; pode usar um executor específico e bloquear a linha para atualização.
- `registerChoice`: insere em `ESCOLHAS` o usuário, a dificuldade e o status inicial `Andamento`; retorna os dados gravados. Requer a coluna `status`, com os valores `Andamento` e `Finalizada`.
- `finishChoice`: marca a escolha como `Finalizada` no executor de consulta informado.

#### [`api/src/services/enemies.js`](./api/src/services/enemies.js)

- `getEnemyByID`: busca um inimigo pelo identificador, usando opcionalmente o executor da transação atual.
- `getEnemiesByDifficulty`: busca em `INIMIGOS` os inimigos associados à dificuldade informada.
- `getEnemyStatsForPlayerLevel`: define o nível do inimigo pela dificuldade (fácil: jogador -2 após o nível 3; médio: mesmo nível; difícil: jogador +2) e aplica crescimento composto de 20% nos atributos, com defesa limitada a 18.

#### [`api/src/services/rewards.js`](./api/src/services/rewards.js)

- `getRewardByID`: busca uma recompensa pelo identificador, usando opcionalmente o executor da transação atual.
- `getRewardsByDifficulty`: busca em `RECOMPENSAS` as recompensas associadas à dificuldade informada.

#### [`api/src/services/events.js`](./api/src/services/events.js)

- `getEventByID`: busca um evento pelo identificador. Pode receber um executor de consultas e, opcionalmente, bloquear a linha para atualização.
- `sortEventsByDifficulty`: monta uma lista aleatória de eventos para a dificuldade informada, escolhendo entre inimigos e recompensas.
  - `pickRandomIndex`: seleciona um item aleatório de uma lista.
  - `eventSorter`: define se a próxima ocorrência será inimigo ou recompensa, com uma distribuição influenciada pela dificuldade.
- `registerEvent`: confirma que a escolha pertence ao usuário autenticado e ainda está ativa, busca o inimigo ou recompensa pela dificuldade da escolha e cria o evento em uma transação; inimigos recebem atributos escalados pelo nível do jogador, enquanto o XP permanece o valor do banco.
- `updateEvent`: atualiza no evento somente os campos permitidos (`status`, `vida`, `xp`, `defesa` e `ataque`).
- `attack`: aceita somente eventos ativos de inimigos pertencentes ao usuário, executa uma rodada de combate e persiste a vida atual do usuário e do evento na mesma transação; retorna também `userAttack` e `userDefense`.
  - `runD20`: gera um resultado aleatório de 1 a 20 para as jogadas do combate.
- `giveUp`: aceita somente um evento ativo de inimigo pertencente ao usuário, marca o evento como `Desistido` e a escolha como `Finalizada`, sem alterar vida ou XP.
- `claimReward`: aceita somente recompensas ativas pertencentes ao usuário, restaura a vida sem ultrapassar o novo `vida_total`, soma o XP e aplica os atributos do nível alcançado; quando o total de vida aumenta, a vida atual aumenta pelo mesmo valor. Retorna saúde, XP, nível, ataque e defesa atualizados e marca o evento como `Resgatado` na mesma transação.
- `createEventError`: cria erros de evento com o status HTTP apropriado para o controlador.
- `ensureActiveEvent`: rejeita eventos que não estejam em andamento.
- `ensureActiveChoice`: rejeita escolhas finalizadas.
- `withUserEventTransaction`: bloqueia as linhas do usuário, evento e escolha e executa as operações em uma transação compartilhada.

#### [`api/src/services/users.js`](./api/src/services/users.js)

- `getClassStats`: retorna os atributos iniciais de uma classe válida para cadastro.
- `getStatAtLevel`: calcula o valor de um atributo no nível informado, distribuindo os aumentos até o limite definido.
- `getStatsForLevel`: calcula `vida_total`, `ataque` e `defesa` da classe para o nível atual.
- `getUserByID`: busca um usuário pelo identificador; pode usar um executor específico e bloquear a linha para atualização.
- `updateUser`: atualiza os campos permitidos e, ao atualizar XP ou classe, recalcula `nivel`, `ataque` e `defesa`; `vida_total` só aumenta e nunca diminui. Cada nível aumenta um atributo por vez, em rotação; quando `vida_total` aumenta, `vida` também aumenta pelo mesmo valor, sem ultrapassar o novo total.
- `getXPForLevel`: calcula o XP necessário para alcançar um nível, conforme a curva configurada.
- `getLevelForXP`: calcula o maior nível alcançado para uma quantidade de XP, limitado ao nível máximo.
- `register`: gera o hash da senha e insere o usuário com seus dados iniciais, definindo `vida_total` igual à vida inicial; retorna também os atributos de progressão.
- `getUserByEmail`: busca usuários pelo email, incluindo atributos de progressão e o hash da senha para autenticação.
- `convertXPToHealth`: restaura a vida até `vida_total`, gastando um ponto de XP por ponto de vida faltante; se o XP acabar antes, zera o XP e o nível passa a 1. Recalcula ataque e defesa sem reduzir `vida_total`.
- `invalidCredentialsError`: cria o erro genérico de credenciais inválidas com código HTTP `401`.
- `login`: valida o email e a senha e, se estiverem corretos, cria um token JWT com validade de oito horas.

### Controladores

#### [`api/src/controllers/choices.js`](./api/src/controllers/choices.js)

- `registerChoice`: obtém o usuário autenticado do token Bearer, valida `dificuldade`, chama o serviço de escolhas e responde com o resultado da inserção.

#### [`api/src/controllers/events.js`](./api/src/controllers/events.js)

- `generateEvents`: lê a dificuldade da consulta HTTP, solicita a lista de eventos ao serviço e devolve a resposta.
- `registerEvent`: recebe o tipo e os identificadores da escolha e do inimigo/recompensa; o usuário autenticado vem do token Bearer, e os atributos do evento são carregados pelo serviço.
  - Callback de `requiredValues.some`: detecta valores obrigatórios ausentes.
- `attack`: obtém o usuário do token Bearer, valida `eventID`, chama o serviço de combate e converte erros de evento/usuário em respostas HTTP.
- `giveUp`: obtém o usuário do token Bearer, valida `eventID`, chama o serviço para desistir do evento e encerra a escolha.
- `claimReward`: obtém o usuário do token Bearer, valida `eventID`, solicita o resgate da recompensa e converte erros de evento/usuário em respostas HTTP.

#### [`api/src/controllers/users.js`](./api/src/controllers/users.js)

- `register`: valida os dados de cadastro, aceita as classes `guerreiro`, `mago` e `bandido`, define os atributos iniciais e chama o serviço de usuários.
- `login`: valida email e senha, chama o serviço de autenticação e converte falhas de credenciais em resposta HTTP `401`.
- `getUser`: obtém o perfil atualizado do usuário autenticado, sem retornar o hash da senha.
- `convertXPToHealth`: converte o XP do usuário autenticado em vida e responde com os valores atualizados.
- `updateUser`: atualiza os campos de perfil permitidos do usuário autenticado, impede a edição direta dos atributos de progressão, não retorna o hash da senha e responde `404` se o usuário do token não existir.

### Rotas

#### [`api/src/routers/index.js`](./api/src/routers/index.js)

- Função exportada: registra no aplicativo Express as rotas de exemplo, eventos, usuários e escolhas.

#### [`api/src/routers/choices.js`](./api/src/routers/choices.js)

- Função exportada: registra `POST /choices/register`, protegido pelo middleware de autenticação.

#### [`api/src/routers/events.js`](./api/src/routers/events.js)

- Função exportada: registra `GET /game` e as rotas protegidas `POST /events/register`, `POST /events/attack`, `POST /events/give-up` e `POST /events/rewards/claim`.

#### [`api/src/routers/users.js`](./api/src/routers/users.js)

- Função exportada: registra `POST /auth/register` e `POST /auth/login`.
- Também registra `GET /users/me`, `POST /users/me/convert-xp-to-health` e `PATCH /users/me`, protegidos pelo middleware de autenticação.

#### [`api/src/routers/example.js`](./api/src/routers/example.js)

- Função exportada: registra `GET /example`.
- Callback da rota: responde com uma mensagem simples de confirmação.

## Frontend

#### [`frontend/frontend_faith_collapsing/src/layouts/MainLayout.vue`](./frontend/frontend_faith_collapsing/src/layouts/MainLayout.vue)

- `toggleLeftDrawer`: abre ou fecha o menu lateral.

#### [`frontend/frontend_faith_collapsing/src/pages/IndexPage.vue`](./frontend/frontend_faith_collapsing/src/pages/IndexPage.vue)

- `aoClicarFacil`, `aoClicarMedio` e `aoClicarDificil`: tratam os cliques nos cards de dificuldade; atualmente apenas registram a ação no console.
- `aoClicarConversaoXp`: trata o clique no botão de conversão de XP; atualmente apenas registra a ação no console.

#### [`frontend/frontend_faith_collapsing/src/pages/LoginPage.vue`](./frontend/frontend_faith_collapsing/src/pages/LoginPage.vue)

- `onLogin`: envia email e senha à API, salva o token recebido e navega para a página inicial. Em caso de erro, mostra uma notificação.
- Regras inline dos campos: verificam se o email e a senha foram preenchidos e se o email tem um formato básico válido.
- Callback do ícone de senha: alterna entre exibir a senha como texto ou ocultá-la.

#### [`frontend/frontend_faith_collapsing/src/pages/RegisterPage.vue`](./frontend/frontend_faith_collapsing/src/pages/RegisterPage.vue)

- `onCadastrar`: envia os dados do formulário à API; em caso de sucesso, mostra uma notificação e navega para o login.
- Regras inline dos campos: verificam nome, formato do email, preenchimento e tamanho mínimo da senha, confirmação da senha e seleção de classe.
- Callback do ícone de senha: alterna entre exibir a senha como texto ou ocultá-la.

#### [`frontend/frontend_faith_collapsing/src/router/index.js`](./frontend/frontend_faith_collapsing/src/router/index.js)

- Callback de `defineRouter`: cria o roteador e escolhe o modo de histórico adequado ao ambiente.
- `scrollBehavior`: posiciona a página no início após a navegação.

#### [`frontend/frontend_faith_collapsing/src/router/routes.js`](./frontend/frontend_faith_collapsing/src/router/routes.js)

- Callbacks `component`: carregam os componentes de layout e páginas sob demanda, incluindo a página de erro 404.

#### Arquivos sem funções próprias

- [`frontend/frontend_faith_collapsing/src/App.vue`](./frontend/frontend_faith_collapsing/src/App.vue): apenas apresenta a rota atual.
- [`frontend/frontend_faith_collapsing/src/components/EssentialLink.vue`](./frontend/frontend_faith_collapsing/src/components/EssentialLink.vue): declara propriedades para exibir um link; não define funções próprias.
- [`frontend/frontend_faith_collapsing/src/pages/ErrorNotFound.vue`](./frontend/frontend_faith_collapsing/src/pages/ErrorNotFound.vue): apresenta a página 404; não define funções próprias.
