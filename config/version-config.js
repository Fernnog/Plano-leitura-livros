// --- START OF FILE config/version-config.js ---
// RESPONSABILIDADE ÚNICA: Manter a versão atual e o conteúdo do changelog.
// Edite este arquivo para atualizar as informações da versão sem tocar no resto do código.

export const versionConfig = {
    version: "1.0.1",
    changelog: {
        title: "Novidades da Versão 1.0.1",
        sections: [
            {
                title: "✨ Novas Funcionalidades",
                points: [
                    "<strong>Criação de Planos Flexível:</strong> Agora é possível criar planos definindo uma meta de 'Páginas por Dia'. O sistema calcula a data de término para você!",
                    "<strong>Análise de Carga Semanal:</strong> Um novo modal 'Reavaliar' mostra a distribuição de páginas de todos os seus planos ao longo da semana, ajudando a identificar dias sobrecarregados.",
                    "<strong>Remanejamento de Planos:</strong> A partir do modal de reavaliação, é possível clicar em um plano para ajustar seus dias de leitura e redistribuir as páginas."
                ]
            },
            {
                title: "🐛 Correções e Melhorias",
                points: [
                    "A lógica de cálculo de planos foi otimizada para maior precisão.",
                    "Melhorias na interface de criação de planos para maior clareza.",
                    "O código-fonte foi refatorado para uma arquitetura modular, tornando o sistema mais robusto e fácil de manter."
                ]
            }
        ]
    }
};
// --- END OF FILE config/version-config.js ---
