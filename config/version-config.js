// config/version-config.js
// RESPONSABILIDADE: Centralizar o controle de versão e o histórico de melhorias (Changelog)

export const versionConfig = {
    version: '2.0.6',
    changelog: {
        title: 'Imersão & Precisão (v2.0.6)',
        sections: [
            {
                title: 'v2.0.6 - Modo Foco & Correção Temporal',
                points: [
                    '<strong>Modo Foco (Imersão Cognitiva):</strong> Nova funcionalidade "Expandir" nos modais de Insight e Diário de Bordo. Permite alternar para visualização em tela cheia, eliminando distrações visuais e oferecendo mais espaço para a produção de textos longos.',
                    '<strong>Correção Crítica SRS (Spaced Repetition):</strong> Ajuste na camada de persistência de dados. O sistema agora grava corretamente a data de atualização (`updatedAt`) na raiz das anotações, corrigindo o cálculo de intervalo que impedia o aparecimento das revisões D+1, D+3 e D+7.',
                    '<strong>Estabilidade de Renderização UI:</strong> Refatoração da lógica de injeção de HTML nos cabeçalhos dos modais. Substituição de renderização destrutiva por manipulação granular do DOM, garantindo que botões de controle (Fechar, Expandir) permaneçam visíveis e funcionais durante a navegação.'
                ]
            },
            {
                title: 'v2.0.5 - Integridade & Narrativa Visual',
                points: [
                    '<strong>Arquitetura Desacoplada (Validators):</strong> Criação do módulo dedicado <code>validators.js</code>. Centralização das regras de negócio e validação, reduzindo a complexidade do controlador principal e facilitando a manutenção futura.',
                    '<strong>Guardrails de Escopo:</strong> Implementação de travas lógicas que impedem o registro de sessões com páginas fora do intervalo definido para o capítulo atual, garantindo a integridade sanitária dos dados.',
                    '<strong>Mapeamento Visual de Gaps:</strong> Nova barra de progresso no Diário de Bordo com renderização absoluta. Diferente de uma barra comum, ela revela visualmente as lacunas (buracos) na leitura do capítulo, incentivando a cobertura completa.',
                    '<strong>Timeline "Fio da Meada":</strong> Nova visualização modal que ignora os detalhes operacionais e conecta exclusivamente as "Teses" de cada sessão, permitindo uma revisão rápida da macro-narrativa do autor.'
                ]
            },
            {
                title: 'v2.0.4 - Consolidação de Capítulo (Agregação de Conhecimento)',
                points: [
                    '<strong>Novo Paradigma de Estudo:</strong> Transição da visão puramente diária para o "Contexto Temático". Agora o sistema entende que várias sessões de estudo compõem um único Capítulo.',
                    '<strong>Consolidação em Um Clique:</strong> Novo botão no Diário de Bordo que unifica todas as sessões de um capítulo em um único relatório estruturado.',
                    '<strong>Sub-períodos de Leitura:</strong> Capacidade de definir intervalos de páginas específicos (ex: pág 10-15) para cada sessão dentro de um capítulo maior, permitindo granularidade no registro.',
                    '<strong>Relatório Mestre (Markdown):</strong> A exportação agora gera um arquivo completo do capítulo, organizando cronologicamente a "Voz do Autor" e a "Minha Síntese" de todas as sessões.'
                ]
            },
            {
                title: 'v2.0.3 - Diário de Bordo Ativo (Edição de Histórico)',
                points: [
                    '<strong>Edição de Sessões Passadas:</strong> O Diário de Bordo deixou de ser um visualizador passivo. Agora é possível clicar em qualquer sessão arquivada e reabri-la no Wizard M.E.T.A. para correções ou acréscimos.',
                    '<strong>Preservação de Integridade:</strong> Implementação de lógica de salvamento segmentada. Edições no passado atualizam o registro histórico específico sem interferir no rascunho da sessão atual.',
                    '<strong>Exportação Granular:</strong> Adicionado suporte para download de arquivos Markdown (.md) de sessões individuais diretamente da linha do tempo do Diário de Bordo.',
                    '<strong>Indicadores de Estado Temporal:</strong> Novo feedback visual no cabeçalho do Wizard que alerta o usuário quando ele está editando um registro pretérito, evitando confusão com o estudo do dia.'
                ]
            },
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
                    '<strong>Feedback de Status em Tempo Real:</strong> Novo indicador visual no cabeçalho do Wizard ("Sincronizado", "Salvando...", "Não salvo") para garantir total transparência sobre a segurança dos seus dados.'
                ]
            },
            {
                title: 'v2.0.0 - Sistema de Repetição Espaçada',
                points: [
                    '<strong>NOVO: Algoritmo SRS (Spaced Repetition):</strong> O sistema agora calcula automaticamente quando você está prestes a esquecer uma anotação. Implementação das curvas de revisão em D+1, D+3 e D+7.',
                    '<strong>Modo Prova (Blind Mode):</strong> Ao revisar, suas respostas originais são ocultadas. O sistema desafia você a responder mentalmente primeiro ("Recuperação Ativa").',
                    '<strong>Painel de Fila de Revisão:</strong> Nova seção prioritária no topo do dashboard que só aparece quando há memórias em "Risco de Esquecimento".'
                ]
            },
            {
                title: 'v1.0.5 - Refinamento Textual & Fidelidade',
                points: [
                    '<strong>Correção Assistida (Teclado):</strong> Botão de "Varinha Mágica" para correção inteligente de textos digitados.',
                    '<strong>Proteção de Citações:</strong> Blindagem de trechos entre aspas para preservar a fidelidade bíblica/bibliográfica.'
                ]
            },
            {
                title: 'v1.0.4 - Ditado Cognitivo (Neuro-Voice)',
                points: [
                    '<strong>Neuro-Voice (Beta):</strong> Funcionalidade de ditado inteligente com correção gramatical automática via IA.',
                    '<strong>Integração Gemini:</strong> Processamento de linguagem natural para transformar fala em texto estruturado.'
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
