// config/version-config.js
// RESPONSABILIDADE: Centralizar o controle de versão e o histórico de melhorias (Changelog)

export const versionConfig = {
    version: '2.0.8',
    changelog: {
        title: 'Correção Crítica SRS & Motor de Revisão (v2.0.8)',
        sections: [
            {
                title: 'v2.0.8 - Hotfix & Melhoria SRS',
                points: [
                    '<strong>Correção Crítica de Módulo:</strong> Restaurada a lógica do motor SRS (`srs-engine.js`) que causava erro ao clicar no botão "Iniciar Revisão". O sistema agora carrega corretamente as perguntas.',
                    '<strong>Lógica de Perguntas Dinâmica:</strong> O sistema agora adapta a pergunta baseada no ciclo atual (D+1 pede Tese, D+7 pede Feynman/Síntese).',
                    '<strong>Feedback Visual (UX):</strong> Adicionada uma animação de "Sucesso" ao concluir uma revisão, reforçando o ciclo de recompensa do aprendizado.'
                ]
            },
            {
                title: 'v2.0.7 - O Treinador Cognitivo (SRS & Foco)',
                points: [
                    '<strong>Motor de Revisão Ativa (SRS Engine):</strong> Implementação de uma arquitetura dedicada para o Sistema de Repetição Espaçada.',
                    '<strong>Protocolo Baseado em Evidências (D+1/7/14):</strong> Refinamento do algoritmo de agendamento seguindo diretrizes neurocientíficas estritas.',
                    '<strong>Modo Foco Universal:</strong> Extensão da funcionalidade de "Expansão de Tela" para o Wizard de Anotação de Insights.'
                ]
            },
            {
                title: 'v2.0.6 - Modo Foco & Correção Temporal',
                points: [
                    '<strong>Modo Foco (Imersão Cognitiva):</strong> Nova funcionalidade "Expandir" nos modais de Insight e Diário de Bordo.',
                    '<strong>Correção Crítica SRS (Spaced Repetition):</strong> Ajuste na camada de persistência de dados. O sistema agora grava corretamente a data de atualização.',
                    '<strong>Estabilidade de Renderização UI:</strong> Refatoração da lógica de injeção de HTML nos cabeçalhos dos modais.'
                ]
            },
            {
                title: 'v2.0.5 - Integridade & Narrativa Visual',
                points: [
                    '<strong>Arquitetura Desacoplada (Validators):</strong> Criação do módulo dedicado <code>validators.js</code>.',
                    '<strong>Guardrails de Escopo:</strong> Implementação de travas lógicas para páginas.',
                    '<strong>Mapeamento Visual de Gaps:</strong> Nova barra de progresso no Diário de Bordo.',
                    '<strong>Timeline "Fio da Meada":</strong> Nova visualização modal de Teses.'
                ]
            },
            {
                title: 'v2.0.4 - Consolidação de Capítulo',
                points: [
                    '<strong>Novo Paradigma de Estudo:</strong> Transição da visão puramente diária para o "Contexto Temático".',
                    '<strong>Consolidação em Um Clique:</strong> Novo botão que unifica todas as sessões de um capítulo.',
                    '<strong>Relatório Mestre (Markdown):</strong> Exportação completa do capítulo.'
                ]
            },
            {
                title: 'v2.0.3 - Diário de Bordo Ativo',
                points: [
                    '<strong>Edição de Sessões Passadas:</strong> Possibilidade de reabrir sessões arquivadas.',
                    '<strong>Preservação de Integridade:</strong> Lógica de salvamento segmentada.',
                    '<strong>Indicadores de Estado Temporal:</strong> Feedback visual no cabeçalho.'
                ]
            },
            {
                title: 'v2.0.2 - Refinamento Cognitivo',
                points: [
                    '<strong>Novos Campos M.E.T.A.:</strong> Inclusão de "Tema Central", separação de "Evidências".',
                    '<strong>S.R.S. Contextual (Beta):</strong> Sugestão de tipos de revisão diferentes.',
                    '<strong>Compromisso de Honestidade:</strong> Checkbox obrigatório no "Modo Cego".'
                ]
            },
            {
                title: 'v2.0.1 - Persistência Granular',
                points: [
                    '<strong>Auto-Save Inteligente:</strong> Salvamento automático em segundo plano.',
                    '<strong>Gestão de Rascunhos:</strong> O sistema só cria registros com input real.',
                    '<strong>Feedback em Tempo Real:</strong> Indicadores visuais de status.'
                ]
            },
            {
                title: 'v2.0.0 - Sistema de Repetição Espaçada',
                points: [
                    '<strong>Algoritmo SRS Inicial:</strong> Introdução do cálculo de curvas de revisão.',
                    '<strong>Modo Prova (Blind Mode):</strong> Ocultação das respostas durante a revisão.',
                    '<strong>Painel de Fila de Revisão:</strong> Nova seção prioritária no dashboard.'
                ]
            }
        ]
    }
};
