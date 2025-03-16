# Gerenciador de Planos de Leitura

O **Gerenciador de Planos de Leitura** é uma aplicação web simples e funcional para organizar planos de leitura de livros. Ele permite criar, editar, acompanhar e gerenciar planos com base em intervalos de páginas por dia, oferecendo flexibilidade para definir períodos e periodicidade. Os dados são salvos localmente no navegador usando `localStorage`, e há opções para exportar e importar planos em formato JSON.

## Funcionalidades

- **Criação de Planos**: Defina um plano de leitura especificando o título do livro, a página de início e a página de fim, o período (por datas ou número de dias) e a periodicidade (diária ou semanal com dias específicos).
- **Exibição de Intervalos**: Cada dia do plano mostra um intervalo de páginas a ser lido (ex.: "Leia da página 5 à 15"), calculado automaticamente com base no total de páginas e no número de dias de leitura.
- **Acompanhamento de Progresso**: Marque os dias como lidos e acompanhe o progresso com uma barra visual e percentual.
- **Edição e Recálculo**: Edite planos existentes ou recalcule os intervalos de páginas para os dias restantes em caso de atrasos.
- **Gerenciamento de Dados**: Exporte planos para JSON, importe planos salvos ou limpe todos os dados armazenados.
- **Persistência**: Os planos são salvos automaticamente no `localStorage` do navegador.

## Tecnologias Utilizadas

- **HTML**: Estrutura da interface.
- **CSS**: Estilização responsiva e visual atraente.
- **JavaScript**: Lógica de interação, manipulação do DOM e gerenciamento de dados.

## Instalação

1. **Clone o Repositório** (se aplicável):
   ```bash
   git clone https://github.com/seu-usuario/gerenciador-planos-leitura.git
   cd gerenciador-planos-leitura
