# Gerenciador de Planos de Leitura Web

Este projeto é uma página web simples para gerenciar seus planos de leitura de livros. Permite que você defina metas de leitura, acompanhe seu progresso e mantenha seus hábitos de leitura organizados.

## Funcionalidades Principais

*   **Cadastro de Planos de Leitura:**
    *   Adicione múltiplos planos de leitura simultaneamente.
    *   Defina o título do livro, o número total de páginas e o período de leitura desejado.
*   **Definição Flexível do Período de Leitura:**
    *   Escolha definir o período selecionando as datas de início e fim.
    *   Alternativamente, defina o período informando a data de início e o número total de dias para o plano.
*   **Periodicidade Personalizável:**
    *   Opção para leitura **diária**.
    *   Opção para selecionar **dias específicos da semana** para leitura (ex: apenas segundas, quartas e sextas, ou qualquer combinação).
*   **Distribuição Automática de Páginas:**
    *   O sistema calcula e sugere a quantidade de páginas a serem lidas em cada dia do plano, distribuindo o total de páginas de forma uniforme ao longo do período e periodicidade definidos.
*   **Acompanhamento do Progresso:**
    *   Lista os dias de leitura planejados para cada plano, mostrando a data e a quantidade de páginas sugeridas para cada dia.
    *   Checkboxes interativos para marcar os dias de leitura como "lidos".
    *   Barra de progresso visual para cada plano, indicando a porcentagem de páginas lidas em relação ao total.
    *   Exibição do número de páginas lidas e a porcentagem de progresso em texto.
*   **Persistência de Dados:**
    *   Os planos de leitura são salvos localmente no navegador utilizando `localStorage`. Seus dados persistem mesmo após fechar e reabrir a página (no mesmo navegador).
*   **Importação e Exportação de Dados (JSON):**
    *   **Exportar Planos:** Exporte todos os seus planos de leitura para um arquivo JSON, permitindo fazer backup ou transferir seus dados.
    *   **Importar Planos:** Importe planos de leitura a partir de um arquivo JSON, restaurando seus dados previamente exportados.
*   **Limpeza de Dados:**
    *   Opção para limpar todos os planos de leitura cadastrados, removendo todos os dados salvos.
*   **Aviso de Atraso (Básico):**
    *   O sistema verifica se há dias de leitura planejados que já passaram e não foram marcados como lidos.
    *   Exibe um aviso visual nos planos que estão com leitura atrasada, indicando a necessidade de atenção.

## Como Usar

1.  Abra o arquivo `index.html` em seu navegador web.
2.  Na seção "Novo Plano de Leitura", preencha o formulário com os detalhes do livro e do plano desejado.
3.  Escolha a periodicidade e defina o período de leitura (por datas ou número de dias).
4.  Clique em "Criar Plano" para adicionar o plano à lista de "Planos de Leitura Ativos".
5.  Na seção "Planos de Leitura Ativos", você verá seus planos listados com a barra de progresso e a lista de dias de leitura.
6.  Marque os checkboxes ao lado de cada dia conforme você completa a leitura. O progresso será atualizado automaticamente.
7.  Utilize os botões "Exportar JSON", "Importar JSON" e "Limpar Dados" no cabeçalho para gerenciar seus dados.

## Próximos Passos e Melhorias Futuras

*   **Funcionalidade de Edição de Planos:** Permitir que o usuário edite os detalhes de um plano de leitura já criado.
*   **Recálculo de Planos:** Implementar a opção de recalcular o plano em caso de atraso, ajustando as datas ou a quantidade de páginas diárias.
*   **Alertas e Notificações Mais Avançadas:** Desenvolver um sistema de notificações ou alertas mais robusto para lembrar o usuário sobre as leituras diárias e atrasos.
*   **Interface de Usuário (UI) e Experiência do Usuário (UX) Melhoradas:** Refinar o design e a usabilidade da página para torná-la mais intuitiva e agradável.

## Conclusão

Este Gerenciador de Planos de Leitura é uma ferramenta simples e útil para organizar e acompanhar suas metas de leitura. Sinta-se à vontade para usar e contribuir com melhorias!
