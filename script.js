document.addEventListener('DOMContentLoaded', () => {
    // **Constantes para elementos do DOM**
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

    // **Estado inicial**
    let planos = carregarPlanosSalvos() || []; // Carrega planos do localStorage ou inicia vazio
    let planoEditandoIndex = -1; // Índice do plano sendo editado, -1 se nenhum

    renderizarPlanos(); // Renderiza os planos ao carregar a página

    // **Evento de mudança na periodicidade**
    periodicidadeSelect.addEventListener('change', function() {
        diasSemanaSelecao.style.display = this.value === 'dias-semana' ? 'block' : 'none';
    });

    // **Alternância entre definição por datas e por dias**
    definirPorDatasRadio.addEventListener('change', function() {
        periodoPorDatasDiv.style.display = 'block';
        periodoPorDiasDiv.style.display = 'none';
        dataInicioInputDias.value = ''; // Limpa campo de data de início por dias
        numeroDiasInput.value = ''; // Limpa campo de número de dias
        dataInicioInputDatas.required = true;
        dataFimInputDatas.required = true;
        dataInicioInputDias.required = false;
        numeroDiasInput.required = false;
    });

    definirPorDiasRadio.addEventListener('change', function() {
        periodoPorDatasDiv.style.display = 'none';
        periodoPorDiasDiv.style.display = 'block';
        dataInicioInputDatas.value = ''; // Limpa data de início por datas
        dataFimInputDatas.value = ''; // Limpa data de fim
        dataInicioInputDatas.required = false;
        dataFimInputDatas.required = false;
        dataInicioInputDias.required = true;
        numeroDiasInput.required = true;
    });

    // **Submissão do formulário**
    formPlano.addEventListener('submit', function(event) {
        event.preventDefault();

        // Validação do total de páginas
        const totalPaginas = parseInt(document.getElementById('total-paginas').value);
        if (totalPaginas <= 0) {
            alert("O total de páginas deve ser um número positivo.");
            return;
        }

        const tituloLivro = document.getElementById('titulo-livro').value;
        let dataInicio, dataFim;

        // Determina as datas com base no método de definição
        if (definirPorDatasRadio.checked) {
            dataInicio = new Date(dataInicioInputDatas.value);
            dataFim = new Date(dataFimInputDatas.value);
            if (dataFim <= dataInicio) {
                alert("A data de fim deve ser posterior à data de início.");
                return;
            }
        } else {
            dataInicio = new Date(dataInicioInputDias.value);
            const numeroDeDias = parseInt(numeroDiasInput.value);
            if (isNaN(numeroDeDias) || numeroDeDias < 1) {
                alert("Número de dias inválido.");
                return;
            }
            dataFim = new Date(dataInicio);
            dataFim.setDate(dataInicio.getDate() + numeroDeDias - 1);
        }

        const periodicidade = periodicidadeSelect.value;
        let diasSelecionados = periodicidade === 'dias-semana' ?
            Array.from(document.querySelectorAll('input[name="dia-semana"]:checked')).map(cb => cb.value) : [];
        
        if (periodicidade === 'dias-semana' && diasSelecionados.length === 0) {
            alert("Selecione pelo menos um dia da semana.");
            return;
        }

        // Cria ou atualiza o plano
        const plano = criarPlanoLeitura(
            tituloLivro,
            totalPaginas,
            dataInicio,
            dataFim,
            periodicidade,
            diasSelecionados,
            definirPorDatasRadio.checked ? 'datas' : 'dias'
        );

        if (plano) {
            if (planoEditandoIndex > -1) {
                planos[planoEditandoIndex] = plano;
                planoEditandoIndex = -1;
                formPlano.querySelector('button[type="submit"]').textContent = 'Criar Plano';
                const feedback = document.getElementById('edit-feedback');
                if (feedback) feedback.remove();
            } else {
                planos.push(plano);
            }
            salvarPlanos(planos);
            renderizarPlanos();
            formPlano.reset();
            diasSemanaSelecao.style.display = 'none';
            periodoPorDatasDiv.style.display = 'block';
            periodoPorDiasDiv.style.display = 'none';
            definirPorDatasRadio.checked = true;
            definirPorDiasRadio.checked = false;
        }
    });

    // **Função para criar um plano de leitura**
    function criarPlanoLeitura(titulo, totalPaginas, dataInicio, dataFim, periodicidade, diasSemana, definicaoPeriodo) {
        const diasPlano = [];
        let dataAtual = new Date(dataInicio);
        dataAtual.setHours(0, 0, 0, 0);

        while (dataAtual <= dataFim) {
            let diaSemanaAtual = dataAtual.toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0];
            let diaValido = periodicidade === 'diario' || (periodicidade === 'dias-semana' && diasSemana.includes(diaSemanaAtual));

            if (diaValido) {
                diasPlano.push({ data: new Date(dataAtual), paginas: 0, lido: false });
            }
            dataAtual.setDate(dataAtual.getDate() + 1);
        }

        if (diasPlano.length === 0) {
            alert("Não há dias de leitura válidos no período selecionado.");
            return null;
        }

        const paginasPorDia = Math.ceil(totalPaginas / diasPlano.length);
        diasPlano.forEach(dia => dia.paginas = paginasPorDia);

        return {
            id: Date.now(),
            titulo,
            totalPaginas,
            dataInicio,
            dataFim,
            periodicidade,
            diasSemana,
            diasPlano,
            paginasLidas: 0,
            definicaoPeriodo
        };
    }

    // **Função para renderizar os planos**
    function renderizarPlanos() {
        listaPlanos.innerHTML = planos.length === 0 ? '<p>Nenhum plano de leitura cadastrado ainda.</p>' : '';
        
        planos.forEach((plano, index) => {
            if (!plano) return;

            const planoDiv = document.createElement('div');
            planoDiv.classList.add('plano-leitura');
            planoDiv.dataset.planoIndex = index;

            const progressoPercentual = (plano.paginasLidas / plano.totalPaginas) * 100;
            const diasAtrasados = verificarAtraso(plano);
            const avisoAtrasoHTML = diasAtrasados > 0 ? `
                <div class="aviso-atraso">
                    <p>⚠️ Plano com atraso de ${diasAtrasados} dia(s)!</p>
                    <button onclick="recalcularPlano(${index})">Recalcular Plano</button>
                </div>` : '';

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

    // **Verifica atrasos no plano**
    function verificarAtraso(plano) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        return plano.diasPlano.reduce((count, dia) => {
            const dataDia = new Date(dia.data);
            dataDia.setHours(0, 0, 0, 0);
            return count + (dataDia < hoje && !dia.lido ? 1 : 0);
        }, 0);
    }

    // **Renderiza os dias de leitura**
    function renderizarDiasLeitura(diasPlano, planoIndex) {
        return diasPlano.map((dia, diaIndex) => `
            <div class="dia-leitura">
                <span>${dia.data.toLocaleDateString('pt-BR')} - ${dia.paginas} páginas</span>
                <input type="checkbox" id="dia-${planoIndex}-${diaIndex}" ${dia.lido ? 'checked' : ''} 
                       onchange="marcarDiaLido(${planoIndex}, ${diaIndex}, this.checked)">
                <label for="dia-${planoIndex}-${diaIndex}">Lido</label>
            </div>
        `).join('');
    }

    // **Marca um dia como lido**
    window.marcarDiaLido = function(planoIndex, diaIndex, lido) {
        planos[planoIndex].diasPlano[diaIndex].lido = lido;
        atualizarPaginasLidas(planoIndex);
        salvarPlanos(planos);
        renderizarPlanos();
    };

    // **Atualiza o total de páginas lidas**
    function atualizarPaginasLidas(planoIndex) {
        planos[planoIndex].paginasLidas = planos[planoIndex].diasPlano.reduce((sum, dia) => 
            sum + (dia.lido ? dia.paginas : 0), 0);
    }

    // **Edita um plano existente**
    window.editarPlano = function(index) {
        planoEditandoIndex = index;
        const plano = planos[index];

        // Feedback visual
        let feedback = document.getElementById('edit-feedback');
        if (!feedback) {
            feedback = document.createElement('p');
            feedback.id = 'edit-feedback';
            feedback.style.color = '#5cb85c';
            formPlano.insertBefore(feedback, formPlano.firstChild);
        }
        feedback.textContent = `Editando plano: ${plano.titulo}`;

        // Preenche o formulário
        document.getElementById('titulo-livro').value = plano.titulo;
        document.getElementById('total-paginas').value = plano.totalPaginas;
        
        if (plano.definicaoPeriodo === 'datas') {
            definirPorDatasRadio.checked = true;
            definirPorDiasRadio.checked = false;
            periodoPorDatasDiv.style.display = 'block';
            periodoPorDiasDiv.style.display = 'none';
            dataInicioInputDatas.valueAsDate = new Date(plano.dataInicio);
            dataFimInputDatas.valueAsDate = new Date(plano.dataFim);
            dataInicioInputDias.value = '';
            numeroDiasInput.value = '';
        } else {
            definirPorDatasRadio.checked = false;
            definirPorDiasRadio.checked = true;
            periodoPorDatasDiv.style.display = 'none';
            periodoPorDiasDiv.style.display = 'block';
            dataInicioInputDias.valueAsDate = new Date(plano.dataInicio);
            numeroDiasInput.value = plano.diasPlano.length;
            dataInicioInputDatas.value = '';
            dataFimInputDatas.value = '';
        }

        periodicidadeSelect.value = plano.periodicidade;
        diasSemanaSelecao.style.display = plano.periodicidade === 'dias-semana' ? 'block' : 'none';
        if (plano.periodicidade === 'dias-semana') {
            document.querySelectorAll('input[name="dia-semana"]').forEach(cb => cb.checked = plano.diasSemana.includes(cb.value));
        }

        formPlano.querySelector('button[type="submit"]').textContent = 'Atualizar Plano';
    };

    // **Recalcula um plano atrasado**
    window.recalcularPlano = function(index) {
        const plano = planos[index];
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        let paginasNaoLidas = 0;
        let diasRestantesArray = [];

        plano.diasPlano.forEach(dia => {
            const dataDia = new Date(dia.data);
            dataDia.setHours(0, 0, 0, 0);
            if (dataDia < hoje && !dia.lido) {
                paginasNaoLidas += dia.paginas;
            } else if (dataDia >= hoje) {
                diasRestantesArray.push(dia);
            }
        });

        const paginasRestantesTotal = plano.totalPaginas - plano.paginasLidas + paginasNaoLidas;
        const paginasPorDiaRecalculado = Math.ceil(paginasRestantesTotal / diasRestantesArray.length);
        diasRestantesArray.forEach(dia => dia.paginas = paginasPorDiaRecalculado);

        salvarPlanos(planos);
        renderizarPlanos();
        alert(`Plano recalculado. Páginas por dia ajustadas para ${paginasPorDiaRecalculado}.`);
    };

    // **Exclui um plano**
    window.excluirPlano = function(index) {
        if (confirm("Tem certeza que deseja excluir este plano?")) {
            planos.splice(index, 1);
            salvarPlanos(planos);
            renderizarPlanos();
        }
    };

    // **Salva planos no localStorage**
    function salvarPlanos(planos) {
        localStorage.setItem('planosLeitura', JSON.stringify(planos));
    }

    // **Carrega planos do localStorage**
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

    // **Exporta planos para JSON**
    function exportarPlanosParaJson() {
        if (planos.length === 0) {
            alert("Não há planos para exportar.");
            return;
        }
        const jsonString = JSON.stringify(planos, null, 2);
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

    // **Importa planos de JSON**
    function importarPlanosDeJson(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                let planosImportados = JSON.parse(e.target.result);
                planosImportados = planosImportados.map(plano => {
                    plano.dataInicio = new Date(plano.dataInicio);
                    plano.dataFim = new Date(plano.dataFim);
                    plano.diasPlano = plano.diasPlano.map(dia => {
                        dia.data = new Date(dia.data);
                        return dia;
                    });
                    return plano;
                });
                planos = planosImportados;
                salvarPlanos(planos);
                renderizarPlanos();
                alert("Planos importados com sucesso!");
            } catch (error) {
                alert("Erro ao importar planos. Verifique o arquivo JSON.");
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    // **Limpa todos os dados**
    function limparDados() {
        if (confirm("Tem certeza que deseja limpar todos os planos?")) {
            planos = [];
            localStorage.removeItem('planosLeitura');
            renderizarPlanos();
            alert("Todos os planos foram limpos.");
        }
    }

    // **Eventos dos botões**
    exportarPlanosBtn.addEventListener('click', exportarPlanosParaJson);
    importarPlanosBtn.addEventListener('click', () => importarPlanosInput.click());
    importarPlanosInput.addEventListener('change', importarPlanosDeJson);
    limparDadosBtn.addEventListener('click', limparDados);
});
