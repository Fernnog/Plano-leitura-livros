// script.js (COMPLETO e Atualizado com LOGS ADICIONAIS - v_debug_auth)

// Importações do Firebase SDK (Módulos ES6)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// --- Início da Lógica do Aplicativo ---

console.log("[Init] Script carregado.");

// Função para registrar o Service Worker (PWA)
function registerServiceWorker() {
    if ('serviceWorker' in navigator) { // Verifica se o navegador suporta Service Workers
        navigator.serviceWorker.register('./sw.js') // Tenta registrar o sw.js
          .then(registration => {
            console.log('[PWA] Service Worker registrado com sucesso! Escopo:', registration.scope);
          })
          .catch(error => {
            console.error('[PWA] Falha ao registrar o Service Worker:', error);
          });
    } else {
        console.log('[PWA] Service Workers não são suportados neste navegador.');
    }
}

// Chama a função de registro do Service Worker quando a janela carregar
window.addEventListener('load', () => {
    console.log("[Init] Window carregada (load event). Registrando SW...");
    registerServiceWorker();
});

// Executa o código principal quando o DOM estiver totalmente carregado
document.addEventListener('DOMContentLoaded', () => {
    console.log("[Init] DOMContentLoaded disparado. Iniciando seletores e listeners...");

    // --- Seleção de elementos do DOM ---
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
    const syncFirebaseButton = document.getElementById('sync-firebase'); // Mantido, mas oculto

    // Campos de data para gerenciar 'required'
    const dataInicio = document.getElementById('data-inicio');
    const dataFim = document.getElementById('data-fim');
    const dataInicioDias = document.getElementById('data-inicio-dias');
    const numeroDias = document.getElementById('numero-dias');

    // Campo de link
    const linkDriveInput = document.getElementById('link-drive');

    // Elementos dos Painéis de Leitura
    const proximasLeiturasSection = document.getElementById('proximas-leituras-section');
    const listaProximasLeiturasDiv = document.getElementById('lista-proximas-leituras');
    const semProximasLeiturasP = document.getElementById('sem-proximas-leituras');
    const leiturasAtrasadasSection = document.getElementById('leituras-atrasadas-section');
    const listaLeiturasAtrasadasDiv = document.getElementById('lista-leituras-atrasadas');
    const semLeiturasAtrasadasP = document.getElementById('sem-leituras-atrasadas');
    // --- Fim da Seleção de Elementos ---

    // Variável de controle para edição de formulário
    let preventFormReset = false;

    // --- Configurações do Firebase ---
     const firebaseConfig = {
        apiKey: "AIzaSyCzLjQrE3KhneuwZZXIost5oghVjOTmZQE", // Substitua pela sua API Key real
        authDomain: "plano-leitura.firebaseapp.com",
        projectId: "plano-leitura",
        storageBucket: "plano-leitura.appspot.com", // Corrigido: use .appspot.com
        messagingSenderId: "589137978493",
        appId: "1:589137978493:web:f7305bca602383fe14bd14"
    };

    // --- Inicialização do Firebase ---
    console.log("[Firebase] Inicializando Firebase App...");
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    console.log("[Firebase] Firebase App inicializado.");

    // --- Variáveis Globais ---
    let user = null; // Armazena o usuário autenticado
    let planos = []; // Array para armazenar os planos de leitura
    let planoEditandoIndex = -1; // Índice do plano sendo editado (-1 se nenhum)

    // --- Funções Auxiliares ---

    // Obtém data atual normalizada (sem hora/min/seg)
    function getHojeNormalizado() {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        return hoje;
    }

    // Determina o status de um plano (proximo, em_dia, atrasado, concluido)
    function determinarStatusPlano(plano) {
        if (!plano || !plano.diasPlano || !(plano.dataInicio instanceof Date) || !(plano.dataFim instanceof Date) || isNaN(plano.dataInicio) || isNaN(plano.dataFim)) {
            // Adicionado log para plano inválido
            // console.warn("[Status] Dados do plano inválidos para determinar status:", plano);
            return 'invalido'; // Dados incompletos ou inválidos
        }

        const hoje = getHojeNormalizado();
        const dataInicioPlano = new Date(plano.dataInicio); dataInicioPlano.setHours(0,0,0,0);
        const dataFimPlano = new Date(plano.dataFim); dataFimPlano.setHours(0,0,0,0);

        // 1. Concluído (todos os dias marcados como lidos)
        const todosLidos = plano.diasPlano.length > 0 && plano.diasPlano.every(dia => dia.lido);
        if (todosLidos) return 'concluido';

        // 2. Próximo (data de início no futuro)
        if (dataInicioPlano > hoje) return 'proximo';

        // 3. Atrasado (existe algum dia passado não lido)
        const temDiaPassadoNaoLido = plano.diasPlano.some(dia => {
            if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                 const dataDiaNormalizada = new Date(dia.data); dataDiaNormalizada.setHours(0, 0, 0, 0);
                 return dataDiaNormalizada < hoje && !dia.lido;
            }
            return false; // Dia inválido não conta como atraso
         });
         if (temDiaPassadoNaoLido) return 'atrasado';

        // 4. Em dia (hoje está dentro do período e não está atrasado/concluído/próximo)
        if (hoje >= dataInicioPlano && hoje <= dataFimPlano) return 'em_dia';

        // 5. Finalizado "em dia" (passou da data fim, não concluído, mas sem dias passados não lidos)
        if (hoje > dataFimPlano && !todosLidos && !temDiaPassadoNaoLido) {
            // Consideramos como "em dia" pois não há pendências, embora não marcado como concluído
            return 'em_dia';
        }

        // Caso raro: não se encaixa em nenhuma categoria clara
        console.warn("[Status] Plano sem status definido (caso raro):", plano);
        return ''; // Sem status claro
    }


    // --- Lógica Principal da Aplicação ---

    // Inicializa a aplicação, começando pela autenticação
    function initApp() {
        console.log("[App] initApp chamado. Iniciando autenticação...");
        initAuth();
    }

    // Gerencia o estado de autenticação do usuário
    function initAuth() {
        console.log("[Auth] initAuth chamado. Configurando onAuthStateChanged listener...");
        onAuthStateChanged(auth, (currentUser) => {
            console.log("[Auth] >>> onAuthStateChanged disparado <<<");
            console.log("[Auth] currentUser recebido:", currentUser ? currentUser.uid : 'null');
            user = currentUser; // Atualiza a variável global user

            if (user) {
                console.log("[Auth] Usuário LOGADO (UID:", user.uid, ")");
                // Configura UI para usuário logado
                if (authFormDiv) authFormDiv.style.display = 'none';
                if (showAuthButton) showAuthButton.style.display = 'none';
                if (cancelAuthButton) cancelAuthButton.style.display = 'none';
                if (logoutButton) logoutButton.style.display = 'block';
                if (syncFirebaseButton) syncFirebaseButton.style.display = 'none'; // Mantém oculto

                console.log("[Auth] Carregando planos para usuário logado...");
                carregarPlanosSalvos((planosCarregados) => {
                    console.log("[Data] Planos carregados:", planosCarregados ? planosCarregados.length : 0);
                    planos = planosCarregados || [];
                    console.log("[UI] Renderizando planos (usuário logado)...");
                    renderizarPlanos(); // Renderiza a lista principal
                    console.log("[UI] Chamando atualizarVisibilidadeBotoesAcao (usuário logado)...");
                    atualizarVisibilidadeBotoesAcao(); // Ajusta os botões do header
                });
            } else {
                console.log("[Auth] Usuário DESLOGADO.");
                // Configura UI para usuário deslogado
                if (authFormDiv) authFormDiv.style.display = 'none'; // Começa escondido
                if (showAuthButton) showAuthButton.style.display = 'block'; // Mostra botão de login
                if (cancelAuthButton) cancelAuthButton.style.display = 'none';
                if (logoutButton) logoutButton.style.display = 'none';
                if (syncFirebaseButton) syncFirebaseButton.style.display = 'none';

                planos = []; // Limpa planos locais
                console.log("[UI] Renderizando planos (usuário deslogado)...");
                renderizarPlanos(); // Renderiza (mostrará mensagem de login)
                console.log("[UI] Chamando atualizarVisibilidadeBotoesAcao (usuário deslogado)...");
                 atualizarVisibilidadeBotoesAcao(); // Ajusta os botões do header
            }
            console.log("[Auth] <<< Saindo de onAuthStateChanged >>>");
        });
        console.log("[Auth] onAuthStateChanged listener configurado.");
    }

    // Atualiza a visibilidade dos botões do header com base no estado (logado, tela atual)
    function atualizarVisibilidadeBotoesAcao() {
        console.log("[UI] >> Entrando em atualizarVisibilidadeBotoesAcao");

        // Verifica se os elementos essenciais existem antes de prosseguir
        if (!cadastroPlanoSection || !novoPlanoBtn || !inicioBtn || !exportarAgendaBtn || !showAuthButton || !logoutButton || !authFormDiv || !cancelAuthButton) {
            console.error("[UI] ERRO CRÍTICO em atualizarVisibilidadeBotoesAcao: Um ou mais elementos do DOM não foram encontrados!");
            return; // Interrompe a execução para evitar mais erros
        }

        const estaNaTelaCadastro = cadastroPlanoSection.style.display !== 'none';
        console.log(`[UI]   - estaNaTelaCadastro: ${estaNaTelaCadastro}`);
        console.log(`[UI]   - user: ${user ? user.uid : 'null'}`);
        console.log(`[UI]   - planos.length: ${planos ? planos.length : 'undefined'}`);

        if (estaNaTelaCadastro) {
            console.log("[UI]   - Lógica: Tela de Cadastro/Edição");
            novoPlanoBtn.style.display = 'none';         console.log("[UI]     #novo-plano set to none");
            inicioBtn.style.display = user ? 'block' : 'none'; console.log(`[UI]     #inicio set to ${user ? 'block' : 'none'}`);
            exportarAgendaBtn.style.display = 'none';    console.log("[UI]     #exportar-agenda set to none");
            showAuthButton.style.display = 'none';       console.log("[UI]     #show-auth-button set to none");
            logoutButton.style.display = 'none';         console.log("[UI]     #logout-button set to none");
            authFormDiv.style.display = 'none';          console.log("[UI]     #auth-form set to none");
            cancelAuthButton.style.display = 'none';     console.log("[UI]     #cancel-auth-button set to none");
        } else {
            console.log("[UI]   - Lógica: Tela Principal (Lista)");
            novoPlanoBtn.style.display = user ? 'block' : 'none'; console.log(`[UI]     #novo-plano set to ${user ? 'block' : 'none'}`);
            inicioBtn.style.display = 'none';                    console.log("[UI]     #inicio set to none");
            // Corrigido: verificar se 'planos' existe antes de acessar length
            exportarAgendaBtn.style.display = user && planos && planos.length > 0 ? 'block' : 'none'; console.log(`[UI]     #exportar-agenda set to ${user && planos && planos.length > 0 ? 'block' : 'none'}`);
            logoutButton.style.display = user ? 'block' : 'none'; console.log(`[UI]     #logout-button set to ${user ? 'block' : 'none'}`);

            // Controle do formulário de autenticação e seus botões
            const formVisivel = authFormDiv.style.display !== 'none';
            console.log(`[UI]   - formVisivel (#auth-form): ${formVisivel}`);
            if (!formVisivel) {
                showAuthButton.style.display = user ? 'none' : 'block'; console.log(`[UI]     #show-auth-button set to ${user ? 'none' : 'block'} (form oculto)`);
                cancelAuthButton.style.display = 'none';              console.log("[UI]     #cancel-auth-button set to none (form oculto)");
            } else {
                showAuthButton.style.display = 'none';                console.log("[UI]     #show-auth-button set to none (form visível)");
                cancelAuthButton.style.display = 'block';             console.log("[UI]     #cancel-auth-button set to block (form visível)");
            }
        }
        console.log("[UI] << Saindo de atualizarVisibilidadeBotoesAcao");
    }


    // --- Funções de Autenticação ---

    // Login com Email e Senha
    function loginWithEmailPassword() {
        console.log("[Auth] Tentando executar loginWithEmailPassword()..."); // Log de entrada na função
        if (!emailLoginInput || !passwordLoginInput) {
             console.error("[Auth] Inputs de login não encontrados!"); return;
        }
        const email = emailLoginInput.value;
        const password = passwordLoginInput.value;
        console.log("[Auth]   - Email:", email ? email.substring(0, 3) + '...' : 'vazio');
        console.log("[Auth]   - Senha:", password ? 'preenchida' : 'vazia');

        if (!email || !password) {
            alert("Por favor, preencha o email e a senha.");
            console.log("[Auth]   - Login abortado: campos vazios.");
            return;
        }

        console.log("[Auth]   - Chamando signInWithEmailAndPassword...");
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // O sucesso será tratado pelo onAuthStateChanged, que atualizará a UI
                console.log('[Auth]   - signInWithEmailAndPassword SUCESSO:', userCredential.user.uid);
                // Não precisa limpar campos ou esconder form aqui, onAuthStateChanged fará isso.
            })
            .catch((error) => {
                console.error('[Auth]   - signInWithEmailAndPassword ERRO:', error.code, error.message);
                alert('Erro ao fazer login: ' + error.message + ' (Verifique email/senha. Código: ' + error.code + ')');
            });
    }

    // Cadastro com Email e Senha
    function signupWithEmailPassword() {
        console.log("[Auth] Tentando executar signupWithEmailPassword()..."); // Log de entrada na função
         if (!emailLoginInput || !passwordLoginInput) {
             console.error("[Auth] Inputs de cadastro não encontrados!"); return;
        }
        const email = emailLoginInput.value;
        const password = passwordLoginInput.value;
        console.log("[Auth]   - Email:", email ? email.substring(0, 3) + '...' : 'vazio');
        console.log("[Auth]   - Senha:", password ? 'preenchida' : 'vazia');

         if (!email || !password) {
            alert("Por favor, preencha o email e a senha para cadastrar.");
            console.log("[Auth]   - Cadastro abortado: campos vazios.");
            return;
        }
         if (password.length < 6) {
            alert("A senha deve ter pelo menos 6 caracteres.");
             console.log("[Auth]   - Cadastro abortado: senha curta.");
            return;
         }

        console.log("[Auth]   - Chamando createUserWithEmailAndPassword...");
        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                console.log('[Auth]   - createUserWithEmailAndPassword SUCESSO:', userCredential.user.uid);
                alert('Cadastro realizado com sucesso! Agora você pode fazer login.');
                // Limpa campos e esconde form para incentivar o login
                emailLoginInput.value = '';
                passwordLoginInput.value = '';
                if (authFormDiv) authFormDiv.style.display = 'none';
                if (showAuthButton) showAuthButton.style.display = 'block';
                if (cancelAuthButton) cancelAuthButton.style.display = 'none';
                console.log("[UI] Chamando atualizarVisibilidadeBotoesAcao após cadastro bem-sucedido...");
                atualizarVisibilidadeBotoesAcao();
            })
            .catch((error) => {
                console.error('[Auth]   - createUserWithEmailAndPassword ERRO:', error.code, error.message);
                 let friendlyMessage = 'Erro ao cadastrar: ' + error.message;
                 if (error.code === 'auth/email-already-in-use') { friendlyMessage = 'Erro: Este email já está cadastrado. Tente fazer login.'; }
                 else if (error.code === 'auth/invalid-email') { friendlyMessage = 'Erro: O formato do email é inválido.'; }
                 else if (error.code === 'auth/weak-password') { friendlyMessage = 'Erro: A senha é muito fraca. Use pelo menos 6 caracteres.'; }
                alert(friendlyMessage + ' (Código: ' + error.code + ')');
            });
    }

    // Logout do usuário
    function logout() {
        console.log("[Auth] Função logout() iniciada. Chamando signOut...");
        signOut(auth)
            .then(() => {
                console.log('[Auth] signOut SUCESSO.');
                // onAuthStateChanged cuidará da atualização da UI (limpar planos, mostrar login, etc.)
            })
            .catch((error) => {
                console.error('[Auth] signOut ERRO:', error);
                alert('Erro ao fazer logout. Tente novamente.');
            });
    }

    // --- Funções de Interação com Firestore ---

    // Carrega planos do Firestore para o usuário logado
    async function carregarPlanosSalvos(callback) {
        if (!user) {
            console.log('[Data] Usuário não logado, retornando planos vazios.');
            if (callback) callback([]);
            return;
        }
        const userId = user.uid;
        const docRef = doc(db, 'users', userId);
        console.log("[Data] Tentando carregar planos para userId:", userId);
        try {
            const docSnap = await getDoc(docRef);
            let planosDoFirestore = [];
            if (docSnap.exists()) {
                const data = docSnap.data();
                planosDoFirestore = data.planos || [];
                console.log(`[Data] Documento encontrado para ${userId}. Planos brutos:`, planosDoFirestore.length);

                // Processamento: Converter strings de data para objetos Date e garantir campos
                planosDoFirestore = planosDoFirestore.map((plano, index) => {
                    // Validação Mínima (Título e Datas)
                    if (!plano || typeof plano.titulo !== 'string' || !plano.dataInicio || !plano.dataFim) {
                        console.warn(`[Data] Plano ${index} inválido ou incompleto (sem título/datas), filtrando:`, plano);
                        return null;
                    }
                    const dataInicio = plano.dataInicio ? new Date(plano.dataInicio) : null;
                    const dataFim = plano.dataFim ? new Date(plano.dataFim) : null;
                    // Validação das Datas convertidas
                    if (!dataInicio || isNaN(dataInicio) || !dataFim || isNaN(dataFim)) {
                         console.warn(`[Data] Plano "${plano.titulo}" com datas inválidas após conversão, filtrando:`, plano.dataInicio, plano.dataFim);
                         return null; // Marcar para remoção
                    }
                    return {
                        ...plano,
                        id: plano.id || crypto.randomUUID(), // Garante um ID
                        linkDrive: plano.linkDrive || '', // Garante que linkDrive exista (string vazia se não)
                        dataInicio: dataInicio,
                        dataFim: dataFim,
                        diasPlano: plano.diasPlano ? plano.diasPlano.map(dia => {
                            const dataDia = dia.data ? new Date(dia.data) : null;
                            // Não filtra dias com data inválida aqui, apenas marca como null
                            if (dataDia && isNaN(dataDia)) {
                                console.warn("[Data] Dia com data inválida no plano:", plano.titulo, dia.data);
                                return { ...dia, data: null };
                            }
                            return {
                                ...dia,
                                data: dataDia,
                                // Garante que campos numéricos do dia existam
                                paginaInicioDia: Number(dia.paginaInicioDia) || 0,
                                paginaFimDia: Number(dia.paginaFimDia) || 0,
                                paginas: Number(dia.paginas) || 0,
                                lido: Boolean(dia.lido || false) // Garante booleano
                            };
                        }) : [],
                        // Garante que campos numéricos do plano existam
                        paginaInicio: Number(plano.paginaInicio) || 1,
                        paginaFim: Number(plano.paginaFim) || 1,
                        totalPaginas: Number(plano.totalPaginas) || 0,
                        paginasLidas: Number(plano.paginasLidas) || 0,
                        // Garante periodicidade e diasSemana
                        periodicidade: plano.periodicidade || 'diario',
                        diasSemana: Array.isArray(plano.diasSemana) ? plano.diasSemana : []
                    };
                }).filter(plano => plano !== null); // Remove planos marcados como nulos (inválidos)

            } else {
                console.log("[Data] Nenhum documento de usuário encontrado para", userId,". Criando um novo.");
                // Cria o documento inicial se não existir
                await setDoc(docRef, { planos: [] });
            }
            console.log('[Data] Planos processados e válidos carregados do Firestore:', planosDoFirestore.length);
            if (callback) callback(planosDoFirestore);
        } catch (error) {
            console.error('[Data] Erro CRÍTICO ao carregar planos do Firestore:', error);
            alert('Erro grave ao carregar seus planos. Verifique sua conexão e tente recarregar a página.');
            if (callback) callback([]); // Retorna array vazio em caso de erro crítico
        }
    }

    // Salva o array de planos no Firestore para o usuário logado
    async function salvarPlanos(planosParaSalvar, callback) {
        if (!user) {
            console.error('[Data] Usuário não logado, não é possível salvar.');
            alert("Você precisa estar logado para salvar as alterações.");
            if (callback) callback(false);
            return;
        }
        const userId = user.uid;
        const docRef = doc(db, 'users', userId);
        console.log("[Data] Tentando salvar", planosParaSalvar.length, "planos para userId:", userId);

        // Prepara os dados para o Firestore (converte Date para ISOString, garante tipos)
        const planosParaFirestore = planosParaSalvar.map(plano => {
             // Validação rigorosa antes de tentar salvar
            if (!plano || !plano.id || typeof plano.titulo !== 'string' || plano.titulo.trim() === '' ||
                !(plano.dataInicio instanceof Date) || isNaN(plano.dataInicio) ||
                !(plano.dataFim instanceof Date) || isNaN(plano.dataFim)) {
                 console.error("[Data] ERRO: Tentativa de salvar plano inválido (faltando id, titulo ou datas válidas). Plano ignorado:", plano);
                 // Poderia lançar um erro ou filtrar. Optando por logar e não incluir.
                 return null; // Marcando para filtrar
            }
            return {
                // Copia todas as propriedades existentes
                ...plano,
                // Garante tipos e converte datas para string
                linkDrive: typeof plano.linkDrive === 'string' ? plano.linkDrive : '',
                dataInicio: plano.dataInicio.toISOString(),
                dataFim: plano.dataFim.toISOString(),
                diasPlano: plano.diasPlano ? plano.diasPlano.map(dia => ({
                    ...dia,
                    // Só converte se for Date válido, senão salva null
                    data: (dia.data instanceof Date && !isNaN(dia.data)) ? dia.data.toISOString() : null,
                    // Garante números para páginas do dia
                    paginaInicioDia: Number(dia.paginaInicioDia) || 0,
                    paginaFimDia: Number(dia.paginaFimDia) || 0,
                    paginas: Number(dia.paginas) || 0,
                    lido: Boolean(dia.lido || false)
                })) : [],
                 // Garante números para páginas do plano
                paginaInicio: Number(plano.paginaInicio) || 1,
                paginaFim: Number(plano.paginaFim) || 1,
                totalPaginas: Number(plano.totalPaginas) || 0,
                paginasLidas: Number(plano.paginasLidas) || 0,
                 // Garante periodicidade e diasSemana
                periodicidade: plano.periodicidade || 'diario',
                diasSemana: Array.isArray(plano.diasSemana) ? plano.diasSemana : []
            };
        }).filter(p => p !== null); // Filtra os planos marcados como nulos (inválidos)

        // Verifica se restou algum plano válido para salvar
        if (planosParaFirestore.length !== planosParaSalvar.length) {
             console.warn(`[Data] ${planosParaSalvar.length - planosParaFirestore.length} planos inválidos foram filtrados antes de salvar.`);
        }
        if (planosParaFirestore.length === 0 && planosParaSalvar.length > 0) {
            console.error("[Data] Nenhum plano válido restante para salvar após a filtragem.");
            // Decide se quer salvar um array vazio ou alertar o usuário.
            // Vamos salvar vazio para refletir o estado filtrado.
        }


        try {
            // Usa setDoc para sobrescrever o array 'planos' inteiro no documento do usuário
            // Se outros campos existirem no documento do usuário, eles serão mantidos
            await setDoc(docRef, { planos: planosParaFirestore }, { merge: true });
            console.log('[Data] Planos salvos no Firestore com sucesso!');
            if (callback) callback(true);
        } catch (error) {
            console.error('[Data] Erro CRÍTICO ao salvar planos no Firestore:', error);
            alert('Erro grave ao salvar seus planos. Verifique sua conexão e tente novamente. Suas últimas alterações podem não ter sido salvas.');
            if (callback) callback(false);
        }
    }

    // --- Funções de Gerenciamento do Formulário ---

    // Atualiza quais campos de data são obrigatórios com base na seleção do radio
    function updateRequiredAttributes() {
        // Adiciona verificação se os elementos existem
        if (!definirPorDatasRadio || !dataInicio || !dataFim || !dataInicioDias || !numeroDias || !linkDriveInput) {
             console.warn("[UI] Elementos do formulário de período não encontrados para updateRequiredAttributes.");
             return;
        }

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
    if (formPlano) { // Só chama se o formulário existir
        updateRequiredAttributes();
    }

    // --- Funções de Renderização da Interface ---

    // Renderiza o painel de leituras atrasadas
    function renderizarLeiturasAtrasadas() {
        if (!leiturasAtrasadasSection || !listaLeiturasAtrasadasDiv || !semLeiturasAtrasadasP) return; // Verifica elementos

        leiturasAtrasadasSection.style.display = 'none'; // Esconde por padrão
        if (!user || !planos || planos.length === 0) return; // Sai se não logado ou sem planos

        const hoje = getHojeNormalizado();
        const todasLeiturasAtrasadas = [];

        planos.forEach((plano, planoIndex) => {
            if (plano.diasPlano && plano.diasPlano.length > 0 && determinarStatusPlano(plano) === 'atrasado') { // Otimização: só checa planos atrasados
                plano.diasPlano.forEach((dia) => {
                    if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                        const dataDiaNormalizada = new Date(dia.data); dataDiaNormalizada.setHours(0, 0, 0, 0);
                        if (dataDiaNormalizada < hoje && !dia.lido) {
                            todasLeiturasAtrasadas.push({
                                data: dia.data,
                                titulo: plano.titulo || 'Plano sem Título',
                                paginasTexto: `Pgs ${dia.paginaInicioDia || '?'}-${dia.paginaFimDia || '?'} (${dia.paginas || 0})`,
                                planoIndex: planoIndex
                            });
                        }
                    }
                });
            }
        });

        todasLeiturasAtrasadas.sort((a, b) => a.data - b.data); // Ordena por data
        const leiturasAtrasadasParaMostrar = todasLeiturasAtrasadas.slice(0, 3); // Pega as 3 mais antigas

        listaLeiturasAtrasadasDiv.innerHTML = ''; // Limpa

        if (leiturasAtrasadasParaMostrar.length > 0) {
            leiturasAtrasadasSection.style.display = 'block'; // Mostra seção
            semLeiturasAtrasadasP.style.display = 'none'; // Esconde mensagem

            leiturasAtrasadasParaMostrar.forEach(leitura => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('leitura-atrasada-item');
                const dataFormatada = leitura.data.toLocaleDateString('pt-BR', { weekday: 'short', month: 'short', day: 'numeric' });
                const numeroPlano = leitura.planoIndex + 1;

                itemDiv.innerHTML = `
                    <span class="leitura-atrasada-data">${dataFormatada}</span>
                    <span class="numero-plano-tag">${numeroPlano}</span>
                    <span class="leitura-atrasada-titulo">${leitura.titulo}</span>
                    <span class="leitura-atrasada-paginas">${leitura.paginasTexto}</span>
                `;
                listaLeiturasAtrasadasDiv.appendChild(itemDiv);
            });
        } else {
            // Opção: manter a seção visível com a mensagem, ou esconder tudo.
            // Mantendo visível com mensagem:
            leiturasAtrasadasSection.style.display = 'block';
            semLeiturasAtrasadasP.style.display = 'block';
        }
    }

    // Renderiza o painel de próximas leituras agendadas
    function renderizarProximasLeituras() {
        if (!proximasLeiturasSection || !listaProximasLeiturasDiv || !semProximasLeiturasP) return; // Verifica elementos

        proximasLeiturasSection.style.display = 'none'; // Esconde por padrão
        if (!user || !planos || planos.length === 0) return; // Sai se não logado ou sem planos

        const hoje = getHojeNormalizado();
        const todasLeiturasFuturas = [];

        planos.forEach((plano, planoIndex) => {
            // Só processa planos que não estão concluídos
            const statusPlano = determinarStatusPlano(plano);
            if (plano.diasPlano && plano.diasPlano.length > 0 && statusPlano !== 'concluido' && statusPlano !== 'invalido') {
                plano.diasPlano.forEach((dia) => {
                    if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                        const dataDiaNormalizada = new Date(dia.data); dataDiaNormalizada.setHours(0,0,0,0);
                        if (dataDiaNormalizada >= hoje && !dia.lido) { // A partir de hoje, não lido
                            todasLeiturasFuturas.push({
                                data: dia.data,
                                titulo: plano.titulo || 'Plano sem Título',
                                paginasTexto: `Pgs ${dia.paginaInicioDia || '?'}-${dia.paginaFimDia || '?'} (${dia.paginas || 0})`,
                                planoIndex: planoIndex
                            });
                        }
                    }
                });
            }
        });

        todasLeiturasFuturas.sort((a, b) => a.data - b.data); // Ordena por data mais próxima
        const proximas3Leituras = todasLeiturasFuturas.slice(0, 3); // Pega as 3 primeiras

        listaProximasLeiturasDiv.innerHTML = ''; // Limpa

        if (proximas3Leituras.length > 0) {
            proximasLeiturasSection.style.display = 'block'; // Mostra seção
            semProximasLeiturasP.style.display = 'none'; // Esconde mensagem

            proximas3Leituras.forEach(leitura => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('proxima-leitura-item');
                const dataFormatada = leitura.data.toLocaleDateString('pt-BR', { weekday: 'short', month: 'short', day: 'numeric' });
                const numeroPlano = leitura.planoIndex + 1;

                itemDiv.innerHTML = `
                    <span class="proxima-leitura-data">${dataFormatada}</span>
                    <span class="numero-plano-tag">${numeroPlano}</span>
                    <span class="proxima-leitura-titulo">${leitura.titulo}</span>
                    <span class="proxima-leitura-paginas">${leitura.paginasTexto}</span>
                `;
                listaProximasLeiturasDiv.appendChild(itemDiv);
            });
        } else {
            // Mostra a seção com a mensagem "sem próximas"
             proximasLeiturasSection.style.display = 'block';
             semProximasLeiturasP.style.display = 'block';
        }
    }

    // Renderiza a lista principal de planos de leitura (cards)
    function renderizarPlanos() {
        console.log("[UI] Renderizando planos...");
         // Verifica se os elementos necessários existem
         if (!paginadorPlanosDiv || !listaPlanos || !proximasLeiturasSection || !leiturasAtrasadasSection) {
             console.error("[UI] ERRO: Elementos essenciais para renderizarPlanos não encontrados.");
             return;
         }

        // Limpa conteúdo anterior e prepara interface
        paginadorPlanosDiv.innerHTML = '';
        listaPlanos.innerHTML = '';
        proximasLeiturasSection.style.display = 'none'; // Esconde painéis inicialmente
        leiturasAtrasadasSection.style.display = 'none';

        // Verifica estado de login
        if (!user) {
            listaPlanos.innerHTML = '<p>Faça login ou cadastre-se para gerenciar seus planos de leitura.</p>';
            // atualizarVisibilidadeBotoesAcao já é chamado fora desta função após a mudança de estado
            return;
        }

        // Verifica se há planos
        if (!planos || planos.length === 0) {
            listaPlanos.innerHTML = '<p>Nenhum plano de leitura cadastrado ainda. Clique em "Novo" para começar!</p>';
            togglePaginatorVisibility(); // Esconde paginador se não há planos
            // atualizarVisibilidadeBotoesAcao já é chamado fora
            return;
        }

        // Ordena os planos (Exemplo: por data de início mais recente)
        // Certifica que datas inválidas não quebrem a ordenação
        planos.sort((a, b) => (b.dataInicio instanceof Date && !isNaN(b.dataInicio) ? b.dataInicio.getTime() : 0) -
                           (a.dataInicio instanceof Date && !isNaN(a.dataInicio) ? a.dataInicio.getTime() : 0));


        // Renderiza Paginador (se houver mais de um plano)
        if (planos.length > 1) {
            planos.forEach((plano, index) => {
                 // Verifica se plano e ID são válidos antes de criar link
                 if (plano && plano.id) {
                    const linkPaginador = document.createElement('a');
                    linkPaginador.href = `#plano-${plano.id}`; // Link para o ID único do plano
                    linkPaginador.textContent = index + 1; // Número sequencial
                    linkPaginador.title = plano.titulo || 'Plano sem título';
                    paginadorPlanosDiv.appendChild(linkPaginador);
                 } else {
                     console.warn("[UI] Plano inválido ou sem ID encontrado durante a criação do paginador, pulando:", plano);
                 }
            });
        }

        // Renderiza Cards dos Planos
        planos.forEach((plano, index) => {
            // Validação Mínima do Plano antes de renderizar o card
             if (!plano || !plano.id || typeof plano.titulo !== 'string') {
                 console.warn("[UI] Ignorando renderização de card para plano inválido ou sem ID/título:", plano);
                 return; // Pula este plano
             }

            const progressoPercentual = (plano.totalPaginas && plano.totalPaginas > 0)
                ? Math.min(100, Math.max(0, (plano.paginasLidas / plano.totalPaginas) * 100)) // Garante 0-100
                : 0;
            const status = determinarStatusPlano(plano);
            let statusText = '';
            let statusClass = '';
            switch (status) {
                case 'proximo': statusText = 'Próximo'; statusClass = 'status-proximo'; break;
                case 'em_dia': statusText = 'Em dia'; statusClass = 'status-em-dia'; break;
                case 'atrasado': statusText = 'Atrasado'; statusClass = 'status-atrasado'; break;
                case 'concluido': statusText = 'Concluído'; statusClass = 'status-concluido'; break;
                // Não adiciona tag para 'invalido'
            }
            const statusTagHTML = statusText ? `<span class="status-tag ${statusClass}">${statusText}</span>` : '';

            // Aviso de Atraso
            const diasAtrasados = (status === 'atrasado') ? verificarAtraso(plano) : 0;
            const avisoAtrasoHTML = (status === 'atrasado' && diasAtrasados > 0) ? `
                <div class="aviso-atraso" id="aviso-atraso-${index}">
                    <p>⚠️ Plano com atraso de ${diasAtrasados} dia(s)!</p>
                    <div class="acoes-dados">
                        <button onclick="window.mostrarOpcoesRecalculo(${index})" title="Recalcular datas ou páginas/dia">Recalcular Plano</button>
                    </div>
                </div>` : '';

             // Link Drive / Notas
             let linkDriveHTML = '';
             if (plano.linkDrive) {
                 const isValidUrl = plano.linkDrive.startsWith('http://') || plano.linkDrive.startsWith('https://');
                 linkDriveHTML = `
                 <div class="link-drive-container">
                     ${isValidUrl ? `
                     <a href="${plano.linkDrive}" target="_blank" class="button-link-drive" title="Abrir documento de anotações (${plano.linkDrive})">
                         <span class="material-symbols-outlined">open_in_new</span> Abrir Notas
                     </a>` : `
                     <span title="Link inválido: ${plano.linkDrive}" style="color: red; font-size: 0.8em;">Link inválido</span>
                     `}
                     <button onclick="window.editarLinkDrive(${index})" class="button-link-drive-edit" title="Editar link de anotações">
                         <span class="material-symbols-outlined">edit</span> Editar Link
                     </button>
                 </div>`;
             } else {
                 linkDriveHTML = `
                 <div class="link-drive-container">
                     <button onclick="window.editarLinkDrive(${index})" class="button-link-drive-add" title="Adicionar link de anotações (Drive, Notion, etc.)">
                         <span class="material-symbols-outlined">add_link</span> Adicionar Link de Notas
                     </button>
                 </div>`;
             }

            const planoDiv = document.createElement('div');
            planoDiv.classList.add('plano-leitura');
            if (statusClass) {
                planoDiv.classList.add(statusClass.replace('status-','card-')); // Adiciona classe de card baseada no status
            }
            planoDiv.id = `plano-${plano.id}`; // Usa ID único do plano

            // Formatação segura das datas de início/fim do plano
            const dataInicioPlanoStr = plano.dataInicio instanceof Date && !isNaN(plano.dataInicio) ? plano.dataInicio.toLocaleDateString('pt-BR') : 'Inválida';
            const dataFimPlanoStr = plano.dataFim instanceof Date && !isNaN(plano.dataFim) ? plano.dataFim.toLocaleDateString('pt-BR') : 'Inválida';

            planoDiv.innerHTML = `
                <div class="plano-header">
                    <h3><span class="plano-numero">${index + 1}</span>${plano.titulo}</h3>
                    ${statusTagHTML}
                    <div class="plano-acoes-principais">
                        <button class="acoes-dados button" onclick="window.editarPlano(${index})" title="Editar detalhes do plano (título, páginas, datas)">
                           <span class="material-symbols-outlined">edit_note</span> Editar
                        </button>
                        <button class="acoes-dados button" onclick="window.excluirPlano(${index})" title="Excluir este plano permanentemente">
                            <span class="material-symbols-outlined">delete</span> Excluir
                        </button>
                    </div>
                </div>
                ${avisoAtrasoHTML}
                ${linkDriveHTML}
                <p>Páginas: ${plano.paginaInicio} - ${plano.paginaFim} (${plano.totalPaginas || 0} pgs) | Período: ${dataInicioPlanoStr} a ${dataFimPlanoStr}</p>
                <div class="progresso-container" title="${progressoPercentual.toFixed(0)}% concluído (${plano.paginasLidas} de ${plano.totalPaginas} pgs)">
                    <div class="barra-progresso" style="width: ${progressoPercentual}%"></div>
                    <span class="progresso-texto" style="position: absolute; left: 50%; transform: translateX(-50%); color: ${progressoPercentual > 50 ? 'white' : 'black'}; font-size: 0.7em; line-height: 10px; text-shadow: 1px 1px 1px rgba(0,0,0,0.5);">${progressoPercentual.toFixed(0)}%</span>
                </div>
                <p>${plano.paginasLidas} de ${plano.totalPaginas} páginas lidas.</p>
                 <details class="dias-leitura-details" ${status === 'concluido' ? '' : 'open'} >
                    <summary>Ver/Marcar Dias de Leitura (${plano.diasPlano ? plano.diasPlano.length : 0} dias)</summary>
                    <div class="dias-leitura">${renderizarDiasLeitura(plano.diasPlano, index)}</div>
                </details>
            `;
            listaPlanos.appendChild(planoDiv);
        });

        // RENDERIZA PAINÉIS (Atrasadas e Próximas) APÓS renderizar os cards
        renderizarLeiturasAtrasadas();
        renderizarProximasLeituras();
        togglePaginatorVisibility(); // Atualiza visibilidade do paginador
        console.log("[UI] Renderização de planos concluída.");
    }

    // Verifica quantos dias de leitura estão atrasados em um plano
    function verificarAtraso(plano) {
        const hoje = getHojeNormalizado();
        if (!plano || !plano.diasPlano || plano.diasPlano.length === 0) {
            return 0;
        }
        return plano.diasPlano.reduce((count, dia) => {
             // Verifica se 'dia' e 'dia.data' são válidos antes de acessar propriedades
             if (dia && dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                const dataDiaNormalizada = new Date(dia.data); dataDiaNormalizada.setHours(0, 0, 0, 0);
                if (dataDiaNormalizada < hoje && !dia.lido) {
                    return count + 1;
                }
            }
            return count;
        }, 0);
    }

    // Gera o HTML para a lista de dias de leitura dentro de um card
    function renderizarDiasLeitura(diasPlano, planoIndex) {
        if (!diasPlano || diasPlano.length === 0) {
            return '<p>Nenhum dia de leitura definido para este plano.</p>';
        }
        // Garante que temos o plano correto antes de prosseguir
        if (!planos || planoIndex < 0 || planoIndex >= planos.length || !planos[planoIndex]) {
             console.error("[UI] Erro em renderizarDiasLeitura: plano não encontrado no índice", planoIndex);
             return '<p style="color:red;">Erro ao carregar dias.</p>';
        }

        // Ordena os dias por data para garantir a ordem correta na exibição
        const diasOrdenados = [...diasPlano].sort((a, b) => {
            const dataA = a && a.data instanceof Date && !isNaN(a.data) ? a.data.getTime() : 0;
            const dataB = b && b.data instanceof Date && !isNaN(b.data) ? b.data.getTime() : 0;
            return dataA - dataB;
        });

        return diasOrdenados.map((dia, diaIndexOriginal) => {
            // Validação básica do objeto 'dia'
            if (!dia) {
                 console.warn("[UI] Dia inválido encontrado em renderizarDiasLeitura, pulando.");
                 return '';
            }

            // Encontra o índice real no array 'planos[planoIndex].diasPlano' para a função marcarLido
            // É crucial que 'dia' seja uma referência ao objeto original dentro de planos[planoIndex].diasPlano
            const diaIndex = planos[planoIndex].diasPlano.findIndex(dOriginal => dOriginal === dia);

            if (diaIndex === -1) {
                 console.error("[UI] Erro crítico: não foi possível encontrar o índice original do dia para marcar como lido. Dia:", dia);
                 // Poderia retornar um elemento indicando erro ou pular
                 return `<div class="dia-leitura alternado" style="color:red; font-style:italic;">Erro ao processar este dia.</div>`;
            }


            const dataFormatada = (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime()))
                ? dia.data.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
                : '<span style="color:red;">Data Inválida</span>';
            const alternadoClass = diaIndexOriginal % 2 === 0 ? 'alternado' : '';
            const lidoClass = dia.lido ? 'lido' : '';
            const idCheckbox = `dia-${planoIndex}-${diaIndex}`; // Usa o índice real
            const paginasTexto = `Pgs ${dia.paginaInicioDia || '?'}-${dia.paginaFimDia || '?'} (${dia.paginas || 0})`;

            // Só permite marcar/desmarcar se a data for válida
            const inputCheckbox = (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime()))
             ? `<input type="checkbox" id="${idCheckbox}" ${dia.lido ? 'checked' : ''} onchange="window.marcarDiaLido(${planoIndex}, ${diaIndex}, this.checked)" title="${dia.lido ? 'Desmarcar' : 'Marcar'} dia ${dataFormatada.replace(/<.*?>/g, '')} como lido">` // Remove tags HTML do title
             : `<span title="Não é possível marcar: data inválida" style="margin-right: 10px; color: #ccc; cursor: not-allowed;">☑</span>`; // Checkbox visualmente desabilitado

            // Label associado ao ID do checkbox
            const labelElement = `<label for="${idCheckbox}" title="Leitura do dia ${dataFormatada.replace(/<.*?>/g, '')}: ${paginasTexto}">${dataFormatada} - ${paginasTexto}</label>`;

            return `<div class="dia-leitura ${alternadoClass} ${lidoClass}">
                        ${inputCheckbox}
                        ${labelElement}
                    </div>`;
        }).join('');
    }


    // --- Funções de Interação com Planos (CRUD, Marcar Lido, etc.) ---

    // Marca/desmarca um dia como lido e atualiza o progresso
    // Tornada global para ser acessível pelo onclick
    window.marcarDiaLido = function(planoIndex, diaIndex, lido) {
        console.log(`[Action] Marcando dia ${diaIndex} do plano ${planoIndex} como ${lido}`);
        // Validação robusta dos índices e existência dos objetos
        if (planos && planoIndex >= 0 && planoIndex < planos.length &&
            planos[planoIndex] && planos[planoIndex].diasPlano &&
            diaIndex >= 0 && diaIndex < planos[planoIndex].diasPlano.length &&
            planos[planoIndex].diasPlano[diaIndex])
        {
            planos[planoIndex].diasPlano[diaIndex].lido = lido; // Atualiza estado local
            atualizarPaginasLidas(planoIndex); // Recalcula progresso local

            salvarPlanos(planos, (salvoComSucesso) => { // Tenta salvar no Firebase
                if (salvoComSucesso) {
                    console.log('[Data] Progresso salvo no Firebase.');
                    renderizarPlanos(); // Re-renderiza a interface para refletir a mudança
                } else {
                    console.error('[Data] Falha ao salvar progresso no Firebase. Revertendo alteração localmente.');
                     // Reverte a alteração local se o salvamento falhar
                    planos[planoIndex].diasPlano[diaIndex].lido = !lido;
                    atualizarPaginasLidas(planoIndex); // Recalcula de novo com o estado revertido
                    alert("Erro ao salvar o progresso. Sua marcação foi desfeita. Verifique sua conexão.");
                    renderizarPlanos(); // Renderiza novamente com o estado original
                }
            });
        } else {
            console.error("[Action] Índice de plano ou dia inválido para marcar como lido:", planoIndex, diaIndex, "Planos:", planos);
             alert("Erro interno ao tentar marcar o dia. Recarregue a página.");
        }
    };

    // Recalcula o total de páginas lidas para um plano específico
    function atualizarPaginasLidas(planoIndex) {
        if (planos && planoIndex >= 0 && planoIndex < planos.length && planos[planoIndex] && planos[planoIndex].diasPlano) {
            planos[planoIndex].paginasLidas = planos[planoIndex].diasPlano.reduce((sum, dia) => {
                // Soma apenas se 'lido' for true e 'paginas' for um número válido > 0
                // Adiciona verificação se 'dia' existe
                return sum + (dia && dia.lido && typeof dia.paginas === 'number' && dia.paginas > 0 ? dia.paginas : 0);
            }, 0);
            console.log(`[Calc] Páginas lidas atualizadas para plano ${planoIndex} (${planos[planoIndex].titulo}): ${planos[planoIndex].paginasLidas}`);
        } else {
            console.warn("[Calc] Plano inválido ou sem diasPlano para atualizar páginas lidas:", planoIndex);
            // Se o plano existe mas diasPlano não, zera as páginas lidas
            if(planos && planoIndex >= 0 && planoIndex < planos.length && planos[planoIndex]) {
                 planos[planoIndex].paginasLidas = 0;
            }
        }
    }

    // Preenche o formulário de cadastro/edição com os dados de um plano existente
    // Tornada global para ser acessível pelo onclick
    window.editarPlano = function(index) {
        console.log("[Action] Iniciando edição do plano no índice:", index);
        if (index < 0 || index >= planos.length || !planos[index]) {
            console.error("[Action] Índice de plano inválido para edição:", index);
            alert("Erro: Plano não encontrado para edição.");
            return;
        }

        // Verifica se os elementos do formulário existem antes de tentar preenchê-los
        if (!cadastroPlanoSection || !formPlano || !document.getElementById('titulo-livro') || !document.getElementById('link-drive') || /* ... outros campos ... */ !inicioCadastroBtn) {
             console.error("[Action] ERRO: Elementos do formulário de edição não encontrados no DOM!");
             alert("Erro ao tentar abrir a edição. Recarregue a página.");
             return;
        }


        planoEditandoIndex = index;
        preventFormReset = true; // Impede reset acidental ao clicar "Novo" novamente
        const plano = planos[index];

        // Navega para a tela de cadastro/edição
        cadastroPlanoSection.style.display = 'block';
        if (planosLeituraSection) planosLeituraSection.style.display = 'none';
        if (leiturasAtrasadasSection) leiturasAtrasadasSection.style.display = 'none';
        if (proximasLeiturasSection) proximasLeiturasSection.style.display = 'none';
        atualizarVisibilidadeBotoesAcao(); // Ajusta botões do header
        inicioCadastroBtn.style.display = 'block'; // Mostra botão "Voltar para Início"

        // --- Preenche os campos do formulário ---
        document.getElementById('titulo-livro').value = plano.titulo || '';
        document.getElementById('link-drive').value = plano.linkDrive || '';
        document.getElementById('pagina-inicio').value = plano.paginaInicio || '';
        document.getElementById('pagina-fim').value = plano.paginaFim || '';

        // Preenche a seção de período (Datas ou Dias)
        if (plano.definicaoPeriodo === 'dias') {
            if (definirPorDiasRadio) definirPorDiasRadio.checked = true;
            if (periodoPorDatasDiv) periodoPorDatasDiv.style.display = 'none';
            if (periodoPorDiasDiv) periodoPorDiasDiv.style.display = 'block';
            // Preenche data de início (formato YYYY-MM-DD para input date)
             if (plano.dataInicio instanceof Date && !isNaN(plano.dataInicio)) {
                 if (dataInicioDias) dataInicioDias.valueAsDate = plano.dataInicio;
             } else {
                 if (dataInicioDias) dataInicioDias.value = ''; // Limpa se inválido
             }
             // Calcula o número de dias válidos (contando os dias válidos no array diasPlano)
            const numDiasValidos = plano.diasPlano ? plano.diasPlano.filter(d => d && d.data instanceof Date && !isNaN(d.data)).length : 0;
            if (numeroDias) numeroDias.value = numDiasValidos > 0 ? numDiasValidos : ''; // Mostra apenas se > 0
        } else { // Assume 'datas' como padrão se não for 'dias' ou se for inválido
            if (definirPorDatasRadio) definirPorDatasRadio.checked = true;
            if (periodoPorDatasDiv) periodoPorDatasDiv.style.display = 'block';
            if (periodoPorDiasDiv) periodoPorDiasDiv.style.display = 'none';
             // Preenche datas de início e fim
             if (plano.dataInicio instanceof Date && !isNaN(plano.dataInicio)) {
                if (dataInicio) dataInicio.valueAsDate = plano.dataInicio;
             } else {
                 if (dataInicio) dataInicio.value = '';
             }
             if (plano.dataFim instanceof Date && !isNaN(plano.dataFim)) {
                if (dataFim) dataFim.valueAsDate = plano.dataFim;
             } else {
                 if (dataFim) dataFim.value = '';
             }
        }

        // Preenche periodicidade e dias da semana (se aplicável)
        if (periodicidadeSelect) periodicidadeSelect.value = plano.periodicidade || 'diario';
        if (diasSemanaSelecao) diasSemanaSelecao.style.display = periodicidadeSelect.value === 'semanal' ? 'block' : 'none';
        document.querySelectorAll('input[name="dia-semana"]').forEach(cb => cb.checked = false); // Limpa checkboxes
        if (plano.periodicidade === 'semanal' && Array.isArray(plano.diasSemana)) {
            document.querySelectorAll('input[name="dia-semana"]').forEach(cb => {
                // Marca o checkbox se o valor (0-6) estiver no array diasSemana do plano
                // Garante que cb.value seja comparado como número
                if (plano.diasSemana.includes(parseInt(cb.value))) {
                    cb.checked = true;
                }
            });
        }

        // Atualiza texto do botão e atributos 'required'
        const submitButton = formPlano.querySelector('button[type="submit"]');
        if (submitButton) submitButton.textContent = 'Atualizar Plano';
        updateRequiredAttributes();
        cadastroPlanoSection.scrollIntoView({ behavior: 'smooth' }); // Rola para o formulário
        preventFormReset = false; // Libera o reset para a próxima ação
        console.log("[Action] Formulário preenchido para edição do plano:", plano.titulo);
    };

    // Permite editar ou adicionar o link de anotações via prompt
    // Tornada global para ser acessível pelo onclick
    window.editarLinkDrive = function(index) {
        console.log("[Action] Editando link drive para plano no índice:", index);
        if (index < 0 || index >= planos.length || !planos[index]) {
            console.error("[Action] Índice de plano inválido para editar link:", index); return;
        }
        const plano = planos[index];
        const linkAtual = plano.linkDrive || '';
        const novoLink = prompt(`Editar Link de Anotações para "${plano.titulo}":\n(Cole a URL completa, ex: https://...)\n(Deixe em branco para remover)`, linkAtual);

        // Só atualiza se o usuário não clicou em "Cancelar" (null)
        if (novoLink !== null) {
            const linkTrimmed = novoLink.trim();
            // Validação opcional de URL (simples)
             if (linkTrimmed !== '' && !linkTrimmed.startsWith('http://') && !linkTrimmed.startsWith('https://')) {
                 alert("Link inválido. Certifique-se de que começa com http:// ou https://");
                 return; // Não prossegue se inválido (e não vazio)
             }

            planos[index].linkDrive = linkTrimmed; // Atualiza localmente
            salvarPlanos(planos, (salvoComSucesso) => { // Salva a alteração
                if (salvoComSucesso) {
                    console.log('[Data] Link atualizado e salvo no Firebase.');
                } else {
                    console.error('[Data] Falha ao salvar atualização do link no Firebase. Revertendo.');
                     alert("Erro ao salvar o link. A alteração foi desfeita.");
                     // Reverte localmente se salvar falhar
                     planos[index].linkDrive = linkAtual;
                }
                renderizarPlanos(); // Re-renderiza para mostrar o link atualizado (ou o antigo se falhou)
            });
        } else {
            console.log("[Action] Edição de link cancelada pelo usuário.");
        }
    };

    // --- Funções de Recálculo de Planos Atrasados ---

    // Exibe as opções de recálculo no card do plano
    window.mostrarOpcoesRecalculo = function(index) {
        const avisoAtrasoDiv = document.getElementById(`aviso-atraso-${index}`);
        if (!avisoAtrasoDiv) {
             console.warn("[Action] Div de aviso de atraso não encontrada para mostrar opções:", index);
             return;
        }
        console.log("[Action] Mostrando opções de recálculo para plano", index);
        avisoAtrasoDiv.innerHTML = `
            <p>⚠️ Plano atrasado. Como deseja recalcular?</p>
            <div class="acoes-dados recalculo-opcoes">
                <button onclick="window.solicitarNovaDataFim(${index})" title="Define uma nova data para terminar a leitura, recalculando as páginas por dia restante">Nova Data Fim</button>
                <button onclick="window.solicitarPaginasPorDia(${index})" title="Define quantas páginas ler por dia a partir de agora, recalculando a data de fim">Páginas/Dia</button>
                <button onclick="window.fecharAvisoRecalculo(${index})" title="Cancelar recálculo e manter o plano como está">Cancelar</button>
            </div>`;
    };

    // Fecha as opções de recálculo e volta ao aviso de atraso original (se ainda aplicável)
    window.fecharAvisoRecalculo = function(index) {
        const avisoAtrasoDiv = document.getElementById(`aviso-atraso-${index}`);
        if (!avisoAtrasoDiv || index < 0 || index >= planos.length || !planos[index]) {
             console.warn("[Action] Div de aviso ou plano não encontrado para fechar opções:", index);
             return;
        }
        console.log("[Action] Fechando opções de recálculo para plano", index);
        const plano = planos[index];
        const diasAtrasados = verificarAtraso(plano);
        const status = determinarStatusPlano(plano);

        // Se ainda estiver atrasado, mostra o aviso original
        if(status === 'atrasado' && diasAtrasados > 0) {
            avisoAtrasoDiv.innerHTML = `
                <p>⚠️ Plano com atraso de ${diasAtrasados} dia(s)!</p>
                <div class="acoes-dados">
                    <button onclick="window.mostrarOpcoesRecalculo(${index})">Recalcular Plano</button>
                </div>`;
        } else {
             // Se não está mais atrasado (ex: marcou dias como lidos), remove o aviso
            avisoAtrasoDiv.remove();
            console.log("[Action] Aviso de atraso removido para plano", index, "pois não está mais atrasado.");
        }
    };

    // Solicita a nova data de fim via prompt
    window.solicitarNovaDataFim = function(index) {
        if (index < 0 || index >= planos.length || !planos[index]) return; // Valida índice

        const hoje = getHojeNormalizado();
        const hojeStr = hoje.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        const novaDataFimInput = prompt(`Recalcular definindo Nova Data de Fim:\n\nDigite a nova data limite para concluir a leitura (formato YYYY-MM-DD).\nA data deve ser posterior a hoje (${hoje.toLocaleDateString('pt-BR')}).`);

        if (novaDataFimInput) {
            try {
                // Adiciona T00:00:00 para evitar problemas de fuso horário
                const novaDataFim = new Date(novaDataFimInput.trim() + 'T00:00:00');
                // Validação da data
                if (isNaN(novaDataFim.getTime())) throw new Error("Data inválida.");
                novaDataFim.setHours(0,0,0,0); // Normaliza para comparar com 'hoje'
                if (novaDataFim <= hoje) throw new Error("A nova data de fim deve ser posterior à data de hoje.");

                console.log("[Action] Nova data fim solicitada:", novaDataFim.toLocaleDateString('pt-BR'));
                recalcularPlanoNovaData(index, novaDataFim); // Chama a função de recálculo
            } catch (e) {
                 console.error("[Action] Erro ao processar data de fim:", e.message);
                 alert("Erro: " + e.message + "\nUse o formato YYYY-MM-DD e certifique-se que a data é futura.");
                 mostrarOpcoesRecalculo(index); // Volta para as opções
            }
        } else {
             console.log("[Action] Recálculo por data fim cancelado pelo usuário.");
             mostrarOpcoesRecalculo(index); // Volta para as opções se cancelou o prompt
        }
    };

    // Solicita o novo número de páginas por dia via prompt
     window.solicitarPaginasPorDia = function(index) {
         if (index < 0 || index >= planos.length || !planos[index]) return; // Valida índice
         const plano = planos[index];
         const paginasRestantes = Math.max(0, (plano.totalPaginas || 0) - (plano.paginasLidas || 0));

          if (paginasRestantes <= 0) {
             alert("Não há páginas restantes para ler neste plano. O recálculo não é necessário.");
             fecharAvisoRecalculo(index);
             return;
         }

        const paginasPorDiaInput = prompt(`Recalcular definindo Páginas por Dia:\n\nVocê tem ${paginasRestantes} páginas restantes para ler.\nDigite o número de páginas que você quer ler por dia a partir de agora:`);

        if (paginasPorDiaInput) {
            const paginasPorDia = parseInt(paginasPorDiaInput);
            if (isNaN(paginasPorDia) || paginasPorDia <= 0) {
                alert("Insira um número válido de páginas por dia (maior que zero).");
                mostrarOpcoesRecalculo(index);
                return;
            }
             console.log("[Action] Páginas por dia solicitadas:", paginasPorDia);
            recalcularPlanoPaginasPorDia(index, paginasPorDia); // Chama a função de recálculo
        } else {
             console.log("[Action] Recálculo por páginas/dia cancelado pelo usuário.");
             mostrarOpcoesRecalculo(index); // Volta para as opções
        }
    };

    // --- Lógica de Recálculo ---

    // Calcula a nova data de fim baseada nas páginas restantes e páginas/dia desejadas
    function calcularNovaDataFimPorPaginasDia(plano, paginasPorDia) {
         // Validação robusta das entradas
         if (!plano || !plano.totalPaginas || typeof plano.paginaInicio !== 'number' || typeof plano.paginaFim !== 'number' || typeof plano.paginasLidas !== 'number' || typeof paginasPorDia !== 'number' || paginasPorDia <= 0 || !plano.periodicidade || !Array.isArray(plano.diasSemana)) {
             console.error("[Calc] Dados inválidos para calcularNovaDataFimPorPaginasDia", {plano, paginasPorDia});
             return null;
         }
        const paginasRestantes = Math.max(0, plano.totalPaginas - plano.paginasLidas);
         if (paginasRestantes <= 0) {
             console.log("[Calc] Não há páginas restantes, retornando data fim atual.");
             return plano.dataFim instanceof Date && !isNaN(plano.dataFim) ? new Date(plano.dataFim) : null; // Retorna cópia da data fim atual
         }

        let proximoDiaLeitura = getHojeNormalizado(); // Começa a contar a partir de hoje
        const diasSemanaPlano = plano.diasSemana;
        const periodicidadePlano = plano.periodicidade;

        // Função interna para verificar se uma data é um dia de leitura válido
        const isDiaValido = (data) => {
             const diaSem = data.getDay(); // 0 = Domingo, 6 = Sábado
             return periodicidadePlano === 'diario' || (periodicidadePlano === 'semanal' && diasSemanaPlano.includes(diaSem));
         };

         // Avança até encontrar o primeiro dia de leitura válido a partir de hoje
         let safetyDateFind = 0;
         while (!isDiaValido(proximoDiaLeitura) && safetyDateFind < 366) {
             proximoDiaLeitura.setDate(proximoDiaLeitura.getDate() + 1);
             safetyDateFind++;
         }
         if(safetyDateFind >= 366) {
            console.error("[Calc] Não foi possível encontrar próximo dia válido em 1 ano.");
            alert("Erro: Não foi possível encontrar um dia de leitura válido. Verifique a periodicidade.");
            return null;
         }

        // Calcula quantos dias de leitura serão necessários
        const diasLeituraNecessarios = Math.ceil(paginasRestantes / paginasPorDia);
        console.log(`[Calc] Páginas restantes: ${paginasRestantes}, Págs/Dia: ${paginasPorDia}, Dias necessários: ${diasLeituraNecessarios}`);

        let dataFimCalculada = new Date(proximoDiaLeitura); // Começa do primeiro dia válido
        let diasLeituraContados = 0;
        let safetyCounter = 0; // Previne loop infinito
        const MAX_ITERATIONS = diasLeituraNecessarios * 7 + 30; // Limite mais dinâmico

        // Itera dia a dia, contando apenas os dias válidos, até atingir o número necessário
        while(diasLeituraContados < diasLeituraNecessarios && safetyCounter < MAX_ITERATIONS) {
             if (isDiaValido(dataFimCalculada)) {
                 diasLeituraContados++;
             }
             // Se ainda não atingiu o total de dias, avança para o próximo dia
             if (diasLeituraContados < diasLeituraNecessarios) {
                 dataFimCalculada.setDate(dataFimCalculada.getDate() + 1);
             }
             safetyCounter++;
             if(safetyCounter >= MAX_ITERATIONS) {
                 console.error(`[Calc] Loop break em calcularNovaDataFimPorPaginasDia (${MAX_ITERATIONS} iterações).`);
                 alert("Erro: Não foi possível calcular a data final. O número de dias/páginas pode ser muito grande ou a periodicidade muito restrita.");
                 return null;
             }
        }
        console.log("[Calc] Nova data fim calculada:", dataFimCalculada.toLocaleDateString('pt-BR'));
        return dataFimCalculada;
    }

    // Recalcula o plano definindo um número fixo de páginas por dia
    window.recalcularPlanoPaginasPorDia = function(index, paginasPorDia) {
        if (index < 0 || index >= planos.length || !planos[index]) return; // Valida índice
        const plano = planos[index];
        console.log(`[Action] Iniciando recálculo por ${paginasPorDia} páginas/dia para plano ${index} (${plano.titulo})`);
        const novaDataFim = calcularNovaDataFimPorPaginasDia(plano, paginasPorDia);

        if (!novaDataFim) {
             // A função calcularNovaDataFimPorPaginasDia já deve ter mostrado um alerta se falhou
             console.log("[Action] Não foi possível calcular nova data fim. Voltando às opções.");
             mostrarOpcoesRecalculo(index); // Volta às opções
             return;
         }
         // Usa a data calculada para chamar a função principal de recálculo
        recalcularPlanoNovaData(index, novaDataFim);
    };

     // Recalcula o plano baseando-se em uma nova data de fim (lógica principal)
    function recalcularPlanoNovaData(index, novaDataFim) {
        // Validação robusta das entradas
        if (index < 0 || index >= planos.length || !planos[index] || !(novaDataFim instanceof Date) || isNaN(novaDataFim)) {
            console.error("[Action] Dados inválidos para recalcularPlanoNovaData:", index, novaDataFim);
             alert("Erro interno ao tentar recalcular. Dados inválidos.");
            return;
        }
        const planoOriginal = planos[index];
        console.log(`[Action] Iniciando recálculo por nova data fim (${novaDataFim.toLocaleDateString('pt-BR')}) para plano ${index} (${planoOriginal.titulo})`);

        const paginasLidas = planoOriginal.paginasLidas || 0;
        const paginaInicioRecalculo = (planoOriginal.paginaInicio || 1) + paginasLidas;
        const paginasRestantes = Math.max(0, (planoOriginal.totalPaginas || 0) - paginasLidas);

        if (paginasRestantes <= 0) {
            alert("Todas as páginas já foram lidas ou não há páginas restantes. O recálculo não é necessário.");
            fecharAvisoRecalculo(index); // Fecha o aviso/opções
            return;
        }

        let dataInicioRecalculo = getHojeNormalizado(); // Recálculo começa a partir de hoje
        const diasSemanaPlano = Array.isArray(planoOriginal.diasSemana) ? planoOriginal.diasSemana : [];
        const periodicidadePlano = planoOriginal.periodicidade || 'diario';

        // Função para verificar se é dia válido de leitura
        const isDiaValido = (data) => {
             const diaSem = data.getDay();
             return periodicidadePlano === 'diario' || (periodicidadePlano === 'semanal' && diasSemanaPlano.includes(diaSem));
         };

         // Encontra o primeiro dia válido para começar o recálculo (a partir de hoje)
         let safetyDateFind = 0;
         while (!isDiaValido(dataInicioRecalculo) && safetyDateFind < 366) {
             dataInicioRecalculo.setDate(dataInicioRecalculo.getDate() + 1);
             safetyDateFind++;
         }
          if(safetyDateFind >= 366) {
            console.error("[Action] Não foi possível encontrar próximo dia válido para recálculo.");
            alert("Erro: Não foi possível encontrar um dia de leitura válido para iniciar o recálculo.");
            mostrarOpcoesRecalculo(index);
            return;
         }
         console.log("[Action] Recálculo iniciará em:", dataInicioRecalculo.toLocaleDateString('pt-BR'));

         // Validação: nova data fim não pode ser anterior ao início do recálculo
         if (novaDataFim < dataInicioRecalculo) {
             alert("Erro: A nova data de fim (" + novaDataFim.toLocaleDateString('pt-BR') + ") não pode ser anterior ao próximo dia de leitura válido (" + dataInicioRecalculo.toLocaleDateString('pt-BR') + ").");
             mostrarOpcoesRecalculo(index); // Volta às opções
             return;
         }

        // Gera a lista de novos dias de leitura válidos entre o início do recálculo e a nova data fim
        const novosDiasLeitura = [];
        let dataAtual = new Date(dataInicioRecalculo);
        let safetyLoopDays = 0;
        const MAX_LOOP_DAYS = 10000; // Previne loop infinito em caso de datas muito distantes
        while (dataAtual <= novaDataFim && safetyLoopDays < MAX_LOOP_DAYS) {
            if (isDiaValido(dataAtual)) {
                novosDiasLeitura.push({ data: new Date(dataAtual), paginaInicioDia: 0, paginaFimDia: 0, paginas: 0, lido: false });
            }
            dataAtual.setDate(dataAtual.getDate() + 1);
            safetyLoopDays++;
        }
        if(safetyLoopDays >= MAX_LOOP_DAYS){
             console.error("[Action] Loop de geração de dias de recálculo excedeu o limite.");
             alert("Erro: O período selecionado para recálculo é muito longo.");
             mostrarOpcoesRecalculo(index);
             return;
        }


        if (novosDiasLeitura.length === 0) {
            alert("Erro: Não há dias de leitura válidos entre "+ dataInicioRecalculo.toLocaleDateString('pt-BR') +" e "+ novaDataFim.toLocaleDateString('pt-BR') +" com a periodicidade selecionada. Ajuste a data fim ou a periodicidade do plano.");
            mostrarOpcoesRecalculo(index); // Volta às opções
            return;
        }
         console.log("[Action] Número de novos dias de leitura calculados:", novosDiasLeitura.length);

        // Distribui as páginas restantes entre os novos dias de leitura
        const numNovosDias = novosDiasLeitura.length;
        const paginasPorDiaBase = Math.floor(paginasRestantes / numNovosDias);
        const paginasExtras = paginasRestantes % numNovosDias; // Páginas que sobram para distribuir
        let paginaAtualRecalculo = paginaInicioRecalculo;

        novosDiasLeitura.forEach((dia, idx) => {
            let paginasNesteDia = paginasPorDiaBase + (idx < paginasExtras ? 1 : 0); // Distribui as extras nos primeiros dias

             // Garante que não aloque páginas negativas ou zero se algo der errado
             if (paginasNesteDia <= 0 && paginasRestantes > 0) {
                 console.warn(`[Calc Recalc] Cálculo resultou em ${paginasNesteDia} páginas para o dia ${idx+1}. Forçando 1.`);
                 paginasNesteDia = 1;
             }

            dia.paginaInicioDia = paginaAtualRecalculo;
            dia.paginaFimDia = paginaAtualRecalculo + paginasNesteDia - 1;
             // Ajuste para não ultrapassar a página final do livro
             if(dia.paginaFimDia > planoOriginal.paginaFim) {
                 dia.paginaFimDia = planoOriginal.paginaFim;
             }
             // Ajuste caso página inicial ultrapasse final (ex: 1 página no último dia)
              if (dia.paginaInicioDia > dia.paginaFimDia) {
                 dia.paginaInicioDia = dia.paginaFimDia;
             }

             // Calcula o número de páginas efetivamente alocadas para este dia
             dia.paginas = Math.max(0, dia.paginaFimDia - dia.paginaInicioDia + 1);
             // Atualiza a página para o próximo dia começar
            paginaAtualRecalculo = dia.paginaFimDia + 1;
        });

        // Ajuste final: Garante que o último dia recalculado termine exatamente na página final do livro
        const ultimoDiaNovo = novosDiasLeitura[numNovosDias - 1];
        if (ultimoDiaNovo && ultimoDiaNovo.paginaFimDia < planoOriginal.paginaFim && paginaAtualRecalculo <= planoOriginal.paginaFim) {
            console.warn(`[Action Recalc] Ajustando pág final recalculada no último dia de ${ultimoDiaNovo.paginaFimDia} para ${planoOriginal.paginaFim}`);
            ultimoDiaNovo.paginaFimDia = planoOriginal.paginaFim;
            ultimoDiaNovo.paginas = Math.max(0, ultimoDiaNovo.paginaFimDia - ultimoDiaNovo.paginaInicioDia + 1);
        } else if (ultimoDiaNovo && ultimoDiaNovo.paginaFimDia > planoOriginal.paginaFim) {
             // Caso raro: se o cálculo passou, corrige para a página final exata
            console.warn(`[Action Recalc] Corrigindo pág final do último dia que ultrapassou: ${ultimoDiaNovo.paginaFimDia} -> ${planoOriginal.paginaFim}`);
             ultimoDiaNovo.paginaFimDia = planoOriginal.paginaFim;
             ultimoDiaNovo.paginas = Math.max(0, ultimoDiaNovo.paginaFimDia - ultimoDiaNovo.paginaInicioDia + 1);
         }

        // Combina os dias que já foram lidos do plano original com os novos dias recalculados
        // Filtra dias lidos que ocorreram ANTES do início do recálculo
        const diasLidosOriginais = planoOriginal.diasPlano.filter(dia => dia && dia.lido && dia.data instanceof Date && dia.data < dataInicioRecalculo);
        // Substitui a lista de dias do plano e atualiza a data de fim
        planos[index].diasPlano = [...diasLidosOriginais, ...novosDiasLeitura].sort((a, b) => (a.data || 0) - (b.data || 0)); // Ordena por data
        planos[index].dataFim = new Date(novaDataFim); // Atualiza a data fim do plano com a nova data
        atualizarPaginasLidas(index); // Recalcula o total lido (deve incluir os dias lidos originais preservados)

        console.log("[Action] Plano recalculado. Dias lidos preservados:", diasLidosOriginais.length, "Novos dias:", novosDiasLeitura.length);

        // Salva o plano recalculado no Firebase
        salvarPlanos(planos, (salvoComSucesso) => {
            if (salvoComSucesso) {
                console.log("[Data] Plano recalculado e salvo com sucesso.");
                alert(`Plano "${planoOriginal.titulo}" recalculado com sucesso!\nNova data de término: ${novaDataFim.toLocaleDateString('pt-BR')}.`);
            } else {
                 console.error("[Data] Erro ao salvar plano recalculado.");
                 alert("Erro ao salvar o plano recalculado. As alterações podem não ter sido aplicadas. Tente novamente.");
                 // Considerar implementar rollback aqui em versões futuras
            }
            renderizarPlanos(); // Re-renderiza a interface com o plano atualizado
        });
    }

    // Exclui um plano de leitura
    window.excluirPlano = function(index) {
        if (index < 0 || index >= planos.length || !planos[index]) {
            console.error("[Action] Índice inválido para exclusão:", index); return;
        }
        const planoParaExcluir = planos[index]; // Guarda referência para possível rollback
        const tituloPlano = planoParaExcluir.titulo || 'Plano sem título';

        if (confirm(`Tem certeza que deseja excluir o plano "${tituloPlano}"?\n\nEsta ação não pode ser desfeita.`)) {
            console.log("[Action] Excluindo plano:", tituloPlano);
            planos.splice(index, 1); // Remove o plano do array local PRIMEIRO

            salvarPlanos(planos, (salvoComSucesso) => { // Tenta salvar a lista atualizada
                if (salvoComSucesso) {
                    console.log("[Data] Plano excluído com sucesso no Firebase.");
                    alert(`Plano "${tituloPlano}" excluído.`);
                    renderizarPlanos(); // Re-renderiza após sucesso
                } else {
                    console.error('[Data] Falha ao salvar exclusão no Firebase. Revertendo exclusão local.');
                     // Reverte a exclusão local se o salvamento falhou
                     planos.splice(index, 0, planoParaExcluir); // Insere de volta na mesma posição
                     alert("Erro ao excluir o plano no servidor. A exclusão foi cancelada. Verifique sua conexão.");
                     renderizarPlanos(); // Re-renderiza para mostrar o plano de volta
                }
            });
        } else {
            console.log("[Action] Exclusão do plano cancelada pelo usuário.");
        }
    };

    // --- Funcionalidade de Exportação para Agenda (.ics) ---

    // Listener para o botão de exportar agenda
    if (exportarAgendaBtn) {
        exportarAgendaBtn.addEventListener('click', () => {
            console.log("[Export] Botão Exportar Agenda clicado.");
            if (!user) { alert("Você precisa estar logado para exportar."); return; }
            if (!planos || planos.length === 0) { alert("Nenhum plano cadastrado para exportar."); return; }

            // Cria a mensagem para o prompt, listando os planos numerados
            let promptMessage = "Digite o número do plano para exportar para a agenda:\n\n";
            planos.forEach((plano, index) => {
                promptMessage += `${index + 1}. ${plano.titulo || 'Plano sem título'}\n`;
            });
            const planoIndexInput = prompt(promptMessage);

            if (planoIndexInput === null) {
                 console.log("[Export] Exportação cancelada pelo usuário no prompt.");
                 return; // Usuário cancelou
            }

            const planoIndex = parseInt(planoIndexInput) - 1; // Converte para índice 0-based

            // Validação da entrada do usuário e do plano selecionado
            if (isNaN(planoIndex) || planoIndex < 0 || planoIndex >= planos.length || !planos[planoIndex]) {
                alert("Número de plano inválido."); return;
            }
             const planoSelecionado = planos[planoIndex];
             // Validação se o plano selecionado tem dias válidos definidos
             if (!planoSelecionado.diasPlano || planoSelecionado.diasPlano.length === 0 || planoSelecionado.diasPlano.every(d => !d || !d.data || !(d.data instanceof Date) || isNaN(d.data))) {
                 alert(`O plano "${planoSelecionado.titulo}" não possui dias de leitura válidos definidos e não pode ser exportado.`); return;
             }

            exportarParaAgenda(planoSelecionado); // Chama a função de exportação
        });
    }

    // Função principal que coordena a exportação para .ics
    function exportarParaAgenda(plano) {
        console.log("[Export] Iniciando exportação para agenda do plano:", plano.titulo);
        // Solicita horários de início e fim para os eventos
        const horarioInicio = prompt(`Exportar "${plano.titulo}" para Agenda:\n\nDefina o horário de início da leitura diária (formato HH:MM):`, "09:00");
        if (!horarioInicio) { console.log("[Export] Exportação cancelada (horário início)."); return; }

        const horarioFim = prompt(`Defina o horário de fim da leitura diária (formato HH:MM):`, "09:30");
        if (!horarioFim) { console.log("[Export] Exportação cancelada (horário fim)."); return; }

        // Validação do formato HH:MM e se fim > início
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(horarioInicio) || !timeRegex.test(horarioFim)) {
            alert("Formato de horário inválido. Use HH:MM (ex: 08:00, 14:30)."); return;
        }
         if (horarioFim <= horarioInicio) {
             alert("O horário de fim deve ser posterior ao horário de início."); return;
         }

        try {
            // Gera o conteúdo do arquivo .ics
            console.log("[Export] Gerando conteúdo ICS...");
            const eventosICS = gerarICS(plano, horarioInicio, horarioFim);
            console.log("[Export] Conteúdo ICS gerado. Iniciando download...");
            // Inicia o download do arquivo
            downloadICSFile(eventosICS, plano.titulo);
            console.log("[Export] Arquivo ICS download iniciado.");
            alert(`Arquivo "${`Plano_Leitura_${plano.titulo.replace(/[^a-z0-9]/gi, '_')}.ics`}" gerado!\nImporte-o para sua aplicação de calendário (Google Agenda, Outlook, etc.).`);
        } catch (error) {
             console.error("[Export] Erro ao gerar ou baixar arquivo ICS:", error);
             alert("Ocorreu um erro ao gerar o arquivo da agenda: " + error.message);
        }
    }

    // Gera o conteúdo do arquivo .ics com base nos dados do plano
    function gerarICS(plano, horarioInicio, horarioFim) {
         // Revalidação robusta dos dados do plano
         if (!plano || !plano.id || typeof plano.titulo !== 'string' || plano.titulo.trim() === '' ||
             !plano.diasPlano || plano.diasPlano.length === 0 ||
             !plano.dataInicio || !(plano.dataInicio instanceof Date) || isNaN(plano.dataInicio) ||
             !plano.dataFim || !(plano.dataFim instanceof Date) || isNaN(plano.dataFim)) {
            console.error("[Export ICS] Dados do plano inválidos para gerar ICS:", plano);
            throw new Error("Dados do plano incompletos ou inválidos para gerar o arquivo da agenda.");
        }

         const uidEvento = `${plano.id.replace(/[^a-z0-9]/gi, '')}@gerenciador-planos-leitura.app`;
         const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split('.')[0] + "Z";

         // Formata data e hora para o padrão ICS (YYYYMMDDTHHMMSS) - Local Time
         const formatICSDateTimeLocal = (date, time) => {
            if (!(date instanceof Date) || isNaN(date)) throw new Error(`[ICS] Data inválida (${date}) no formatICSDateTimeLocal`);
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const [hour, minute] = time.split(':');
            return `${year}${month}${day}T${hour}${minute}00`;
         };

        // Formata a data final da recorrência (UNTIL) para o padrão ICS (YYYYMMDDTHHMMSSZ) - UTC
         const formatICSDateUTCUntil = (date) => {
             if (!(date instanceof Date) || isNaN(date)) throw new Error(`[ICS] Data inválida (${date}) no formatICSDateUTCUntil`);
             // Cria uma data UTC no final do dia para garantir que inclua a data final
             const dateUtc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59));
             const year = dateUtc.getUTCFullYear();
             const month = (dateUtc.getUTCMonth() + 1).toString().padStart(2, '0');
             const day = dateUtc.getUTCDate().toString().padStart(2, '0');
             return `${year}${month}${day}T235959Z`;
         };

        // Encontra o primeiro dia de leitura VÁLIDO no plano para definir o DTSTART
        let primeiroDiaLeituraValido = null;
        for(const dia of plano.diasPlano) {
             if (dia && dia.data instanceof Date && !isNaN(dia.data)) {
                 primeiroDiaLeituraValido = dia.data;
                 break; // Encontrou o primeiro válido
             }
        }
        if(!primeiroDiaLeituraValido) {
            console.error("[Export ICS] Nenhum dia de leitura válido encontrado no plano:", plano.diasPlano);
            throw new Error("Nenhum dia de leitura válido encontrado no plano para definir o início do evento.");
        }
        console.log("[Export ICS] Primeiro dia válido encontrado para DTSTART:", primeiroDiaLeituraValido.toLocaleDateString());


        // --- Construção da String ICS ---
         let icsString = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//GerenciadorPlanosLeitura//AppWeb//PT\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n`;
        icsString += `BEGIN:VEVENT\r\n`;
        icsString += `UID:${uidEvento}\r\n`;
        icsString += `DTSTAMP:${dtstamp}\r\n`;
        icsString += `DTSTART:${formatICSDateTimeLocal(primeiroDiaLeituraValido, horarioInicio)}\r\n`;
        icsString += `DTEND:${formatICSDateTimeLocal(primeiroDiaLeituraValido, horarioFim)}\r\n`;

        // Regra de Recorrência (RRULE)
        let rrule = 'RRULE:FREQ=';
        if (plano.periodicidade === 'diario') {
            rrule += 'DAILY';
        } else if (plano.periodicidade === 'semanal' && Array.isArray(plano.diasSemana) && plano.diasSemana.length > 0) {
            rrule += 'WEEKLY';
            const diasSemanaICS = plano.diasSemana.sort().map(diaIndex => ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][diaIndex]).join(',');
            rrule += `;BYDAY=${diasSemanaICS}`;
        } else {
             console.warn("[Export ICS] Periodicidade inválida ou semanal sem dias para RRULE. Usando DAILY.");
             rrule += 'DAILY';
        }

         // Define até quando a recorrência vai (UNTIL)
         rrule += `;UNTIL=${formatICSDateUTCUntil(plano.dataFim)}`;
         icsString += `${rrule}\r\n`;

        // Descrição e outros detalhes do evento
        let description = `Plano de Leitura: ${plano.titulo}.\\n`;
        description += `Páginas do Plano: ${plano.paginaInicio}-${plano.paginaFim}.\\n`;
        const dataInicioStr = plano.dataInicio.toLocaleDateString('pt-BR');
        const dataFimStr = plano.dataFim.toLocaleDateString('pt-BR');
        description += `Período Total do Plano: ${dataInicioStr} a ${dataFimStr}.\\n\\n`;
        description += `Lembrete: Verifique no aplicativo as páginas exatas designadas para o dia de hoje.\\n`;
        // Tenta obter a URL base da aplicação
        let appUrl = window.location.origin + window.location.pathname;
        description += `Acesse o app: ${appUrl}`;

        icsString += `SUMMARY:Leitura: ${plano.titulo}\r\n`;
        icsString += `DESCRIPTION:${description}\r\n`;
        icsString += `LOCATION:Seu local de leitura\r\n`;
        icsString += `STATUS:CONFIRMED\r\n`;
        icsString += `TRANSP:OPAQUE\r\n`; // Marca como ocupado

        // Alarme/Lembrete (15 minutos antes)
        icsString += `BEGIN:VALARM\r\n`;
        icsString += `ACTION:DISPLAY\r\n`;
        icsString += `DESCRIPTION:Lembrete de Leitura: ${plano.titulo}\r\n`;
        icsString += `TRIGGER:-PT15M\r\n`;
        icsString += `END:VALARM\r\n`;

        icsString += `END:VEVENT\r\n`;
        icsString += `END:VCALENDAR\r\n`;

        return icsString;
    }

    // Cria um link temporário e clica nele para baixar o arquivo .ics gerado
    function downloadICSFile(icsContent, planoTitulo) {
        try {
            const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const nomeArquivo = `Plano_Leitura_${planoTitulo.replace(/[^a-z0-9]/gi, '_')}.ics`;
            a.download = nomeArquivo;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log(`[Export] Download do arquivo ${nomeArquivo} iniciado.`);
        } catch (e) {
            console.error("[Export] Erro ao criar ou iniciar download do ICS:", e);
            alert("Erro ao tentar baixar o arquivo da agenda.");
        }
    }


    // --- Lógica do Paginador Flutuante ---

    // Mostra/esconde o paginador com base na rolagem e no número de planos
    function togglePaginatorVisibility() {
        const paginador = document.getElementById('paginador-planos');
        if (!paginador) return; // Sai se o elemento não existe

        const lista = document.getElementById('lista-planos');

        // Esconde se não estiver logado, não houver planos ou só houver 1 plano
        if (!user || !planos || planos.length <= 1 || !lista) {
            if (paginador.classList.contains('hidden') === false) {
                 console.log("[UI Paginator] Escondendo (sem user, sem planos ou <= 1 plano)");
                 paginador.classList.add('hidden');
            }
            return;
        }

        const footer = document.querySelector('footer');
        const listaRect = lista.getBoundingClientRect();
        const footerRect = footer ? footer.getBoundingClientRect() : { top: document.body.scrollHeight };
        const windowHeight = window.innerHeight;

        // Condição para mostrar: Lista tem altura e (está perto do footer ou footer fora da tela)
        const shouldShow = listaRect.height > 0 && (listaRect.bottom + 50 > footerRect.top || footerRect.top > windowHeight);

        if (shouldShow && paginador.classList.contains('hidden')) {
            console.log("[UI Paginator] Mostrando");
            paginador.classList.remove('hidden');
         } else if (!shouldShow && !paginador.classList.contains('hidden')) {
            console.log("[UI Paginator] Escondendo (scroll/posição)");
            paginador.classList.add('hidden');
         }
    }
    // Adiciona listeners para chamar a função em rolagem e redimensionamento
    window.addEventListener('scroll', togglePaginatorVisibility);
    window.addEventListener('resize', togglePaginatorVisibility);


    // --- Funções de Geração e Distribuição de Dias/Páginas ---

    // Distribui as páginas do livro entre os dias de leitura calculados para um plano
    function distribuirPaginasPlano(plano) {
        // Validação robusta dos dados necessários
        if (!plano || !plano.diasPlano || plano.diasPlano.length === 0 ||
            typeof plano.paginaInicio !== 'number' || plano.paginaInicio < 1 ||
            typeof plano.paginaFim !== 'number' || plano.paginaFim < plano.paginaInicio) {
            console.warn("[Calc] Dados insuficientes ou inválidos para distribuir páginas:", plano);
            // Zera as páginas nos dias existentes se a distribuição falhar
            if(plano && plano.diasPlano) {
                 plano.diasPlano.forEach(dia => { if(dia) {dia.paginaInicioDia = 0; dia.paginaFimDia = -1; dia.paginas = 0;} });
            }
             if(plano) { plano.totalPaginas = 0; plano.paginasLidas = 0; } // Zera totais do plano
            return; // Interrompe a função
        }

        const totalPaginasLivro = plano.paginaFim - plano.paginaInicio + 1;
        // Filtra dias inválidos antes de contar (garante que só dias com data contem)
        const diasDeLeituraValidos = plano.diasPlano.filter(dia => dia && dia.data instanceof Date && !isNaN(dia.data));
        const numeroDeDiasValidos = diasDeLeituraValidos.length;

        // Se não há dias válidos, não há como distribuir
        if (numeroDeDiasValidos === 0) {
            console.warn("[Calc] Nenhum dia de leitura válido encontrado para distribuir páginas:", plano.titulo);
            plano.totalPaginas = totalPaginasLivro; // Mantém total páginas do livro
            plano.paginasLidas = 0; // Zera lidas
             // Zera páginas nos dias (mesmo os inválidos)
             plano.diasPlano.forEach(dia => { if(dia) {dia.paginaInicioDia = 0; dia.paginaFimDia = -1; dia.paginas = 0;} });
            return;
        }


        plano.totalPaginas = totalPaginasLivro; // Define o total de páginas no objeto plano

        // Calcula a base de páginas por dia e quantas páginas extras sobram
        const paginasPorDiaBase = Math.floor(totalPaginasLivro / numeroDeDiasValidos);
        const paginasRestantes = totalPaginasLivro % numeroDeDiasValidos;

        let paginaAtual = plano.paginaInicio; // Começa da página inicial do plano

        // Itera APENAS pelos dias de leitura VÁLIDOS para distribuir páginas
        diasDeLeituraValidos.forEach((dia, index) => {
            // Calcula quantas páginas alocar para este dia (base + 1 extra se for um dos primeiros)
            let paginasNesteDia = paginasPorDiaBase + (index < paginasRestantes ? 1 : 0);

             // Garante que não aloque páginas negativas ou zero se algo der errado
             if (paginasNesteDia <= 0 && totalPaginasLivro > 0) {
                 console.warn(`[Calc] Distribuição resultou em ${paginasNesteDia} páginas para o dia ${dia.data.toLocaleDateString()}. Forçando 1.`);
                 paginasNesteDia = 1;
             }

            // Define a página inicial e final para este dia VÁLIDO
            dia.paginaInicioDia = paginaAtual;
            dia.paginaFimDia = paginaAtual + paginasNesteDia - 1;

            // Ajuste crucial: Garante que a página final do dia não ultrapasse a página final do livro
            if (dia.paginaFimDia > plano.paginaFim) {
                 dia.paginaFimDia = plano.paginaFim;
            }
            // Ajuste crucial: Garante que a página inicial não ultrapasse a final (caso de 1 página no último dia)
             if (dia.paginaInicioDia > dia.paginaFimDia) {
                 dia.paginaInicioDia = dia.paginaFimDia;
             }

            // Calcula o número real de páginas para este dia (pode ser menor no último dia)
            dia.paginas = Math.max(0, dia.paginaFimDia - dia.paginaInicioDia + 1);

            // Atualiza a página atual para o próximo dia começar
            paginaAtual = dia.paginaFimDia + 1;
        });

        // Zera páginas para dias que foram filtrados (sem data válida)
        plano.diasPlano.forEach(dia => {
            if (dia && !(dia.data instanceof Date && !isNaN(dia.data))) {
                dia.paginaInicioDia = 0;
                dia.paginaFimDia = -1;
                dia.paginas = 0;
            }
        });


        // Verificação final no último dia VÁLIDO
        if (diasDeLeituraValidos.length > 0) {
            const ultimoDiaValido = diasDeLeituraValidos[numeroDeDiasValidos - 1];
             if (ultimoDiaValido.paginaFimDia < plano.paginaFim && paginaAtual <= plano.paginaFim) {
                 console.warn(`[Calc] Ajuste pós-distribuição: Último dia válido (${ultimoDiaValido.data.toLocaleDateString()}) terminaria em ${ultimoDiaValido.paginaFimDia}. Corrigindo para ${plano.paginaFim}.`);
                 ultimoDiaValido.paginaFimDia = plano.paginaFim;
                 ultimoDiaValido.paginas = Math.max(0, ultimoDiaValido.paginaFimDia - ultimoDiaValido.paginaInicioDia + 1);
             }
        }

        // Recalcula as páginas lidas com base nos dias marcados como 'lido' APÓS a distribuição
        // Se o plano está no array global, chama a função, senão calcula localmente
        const planoGlobalIndex = planos.findIndex(p => p.id === plano.id);
        if (planoGlobalIndex !== -1) {
             atualizarPaginasLidas(planoGlobalIndex);
        } else {
             plano.paginasLidas = plano.diasPlano.reduce((sum, dia) => sum + (dia && dia.lido && typeof dia.paginas === 'number' ? dia.paginas : 0), 0);
        }
        console.log("[Calc] Distribuição de páginas concluída para o plano:", plano.titulo);
    }

    // Gera um array de objetos representando os dias de leitura com base em datas de início/fim
    function gerarDiasPlanoPorDatas(dataInicio, dataFim, periodicidade, diasSemana) {
        const dias = [];
        // Validação das entradas
        if (!(dataInicio instanceof Date) || !(dataFim instanceof Date) || isNaN(dataInicio) || isNaN(dataFim) || dataFim < dataInicio) {
            console.error("[Calc] Datas inválidas fornecidas para gerarDiasPlanoPorDatas:", dataInicio, dataFim);
            return dias; // Retorna array vazio se inválido
        }
        // Normaliza as datas para evitar problemas com horas
        let dataAtual = new Date(dataInicio); dataAtual.setHours(0, 0, 0, 0);
        const dataFimNormalizada = new Date(dataFim); dataFimNormalizada.setHours(0, 0, 0, 0);

        let safetyCounter = 0;
        const MAX_ITERATIONS = 365 * 10; // Limite generoso (10 anos)

        // Itera do início ao fim
        while (dataAtual <= dataFimNormalizada && safetyCounter < MAX_ITERATIONS) {
            const diaSemanaAtual = dataAtual.getDay(); // 0 = Domingo, ..., 6 = Sábado
            // Verifica se o dia atual deve ser incluído com base na periodicidade
            if (periodicidade === 'diario' || (periodicidade === 'semanal' && Array.isArray(diasSemana) && diasSemana.includes(diaSemanaAtual))) {
                // Adiciona o dia ao array (com dados iniciais zerados)
                dias.push({ data: new Date(dataAtual), paginaInicioDia: 0, paginaFimDia: 0, paginas: 0, lido: false });
            }
            // Avança para o próximo dia
            dataAtual.setDate(dataAtual.getDate() + 1);
            safetyCounter++;
        }

         if (safetyCounter >= MAX_ITERATIONS) {
             console.error("[Calc] Loop infinito provável detectado em gerarDiasPlanoPorDatas. Interrompido.");
             alert("Erro: Não foi possível gerar os dias do plano. O intervalo de datas pode ser muito grande.");
             return []; // Retorna vazio em caso de erro
         }
        console.log(`[Calc] ${dias.length} dias gerados por datas (${dataInicio.toLocaleDateString()} a ${dataFim.toLocaleDateString()})`);
        return dias;
    }

    // Gera um array de objetos representando os dias de leitura com base na data de início e número de dias
    function gerarDiasPlanoPorDias(dataInicio, numeroDias, periodicidade, diasSemana) {
        const dias = [];
        // Validação das entradas
         if (!(dataInicio instanceof Date) || isNaN(dataInicio) || typeof numeroDias !== 'number' || numeroDias <= 0) {
             console.error("[Calc] Dados inválidos fornecidos para gerarDiasPlanoPorDias:", dataInicio, numeroDias);
             return dias;
         }
        // Normaliza a data inicial
        let dataAtual = new Date(dataInicio); dataAtual.setHours(0, 0, 0, 0);
        let diasAdicionados = 0;
        let safetyCounter = 0;
        // Limite de segurança maior, ajustado
        const MAX_ITERATIONS_DIAS = numeroDias * 10 + 366; // Permite mais folga

        // Continua até adicionar o número de dias desejado ou atingir o limite de segurança
        while (diasAdicionados < numeroDias && safetyCounter < MAX_ITERATIONS_DIAS) {
            const diaSemanaAtual = dataAtual.getDay();
            // Verifica se o dia atual deve ser incluído
            if (periodicidade === 'diario' || (periodicidade === 'semanal' && Array.isArray(diasSemana) && diasSemana.includes(diaSemanaAtual))) {
                // Adiciona o dia e incrementa o contador
                dias.push({ data: new Date(dataAtual), paginaInicioDia: 0, paginaFimDia: 0, paginas: 0, lido: false });
                diasAdicionados++;
            }
             // Avança para o próximo dia, independentemente de ter sido adicionado ou não
             dataAtual.setDate(dataAtual.getDate() + 1);
             safetyCounter++;
             if (safetyCounter >= MAX_ITERATIONS_DIAS) {
                 console.error(`[Calc] Loop infinito provável detectado em gerarDiasPlanoPorDias (${MAX_ITERATIONS_DIAS} iterações). Interrompido.`);
                 alert(`Erro: Não foi possível gerar os ${numeroDias} dias solicitados. A periodicidade (${periodicidade}) pode ser muito restritiva ou o número de dias muito grande.`);
                 // Retorna os dias que conseguiu gerar até o momento
                 return dias;
             }
        }

        // Aviso se não conseguiu gerar todos os dias solicitados
        if (diasAdicionados < numeroDias) {
             console.warn(`[Calc] Não foi possível gerar os ${numeroDias} dias solicitados com a periodicidade '${periodicidade}'. Apenas ${diasAdicionados} foram gerados (limite de iteração atingido?).`);
              // Decide se quer alertar o usuário ou apenas logar. Vamos alertar.
              alert(`Atenção: Com a periodicidade selecionada, foi possível gerar apenas ${diasAdicionados} dos ${numeroDias} dias de leitura solicitados. O plano será criado com ${diasAdicionados} dias.`);
         }
         console.log(`[Calc] ${dias.length} dias gerados por número (${numeroDias} solicitados) a partir de ${dataInicio.toLocaleDateString()}`);
        return dias;
    }

    // --- Listeners de Eventos da Interface ---

    // Botões de Autenticação
    if (showAuthButton) {
        showAuthButton.addEventListener('click', () => {
            console.log("[Click] Botão 'Login/Cadastro' clicado.");
            if(authFormDiv) authFormDiv.style.display = 'flex';
            if(showAuthButton) showAuthButton.style.display = 'none';
            if(cancelAuthButton) cancelAuthButton.style.display = 'inline-block';
            if(logoutButton) logoutButton.style.display = 'none';
            if (emailLoginInput) emailLoginInput.focus();
            atualizarVisibilidadeBotoesAcao();
        });
    }
    if (cancelAuthButton) {
        cancelAuthButton.addEventListener('click', () => {
             console.log("[Click] Botão 'Cancelar Auth' clicado.");
            if(authFormDiv) authFormDiv.style.display = 'none';
            if(showAuthButton) showAuthButton.style.display = 'block';
            if(cancelAuthButton) cancelAuthButton.style.display = 'none';
            if (emailLoginInput) emailLoginInput.value = '';
            if (passwordLoginInput) passwordLoginInput.value = '';
            atualizarVisibilidadeBotoesAcao();
        });
    }
    // Listener para o botão LOGIN
    if (loginEmailButton) {
        loginEmailButton.addEventListener('click', () => {
            // ESTE LOG É ESSENCIAL: Se ele não aparecer, o problema é ANTES daqui.
            console.log("[Click] >>> Login Button CLICKED! (Listener Callback Executado) <<<");
            loginWithEmailPassword(); // Chama a função de login
        });
        console.log("[Listener] Event Listener ADICIONADO ao #login-email-button.");
    } else {
        console.error("ERRO CRÍTICO: Botão #login-email-button não encontrado!");
    }
    // Listener para o botão CADASTRO
    if (signupEmailButton) {
        signupEmailButton.addEventListener('click', () => {
            // ESTE LOG É ESSENCIAL
            console.log("[Click] >>> Signup Button CLICKED! (Listener Callback Executado) <<<");
            signupWithEmailPassword(); // Chama a função de cadastro
        });
        console.log("[Listener] Event Listener ADICIONADO ao #signup-email-button.");
    } else {
        console.error("ERRO CRÍTICO: Botão #signup-email-button não encontrado!");
    }
    // Listener para o botão SAIR
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            console.log("[Click] Botão Logout clicado.");
            logout();
        });
         console.log("[Listener] Event Listener ADICIONADO ao #logout-button.");
    } else {
         console.error("ERRO: Botão #logout-button não encontrado!");
    }
    // Listener de clique no CONTAINER do form (para depuração)
    if (authFormDiv) {
        authFormDiv.addEventListener('click', (event) => {
            // Loga o clique e o elemento exato que foi clicado dentro do div
            console.log(`[Click Debug] Clique detectado DENTRO de #auth-form. Target: <${event.target.tagName} id="${event.target.id}" class="${event.target.className}">`);
        });
         console.log("[Listener] Event Listener de DEBUG adicionado ao container #auth-form.");
    } else {
         console.error("ERRO: Container #auth-form não encontrado para listener de debug!");
    }


    // Botões de Navegação Principal
    if (novoPlanoBtn) {
        novoPlanoBtn.addEventListener('click', function() {
            console.log("[Click] Botão 'Novo Plano' clicado.");
            if (!user) {
                alert("Faça login ou cadastre-se para criar um novo plano.");
                // Tenta abrir o form de login se o botão estiver visível
                if (showAuthButton && showAuthButton.style.display !== 'none') showAuthButton.click();
                return;
            }
            // Mostra seção de cadastro, esconde outras
            if (cadastroPlanoSection) cadastroPlanoSection.style.display = 'block';
            if (planosLeituraSection) planosLeituraSection.style.display = 'none';
            if (leiturasAtrasadasSection) leiturasAtrasadasSection.style.display = 'none';
            if (proximasLeiturasSection) proximasLeiturasSection.style.display = 'none';
            if (inicioCadastroBtn) inicioCadastroBtn.style.display = 'block'; // Mostra botão 'Voltar' no form

            // Reseta o formulário apenas se não estiver vindo de uma edição
            if (!preventFormReset && formPlano) {
                console.log("[Form] Resetando formulário para novo plano.");
                formPlano.reset(); // Limpa todos os campos
                planoEditandoIndex = -1; // Garante que não está em modo de edição
                const submitBtn = formPlano.querySelector('button[type="submit"]');
                if (submitBtn) submitBtn.textContent = 'Salvar Plano';
                // Reseta seletores para o padrão
                 if (definirPorDatasRadio) definirPorDatasRadio.checked = true;
                 if (periodoPorDatasDiv) periodoPorDatasDiv.style.display = 'block';
                 if (periodoPorDiasDiv) periodoPorDiasDiv.style.display = 'none';
                 if (periodicidadeSelect) periodicidadeSelect.value = 'diario';
                 if (diasSemanaSelecao) diasSemanaSelecao.style.display = 'none';
                 document.querySelectorAll('input[name="dia-semana"]').forEach(cb => cb.checked = false);
                 updateRequiredAttributes(); // Ajusta campos obrigatórios após reset
            } else {
                 console.log("[Form] Não resetando formulário (preventFormReset=true ou form não encontrado).");
            }

            atualizarVisibilidadeBotoesAcao(); // Ajusta botões do header
            const tituloInput = document.getElementById('titulo-livro');
            if (tituloInput) tituloInput.focus(); // Foca no título
        });
         console.log("[Listener] Event Listener ADICIONADO ao #novo-plano.");
    } else {
        console.error("ERRO: Botão #novo-plano não encontrado!");
    }

    // Botão 'Início' (visível apenas na tela de cadastro/edição)
    if (inicioBtn) {
        inicioBtn.addEventListener('click', function() {
            console.log("[Click] Botão 'Início' (navegação header) clicado.");
            // Mostra lista de planos, esconde cadastro
            if (planosLeituraSection) planosLeituraSection.style.display = 'block';
            if (cadastroPlanoSection) cadastroPlanoSection.style.display = 'none';
            planoEditandoIndex = -1; // Sai do modo de edição
            // Reseta texto botão submit do formulário
            const submitBtn = formPlano ? formPlano.querySelector('button[type="submit"]') : null;
            if (submitBtn) submitBtn.textContent = 'Salvar Plano';

            atualizarVisibilidadeBotoesAcao(); // Ajusta header
            renderizarPlanos(); // Re-renderiza a lista principal
        });
         console.log("[Listener] Event Listener ADICIONADO ao #inicio.");
    } else {
        console.error("ERRO: Botão #inicio não encontrado!");
    }

    // Botão 'Voltar para Início' (dentro da seção de cadastro)
     if (inicioCadastroBtn) {
         inicioCadastroBtn.addEventListener('click', function() {
              console.log("[Click] Botão 'Voltar para Início' (do form) clicado.");
             // Simula o clique no botão 'Início' do header para centralizar a lógica
             if (inicioBtn) inicioBtn.click();
             else console.error("ERRO: Botão #inicio não encontrado para ser clicado por #inicio-cadastro.");
         });
          console.log("[Listener] Event Listener ADICIONADO ao #inicio-cadastro.");
     } else {
          console.error("ERRO: Botão #inicio-cadastro não encontrado!");
     }


    // Controles do Formulário (Radios de Período e Select de Periodicidade)
    if (definirPorDatasRadio && periodoPorDatasDiv && periodoPorDiasDiv) {
        definirPorDatasRadio.addEventListener('change', function() {
            if (this.checked) {
                periodoPorDatasDiv.style.display = 'block';
                periodoPorDiasDiv.style.display = 'none';
                updateRequiredAttributes();
            }
        });
         console.log("[Listener] Event Listener ADICIONADO ao #definir-por-datas.");
    } else {
         console.error("ERRO: Elementos #definir-por-datas ou divs de período não encontrados!");
    }
    if (definirPorDiasRadio && periodoPorDatasDiv && periodoPorDiasDiv) {
        definirPorDiasRadio.addEventListener('change', function() {
            if (this.checked) {
                periodoPorDatasDiv.style.display = 'none';
                periodoPorDiasDiv.style.display = 'block';
                updateRequiredAttributes();
            }
        });
         console.log("[Listener] Event Listener ADICIONADO ao #definir-por-dias.");
    } else {
         console.error("ERRO: Elementos #definir-por-dias ou divs de período não encontrados!");
    }
    if (periodicidadeSelect && diasSemanaSelecao) {
        periodicidadeSelect.addEventListener('change', function() {
            // Mostra/esconde a seleção de dias da semana
            diasSemanaSelecao.style.display = this.value === 'semanal' ? 'block' : 'none';
            // Desmarca dias se voltar para 'diario' (opcional)
            if (this.value === 'diario') {
                document.querySelectorAll('input[name="dia-semana"]').forEach(cb => cb.checked = false);
            }
        });
         console.log("[Listener] Event Listener ADICIONADO ao #periodicidade.");
    } else {
         console.error("ERRO: Elementos #periodicidade ou #dias-semana-selecao não encontrados!");
    }

    // Submissão do formulário (Salvar/Atualizar Plano)
    if (formPlano) {
        formPlano.addEventListener('submit', function(event) {
            event.preventDefault(); // Previne recarregamento da página
            console.log("[Form] Formulário de plano submetido.");

            if (!user) {
                 alert("Erro: Você precisa estar logado para salvar um plano.");
                 // Tenta mostrar form de login
                 if (showAuthButton && showAuthButton.style.display !== 'none') showAuthButton.click();
                 return;
             }

            // --- Coleta e Validação dos Dados do Formulário ---
             // Adiciona verificação de existência dos elementos antes de pegar .value
            const tituloInput = document.getElementById('titulo-livro');
            const linkDriveInputForm = document.getElementById('link-drive'); // Renomeado para evitar conflito
            const paginaInicioInput = document.getElementById('pagina-inicio');
            const paginaFimInput = document.getElementById('pagina-fim');
            const definicaoPeriodoRadio = document.querySelector('input[name="definicao-periodo"]:checked');
            const periodicidadeSel = document.getElementById('periodicidade'); // Já selecionado antes

            if (!tituloInput || !linkDriveInputForm || !paginaInicioInput || !paginaFimInput || !definicaoPeriodoRadio || !periodicidadeSel) {
                console.error("[Form] ERRO: Campos essenciais do formulário não encontrados!");
                alert("Erro interno no formulário. Recarregue a página.");
                return;
            }

            const titulo = tituloInput.value.trim();
            const linkDrive = linkDriveInputForm.value.trim();
            const paginaInicioStr = paginaInicioInput.value;
            const paginaFimStr = paginaFimInput.value;
            const definicaoPeriodo = definicaoPeriodoRadio.value;
            const periodicidade = periodicidadeSel.value;

            // Validações
            if (!titulo) { alert('O título do livro é obrigatório.'); return; }
            const paginaInicio = parseInt(paginaInicioStr);
            const paginaFim = parseInt(paginaFimStr);
            if (isNaN(paginaInicio) || paginaInicio < 1) { alert('Página de início inválida.'); return; }
            if (isNaN(paginaFim) || paginaFim < paginaInicio) { alert('Página de fim inválida.'); return; }
            if(linkDrive !== '' && !linkDrive.startsWith('http://') && !linkDrive.startsWith('https://')) {
                alert("Link de anotações inválido. Deve começar com http:// ou https:// (ou deixe em branco)."); return;
            }

            let dataInicio, dataFim;
            let diasPlano = [];
            let diasSemana = []; // Array para armazenar os dias selecionados (0-6)

             // Coleta dias da semana se a periodicidade for semanal
             if (periodicidade === 'semanal') {
                 document.querySelectorAll('input[name="dia-semana"]:checked').forEach(cb => {
                     diasSemana.push(parseInt(cb.value));
                 });
                 if (diasSemana.length === 0) {
                     alert('Para periodicidade semanal, selecione pelo menos um dia.'); return;
                 }
                 diasSemana.sort((a,b) => a - b); // Ordena os dias (0, 1, 2...)
             }

            // --- Geração dos Dias de Leitura ---
            try {
                console.log(`[Form] Gerando dias - Definição: ${definicaoPeriodo}, Periodicidade: ${periodicidade}, Dias Semana: ${diasSemana}`);
                if (definicaoPeriodo === 'datas') {
                    const dataInicioInputEl = document.getElementById('data-inicio');
                    const dataFimInputEl = document.getElementById('data-fim');
                    if (!dataInicioInputEl || !dataFimInputEl) throw new Error("Campos de data (datas) não encontrados.");
                    const dataInicioInputVal = dataInicioInputEl.value;
                    const dataFimInputVal = dataFimInputEl.value;
                    if (!dataInicioInputVal || !dataFimInputVal) throw new Error('Datas início/fim obrigatórias.');
                    dataInicio = new Date(dataInicioInputVal + 'T00:00:00');
                    dataFim = new Date(dataFimInputVal + 'T00:00:00');
                    if (isNaN(dataInicio) || isNaN(dataFim)) throw new Error('Formato de data inválido.');
                    dataInicio.setHours(0,0,0,0); dataFim.setHours(0,0,0,0); // Normaliza
                    if (dataFim < dataInicio) throw new Error('Data fim anterior à data início.');
                    diasPlano = gerarDiasPlanoPorDatas(dataInicio, dataFim, periodicidade, diasSemana);
                } else { // definicaoPeriodo === 'dias'
                    const dataInicioDiasInputEl = document.getElementById('data-inicio-dias');
                    const numeroDiasInputEl = document.getElementById('numero-dias');
                    if (!dataInicioDiasInputEl || !numeroDiasInputEl) throw new Error("Campos de data/número (dias) não encontrados.");
                    const dataInicioDiasInputVal = dataInicioDiasInputEl.value;
                    const numeroDiasInputVal = numeroDiasInputEl.value;
                    if (!dataInicioDiasInputVal) throw new Error('Data início obrigatória.');
                    const numeroDiasInput = parseInt(numeroDiasInputVal);
                    if (isNaN(numeroDiasInput) || numeroDiasInput < 1) throw new Error('Número dias inválido.');
                    dataInicio = new Date(dataInicioDiasInputVal + 'T00:00:00');
                    if (isNaN(dataInicio)) throw new Error('Formato data início inválido.');
                    dataInicio.setHours(0,0,0,0); // Normaliza

                    diasPlano = gerarDiasPlanoPorDias(dataInicio, numeroDiasInput, periodicidade, diasSemana);

                    if (diasPlano.length === 0) {
                         // gerarDiasPlanoPorDias já deve ter alertado se falhou em gerar
                         throw new Error("Falha ao gerar dias de leitura."); // Apenas para interromper
                     }
                     // A data de fim é a data do último dia gerado
                     dataFim = diasPlano.length > 0 ? diasPlano[diasPlano.length - 1].data : null;
                     if (!dataFim || !(dataFim instanceof Date) || isNaN(dataFim)) {
                         console.error("[Form] Erro ao obter data fim dos dias gerados:", diasPlano);
                         throw new Error("Erro interno ao calcular a data final do plano.");
                     }
                     dataFim.setHours(0,0,0,0); // Normaliza data fim também
                }
            } catch (error) {
                 console.error("[Form] Erro ao gerar dias do plano:", error);
                 alert("Erro ao processar período: " + error.message);
                 return; // Interrompe a submissão
            }

            // Verificação final se dias foram gerados
            if (!diasPlano || diasPlano.length === 0) {
                alert("Não foi possível gerar nenhum dia de leitura para este plano com as configurações fornecidas. Verifique datas e periodicidade."); return;
            }

            // --- Criação ou Atualização do Objeto Plano ---
            console.log("[Form] Criando/Atualizando objeto planoData...");
            const planoData = {
                id: planoEditandoIndex !== -1 ? planos[planoEditandoIndex].id : crypto.randomUUID(),
                titulo: titulo,
                linkDrive: linkDrive,
                paginaInicio: paginaInicio,
                paginaFim: paginaFim,
                totalPaginas: (paginaFim - paginaInicio + 1),
                definicaoPeriodo: definicaoPeriodo,
                dataInicio: new Date(dataInicio), // Garante que são objetos Date
                dataFim: new Date(dataFim),     // Garante que são objetos Date
                periodicidade: periodicidade,
                diasSemana: diasSemana,
                diasPlano: diasPlano, // O array de dias gerados
                paginasLidas: 0 // Será recalculado
            };

            // Preserva o status 'lido' dos dias ao editar
            if (planoEditandoIndex !== -1) {
                 console.log("[Form] Modo Edição: Preservando status 'lido'...");
                 const diasLidosAntigosMap = new Map();
                 planos[planoEditandoIndex].diasPlano.forEach(diaAntigo => {
                     if (diaAntigo && diaAntigo.lido && diaAntigo.data instanceof Date && !isNaN(diaAntigo.data)) {
                         diasLidosAntigosMap.set(diaAntigo.data.toISOString().split('T')[0], true);
                     }
                 });
                 planoData.diasPlano.forEach(diaNovo => {
                     if (diaNovo && diaNovo.data instanceof Date && !isNaN(diaNovo.data)) {
                         const dataStr = diaNovo.data.toISOString().split('T')[0];
                         if (diasLidosAntigosMap.has(dataStr)) {
                             diaNovo.lido = true;
                             // console.log(`  - Dia ${dataStr} preservado como lido.`);
                         }
                     }
                 });
                 // Recalcula páginas lidas após preservar o status
                 planoData.paginasLidas = planoData.diasPlano.reduce((sum, dia) => sum + (dia && dia.lido && typeof dia.paginas === 'number' ? dia.paginas : 0), 0);
                 console.log("[Form] Páginas lidas preservadas:", planoData.paginasLidas);
            }

            // Distribui as páginas entre os dias gerados (ou atualizados)
            console.log("[Form] Distribuindo páginas...");
            distribuirPaginasPlano(planoData); // Isso também atualiza planoData.paginasLidas se não estava editando

            // --- Salva o Plano (Adiciona ou Substitui no Array Local) ---
            if (planoEditandoIndex !== -1) {
                console.log("[Form] Atualizando plano existente no índice:", planoEditandoIndex);
                planos[planoEditandoIndex] = planoData; // Substitui
            } else {
                console.log("[Form] Adicionando novo plano ao início do array.");
                planos.unshift(planoData); // Adiciona no início
            }

            // --- Salva no Firebase e Atualiza a Interface ---
            console.log("[Form] Chamando salvarPlanos...");
            salvarPlanos(planos, (salvoComSucesso) => {
                if (salvoComSucesso) {
                    const acao = planoEditandoIndex !== -1 ? 'atualizado' : 'salvo';
                    console.log(`[Data] Plano "${planoData.titulo}" ${acao} com sucesso.`);
                    const msgTitulo = planoData.titulo; // Salva título antes de resetar
                    planoEditandoIndex = -1; // Reseta o índice de edição
                    const submitBtn = formPlano.querySelector('button[type="submit"]');
                    if (submitBtn) submitBtn.textContent = 'Salvar Plano';
                    // Volta para a tela inicial (simula clique no botão 'Início')
                    if(inicioBtn) {
                        inicioBtn.click(); // Volta para a lista
                         alert(`Plano "${msgTitulo}" ${acao} com sucesso!`); // Mostra alerta APÓS voltar
                    } else {
                        console.error("[Form] Botão #inicio não encontrado para navegar após salvar.");
                        renderizarPlanos(); // Apenas renderiza se não puder navegar
                        alert(`Plano "${msgTitulo}" ${acao} com sucesso!`);
                    }
                } else {
                    alert("Houve um erro ao salvar o plano no servidor. Verifique sua conexão e tente novamente. As alterações podem não ter sido salvas.");
                    // Considerar rollback local em futuras versões
                }
            });
        });
         console.log("[Listener] Event Listener ADICIONADO ao submit do #form-plano.");
    } else {
         console.error("ERRO CRÍTICO: Formulário #form-plano não encontrado!");
    }

    // --- Inicialização da Aplicação ---
    console.log("[App] DOM pronto. Chamando initApp...");
    initApp(); // Começa o fluxo da aplicação

}); // --- Fim do DOMContentLoaded ---
