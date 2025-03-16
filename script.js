document.addEventListener('DOMContentLoaded', () => {
    const formPlano = document.getElementById('form-plano');
    const listaPlanos = document.getElementById('lista-planos');
    const periodicidadeSelect = document.getElementById('periodicidade');
    const diasSemanaSelecao = document.getElementById('dias-semana-selecao');

    const exportarPlanosBtn = document.getElementById('exportar-planos');
    const importarPlanosBtn = document.getElementById('importar-planos-botao');
    const importarPlanosInput = document.getElementById('importar-planos');
    const limparDadosBtn = document.getElementById('limpar-dados');

    const definirPorDatasRadio = document.getElementById('definir-por-datas');
    const definirPorDiasRadio = document.getElementById('definir-por-dias');
    const periodoPorDatasDiv = document.getElementById('periodo-por-datas');
    const periodoPorDiasDiv = document.getElementById('periodo-por-dias');
    const dataInicioInputDatas = document.getElementById('data-inicio');
    const dataFimInputDatas = document.getElementById('data-fim');
    const dataInicioInputDias = document.getElementById('data-inicio-dias');
    const numeroDiasInput = document.getElementById('numero-dias');

    let planos = carregarPlanosSalvos() || []; // Carrega planos do localStorage ou inicia vazio
    let planoEditandoIndex = -1; // Índice do plano sendo editado, -1 se nenhum

    renderizarPlanos();

    periodicidadeSelect.addEventListener('change', function() {
        if (this.value === 'dias-semana') {
            diasSemanaSelecao.style.display = 'block';
        } else {
            diasSemanaSelecao.style.display = 'none';
        }
    });

    definirPorDatasRadio.addEventListener('change', function() {
        periodoPorDatasDiv.style.display = 'block';
        periodoPorDiasDiv.style.display = 'none';
        dataInicioInputDatas.required = true;
        dataFimInputDatas.required = true;
        dataInicioInputDias.required = false;
        numeroDiasInput.required = false;
    });

    definirPorDiasRadio.addEventListener('change', function() {
        periodoPorDatasDiv.style.display = 'none';
        periodoPorDiasDiv.style.display = 'block';
        dataInicioInputDatas.required = false;
        dataFimInputDatas.required = false;
        dataInicioInputDias.required = true;
        numeroDiasInput.required = true;
    });


    formPlano.addEventListener('submit', function(event) {
        event.preventDefault();

        const tituloLivro = document.getElementById('titulo-livro').value;
        const totalPaginas = parseInt(document.getElementById('total-paginas').value);
        let dataInicio, dataFim;

        if (definirPorDatasRadio.checked) {
            dataInicio = new Date(dataInicioInputDatas.value);
            dataFim = new Date(dataFimInputDatas.value);
            if (dataFim <= dataInicio) {
                alert("A data de fim deve ser posterior à data de início.");
                return;
            }
        } else { // Definir por dias
            dataInicio = new Date(dataInicioInputDias.value);
            const numeroDeDias = parseInt(numeroDiasInput.value);
            if (isNaN(numeroDeDias) || numeroDias < 1) {
                alert("Número de dias inválido.");
                return;
            }
            dataFim = new Date(dataInicio);
            dataFim.setDate(dataInicio.getDate() + numeroDeDias - 1); // Subtrai 1 porque o dia de início conta
        }


        const periodicidade = document.getElementById('periodicidade').value;
        let diasSelecionados = [];

        if (periodicidade === 'dias-semana') {
            diasSelecionados = Array.from(document.querySelectorAll('input[name="dia-semana"]:checked'))
                                     .map(checkbox => checkbox.value);
            if (diasSelecionados.length === 0) {
                alert("Selecione pelo menos um dia da semana para a periodicidade.");
                return;
            }
        }


        const plano = criarPlanoLeitura(tituloLivro, totalPaginas, dataInicio, dataFim, periodicidade, diasSelecionados);
        if (plano) {
            if (planoEditandoIndex > -1) {
                planos[planoEditandoIndex] = plano; // Update existing plan
                planoEditandoIndex = -1; // Reset editing index
                formPlano.querySelector('button[type="submit"]').textContent = 'Criar Plano'; // Change button text back
            } else {
                planos.push(plano); // Add new plan
            }
            salvarPlanos(planos);
            renderizarPlanos();
            formPlano.reset();
            diasSemanaSelecao.style.display = 'none';
            periodoPorDatasDiv.style.display = 'block'; // Reseta para definição por datas
            periodoPorDiasDiv.style.display = 'none';
            definirPorDatasRadio.checked = true;
            definirPorDiasRadio.checked = false;
        }
    });

    function criarPlanoLeitura(titulo, totalPaginas, dataInicio, dataFim, periodicidade, diasSemana) {
        const diasPlano = [];
        let dataAtual = new Date(dataInicio);
        dataAtual.setHours(0, 0, 0, 0); // Garante que comece no início do dia

        while (dataAtual <= dataFim) {
            let diaSemanaAtual = dataAtual.toLocaleDateString('pt-BR', { weekday: 'long' });
            diaSemanaAtual = diaSemanaAtual.split('-')[0]; // Pega só o nome do dia (ex: "segunda")

            let diaValido = false;
            if (periodicidade === 'diario') {
                diaValido = true;
            } else if (periodicidade === 'dias-semana') {
                diaValido = diasSemana.includes(diaSemanaAtual);
            }

            if (diaValido) {
                diasPlano.push({
                    data: new Date(dataAtual),
                    paginas: 0, // Calculado depois
                    lido: false
                });
            }
            dataAtual.setDate(dataAtual.getDate() + 1); // Avança para o próximo dia
        }

        const totalDiasLeitura = diasPlano.length;
        if (totalDiasLeitura === 0) {
            alert("Não há dias de leitura válidos no período selecionado com a periodicidade escolhida.");
            return null; // Retorna null para indicar que não foi possível criar o plano
        }
        const paginasPorDia = Math.ceil(totalPaginas / totalDiasLeitura); // Distribui páginas igualmente

        diasPlano.forEach(dia => dia.paginas = paginasPorDia);

        return {
            id: Date.now(), // ID único para cada plano
            titulo,
            totalPaginas,
            dataInicio,
            dataFim,
            periodicidade,
            diasSemana, // Persistindo os dias da semana selecionados
            diasPlano,
            paginasLidas: 0
        };
    }


    function renderizarPlanos() {
        listaPlanos.innerHTML = '';

        if (planos.length === 0) {
            listaPlanos.innerHTML = '<p>Nenhum plano de leitura cadastrado ainda.</p>';
            return;
        }

        planos.forEach((plano, index) => {
            if (!plano) return;

            const planoDiv = document.createElement('div');
            planoDiv.classList.add('plano-leitura');
            planoDiv.dataset.planoIndex = index;

            const progressoPercentual = (plano.paginasLidas / plano.totalPaginas) * 100;
            let avisoAtrasoHTML = '';
            let diasAtrasados = verificarAtraso(plano); // Função para verificar atraso, retorna número de dias atrasados

            if (diasAtrasados > 0) {
                avisoAtrasoHTML = `
                    <div class="aviso-atraso">
                        <p>⚠️ Plano de leitura com atraso de ${diasAtrasados} dia(s)!</p>
                        <button onclick="recalcularPlano(${index})">Recalcular Plano</button>
                    </div>
                `;
            }


            planoDiv.innerHTML = `
                <div class="plano-header">
                    <h3>${plano.titulo}</h3>
                    <div>
                        <button onclick="editarPlano(${index})">Editar</button>
                        <button onclick="excluirPlano(${index})">Excluir</button>
                    </div>
                </div>
                ${avisoAtrasoHTML}  <!-- Insere o aviso de atraso aqui -->
                <div class="progresso-container">
                    <div class="barra-progresso" style="width: ${progressoPercentual}%"></div>
                </div>
                <p>${plano.paginasLidas} de ${plano.totalPaginas} páginas lidas (${progressoPercentual.toFixed(0)}%)</p>
                <div class="dias-leitura">
                    ${renderizarDiasLeitura(plano.diasPlano, index)}
                </div>
            `;
            listaPlanos.appendChild(planoDiv);
        });
    }

    function verificarAtraso(plano) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        let atrasado = false;
        let diasAtrasadosCount = 0;

        for (const dia of plano.diasPlano) {
            const dataDiaLeitura = new Date(dia.data);
            dataDiaLeitura.setHours(0, 0, 0, 0);

            if (dataDiaLeitura < hoje && !dia.lido) {
                atrasado = true;
                diasAtrasadosCount++;
            }
        }
        return atrasado ? diasAtrasadosCount : 0; // Retorna número de dias atrasados se atrasado, senão 0
    }


    function renderizarDiasLeitura(diasPlano, planoIndex) {
        let diasHTML = '';
        diasPlano.forEach((dia, diaIndex) => {
            const dataFormatada = dia.data.toLocaleDateString('pt-BR');
            diasHTML += `
                <div class="dia-leitura">
                    <span>${dataFormatada} - ${dia.paginas} páginas</span>
                    <input type="checkbox" id="dia-${planoIndex}-${diaIndex}" ${dia.lido ? 'checked' : ''}
                           onchange="marcarDiaLido(${planoIndex}, ${diaIndex}, this.checked)">
                    <label for="dia-${planoIndex}-${diaIndex}">Lido</label>
                </div>
            `;
        });
        return diasHTML;
    }

    window.marcarDiaLido = function(planoIndex, diaIndex, lido) {
        planos[planoIndex].diasPlano[diaIndex].lido = lido;
        atualizarPaginasLidas(planoIndex);
        salvarPlanos(planos);
        renderizarPlanos(); // Refaz a renderização para atualizar a barra de progresso
    };


    function atualizarPaginasLidas(planoIndex) {
        let paginasLidas = 0;
        planos[planoIndex].diasPlano.forEach(dia => {
            if (dia.lido) {
                paginasLidas += planos[planoIndex].diasPlano[0].paginas; // Assume páginas por dia iguais
            }
        });
        planos[planoIndex].paginasLidas = paginasLidas;
    }


    window.editarPlano = function(index) {
        planoEditandoIndex = index; // Set the editing index
        const plano = planos[index];
        if (!plano) return;

        // Populate the form with plan data
        document.getElementById('titulo-livro').value = plano.titulo;
        document.getElementById('total-paginas').value = plano.totalPaginas;


        if (plano.dataFim) { // Assume 'por datas' if dataFim exists
            definirPorDatasRadio.checked = true;
            definirPorDiasRadio.checked = false;
            periodoPorDatasDiv.style.display = 'block';
            periodoPorDiasDiv.style.display = 'none';
            dataInicioInputDatas.valueAsDate = new Date(plano.dataInicio);
            dataFimInputDatas.valueAsDate = new Date(plano.dataFim);
            dataInicioInputDias.value = '';
            numeroDiasInput.value = '';
        } else if (plano.diasPlano && plano.diasPlano.length > 0) { // Fallback to 'por dias'
            definirPorDatasRadio.checked = false;
            definirPorDiasRadio.checked = true;
            periodoPorDatasDiv.style.display = 'none';
            periodoPorDiasDiv.style.display = 'block';
            dataInicioInputDias.valueAsDate = new Date(plano.dataInicio);
            numeroDiasInput.value = plano.diasPlano.length;
            dataInicioInputDatas.value = '';
            dataFimInputDatas.value = '';
        }


        document.getElementById('periodicidade').value = plano.periodicidade;
        if (plano.periodicidade === 'dias-semana') {
            diasSemanaSelecao.style.display = 'block';
            // Uncheck all day checkboxes first
            document.querySelectorAll('input[name="dia-semana"]').forEach(cb => cb.checked = false);
            // Check the days that were selected for this plan
            if (plano.diasSemana) {
                plano.diasSemana.forEach(dia => {
                    const checkbox = document.getElementById(dia);
                    if (checkbox) checkbox.checked = true;
                });
            }
        } else {
            diasSemanaSelecao.style.display = 'none';
        }

        formPlano.querySelector('button[type="submit"]').textContent = 'Atualizar Plano'; // Change button text
    };


    function atualizarPlano(index) { // This function is now integrated into the form submit event
        // The logic to update the plan is now within the form submit event listener
        // No need for a separate atualizarPlano function anymore, as the form submit handles both create and update
    }


    window.recalcularPlano = function(index) {
        let plano = planos[index];
        if (!plano) return;

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        let diasPassadosNaoLidos = 0;
        let paginasNaoLidas = 0;
        let diasRestantes = 0;
        let diasRestantesArray = [];

        for (let i = 0; i < plano.diasPlano.length; i++) {
            const dia = plano.diasPlano[i];
            const dataDiaLeitura = new Date(dia.data);
            dataDiaLeitura.setHours(0, 0, 0, 0);

            if (dataDiaLeitura < hoje && !dia.lido) {
                diasPassadosNaoLidos++;
                paginasNaoLidas += dia.paginas;
            } else if (dataDiaLeitura >= hoje) {
                diasRestantes++;
                diasRestantesArray.push(dia); // Keep track of remaining days
            }
        }

        const paginasRestantesTotal = plano.totalPaginas - plano.paginasLidas; // More accurate remaining pages
        let paginasPorDiaRecalculado = 0;

        if (diasRestantes > 0) {
            paginasPorDiaRecalculado = Math.ceil(paginasRestantesTotal / diasRestantes);
        } else {
            paginasPorDiaRecalculado = paginasRestantesTotal; // If no days left, all remaining pages for today (or last day)
        }

        // Update pages for the remaining days
        diasRestantesArray.forEach(dia => dia.paginas = paginasPorDiaRecalculado);

        salvarPlanos(planos);
        renderizarPlanos();
        alert(`Plano recalculado. Páginas por dia ajustadas para ${paginasPorDiaRecalculado} para os dias restantes.`);
    };


    function salvarPlanos(planos) {
        localStorage.setItem('planosLeitura', JSON.stringify(planos));
    }

    function carregarPlanosSalvos() {
        const planosSalvos = localStorage.getItem('planosLeitura');
        return planosSalvos ? JSON.parse(planosSalvos) : null;
    }

    function exportarPlanosParaJson() {
        const planosParaExportar = carregarPlanosSalvos() || [];
        if (planosParaExportar.length === 0) {
            alert("Não há planos de leitura para exportar.");
            return;
        }
        const jsonString = JSON.stringify(planosParaExportar, null, 2);

        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'planos-leitura.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importarPlanosDeJson(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                let planosImportados = JSON.parse(e.target.result);
                if (!Array.isArray(planosImportados)) {
                    alert("Arquivo JSON inválido: não contém um array de planos.");
                    return;
                }

                planosImportados = planosImportados.map(plano => {
                    if (plano.dataInicio) plano.dataInicio = new Date(plano.dataInicio);
                    if (plano.dataFim) plano.dataFim = new Date(plano.dataFim);
                    if (plano.diasPlano) {
                        plano.diasPlano = plano.diasPlano.map(dia => {
                            if (dia.data) dia.data = new Date(dia.data);
                            return dia;
                        });
                    }
                    return plano;
                });

                planos = planosImportados;
                salvarPlanos(planos);
                renderizarPlanos();
                alert("Planos de leitura importados com sucesso!");
            } catch (error) {
                console.error("Erro ao importar planos de JSON:", error);
                alert("Erro ao importar planos de leitura. Verifique se o arquivo JSON está correto.");
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    function limparDados() {
        if (confirm("Tem certeza que deseja limpar todos os planos de leitura? Esta ação não pode ser desfeita.")) {
            planos = [];
            localStorage.removeItem('planosLeitura');
            renderizarPlanos();
            alert("Todos os planos de leitura foram limpos.");
        }
    }

    exportarPlanosBtn.addEventListener('click', exportarPlanosParaJson);
    importarPlanosBtn.addEventListener('click', () => importarPlanosInput.click());
    importarPlanosInput.addEventListener('change', importarPlanosDeJson);
    limparDadosBtn.addEventListener('click', limparDados);

});
--- END OF FILE style.js ---
