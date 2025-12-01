# 🧠 Gerenciador de Planos de Leitura & Neuroaprendizagem Teológica

[![Logo](logo.png)](https://fernnog.github.io/Plano-leitura-livros/)

> **"Não se amoldem ao padrão deste mundo, mas transformem-se pela renovação da sua mente." — Romanos 12:2**

Bem-vindo a uma nova categoria de ferramenta de estudos. O **Gerenciador de Planos de Leitura** evoluiu de um simples rastreador de progresso para uma plataforma robusta de **Neuroteologia Aplicada**.

Este projeto parte da premissa de que a leitura teológica ou técnica não deve ser passiva. Para que haja aprendizado real e mudança de comportamento (santificação/prática), o cérebro precisa ser engajado através de mecanismos específicos de codificação, consolidação e recuperação de memória.

**➡️ [Acesse a demonstração ao vivo](https://fernnog.github.io/Plano-leitura-livros/)**

---

## 🧬 A Filosofia: Por que "Neuroaprendizagem"?

A maioria dos leitores sofre da "Curva de Esquecimento de Ebbinghaus", perdendo até 70% do que leram em 24 horas. Este software combate isso integrando princípios de neurociência cognitiva diretamente na interface do usuário.

### 1. O Ciclo M.E.T.A.
Cada sessão de leitura no aplicativo é acompanhada por um **Painel Neuro-Cognitivo** que guia o usuário por quatro estágios mentais obrigatórios:

*   **M — Mapear (Priming):** Antes de ler, o usuário é instruído a escanear o texto. Isso ativa o **Sistema Ativador Reticular (SAR)**, preparando as "gavetas mentais" para receber a informação, aumentando a atenção seletiva.
*   **E — Engajar (Codificação Ativa):** Incentiva a leitura ativa (anotações, grifos). O envolvimento do córtex motor na escrita manual ou digitalização consciente aumenta a retenção.
*   **T — Traduzir (Síntese/Metacognição):** Baseado na **Técnica Feynman**. O usuário deve explicar o conceito complexo em uma frase simples. Isso expõe a "ilusão de competência" (achar que sabe sem saber).
*   **A — Aplicar (Plasticidade Neural):** O conhecimento só se torna físico no cérebro através da experiência (*Praxis*). O app exige a definição de uma micro-ação prática derivada da leitura.

### 2. Gatilhos de Memória de Longo Prazo
O sistema de anotações (Modais) utiliza prompts específicos para "hackear" a amígdala e o hipocampo:

*   ⚡ **Erro de Predição (Dopamina):** O usuário registra o que o surpreendeu. O cérebro prioriza biologicamente a atualização de modelos mentais errados.
*   🔗 **Lei de Hebb (Associação):** *"Neurônios que disparam juntos, permanecem juntos."* O app força a conexão do novo conteúdo com memórias antigas ou versículos conhecidos.
*   ❤️ **Marcador Somático (Emoção):** Registro da emoção teológica (temor, gratidão, esperança). A emoção atua como uma "cola" química para a memória.
*   👁️ **Codificação Dupla:** Incentivo ao uso de elementos visuais/imaginéticos, aproveitando que o processamento visual é 60.000x mais rápido que o textual.

---

## 🚀 Funcionalidades do Sistema

### 🧠 Módulo de Estudo Profundo (Novo)
*   **Interface Split-View:** O cartão de leitura foi redesenhado. À esquerda, a gestão temporal (cronograma); à direita, o painel de gestão cognitiva.
*   **Editor de Insights M.E.T.A.:** Um ambiente focado e livre de distrações para registrar os 4 passos do método.
*   **Exportação Markdown (.md):** Não prenda seu conhecimento no app. Exporte resumos formatados automaticamente (com títulos, datas e tópicos) para ferramentas como Obsidian, Notion, Roam Research ou Logseq.
*   **Feedback Visual de Progresso:** Ícones indicadores mostram quais dias receberam tratamento cognitivo profundo, não apenas "leitura dinâmica".

### 📊 Gestão e Planejamento (Core)
*   **Criação Flexível de Planos:**
    *   Por Datas (Início e Fim exatos).
    *   Por Dias (Ex: "Quero ler em 30 dias").
    *   Por Páginas (Ex: "Vou ler 10 páginas por dia").
*   **Cronograma Automático:** O algoritmo calcula exatamente quais páginas devem ser lidas em cada dia, pulando dias da semana excluídos (ex: fins de semana).
*   **Reavaliação de Carga:** Um quadro visual ("Heatmap" tabular) mostra a média de páginas por dia da semana, permitindo identificar dias sobrecarregados.
*   **Recálculo Inteligente:** Se você atrasar, o sistema oferece um botão para redistribuir as páginas restantes pelos dias que faltam, sem estresse.
*   **Painéis de Monitoramento:**
    *   ⚠️ Leituras Atrasadas.
    *   🗓️ Próximas Leituras.
    *   ⏸️ Planos Pausados.

### ☁️ Infraestrutura & Dados
*   **Autenticação Segura:** Login via Google Firebase Auth.
*   **Persistência em Nuvem:** Todos os planos, progresso e neuro-anotações são salvos no Firebase Firestore em tempo real.
*   **PWA (Progressive Web App):** O aplicativo pode ser instalado no celular ou desktop, funcionando como um app nativo.

---

## 🏛️ Arquitetura Técnica

O projeto utiliza uma arquitetura baseada em **Módulos ES6 (EcmaScript Modules)**, garantindo separação de responsabilidades (SoC), manutenibilidade e escalabilidade. Não há "código espaguete"; cada arquivo tem uma função clara.

### Estrutura de Diretórios


Plano de Evolução: Arquivo README.md Completo
Aqui está o conteúdo integral, revisado e expandido, pronto para ser copiado para o seu arquivo README.md.
code
Markdown
/
├── index.html # Estrutura semântica e templates de Modais
├── style.css # Design System (Variáveis CSS, Grid, Responsividade)
├── main.js # Orquestrador: Inicializa o app e liga os eventos
├── manifest.json # Configuração PWA
└── modules/ # Cérebro da aplicação
├── auth.js # Gerencia Login/Logout/Cadastro no Firebase
├── dom-elements.js # Cache de seletores do DOM (evita queries repetitivas)
├── firestore-service.js # Camada de dados (CRUD no NoSQL)
├── form-handler.js # Validação e lógica dos formulários de entrada
├── neuro-notes.js # [CORE] Lógica dos modais M.E.T.A. e exportação MD
├── plano-logic.js # Algoritmos puros (cálculo de datas, distribuição de pág.)
├── pwa-handler.js # Instalação do Service Worker
├── state.js # Gestão de estado local (Single Source of Truth)
└── ui.js # Manipulação do DOM e Renderização de Componentes

### Design System
A interface foi construída para reduzir a carga cognitiva visual:
*   **Tipografia:** *Inter* (UI) para clareza e *Playfair Display* (Títulos) para evocar a seriedade de livros clássicos.
*   **Paleta de Cores:**
    *   `--primary`: Azul Profundo (Foco/Sobriedade).
    *   `--accent`: Laranja Queimado (Atenção/Destaque).
    *   `--bg-body`: Off-white/Papel (Redução de fadiga ocular).

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
    *   Atualize as chaves de API no arquivo `config/firebase-config.js` (ou onde estiverem importadas).
3.  **Rodar a aplicação:**
    *   Como utiliza Módulos ES6, você precisa de um servidor local (devido a políticas de CORS).
    *   Se tiver Python instalado: `python -m http.server`
    *   Ou use a extensão "Live Server" no VS Code.

---

## 📝 Como Utilizar para Estudo (Workflow Sugerido)

1.  **Planeje:** Cadastre o livro e defina uma meta realista (ex: 15 páginas/dia).
2.  **Leia (Modo M.E.T.A.):**
    *   Abra o app. Veja a meta do dia.
    *   Faça o *Mapeamento* (escaneie o texto).
    *   Leia ativamente (*Engajamento*).
3.  **Anote:**
    *   No app, clique em **"Anotar (M.E.T.A)"** no painel do livro.
    *   Preencha o que te surpreendeu (Erro de Predição) e sua micro-ação prática.
    *   Salve.
4.  **Consolide:**
    *   Ao final da semana ou do livro, clique em **"Baixar Resumo"**.
    *   Revise seu arquivo Markdown gerado para reforçar as memórias.

---

<footer>
    <p align="center">© 2024-2025 Gerenciador de Planos de Leitura - Desenvolvido com foco na Excelência Cognitiva e Espiritual.</p>
</footer>
