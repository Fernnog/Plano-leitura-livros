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
            if (isNaN(numeroDeDias) || numeroDeDias < 1) {
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
            planos.push(plano);
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
            let atrasado = verificarAtraso(plano); // Função para verificar atraso

            if (atrasado) {
                avisoAtrasoHTML = `
                    <div class="aviso-atraso">
                        <p>⚠️ Plano de leitura com atraso!</p>
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
        hoje.setHours(0, 0, 0, 0); // Zera as horas para comparar apenas as datas

        for (const dia of plano.diasPlano) {
            const dataDiaLeitura = new Date(dia.data);
            dataDiaLeitura.setHours(0, 0, 0, 0);

            if (dataDiaLeitura < hoje && !dia.lido) {
                return true; // Atrasado se a data de leitura é anterior a hoje e não foi lido
            }
        }
        return false; // Não atrasado
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
        // TODO: Implementar a lógica de edição do plano
        alert(`Funcionalidade de editar plano ${planos[index].titulo} será implementada em breve.`);
    };

    window.excluirPlano = function(index) {
        if (confirm(`Deseja excluir o plano de leitura para "${planos[index].titulo}"?`)) {
            planos.splice(index, 1);
            salvarPlanos(planos);
            renderizarPlanos();
        }
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
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const planosImportados = JSON.parse(e.target.result);
                if (!Array.isArray(planosImportados)) {
                    alert("Arquivo JSON inválido: não contém um array de planos.");
                    return;
                }
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
        event.target.value = ''; // Limpa o valor do input para permitir importar o mesmo arquivo novamente
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