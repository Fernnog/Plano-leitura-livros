// Função para carregar planos do localStorage
function carregarPlanos() {
    const planos = localStorage.getItem('planos');
    return planos ? JSON.parse(planos) : [];
}

// Função para salvar planos no localStorage
function salvarPlanos(planos) {
    localStorage.setItem('planos', JSON.stringify(planos));
}

// Função para calcular dias de leitura
function calcularDiasPlano(paginaInicio, paginaFim, dataInicio, dataFimOuDias, periodicidade, diasSelecionados) {
    const diasPlano = [];
    const totalPaginas = paginaFim - paginaInicio + 1;
    let paginasPorDia = Math.ceil(totalPaginas / (dataFimOuDias instanceof Date ? 
        Math.ceil((dataFimOuDias - dataInicio) / (1000 * 60 * 60 * 24)) : dataFimOuDias));
    let dataAtual = new Date(dataInicio);

    if (periodicidade === 'semanal' && diasSelecionados) {
        while (dataAtual <= (dataFimOuDias instanceof Date ? dataFimOuDias : new Date(dataInicio.getTime() + (dataFimOuDias - 1) * 24 * 60 * 60 * 1000))) {
            if (diasSelecionados.includes(dataAtual.getDay())) {
                const paginaInicial = paginaInicio + (diasPlano.length * paginasPorDia);
                const paginaFinal = Math.min(paginaInicial + paginasPorDia - 1, paginaFim);
                diasPlano.push({
                    data: new Date(dataAtual),
                    paginaInicio: paginaInicial,
                    paginaFim: paginaFinal,
                    lido: false
                });
            }
            dataAtual.setDate(dataAtual.getDate() + 1);
        }
    } else {
        while (dataAtual <= (dataFimOuDias instanceof Date ? dataFimOuDias : new Date(dataInicio.getTime() + (dataFimOuDias - 1) * 24 * 60 * 60 * 1000))) {
            const paginaInicial = paginaInicio + (diasPlano.length * paginasPorDia);
            const paginaFinal = Math.min(paginaInicial + paginasPorDia - 1, paginaFim);
            diasPlano.push({
                data: new Date(dataAtual),
                paginaInicio: paginaInicial,
                paginaFim: paginaFinal,
                lido: false
            });
            dataAtual.setDate(dataAtual.getDate() + 1);
        }
    }
    return diasPlano;
}

// Função para renderizar planos
function renderizarPlanos() {
    const planos = carregarPlanos();
    const listaPlanos = document.getElementById('lista-planos');
    const paginador = document.getElementById('paginador-planos');
    listaPlanos.innerHTML = '';
    paginador.innerHTML = '';

    planos.forEach((plano, index) => {
        const planoDiv = document.createElement('div');
        planoDiv.className = 'plano-leitura';
        planoDiv.innerHTML = `
            <div class="plano-header">
                <span class="plano-numero">${index + 1}.</span> <span>${plano.titulo}</span>
                <div>
                    <button onclick="editarPlano(${index})">Editar</button>
                    <button onclick="excluirPlano(${index})">Excluir</button>
                </div>
            </div>
            <div>0 de ${plano.paginaFim - plano.paginaInicio + 1} páginas lidas (0%)</div>
            <div class="progresso-container">
                <div class="barra-progresso" style="width: 0%"></div>
            </div>
            <div class="dias-leitura">
                ${plano.diasPlano.map(dia => `
                    <div class="dia-leitura ${index % 2 === 0 ? 'alternado' : ''}">
                        <input type="checkbox" onchange="marcarComoLido(${index}, ${plano.diasPlano.indexOf(dia)})">
                        <label>${dia.data.toLocaleDateString('pt-BR')} - Páginas ${dia.paginaInicio} a ${dia.paginaFim}</label>
                    </div>
                `).join('')}
            </div>
        `;
        listaPlanos.appendChild(planoDiv);

        // Atualiza progresso
        const totalPaginas = plano.paginaFim - plano.paginaInicio + 1;
        const paginasLidas = plano.diasPlano.filter(d => d.lido).reduce((sum, d) => sum + (d.paginaFim - d.paginaInicio + 1), 0);
        const progresso = Math.round((paginasLidas / totalPaginas) * 100);
        planoDiv.querySelector('.barra-progresso').style.width = `${progresso}%`;
        planoDiv.querySelector('div:nth-child(2)').textContent = `${paginasLidas} de ${totalPaginas} páginas lidas (${progresso}%)`;

        // Adiciona link ao paginador
        const link = document.createElement('a');
        link.href = `#plano-${index}`;
        link.textContent = index + 1;
        paginador.appendChild(link);
    });

    // Ajusta o comportamento do paginador após renderizar
    togglePaginatorVisibility();
}

// Função para marcar como lido
function marcarComoLido(planoIndex, diaIndex) {
    const planos = carregarPlanos();
    planos[planoIndex].diasPlano[diaIndex].lido = !planos[planoIndex].diasPlano[diaIndex].lido;
    salvarPlanos(planos);
    renderizarPlanos();
}

// Função para salvar novo plano
function salvarPlano(event) {
    event.preventDefault();
    const titulo = document.getElementById('titulo-livro').value;
    const paginaInicio = parseInt(document.getElementById('pagina-inicio').value);
    const paginaFim = parseInt(document.getElementById('pagina-fim').value);
    const dataInicio = new Date(document.getElementById('data-inicio').value);
    const definicao = document.querySelector('input[name="definicao-periodo"]:checked').value;
    let dataFimOuDias;
    const periodicidade = document.getElementById('periodicidade').value;
    let diasSelecionados = [];

    if (periodicidade === 'semanal') {
        diasSelecionados = Array.from(document.querySelectorAll('#dias-semana-selecao input[type="checkbox"]:checked'))
            .map(cb => parseInt(cb.value));
    }

    if (definicao === 'datas') {
        dataFimOuDias = new Date(document.getElementById('data-fim').value);
    } else {
        dataFimOuDias = parseInt(document.getElementById('numero-dias').value);
    }

    const diasPlano = calcularDiasPlano(paginaInicio, paginaFim, dataInicio, dataFimOuDias, periodicidade, diasSelecionados);
    const plano = { titulo, paginaInicio, paginaFim, dataInicio, diasPlano };
    const planos = carregarPlanos();
    planos.push(plano);
    salvarPlanos(planos);
    document.getElementById('cadastro-plano').style.display = 'none';
    document.getElementById('form-plano').reset();
    renderizarPlanos();
    document.getElementById('planos-leitura').style.display = 'block';
}

// Função para editar plano (exemplo básico)
function editarPlano(index) {
    // Implementação a ser ajustada conforme necessário
    console.log('Editar plano', index);
}

// Função para excluir plano
function excluirPlano(index) {
    if (confirm('Tem certeza de que deseja excluir este plano?')) {
        const planos = carregarPlanos();
        planos.splice(index, 1);
        salvarPlanos(planos);
        renderizarPlanos();
    }
}

// Função para exportar planos
function exportarPlanos() {
    const planos = carregarPlanos();
    const data = new Blob([JSON.stringify(planos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'planos_de_leitura.json';
    link.click();
}

// Função para importar planos
document.getElementById('importar-planos-botao').addEventListener('click', () => {
    document.getElementById('importar-planos').click();
});

document.getElementById('importar-planos').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const planos = JSON.parse(e.target.result);
            salvarPlanos(planos);
            renderizarPlanos();
        };
        reader.readAsText(file);
    }
});

// Função para exportar agenda (ICS)
function exportarAgenda() {
    const planos = carregarPlanos();
    let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\n';
    planos.forEach((plano, index) => {
        plano.diasPlano.forEach(dia => {
            icsContent += `BEGIN:VEVENT\nUID:plano-${index}-${dia.data.toISOString()}\n`;
            icsContent += `DTSTART:${dia.data.toISOString().replace(/[-:]/g, '').split('.')[0]}Z\n`;
            icsContent += `DTEND:${new Date(dia.data.getTime() + 15*60000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z\n`; // 15 minutos
            icsContent += `SUMMARY:Leitura - ${plano.titulo} (Páginas ${dia.paginaInicio}-${dia.paginaFim})\n`;
            icsContent += `END:VEVENT\n`;
        });
    });
    icsContent += 'END:VCALENDAR';
    const data = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'agenda_leitura.ics';
    link.click();
}

// Função para limpar dados
function limparDados() {
    if (confirm('Tem certeza de que deseja limpar todos os dados?')) {
        localStorage.removeItem('planos');
        renderizarPlanos();
    }
}

// Função para controlar a visibilidade do paginador
function togglePaginatorVisibility() {
    const paginador = document.getElementById('paginador-planos');
    const planos = document.querySelectorAll('.plano-leitura');
    const ultimoPlano = planos[planos.length - 1]; // Último plano

    if (!ultimoPlano) {
        paginador.classList.remove('hidden'); // Mostra o paginador se não houver planos
        return;
    }

    const rect = ultimoPlano.getBoundingClientRect();
    const paginadorHeight = paginador.offsetHeight; // Altura do paginador
    const windowHeight = window.innerHeight; // Altura da janela

    // Se o final do último plano estiver visível (ou seja, próximo ao fundo da viewport),
    // esconda o paginador
    if (rect.bottom <= windowHeight && rect.bottom > windowHeight - paginadorHeight) {
        paginador.classList.add('hidden');
    } else {
        paginador.classList.remove('hidden');
    }
}

// Adiciona ouvintes para scroll, redimensionamento e eventos iniciais
document.addEventListener('DOMContentLoaded', () => {
    renderizarPlanos();

    // Eventos dos botões
    document.getElementById('novo-plano').addEventListener('click', () => {
        document.getElementById('cadastro-plano').style.display = 'block';
        document.getElementById('planos-leitura').style.display = 'none';
    });

    document.getElementById('inicio-cadastro').addEventListener('click', () => {
        document.getElementById('cadastro-plano').style.display = 'none';
        document.getElementById('planos-leitura').style.display = 'block';
    });

    document.getElementById('form-plano').addEventListener('submit', salvarPlano);
    document.getElementById('exportar-planos').addEventListener('click', exportarPlanos);
    document.getElementById('exportar-agenda').addEventListener('click', exportarAgenda);
    document.getElementById('limpar-dados').addEventListener('click', limparDados);

    // Controle de periodicidade
    document.getElementById('periodicidade').addEventListener('change', (e) => {
        document.getElementById('dias-semana-selecao').style.display = e.target.value === 'semanal' ? 'block' : 'none';
    });

    // Controle de definição de período
    document.querySelectorAll('input[name="definicao-periodo"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.getElementById('periodo-por-datas').style.display = e.target.value === 'datas' ? 'block' : 'none';
            document.getElementById('periodo-por-dias').style.display = e.target.value === 'dias' ? 'block' : 'none';
        });
    });

    // Adiciona ouvintes para scroll e redimensionamento
    window.addEventListener('scroll', togglePaginatorVisibility);
    window.addEventListener('resize', togglePaginatorVisibility);

    // Reexecuta a função sempre que os planos forem renderizados
    const originalRenderizarPlanos = renderizarPlanos;
    renderizarPlanos = function() {
        originalRenderizarPlanos();
        togglePaginatorVisibility();
    };
});
