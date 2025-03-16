# Gerenciador de Planos de Leitura

O **Gerenciador de Planos de Leitura** é uma aplicação web simples e funcional para organizar planos de leitura de livros. Ele permite criar, editar, acompanhar e gerenciar planos com base em intervalos de páginas por dia, oferecendo flexibilidade para definir períodos e periodicidade. Os dados são salvos localmente no navegador usando `localStorage`, e há opções para exportar e importar planos em formato JSON.

## Funcionalidades

- **Navegação Simplificada**: A interface agora conta com botões "Novo" e "Início" para facilitar a navegação entre a criação de planos e a visualização dos planos em andamento.
    - **Novo Plano**: Clique no botão "Novo" no cabeçalho para acessar o formulário de criação de planos de leitura.
    - **Tela Inicial (Início)**: Utilize o botão "Início" para retornar ao painel principal, onde seus planos de leitura ativos são exibidos e gerenciados.

- **Criação de Planos**: Defina um plano de leitura especificando o título do livro, a página de início e a página de fim, o período (por datas ou número de dias) e a periodicidade (diária ou semanal com dias específicos).
- **Exibição de Intervalos Aprimorada**: Cada dia do plano mostra um intervalo de páginas a ser lido (ex.: "Leia da página 5 à 15"), calculado automaticamente com base no total de páginas e no número de dias de leitura. A exibição foi aprimorada com **cores alternadas** para facilitar o acompanhamento visual das datas.
- **Acompanhamento de Progresso Visual**: Marque os dias como lidos e acompanhe o progresso com uma barra visual e percentual. As datas marcadas como lidas agora são exibidas com um **efeito tachado**, indicando visualmente o cumprimento da meta de leitura para aquele dia.
- **Edição e Recálculo**: Edite planos existentes ou recalcule os intervalos de páginas para os dias restantes em caso de atrasos, mantendo seu plano sempre atualizado.
- **Gerenciamento de Dados Robusto**:
    - **Exportação para JSON**: Exporte seus planos de leitura para um arquivo JSON. O formato do nome do arquivo agora segue o padrão `AAAAMMDD_HHMM_Plano de leitura de livros.JSON`, facilitando a organização e identificação dos seus backups.
    - **Importação de JSON**: Importe planos de leitura previamente salvos a partir de arquivos JSON.
    - **Limpeza de Dados**: Limpe todos os dados armazenados no navegador com um único clique.
- **Persistência Local**: Seus planos são salvos automaticamente no `localStorage` do navegador, garantindo que seus dados permaneçam acessíveis mesmo após fechar e reabrir o navegador.

## Tecnologias Utilizadas

- **HTML**: Estrutura da interface de usuário.
- **CSS**: Estilização responsiva, design visual atraente e alternância de cores para melhor usabilidade.
- **JavaScript**: Lógica de interação do usuário, manipulação dinâmica do DOM, cálculo dos planos de leitura e gerenciamento de dados (salvamento, exportação e importação).

## Instalação

1. **Utilize diretamente no navegador**:
   - Basta abrir o arquivo `index.html` em seu navegador web. Não é necessária instalação complexa ou servidores.

2. **Clone o Repositório** (se aplicável, para fins de desenvolvimento ou modificação):
   ```bash
   git clone https://github.com/seu-usuario/gerenciador-planos-leitura.git # Substitua pelo link do seu repositório
   cd gerenciador-planos-leitura
   # Abra o arquivo index.html no seu navegador
