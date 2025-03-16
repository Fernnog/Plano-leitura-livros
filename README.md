# Gerenciador de Planos de Leitura Web

Este projeto é uma página web simples para gerenciar planos de leitura de livros. Permite que usuários cadastrem e acompanhem o progresso de leitura de um ou mais livros simultaneamente, definindo períodos, periodicidades e marcando o progresso diário. Os dados são sincronizados e salvos utilizando o Firebase do Google.

## Funcionalidades Principais

*   **Cadastro de Planos de Leitura:**
    *   Inserção do título do livro, total de páginas e período de leitura (data de início e fim).
    *   Definição da periodicidade de leitura: diária, em dias específicos da semana (selecionáveis), ou opções predefinidas como "Segunda, Quarta e Sexta".
*   **Cálculo Automático de Páginas por Dia:**
    *   O sistema calcula e propõe a quantidade de páginas a serem lidas em cada dia do período definido, considerando a periodicidade.
*   **Acompanhamento do Progresso:**
    *   Exibição de um calendário ou lista de dias do plano, com a quantidade de páginas a serem lidas em cada data.
    *   Opção para marcar cada dia como "lido" através de checkboxes.
    *   Barra de progresso visual e porcentagem de páginas lidas para cada plano.
*   **Gestão de Múltiplos Planos:**
    *   Possibilidade de cadastrar e gerenciar múltiplos planos de leitura simultaneamente.
*   **Autenticação de Usuários (Firebase Authentication):**
    *   Sistema de autenticação discreto com login e cadastro por e-mail e senha.
    *   Opção "Esqueci a senha" para envio de link de redefinição por e-mail.
    *   Exibição discreta do e-mail do usuário autenticado e botão "Sair".
*   **Persistência de Dados (Firebase Realtime Database):**
    *   Todos os dados dos planos de leitura são salvos e sincronizados em tempo real utilizando o Firebase Realtime Database, garantindo que os dados do usuário sejam mantidos mesmo após fechar o navegador ou acessar de diferentes dispositivos.

## Funcionalidades Futuras (Em Desenvolvimento)

*   **Edição de Planos de Leitura:**
    *   Permitir que o usuário edite os detalhes de um plano de leitura já cadastrado (período, periodicidade, etc.).
*   **Recálculo de Datas e Páginas:**
    *   Implementar um sistema que detecte atrasos no plano de leitura e pergunte ao usuário se deseja recalcular as datas de leitura ou a quantidade de páginas diárias para ajustar o plano.
*   **Validação de Formulário Aprimorada:**
    *   Adicionar validações mais robustas nos formulários para garantir a consistência dos dados inseridos.
*   **Design Responsivo Avançado:**
    *   Refinar o design CSS para garantir que a página seja totalmente responsiva e funcione bem em diferentes dispositivos (desktops, tablets e smartphones).
*   **Melhorias de UI/UX:**
    *   Aprimorar a interface do usuário e a experiência do usuário para tornar a página mais intuitiva e agradável de usar.
*   **Persistência de Dados Mais Robusta (Backend):**
    *   Considerar a migração para um backend com banco de dados mais robusto para projetos futuros e maior escalabilidade.
*   **Notificações e Lembretes:**
    *   Adicionar funcionalidades de notificações ou lembretes para lembrar o usuário de realizar a leitura nos dias planejados.
*   **Gráficos de Progresso:**
    *   Implementar gráficos visuais para exibir o progresso de leitura ao longo do tempo, além da barra de progresso atual.

## Como Usar

1.  **Configuração do Firebase:**
    *   Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
    *   Habilite o método de autenticação "Email/Senha" em "Authentication".
    *   Crie um banco de dados Realtime Database em "Realtime Database".
    *   Copie as configurações do seu projeto Firebase (apiKey, authDomain, projectId, etc.) e substitua no objeto `firebaseConfig` dentro do arquivo `script.js`.
2.  **Arquivos do Projeto:**
    *   Crie os arquivos `index.html`, `style.css` e `script.js` na mesma pasta (ex: `gerenciador-leitura`).
    *   Cole o código HTML no `index.html`, o CSS no `style.css` e o JavaScript no `script.js`.
3.  **Abra no Navegador:**
    *   Abra o arquivo `index.html` diretamente no seu navegador web.

Agora você pode começar a usar o gerenciador de planos de leitura! Faça login ou cadastre-se para começar a criar e acompanhar seus planos.

---

Este README.md fornece uma visão geral do projeto, suas funcionalidades e como começar a usá-lo. Você pode personalizá-lo ainda mais com informações adicionais, como instruções de instalação mais detalhadas, screenshots, etc., conforme necessário.
