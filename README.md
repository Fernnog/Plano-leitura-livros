# 🧠 Gerenciador de Planos de Leitura & Neuroaprendizagem Teológica

![Versão Atual](https://img.shields.io/badge/version-1.0.5-blue.svg) ![Status](https://img.shields.io/badge/status-stable-success.svg) ![License](https://img.shields.io/badge/license-MIT-green.svg) ![AI Powered](https://img.shields.io/badge/AI-Google%20Gemini-orange)

> **"Não se amoldem ao padrão deste mundo, mas transformem-se pela renovação da sua mente." — Romanos 12:2**

Bem-vindo a uma nova categoria de ferramenta de estudos. O **Gerenciador de Planos de Leitura** evoluiu de um rastreador de progresso para uma plataforma de **Neuroteologia Assistida por IA**.

Este projeto une princípios de neurociência cognitiva (M.E.T.A., C.A.P.E.) com o poder de modelos de linguagem (LLMs) para garantir que a leitura teológica se transforme em conhecimento consolidado e prática de vida.

**➡️ [Acesse a demonstração ao vivo](https://fernnog.github.io/Plano-leitura-livros/)**

---

## 🧬 A Filosofia: Neurociência + IA

O software combate a "Curva de Esquecimento" através de dois pilares: **Metodologia Cognitiva** e **Refinamento Assistido**.

### 1. O Ciclo M.E.T.A.
Painel cognitivo que guia o usuário por quatro estágios mentais:
*   **M — Mapear (Priming):** Ativação do Sistema Ativador Reticular (SAR).
*   **E — Engajar (Codificação Ativa):** Leitura ativa e anotações.
*   **T — Traduzir (Síntese):** Técnica Feynman potencializada pela IA.
*   **A — Aplicar (Plasticidade):** Definição de micro-ações práticas (*Praxis*).

### 2. Validação Cognitiva (C.A.P.E.)
Checklist de retenção para validar o aprendizado:
*   **Confronto:** Conflitos cognitivos e quebra de paradigmas.
*   **Ancoragem:** Conexão com conhecimentos prévios (Lei de Hebb).
*   **Percepção:** Registro da resposta emocional/espiritual.
*   **Esquema:** Modelagem mental ou visual do conceito.

---

## 🤖 Neuro-AI: O Assistente Cognitivo (v1.0.5)

A partir da versão 1.0.4/1.0.5, o sistema integra a API do **Google Gemini** para atuar como um "Editor Teológico" pessoal.

### 🎙️ Neuro-Voice (Ditado Inteligente)
Não quebre seu fluxo de leitura para digitar.
*   **Funcionalidade:** Clique no microfone, dite seus insights e a IA transcreve, corrige a gramática e melhora a clareza do texto automaticamente.
*   **Hands-Free:** Interface flutuante focada em acessibilidade e fluxo contínuo.

### ✨ Smart-Edit (Correção Mágica)
Prefere digitar? Sem problemas.
*   **Funcionalidade:** Botão de "Varinha Mágica" nos campos de texto. Digite rascunhos rápidos e deixe a IA refinar a pontuação e coesão com um clique.

### 🛡️ Fidelidade Teológica (Smart-Quotes)
*   **O Problema:** IAs comuns tendem a "corrigir" textos antigos ou citações bíblicas, alterando seu sentido.
*   **A Solução:** Nosso algoritmo possui uma diretiva de **Proteção de Citações**. Tudo o que estiver entre aspas (" " ou ' ') é blindado e mantido *ipsis litteris*, preservando a linguagem arcaica ou a fidelidade bibliográfica do autor.

---

## 🚀 Funcionalidades do Sistema

### 🧠 Módulo de Estudo Profundo
*   **Interface Split-View:** Leitura e Painel Neuro lado a lado.
*   **Granularidade:** Múltiplos insights, passos M.E.T.A. e gatilhos por sessão.
*   **Contexto de Página:** Vinculação de insights a intervalos exatos de páginas.
*   **Exportação Markdown:** Gera arquivos formatados para Obsidian/Notion, incluindo todos os insights processados.

### 📊 Gestão e Planejamento
*   **Criação Flexível:** Por Datas, Dias ou Páginas/Dia.
*   **Cronograma Dinâmico:** Algoritmo que respeita dias da semana e recalcula atrasos.
*   **Monitoramento:** Heatmaps de carga futura e alertas de atraso.

### ☁️ Infraestrutura
*   **Sync:** Firebase Auth & Firestore Realtime DB.
*   **PWA:** Instalável em Mobile e Desktop.

---

## 🏛️ Arquitetura Técnica

Baseada em **ES6 Modules** para modularidade e desacoplamento de serviços externos (IA, Firebase).

### Estrutura de Diretórios
```bash
/
├── index.html              # Entry point
├── style.css               # Neuro Design System
├── main.js                 # Orquestrador de Eventos
├── modules/                # Núcleo da aplicação
│   ├── ai-service.js       # [CORE AI] Integração Google Gemini & Prompts de Proteção
│   ├── auth.js             # Gestão de Identidade
│   ├── dictation-widget.js # [UI] Widget Flutuante de Voz
│   ├── firestore-service.js# Camada de Persistência
│   ├── neuro-notes.js      # Lógica M.E.T.A., C.A.P.E. e Modais de Insight
│   ├── plano-logic.js      # Algoritmos de Cronograma
│   ├── state.js            # Gestão de Estado (Store)
│   └── ui.js               # Renderização do DOM
└── config/
    ├── firebase-config.js  # Credenciais Firebase
    └── version-config.js   # Histórico e Changelog

```

## ⚙️ Instalação e Configuração

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/fernnog/Plano-leitura-livros.git
    ```
2.  **Configuração do Firebase:**
    *   Atualize `config/firebase-config.js` com suas credenciais.
3.  **Configuração da IA (Google Gemini):**
    *   Não é necessário alterar código. Ao tentar usar o recurso de voz ou correção pela primeira vez, o navegador solicitará sua **Google Gemini API Key**.
    *   A chave fica salva localmente no seu navegador (`localStorage`) para segurança.
    *   [Obtenha sua chave gratuita aqui](https://aistudio.google.com/app/apikey).
4.  **Rodar a aplicação:**
    *   Necessário servidor local (Live Server, Python HTTP, etc) devido aos módulos ES6.

---

## 📝 Workflow Sugerido

1.  **Planeje:** Cadastre o livro e defina a meta.
2.  **Leia & Dite:**
    *   Abra o Painel Neuro.
    *   Use o **Microfone** para ditar suas impressões enquanto lê.
    *   Use a **Varinha Mágica** para corrigir notas digitadas rapidamente.
3.  **Verifique (C.A.P.E.):** Valide a retenção no fim da sessão.
4.  **Consolide:** Exporte o Markdown para seu "Segundo Cérebro" (Obsidian).

---

<footer>
    <p align="center">© 2024-2025 Gerenciador de Planos de Leitura - Desenvolvido com foco na Excelência Cognitiva e Espiritual.</p>
</footer>
