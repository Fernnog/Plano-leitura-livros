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
 * Determina o status de um plano (pausado, proximo, em_dia, atrasado, concluido, invalido).
 * @param {object} plano - O objeto do plano a ser analisado.
 * @returns {string} O status do plano.
 */
export function determinarStatusPlano(plano) {
    if (!plano || !plano.diasPlano || !(plano.dataInicio instanceof Date) || !(plano.dataFim instanceof Date) || isNaN(plano.dataInicio) || isNaN(plano.dataFim)) {
        return 'invalido';
    }
    
    if (plano.isPaused) {
        return 'pausado';
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

    return 'em_dia';
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
 * Verifica se um dia de leitura deve ser exibido no modo de "Foco Progressivo".
 * Regra: Exibir se não foi lido OU se possui Neuro-Anotações relevantes.
 * @param {object} dia - O objeto do dia de leitura.
 * @returns {boolean} True se deve ser visível, False se deve ser ocultado (histórico).
 */
export function verificarVisibilidadeDia(dia) {
    if (!dia) return false;
    
    // Se não foi lido, sempre mostra (tarefa pendente)
    if (!dia.lido) return true;

    // Se foi lido, verifica se tem anotações relevantes (Neuro-Notes)
    if (dia.neuroNote) {
        const temInsights = Array.isArray(dia.neuroNote.insights) && dia.neuroNote.insights.length > 0;
        const temMeta = Array.isArray(dia.neuroNote.meta) && dia.neuroNote.meta.length > 0;
        const temTriggers = Array.isArray(dia.neuroNote.triggers) && dia.neuroNote.triggers.length > 0;
        
        if (temInsights || temMeta || temTriggers) return true;
    }

    // Se foi lido e não tem notas relevantes, deve ser ocultado (ir para histórico)
    return false;
}

/**
 * Encontra o índice do primeiro dia de leitura não concluído no plano.
 * @param {object} plano - O objeto do plano.
 * @returns {number} O índice do próximo dia a ser lido, ou -1 se todos estiverem lidos.
 */
export function encontrarProximoDiaDeLeituraIndex(plano) {
    if (!plano || !plano.diasPlano) return -1;
    return plano.diasPlano.findIndex(dia => !dia.lido);
}

/**
 * Recalcula e atualiza a propriedade `paginasLidas` de um plano.
 * Agora considera leituras parciais registradas em `ultimaPaginaLida`.
 * @param {object} plano - O objeto do plano a ser modificado.
 */
export function atualizarPaginasLidas(plano) {
    if (!plano || !plano.diasPlano) {
        if(plano) plano.paginasLidas = 0;
        return;
    };

    plano.paginasLidas = plano.diasPlano.reduce((sum, dia) => {
        if (!dia) return sum;

        if (dia.lido) {
            return sum + (typeof dia.paginas === 'number' ? dia.paginas : 0);
        }

        if (dia.ultimaPaginaLida && dia.ultimaPaginaLida >= dia.paginaInicioDia) {
            const paginasParciais = (dia.ultimaPaginaLida - dia.paginaInicioDia) + 1;
            return sum + paginasParciais;
        }

        return sum;
    }, 0);
}

/**
 * Gera um array de dias de leitura com base em datas de início/fim e periodicidade.
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
         throw new Error(`Não foi possível gerar os ${numeroDias} dias solicitados.`);
     }
    return dias;
}

/**
 * Gera um array de dias de leitura com base na meta de páginas por dia.
 */
export function gerarDiasPlanoPorPaginas(dataInicio, paginasPorDia, paginaInicioLivro, paginaFimLivro, periodicidade, diasSemana) {
    if (!paginasPorDia || paginasPorDia <= 0) {
        throw new Error("A meta de páginas por dia deve ser um número positivo.");
    }
    const totalPaginas = (paginaFimLivro - paginaInicioLivro) + 1;
    if (totalPaginas <= 0) {
        throw new Error("O intervalo de páginas do livro é inválido.");
    }

    const diasLeituraNecessarios = Math.ceil(totalPaginas / paginasPorDia);

    // Reutiliza a lógica já existente para gerar os dias
    return gerarDiasPlanoPorDias(dataInicio, diasLeituraNecessarios, periodicidade, diasSemana);
}

/**
 * Distribui as páginas de um plano entre seus dias de leitura. Modifica o objeto plano.
 */
export function distribuirPaginasPlano(plano) {
    if (!plano || !plano.diasPlano || plano.diasPlano.length === 0 || typeof plano.paginaInicio !== 'number' || typeof plano.paginaFim !== 'number' || plano.paginaFim < plano.paginaInicio) {
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

    atualizarPaginasLidas(plano);
}


/**
 * Recalcula um plano atrasado com base em uma nova data de fim.
 */
export function recalcularPlanoComNovaData(planoOriginal, novaDataFim) {
    if (!planoOriginal || !(novaDataFim instanceof Date) || isNaN(novaDataFim)) {
        throw new Error("Dados inválidos para o recálculo do plano.");
    }
    const hoje = getHojeNormalizado();
    if (novaDataFim <= hoje) {
        throw new Error("A nova data de fim deve ser posterior à data de hoje.");
    }
    
    const planoRecalculado = JSON.parse(JSON.stringify(planoOriginal));
    
    // GARANTIA DE INTEGRIDADE: Preserva anotações globais
    planoRecalculado.neuroAnnotations = planoOriginal.neuroAnnotations || [];
    
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

    while (!isDiaValido(dataInicioRecalculo)) {
        dataInicioRecalculo.setDate(dataInicioRecalculo.getDate() + 1);
    }
    
    if (novaDataFim < dataInicioRecalculo) {
        throw new Error(`A nova data de fim não pode ser anterior ao próximo dia de leitura válido.`);
    }

    const novosDiasGerados = gerarDiasPlanoPorDatas(dataInicioRecalculo, novaDataFim, periodicidadePlano, diasSemanaPlano);

    if (novosDiasGerados.length === 0) {
        throw new Error("Não há dias de leitura válidos no novo período selecionado.");
    }

    const diasLidosPreservados = planoRecalculado.diasPlano.filter(dia =>
        dia.lido && dia.data && new Date(dia.data) < dataInicioRecalculo
    );
    
    const novoPlanoDeDias = [...diasLidosPreservados, ...novosDiasGerados];

    const planoParaDistribuicao = {
        paginaInicio: paginaInicioRecalculo,
        paginaFim: planoRecalculado.paginaFim,
        diasPlano: novosDiasGerados,
    };
    distribuirPaginasPlano(planoParaDistribuicao);

    planoRecalculado.diasPlano = novoPlanoDeDias.sort((a,b) => new Date(a.data) - new Date(b.data));
    planoRecalculado.dataFim = novaDataFim;
    atualizarPaginasLidas(planoRecalculado);
    
    return planoRecalculado;
}

/**
 * Analisa a carga de leitura semanal.
 */
export function analisarCargaSemanal(planos, totalPlanos) {
    const diasDaSemana = [
        { nome: 'Domingo', diaIdx: 0, planos: [], totalPaginas: 0 },
        { nome: 'Segunda', diaIdx: 1, planos: [], totalPaginas: 0 },
        { nome: 'Terça',   diaIdx: 2, planos: [], totalPaginas: 0 },
        { nome: 'Quarta',  diaIdx: 3, planos: [], totalPaginas: 0 },
        { nome: 'Quinta',  diaIdx: 4, planos: [], totalPaginas: 0 },
        { nome: 'Sexta',   diaIdx: 5, planos: [], totalPaginas: 0 },
        { nome: 'Sábado',  diaIdx: 6, planos: [], totalPaginas: 0 }
    ];

    if (!planos || planos.length === 0) {
        return diasDaSemana;
    }

    const planosAtivos = planos.filter(p => !p.isPaused);

    planosAtivos.forEach((plano, index) => {
        const status = determinarStatusPlano(plano);
        if (status === 'concluido' || status === 'invalido') {
            return;
        }

        const diasDeLeituraRestantes = plano.diasPlano?.filter(d => d.data && !d.lido).length || 0;
        if (diasDeLeituraRestantes === 0) {
            return; 
        }
        
        const paginasRestantes = (plano.totalPaginas || 0) - (plano.paginasLidas || 0);
        const mediaPaginasDia = Math.round(paginasRestantes / diasDeLeituraRestantes);
        
        const diasSemanaPlano = plano.diasSemana || [];
        const originalIndex = planos.findIndex(p => p.id === plano.id);
        const numeroDoPlano = totalPlanos - originalIndex;
        
        const infoPlano = { numero: numeroDoPlano, media: mediaPaginasDia, planoIndex: originalIndex };

        if (plano.periodicidade === 'diario') {
            diasDaSemana.forEach(dia => {
                dia.planos.push(infoPlano);
                dia.totalPaginas += mediaPaginasDia;
            });
        } else if (plano.periodicidade === 'semanal' && diasSemanaPlano.length > 0) {
            diasSemanaPlano.forEach(diaIdx => {
                const dia = diasDaSemana.find(d => d.diaIdx === diaIdx);
                if (dia) {
                    dia.planos.push(infoPlano);
                    dia.totalPaginas += mediaPaginasDia;
                }
            });
        }
    });

    return diasDaSemana;
}

function gerarDiasDoPlano(formData) {
    if (formData.definicaoPeriodo === 'datas') {
        return gerarDiasPlanoPorDatas(formData.dataInicio, formData.dataFim, formData.periodicidade, formData.diasSemana);
    } else if (formData.definicaoPeriodo === 'dias') {
        return gerarDiasPlanoPorDias(formData.dataInicio, formData.numeroDias, formData.periodicidade, formData.diasSemana);
    } else { // 'paginas'
        return gerarDiasPlanoPorPaginas(formData.dataInicio, formData.paginasPorDia, formData.paginaInicio, formData.paginaFim, formData.periodicidade, formData.diasSemana);
    }
}

export function construirObjetoPlano(formData, planoEditado) {
    const diasPlano = gerarDiasDoPlano(formData);
    if (!diasPlano || diasPlano.length === 0) {
        throw new Error("Não foi possível gerar dias de leitura com as configurações fornecidas.");
    }

    const id = planoEditado ? planoEditado.id : crypto.randomUUID();
    const dataFim = formData.definicaoPeriodo === 'datas' ? formData.dataFim : (diasPlano[diasPlano.length - 1]?.data || new Date());

    return {
        id: id,
        titulo: formData.titulo,
        linkDrive: formData.linkDrive,
        paginaInicio: formData.paginaInicio,
        paginaFim: formData.paginaFim,
        dataInicio: formData.dataInicio,
        dataFim: dataFim,
        periodicidade: formData.periodicidade,
        diasSemana: formData.diasSemana,
        diasPlano: diasPlano,
        paginasLidas: 0,
        totalPaginas: formData.paginaFim - formData.paginaInicio + 1,
        isPaused: planoEditado ? planoEditado.isPaused : false,
        dataPausa: planoEditado ? planoEditado.dataPausa : null,
        neuroAnnotations: planoEditado ? (planoEditado.neuroAnnotations || []) : [] 
    };
}

export function recalcularPlanoPorPaginasDia(planoOriginal, paginasPorDia) {
    if (!planoOriginal || !paginasPorDia || paginasPorDia <= 0) {
        throw new Error("Dados inválidos para o recálculo do plano.");
    }

    const hoje = getHojeNormalizado();
    const paginasLidas = planoOriginal.paginasLidas || 0;
    const paginasRestantes = Math.max(0, (planoOriginal.totalPaginas || 0) - paginasLidas);

    if (paginasRestantes <= 0) {
        throw new Error("Não há páginas restantes para ler. O recálculo não é necessário.");
    }

    const diasLeituraNecessarios = Math.ceil(paginasRestantes / paginasPorDia);

    let dataInicioRecalculo = hoje;
    const diasSemanaPlano = planoOriginal.diasSemana || [];
    const periodicidadePlano = planoOriginal.periodicidade || 'diario';
    
    const isDiaValido = (data) => {
        const diaSem = data.getDay();
        return periodicidadePlano === 'diario' || (periodicidadePlano === 'semanal' && diasSemanaPlano.includes(diaSem));
    };
    while (!isDiaValido(dataInicioRecalculo)) {
        dataInicioRecalculo.setDate(dataInicioRecalculo.getDate() + 1);
    }

    const novosDiasGerados = gerarDiasPlanoPorDias(dataInicioRecalculo, diasLeituraNecessarios, periodicidadePlano, diasSemanaPlano);

    if (novosDiasGerados.length === 0) {
        throw new Error("Não foi possível gerar um novo cronograma.");
    }

    const novaDataFim = novosDiasGerados[novosDiasGerados.length - 1].data;

    return recalcularPlanoComNovaData(planoOriginal, novaDataFim);
}

export function retomarPlano(plano) {
    if (!plano.isPaused || !plano.dataPausa) return plano;

    const dataRetomada = getHojeNormalizado();
    const dataPausa = new Date(plano.dataPausa);
    dataPausa.setHours(0, 0, 0, 0);

    const tempoPausaMs = dataRetomada.getTime() - dataPausa.getTime();

    if (tempoPausaMs > 0) {
        const umDiaEmMs = 24 * 60 * 60 * 1000;
        const diasDePausa = Math.ceil(tempoPausaMs / umDiaEmMs);
        
        plano.diasPlano.forEach(dia => {
            if (dia.data && !dia.lido) {
                const dataDia = new Date(dia.data);
                dataDia.setHours(0, 0, 0, 0);
                if (dataDia.getTime() >= dataPausa.getTime()) {
                     const novaData = new Date(dia.data);
                     novaData.setDate(novaData.getDate() + diasDePausa);
                     dia.data = novaData;
                }
            }
        });

        if (plano.dataFim) {
            const novaDataFim = new Date(plano.dataFim);
            novaDataFim.setDate(novaDataFim.getDate() + diasDePausa);
            plano.dataFim = novaDataFim;
        }
    }

    plano.isPaused = false;
    plano.dataPausa = null;

    return plano;
}

export function gerarConteudoICS(planos, horaInicio, horaFim) {
    const [startHour, startMinute] = horaInicio.split(':');
    const [endHour, endMinute] = horaFim.split(':');

    const formatICSDate = (date, hour, minute) => {
        const d = new Date(date);
        d.setUTCHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);
        return d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
    };

    let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//GerenciadorDePlanosDeLeitura//NONSGML v1.0//EN',
    ];

    const planosAtivos = planos.filter(p => {
        const status = determinarStatusPlano(p);
        return status !== 'concluido' && status !== 'pausado' && status !== 'invalido';
    });

    planosAtivos.forEach(plano => {
        plano.diasPlano.forEach(dia => {
            if (!dia.lido && dia.data) {
                const uid = `plano-${plano.id}-dia-${dia.data.toISOString().split('T')[0]}@plano-leitura.app`;
                const dtstart = formatICSDate(dia.data, startHour, startMinute);
                const dtend = formatICSDate(dia.data, endHour, endMinute);
                const summary = `Leitura: ${plano.titulo}`;
                const description = `Ler páginas ${dia.paginaInicioDia} a ${dia.paginaFimDia}.`;
                const dtstamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

                icsContent.push(
                    'BEGIN:VEVENT',
                    `UID:${uid}`,
                    `DTSTAMP:${dtstamp}`,
                    `DTSTART:${dtstart}`,
                    `DTEND:${dtend}`,
                    `SUMMARY:${summary}`,
                    `DESCRIPTION:${description}`,
                    'END:VEVENT'
                );
            }
        });
    });

    icsContent.push('END:VCALENDAR');
    return icsContent.join('\r\n');
}

export function calcularDataFimEstimada(dadosFormulario) {
    const { dataInicio, paginasPorDia, paginaInicio, paginaFim, periodicidade, diasSemana } = dadosFormulario;

    if (!dataInicio || isNaN(dataInicio) || !paginasPorDia || paginasPorDia <= 0 || !paginaInicio || !paginaFim || paginaFim < paginaInicio) {
        return null;
    }

    const totalPaginas = (paginaFim - paginaInicio) + 1;
    const diasLeituraNecessarios = Math.ceil(totalPaginas / paginasPorDia);

    let dataAtual = new Date(dataInicio);
    let diasAdicionados = 0;
    let dataFimEstimada = null;
    let safetyCounter = 0;
    const MAX_ITERATIONS = diasLeituraNecessarios * 10 + 366;

    while (diasAdicionados < diasLeituraNecessarios && safetyCounter < MAX_ITERATIONS) {
        const diaSemanaAtual = dataAtual.getDay();
        if (periodicidade === 'diario' || (periodicidade === 'semanal' && diasSemana.includes(diaSemanaAtual))) {
            diasAdicionados++;
            if (diasAdicionados === diasLeituraNecessarios) {
                dataFimEstimada = new Date(dataAtual);
            }
        }
        dataAtual.setDate(dataAtual.getDate() + 1);
        safetyCounter++;
    }

    return dataFimEstimada;
}

/**
 * Analisa anotações Neuro para revisões SRS (D+1, D+3, D+7).
 */
export function verificarRevisoesPendentes(planos) {
    const revisoes = [];
    const hoje = getHojeNormalizado();

    planos.forEach(plano => {
        if (!plano.neuroAnnotations || plano.isPaused) return;

        plano.neuroAnnotations.forEach(nota => {
            // CORREÇÃO SRS: Busca a data em múltiplos locais (raiz ou sessão atual)
            const dataBase = nota.updatedAt || nota.createdAt || nota.timestamp || (nota.currentSession ? nota.currentSession.date : null);
            
            if (!dataBase) return;

            const dataNota = new Date(dataBase);
            dataNota.setHours(0, 0, 0, 0);

            const diffTime = hoje.getTime() - dataNota.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));

            if (!nota.reviewsDone) nota.reviewsDone = { d1: false, d3: false, d7: false };

            let tipoRevisao = null;
            let prioridade = 0;

            if (diffDays >= 1 && !nota.reviewsDone.d1) {
                tipoRevisao = 'D+1 (Flash)';
                prioridade = 1;
            } else if (diffDays >= 3 && nota.reviewsDone.d1 && !nota.reviewsDone.d3) {
                tipoRevisao = 'D+3 (Consolidação)';
                prioridade = 2;
            } else if (diffDays >= 7 && nota.reviewsDone.d3 && !nota.reviewsDone.d7) {
                tipoRevisao = 'D+7 (Final)';
                prioridade = 3;
            }

            if (tipoRevisao) {
                // Tenta usar o Tema Central novo, senão a pergunta guia
                const desafioBase = nota.theme 
                    ? `Tema: ${nota.theme}` 
                    : (nota.meta?.find(m => m.subType === 'q1')?.text || "Recupere a tese principal.");

                revisoes.push({
                    planoIndex: planos.indexOf(plano),
                    planoTitulo: plano.titulo,
                    notaId: nota.id,
                    capitulo: nota.chapterTitle || `Pág. ${nota.pageStart}-${nota.pageEnd}`,
                    tipo: tipoRevisao,
                    prioridade: prioridade,
                    desafio: desafioBase
                });
            }
        });
    });

    return revisoes.sort((a, b) => a.prioridade - b.prioridade);
}
