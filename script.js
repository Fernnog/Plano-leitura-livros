--- START OF FILE script.js ---

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
    const exportarAgendaBtn = document.getElementById('exportar-agenda');
    const paginadorPlanosDiv = document.getElementById('paginador-planos');
    const inicioCadastroBtn = document.getElementById('inicio-cadastro');


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

    inicioCadastroBtn.addEventListener('click', () => {
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
+
     // Função para criar um plano de leitura
     function criarPlanoLeitura(titulo, paginaInicio, paginaFim, dataInicio, dataFim, periodicidade, diasSemana) {
         const totalPaginas = paginaFim - paginaInicio + 1;
@@ -265,6 +272,12 @@
         // Limpa o paginador e a lista de planos
         paginadorPlanosDiv.innerHTML = '';
         listaPlanos.innerHTML = planos.length === 0 ? '<p>Nenhum plano de leitura cadastrado ainda.</p>' : '';
+        // Reset paginator visibility before rendering new plans
+        const paginador = document.getElementById('paginador-planos');
+        if (paginador.classList.contains('hidden')) {
+            paginador.classList.remove('hidden');
+        }
+
 
         if (planos.length > 0) {
             const paginador = document.createElement('div');
@@ -299,6 +312,8 @@
             `;
             listaPlanos.appendChild(planoDiv);
         });
+
+        togglePaginatorVisibility(); // Call to set initial paginator visibility
     }
 
     // Verifica atrasos no plano
@@ -570,4 +585,41 @@
         a.click();
         URL.revokeObjectURL(url);
     }
+
+    function togglePaginatorVisibility() {
+        const paginador = document.getElementById('paginador-planos');
+        if (!paginador) return; // Exit if paginator element doesn't exist
+        const planos = document.querySelectorAll('.plano-leitura');
+        if (!planos || planos.length === 0) {
+            if (paginador.classList.contains('hidden')) {
+                paginador.classList.remove('hidden');
+            }
+            return; // No plans, ensure paginator is visible (or not hidden) and exit
+        }
+        const ultimoPlano = planos[planos.length - 1];
+        if (!ultimoPlano) return; // Exit if last plan element doesn't exist
+
+        const rect = ultimoPlano.getBoundingClientRect();
+        const paginadorHeight = paginador.offsetHeight;
+        const windowHeight = window.innerHeight;
+
+        if (rect.bottom <= windowHeight && rect.bottom > windowHeight - paginadorHeight) {
+            if (!paginador.classList.contains('hidden')) {
+                paginador.classList.add('hidden');
+            }
+        } else {
+            if (paginador.classList.contains('hidden')) {
+                paginador.classList.remove('hidden');
+            }
+        }
+    }
+
+    window.addEventListener('scroll', togglePaginatorVisibility);
+    window.addEventListener('resize', togglePaginatorVisibility);
+
+    const originalRenderizarPlanos = renderizarPlanos;
+    renderizarPlanos = function() {
+        originalRenderizarPlanos();
+        togglePaginatorVisibility();
+    };
 });
-