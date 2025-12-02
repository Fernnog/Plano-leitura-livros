// --- START OF FILE config/version-config.js ---
export const versionConfig = {
  version: "1.0.2",
  changelog: {
    title: "Atualização 1.0.2: Neuro-Learning Granular",
    sections: [
      {
        title: "🧠 Painel Neuro Dinâmico",
        points: [
          "<strong>Fim dos Limites de Campo:</strong> Substituímos os campos de texto estáticos por listas dinâmicas. Agora você pode adicionar quantos insights, gatilhos ou passos M.E.T.A. quiser por sessão de leitura.",
          "<strong>Rastreamento por Página:</strong> Cada anotação — seja um insight, um erro de predição ou uma dúvida — agora possui um campo dedicado para o número da página, permitindo precisão cirúrgica na revisão.",
          "<strong>Subformulários Ágeis:</strong> Nova interface de adição rápida que permite inserir anotações sem quebrar o fluxo de leitura."
        ]
      },
      {
        title: "⚡ Novos Tipos de Insight & Métodos",
        points: [
          "<strong>Marcadores Rápidos (? e !):</strong> Classifique seus pensamentos instantaneamente. Use <strong>'❓ Dúvida'</strong> para questionamentos críticos e <strong>'❗ Ponto Chave'</strong> para conceitos fundamentais.",
          "<strong>👁️ Codificação Dupla:</strong> Implementação oficial do gatilho visual. Um espaço dedicado para descrever diagramas, mapas mentais ou imagens associativas, ativando canais sensoriais adicionais conforme a neurociência."
        ]
      },
      {
        title: "🛠️ Engenharia & Dados",
        points: [
          "<strong>Migração Automática:</strong> O sistema detecta anotações de versões anteriores e as converte automaticamente para o novo formato de lista, garantindo que nenhum dado histórico seja perdido.",
          "<strong>Identificação Visual:</strong> Cards com bordas coloridas (Roxo para dúvidas, Laranja para destaques, Verde para gatilhos, Azul para M.E.T.A) para leitura rápida.",
          "<strong>Exportação Markdown Estruturada:</strong> O resumo .md gerado agora agrupa suas anotações de forma granular, facilitando a criação de uma 'segunda base de cérebro' (Second Brain)."
        ]
      }
    ]
  }
};
// --- END OF FILE config/version-config.js ---
