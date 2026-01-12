### **Plano de Evolução: Atualização da Documentação (README.md)**

**Explicação da Proposta (Para Leigos)**
Como solicitou, este é um novo arquivo `README.md`. Ele não é apenas um manual técnico, mas um **manifesto de produto**. Dado que a mudança para o formato "Wizard" (Passo a Passo) altera a forma como o usuário estuda, a documentação precisa explicar o "Porquê" antes do "Como".

Adicionei uma seção dedicada chamada **"A Virada Cognitiva (v2.0)"**, onde detalho o relatório do especialista, explicando conceitos como "Guardrails" (proteções contra leitura passiva), a separação de vozes (Autor vs. Leitor) e o "Modo Cego" para recuperação de memória.

---

**1. Plano de Ação Técnico**

**a) Substituição do Arquivo (`README.md`)**

*   **Objetivo:** Substituir todo o conteúdo atual pelo conteúdo abaixo.
*   **Código:**

```markdown
<p align="center">
  <img src="logo.png" alt="Logotipo do Plano de Leitura" width="150">
</p>

# 🧠 Gerenciador de Leitura Cognitiva & Neuroteologia (v2.0)

![Versão Atual](https://img.shields.io/badge/version-2.0.0-deep_blue.svg) ![Status](https://img.shields.io/badge/status-major_update-success.svg) ![Methodology](https://img.shields.io/badge/Method-M.E.T.A._Wizard-orange) ![AI Powered](https://img.shields.io/badge/AI-Google%20Gemini-blue)

> **"Não se amoldem ao padrão deste mundo, mas transformem-se pela renovação da sua mente." — Romanos 12:2**

O **Gerenciador de Leitura** não é apenas um rastreador de páginas. É um **Sistema de Treinamento Cognitivo** projetado para combater a "Curva de Esquecimento" e transformar leitura passiva em **memória recuperável** e prática de vida (Praxis).

---

## 🚨 A Virada Cognitiva: O Contexto da Versão 2.0

Nesta versão, realizamos uma **mudança completa de paradigma** baseada em um relatório crítico de ciência da aprendizagem e psicologia cognitiva. 

Abandonamos o antigo "Painel de Anotações" (onde o usuário via todos os campos de uma vez) em favor de um **Wizard de Neuro-Retenção (Passo a Passo)**.

### 📜 O Diagnóstico do Especialista
A versão anterior permitia "vícios cognitivos" que sabotavam a retenção:
1.  **Leitura Passiva:** O usuário podia ler sem definir uma intenção prévia (Priming).
2.  **Mistura de Vozes:** As notas misturavam o que o autor disse com a opinião do leitor, corrompendo a memória original.
3.  **Ilusão de Competência:** O usuário resumia o texto *enquanto olhava para ele*. A ciência prova que isso é cópia, não aprendizado.

### 💡 A Solução: Arquitetura de "Guardrails" (Proteções)
Implementamos travas técnicas no software para forçar o comportamento ideal de estudo:

| O Problema Antigo | A Solução v2.0 (Wizard) | Princípio Cognitivo |
| :--- | :--- | :--- |
| Começar a ler "no automático". | **Bloqueio de Início:** O passo 2 só libera se você definir 2 perguntas-guia no Passo 1. | *Priming / Intencionalidade* |
| Confundir o texto com a opinião. | **Separação Visual:** Inputs com fontes diferentes. Serifada para o Autor, Sans-Serif para Você. | *Codificação Distinta* |
| Resumir olhando o texto. | **Modo Cego (Blind Mode):** No passo de síntese, o texto do autor é borrado (blur). | *Recuperação Ativa* |
| "Achei que entendi". | **Validação C.A.P.E.:** Perguntas de confronto em vez de checklist simples. | *Metacognição* |

---

## 🧬 A Metodologia: O Fluxo M.E.T.A. Guiado

O sistema agora guia o usuário por 4 estágios obrigatórios. Você não vê o próximo estágio até completar o anterior.

### 1️⃣ M - Mapear (Intenção & Priming)
*   **Ação:** Antes de ler uma única linha, você deve definir: "O que eu quero entender?" e "O que eu quero aplicar?".
*   **Por que:** O sistema ativador reticular (SAR) do cérebro ignora informações se não houver uma busca ativa.

### 2️⃣ E - Engajar (Voz do Autor)
*   **Design:** Campo de texto com fundo *off-white* e fonte serifada (*Playfair Display*).
*   **Ação:** Registrar a Tese Central e Evidências.
*   **Regra:** Proibido colocar opinião aqui. Apenas o que o texto diz.

### 3️⃣ T - Traduzir (Técnica Feynman)
*   **Design:** Campo branco moderno (*Inter*). **Efeito Blur** aplicado nas notas do passo anterior.
*   **Ação:** Explicar o conceito com suas próprias palavras, sem consultar o texto original (esforço de recuperação).
*   **Neuro-Feature:** O "Modo Cego" impede a cópia e força a criação de novas trilhas neurais.

### 4️⃣ A - Aplicar (Praxis / C.A.P.E.)
*   **Ação:** Transformar o conceito em uma Micro-ação verificável em 24h.
*   **Validação:**
    *   *Confronto:* O que isso mudou na minha crença?
    *   *Micro-ação:* O que vou fazer especificamente?

---

## 🤖 Neuro-AI: O Assistente, Não o Substituto

A Inteligência Artificial (Google Gemini) continua presente, mas agora atua como tutor, não como executor.

*   **Neuro-Voice (Ditado):** Para ditar as sínteses no Passo 3 sem quebrar o fluxo de pensamento.
*   **Magic Wand (Correção):** Corrige a gramática, mas mantém a estrutura do seu pensamento.
*   **Proteção de Citações:** O algoritmo protege textos entre aspas para garantir fidelidade bíblica/bibliográfica.

---

## 🚀 Funcionalidades do Sistema

*   **Gestão de Cronograma:** Cálculo automático de metas de leitura (Páginas/Dia ou Data Final).
*   **PWA (Progressive Web App):** Instalável e funciona offline (cache first).
*   **Sincronização:** Firebase Firestore (Banco de dados em tempo real).
*   **Exportação:** Gera arquivos Markdown (.md) formatados com seus Neuro-Insights para apps como Obsidian/Notion.

---

## 🏛️ Arquitetura Técnica Modular

O projeto utiliza **ES6 Modules** nativos, sem necessidade de bundlers (Webpack/Vite) para facilitar o estudo e modificação.

```bash
/
├── index.html              # Single Page Application entry
├── style.css               # Design System (Vozes, Wizard, Blur)
├── modules/
│   ├── neuro-notes.js      # [CORE v2.0] Máquina de Estado do Wizard M.E.T.A.
│   ├── plano-logic.js      # Algoritmos de Cronograma e Status
│   ├── ui.js               # Renderização do DOM e Modais
│   ├── firestore-service.js# Camada de Persistência
│   ├── ai-service.js       # Integração Google Gemini
│   └── ...
└── config/
    └── version-config.js   # Changelog e Versionamento
```

## ⚙️ Instalação e Uso

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/fernnog/Plano-leitura-livros.git
    ```
2.  **Configuração:**
    *   Insira suas credenciais no `config/firebase-config.js`.
    *   Ao usar recursos de IA pela primeira vez, insira sua API Key do Google Gemini (salva apenas no LocalStorage).
3.  **Execução:**
    *   Rode via servidor local (ex: Live Server do VSCode) ou Python `python -m http.server`.

---

## 📝 Workflow Recomendado (Nova Rotina)

1.  **Abra o App:** Clique em "Anotar Insight" no livro atual.
2.  **Siga o Wizard:**
    *   Preencha as Perguntas-Guia (Passo 1).
    *   Leia o capítulo e anote a Tese (Passo 2).
    *   Avance para o Passo 3 (o sistema ocultará suas notas). Respire fundo e explique o que leu.
    *   Defina uma ação prática (Passo 4).
3.  **Salve:** O sistema persiste os dados e agenda a revisão (feature futura).
4.  **Exporte:** Baixe o Markdown semanalmente para seu "Segundo Cérebro".

---

<p align="center">
    <strong>Excelência Cognitiva para a Glória de Deus.</strong><br>
    © 2024-2025 Gerenciador de Leitura
</p>
```

---

**2. Próximos Passos**

1.  **Atualizar o arquivo:** Copie o código acima e substitua o conteúdo do seu `README.md`.
2.  **Commit:** Recomendo a mensagem de commit: `docs: update README to reflect v2.0 cognitive paradigm shift`.
3.  **Implementação:** Prossiga com as alterações de código (CSS/JS) detalhadas na resposta anterior para que o software reflita a documentação.
