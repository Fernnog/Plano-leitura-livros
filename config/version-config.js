// config/version-config.js
export const versionConfig = {
    version: '2.0.2',
    changelog: {
        title: 'Protocolo C.A.P.E. & Guardrails (v2.0.2)',
        sections: [
            {
                title: 'v2.0.2 - Refinamento Cognitivo (Expert Mode)',
                points: [
                    '<strong>Novos Campos M.E.T.A.:</strong> Inclusão de "Tema Central" (Mapear), separação de "Evidências" (Engajar) e campo de "Ponto de Confusão" (Traduzir) para maior precisão metacognitiva.',
                    '<strong>S.R.S. Contextual:</strong> O sistema de revisão agora distingue a maturidade da memória. D+1 foca em checagem rápida (Perguntas Guia), enquanto D+7 exige reconstrução ativa (Desafio de Ensino).',
                    '<strong>Guardrails de Qualidade:</strong> Implementação de contadores de caracteres para forçar o poder de síntese e evitar cópia passiva.',
                    '<strong>Compromisso de Honestidade:</strong> Checkbox obrigatório no "Modo Cego" confirmando que a síntese foi feita sem consultar o texto original.'
                ]
            },
            {
                title: 'v2.0.1 - Persistência Granular (Auto-Save)',
                points: [
                    '<strong>Auto-Save Inteligente:</strong> Seus insights agora são salvos automaticamente em segundo plano. O sistema utiliza lógica de "Debounce" (espera 2s após a digitação) para sincronizar sem consumir recursos excessivos.',
                    '<strong>Gestão de Rascunhos (Lazy Init):</strong> Fim dos "rascunhos fantasmas". O sistema agora só cria um registro no banco de dados quando você efetivamente digita a primeira letra, mantendo sua base de dados limpa.',
                    '<strong>Feedback de Status em Tempo Real:</strong> Novo indicador visual no cabeçalho do Wizard ("Sincronizado", "Salvando...", "Não salvo") para garantir total transparência sobre a segurança dos seus dados.',
                    '<strong>Proteção de Dados (Dirty Check):</strong> Otimização que impede chamadas desnecessárias ao servidor se nenhuma alteração real foi feita no texto.'
                ]
            },
            {
                title: 'v2.0.0 - Sistema de Repetição Espaçada',
                points: [
                    '<strong>NOVO: Algoritmo SRS (Spaced Repetition):</strong> O sistema agora calcula automaticamente quando você está prestes a esquecer uma anotação. Implementação das curvas de revisão em D+1 (Flash), D+3 (Consolidação) e D+7 (Memória Permanente).',
                    '<strong>Modo Prova (Blind Mode):</strong> Ao revisar, suas respostas originais são ocultadas. O sistema desafia você a responder mentalmente primeiro ("Recuperação Ativa") antes de conferir o gabarito. Isso fortalece as trilhas neurais muito mais do que a releitura passiva.',
                    '<strong>Painel de Fila de Revisão:</strong> Nova seção prioritária no topo do dashboard que só aparece quando há memórias em "Risco de Esquecimento".',
                    '<strong>Mudança de Paradigma:</strong> Evolução oficial de um "Rastreador de Leitura" para um "Gestor de Retenção Cognitiva".'
                ]
            },
            {
                title: 'v1.0.5 - Refinamento Textual & Fidelidade',
                points: [
                    '<strong>Correção Assistida (Teclado):</strong> Botão de "Varinha Mágica" para correção inteligente de textos digitados.',
                    '<strong>Proteção de Citações:</strong> Blindagem de trechos entre aspas para preservar a fidelidade bíblica/bibliográfica.',
                    '<strong>UX & Performance:</strong> Feedback visual de processamento e unificação do motor de IA.'
                ]
            },
            {
                title: 'v1.0.4 - Ditado Cognitivo (Neuro-Voice)',
                points: [
                    '<strong>Neuro-Voice (Beta):</strong> Funcionalidade de ditado inteligente com correção gramatical automática via IA.',
                    '<strong>Integração Gemini:</strong> Processamento de linguagem natural para transformar fala em texto estruturado.',
                    '<strong>UX Mãos Livres:</strong> Widget flutuante de voz para registro de insights sem interrupção da leitura.'
                ]
            },
            {
                title: 'v1.0.3 - Módulo de Retenção (C.A.P.E.)',
                points: [
                    '<strong>Checklist C.A.P.E.:</strong> Método de validação cognitiva (Confronto, Ancoragem, Percepção, Esquema).',
                    '<strong>Modal de Retenção:</strong> Interface visual para verificação de aprendizado antes de concluir a sessão.'
                ]
            },
            {
                title: 'v1.0.2 - Neuro-Painel Granular',
                points: [
                    '<strong>UI Split-View:</strong> Visualização lado a lado de Cronograma e Painel Neuro.',
                    '<strong>Listas Dinâmicas:</strong> Múltiplos Insights e Passos M.E.T.A. por sessão.',
                    '<strong>Contexto Específico:</strong> Suporte para intervalos de páginas por anotação.'
                ]
            },
            {
                title: 'v1.0.1 - A Era Neuro-Learning',
                points: [
                    '<strong>Metodologia M.E.T.A.:</strong> Introdução dos campos Mapear, Engajar, Traduzir e Aplicar.',
                    '<strong>Exportação Markdown:</strong> Download de resumos formatados para "Segundo Cérebro".',
                    '<strong>Design System:</strong> Nova identidade visual focada em leitura profunda.'
                ]
            }
        ]
    }
};
