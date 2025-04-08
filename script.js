// script.js (Completo e Corrigido com Painel de Leituras Atrasadas)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// --- Início do seu script.js ou parte relevante ---

// Função para registrar o Service Worker
function registerServiceWorker() {
  if ('serviceWorker' in navigator) { // Verifica se o navegador suporta Service Workers
    navigator.serviceWorker.register('/sw.js') // Tenta registrar o sw.js (ajuste o caminho se necessário)
      .then(registration => {
        console.log('Service Worker registrado com sucesso! Escopo:', registration.scope);
      })
      .catch(error => {
        console.error('Falha ao registrar o Service Worker:', error);
      });
  } else {
    console.log('Service Workers não são suportados neste navegador.');
  }
}

// Chama a função de registro quando a janela carregar
window.addEventListener('load', () => {
    registerServiceWorker();
    // Coloque o restante do seu código de inicialização aqui dentro se ele
    // depender do DOM estar pronto (ou mantenha-o fora se for independente)
    // Ex: initializeApp(), setupEventListeners(), etc.
});


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

    // Seleção do campo de link
    const linkDriveInput = document.getElementById('link-drive');

    // --- Seleção elementos Painéis de Leitura ---
    // Próximas Leituras
    const proximasLeiturasSection = document.getElementById('proximas-leituras-section');
    const listaProximasLeiturasDiv = document.getElementById('lista-proximas-leituras');
    const semProximasLeiturasP = document.getElementById('sem-proximas-leituras');
    // Leituras Atrasadas (NOVO)
    const leiturasAtrasadasSection = document.getElementById('leituras-atrasadas-section');
    const listaLeiturasAtrasadasDiv = document.getElementById('lista-leituras-atrasadas');
    const semLeiturasAtrasadasP = document.getElementById('sem-leituras-atrasadas');
    // --- Fim Seleção Painéis ---


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

    // Função para obter data atual normalizada (00:00:00)
    function getHojeNormalizado() {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        return hoje;
    }

    // --- *** FUNÇÃO: Determinar Status do Plano *** ---
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
        // (Verifica se existe algum dia passado não lido)
         const temDiaPassadoNaoLido = plano.diasPlano.some(dia => {
            if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                 const dataDiaNormalizada = new Date(dia.data);
                 dataDiaNormalizada.setHours(0, 0, 0, 0);
                 // É um dia ANTERIOR a hoje e não está lido?
                 return dataDiaNormalizada < hoje && !dia.lido;
            }
            return false; // Dia inválido não conta como atraso
         });

         if (temDiaPassadoNaoLido) {
             return 'atrasado';
         }

        // 4. Se não é Concluído, Próximo ou Atrasado, e está dentro do período -> "Em dia"
        if (hoje >= dataInicioPlano && hoje <= dataFimPlano) {
            return 'em_dia';
        }

        // 5. Se passou da data fim, não está concluído e não tem dias passados não lidos (estado incomum)
        // Poderia ser um plano que terminou 'em dia' mas não foi marcado como concluído?
        // Vamos considerar "Em dia" se a data fim passou mas não há atrasos pendentes.
        if (hoje > dataFimPlano && !todosLidos && !temDiaPassadoNaoLido) {
            // console.warn("Plano passado, não concluído, mas sem dias atrasados:", plano);
            return 'em_dia'; // Ou talvez 'finalizado_incompleto'? Por ora, 'em_dia' parece razoável.
        }

        // Caso não se encaixe em nenhum dos status claros (raro)
        console.warn("Plano sem status definido:", plano);
        return ''; // Retorna string vazia para não gerar tag
    }
    // --- *** FIM da Função Status *** ---


    // Função initApp
    function initApp() {
        initAuth();
    }

    // Função initAuth
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
                    renderizarPlanos(); // Renderiza tudo após carregar
                });
            } else {
                authFormDiv.style.display = 'none';
                showAuthButton.style.display = 'block';
                cancelAuthButton.style.display = 'none';
                logoutButton.style.display = 'none';
                syncFirebaseButton.style.display = 'none';
                planos = [];
                renderizarPlanos(); // Renderiza (mostrará mensagem de login)
            }
            atualizarVisibilidadeBotoesAcao(); // Ajusta botões do header
        });
    }

    // Função atualizarVisibilidadeBotoesAcao
    function atualizarVisibilidadeBotoesAcao() {
        const estaNaTelaCadastro = cadastroPlanoSection.style.display !== 'none';

        if (estaNaTelaCadastro) {
            novoPlanoBtn.style.display = 'none';
            inicioBtn.style.display = user ? 'block' : 'none';
            exportarAgendaBtn.style.display = 'none';
            showAuthButton.style.display = 'none';
            logoutButton.style.display = 'none';
            proximasLeiturasSection.style.display = 'none'; // Esconde próximas
            leiturasAtrasadasSection.style.display = 'none'; // Esconde atrasadas
        } else {
            novoPlanoBtn.style.display = user ? 'block' : 'none';
            inicioBtn.style.display = 'none';
            exportarAgendaBtn.style.display = user && planos.length > 0 ? 'block' : 'none';
            showAuthButton.style.display = user ? 'none' : 'block';
            logoutButton.style.display = user ? 'block' : 'none';
            // Visibilidade dos painéis de leitura é controlada em suas respectivas funções de renderização
        }

        // Lógica adicional para o formulário de autenticação
        if (!user && showAuthButton.style.display === 'none' && !estaNaTelaCadastro) {
           // Manter como está (formulário de auth visível)
        } else if (!user && !estaNaTelaCadastro){
             authFormDiv.style.display = 'none';
             cancelAuthButton.style.display = 'none';
        } else if (user) {
             authFormDiv.style.display = 'none';
             cancelAuthButton.style.display = 'none';
        }
    }

    // Funções loginWithEmailPassword, signupWithEmailPassword, logout
    function loginWithEmailPassword() {
        const email = emailLoginInput.value;
        const password = passwordLoginInput.value;

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                console.log('Login com email/senha bem-sucedido');
                emailLoginInput.value = '';
                passwordLoginInput.value = '';
                // onAuthStateChanged cuidará da atualização da UI
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
                // Esconde o form e mostra botão de login/cadastro novamente
                authFormDiv.style.display = 'none';
                showAuthButton.style.display = 'block';
                cancelAuthButton.style.display = 'none';
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
                // onAuthStateChanged cuidará da atualização da UI
            })
            .catch((error) => {
                console.error('Erro ao fazer logout:', error);
                alert('Erro ao fazer logout. Tente novamente.');
            });
    }

    // Função carregarPlanosSalvos
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
                // Processamento para converter strings de data de volta para objetos Date
                planosDoFirestore = planosDoFirestore.map(plano => {
                    const dataInicio = plano.dataInicio ? new Date(plano.dataInicio) : null;
                    const dataFim = plano.dataFim ? new Date(plano.dataFim) : null;
                    return {
                        ...plano,
                        linkDrive: plano.linkDrive || '', // Garante que linkDrive exista
                        dataInicio: (dataInicio && !isNaN(dataInicio)) ? dataInicio : null,
                        dataFim: (dataFim && !isNaN(dataFim)) ? dataFim : null,
                        diasPlano: plano.diasPlano ? plano.diasPlano.map(dia => ({
                            ...dia,
                            data: (dia.data && !isNaN(new Date(dia.data))) ? new Date(dia.data) : null
                        })) : []
                    };
                }).filter(plano => plano.dataInicio && plano.dataFim); // Filtra planos com datas inválidas
            } else {
                console.log("Nenhum documento de usuário encontrado. Criando um novo.");
                // Cria o documento inicial se não existir
                await setDoc(docRef, { planos: [] });
            }
            console.log('Planos carregados do Firestore:', planosDoFirestore);
            if (callback) callback(planosDoFirestore);
        } catch (error) {
            console.error('Erro ao carregar planos do Firestore:', error);
            alert('Erro ao carregar planos. Verifique sua conexão e tente novamente.');
            if (callback) callback([]); // Retorna array vazio em caso de erro
        }
    }

    // Função salvarPlanos
    async function salvarPlanos(planosParaSalvar, callback) {
        if (!user) {
            console.error('Usuário não logado, não é possível salvar.');
            if (callback) callback(false);
            return;
        }
        const userId = user.uid;
        const docRef = doc(db, 'users', userId);
        // Prepara os dados para o Firestore (converte Date para ISOString)
        const planosParaFirestore = planosParaSalvar.map(plano => {
            const linkDrive = typeof plano.linkDrive === 'string' ? plano.linkDrive : '';
            return {
                ...plano,
                linkDrive: linkDrive, // Garante que linkDrive seja string
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

    // Função updateRequiredAttributes (Gerencia campos obrigatórios do form)
    function updateRequiredAttributes() {
        if (definirPorDatasRadio.checked) {
            dataInicio.required = true;
            dataFim.required = true;
            dataInicioDias.required = false;
            numeroDias.required = false;
        } else { // definirPorDiasRadio.checked
            dataInicio.required = false;
            dataFim.required = false;
            dataInicioDias.required = true;
            numeroDias.required = true;
        }
        // Link do drive nunca é obrigatório
        linkDriveInput.required = false;
    }
    // Chama uma vez para configurar no carregamento inicial
    updateRequiredAttributes();

    // --- *** NOVA FUNÇÃO: Renderizar Leituras Atrasadas *** ---
    function renderizarLeiturasAtrasadas() {
        leiturasAtrasadasSection.style.display = 'none'; // Esconde por padrão
        if (!user || !planos || planos.length === 0) {
            return; // Sai se não houver usuário ou planos
        }

        const hoje = getHojeNormalizado(); // Pega a data de hoje (00:00:00)
        const todasLeiturasAtrasadas = [];

        planos.forEach((plano, planoIndex) => {
            // Considera apenas planos que não estão concluídos
            if (plano.diasPlano && plano.diasPlano.length > 0 && determinarStatusPlano(plano) !== 'concluido') {
                plano.diasPlano.forEach((dia, diaIndex) => {
                    // Verifica se a data do dia é válida
                    if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                        const dataDiaNormalizada = new Date(dia.data);
                        dataDiaNormalizada.setHours(0, 0, 0, 0); // Normaliza a data do dia

                        // Condição: Data anterior a hoje E não está marcado como lido
                        if (dataDiaNormalizada < hoje && !dia.lido) {
                            todasLeiturasAtrasadas.push({
                                data: dia.data,
                                titulo: plano.titulo,
                                paginasTexto: `Pgs ${dia.paginaInicioDia}-${dia.paginaFimDia} (${dia.paginas})`,
                            });
                        }
                    }
                });
            }
        });

        // Ordena as leituras atrasadas pela data, da mais antiga para a mais recente
        todasLeiturasAtrasadas.sort((a, b) => a.data - b.data);

        // Pega apenas as 3 mais antigas (ou menos, se houver menos)
        const leiturasAtrasadasParaMostrar = todasLeiturasAtrasadas.slice(0, 3);

        // Limpa a lista atual
        listaLeiturasAtrasadasDiv.innerHTML = '';

        // Verifica se há leituras atrasadas para mostrar
        if (leiturasAtrasadasParaMostrar.length > 0) {
            leiturasAtrasadasSection.style.display = 'block'; // Mostra a seção
            semLeiturasAtrasadasP.style.display = 'none';     // Esconde a mensagem "sem atrasos"

            leiturasAtrasadasParaMostrar.forEach(leitura => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('leitura-atrasada-item'); // Usa a classe CSS correta
                const dataFormatada = leitura.data.toLocaleDateString('pt-BR', {
                     weekday: 'short', month: 'short', day: 'numeric'
                });
                itemDiv.innerHTML = `
                    <span class="leitura-atrasada-data">${dataFormatada}</span>
                    <span class="leitura-atrasada-titulo">${leitura.titulo}</span>
                    <span class="leitura-atrasada-paginas">${leitura.paginasTexto}</span>
                `;
                listaLeiturasAtrasadasDiv.appendChild(itemDiv);
            });
        }
        // Se não houver itens, a seção permanece oculta (display = 'none' no início da função)
    }
    // --- *** FIM da Nova Função *** ---

    // --- *** FUNÇÃO: Renderizar Próximas Leituras *** ---
    function renderizarProximasLeituras() {
        proximasLeiturasSection.style.display = 'none'; // Esconde por padrão
        if (!user || !planos || planos.length === 0) {
            return; // Sai se não houver usuário ou planos
        }
        const hoje = getHojeNormalizado();
        const todasLeiturasFuturas = [];
        planos.forEach((plano, planoIndex) => {
            // Considera planos não concluídos
            if (plano.diasPlano && plano.diasPlano.length > 0 && determinarStatusPlano(plano) !== 'concluido') {
                plano.diasPlano.forEach((dia, diaIndex) => {
                    if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                        const dataDiaNormalizada = new Date(dia.data);
                        dataDiaNormalizada.setHours(0,0,0,0);
                        // Condição: Data igual ou posterior a hoje E não está lido
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
        // Ordena as futuras pela data, da mais próxima para a mais distante
        todasLeiturasFuturas.sort((a, b) => a.data - b.data);
        const proximas3Leituras = todasLeiturasFuturas.slice(0, 3);
        listaProximasLeiturasDiv.innerHTML = '';
        if (proximas3Leituras.length > 0) {
            proximasLeiturasSection.style.display = 'block'; // Mostra seção
            semProximasLeiturasP.style.display = 'none'; // Esconde mensagem 'sem próximas'
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
             // Se não há próximas, opcionalmente mostra a mensagem dentro da seção (ou mantém oculta)
             proximasLeiturasSection.style.display = 'block'; // Mantém a seção visível
             semProximasLeiturasP.style.display = 'block';   // Mostra a mensagem
             // OU: proximasLeiturasSection.style.display = 'none'; // Para esconder tudo
        }
    }
    // --- *** FIM Função Próximas Leituras *** ---


    // *** FUNÇÃO renderizarPlanos (Principal) ***
    function renderizarPlanos() {
        // Limpa conteúdo anterior e oculta painéis
        paginadorPlanosDiv.innerHTML = '';
        listaPlanos.innerHTML = '';
        proximasLeiturasSection.style.display = 'none';
        leiturasAtrasadasSection.style.display = 'none';

        // Verifica estado de login
        if (!user) {
            listaPlanos.innerHTML = '<p>Faça login ou cadastre-se para gerenciar seus planos de leitura.</p>';
            atualizarVisibilidadeBotoesAcao(); // Ajusta botões header
            renderizarLeiturasAtrasadas(); // Garante que painel atrasadas esteja oculto
            renderizarProximasLeituras(); // Garante que painel próximas esteja oculto
            return;
        }

        // Verifica se há planos
        if (planos.length === 0) {
            listaPlanos.innerHTML = '<p>Nenhum plano de leitura cadastrado ainda. Clique em "Novo" para começar!</p>';
            atualizarVisibilidadeBotoesAcao();
            togglePaginatorVisibility(); // Ajusta visibilidade paginador
            renderizarLeiturasAtrasadas(); // Garante ocultação
            renderizarProximasLeituras(); // Garante ocultação
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

        // Renderiza Cards dos Planos
        planos.forEach((plano, index) => {
            const progressoPercentual = plano.totalPaginas > 0 ? (plano.paginasLidas / plano.totalPaginas) * 100 : 0;
            const status = determinarStatusPlano(plano);
            let statusText = '';
            let statusClass = '';
            switch (status) {
                case 'proximo': statusText = 'Próximo'; statusClass = 'status-proximo'; break;
                case 'em_dia': statusText = 'Em dia'; statusClass = 'status-em-dia'; break;
                case 'atrasado': statusText = 'Atrasado'; statusClass = 'status-atrasado'; break;
                case 'concluido': statusText = 'Concluído'; statusClass = 'status-concluido'; break;
            }
            const statusTagHTML = statusText ? `<span class="status-tag ${statusClass}">${statusText}</span>` : '';

            const diasAtrasados = (status === 'atrasado') ? verificarAtraso(plano) : 0;
            const avisoAtrasoHTML = (status === 'atrasado' && diasAtrasados > 0) ? `
                <div class="aviso-atraso" id="aviso-atraso-${index}">
                    <p>⚠️ Plano com atraso de ${diasAtrasados} dia(s)!</p>
                    <div class="acoes-dados">
                        <button onclick="mostrarOpcoesRecalculo(${index})">Recalcular Plano</button>
                    </div>
                </div>` : '';

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
            if (statusClass) {
                planoDiv.classList.add(statusClass.replace('status-','card-')); // Adiciona classe card-*
            }
            planoDiv.id = `plano-${index}`;
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
            listaPlanos.appendChild(planoDiv);
        });

        // Atualiza visibilidade e RENDERIZA PAINÉIS (Atrasadas e Próximas)
        atualizarVisibilidadeBotoesAcao();
        togglePaginatorVisibility();
        renderizarLeiturasAtrasadas();  // <-- Renderiza Atrasadas PRIMEIRO
        renderizarProximasLeituras();   // <-- Renderiza Próximas DEPOIS
    }


    // Função verificarAtraso (Conta dias passados não lidos)
    function verificarAtraso(plano) {
        const hoje = getHojeNormalizado();
        if (!plano || !plano.diasPlano || plano.diasPlano.length === 0) {
            return 0;
        }
        return plano.diasPlano.reduce((count, dia) => {
             if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                const dataDiaNormalizada = new Date(dia.data);
                dataDiaNormalizada.setHours(0, 0, 0, 0);
                if (dataDiaNormalizada < hoje && !dia.lido) {
                    return count + 1;
                }
            }
            return count;
        }, 0);
    }


    // Função renderizarDiasLeitura (HTML para a lista de dias dentro do card)
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


    // Função marcarDiaLido (Chamada pelo onchange do checkbox)
    window.marcarDiaLido = function(planoIndex, diaIndex, lido) {
        if (planos[planoIndex] && planos[planoIndex].diasPlano && planos[planoIndex].diasPlano[diaIndex]) {
            planos[planoIndex].diasPlano[diaIndex].lido = lido;
            atualizarPaginasLidas(planoIndex); // Recalcula progresso
            salvarPlanos(planos, (salvoComSucesso) => {
                if (salvoComSucesso) {
                    console.log('Progresso salvo no Firebase.');
                } else {
                    console.error('Falha ao salvar progresso no Firebase.');
                    // Considerar reverter a mudança na UI ou alertar o usuário
                }
                // Re-renderiza tudo para atualizar status, progresso e painéis
                renderizarPlanos();
            });
        } else {
            console.error("Índice de plano ou dia inválido para marcar como lido.");
        }
    };


    // Função atualizarPaginasLidas (Calcula o total de páginas lidas para um plano)
    function atualizarPaginasLidas(planoIndex) {
        if (planos[planoIndex] && planos[planoIndex].diasPlano) {
            planos[planoIndex].paginasLidas = planos[planoIndex].diasPlano.reduce((sum, dia) => {
                // Soma apenas se 'lido' for true e 'paginas' for um número válido > 0
                return sum + (dia.lido && typeof dia.paginas === 'number' && dia.paginas > 0 ? dia.paginas : 0);
            }, 0);
        } else {
            console.error("Plano inválido para atualizar páginas lidas.");
            if(planos[planoIndex]) planos[planoIndex].paginasLidas = 0; // Reseta se o plano existe mas dias não
        }
    }


    // Função editarPlano (Preenche o formulário para edição)
    window.editarPlano = function(index) {
        if (index < 0 || index >= planos.length) {
            console.error("Índice de plano inválido para edição:", index); return;
        }
        planoEditandoIndex = index;
        preventFormReset = true; // Impede reset temporário
        cadastroPlanoSection.style.display = 'block';
        planosLeituraSection.style.display = 'none';
        leiturasAtrasadasSection.style.display = 'none'; // Esconde painéis
        proximasLeiturasSection.style.display = 'none';
        atualizarVisibilidadeBotoesAcao();
        inicioCadastroBtn.style.display = 'block';

        const plano = planos[index];
        document.getElementById('titulo-livro').value = plano.titulo || '';
        document.getElementById('link-drive').value = plano.linkDrive || '';
        document.getElementById('pagina-inicio').value = plano.paginaInicio || '';
        document.getElementById('pagina-fim').value = plano.paginaFim || '';

        // Preenche a seção correta de datas/dias
        if (plano.definicaoPeriodo === 'dias') {
            definirPorDiasRadio.checked = true;
            periodoPorDatasDiv.style.display = 'none';
            periodoPorDiasDiv.style.display = 'block';
            // Garante que dataInicio seja Date antes de atribuir a valueAsDate
             if (plano.dataInicio instanceof Date && !isNaN(plano.dataInicio)) {
                 document.getElementById('data-inicio-dias').valueAsDate = plano.dataInicio;
             } else {
                 document.getElementById('data-inicio-dias').value = ''; // Limpa se inválido
             }
            // Calcula número de dias do array diasPlano (mais confiável que um campo salvo)
            const numDias = plano.diasPlano ? plano.diasPlano.length : '';
            document.getElementById('numero-dias').value = numDias;
        } else { // 'datas' ou padrão
            definirPorDatasRadio.checked = true;
            periodoPorDatasDiv.style.display = 'block';
            periodoPorDiasDiv.style.display = 'none';
             if (plano.dataInicio instanceof Date && !isNaN(plano.dataInicio)) {
                document.getElementById('data-inicio').valueAsDate = plano.dataInicio;
             } else {
                 document.getElementById('data-inicio').value = '';
             }
             if (plano.dataFim instanceof Date && !isNaN(plano.dataFim)) {
                document.getElementById('data-fim').valueAsDate = plano.dataFim;
             } else {
                 document.getElementById('data-fim').value = '';
             }
        }

        // Preenche periodicidade e dias da semana
        periodicidadeSelect.value = plano.periodicidade || 'diario';
        diasSemanaSelecao.style.display = periodicidadeSelect.value === 'semanal' ? 'block' : 'none';
        document.querySelectorAll('input[name="dia-semana"]').forEach(cb => cb.checked = false); // Limpa primeiro
        if (plano.periodicidade === 'semanal' && Array.isArray(plano.diasSemana)) {
            document.querySelectorAll('input[name="dia-semana"]').forEach(cb => {
                // Compara o valor (string) do checkbox com os números no array
                cb.checked = plano.diasSemana.includes(parseInt(cb.value));
            });
        }

        formPlano.querySelector('button[type="submit"]').textContent = 'Atualizar Plano';
        updateRequiredAttributes(); // Atualiza campos required
        cadastroPlanoSection.scrollIntoView({ behavior: 'smooth' });
        preventFormReset = false; // Libera o reset para próximas ações
    };

    // Função editarLinkDrive (Abre prompt para editar/adicionar link)
    window.editarLinkDrive = function(index) {
        if (index < 0 || index >= planos.length) {
            console.error("Índice de plano inválido para editar link:", index); return;
        }
        const plano = planos[index];
        const linkAtual = plano.linkDrive || '';
        const novoLink = prompt(`Editar Link de Anotações para "${plano.titulo}":\n(Deixe em branco para remover)`, linkAtual);

        // Só atualiza se o usuário não clicou em "Cancelar" (null)
        if (novoLink !== null) {
            planos[index].linkDrive = novoLink.trim(); // Atualiza o link (remove espaços extras)
            salvarPlanos(planos, (salvoComSucesso) => {
                if (salvoComSucesso) {
                    console.log('Link atualizado e salvo no Firebase.');
                } else {
                    console.error('Falha ao salvar atualização do link no Firebase.');
                    // Considerar reverter a mudança local ou alertar
                }
                renderizarPlanos(); // Re-renderiza para mostrar o link atualizado
            });
        }
    };

    // Funções de Recálculo (mostrarOpcoesRecalculo, fecharAvisoRecalculo, solicitarNovaDataFim, solicitarPaginasPorDia)
    window.mostrarOpcoesRecalculo = function(index) {
        const avisoAtrasoDiv = document.getElementById(`aviso-atraso-${index}`);
        if (!avisoAtrasoDiv) return;
        // Mostra opções de recálculo
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
        // Reverifica se ainda está atrasado antes de restaurar o aviso padrão
        const diasAtrasados = verificarAtraso(plano);
        if(determinarStatusPlano(plano) === 'atrasado' && diasAtrasados > 0) {
            avisoAtrasoDiv.innerHTML = `
                <p>⚠️ Plano com atraso de ${diasAtrasados} dia(s)!</p>
                <div class="acoes-dados">
                    <button onclick="mostrarOpcoesRecalculo(${index})">Recalcular Plano</button>
                </div>`;
        } else {
            // Se não está mais atrasado (ou não existe mais), remove o aviso
            avisoAtrasoDiv.remove();
            // Pode ser necessário re-renderizar o plano se o status mudou
            // renderizarPlanos(); // Descomente se necessário
        }
    };
    window.solicitarNovaDataFim = function(index) {
        const hojeStr = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
        const novaDataFimInput = prompt(`Recalcular definindo Nova Data de Fim:\n\nDigite a nova data limite (YYYY-MM-DD, após ${hojeStr}):`);
        if (novaDataFimInput) { // Verifica se o usuário digitou algo e não cancelou
            try {
                // Adiciona T00:00:00 para evitar problemas de fuso horário ao criar o Date
                const novaDataFim = new Date(novaDataFimInput + 'T00:00:00');
                if (isNaN(novaDataFim.getTime())) {
                    throw new Error("Data inválida."); // Lança erro se a data não for válida
                }
                const hoje = getHojeNormalizado();
                if (novaDataFim <= hoje) {
                     alert("A nova data de fim deve ser posterior à data de hoje.");
                     mostrarOpcoesRecalculo(index); // Volta para as opções
                     return;
                }
                // Chama a função de recálculo principal
                recalcularPlanoNovaData(index, novaDataFim);
            } catch (e) {
                 alert("Erro ao processar a data. Use o formato YYYY-MM-DD.");
                 mostrarOpcoesRecalculo(index); // Volta para as opções
            }
        } else {
             // Se o usuário cancelou o prompt, volta para as opções
             mostrarOpcoesRecalculo(index);
        }
    };
     window.solicitarPaginasPorDia = function(index) {
        const paginasPorDiaInput = prompt("Recalcular definindo Páginas por Dia:\n\nDigite o número de páginas que você quer ler por dia a partir de agora:");
        if (paginasPorDiaInput) { // Verifica se o usuário digitou algo
            const paginasPorDia = parseInt(paginasPorDiaInput);
            if (isNaN(paginasPorDia) || paginasPorDia <= 0) {
                alert("Insira um número válido de páginas por dia (maior que zero).");
                mostrarOpcoesRecalculo(index);
                return;
            }
             const plano = planos[index];
             const paginasRestantes = (plano.totalPaginas || 0) - (plano.paginasLidas || 0);
             if (paginasRestantes <= 0) {
                 alert("Não há páginas restantes para ler neste plano.");
                 fecharAvisoRecalculo(index); // Fecha o aviso, pois não há o que recalcular
                 return;
             }
            // Chama a função que calcula a data fim e depois recalcula
            recalcularPlanoPaginasPorDia(index, paginasPorDia);
        } else {
             // Se cancelou, volta para as opções
             mostrarOpcoesRecalculo(index);
        }
    };


    // Função calcularNovaDataFimPorPaginasDia (Helper para recalculo por páginas/dia)
    function calcularNovaDataFimPorPaginasDia(plano, paginasPorDia) {
        const paginasRestantes = (plano.totalPaginas || 0) - (plano.paginasLidas || 0);
         if (paginasRestantes <= 0 || paginasPorDia <= 0) { return null; } // Não há o que calcular

        let proximoDiaLeitura = getHojeNormalizado(); // Começa a calcular a partir de hoje
        const diasSemanaPlano = Array.isArray(plano.diasSemana) ? plano.diasSemana : [];
        const periodicidadePlano = plano.periodicidade || 'diario';

        // Função interna para verificar se um dia é válido para leitura
        const isDiaValido = (data) => {
             const diaSem = data.getDay(); // 0=Domingo, 1=Segunda...
             return periodicidadePlano === 'diario' || (periodicidadePlano === 'semanal' && diasSemanaPlano.includes(diaSem));
        };

         // Avança até o primeiro dia válido a partir de hoje (inclusive)
         while (!isDiaValido(proximoDiaLeitura)) {
             proximoDiaLeitura.setDate(proximoDiaLeitura.getDate() + 1);
         }

        // Calcula quantos dias de leitura serão necessários
        const diasLeituraNecessarios = Math.ceil(paginasRestantes / paginasPorDia);

        let dataFimCalculada = new Date(proximoDiaLeitura); // Começa a contar do primeiro dia válido
        let diasLeituraContados = 0;
        let safetyCounter = 0; // Evita loops infinitos
        const MAX_ITERATIONS = 10000; // Limite seguro

        // Loop para encontrar a data do último dia de leitura
        while(diasLeituraContados < diasLeituraNecessarios && safetyCounter < MAX_ITERATIONS) {
             if (isDiaValido(dataFimCalculada)) {
                 diasLeituraContados++; // Conta apenas os dias válidos
             }
             // Se ainda não atingiu o número necessário de dias, avança para o próximo dia
             if (diasLeituraContados < diasLeituraNecessarios) {
                 dataFimCalculada.setDate(dataFimCalculada.getDate() + 1);
             }
             safetyCounter++;
             if(safetyCounter >= MAX_ITERATIONS) {
                 console.error("Loop break em calcularNovaDataFimPorPaginasDia. Verifique a lógica ou periodicidade.");
                 return null; // Retorna null em caso de erro/loop
             }
        }

        // Retorna a data final encontrada
        return dataFimCalculada;
    }

    // Função recalcularPlanoPaginasPorDia (Usa a data calculada para chamar o recálculo principal)
    window.recalcularPlanoPaginasPorDia = function(index, paginasPorDia) {
        const plano = planos[index];
        const novaDataFim = calcularNovaDataFimPorPaginasDia(plano, paginasPorDia);

        if (!novaDataFim) {
             alert("Não foi possível calcular a nova data de fim. Verifique a periodicidade do plano.");
             mostrarOpcoesRecalculo(index);
             return;
         }
        // Usa a data calculada para chamar a função de recálculo por data
        recalcularPlanoNovaData(index, novaDataFim);
    };

     // Função recalcularPlanoNovaData (Lógica principal de recálculo)
    function recalcularPlanoNovaData(index, novaDataFim) {
        const planoOriginal = planos[index];
        const paginasLidas = planoOriginal.paginasLidas || 0;
        // A página onde o recálculo começa é a primeira página não lida
        const paginaInicioRecalculo = (planoOriginal.paginaInicio || 1) + paginasLidas;
        const paginasRestantes = (planoOriginal.totalPaginas || 0) - paginasLidas;

        // Verifica se ainda há páginas para ler
        if (paginasRestantes <= 0) {
            alert("Todas as páginas já foram lidas ou não há páginas restantes.");
            fecharAvisoRecalculo(index);
            return;
        }

        let dataInicioRecalculo = getHojeNormalizado(); // Recálculo começa a partir de hoje
        const diasSemanaPlano = Array.isArray(planoOriginal.diasSemana) ? planoOriginal.diasSemana : [];
        const periodicidadePlano = planoOriginal.periodicidade || 'diario';

        // Função para verificar se o dia é válido para leitura
        const isDiaValido = (data) => {
             const diaSem = data.getDay();
             return periodicidadePlano === 'diario' || (periodicidadePlano === 'semanal' && diasSemanaPlano.includes(diaSem));
         };

         // Encontra o primeiro dia válido a partir de hoje (inclusive)
         while (!isDiaValido(dataInicioRecalculo)) {
             dataInicioRecalculo.setDate(dataInicioRecalculo.getDate() + 1);
         }

         // Validação adicional da data fim em relação ao início do recálculo
         if (novaDataFim < dataInicioRecalculo) {
             alert("A nova data de fim (" + novaDataFim.toLocaleDateString('pt-BR') + ") não pode ser anterior ao próximo dia de leitura válido (" + dataInicioRecalculo.toLocaleDateString('pt-BR') + ").");
             mostrarOpcoesRecalculo(index); // Volta para opções
             return;
         }

        // Gera a lista de novos dias de leitura válidos no período recalculado
        const novosDiasLeitura = [];
        let dataAtual = new Date(dataInicioRecalculo); // Começa do primeiro dia válido
        while (dataAtual <= novaDataFim) {
            if (isDiaValido(dataAtual)) {
                // Adiciona apenas os dias válidos, zerando páginas e lido
                novosDiasLeitura.push({ data: new Date(dataAtual), paginaInicioDia: 0, paginaFimDia: 0, paginas: 0, lido: false });
            }
            dataAtual.setDate(dataAtual.getDate() + 1); // Avança para o próximo dia
        }

        // Verifica se foram gerados dias válidos
        if (novosDiasLeitura.length === 0) {
            alert("Não há dias de leitura válidos entre "+ dataInicioRecalculo.toLocaleDateString('pt-BR') +" e "+ novaDataFim.toLocaleDateString('pt-BR') +" com a periodicidade selecionada.");
            mostrarOpcoesRecalculo(index);
            return;
        }

        // Distribui as páginas restantes entre os novos dias gerados
        const numNovosDias = novosDiasLeitura.length;
        const paginasPorDiaBase = Math.floor(paginasRestantes / numNovosDias);
        const paginasExtras = paginasRestantes % numNovosDias; // Páginas que sobram da divisão
        let paginaAtualRecalculo = paginaInicioRecalculo; // Página onde começa a distribuição

        novosDiasLeitura.forEach((dia, idx) => {
            // Calcula quantas páginas para este dia (base + extra se houver)
            let paginasNesteDia = paginasPorDiaBase + (idx < paginasExtras ? 1 : 0);
            dia.paginaInicioDia = paginaAtualRecalculo;
            dia.paginaFimDia = paginaAtualRecalculo + paginasNesteDia - 1;

             // Garante que a página final do dia não ultrapasse a página final do livro
             if(dia.paginaFimDia > planoOriginal.paginaFim) {
                 dia.paginaFimDia = planoOriginal.paginaFim;
             }
             // Recalcula o número de páginas para o dia, garantindo não ser negativo
             dia.paginas = Math.max(0, dia.paginaFimDia - dia.paginaInicioDia + 1);

            // Atualiza a página atual para o próximo dia
            paginaAtualRecalculo = dia.paginaFimDia + 1;
        });

         // Ajuste final (raro, mas por segurança): Garante que a última página do último dia seja a página fim do livro
         const ultimoDiaNovo = novosDiasLeitura[numNovosDias - 1];
         if (ultimoDiaNovo.paginaFimDia < planoOriginal.paginaFim && paginaAtualRecalculo <= planoOriginal.paginaFim) {
            console.warn(`Ajustando pág final recalculada no último dia de ${ultimoDiaNovo.paginaFimDia} para ${planoOriginal.paginaFim}`);
             ultimoDiaNovo.paginaFimDia = planoOriginal.paginaFim;
             ultimoDiaNovo.paginas = Math.max(0, ultimoDiaNovo.paginaFimDia - ultimoDiaNovo.paginaInicioDia + 1);
         } else if (ultimoDiaNovo.paginaFimDia > planoOriginal.paginaFim) {
             // Caso tenha ultrapassado por algum erro de cálculo (não deveria)
             ultimoDiaNovo.paginaFimDia = planoOriginal.paginaFim;
             ultimoDiaNovo.paginas = Math.max(0, ultimoDiaNovo.paginaFimDia - ultimoDiaNovo.paginaInicioDia + 1);
         }


        // Combina os dias que já foram lidos com os novos dias recalculados
        const diasLidosOriginais = planoOriginal.diasPlano.filter(dia => dia.lido);
        // Sobrescreve o array diasPlano com a nova combinação, ordenada por data
        planos[index].diasPlano = [...diasLidosOriginais, ...novosDiasLeitura].sort((a, b) => a.data - b.data);
        // Atualiza a data fim do plano
        planos[index].dataFim = novaDataFim;
        // Reconfirma o total de páginas lidas (não deve mudar, mas é seguro)
        atualizarPaginasLidas(index);

        // Salva as alterações e re-renderiza a interface
        salvarPlanos(planos, (salvoComSucesso) => {
            if (salvoComSucesso) console.log("Plano recalculado e salvo.");
            else console.error("Erro ao salvar plano recalculado.");
            renderizarPlanos(); // Atualiza a UI
        });
    }

    // Função excluirPlano
    window.excluirPlano = function(index) {
        if (index < 0 || index >= planos.length) {
            console.error("Índice inválido para exclusão:", index); return;
        }
        const plano = planos[index];
        if (confirm(`Tem certeza que deseja excluir o plano "${plano.titulo}"? Esta ação não pode ser desfeita.`)) {
            planos.splice(index, 1); // Remove o plano do array local
            salvarPlanos(planos, (salvoComSucesso) => {
                if (!salvoComSucesso) {
                    console.error('Falha ao salvar exclusão no Firebase.');
                    // Considerar adicionar o plano de volta ao array local ou alertar o usuário
                }
                renderizarPlanos(); // Atualiza a UI após a exclusão (ou tentativa)
            });
        }
    };

    // Função exportarAgendaBtn listener e exportarParaAgenda
    exportarAgendaBtn.addEventListener('click', () => {
        if (!user || planos.length === 0) {
            alert("Você precisa estar logado e ter planos cadastrados para exportar."); return;
        }
        let promptMessage = "Digite o número do plano para exportar para a agenda:\n\n";
        planos.forEach((plano, index) => { promptMessage += `${index + 1}. ${plano.titulo}\n`; });
        const planoIndexInput = prompt(promptMessage);
        if (planoIndexInput === null) { return; } // Usuário cancelou
        const planoIndex = parseInt(planoIndexInput) - 1;
        if (isNaN(planoIndex) || planoIndex < 0 || planoIndex >= planos.length) {
            alert("Número de plano inválido."); return;
        }
        // Verifica se o plano selecionado tem dias definidos
        if (!planos[planoIndex].diasPlano || planos[planoIndex].diasPlano.length === 0) {
             alert(`O plano "${planos[planoIndex].titulo}" não possui dias de leitura definidos e não pode ser exportado.`); return;
         }
        exportarParaAgenda(planos[planoIndex]); // Chama a função de exportação
    });
    function exportarParaAgenda(plano) {
        const horarioInicio = prompt(`Exportar "${plano.titulo}" para Agenda:\n\nDefina o horário de início da leitura (HH:MM):`, "09:00");
        if (!horarioInicio) return; // Cancelou
        const horarioFim = prompt(`Defina o horário de fim da leitura (HH:MM):`, "09:30");
        if (!horarioFim) return; // Cancelou
        // Validação simples do formato HH:MM
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(horarioInicio) || !timeRegex.test(horarioFim)) {
            alert("Formato de horário inválido. Use HH:MM (ex: 08:00, 14:30)."); return;
        }
        try {
            const eventosICS = gerarICS(plano, horarioInicio, horarioFim); // Gera o conteúdo ICS
            downloadICSFile(eventosICS, plano.titulo); // Inicia o download
        } catch (error) {
             console.error("Erro ao gerar ou baixar arquivo ICS:", error);
             alert("Ocorreu um erro ao gerar o arquivo da agenda: " + error.message);
        }
    }

    // Função gerarICS (Cria o conteúdo do arquivo .ics)
    function gerarICS(plano, horarioInicio, horarioFim) {
         // Validação robusta dos dados do plano necessários para o ICS
         if (!plano || !plano.diasPlano || plano.diasPlano.length === 0 ||
             !plano.dataInicio || !plano.dataFim ||
             !(plano.dataInicio instanceof Date) || !(plano.dataFim instanceof Date) ||
             isNaN(plano.dataInicio) || isNaN(plano.dataFim)) {
            throw new Error("Dados do plano incompletos ou inválidos para gerar o arquivo da agenda.");
        }
         // Cria um ID único para o evento recorrente (ou usa um existente se já tiver)
         if (!plano.id) plano.id = crypto.randomUUID(); // Garante que o plano tenha um ID
         const uidEvento = `${plano.id.replace(/[^a-z0-9]/gi, '')}@gerenciador-planos-leitura.app`; // ID único para o evento
         const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split('.')[0] + "Z"; // Timestamp de criação do evento (UTC)

         // Formata data e hora local para o padrão ICS (YYYYMMDDTHHMMSS)
         const formatICSDate = (date, time) => {
            if (!(date instanceof Date) || isNaN(date)) throw new Error("Data inválida no formatICSDate");
            const [year, month, day] = [date.getFullYear(), (date.getMonth() + 1).toString().padStart(2, '0'), date.getDate().toString().padStart(2, '0')];
            const [hour, minute] = time.split(':');
            return `${year}${month}${day}T${hour}${minute}00`; // Adiciona segundos como 00
         };

         // Formata a data final da recorrência (UNTIL) para UTC (YYYYMMDDTHHMMSSZ)
         // Usa o FIM do dia para garantir que o último dia seja incluído
         const formatICSDateUTCUntil = (date) => {
             if (!(date instanceof Date) || isNaN(date)) throw new Error("Data inválida no formatICSDateUTCUntil");
             // Cria uma nova data para não modificar a original
             const dateUtc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59));
             const year = dateUtc.getUTCFullYear();
             const month = (dateUtc.getUTCMonth() + 1).toString().padStart(2, '0');
             const day = dateUtc.getUTCDate().toString().padStart(2, '0');
             return `${year}${month}${day}T235959Z`; // Fim do dia em UTC
         };

        // Cabeçalho do arquivo VCALENDAR
        let icsString = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//GerenciadorPlanosLeitura//SeuNomeOuApp//PT\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n`;

        // Encontra o primeiro dia de leitura válido para definir o DTSTART
        let primeiroDiaLeituraValido = null;
        for(const dia of plano.diasPlano) {
             if (dia.data instanceof Date && !isNaN(dia.data)) {
                 primeiroDiaLeituraValido = dia.data;
                 break; // Encontrou o primeiro, pode parar
             }
        }
        // Se nenhum dia válido foi encontrado (não deveria acontecer se passou na validação inicial)
        if(!primeiroDiaLeituraValido) throw new Error("Nenhum dia de leitura válido encontrado no plano.");

        // Início do evento VEVENT
        icsString += `BEGIN:VEVENT\r\n`;
        icsString += `UID:${uidEvento}\r\n`; // Identificador único do evento
        icsString += `DTSTAMP:${dtstamp}\r\n`; // Data/Hora de criação do evento

        // Define o início (DTSTART) e fim (DTEND) do PRIMEIRO evento da recorrência
        // Usando horário local (sem TZID para maior compatibilidade, considerado "flutuante")
        icsString += `DTSTART:${formatICSDate(primeiroDiaLeituraValido, horarioInicio)}\r\n`;
        icsString += `DTEND:${formatICSDate(primeiroDiaLeituraValido, horarioFim)}\r\n`;

        // Define a regra de recorrência (RRULE)
        let rrule = 'RRULE:FREQ=';
        if (plano.periodicidade === 'diario') {
            rrule += 'DAILY'; // Repete diariamente
        } else if (plano.periodicidade === 'semanal' && Array.isArray(plano.diasSemana) && plano.diasSemana.length > 0) {
            rrule += 'WEEKLY'; // Repete semanalmente
            // Mapeia os números dos dias (0-6) para as abreviações ICS (SU,MO,TU,WE,TH,FR,SA)
            const diasSemanaICS = plano.diasSemana.sort().map(diaIndex => ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][diaIndex]).join(',');
            rrule += `;BYDAY=${diasSemanaICS}`; // Nos dias especificados
        } else {
             // Fallback para diário se a periodicidade for inválida (ou semanal sem dias)
             console.warn("Periodicidade inválida ou semanal sem dias para RRULE. Usando DAILY como fallback.");
             rrule += 'DAILY';
        }

         // Define a data final da recorrência (UNTIL) usando a data fim do plano (formato UTC)
         rrule += `;UNTIL=${formatICSDateUTCUntil(plano.dataFim)}`;
         icsString += `${rrule}\r\n`; // Adiciona a regra de recorrência completa

        // Descrição do evento (DESCRIPTION)
        // Usa \\n para quebras de linha dentro da descrição no formato ICS
        let description = `Plano de Leitura: ${plano.titulo}.\\n`;
        description += `Páginas do Plano: ${plano.paginaInicio}-${plano.paginaFim}.\\n`;
        description += `Período Total: ${plano.dataInicio.toLocaleDateString('pt-BR')} a ${plano.dataFim.toLocaleDateString('pt-BR')}.\\n\\n`;
        description += `Lembrete: Verifique no aplicativo as páginas exatas para o dia.\\n`;
        description += `Acesse o app: https://fernnog.github.io/Plano-leitura-livros/`; // Link para o app
        // Adiciona SUMMARY (Título do evento) e DESCRIPTION
        icsString += `SUMMARY:Leitura: ${plano.titulo}\r\n`;
        icsString += `DESCRIPTION:${description}\r\n`;

        // Outras propriedades do evento (opcionais mas úteis)
        icsString += `LOCATION:Local de Leitura Preferido\r\n`; // Localização genérica
        icsString += `STATUS:CONFIRMED\r\n`; // Status do evento
        icsString += `TRANSP:OPAQUE\r\n`; // Marca o tempo como "ocupado" na agenda

        // Adiciona um alarme (VALARM) 15 minutos antes do início
        icsString += `BEGIN:VALARM\r\n`;
        icsString += `ACTION:DISPLAY\r\n`; // Tipo de ação (mostrar notificação)
        icsString += `DESCRIPTION:Lembrete de Leitura: ${plano.titulo}\r\n`; // Texto do alarme
        icsString += `TRIGGER:-PT15M\r\n`; // Gatilho: 15 minutos antes (-PT15M)
        icsString += `END:VALARM\r\n`;

        // Fim do evento VEVENT e do calendário VCALENDAR
        icsString += `END:VEVENT\r\n`;
        icsString += `END:VCALENDAR\r\n`;

        return icsString; // Retorna a string ICS completa
    }


    // Função downloadICSFile (Cria um link temporário para baixar o arquivo)
    function downloadICSFile(icsContent, planoTitulo) {
        // Cria um Blob (Binary Large Object) com o conteúdo ICS
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        // Cria uma URL temporária para o Blob
        const url = URL.createObjectURL(blob);
        // Cria um elemento <a> invisível
        const a = document.createElement('a');
        a.href = url;
        // Define o nome do arquivo para download (limpa caracteres especiais do título)
        const nomeArquivo = `Plano_Leitura_${planoTitulo.replace(/[^a-z0-9]/gi, '_')}.ics`;
        a.download = nomeArquivo;
        // Adiciona o link ao corpo do documento (necessário para alguns navegadores)
        document.body.appendChild(a);
        // Simula um clique no link para iniciar o download
        a.click();
        // Remove o link do corpo do documento
        document.body.removeChild(a);
        // Libera a URL do Blob da memória
        URL.revokeObjectURL(url);
    }

    // Função togglePaginatorVisibility (Mostra/esconde paginador com base no scroll)
    function togglePaginatorVisibility() {
        const paginador = document.getElementById('paginador-planos');
        if (!paginador) return; // Sai se o paginador não existe
        const lista = document.getElementById('lista-planos');
        // Esconde se não há lista, ou se tem 1 ou 0 planos
        if (!lista || planos.length <= 1) {
            paginador.classList.add('hidden');
            return;
        }

        // Lógica para mostrar/esconder com base na posição do footer (ou fim da lista)
        const footer = document.querySelector('footer');
        const listaRect = lista.getBoundingClientRect();
        const footerRect = footer.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        // Mostra se a parte de baixo da lista está abaixo do topo do footer
        // OU se o topo do footer está fora da tela (indicando scroll longo)
        // E se a lista tem conteúdo visível (altura > 0)
        if ((listaRect.height > 0 && listaRect.bottom > footerRect.top) || (footerRect.top > windowHeight)) {
            paginador.classList.remove('hidden'); // Mostra
         } else {
            paginador.classList.add('hidden'); // Esconde
         }
    }
    // Adiciona listeners para chamar a função em scroll e resize
    window.addEventListener('scroll', togglePaginatorVisibility);
    window.addEventListener('resize', togglePaginatorVisibility);

    // Função distribuirPaginasPlano (Divide as páginas entre os dias de leitura)
    function distribuirPaginasPlano(plano) {
        // Validação inicial dos dados necessários
        if (!plano || !plano.diasPlano || plano.diasPlano.length === 0 ||
            !plano.paginaInicio || !plano.paginaFim ||
            plano.paginaFim < plano.paginaInicio) {
            console.warn("Dados insuficientes ou inválidos para distribuir páginas:", plano);
            // Zera as páginas dos dias existentes se houver erro
            if(plano && plano.diasPlano) {
                 plano.diasPlano.forEach(dia => {
                     dia.paginaInicioDia = plano.paginaInicio || 1;
                     dia.paginaFimDia = (plano.paginaInicio || 1) -1; // Garante fim < inicio
                     dia.paginas = 0;
                     // dia.lido = false; // Decide se reseta o 'lido' aqui ou não
                 });
            }
             // Zera totais do plano
             if(plano) {
                 plano.totalPaginas = 0;
                 plano.paginasLidas = 0; // Recalcular lidas depois é mais seguro
                 // Recalcula paginas lidas APÓS zerar as dos dias
                 if(planos.includes(plano)) {
                    atualizarPaginasLidas(planos.indexOf(plano));
                 }
             }
            return; // Interrompe a distribuição
        }

        const totalPaginasLivro = (plano.paginaFim - plano.paginaInicio + 1);
        const diasDeLeitura = plano.diasPlano;
        const numeroDeDias = diasDeLeitura.length;

        // Define o total de páginas do plano
        plano.totalPaginas = totalPaginasLivro;

        // Calcula a distribuição base e as páginas restantes
        const paginasPorDiaBase = Math.floor(totalPaginasLivro / numeroDeDias);
        const paginasRestantes = totalPaginasLivro % numeroDeDias; // Páginas extras a distribuir

        let paginaAtual = plano.paginaInicio; // Começa na página inicial do plano

        // Guarda o estado 'lido' original para restaurar depois (se necessário)
        // const diasLidosOriginalmente = {};
        // diasDeLeitura.forEach((dia, index) => {
        //     if (dia.data instanceof Date && !isNaN(dia.data)) {
        //         diasLidosOriginalmente[dia.data.toISOString().split('T')[0]] = dia.lido;
        //     }
        //     dia.lido = false; // Reseta 'lido' antes de redistribuir páginas (opcional)
        // });

        // Distribui as páginas dia a dia
        diasDeLeitura.forEach((dia, index) => {
            // Calcula quantas páginas para este dia (base + 1 extra se estiver entre os primeiros)
            let paginasNesteDia = paginasPorDiaBase + (index < paginasRestantes ? 1 : 0);

            // Define início e fim das páginas para o dia
            dia.paginaInicioDia = paginaAtual;
            dia.paginaFimDia = paginaAtual + paginasNesteDia - 1;

            // Garante que a página fim do dia não ultrapasse a página fim do livro
             if (dia.paginaFimDia > plano.paginaFim) {
                 dia.paginaFimDia = plano.paginaFim;
             }

             // Recalcula o número de páginas efetivas para o dia (evita negativo se fim < inicio)
             dia.paginas = Math.max(0, dia.paginaFimDia - dia.paginaInicioDia + 1);

            // Restaura o estado 'lido' original (se guardado)
            // if (dia.data instanceof Date && !isNaN(dia.data)) {
            //     const dataStr = dia.data.toISOString().split('T')[0];
            //     if (diasLidosOriginalmente[dataStr]) {
            //         dia.lido = true;
            //     }
            // }

            // Atualiza a página atual para o próximo dia começar
            paginaAtual = dia.paginaFimDia + 1;
        });

        // Ajuste final (raro, mas por segurança): Se a última página distribuída ficou antes da pág fim do livro
        if (diasDeLeitura.length > 0) {
            const ultimoDia = diasDeLeitura[numeroDeDias - 1];
            // Verifica se o último dia terminou antes do fim E ainda há páginas não alocadas
             if (ultimoDia.paginaFimDia < plano.paginaFim && paginaAtual <= plano.paginaFim) {
                 console.warn(`Ajustando pag fim do último dia de ${ultimoDia.paginaFimDia} para ${plano.paginaFim}`);
                 ultimoDia.paginaFimDia = plano.paginaFim; // Corrige a página final
                 ultimoDia.paginas = Math.max(0, ultimoDia.paginaFimDia - ultimoDia.paginaInicioDia + 1); // Recalcula páginas do último dia
             } else if (ultimoDia.paginaFimDia > plano.paginaFim) {
                 // Se ultrapassou (não deveria com a lógica acima)
                 ultimoDia.paginaFimDia = plano.paginaFim;
                 ultimoDia.paginas = Math.max(0, ultimoDia.paginaFimDia - ultimoDia.paginaInicioDia + 1);
             }
        }

        // Recalcula o total de páginas lidas com base no estado 'lido' atual dos dias
        // Isso é importante especialmente se o 'lido' foi preservado ou resetado
        if (planos.includes(plano)) {
             atualizarPaginasLidas(planos.indexOf(plano));
        } else {
            // Se for um plano novo (não está no array 'planos' ainda), calcula lidas nele mesmo
             plano.paginasLidas = diasDeLeitura.reduce((sum, dia) => sum + (dia.lido && typeof dia.paginas === 'number' ? dia.paginas : 0), 0);
        }
    }

    // Funções geradoras de dias (gerarDiasPlanoPorDatas, gerarDiasPlanoPorDias)
    function gerarDiasPlanoPorDatas(dataInicio, dataFim, periodicidade, diasSemana) {
        const dias = [];
        // Validação robusta das datas
        if (!(dataInicio instanceof Date) || !(dataFim instanceof Date) || isNaN(dataInicio) || isNaN(dataFim) || dataFim < dataInicio) {
            console.error("Datas inválidas fornecidas para gerar dias:", dataInicio, dataFim);
            return dias; // Retorna array vazio
        }
        let dataAtual = new Date(dataInicio); dataAtual.setHours(0, 0, 0, 0); // Normaliza data início
        const dataFimNormalizada = new Date(dataFim); dataFimNormalizada.setHours(0, 0, 0, 0); // Normaliza data fim

        // Loop enquanto a data atual for menor ou igual à data fim
        while (dataAtual <= dataFimNormalizada) {
            const diaSemanaAtual = dataAtual.getDay(); // 0=Dom, 1=Seg...
            // Verifica se o dia deve ser adicionado com base na periodicidade
            if (periodicidade === 'diario' || (periodicidade === 'semanal' && Array.isArray(diasSemana) && diasSemana.includes(diaSemanaAtual))) {
                // Adiciona o dia ao array (com dados zerados)
                dias.push({ data: new Date(dataAtual), paginaInicioDia: 0, paginaFimDia: 0, paginas: 0, lido: false });
            }
            // Avança para o próximo dia
            dataAtual.setDate(dataAtual.getDate() + 1);
        }
        return dias;
    }
    function gerarDiasPlanoPorDias(dataInicio, numeroDias, periodicidade, diasSemana) {
        const dias = [];
         // Validação dos inputs
         if (!(dataInicio instanceof Date) || isNaN(dataInicio) || typeof numeroDias !== 'number' || numeroDias <= 0) {
             console.error("Dados inválidos fornecidos para gerar dias por número:", dataInicio, numeroDias);
             return dias;
         }
        let dataAtual = new Date(dataInicio); dataAtual.setHours(0, 0, 0, 0); // Normaliza data início
        let diasAdicionados = 0;
        let safetyCounter = 0;
        const MAX_ITERATIONS_DIAS = numeroDias * 7 + 366; // Limite generoso para evitar loop infinito

        // Loop até adicionar o número de dias desejado ou atingir o limite de segurança
        while (diasAdicionados < numeroDias && safetyCounter < MAX_ITERATIONS_DIAS) {
            const diaSemanaAtual = dataAtual.getDay();
            // Verifica se o dia atual é válido de acordo com a periodicidade
            if (periodicidade === 'diario' || (periodicidade === 'semanal' && Array.isArray(diasSemana) && diasSemana.includes(diaSemanaAtual))) {
                // Adiciona o dia válido
                dias.push({ data: new Date(dataAtual), paginaInicioDia: 0, paginaFimDia: 0, paginas: 0, lido: false });
                diasAdicionados++; // Incrementa o contador de dias adicionados
            }
            // Sempre avança para o próximo dia, mesmo se não adicionou
             dataAtual.setDate(dataAtual.getDate() + 1);
             safetyCounter++;
             if (safetyCounter >= MAX_ITERATIONS_DIAS) {
                 console.error("Loop infinito provável detectado em gerarDiasPlanoPorDias. Interrompido.");
                 alert(`Erro: Não foi possível gerar os ${numeroDias} dias. Verifique a periodicidade e o número de dias.`);
                 break; // Sai do loop
             }
        }
        // Verifica se o número de dias gerados corresponde ao solicitado (após o loop)
        if (diasAdicionados < numeroDias) {
             console.warn(`Não foi possível gerar os ${numeroDias} dias solicitados com a periodicidade. Apenas ${diasAdicionados} foram gerados.`);
             // Não retorna erro aqui, mas o chamador pode verificar o length do array retornado
         }
        return dias;
    }
    // Função calcularDataFimReal (não é mais usada diretamente no fluxo principal, mas mantida caso útil)
    function calcularDataFimReal(dataInicio, numeroDias, periodicidade, diasSemana) {
         if (!(dataInicio instanceof Date) || isNaN(dataInicio) || typeof numeroDias !== 'number' || numeroDias <= 0) {
             console.error("Dados inválidos para calcular data fim real:", dataInicio, numeroDias); return null;
         }
        let dataAtual = new Date(dataInicio); dataAtual.setHours(0, 0, 0, 0);
        let diasContados = 0;
        let dataFim = null;
        let safetyCounter = 0;
        const MAX_ITERATIONS_CALC = numeroDias * 7 + 366;
        while (diasContados < numeroDias && safetyCounter < MAX_ITERATIONS_CALC) {
            const diaSemanaAtual = dataAtual.getDay();
            if (periodicidade === 'diario' || (periodicidade === 'semanal' && Array.isArray(diasSemana) && diasSemana.includes(diaSemanaAtual))) {
                diasContados++;
                 if (diasContados === numeroDias) { // Encontrou o último dia necessário
                     dataFim = new Date(dataAtual);
                     break; // Sai do loop
                 }
            }
             dataAtual.setDate(dataAtual.getDate() + 1); // Avança para o próximo dia
             safetyCounter++;
              if (safetyCounter >= MAX_ITERATIONS_CALC) {
                 console.error("Loop infinito provável em calcularDataFimReal. Interrompido.");
                 return null; // Retorna null em caso de loop
             }
        }
        return dataFim; // Retorna a data do último dia ou null
    }


    // --- Listeners de Eventos da Interface ---

    // Botões de Autenticação
    showAuthButton.addEventListener('click', () => {
        authFormDiv.style.display = 'flex'; // Mudar para flex se usar gap no CSS
        showAuthButton.style.display = 'none';
        cancelAuthButton.style.display = 'inline-block'; // Ou 'flex'
        logoutButton.style.display = 'none';
        emailLoginInput.focus();
        atualizarVisibilidadeBotoesAcao();
    });
    cancelAuthButton.addEventListener('click', () => {
        authFormDiv.style.display = 'none';
        showAuthButton.style.display = 'block';
        cancelAuthButton.style.display = 'none';
        emailLoginInput.value = ''; // Limpa campos
        passwordLoginInput.value = '';
        atualizarVisibilidadeBotoesAcao();
    });
    loginEmailButton.addEventListener('click', loginWithEmailPassword);
    signupEmailButton.addEventListener('click', signupWithEmailPassword);
    logoutButton.addEventListener('click', logout);

    // Botões de Navegação Principal
    novoPlanoBtn.addEventListener('click', function() {
        if (!user) {
            alert("Faça login ou cadastre-se para criar um novo plano.");
            showAuthButton.click(); // Abre o formulário de login/cadastro
            return;
        }
        // Mostra seção de cadastro, esconde as outras
        cadastroPlanoSection.style.display = 'block';
        planosLeituraSection.style.display = 'none';
        leiturasAtrasadasSection.style.display = 'none'; // Esconde painel atrasadas
        proximasLeiturasSection.style.display = 'none'; // Esconde painel próximas
        inicioCadastroBtn.style.display = 'block'; // Mostra botão voltar

        // Reseta o formulário APENAS se não estiver editando (preventFormReset é false)
        if (!preventFormReset) {
            formPlano.reset();
            planoEditandoIndex = -1; // Garante que não está editando
            formPlano.querySelector('button[type="submit"]').textContent = 'Salvar Plano';
             // Reseta estado inicial do formulário (datas, diário, sem dias semana)
             definirPorDatasRadio.checked = true;
             periodoPorDatasDiv.style.display = 'block';
             periodoPorDiasDiv.style.display = 'none';
             periodicidadeSelect.value = 'diario';
             diasSemanaSelecao.style.display = 'none';
             document.querySelectorAll('input[name="dia-semana"]').forEach(cb => cb.checked = false);
        }
        // Atualiza campos required e botões do header, foca no título
        updateRequiredAttributes();
        atualizarVisibilidadeBotoesAcao();
        document.getElementById('titulo-livro').focus();
    });
    inicioBtn.addEventListener('click', function() {
        // Mostra seção de planos, esconde cadastro
        planosLeituraSection.style.display = 'block';
        cadastroPlanoSection.style.display = 'none';
        inicioCadastroBtn.style.display = 'none'; // Esconde botão voltar do form
        // Reseta estado de edição
        planoEditandoIndex = -1;
        formPlano.querySelector('button[type="submit"]').textContent = 'Salvar Plano';
        // Atualiza botões e re-renderiza a lista de planos e painéis
        atualizarVisibilidadeBotoesAcao();
        renderizarPlanos();
    });
    // Botão "Voltar" dentro do formulário simplesmente clica no botão "Início"
     inicioCadastroBtn.addEventListener('click', function() {
         inicioBtn.click();
     });

    // Controles do Formulário (Radios e Select)
    definirPorDatasRadio.addEventListener('change', function() {
        if (this.checked) {
            periodoPorDatasDiv.style.display = 'block';
            periodoPorDiasDiv.style.display = 'none';
            updateRequiredAttributes(); // Atualiza required
        }
    });
    definirPorDiasRadio.addEventListener('change', function() {
        if (this.checked) {
            periodoPorDatasDiv.style.display = 'none';
            periodoPorDiasDiv.style.display = 'block';
            updateRequiredAttributes(); // Atualiza required
        }
    });
    periodicidadeSelect.addEventListener('change', function() {
        // Mostra/esconde seleção de dias da semana
        diasSemanaSelecao.style.display = this.value === 'semanal' ? 'block' : 'none';
        // Desmarca os dias da semana se voltar para 'diario'
        if (this.value === 'diario') {
            document.querySelectorAll('input[name="dia-semana"]').forEach(cb => cb.checked = false);
        }
    });

    // Submissão do formulário (Salvar/Atualizar Plano)
    formPlano.addEventListener('submit', function(event) {
        event.preventDefault(); // Impede envio padrão do formulário
        if (!user) {
             alert("Erro: Usuário não logado. Faça login para salvar.");
             showAuthButton.click(); // Abre form de login
             return;
         }

        // --- Coleta de Dados do Formulário ---
        const titulo = document.getElementById('titulo-livro').value.trim();
        const linkDrive = document.getElementById('link-drive').value.trim(); // Coleta link
        const paginaInicio = parseInt(document.getElementById('pagina-inicio').value);
        const paginaFim = parseInt(document.getElementById('pagina-fim').value);
        const definicaoPeriodo = document.querySelector('input[name="definicao-periodo"]:checked').value;
        const periodicidade = periodicidadeSelect.value;

        // --- Validações Básicas ---
        if (!titulo) { alert('O título do livro é obrigatório.'); return; }
        if (isNaN(paginaInicio) || paginaInicio < 1) { alert('Página de início inválida. Deve ser um número maior ou igual a 1.'); return; }
        if (isNaN(paginaFim) || paginaFim < paginaInicio) { alert('Página de fim inválida. Deve ser um número maior ou igual à página de início.'); return; }

        // --- Coleta e Validação de Datas e Periodicidade ---
        let dataInicio, dataFim;
        let diasPlano = [];
        let diasSemana = []; // Array para guardar os dias selecionados (0-6)

         // Coleta dias da semana se a periodicidade for semanal
         if (periodicidade === 'semanal') {
             document.querySelectorAll('input[name="dia-semana"]:checked').forEach(cb => {
                 diasSemana.push(parseInt(cb.value));
             });
             // Valida se pelo menos um dia foi selecionado para semanal
             if (diasSemana.length === 0) {
                 alert('Para periodicidade semanal, você deve selecionar pelo menos um dia da semana.'); return;
             }
             diasSemana.sort(); // Ordena os dias (opcional, mas bom para consistência)
         }

        // Processa com base na definição do período (Datas ou Nº Dias)
        if (definicaoPeriodo === 'datas') {
            const dataInicioInput = document.getElementById('data-inicio').value;
            const dataFimInput = document.getElementById('data-fim').value;
            if (!dataInicioInput || !dataFimInput) { alert('Datas de início e fim são obrigatórias ao definir por datas.'); return; }
            // Cria objetos Date (adiciona T00:00:00 para evitar problemas de fuso)
            dataInicio = new Date(dataInicioInput + 'T00:00:00');
            dataFim = new Date(dataFimInput + 'T00:00:00');
            // Valida as datas criadas
            if (isNaN(dataInicio) || isNaN(dataFim)) { alert('Formato de data inválido. Use o seletor de datas.'); return; }
            if (dataFim < dataInicio) { alert('A data de fim não pode ser anterior à data de início.'); return; }
            // Gera o array de dias de leitura
            diasPlano = gerarDiasPlanoPorDatas(dataInicio, dataFim, periodicidade, diasSemana);
        } else { // definicaoPeriodo === 'dias'
            const dataInicioDiasInput = document.getElementById('data-inicio-dias').value;
            const numeroDiasInput = parseInt(document.getElementById('numero-dias').value);
            if (!dataInicioDiasInput) { alert('Data de início é obrigatória ao definir por número de dias.'); return; }
            if (isNaN(numeroDiasInput) || numeroDiasInput < 1) { alert('Número de dias inválido. Deve ser um número maior que 0.'); return; }
            dataInicio = new Date(dataInicioDiasInput + 'T00:00:00');
             if (isNaN(dataInicio)) { alert('Formato da data de início inválido.'); return; }

            // Gera os dias de leitura primeiro
            diasPlano = gerarDiasPlanoPorDias(dataInicio, numeroDiasInput, periodicidade, diasSemana);

            // Verifica se foram gerados dias suficientes
            if (diasPlano.length === 0) {
                 alert("Não foi possível gerar nenhum dia de leitura com as datas e periodicidade selecionadas. Verifique os dados."); return; // Impede continuar se nenhum dia foi gerado
             } else if (diasPlano.length < numeroDiasInput) {
                  // Alerta se gerou menos dias que o solicitado (acontece com semanal restrito)
                  alert(`Atenção: Com a periodicidade selecionada, foi possível gerar apenas ${diasPlano.length} dias de leitura no período, em vez dos ${numeroDiasInput} solicitados. O plano será criado com ${diasPlano.length} dias.`);
                  // O código continua com os dias gerados
             }

             // Define a data de fim como a data do último dia efetivamente gerado
             dataFim = diasPlano[diasPlano.length - 1].data;

             // Validação final da dataFim calculada (deve ser um Date válido)
             if (!dataFim || !(dataFim instanceof Date) || isNaN(dataFim)) {
                 console.error("Data fim calculada a partir dos dias é inválida:", dataFim);
                 alert("Erro interno ao calcular a data final do plano. Tente novamente."); return;
             }
        }

        // Verifica novamente se diasPlano tem itens (segurança extra)
        if (diasPlano.length === 0) {
            alert("Falha ao gerar os dias de leitura para o plano. Verifique as datas e a periodicidade."); return;
        }

        // --- Monta o Objeto do Plano ---
        const planoData = {
            id: planoEditandoIndex !== -1 ? planos[planoEditandoIndex].id : crypto.randomUUID(), // Reutiliza ID ou gera novo
            titulo: titulo,
            linkDrive: linkDrive, // Inclui link
            paginaInicio: paginaInicio,
            paginaFim: paginaFim,
            totalPaginas: (paginaFim - paginaInicio + 1), // Calcula total de páginas
            definicaoPeriodo: definicaoPeriodo,
            dataInicio: dataInicio,
            dataFim: dataFim, // Data fim real (pode ter sido calculada)
            periodicidade: periodicidade,
            diasSemana: diasSemana, // Salva os dias da semana selecionados (se houver)
            diasPlano: diasPlano, // Array de dias gerados (ainda sem páginas distribuídas)
            paginasLidas: 0 // Inicializa páginas lidas como 0
        };

        // --- Preservar Estado 'Lido' ao Editar ---
        if (planoEditandoIndex !== -1) {
             const diasLidosAntigosMap = new Map();
             // Mapeia as datas (como string YYYY-MM-DD) dos dias lidos do plano original
             planos[planoEditandoIndex].diasPlano.forEach(diaAntigo => {
                 if (diaAntigo.lido && diaAntigo.data instanceof Date && !isNaN(diaAntigo.data)) {
                     diasLidosAntigosMap.set(diaAntigo.data.toISOString().split('T')[0], true);
                 }
             });
             // Percorre os novos dias gerados e marca como 'lido' se a data coincidir
             planoData.diasPlano.forEach(diaNovo => {
                 if (diaNovo.data instanceof Date && !isNaN(diaNovo.data)) {
                     const dataStr = diaNovo.data.toISOString().split('T')[0];
                     if (diasLidosAntigosMap.has(dataStr)) {
                         diaNovo.lido = true;
                     }
                 }
             });
             // Recalcula paginas lidas com base nos dias marcados (incluindo os restaurados)
             // Note que as páginas por dia ainda não foram distribuídas, então isso será recalculado após distribuirPaginasPlano
             // planoData.paginasLidas = planoData.diasPlano.reduce((sum, dia) => sum + (dia.lido && typeof dia.paginas === 'number' ? dia.paginas : 0), 0);
        }

        // --- Distribui as Páginas e Atualiza Páginas Lidas ---
        distribuirPaginasPlano(planoData); // Agora distribui as páginas e recalcula .paginasLidas corretamente

        // --- Salva o Plano ---
        if (planoEditandoIndex !== -1) {
            planos[planoEditandoIndex] = planoData; // Atualiza o plano existente
        } else {
            planos.unshift(planoData); // Adiciona o novo plano no início do array
        }

        // Salva no Firebase e volta para a lista
        salvarPlanos(planos, (salvoComSucesso) => {
            if (salvoComSucesso) {
                console.log(`Plano ${planoEditandoIndex !== -1 ? 'atualizado' : 'salvo'} com sucesso.`);
                planoEditandoIndex = -1; // Reseta índice de edição
                formPlano.querySelector('button[type="submit"]').textContent = 'Salvar Plano'; // Reseta texto botão
                inicioBtn.click(); // Volta para a tela de início (que chamará renderizarPlanos)
            } else {
                alert("Houve um erro ao salvar o plano no servidor. Tente novamente.");
                // Considerar não voltar para a lista ou reverter a adição/atualização local
            }
        });
    });

    // --- Inicialização ---
    initApp(); // Começa o fluxo de autenticação e carregamento

}); // Fim do DOMContentLoaded
