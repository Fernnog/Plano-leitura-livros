document.addEventListener('DOMContentLoaded', () => {
    // Seleção de elementos do DOM
    const formPlano = document.getElementById('form-plano');
    const listaPlanos = document.getElementById('lista-planos');
    const exportarPlanosBtn = document.getElementById('exportar-planos');
    const importarPlanosBtn = document.getElementById('importar-planos-botao');
    const importarPlanosInput = document.getElementById('importar-planos');
    const limparDadosBtn = document.getElementById('limpar-dados');

    // Estado inicial
    let planos = carregarPlanosSalvos() || [];
    let planoEditandoIndex = -1;

    // Renderizar planos ao carregar a página
    renderizarPlanos();

    // Evento de submissão do formulário
    formPlano.addEventListener('submit', function(event) {
        event.preventDefault();

        // Captura dos valores do formulário
        const titulo = document.getElementById('titulo').value;
        const paginaInicio = parseInt(document.getElementById('pagina-inicio').value);
        const paginaFim = parseInt(document.getElementById('pagina-fim').value);
        const dataInicio = new Date(document.getElementById('data-inicio').value);
        const dataFim = new Date(document.getElementById('data-fim').value);
        const periodicidade = document.getElementById('periodicidade').value;
        const diasSemana = Array.from(document.getElementById('dias-semana').selectedOptions).map(option => parseInt(option.value));
        const definicaoPeriodo = document.querySelector('input[name="definicao-periodo"]:checked').value;

        // Validação das páginas
        if (isNaN(paginaInicio) || isNaN(paginaFim) || paginaFim < paginaInicio) {
            alert("As páginas de início e fim devem ser números válidos e a página de fim deve ser maior ou igual à página de início.");
            return;
        }

        // Criação ou atualização do plano
        const totalPaginas = paginaFim - paginaInicio + 1;
        const plano = criarPlanoLeitura(titulo, paginaInicio, paginaFim, dataInicio, dataFim, periodicidade, diasSemana, definicaoPeriodo);
        if (plano) {
            if (planoEditandoIndex > -1) {
                planos[planoEditandoIndex] = plano;
                planoEditandoIndex = -1;
                formPlano.querySelector('button[type="submit"]').textContent = 'Criar Plano';
            } else {
                planos.push(plano);
            }
            salvarPlanos(planos);
            renderizarPlanos();
            formPlano.reset();
        }
    });

    // Função para criar um plano de leitura
    function criarPlanoLeitura(titulo, paginaInicio, paginaFim, dataInicio, dataFim, periodicidade, diasSemana, definicaoPeriodo) {
        const totalPaginas = paginaFim - paginaInicio + 1;
        let dataAtual = new Date(dataInicio);
        const dataFinal = new Date(dataFim);
        const diasPlano = [];

        // Preenche os dias do plano conforme a periodicidade
        while (dataAtual <= dataFinal) {
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

        const totalDiasLeitura = diasPlano.length;
        if (totalDiasLeitura === 0) {
            alert("Não há dias de leitura válidos no período especificado.");
            return null;
        }

        // Distribui as páginas pelos dias
        const paginasPorDia = Math.floor(totalPaginas / totalDiasLeitura);
        const resto = totalPaginas % totalDiasLeitura;
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
            paginasLidas: 0,
            definicaoPeriodo
        };
    }

    // Função para renderizar os planos na interface
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
            let diasAtrasados = verificarAtraso(plano);

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
                ${avisoAtrasoHTML}
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

    // Função para verificar atrasos no plano
    function verificarAtraso(plano) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        let diasAtrasadosCount = 0;
        for (const dia of plano.diasPlano) {
            const dataDiaLeitura = new Date(dia.data);
            dataDiaLeitura.setHours(0, 0, 0, 0);

            if (dataDiaLeitura < hoje && !dia.lido) {
                diasAtrasadosCount++;
            }
        }
        return diasAtrasadosCount;
    }

    // Função para renderizar os dias de leitura
    function renderizarDiasLeitura(diasPlano, planoIndex) {
        let diasHTML = '';
        diasPlano.forEach((dia, diaIndex) => {
            const dataFormatada = dia.data.toLocaleDateString('pt-BR');
            diasHTML += `
                <div class="dia-leitura">
                    <span>${dataFormatada} - Leia da página ${dia.paginaInicioDia} à ${dia.paginaFimDia}</span>
                    <input type="checkbox" id="dia-${planoIndex}-${diaIndex}" ${dia.lido ? 'checked' : ''}
                           onchange="marcarDiaLido(${planoIndex}, ${diaIndex}, this.checked)">
                    <label for="dia-${planoIndex}-${diaIndex}">Lido</label>
                </div>
            `;
        });
        return diasHTML;
    }

    // Função para marcar um dia como lido
    window.marcarDiaLido = function(planoIndex, diaIndex, lido) {
        planos[planoIndex].diasPlano[diaIndex].lido = lido;
        atualizarPaginasLidas(planoIndex);
        salvarPlanos(planos);
        renderizarPlanos();
    };

    // Função para atualizar o total de páginas lidas
    function atualizarPaginasLidas(planoIndex) {
        planos[planoIndex].paginasLidas = 0;
        planos[planoIndex].diasPlano.forEach(dia => {
            if (dia.lido) {
                planos[planoIndex].paginasLidas += dia.paginas;
            }
        });
    }

    // Função para editar um plano existente
    window.editarPlano = function(index) {
        planoEditandoIndex = index;
        const plano = planos[index];
        if (!plano) return;

        document.getElementById('titulo').value = plano.titulo;
        document.getElementById('pagina-inicio').value = plano.paginaInicio;
        document.getElementById('pagina-fim').value = plano.paginaFim;
        document.getElementById('data-inicio').value = plano.dataInicio.toISOString().split('T')[0];
        document.getElementById('data-fim').value = plano.dataFim.toISOString().split('T')[0];
        document.getElementById('periodicidade').value = plano.periodicidade;
        formPlano.querySelector('button[type="submit"]').textContent = 'Atualizar Plano';
    };

    // Função para recalcular o plano a partir do primeiro dia não lido
    window.recalcularPlano = function(index) {
        let plano = planos[index];
        if (!plano) return;

        const firstNotLidoIndex = plano.diasPlano.findIndex(dia => !dia.lido);
        if (firstNotLidoIndex === -1) {
            alert("Plano já concluído.");
            return;
        }

        let paginasLidasAteAgora = 0;
        if (firstNotLidoIndex > 0) {
            paginasLidasAteAgora = plano.diasPlano.slice(0, firstNotLidoIndex).reduce((sum, dia) => sum + dia.paginas, 0);
        }

        const remainingPages = plano.totalPaginas - paginasLidasAteAgora;
        const remainingDays = plano.diasPlano.length - firstNotLidoIndex;
        if (remainingDays <= 0) {
            alert("Não há dias restantes para recalcular.");
            return;
        }

        const paginasPorDia = Math.floor(remainingPages / remainingDays);
        const resto = remainingPages % remainingDays;
        let paginaAtual = firstNotLidoIndex === 0 ? plano.paginaInicio : plano.diasPlano[firstNotLidoIndex - 1].paginaFimDia + 1;

        for (let i = firstNotLidoIndex; i < plano.diasPlano.length; i++) {
            const paginasDia = (i - firstNotLidoIndex < resto) ? paginasPorDia + 1 : paginasPorDia;
            plano.diasPlano[i].paginaInicioDia = paginaAtual;
            plano.diasPlano[i].paginaFimDia = paginaAtual + paginasDia - 1;
            plano.diasPlano[i].paginas = paginasDia;
            paginaAtual = plano.diasPlano[i].paginaFimDia + 1;
        }

        salvarPlanos(planos);
        renderizarPlanos();
        alert(`Plano recalculado a partir do dia ${firstNotLidoIndex + 1}.`);
    };

    // Função para excluir um plano
    window.excluirPlano = function(index) {
        planos.splice(index, 1);
        salvarPlanos(planos);
        renderizarPlanos();
    };

    // Função para salvar planos no localStorage
    function salvarPlanos(planos) {
        localStorage.setItem('planosLeitura', JSON.stringify(planos));
    }

    // Função para carregar planos salvos do localStorage
    function carregarPlanosSalvos() {
        const planosSalvos = localStorage.getItem('planosLeitura');
        return planosSalvos ? JSON.parse(planosSalvos) : null;
    }

    // Eventos de exportação, importação e limpeza
    exportarPlanosBtn.addEventListener('click', exportarPlanosParaJson);
    importarPlanosBtn.addEventListener('click', () => importarPlanosInput.click());
    importarPlanosInput.addEventListener('change', importarPlanosDeJson);
    limparDadosBtn.addEventListener('click', limparDados);

    // Função para exportar planos para JSON
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

    // Função para importar planos de um arquivo JSON
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

    // Função para limpar todos os dados
    function limparDados() {
        if (confirm("Tem certeza que deseja limpar todos os planos de leitura? Esta ação não pode ser desfeita.")) {
            planos = [];
            localStorage.removeItem('planosLeitura');
            renderizarPlanos();
            alert("Todos os planos de leitura foram limpos.");
        }
    }
});
