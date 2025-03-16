document.addEventListener('DOMContentLoaded', () => {
    // Seleção de elementos do DOM
    const formPlano = document.getElementById('form-plano');
    const listaPlanos = document.getElementById('lista-planos');
    const periodicidadeSelect = document.getElementById('periodicidade');
    const diasSemanaSelecao = document.getElementById('dias-semana-selecao');
    const definirPorDatasRadio = document.getElementById('definir-por-datas');
    const definirPorDiasRadio = document.getElementById('definir-por-dias');
    const periodoPorDatasDiv = document.getElementById('periodo-por-datas');
    const periodoPorDiasDiv = document.getElementById('periodo-por-dias');
    const exportarPlanosBtn = document.getElementById('exportar-planos');
    const importarPlanosBtn = document.getElementById('importar-planos-botao');
    const importarPlanosInput = document.getElementById('importar-planos');
    const limparDadosBtn = document.getElementById('limpar-dados');
    const novoPlanoBtn = document.getElementById('novo-plano');
    const inicioBtn = document.getElementById('inicio');
    const cadastroPlanoSection = document.getElementById('cadastro-plano');
    const planosLeituraSection = document.getElementById('planos-leitura');

    // Estado inicial
    let planos = carregarPlanosSalvos() || [];
    let planoEditandoIndex = -1;

    // Renderizar planos ao carregar a página
    renderizarPlanos();

    // Alternância entre "Definir por Datas" e "Definir por Dias"
    definirPorDatasRadio.addEventListener('change', function() {
        periodoPorDatasDiv.style.display = 'block';
        periodoPorDiasDiv.style.display = 'none';
        document.getElementById('data-inicio').required = true;
        document.getElementById('data-fim').required = true;
        document.getElementById('data-inicio-dias').required = false;
        document.getElementById('numero-dias').required = false;
    });

    definirPorDiasRadio.addEventListener('change', function() {
        periodoPorDatasDiv.style.display = 'none';
        periodoPorDiasDiv.style.display = 'block';
        document.getElementById('data-inicio').required = false;
        document.getElementById('data-fim').required = false;
        document.getElementById('data-inicio-dias').required = true;
        document.getElementById('numero-dias').required = true;
    });

    // Exibir/esconder seleção de dias da semana com base na periodicidade
    periodicidadeSelect.addEventListener('change', function() {
        diasSemanaSelecao.style.display = this.value === 'semanal' ? 'block' : 'none';
    });


    novoPlanoBtn.addEventListener('click', () => {
        cadastroPlanoSection.style.display = 'block';
        planosLeituraSection.style.display = 'none';
        novoPlanoBtn.style.display = 'none';
        inicioBtn.style.display = 'inline-block';
        inicioBtn.style.cursor = 'pointer'; // Adiciona cursor de pointer
        novoPlanoBtn.style.cursor = 'default'; // Reseta cursor do botão Novo para default
    });

    inicioBtn.addEventListener('click', () => {
        cadastroPlanoSection.style.display = 'none';
        planosLeituraSection.style.display = 'block';
        novoPlanoBtn.style.display = 'inline-block';
        inicioBtn.style.display = 'none';
        novoPlanoBtn.style.cursor = 'pointer'; // Adiciona cursor de pointer
        inicioBtn.style.cursor = 'default'; // Reseta cursor do botão Inicio para default
    });

    // Submissão do formulário
    formPlano.addEventListener('submit', function(event) {
        event.preventDefault();

        const titulo = document.getElementById('titulo-livro').value;
        const paginaInicio = parseInt(document.getElementById('pagina-inicio').value);
        const paginaFim = parseInt(document.getElementById('pagina-fim').value);
        let dataInicio, dataFim;

        // Validação das páginas
        if (paginaFim < paginaInicio) {
            alert("A página de fim deve ser maior ou igual à página de início.");
            return;
        }

        // Determina as datas com base no método de definição
        if (definirPorDatasRadio.checked) {
            dataInicio = new Date(document.getElementById('data-inicio').value);
            dataFim = new Date(document.getElementById('data-fim').value);
            if (dataFim <= dataInicio) {
                alert("A data de fim deve ser posterior à data de início.");
                return;
            }
        } else {
            dataInicio = new Date(document.getElementById('data-inicio-dias').value);
            const numeroDias = parseInt(document.getElementById('numero-dias').value);
            if (isNaN(numeroDias) || numeroDias < 1) {
                alert("Número de dias inválido.");
                return;
            }
            dataFim = new Date(dataInicio);
            dataFim.setDate(dataInicio.getDate() + numeroDias - 1);
        }

        const periodicidade = periodicidadeSelect.value;
        const diasSemana = periodicidade === 'semanal' ?
            Array.from(document.querySelectorAll('input[name="dia-semana"]:checked')).map(cb => parseInt(cb.value)) : [];

        if (periodicidade === 'semanal' && diasSemana.length === 0) {
            alert("Selecione pelo menos um dia da semana.");
            return;
        }

        // Cria ou atualiza o plano
        const plano = criarPlanoLeitura(titulo, paginaInicio, paginaFim, dataInicio, dataFim, periodicidade, diasSemana);
        if (plano) {
            if (planoEditandoIndex > -1) {
                planos[planoEditandoIndex] = plano;
                planoEditandoIndex = -1;
                formPlano.querySelector('button[type="submit"]').textContent = 'Salvar Plano';
            } else {
                planos.push(plano);
            }
            salvarPlanos(planos);
            renderizarPlanos();
            formPlano.reset();
            periodoPorDatasDiv.style.display = 'block';
            periodoPorDiasDiv.style.display = 'none';
            definirPorDatasRadio.checked = true;
            definirPorDiasRadio.checked = false;
            diasSemanaSelecao.style.display = 'none';
            inicioBtn.click(); // Simula clique no botão "Início" para voltar para a tela de planos
        }
    });

    // Função para criar um plano de leitura
    function criarPlanoLeitura(titulo, paginaInicio, paginaFim, dataInicio, dataFim, periodicidade, diasSemana) {
        const totalPaginas = paginaFim - paginaInicio + 1;
        let dataAtual = new Date(dataInicio);
        dataAtual.setHours(0, 0, 0, 0);
        const diasPlano = [];

        while (dataAtual <= dataFim) {
            const diaSemana = dataAtual.getDay();
            if (periodicidade === 'diario' || (periodicidade === 'semanal' && diasSemana.includes(diaSemana))) {
                diasPlano.push({
                    data: new Date(dataAtual),
                    paginaInicioDia: 0,
                    paginaFimDia: 0,
                    paginas: 0,
                    lido: false
                });
            }
            dataAtual.setDate(dataAtual.getDate() + 1);
        }

        if (diasPlano.length === 0) {
            alert("Não há dias de leitura válidos no período selecionado.");
            return null;
        }

        const paginasPorDia = Math.floor(totalPaginas / diasPlano.length);
        const resto = totalPaginas % diasPlano.length;
        let paginaAtual = paginaInicio;

        diasPlano.forEach((dia, index) => {
            const paginasDia = index < resto ? paginasPorDia + 1 : paginasPorDia;
            dia.paginaInicioDia = paginaAtual;
            dia.paginaFimDia = paginaAtual + paginasDia - 1;
            dia.paginas = paginasDia;
            paginaAtual = dia.paginaFimDia + 1;
        });

        return {
            id: Date.now(),
            titulo,
            paginaInicio,
            paginaFim,
            totalPaginas,
            dataInicio,
            dataFim,
            periodicidade,
            diasSemana,
            diasPlano,
            paginasLidas: 0
        };
    }

    // Função para renderizar os planos
    function renderizarPlanos() {
        listaPlanos.innerHTML = planos.length === 0 ? '<p>Nenhum plano de leitura cadastrado ainda.</p>' : '';

        planos.forEach((plano, index) => {
            const progressoPercentual = (plano.paginasLidas / plano.totalPaginas) * 100;
            const diasAtrasados = verificarAtraso(plano);
            const avisoAtrasoHTML = diasAtrasados > 0 ? `
                <div class="aviso-atraso">
                    <p>⚠️ Plano com atraso de ${diasAtrasados} dia(s)!</p>
                    <button onclick="recalcularPlano(${index})">Recalcular Plano</button>
                </div>` : '';

            const planoDiv = document.createElement('div');
            planoDiv.classList.add('plano-leitura');
            planoDiv.innerHTML = `
                <div class="plano-header">
                    <h3>${plano.titulo}</h3>
                    <div>
                        <button onclick="editarPlano(${index})">Editar</button>
                        <button onclick="excluirPlano(${index})">Excluir</button>
                    </div>
                </div>
                ${avisoAtrasoHTML}
                <div class="progresso-container">
                    <div class="barra-progresso" style="width: ${progressoPercentual}%"></div>
                </div>
                <p>${plano.paginasLidas} de ${plano.totalPaginas} páginas lidas (${progressoPercentual.toFixed(0)}%)</p>
                <div class="dias-leitura">${renderizarDiasLeitura(plano.diasPlano, index)}</div>
            `;
            listaPlanos.appendChild(planoDiv);
        });
    }

    // Verifica atrasos no plano
    function verificarAtraso(plano) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        return plano.diasPlano.reduce((count, dia) => {
            const dataDia = new Date(dia.data);
            dataDia.setHours(0, 0, 0, 0);
            return count + (dataDia < hoje && !dia.lido ? 1 : 0);
        }, 0);
    }

    function renderizarDiasLeitura(diasPlano, planoIndex) {
        return diasPlano.map((dia, diaIndex) => {
            const alternadoClass = diaIndex % 2 === 0 ? 'alternado' : '';
            const lidoClass = dia.lido ? 'lido' : '';
            return `<div class="dia-leitura ${alternadoClass} ${lidoClass}">
                        <input type="checkbox" id="dia-${planoIndex}-${diaIndex}" ${dia.lido ? 'checked' : ''} onchange="marcarDiaLido(${planoIndex}, ${diaIndex}, this.checked)">
                        <span>${dia.data.toLocaleDateString('pt-BR')} - Páginas ${dia.paginaInicioDia} a ${dia.paginaFimDia}</span>
                    </div>`;
        }).join('');
    }

    // Marca um dia como lido
    window.marcarDiaLido = function(planoIndex, diaIndex, lido) {
        planos[planoIndex].diasPlano[diaIndex].lido = lido;
        atualizarPaginasLidas(planoIndex);
        salvarPlanos(planos);

        // Adiciona/remove a classe 'lido' ao elemento pai (div.dia-leitura)
        const diaLeituraElement = document.getElementById(`dia-${planoIndex}-${diaIndex}`).parentElement;
        if (lido) {
            diaLeituraElement.classList.add('lido');
        } else {
            diaLeituraElement.classList.remove('lido');
        }

        renderizarPlanos(); // Renderiza após atualizar as classes
    };

    // Atualiza o total de páginas lidas
    function atualizarPaginasLidas(planoIndex) {
        planos[planoIndex].paginasLidas = planos[planoIndex].diasPlano.reduce((sum, dia) =>
            sum + (dia.lido ? dia.paginas : 0), 0);
    }

    // Edita um plano existente
    window.editarPlano = function(index) {
        planoEditandoIndex = index;
        const plano = planos[index];
        document.getElementById('titulo-livro').value = plano.titulo;
        document.getElementById('pagina-inicio').value = plano.paginaInicio;
        document.getElementById('pagina-fim').value = plano.paginaFim;
        if (plano.definicaoPeriodo === 'datas') {
            definirPorDatasRadio.checked = true;
            definirPorDiasRadio.checked = false;
            periodoPorDatasDiv.style.display = 'block';
            periodoPorDiasDiv.style.display = 'none';
            document.getElementById('data-inicio').valueAsDate = new Date(plano.dataInicio);
            document.getElementById('data-fim').valueAsDate = new Date(plano.dataFim);
        } else {
            definirPorDatasRadio.checked = false;
            definirPorDiasRadio.checked = true;
            periodoPorDatasDiv.style.display = 'none';
            periodoPorDiasDiv.style.display = 'block';
            document.getElementById('data-inicio-dias').valueAsDate = new Date(plano.dataInicio);
            document.getElementById('numero-dias').value = plano.diasPlano.length;
        }
        periodicidadeSelect.value = plano.periodicidade;
        diasSemanaSelecao.style.display = plano.periodicidade === 'semanal' ? 'block' : 'none';
        if (plano.periodicidade === 'semanal') {
            document.querySelectorAll('input[name="dia-semana"]').forEach(cb => {
                cb.checked = plano.diasSemana.includes(parseInt(cb.value));
            });
        }
        formPlano.querySelector('button[type="submit"]').textContent = 'Salvar Plano';
        novoPlanoBtn.click(); // Simula clique no botão "Novo" para ir para a tela de cadastro
    };

    // Recalcula um plano atrasado
    window.recalcularPlano = function(index) {
        const plano = planos[index];
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const firstNotLidoIndex = plano.diasPlano.findIndex(dia => !dia.lido);
        if (firstNotLidoIndex === -1) {
            alert("Plano já concluído.");
            return;
        }

        let paginasLidasAteAgora = plano.diasPlano.slice(0, firstNotLidoIndex).reduce((sum, dia) =>
            sum + (dia.lido ? dia.paginas : 0), 0);
        const paginasRestantes = plano.totalPaginas - paginasLidasAteAgora;
        const diasRestantes = plano.diasPlano.slice(firstNotLidoIndex);
        const paginasPorDia = Math.floor(paginasRestantes / diasRestantes.length);
        const resto = paginasRestantes % diasRestantes.length;
        let paginaAtual = firstNotLidoIndex === 0 ? plano.paginaInicio : plano.diasPlano[firstNotLidoIndex - 1].paginaFimDia + 1;

        diasRestantes.forEach((dia, i) => {
            const paginasDia = i < resto ? paginasPorDia + 1 : paginasPorDia;
            dia.paginaInicioDia = paginaAtual;
            dia.paginaFimDia = paginaAtual + paginasDia - 1;
            dia.paginas = paginasDia;
            paginaAtual = dia.paginaFimDia + 1;
        });

        salvarPlanos(planos);
        renderizarPlanos();
    };

    // Exclui um plano
    window.excluirPlano = function(index) {
        if (confirm("Tem certeza que deseja excluir este plano?")) {
            planos.splice(index, 1);
            salvarPlanos(planos);
            renderizarPlanos();
        }
    };

    // Salva planos no localStorage
    function salvarPlanos(planos) {
        localStorage.setItem('planosLeitura', JSON.stringify(planos));
    }

    // Carrega planos do localStorage
    function carregarPlanosSalvos() {
        const planosSalvos = localStorage.getItem('planosLeitura');
        if (!planosSalvos) return null;
        const planos = JSON.parse(planosSalvos);
        return planos.map(plano => {
            plano.dataInicio = new Date(plano.dataInicio);
            plano.dataFim = new Date(plano.dataFim);
            plano.diasPlano = plano.diasPlano.map(dia => {
                dia.data = new Date(dia.data);
                return dia;
            });
            return plano;
        });
    }

    // Exporta planos para JSON
    exportarPlanosBtn.addEventListener('click', function() {
        const jsonString = JSON.stringify(planos, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Formatação da data e hora
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const fileName = `${year}${month}${day}_${hours}${minutes}_Plano de leitura de livros.json`;


        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    });

    // Importa planos de JSON
    importarPlanosBtn.addEventListener('click', () => importarPlanosInput.click());
    importarPlanosInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const novosPlanos = JSON.parse(e.target.result);
                planos = novosPlanos.map(plano => ({
                    ...plano,
                    dataInicio: new Date(plano.dataInicio),
                    dataFim: new Date(plano.dataFim),
                    diasPlano: plano.diasPlano.map(dia => ({
                        ...dia,
                        data: new Date(dia.data)
                    }))
                }));
                salvarPlanos(planos);
                renderizarPlanos();
            } catch (error) {
                alert("Erro ao importar o arquivo JSON.");
            }
        };
        reader.readAsText(file);
    });

    // Limpa todos os dados
    limparDadosBtn.addEventListener('click', function() {
        if (confirm("Tem certeza que deseja limpar todos os dados?")) {
            planos = [];
            localStorage.removeItem('planosLeitura');
            renderizarPlanos();
        }
    });
});