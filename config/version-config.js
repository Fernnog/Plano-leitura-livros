// config/version-config.js
// RESPONSABILIDADE: Centralizar o controle de versão e o histórico de melhorias (Changelog)

export const versionConfig = {
    version: '2.0.7',
    changelog: {
        title: 'Retenção Ativa & Foco Total (v2.0.7)',
        sections: [
            {
                title: 'v2.0.7 - O Treinador Cognitivo (SRS & Foco)',
                points: [
                    '<strong>Motor de Revisão Ativa (SRS Engine):</strong> Implementação de uma arquitetura dedicada para o Sistema de Repetição Espaçada. O botão "Iniciar" no painel de revisões agora ativa um "treinador virtual" que oculta suas anotações originais, forçando o esforço cognitivo (Recuperação Ativa) antes da validação.',
                    '<strong>Protocolo Baseado em Evidências (D+1/7/14):</strong> Refinamento do algoritmo de agendamento seguindo diretrizes neurocientíficas estritas. O sistema agora foca nos intervalos críticos de Estabilização (24h), Conexão/Ensino (7 dias) e Consolidação (14 dias), garantindo máxima eficiência mnemônica.',
                    '<strong>Modo Foco Universal:</strong> Extensão da funcionalidade de "Expansão de Tela" para o Wizard de Anotação de Insights. Agora, a experiência de imersão (distraction-free) é consistente tanto na consulta do Diário de Bordo quanto no momento crucial de captura de novas ideias.'
                ]
            },
            {
                title: 'v2.0.6 - Modo Foco & Correção Temporal',
                points: [
                    '<strong>Modo Foco (Imersão Cognitiva):</strong> Nova funcionalidade "Expandir" nos modais de Insight e Diário de Bordo. Permite alternar para visualização em tela cheia, eliminando distrações visuais e oferecendo mais espaço para a produção de textos longos.',
                    '<strong>Correção Crítica SRS (Spaced Repetition):</strong> Ajuste na camada de persistência de dados. O sistema agora grava corretamente a data de atualização (`updatedAt`) na raiz das anotações, corrigindo o cálculo de intervalo que impedia o aparecimento das revisões.',
                    '<strong>Estabilidade de Renderização UI:</strong> Refatoração da lógica de injeção de HTML nos cabeçalhos dos modais. Substituição de renderização destrutiva por manipulação granular do DOM, garantindo que botões de controle permaneçam funcionais.'
                ]
            },
            {
                title: 'v2.0.5 - Integridade & Narrativa Visual',
                points: [
                    '<strong>Arquitetura Desacoplada (Validators):</strong> Criação do módulo dedicado <code>validators.js</code>. Centralização das regras de negócio e validação, reduzindo a complexidade do controlador principal.',
                    '<strong>Guardrails de Escopo:</strong> Implementação de travas lógicas que impedem o registro de sessões com páginas fora do intervalo definido para o capítulo atual.',
                    '<strong>Mapeamento Visual de Gaps:</strong> Nova barra de progresso no Diário de Bordo com renderização absoluta. Revela visualmente as lacunas (buracos) na leitura do capítulo.',
                    '<strong>Timeline "Fio da Meada":</strong> Nova visualização modal que conecta exclusivamente as "Teses" de cada sessão, permitindo uma revisão rápida da macro-narrativa do autor.'
                ]
            },
            {
                title: 'v2.0.4 - Consolidação de Capítulo',
                points: [
                    '<strong>Novo Paradigma de Estudo:</strong> Transição da visão puramente diária para o "Contexto Temático". O sistema agora entende que várias sessões compõem um Capítulo.',
                    '<strong>Consolidação em Um Clique:</strong> Novo botão que unifica todas as sessões de um capítulo em um único relatório estruturado.',
                    '<strong>Sub-períodos de Leitura:</strong> Capacidade de definir intervalos de páginas específicos para cada sessão dentro de um capítulo maior.',
                    '<strong>Relatório Mestre (Markdown):</strong> A exportação gera um arquivo completo do capítulo, organizando cronologicamente a Voz do Autor e a Síntese Pessoal.'
                ]
            },
            {
                title: 'v2.0.3 - Diário de Bordo Ativo',
                points: [
                    '<strong>Edição de Sessões Passadas:</strong> Possibilidade de reabrir sessões arquivadas no Wizard M.E.T.A. para correções ou acréscimos.',
                    '<strong>Preservação de Integridade:</strong> Lógica de salvamento segmentada que protege o histórico ao editar registros passados.',
                    '<strong>Indicadores de Estado Temporal:</strong> Feedback visual no cabeçalho alertando quando o usuário está editando um registro pretérito.'
                ]
            },
            {
                title: 'v2.0.2 - Refinamento Cognitivo',
                points: [
                    '<strong>Novos Campos M.E.T.A.:</strong> Inclusão de "Tema Central", separação de "Evidências" e campo de "Ponto de Confusão".',
                    '<strong>S.R.S. Contextual (Beta):</strong> O sistema distingue a maturidade da memória para sugerir tipos de revisão diferentes.',
                    '<strong>Compromisso de Honestidade:</strong> Checkbox obrigatório no "Modo Cego" confirmando a não consulta ao texto original.'
                ]
            },
            {
                title: 'v2.0.1 - Persistência Granular',
                points: [
                    '<strong>Auto-Save Inteligente:</strong> Salvamento automático em segundo plano com lógica de "Debounce".',
                    '<strong>Gestão de Rascunhos:</strong> O sistema só cria registros no banco quando há input real do usuário.',
                    '<strong>Feedback em Tempo Real:</strong> Indicadores visuais de status ("Salvando...", "Sincronizado").'
                ]
            },
            {
                title: 'v2.0.0 - Sistema de Repetição Espaçada',
                points: [
                    '<strong>Algoritmo SRS Inicial:</strong> Introdução do cálculo de curvas de revisão.',
                    '<strong>Modo Prova (Blind Mode):</strong> Ocultação das respostas originais durante a revisão.',
                    '<strong>Painel de Fila de Revisão:</strong> Nova seção prioritária no dashboard.'
                ]
            },
            {
                title: 'v1.0.5 - Refinamento Textual',
                points: [
                    '<strong>Correção Assistida:</strong> Botão de "Varinha Mágica" para correção via IA.',
                    '<strong>Proteção de Citações:</strong> Blindagem de trechos entre aspas.'
                ]
            }
        ]
    }
};
