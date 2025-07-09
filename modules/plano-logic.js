// modules/plano-logic.js
// RESPONSABILIDADE ÚNICA: Conter toda a lógica de negócio, cálculos e manipulação
// de dados dos planos. Funções "puras" que não tocam no DOM.

/**
 * Retorna a data de hoje normalizada (sem horas, minutos, segundos).
 * @returns {Date}
 */
function getHojeNormalizado() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return hoje;
}

/**
 * Determina o status de um plano (proximo, em_dia, atrasado, concluido, invalido).
 * @param {object} plano - O objeto do plano a ser analisado.
 * @returns {string} O status do plano.
 */
export function determinarStatusPlano(plano) {
    if (!plano || !plano.diasPlano || !(plano.dataInicio instanceof Date) || !(plano.dataFim instanceof Date) || isNaN(plano.dataInicio) || isNaN(plano.dataFim)) {
        return 'invalido';
    }

    const hoje = getHojeNormalizado();
    const dataInicioPlano = new Date(plano.dataInicio); dataInicioPlano.setHours(0,0,0,0);

    const todosLidos = plano.diasPlano.length > 0 && plano.diasPlano.every(dia => dia.lido);
    if (todosLidos) return 'concluido';

    if (dataInicioPlano > hoje) return 'proximo';

    const temDiaPassadoNaoLido = plano.diasPlano.some(dia => {
        if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
             const dataDiaNormalizada = new Date(dia.data); dataDiaNormalizada.setHours(0, 0, 0, 0);
             return dataDiaNormalizada < hoje && !dia.lido;
        }
        return false;
     });
     if (temDiaPassadoNaoLido) return 'atrasado';

    return 'em_dia'; // Se não se encaixa em nada acima, está em dia ou finalizado sem pendências.
}

/**
 * Verifica quantos dias de leitura estão atrasados em um plano.
 * @param {object} plano - O objeto do plano.
 * @returns {number} O número de dias atrasados.
 */
export function verificarAtraso(plano) {
    const hoje = getHojeNormalizado();
    if (!plano || !plano.diasPlano || plano.diasPlano.length === 0) return 0;

    return plano.diasPlano.reduce((count, dia) => {
         if (dia && dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
            const dataDiaNormalizada = new Date(dia.data); dataDiaNormalizada.setHours(0, 0, 0, 0);
            if (dataDiaNormalizada < hoje && !dia.lido) {
                return count + 1;
            }
        }
        return count;
    }, 0);
}

/**
 * Recalcula e atualiza a propriedade `paginasLidas` de um objeto de plano.
 * @param {object} plano - O objeto do plano a ser modificado.
 */
export function atualizarPaginasLidas(plano) {
    if (!plano || !plano.diasPlano) {
        if(plano) plano.paginasLidas = 0;
        return;
    };
    plano.paginasLidas = plano.diasPlano.reduce((sum, dia) => {
        return sum + (dia && dia.lido && typeof dia.paginas === 'number' && dia.paginas > 0 ? dia.paginas : 0);
    }, 0);
}

/**
 * Gera um array de dias de leitura com base em datas de início/fim e periodicidade.
 * @param {Date} dataInicio
 * @param {Date} dataFim
 * @param {string} periodicidade - 'diario' ou 'semanal'
 * @param {number[]} diasSemana - Array de números de 0 (Dom) a 6 (Sáb).
 * @returns {Array<object>}
 */
export function gerarDiasPlanoPorDatas(dataInicio, dataFim, periodicidade, diasSemana) {
    const dias = [];
    if (!(dataInicio instanceof Date) || !(dataFim instanceof Date) || isNaN(dataInicio) || isNaN(dataFim) || dataFim < dataInicio) {
        throw new Error("Datas inválidas fornecidas para gerar os dias do plano.");
    }
    let dataAtual = new Date(dataInicio); dataAtual.setHours(0, 0, 0, 0);
    const dataFimNormalizada = new Date(dataFim); dataFimNormalizada.setHours(0, 0, 0, 0);

    let safetyCounter = 0;
    while (dataAtual <= dataFimNormalizada && safetyCounter < 5000) {
        const diaSemanaAtual = dataAtual.getDay();
        if (periodicidade === 'diario' || (periodicidade === 'semanal' && diasSemana.includes(diaSemanaAtual))) {
            dias.push({ data: new Date(dataAtual), paginaInicioDia: 0, paginaFimDia: 0, paginas: 0, lido: false });
        }
        dataAtual.setDate(dataAtual.getDate() + 1);
        safetyCounter++;
    }
    if (safetyCounter >= 5000) {
         throw new Error("O intervalo de datas é muito grande. Não foi possível gerar o plano.");
    }
    return dias;
}

/**
 * Gera um array de dias de leitura com base na data de início, número de dias e periodicidade.
 * @param {Date} dataInicio
 * @param {number} numeroDias
 * @param {string} periodicidade
 * @param {number[]} diasSemana
 * @returns {Array<object>}
 */
export function gerarDiasPlanoPorDias(dataInicio, numeroDias, periodicidade, diasSemana) {
    const dias = [];
    if (!(dataInicio instanceof Date) || isNaN(dataInicio) || typeof numeroDias !== 'number' || numeroDias <= 0) {
        throw new Error("Dados inválidos fornecidos para gerar os dias do plano.");
    }
    let dataAtual = new Date(dataInicio); dataAtual.setHours(0, 0, 0, 0);
    let diasAdicionados = 0;
    let safetyCounter = 0;
    const MAX_ITERATIONS = numeroDias * 10 + 366;

    while (diasAdicionados < numeroDias && safetyCounter < MAX_ITERATIONS) {
        const diaSemanaAtual = dataAtual.getDay();
        if (periodicidade === 'diario' || (periodicidade === 'semanal' && diasSemana.includes(diaSemanaAtual))) {
            dias.push({ data: new Date(dataAtual), paginaInicioDia: 0, paginaFimDia: 0, paginas: 0, lido: false });
            diasAdicionados++;
        }
         dataAtual.setDate(dataAtual.getDate() + 1);
         safetyCounter++;
    }
     if (diasAdicionados < numeroDias) {
         throw new Error(`Não foi possível gerar os ${numeroDias} dias solicitados com a periodicidade fornecida. Apenas ${diasAdicionados} foram gerados.`);
     }
    return dias;
}

/**
 * Distribui as páginas de um plano entre seus dias de leitura. Modifica o objeto plano.
 * @param {object} plano - O objeto do plano a ser modificado.
 */
export function distribuirPaginasPlano(plano) {
    if (!plano || !plano.diasPlano || plano.diasPlano.length === 0 || typeof plano.paginaInicio !== 'number' || typeof plano.paginaFim !== 'number' || plano.paginaFim < plano.paginaInicio) {
        // Não lança erro, apenas retorna, pois é uma condição de cálculo que pode ser normal.
        if (plano) {
            plano.totalPaginas = (plano.paginaFim - plano.paginaInicio + 1) || 0;
            plano.paginasLidas = 0;
        }
        return;
    }

    const totalPaginasLivro = plano.paginaFim - plano.paginaInicio + 1;
    const diasDeLeituraValidos = plano.diasPlano.filter(dia => dia && dia.data instanceof Date && !isNaN(dia.data));
    const numeroDeDiasValidos = diasDeLeituraValidos.length;

    if (numeroDeDiasValidos === 0) return;

    plano.totalPaginas = totalPaginasLivro;
    const paginasPorDiaBase = Math.floor(totalPaginasLivro / numeroDeDiasValidos);
    const paginasRestantes = totalPaginasLivro % numeroDeDiasValidos;
    let paginaAtual = plano.paginaInicio;

    diasDeLeituraValidos.forEach((dia, index) => {
        let paginasNesteDia = paginasPorDiaBase + (index < paginasRestantes ? 1 : 0);
        dia.paginaInicioDia = paginaAtual;
        dia.paginaFimDia = Math.min(plano.paginaFim, paginaAtual + paginasNesteDia - 1);
        dia.paginas = Math.max(0, dia.paginaFimDia - dia.paginaInicioDia + 1);
        paginaAtual = dia.paginaFimDia + 1;
    });

    // Atualiza as páginas lidas com base nos dias já marcados (importante para edições)
    atualizarPaginasLidas(plano);
}


/**
 * Recalcula um plano atrasado com base em uma nova data de fim.
 * @param {object} planoOriginal - O plano a ser recalculado.
 * @param {Date} novaDataFim - A nova data de término.
 * @returns {object} Um novo objeto de plano recalculado.
 */
export function recalcularPlanoComNovaData(planoOriginal, novaDataFim) {
    if (!planoOriginal || !(novaDataFim instanceof Date) || isNaN(novaDataFim)) {
        throw new Error("Dados inválidos para o recálculo do plano.");
    }
    const hoje = getHojeNormalizado();
    if (novaDataFim <= hoje) {
        throw new Error("A nova data de fim deve ser posterior à data de hoje.");
    }
    
    // Cria uma cópia profunda para não modificar o plano original diretamente
    const planoRecalculado = JSON.parse(JSON.stringify(planoOriginal));
    // Converte datas de string de volta para Date
    planoRecalculado.dataInicio = new Date(planoRecalculado.dataInicio);
    planoRecalculado.diasPlano.forEach(d => { if(d.data) d.data = new Date(d.data); });
    
    const paginasLidas = planoRecalculado.paginasLidas || 0;
    const paginaInicioRecalculo = (planoRecalculado.paginaInicio || 1) + paginasLidas;
    const paginasRestantes = Math.max(0, (planoRecalculado.totalPaginas || 0) - paginasLidas);

    if (paginasRestantes <= 0) {
        throw new Error("Não há páginas restantes para ler. O recálculo não é necessário.");
    }

    let dataInicioRecalculo = hoje;
    const diasSemanaPlano = planoRecalculado.diasSemana || [];
    const periodicidadePlano = planoRecalculado.periodicidade || 'diario';
    
    const isDiaValido = (data) => {
        const diaSem = data.getDay();
        return periodicidadePlano === 'diario' || (periodicidadePlano === 'semanal' && diasSemanaPlano.includes(diaSem));
    };

    // Encontra o primeiro dia válido para o recálculo
    while (!isDiaValido(dataInicioRecalculo)) {
        dataInicioRecalculo.setDate(dataInicioRecalculo.getDate() + 1);
    }
    
    if (novaDataFim < dataInicioRecalculo) {
        throw new Error(`A nova data de fim (${novaDataFim.toLocaleDateString('pt-BR')}) não pode ser anterior ao próximo dia de leitura válido (${dataInicioRecalculo.toLocaleDateString('pt-BR')}).`);
    }

    const novosDiasGerados = gerarDiasPlanoPorDatas(dataInicioRecalculo, novaDataFim, periodicidadePlano, diasSemanaPlano);

    if (novosDiasGerados.length === 0) {
        throw new Error("Não há dias de leitura válidos no novo período selecionado.");
    }

    // Filtra dias já lidos e que aconteceram antes do recálculo
    const diasLidosPreservados = planoRecalculado.diasPlano.filter(dia =>
        dia.lido && dia.data && new Date(dia.data) < dataInicioRecalculo
    );
    
    const novoPlanoDeDias = [...diasLidosPreservados, ...novosDiasGerados];

    // Cria um objeto de plano temporário para a distribuição
    const planoParaDistribuicao = {
        paginaInicio: paginaInicioRecalculo,
        paginaFim: planoRecalculado.paginaFim,
        diasPlano: novosDiasGerados, // Distribui apenas nos novos dias
    };
    distribuirPaginasPlano(planoParaDistribuicao);

    // Atualiza o plano recalculado
    planoRecalculado.diasPlano = novoPlanoDeDias.sort((a,b) => new Date(a.data) - new Date(b.data));
    planoRecalculado.dataFim = novaDataFim;
    atualizarPaginasLidas(planoRecalculado);
    
    return planoRecalculado;
}