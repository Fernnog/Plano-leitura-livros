// config/version-config.js
export const versionConfig = {
    version: '1.0.3',
    changelog: {
        title: 'Histórico de Evolução',
        sections: [
            {
                title: 'v1.0.3 - Módulo de Retenção & Estabilidade (Atual)',
                points: [
                    '<strong>NOVO: Checklist de Retenção (C.A.P.E.):</strong> Implementação do método de validação cognitiva (Confronto, Ancoragem, Percepção, Esquema).',
                    '<strong>UX:</strong> Novo modal visual com grid de conceitos e tabela de verificação de aprendizado.',
                    '<strong>FIX:</strong> Correção crítica no orquestrador de eventos (main.js) onde botões de ação sem índice de plano não respondiam.',
                    '<strong>TECH:</strong> Adição de telemetria de logs para diagnóstico de interações de interface.'
                ]
            },
            {
                title: 'v1.0.2 - Neuro-Painel Granular',
                points: [
                    '<strong>UI Split-View:</strong> Redesign dos cards de leitura para exibir Cronograma (esquerda) e Painel Neuro (direita) lado a lado.',
                    '<strong>Listas Dinâmicas:</strong> Agora é possível adicionar múltiplos Insights, Passos M.E.T.A. e Gatilhos por sessão, ao invés de apenas um campo de texto.',
                    '<strong>Contexto de Leitura:</strong> Adicionado suporte para definir intervalo de páginas (Início/Fim) específico para cada anotação.',
                    '<strong>Visual:</strong> Identificação visual por cores para tipos de anotação (Roxo para dúvidas, Laranja para alertas, etc.).'
                ]
            },
            {
                title: 'v1.0.1 - A Era Neuro-Learning',
                points: [
                    '<strong>Conceito M.E.T.A.:</strong> Introdução dos campos de Mapear, Engajar, Traduzir e Aplicar.',
                    '<strong>Exportação Markdown:</strong> Funcionalidade para baixar resumos formatados compatíveis com Obsidian e Notion.',
                    '<strong>Design System:</strong> Adoção da paleta de cores "Deep Blue & Burnt Orange" e tipografia serifada para títulos.',
                    '<strong>Gatilhos de Memória:</strong> Primeiros campos para registro de "Erro de Predição" e "Codificação Dupla".'
                ]
            },
            {
                title: 'v1.0.0 - O Início (MVP)',
                points: [
                    '<strong>Gestão de Planos:</strong> Criação, edição e exclusão de planos de leitura.',
                    '<strong>Cálculo Automático:</strong> Algoritmo de distribuição de páginas por dias da semana.',
                    '<strong>Persistência:</strong> Integração com Firebase (Auth e Firestore) para salvar dados na nuvem.',
                    '<strong>PWA:</strong> Suporte básico para instalação como aplicativo no celular.'
                ]
            }
        ]
    }
};
