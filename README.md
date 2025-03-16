# Gerenciador de Planos de Leitura

O **Gerenciador de Planos de Leitura** é uma aplicação web simples e funcional para organizar planos de leitura de livros. Ele permite criar, editar, acompanhar e gerenciar planos com base em intervalos de páginas por dia, oferecendo flexibilidade para definir períodos e periodicidade. Os dados são salvos localmente no navegador usando `localStorage`, e há opções para exportar e importar planos em formato JSON, além de exportar eventos para a agenda.

## Funcionalidades

- **Navegação Simplificada com Botões "Novo" e "Início"**: A interface agora conta com botões "Novo" e "Início" no cabeçalho para facilitar a navegação intuitiva entre a criação de planos e a visualização dos planos em andamento.
    - **Novo Plano**: Clique no botão "Novo" no cabeçalho para acessar o formulário de criação de planos de leitura.
    - **Tela Inicial (Início)**: Utilize o botão "Início" para retornar ao painel principal, onde seus planos de leitura ativos são exibidos e gerenciados.

- **Criação de Planos Flexível**: Defina um plano de leitura especificando o título do livro, a página de início e a página de fim, o período (por datas ou número de dias) e a periodicidade (diária ou semanal com seleção de dias da semana).
- **Exibição de Intervalos Aprimorada e Visualmente Clara**: Cada dia do plano exibe claramente o intervalo de páginas a serem lidas (ex.: "Páginas 5 a 15"), calculado automaticamente. A visualização foi aprimorada com:
    - **Cores Alternadas**: Facilita o acompanhamento visual das datas do plano.
    - **Efeito Tachado em Dias Lidos**: As datas marcadas como lidas são exibidas com um efeito tachado, indicando visualmente o cumprimento da meta de leitura para aquele dia.
- **Acompanhamento de Progresso Detalhado**:
    - **Barra de Progresso Visual**: Acompanhe o progresso de cada plano com uma barra de progresso colorida e intuitiva.
    - **Percentual e Páginas Lidas**: Veja o percentual de progresso e o número de páginas lidas em relação ao total de páginas do livro.
- **Edição e Recálculo Inteligente**:
    - **Edição de Planos**: Modifique planos de leitura existentes para ajustar metas ou corrigir informações.
    - **Recálculo de Planos Atrasados**: Recalcule automaticamente os intervalos de páginas para os dias restantes em planos atrasados, permitindo que você retome o plano de leitura de forma eficaz.
- **Gerenciamento de Dados Robusto e Versátil**:
    - **Exportação para JSON**: Exporte seus planos de leitura para um arquivo JSON para backup ou compartilhamento. Os arquivos JSON são nomeados seguindo o padrão `AAAAMMDD_HHMM_Plano de leitura de livros.json`, facilitando a organização.
    - **Importação de JSON**: Importe planos de leitura previamente salvos a partir de arquivos JSON, restaurando seus planos rapidamente.
    - **Limpeza de Dados**: Limpe todos os dados de planos de leitura armazenados no navegador com um único clique, ideal para começar de novo.
    - **Exportação para Agenda (.ICS)**: Exporte os eventos de leitura de um plano selecionado para um arquivo `.ICS`, compatível com a maioria dos aplicativos de agenda (Google Calendar, Outlook, etc.). Integre seu plano de leitura diretamente ao seu calendário para lembretes e organização. **Os eventos exportados agora incluem um alarme de 15 minutos antes do horário de leitura e um link direto para a página do Gerenciador de Planos de Leitura nas notas do evento.**
- **Numeração de Planos**: Os planos de leitura na lista são numerados para facilitar a referência, especialmente útil ao exportar planos para a agenda.
- **Persistência Local e Segura**: Seus planos são salvos automaticamente e de forma segura no `localStorage` do navegador. Seus dados permanecem acessíveis somente no seu navegador, mesmo após fechar e reabrir a página.
- **Paginação para Planos Ativos**: Para melhorar a navegação quando há múltiplos planos de leitura ativos, foi implementada a paginação. Os planos são exibidos em páginas, facilitando a visualização e o acesso a todos os seus planos sem a necessidade de rolagem excessiva.

## Tecnologias Utilizadas

- **HTML**: Estrutura da interface de usuário, formulários e elementos visuais.
- **CSS**: Estilização completa da página, design responsivo para visualização ideal em dispositivos móveis e desktops, cores modernas, tipografia, barras de progresso e efeitos visuais como cores alternadas e tachado.
- **JavaScript**: Lógica de interação do usuário, manipulação dinâmica do DOM, cálculos complexos para planos de leitura, gerenciamento de dados (salvamento, exportação e importação para JSON e exportação para .ICS), validações de formulário e funcionalidades interativas da página.
- **Material Symbols**: Biblioteca de ícones para interface, utilizada para o ícone de "Agenda" no botão de exportação.

## Instalação

1. **Utilize diretamente no navegador**:
   - A forma mais simples é abrir o arquivo `index.html` diretamente em seu navegador web. Não requer instalação ou configuração de servidores.

2. **Clone o Repositório** (opcional, para desenvolvimento ou modificação):
   ```bash
   git clone https://github.com/seu-usuario/gerenciador-planos-leitura.git # Substitua pelo link do seu repositório
   cd gerenciador-planos-leitura
   # Abra o arquivo index.html no seu navegador
