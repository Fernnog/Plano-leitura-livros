![Logo do Gerenciador de Planos de Leitura](logo.png)

# Gerenciador de Planos de Leitura

Bem-vindo ao **Gerenciador de Planos de Leitura**, uma aplicação web que ajuda você a organizar e acompanhar seus planos de leitura de livros de forma prática e eficiente. Crie planos personalizados, defina datas e periodicidade, acompanhe seu progresso, adicione links para suas anotações, exporte seus planos para sua agenda e veja rapidamente suas próximas leituras.

## 📖 Visão Geral

O Gerenciador de Planos de Leitura permite que você:

*   Crie planos de leitura com base em datas ou número de dias.
*   Associe um link do Google Drive (ou qualquer URL) a cada plano para acesso rápido às suas anotações.
*   Escolha a periodicidade (diária ou semanal) e os dias da semana para leitura.
*   Acompanhe o progresso de leitura com barras de progresso e marcação de dias lidos.
*   **NOVO:** Visualize rapidamente as próximas 3 leituras agendadas de todos os seus planos ativos.
*   Edite ou exclua planos existentes.
*   Edite facilmente o link associado a um plano a qualquer momento.
*   Exporte seus planos para a agenda no formato `.ics` (compatível com Google Calendar, Outlook, etc.).
*   Sincronize seus dados com o Firebase para backup e acesso em diferentes dispositivos.
*   Faça login ou cadastro com email e senha para gerenciar seus planos de forma segura.

## 🚀 Funcionalidades

*   **Criação de Planos:** Adicione novos planos de leitura com título, páginas inicial e final, datas de início e fim, e periodicidade.
*   **Link para Anotações:** Adicione um link (ex: Google Drive) durante a criação ou edite-o posteriormente para acessar rapidamente suas notas sobre o livro.
*   **Periodicidade Flexível:** Escolha entre leitura diária ou semanal, selecionando os dias da semana para leitura.
*   **Acompanhamento de Progresso:** Marque os dias como lidos e veja o progresso em uma barra visual e na contagem de páginas.
*   **NOVO: Resumo de Próximas Leituras:** Na tela principal (abaixo dos botões de ação), veja um resumo das suas próximas 3 tarefas de leitura (dias futuros ainda não marcados como lidos), incluindo data, título do livro e páginas. Ideal para saber o que vem a seguir sem abrir cada plano individualmente.
*   **Recálculo de Planos:** Ajuste planos atrasados definindo uma nova data de fim ou número de páginas por dia.
*   **Exportação para Agenda:** Exporte seus planos de leitura (com horários definidos por você) para sua agenda no formato `.ics`.
*   **Autenticação e Sincronização:** Faça login ou cadastre-se com email e senha, e sincronize seus planos com o Firebase Firestore. Seus dados ficam seguros na nuvem.
*   **Interface Intuitiva:** Navegue facilmente entre a lista de planos e o formulário de criação/edição. Use o paginador flutuante para acesso rápido aos planos.

> **Nota:** As funcionalidades de exportar/importar planos em formato JSON e limpar dados locais foram removidas para simplificar a aplicação e focar nas funcionalidades principais integradas ao Firebase.

## 🛠️ Tecnologias Utilizadas

*   **HTML5, CSS3 e JavaScript (ES6+ Modules):** Para a estrutura, estilo e lógica da aplicação.
*   **Firebase:**
    *   **Authentication:** Login/cadastro com Email e Senha.
    *   **Firestore:** Banco de dados NoSQL para armazenamento dos planos de leitura na nuvem.
*   **Material Symbols:** Ícones para a interface.
*   **Cloudflare Web Analytics:** Para monitoramento de uso (opcional).

## 📋 Pré-requisitos

*   Um navegador moderno (Chrome, Firefox, Edge, Safari, etc.).
*   Conexão com a internet para autenticação e sincronização com o Firebase.

## ⚙️ Como Executar o Projeto

### 1. Acesso Online

A maneira mais fácil é acessar a versão hospedada no GitHub Pages:
[Acessar Gerenciador de Planos de Leitura](https://fernnog.github.io/Plano-leitura-livros/)

### 2. Execução Local (Opcional)

Se desejar executar localmente:

```bash
# 1. Clone o Repositório
git clone https://github.com/fernnog/Plano-leitura-livros.git
cd Plano-leitura-livros

# 2. Abra o arquivo index.html
#    Basta abrir o arquivo `index.html` diretamente no seu navegador.
#    (Não é necessário um servidor local, pois usa módulos ES6 e não tem dependências complexas de build)


