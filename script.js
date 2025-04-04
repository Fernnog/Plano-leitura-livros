import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

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
    const novoPlanoBtn = document.getElementById('novo-plano');
    const inicioBtn = document.getElementById('inicio');
    const cadastroPlanoSection = document.getElementById('cadastro-plano');
    const planosLeituraSection = document.getElementById('planos-leitura');
    const exportarAgendaBtn = document.getElementById('exportar-agenda');
    const paginadorPlanosDiv = document.getElementById('paginador-planos');
    const inicioCadastroBtn = document.getElementById('inicio-cadastro');
    // Elementos de autenticação
    const authFormDiv = document.getElementById('auth-form');
    const showAuthButton = document.getElementById('show-auth-button');
    const cancelAuthButton = document.getElementById('cancel-auth-button');
    const loginEmailButton = document.getElementById('login-email-button');
    const signupEmailButton = document.getElementById('signup-email-button');
    const emailLoginInput = document.getElementById('email-login');
    const passwordLoginInput = document.getElementById('password-login');
    const logoutButton = document.getElementById('logout-button');
    const syncFirebaseButton = document.getElementById('sync-firebase');

    // Seleção dos campos de data para gerenciar o atributo required
    const dataInicio = document.getElementById('data-inicio');
    const dataFim = document.getElementById('data-fim');
    const dataInicioDias = document.getElementById('data-inicio-dias');
    const numeroDias = document.getElementById('numero-dias');

    // NOVO: Seleção do campo de link
    const linkDriveInput = document.getElementById('link-drive');

    // *** NOVO: Seleção elementos Próximas Leituras ***
    const proximasLeiturasSection = document.getElementById('proximas-leituras-section');
    const listaProximasLeiturasDiv = document.getElementById('lista-proximas-leituras');
    const semProximasLeiturasP = document.getElementById('sem-proximas-leituras');

    // Variável de controle para impedir o reset do formulário durante a edição
    let preventFormReset = false;

    // Configurações do Firebase (Mantenha as suas credenciais aqui)
    const firebaseConfig = {
        apiKey: "AIzaSyCzLjQrE3KhneuwZZXIost5oghVjOTmZQE", // Substitua pela sua API Key real
        authDomain: "plano-leitura.firebaseapp.com",
        projectId: "plano-leitura",
        storageBucket: "plano-leitura.firebasestorage.app",
        messagingSenderId: "589137978493",
        appId: "1:589137978493:web:f7305bca602383fe14bd14"
    };

    // Inicializar o Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Variáveis globais
    let user = null;
    let planos = [];
    let planoEditandoIndex = -1;

    // Função para inicializar a aplicação
    function initApp() {
        initAuth();
        // Carregamento inicial de planos agora depende do estado de auth
    }

    // Função para inicializar a autenticação
    function initAuth() {
        onAuthStateChanged(auth, (currentUser) => {
            user = currentUser;
            console.log("Estado de Autenticação Mudou:", user ? user.uid : 'Nenhum usuário');
            if (user) {
                // Usuário está logado
                authFormDiv.style.display = 'none';
                showAuthButton.style.display = 'none';
                cancelAuthButton.style.display = 'none';
                logoutButton.style.display = 'block';
                syncFirebaseButton.style.display = 'none'; // Ou 'block' se a sincronização for manual
                carregarPlanosSalvos((planosCarregados) => {
                    planos = planosCarregados || [];
                    renderizarPlanos(); // Renderiza planos e próximas leituras
                });
            } else {
                // Usuário não está logado
                authFormDiv.style.display = 'none';
                showAuthButton.style.display = 'block';
                cancelAuthButton.style.display = 'none';
                logoutButton.style.display = 'none';
                syncFirebaseButton.style.display = 'none';
                planos = []; // Limpar planos locais se não estiver logado
                renderizarPlanos(); // Renderizar a lista vazia ou com mensagem e esconder próximas leituras
            }
            // Atualizar visibilidade dos botões de ação principal
            atualizarVisibilidadeBotoesAcao();
        });
    }

    // Função para atualizar a visibilidade dos botões de ação principais
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

        // Visibilidade do formulário de auth
        if (!user && showAuthButton.style.display === 'none' && !estaNaTelaCadastro) {
             // Se não logado e botão de mostrar auth escondido (pq form está visível)
             // Deixar o form visível ou o botão de cancelar visível
        } else if (!user && !estaNaTelaCadastro){
             authFormDiv.style.display = 'none'; // Esconde form se não estiver ativo
             cancelAuthButton.style.display = 'none';
        } else if (user) {
             authFormDiv.style.display = 'none';
             cancelAuthButton.style.display = 'none';
        }
    }


    // Função para fazer login com email e senha
    function loginWithEmailPassword() {
        const email = emailLoginInput.value;
        const password = passwordLoginInput.value;

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // O onAuthStateChanged cuidará da atualização da UI
                console.log('Login com email/senha bem-sucedido');
                emailLoginInput.value = ''; // Limpar campos
                passwordLoginInput.value = '';
            })
            .catch((error) => {
                console.error('Erro ao fazer login com email/senha:', error);
                alert('Erro ao fazer login: ' + error.message);
            });
    }

    // Função para cadastrar novo usuário com email e senha
    function signupWithEmailPassword() {
        const email = emailLoginInput.value;
        const password = passwordLoginInput.value;

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                console.log('Cadastro com email/senha bem-sucedido:', userCredential.user);
                alert('Cadastro realizado com sucesso! Faça login.');
                // O onAuthStateChanged cuidará da atualização da UI após o login
                emailLoginInput.value = ''; // Limpar campos
                passwordLoginInput.value = '';
                // Forçar exibição do botão de login/cadastro novamente
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

    // Função para fazer logout
    function logout() {
        console.log("Função logout() iniciada");
        signOut(auth)
            .then(() => {
                console.log('Logout bem-sucedido');
                // O onAuthStateChanged cuidará da atualização da UI
            })
            .catch((error) => {
                console.error('Erro ao fazer logout:', error);
                alert('Erro ao fazer logout. Tente novamente.');
            });
    }

    // Carrega planos do Firebase Firestore
    async function carregarPlanosSalvos(callback) { // Tornada async para usar await
        if (!user) {
            console.log('Usuário não logado, retornando planos vazios.');
            if (callback) callback([]);
            return; // Não retorna valor, usa callback
        }

        const userId = user.uid;
        const docRef = doc(db, 'users', userId);

        try {
            const docSnap = await getDoc(docRef); // Usando await
            let planosDoFirestore = [];
            if (docSnap.exists()) {
                const data = docSnap.data();
                planosDoFirestore = data.planos || [];
                // Mapeamento para converter strings de data de volta para Date objects
                planosDoFirestore = planosDoFirestore.map(plano => {
                    return {
                        ...plano,
                        // Garante que linkDrive exista, mesmo que vazio
                        linkDrive: plano.linkDrive || '',
                        // Conversão de datas (mantendo a lógica anterior)
                        dataInicio: plano.dataInicio ? new Date(plano.dataInicio) : null,
                        dataFim: plano.dataFim ? new Date(plano.dataFim) : null,
                        diasPlano: plano.diasPlano ? plano.diasPlano.map(dia => ({
                            ...dia,
                            data: dia.data ? new Date(dia.data) : null
                        })) : []
                    };
                });
            } else {
                console.log("Nenhum documento de usuário encontrado. Criando um novo.");
                await setDoc(docRef, { planos: [] }); // Cria doc se não existir
            }
            console.log('Planos carregados do Firestore:', planosDoFirestore);
            if (callback) callback(planosDoFirestore);

        } catch (error) {
            console.error('Erro ao carregar planos do Firestore:', error);
            alert('Erro ao carregar planos. Verifique sua conexão e tente novamente.');
            if (callback) callback([]); // Retorna vazio em caso de erro
        }
    }


    // Salva planos no Firebase Firestore
    async function salvarPlanos(planosParaSalvar, callback) { // Tornada async
        if (!user) {
            console.error('Usuário não logado, não é possível salvar.');
            // Não mostra alert aqui, pois pode ser chamado em background
            if (callback) callback(false);
            return; // Não retorna valor
        }

        const userId = user.uid;
        const docRef = doc(db, 'users', userId);

        // Mapeamento para converter Date objects para strings ISO antes de salvar
        const planosParaFirestore = planosParaSalvar.map(plano => {
            // Garante que linkDrive seja string (evita undefined)
            const linkDrive = typeof plano.linkDrive === 'string' ? plano.linkDrive : '';
            return {
                ...plano,
                linkDrive: linkDrive, // Garante que o campo exista
                // Conversão de datas (mantendo a lógica anterior)
                dataInicio: plano.dataInicio instanceof Date ? plano.dataInicio.toISOString() : null,
                dataFim: plano.dataFim instanceof Date ? plano.dataFim.toISOString() : null,
                diasPlano: plano.diasPlano ? plano.diasPlano.map(dia => ({
                    ...dia,
                    data: dia.data instanceof Date ? dia.data.toISOString() : null
                })) : []
            };
        });

        try {
            await setDoc(docRef, { planos: planosParaFirestore }); // Usando await
            console.log('Planos salvos no Firestore com sucesso!');
            if (callback) callback(true);
        } catch (error) {
            console.error('Erro ao salvar planos no Firestore:', error);
            alert('Erro ao salvar planos. Verifique sua conexão e tente novamente.');
            if (callback) callback(false);
        }
    }


    // Função para atualizar os atributos required com base na opção selecionada
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
        // O campo linkDrive nunca é required
        linkDriveInput.required = false;
    }

    // Chamar a função inicialmente para definir o estado inicial
    updateRequiredAttributes();

    // *** NOVA FUNÇÃO: Renderizar as próximas leituras agendadas ***
    function renderizarProximasLeituras() {
        if (!user || !planos || planos.length === 0) {
            proximasLeiturasSection.style.display = 'none'; // Esconde se não logado ou sem planos
            return;
        }

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); // Normaliza para comparar apenas a data

        const todasLeiturasFuturas = [];

        planos.forEach((plano, planoIndex) => {
            if (plano.diasPlano && plano.diasPlano.length > 0) {
                plano.diasPlano.forEach((dia, diaIndex) => {
                    // Verifica se é uma data válida, futura ou hoje, e não está lido
                    if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime()) &&
                        dia.data >= hoje && !dia.lido)
                    {
                        todasLeiturasFuturas.push({
                            data: dia.data,
                            titulo: plano.titulo,
                            paginasTexto: `Pgs ${dia.paginaInicioDia}-${dia.paginaFimDia} (${dia.paginas})`,
                            // Guardar índices pode ser útil para futuras interações
                            // planoIndex: planoIndex,
                            // diaIndex: diaIndex
                        });
                    }
                });
            }
        });

        // Ordena por data (mais próxima primeiro)
        todasLeiturasFuturas.sort((a, b) => a.data - b.data);

        // Pega os 3 primeiros (ou menos, se houver menos)
        const proximas3Leituras = todasLeiturasFuturas.slice(0, 3);

        // Limpa o container atual
        listaProximasLeiturasDiv.innerHTML = '';

        if (proximas3Leituras.length > 0) {
            proximasLeiturasSection.style.display = 'block'; // Mostra a seção
            semProximasLeiturasP.style.display = 'none';    // Esconde a mensagem "sem leituras"

            proximas3Leituras.forEach(leitura => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('proxima-leitura-item');

                const dataFormatada = leitura.data.toLocaleDateString('pt-BR', {
                    weekday: 'short', // Ex: 'qua.'
                    // year: 'numeric', // Opcional: remover para ficar mais curto
                    month: 'short', // Ex: 'jul.'
                    day: 'numeric'  // Ex: '17'
                });

                itemDiv.innerHTML = `
                    <span class="proxima-leitura-data">${dataFormatada}</span>
                    <span class="proxima-leitura-titulo">${leitura.titulo}</span>
                    <span class="proxima-leitura-paginas">${leitura.paginasTexto}</span>
                `;
                listaProximasLeiturasDiv.appendChild(itemDiv);
            });

        } else {
            // Não há leituras futuras não lidas
            proximasLeiturasSection.style.display = 'block'; // Mostra a seção para exibir a mensagem
            semProximasLeiturasP.style.display = 'block';    // Mostra a mensagem "sem leituras"
        }
    }


    // Renderizar planos na interface
    function renderizarPlanos() {
        paginadorPlanosDiv.innerHTML = ''; // Limpa paginador
        listaPlanos.innerHTML = ''; // Limpa lista

        // *** Esconde a seção de próximas leituras por padrão ***
        proximasLeiturasSection.style.display = 'none';

        if (!user) {
            listaPlanos.innerHTML = '<p>Faça login ou cadastre-se para gerenciar seus planos de leitura.</p>';
            atualizarVisibilidadeBotoesAcao(); // Garante botões corretos
            renderizarProximasLeituras(); // *** Chama para garantir que a seção fique escondida se deslogado ***
            return; // Sai se não estiver logado
        }

        if (planos.length === 0) {
            listaPlanos.innerHTML = '<p>Nenhum plano de leitura cadastrado ainda. Clique em "Novo" para começar!</p>';
            atualizarVisibilidadeBotoesAcao();
            togglePaginatorVisibility(); // Atualiza visibilidade do paginador
            renderizarProximasLeituras(); // *** Chama para mostrar a seção com a msg "sem leituras" ou escondê-la ***
            return; // Sai se não houver planos
        }


        // Renderiza Paginador
        if (planos.length > 1) { // Só mostra paginador se tiver mais de 1 plano
            planos.forEach((plano, index) => {
                const linkPaginador = document.createElement('a');
                linkPaginador.href = `#plano-${index}`;
                linkPaginador.textContent = index + 1;
                // Adiciona tooltip com o nome do livro (Segunda melhoria - Preview)
                linkPaginador.title = plano.titulo;
                paginadorPlanosDiv.appendChild(linkPaginador);
            });
        }

        // Renderiza Planos
        planos.forEach((plano, index) => {
            const progressoPercentual = plano.totalPaginas > 0 ? (plano.paginasLidas / plano.totalPaginas) * 100 : 0;
            const diasAtrasados = verificarAtraso(plano);
            const avisoAtrasoHTML = diasAtrasados > 0 ? `
                <div class="aviso-atraso" id="aviso-atraso-${index}">
                    <p>⚠️ Plano com atraso de ${diasAtrasados} dia(s)!</p>
                    <div class="acoes-dados">
                        <button onclick="mostrarOpcoesRecalculo(${index})">Recalcular Plano</button>
                    </div>
                </div>` : '';

            // NOVO: HTML para o Link do Drive
            let linkDriveHTML = '';
            if (plano.linkDrive) {
                linkDriveHTML = `
                <div class="link-drive-container">
                    <a href="${plano.linkDrive}" target="_blank" class="button-link-drive" title="Abrir documento de anotações no Google Drive">
                        <span class="material-symbols-outlined">open_in_new</span> Abrir Notas (Drive)
                    </a>
                    <button onclick="editarLinkDrive(${index})" class="button-link-drive-edit" title="Editar link do Google Drive">
                        <span class="material-symbols-outlined">edit</span> Editar Link
                    </button>
                </div>`;
            } else {
                linkDriveHTML = `
                <div class="link-drive-container">
                    <button onclick="editarLinkDrive(${index})" class="button-link-drive-add" title="Adicionar link do Google Drive">
                        <span class="material-symbols-outlined">add_link</span> Adicionar Link do Drive
                    </button>
                </div>`;
            }

            const planoDiv = document.createElement('div');
            planoDiv.classList.add('plano-leitura');
            planoDiv.id = `plano-${index}`; // ID para ancoragem do paginador
            planoDiv.innerHTML = `
                <div class="plano-header">
                    <h3><span class="plano-numero">${index + 1}. </span>${plano.titulo}</h3>
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
                ${linkDriveHTML} <!-- Link do Drive inserido aqui -->
                <p>Páginas: ${plano.paginaInicio} - ${plano.paginaFim} (${plano.totalPaginas} pgs)</p>
                <div class="progresso-container" title="${progressoPercentual.toFixed(0)}% concluído">
                    <div class="barra-progresso" style="width: ${progressoPercentual}%"></div>
                </div>
                <p>${plano.paginasLidas} de ${plano.totalPaginas} páginas lidas (${progressoPercentual.toFixed(0)}%)</p>
                <details class="dias-leitura-details">
                    <summary>Ver/Marcar Dias de Leitura (${plano.diasPlano.length} dias)</summary>
                    <div class="dias-leitura">${renderizarDiasLeitura(plano.diasPlano, index)}</div>
                </details>
            `;
            listaPlanos.appendChild(planoDiv);
        });

        atualizarVisibilidadeBotoesAcao();
        togglePaginatorVisibility(); // Atualiza visibilidade do paginador após renderizar

        // *** NOVO: Chama a função para renderizar as próximas leituras DEPOIS de tudo ***
        renderizarProximasLeituras();
    }


    // Verificar atraso no plano
    function verificarAtraso(plano) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); // Normaliza para comparar apenas a data
        if (!plano.diasPlano || plano.diasPlano.length === 0) {
            return 0; // Sem dias, sem atraso
        }
        return plano.diasPlano.reduce((count, dia) => {
             // Verifica se dia.data é uma data válida antes de comparar
             if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                const dataDia = new Date(dia.data);
                dataDia.setHours(0, 0, 0, 0); // Normaliza data do plano
                // Conta se a data do dia é anterior a hoje E não foi lido
                if (dataDia < hoje && !dia.lido) {
                    return count + 1;
                }
            }
            return count; // Mantém a contagem se a data for inválida ou não estiver atrasada/não lida
        }, 0);
    }


    // Renderizar dias de leitura (dentro do <details>)
    function renderizarDiasLeitura(diasPlano, planoIndex) {
        if (!diasPlano || diasPlano.length === 0) {
            return '<p>Nenhum dia de leitura definido para este plano.</p>';
        }
        return diasPlano.map((dia, diaIndex) => {
            // Verifica se dia.data é uma data válida
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


    // Marcar dia como lido
    window.marcarDiaLido = function(planoIndex, diaIndex, lido) {
        if (planos[planoIndex] && planos[planoIndex].diasPlano[diaIndex]) {
            planos[planoIndex].diasPlano[diaIndex].lido = lido;
            atualizarPaginasLidas(planoIndex);
            // Salva e renderiza DEPOIS que o salvamento for confirmado (ou falhar)
            salvarPlanos(planos, (salvoComSucesso) => {
                if (salvoComSucesso) {
                    console.log('Progresso salvo no Firebase.');
                } else {
                    // Opcional: Reverter a mudança localmente se falhar? Ou apenas logar.
                    console.error('Falha ao salvar progresso no Firebase.');
                    // Poderia recarregar os planos do firebase para garantir consistência
                    // carregarPlanosSalvos(p => { planos = p; renderizarPlanos(); });
                }
                // Renderiza a UI independentemente do sucesso/falha do save para refletir a ação do usuário
                // renderizarPlanos() já renderiza tudo, incluindo as próximas leituras
                renderizarPlanos();
            });
        } else {
            console.error("Índice de plano ou dia inválido para marcar como lido.");
        }
    };


    // Atualizar páginas lidas
    function atualizarPaginasLidas(planoIndex) {
        if (planos[planoIndex] && planos[planoIndex].diasPlano) {
            planos[planoIndex].paginasLidas = planos[planoIndex].diasPlano.reduce((sum, dia) => {
                // Soma apenas se 'dia.lido' for true e 'dia.paginas' for um número > 0
                return sum + (dia.lido && typeof dia.paginas === 'number' && dia.paginas > 0 ? dia.paginas : 0);
            }, 0);
        } else {
            console.error("Plano inválido para atualizar páginas lidas.");
            if(planos[planoIndex]) planos[planoIndex].paginasLidas = 0; // Reseta se o plano existe mas dias não
        }
    }


    // Editar um plano existente (formulário completo)
    window.editarPlano = function(index) {
        if (index < 0 || index >= planos.length) {
            console.error("Índice de plano inválido para edição:", index);
            return;
        }
        planoEditandoIndex = index;
        preventFormReset = true; // Impede reset ao clicar em "Novo" (que agora é simulado)

        // Simula clique no botão "Novo Plano" para mudar a visualização
        cadastroPlanoSection.style.display = 'block';
        planosLeituraSection.style.display = 'none';
        atualizarVisibilidadeBotoesAcao(); // Atualiza botões para o modo cadastro (esconde próximas leituras)
        inicioCadastroBtn.style.display = 'block'; // Mostra botão de voltar

        preventFormReset = false; // Permite reset futuro

        const plano = planos[index];

        // Preenche campos do formulário
        document.getElementById('titulo-livro').value = plano.titulo || '';
        document.getElementById('link-drive').value = plano.linkDrive || ''; // Preenche o link
        document.getElementById('pagina-inicio').value = plano.paginaInicio || '';
        document.getElementById('pagina-fim').value = plano.paginaFim || '';

        // Preenche seleção de período
        if (plano.definicaoPeriodo === 'dias') {
            definirPorDiasRadio.checked = true;
            periodoPorDatasDiv.style.display = 'none';
            periodoPorDiasDiv.style.display = 'block';
            document.getElementById('data-inicio-dias').valueAsDate = plano.dataInicio instanceof Date ? plano.dataInicio : null;
            // Calcula o número de dias se não estiver armazenado explicitamente (melhor armazenar)
             const numDias = plano.diasPlano ? plano.diasPlano.length : '';
            document.getElementById('numero-dias').value = numDias;
        } else { // Default para 'datas'
            definirPorDatasRadio.checked = true;
            periodoPorDatasDiv.style.display = 'block';
            periodoPorDiasDiv.style.display = 'none';
            document.getElementById('data-inicio').valueAsDate = plano.dataInicio instanceof Date ? plano.dataInicio : null;
            document.getElementById('data-fim').valueAsDate = plano.dataFim instanceof Date ? plano.dataFim : null;
        }

        // Preenche periodicidade
        periodicidadeSelect.value = plano.periodicidade || 'diario';
        diasSemanaSelecao.style.display = periodicidadeSelect.value === 'semanal' ? 'block' : 'none';
        if (plano.periodicidade === 'semanal' && Array.isArray(plano.diasSemana)) {
            document.querySelectorAll('input[name="dia-semana"]').forEach(cb => {
                cb.checked = plano.diasSemana.includes(parseInt(cb.value));
            });
        } else {
             document.querySelectorAll('input[name="dia-semana"]').forEach(cb => cb.checked = false);
        }

        // Atualiza texto do botão e atributos required
        formPlano.querySelector('button[type="submit"]').textContent = 'Atualizar Plano';
        updateRequiredAttributes();

        // Rola para o topo do formulário
         cadastroPlanoSection.scrollIntoView({ behavior: 'smooth' });
    };

    // NOVO: Função para editar apenas o Link do Drive
    window.editarLinkDrive = function(index) {
        if (index < 0 || index >= planos.length) {
            console.error("Índice de plano inválido para editar link:", index);
            return;
        }
        const plano = planos[index];
        const linkAtual = plano.linkDrive || ''; // Pega link atual ou string vazia
        const novoLink = prompt(`Editar Link do Google Drive para "${plano.titulo}":\n(Deixe em branco para remover)`, linkAtual);

        // Se o usuário não cancelar (novoLink !== null)
        if (novoLink !== null) {
            // Validação simples: aceita URL ou string vazia
            // Poderia adicionar regex para validar formato de URL se desejado
            planos[index].linkDrive = novoLink.trim(); // Atualiza o link no array local, removendo espaços extras

            // Salva a alteração no Firebase e renderiza novamente
            salvarPlanos(planos, (salvoComSucesso) => {
                if (salvoComSucesso) {
                    console.log('Link do Drive atualizado e salvo no Firebase.');
                } else {
                    console.error('Falha ao salvar atualização do link no Firebase.');
                    // Opcional: Informar o usuário ou tentar novamente?
                    // Por enquanto, apenas renderiza para refletir a mudança local.
                }
                // renderizarPlanos() atualiza toda a UI
                renderizarPlanos();
            });
        }
        // Se o usuário cancelar (novoLink === null), não faz nada
    };


    // Mostrar opções de recálculo
    window.mostrarOpcoesRecalculo = function(index) {
        const avisoAtrasoDiv = document.getElementById(`aviso-atraso-${index}`);
        if (!avisoAtrasoDiv) return; // Sai se o elemento não existe
        avisoAtrasoDiv.innerHTML = `
            <p>⚠️ Plano atrasado. Como deseja recalcular?</p>
            <div class="acoes-dados recalculo-opcoes">
                <button onclick="solicitarNovaDataFim(${index})" title="Define uma nova data para terminar a leitura, recalculando as páginas por dia restante">Nova Data Fim</button>
                <button onclick="solicitarPaginasPorDia(${index})" title="Define quantas páginas ler por dia a partir de agora, recalculando a data de fim">Páginas/Dia</button>
                <button onclick="fecharAvisoRecalculo(${index})" title="Cancelar recálculo">Cancelar</button>
            </div>
        `;
    };

    // Fechar aviso de recálculo
    window.fecharAvisoRecalculo = function(index) {
        const avisoAtrasoDiv = document.getElementById(`aviso-atraso-${index}`);
        if (!avisoAtrasoDiv) return; // Sai se o elemento não existe
        const plano = planos[index];
        const diasAtrasados = verificarAtraso(plano);
        // Volta para a mensagem original de atraso
        avisoAtrasoDiv.innerHTML = `
            <p>⚠️ Plano com atraso de ${diasAtrasados} dia(s)!</p>
            <div class="acoes-dados">
                <button onclick="mostrarOpcoesRecalculo(${index})">Recalcular Plano</button>
            </div>
        `;
    };


    // Solicitar nova data de fim para recálculo
    window.solicitarNovaDataFim = function(index) {
        const hojeStr = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
        const novaDataFimInput = prompt(`Recalcular definindo Nova Data de Fim:\n\nDigite a nova data limite (YYYY-MM-DD, após ${hojeStr}):`);

        if (novaDataFimInput) {
            try {
                // Tenta criar a data e normalizar para meia-noite
                const novaDataFim = new Date(novaDataFimInput + 'T00:00:00'); // Adiciona hora para evitar problemas de fuso

                if (isNaN(novaDataFim.getTime())) {
                    alert("Data inválida. Use o formato YYYY-MM-DD.");
                    mostrarOpcoesRecalculo(index); // Volta para as opções
                    return;
                }

                // Garante que a data fim seja no futuro
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                if (novaDataFim <= hoje) {
                     alert("A nova data de fim deve ser posterior à data de hoje.");
                     mostrarOpcoesRecalculo(index);
                     return;
                }

                recalcularPlanoNovaData(index, novaDataFim);
            } catch (e) {
                 alert("Erro ao processar a data. Use o formato YYYY-MM-DD.");
                 mostrarOpcoesRecalculo(index);
            }
        } else {
             mostrarOpcoesRecalculo(index); // Volta se o usuário cancelar
        }
    };

    // Solicitar páginas por dia para recálculo
    window.solicitarPaginasPorDia = function(index) {
        const paginasPorDiaInput = prompt("Recalcular definindo Páginas por Dia:\n\nDigite o número de páginas que você quer ler por dia a partir de agora:");

        if (paginasPorDiaInput) {
            const paginasPorDia = parseInt(paginasPorDiaInput);

            if (isNaN(paginasPorDia) || paginasPorDia <= 0) {
                alert("Insira um número válido de páginas por dia (maior que zero).");
                 mostrarOpcoesRecalculo(index); // Volta para as opções
                return;
            }

            // Verifica se há páginas restantes
             const plano = planos[index];
             const paginasRestantes = (plano.totalPaginas || 0) - (plano.paginasLidas || 0);
             if (paginasRestantes <= 0) {
                 alert("Não há páginas restantes para ler neste plano.");
                 fecharAvisoRecalculo(index); // Fecha o aviso pois não há o que recalcular
                 return;
             }


            recalcularPlanoPaginasPorDia(index, paginasPorDia);
        } else {
             mostrarOpcoesRecalculo(index); // Volta se o usuário cancelar
        }
    };


    // Calcular nova data de fim com base em páginas por dia (função auxiliar)
    function calcularNovaDataFimPorPaginasDia(plano, paginasPorDia) {
        const paginasRestantes = (plano.totalPaginas || 0) - (plano.paginasLidas || 0);
         if (paginasRestantes <= 0 || paginasPorDia <= 0) {
            return null; // Não é possível calcular
        }

        // Encontra a data do próximo dia de leitura válido (a partir de hoje)
        let proximoDiaLeitura = new Date(); // Começa hoje
        proximoDiaLeitura.setHours(0,0,0,0);

        const diasSemanaPlano = Array.isArray(plano.diasSemana) ? plano.diasSemana : [];
        const isDiaValido = (data) => {
             const diaSem = data.getDay();
             return plano.periodicidade === 'diario' || (plano.periodicidade === 'semanal' && diasSemanaPlano.includes(diaSem));
        };

         // Avança para o próximo dia útil de leitura (se hoje não for)
         while (!isDiaValido(proximoDiaLeitura)) {
             proximoDiaLeitura.setDate(proximoDiaLeitura.getDate() + 1);
         }

        // Calcula quantos dias de leitura serão necessários
        const diasLeituraNecessarios = Math.ceil(paginasRestantes / paginasPorDia);

        // Simula o avanço dos dias de leitura para encontrar a data final
        let dataFimCalculada = new Date(proximoDiaLeitura);
        let diasLeituraContados = 0;

        while(diasLeituraContados < diasLeituraNecessarios) {
             if (isDiaValido(dataFimCalculada)) {
                 diasLeituraContados++;
             }
             // Se ainda não atingiu o número de dias, avança para o próximo dia
             if (diasLeituraContados < diasLeituraNecessarios) {
                 dataFimCalculada.setDate(dataFimCalculada.getDate() + 1);
             }
        }

        return dataFimCalculada;
    }

    // Recalcular plano com base em páginas por dia
    window.recalcularPlanoPaginasPorDia = function(index, paginasPorDia) {
        const plano = planos[index];

        const novaDataFim = calcularNovaDataFimPorPaginasDia(plano, paginasPorDia);

        if (!novaDataFim) {
             alert("Não foi possível calcular a nova data de fim. Verifique as páginas restantes e o número de páginas por dia.");
             mostrarOpcoesRecalculo(index);
             return;
         }


        // Com a nova data fim calculada, chama a função de recálculo por data
        recalcularPlanoNovaData(index, novaDataFim);
    };


    // Excluir um plano
    window.excluirPlano = function(index) {
        if (index < 0 || index >= planos.length) {
            console.error("Índice de plano inválido para exclusão:", index);
            return;
        }
        const plano = planos[index];
        if (confirm(`Tem certeza que deseja excluir o plano "${plano.titulo}"?`)) {
            planos.splice(index, 1); // Remove do array local
            // Salva a lista atualizada no Firebase e renderiza
            salvarPlanos(planos, (salvoComSucesso) => {
                if (salvoComSucesso) {
                    console.log('Plano excluído e lista salva no Firebase.');
                } else {
                    console.error('Falha ao salvar a exclusão do plano no Firebase.');
                    // Opcional: Recarregar do Firebase para garantir consistência?
                }
                // Renderiza a lista atualizada e próximas leituras
                renderizarPlanos();
            });
        }
    };

    // Exportar para agenda (.ics)
    exportarAgendaBtn.addEventListener('click', () => {
        if (!user || planos.length === 0) {
            alert("Você precisa estar logado e ter planos cadastrados para exportar.");
            return;
        }

        // Cria uma lista de opções para o prompt
        let promptMessage = "Digite o número do plano para exportar:\n\n";
        planos.forEach((plano, index) => {
            promptMessage += `${index + 1}. ${plano.titulo}\n`;
        });

        const planoIndexInput = prompt(promptMessage);

        // Verifica se o usuário cancelou
        if (planoIndexInput === null) {
            return;
        }

        const planoIndex = parseInt(planoIndexInput) - 1;

        if (isNaN(planoIndex) || planoIndex < 0 || planoIndex >= planos.length) {
            alert("Número de plano inválido.");
            return;
        }

        if (!planos[planoIndex].diasPlano || planos[planoIndex].diasPlano.length === 0) {
             alert(`O plano "${planos[planoIndex].titulo}" não possui dias de leitura definidos para exportar.`);
             return;
         }


        exportarParaAgenda(planos[planoIndex]);
    });


    function exportarParaAgenda(plano) {
        // Pede horários
        const horarioInicio = prompt(`Exportar "${plano.titulo}":\n\nDigite o horário de início diário para a leitura (HH:MM):`, "09:00");
        if (!horarioInicio) return; // Cancelou

        const horarioFim = prompt(`Digite o horário de fim diário para a leitura (HH:MM):`, "09:30");
        if (!horarioFim) return; // Cancelou

        // Validação simples de formato HH:MM
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(horarioInicio) || !timeRegex.test(horarioFim)) {
            alert("Formato de horário inválido. Use HH:MM (ex: 09:00).");
            return;
        }

        try {
            const eventosICS = gerarICS(plano, horarioInicio, horarioFim);
            downloadICSFile(eventosICS, plano.titulo);
        } catch (error) {
             console.error("Erro ao gerar ou baixar arquivo ICS:", error);
             alert("Ocorreu um erro ao gerar o arquivo da agenda. Verifique os dados do plano.");
        }
    }

    // Função para gerar conteúdo ICS (simplificada e corrigida)
    function gerarICS(plano, horarioInicio, horarioFim) {
         // Validações Iniciais Essenciais
         if (!plano || !plano.diasPlano || plano.diasPlano.length === 0 || !plano.dataInicio || !plano.dataFim) {
            throw new Error("Dados do plano incompletos ou inválidos para gerar ICS.");
        }
         if (!plano.id) plano.id = crypto.randomUUID(); // Garante um ID único

        const uidEvento = `${plano.id}@gerenciador-planos-leitura`;
        const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split('.')[0] + "Z"; // Timestamp atual

        // Formata datas e horas para o padrão ICS (YYYYMMDDTHHMMSSZ)
        // Usa UTC para evitar problemas com fuso horário no RRULE UNTIL
        const formatICSDate = (date, time) => {
            const [year, month, day] = [date.getFullYear(), (date.getMonth() + 1).toString().padStart(2, '0'), date.getDate().toString().padStart(2, '0')];
            const [hour, minute] = time.split(':');
            return `${year}${month}${day}T${hour}${minute}00`; // Não adiciona Z aqui para DTSTART/DTEND locais
        };
         const formatICSDateUTC = (date) => {
            // Para UNTIL, precisamos de UTC e Z no final
            const year = date.getUTCFullYear();
            const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
            const day = date.getUTCDate().toString().padStart(2, '0');
            return `${year}${month}${day}T235959Z`; // Termina no fim do dia UTC
        };

        // --- Cabeçalho VCALENDAR ---
        let icsString = `BEGIN:VCALENDAR\r\n`;
        icsString += `VERSION:2.0\r\n`;
        icsString += `PRODID:-//SeuNomeOuEmpresa//Gerenciador Planos Leitura v1.0//PT\r\n`;
        icsString += `CALSCALE:GREGORIAN\r\n`;
        icsString += `METHOD:PUBLISH\r\n`; // Adiciona método

        // --- Evento VEVENT ---
        icsString += `BEGIN:VEVENT\r\n`;
        icsString += `UID:${uidEvento}\r\n`;
        icsString += `DTSTAMP:${dtstamp}\r\n`; // Quando o evento foi criado/modificado

        // Define DTSTART para o primeiro dia de leitura válido com o horário
        const primeiroDiaLeitura = plano.diasPlano[0].data;
        icsString += `DTSTART;TZID=America/Sao_Paulo:${formatICSDate(primeiroDiaLeitura, horarioInicio)}\r\n`; // Assumindo Fuso SP, ajuste conforme necessário
        icsString += `DTEND;TZID=America/Sao_Paulo:${formatICSDate(primeiroDiaLeitura, horarioFim)}\r\n`; // Assumindo Fuso SP

        // --- Regra de Recorrência (RRULE) ---
        let rrule = 'RRULE:FREQ=';
        if (plano.periodicidade === 'diario') {
            rrule += 'DAILY';
        } else if (plano.periodicidade === 'semanal' && Array.isArray(plano.diasSemana) && plano.diasSemana.length > 0) {
            rrule += 'WEEKLY;BYDAY=';
            const diasSemanaICS = plano.diasSemana.map(diaIndex => ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][diaIndex]).join(',');
            rrule += diasSemanaICS;
        } else {
             // Se for semanal mas sem dias selecionados, ou periodicidade inválida,
             // cria apenas um evento único (removendo RRULE ou tratando erro)
             // Aqui, vamos assumir que a validação impede isso, mas por segurança:
             console.warn("Periodicidade inválida ou sem dias para RRULE. Exportando apenas o primeiro dia.");
             // Poderia remover a RRULE completamente ou lançar erro.
             // Por enquanto, deixamos gerar um diário se a semanal falhar.
             if (rrule === 'RRULE:FREQ=') rrule += 'DAILY'; // Fallback
        }

         // Adiciona UNTIL com a data de fim do plano (em UTC)
         // Usa o dia seguinte à data fim para incluir o último dia
         const dataFimParaUntil = new Date(plano.dataFim);
         // dataFimParaUntil.setDate(dataFimParaUntil.getDate() + 1); // Não precisa mais adicionar 1 dia com T235959Z
         rrule += `;UNTIL=${formatICSDateUTC(dataFimParaUntil)}`;
         icsString += `${rrule}\r\n`;

        // --- Detalhes do Evento ---
        icsString += `SUMMARY:Leitura: ${plano.titulo}\r\n`;
        // Descrição mais detalhada
        let description = `Plano de leitura do livro "${plano.titulo}".\\n`; // \n vira nova linha no iCal
        description += `Período: ${plano.dataInicio.toLocaleDateString('pt-BR')} a ${plano.dataFim.toLocaleDateString('pt-BR')}\\n`;
        description += `Páginas: ${plano.paginaInicio} a ${plano.paginaFim}\\n\\n`;
        description += `Meta diária (aproximada): Verifique os dias no app.\\n\\n`;
        description += `Acesse o Gerenciador: https://fernnog.github.io/Plano-leitura-livros/\\n`; // Link clicável
        icsString += `DESCRIPTION:${description}\r\n`;

        icsString += `LOCATION:Local de Leitura\r\n`;
        icsString += `STATUS:CONFIRMED\r\n`; // Status do evento
        icsString += `TRANSP:OPAQUE\r\n`; // Mostra como "Ocupado" no calendário

        // --- Alarme (Opcional) ---
        icsString += `BEGIN:VALARM\r\n`;
        icsString += `ACTION:DISPLAY\r\n`;
        icsString += `DESCRIPTION:Lembrete de Leitura: ${plano.titulo}\r\n`;
        icsString += `TRIGGER:-PT15M\r\n`; // 15 minutos antes do início
        icsString += `END:VALARM\r\n`;

        // --- Fim VEVENT e VCALENDAR ---
        icsString += `END:VEVENT\r\n`;
        icsString += `END:VCALENDAR\r\n`;

        return icsString;
    }


    function downloadICSFile(icsContent, planoTitulo) {
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Nome do arquivo mais descritivo
        const nomeArquivo = `Plano_Leitura_${planoTitulo.replace(/[^a-z0-9]/gi, '_')}.ics`;
        a.download = nomeArquivo;
        document.body.appendChild(a); // Necessário para Firefox
        a.click();
        document.body.removeChild(a); // Limpa o DOM
        URL.revokeObjectURL(url);
    }

    // Controlar visibilidade do paginador flutuante
    function togglePaginatorVisibility() {
        const paginador = document.getElementById('paginador-planos');
        if (!paginador) return;

        const lista = document.getElementById('lista-planos');
        if (!lista || planos.length <= 1) { // Esconder se 0 ou 1 plano
            paginador.classList.add('hidden');
            return;
        }

        // Lógica para esconder se o final da lista estiver visível (opcional, pode remover se preferir sempre visível)
        const footer = document.querySelector('footer');
        const listaRect = lista.getBoundingClientRect();
        const footerRect = footer.getBoundingClientRect();
        const windowHeight = window.innerHeight;

         // Mostra se o final da lista estiver abaixo da linha do footer
         // Ou se o topo do footer estiver acima da parte inferior da janela
        if (listaRect.bottom > footerRect.top || footerRect.top > windowHeight) {
            paginador.classList.remove('hidden');
         } else {
            paginador.classList.add('hidden');
         }
    }


    window.addEventListener('scroll', togglePaginatorVisibility);
    window.addEventListener('resize', togglePaginatorVisibility);

    // Distribuir páginas pelo plano (calcula paginas por dia)
    function distribuirPaginasPlano(plano) {
        if (!plano || !plano.diasPlano || plano.diasPlano.length === 0 || !plano.paginaInicio || !plano.paginaFim) {
            console.warn("Dados insuficientes para distribuir páginas:", plano);
            return; // Não faz nada se faltar dados cruciais
        }

        const totalPaginas = (plano.paginaFim - plano.paginaInicio + 1);
        const diasDeLeitura = plano.diasPlano; // Array de objetos de dia
        const numeroDeDias = diasDeLeitura.length;

        if (totalPaginas <= 0) {
            console.warn("Total de páginas inválido (<= 0).", plano);
             // Zera as páginas em todos os dias
             diasDeLeitura.forEach(dia => {
                 dia.paginaInicioDia = plano.paginaInicio; // Ou 0? Define como início
                 dia.paginaFimDia = plano.paginaInicio -1; // Fica inválido
                 dia.paginas = 0;
                 dia.lido = false; // Garante que não esteja lido
             });
             plano.paginasLidas = 0;
             plano.totalPaginas = 0; // Corrige total de páginas
            return;
        }
        plano.totalPaginas = totalPaginas; // Garante que está atualizado

        const paginasPorDiaBase = Math.floor(totalPaginas / numeroDeDias);
        const paginasRestantes = totalPaginas % numeroDeDias;
        let paginaAtual = plano.paginaInicio;
        let diasLidosOriginalmente = {}; // Guarda estado 'lido' original

        // Guarda estado lido original e reseta para recalcular
        diasDeLeitura.forEach((dia, index) => {
            diasLidosOriginalmente[index] = dia.lido;
            dia.lido = false;
         });

        diasDeLeitura.forEach((dia, index) => {
            let paginasNesteDia = paginasPorDiaBase;
            // Distribui as páginas restantes nos primeiros dias
            if (index < paginasRestantes) {
                paginasNesteDia += 1;
            }

            // Define as páginas do dia
            dia.paginaInicioDia = paginaAtual;
            dia.paginaFimDia = paginaAtual + paginasNesteDia - 1;
            dia.paginas = paginasNesteDia;

            // Restaura o estado 'lido' se era lido antes
             if (diasLidosOriginalmente[index]) {
                 dia.lido = true;
             } else {
                 dia.lido = false;
             }


            // Avança a página atual para o próximo dia
            paginaAtual = dia.paginaFimDia + 1;
        });

        // Garante que a última página final seja a página fim do livro
        if (diasDeLeitura.length > 0) {
            const ultimoDia = diasDeLeitura[numeroDeDias - 1];
             // Pequeno ajuste caso haja arredondamento
             if (ultimoDia.paginaFimDia !== plano.paginaFim) {
                 // Se for menor, ajusta o último dia (mais comum)
                 if (ultimoDia.paginaFimDia < plano.paginaFim) {
                     ultimoDia.paginaFimDia = plano.paginaFim;
                     ultimoDia.paginas = ultimoDia.paginaFimDia - ultimoDia.paginaInicioDia + 1;
                 }
                 // Se for maior (muito raro, indica erro de cálculo), pode logar ou tentar redistribuir
                 else if (ultimoDia.paginaFimDia > plano.paginaFim) {
                     console.warn("Cálculo de distribuição excedeu a página final. Ajustando último dia.");
                     ultimoDia.paginaFimDia = plano.paginaFim;
                     ultimoDia.paginas = Math.max(0, ultimoDia.paginaFimDia - ultimoDia.paginaInicioDia + 1);
                     // Idealmente, redistribuir o excesso para dias anteriores
                 }
             }
        }


        // Recalcula páginas lidas após a redistribuição
        atualizarPaginasLidas(planos.indexOf(plano)); // Recalcula com base nos dias marcados como lidos
    }


    // Recalcular plano com base em NOVA DATA FIM
    function recalcularPlanoNovaData(index, novaDataFim) {
        const planoOriginal = planos[index];

        // 1. Identificar páginas restantes e o ponto de partida
        const paginasLidas = planoOriginal.paginasLidas || 0;
        const paginaInicioRecalculo = (planoOriginal.paginaInicio || 1) + paginasLidas;
        const paginasRestantes = (planoOriginal.totalPaginas || 0) - paginasLidas;

        if (paginasRestantes <= 0) {
            alert("Todas as páginas já foram marcadas como lidas. Não há o que recalcular.");
             fecharAvisoRecalculo(index);
            return;
        }

        // 2. Encontrar a data de início do recálculo (hoje ou próximo dia válido)
        let dataInicioRecalculo = new Date();
        dataInicioRecalculo.setHours(0, 0, 0, 0);

         const diasSemanaPlano = Array.isArray(planoOriginal.diasSemana) ? planoOriginal.diasSemana : [];
         const isDiaValido = (data) => {
             const diaSem = data.getDay();
             return planoOriginal.periodicidade === 'diario' || (planoOriginal.periodicidade === 'semanal' && diasSemanaPlano.includes(diaSem));
         };

         // Avança para o próximo dia válido, se hoje não for
         while (!isDiaValido(dataInicioRecalculo)) {
             dataInicioRecalculo.setDate(dataInicioRecalculo.getDate() + 1);
         }

         // Verifica se a nova data fim é válida (após o início do recálculo)
         if (novaDataFim < dataInicioRecalculo) {
             alert("A nova data de fim deve ser igual ou posterior ao próximo dia de leitura válido (" + dataInicioRecalculo.toLocaleDateString('pt-BR') + ").");
             mostrarOpcoesRecalculo(index);
             return;
         }


        // 3. Gerar a lista de NOVOS dias de leitura (a partir de dataInicioRecalculo até novaDataFim)
        const novosDiasLeitura = [];
        let dataAtual = new Date(dataInicioRecalculo);
        while (dataAtual <= novaDataFim) {
            if (isDiaValido(dataAtual)) {
                novosDiasLeitura.push({
                    data: new Date(dataAtual),
                    paginaInicioDia: 0,
                    paginaFimDia: 0,
                    paginas: 0,
                    lido: false // Novos dias começam como não lidos
                });
            }
            dataAtual.setDate(dataAtual.getDate() + 1);
        }

        if (novosDiasLeitura.length === 0) {
            alert("Não há dias de leitura válidos entre o início do recálculo ("+ dataInicioRecalculo.toLocaleDateString('pt-BR') +") e a nova data de fim ("+ novaDataFim.toLocaleDateString('pt-BR') +"). Verifique a periodicidade e as datas.");
            mostrarOpcoesRecalculo(index);
            return;
        }

        // 4. Distribuir as PÁGINAS RESTANTES entre os NOVOS DIAS DE LEITURA
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

         // Ajuste final para garantir que a última página seja a página fim do livro
         const ultimoDiaNovo = novosDiasLeitura[numNovosDias - 1];
         if (ultimoDiaNovo.paginaFimDia !== planoOriginal.paginaFim) {
            console.warn(`Ajustando página final do último dia recalculado de ${ultimoDiaNovo.paginaFimDia} para ${planoOriginal.paginaFim}`);
             ultimoDiaNovo.paginaFimDia = planoOriginal.paginaFim;
             ultimoDiaNovo.paginas = Math.max(0, ultimoDiaNovo.paginaFimDia - ultimoDiaNovo.paginaInicioDia + 1);
         }


        // 5. Atualizar o plano original
        // Mantém os dias LIDOS originais e substitui os NÃO LIDOS pelos novos dias
        const diasLidosOriginais = planoOriginal.diasPlano.filter(dia => dia.lido);
        planos[index].diasPlano = [...diasLidosOriginais, ...novosDiasLeitura];
        planos[index].dataFim = novaDataFim; // Atualiza a data fim do plano

        // Não precisa chamar distribuirPaginasPlano aqui, pois já distribuímos as restantes
        // Apenas precisa garantir que o total de páginas lidas esteja correto
        atualizarPaginasLidas(index); // Reconfirma as páginas lidas

        // 6. Salvar e Renderizar
        salvarPlanos(planos, (salvoComSucesso) => {
            // Renderiza mesmo se salvar falhar para mostrar resultado
            // renderizarPlanos() já atualiza tudo
            renderizarPlanos();
        });
    }


    // --- Funções Geradoras de Dias (usadas na criação/edição e recálculo) ---

    // Gerar dias do plano por DATAS DE INÍCIO E FIM
    function gerarDiasPlanoPorDatas(dataInicio, dataFim, periodicidade, diasSemana) {
        const dias = [];
        // Validação básica das datas
        if (!(dataInicio instanceof Date) || !(dataFim instanceof Date) || isNaN(dataInicio) || isNaN(dataFim) || dataFim < dataInicio) {
            console.error("Datas inválidas para gerar dias:", dataInicio, dataFim);
            return dias; // Retorna array vazio se datas inválidas
        }

        let dataAtual = new Date(dataInicio);
        dataAtual.setHours(0, 0, 0, 0); // Normaliza hora

        const dataFimNormalizada = new Date(dataFim);
        dataFimNormalizada.setHours(0, 0, 0, 0); // Normaliza hora

        while (dataAtual <= dataFimNormalizada) {
            const diaSemanaAtual = dataAtual.getDay(); // 0 = Domingo, 1 = Segunda, ...

            // Verifica se o dia deve ser incluído
            if (periodicidade === 'diario' || (periodicidade === 'semanal' && Array.isArray(diasSemana) && diasSemana.includes(diaSemanaAtual))) {
                dias.push({
                    data: new Date(dataAtual), // Cria nova instância da data para o array
                    paginaInicioDia: 0, // Será preenchido por distribuirPaginasPlano
                    paginaFimDia: 0,    // Será preenchido por distribuirPaginasPlano
                    paginas: 0,         // Será preenchido por distribuirPaginasPlano
                    lido: false         // Novos dias começam como não lidos
                });
            }

            // Avança para o próximo dia
            dataAtual.setDate(dataAtual.getDate() + 1);
        }
        return dias;
    }


    // Gerar dias do plano por DATA DE INÍCIO E NÚMERO DE DIAS
    function gerarDiasPlanoPorDias(dataInicio, numeroDias, periodicidade, diasSemana) {
        const dias = [];
         // Validação básica
         if (!(dataInicio instanceof Date) || isNaN(dataInicio) || typeof numeroDias !== 'number' || numeroDias <= 0) {
             console.error("Dados inválidos para gerar dias por número:", dataInicio, numeroDias);
             return dias;
         }


        let dataAtual = new Date(dataInicio);
        dataAtual.setHours(0, 0, 0, 0); // Normaliza hora
        let diasAdicionados = 0;

        // Continua adicionando dias até atingir o número desejado
        while (diasAdicionados < numeroDias) {
            const diaSemanaAtual = dataAtual.getDay();

            // Verifica se o dia deve ser incluído
            if (periodicidade === 'diario' || (periodicidade === 'semanal' && Array.isArray(diasSemana) && diasSemana.includes(diaSemanaAtual))) {
                dias.push({
                    data: new Date(dataAtual),
                    paginaInicioDia: 0,
                    paginaFimDia: 0,
                    paginas: 0,
                    lido: false
                });
                diasAdicionados++; // Incrementa SÓ SE o dia for adicionado
            }

            // Avança para o próximo dia, mesmo que não tenha adicionado hoje
            dataAtual.setDate(dataAtual.getDate() + 1);

             // Segurança: Evita loop infinito se algo der muito errado (ex: 10 anos)
             if (dias.length > numeroDias * 10 && diasAdicionados < numeroDias) {
                 console.error("Loop infinito detectado em gerarDiasPlanoPorDias. Interrompendo.");
                 break;
             }

        }
        return dias;
    }


    // Calcular data de fim com base na DATA DE INÍCIO e NÚMERO DE DIAS DE LEITURA
    // (Considerando a periodicidade)
    function calcularDataFimReal(dataInicio, numeroDias, periodicidade, diasSemana) {
         // Validação básica
         if (!(dataInicio instanceof Date) || isNaN(dataInicio) || typeof numeroDias !== 'number' || numeroDias <= 0) {
             console.error("Dados inválidos para calcular data fim real:", dataInicio, numeroDias);
             return null; // Retorna null se inválido
         }

        let dataAtual = new Date(dataInicio);
        dataAtual.setHours(0, 0, 0, 0); // Normaliza hora
        let diasContados = 0;
        let dataFim = new Date(dataAtual); // Inicia com a data de início

        // Avança dia a dia até encontrar o 'numeroDias'-ésimo dia de leitura válido
        while (diasContados < numeroDias) {
            const diaSemanaAtual = dataAtual.getDay();
            if (periodicidade === 'diario' || (periodicidade === 'semanal' && Array.isArray(diasSemana) && diasSemana.includes(diaSemanaAtual))) {
                diasContados++;
                 // A data fim é a data do último dia contado
                 if (diasContados === numeroDias) {
                     dataFim = new Date(dataAtual);
                 }
            }

             // Avança para o próximo dia SE ainda não encontrou todos os dias
             if (diasContados < numeroDias) {
                dataAtual.setDate(dataAtual.getDate() + 1);
             }

             // Segurança contra loop infinito
             if (diasContados < numeroDias && dataAtual.getFullYear() > dataInicio.getFullYear() + 10) { // Limite de 10 anos
                 console.error("Loop infinito detectado em calcularDataFimReal. Interrompendo.");
                 return null;
             }
        }
        return dataFim;
    }



    // --- Listeners de Eventos da Interface ---

    // Botões de Autenticação
    showAuthButton.addEventListener('click', () => {
        authFormDiv.style.display = 'block';
        showAuthButton.style.display = 'none';
        cancelAuthButton.style.display = 'block';
        logoutButton.style.display = 'none'; // Esconde logout enquanto form está aberto
        emailLoginInput.focus(); // Foca no email
        atualizarVisibilidadeBotoesAcao();
    });

    cancelAuthButton.addEventListener('click', () => {
        authFormDiv.style.display = 'none';
        showAuthButton.style.display = 'block';
        cancelAuthButton.style.display = 'none';
        // O estado do logoutButton será definido pelo onAuthStateChanged/atualizarVisibilidade
        atualizarVisibilidadeBotoesAcao();
    });

    loginEmailButton.addEventListener('click', loginWithEmailPassword);
    signupEmailButton.addEventListener('click', signupWithEmailPassword);
    logoutButton.addEventListener('click', logout);
    // syncFirebaseButton não tem ação definida aqui, manter como estava

    // Botões de Navegação Principal (Novo, Início)
    novoPlanoBtn.addEventListener('click', function() {
        if (!user) {
            alert("Faça login ou cadastre-se para criar um novo plano.");
            showAuthButton.click(); // Abre o formulário de login/cadastro
            return;
        }
        cadastroPlanoSection.style.display = 'block';
        planosLeituraSection.style.display = 'none';
         inicioCadastroBtn.style.display = 'block'; // Mostra voltar
         proximasLeiturasSection.style.display = 'none'; // Esconde próximas leituras

        if (!preventFormReset) {
            formPlano.reset(); // Reseta o formulário
            planoEditandoIndex = -1; // Garante que não está editando
            formPlano.querySelector('button[type="submit"]').textContent = 'Salvar Plano'; // Texto padrão do botão
            // Garante que a seleção de período e dias da semana estejam no estado padrão
             definirPorDatasRadio.checked = true;
             periodoPorDatasDiv.style.display = 'block';
             periodoPorDiasDiv.style.display = 'none';
             periodicidadeSelect.value = 'diario';
             diasSemanaSelecao.style.display = 'none';
             document.querySelectorAll('input[name="dia-semana"]').forEach(cb => cb.checked = false);
        }
        updateRequiredAttributes(); // Atualiza campos obrigatórios
        atualizarVisibilidadeBotoesAcao(); // Atualiza botões do header
         document.getElementById('titulo-livro').focus(); // Foca no título
    });

    // Botão "Início" (visível no header quando na tela de cadastro)
    inicioBtn.addEventListener('click', function() {
        planosLeituraSection.style.display = 'block';
        cadastroPlanoSection.style.display = 'none';
        inicioCadastroBtn.style.display = 'none'; // Esconde voltar do form
        planoEditandoIndex = -1; // Reseta índice de edição ao sair do form
        formPlano.querySelector('button[type="submit"]').textContent = 'Salvar Plano'; // Garante texto padrão
        atualizarVisibilidadeBotoesAcao(); // Atualiza botões do header
        // Renderiza planos E próximas leituras ao voltar para o início
        renderizarPlanos();
    });

     // Botão "<- Início" DENTRO da seção de cadastro
     inicioCadastroBtn.addEventListener('click', function() {
         // Simula clique no botão "Início" do header
         inicioBtn.click();
     });


    // Controles do Formulário de Cadastro/Edição
    definirPorDatasRadio.addEventListener('change', function() {
        if (this.checked) {
            periodoPorDatasDiv.style.display = 'block';
            periodoPorDiasDiv.style.display = 'none';
            updateRequiredAttributes();
        }
    });

    definirPorDiasRadio.addEventListener('change', function() {
        if (this.checked) {
            periodoPorDatasDiv.style.display = 'none';
            periodoPorDiasDiv.style.display = 'block';
            updateRequiredAttributes();
        }
    });

    periodicidadeSelect.addEventListener('change', function() {
        diasSemanaSelecao.style.display = this.value === 'semanal' ? 'block' : 'none';
        // Desmarca todos os dias da semana se mudar para diário
        if (this.value === 'diario') {
            document.querySelectorAll('input[name="dia-semana"]').forEach(cb => cb.checked = false);
        }
    });

    // Submissão do formulário de plano de leitura (Criação ou Edição)
    formPlano.addEventListener('submit', function(event) {
        event.preventDefault(); // Impede envio padrão do formulário

        if (!user) {
            alert("Erro: Usuário não está logado. Não é possível salvar o plano.");
            return;
        }

        // --- Validações ---
        const titulo = document.getElementById('titulo-livro').value.trim();
        const paginaInicio = parseInt(document.getElementById('pagina-inicio').value);
        const paginaFim = parseInt(document.getElementById('pagina-fim').value);
        const linkDrive = document.getElementById('link-drive').value.trim(); // Pega o link
        const definicaoPeriodo = document.querySelector('input[name="definicao-periodo"]:checked').value;
        const periodicidade = periodicidadeSelect.value;

        // Validações básicas de campos
        if (!titulo) { alert('O título do livro é obrigatório.'); return; }
        if (isNaN(paginaInicio) || paginaInicio < 1) { alert('A página de início é inválida (deve ser >= 1).'); return; }
        if (isNaN(paginaFim) || paginaFim < paginaInicio) { alert('A página de fim é inválida (deve ser >= página de início).'); return; }

        let dataInicio, dataFim, numeroDiasInput;
        let diasPlano = [];
        let diasSemana = []; // Inicializa vazio

         // Validação específica da periodicidade semanal
         if (periodicidade === 'semanal') {
             document.querySelectorAll('input[name="dia-semana"]:checked').forEach(cb => {
                 diasSemana.push(parseInt(cb.value));
             });
             if (diasSemana.length === 0) {
                 alert('Se a periodicidade é semanal, você deve selecionar pelo menos um dia da semana.');
                 return;
             }
         }


        // Validações e obtenção de datas/dias conforme a definição do período
        if (definicaoPeriodo === 'datas') {
            const dataInicioInput = document.getElementById('data-inicio').value;
            const dataFimInput = document.getElementById('data-fim').value;
            if (!dataInicioInput || !dataFimInput) { alert('As datas de início e fim são obrigatórias para esta opção.'); return; }

            dataInicio = new Date(dataInicioInput + 'T00:00:00'); // Adiciona hora para evitar fuso
            dataFim = new Date(dataFimInput + 'T00:00:00');

            if (isNaN(dataInicio) || isNaN(dataFim)) { alert('Formato de data inválido.'); return; }
            if (dataFim < dataInicio) { alert('A data de fim não pode ser anterior à data de início.'); return; }

            diasPlano = gerarDiasPlanoPorDatas(dataInicio, dataFim, periodicidade, diasSemana);

        } else { // definicaoPeriodo === 'dias'
            const dataInicioDiasInput = document.getElementById('data-inicio-dias').value;
            numeroDiasInput = parseInt(document.getElementById('numero-dias').value);
            if (!dataInicioDiasInput) { alert('A data de início é obrigatória para esta opção.'); return; }
            if (isNaN(numeroDiasInput) || numeroDiasInput < 1) { alert('O número de dias é inválido (deve ser >= 1).'); return; }

            dataInicio = new Date(dataInicioDiasInput + 'T00:00:00'); // Adiciona hora
             if (isNaN(dataInicio)) { alert('Formato de data de início inválido.'); return; }


            diasPlano = gerarDiasPlanoPorDias(dataInicio, numeroDiasInput, periodicidade, diasSemana);
            // Calcula a data de fim real com base nos dias gerados
             if (diasPlano.length > 0) {
                dataFim = diasPlano[diasPlano.length - 1].data; // A data do último dia gerado
             } else {
                 // Se não gerou dias (ex: número dias 5, mas só selecionou domingo e período é 3 dias)
                 alert("Não foi possível gerar dias de leitura válidos com os parâmetros fornecidos. Verifique o número de dias e a periodicidade.");
                 return;
             }

             // Recalcula a data fim real baseada na periodicidade - REMOVIDO pois diasPlano já contém a data final correta
             // dataFim = calcularDataFimReal(dataInicio, numeroDiasInput, periodicidade, diasSemana);
             // if (!dataFim) {
             //     alert("Não foi possível calcular a data final com os parâmetros fornecidos.");
             //     return;
             // }
        }

        // Verifica se foram gerados dias de leitura
        if (diasPlano.length === 0) {
            alert("Nenhum dia de leitura foi gerado com as datas e periodicidade selecionadas. Verifique os dados.");
            return;
        }


        // --- Criação ou Atualização do Objeto Plano ---
        const planoData = {
            id: planoEditandoIndex !== -1 ? planos[planoEditandoIndex].id : crypto.randomUUID(), // Mantém ID se editando, cria novo se não
            titulo: titulo,
            linkDrive: linkDrive, // Adiciona o link
            paginaInicio: paginaInicio,
            paginaFim: paginaFim,
            totalPaginas: paginaFim - paginaInicio + 1,
            definicaoPeriodo: definicaoPeriodo,
            dataInicio: dataInicio,
            dataFim: dataFim, // Usar a data fim calculada/fornecida
            periodicidade: periodicidade,
            diasSemana: diasSemana, // Salva os dias selecionados (mesmo se diário, fica vazio)
            diasPlano: diasPlano, // Array de objetos de dia gerados
            paginasLidas: 0 // Começa com 0 páginas lidas (será recalculado se editando)
        };

        // Se estiver editando, preserva as páginas já lidas e recalcula
        if (planoEditandoIndex !== -1) {
             // Mantem o estado 'lido' dos dias que coincidem em data
             const diasLidosAntigosMap = new Map();
             planos[planoEditandoIndex].diasPlano.forEach(diaAntigo => {
                 if (diaAntigo.lido && diaAntigo.data instanceof Date) {
                     diasLidosAntigosMap.set(diaAntigo.data.toISOString().split('T')[0], true);
                 }
             });

             planoData.diasPlano.forEach(diaNovo => {
                 if (diaNovo.data instanceof Date) {
                     const dataStr = diaNovo.data.toISOString().split('T')[0];
                     if (diasLidosAntigosMap.has(dataStr)) {
                         diaNovo.lido = true;
                     }
                 }
             });
        }


        // Distribui as páginas pelos dias gerados
        distribuirPaginasPlano(planoData); // Passa o objeto diretamente

         // Recalcula as páginas lidas após distribuir e potentially restaurar lidos
         planoData.paginasLidas = planoData.diasPlano.reduce((sum, dia) => sum + (dia.lido ? dia.paginas : 0), 0);


        // --- Salva no Array local e no Firebase ---
        if (planoEditandoIndex !== -1) {
            // Atualiza o plano existente no array
            planos[planoEditandoIndex] = planoData;
        } else {
            // Adiciona o novo plano ao início do array (ou fim, como preferir)
            planos.unshift(planoData); // Adiciona no início para aparecer primeiro
            // planos.push(planoData); // Adiciona no fim
        }

        // Salva todos os planos no Firebase
        salvarPlanos(planos, (salvoComSucesso) => {
            if (salvoComSucesso) {
                console.log(`Plano ${planoEditandoIndex !== -1 ? 'atualizado' : 'salvo'} no Firebase.`);
                // Resetar estado de edição apenas se salvou com sucesso
                planoEditandoIndex = -1;
                formPlano.querySelector('button[type="submit"]').textContent = 'Salvar Plano';
            } else {
                console.error('Falha ao salvar plano no Firebase.');
                // Não reseta o estado de edição para o usuário poder tentar novamente
                alert("Houve um erro ao salvar o plano. Tente novamente.");
            }
            // Renderiza a lista e volta para a tela inicial, independentemente do sucesso do save
            // para que o usuário veja o resultado da sua ação (mesmo que localmente)
             // renderizarPlanos() já volta para a tela inicial via inicioBtn.click() interno
             inicioBtn.click(); // Volta para a tela de listagem (que vai chamar renderizarPlanos)
        });

    });

    // --- Inicialização ---
    initApp(); // Começa a aplicação inicializando a autenticação e carregando dados se logado

}); // Fim do DOMContentLoaded