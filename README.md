# 🧠 Gerenciador de Planos de Leitura & Neuroaprendizagem Teológica

![Versão Atual](https://img.shields.io/badge/version-1.0.3-blue.svg) ![Status](https://img.shields.io/badge/status-stable-success.svg) ![License](https://img.shields.io/badge/license-MIT-green.svg)

> **"Não se amoldem ao padrão deste mundo, mas transformem-se pela renovação da sua mente." — Romanos 12:2**

Bem-vindo a uma nova categoria de ferramenta de estudos. O **Gerenciador de Planos de Leitura** evoluiu de um simples rastreador de progresso para uma plataforma robusta de **Neuroteologia Aplicada**.

Este projeto parte da premissa de que a leitura teológica ou técnica não deve ser passiva. Para que haja aprendizado real e mudança de comportamento (santificação/prática), o cérebro precisa ser engajado através de mecanismos específicos de codificação, consolidação e recuperação de memória.

**➡️ [Acesse a demonstração ao vivo](https://fernnog.github.io/Plano-leitura-livros/)**

---

## 🧬 A Filosofia: Por que "Neuroaprendizagem"?

A maioria dos leitores sofre da "Curva de Esquecimento de Ebbinghaus", perdendo até 70% do que leram em 24 horas. Este software combate isso integrando princípios de neurociência cognitiva diretamente na interface do usuário.

### 1. O Ciclo M.E.T.A.
Cada sessão de leitura no aplicativo é acompanhada por um **Painel Neuro-Cognitivo** que guia o usuário por quatro estágios mentais obrigatórios:

*   **M — Mapear (Priming):** Antes de ler, o usuário é instruído a escanear o texto. Isso ativa o **Sistema Ativador Reticular (SAR)**, preparando as "gavetas mentais" para receber a informação.
*   **E — Engajar (Codificação Ativa):** Incentiva a leitura ativa (anotações, grifos). O envolvimento do córtex motor na escrita manual ou digitalização consciente aumenta a retenção.
*   **T — Traduzir (Síntese/Metacognição):** Baseado na **Técnica Feynman**. O usuário deve explicar o conceito complexo em uma frase simples.
*   **A — Aplicar (Plasticidade Neural):** O conhecimento só se torna físico no cérebro através da experiência (*Praxis*). O app exige a definição de uma micro-ação prática derivada da leitura.

### 2. Validação Cognitiva (C.A.P.E.)
Novo na versão 1.0.3, o módulo de **Checklist de Retenção** introduz uma camada final de verificação baseada no método CAPE:
*   **Confronto:** Identificação de conflitos cognitivos (o que desafiou minhas crenças?).
*   **Ancoragem:** Conexão explícita com conhecimentos prévios (Lei de Hebb).
*   **Percepção:** Registro da resposta emocional/espiritual ao texto.
*   **Esquema:** Transformação do texto linear em modelos mentais ou visuais.

---

## 🚀 Funcionalidades do Sistema

### 🧠 Módulo de Estudo Profundo
*   **Interface Split-View:** Cartão de leitura dividido em Cronograma (esquerda) e Painel Neuro (direita).
*   **Neuro-Insights Granulares:** Sistema de anotações múltiplas por sessão, permitindo registrar dúvidas (?), alertas (!), gatilhos emocionais e passos M.E.T.A. independentes.
*   **Contexto de Página:** Cada insight pode ser vinculado a um intervalo específico de páginas dentro do capítulo.
*   **Exportação Markdown (.md):** Gere arquivos formatados automaticamente para Obsidian, Notion ou Logseq, contendo todos os seus insights organizados hierarquicamente.

### 📊 Gestão e Planejamento (Core)
*   **Criação Flexível de Planos:**
    *   Por Datas (Início e Fim exatos).
    *   Por Dias (Ex: "Quero ler em 30 dias").
    *   Por Páginas (Ex: "Vou ler 10 páginas por dia").
*   **Cronograma Automático:** O algoritmo calcula a distribuição exata de páginas, respeitando dias da semana excluídos (ex: fins de semana).
*   **Painéis de Monitoramento:**
    *   ⚠️ Leituras Atrasadas (com botão de Recálculo Inteligente).
    *   🗓️ Próximas Leituras (Heatmap de carga futura).
    *   ⏸️ Planos Pausados.
*   **Auto-Scroll Inteligente:** Ao abrir o app, a tela rola suavemente para o dia de leitura atual ou a próxima meta pendente.

### ☁️ Infraestrutura & Dados
*   **Autenticação Segura:** Login via Google Firebase Auth.
*   **Persistência em Nuvem:** Firestore Database em tempo real.
*   **PWA (Progressive Web App):** Instalável em Android, iOS e Desktop.
*   **Telemetria de Debug:** Sistema de logs integrado para diagnóstico rápido de problemas em produção.

---

## 🏛️ Arquitetura Técnica

O projeto utiliza uma arquitetura modular baseada em **ES6 Modules**, garantindo separação de responsabilidades (SoC) e escalabilidade.

### Estrutura de Diretórios
```bash
/
├── index.html              # Estrutura semântica e templates de Modais
├── style.css               # Design System (Variáveis CSS, Neuro-Theme, Responsividade)
├── main.js                 # Orquestrador: Inicializa o app e gerencia eventos globais
├── manifest.json           # Configuração PWA
├── sw.js                   # Service Worker (Cache e Offline)
├── config/
│   ├── firebase-config.js  # Credenciais e inicialização do Firebase
│   └── version-config.js   # Histórico de versões e changelog
└── modules/                # Núcleo da aplicação
    ├── auth.js             # Gerencia Login/Logout/Cadastro
    ├── dom-elements.js     # Cache de seletores do DOM
    ├── firestore-service.js # Camada de dados (CRUD no NoSQL)
    ├── form-handler.js     # Validação e lógica dos formulários
    ├── neuro-notes.js      # [CORE] Lógica M.E.T.A., CAPE e Exportação MD
    ├── plano-logic.js      # Algoritmos puros (cálculo de datas, distribuição)
    ├── pwa-handler.js      # Instalação do Service Worker
    ├── state.js            # Gestão de estado local (Single Source of Truth)
    └── ui.js               # Manipulação do DOM e Renderização
```

### Design System
A interface foi construída para reduzir a carga cognitiva visual:
*   **Tipografia:** *Inter* (UI) para clareza e *Playfair Display* (Títulos) para evocar a seriedade de livros clássicos.
*   **Paleta Neuro:**
    *   `--neuro-primary`: `#1a252f` (Azul Profundo - Foco)
    *   `--neuro-accent`: `#d35400` (Laranja Queimado - Atenção/Alerta)
    *   `--neuro-bg`: `#fdfbf7` (Tom Papel - Conforto de Leitura)

---

## ⚙️ Guia de Instalação e Desenvolvimento

Para rodar este projeto localmente:

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/fernnog/Plano-leitura-livros.git
    ```
2.  **Configuração do Firebase:**
    *   Crie um projeto no console do Firebase.
    *   Habilite *Authentication* (Email/Senha) e *Firestore*.
    *   Atualize as chaves de API no arquivo `config/firebase-config.js`.
3.  **Rodar a aplicação:**
    *   Como utiliza Módulos ES6, você precisa de um servidor local (devido a políticas de CORS).
    *   Com Python: `python -m http.server`
    *   Com Node/NPM: `npx live-server`
    *   Ou use a extensão "Live Server" no VS Code.

---

## 📝 Workflow Sugerido de Estudo

1.  **Planeje:** Cadastre o livro e defina uma meta realista (ex: 15 páginas/dia).
2.  **Leia (Modo M.E.T.A.):**
    *   Abra o app. Veja a meta do dia.
    *   Faça o *Mapeamento* (escaneie o texto).
    *   Leia ativamente (*Engajamento*).
3.  **Anote:**
    *   No painel lateral, clique em **"Anotar Insight"**.
    *   Adicione suas dúvidas, erros de predição e micro-ações práticas.
4.  **Verifique (C.A.P.E.):**
    *   Clique em **"Checklist Retenção"**.
    *   Valide se você cumpriu os 4 pilares da retenção.
5.  **Consolide:**
    *   Ao final do livro, clique em **"Baixar Resumo"**.
    *   Importe o Markdown no seu "Segundo Cérebro" (Obsidian/Notion).

---

<footer>
    <p align="center">© 2024-2025 Gerenciador de Planos de Leitura - Desenvolvido com foco na Excelência Cognitiva e Espiritual.</p>
</footer>
```
