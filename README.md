![Logo do Gerenciador de Planos de Leitura](logo.png)

# Gerenciador de Planos de Leitura

Bem-vindo ao **Gerenciador de Planos de Leitura**, uma aplicação web que ajuda você a organizar e acompanhar seus planos de leitura de livros de forma prática e eficiente. Crie planos personalizados, defina datas e periodicidade, acompanhe seu progresso e exporte seus planos para sua agenda.

## 📖 Visão Geral

O Gerenciador de Planos de Leitura permite que você:
- Crie planos de leitura com base em datas ou número de dias.
- Escolha a periodicidade (diária ou semanal) e os dias da semana para leitura.
- Acompanhe o progresso de leitura com barras de progresso e marcação de dias lidos.
- Edite ou exclua planos existentes.
- Exporte seus planos para a agenda no formato `.ics` (compatível com Google Calendar, Outlook, etc.).
- Sincronize seus dados com o Firebase para backup e acesso em diferentes dispositivos.
- Faça login ou cadastro com email e senha para gerenciar seus planos de forma segura.

## 🚀 Funcionalidades

- **Criação de Planos:** Adicione novos planos de leitura com título, páginas inicial e final, datas de início e fim, e periodicidade.
- **Periodicidade Flexível:** Escolha entre leitura diária ou semanal, selecionando os dias da semana para leitura.
- **Acompanhamento de Progresso:** Marque os dias como lidos e veja o progresso em uma barra visual.
- **Recálculo de Planos:** Ajuste planos atrasados definindo uma nova data de fim ou número de páginas por dia.
- **Exportação para Agenda:** Exporte seus planos de leitura para sua agenda no formato `.ics`.
- **Autenticação e Sincronização:** Faça login ou cadastre-se com email e senha, e sincronize seus planos com o Firebase.
- **Interface Intuitiva:** Navegue facilmente entre a lista de planos e o formulário de criação/edição.

> **Nota:** As funcionalidades de exportar/importar planos em formato JSON e limpar dados locais foram removidas para simplificar a aplicação e focar nas funcionalidades principais.

## 🛠️ Tecnologias Utilizadas

- **HTML5, CSS3 e JavaScript (ES6+):** Para a estrutura, estilo e lógica da aplicação.
- **Firebase:** Autenticação (email/senha) e Firestore para armazenamento de dados.
- **Material Symbols:** Ícones para a interface.
- **Cloudflare Web Analytics:** Para monitoramento de uso (opcional).

## 📋 Pré-requisitos

- Um navegador moderno (Chrome, Firefox, Edge, Safari, etc.).
- Conexão com a internet para autenticação e sincronização com o Firebase.
- (Opcional) Uma conta no Firebase para configurar o backend, caso você queira hospedar sua própria versão.

## ⚙️ Como Executar o Projeto

### 1. Clone o Repositório
```bash
git clone https://github.com/fernnog/Plano-leitura-livros.git
cd Plano-leitura-livros
