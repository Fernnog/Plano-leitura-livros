// script.js (Completo - v5: SW Removido + Logs de Diagnóstico Auth)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// --- Início do seu script.js ou parte relevante ---

// >>>>>>>>> INÍCIO DA REMOÇÃO SW <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
/*
// Função para registrar o Service Worker (REMOVIDO)
function registerServiceWorker() { ... }
// Chama a função de registro quando a janela carregar (REMOVIDO)
window.addEventListener('load', () => { ... });
*/
// >>>>>>>>> FIM DA REMOÇÃO SW <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<


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

    // Configurações do Firebase (Mantenha as suas credenciais aqui - VERIFIQUE SE ESTÃO CORRETAS!)
     const firebaseConfig = {
        apiKey: "AIzaSyCzLjQrE3KhneuwZZXIost5oghVjOTmZQE", // Substitua pela sua API Key real
        authDomain: "plano-leitura.firebaseapp.com",
        projectId: "plano-leitura",
        storageBucket: "plano-leitura.firebasestorage.app", // Verifique se é firebasestorage.app ou appspot.com no seu console
        messagingSenderId: "589137978493",
        appId: "1:589137978493:web:f7305bca602383fe14bd14"
    };

    // Inicializar o Firebase
    console.log("Inicializando Firebase com config:", firebaseConfig); // Log da config
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // >>> LOGS DE DIAGNÓSTICO ADICIONADOS <<<
    console.log("Firebase App Object:", app);
    console.log("Firebase Auth Object:", auth);
    if (!auth) {
        console.error("ERRO CRÍTICO: Objeto Auth do Firebase NÃO foi inicializado após getAuth()!");
    }
    // >>> FIM DOS LOGS DE DIAGNÓSTICO <<<

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
                syncFirebaseButton.style.display = 'none'; // Mantido oculto por enquanto
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
                planos = []; // Limpa os planos locais se o usuário deslogar
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
            showAuthButton.style.display = 'none'; // Esconde login/cadastro na tela de cadastro
            logoutButton.style.display = 'none'; // Esconde logout na tela de cadastro
            proximasLeiturasSection.style.display = 'none'; // Esconde próximas
            leiturasAtrasadasSection.style.display = 'none'; // Esconde atrasadas
        } else { // Está na tela inicial (lista de planos)
            novoPlanoBtn.style.display = user ? 'block' : 'none'; // Mostra se logado
            inicioBtn.style.display = 'none'; // Sempre escondido na tela inicial
            exportarAgendaBtn.style.display = user && planos.length > 0 ? 'block' : 'none'; // Mostra se logado e com planos
            showAuthButton.style.display = user ? 'none' : 'block'; // Mostra se deslogado
            logoutButton.style.display = user ? 'block' : 'none'; // Mostra se logado
            // Visibilidade dos painéis de leitura é controlada em suas respectivas funções de renderização
        }

        // Lógica adicional para o formulário de autenticação
        if (!user && showAuthButton.style.display === 'none' && !estaNaTelaCadastro) {
           // Manter como está (formulário de auth visível, caso tenha sido clicado para abrir)
        } else if (!user && !estaNaTelaCadastro){ // Deslogado, na tela inicial, formulário não visível
             authFormDiv.style.display = 'none';
             cancelAuthButton.style.display = 'none';
        } else if (user) { // Logado (em qualquer tela)
             authFormDiv.style.display = 'none';
             cancelAuthButton.style.display = 'none';
        }
    }

    // Funções loginWithEmailPassword, signupWithEmailPassword, logout
    function loginWithEmailPassword() {
        console.log("--- loginWithEmailPassword FUNCTION CALLED ---"); // <<< LOG ADICIONADO <<<
        const email = emailLoginInput.value;
        const password = passwordLoginInput.value;

        // Verifica se o objeto auth é válido antes de usar
        if (!auth) {
             console.error("LOGIN ERROR: Objeto Auth do Firebase não está inicializado!");
             alert("Erro interno: Falha na inicialização da autenticação.");
             return;
        }

        console.log("Attempting sign in with email:", email); // Log para ver o email

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                console.log('Login com email/senha bem-sucedido');
                emailLoginInput.value = '';
                passwordLoginInput.value = '';
                // onAuthStateChanged cuidará da atualização da UI
            })
            .catch((error) => {
                // Log de erro aprimorado (mantido)
                console.error('--- LOGIN ERROR ---');
                console.error('Error Code:', error.code);
                console.error('Error Message:', error.message);
                console.error('Full Error Object:', error);
                alert(`Erro ao fazer login: [${error.code}] ${error.message}`);
            });
    }
    function signupWithEmailPassword() {
        console.log("--- signupWithEmailPassword FUNCTION CALLED ---"); // <<< LOG ADICIONADO <<<
        const email = emailLoginInput.value;
        const password = passwordLoginInput.value;

        // Verifica se o objeto auth é válido antes de usar
        if (!auth) {
             console.error("SIGNUP ERROR: Objeto Auth do Firebase não está inicializado!");
             alert("Erro interno: Falha na inicialização da autenticação.");
             return;
        }

        console.log("Attempting sign up with email:", email); // Log para ver o email

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
                // Log de erro aprimorado (mantido)
                console.error('--- SIGNUP ERROR ---');
                console.error('Error Code:', error.code);
                console.error('Error Message:', error.message);
                console.error('Full Error Object:', error);
                alert(`Erro ao cadastrar: [${error.code}] ${error.message}`);
            });
    }
    function logout() {
        console.log("Função logout() iniciada");
        signOut(auth)
            .then(() => {
                console.log('Logout bem-sucedido');
                // onAuthStateChanged cuidará da atualização da UI e limpeza dos planos locais
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
                    // Tratamento robusto de datas inválidas ou nulas
                    const dataInicioStr = plano.dataInicio;
                    const dataFimStr = plano.dataFim;
                    let dataInicio = null;
                    let dataFim = null;
                    if (dataInicioStr) {
                        const tempInicio = new Date(dataInicioStr);
                        if (!isNaN(tempInicio.getTime())) dataInicio = tempInicio;
                    }
                    if (dataFimStr) {
                        const tempFim = new Date(dataFimStr);
                        if (!isNaN(tempFim.getTime())) dataFim = tempFim;
                    }

                    return {
                        ...plano,
                        linkDrive: plano.linkDrive || '', // Garante que linkDrive exista
                        dataInicio: dataInicio,
                        dataFim: dataFim,
                        diasPlano: plano.diasPlano ? plano.diasPlano.map(dia => {
                            const dataDiaStr = dia.data;
                            let dataDia = null;
                            if (dataDiaStr) {
                                const tempDia = new Date(dataDiaStr);
                                if (!isNaN(tempDia.getTime())) dataDia = tempDia;
                            }
                            return { ...dia, data: dataDia };
                        }) : []
                    };
                }).filter(plano => plano.dataInicio && plano.dataFim); // Filtra planos com datas inválidas após conversão
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
        // Prepara os dados para o Firestore (converte Date para ISOString, trata nulos)
        const planosParaFirestore = planosParaSalvar.map(plano => {
            const linkDrive = typeof plano.linkDrive === 'string' ? plano.linkDrive : '';
            return {
                ...plano,
                linkDrive: linkDrive, // Garante que linkDrive seja string
                // Salva como ISOString apenas se for uma data válida
                dataInicio: (plano.dataInicio instanceof Date && !isNaN(plano.dataInicio)) ? plano.dataInicio.toISOString() : null,
                dataFim: (plano.dataFim instanceof Date && !isNaN(plano.dataFim)) ? plano.dataFim.toISOString() : null,
                diasPlano: plano.diasPlano ? plano.diasPlano.map(dia => ({
                    ...dia,
                    // Salva como ISOString apenas se for uma data válida
                    data: (dia.data instanceof Date && !isNaN(dia.data)) ? dia.data.toISOString() : null
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

    // --- *** FUNÇÃO: Renderizar Leituras Atrasadas (COM TAG NUMÉRICA) *** ---
    function renderizarLeiturasAtrasadas() {
        leiturasAtrasadasSection.style.display = 'none'; // Esconde por padrão
        if (!user || !planos || planos.length === 0) {
            return; // Sai se não houver usuário ou planos
        }

        const hoje = getHojeNormalizado(); // Pega a data de hoje (00:00:00)
        const todasLeiturasAtrasadas = [];

        planos.forEach((plano, planoIndex) => {
            if (plano.diasPlano && plano.diasPlano.length > 0 && determinarStatusPlano(plano) !== 'concluido') {
                plano.diasPlano.forEach((dia, diaIndex) => {
                    // Verifica se dia.data é uma data válida
                    if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                        const dataDiaNormalizada = new Date(dia.data);
                        dataDiaNormalizada.setHours(0, 0, 0, 0);
                        if (dataDiaNormalizada < hoje && !dia.lido) {
                            todasLeiturasAtrasadas.push({
                                data: dia.data, // Guarda o objeto Date
                                titulo: plano.titulo || 'Sem Título',
                                paginasTexto: `Pgs ${dia.paginaInicioDia || '?'}-${dia.paginaFimDia || '?'} (${dia.paginas || '?'})`,
                                planoIndex: planoIndex
                            });
                        }
                    } else if (!dia.lido) {
                        // Opcional: Logar dias sem data válida, se necessário para debug
                        // console.warn(`Dia sem data válida no plano ${planoIndex}:`, dia);
                    }
                });
            }
        });

        // Ordena apenas se houver leituras
        if (todasLeiturasAtrasadas.length > 0) {
            todasLeiturasAtrasadas.sort((a, b) => a.data - b.data); // Ordena por data
        }

        const leiturasAtrasadasParaMostrar = todasLeiturasAtrasadas.slice(0, 3); // Pega as 3 mais antigas
        listaLeiturasAtrasadasDiv.innerHTML = '';

        if (leiturasAtrasadasParaMostrar.length > 0) {
            leiturasAtrasadasSection.style.display = 'block'; // Mostra a seção
            semLeiturasAtrasadasP.style.display = 'none'; // Esconde a mensagem "sem leituras"

            leiturasAtrasadasParaMostrar.forEach(leitura => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('leitura-atrasada-item');
                const dataFormatada = leitura.data.toLocaleDateString('pt-BR', { // Formata a data
                     weekday: 'short', month: 'short', day: 'numeric'
                });
                const numeroPlano = leitura.planoIndex + 1; // Número do plano (base 1)

                // Cria o HTML do item
                itemDiv.innerHTML = `
                    <span class="leitura-atrasada-data">${dataFormatada}</span>
                    <span class="numero-plano-tag">${numeroPlano}</span>
                    <span class="leitura-atrasada-titulo">${leitura.titulo}</span>
                    <span class="leitura-atrasada-paginas">${leitura.paginasTexto}</span>
                `;
                listaLeiturasAtrasadasDiv.appendChild(itemDiv); // Adiciona o item à lista
            });
        } else {
            // Se não há atrasadas, ainda mostra a seção, mas com a mensagem
            leiturasAtrasadasSection.style.display = 'block';
            semLeiturasAtrasadasP.style.display = 'block';
        }
    }
    // --- *** FIM da Função Atrasadas *** ---

    // --- *** FUNÇÃO: Renderizar Próximas Leituras (COM TAG NUMÉRICA) *** ---
    function renderizarProximasLeituras() {
        proximasLeiturasSection.style.display = 'none'; // Esconde por padrão
        if (!user || !planos || planos.length === 0) {
            return; // Sai se não houver usuário ou planos
        }
        const hoje = getHojeNormalizado();
        const todasLeiturasFuturas = [];
        planos.forEach((plano, planoIndex) => {
            if (plano.diasPlano && plano.diasPlano.length > 0 && determinarStatusPlano(plano) !== 'concluido') {
                plano.diasPlano.forEach((dia, diaIndex) => {
                    // Verifica se dia.data é uma data válida
                    if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                        const dataDiaNormalizada = new Date(dia.data);
                        dataDiaNormalizada.setHours(0,0,0,0);
                        // Verifica se é hoje ou no futuro E não está lido
                        if (dataDiaNormalizada >= hoje && !dia.lido)
                        {
                            todasLeiturasFuturas.push({
                                data: dia.data, // Guarda o objeto Date
                                titulo: plano.titulo || 'Sem Título',
                                paginasTexto: `Pgs ${dia.paginaInicioDia || '?'}-${dia.paginaFimDia || '?'} (${dia.paginas || '?'})`,
                                planoIndex: planoIndex
                            });
                        }
                    } else if (!dia.lido) {
                         // console.warn(`Dia futuro sem data válida no plano ${planoIndex}:`, dia);
                    }
                });
            }
        });

        // Ordena apenas se houver leituras
        if (todasLeiturasFuturas.length > 0) {
            todasLeiturasFuturas.sort((a, b) => a.data - b.data); // Ordena pela data mais próxima
        }

        const proximas3Leituras = todasLeiturasFuturas.slice(0, 3); // Pega as 3 mais próximas
        listaProximasLeiturasDiv.innerHTML = ''; // Limpa a lista

        if (proximas3Leituras.length > 0) {
            proximasLeiturasSection.style.display = 'block'; // Mostra a seção
            semProximasLeiturasP.style.display = 'none'; // Esconde a mensagem "sem leituras"

            proximas3Leituras.forEach(leitura => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('proxima-leitura-item');
                const dataFormatada = leitura.data.toLocaleDateString('pt-BR', { // Formata a data
                    weekday: 'short', month: 'short', day: 'numeric'
                });
                const numeroPlano = leitura.planoIndex + 1; // Número do plano (base 1)

                // Cria o HTML do item
                itemDiv.innerHTML = `
                    <span class="proxima-leitura-data">${dataFormatada}</span>
                    <span class="numero-plano-tag">${numeroPlano}</span>
                    <span class="proxima-leitura-titulo">${leitura.titulo}</span>
                    <span class="proxima-leitura-paginas">${leitura.paginasTexto}</span>
                `;
                listaProximasLeiturasDiv.appendChild(itemDiv); // Adiciona o item à lista
            });
        } else {
             // Se não há próximas, ainda mostra a seção, mas com a mensagem
             proximasLeiturasSection.style.display = 'block';
             semProximasLeiturasP.style.display = 'block';
        }
    }
    // --- *** FIM Função Próximas Leituras *** ---


    // *** FUNÇÃO renderizarPlanos (Principal) ***
    function renderizarPlanos() {
        // Limpa conteúdo anterior e oculta painéis
        paginadorPlanosDiv.innerHTML = '';
        listaPlanos.innerHTML = '';
        proximasLeiturasSection.style.display = 'none'; // Esconde painéis antes de re-renderizar
        leiturasAtrasadasSection.style.display = 'none';

        // Verifica estado de login
        if (!user) {
            listaPlanos.innerHTML = '<p>Faça login ou cadastre-se para gerenciar seus planos de leitura.</p>';
            atualizarVisibilidadeBotoesAcao();
            // Mesmo deslogado, tenta renderizar painéis (eles ficarão vazios ou com msg padrão)
            renderizarLeiturasAtrasadas();
            renderizarProximasLeituras();
            togglePaginatorVisibility(); // Garante que paginador fique oculto
            return;
        }

        // Verifica se há planos
        if (planos.length === 0) {
            listaPlanos.innerHTML = '<p>Nenhum plano de leitura cadastrado ainda. Clique em "Novo" para começar!</p>';
            atualizarVisibilidadeBotoesAcao();
            togglePaginatorVisibility(); // Garante que paginador fique oculto
            renderizarLeiturasAtrasadas(); // Renderiza painéis (mostrarão msg padrão)
            renderizarProximasLeituras();
            return;
        }

        // Ordena os planos - Critério: Concluídos por último, depois por data de início
        planos.sort((a, b) => {
            const statusA = determinarStatusPlano(a);
            const statusB = determinarStatusPlano(b);

            // Coloca concluídos no final
            if (statusA === 'concluido' && statusB !== 'concluido') return 1;
            if (statusA !== 'concluido' && statusB === 'concluido') return -1;

            // Para não concluídos, ordena por data de início (mais antiga primeiro)
            // Trata datas inválidas como se fossem muito futuras para irem pro final
            const dataA = (a.dataInicio instanceof Date && !isNaN(a.dataInicio)) ? a.dataInicio.getTime() : Infinity;
            const dataB = (b.dataInicio instanceof Date && !isNaN(b.dataInicio)) ? b.dataInicio.getTime() : Infinity;
            return dataA - dataB;
        });


        // Renderiza Paginador (se necessário)
        if (planos.length > 1) {
            planos.forEach((plano, index) => {
                const linkPaginador = document.createElement('a');
                linkPaginador.href = `#plano-${index}`;
                linkPaginador.textContent = index + 1; // O número puro
                linkPaginador.title = plano.titulo || 'Plano sem título'; // Adiciona tooltip com o título
                paginadorPlanosDiv.appendChild(linkPaginador);
            });
        }

        // Renderiza Cards dos Planos
        planos.forEach((plano, index) => {
            // Cálculo de progresso com fallback para 0 se totalPaginas for 0 ou inválido
            const totalPaginasValido = typeof plano.totalPaginas === 'number' && plano.totalPaginas > 0 ? plano.totalPaginas : 0;
            const paginasLidasValido = typeof plano.paginasLidas === 'number' && plano.paginasLidas >= 0 ? plano.paginasLidas : 0;
            const progressoPercentual = totalPaginasValido > 0 ? (paginasLidasValido / totalPaginasValido) * 100 : 0;

            const status = determinarStatusPlano(plano);
            let statusText = '';
            let statusClass = '';
            switch (status) {
                case 'proximo': statusText = 'Próximo'; statusClass = 'status-proximo'; break;
                case 'em_dia': statusText = 'Em dia'; statusClass = 'status-em-dia'; break;
                case 'atrasado': statusText = 'Atrasado'; statusClass = 'status-atrasado'; break;
                case 'concluido': statusText = 'Concluído'; statusClass = 'status-concluido'; break;
                // case 'invalido': statusText = 'Inválido'; statusClass = 'status-invalido'; break; // Opcional
            }
            const statusTagHTML = statusText ? `<span class="status-tag ${statusClass}">${statusText}</span>` : '';

            const diasAtrasados = (status === 'atrasado') ? verificarAtraso(plano) : 0;
            // Mostra aviso de atraso apenas se status for 'atrasado' E diasAtrasados > 0
            const avisoAtrasoHTML = (status === 'atrasado' && diasAtrasados > 0) ? `
                <div class="aviso-atraso" id="aviso-atraso-${index}">
                    <p>⚠️ Plano com atraso de ${diasAtrasados} dia(s)!</p>
                    <div class="acoes-dados">
                        <button onclick="mostrarOpcoesRecalculo(${index})">Recalcular Plano</button>
                    </div>
                </div>` : '';

             let linkDriveHTML = '';
             // Garante que plano.linkDrive seja uma string antes de verificar
             const linkDriveStr = typeof plano.linkDrive === 'string' ? plano.linkDrive.trim() : '';
             if (linkDriveStr) { // Verifica se a string não está vazia
                 linkDriveHTML = `
                 <div class="link-drive-container">
                     <a href="${linkDriveStr}" target="_blank" class="button-link-drive" title="Abrir documento de anotações">
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
                // Adiciona classe ao card baseada no status (ex: card-em-dia)
                planoDiv.classList.add(statusClass.replace('status-','card-'));
            }
            planoDiv.id = `plano-${index}`; // ID para navegação do paginador

            // Cria o HTML interno do card
            planoDiv.innerHTML = `
                <div class="plano-header">
                    <h3><span class="plano-numero">${index + 1}</span>${plano.titulo || 'Plano Sem Título'}</h3>
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
                <p>Páginas: ${plano.paginaInicio || '?'} - ${plano.paginaFim || '?'} (${totalPaginasValido} pgs)</p>
                <div class="progresso-container" title="${progressoPercentual.toFixed(0)}% concluído">
                    <div class="barra-progresso" style="width: ${progressoPercentual}%"></div>
                </div>
                <p>${paginasLidasValido} de ${totalPaginasValido} páginas lidas (${progressoPercentual.toFixed(0)}%)</p>
                <details class="dias-leitura-details">
                    <summary>Ver/Marcar Dias de Leitura (${plano.diasPlano ? plano.diasPlano.length : 0} dias)</summary>
                    <div class="dias-leitura">${renderizarDiasLeitura(plano.diasPlano, index)}</div>
                </details>
            `;
            listaPlanos.appendChild(planoDiv); // Adiciona o card à lista
        });

        // Atualiza visibilidade e RENDERIZA PAINÉIS (Atrasadas e Próximas)
        atualizarVisibilidadeBotoesAcao();
        togglePaginatorVisibility(); // Mostra/esconde paginador
        renderizarLeiturasAtrasadas(); // Renderiza painel de atrasadas
        renderizarProximasLeituras(); // Renderiza painel de próximas
    }


    // Função verificarAtraso (Conta dias passados não lidos)
    function verificarAtraso(plano) {
        const hoje = getHojeNormalizado();
        if (!plano || !plano.diasPlano || plano.diasPlano.length === 0) {
            return 0; // Sem plano ou dias, não há atraso
        }
        return plano.diasPlano.reduce((count, dia) => {
             // Verifica se 'dia.data' é uma data válida
             if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                const dataDiaNormalizada = new Date(dia.data);
                dataDiaNormalizada.setHours(0, 0, 0, 0);
                // Conta se a data do dia é anterior a hoje E não está marcado como lido
                if (dataDiaNormalizada < hoje && !dia.lido) {
                    return count + 1;
                }
            }
            return count; // Mantém a contagem se a data for inválida ou não estiver atrasada/não lida
        }, 0); // Começa a contagem do zero
    }


    // Função renderizarDiasLeitura (HTML para a lista de dias dentro do card)
    function renderizarDiasLeitura(diasPlano, planoIndex) {
        if (!diasPlano || diasPlano.length === 0) {
            return '<p>Nenhum dia de leitura definido para este plano.</p>';
        }
        // Mapeia cada dia do plano para um elemento HTML
        return diasPlano.map((dia, diaIndex) => {
            // Formata a data ou mostra 'Data inválida'
            const dataFormatada = (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime()))
                ? dia.data.toLocaleDateString('pt-BR')
                : 'Data inválida';
            // Adiciona classe para estilo alternado (opcional)
            const alternadoClass = diaIndex % 2 === 0 ? 'alternado' : '';
            // Adiciona classe se o dia estiver marcado como lido
            const lidoClass = dia.lido ? 'lido' : '';
            // Cria um ID único para o checkbox e seu label
            const idCheckbox = `dia-${planoIndex}-${diaIndex}`;

            // Retorna o HTML para a linha do dia
            return `<div class="dia-leitura ${alternadoClass} ${lidoClass}">
                        <input type="checkbox" id="${idCheckbox}" ${dia.lido ? 'checked' : ''} onchange="marcarDiaLido(${planoIndex}, ${diaIndex}, this.checked)" title="${dia.lido ? 'Desmarcar' : 'Marcar'} dia como lido">
                        <label for="${idCheckbox}">${dataFormatada} - Páginas ${dia.paginaInicioDia || '?'} a ${dia.paginaFimDia || '?'} (${dia.paginas || '?'})</label>
                    </div>`;
        }).join(''); // Junta todos os HTMLs dos dias em uma única string
    }


    // Função marcarDiaLido (Chamada pelo onchange do checkbox)
    // Tornando a função acessível globalmente para o 'onchange' no HTML
    window.marcarDiaLido = function(planoIndex, diaIndex, lido) {
        // Verifica se os índices são válidos
        if (planos[planoIndex] && planos[planoIndex].diasPlano && planos[planoIndex].diasPlano[diaIndex]) {
            // Atualiza o status 'lido' do dia específico
            planos[planoIndex].diasPlano[diaIndex].lido = lido;
            atualizarPaginasLidas(planoIndex); // Recalcula o progresso total do plano

            // Salva o estado atualizado dos planos no Firebase
            salvarPlanos(planos, (salvoComSucesso) => {
                if (salvoComSucesso) {
                    console.log('Progresso salvo no Firebase.');
                    // Apenas re-renderiza se salvar com sucesso para evitar UI inconsistente
                    renderizarPlanos(); // Re-renderiza toda a interface (cards, painéis, etc.)
                } else {
                    console.error('Falha ao salvar progresso no Firebase.');
                    // Opcional: Reverter a mudança na UI ou mostrar erro ao usuário
                    alert("Erro ao salvar o progresso. Sua alteração pode não ter sido salva permanentemente.");
                    // Reverte a mudança local
                    planos[planoIndex].diasPlano[diaIndex].lido = !lido;
                    atualizarPaginasLidas(planoIndex);
                    renderizarPlanos(); // Renderiza de novo com o estado revertido
                }
            });

        } else {
            console.error("Índice de plano ou dia inválido para marcar como lido.");
        }
    };


    // Função atualizarPaginasLidas (Calcula o total de páginas lidas para um plano)
    function atualizarPaginasLidas(planoIndex) {
        // Verifica se o plano e seus dias existem
        if (planos[planoIndex] && planos[planoIndex].diasPlano) {
            // Usa reduce para somar as páginas dos dias marcados como lidos
            planos[planoIndex].paginasLidas = planos[planoIndex].diasPlano.reduce((sum, dia) => {
                // Soma apenas se 'lido' for true e 'paginas' for um número válido > 0
                const paginasDia = typeof dia.paginas === 'number' && !isNaN(dia.paginas) ? dia.paginas : 0;
                return sum + (dia.lido ? paginasDia : 0);
            }, 0); // Inicia a soma com 0
        } else {
            console.error("Plano inválido para atualizar páginas lidas:", planoIndex);
            // Garante que, se o plano existir mas os dias não, paginasLidas seja 0
            if(planos[planoIndex]) planos[planoIndex].paginasLidas = 0;
        }
    }


    // Função editarPlano (Preenche o formulário para edição)
    // Tornando a função acessível globalmente
    window.editarPlano = function(index) {
        if (index < 0 || index >= planos.length) {
            console.error("Índice de plano inválido para edição:", index); return;
        }
        planoEditandoIndex = index; // Guarda o índice do plano sendo editado
        preventFormReset = true; // Impede o reset automático do formulário ao abrir

        // Mostra a seção de cadastro e esconde as outras
        cadastroPlanoSection.style.display = 'block';
        planosLeituraSection.style.display = 'none';
        leiturasAtrasadasSection.style.display = 'none'; // Esconde painéis
        proximasLeiturasSection.style.display = 'none';
        atualizarVisibilidadeBotoesAcao(); // Atualiza botões do header
        inicioCadastroBtn.style.display = 'block'; // Mostra botão "Início" dentro do form

        const plano = planos[index]; // Pega os dados do plano

        // Preenche os campos do formulário com os dados do plano
        document.getElementById('titulo-livro').value = plano.titulo || '';
        document.getElementById('link-drive').value = plano.linkDrive || '';
        document.getElementById('pagina-inicio').value = plano.paginaInicio || '';
        document.getElementById('pagina-fim').value = plano.paginaFim || '';

        // Configura a seleção de período (datas vs dias)
        if (plano.definicaoPeriodo === 'dias') {
            definirPorDiasRadio.checked = true;
            periodoPorDatasDiv.style.display = 'none';
            periodoPorDiasDiv.style.display = 'block';
             // Preenche a data de início (se válida)
             if (plano.dataInicio instanceof Date && !isNaN(plano.dataInicio)) {
                 document.getElementById('data-inicio-dias').valueAsDate = plano.dataInicio;
             } else {
                 document.getElementById('data-inicio-dias').value = ''; // Limpa se inválida
             }
            // Calcula ou usa o número de dias (se existir)
            const numDias = plano.diasPlano ? plano.diasPlano.length : '';
            document.getElementById('numero-dias').value = numDias;
        } else { // Default para 'datas' ou se 'definicaoPeriodo' for inválido
            definirPorDatasRadio.checked = true;
            periodoPorDatasDiv.style.display = 'block';
            periodoPorDiasDiv.style.display = 'none';
             // Preenche data de início (se válida)
             if (plano.dataInicio instanceof Date && !isNaN(plano.dataInicio)) {
                document.getElementById('data-inicio').valueAsDate = plano.dataInicio;
             } else {
                 document.getElementById('data-inicio').value = '';
             }
             // Preenche data de fim (se válida)
             if (plano.dataFim instanceof Date && !isNaN(plano.dataFim)) {
                document.getElementById('data-fim').valueAsDate = plano.dataFim;
             } else {
                 document.getElementById('data-fim').value = '';
             }
        }

        // Configura a periodicidade e os dias da semana
        periodicidadeSelect.value = plano.periodicidade || 'diario'; // Default para 'diario'
        diasSemanaSelecao.style.display = periodicidadeSelect.value === 'semanal' ? 'block' : 'none';
        // Desmarca todos os checkboxes de dia da semana primeiro
        document.querySelectorAll('input[name="dia-semana"]').forEach(cb => cb.checked = false);
        // Marca os dias corretos se for semanal e tiver a lista
        if (plano.periodicidade === 'semanal' && Array.isArray(plano.diasSemana)) {
            document.querySelectorAll('input[name="dia-semana"]').forEach(cb => {
                // Verifica se o valor (convertido para número) está no array do plano
                cb.checked = plano.diasSemana.includes(parseInt(cb.value));
            });
        }

        formPlano.querySelector('button[type="submit"]').textContent = 'Atualizar Plano'; // Muda texto do botão
        updateRequiredAttributes(); // Garante que campos required estejam corretos
        cadastroPlanoSection.scrollIntoView({ behavior: 'smooth' }); // Rola a tela para o formulário
        preventFormReset = false; // Libera o reset para a próxima vez que abrir
    };

    // Função editarLinkDrive (Abre prompt para editar/adicionar link)
    // Tornando a função acessível globalmente
    window.editarLinkDrive = function(index) {
        if (index < 0 || index >= planos.length) {
            console.error("Índice de plano inválido para editar link:", index); return;
        }
        const plano = planos[index];
        const linkAtual = plano.linkDrive || ''; // Pega link atual ou string vazia
        // Pede novo link ao usuário
        const novoLink = prompt(`Editar Link de Anotações para "${plano.titulo || 'Plano'}":\n(Deixe em branco para remover)`, linkAtual);

        // Se o usuário não cancelou (novoLink não é null)
        if (novoLink !== null) {
            planos[index].linkDrive = novoLink.trim(); // Atualiza o link (removendo espaços extras)
            // Salva a alteração no Firebase
            salvarPlanos(planos, (salvoComSucesso) => {
                if (salvoComSucesso) {
                    console.log('Link atualizado e salvo no Firebase.');
                } else {
                    console.error('Falha ao salvar atualização do link no Firebase.');
                    alert("Erro ao salvar o link. Tente novamente.");
                    // Reverte a mudança local se o salvamento falhar
                    planos[index].linkDrive = linkAtual;
                }
                // Re-renderiza os planos para mostrar a mudança (ou a reversão)
                renderizarPlanos();
            });
        }
    };

    // Funções de Recálculo (mostrarOpcoesRecalculo, fecharAvisoRecalculo, solicitarNovaDataFim, solicitarPaginasPorDia)
    // Tornando acessíveis globalmente para os botões onclick
    window.mostrarOpcoesRecalculo = function(index) {
        const avisoAtrasoDiv = document.getElementById(`aviso-atraso-${index}`);
        if (!avisoAtrasoDiv) return; // Sai se o elemento não existir
        // Atualiza o HTML da div de aviso para mostrar os botões de recálculo
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
        if (!plano) return; // Sai se o plano não existir
        const diasAtrasados = verificarAtraso(plano);
        // Verifica se o plano ainda está atrasado
        if(determinarStatusPlano(plano) === 'atrasado' && diasAtrasados > 0) {
            // Restaura o aviso original de atraso
            avisoAtrasoDiv.innerHTML = `
                <p>⚠️ Plano com atraso de ${diasAtrasados} dia(s)!</p>
                <div class="acoes-dados">
                    <button onclick="mostrarOpcoesRecalculo(${index})">Recalcular Plano</button>
                </div>`;
        } else {
            // Se não está mais atrasado (ou nunca esteve), remove a div de aviso
            avisoAtrasoDiv.remove();
        }
    };
    window.solicitarNovaDataFim = function(index) {
        // Pega a data de hoje no formato YYYY-MM-DD
        const hojeStr = new Date().toISOString().split('T')[0];
        // Pede a nova data ao usuário
        const novaDataFimInput = prompt(`Recalcular definindo Nova Data de Fim:\n\nDigite a nova data limite (YYYY-MM-DD, após ${hojeStr}):`);
        if (novaDataFimInput) { // Se o usuário digitou algo
            try {
                // Tenta criar um objeto Date (adiciona T00:00:00 para evitar problemas de fuso)
                const novaDataFim = new Date(novaDataFimInput + 'T00:00:00');
                // Verifica se a data criada é válida
                if (isNaN(novaDataFim.getTime())) {
                    throw new Error("Data inválida.");
                }
                const hoje = getHojeNormalizado(); // Pega hoje (sem horas)
                // Verifica se a nova data é realmente no futuro
                if (novaDataFim <= hoje) {
                     alert("A nova data de fim deve ser posterior à data de hoje.");
                     mostrarOpcoesRecalculo(index); // Mostra opções de novo
                     return;
                }
                // Chama a função que faz o recálculo real
                recalcularPlanoNovaData(index, novaDataFim);
            } catch (e) {
                 alert("Erro ao processar a data. Use o formato YYYY-MM-DD.");
                 mostrarOpcoesRecalculo(index); // Mostra opções de novo
            }
        } else {
             // Se o usuário cancelou o prompt, volta para as opções
             mostrarOpcoesRecalculo(index);
        }
    };
     window.solicitarPaginasPorDia = function(index) {
        // Pede o número de páginas por dia
        const paginasPorDiaInput = prompt("Recalcular definindo Páginas por Dia:\n\nDigite o número de páginas que você quer ler por dia a partir de agora:");
        if (paginasPorDiaInput) { // Se o usuário digitou algo
            const paginasPorDia = parseInt(paginasPorDiaInput);
            // Verifica se é um número válido e positivo
            if (isNaN(paginasPorDia) || paginasPorDia <= 0) {
                alert("Insira um número válido de páginas por dia (maior que zero).");
                mostrarOpcoesRecalculo(index); // Mostra opções de novo
                return;
            }
             const plano = planos[index];
             if (!plano) return; // Sai se plano não existir
             // Calcula páginas restantes (com fallback para 0)
             const paginasRestantes = (plano.totalPaginas || 0) - (plano.paginasLidas || 0);
             // Se não há páginas restantes, informa e fecha o aviso
             if (paginasRestantes <= 0) {
                 alert("Não há páginas restantes para ler neste plano.");
                 fecharAvisoRecalculo(index); // Fecha o aviso (não há o que recalcular)
                 return;
             }
             // Chama a função que calcula a nova data fim e depois recalcula
            recalcularPlanoPaginasPorDia(index, paginasPorDia);
        } else {
             // Se o usuário cancelou o prompt, volta para as opções
             mostrarOpcoesRecalculo(index);
        }
    };


    // Função calcularNovaDataFimPorPaginasDia (Helper para recalculo por páginas/dia)
    function calcularNovaDataFimPorPaginasDia(plano, paginasPorDia) {
        // Validação inicial
        const paginasRestantes = (plano.totalPaginas || 0) - (plano.paginasLidas || 0);
         if (paginasRestantes <= 0 || paginasPorDia <= 0) { return null; }

        let proximoDiaLeitura = getHojeNormalizado(); // Começa a procurar a partir de hoje
        // Pega dias da semana do plano (ou array vazio se não for semanal)
        const diasSemanaPlano = (plano.periodicidade === 'semanal' && Array.isArray(plano.diasSemana)) ? plano.diasSemana : [];
        const periodicidadePlano = plano.periodicidade || 'diario';

        // Função auxiliar para verificar se uma data é dia de leitura no plano
         const isDiaValido = (data) => {
             const diaSem = data.getDay(); // 0=Dom, 1=Seg, ...
             // É válido se for diário OU (se for semanal E o dia da semana está na lista)
             return periodicidadePlano === 'diario' || (periodicidadePlano === 'semanal' && diasSemanaPlano.includes(diaSem));
         };

         // Avança até encontrar o primeiro dia de leitura válido a partir de hoje
         while (!isDiaValido(proximoDiaLeitura)) {
             proximoDiaLeitura.setDate(proximoDiaLeitura.getDate() + 1);
         }

        // Calcula quantos dias de leitura serão necessários (arredonda para cima)
        const diasLeituraNecessarios = Math.ceil(paginasRestantes / paginasPorDia);

        let dataFimCalculada = new Date(proximoDiaLeitura); // Começa a contar a partir do próximo dia válido
        let diasLeituraContados = 0;
        let safetyCounter = 0; // Contador de segurança para evitar loops infinitos
        const MAX_ITERATIONS = 10000; // Limite de iterações (evita travar em casos estranhos)

        // Loop para encontrar a data final
        while(diasLeituraContados < diasLeituraNecessarios && safetyCounter < MAX_ITERATIONS) {
             if (isDiaValido(dataFimCalculada)) {
                 diasLeituraContados++; // Conta apenas se for um dia válido de leitura
             }
             // Se ainda não atingiu o número de dias necessários, avança para o dia seguinte
             if (diasLeituraContados < diasLeituraNecessarios) {
                 dataFimCalculada.setDate(dataFimCalculada.getDate() + 1);
             }
             safetyCounter++; // Incrementa contador de segurança
             // Se o contador exceder o limite, para e retorna erro
             if(safetyCounter >= MAX_ITERATIONS) {
                 console.error("Loop break em calcularNovaDataFimPorPaginasDia.");
                 return null;
             }
        }
        // Retorna a data final calculada (ou null se houve erro)
        return dataFimCalculada;
    }

    // Função recalcularPlanoPaginasPorDia (Usa a data calculada para chamar o recálculo principal)
    // Tornando acessível globalmente, pois pode ser chamada indiretamente
    window.recalcularPlanoPaginasPorDia = function(index, paginasPorDia) {
        const plano = planos[index];
        if (!plano) return;
        // Calcula a nova data de fim baseada nas páginas por dia
        const novaDataFim = calcularNovaDataFimPorPaginasDia(plano, paginasPorDia);

        // Se o cálculo da data falhou, mostra erro
        if (!novaDataFim) {
             alert("Não foi possível calcular a nova data de fim. Verifique a periodicidade e os dados do plano.");
             mostrarOpcoesRecalculo(index); // Volta para as opções
             return;
         }
        // Se a data foi calculada, chama a função de recálculo principal
        recalcularPlanoNovaData(index, novaDataFim);
    };

     // Função recalcularPlanoNovaData (Lógica principal de recálculo)
    function recalcularPlanoNovaData(index, novaDataFim) {
        const planoOriginal = planos[index];
        if (!planoOriginal) {
            console.error("Plano original não encontrado para recálculo:", index);
            return;
        }

        // Calcula o estado atual
        const paginasLidas = planoOriginal.paginasLidas || 0;
        // A próxima página a ler é a página inicial + páginas já lidas
        const paginaInicioRecalculo = (planoOriginal.paginaInicio || 1) + paginasLidas;
        // Total de páginas restantes
        const paginasRestantes = (planoOriginal.totalPaginas || 0) - paginasLidas;

        // Se não há mais páginas a ler, informa e fecha o aviso
        if (paginasRestantes <= 0) {
            alert("Todas as páginas já foram lidas ou não há páginas restantes.");
            fecharAvisoRecalculo(index);
            return;
        }

        // Determina a data de início para o recálculo (hoje ou o próximo dia válido)
        let dataInicioRecalculo = getHojeNormalizado();
        const diasSemanaPlano = (planoOriginal.periodicidade === 'semanal' && Array.isArray(planoOriginal.diasSemana)) ? planoOriginal.diasSemana : [];
        const periodicidadePlano = planoOriginal.periodicidade || 'diario';

        // Função auxiliar para verificar se é um dia válido de leitura
         const isDiaValido = (data) => {
             const diaSem = data.getDay();
             return periodicidadePlano === 'diario' || (periodicidadePlano === 'semanal' && diasSemanaPlano.includes(diaSem));
         };

         // Avança até encontrar o primeiro dia válido a partir de hoje
         while (!isDiaValido(dataInicioRecalculo)) {
             dataInicioRecalculo.setDate(dataInicioRecalculo.getDate() + 1);
         }

         // Validação: Nova data fim não pode ser antes do próximo dia de leitura
         if (novaDataFim < dataInicioRecalculo) {
             alert(`A nova data de fim (${novaDataFim.toLocaleDateString('pt-BR')}) não pode ser anterior ao próximo dia de leitura válido (${dataInicioRecalculo.toLocaleDateString('pt-BR')}).`);
             mostrarOpcoesRecalculo(index);
             return;
         }

        // Gera a lista de novos dias de leitura entre a data de início do recálculo e a nova data fim
        const novosDiasLeitura = [];
        let dataAtual = new Date(dataInicioRecalculo);
        while (dataAtual <= novaDataFim) {
            if (isDiaValido(dataAtual)) {
                // Adiciona apenas os dias válidos, zerados inicialmente
                novosDiasLeitura.push({ data: new Date(dataAtual), paginaInicioDia: 0, paginaFimDia: 0, paginas: 0, lido: false });
            }
            dataAtual.setDate(dataAtual.getDate() + 1); // Avança para o próximo dia
        }

        // Se nenhum dia de leitura foi encontrado no novo período, informa erro
        if (novosDiasLeitura.length === 0) {
            alert(`Não há dias de leitura válidos entre ${dataInicioRecalculo.toLocaleDateString('pt-BR')} e ${novaDataFim.toLocaleDateString('pt-BR')} com a periodicidade selecionada.`);
            mostrarOpcoesRecalculo(index);
            return;
        }

        // Distribui as páginas restantes entre os novos dias de leitura
        const numNovosDias = novosDiasLeitura.length;
        const paginasPorDiaBase = Math.floor(paginasRestantes / numNovosDias); // Divisão inteira
        const paginasExtras = paginasRestantes % numNovosDias; // Resto da divisão (páginas extras)
        let paginaAtualRecalculo = paginaInicioRecalculo; // Começa da página onde parou

        novosDiasLeitura.forEach((dia, idx) => {
            // Adiciona 1 página extra aos primeiros 'paginasExtras' dias
            let paginasNesteDia = paginasPorDiaBase + (idx < paginasExtras ? 1 : 0);
            dia.paginaInicioDia = paginaAtualRecalculo;
            dia.paginaFimDia = paginaAtualRecalculo + paginasNesteDia - 1;

             // Garante que a página final do dia não ultrapasse a página final do livro
             if(dia.paginaFimDia > planoOriginal.paginaFim) {
                 dia.paginaFimDia = planoOriginal.paginaFim;
             }
             // Calcula o número de páginas efetivas para este dia (pode ser 0 se início > fim)
             dia.paginas = Math.max(0, dia.paginaFimDia - dia.paginaInicioDia + 1);

             // Atualiza a página atual para o próximo dia
            paginaAtualRecalculo = dia.paginaFimDia + 1;
        });

         // Ajuste final para garantir que a última página do livro seja incluída
         // (caso a divisão não tenha sido exata ou houve arredondamento)
         const ultimoDiaNovo = novosDiasLeitura[numNovosDias - 1];
         if (ultimoDiaNovo && ultimoDiaNovo.paginaFimDia < planoOriginal.paginaFim && paginaAtualRecalculo <= planoOriginal.paginaFim) {
            console.warn(`Ajustando pág final recalculada no último dia de ${ultimoDiaNovo.paginaFimDia} para ${planoOriginal.paginaFim}`);
             ultimoDiaNovo.paginaFimDia = planoOriginal.paginaFim;
             // Recalcula as páginas do último dia após o ajuste
             ultimoDiaNovo.paginas = Math.max(0, ultimoDiaNovo.paginaFimDia - ultimoDiaNovo.paginaInicioDia + 1);
         } else if (ultimoDiaNovo && ultimoDiaNovo.paginaFimDia > planoOriginal.paginaFim) {
             // Caso raro onde o cálculo ultrapassou, corrige para a página final exata
             ultimoDiaNovo.paginaFimDia = planoOriginal.paginaFim;
             ultimoDiaNovo.paginas = Math.max(0, ultimoDiaNovo.paginaFimDia - ultimoDiaNovo.paginaInicioDia + 1);
         }

        // Mantém os dias que já foram marcados como lidos no plano original
        const diasLidosOriginais = planoOriginal.diasPlano.filter(dia => dia.lido);
        // Combina os dias lidos antigos com os novos dias recalculados
        planos[index].diasPlano = [...diasLidosOriginais, ...novosDiasLeitura]
                                     // Ordena a lista combinada por data
                                    .sort((a, b) => {
                                        const dataA = (a.data instanceof Date && !isNaN(a.data)) ? a.data.getTime() : Infinity;
                                        const dataB = (b.data instanceof Date && !isNaN(b.data)) ? b.data.getTime() : Infinity;
                                        return dataA - dataB;
                                    });
        // Atualiza a data de fim do plano para a nova data definida
        planos[index].dataFim = novaDataFim;
        // Recalcula o total de páginas lidas (pode não mudar, mas é bom garantir)
        atualizarPaginasLidas(index);

        // Salva o plano recalculado no Firebase
        salvarPlanos(planos, (salvoComSucesso) => {
            if (salvoComSucesso) console.log("Plano recalculado e salvo.");
            else console.error("Erro ao salvar plano recalculado.");
            // Re-renderiza a interface para mostrar o plano atualizado
            renderizarPlanos();
        });
    }

    // Função excluirPlano
    // Tornando acessível globalmente
    window.excluirPlano = function(index) {
        if (index < 0 || index >= planos.length) {
            console.error("Índice inválido para exclusão:", index); return;
        }
        const plano = planos[index];
        // Pede confirmação ao usuário
        if (confirm(`Tem certeza que deseja excluir o plano "${plano.titulo || 'Sem Título'}"? Esta ação não pode ser desfeita.`)) {
            // Remove o plano do array local
            planos.splice(index, 1);
            // Salva a lista de planos atualizada (sem o plano excluído) no Firebase
            salvarPlanos(planos, (salvoComSucesso) => {
                if (!salvoComSucesso) {
                    console.error('Falha ao salvar exclusão no Firebase.');
                    alert("Erro ao salvar a exclusão do plano. Ele pode reaparecer ao recarregar.");
                    // Opcional: Readicionar o plano localmente se salvar falhar? (Complexo)
                }
                // Re-renderiza a lista de planos (sem o plano excluído)
                renderizarPlanos();
            });
        }
    };

    // Função exportarAgendaBtn listener e exportarParaAgenda
    exportarAgendaBtn.addEventListener('click', () => {
        // Verifica se o usuário está logado e se existem planos
        if (!user || planos.length === 0) {
            alert("Você precisa estar logado e ter planos cadastrados para exportar."); return;
        }
        // Cria a mensagem para o prompt, listando os planos
        let promptMessage = "Digite o número do plano para exportar para a agenda:\n\n";
        planos.forEach((plano, index) => { promptMessage += `${index + 1}. ${plano.titulo || 'Plano Sem Título'}\n`; });

        const planoIndexInput = prompt(promptMessage); // Mostra o prompt
        if (planoIndexInput === null) { return; } // Usuário cancelou

        // Converte a entrada para número (base 1 para base 0)
        const planoIndex = parseInt(planoIndexInput) - 1;
        // Valida o índice
        if (isNaN(planoIndex) || planoIndex < 0 || planoIndex >= planos.length) {
            alert("Número de plano inválido."); return;
        }
        const planoSelecionado = planos[planoIndex];
        // Verifica se o plano selecionado tem dias definidos
         if (!planoSelecionado.diasPlano || planoSelecionado.diasPlano.length === 0) {
             alert(`O plano "${planoSelecionado.titulo || 'Selecionado'}" não possui dias de leitura definidos e não pode ser exportado.`); return;
         }
        // Chama a função para exportar o plano selecionado
        exportarParaAgenda(planoSelecionado);
    });
    function exportarParaAgenda(plano) {
        // Pede o horário de início ao usuário
        const horarioInicio = prompt(`Exportar "${plano.titulo || 'Plano'}" para Agenda:\n\nDefina o horário de início da leitura (HH:MM):`, "09:00");
        if (!horarioInicio) return; // Usuário cancelou
        // Pede o horário de fim
        const horarioFim = prompt(`Defina o horário de fim da leitura (HH:MM):`, "09:30");
        if (!horarioFim) return; // Usuário cancelou

        // Valida o formato dos horários usando Regex
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(horarioInicio) || !timeRegex.test(horarioFim)) {
            alert("Formato de horário inválido. Use HH:MM (ex: 08:00, 14:30)."); return;
        }

        try {
            // Gera o conteúdo do arquivo .ics
            const eventosICS = gerarICS(plano, horarioInicio, horarioFim);
            // Inicia o download do arquivo
            downloadICSFile(eventosICS, plano.titulo || 'SemTitulo');
        } catch (error) {
             console.error("Erro ao gerar ou baixar arquivo ICS:", error);
             alert("Ocorreu um erro ao gerar o arquivo da agenda: " + error.message);
        }
    }

    // Função gerarICS (Cria o conteúdo do arquivo .ics)
    function gerarICS(plano, horarioInicio, horarioFim) {
         // Validação robusta dos dados necessários do plano
         if (!plano || !plano.diasPlano || plano.diasPlano.length === 0 ||
             !plano.dataInicio || !plano.dataFim ||
             !(plano.dataInicio instanceof Date) || !(plano.dataFim instanceof Date) ||
             isNaN(plano.dataInicio.getTime()) || isNaN(plano.dataFim.getTime())) {
            throw new Error("Dados do plano incompletos ou inválidos para gerar o arquivo da agenda.");
        }

        // Cria um ID único para o evento recorrente (se o plano não tiver um ID, gera um)
         if (!plano.id) plano.id = crypto.randomUUID(); // Garante que o plano tenha um ID
         const uidEvento = `${plano.id.replace(/[^a-z0-9]/gi, '')}@gerenciador-planos-leitura.app`; // Cria UID limpo
         const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split('.')[0] + "Z"; // Timestamp atual em formato ICS

         // Função auxiliar para formatar data e hora no padrão ICS (sem timezone local)
         const formatICSDate = (date, time) => {
            if (!(date instanceof Date) || isNaN(date.getTime())) throw new Error("Data inválida no formatICSDate");
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Mês (01-12)
            const day = date.getDate().toString().padStart(2, '0');         // Dia (01-31)
            const [hour, minute] = time.split(':');                           // Hora e Minuto
            return `${year}${month}${day}T${hour}${minute}00`;                 // Formato YYYYMMDDTHHMMSS
         };

        // Função auxiliar para formatar a data final da recorrência (UNTIL) em UTC
         const formatICSDateUTCUntil = (date) => {
             if (!(date instanceof Date) || isNaN(date.getTime())) throw new Error("Data inválida no formatICSDateUTCUntil");
             // Cria uma data UTC correspondente ao final do dia da data fornecida
             const dateUtc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59));
             const year = dateUtc.getUTCFullYear();
             const month = (dateUtc.getUTCMonth() + 1).toString().padStart(2, '0');
             const day = dateUtc.getUTCDate().toString().padStart(2, '0');
             return `${year}${month}${day}T235959Z`; // Formato YYYYMMDDTHHMMSSZ (Z indica UTC)
         };

         // Início do arquivo VCALENDAR
        let icsString = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//GerenciadorPlanosLeitura//SeuApp//PT\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n`;

        // Encontra o primeiro dia de leitura válido para usar como DTSTART
        let primeiroDiaLeituraValido = null;
        for(const dia of plano.diasPlano) {
             if (dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                 primeiroDiaLeituraValido = dia.data;
                 break; // Para no primeiro que encontrar
             }
        }
        // Se nenhum dia válido for encontrado, lança erro
        if(!primeiroDiaLeituraValido) throw new Error("Nenhum dia de leitura válido encontrado no plano.");

        // Início do evento VEVENT
        icsString += `BEGIN:VEVENT\r\n`;
        icsString += `UID:${uidEvento}\r\n`; // Identificador único do evento
        icsString += `DTSTAMP:${dtstamp}\r\n`; // Data de criação do evento
        // Data/Hora de início do *primeiro* evento da recorrência
        icsString += `DTSTART:${formatICSDate(primeiroDiaLeituraValido, horarioInicio)}\r\n`;
        // Data/Hora de fim do *primeiro* evento da recorrência
        icsString += `DTEND:${formatICSDate(primeiroDiaLeituraValido, horarioFim)}\r\n`;

        // Define a Regra de Recorrência (RRULE)
        let rrule = 'RRULE:FREQ=';
        if (plano.periodicidade === 'diario') {
            rrule += 'DAILY'; // Repete diariamente
        } else if (plano.periodicidade === 'semanal' && Array.isArray(plano.diasSemana) && plano.diasSemana.length > 0) {
            rrule += 'WEEKLY'; // Repete semanalmente
            // Converte os índices de dia (0-6) para o formato ICS (SU, MO, TU, WE, TH, FR, SA)
            const diasSemanaICS = plano.diasSemana.sort().map(diaIndex => ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][diaIndex]).join(',');
            rrule += `;BYDAY=${diasSemanaICS}`; // Nos dias especificados
        } else {
             // Fallback para diário se for semanal mas sem dias, ou periodicidade inválida
             console.warn("Periodicidade inválida ou semanal sem dias para RRULE. Usando DAILY como fallback.");
             rrule += 'DAILY';
        }

         // Define até quando a recorrência vai (baseado na data fim do plano)
         rrule += `;UNTIL=${formatICSDateUTCUntil(plano.dataFim)}`;
         icsString += `${rrule}\r\n`; // Adiciona a RRULE completa

        // Adiciona detalhes do evento
        let description = `Plano de Leitura: ${plano.titulo || 'Sem Título'}.\\n`; // \\n para nova linha no ICS
        description += `Páginas do Plano: ${plano.paginaInicio || '?'}-${plano.paginaFim || '?'}.\\n`;
        description += `Período Total: ${plano.dataInicio.toLocaleDateString('pt-BR')} a ${plano.dataFim.toLocaleDateString('pt-BR')}.\\n\\n`;
        description += `Lembrete: Verifique no aplicativo as páginas exatas para o dia.\\n`;
        description += `Acesse o app: ${window.location.origin + window.location.pathname}`; // Link para o app
        icsString += `SUMMARY:Leitura: ${plano.titulo || 'Sem Título'}\r\n`; // Título do evento
        icsString += `DESCRIPTION:${description}\r\n`; // Descrição detalhada
        icsString += `LOCATION:Local de Leitura Preferido\r\n`; // Localização genérica
        icsString += `STATUS:CONFIRMED\r\n`; // Status do evento
        icsString += `TRANSP:OPAQUE\r\n`; // Marca como ocupado na agenda

        // Adiciona um alarme (lembrete) 15 minutos antes
        icsString += `BEGIN:VALARM\r\n`;
        icsString += `ACTION:DISPLAY\r\n`;
        icsString += `DESCRIPTION:Lembrete de Leitura: ${plano.titulo || 'Sem Título'}\r\n`;
        icsString += `TRIGGER:-PT15M\r\n`; // 15 minutos antes (P=Period, T=Time)
        icsString += `END:VALARM\r\n`;

        // Fim do evento e do calendário
        icsString += `END:VEVENT\r\n`;
        icsString += `END:VCALENDAR\r\n`;

        return icsString; // Retorna a string ICS completa
    }


    // Função downloadICSFile (Cria um link temporário para baixar o arquivo)
    function downloadICSFile(icsContent, planoTitulo) {
        // Cria um Blob (objeto binário) com o conteúdo ICS
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        // Cria uma URL temporária para o Blob
        const url = URL.createObjectURL(blob);
        // Cria um elemento <a> invisível
        const a = document.createElement('a');
        a.href = url;
        // Define o nome do arquivo para download (limpando caracteres inválidos do título)
        const nomeArquivo = `Plano_Leitura_${planoTitulo.replace(/[^a-z0-9]/gi, '_')}.ics`;
        a.download = nomeArquivo;
        // Adiciona o link ao corpo do documento
        document.body.appendChild(a);
        // Simula um clique no link para iniciar o download
        a.click();
        // Remove o link do corpo do documento
        document.body.removeChild(a);
        // Libera a URL temporária do Blob da memória
        URL.revokeObjectURL(url);
    }

    // Função togglePaginatorVisibility (Mostra/esconde paginador com base no scroll e conteúdo)
    function togglePaginatorVisibility() {
        const paginador = document.getElementById('paginador-planos');
        if (!paginador) return; // Sai se o paginador não existir

        const lista = document.getElementById('lista-planos');
        // Esconde se não houver lista, se não houver planos, ou se tiver 1 ou menos planos
        if (!lista || !planos || planos.length <= 1) {
            paginador.classList.add('hidden');
            return;
        }

        // Lógica original de visibilidade baseada na posição do footer (mantida)
        const footer = document.querySelector('footer');
        if (!footer) { // Se não houver footer, mostra sempre (se houver mais de 1 plano)
             paginador.classList.remove('hidden');
             return;
        }
        const listaRect = lista.getBoundingClientRect();
        const footerRect = footer.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        // Mostra se a lista é visível e se a parte inferior da lista + margem está abaixo do topo do footer
        // OU se o topo do footer está fora da tela (scroll longo)
        if (listaRect.height > 0 && (listaRect.bottom + 50 > footerRect.top || footerRect.top > windowHeight)) {
            paginador.classList.remove('hidden'); // Mostra o paginador
         } else {
            paginador.classList.add('hidden'); // Esconde o paginador
         }
    }
    // Adiciona listeners para chamar a função em scroll e resize
    window.addEventListener('scroll', togglePaginatorVisibility);
    window.addEventListener('resize', togglePaginatorVisibility);
    // Chama uma vez no início para definir estado inicial (após renderizarPlanos)

    // Função distribuirPaginasPlano (Divide as páginas entre os dias de leitura)
    function distribuirPaginasPlano(plano) {
        // Validação robusta dos dados necessários
        if (!plano || !plano.diasPlano || plano.diasPlano.length === 0 ||
            typeof plano.paginaInicio !== 'number' || isNaN(plano.paginaInicio) || plano.paginaInicio < 1 ||
            typeof plano.paginaFim !== 'number' || isNaN(plano.paginaFim) ||
            plano.paginaFim < plano.paginaInicio) {

            console.warn("Dados insuficientes ou inválidos para distribuir páginas:", plano);
            // Zera as páginas dos dias existentes se os dados forem inválidos
            if(plano && plano.diasPlano) {
                 plano.diasPlano.forEach(dia => {
                     dia.paginaInicioDia = plano.paginaInicio || 1; // Ou 0? Decidir o padrão
                     dia.paginaFimDia = (plano.paginaInicio || 1) -1; // Garante início <= fim
                     dia.paginas = 0;
                 });
            }
             // Zera o total e as lidas do plano
             if(plano) {
                 plano.totalPaginas = 0;
                 plano.paginasLidas = 0;
                 // Se o plano já está na lista global, atualiza lá também
                 const indexGlobal = planos.findIndex(p => p.id === plano.id);
                 if(indexGlobal !== -1) {
                    atualizarPaginasLidas(indexGlobal);
                 }
             }
            return; // Interrompe a distribuição
        }

        // Cálculo das páginas totais e número de dias
        const totalPaginasLivro = (plano.paginaFim - plano.paginaInicio + 1);
        const diasDeLeitura = plano.diasPlano;
        const numeroDeDias = diasDeLeitura.length;

        plano.totalPaginas = totalPaginasLivro; // Define o total de páginas do plano

        // Calcula a distribuição base e as páginas extras
        const paginasPorDiaBase = Math.floor(totalPaginasLivro / numeroDeDias);
        const paginasRestantes = totalPaginasLivro % numeroDeDias;

        let paginaAtual = plano.paginaInicio; // Começa da página inicial definida

        // Distribui as páginas para cada dia
        diasDeLeitura.forEach((dia, index) => {
            let paginasNesteDia = paginasPorDiaBase + (index < paginasRestantes ? 1 : 0);
            dia.paginaInicioDia = paginaAtual;
            dia.paginaFimDia = paginaAtual + paginasNesteDia - 1;

             // Garante que não ultrapasse a página final do livro
             if (dia.paginaFimDia > plano.paginaFim) {
                 dia.paginaFimDia = plano.paginaFim;
             }
             // Calcula as páginas efetivas para o dia
             dia.paginas = Math.max(0, dia.paginaFimDia - dia.paginaInicioDia + 1);

             // Avança a página atual para o próximo dia
            paginaAtual = dia.paginaFimDia + 1;
        });

        // Ajuste final no último dia (similar ao recálculo)
        if (diasDeLeitura.length > 0) {
            const ultimoDia = diasDeLeitura[numeroDeDias - 1];
             if (ultimoDia && ultimoDia.paginaFimDia < plano.paginaFim && paginaAtual <= plano.paginaFim) {
                 console.warn(`Ajustando pag fim (distribuição) do último dia de ${ultimoDia.paginaFimDia} para ${plano.paginaFim}`);
                 ultimoDia.paginaFimDia = plano.paginaFim;
                 ultimoDia.paginas = Math.max(0, ultimoDia.paginaFimDia - ultimoDia.paginaInicioDia + 1);
             } else if (ultimoDia && ultimoDia.paginaFimDia > plano.paginaFim) {
                 ultimoDia.paginaFimDia = plano.paginaFim;
                 ultimoDia.paginas = Math.max(0, ultimoDia.paginaFimDia - ultimoDia.paginaInicioDia + 1);
             }
        }

        // Atualiza as páginas lidas (importante após redistribuir)
        // Se o plano já está na lista global, usa a função global
        const indexGlobal = planos.findIndex(p => p.id === plano.id);
        if (indexGlobal !== -1) {
             atualizarPaginasLidas(indexGlobal);
        } else {
             // Se for um plano novo (ainda não na lista), calcula localmente
             plano.paginasLidas = diasDeLeitura.reduce((sum, dia) => sum + (dia.lido && typeof dia.paginas === 'number' ? dia.paginas : 0), 0);
        }
    }

    // Funções geradoras de dias (gerarDiasPlanoPorDatas, gerarDiasPlanoPorDias)
    function gerarDiasPlanoPorDatas(dataInicio, dataFim, periodicidade, diasSemana) {
        const dias = [];
        // Validação robusta das datas
        if (!(dataInicio instanceof Date) || !(dataFim instanceof Date) || isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime()) || dataFim < dataInicio) {
            console.error("Datas inválidas fornecidas para gerar dias:", dataInicio, dataFim);
            return dias; // Retorna array vazio
        }
        // Normaliza as datas para evitar problemas com horas
        let dataAtual = new Date(dataInicio); dataAtual.setHours(0, 0, 0, 0);
        const dataFimNormalizada = new Date(dataFim); dataFimNormalizada.setHours(0, 0, 0, 0);

        // Loop pelas datas
        while (dataAtual <= dataFimNormalizada) {
            const diaSemanaAtual = dataAtual.getDay();
            // Verifica se o dia deve ser incluído baseado na periodicidade
            if (periodicidade === 'diario' || (periodicidade === 'semanal' && Array.isArray(diasSemana) && diasSemana.includes(diaSemanaAtual))) {
                // Adiciona o dia (com uma nova instância de Date) à lista
                dias.push({ data: new Date(dataAtual), paginaInicioDia: 0, paginaFimDia: 0, paginas: 0, lido: false });
            }
            dataAtual.setDate(dataAtual.getDate() + 1); // Avança para o próximo dia
        }
        return dias; // Retorna a lista de dias gerados
    }
    function gerarDiasPlanoPorDias(dataInicio, numeroDias, periodicidade, diasSemana) {
        const dias = [];
         // Validação robusta dos dados de entrada
         if (!(dataInicio instanceof Date) || isNaN(dataInicio.getTime()) || typeof numeroDias !== 'number' || numeroDias <= 0) {
             console.error("Dados inválidos fornecidos para gerar dias por número:", dataInicio, numeroDias);
             return dias; // Retorna array vazio
         }
        let dataAtual = new Date(dataInicio); dataAtual.setHours(0, 0, 0, 0); // Normaliza data inicial
        let diasAdicionados = 0;
        let safetyCounter = 0;
        // Limite de iterações mais generoso para evitar problemas com periodicidades esparsas
        const MAX_ITERATIONS_DIAS = numeroDias * 10 + 366; // Ex: 10 dias em 1 dia/semana pode levar 70 iterações

        // Loop até adicionar o número de dias desejado ou atingir o limite de segurança
        while (diasAdicionados < numeroDias && safetyCounter < MAX_ITERATIONS_DIAS) {
            const diaSemanaAtual = dataAtual.getDay();
            // Verifica se o dia deve ser incluído
            if (periodicidade === 'diario' || (periodicidade === 'semanal' && Array.isArray(diasSemana) && diasSemana.includes(diaSemanaAtual))) {
                // Adiciona o dia (com nova instância de Date)
                dias.push({ data: new Date(dataAtual), paginaInicioDia: 0, paginaFimDia: 0, paginas: 0, lido: false });
                diasAdicionados++; // Incrementa contador de dias adicionados
            }
             dataAtual.setDate(dataAtual.getDate() + 1); // Avança para o próximo dia
             safetyCounter++; // Incrementa contador de segurança
             // Verifica se o loop está rodando demais
             if (safetyCounter >= MAX_ITERATIONS_DIAS) {
                 console.error("Loop infinito provável detectado em gerarDiasPlanoPorDias. Interrompido.");
                 alert(`Erro: Não foi possível gerar os ${numeroDias} dias nos ${MAX_ITERATIONS_DIAS} dias verificados. Verifique a periodicidade e o número de dias.`);
                 break; // Interrompe o loop
             }
        }
        // Avisa se não conseguiu gerar todos os dias solicitados
        if (diasAdicionados < numeroDias) {
             console.warn(`Não foi possível gerar os ${numeroDias} dias solicitados com a periodicidade. Apenas ${diasAdicionados} foram gerados.`);
             // Decide se retorna os dias gerados ou um erro. Retornar os gerados é mais flexível.
         }
        return dias; // Retorna a lista de dias gerados
    }
    // Função calcularDataFimReal (Pode ser útil, mas não é usada diretamente no fluxo principal agora)
    /*
    function calcularDataFimReal(dataInicio, numeroDias, periodicidade, diasSemana) { ... }
    */


    // --- Listeners de Eventos da Interface ---

    // Botões de Autenticação
    showAuthButton.addEventListener('click', () => {
        authFormDiv.style.display = 'flex'; // Mostra o formulário
        showAuthButton.style.display = 'none'; // Esconde o botão "Login/Cadastro"
        cancelAuthButton.style.display = 'inline-block'; // Mostra o botão "Cancelar"
        logoutButton.style.display = 'none'; // Garante que "Sair" esteja oculto
        emailLoginInput.focus(); // Foca no campo de email
        atualizarVisibilidadeBotoesAcao(); // Reavalia outros botões (desnecessário aqui, mas seguro)
    });
    cancelAuthButton.addEventListener('click', () => {
        authFormDiv.style.display = 'none'; // Esconde o formulário
        showAuthButton.style.display = 'block'; // Mostra o botão "Login/Cadastro" de volta
        cancelAuthButton.style.display = 'none'; // Esconde o botão "Cancelar"
        emailLoginInput.value = ''; // Limpa campos
        passwordLoginInput.value = '';
        atualizarVisibilidadeBotoesAcao(); // Reavalia botões
    });
    loginEmailButton.addEventListener('click', loginWithEmailPassword); // Chama a função de login
    signupEmailButton.addEventListener('click', signupWithEmailPassword); // Chama a função de cadastro
    logoutButton.addEventListener('click', logout); // Chama a função de logout

    // Botões de Navegação Principal
    novoPlanoBtn.addEventListener('click', function() {
        // Verifica se o usuário está logado antes de permitir criar plano
        if (!user) {
            alert("Faça login ou cadastre-se para criar um novo plano.");
            showAuthButton.click(); // Simula clique no botão de login/cadastro
            return;
        }
        // Mostra a seção de cadastro e esconde a de listagem e painéis
        cadastroPlanoSection.style.display = 'block';
        planosLeituraSection.style.display = 'none';
        leiturasAtrasadasSection.style.display = 'none';
        proximasLeiturasSection.style.display = 'none';
        inicioCadastroBtn.style.display = 'block'; // Mostra botão "Início" no formulário

        // Se não estiver editando (preventFormReset é false), reseta o formulário
        if (!preventFormReset) {
            formPlano.reset(); // Limpa todos os campos
            planoEditandoIndex = -1; // Garante que não está em modo de edição
            formPlano.querySelector('button[type="submit"]').textContent = 'Salvar Plano'; // Texto padrão do botão
             // Configurações padrão do formulário para novo plano
             definirPorDatasRadio.checked = true; // Default para definir por datas
             periodoPorDatasDiv.style.display = 'block';
             periodoPorDiasDiv.style.display = 'none';
             periodicidadeSelect.value = 'diario'; // Default para diário
             diasSemanaSelecao.style.display = 'none'; // Esconde seleção de dias
             // Garante que checkboxes de dias estejam desmarcados
             document.querySelectorAll('input[name="dia-semana"]').forEach(cb => cb.checked = false);
        }
        updateRequiredAttributes(); // Atualiza quais campos são obrigatórios
        atualizarVisibilidadeBotoesAcao(); // Atualiza botões do header
        document.getElementById('titulo-livro').focus(); // Foca no campo de título
    });
    inicioBtn.addEventListener('click', function() { // Botão "Início" no header (visível na tela de cadastro)
        // Mostra a listagem de planos e esconde o formulário
        planosLeituraSection.style.display = 'block';
        cadastroPlanoSection.style.display = 'none';
        inicioCadastroBtn.style.display = 'none'; // Esconde botão "Início" do formulário
        planoEditandoIndex = -1; // Sai do modo de edição
        formPlano.querySelector('button[type="submit"]').textContent = 'Salvar Plano'; // Restaura texto do botão
        atualizarVisibilidadeBotoesAcao(); // Atualiza botões do header
        renderizarPlanos(); // Re-renderiza a lista de planos e painéis
    });
     inicioCadastroBtn.addEventListener('click', function() { // Botão "Início" DENTRO do formulário
         // Simula um clique no botão "Início" do header para voltar à lista
         inicioBtn.click();
     });

    // Controles do Formulário (Radios e Select)
    definirPorDatasRadio.addEventListener('change', function() {
        if (this.checked) {
            periodoPorDatasDiv.style.display = 'block'; // Mostra campos de data
            periodoPorDiasDiv.style.display = 'none';  // Esconde campos de dias
            updateRequiredAttributes(); // Atualiza required
        }
    });
    definirPorDiasRadio.addEventListener('change', function() {
        if (this.checked) {
            periodoPorDatasDiv.style.display = 'none';  // Esconde campos de data
            periodoPorDiasDiv.style.display = 'block'; // Mostra campos de dias
            updateRequiredAttributes(); // Atualiza required
        }
    });
    periodicidadeSelect.addEventListener('change', function() {
        // Mostra/esconde a seleção de dias da semana
        diasSemanaSelecao.style.display = this.value === 'semanal' ? 'block' : 'none';
        // Se mudar para 'diario', desmarca os checkboxes (opcional, mas bom UX)
        if (this.value === 'diario') {
            document.querySelectorAll('input[name="dia-semana"]').forEach(cb => cb.checked = false);
        }
    });

    // Submissão do formulário (Salvar/Atualizar Plano)
    formPlano.addEventListener('submit', function(event) {
        event.preventDefault(); // Impede o envio padrão do formulário
        // Verifica se o usuário está logado
        if (!user) {
             alert("Erro: Usuário não logado. Faça login para salvar.");
             showAuthButton.click(); // Abre o formulário de login
             return;
         }

        // Coleta os dados do formulário
        const titulo = document.getElementById('titulo-livro').value.trim();
        const linkDrive = document.getElementById('link-drive').value.trim();
        const paginaInicio = parseInt(document.getElementById('pagina-inicio').value);
        const paginaFim = parseInt(document.getElementById('pagina-fim').value);
        const definicaoPeriodo = document.querySelector('input[name="definicao-periodo"]:checked').value;
        const periodicidade = periodicidadeSelect.value;

        // Validações básicas
        if (!titulo) { alert('O título do livro é obrigatório.'); return; }
        if (isNaN(paginaInicio) || paginaInicio < 1) { alert('Página de início inválida. Deve ser um número maior ou igual a 1.'); return; }
        if (isNaN(paginaFim) || paginaFim < paginaInicio) { alert('Página de fim inválida. Deve ser um número maior ou igual à página de início.'); return; }

        let dataInicio, dataFim;
        let diasPlano = []; // Array que guardará os objetos de cada dia de leitura
        let diasSemana = []; // Array para guardar os dias selecionados (0-6)

         // Se for semanal, coleta os dias selecionados
         if (periodicidade === 'semanal') {
             document.querySelectorAll('input[name="dia-semana"]:checked').forEach(cb => {
                 diasSemana.push(parseInt(cb.value));
             });
             // Valida se pelo menos um dia foi selecionado
             if (diasSemana.length === 0) {
                 alert('Para periodicidade semanal, você deve selecionar pelo menos um dia da semana.'); return;
             }
             diasSemana.sort((a, b) => a - b); // Ordena os dias (0, 1, 2...)
         }

         // Gera os dias do plano baseado na definição de período
        if (definicaoPeriodo === 'datas') {
            const dataInicioInput = document.getElementById('data-inicio').value;
            const dataFimInput = document.getElementById('data-fim').value;
            // Valida se as datas foram preenchidas
            if (!dataInicioInput || !dataFimInput) { alert('Datas de início e fim são obrigatórias ao definir por datas.'); return; }
            // Cria objetos Date (adiciona T00:00:00 para evitar problemas de fuso)
            dataInicio = new Date(dataInicioInput + 'T00:00:00');
            dataFim = new Date(dataFimInput + 'T00:00:00');
            // Valida se as datas são válidas e se fim não é anterior a início
            if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime())) { alert('Formato de data inválido. Use o seletor de datas.'); return; }
            if (dataFim < dataInicio) { alert('A data de fim não pode ser anterior à data de início.'); return; }
            // Gera os dias de leitura usando a função apropriada
            diasPlano = gerarDiasPlanoPorDatas(dataInicio, dataFim, periodicidade, diasSemana);
        } else { // definicaoPeriodo === 'dias'
            const dataInicioDiasInput = document.getElementById('data-inicio-dias').value;
            const numeroDiasInput = parseInt(document.getElementById('numero-dias').value);
            // Valida os inputs
            if (!dataInicioDiasInput) { alert('Data de início é obrigatória ao definir por número de dias.'); return; }
            if (isNaN(numeroDiasInput) || numeroDiasInput < 1) { alert('Número de dias inválido. Deve ser um número maior que 0.'); return; }
            // Cria a data de início
            dataInicio = new Date(dataInicioDiasInput + 'T00:00:00');
             if (isNaN(dataInicio.getTime())) { alert('Formato da data de início inválido.'); return; }

            // Gera os dias de leitura usando a função apropriada
            diasPlano = gerarDiasPlanoPorDias(dataInicio, numeroDiasInput, periodicidade, diasSemana);

            // Verifica se algum dia foi gerado e se a quantidade foi a esperada
            if (diasPlano.length === 0) {
                 alert("Não foi possível gerar nenhum dia de leitura com as datas e periodicidade selecionadas. Verifique os dados."); return;
             } else if (diasPlano.length < numeroDiasInput) {
                  // Informa o usuário se menos dias foram gerados
                  alert(`Atenção: Com a periodicidade selecionada, foi possível gerar apenas ${diasPlano.length} dias de leitura, em vez dos ${numeroDiasInput} solicitados. O plano será criado com ${diasPlano.length} dias.`);
                  // Poderia perguntar se quer continuar, mas por ora só avisa.
             }

             // Define a data de fim como a data do último dia gerado
             dataFim = diasPlano.length > 0 ? diasPlano[diasPlano.length - 1].data : null;

             // Validação extra da data fim calculada
             if (!dataFim || !(dataFim instanceof Date) || isNaN(dataFim.getTime())) {
                 console.error("Data fim calculada a partir dos dias é inválida:", dataFim);
                 alert("Erro interno ao calcular a data final do plano. Tente novamente."); return;
             }
        }

        // Última verificação se diasPlano ficou vazio (não deveria acontecer se passou nas validações acima)
        if (diasPlano.length === 0) {
            alert("Falha ao gerar os dias de leitura para o plano. Verifique as datas, número de dias e a periodicidade."); return;
        }

        // Cria o objeto com os dados do plano
        const planoData = {
            // Gera um novo ID se for um novo plano, ou usa o ID existente se estiver editando
            id: planoEditandoIndex !== -1 ? planos[planoEditandoIndex].id : crypto.randomUUID(),
            titulo: titulo,
            linkDrive: linkDrive,
            paginaInicio: paginaInicio,
            paginaFim: paginaFim,
            totalPaginas: (paginaFim - paginaInicio + 1),
            definicaoPeriodo: definicaoPeriodo,
            dataInicio: dataInicio,
            dataFim: dataFim,
            periodicidade: periodicidade,
            diasSemana: diasSemana, // Guarda array vazio se for diário
            diasPlano: diasPlano, // Array com os objetos de cada dia
            paginasLidas: 0 // Inicializa páginas lidas como 0
        };

        // Se estiver editando, tenta preservar o status 'lido' dos dias que coincidem
        if (planoEditandoIndex !== -1) {
             const diasLidosAntigosMap = new Map();
             // Cria um mapa com as datas (string YYYY-MM-DD) dos dias lidos do plano original
             planos[planoEditandoIndex].diasPlano.forEach(diaAntigo => {
                 if (diaAntigo.lido && diaAntigo.data instanceof Date && !isNaN(diaAntigo.data.getTime())) {
                     diasLidosAntigosMap.set(diaAntigo.data.toISOString().split('T')[0], true);
                 }
             });
             // Percorre os novos dias gerados
             planoData.diasPlano.forEach(diaNovo => {
                 if (diaNovo.data instanceof Date && !isNaN(diaNovo.data.getTime())) {
                     const dataStr = diaNovo.data.toISOString().split('T')[0];
                     // Se a data do novo dia existia como lida no mapa, marca como lido
                     if (diasLidosAntigosMap.has(dataStr)) {
                         diaNovo.lido = true;
                     }
                 }
             });
        }

        // Distribui as páginas entre os dias gerados (e calcula paginasLidas se for edição)
        distribuirPaginasPlano(planoData); // Esta função agora também atualiza paginasLidas

        // Atualiza ou adiciona o plano na lista local
        if (planoEditandoIndex !== -1) {
            planos[planoEditandoIndex] = planoData; // Substitui o plano existente
        } else {
            planos.unshift(planoData); // Adiciona o novo plano no início da lista
        }

        // Salva a lista completa de planos no Firebase
        salvarPlanos(planos, (salvoComSucesso) => {
            if (salvoComSucesso) {
                console.log(`Plano ${planoEditandoIndex !== -1 ? 'atualizado' : 'salvo'} com sucesso.`);
                planoEditandoIndex = -1; // Reseta o índice de edição
                formPlano.querySelector('button[type="submit"]').textContent = 'Salvar Plano'; // Restaura texto do botão
                inicioBtn.click(); // Volta para a tela inicial (lista de planos)
            } else {
                alert("Houve um erro ao salvar o plano no servidor. Tente novamente.");
                // Opcional: Remover o plano adicionado localmente se salvar falhar?
                // if (planoEditandoIndex === -1) { planos.shift(); }
            }
        });
    });

    // --- Inicialização ---
    initApp(); // Chama a função que configura a observação do estado de autenticação

}); // Fim do DOMContentLoaded
