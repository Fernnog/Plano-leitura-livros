--- START OF FILE README.md ---
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
*   **Edição de Planos de Leitura:**
    *   Permite editar os detalhes de um plano de leitura já criado, como título, total de páginas, período e periodicidade.
*   **Recálculo de Planos em Atraso:**
    *   Funcionalidade para recalcular planos que estão em atraso. O sistema ajusta a quantidade de páginas diárias para os dias restantes, permitindo que o plano seja concluído dentro do período restante.
*   **Aviso de Atraso Detalhado:**
    *   O sistema verifica se há dias de leitura planejados que já passaram e não foram marcados como lidos.
    *   Exibe um aviso visual nos planos que estão com leitura atrasada, indicando o número de dias de atraso e oferecendo a opção de recalcular o plano.
*   **Persistência de Dados:**
    *   Os planos de leitura são salvos localmente no navegador utilizando `localStorage`. Seus dados persistem mesmo após fechar e reabrir a página (no mesmo navegador).
*   **Importação e Exportação de Dados (JSON):**
    *   **Exportar Planos:** Exporte todos os seus planos de leitura para um arquivo JSON, permitindo fazer backup ou transferir seus dados.
    *   **Importar Planos:** Importe planos de leitura a partir de um arquivo JSON, restaurando seus dados previamente exportados.
*   **Limpeza de Dados:**
    *   Opção para limpar todos os planos de leitura cadastrados, removendo todos os dados salvos.

## Como Usar

1.  Abra o arquivo `index.html` em seu navegador web.
2.  Na seção "Novo Plano de Leitura", preencha o formulário com os detalhes do livro e do plano desejado.
3.  Escolha a periodicidade e defina o período de leitura:
    *   **Datas de Início e Fim:** Selecione as datas inicial e final do seu plano.
    *   **Data de Início e Número de Dias:** Escolha a data de início e especifique o número total de dias que o plano deve durar.
4.  Clique em "Criar Plano" para adicionar o plano à lista de "Planos de Leitura Ativos".
5.  Na seção "Planos de Leitura Ativos", você verá seus planos listados com a barra de progresso e a lista de dias de leitura.
6.  Marque os checkboxes ao lado de cada dia conforme você completa a leitura. O progresso será atualizado automaticamente.
7.  Para **editar** um plano, clique no botão "Editar" ao lado do título do plano na lista de "Planos de Leitura Ativos". O formulário será preenchido com os dados do plano selecionado, permitindo que você faça as alterações necessárias e clique em "Atualizar Plano".
8.  Se um plano estiver atrasado, um aviso será exibido. Você pode clicar no botão "Recalcular Plano" para ajustar o plano e redistribuir as páginas restantes nos dias futuros.
9.  Utilize os botões "Exportar JSON", "Importar JSON" e "Limpar Dados" no cabeçalho para gerenciar seus dados:
    *   **Exportar JSON:** Baixa um arquivo `planos-leitura.json` com seus planos.
    *   **Importar JSON:** Abre uma janela para selecionar um arquivo `.json` para importar planos.
    *   **Limpar Dados:** Remove todos os planos de leitura salvos localmente (requer confirmação).

## Próximos Passos e Melhorias Futuras

*   **Alertas e Notificações Mais Avançadas:** Desenvolver um sistema de notificações ou alertas mais robusto para lembrar o usuário sobre as leituras diárias e atrasos, possivelmente com notificações no navegador.
*   **Interface de Usuário (UI) e Experiência do Usuário (UX) Melhoradas:** Refinar o design e a usabilidade da página para torná-la mais intuitiva e agradável, incluindo melhor responsividade para diferentes dispositivos.
*   **Visualização de Estatísticas e Histórico:** Adicionar gráficos ou resumos estatísticos para visualizar o progresso geral de leitura ao longo do tempo, e um histórico de planos concluídos.
*   **Opção para Planos de Leitura Flexíveis:** Permitir que o usuário ajuste manualmente as páginas a serem lidas em dias específicos, oferecendo mais flexibilidade além da distribuição automática.

## Conclusão

Este Gerenciador de Planos de Leitura é uma ferramenta mais completa e útil para organizar e acompanhar suas metas de leitura. Sinta-se à vontade para usar e contribuir com melhorias!
--- START OF FILE README.md ---
