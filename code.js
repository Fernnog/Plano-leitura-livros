// script.js (Completo - v5: SW Removido + Logs Diagnóstico Auth + Listener Check - CORRIGIDO E COMPLETO)
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
    console.log("DOMContentLoaded event fired. Setting up listeners..."); // Log de início do setup

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
    const loginEmailButton = document.getElementById('login-email-button'); // Botão de Login
    const signupEmailButton = document.getElementById('signup-email-button'); // Botão de Cadastro
    const emailLoginInput = document.getElementById('email-login');
    const passwordLoginInput = document.getElementById('password-login');
    const logoutButton = document.getElementById('logout-button');
    const syncFirebaseButton = document.getElementById('sync-firebase');

    // >>> LOGS DE VERIFICAÇÃO DOS BOTÕES <<<
    console.log("Verificando elementos de botão Auth...");
    console.log("Elemento loginEmailButton encontrado:", loginEmailButton);
    console.log("Elemento signupEmailButton encontrado:", signupEmailButton);
    console.log("Elemento showAuthButton encontrado:", showAuthButton);
    console.log("Elemento cancelAuthButton encontrado:", cancelAuthButton);
    console.log("Elemento logoutButton encontrado:", logoutButton);
    // >>> FIM DOS LOGS DE VERIFICAÇÃO <<<

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
    let app, auth, db; // Declarar fora do try-catch
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        console.log("Firebase App Object:", app);
        console.log("Firebase Auth Object:", auth);
        if (!auth) {
            console.error("ERRO CRÍTICO: Objeto Auth do Firebase NÃO foi inicializado após getAuth()!");
        }
    } catch (error) {
        console.error("ERRO CRÍTICO AO INICIALIZAR FIREBASE:", error);
        alert("Erro grave ao conectar com o serviço de autenticação. Verifique o console e a configuração do Firebase.");
        // Impede o resto do script de rodar se o Firebase falhar na inicialização
        return;
    }


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
        // Adicionada verificação inicial mais robusta
        if (!plano || typeof plano !== 'object' || !plano.diasPlano || !Array.isArray(plano.diasPlano)) {
            return 'invalido';
        }
        // Verifica se as datas são instâncias válidas de Date
        if (!(plano.dataInicio instanceof Date) || isNaN(plano.dataInicio.getTime()) ||
            !(plano.dataFim instanceof Date) || isNaN(plano.dataFim.getTime())) {
            // Tentativa de converter strings (se vierem assim do Firestore por algum motivo)
             let inicioConvertido = plano.dataInicio ? new Date(plano.dataInicio) : null;
             let fimConvertido = plano.dataFim ? new Date(plano.dataFim) : null;

             if (!inicioConvertido || isNaN(inicioConvertido.getTime()) || !fimConvertido || isNaN(fimConvertido.getTime())){
                 console.warn("Datas de início/fim inválidas ou não convertíveis:", plano.dataInicio, plano.dataFim);
                return 'invalido';
             }
             // Se a conversão funcionou, usa as datas convertidas (não modifica o objeto original aqui)
             plano = { ...plano, dataInicio: inicioConvertido, dataFim: fimConvertido };
        }


        const hoje = getHojeNormalizado();
        const dataInicioPlano = new Date(plano.dataInicio);
        dataInicioPlano.setHours(0,0,0,0);
        const dataFimPlano = new Date(plano.dataFim);
        dataFimPlano.setHours(0,0,0,0);


        // 1. Verificar "Concluído"
        const todosLidos = plano.diasPlano.length > 0 && plano.diasPlano.every(dia => dia.lido);
        if (todosLidos) {
            return 'concluido';
        }

        // 2. Verificar "Próximo"
        if (dataInicioPlano > hoje) {
            return 'proximo';
        }

        // 3. Verificar "Atrasado"
         const temDiaPassadoNaoLido = plano.diasPlano.some(dia => {
            if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                 const dataDiaNormalizada = new Date(dia.data);
                 dataDiaNormalizada.setHours(0, 0, 0, 0);
                 return dataDiaNormalizada < hoje && !dia.lido;
            } else if (dia.data && typeof dia.data === 'string'){ // Tentativa de conversão se for string
                const dataConvertida = new Date(dia.data);
                if (!isNaN(dataConvertida.getTime())) {
                     const dataDiaNormalizada = new Date(dataConvertida);
                     dataDiaNormalizada.setHours(0, 0, 0, 0);
                     return dataDiaNormalizada < hoje && !dia.lido;
                }
            }
            return false;
         });

         if (temDiaPassadoNaoLido) {
             return 'atrasado';
         }

        // 4. Verificar "Em dia" (dentro do período)
        if (hoje >= dataInicioPlano && hoje <= dataFimPlano) {
            return 'em_dia';
        }

        // 5. Verificar "Em dia" (passou do fim, mas sem atrasos)
        if (hoje > dataFimPlano && !todosLidos && !temDiaPassadoNaoLido) {
            return 'em_dia';
        }

        // Fallback (deve ser raro)
        console.warn("Plano sem status definido (fallback):", plano);
        return '';
    }
    // --- *** FIM da Função Status *** ---


    // Função initApp
    function initApp() {
        // Garante que o objeto auth existe antes de chamar initAuth
        if (auth) {
            initAuth();
        } else {
            console.error("initApp: Objeto Auth não inicializado. Não é possível iniciar o listener de estado.");
            // Pode ser útil mostrar uma mensagem de erro na UI aqui
            if(listaPlanos) listaPlanos.innerHTML = "<p style='color:red;'>Erro crítico: Falha ao inicializar a autenticação. Recarregue a página ou contate o suporte.</p>";
        }
    }

    // Função initAuth
    function initAuth() {
        // Verifica se 'auth' é válido antes de usar
        if (!auth) {
             console.error("initAuth: Tentativa de chamar onAuthStateChanged sem objeto Auth válido.");
             return;
        }
        onAuthStateChanged(auth, (currentUser) => {
            user = currentUser;
            console.log("Estado de Autenticação Mudou:", user ? user.uid : 'Nenhum usuário');
            if (user) {
                // UI para usuário logado
                if(authFormDiv) authFormDiv.style.display = 'none';
                if(showAuthButton) showAuthButton.style.display = 'none';
                if(cancelAuthButton) cancelAuthButton.style.display = 'none';
                if(logoutButton) logoutButton.style.display = 'block';
                if(syncFirebaseButton) syncFirebaseButton.style.display = 'none'; // Mantido oculto

                // Carrega os planos do usuário
                carregarPlanosSalvos((planosCarregados) => {
                    planos = planosCarregados || [];
                    renderizarPlanos(); // Renderiza tudo após carregar
                });
            } else {
                // UI para usuário deslogado
                if(authFormDiv) authFormDiv.style.display = 'none'; // Esconde por padrão
                if(showAuthButton) showAuthButton.style.display = 'block';
                if(cancelAuthButton) cancelAuthButton.style.display = 'none';
                if(logoutButton) logoutButton.style.display = 'none';
                if(syncFirebaseButton) syncFirebaseButton.style.display = 'none';
                planos = []; // Limpa os planos locais se o usuário deslogar
                renderizarPlanos(); // Renderiza (mostrará mensagem de login)
            }
            atualizarVisibilidadeBotoesAcao(); // Ajusta botões do header com base no estado e tela
        });
    }

    // Função atualizarVisibilidadeBotoesAcao
    function atualizarVisibilidadeBotoesAcao() {
        // Verifica se os elementos de seção existem antes de checar display
        const estaNaTelaCadastro = cadastroPlanoSection && cadastroPlanoSection.style.display !== 'none';

        // Verifica se os elementos de botão existem antes de tentar modificar o style
        if (novoPlanoBtn) novoPlanoBtn.style.display = (estaNaTelaCadastro ? 'none' : (user ? 'block' : 'none'));
        if (inicioBtn) inicioBtn.style.display = (estaNaTelaCadastro ? (user ? 'block' : 'none') : 'none');
        if (exportarAgendaBtn) exportarAgendaBtn.style.display = (estaNaTelaCadastro ? 'none' : (user && planos.length > 0 ? 'block' : 'none'));

        // Controla botões de Auth baseado no estado e tela
        if (showAuthButton) showAuthButton.style.display = (estaNaTelaCadastro ? 'none' : (user ? 'none' : 'block'));
        if (logoutButton) logoutButton.style.display = (estaNaTelaCadastro ? 'none' : (user ? 'block' : 'none'));

        // Controla painéis de leitura
        if (!estaNaTelaCadastro) {
            // A visibilidade real é controlada dentro das funções render*Leituras
            // Aqui apenas garantimos que não fiquem visíveis na tela de cadastro
        } else {
            if (proximasLeiturasSection) proximasLeiturasSection.style.display = 'none';
            if (leiturasAtrasadasSection) leiturasAtrasadasSection.style.display = 'none';
        }


        // Lógica adicional para o formulário de autenticação (visibilidade)
        if (authFormDiv && cancelAuthButton && showAuthButton) { // Verifica todos os elementos envolvidos
            if (!user && showAuthButton.style.display === 'none' && !estaNaTelaCadastro) {
               // Manter como está (formulário de auth visível, pois showAuthButton foi clicado)
               authFormDiv.style.display = 'flex'; // Garante que esteja flex se show está none
               cancelAuthButton.style.display = 'inline-block'; // Garante que cancelar esteja visível
            } else if (!user && !estaNaTelaCadastro){ // Deslogado, na tela inicial, formulário não visível
                 authFormDiv.style.display = 'none';
                 cancelAuthButton.style.display = 'none';
            } else if (user) { // Logado (em qualquer tela)
                 authFormDiv.style.display = 'none';
                 cancelAuthButton.style.display = 'none';
            }
        }
    }

    // Funções loginWithEmailPassword, signupWithEmailPassword, logout (com logs internos mantidos)
    function loginWithEmailPassword() {
        console.log("--- loginWithEmailPassword FUNCTION CALLED ---");
        // Verifica se inputs existem
        if (!emailLoginInput || !passwordLoginInput) {
             console.error("LOGIN ERROR: Campos de email/senha não encontrados!");
             alert("Erro interno: Campos de login ausentes.");
             return;
        }
        const email = emailLoginInput.value;
        const password = passwordLoginInput.value;
        if (!auth) {
             console.error("LOGIN ERROR: Objeto Auth do Firebase não está inicializado!");
             alert("Erro interno: Falha na inicialização da autenticação.");
             return;
        }
        console.log("Attempting sign in with email:", email ? email.substring(0,3)+"..." : "EMPTY"); // Evita logar email completo
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                console.log('Login com email/senha bem-sucedido');
                emailLoginInput.value = '';
                passwordLoginInput.value = '';
                // onAuthStateChanged cuidará da UI
            })
            .catch((error) => {
                console.error('--- LOGIN ERROR ---');
                console.error('Error Code:', error.code);
                console.error('Error Message:', error.message);
                // console.error('Full Error Object:', error); // Log completo pode ser muito verboso
                alert(`Erro ao fazer login: ${error.message} (Código: ${error.code})`); // Mensagem mais informativa
            });
    }
    function signupWithEmailPassword() {
        console.log("--- signupWithEmailPassword FUNCTION CALLED ---");
         if (!emailLoginInput || !passwordLoginInput) {
             console.error("SIGNUP ERROR: Campos de email/senha não encontrados!");
             alert("Erro interno: Campos de cadastro ausentes.");
             return;
         }
        const email = emailLoginInput.value;
        const password = passwordLoginInput.value;
        if (!auth) {
             console.error("SIGNUP ERROR: Objeto Auth do Firebase não está inicializado!");
             alert("Erro interno: Falha na inicialização da autenticação.");
             return;
        }
        console.log("Attempting sign up with email:", email ? email.substring(0,3)+"..." : "EMPTY"); // Evita logar email completo
        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                console.log('Cadastro com email/senha bem-sucedido:', userCredential.user.uid);
                alert('Cadastro realizado com sucesso! Faça login.');
                emailLoginInput.value = '';
                passwordLoginInput.value = '';
                // Esconde o form e mostra botão de login/cadastro novamente
                if (authFormDiv) authFormDiv.style.display = 'none';
                if (showAuthButton) showAuthButton.style.display = 'block';
                if (cancelAuthButton) cancelAuthButton.style.display = 'none';
                 atualizarVisibilidadeBotoesAcao();
            })
            .catch((error) => {
                console.error('--- SIGNUP ERROR ---');
                console.error('Error Code:', error.code);
                console.error('Error Message:', error.message);
                // console.error('Full Error Object:', error);
                alert(`Erro ao cadastrar: ${error.message} (Código: ${error.code})`); // Mensagem mais informativa
            });
    }
    function logout() {
        console.log("Função logout() iniciada");
         if (!auth) {
             console.error("LOGOUT ERROR: Objeto Auth do Firebase não está inicializado!");
             alert("Erro interno ao tentar sair.");
             return;
         }
        signOut(auth)
            .then(() => {
                console.log('Logout bem-sucedido');
                // onAuthStateChanged cuidará da UI e limpeza dos planos
            })
            .catch((error) => {
                console.error('Erro ao fazer logout:', error);
                alert('Erro ao fazer logout. Tente novamente.');
            });
    }

    // Função carregarPlanosSalvos
    async function carregarPlanosSalvos(callback) {
        if (!user) {
            if (callback) callback([]);
            return;
        }
        if (!db) {
            console.error("Firestore DB object is not initialized.");
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
                        id: plano.id || crypto.randomUUID(), // Garante um ID se não veio do Firestore
                        linkDrive: plano.linkDrive || '',
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
                }).filter(plano => plano.dataInicio && plano.dataFim); // Filtra planos com datas inválidas
            } else {
                console.log("Nenhum documento de usuário encontrado para UID:", userId, ". Criando um novo.");
                await setDoc(docRef, { planos: [] });
            }
            if (callback) callback(planosDoFirestore);
        } catch (error) {
            console.error('Erro ao carregar planos do Firestore:', error);
            alert('Erro ao carregar planos. Verifique sua conexão e tente novamente.');
            if (callback) callback([]);
        }
    }

    // Função salvarPlanos
    async function salvarPlanos(planosParaSalvar, callback) {
        if (!user) {
            console.error('Usuário não logado, não é possível salvar.');
            if (callback) callback(false);
            return;
        }
         if (!db) {
            console.error("Firestore DB object is not initialized. Cannot save.");
            if (callback) callback(false);
            return;
        }
        const userId = user.uid;
        const docRef = doc(db, 'users', userId);
        const planosParaFirestore = planosParaSalvar.map(plano => {
            const linkDrive = typeof plano.linkDrive === 'string' ? plano.linkDrive : '';
            // Garante que o plano tenha um ID antes de salvar
            const planoId = plano.id || crypto.randomUUID();
            return {
                ...plano,
                id: planoId, // Inclui o ID no objeto a ser salvo
                linkDrive: linkDrive,
                dataInicio: (plano.dataInicio instanceof Date && !isNaN(plano.dataInicio)) ? plano.dataInicio.toISOString() : null,
                dataFim: (plano.dataFim instanceof Date && !isNaN(plano.dataFim)) ? plano.dataFim.toISOString() : null,
                diasPlano: plano.diasPlano ? plano.diasPlano.map(dia => ({
                    ...dia,
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

    // Função updateRequiredAttributes
    function updateRequiredAttributes() {
        if (definirPorDatasRadio && definirPorDiasRadio && dataInicio && dataFim && dataInicioDias && numeroDias) {
            if (definirPorDatasRadio.checked) {
                dataInicio.required = true; dataFim.required = true;
                dataInicioDias.required = false; numeroDias.required = false;
            } else {
                dataInicio.required = false; dataFim.required = false;
                dataInicioDias.required = true; numeroDias.required = true;
            }
        }
        if (linkDriveInput) linkDriveInput.required = false;
    }
    updateRequiredAttributes(); // Chama no início


    // --- FUNÇÕES DE RENDERIZAÇÃO DOS PAINÉIS E PLANOS ---
    // (renderizarLeiturasAtrasadas, renderizarProximasLeituras, renderizarPlanos)
    function renderizarLeiturasAtrasadas() {
        // Verifica se elementos da seção existem
        if (!leiturasAtrasadasSection || !listaLeiturasAtrasadasDiv || !semLeiturasAtrasadasP) {
             console.warn("Elementos da seção 'Leituras Atrasadas' não encontrados.");
             return;
        }
        leiturasAtrasadasSection.style.display = 'none'; // Esconde por padrão
        listaLeiturasAtrasadasDiv.innerHTML = ''; // Limpa antes de popular

        // Condições para não mostrar nada (além da seção vazia se configurado)
        if (!user || !planos || planos.length === 0) {
            leiturasAtrasadasSection.style.display = 'block'; // Mostra seção
            semLeiturasAtrasadasP.style.display = 'block'; // Mostra mensagem padrão
            return;
        }

        const hoje = getHojeNormalizado();
        const todasLeiturasAtrasadas = [];

        planos.forEach((plano, planoIndex) => {
            if (plano.diasPlano && plano.diasPlano.length > 0 && determinarStatusPlano(plano) !== 'concluido') {
                plano.diasPlano.forEach((dia) => {
                    // Tratamento robusto de datas
                    let dataDiaObj = null;
                    if (dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                        dataDiaObj = dia.data;
                    } else if (typeof dia.data === 'string') {
                         const convertedDate = new Date(dia.data);
                         if (!isNaN(convertedDate.getTime())) dataDiaObj = convertedDate;
                    }

                    if (dataDiaObj) {
                        const dataDiaNormalizada = new Date(dataDiaObj);
                        dataDiaNormalizada.setHours(0, 0, 0, 0);
                        if (dataDiaNormalizada < hoje && !dia.lido) {
                            todasLeiturasAtrasadas.push({
                                data: dataDiaObj, // Usa o objeto Date válido
                                titulo: plano.titulo || 'Sem Título',
                                paginasTexto: `Pgs ${dia.paginaInicioDia || '?'}-${dia.paginaFimDia || '?'} (${dia.paginas || '?'})`,
                                planoIndex: planoIndex
                            });
                        }
                    }
                });
            }
        });

        if (todasLeiturasAtrasadas.length > 0) {
            todasLeiturasAtrasadas.sort((a, b) => a.data.getTime() - b.data.getTime()); // Ordena por data
            const leiturasAtrasadasParaMostrar = todasLeiturasAtrasadas.slice(0, 3); // Pega as 3 mais antigas

            leiturasAtrasadasSection.style.display = 'block';
            semLeiturasAtrasadasP.style.display = 'none';

            leiturasAtrasadasParaMostrar.forEach(leitura => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('leitura-atrasada-item');
                const dataFormatada = leitura.data.toLocaleDateString('pt-BR', { weekday: 'short', month: 'short', day: 'numeric' });
                const numeroPlano = leitura.planoIndex + 1;
                itemDiv.innerHTML = `
                    <span class="leitura-atrasada-data">${dataFormatada}</span>
                    <span class="numero-plano-tag">${numeroPlano}</span>
                    <span class="leitura-atrasada-titulo">${he.encode(leitura.titulo)}</span>
                    <span class="leitura-atrasada-paginas">${leitura.paginasTexto}</span>`; // Encode para segurança
                listaLeiturasAtrasadasDiv.appendChild(itemDiv);
            });
        } else {
            // Nenhuma atrasada encontrada
            leiturasAtrasadasSection.style.display = 'block'; // Mantém a seção visível
            semLeiturasAtrasadasP.style.display = 'block'; // Mostra a mensagem
        }
    }

    function renderizarProximasLeituras() {
        // Verifica se elementos da seção existem
        if (!proximasLeiturasSection || !listaProximasLeiturasDiv || !semProximasLeiturasP) {
             console.warn("Elementos da seção 'Próximas Leituras' não encontrados.");
             return;
        }
        proximasLeiturasSection.style.display = 'none'; // Esconde por padrão
        listaProximasLeiturasDiv.innerHTML = ''; // Limpa

        if (!user || !planos || planos.length === 0) {
             proximasLeiturasSection.style.display = 'block';
             semProximasLeiturasP.style.display = 'block';
            return;
        }
        const hoje = getHojeNormalizado();
        const todasLeiturasFuturas = [];
        planos.forEach((plano, planoIndex) => {
            if (plano.diasPlano && plano.diasPlano.length > 0 && determinarStatusPlano(plano) !== 'concluido') {
                plano.diasPlano.forEach((dia) => {
                    let dataDiaObj = null;
                    if (dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                        dataDiaObj = dia.data;
                    } else if (typeof dia.data === 'string') {
                         const convertedDate = new Date(dia.data);
                         if (!isNaN(convertedDate.getTime())) dataDiaObj = convertedDate;
                    }

                    if (dataDiaObj) {
                        const dataDiaNormalizada = new Date(dataDiaObj);
                        dataDiaNormalizada.setHours(0,0,0,0);
                        if (dataDiaNormalizada >= hoje && !dia.lido) {
                            todasLeiturasFuturas.push({
                                data: dataDiaObj,
                                titulo: plano.titulo || 'Sem Título',
                                paginasTexto: `Pgs ${dia.paginaInicioDia || '?'}-${dia.paginaFimDia || '?'} (${dia.paginas || '?'})`,
                                planoIndex: planoIndex
                            });
                        }
                    }
                });
            }
        });

        if (todasLeiturasFuturas.length > 0) {
            todasLeiturasFuturas.sort((a, b) => a.data.getTime() - b.data.getTime()); // Ordena
            const proximas3Leituras = todasLeiturasFuturas.slice(0, 3); // Pega as 3

            proximasLeiturasSection.style.display = 'block';
            semProximasLeiturasP.style.display = 'none';

            proximas3Leituras.forEach(leitura => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('proxima-leitura-item');
                const dataFormatada = leitura.data.toLocaleDateString('pt-BR', { weekday: 'short', month: 'short', day: 'numeric' });
                const numeroPlano = leitura.planoIndex + 1;
                itemDiv.innerHTML = `
                    <span class="proxima-leitura-data">${dataFormatada}</span>
                    <span class="numero-plano-tag">${numeroPlano}</span>
                    <span class="proxima-leitura-titulo">${he.encode(leitura.titulo)}</span>
                    <span class="proxima-leitura-paginas">${leitura.paginasTexto}</span>`; // Encode
                listaProximasLeiturasDiv.appendChild(itemDiv);
            });
        } else {
             proximasLeiturasSection.style.display = 'block';
             semProximasLeiturasP.style.display = 'block';
        }
    }

    function renderizarPlanos() {
        if (!paginadorPlanosDiv || !listaPlanos) {
             console.error("ERRO: Elementos listaPlanos ou paginadorPlanosDiv não encontrados!");
             return;
        }
        paginadorPlanosDiv.innerHTML = '';
        listaPlanos.innerHTML = '';
        // Esconde painéis antes de reavaliar
        if (proximasLeiturasSection) proximasLeiturasSection.style.display = 'none';
        if (leiturasAtrasadasSection) leiturasAtrasadasSection.style.display = 'none';

        if (!user) {
            listaPlanos.innerHTML = '<p>Faça login ou cadastre-se para gerenciar seus planos de leitura.</p>';
            atualizarVisibilidadeBotoesAcao();
            renderizarLeiturasAtrasadas(); // Renderiza painéis (vazios)
            renderizarProximasLeituras();
            togglePaginatorVisibility();
            return;
        }
        if (planos.length === 0) {
            listaPlanos.innerHTML = '<p>Nenhum plano de leitura cadastrado ainda. Clique em "Novo" para começar!</p>';
            atualizarVisibilidadeBotoesAcao();
            togglePaginatorVisibility();
            renderizarLeiturasAtrasadas();
            renderizarProximasLeituras();
            return;
        }

        // Ordena os planos
        planos.sort((a, b) => {
            const statusA = determinarStatusPlano(a);
            const statusB = determinarStatusPlano(b);
            if (statusA === 'concluido' && statusB !== 'concluido') return 1;
            if (statusA !== 'concluido' && statusB === 'concluido') return -1;
            const dataA = (a.dataInicio instanceof Date && !isNaN(a.dataInicio)) ? a.dataInicio.getTime() : Infinity;
            const dataB = (b.dataInicio instanceof Date && !isNaN(b.dataInicio)) ? b.dataInicio.getTime() : Infinity;
            return dataA - dataB;
        });

        // Renderiza Paginador
        if (planos.length > 1) {
            planos.forEach((plano, index) => {
                const linkPaginador = document.createElement('a');
                linkPaginador.href = `#plano-${index}`;
                linkPaginador.textContent = index + 1;
                linkPaginador.title = plano.titulo || 'Plano sem título';
                paginadorPlanosDiv.appendChild(linkPaginador);
            });
        }

        // Renderiza Cards dos Planos
        planos.forEach((plano, index) => {
            const totalPaginasValido = typeof plano.totalPaginas === 'number' && plano.totalPaginas > 0 ? plano.totalPaginas : 0;
            const paginasLidasValido = typeof plano.paginasLidas === 'number' && plano.paginasLidas >= 0 ? plano.paginasLidas : 0;
            const progressoPercentual = totalPaginasValido > 0 ? (paginasLidasValido / totalPaginasValido) * 100 : 0;
            const status = determinarStatusPlano(plano);
            let statusText = '', statusClass = '';
            switch (status) { /* ... casos de status ... */
                 case 'proximo': statusText = 'Próximo'; statusClass = 'status-proximo'; break;
                 case 'em_dia': statusText = 'Em dia'; statusClass = 'status-em-dia'; break;
                 case 'atrasado': statusText = 'Atrasado'; statusClass = 'status-atrasado'; break;
                 case 'concluido': statusText = 'Concluído'; statusClass = 'status-concluido'; break;
                 case 'invalido': statusText = 'Inválido'; statusClass = 'status-invalido'; break; // Status para dados ruins
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
             const linkDriveStr = typeof plano.linkDrive === 'string' ? plano.linkDrive.trim() : '';
             let linkDriveHTML = '';
             if (linkDriveStr) {
                 linkDriveHTML = `
                 <div class="link-drive-container">
                     <a href="${he.encode(linkDriveStr, {useNamedReferences: true})}" target="_blank" class="button-link-drive" title="Abrir documento de anotações">
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
                planoDiv.classList.add(statusClass.replace('status-','card-'));
            }
            planoDiv.id = `plano-${index}`;
            planoDiv.innerHTML = `
                <div class="plano-header">
                    <h3><span class="plano-numero">${index + 1}</span>${he.encode(plano.titulo || 'Plano Sem Título')}</h3>
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
            listaPlanos.appendChild(planoDiv);
        });
        atualizarVisibilidadeBotoesAcao();
        togglePaginatorVisibility();
        renderizarLeiturasAtrasadas();
        renderizarProximasLeituras();
    }


    // --- FUNÇÕES DE MARCAR/ATUALIZAR/EDITAR/EXCLUIR/RECALCULAR ---
    function verificarAtraso(plano) {
        const hoje = getHojeNormalizado();
        if (!plano || !plano.diasPlano || plano.diasPlano.length === 0) return 0;
        return plano.diasPlano.reduce((count, dia) => {
             let dataDiaObj = null;
             if (dia.data instanceof Date && !isNaN(dia.data.getTime())) dataDiaObj = dia.data;
             else if (typeof dia.data === 'string') {
                 const converted = new Date(dia.data);
                 if (!isNaN(converted.getTime())) dataDiaObj = converted;
             }
             if (dataDiaObj) {
                const dataDiaNormalizada = new Date(dataDiaObj);
                dataDiaNormalizada.setHours(0, 0, 0, 0);
                if (dataDiaNormalizada < hoje && !dia.lido) return count + 1;
            }
            return count;
        }, 0);
    }

    function renderizarDiasLeitura(diasPlano, planoIndex) {
        if (!diasPlano || diasPlano.length === 0) {
            return '<p>Nenhum dia de leitura definido para este plano.</p>';
        }
        return diasPlano.map((dia, diaIndex) => {
            let dataFormatada = 'Data inválida';
            let dataObj = null;
             if (dia.data instanceof Date && !isNaN(dia.data.getTime())) dataObj = dia.data;
             else if (typeof dia.data === 'string') {
                 const converted = new Date(dia.data);
                 if (!isNaN(converted.getTime())) dataObj = converted;
             }
            if (dataObj) dataFormatada = dataObj.toLocaleDateString('pt-BR');

            const alternadoClass = diaIndex % 2 === 0 ? 'alternado' : '';
            const lidoClass = dia.lido ? 'lido' : '';
            const idCheckbox = `dia-${planoIndex}-${diaIndex}`;
            const paginasStr = `Páginas ${dia.paginaInicioDia || '?'} a ${dia.paginaFimDia || '?'} (${dia.paginas || '?'})`;

            return `<div class="dia-leitura ${alternadoClass} ${lidoClass}">
                        <input type="checkbox" id="${idCheckbox}" ${dia.lido ? 'checked' : ''} onchange="marcarDiaLido(${planoIndex}, ${diaIndex}, this.checked)" title="${dia.lido ? 'Desmarcar' : 'Marcar'} dia como lido">
                        <label for="${idCheckbox}">${dataFormatada} - ${paginasStr}</label>
                    </div>`;
        }).join('');
    }

    window.marcarDiaLido = function(planoIndex, diaIndex, lido) {
        if (planos[planoIndex]?.diasPlano?.[diaIndex]) {
            planos[planoIndex].diasPlano[diaIndex].lido = lido;
            atualizarPaginasLidas(planoIndex);
            salvarPlanos(planos, (salvoComSucesso) => {
                if (salvoComSucesso) {
                    console.log('Progresso salvo.');
                    renderizarPlanos(); // Re-renderiza APÓS salvar
                } else {
                    console.error('Falha ao salvar progresso.');
                    alert("Erro ao salvar o progresso.");
                    // Reverte a mudança local
                    planos[planoIndex].diasPlano[diaIndex].lido = !lido;
                    atualizarPaginasLidas(planoIndex);
                    renderizarPlanos(); // Re-renderiza com o estado revertido
                }
            });
        } else { console.error("Índice inválido para marcar como lido:", planoIndex, diaIndex); }
    };

    function atualizarPaginasLidas(planoIndex) {
        if (planos[planoIndex]?.diasPlano) {
            planos[planoIndex].paginasLidas = planos[planoIndex].diasPlano.reduce((sum, dia) => {
                const paginasDia = typeof dia.paginas === 'number' && !isNaN(dia.paginas) ? dia.paginas : 0;
                return sum + (dia.lido ? paginasDia : 0);
            }, 0);
        } else { if(planos[planoIndex]) planos[planoIndex].paginasLidas = 0; }
    }

    window.editarPlano = function(index) {
        if (index < 0 || index >= planos.length || !planos[index]) {
            console.error("Índice de plano inválido para edição:", index); return;
        }
        planoEditandoIndex = index;
        preventFormReset = true;

        // Manipulação da UI
        if(cadastroPlanoSection) cadastroPlanoSection.style.display = 'block';
        if(planosLeituraSection) planosLeituraSection.style.display = 'none';
        if(leiturasAtrasadasSection) leiturasAtrasadasSection.style.display = 'none';
        if(proximasLeiturasSection) proximasLeiturasSection.style.display = 'none';
        atualizarVisibilidadeBotoesAcao();
        if(inicioCadastroBtn) inicioCadastroBtn.style.display = 'block';

        const plano = planos[index];

        // Preenchimento do formulário (com verificação de elementos)
        const tituloInput = document.getElementById('titulo-livro');
        const linkInput = document.getElementById('link-drive');
        const pagInicioInput = document.getElementById('pagina-inicio');
        const pagFimInput = document.getElementById('pagina-fim');
        if (tituloInput) tituloInput.value = plano.titulo || '';
        if (linkInput) linkInput.value = plano.linkDrive || '';
        if (pagInicioInput) pagInicioInput.value = plano.paginaInicio || '';
        if (pagFimInput) pagFimInput.value = plano.paginaFim || '';

        const dataInicioDiasInput = document.getElementById('data-inicio-dias');
        const numDiasInput = document.getElementById('numero-dias');
        const dataInicioInput = document.getElementById('data-inicio');
        const dataFimInput = document.getElementById('data-fim');

        if (plano.definicaoPeriodo === 'dias' && definirPorDiasRadio && periodoPorDatasDiv && periodoPorDiasDiv && dataInicioDiasInput && numDiasInput) {
            definirPorDiasRadio.checked = true;
            periodoPorDatasDiv.style.display = 'none';
            periodoPorDiasDiv.style.display = 'block';
             if (plano.dataInicio instanceof Date && !isNaN(plano.dataInicio)) dataInicioDiasInput.valueAsDate = plano.dataInicio;
             else dataInicioDiasInput.value = '';
            numDiasInput.value = plano.diasPlano ? plano.diasPlano.length : '';
        } else if (definirPorDatasRadio && periodoPorDatasDiv && periodoPorDiasDiv && dataInicioInput && dataFimInput) {
            definirPorDatasRadio.checked = true;
            periodoPorDatasDiv.style.display = 'block';
            periodoPorDiasDiv.style.display = 'none';
             if (plano.dataInicio instanceof Date && !isNaN(plano.dataInicio)) dataInicioInput.valueAsDate = plano.dataInicio;
             else dataInicioInput.value = '';
             if (plano.dataFim instanceof Date && !isNaN(plano.dataFim)) dataFimInput.valueAsDate = plano.dataFim;
             else dataFimInput.value = '';
        }

        if (periodicidadeSelect) periodicidadeSelect.value = plano.periodicidade || 'diario';
        if (diasSemanaSelecao) diasSemanaSelecao.style.display = (periodicidadeSelect && periodicidadeSelect.value === 'semanal') ? 'block' : 'none';
        document.querySelectorAll('input[name="dia-semana"]').forEach(cb => cb.checked = false);
        if (plano.periodicidade === 'semanal' && Array.isArray(plano.diasSemana)) {
            document.querySelectorAll('input[name="dia-semana"]').forEach(cb => {
                cb.checked = plano.diasSemana.includes(parseInt(cb.value));
            });
        }

        if(formPlano){
             const submitButton = formPlano.querySelector('button[type="submit"]');
             if(submitButton) submitButton.textContent = 'Atualizar Plano';
        }
        updateRequiredAttributes();
        if(cadastroPlanoSection) cadastroPlanoSection.scrollIntoView({ behavior: 'smooth' });
        preventFormReset = false;
    };

    window.editarLinkDrive = function(index) {
        if (index < 0 || index >= planos.length || !planos[index]) {
            console.error("Índice de plano inválido para editar link:", index); return;
        }
        const plano = planos[index];
        const linkAtual = plano.linkDrive || '';
        const novoLink = prompt(`Editar Link de Anotações para "${he.encode(plano.titulo || 'Plano')}":\n(Deixe em branco para remover)`, linkAtual);

        if (novoLink !== null) {
            planos[index].linkDrive = novoLink.trim();
            salvarPlanos(planos, (salvoComSucesso) => {
                if (salvoComSucesso) console.log('Link atualizado.');
                else {
                    console.error('Falha ao salvar link.');
                    alert("Erro ao salvar o link.");
                    planos[index].linkDrive = linkAtual; // Reverte localmente
                }
                renderizarPlanos();
            });
        }
    };

    window.mostrarOpcoesRecalculo = function(index) {
        const avisoAtrasoDiv = document.getElementById(`aviso-atraso-${index}`);
        if (!avisoAtrasoDiv) return;
        avisoAtrasoDiv.innerHTML = `
            <p>⚠️ Plano atrasado. Como deseja recalcular?</p>
            <div class="acoes-dados recalculo-opcoes">
                <button onclick="solicitarNovaDataFim(${index})" title="Define uma nova data para terminar a leitura...">Nova Data Fim</button>
                <button onclick="solicitarPaginasPorDia(${index})" title="Define quantas páginas ler por dia a partir de agora...">Páginas/Dia</button>
                <button onclick="fecharAvisoRecalculo(${index})" title="Cancelar recálculo">Cancelar</button>
            </div>`;
    };
    window.fecharAvisoRecalculo = function(index) {
        const avisoAtrasoDiv = document.getElementById(`aviso-atraso-${index}`);
        if (!avisoAtrasoDiv) return;
        const plano = planos[index];
        if (!plano) { avisoAtrasoDiv.remove(); return; } // Remove se o plano não existe mais
        const diasAtrasados = verificarAtraso(plano);
        if(determinarStatusPlano(plano) === 'atrasado' && diasAtrasados > 0) {
            avisoAtrasoDiv.innerHTML = `
                <p>⚠️ Plano com atraso de ${diasAtrasados} dia(s)!</p>
                <div class="acoes-dados">
                    <button onclick="mostrarOpcoesRecalculo(${index})">Recalcular Plano</button>
                </div>`;
        } else {
            avisoAtrasoDiv.remove(); // Remove se não está mais atrasado
        }
    };
    window.solicitarNovaDataFim = function(index) {
        const hojeStr = new Date().toISOString().split('T')[0];
        const novaDataFimInput = prompt(`Recalcular: Nova Data de Fim (após ${hojeStr}):`, hojeStr);
        if (novaDataFimInput) {
            try {
                const novaDataFim = new Date(novaDataFimInput + 'T00:00:00');
                if (isNaN(novaDataFim.getTime())) throw new Error("Data inválida.");
                const hoje = getHojeNormalizado();
                if (novaDataFim <= hoje) throw new Error("A nova data de fim deve ser posterior a hoje.");
                recalcularPlanoNovaData(index, novaDataFim);
            } catch (e) {
                 alert(`Erro: ${e.message} Use o formato YYYY-MM-DD.`);
                 mostrarOpcoesRecalculo(index);
            }
        } else {
             mostrarOpcoesRecalculo(index);
        }
    };
     window.solicitarPaginasPorDia = function(index) {
        const paginasPorDiaInput = prompt("Recalcular: Páginas por Dia (a partir de agora):");
        if (paginasPorDiaInput) {
            const paginasPorDia = parseInt(paginasPorDiaInput);
            if (isNaN(paginasPorDia) || paginasPorDia <= 0) {
                alert("Insira um número válido de páginas por dia (> 0).");
                mostrarOpcoesRecalculo(index); return;
            }
             const plano = planos[index];
             if (!plano) return;
             const paginasRestantes = (plano.totalPaginas || 0) - (plano.paginasLidas || 0);
             if (paginasRestantes <= 0) {
                 alert("Não há páginas restantes para ler.");
                 fecharAvisoRecalculo(index); return;
             }
            recalcularPlanoPaginasPorDia(index, paginasPorDia);
        } else {
             mostrarOpcoesRecalculo(index);
        }
    };
    function calcularNovaDataFimPorPaginasDia(plano, paginasPorDia) {
        const paginasRestantes = (plano.totalPaginas || 0) - (plano.paginasLidas || 0);
         if (paginasRestantes <= 0 || paginasPorDia <= 0) return null;
        let proximoDiaLeitura = getHojeNormalizado();
        const diasSemanaPlano = (plano.periodicidade === 'semanal' && Array.isArray(plano.diasSemana)) ? plano.diasSemana : [];
        const periodicidadePlano = plano.periodicidade || 'diario';
         const isDiaValido = (data) => {
             const diaSem = data.getDay();
             return periodicidadePlano === 'diario' || (periodicidadePlano === 'semanal' && diasSemanaPlano.includes(diaSem));
         };
         while (!isDiaValido(proximoDiaLeitura)) proximoDiaLeitura.setDate(proximoDiaLeitura.getDate() + 1);
        const diasLeituraNecessarios = Math.ceil(paginasRestantes / paginasPorDia);
        let dataFimCalculada = new Date(proximoDiaLeitura);
        let diasLeituraContados = 0, safetyCounter = 0;
        const MAX_ITERATIONS = 10000;
        while(diasLeituraContados < diasLeituraNecessarios && safetyCounter < MAX_ITERATIONS) {
             if (isDiaValido(dataFimCalculada)) diasLeituraContados++;
             if (diasLeituraContados < diasLeituraNecessarios) dataFimCalculada.setDate(dataFimCalculada.getDate() + 1);
             safetyCounter++;
             if(safetyCounter >= MAX_ITERATIONS) { console.error("Loop break em calcularNovaDataFim"); return null; }
        }
        return dataFimCalculada;
    }
    window.recalcularPlanoPaginasPorDia = function(index, paginasPorDia) {
        const plano = planos[index];
        if (!plano) return;
        const novaDataFim = calcularNovaDataFimPorPaginasDia(plano, paginasPorDia);
        if (!novaDataFim) {
             alert("Não foi possível calcular a nova data de fim.");
             mostrarOpcoesRecalculo(index); return;
         }
        recalcularPlanoNovaData(index, novaDataFim);
    };
    function recalcularPlanoNovaData(index, novaDataFim) {
        const planoOriginal = planos[index];
        if (!planoOriginal) { console.error("Plano não encontrado para recálculo:", index); return; }
        const paginasLidas = planoOriginal.paginasLidas || 0;
        const paginaInicioRecalculo = (planoOriginal.paginaInicio || 1) + paginasLidas;
        const paginasRestantes = (planoOriginal.totalPaginas || 0) - paginasLidas;
        if (paginasRestantes <= 0) { alert("Não há páginas restantes."); fecharAvisoRecalculo(index); return; }

        let dataInicioRecalculo = getHojeNormalizado();
        const diasSemanaPlano = (planoOriginal.periodicidade === 'semanal' && Array.isArray(planoOriginal.diasSemana)) ? planoOriginal.diasSemana : [];
        const periodicidadePlano = planoOriginal.periodicidade || 'diario';
         const isDiaValido = (data) => {
             const diaSem = data.getDay();
             return periodicidadePlano === 'diario' || (periodicidadePlano === 'semanal' && diasSemanaPlano.includes(diaSem));
         };
         while (!isDiaValido(dataInicioRecalculo)) dataInicioRecalculo.setDate(dataInicioRecalculo.getDate() + 1);

         if (novaDataFim < dataInicioRecalculo) {
             alert(`Nova data fim (${novaDataFim.toLocaleDateString('pt-BR')}) anterior ao próximo dia válido (${dataInicioRecalculo.toLocaleDateString('pt-BR')}).`);
             mostrarOpcoesRecalculo(index); return;
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
            alert(`Nenhum dia de leitura válido encontrado entre ${dataInicioRecalculo.toLocaleDateString('pt-BR')} e ${novaDataFim.toLocaleDateString('pt-BR')}.`);
            mostrarOpcoesRecalculo(index); return;
        }

        const numNovosDias = novosDiasLeitura.length;
        const paginasPorDiaBase = Math.floor(paginasRestantes / numNovosDias);
        const paginasExtras = paginasRestantes % numNovosDias;
        let paginaAtualRecalculo = paginaInicioRecalculo;

        novosDiasLeitura.forEach((dia, idx) => {
            let paginasNesteDia = paginasPorDiaBase + (idx < paginasExtras ? 1 : 0);
            dia.paginaInicioDia = paginaAtualRecalculo;
            dia.paginaFimDia = paginaAtualRecalculo + paginasNesteDia - 1;
             if(dia.paginaFimDia > planoOriginal.paginaFim) dia.paginaFimDia = planoOriginal.paginaFim;
             dia.paginas = Math.max(0, dia.paginaFimDia - dia.paginaInicioDia + 1);
            paginaAtualRecalculo = dia.paginaFimDia + 1;
        });
         const ultimoDiaNovo = novosDiasLeitura[numNovosDias - 1];
         if (ultimoDiaNovo && ultimoDiaNovo.paginaFimDia < planoOriginal.paginaFim && paginaAtualRecalculo <= planoOriginal.paginaFim) {
             ultimoDiaNovo.paginaFimDia = planoOriginal.paginaFim;
             ultimoDiaNovo.paginas = Math.max(0, ultimoDiaNovo.paginaFimDia - ultimoDiaNovo.paginaInicioDia + 1);
         } else if (ultimoDiaNovo && ultimoDiaNovo.paginaFimDia > planoOriginal.paginaFim) {
             ultimoDiaNovo.paginaFimDia = planoOriginal.paginaFim;
             ultimoDiaNovo.paginas = Math.max(0, ultimoDiaNovo.paginaFimDia - ultimoDiaNovo.paginaInicioDia + 1);
         }

        const diasLidosOriginais = planoOriginal.diasPlano.filter(dia => dia.lido);
        planos[index].diasPlano = [...diasLidosOriginais, ...novosDiasLeitura]
                                     .sort((a, b) => {
                                        const dataA = (a.data instanceof Date && !isNaN(a.data)) ? a.data.getTime() : Infinity;
                                        const dataB = (b.data instanceof Date && !isNaN(b.data)) ? b.data.getTime() : Infinity;
                                        return dataA - dataB;
                                    });
        planos[index].dataFim = novaDataFim;
        atualizarPaginasLidas(index); // Recalcula o total lido (não deve mudar, mas por segurança)
        salvarPlanos(planos, (salvoComSucesso) => {
            if (salvoComSucesso) console.log("Plano recalculado e salvo.");
            else console.error("Erro ao salvar plano recalculado.");
            renderizarPlanos();
        });
    }
    window.excluirPlano = function(index) {
        if (index < 0 || index >= planos.length || !planos[index]) {
            console.error("Índice inválido para exclusão:", index); return;
        }
        const plano = planos[index];
        if (confirm(`Tem certeza que deseja excluir o plano "${he.encode(plano.titulo || 'Sem Título')}"?`)) {
            planos.splice(index, 1);
            salvarPlanos(planos, (salvoComSucesso) => {
                if (!salvoComSucesso) {
                    console.error('Falha ao salvar exclusão.');
                    alert("Erro ao excluir o plano no servidor.");
                    // Idealmente, reverteria a exclusão local, mas é complexo
                }
                renderizarPlanos(); // Re-renderiza a lista
            });
        }
    };


    // --- FUNÇÕES DE EXPORTAÇÃO E GERAÇÃO DE DIAS ---
    if (exportarAgendaBtn) {
        exportarAgendaBtn.addEventListener('click', () => {
            if (!user || planos.length === 0) { alert("Logue e cadastre planos para exportar."); return; }
            let promptMessage = "Digite o número do plano para exportar:\n\n";
            planos.forEach((plano, index) => { promptMessage += `${index + 1}. ${plano.titulo || 'Sem Título'}\n`; });
            const planoIndexInput = prompt(promptMessage);
            if (planoIndexInput === null) return;
            const planoIndex = parseInt(planoIndexInput) - 1;
            if (isNaN(planoIndex) || planoIndex < 0 || planoIndex >= planos.length || !planos[planoIndex]) { alert("Número inválido."); return; }
            const planoSelecionado = planos[planoIndex];
             if (!planoSelecionado.diasPlano || planoSelecionado.diasPlano.length === 0) { alert(`Plano "${he.encode(planoSelecionado.titulo || '')}" não tem dias definidos.`); return; }
            exportarParaAgenda(planoSelecionado);
        });
        console.log("Listener para exportarAgendaBtn ANEXADO.");
    } else { console.error("ERRO: exportarAgendaBtn não encontrado!"); }

    function exportarParaAgenda(plano) {
        const horarioInicio = prompt(`Exportar "${he.encode(plano.titulo || '')}": Horário de início (HH:MM):`, "09:00");
        if (!horarioInicio) return;
        const horarioFim = prompt(`Horário de fim (HH:MM):`, "09:30");
        if (!horarioFim) return;
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(horarioInicio) || !timeRegex.test(horarioFim)) { alert("Formato de horário inválido (HH:MM)."); return; }
        try {
            const eventosICS = gerarICS(plano, horarioInicio, horarioFim);
            downloadICSFile(eventosICS, plano.titulo || 'SemTitulo');
        } catch (error) {
             console.error("Erro ao gerar/baixar ICS:", error);
             alert(`Erro ao gerar agenda: ${error.message}`);
        }
    }
    function gerarICS(plano, horarioInicio, horarioFim) {
         if (!plano || !plano.diasPlano || plano.diasPlano.length === 0 ||
             !(plano.dataInicio instanceof Date) || isNaN(plano.dataInicio.getTime()) ||
             !(plano.dataFim instanceof Date) || isNaN(plano.dataFim.getTime())) {
            throw new Error("Dados do plano incompletos/inválidos para gerar ICS.");
        }
         const planoId = plano.id || crypto.randomUUID(); // Garante ID
         const uidEvento = `${planoId.replace(/[^a-z0-9]/gi, '')}@gerenciador-planos-leitura.app`;
         const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split('.')[0] + "Z";
         const formatICSDate = (date, time) => { /* ... manter código ... */
             if (!(date instanceof Date) || isNaN(date.getTime())) throw new Error("Data inválida no formatICSDate");
             const year = date.getFullYear(); const month = (date.getMonth() + 1).toString().padStart(2, '0'); const day = date.getDate().toString().padStart(2, '0');
             const [hour, minute] = time.split(':'); return `${year}${month}${day}T${hour}${minute}00`;
         };
         const formatICSDateUTCUntil = (date) => { /* ... manter código ... */
             if (!(date instanceof Date) || isNaN(date.getTime())) throw new Error("Data inválida no formatICSDateUTCUntil");
             const dateUtc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59));
             const year = dateUtc.getUTCFullYear(); const month = (dateUtc.getUTCMonth() + 1).toString().padStart(2, '0'); const day = dateUtc.getUTCDate().toString().padStart(2, '0');
             return `${year}${month}${day}T235959Z`;
         };
        let icsString = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//GerenciadorPlanosLeitura//PT\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n`;
        let primeiroDiaLeituraValido = null;
        for(const dia of plano.diasPlano) {
             let dataDiaObj = null;
             if (dia.data instanceof Date && !isNaN(dia.data.getTime())) dataDiaObj = dia.data;
             else if (typeof dia.data === 'string') { const c = new Date(dia.data); if (!isNaN(c.getTime())) dataDiaObj = c; }
             if (dataDiaObj) { primeiroDiaLeituraValido = dataDiaObj; break; }
        }
        if(!primeiroDiaLeituraValido) throw new Error("Nenhum dia de leitura válido encontrado.");
        icsString += `BEGIN:VEVENT\r\nUID:${uidEvento}\r\nDTSTAMP:${dtstamp}\r\n`;
        icsString += `DTSTART:${formatICSDate(primeiroDiaLeituraValido, horarioInicio)}\r\nDTEND:${formatICSDate(primeiroDiaLeituraValido, horarioFim)}\r\n`;
        let rrule = 'RRULE:FREQ=';
        if (plano.periodicidade === 'diario') rrule += 'DAILY';
        else if (plano.periodicidade === 'semanal' && Array.isArray(plano.diasSemana) && plano.diasSemana.length > 0) {
            rrule += 'WEEKLY';
            const diasSemanaICS = plano.diasSemana.sort().map(d => ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][d]).join(',');
            rrule += `;BYDAY=${diasSemanaICS}`;
        } else rrule += 'DAILY'; // Fallback
         rrule += `;UNTIL=${formatICSDateUTCUntil(plano.dataFim)}`;
         icsString += `${rrule}\r\n`;
        let description = `Plano: ${he.encode(plano.titulo || 'Sem Título')}.\\n`;
        description += `Pgs: ${plano.paginaInicio || '?'}-${plano.paginaFim || '?'}.\\n`;
        description += `Período: ${plano.dataInicio.toLocaleDateString('pt-BR')} a ${plano.dataFim.toLocaleDateString('pt-BR')}.\\n\\n`;
        description += `Lembrete: Verifique as páginas exatas no app.\\n`;
        description += `App: ${window.location.origin + window.location.pathname}`;
        icsString += `SUMMARY:Leitura: ${he.encode(plano.titulo || 'Sem Título')}\r\nDESCRIPTION:${description}\r\n`;
        icsString += `LOCATION:Local de Leitura\r\nSTATUS:CONFIRMED\r\nTRANSP:OPAQUE\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\n`;
        icsString += `DESCRIPTION:Leitura: ${he.encode(plano.titulo || 'Sem Título')}\r\nTRIGGER:-PT15M\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
        return icsString;
    }
    function downloadICSFile(icsContent, planoTitulo) { /* ... manter código ... */
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a');
        a.href = url; const nomeArquivo = `Plano_Leitura_${planoTitulo.replace(/[^a-z0-9]/gi, '_')}.ics`; a.download = nomeArquivo;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }
    function togglePaginatorVisibility() { /* ... manter código ... */
         const paginador = document.getElementById('paginador-planos'); if (!paginador) return;
         const lista = document.getElementById('lista-planos');
         if (!lista || !planos || planos.length <= 1) { paginador.classList.add('hidden'); return; }
         const footer = document.querySelector('footer'); if (!footer) { paginador.classList.remove('hidden'); return; }
         const listaRect = lista.getBoundingClientRect(); const footerRect = footer.getBoundingClientRect(); const windowHeight = window.innerHeight;
         if (listaRect.height > 0 && (listaRect.bottom + 50 > footerRect.top || footerRect.top > windowHeight)) { paginador.classList.remove('hidden'); }
         else { paginador.classList.add('hidden'); }
    }
    window.addEventListener('scroll', togglePaginatorVisibility);
    window.addEventListener('resize', togglePaginatorVisibility);
    function distribuirPaginasPlano(plano) { /* ... manter código ... */
         if (!plano || !plano.diasPlano || plano.diasPlano.length === 0 || typeof plano.paginaInicio !== 'number' || isNaN(plano.paginaInicio) || plano.paginaInicio < 1 || typeof plano.paginaFim !== 'number' || isNaN(plano.paginaFim) || plano.paginaFim < plano.paginaInicio) {
             console.warn("Dados insuficientes/inválidos para distribuir páginas:", plano);
             if(plano) { plano.totalPaginas = 0; plano.paginasLidas = 0; if(plano.diasPlano) plano.diasPlano.forEach(d => { d.paginaInicioDia=0; d.paginaFimDia=0; d.paginas=0; });}
             return;
         }
         const totalPaginasLivro = (plano.paginaFim - plano.paginaInicio + 1); const diasDeLeitura = plano.diasPlano; const numeroDeDias = diasDeLeitura.length;
         plano.totalPaginas = totalPaginasLivro; const paginasPorDiaBase = Math.floor(totalPaginasLivro / numeroDeDias); const paginasRestantes = totalPaginasLivro % numeroDeDias; let paginaAtual = plano.paginaInicio;
         diasDeLeitura.forEach((dia, index) => {
             let paginasNesteDia = paginasPorDiaBase + (index < paginasRestantes ? 1 : 0); dia.paginaInicioDia = paginaAtual; dia.paginaFimDia = paginaAtual + paginasNesteDia - 1;
             if (dia.paginaFimDia > plano.paginaFim) dia.paginaFimDia = plano.paginaFim;
             dia.paginas = Math.max(0, dia.paginaFimDia - dia.paginaInicioDia + 1); paginaAtual = dia.paginaFimDia + 1;
         });
         if (diasDeLeitura.length > 0) {
             const ultimoDia = diasDeLeitura[numeroDeDias - 1];
             if (ultimoDia && ultimoDia.paginaFimDia < plano.paginaFim && paginaAtual <= plano.paginaFim) { ultimoDia.paginaFimDia = plano.paginaFim; ultimoDia.paginas = Math.max(0, ultimoDia.paginaFimDia - ultimoDia.paginaInicioDia + 1); }
             else if (ultimoDia && ultimoDia.paginaFimDia > plano.paginaFim) { ultimoDia.paginaFimDia = plano.paginaFim; ultimoDia.paginas = Math.max(0, ultimoDia.paginaFimDia - ultimoDia.paginaInicioDia + 1); }
         }
         const indexGlobal = planos.findIndex(p => p.id === plano.id);
         if (indexGlobal !== -1) atualizarPaginasLidas(indexGlobal);
         else plano.paginasLidas = diasDeLeitura.reduce((sum, dia) => sum + (dia.lido && typeof dia.paginas === 'number' ? dia.paginas : 0), 0);
    }
    function gerarDiasPlanoPorDatas(dataInicio, dataFim, periodicidade, diasSemana) { /* ... manter código ... */
         const dias = []; if (!(dataInicio instanceof Date) || !(dataFim instanceof Date) || isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime()) || dataFim < dataInicio) return dias;
         let dataAtual = new Date(dataInicio); dataAtual.setHours(0, 0, 0, 0); const dataFimNormalizada = new Date(dataFim); dataFimNormalizada.setHours(0, 0, 0, 0);
         while (dataAtual <= dataFimNormalizada) {
             const diaSemanaAtual = dataAtual.getDay();
             if (periodicidade === 'diario' || (periodicidade === 'semanal' && Array.isArray(diasSemana) && diasSemana.includes(diaSemanaAtual))) {
                 dias.push({ data: new Date(dataAtual), paginaInicioDia: 0, paginaFimDia: 0, paginas: 0, lido: false });
             } dataAtual.setDate(dataAtual.getDate() + 1);
         } return dias;
    }
    function gerarDiasPlanoPorDias(dataInicio, numeroDias, periodicidade, diasSemana) { /* ... manter código ... */
         const dias = []; if (!(dataInicio instanceof Date) || isNaN(dataInicio.getTime()) || typeof numeroDias !== 'number' || numeroDias <= 0) return dias;
         let dataAtual = new Date(dataInicio); dataAtual.setHours(0, 0, 0, 0); let diasAdicionados = 0; let safetyCounter = 0; const MAX_ITERATIONS_DIAS = numeroDias * 10 + 366;
         while (diasAdicionados < numeroDias && safetyCounter < MAX_ITERATIONS_DIAS) {
             const diaSemanaAtual = dataAtual.getDay();
             if (periodicidade === 'diario' || (periodicidade === 'semanal' && Array.isArray(diasSemana) && diasSemana.includes(diaSemanaAtual))) {
                 dias.push({ data: new Date(dataAtual), paginaInicioDia: 0, paginaFimDia: 0, paginas: 0, lido: false }); diasAdicionados++;
             } dataAtual.setDate(dataAtual.getDate() + 1); safetyCounter++;
             if (safetyCounter >= MAX_ITERATIONS_DIAS) { console.error("Loop infinito provável em gerarDiasPlanoPorDias."); alert(`Erro ao gerar dias.`); break; }
         } if (diasAdicionados < numeroDias) console.warn(`Gerados ${diasAdicionados} de ${numeroDias} dias solicitados.`);
         return dias;
    }


    // --- Listeners de Eventos da Interface (FINAL) ---
    // (Listeners para botões de Auth, Navegação, Formulário já adicionados acima com verificações)

    console.log("Setup de Listeners concluído.");


    // --- Inicialização ---
    // Adiciona 'he' library para encoding HTML (previne XSS básico)
    // É necessário incluir a biblioteca no seu HTML, por exemplo:
    // <script src="https://cdn.jsdelivr.net/npm/he@1.2.0/he.min.js"></script>
    // Se não quiser adicionar a biblioteca, remova as chamadas he.encode()
    if (typeof he === 'undefined') {
       console.warn("Biblioteca 'he' (HTML Entities) não encontrada. Recomenda-se incluí-la para segurança (XSS).");
       // Cria um objeto 'he' falso para evitar erros, mas não faz encoding
       window.he = { encode: (str) => str };
    }

    initApp(); // Chama a função que configura a observação do estado de autenticação

}); // Fim do DOMContentLoaded