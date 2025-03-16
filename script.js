document.addEventListener('DOMContentLoaded', () => {
    const formPlano = document.getElementById('form-plano');
    const listaPlanos = document.getElementById('lista-planos');
    const periodicidadeSelect = document.getElementById('periodicidade');
    const diasSemanaSelecao = document.getElementById('dias-semana-selecao');

    const exportarPlanosBtn = document.getElementById('exportar-planos');
    const importarPlanosBtn = document.getElementById('importar-planos-botao');
    const importarPlanosInput = document.getElementById('importar-planos');
    const limparDadosBtn = document.getElementById('limpar-dados');

    let planos = carregarPlanosSalvos() || []; // Carrega planos do localStorage ou inicia vazio
    renderizarPlanos();

    periodicidadeSelect.addEventListener('change', function() {
        if (this.value === 'dias-semana') {
            diasSemanaSelecao.style.display = 'block';
        } else {
            diasSemanaSelecao.style.display = 'none';
        }
    });

    formPlano.addEventListener('submit', function(event) {
        event.preventDefault();

        const tituloLivro = document.getElementById('titulo-livro').value;
        const totalPaginas = parseInt(document.getElementById('total-paginas').value);
        const dataInicio = new Date(document.getElementById('data-inicio').value);
        const dataFim = new Date(document.getElementById('data-fim').value);
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

        if (dataFim <= dataInicio) {
            alert("A data de fim deve ser posterior à data de início.");
            return;
        }

        const plano = criarPlanoLeitura(tituloLivro, totalPaginas, dataInicio, dataFim, periodicidade, diasSelecionados);
        if (plano) { // Verifica se o plano foi criado com sucesso (não é null)
            planos.push(plano);
            salvarPlanos(planos);
            renderizarPlanos();
            formPlano.reset();
            diasSemanaSelecao.style.display = 'none';
        }
    });

    function criarPlanoLeitura(titulo, totalPaginas, dataInicio, dataFim, periodicidade, diasSemana) {
        const diasPlano = [];
        let dataAtual = new Date(dataInicio);

        while (dataAtual <= dataFim) {
            let diaSemanaAtual = dataAtual.toLocaleDateString('pt-BR', { weekday: 'long' });
            diaSemanaAtual = diaSemanaAtual.split('-')[0]; // Pega só o nome do dia (ex: "segunda")

            let diaValido = false;
            if (periodicidade === 'diario') {
                diaValido = true;
            } else if (periodicidade === 'seg-qua-sex') {
                diaValido = ['segunda', 'quarta', 'sexta'].includes(diaSemanaAtual);
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
        listaPlanos.innerHTML = ''; // Limpa a lista antes de renderizar novamente

        if (planos.length === 0) {
            listaPlanos.innerHTML = '<p>Nenhum plano de leitura cadastrado ainda.</p>';
            return;
        }

        planos.forEach((plano, index) => {
            if (!plano) return; // Verifica se o plano é válido antes de renderizar

            const planoDiv = document.createElement('div');
            planoDiv.classList.add('plano-leitura');
            planoDiv.dataset.planoIndex = index; // Armazena o índice do plano no elemento

            const progressoPercentual = (plano.paginasLidas / plano.totalPaginas) * 100;

            planoDiv.innerHTML = `
                <div class="plano-header">
                    <h3>${plano.titulo}</h3>
                    <div>
                        <button onclick="editarPlano(${index})">Editar</button>
                        <button onclick="excluirPlano(${index})">Excluir</button>
                    </div>
                </div>
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
