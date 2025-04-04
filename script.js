// script.js (Completo e Atualizado)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
    // Seleção de elementos do DOM (sem alterações aqui)
    const formPlano = document.getElementById('form-plano');
    const listaPlanos = document.getElementById('lista-planos');
    const periodicidadeSelect = document.getElementById('periodicidade');
    const diasSemanaSelecao = document.getElementById('dias-semana-selecao');
    const definirPorDatasRadio = document.getElementById('definir-por-datas');
    const definirPorDiasRadio = document.getElementById('definir-por-dias');
    const periodoPorDatasDiv = document.getElementById('periodo-por-datas');
    const periodoPorDiasDiv = document.getElementById('periodo-por-dias');
    const novoPlanoBtn = document.getElementById('novo-plano');
    const inicioBtn = document.getElementById('inicio');
    const cadastroPlanoSection = document.getElementById('cadastro-plano');
    const planosLeituraSection = document.getElementById('planos-leitura');
    const exportarAgendaBtn = document.getElementById('exportar-agenda');
    const paginadorPlanosDiv = document.getElementById('paginador-planos');
    const inicioCadastroBtn = document.getElementById('inicio-cadastro');
    const authFormDiv = document.getElementById('auth-form');
    const showAuthButton = document.getElementById('show-auth-button');
    const cancelAuthButton = document.getElementById('cancel-auth-button');
    const loginEmailButton = document.getElementById('login-email-button');
    const signupEmailButton = document.getElementById('signup-email-button');
    const emailLoginInput = document.getElementById('email-login');
    const passwordLoginInput = document.getElementById('password-login');
    const logoutButton = document.getElementById('logout-button');
    const syncFirebaseButton = document.getElementById('sync-firebase');
    const dataInicio = document.getElementById('data-inicio');
    const dataFim = document.getElementById('data-fim');
    const dataInicioDias = document.getElementById('data-inicio-dias');
    const numeroDias = document.getElementById('numero-dias');
    const linkDriveInput = document.getElementById('link-drive');
    const proximasLeiturasSection = document.getElementById('proximas-leituras-section');
    const listaProximasLeiturasDiv = document.getElementById('lista-proximas-leituras');
    const semProximasLeiturasP = document.getElementById('sem-proximas-leituras');

    let preventFormReset = false;

    // Configurações do Firebase (sem alterações aqui)
     const firebaseConfig = {
        apiKey: "AIzaSyCzLjQrE3KhneuwZZXIost5oghVjOTmZQE", // Substitua pela sua API Key real
        authDomain: "plano-leitura.firebaseapp.com",
        projectId: "plano-leitura",
        storageBucket: "plano-leitura.firebasestorage.app",
        messagingSenderId: "589137978493",
        appId: "1:589137978493:web:f7305bca602383fe14bd14"
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    let user = null;
    let planos = [];
    let planoEditandoIndex = -1;

    // Função para obter data atual normalizada (00:00:00)
    function getHojeNormalizado() {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        return hoje;
    }

    // --- *** NOVA FUNÇÃO: Determinar Status do Plano *** ---
    function determinarStatusPlano(plano) {
        if (!plano || !plano.diasPlano || !(plano.dataInicio instanceof Date) || !(plano.dataFim instanceof Date)) {
            return 'invalido'; // Status para dados incompletos (não será exibido, mas útil para depuração)
        }

        const hoje = getHojeNormalizado();
        const dataInicioPlano = new Date(plano.dataInicio);
        dataInicioPlano.setHours(0,0,0,0);
        const dataFimPlano = new Date(plano.dataFim);
        dataFimPlano.setHours(0,0,0,0);


        // 1. Verificar "Concluído" (Prioridade máxima)
        const todosLidos = plano.diasPlano.length > 0 && plano.diasPlano.every(dia => dia.lido);
        if (todosLidos) {
            return 'concluido';
        }

        // 2. Verificar "Próximo"
        if (dataInicioPlano > hoje) {
            return 'proximo';
        }

        // 3. Verificar "Atrasado"
        // (Verifica se existe algum dia passado não lido, DENTRO do período ou após o fim do plano se não concluído)
        const temAtraso = plano.diasPlano.some(dia => {
            if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                 const dataDiaNormalizada = new Date(dia.data);
                 dataDiaNormalizada.setHours(0, 0, 0, 0);
                 // É um dia passado (ou hoje) e não está lido?
                 return dataDiaNormalizada <= hoje && !dia.lido;
            }
            return false; // Dia inválido não conta como atraso
        });

        // Se data fim já passou e não está concluído, também considera atrasado
        const dataFimPassou = dataFimPlano < hoje;

        if (temAtraso || (dataFimPassou && !todosLidos) ) { // Se tem dia passado não lido OU data fim passou e não concluiu
             // Reconfirma se existe *realmente* um dia passado não lido antes de marcar atrasado
             const temDiaPassadoNaoLido = plano.diasPlano.some(dia => {
                if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                     const dataDiaNormalizada = new Date(dia.data);
                     dataDiaNormalizada.setHours(0, 0, 0, 0);
                     return dataDiaNormalizada < hoje && !dia.lido; // Atraso = dia ANTERIOR a hoje não lido
                }
                return false;
             });
             if (temDiaPassadoNaoLido) {
                return 'atrasado';
             }
        }


        // 4. Se não é Concluído, Próximo ou Atrasado, e está dentro do período -> "Em dia"
        if (hoje >= dataInicioPlano && hoje <= dataFimPlano) {
            return 'em_dia';
        }

        // 5. Se passou da data fim e *não* está atrasado (significa que os dias passados estão lidos)
        // mas também não está 'concluido' (faltam dias futuros?), é um estado estranho, mas podemos chamar de 'em_dia' ou 'finalizado_parcial'
        // Para simplificar, se chegou aqui, provavelmente é 'em_dia' (se hoje = dataFim e não tem atraso) ou já passou mas sem atraso pendente.
        // Vamos tratar como 'em_dia' se hoje for o último dia ou antes. Se passou e não concluiu nem atrasou, fica sem status explícito ou 'em_dia'?
        // A lógica de atraso já cobre "passou e não concluiu", então se chegou aqui e passou, algo está estranho.
        // Mantemos 'em_dia' como fallback se estiver dentro do período. Se passou e não caiu nos outros, pode retornar null ou string vazia.
        // Vamos retornar 'em_dia' como fallback mais seguro se não se encaixar nos outros e não for 'próximo'.
        // A lógica anterior já deve cobrir a maioria dos casos. Se passou data_fim e não está concluido nem atrasado, não deveria acontecer com a lógica atual.
        // Consideramos 'Em dia' se estiver dentro do período e sem atrasos.
         if (hoje >= dataInicioPlano && hoje <= dataFimPlano && !temAtraso) {
             return 'em_dia';
         }

         // Fallback: Se não se encaixa em nada (ex: data fim passou, mas todos dias passados lidos, mas dias futuros não?)
         // Poderia ser um estado "Finalizando"? Por ora, retornamos null ou uma string vazia para não exibir tag.
         // Ou retornamos 'em_dia' como padrão se não for próximo/atrasado/concluído?
         // A lógica de atraso cobre o "passou e não concluiu". Então, se está aqui, deve ser 'em_dia' (se dentro do prazo) ou nada.
         // Se hoje está dentro do intervalo [inicio, fim] E não tem atraso, é 'em_dia'.
         if (hoje >= dataInicioPlano && hoje <= dataFimPlano) {
             return 'em_dia';
         }


        // Caso não se encaixe em nenhum dos status claros (raro)
        // console.warn("Plano sem status definido:", plano);
        return ''; // Retorna string vazia para não gerar tag

    }
    // --- *** FIM da Nova Função *** ---


    // Função initApp (sem alterações)
    function initApp() {
        initAuth();
    }

    // Função initAuth (sem alterações)
    function initAuth() {
        onAuthStateChanged(auth, (currentUser) => {
            user = currentUser;
            console.log("Estado de Autenticação Mudou:", user ? user.uid : 'Nenhum usuário');
            if (user) {
                authFormDiv.style.display = 'none';
                showAuthButton.style.display = 'none';
                cancelAuthButton.style.display = 'none';
                logoutButton.style.display = 'block';
                syncFirebaseButton.style.display = 'none';
                carregarPlanosSalvos((planosCarregados) => {
                    planos = planosCarregados || [];
                    renderizarPlanos();
                });
            } else {
                authFormDiv.style.display = 'none';
                showAuthButton.style.display = 'block';
                cancelAuthButton.style.display = 'none';
                logoutButton.style.display = 'none';
                syncFirebaseButton.style.display = 'none';
                planos = [];
                renderizarPlanos();
            }
            atualizarVisibilidadeBotoesAcao();
        });
    }

    // Função atualizarVisibilidadeBotoesAcao (sem alterações)
    function atualizarVisibilidadeBotoesAcao() {
        const estaNaTelaCadastro = cadastroPlanoSection.style.display !== 'none';

        if (estaNaTelaCadastro) {
            novoPlanoBtn.style.display = 'none';
            inicioBtn.style.display = user ? 'block' : 'none'; // Só mostra início se logado
            exportarAgendaBtn.style.display = 'none';
            showAuthButton.style.display = 'none'; // Esconde login/cadastro na tela de cadastro
            logoutButton.style.display = 'none';
            proximasLeiturasSection.style.display = 'none'; // Esconde próximas leituras na tela de cadastro
        } else {
            novoPlanoBtn.style.display = user ? 'block' : 'none'; // Só mostra novo plano se logado
            inicioBtn.style.display = 'none';
            exportarAgendaBtn.style.display = user && planos.length > 0 ? 'block' : 'none'; // Só exporta se logado e com planos
            showAuthButton.style.display = user ? 'none' : 'block'; // Mostra se não logado
            logoutButton.style.display = user ? 'block' : 'none'; // Mostra se logado
            // Visibilidade da seção próximas leituras é controlada por renderizarProximasLeituras()
        }

        if (!user && showAuthButton.style.display === 'none' && !estaNaTelaCadastro) {
           // Manter como está
        } else if (!user && !estaNaTelaCadastro){
             authFormDiv.style.display = 'none';
             cancelAuthButton.style.display = 'none';
        } else if (user) {
             authFormDiv.style.display = 'none';
             cancelAuthButton.style.display = 'none';
        }
    }

    // Funções loginWithEmailPassword, signupWithEmailPassword, logout (sem alterações)
    function loginWithEmailPassword() {
        const email = emailLoginInput.value;
        const password = passwordLoginInput.value;

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                console.log('Login com email/senha bem-sucedido');
                emailLoginInput.value = '';
                passwordLoginInput.value = '';
            })
            .catch((error) => {
                console.error('Erro ao fazer login com email/senha:', error);
                alert('Erro ao fazer login: ' + error.message);
            });
    }
    function signupWithEmailPassword() {
        const email = emailLoginInput.value;
        const password = passwordLoginInput.value;

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                console.log('Cadastro com email/senha bem-sucedido:', userCredential.user);
                alert('Cadastro realizado com sucesso! Faça login.');
                emailLoginInput.value = '';
                passwordLoginInput.value = '';
                authFormDiv.style.display = 'none';
                showAuthButton.style.display = 'block';
                cancelAuthButton.style.display = 'none';
                logoutButton.style.display = 'none';
                 atualizarVisibilidadeBotoesAcao();
            })
            .catch((error) => {
                console.error('Erro ao fazer cadastro com email/senha:', error);
                alert('Erro ao cadastrar: ' + error.message);
            });
    }
    function logout() {
        console.log("Função logout() iniciada");
        signOut(auth)
            .then(() => {
                console.log('Logout bem-sucedido');
            })
            .catch((error) => {
                console.error('Erro ao fazer logout:', error);
                alert('Erro ao fazer logout. Tente novamente.');
            });
    }

    // Função carregarPlanosSalvos (sem alterações na lógica principal, apenas garantindo datas)
    async function carregarPlanosSalvos(callback) {
        if (!user) {
            console.log('Usuário não logado, retornando planos vazios.');
            if (callback) callback([]);
            return;
        }
        const userId = user.uid;
        const docRef = doc(db, 'users', userId);
        try {
            const docSnap = await getDoc(docRef);
            let planosDoFirestore = [];
            if (docSnap.exists()) {
                const data = docSnap.data();
                planosDoFirestore = data.planos || [];
                planosDoFirestore = planosDoFirestore.map(plano => {
                    // Tenta converter strings de data para Date objects
                    // Garante que as datas sejam válidas
                    const dataInicio = plano.dataInicio ? new Date(plano.dataInicio) : null;
                    const dataFim = plano.dataFim ? new Date(plano.dataFim) : null;

                    return {
                        ...plano,
                        linkDrive: plano.linkDrive || '',
                        dataInicio: (dataInicio && !isNaN(dataInicio)) ? dataInicio : null,
                        dataFim: (dataFim && !isNaN(dataFim)) ? dataFim : null,
                        diasPlano: plano.diasPlano ? plano.diasPlano.map(dia => ({
                            ...dia,
                            // Garante que a data do dia seja válida
                            data: (dia.data && !isNaN(new Date(dia.data))) ? new Date(dia.data) : null
                        })) : []
                    };
                }).filter(plano => plano.dataInicio && plano.dataFim); // Filtra planos com datas inválidas se necessário
            } else {
                console.log("Nenhum documento de usuário encontrado. Criando um novo.");
                await setDoc(docRef, { planos: [] });
            }
            console.log('Planos carregados do Firestore:', planosDoFirestore);
            if (callback) callback(planosDoFirestore);
        } catch (error) {
            console.error('Erro ao carregar planos do Firestore:', error);
            alert('Erro ao carregar planos. Verifique sua conexão e tente novamente.');
            if (callback) callback([]);
        }
    }

    // Função salvarPlanos (sem alterações)
    async function salvarPlanos(planosParaSalvar, callback) {
        if (!user) {
            console.error('Usuário não logado, não é possível salvar.');
            if (callback) callback(false);
            return;
        }
        const userId = user.uid;
        const docRef = doc(db, 'users', userId);
        const planosParaFirestore = planosParaSalvar.map(plano => {
            const linkDrive = typeof plano.linkDrive === 'string' ? plano.linkDrive : '';
            return {
                ...plano,
                linkDrive: linkDrive,
                dataInicio: plano.dataInicio instanceof Date ? plano.dataInicio.toISOString() : null,
                dataFim: plano.dataFim instanceof Date ? plano.dataFim.toISOString() : null,
                diasPlano: plano.diasPlano ? plano.diasPlano.map(dia => ({
                    ...dia,
                    data: dia.data instanceof Date ? dia.data.toISOString() : null
                })) : []
            };
        });
        try {
            await setDoc(docRef, { planos: planosParaFirestore });
            console.log('Planos salvos no Firestore com sucesso!');
            if (callback) callback(true);
        } catch (error) {
            console.error('Erro ao salvar planos no Firestore:', error);
            alert('Erro ao salvar planos. Verifique sua conexão e tente novamente.');
            if (callback) callback(false);
        }
    }

    // Função updateRequiredAttributes (sem alterações)
    function updateRequiredAttributes() {
        if (definirPorDatasRadio.checked) {
            dataInicio.required = true;
            dataFim.required = true;
            dataInicioDias.required = false;
            numeroDias.required = false;
        } else {
            dataInicio.required = false;
            dataFim.required = false;
            dataInicioDias.required = true;
            numeroDias.required = true;
        }
        linkDriveInput.required = false;
    }
    updateRequiredAttributes();

    // Função renderizarProximasLeituras (sem alterações)
    function renderizarProximasLeituras() {
        if (!user || !planos || planos.length === 0) {
            proximasLeiturasSection.style.display = 'none';
            return;
        }
        const hoje = getHojeNormalizado(); // Usa a função normalizada
        const todasLeiturasFuturas = [];
        planos.forEach((plano, planoIndex) => {
            // Apenas inclui leituras de planos que NÃO estão concluídos
            if (plano.diasPlano && plano.diasPlano.length > 0 && determinarStatusPlano(plano) !== 'concluido') {
                plano.diasPlano.forEach((dia, diaIndex) => {
                    if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                        const dataDiaNormalizada = new Date(dia.data);
                        dataDiaNormalizada.setHours(0,0,0,0);
                        // Inclui se for HOJE ou FUTURO e NÃO LIDO
                        if (dataDiaNormalizada >= hoje && !dia.lido)
                        {
                            todasLeiturasFuturas.push({
                                data: dia.data,
                                titulo: plano.titulo,
                                paginasTexto: `Pgs ${dia.paginaInicioDia}-${dia.paginaFimDia} (${dia.paginas})`,
                            });
                        }
                    }
                });
            }
        });
        todasLeiturasFuturas.sort((a, b) => a.data - b.data);
        const proximas3Leituras = todasLeiturasFuturas.slice(0, 3);
        listaProximasLeiturasDiv.innerHTML = '';
        if (proximas3Leituras.length > 0) {
            proximasLeiturasSection.style.display = 'block';
            semProximasLeiturasP.style.display = 'none';
            proximas3Leituras.forEach(leitura => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('proxima-leitura-item');
                const dataFormatada = leitura.data.toLocaleDateString('pt-BR', {
                    weekday: 'short', month: 'short', day: 'numeric'
                });
                itemDiv.innerHTML = `
                    <span class="proxima-leitura-data">${dataFormatada}</span>
                    <span class="proxima-leitura-titulo">${leitura.titulo}</span>
                    <span class="proxima-leitura-paginas">${leitura.paginasTexto}</span>
                `;
                listaProximasLeiturasDiv.appendChild(itemDiv);
            });
        } else {
            proximasLeiturasSection.style.display = 'block';
            semProximasLeiturasP.style.display = 'block';
        }
    }

    // *** FUNÇÃO ATUALIZADA: renderizarPlanos ***
    function renderizarPlanos() {
        paginadorPlanosDiv.innerHTML = '';
        listaPlanos.innerHTML = '';
        proximasLeiturasSection.style.display = 'none';

        if (!user) {
            listaPlanos.innerHTML = '<p>Faça login ou cadastre-se para gerenciar seus planos de leitura.</p>';
            atualizarVisibilidadeBotoesAcao();
            renderizarProximasLeituras();
            return;
        }

        if (planos.length === 0) {
            listaPlanos.innerHTML = '<p>Nenhum plano de leitura cadastrado ainda. Clique em "Novo" para começar!</p>';
            atualizarVisibilidadeBotoesAcao();
            togglePaginatorVisibility();
            renderizarProximasLeituras();
            return;
        }

        // Renderiza Paginador (se necessário)
        if (planos.length > 1) {
            planos.forEach((plano, index) => {
                const linkPaginador = document.createElement('a');
                linkPaginador.href = `#plano-${index}`;
                linkPaginador.textContent = index + 1;
                linkPaginador.title = plano.titulo;
                paginadorPlanosDiv.appendChild(linkPaginador);
            });
        }

        // Renderiza Planos
        planos.forEach((plano, index) => {
            const progressoPercentual = plano.totalPaginas > 0 ? (plano.paginasLidas / plano.totalPaginas) * 100 : 0;

            // --- *** INÍCIO: Cálculo e HTML da Tag de Status *** ---
            const status = determinarStatusPlano(plano);
            let statusText = '';
            let statusClass = '';
            switch (status) {
                case 'proximo':
                    statusText = 'Próximo';
                    statusClass = 'status-proximo';
                    break;
                case 'em_dia':
                    statusText = 'Em dia';
                    statusClass = 'status-em-dia';
                    break;
                case 'atrasado':
                    statusText = 'Atrasado';
                    statusClass = 'status-atrasado';
                    break;
                case 'concluido':
                    statusText = 'Concluído';
                    statusClass = 'status-concluido';
                    break;
                // Nenhuma tag para status vazio ou 'invalido'
            }
            const statusTagHTML = statusText ? `<span class="status-tag ${statusClass}">${statusText}</span>` : '';
            // --- *** FIM: Cálculo e HTML da Tag de Status *** ---

            // Exibe aviso de atraso APENAS se o status for 'atrasado'
            const diasAtrasados = (status === 'atrasado') ? verificarAtraso(plano) : 0;
            const avisoAtrasoHTML = (status === 'atrasado' && diasAtrasados > 0) ? `
                <div class="aviso-atraso" id="aviso-atraso-${index}">
                    <p>⚠️ Plano com atraso de ${diasAtrasados} dia(s)!</p>
                    <div class="acoes-dados">
                        <button onclick="mostrarOpcoesRecalculo(${index})">Recalcular Plano</button>
                    </div>
                </div>` : '';

            // HTML para o Link do Drive (sem alterações)
            let linkDriveHTML = '';
             if (plano.linkDrive) {
                 linkDriveHTML = `
                 <div class="link-drive-container">
                     <a href="${plano.linkDrive}" target="_blank" class="button-link-drive" title="Abrir documento de anotações">
                         <span class="material-symbols-outlined">open_in_new</span> Abrir Notas
                     </a>
                     <button onclick="editarLinkDrive(${index})" class="button-link-drive-edit" title="Editar link de anotações">
                         <span class="material-symbols-outlined">edit</span> Editar Link
                     </button>
                 </div>`;
             } else {
                 linkDriveHTML = `
                 <div class="link-drive-container">
                     <button onclick="editarLinkDrive(${index})" class="button-link-drive-add" title="Adicionar link de anotações">
                         <span class="material-symbols-outlined">add_link</span> Adicionar Link
                     </button>
                 </div>`;
             }


            const planoDiv = document.createElement('div');
            planoDiv.classList.add('plano-leitura');
            // Adiciona classe de status ao card principal para estilização adicional se necessário
            if (statusClass) {
                planoDiv.classList.add(statusClass.replace('status-','card-')); // ex: card-atrasado
            }
            planoDiv.id = `plano-${index}`;
            // ***** CORREÇÃO AQUI: Removidos os comentários {/**/} de dentro da string *****
            planoDiv.innerHTML = `
                <div class="plano-header">
                    <h3><span class="plano-numero">${index + 1}. </span>${plano.titulo}</h3>
                    ${statusTagHTML}
                    <div class="plano-acoes-principais">
                        <button class="acoes-dados button" onclick="editarPlano(${index})" title="Editar detalhes do plano">
                           <span class="material-symbols-outlined">edit_note</span> Editar
                        </button>
                        <button class="acoes-dados button" onclick="excluirPlano(${index})" title="Excluir este plano">
                            <span class="material-symbols-outlined">delete</span> Excluir
                        </button>
                    </div>
                </div>
                ${avisoAtrasoHTML}
                ${linkDriveHTML}
                <p>Páginas: ${plano.paginaInicio} - ${plano.paginaFim} (${plano.totalPaginas} pgs)</p>
                <div class="progresso-container" title="${progressoPercentual.toFixed(0)}% concluído">
                    <div class="barra-progresso" style="width: ${progressoPercentual}%"></div>
                </div>
                <p>${plano.paginasLidas} de ${plano.totalPaginas} páginas lidas (${progressoPercentual.toFixed(0)}%)</p>
                <details class="dias-leitura-details">
                    <summary>Ver/Marcar Dias de Leitura (${plano.diasPlano ? plano.diasPlano.length : 0} dias)</summary>
                    <div class="dias-leitura">${renderizarDiasLeitura(plano.diasPlano, index)}</div>
                </details>
            `;
            // ***** FIM DA CORREÇÃO *****
            listaPlanos.appendChild(planoDiv);
        });

        atualizarVisibilidadeBotoesAcao();
        togglePaginatorVisibility();
        renderizarProximasLeituras(); // Renderiza próximas leituras APÓS renderizar os planos
    }

    // Função verificarAtraso (sem alterações, calcula a contagem de dias)
    function verificarAtraso(plano) {
        const hoje = getHojeNormalizado();
        if (!plano || !plano.diasPlano || plano.diasPlano.length === 0) {
            return 0;
        }
        return plano.diasPlano.reduce((count, dia) => {
             if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                const dataDiaNormalizada = new Date(dia.data);
                dataDiaNormalizada.setHours(0, 0, 0, 0);
                // Conta se a data do dia é ANTERIOR a hoje E não foi lido
                if (dataDiaNormalizada < hoje && !dia.lido) {
                    return count + 1;
                }
            }
            return count;
        }, 0);
    }


    // Função renderizarDiasLeitura (sem alterações)
    function renderizarDiasLeitura(diasPlano, planoIndex) {
        if (!diasPlano || diasPlano.length === 0) {
            return '<p>Nenhum dia de leitura definido para este plano.</p>';
        }
        return diasPlano.map((dia, diaIndex) => {
            const dataFormatada = (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime()))
                ? dia.data.toLocaleDateString('pt-BR')
                : 'Data inválida';
            const alternadoClass = diaIndex % 2 === 0 ? 'alternado' : '';
            const lidoClass = dia.lido ? 'lido' : '';
            const idCheckbox = `dia-${planoIndex}-${diaIndex}`;
            return `<div class="dia-leitura ${alternadoClass} ${lidoClass}">
                        <input type="checkbox" id="${idCheckbox}" ${dia.lido ? 'checked' : ''} onchange="marcarDiaLido(${planoIndex}, ${diaIndex}, this.checked)" title="${dia.lido ? 'Desmarcar' : 'Marcar'} dia como lido">
                        <label for="${idCheckbox}">${dataFormatada} - Páginas ${dia.paginaInicioDia} a ${dia.paginaFimDia} (${dia.paginas} pgs)</label>
                    </div>`;
        }).join('');
    }


    // Função marcarDiaLido (sem alterações na lógica, mas salva e renderiza)
    window.marcarDiaLido = function(planoIndex, diaIndex, lido) {
        if (planos[planoIndex] && planos[planoIndex].diasPlano && planos[planoIndex].diasPlano[diaIndex]) {
            planos[planoIndex].diasPlano[diaIndex].lido = lido;
            atualizarPaginasLidas(planoIndex);
            salvarPlanos(planos, (salvoComSucesso) => {
                if (salvoComSucesso) {
                    console.log('Progresso salvo no Firebase.');
                } else {
                    console.error('Falha ao salvar progresso no Firebase.');
                }
                // Renderiza a UI para atualizar status, progresso, etc.
                renderizarPlanos();
            });
        } else {
            console.error("Índice de plano ou dia inválido para marcar como lido.");
        }
    };


    // Função atualizarPaginasLidas (sem alterações)
    function atualizarPaginasLidas(planoIndex) {
        if (planos[planoIndex] && planos[planoIndex].diasPlano) {
            planos[planoIndex].paginasLidas = planos[planoIndex].diasPlano.reduce((sum, dia) => {
                return sum + (dia.lido && typeof dia.paginas === 'number' && dia.paginas > 0 ? dia.paginas : 0);
            }, 0);
        } else {
            console.error("Plano inválido para atualizar páginas lidas.");
            if(planos[planoIndex]) planos[planoIndex].paginasLidas = 0;
        }
    }


    // Função editarPlano (sem alterações)
    window.editarPlano = function(index) {
        if (index < 0 || index >= planos.length) {
            console.error("Índice de plano inválido para edição:", index); return;
        }
        planoEditandoIndex = index;
        preventFormReset = true;
        cadastroPlanoSection.style.display = 'block';
        planosLeituraSection.style.display = 'none';
        atualizarVisibilidadeBotoesAcao();
        inicioCadastroBtn.style.display = 'block';
        preventFormReset = false;
        const plano = planos[index];
        document.getElementById('titulo-livro').value = plano.titulo || '';
        document.getElementById('link-drive').value = plano.linkDrive || '';
        document.getElementById('pagina-inicio').value = plano.paginaInicio || '';
        document.getElementById('pagina-fim').value = plano.paginaFim || '';
        if (plano.definicaoPeriodo === 'dias') {
            definirPorDiasRadio.checked = true;
            periodoPorDatasDiv.style.display = 'none';
            periodoPorDiasDiv.style.display = 'block';
            document.getElementById('data-inicio-dias').valueAsDate = plano.dataInicio instanceof Date ? plano.dataInicio : null;
            const numDias = plano.diasPlano ? plano.diasPlano.length : '';
            document.getElementById('numero-dias').value = numDias;
        } else {
            definirPorDatasRadio.checked = true;
            periodoPorDatasDiv.style.display = 'block';
            periodoPorDiasDiv.style.display = 'none';
            document.getElementById('data-inicio').valueAsDate = plano.dataInicio instanceof Date ? plano.dataInicio : null;
            document.getElementById('data-fim').valueAsDate = plano.dataFim instanceof Date ? plano.dataFim : null;
        }
        periodicidadeSelect.value = plano.periodicidade || 'diario';
        diasSemanaSelecao.style.display = periodicidadeSelect.value === 'semanal' ? 'block' : 'none';
        if (plano.periodicidade === 'semanal' && Array.isArray(plano.diasSemana)) {
            document.querySelectorAll('input[name="dia-semana"]').forEach(cb => {
                cb.checked = plano.diasSemana.includes(parseInt(cb.value));
            });
        } else {
             document.querySelectorAll('input[name="dia-semana"]').forEach(cb => cb.checked = false);
        }
        formPlano.querySelector('button[type="submit"]').textContent = 'Atualizar Plano';
        updateRequiredAttributes();
        cadastroPlanoSection.scrollIntoView({ behavior: 'smooth' });
    };

    // Função editarLinkDrive (sem alterações)
    window.editarLinkDrive = function(index) {
        if (index < 0 || index >= planos.length) {
            console.error("Índice de plano inválido para editar link:", index); return;
        }
        const plano = planos[index];
        const linkAtual = plano.linkDrive || '';
        const novoLink = prompt(`Editar Link de Anotações para "${plano.titulo}":\n(Deixe em branco para remover)`, linkAtual);
        if (novoLink !== null) {
            planos[index].linkDrive = novoLink.trim();
            salvarPlanos(planos, (salvoComSucesso) => {
                if (salvoComSucesso) {
                    console.log('Link atualizado e salvo no Firebase.');
                } else {
                    console.error('Falha ao salvar atualização do link no Firebase.');
                }
                renderizarPlanos();
            });
        }
    };

    // Funções mostrarOpcoesRecalculo, fecharAvisoRecalculo, solicitarNovaDataFim, solicitarPaginasPorDia (sem alterações)
    window.mostrarOpcoesRecalculo = function(index) {
        const avisoAtrasoDiv = document.getElementById(`aviso-atraso-${index}`);
        if (!avisoAtrasoDiv) return;
        avisoAtrasoDiv.innerHTML = `
            <p>⚠️ Plano atrasado. Como deseja recalcular?</p>
            <div class="acoes-dados recalculo-opcoes">
                <button onclick="solicitarNovaDataFim(${index})" title="Define uma nova data para terminar a leitura, recalculando as páginas por dia restante">Nova Data Fim</button>
                <button onclick="solicitarPaginasPorDia(${index})" title="Define quantas páginas ler por dia a partir de agora, recalculando a data de fim">Páginas/Dia</button>
                <button onclick="fecharAvisoRecalculo(${index})" title="Cancelar recálculo">Cancelar</button>
            </div>`;
    };
    window.fecharAvisoRecalculo = function(index) {
        const avisoAtrasoDiv = document.getElementById(`aviso-atraso-${index}`);
        if (!avisoAtrasoDiv) return;
        const plano = planos[index];
        const diasAtrasados = verificarAtraso(plano); // Recalcula dias
        // Volta para a mensagem original de atraso (só se ainda houver atraso)
        if(diasAtrasados > 0) {
            avisoAtrasoDiv.innerHTML = `
                <p>⚠️ Plano com atraso de ${diasAtrasados} dia(s)!</p>
                <div class="acoes-dados">
                    <button onclick="mostrarOpcoesRecalculo(${index})">Recalcular Plano</button>
                </div>`;
        } else {
            avisoAtrasoDiv.remove(); // Remove o aviso se não há mais atraso
        }
    };
    window.solicitarNovaDataFim = function(index) {
        const hojeStr = new Date().toISOString().split('T')[0];
        const novaDataFimInput = prompt(`Recalcular definindo Nova Data de Fim:\n\nDigite a nova data limite (YYYY-MM-DD, após ${hojeStr}):`);
        if (novaDataFimInput) {
            try {
                const novaDataFim = new Date(novaDataFimInput + 'T00:00:00');
                if (isNaN(novaDataFim.getTime())) {
                    alert("Data inválida. Use o formato YYYY-MM-DD."); mostrarOpcoesRecalculo(index); return;
                }
                const hoje = getHojeNormalizado();
                if (novaDataFim <= hoje) {
                     alert("A nova data de fim deve ser posterior à data de hoje."); mostrarOpcoesRecalculo(index); return;
                }
                recalcularPlanoNovaData(index, novaDataFim);
            } catch (e) {
                 alert("Erro ao processar a data. Use o formato YYYY-MM-DD."); mostrarOpcoesRecalculo(index);
            }
        } else {
             mostrarOpcoesRecalculo(index);
        }
    };
     window.solicitarPaginasPorDia = function(index) {
        const paginasPorDiaInput = prompt("Recalcular definindo Páginas por Dia:\n\nDigite o número de páginas que você quer ler por dia a partir de agora:");
        if (paginasPorDiaInput) {
            const paginasPorDia = parseInt(paginasPorDiaInput);
            if (isNaN(paginasPorDia) || paginasPorDia <= 0) {
                alert("Insira um número válido de páginas por dia (maior que zero)."); mostrarOpcoesRecalculo(index); return;
            }
             const plano = planos[index];
             const paginasRestantes = (plano.totalPaginas || 0) - (plano.paginasLidas || 0);
             if (paginasRestantes <= 0) {
                 alert("Não há páginas restantes para ler neste plano."); fecharAvisoRecalculo(index); return;
             }
            recalcularPlanoPaginasPorDia(index, paginasPorDia);
        } else {
             mostrarOpcoesRecalculo(index);
        }
    };


    // Função calcularNovaDataFimPorPaginasDia (sem alterações)
    function calcularNovaDataFimPorPaginasDia(plano, paginasPorDia) {
        const paginasRestantes = (plano.totalPaginas || 0) - (plano.paginasLidas || 0);
         if (paginasRestantes <= 0 || paginasPorDia <= 0) { return null; }
        let proximoDiaLeitura = getHojeNormalizado(); // Começa hoje normalizado
        const diasSemanaPlano = Array.isArray(plano.diasSemana) ? plano.diasSemana : [];
        const isDiaValido = (data) => {
             const diaSem = data.getDay();
             return plano.periodicidade === 'diario' || (plano.periodicidade === 'semanal' && diasSemanaPlano.includes(diaSem));
        };
         while (!isDiaValido(proximoDiaLeitura)) {
             proximoDiaLeitura.setDate(proximoDiaLeitura.getDate() + 1);
         }
        const diasLeituraNecessarios = Math.ceil(paginasRestantes / paginasPorDia);
        let dataFimCalculada = new Date(proximoDiaLeitura);
        let diasLeituraContados = 0;
        while(diasLeituraContados < diasLeituraNecessarios) {
             if (isDiaValido(dataFimCalculada)) { diasLeituraContados++; }
             if (diasLeituraContados < diasLeituraNecessarios) {
                 dataFimCalculada.setDate(dataFimCalculada.getDate() + 1);
             }
        }
        return dataFimCalculada;
    }

    // Função recalcularPlanoPaginasPorDia (sem alterações)
    window.recalcularPlanoPaginasPorDia = function(index, paginasPorDia) {
        const plano = planos[index];
        const novaDataFim = calcularNovaDataFimPorPaginasDia(plano, paginasPorDia);
        if (!novaDataFim) {
             alert("Não foi possível calcular a nova data de fim."); mostrarOpcoesRecalculo(index); return;
         }
        recalcularPlanoNovaData(index, novaDataFim);
    };

    // Função excluirPlano (sem alterações)
    window.excluirPlano = function(index) {
        if (index < 0 || index >= planos.length) {
            console.error("Índice inválido:", index); return;
        }
        const plano = planos[index];
        if (confirm(`Tem certeza que deseja excluir o plano "${plano.titulo}"?`)) {
            planos.splice(index, 1);
            salvarPlanos(planos, (salvoComSucesso) => {
                if (!salvoComSucesso) console.error('Falha ao salvar exclusão no Firebase.');
                renderizarPlanos();
            });
        }
    };

    // Função exportarAgendaBtn listener e exportarParaAgenda (sem alterações)
    exportarAgendaBtn.addEventListener('click', () => {
        if (!user || planos.length === 0) {
            alert("Você precisa estar logado e ter planos cadastrados para exportar."); return;
        }
        let promptMessage = "Digite o número do plano para exportar:\n\n";
        planos.forEach((plano, index) => { promptMessage += `${index + 1}. ${plano.titulo}\n`; });
        const planoIndexInput = prompt(promptMessage);
        if (planoIndexInput === null) { return; }
        const planoIndex = parseInt(planoIndexInput) - 1;
        if (isNaN(planoIndex) || planoIndex < 0 || planoIndex >= planos.length) {
            alert("Número de plano inválido."); return;
        }
        if (!planos[planoIndex].diasPlano || planos[planoIndex].diasPlano.length === 0) {
             alert(`O plano "${planos[planoIndex].titulo}" não possui dias definidos.`); return;
         }
        exportarParaAgenda(planos[planoIndex]);
    });
    function exportarParaAgenda(plano) {
        const horarioInicio = prompt(`Exportar "${plano.titulo}":\n\nHorário início (HH:MM):`, "09:00");
        if (!horarioInicio) return;
        const horarioFim = prompt(`Horário fim (HH:MM):`, "09:30");
        if (!horarioFim) return;
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(horarioInicio) || !timeRegex.test(horarioFim)) {
            alert("Formato de horário inválido. Use HH:MM."); return;
        }
        try {
            const eventosICS = gerarICS(plano, horarioInicio, horarioFim);
            downloadICSFile(eventosICS, plano.titulo);
        } catch (error) {
             console.error("Erro ao gerar ICS:", error);
             alert("Erro ao gerar arquivo da agenda.");
        }
    }

    // Função gerarICS (sem alterações)
    function gerarICS(plano, horarioInicio, horarioFim) {
         if (!plano || !plano.diasPlano || plano.diasPlano.length === 0 || !plano.dataInicio || !plano.dataFim || !(plano.dataInicio instanceof Date) || !(plano.dataFim instanceof Date)) {
            throw new Error("Dados do plano incompletos ou inválidos.");
        }
        if (!plano.id) plano.id = crypto.randomUUID();
        const uidEvento = `${plano.id}@gerenciador-planos-leitura`;
        const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split('.')[0] + "Z";
        const formatICSDate = (date, time) => {
            const [year, month, day] = [date.getFullYear(), (date.getMonth() + 1).toString().padStart(2, '0'), date.getDate().toString().padStart(2, '0')];
            const [hour, minute] = time.split(':');
            return `${year}${month}${day}T${hour}${minute}00`;
        };
         const formatICSDateUTC = (date) => {
            const year = date.getUTCFullYear();
            const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
            const day = date.getUTCDate().toString().padStart(2, '0');
            return `${year}${month}${day}T235959Z`;
        };
        let icsString = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//GerenciadorPlanosLeitura//PT\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n`;
        // Encontra o primeiro dia de leitura válido para DTSTART
        let primeiroDiaLeituraValido = null;
        for(const dia of plano.diasPlano) {
             if (dia.data instanceof Date && !isNaN(dia.data)) {
                 primeiroDiaLeituraValido = dia.data;
                 break;
             }
        }
        if(!primeiroDiaLeituraValido) throw new Error("Nenhum dia de leitura válido encontrado no plano.");

        icsString += `BEGIN:VEVENT\r\nUID:${uidEvento}\r\nDTSTAMP:${dtstamp}\r\n`;
        // Usar um Timezone válido ou remover TZID para horário flutuante
        icsString += `DTSTART:${formatICSDate(primeiroDiaLeituraValido, horarioInicio)}\r\n`;
        icsString += `DTEND:${formatICSDate(primeiroDiaLeituraValido, horarioFim)}\r\n`;
        let rrule = 'RRULE:FREQ=';
        if (plano.periodicidade === 'diario') {
            rrule += 'DAILY';
        } else if (plano.periodicidade === 'semanal' && Array.isArray(plano.diasSemana) && plano.diasSemana.length > 0) {
            rrule += 'WEEKLY;BYDAY=';
            const diasSemanaICS = plano.diasSemana.map(diaIndex => ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][diaIndex]).join(',');
            rrule += diasSemanaICS;
        } else {
             console.warn("Periodicidade inválida para RRULE. Usando DAILY como fallback.");
             rrule += 'DAILY';
        }
         const dataFimParaUntil = new Date(plano.dataFim);
         rrule += `;UNTIL=${formatICSDateUTC(dataFimParaUntil)}`;
         icsString += `${rrule}\r\n`;
        let description = `Plano: ${plano.titulo}.\\nPáginas: ${plano.paginaInicio}-${plano.paginaFim}.\\nPeríodo: ${plano.dataInicio.toLocaleDateString('pt-BR')} a ${plano.dataFim.toLocaleDateString('pt-BR')}.\\nVer app p/ detalhes diários.\\nApp: https://fernnog.github.io/Plano-leitura-livros/`;
        icsString += `SUMMARY:Leitura: ${plano.titulo}\r\n`;
        icsString += `DESCRIPTION:${description.replace(/\n/g, '\\n')}\r\n`; // Escapa novas linhas
        icsString += `LOCATION:Local de Leitura\r\nSTATUS:CONFIRMED\r\nTRANSP:OPAQUE\r\n`;
        icsString += `BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:Lembrete: ${plano.titulo}\r\nTRIGGER:-PT15M\r\nEND:VALARM\r\n`;
        icsString += `END:VEVENT\r\nEND:VCALENDAR\r\n`;
        return icsString;
    }


    // Função downloadICSFile (sem alterações)
    function downloadICSFile(icsContent, planoTitulo) {
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const nomeArquivo = `Plano_Leitura_${planoTitulo.replace(/[^a-z0-9]/gi, '_')}.ics`;
        a.download = nomeArquivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Função togglePaginatorVisibility (sem alterações)
    function togglePaginatorVisibility() {
        const paginador = document.getElementById('paginador-planos');
        if (!paginador) return;
        const lista = document.getElementById('lista-planos');
        if (!lista || planos.length <= 1) {
            paginador.classList.add('hidden');
            return;
        }
        const footer = document.querySelector('footer');
        const listaRect = lista.getBoundingClientRect();
        const footerRect = footer.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        if (listaRect.bottom > footerRect.top || footerRect.top > windowHeight) {
            paginador.classList.remove('hidden');
         } else {
            paginador.classList.add('hidden');
         }
    }
    window.addEventListener('scroll', togglePaginatorVisibility);
    window.addEventListener('resize', togglePaginatorVisibility);

    // Função distribuirPaginasPlano (sem alterações)
    function distribuirPaginasPlano(plano) {
        if (!plano || !plano.diasPlano || plano.diasPlano.length === 0 || !plano.paginaInicio || !plano.paginaFim) {
            console.warn("Dados insuficientes para distribuir páginas:", plano); return;
        }
        const totalPaginas = (plano.paginaFim - plano.paginaInicio + 1);
        const diasDeLeitura = plano.diasPlano;
        const numeroDeDias = diasDeLeitura.length;
        if (totalPaginas <= 0) {
             console.warn("Total de páginas inválido (<= 0).", plano);
             diasDeLeitura.forEach(dia => {
                 dia.paginaInicioDia = plano.paginaInicio; dia.paginaFimDia = plano.paginaInicio -1; dia.paginas = 0; dia.lido = false;
             });
             plano.paginasLidas = 0; plano.totalPaginas = 0; return;
        }
        plano.totalPaginas = totalPaginas;
        const paginasPorDiaBase = Math.floor(totalPaginas / numeroDeDias);
        const paginasRestantes = totalPaginas % numeroDeDias;
        let paginaAtual = plano.paginaInicio;
        let diasLidosOriginalmente = {};
        diasDeLeitura.forEach((dia, index) => {
            diasLidosOriginalmente[index] = dia.lido; dia.lido = false;
         });
        diasDeLeitura.forEach((dia, index) => {
            let paginasNesteDia = paginasPorDiaBase + (index < paginasRestantes ? 1 : 0);
            dia.paginaInicioDia = paginaAtual;
            dia.paginaFimDia = paginaAtual + paginasNesteDia - 1;
            dia.paginas = paginasNesteDia;
             if (diasLidosOriginalmente[index]) { dia.lido = true; } else { dia.lido = false; }
            paginaAtual = dia.paginaFimDia + 1;
        });
        if (diasDeLeitura.length > 0) {
            const ultimoDia = diasDeLeitura[numeroDeDias - 1];
             if (ultimoDia.paginaFimDia !== plano.paginaFim) {
                console.warn(`Ajustando pag fim do último dia de ${ultimoDia.paginaFimDia} para ${plano.paginaFim}`)
                 ultimoDia.paginaFimDia = plano.paginaFim;
                 ultimoDia.paginas = Math.max(0, ultimoDia.paginaFimDia - ultimoDia.paginaInicioDia + 1);
             }
        }
        atualizarPaginasLidas(planos.indexOf(plano));
    }


    // Função recalcularPlanoNovaData (sem alterações)
    function recalcularPlanoNovaData(index, novaDataFim) {
        const planoOriginal = planos[index];
        const paginasLidas = planoOriginal.paginasLidas || 0;
        const paginaInicioRecalculo = (planoOriginal.paginaInicio || 1) + paginasLidas;
        const paginasRestantes = (planoOriginal.totalPaginas || 0) - paginasLidas;
        if (paginasRestantes <= 0) {
            alert("Todas as páginas já foram lidas."); fecharAvisoRecalculo(index); return;
        }
        let dataInicioRecalculo = getHojeNormalizado();
        const diasSemanaPlano = Array.isArray(planoOriginal.diasSemana) ? planoOriginal.diasSemana : [];
        const isDiaValido = (data) => {
             const diaSem = data.getDay();
             return planoOriginal.periodicidade === 'diario' || (planoOriginal.periodicidade === 'semanal' && diasSemanaPlano.includes(diaSem));
         };
         while (!isDiaValido(dataInicioRecalculo)) {
             dataInicioRecalculo.setDate(dataInicioRecalculo.getDate() + 1);
         }
         if (novaDataFim < dataInicioRecalculo) {
             alert("Nova data fim deve ser >= " + dataInicioRecalculo.toLocaleDateString('pt-BR') + "."); mostrarOpcoesRecalculo(index); return;
         }
        const novosDiasLeitura = [];
        let dataAtual = new Date(dataInicioRecalculo);
        while (dataAtual <= novaDataFim) {
            if (isDiaValido(dataAtual)) {
                novosDiasLeitura.push({ data: new Date(dataAtual), paginaInicioDia: 0, paginaFimDia: 0, paginas: 0, lido: false });
            }
            dataAtual.setDate(dataAtual.getDate() + 1);
        }
        if (novosDiasLeitura.length === 0) {
            alert("Não há dias de leitura válidos entre "+ dataInicioRecalculo.toLocaleDateString('pt-BR') +" e "+ novaDataFim.toLocaleDateString('pt-BR') +"."); mostrarOpcoesRecalculo(index); return;
        }
        const numNovosDias = novosDiasLeitura.length;
        const paginasPorDiaBase = Math.floor(paginasRestantes / numNovosDias);
        const paginasExtras = paginasRestantes % numNovosDias;
        let paginaAtualRecalculo = paginaInicioRecalculo;
        novosDiasLeitura.forEach((dia, idx) => {
            let paginasNesteDia = paginasPorDiaBase + (idx < paginasExtras ? 1 : 0);
            dia.paginaInicioDia = paginaAtualRecalculo;
            dia.paginaFimDia = paginaAtualRecalculo + paginasNesteDia - 1;
            dia.paginas = paginasNesteDia;
            paginaAtualRecalculo = dia.paginaFimDia + 1;
        });
         const ultimoDiaNovo = novosDiasLeitura[numNovosDias - 1];
         if (ultimoDiaNovo.paginaFimDia !== planoOriginal.paginaFim) {
            console.warn(`Ajustando pág final recalculada de ${ultimoDiaNovo.paginaFimDia} para ${planoOriginal.paginaFim}`);
             ultimoDiaNovo.paginaFimDia = planoOriginal.paginaFim;
             ultimoDiaNovo.paginas = Math.max(0, ultimoDiaNovo.paginaFimDia - ultimoDiaNovo.paginaInicioDia + 1);
         }
        const diasLidosOriginais = planoOriginal.diasPlano.filter(dia => dia.lido);
        planos[index].diasPlano = [...diasLidosOriginais, ...novosDiasLeitura].sort((a, b) => a.data - b.data); // Ordena por data
        planos[index].dataFim = novaDataFim;
        atualizarPaginasLidas(index);
        salvarPlanos(planos, (salvoComSucesso) => {
            renderizarPlanos();
        });
    }

    // Funções geradoras de dias (gerarDiasPlanoPorDatas, gerarDiasPlanoPorDias, calcularDataFimReal) (sem alterações)
    function gerarDiasPlanoPorDatas(dataInicio, dataFim, periodicidade, diasSemana) {
        const dias = [];
        if (!(dataInicio instanceof Date) || !(dataFim instanceof Date) || isNaN(dataInicio) || isNaN(dataFim) || dataFim < dataInicio) {
            console.error("Datas inválidas para gerar dias:", dataInicio, dataFim); return dias;
        }
        let dataAtual = new Date(dataInicio); dataAtual.setHours(0, 0, 0, 0);
        const dataFimNormalizada = new Date(dataFim); dataFimNormalizada.setHours(0, 0, 0, 0);
        while (dataAtual <= dataFimNormalizada) {
            const diaSemanaAtual = dataAtual.getDay();
            if (periodicidade === 'diario' || (periodicidade === 'semanal' && Array.isArray(diasSemana) && diasSemana.includes(diaSemanaAtual))) {
                dias.push({ data: new Date(dataAtual), paginaInicioDia: 0, paginaFimDia: 0, paginas: 0, lido: false });
            }
            dataAtual.setDate(dataAtual.getDate() + 1);
        }
        return dias;
    }
    function gerarDiasPlanoPorDias(dataInicio, numeroDias, periodicidade, diasSemana) {
        const dias = [];
         if (!(dataInicio instanceof Date) || isNaN(dataInicio) || typeof numeroDias !== 'number' || numeroDias <= 0) {
             console.error("Dados inválidos para gerar dias por número:", dataInicio, numeroDias); return dias;
         }
        let dataAtual = new Date(dataInicio); dataAtual.setHours(0, 0, 0, 0);
        let diasAdicionados = 0;
        let safetyCounter = 0; // Safety break
        while (diasAdicionados < numeroDias && safetyCounter < (numeroDias * 10 + 365)) { // Limit loop
            const diaSemanaAtual = dataAtual.getDay();
            if (periodicidade === 'diario' || (periodicidade === 'semanal' && Array.isArray(diasSemana) && diasSemana.includes(diaSemanaAtual))) {
                dias.push({ data: new Date(dataAtual), paginaInicioDia: 0, paginaFimDia: 0, paginas: 0, lido: false });
                diasAdicionados++;
            }
            dataAtual.setDate(dataAtual.getDate() + 1);
            safetyCounter++;
             if (safetyCounter >= (numeroDias * 10 + 365)) {
                 console.error("Loop infinito provável em gerarDiasPlanoPorDias. Interrompido.");
                 break; // Sai do loop
             }
        }
        return dias;
    }
    function calcularDataFimReal(dataInicio, numeroDias, periodicidade, diasSemana) {
         if (!(dataInicio instanceof Date) || isNaN(dataInicio) || typeof numeroDias !== 'number' || numeroDias <= 0) {
             console.error("Dados inválidos para calcular data fim real:", dataInicio, numeroDias); return null;
         }
        let dataAtual = new Date(dataInicio); dataAtual.setHours(0, 0, 0, 0);
        let diasContados = 0;
        let dataFim = null; // Inicializa como null
        let safetyCounter = 0;
        while (diasContados < numeroDias && safetyCounter < (numeroDias * 10 + 365)) {
            const diaSemanaAtual = dataAtual.getDay();
            if (periodicidade === 'diario' || (periodicidade === 'semanal' && Array.isArray(diasSemana) && diasSemana.includes(diaSemanaAtual))) {
                diasContados++;
                 if (diasContados === numeroDias) {
                     dataFim = new Date(dataAtual); // Define a data fim no último dia válido encontrado
                 }
            }
             if (diasContados < numeroDias) { dataAtual.setDate(dataAtual.getDate() + 1); }
             safetyCounter++;
              if (safetyCounter >= (numeroDias * 10 + 365)) {
                 console.error("Loop infinito provável em calcularDataFimReal. Interrompido.");
                 return null; // Retorna null em caso de problema
             }
        }
        return dataFim; // Retorna a data do último dia ou null se não encontrou
    }


    // --- Listeners de Eventos da Interface (sem alterações significativas) ---

    // Botões de Autenticação
    showAuthButton.addEventListener('click', () => {
        authFormDiv.style.display = 'block'; showAuthButton.style.display = 'none'; cancelAuthButton.style.display = 'block'; logoutButton.style.display = 'none'; emailLoginInput.focus(); atualizarVisibilidadeBotoesAcao();
    });
    cancelAuthButton.addEventListener('click', () => {
        authFormDiv.style.display = 'none'; showAuthButton.style.display = 'block'; cancelAuthButton.style.display = 'none'; atualizarVisibilidadeBotoesAcao();
    });
    loginEmailButton.addEventListener('click', loginWithEmailPassword);
    signupEmailButton.addEventListener('click', signupWithEmailPassword);
    logoutButton.addEventListener('click', logout);

    // Botões de Navegação Principal
    novoPlanoBtn.addEventListener('click', function() {
        if (!user) { alert("Faça login ou cadastre-se para criar um novo plano."); showAuthButton.click(); return; }
        cadastroPlanoSection.style.display = 'block'; planosLeituraSection.style.display = 'none'; inicioCadastroBtn.style.display = 'block'; proximasLeiturasSection.style.display = 'none';
        if (!preventFormReset) {
            formPlano.reset(); planoEditandoIndex = -1; formPlano.querySelector('button[type="submit"]').textContent = 'Salvar Plano';
             definirPorDatasRadio.checked = true; periodoPorDatasDiv.style.display = 'block'; periodoPorDiasDiv.style.display = 'none'; periodicidadeSelect.value = 'diario'; diasSemanaSelecao.style.display = 'none';
             document.querySelectorAll('input[name="dia-semana"]').forEach(cb => cb.checked = false);
        }
        updateRequiredAttributes(); atualizarVisibilidadeBotoesAcao(); document.getElementById('titulo-livro').focus();
    });
    inicioBtn.addEventListener('click', function() {
        planosLeituraSection.style.display = 'block'; cadastroPlanoSection.style.display = 'none'; inicioCadastroBtn.style.display = 'none'; planoEditandoIndex = -1; formPlano.querySelector('button[type="submit"]').textContent = 'Salvar Plano'; atualizarVisibilidadeBotoesAcao();
        renderizarPlanos(); // Renderiza ao voltar para o início
    });
     inicioCadastroBtn.addEventListener('click', function() { inicioBtn.click(); });

    // Controles do Formulário
    definirPorDatasRadio.addEventListener('change', function() {
        if (this.checked) { periodoPorDatasDiv.style.display = 'block'; periodoPorDiasDiv.style.display = 'none'; updateRequiredAttributes(); }
    });
    definirPorDiasRadio.addEventListener('change', function() {
        if (this.checked) { periodoPorDatasDiv.style.display = 'none'; periodoPorDiasDiv.style.display = 'block'; updateRequiredAttributes(); }
    });
    periodicidadeSelect.addEventListener('change', function() {
        diasSemanaSelecao.style.display = this.value === 'semanal' ? 'block' : 'none';
        if (this.value === 'diario') { document.querySelectorAll('input[name="dia-semana"]').forEach(cb => cb.checked = false); }
    });

    // Submissão do formulário
    formPlano.addEventListener('submit', function(event) {
        event.preventDefault();
        if (!user) { alert("Erro: Usuário não logado."); return; }

        const titulo = document.getElementById('titulo-livro').value.trim();
        const paginaInicio = parseInt(document.getElementById('pagina-inicio').value);
        const paginaFim = parseInt(document.getElementById('pagina-fim').value);
        const linkDrive = document.getElementById('link-drive').value.trim();
        const definicaoPeriodo = document.querySelector('input[name="definicao-periodo"]:checked').value;
        const periodicidade = periodicidadeSelect.value;

        if (!titulo) { alert('Título obrigatório.'); return; }
        if (isNaN(paginaInicio) || paginaInicio < 1) { alert('Página início inválida.'); return; }
        if (isNaN(paginaFim) || paginaFim < paginaInicio) { alert('Página fim inválida.'); return; }

        let dataInicio, dataFim, numeroDiasInput;
        let diasPlano = [];
        let diasSemana = [];
         if (periodicidade === 'semanal') {
             document.querySelectorAll('input[name="dia-semana"]:checked').forEach(cb => { diasSemana.push(parseInt(cb.value)); });
             if (diasSemana.length === 0) { alert('Selecione dias da semana para periodicidade semanal.'); return; }
         }

        if (definicaoPeriodo === 'datas') {
            const dataInicioInput = document.getElementById('data-inicio').value;
            const dataFimInput = document.getElementById('data-fim').value;
            if (!dataInicioInput || !dataFimInput) { alert('Datas de início e fim obrigatórias.'); return; }
            dataInicio = new Date(dataInicioInput + 'T00:00:00');
            dataFim = new Date(dataFimInput + 'T00:00:00');
            if (isNaN(dataInicio) || isNaN(dataFim)) { alert('Formato de data inválido.'); return; }
            if (dataFim < dataInicio) { alert('Data fim anterior à data início.'); return; }
            diasPlano = gerarDiasPlanoPorDatas(dataInicio, dataFim, periodicidade, diasSemana);
        } else {
            const dataInicioDiasInput = document.getElementById('data-inicio-dias').value;
            numeroDiasInput = parseInt(document.getElementById('numero-dias').value);
            if (!dataInicioDiasInput) { alert('Data de início obrigatória.'); return; }
            if (isNaN(numeroDiasInput) || numeroDiasInput < 1) { alert('Número de dias inválido.'); return; }
            dataInicio = new Date(dataInicioDiasInput + 'T00:00:00');
             if (isNaN(dataInicio)) { alert('Formato data início inválido.'); return; }
            diasPlano = gerarDiasPlanoPorDias(dataInicio, numeroDiasInput, periodicidade, diasSemana);
             // Calcula a data de fim real com base nos dias gerados
             if (diasPlano.length > 0) {
                dataFim = diasPlano[diasPlano.length - 1].data; // Data do último dia gerado
             } else {
                 alert("Não foi possível gerar dias de leitura com os parâmetros. Verifique N° de dias e periodicidade."); return;
             }
             // A data fim precisa ser um objeto Date válido para salvar
             if (!dataFim || !(dataFim instanceof Date) || isNaN(dataFim)) {
                 console.error("Data fim calculada inválida:", dataFim);
                 alert("Erro ao calcular data final. Verifique os parâmetros.");
                 return;
             }
        }

        if (diasPlano.length === 0) {
            alert("Nenhum dia de leitura gerado. Verifique datas e periodicidade."); return;
        }

        const planoData = {
            id: planoEditandoIndex !== -1 ? planos[planoEditandoIndex].id : crypto.randomUUID(),
            titulo: titulo, linkDrive: linkDrive, paginaInicio: paginaInicio, paginaFim: paginaFim,
            totalPaginas: paginaFim - paginaInicio + 1, definicaoPeriodo: definicaoPeriodo,
            dataInicio: dataInicio, dataFim: dataFim, periodicidade: periodicidade,
            diasSemana: diasSemana, diasPlano: diasPlano, paginasLidas: 0
        };

        if (planoEditandoIndex !== -1) {
             const diasLidosAntigosMap = new Map();
             planos[planoEditandoIndex].diasPlano.forEach(diaAntigo => {
                 if (diaAntigo.lido && diaAntigo.data instanceof Date) { diasLidosAntigosMap.set(diaAntigo.data.toISOString().split('T')[0], true); }
             });
             planoData.diasPlano.forEach(diaNovo => {
                 if (diaNovo.data instanceof Date) {
                     const dataStr = diaNovo.data.toISOString().split('T')[0];
                     if (diasLidosAntigosMap.has(dataStr)) { diaNovo.lido = true; }
                 }
             });
             // Recalcula paginas lidas após potencial restauração
             planoData.paginasLidas = planoData.diasPlano.reduce((sum, dia) => sum + (dia.lido && typeof dia.paginas === 'number' ? dia.paginas : 0), 0);
        }

        distribuirPaginasPlano(planoData); // Distribui páginas após criar/atualizar dados base

        if (planoEditandoIndex !== -1) {
            planos[planoEditandoIndex] = planoData;
        } else {
            planos.unshift(planoData);
        }

        salvarPlanos(planos, (salvoComSucesso) => {
            if (salvoComSucesso) {
                console.log(`Plano ${planoEditandoIndex !== -1 ? 'atualizado' : 'salvo'}.`);
                planoEditandoIndex = -1;
                formPlano.querySelector('button[type="submit"]').textContent = 'Salvar Plano';
            } else {
                alert("Houve um erro ao salvar. Tente novamente.");
            }
             inicioBtn.click(); // Volta para a listagem (que vai chamar renderizarPlanos)
        });
    });

    // --- Inicialização ---
    initApp();

}); // Fim do DOMContentLoaded
