// script.js (Completo e Atualizado)
// Inclui Firebase Auth/Firestore, PWA registration, Renderização de Planos/Painéis,
// Funcionalidades de CRUD de planos, Recálculo, Exportação ICS, Paginador e Lógica de Autenticação.

// Importações do Firebase SDK (Módulos ES6)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// --- Início da Lógica do Aplicativo ---

// Função para registrar o Service Worker (PWA)
function registerServiceWorker() {
  if ('serviceWorker' in navigator) { // Verifica se o navegador suporta Service Workers
    navigator.serviceWorker.register('./sw.js') // Tenta registrar o sw.js
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

// Chama a função de registro do Service Worker quando a janela carregar
window.addEventListener('load', () => {
    registerServiceWorker();
    // Código de inicialização que depende do DOM estar pronto vai dentro de DOMContentLoaded
});

// Executa o código principal quando o DOM estiver totalmente carregado
document.addEventListener('DOMContentLoaded', () => {
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
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

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
        if (!plano || !plano.diasPlano || !(plano.dataInicio instanceof Date) || !(plano.dataFim instanceof Date)) {
            return 'invalido'; // Dados incompletos
        }

        const hoje = getHojeNormalizado();
        const dataInicioPlano = new Date(plano.dataInicio); dataInicioPlano.setHours(0,0,0,0);
        const dataFimPlano = new Date(plano.dataFim); dataFimPlano.setHours(0,0,0,0);

        const todosLidos = plano.diasPlano.length > 0 && plano.diasPlano.every(dia => dia.lido);
        if (todosLidos) return 'concluido';

        if (dataInicioPlano > hoje) return 'proximo';

        const temDiaPassadoNaoLido = plano.diasPlano.some(dia => {
            if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                 const dataDiaNormalizada = new Date(dia.data); dataDiaNormalizada.setHours(0, 0, 0, 0);
                 return dataDiaNormalizada < hoje && !dia.lido;
            }
            return false;
         });
         if (temDiaPassadoNaoLido) return 'atrasado';

        if (hoje >= dataInicioPlano && hoje <= dataFimPlano) return 'em_dia';

        // Se passou da data fim, não concluído, sem atrasos (provavelmente terminou em dia)
        if (hoje > dataFimPlano && !todosLidos && !temDiaPassadoNaoLido) return 'em_dia';

        console.warn("Plano sem status definido:", plano);
        return ''; // Sem status claro
    }

    // --- Lógica Principal da Aplicação ---

    // Inicializa a aplicação, começando pela autenticação
    function initApp() {
        initAuth();
    }

    // Gerencia o estado de autenticação do usuário
    function initAuth() {
        onAuthStateChanged(auth, (currentUser) => {
            user = currentUser;
            console.log("Estado de Autenticação Mudou:", user ? user.uid : 'Nenhum usuário');
            if (user) {
                // Usuário logado
                authFormDiv.style.display = 'none';
                showAuthButton.style.display = 'none';
                cancelAuthButton.style.display = 'none';
                logoutButton.style.display = 'block';
                syncFirebaseButton.style.display = 'none'; // Esconde botão de sync por enquanto
                carregarPlanosSalvos((planosCarregados) => {
                    planos = planosCarregados || [];
                    renderizarPlanos(); // Renderiza tudo após carregar os planos
                });
            } else {
                // Usuário deslogado
                authFormDiv.style.display = 'none'; // Começa escondido
                showAuthButton.style.display = 'block'; // Mostra botão de login
                cancelAuthButton.style.display = 'none';
                logoutButton.style.display = 'none';
                syncFirebaseButton.style.display = 'none';
                planos = []; // Limpa planos locais
                renderizarPlanos(); // Renderiza (mostrará mensagem de login)
            }
            atualizarVisibilidadeBotoesAcao(); // Ajusta botões do header
        });
    }

    // Atualiza a visibilidade dos botões do header com base no estado (logado, tela atual)
   function atualizarVisibilidadeBotoesAcao() {
        const estaNaTelaCadastro = cadastroPlanoSection.style.display !== 'none';

        if (estaNaTelaCadastro) {
            // Na tela de Cadastro/Edição
            novoPlanoBtn.style.display = 'none';
            inicioBtn.style.display = user ? 'block' : 'none'; // Botão 'Início' visível se logado
            exportarAgendaBtn.style.display = 'none';
            showAuthButton.style.display = 'none'; // Esconde Login/Cadastro
            logoutButton.style.display = 'none';  // Esconde Sair
            authFormDiv.style.display = 'none'; // Garante que form auth esteja escondido
            cancelAuthButton.style.display = 'none'; // Garante que botão cancelar auth esteja escondido
        } else {
            // Na tela Principal (Lista de Planos)
            novoPlanoBtn.style.display = user ? 'block' : 'none'; // 'Novo' visível se logado
            inicioBtn.style.display = 'none'; // 'Início' sempre escondido aqui
            exportarAgendaBtn.style.display = user && planos.length > 0 ? 'block' : 'none'; // 'Agenda' se logado e com planos
            logoutButton.style.display = user ? 'block' : 'none'; // 'Sair' visível se logado

            // Controle do formulário de autenticação e seus botões
            if (authFormDiv.style.display === 'none') {
                // Se o formulário está escondido
                showAuthButton.style.display = user ? 'none' : 'block'; // Mostra 'Login/Cadastro' se deslogado
                cancelAuthButton.style.display = 'none'; // Esconde 'Cancelar'
            } else {
                // Se o formulário está visível
                showAuthButton.style.display = 'none'; // Esconde 'Login/Cadastro'
                cancelAuthButton.style.display = 'block'; // Mostra 'Cancelar'
            }
        }
    }

    // --- Funções de Autenticação ---

    // Login com Email e Senha
    function loginWithEmailPassword() {
        console.log(">>> loginWithEmailPassword FUNCTION CALLED!");
        const email = emailLoginInput.value;
        const password = passwordLoginInput.value;
        console.log("Tentando fazer login com email:", email);

        if (!email || !password) {
            alert("Por favor, preencha o email e a senha.");
            return;
        }

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                console.log('Login com email/senha bem-sucedido:', userCredential.user.uid);
                // Limpar campos e fechar form será tratado pelo onAuthStateChanged
            })
            .catch((error) => {
                console.error('Erro DETALHADO ao fazer login:', error.code, error.message, error);
                alert('Erro ao fazer login: ' + error.message + ' (Verifique email/senha e tente novamente. Código: ' + error.code + ')');
            });
    }

    // Cadastro com Email e Senha
    function signupWithEmailPassword() {
        console.log(">>> signupWithEmailPassword FUNCTION CALLED!");
        const email = emailLoginInput.value;
        const password = passwordLoginInput.value;
        console.log("Tentando cadastrar com email:", email);

         if (!email || !password) {
            alert("Por favor, preencha o email e a senha para cadastrar.");
            return;
        }
         if (password.length < 6) {
            alert("A senha deve ter pelo menos 6 caracteres.");
            return;
         }

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                console.log('Cadastro com email/senha bem-sucedido:', userCredential.user.uid);
                alert('Cadastro realizado com sucesso! Agora você pode fazer login.');
                // Limpa campos e esconde form para incentivar o login
                emailLoginInput.value = '';
                passwordLoginInput.value = '';
                authFormDiv.style.display = 'none';
                showAuthButton.style.display = 'block';
                cancelAuthButton.style.display = 'none';
                atualizarVisibilidadeBotoesAcao();
            })
            .catch((error) => {
                console.error('Erro DETALHADO ao cadastrar:', error.code, error.message, error);
                 let friendlyMessage = 'Erro ao cadastrar: ' + error.message;
                 if (error.code === 'auth/email-already-in-use') {
                     friendlyMessage = 'Erro: Este email já está cadastrado. Tente fazer login.';
                 } else if (error.code === 'auth/invalid-email') {
                     friendlyMessage = 'Erro: O formato do email é inválido.';
                 } else if (error.code === 'auth/weak-password') {
                     friendlyMessage = 'Erro: A senha é muito fraca. Use pelo menos 6 caracteres.';
                 }
                alert(friendlyMessage + ' (Código: ' + error.code + ')');
            });
    }

    // Logout do usuário
    function logout() {
        console.log("Função logout() iniciada");
        signOut(auth)
            .then(() => {
                console.log('Logout bem-sucedido');
                // onAuthStateChanged cuidará da atualização da UI (limpar planos, etc.)
            })
            .catch((error) => {
                console.error('Erro ao fazer logout:', error);
                alert('Erro ao fazer logout. Tente novamente.');
            });
    }

    // --- Funções de Interação com Firestore ---

    // Carrega planos do Firestore para o usuário logado
    async function carregarPlanosSalvos(callback) {
        if (!user) {
            console.log('Usuário não logado, retornando planos vazios.');
            if (callback) callback([]);
            return;
        }
        const userId = user.uid;
        const docRef = doc(db, 'users', userId);
        console.log("Tentando carregar planos para userId:", userId);
        try {
            const docSnap = await getDoc(docRef);
            let planosDoFirestore = [];
            if (docSnap.exists()) {
                const data = docSnap.data();
                planosDoFirestore = data.planos || [];
                console.log(`Documento encontrado para ${userId}. Planos brutos:`, planosDoFirestore.length);

                // Processamento: Converter strings de data para objetos Date e garantir campos
                planosDoFirestore = planosDoFirestore.map(plano => {
                    const dataInicio = plano.dataInicio ? new Date(plano.dataInicio) : null;
                    const dataFim = plano.dataFim ? new Date(plano.dataFim) : null;
                    // Validação básica das datas
                    if (!dataInicio || isNaN(dataInicio) || !dataFim || isNaN(dataFim)) {
                         console.warn("Plano com datas inválidas encontrado e filtrado:", plano.titulo, plano.dataInicio, plano.dataFim);
                         return null; // Marcar para remoção
                    }
                    return {
                        ...plano,
                        id: plano.id || crypto.randomUUID(), // Garante um ID
                        linkDrive: plano.linkDrive || '', // Garante que linkDrive exista
                        dataInicio: dataInicio,
                        dataFim: dataFim,
                        diasPlano: plano.diasPlano ? plano.diasPlano.map(dia => {
                            const dataDia = dia.data ? new Date(dia.data) : null;
                            // Validar data do dia
                            if (!dataDia || isNaN(dataDia)) {
                                console.warn("Dia com data inválida em plano:", plano.titulo, dia);
                                return { ...dia, data: null }; // Manter o resto, mas invalidar data
                            }
                            return {
                                ...dia,
                                data: dataDia
                            };
                        }) : [],
                        // Garante que campos numéricos existam e sejam números
                        paginaInicio: Number(plano.paginaInicio) || 1,
                        paginaFim: Number(plano.paginaFim) || 1,
                        totalPaginas: Number(plano.totalPaginas) || 0,
                        paginasLidas: Number(plano.paginasLidas) || 0
                    };
                }).filter(plano => plano !== null); // Remove planos marcados como nulos (com datas inválidas)

            } else {
                console.log("Nenhum documento de usuário encontrado para", userId,". Criando um novo.");
                // Cria o documento inicial se não existir (boa prática)
                await setDoc(docRef, { planos: [] });
            }
            console.log('Planos processados e carregados do Firestore:', planosDoFirestore.length);
            if (callback) callback(planosDoFirestore);
        } catch (error) {
            console.error('Erro CRÍTICO ao carregar planos do Firestore:', error);
            alert('Erro grave ao carregar seus planos. Verifique sua conexão e tente recarregar a página. Se o problema persistir, contate o suporte.');
            if (callback) callback([]); // Retorna array vazio em caso de erro crítico
        }
    }

    // Salva o array de planos no Firestore para o usuário logado
    async function salvarPlanos(planosParaSalvar, callback) {
        if (!user) {
            console.error('Usuário não logado, não é possível salvar.');
            alert("Você precisa estar logado para salvar as alterações.");
            if (callback) callback(false);
            return;
        }
        const userId = user.uid;
        const docRef = doc(db, 'users', userId);
        console.log("Tentando salvar", planosParaSalvar.length, "planos para userId:", userId);

        // Prepara os dados para o Firestore (converte Date para ISOString, garante tipos)
        const planosParaFirestore = planosParaSalvar.map(plano => {
             // Validação básica antes de salvar
            if (!plano || !plano.id || !plano.titulo || !(plano.dataInicio instanceof Date) || isNaN(plano.dataInicio) || !(plano.dataFim instanceof Date) || isNaN(plano.dataFim)) {
                 console.error("Tentativa de salvar plano inválido:", plano);
                 // O que fazer? Poderia lançar um erro ou filtrar. Por ora, vamos logar e continuar.
                 // return null; // Ou, se quiser filtrar antes de salvar: return null;
            }
            return {
                ...plano,
                linkDrive: typeof plano.linkDrive === 'string' ? plano.linkDrive : '', // Garante string
                // Conversão para ISOString
                dataInicio: plano.dataInicio.toISOString(),
                dataFim: plano.dataFim.toISOString(),
                diasPlano: plano.diasPlano ? plano.diasPlano.map(dia => ({
                    ...dia,
                    // Só converte se for Date válido
                    data: (dia.data instanceof Date && !isNaN(dia.data)) ? dia.data.toISOString() : null
                })) : [],
                 // Garante que sejam números
                paginaInicio: Number(plano.paginaInicio) || 1,
                paginaFim: Number(plano.paginaFim) || 1,
                totalPaginas: Number(plano.totalPaginas) || 0,
                paginasLidas: Number(plano.paginasLidas) || 0
            };
        });//.filter(p => p !== null); // Se decidirmos filtrar planos inválidos

        try {
            await setDoc(docRef, { planos: planosParaFirestore }, { merge: true }); // Use merge: true se quiser apenas atualizar/adicionar planos sem sobrescrever outros campos no doc do usuário
            console.log('Planos salvos no Firestore com sucesso!');
            if (callback) callback(true);
        } catch (error) {
            console.error('Erro CRÍTICO ao salvar planos no Firestore:', error);
            alert('Erro grave ao salvar seus planos. Verifique sua conexão e tente novamente. Suas últimas alterações podem não ter sido salvas.');
            if (callback) callback(false);
        }
    }

    // --- Funções de Gerenciamento do Formulário ---

    // Atualiza quais campos de data são obrigatórios com base na seleção do radio
    function updateRequiredAttributes() {
        if (!definirPorDatasRadio || !dataInicio || !dataFim || !dataInicioDias || !numeroDias || !linkDriveInput) return; // Checagem de segurança

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

    // --- Funções de Renderização da Interface ---

    // Renderiza o painel de leituras atrasadas
    function renderizarLeiturasAtrasadas() {
        leiturasAtrasadasSection.style.display = 'none'; // Esconde por padrão
        if (!user || !planos || planos.length === 0) return; // Sai se não logado ou sem planos

        const hoje = getHojeNormalizado();
        const todasLeiturasAtrasadas = [];

        planos.forEach((plano, planoIndex) => {
            // Só processa planos que não estão concluídos
            if (plano.diasPlano && plano.diasPlano.length > 0 && determinarStatusPlano(plano) !== 'concluido') {
                plano.diasPlano.forEach((dia) => {
                    // Verifica se o dia tem data válida, é anterior a hoje e não foi lido
                    if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                        const dataDiaNormalizada = new Date(dia.data); dataDiaNormalizada.setHours(0, 0, 0, 0);
                        if (dataDiaNormalizada < hoje && !dia.lido) {
                            todasLeiturasAtrasadas.push({
                                data: dia.data,
                                titulo: plano.titulo,
                                paginasTexto: `Pgs ${dia.paginaInicioDia || '?'}-${dia.paginaFimDia || '?'} (${dia.paginas || 0})`,
                                planoIndex: planoIndex
                            });
                        }
                    }
                });
            }
        });

        // Ordena por data (mais antiga primeiro) e pega as 3 primeiras
        todasLeiturasAtrasadas.sort((a, b) => a.data - b.data);
        const leiturasAtrasadasParaMostrar = todasLeiturasAtrasadas.slice(0, 3);

        listaLeiturasAtrasadasDiv.innerHTML = ''; // Limpa o conteúdo anterior

        if (leiturasAtrasadasParaMostrar.length > 0) {
            leiturasAtrasadasSection.style.display = 'block'; // Mostra a seção
            semLeiturasAtrasadasP.style.display = 'none'; // Esconde mensagem "sem leituras"

            leiturasAtrasadasParaMostrar.forEach(leitura => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('leitura-atrasada-item');
                const dataFormatada = leitura.data.toLocaleDateString('pt-BR', { weekday: 'short', month: 'short', day: 'numeric' });
                const numeroPlano = leitura.planoIndex + 1;

                itemDiv.innerHTML = `
                    <span class="leitura-atrasada-data">${dataFormatada}</span>
                    <span class="numero-plano-tag">${numeroPlano}</span>
                    <span class="leitura-atrasada-titulo">${leitura.titulo || 'Título não disponível'}</span>
                    <span class="leitura-atrasada-paginas">${leitura.paginasTexto}</span>
                `;
                listaLeiturasAtrasadasDiv.appendChild(itemDiv);
            });
        } else {
            // Se não há atrasadas, pode optar por esconder a seção ou mostrar a mensagem
            // Vamos mostrar a mensagem dentro da seção para consistência
            leiturasAtrasadasSection.style.display = 'block';
            semLeiturasAtrasadasP.style.display = 'block';
        }
    }

    // Renderiza o painel de próximas leituras agendadas
    function renderizarProximasLeituras() {
        proximasLeiturasSection.style.display = 'none'; // Esconde por padrão
        if (!user || !planos || planos.length === 0) return; // Sai se não logado ou sem planos

        const hoje = getHojeNormalizado();
        const todasLeiturasFuturas = [];

        planos.forEach((plano, planoIndex) => {
            // Só processa planos que não estão concluídos
            if (plano.diasPlano && plano.diasPlano.length > 0 && determinarStatusPlano(plano) !== 'concluido') {
                plano.diasPlano.forEach((dia) => {
                    // Verifica se o dia tem data válida, é hoje ou futuro e não foi lido
                    if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
                        const dataDiaNormalizada = new Date(dia.data); dataDiaNormalizada.setHours(0,0,0,0);
                        if (dataDiaNormalizada >= hoje && !dia.lido) {
                            todasLeiturasFuturas.push({
                                data: dia.data,
                                titulo: plano.titulo,
                                paginasTexto: `Pgs ${dia.paginaInicioDia || '?'}-${dia.paginaFimDia || '?'} (${dia.paginas || 0})`,
                                planoIndex: planoIndex
                            });
                        }
                    }
                });
            }
        });

        // Ordena por data (mais próxima primeiro) e pega as 3 primeiras
        todasLeiturasFuturas.sort((a, b) => a.data - b.data);
        const proximas3Leituras = todasLeiturasFuturas.slice(0, 3);

        listaProximasLeiturasDiv.innerHTML = ''; // Limpa conteúdo anterior

        if (proximas3Leituras.length > 0) {
            proximasLeiturasSection.style.display = 'block'; // Mostra a seção
            semProximasLeiturasP.style.display = 'none'; // Esconde mensagem "sem leituras"

            proximas3Leituras.forEach(leitura => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('proxima-leitura-item');
                const dataFormatada = leitura.data.toLocaleDateString('pt-BR', { weekday: 'short', month: 'short', day: 'numeric' });
                const numeroPlano = leitura.planoIndex + 1;

                itemDiv.innerHTML = `
                    <span class="proxima-leitura-data">${dataFormatada}</span>
                    <span class="numero-plano-tag">${numeroPlano}</span>
                    <span class="proxima-leitura-titulo">${leitura.titulo || 'Título não disponível'}</span>
                    <span class="proxima-leitura-paginas">${leitura.paginasTexto}</span>
                `;
                listaProximasLeiturasDiv.appendChild(itemDiv);
            });
        } else {
            // Mostra a mensagem "sem próximas leituras" dentro da seção
             proximasLeiturasSection.style.display = 'block';
             semProximasLeiturasP.style.display = 'block';
        }
    }

    // Renderiza a lista principal de planos de leitura (cards)
    function renderizarPlanos() {
        console.log("Renderizando planos...");
        // Limpa conteúdo anterior e prepara interface
        paginadorPlanosDiv.innerHTML = '';
        listaPlanos.innerHTML = '';
        proximasLeiturasSection.style.display = 'none'; // Esconde painéis inicialmente
        leiturasAtrasadasSection.style.display = 'none';

        // Verifica estado de login
        if (!user) {
            listaPlanos.innerHTML = '<p>Faça login ou cadastre-se para gerenciar seus planos de leitura.</p>';
            atualizarVisibilidadeBotoesAcao();
            // Não renderiza painéis ou paginador se não estiver logado
            return;
        }

        // Verifica se há planos
        if (!planos || planos.length === 0) {
            listaPlanos.innerHTML = '<p>Nenhum plano de leitura cadastrado ainda. Clique em "Novo" para começar!</p>';
            atualizarVisibilidadeBotoesAcao();
            togglePaginatorVisibility(); // Esconde paginador se não há planos
            // Não renderiza painéis se não há planos
            return;
        }

        // Ordena os planos (opcional, pode ser por data de início, status, etc.)
        // Exemplo: ordenar por data de início mais recente primeiro
        planos.sort((a, b) => (b.dataInicio || 0) - (a.dataInicio || 0));


        // Renderiza Paginador (se houver mais de um plano)
        if (planos.length > 1) {
            planos.forEach((plano, index) => {
                const linkPaginador = document.createElement('a');
                linkPaginador.href = `#plano-${plano.id}`; // Link para o ID único do plano
                linkPaginador.textContent = index + 1; // Número sequencial
                linkPaginador.title = plano.titulo || 'Plano sem título';
                paginadorPlanosDiv.appendChild(linkPaginador);
            });
        }

        // Renderiza Cards dos Planos
        planos.forEach((plano, index) => {
            // Validação Mínima do Plano antes de renderizar
             if (!plano || !plano.id || !plano.titulo) {
                 console.warn("Ignorando renderização de plano inválido ou incompleto:", plano);
                 return; // Pula este plano
             }

            const progressoPercentual = (plano.totalPaginas && plano.totalPaginas > 0)
                ? (plano.paginasLidas / plano.totalPaginas) * 100
                : 0;
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
                        <button onclick="window.mostrarOpcoesRecalculo(${index})" title="Recalcular datas ou páginas/dia">Recalcular Plano</button>
                    </div>
                </div>` : '';

             // Link Drive / Notas
             let linkDriveHTML = '';
             if (plano.linkDrive) {
                 // Validação simples de URL (melhorar se necessário)
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
                <p>Páginas: ${plano.paginaInicio} - ${plano.paginaFim} (${plano.totalPaginas || 0} pgs)</p>
                <div class="progresso-container" title="${progressoPercentual.toFixed(0)}% concluído (${plano.paginasLidas} de ${plano.totalPaginas} pgs)">
                    <div class="barra-progresso" style="width: ${progressoPercentual}%"></div>
                    <span class="progresso-texto" style="position: absolute; left: 50%; transform: translateX(-50%); color: ${progressoPercentual > 50 ? 'white' : 'black'}; font-size: 0.7em; line-height: 10px;">${progressoPercentual.toFixed(0)}%</span>
                </div>
                <p>${plano.paginasLidas} de ${plano.totalPaginas} páginas lidas.</p>
                 <details class="dias-leitura-details" ${status === 'concluido' ? '' : 'open'} >
                    <summary>Ver/Marcar Dias de Leitura (${plano.diasPlano ? plano.diasPlano.length : 0} dias)</summary>
                    <div class="dias-leitura">${renderizarDiasLeitura(plano.diasPlano, index)}</div>
                </details>
            `;
            listaPlanos.appendChild(planoDiv);
        });

        // Atualiza visibilidade dos botões, paginador e RENDERIZA PAINÉIS
        atualizarVisibilidadeBotoesAcao();
        togglePaginatorVisibility();
        renderizarLeiturasAtrasadas();
        renderizarProximasLeituras();
        console.log("Renderização de planos concluída.");
    }

    // Verifica quantos dias de leitura estão atrasados em um plano
    function verificarAtraso(plano) {
        const hoje = getHojeNormalizado();
        if (!plano || !plano.diasPlano || plano.diasPlano.length === 0) {
            return 0;
        }
        return plano.diasPlano.reduce((count, dia) => {
             if (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime())) {
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
        // Ordena os dias por data para garantir a ordem correta
        const diasOrdenados = [...diasPlano].sort((a, b) => (a.data || 0) - (b.data || 0));

        return diasOrdenados.map((dia, diaIndexOriginal) => {
            // Encontra o índice real no array 'planos' (importante para marcarLido)
            const diaIndex = planos[planoIndex].diasPlano.findIndex(d => d === dia);

            const dataFormatada = (dia.data && dia.data instanceof Date && !isNaN(dia.data.getTime()))
                ? dia.data.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }) // Formato mais curto
                : '<span style="color:red;">Data Inválida</span>'; // Indica erro
            const alternadoClass = diaIndexOriginal % 2 === 0 ? 'alternado' : ''; // Estilo alternado visual
            const lidoClass = dia.lido ? 'lido' : ''; // Classe se já lido
            const idCheckbox = `dia-${planoIndex}-${diaIndex}`; // ID único para o checkbox e label
            const paginasTexto = `Pgs ${dia.paginaInicioDia || '?'}-${dia.paginaFimDia || '?'} (${dia.paginas || 0})`; // Texto das páginas

            // Verifica se a data é válida antes de criar o input
            const inputCheckbox = (dia.data && !isNaN(dia.data))
             ? `<input type="checkbox" id="${idCheckbox}" ${dia.lido ? 'checked' : ''} onchange="window.marcarDiaLido(${planoIndex}, ${diaIndex}, this.checked)" title="${dia.lido ? 'Desmarcar' : 'Marcar'} dia ${dataFormatada} como lido">`
             : `<span title="Não é possível marcar: data inválida" style="margin-right: 10px; color: #ccc;">☑</span>`; // Checkbox desabilitado visualmente

            return `<div class="dia-leitura ${alternadoClass} ${lidoClass}">
                        ${inputCheckbox}
                        <label for="${idCheckbox}" title="Leitura do dia ${dataFormatada}: ${paginasTexto}">${dataFormatada} - ${paginasTexto}</label>
                    </div>`;
        }).join('');
    }

    // --- Funções de Interação com Planos (CRUD, Marcar Lido, etc.) ---

    // Marca/desmarca um dia como lido e atualiza o progresso
    // Tornada global para ser acessível pelo onclick
    window.marcarDiaLido = function(planoIndex, diaIndex, lido) {
        console.log(`Marcando dia ${diaIndex} do plano ${planoIndex} como ${lido}`);
        if (planos[planoIndex] && planos[planoIndex].diasPlano && planos[planoIndex].diasPlano[diaIndex]) {
            planos[planoIndex].diasPlano[diaIndex].lido = lido;
            atualizarPaginasLidas(planoIndex); // Recalcula progresso do plano
            salvarPlanos(planos, (salvoComSucesso) => { // Salva no Firebase
                if (salvoComSucesso) {
                    console.log('Progresso salvo no Firebase.');
                    renderizarPlanos(); // Re-renderiza a interface para refletir a mudança
                } else {
                    console.error('Falha ao salvar progresso no Firebase. Revertendo alteração localmente.');
                     // Reverte a alteração local se o salvamento falhar
                    planos[planoIndex].diasPlano[diaIndex].lido = !lido;
                    atualizarPaginasLidas(planoIndex);
                    alert("Erro ao salvar o progresso. Sua marcação foi desfeita. Verifique sua conexão.");
                    renderizarPlanos(); // Renderiza novamente com o estado original
                }
            });
        } else {
            console.error("Índice de plano ou dia inválido para marcar como lido:", planoIndex, diaIndex);
             alert("Erro interno ao tentar marcar o dia. Recarregue a página.");
        }
    };

    // Recalcula o total de páginas lidas para um plano específico
    function atualizarPaginasLidas(planoIndex) {
        if (planos[planoIndex] && planos[planoIndex].diasPlano) {
            planos[planoIndex].paginasLidas = planos[planoIndex].diasPlano.reduce((sum, dia) => {
                // Soma apenas se 'lido' for true e 'paginas' for um número válido > 0
                return sum + (dia.lido && typeof dia.paginas === 'number' && dia.paginas > 0 ? dia.paginas : 0);
            }, 0);
            console.log(`Páginas lidas atualizadas para plano ${planoIndex}: ${planos[planoIndex].paginasLidas}`);
        } else {
            console.error("Plano inválido para atualizar páginas lidas:", planoIndex);
            if(planos[planoIndex]) planos[planoIndex].paginasLidas = 0; // Zera se o plano existe mas diasPlano não
        }
    }

    // Preenche o formulário de cadastro/edição com os dados de um plano existente
    // Tornada global para ser acessível pelo onclick
    window.editarPlano = function(index) {
        if (index < 0 || index >= planos.length || !planos[index]) {
            console.error("Índice de plano inválido para edição:", index);
            alert("Erro: Plano não encontrado para edição.");
            return;
        }
        planoEditandoIndex = index;
        preventFormReset = true; // Impede reset acidental ao clicar "Novo" novamente
        const plano = planos[index];

        // Navega para a tela de cadastro/edição
        cadastroPlanoSection.style.display = 'block';
        planosLeituraSection.style.display = 'none';
        leiturasAtrasadasSection.style.display = 'none'; // Esconde painéis
        proximasLeiturasSection.style.display = 'none';
        atualizarVisibilidadeBotoesAcao(); // Ajusta botões do header
        inicioCadastroBtn.style.display = 'block'; // Mostra botão "Voltar para Início"

        // Preenche os campos do formulário
        document.getElementById('titulo-livro').value = plano.titulo || '';
        document.getElementById('link-drive').value = plano.linkDrive || '';
        document.getElementById('pagina-inicio').value = plano.paginaInicio || '';
        document.getElementById('pagina-fim').value = plano.paginaFim || '';

        // Preenche a seção de período (Datas ou Dias)
        if (plano.definicaoPeriodo === 'dias') {
            definirPorDiasRadio.checked = true;
            periodoPorDatasDiv.style.display = 'none';
            periodoPorDiasDiv.style.display = 'block';
            // Preenche data de início (formato YYYY-MM-DD para input date)
             if (plano.dataInicio instanceof Date && !isNaN(plano.dataInicio)) {
                 document.getElementById('data-inicio-dias').valueAsDate = plano.dataInicio;
             } else {
                 document.getElementById('data-inicio-dias').value = ''; // Limpa se inválido
             }
             // Calcula o número de dias (contando os dias válidos no array diasPlano)
            const numDias = plano.diasPlano ? plano.diasPlano.filter(d => d.data instanceof Date && !isNaN(d.data)).length : '';
            document.getElementById('numero-dias').value = numDias;
        } else { // Assume 'datas' como padrão se não for 'dias'
            definirPorDatasRadio.checked = true;
            periodoPorDatasDiv.style.display = 'block';
            periodoPorDiasDiv.style.display = 'none';
             // Preenche datas de início e fim
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

        // Preenche periodicidade e dias da semana (se aplicável)
        periodicidadeSelect.value = plano.periodicidade || 'diario';
        diasSemanaSelecao.style.display = periodicidadeSelect.value === 'semanal' ? 'block' : 'none';
        document.querySelectorAll('input[name="dia-semana"]').forEach(cb => cb.checked = false); // Limpa checkboxes
        if (plano.periodicidade === 'semanal' && Array.isArray(plano.diasSemana)) {
            document.querySelectorAll('input[name="dia-semana"]').forEach(cb => {
                // Marca o checkbox se o valor (0-6) estiver no array diasSemana do plano
                cb.checked = plano.diasSemana.includes(parseInt(cb.value));
            });
        }

        // Atualiza texto do botão e atributos 'required'
        formPlano.querySelector('button[type="submit"]').textContent = 'Atualizar Plano';
        updateRequiredAttributes();
        cadastroPlanoSection.scrollIntoView({ behavior: 'smooth' }); // Rola para o formulário
        preventFormReset = false; // Libera o reset para a próxima ação
        console.log("Formulário preenchido para edição do plano:", plano.titulo);
    };

    // Permite editar ou adicionar o link de anotações via prompt
    // Tornada global para ser acessível pelo onclick
    window.editarLinkDrive = function(index) {
        if (index < 0 || index >= planos.length || !planos[index]) {
            console.error("Índice de plano inválido para editar link:", index); return;
        }
        const plano = planos[index];
        const linkAtual = plano.linkDrive || '';
        const novoLink = prompt(`Editar Link de Anotações para "${plano.titulo}":\n(Cole a URL completa, ex: https://...)\n(Deixe em branco para remover)`, linkAtual);

        // Só atualiza se o usuário não clicou em "Cancelar" (null)
        if (novoLink !== null) {
            planos[index].linkDrive = novoLink.trim(); // Remove espaços extras
            salvarPlanos(planos, (salvoComSucesso) => { // Salva a alteração
                if (salvoComSucesso) {
                    console.log('Link atualizado e salvo no Firebase.');
                } else {
                    console.error('Falha ao salvar atualização do link no Firebase.');
                     alert("Erro ao salvar o link. A alteração foi desfeita.");
                     // Reverte localmente se salvar falhar
                     planos[index].linkDrive = linkAtual;
                }
                renderizarPlanos(); // Re-renderiza para mostrar o link atualizado (ou o antigo se falhou)
            });
        }
    };

    // --- Funções de Recálculo de Planos Atrasados ---

    // Exibe as opções de recálculo no card do plano
    // Tornada global para ser acessível pelo onclick
    window.mostrarOpcoesRecalculo = function(index) {
        const avisoAtrasoDiv = document.getElementById(`aviso-atraso-${index}`);
        if (!avisoAtrasoDiv) return;
        console.log("Mostrando opções de recálculo para plano", index);
        avisoAtrasoDiv.innerHTML = `
            <p>⚠️ Plano atrasado. Como deseja recalcular?</p>
            <div class="acoes-dados recalculo-opcoes">
                <button onclick="window.solicitarNovaDataFim(${index})" title="Define uma nova data para terminar a leitura, recalculando as páginas por dia restante">Nova Data Fim</button>
                <button onclick="window.solicitarPaginasPorDia(${index})" title="Define quantas páginas ler por dia a partir de agora, recalculando a data de fim">Páginas/Dia</button>
                <button onclick="window.fecharAvisoRecalculo(${index})" title="Cancelar recálculo e manter o plano como está">Cancelar</button>
            </div>`;
    };

    // Fecha as opções de recálculo e volta ao aviso de atraso original
    // Tornada global para ser acessível pelo onclick
    window.fecharAvisoRecalculo = function(index) {
        const avisoAtrasoDiv = document.getElementById(`aviso-atraso-${index}`);
        if (!avisoAtrasoDiv || !planos[index]) return;
        console.log("Fechando opções de recálculo para plano", index);
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
            console.log("Aviso de atraso removido para plano", index, "pois não está mais atrasado.");
        }
    };

    // Solicita a nova data de fim via prompt
    // Tornada global para ser acessível pelo onclick
    window.solicitarNovaDataFim = function(index) {
        const hoje = getHojeNormalizado();
        const hojeStr = hoje.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        const novaDataFimInput = prompt(`Recalcular definindo Nova Data de Fim:\n\nDigite a nova data limite para concluir a leitura (formato YYYY-MM-DD).\nA data deve ser posterior a hoje (${hoje.toLocaleDateString('pt-BR')}).`);

        if (novaDataFimInput) {
            try {
                // Adiciona T00:00:00 para evitar problemas de fuso horário ao converter para Date
                const novaDataFim = new Date(novaDataFimInput + 'T00:00:00');
                // Validação da data
                if (isNaN(novaDataFim.getTime())) throw new Error("Data inválida.");
                if (novaDataFim <= hoje) throw new Error("A nova data de fim deve ser posterior à data de hoje.");

                console.log("Nova data fim solicitada:", novaDataFim.toLocaleDateString('pt-BR'));
                recalcularPlanoNovaData(index, novaDataFim); // Chama a função de recálculo
            } catch (e) {
                 console.error("Erro ao processar data de fim:", e.message);
                 alert("Erro: " + e.message + "\nUse o formato YYYY-MM-DD e certifique-se que a data é futura.");
                 mostrarOpcoesRecalculo(index); // Volta para as opções
            }
        } else {
             console.log("Recálculo por data fim cancelado pelo usuário.");
             mostrarOpcoesRecalculo(index); // Volta para as opções se cancelou o prompt
        }
    };

    // Solicita o novo número de páginas por dia via prompt
    // Tornada global para ser acessível pelo onclick
     window.solicitarPaginasPorDia = function(index) {
         if (!planos[index]) return;
         const plano = planos[index];
         const paginasRestantes = (plano.totalPaginas || 0) - (plano.paginasLidas || 0);

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
             console.log("Páginas por dia solicitadas:", paginasPorDia);
            recalcularPlanoPaginasPorDia(index, paginasPorDia); // Chama a função de recálculo
        } else {
             console.log("Recálculo por páginas/dia cancelado pelo usuário.");
             mostrarOpcoesRecalculo(index); // Volta para as opções
        }
    };

    // --- Lógica de Recálculo ---

    // Calcula a nova data de fim baseada nas páginas restantes e páginas/dia desejadas
    function calcularNovaDataFimPorPaginasDia(plano, paginasPorDia) {
         if (!plano || !plano.totalPaginas || typeof paginasPorDia !== 'number' || paginasPorDia <= 0) {
             console.error("Dados inválidos para calcularNovaDataFimPorPaginasDia");
             return null;
         }
        const paginasRestantes = Math.max(0, (plano.totalPaginas || 0) - (plano.paginasLidas || 0));
         if (paginasRestantes <= 0) {
             console.log("Não há páginas restantes, não é necessário calcular nova data fim.");
             return plano.dataFim; // Retorna a data fim atual se não há mais o que ler
         }

        let proximoDiaLeitura = getHojeNormalizado(); // Começa a contar a partir de hoje
        const diasSemanaPlano = Array.isArray(plano.diasSemana) ? plano.diasSemana : [];
        const periodicidadePlano = plano.periodicidade || 'diario';

        // Função interna para verificar se uma data é um dia de leitura válido
        const isDiaValido = (data) => {
             const diaSem = data.getDay(); // 0 = Domingo, 6 = Sábado
             return periodicidadePlano === 'diario' || (periodicidadePlano === 'semanal' && diasSemanaPlano.includes(diaSem));
         };

         // Avança até encontrar o primeiro dia de leitura válido a partir de hoje
         while (!isDiaValido(proximoDiaLeitura)) {
             proximoDiaLeitura.setDate(proximoDiaLeitura.getDate() + 1);
         }

        // Calcula quantos dias de leitura serão necessários
        const diasLeituraNecessarios = Math.ceil(paginasRestantes / paginasPorDia);
        console.log(`Páginas restantes: ${paginasRestantes}, Págs/Dia: ${paginasPorDia}, Dias necessários: ${diasLeituraNecessarios}`);

        let dataFimCalculada = new Date(proximoDiaLeitura); // Começa do primeiro dia válido
        let diasLeituraContados = 0;
        let safetyCounter = 0; // Previne loop infinito
        const MAX_ITERATIONS = 10000; // Limite seguro de iterações

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
                 console.error("Loop break em calcularNovaDataFimPorPaginasDia. Muitas iterações.");
                 alert("Erro: Não foi possível calcular a data final. O número de dias/páginas pode ser muito grande ou a periodicidade muito restrita.");
                 return null;
             }
        }
        console.log("Nova data fim calculada:", dataFimCalculada.toLocaleDateString('pt-BR'));
        return dataFimCalculada;
    }

    // Recalcula o plano definindo um número fixo de páginas por dia
    // Tornada global para ser acessível pelo onclick
    window.recalcularPlanoPaginasPorDia = function(index, paginasPorDia) {
        if (!planos[index]) return;
        const plano = planos[index];
        console.log(`Iniciando recálculo por ${paginasPorDia} páginas/dia para plano ${index}`);
        const novaDataFim = calcularNovaDataFimPorPaginasDia(plano, paginasPorDia);

        if (!novaDataFim) {
             // A função calcularNovaDataFimPorPaginasDia já deve ter mostrado um alerta
             mostrarOpcoesRecalculo(index); // Volta às opções
             return;
         }
         // Usa a data calculada para chamar a função principal de recálculo
        recalcularPlanoNovaData(index, novaDataFim);
    };

     // Recalcula o plano baseando-se em uma nova data de fim (lógica principal)
    function recalcularPlanoNovaData(index, novaDataFim) {
        if (!planos[index] || !(novaDataFim instanceof Date) || isNaN(novaDataFim)) {
            console.error("Dados inválidos para recalcularPlanoNovaData:", index, novaDataFim);
             alert("Erro interno ao tentar recalcular. Dados inválidos.");
            return;
        }
        const planoOriginal = planos[index];
        console.log(`Iniciando recálculo por nova data fim (${novaDataFim.toLocaleDateString('pt-BR')}) para plano ${index}`);

        const paginasLidas = planoOriginal.paginasLidas || 0;
        // A página inicial do recálculo é a próxima página após a última lida
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
         while (!isDiaValido(dataInicioRecalculo)) {
             dataInicioRecalculo.setDate(dataInicioRecalculo.getDate() + 1);
         }
         console.log("Recálculo iniciará em:", dataInicioRecalculo.toLocaleDateString('pt-BR'));

         // Validação: nova data fim não pode ser anterior ao início do recálculo
         if (novaDataFim < dataInicioRecalculo) {
             alert("Erro: A nova data de fim (" + novaDataFim.toLocaleDateString('pt-BR') + ") não pode ser anterior ao próximo dia de leitura válido (" + dataInicioRecalculo.toLocaleDateString('pt-BR') + ").");
             mostrarOpcoesRecalculo(index); // Volta às opções
             return;
         }

        // Gera a lista de novos dias de leitura válidos entre o início do recálculo e a nova data fim
        const novosDiasLeitura = [];
        let dataAtual = new Date(dataInicioRecalculo);
        while (dataAtual <= novaDataFim) {
            if (isDiaValido(dataAtual)) {
                // Adiciona apenas a data, as páginas serão calculadas depois
                novosDiasLeitura.push({ data: new Date(dataAtual), paginaInicioDia: 0, paginaFimDia: 0, paginas: 0, lido: false });
            }
            dataAtual.setDate(dataAtual.getDate() + 1);
        }

        if (novosDiasLeitura.length === 0) {
            alert("Erro: Não há dias de leitura válidos entre "+ dataInicioRecalculo.toLocaleDateString('pt-BR') +" e "+ novaDataFim.toLocaleDateString('pt-BR') +" com a periodicidade selecionada. Ajuste a data fim ou a periodicidade do plano.");
            mostrarOpcoesRecalculo(index); // Volta às opções
            return;
        }
         console.log("Número de novos dias de leitura calculados:", novosDiasLeitura.length);

        // Distribui as páginas restantes entre os novos dias de leitura
        const numNovosDias = novosDiasLeitura.length;
        const paginasPorDiaBase = Math.floor(paginasRestantes / numNovosDias);
        const paginasExtras = paginasRestantes % numNovosDias; // Páginas que sobram para distribuir
        let paginaAtualRecalculo = paginaInicioRecalculo;

        novosDiasLeitura.forEach((dia, idx) => {
            let paginasNesteDia = paginasPorDiaBase + (idx < paginasExtras ? 1 : 0); // Distribui as extras nos primeiros dias
            dia.paginaInicioDia = paginaAtualRecalculo;
            dia.paginaFimDia = paginaAtualRecalculo + paginasNesteDia - 1;
             // Ajuste para não ultrapassar a página final do livro
             if(dia.paginaFimDia > planoOriginal.paginaFim) {
                 dia.paginaFimDia = planoOriginal.paginaFim;
             }
             // Calcula o número de páginas efetivamente alocadas para este dia
             dia.paginas = Math.max(0, dia.paginaFimDia - dia.paginaInicioDia + 1);
             // Atualiza a página para o próximo dia começar
            paginaAtualRecalculo = dia.paginaFimDia + 1;
        });

        // Ajuste final: Garante que o último dia recalculado termine exatamente na página final do livro
        const ultimoDiaNovo = novosDiasLeitura[numNovosDias - 1];
        if (ultimoDiaNovo && ultimoDiaNovo.paginaFimDia < planoOriginal.paginaFim && paginaAtualRecalculo <= planoOriginal.paginaFim) {
            console.warn(`Ajustando pág final recalculada no último dia de ${ultimoDiaNovo.paginaFimDia} para ${planoOriginal.paginaFim}`);
            ultimoDiaNovo.paginaFimDia = planoOriginal.paginaFim;
            ultimoDiaNovo.paginas = Math.max(0, ultimoDiaNovo.paginaFimDia - ultimoDiaNovo.paginaInicioDia + 1);
        } else if (ultimoDiaNovo && ultimoDiaNovo.paginaFimDia > planoOriginal.paginaFim) {
             // Caso raro: se o cálculo passou, corrige para a página final exata
            ultimoDiaNovo.paginaFimDia = planoOriginal.paginaFim;
            ultimoDiaNovo.paginas = Math.max(0, ultimoDiaNovo.paginaFimDia - ultimoDiaNovo.paginaInicioDia + 1);
        }

        // Combina os dias que já foram lidos do plano original com os novos dias recalculados
        const diasLidosOriginais = planoOriginal.diasPlano.filter(dia => dia.lido && dia.data < dataInicioRecalculo);
        // Substitui a lista de dias do plano e atualiza a data de fim
        planos[index].diasPlano = [...diasLidosOriginais, ...novosDiasLeitura].sort((a, b) => (a.data || 0) - (b.data || 0));
        planos[index].dataFim = novaDataFim; // Atualiza a data fim do plano
        atualizarPaginasLidas(index); // Recalcula o total lido (não deve mudar, mas é boa prática)

        console.log("Plano recalculado. Novos dias:", novosDiasLeitura);

        // Salva o plano recalculado no Firebase
        salvarPlanos(planos, (salvoComSucesso) => {
            if (salvoComSucesso) {
                console.log("Plano recalculado e salvo com sucesso.");
                alert(`Plano "${planoOriginal.titulo}" recalculado com sucesso!\nNova data de término: ${novaDataFim.toLocaleDateString('pt-BR')}.`);
            } else {
                 console.error("Erro ao salvar plano recalculado.");
                 alert("Erro ao salvar o plano recalculado. As alterações podem não ter sido aplicadas. Tente novamente.");
                 // Idealmente, deveria haver um mecanismo de rollback aqui, mas por simplicidade, apenas alertamos.
            }
            renderizarPlanos(); // Re-renderiza a interface com o plano atualizado
        });
    }

    // Exclui um plano de leitura
    // Tornada global para ser acessível pelo onclick
    window.excluirPlano = function(index) {
        if (index < 0 || index >= planos.length || !planos[index]) {
            console.error("Índice inválido para exclusão:", index); return;
        }
        const plano = planos[index];
        if (confirm(`Tem certeza que deseja excluir o plano "${plano.titulo}"?\n\nEsta ação não pode ser desfeita.`)) {
            console.log("Excluindo plano:", plano.titulo);
            planos.splice(index, 1); // Remove o plano do array local
            salvarPlanos(planos, (salvoComSucesso) => { // Salva a lista atualizada no Firebase
                if (salvoComSucesso) {
                    console.log("Plano excluído com sucesso no Firebase.");
                    alert(`Plano "${plano.titulo}" excluído.`);
                } else {
                    console.error('Falha ao salvar exclusão no Firebase. Tentando re-adicionar localmente.');
                     // Tenta re-adicionar localmente se o salvamento falhou (melhor que perder dados)
                     planos.splice(index, 0, plano); // Insere de volta na mesma posição
                     alert("Erro ao excluir o plano no servidor. A exclusão foi cancelada. Verifique sua conexão.");
                }
                renderizarPlanos(); // Re-renderiza a lista de planos
            });
        } else {
            console.log("Exclusão do plano cancelada pelo usuário.");
        }
    };

    // --- Funcionalidade de Exportação para Agenda (.ics) ---

    // Listener para o botão de exportar agenda
    exportarAgendaBtn.addEventListener('click', () => {
        if (!user) { alert("Você precisa estar logado para exportar."); return; }
        if (!planos || planos.length === 0) { alert("Nenhum plano cadastrado para exportar."); return; }

        // Cria a mensagem para o prompt, listando os planos numerados
        let promptMessage = "Digite o número do plano para exportar para a agenda:\n\n";
        planos.forEach((plano, index) => { promptMessage += `${index + 1}. ${plano.titulo || 'Plano sem título'}\n`; });
        const planoIndexInput = prompt(promptMessage);

        if (planoIndexInput === null) return; // Usuário cancelou

        const planoIndex = parseInt(planoIndexInput) - 1; // Converte para índice 0-based

        // Validação da entrada do usuário
        if (isNaN(planoIndex) || planoIndex < 0 || planoIndex >= planos.length || !planos[planoIndex]) {
            alert("Número de plano inválido."); return;
        }
         // Validação se o plano selecionado tem dias definidos
         if (!planos[planoIndex].diasPlano || planos[planoIndex].diasPlano.length === 0 || planos[planoIndex].diasPlano.every(d => !d.data || isNaN(d.data))) {
             alert(`O plano "${planos[planoIndex].titulo}" não possui dias de leitura válidos definidos e não pode ser exportado.`); return;
         }

        exportarParaAgenda(planos[planoIndex]); // Chama a função de exportação
    });

    // Função principal que coordena a exportação para .ics
    function exportarParaAgenda(plano) {
        console.log("Iniciando exportação para agenda do plano:", plano.titulo);
        // Solicita horários de início e fim para os eventos
        const horarioInicio = prompt(`Exportar "${plano.titulo}" para Agenda:\n\nDefina o horário de início da leitura diária (formato HH:MM):`, "09:00");
        if (!horarioInicio) { console.log("Exportação cancelada (horário início)."); return; }

        const horarioFim = prompt(`Defina o horário de fim da leitura diária (formato HH:MM):`, "09:30");
        if (!horarioFim) { console.log("Exportação cancelada (horário fim)."); return; }

        // Validação simples do formato HH:MM
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(horarioInicio) || !timeRegex.test(horarioFim)) {
            alert("Formato de horário inválido. Use HH:MM (ex: 08:00, 14:30)."); return;
        }
         // Validação se hora fim é depois da hora início (simples)
         if (horarioFim <= horarioInicio) {
             alert("O horário de fim deve ser posterior ao horário de início."); return;
         }

        try {
            // Gera o conteúdo do arquivo .ics
            const eventosICS = gerarICS(plano, horarioInicio, horarioFim);
            // Inicia o download do arquivo
            downloadICSFile(eventosICS, plano.titulo);
            console.log("Arquivo ICS gerado e download iniciado.");
        } catch (error) {
             console.error("Erro ao gerar ou baixar arquivo ICS:", error);
             alert("Ocorreu um erro ao gerar o arquivo da agenda: " + error.message);
        }
    }

    // Gera o conteúdo do arquivo .ics com base nos dados do plano
    function gerarICS(plano, horarioInicio, horarioFim) {
         // Validação robusta dos dados do plano necessários para o ICS
         if (!plano || !plano.id || !plano.titulo ||
             !plano.diasPlano || plano.diasPlano.length === 0 ||
             !plano.dataInicio || !(plano.dataInicio instanceof Date) || isNaN(plano.dataInicio) ||
             !plano.dataFim || !(plano.dataFim instanceof Date) || isNaN(plano.dataFim)) {
            throw new Error("Dados do plano incompletos ou inválidos para gerar o arquivo da agenda. Verifique título, datas e dias de leitura.");
        }

         // UID único para o evento recorrente
         const uidEvento = `${plano.id.replace(/[^a-z0-9]/gi, '')}@gerenciador-planos-leitura.app`;
         // Timestamp de criação do arquivo
         const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split('.')[0] + "Z";

         // Formata data e hora para o padrão ICS (YYYYMMDDTHHMMSS) - Local Time
         const formatICSDateTimeLocal = (date, time) => {
            if (!(date instanceof Date) || isNaN(date)) throw new Error(`Data inválida (${date}) no formatICSDateTimeLocal`);
            const [year, month, day] = [date.getFullYear(), (date.getMonth() + 1).toString().padStart(2, '0'), date.getDate().toString().padStart(2, '0')];
            const [hour, minute] = time.split(':');
            return `${year}${month}${day}T${hour}${minute}00`;
         };

        // Formata a data final da recorrência (UNTIL) para o padrão ICS (YYYYMMDDTHHMMSSZ) - UTC
         const formatICSDateUTCUntil = (date) => {
             if (!(date instanceof Date) || isNaN(date)) throw new Error(`Data inválida (${date}) no formatICSDateUTCUntil`);
             // Cria uma data UTC no final do dia para garantir que inclua a data final
             const dateUtc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59));
             const year = dateUtc.getUTCFullYear();
             const month = (dateUtc.getUTCMonth() + 1).toString().padStart(2, '0');
             const day = dateUtc.getUTCDate().toString().padStart(2, '0');
             return `${year}${month}${day}T235959Z`;
         };

        // Encontra o primeiro dia de leitura válido no plano para definir o DTSTART
        let primeiroDiaLeituraValido = null;
        for(const dia of plano.diasPlano) {
             if (dia.data instanceof Date && !isNaN(dia.data)) {
                 primeiroDiaLeituraValido = dia.data;
                 break; // Encontrou o primeiro, pode parar
             }
        }
        // Se nenhum dia válido foi encontrado (improvável após validação anterior, mas seguro verificar)
        if(!primeiroDiaLeituraValido) throw new Error("Nenhum dia de leitura válido encontrado no plano para definir o início do evento.");

        // --- Construção da String ICS ---
         let icsString = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//GerenciadorPlanosLeitura//AppWeb//PT\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n`;

         // Adiciona o evento principal (recorrente)
        icsString += `BEGIN:VEVENT\r\n`;
        icsString += `UID:${uidEvento}\r\n`; // Identificador único do evento
        icsString += `DTSTAMP:${dtstamp}\r\n`; // Quando o evento foi criado/modificado
        // Data e hora de início do primeiro evento da série (usa a hora local)
        icsString += `DTSTART:${formatICSDateTimeLocal(primeiroDiaLeituraValido, horarioInicio)}\r\n`;
        // Data e hora de fim do primeiro evento da série (usa a hora local)
        icsString += `DTEND:${formatICSDateTimeLocal(primeiroDiaLeituraValido, horarioFim)}\r\n`;

        // Regra de Recorrência (RRULE)
        let rrule = 'RRULE:FREQ=';
        if (plano.periodicidade === 'diario') {
            rrule += 'DAILY'; // Repete diariamente
        } else if (plano.periodicidade === 'semanal' && Array.isArray(plano.diasSemana) && plano.diasSemana.length > 0) {
            rrule += 'WEEKLY'; // Repete semanalmente
            // Mapeia os índices (0-6) para os códigos ICS (SU, MO, TU, WE, TH, FR, SA)
            const diasSemanaICS = plano.diasSemana.sort().map(diaIndex => ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][diaIndex]).join(',');
            rrule += `;BYDAY=${diasSemanaICS}`; // Nos dias da semana especificados
        } else {
             console.warn("Periodicidade inválida ou semanal sem dias para RRULE. Usando DAILY como fallback.");
             rrule += 'DAILY'; // Fallback para diário se algo estiver errado
        }

        // Define até quando a recorrência vai (UNTIL), usando a data final do plano em UTC
         rrule += `;UNTIL=${formatICSDateUTCUntil(plano.dataFim)}`;
         icsString += `${rrule}\r\n`; // Adiciona a regra de recorrência completa

        // Descrição do evento (com quebras de linha \n)
        let description = `Plano de Leitura: ${plano.titulo}.\\n`;
        description += `Páginas do Plano: ${plano.paginaInicio}-${plano.paginaFim}.\\n`;
         // Formata as datas de início e fim do plano
        const dataInicioStr = plano.dataInicio.toLocaleDateString('pt-BR');
        const dataFimStr = plano.dataFim.toLocaleDateString('pt-BR');
        description += `Período Total do Plano: ${dataInicioStr} a ${dataFimStr}.\\n\\n`;
        description += `Lembrete: Verifique no aplicativo as páginas exatas designadas para o dia de hoje.\\n`;
        description += `Acesse o app: ${window.location.origin + window.location.pathname}`; // Link para o app
        icsString += `SUMMARY:Leitura: ${plano.titulo}\r\n`; // Título do evento na agenda
        icsString += `DESCRIPTION:${description}\r\n`; // Descrição detalhada
        icsString += `LOCATION:Seu local de leitura\r\n`; // Localização (opcional)
        icsString += `STATUS:CONFIRMED\r\n`; // Status do evento
        icsString += `TRANSP:OPAQUE\r\n`; // Define como "ocupado" no calendário

        // Alarme/Lembrete (opcional) - 15 minutos antes
        icsString += `BEGIN:VALARM\r\n`;
        icsString += `ACTION:DISPLAY\r\n`;
        icsString += `DESCRIPTION:Lembrete de Leitura: ${plano.titulo}\r\n`;
        icsString += `TRIGGER:-PT15M\r\n`; // 15 minutos antes (P=Period, T=Time, 15M=15 Minutes)
        icsString += `END:VALARM\r\n`;

        icsString += `END:VEVENT\r\n`; // Fim do evento
        icsString += `END:VCALENDAR\r\n`; // Fim do arquivo iCalendar

        return icsString;
    }

    // Cria um link temporário e clica nele para baixar o arquivo .ics gerado
    function downloadICSFile(icsContent, planoTitulo) {
        // Cria um Blob (Binary Large Object) com o conteúdo ICS
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        // Cria uma URL temporária para o Blob
        const url = URL.createObjectURL(blob);
        // Cria um elemento <a> invisível
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        // Define o nome do arquivo para download (limpa caracteres inválidos)
        const nomeArquivo = `Plano_Leitura_${planoTitulo.replace(/[^a-z0-9]/gi, '_')}.ics`;
        a.download = nomeArquivo;
        // Adiciona o link ao corpo do documento
        document.body.appendChild(a);
        // Simula um clique no link para iniciar o download
        a.click();
        // Remove o link do corpo do documento
        document.body.removeChild(a);
        // Libera a URL do Blob da memória
        URL.revokeObjectURL(url);
    }

    // --- Lógica do Paginador Flutuante ---

    // Mostra/esconde o paginador com base na rolagem e no número de planos
    function togglePaginatorVisibility() {
        const paginador = document.getElementById('paginador-planos');
        if (!paginador) return; // Sai se o elemento não existe
        const lista = document.getElementById('lista-planos');

        // Esconde se não estiver logado, não houver planos ou só houver 1 plano
        if (!user || !planos || planos.length <= 1 || !lista) {
            paginador.classList.add('hidden');
            return;
        }

        // Lógica para mostrar/esconder com base na rolagem (exibe se a lista está visível e longa)
        const footer = document.querySelector('footer');
        const listaRect = lista.getBoundingClientRect();
        const footerRect = footer ? footer.getBoundingClientRect() : { top: document.body.scrollHeight }; // Fallback se footer não existir
        const windowHeight = window.innerHeight;

        // Condição para mostrar:
        // 1. A lista tem algum conteúdo visível (altura > 0)
        // 2. A parte de baixo da lista + uma margem está abaixo do topo do footer OU o footer está fora da tela
        // Isso garante que o paginador apareça quando a lista é longa o suficiente para precisar rolar até ela.
        if (listaRect.height > 0 && (listaRect.bottom + 50 > footerRect.top || footerRect.top > windowHeight)) {
            paginador.classList.remove('hidden'); // Mostra
         } else {
            paginador.classList.add('hidden'); // Esconde
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
            console.warn("Dados insuficientes ou inválidos para distribuir páginas:", plano);
            // Zera as páginas nos dias existentes se a distribuição falhar
            if(plano && plano.diasPlano) {
                 plano.diasPlano.forEach(dia => { dia.paginaInicioDia = 0; dia.paginaFimDia = -1; dia.paginas = 0; });
            }
             if(plano) { plano.totalPaginas = 0; plano.paginasLidas = 0; } // Zera totais do plano
            return; // Interrompe a função
        }

        const totalPaginasLivro = plano.paginaFim - plano.paginaInicio + 1;
        const diasDeLeitura = plano.diasPlano; // Array de objetos {data, ...}
        const numeroDeDias = diasDeLeitura.length; // Número de dias efetivos de leitura

        plano.totalPaginas = totalPaginasLivro; // Define o total de páginas no objeto plano

        // Calcula a base de páginas por dia e quantas páginas extras sobram
        const paginasPorDiaBase = Math.floor(totalPaginasLivro / numeroDeDias);
        const paginasRestantes = totalPaginasLivro % numeroDeDias;

        let paginaAtual = plano.paginaInicio; // Começa da página inicial do plano

        // Itera por cada dia de leitura no plano
        diasDeLeitura.forEach((dia, index) => {
            // Calcula quantas páginas alocar para este dia (base + 1 extra se for um dos primeiros dias)
            let paginasNesteDia = paginasPorDiaBase + (index < paginasRestantes ? 1 : 0);

             // Garante que não aloque páginas negativas ou zero se algo der errado
             if (paginasNesteDia <= 0 && totalPaginasLivro > 0 && numeroDeDias > 0) {
                 console.warn(`Cálculo resultou em ${paginasNesteDia} páginas para o dia ${index+1}. Verifique os dados.`);
                 paginasNesteDia = 1; // Aloca pelo menos 1 se houver páginas totais
             }

            // Define a página inicial e final para este dia
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

        // Verificação final (opcional mas útil): Checa se a última página do último dia bate com a página final do livro
        if (diasDeLeitura.length > 0) {
            const ultimoDia = diasDeLeitura[numeroDeDias - 1];
             if (ultimoDia.paginaFimDia < plano.paginaFim && paginaAtual <= plano.paginaFim) {
                 // Este bloco geralmente não deveria ser necessário se a lógica acima estiver correta,
                 // mas serve como uma garantia para forçar o último dia a terminar na página final.
                 console.warn(`Ajuste pós-cálculo: Último dia (${ultimoDia.data.toLocaleDateString()}) terminaria em ${ultimoDia.paginaFimDia}. Corrigindo para ${plano.paginaFim}.`);
                 ultimoDia.paginaFimDia = plano.paginaFim;
                 ultimoDia.paginas = Math.max(0, ultimoDia.paginaFimDia - ultimoDia.paginaInicioDia + 1);
             }
        }

        // Recalcula as páginas lidas com base nos dias marcados como 'lido' APÓS a distribuição
        // Isso é importante se o plano está sendo criado ou editado.
        if (planos.includes(plano)) {
             atualizarPaginasLidas(planos.indexOf(plano));
        } else {
             // Se for um plano novo (ainda não no array global), calcula localmente
             plano.paginasLidas = diasDeLeitura.reduce((sum, dia) => sum + (dia.lido && typeof dia.paginas === 'number' ? dia.paginas : 0), 0);
        }
        console.log("Distribuição de páginas concluída para o plano:", plano.titulo);
    }

    // Gera um array de objetos representando os dias de leitura com base em datas de início/fim
    function gerarDiasPlanoPorDatas(dataInicio, dataFim, periodicidade, diasSemana) {
        const dias = [];
        // Validação das entradas
        if (!(dataInicio instanceof Date) || !(dataFim instanceof Date) || isNaN(dataInicio) || isNaN(dataFim) || dataFim < dataInicio) {
            console.error("Datas inválidas fornecidas para gerar dias:", dataInicio, dataFim);
            return dias; // Retorna array vazio se inválido
        }
        // Normaliza as datas para evitar problemas com horas
        let dataAtual = new Date(dataInicio); dataAtual.setHours(0, 0, 0, 0);
        const dataFimNormalizada = new Date(dataFim); dataFimNormalizada.setHours(0, 0, 0, 0);

        let safetyCounter = 0;
        const MAX_ITERATIONS = 3000; // Limite para evitar loops infinitos (aprox 8 anos diários)

        // Itera do início ao fim
        while (dataAtual <= dataFimNormalizada && safetyCounter < MAX_ITERATIONS) {
            const diaSemanaAtual = dataAtual.getDay(); // 0 = Domingo, ..., 6 = Sábado
            // Verifica se o dia atual deve ser incluído com base na periodicidade
            if (periodicidade === 'diario' || (periodicidade === 'semanal' && Array.isArray(diasSemana) && diasSemana.includes(diaSemanaAtual))) {
                // Adiciona o dia ao array (com dados iniciais)
                dias.push({ data: new Date(dataAtual), paginaInicioDia: 0, paginaFimDia: 0, paginas: 0, lido: false });
            }
            // Avança para o próximo dia
            dataAtual.setDate(dataAtual.getDate() + 1);
            safetyCounter++;
        }

         if (safetyCounter >= MAX_ITERATIONS) {
             console.error("Loop infinito provável detectado em gerarDiasPlanoPorDatas. Interrompido.");
             alert("Erro: Não foi possível gerar os dias do plano. O intervalo de datas pode ser muito grande.");
             return []; // Retorna vazio em caso de erro
         }
        console.log(`${dias.length} dias gerados por datas (${dataInicio.toLocaleDateString()} a ${dataFim.toLocaleDateString()})`);
        return dias;
    }

    // Gera um array de objetos representando os dias de leitura com base na data de início e número de dias
    function gerarDiasPlanoPorDias(dataInicio, numeroDias, periodicidade, diasSemana) {
        const dias = [];
        // Validação das entradas
         if (!(dataInicio instanceof Date) || isNaN(dataInicio) || typeof numeroDias !== 'number' || numeroDias <= 0) {
             console.error("Dados inválidos fornecidos para gerar dias por número:", dataInicio, numeroDias);
             return dias;
         }
        // Normaliza a data inicial
        let dataAtual = new Date(dataInicio); dataAtual.setHours(0, 0, 0, 0);
        let diasAdicionados = 0;
        let safetyCounter = 0;
        // Limite de segurança maior, pois depende da periodicidade
        const MAX_ITERATIONS_DIAS = numeroDias * 7 + 366; // Ex: 100 dias semanais -> 700 + 366

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
                 console.error("Loop infinito provável detectado em gerarDiasPlanoPorDias. Interrompido.");
                 alert(`Erro: Não foi possível gerar os ${numeroDias} dias solicitados. A periodicidade pode ser muito restritiva ou o número de dias muito grande.`);
                 // Retorna os dias que conseguiu gerar até o momento
                 return dias;
             }
        }

        // Aviso se não conseguiu gerar todos os dias solicitados (geralmente devido ao limite de segurança)
        if (diasAdicionados < numeroDias) {
             console.warn(`Não foi possível gerar os ${numeroDias} dias solicitados com a periodicidade. Apenas ${diasAdicionados} foram gerados (limite de iteração atingido?).`);
         }
         console.log(`${dias.length} dias gerados por número (${numeroDias} solicitados) a partir de ${dataInicio.toLocaleDateString()}`);
        return dias;
    }

    // (Função calcularDataFimReal removida pois gerarDiasPlanoPorDias já faz o necessário e retorna a lista de dias, da qual podemos pegar a data do último dia)

    // --- Listeners de Eventos da Interface ---

    // Botões de Autenticação
    if (showAuthButton) {
        showAuthButton.addEventListener('click', () => {
            console.log("Botão 'Login/Cadastro' clicado.");
            authFormDiv.style.display = 'flex'; // Mostra o formulário
            showAuthButton.style.display = 'none';
            cancelAuthButton.style.display = 'inline-block'; // Mostra botão Cancelar
            logoutButton.style.display = 'none';
            if (emailLoginInput) emailLoginInput.focus(); // Foca no campo de email
            atualizarVisibilidadeBotoesAcao();
        });
    }
    if (cancelAuthButton) {
        cancelAuthButton.addEventListener('click', () => {
             console.log("Botão 'Cancelar Auth' clicado.");
            authFormDiv.style.display = 'none'; // Esconde o formulário
            showAuthButton.style.display = 'block'; // Mostra 'Login/Cadastro' de volta
            cancelAuthButton.style.display = 'none';
            if (emailLoginInput) emailLoginInput.value = ''; // Limpa campos
            if (passwordLoginInput) passwordLoginInput.value = '';
            atualizarVisibilidadeBotoesAcao();
        });
    }
    // --- PROBLEMA AQUI ---
    // Os listeners para login e signup SÃO adicionados, mas o clique não dispara as funções.
    // Isso sugere que ou o clique não está chegando aos botões (overlay, etc.)
    // ou algo está impedindo a execução DEPOIS do listener ser adicionado.
    if (loginEmailButton) {
        loginEmailButton.addEventListener('click', () => {
            console.log(">>> Login Button CLICKED! (Listener Fired)"); // Log de disparo
            loginWithEmailPassword();
        });
        console.log("DEBUG: Event Listener ADICIONADO ao Login Button.");
    } else {
        console.error("ERRO: Botão de Login (#login-email-button) não encontrado no DOM!");
    }
    if (signupEmailButton) {
        signupEmailButton.addEventListener('click', () => {
            console.log(">>> Signup Button CLICKED! (Listener Fired)"); // Log de disparo
            signupWithEmailPassword();
        });
        console.log("DEBUG: Event Listener ADICIONADO ao Signup Button.");
    } else {
        console.error("ERRO: Botão de Cadastro (#signup-email-button) não encontrado no DOM!");
    }
    // --- FIM DO PROBLEMA ---
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }

    // Botões de Navegação Principal
    if (novoPlanoBtn) {
        novoPlanoBtn.addEventListener('click', function() {
            console.log("Botão 'Novo Plano' clicado.");
            if (!user) {
                alert("Faça login ou cadastre-se para criar um novo plano.");
                if (showAuthButton.style.display !== 'none') showAuthButton.click(); // Abre o form de login se o botão estiver visível
                return;
            }
            // Mostra seção de cadastro, esconde outras
            cadastroPlanoSection.style.display = 'block';
            planosLeituraSection.style.display = 'none';
            leiturasAtrasadasSection.style.display = 'none';
            proximasLeiturasSection.style.display = 'none';
            inicioCadastroBtn.style.display = 'block'; // Mostra botão 'Voltar' no form

            // Reseta o formulário apenas se não estiver vindo de uma edição
            if (!preventFormReset) {
                formPlano.reset(); // Limpa todos os campos
                planoEditandoIndex = -1; // Garante que não está em modo de edição
                formPlano.querySelector('button[type="submit"]').textContent = 'Salvar Plano';
                // Reseta seletores para o padrão
                 definirPorDatasRadio.checked = true;
                 periodoPorDatasDiv.style.display = 'block';
                 periodoPorDiasDiv.style.display = 'none';
                 periodicidadeSelect.value = 'diario';
                 diasSemanaSelecao.style.display = 'none';
                 document.querySelectorAll('input[name="dia-semana"]').forEach(cb => cb.checked = false);
            }
            updateRequiredAttributes(); // Ajusta campos obrigatórios
            atualizarVisibilidadeBotoesAcao(); // Ajusta botões do header
            if (document.getElementById('titulo-livro')) document.getElementById('titulo-livro').focus(); // Foca no título
        });
    }
    // Botão 'Início' (visível apenas na tela de cadastro/edição)
    if (inicioBtn) {
        inicioBtn.addEventListener('click', function() {
            console.log("Botão 'Início' (navegação) clicado.");
            // Mostra lista de planos, esconde cadastro
            planosLeituraSection.style.display = 'block';
            cadastroPlanoSection.style.display = 'none';
            // inicioCadastroBtn.style.display = 'none'; // O botão de voltar no form já é escondido com a seção
            planoEditandoIndex = -1; // Sai do modo de edição
            formPlano.querySelector('button[type="submit"]').textContent = 'Salvar Plano'; // Reseta texto botão submit
            atualizarVisibilidadeBotoesAcao(); // Ajusta header
            renderizarPlanos(); // Re-renderiza a lista principal
        });
    }
    // Botão 'Voltar para Início' (dentro da seção de cadastro)
     if (inicioCadastroBtn) {
         inicioCadastroBtn.addEventListener('click', function() {
              console.log("Botão 'Voltar para Início' (do form) clicado.");
             // Simula o clique no botão 'Início' do header para centralizar a lógica
             if (inicioBtn) inicioBtn.click();
         });
     }

    // Controles do Formulário (Radios de Período e Select de Periodicidade)
    if (definirPorDatasRadio) {
        definirPorDatasRadio.addEventListener('change', function() {
            if (this.checked) {
                periodoPorDatasDiv.style.display = 'block';
                periodoPorDiasDiv.style.display = 'none';
                updateRequiredAttributes();
            }
        });
    }
    if (definirPorDiasRadio) {
        definirPorDiasRadio.addEventListener('change', function() {
            if (this.checked) {
                periodoPorDatasDiv.style.display = 'none';
                periodoPorDiasDiv.style.display = 'block';
                updateRequiredAttributes();
            }
        });
    }
    if (periodicidadeSelect) {
        periodicidadeSelect.addEventListener('change', function() {
            // Mostra/esconde a seleção de dias da semana
            diasSemanaSelecao.style.display = this.value === 'semanal' ? 'block' : 'none';
            // Desmarca dias se voltar para 'diario' (opcional)
            if (this.value === 'diario') {
                document.querySelectorAll('input[name="dia-semana"]').forEach(cb => cb.checked = false);
            }
        });
    }

    // Submissão do formulário (Salvar/Atualizar Plano)
    if (formPlano) {
        formPlano.addEventListener('submit', function(event) {
            event.preventDefault(); // Previne recarregamento da página
            console.log("Formulário de plano submetido.");

            if (!user) {
                 alert("Erro: Você precisa estar logado para salvar um plano.");
                 if (showAuthButton.style.display !== 'none') showAuthButton.click();
                 return;
             }

            // --- Coleta e Validação dos Dados do Formulário ---
            const titulo = document.getElementById('titulo-livro').value.trim();
            const linkDrive = document.getElementById('link-drive').value.trim();
            const paginaInicioInput = document.getElementById('pagina-inicio').value;
            const paginaFimInput = document.getElementById('pagina-fim').value;
            const definicaoPeriodo = document.querySelector('input[name="definicao-periodo"]:checked')?.value;
            const periodicidade = periodicidadeSelect.value;

            // Validações básicas
            if (!titulo) { alert('O título do livro é obrigatório.'); return; }
            const paginaInicio = parseInt(paginaInicioInput);
            const paginaFim = parseInt(paginaFimInput);
            if (isNaN(paginaInicio) || paginaInicio < 1) { alert('Página de início inválida. Deve ser um número maior ou igual a 1.'); return; }
            if (isNaN(paginaFim) || paginaFim < paginaInicio) { alert('Página de fim inválida. Deve ser um número maior ou igual à página de início.'); return; }
            if (!definicaoPeriodo) { alert('Selecione como definir o período (Datas ou Dias).'); return; }

            let dataInicio, dataFim;
            let diasPlano = [];
            let diasSemana = []; // Array para armazenar os dias selecionados (0-6)

             // Coleta dias da semana se a periodicidade for semanal
             if (periodicidade === 'semanal') {
                 document.querySelectorAll('input[name="dia-semana"]:checked').forEach(cb => {
                     diasSemana.push(parseInt(cb.value)); // Adiciona o valor numérico do dia
                 });
                 if (diasSemana.length === 0) {
                     alert('Para periodicidade semanal, você deve selecionar pelo menos um dia da semana.'); return;
                 }
                 diasSemana.sort((a,b) => a - b); // Ordena os dias (0, 1, 2...)
             }

            // --- Geração dos Dias de Leitura com base na definição do período ---
            try {
                if (definicaoPeriodo === 'datas') {
                    const dataInicioInputVal = document.getElementById('data-inicio').value;
                    const dataFimInputVal = document.getElementById('data-fim').value;
                    if (!dataInicioInputVal || !dataFimInputVal) { throw new Error('Datas de início e fim são obrigatórias ao definir por datas.'); }
                    // Adiciona T00:00:00 para garantir que a data seja interpretada no fuso local sem deslocamento
                    dataInicio = new Date(dataInicioInputVal + 'T00:00:00');
                    dataFim = new Date(dataFimInputVal + 'T00:00:00');
                    if (isNaN(dataInicio) || isNaN(dataFim)) { throw new Error('Formato de data inválido. Use o seletor de datas.'); }
                    if (dataFim < dataInicio) { throw new Error('A data de fim não pode ser anterior à data de início.'); }
                    diasPlano = gerarDiasPlanoPorDatas(dataInicio, dataFim, periodicidade, diasSemana);
                } else { // definicaoPeriodo === 'dias'
                    const dataInicioDiasInputVal = document.getElementById('data-inicio-dias').value;
                    const numeroDiasInputVal = document.getElementById('numero-dias').value;
                    if (!dataInicioDiasInputVal) { throw new Error('Data de início é obrigatória ao definir por número de dias.'); }
                    const numeroDiasInput = parseInt(numeroDiasInputVal);
                    if (isNaN(numeroDiasInput) || numeroDiasInput < 1) { throw new Error('Número de dias inválido. Deve ser um número maior que 0.'); }
                    dataInicio = new Date(dataInicioDiasInputVal + 'T00:00:00');
                    if (isNaN(dataInicio)) { throw new Error('Formato da data de início inválido.'); }

                    diasPlano = gerarDiasPlanoPorDias(dataInicio, numeroDiasInput, periodicidade, diasSemana);

                    // Verifica se conseguiu gerar algum dia e se gerou o número esperado
                    if (diasPlano.length === 0) {
                         throw new Error("Não foi possível gerar nenhum dia de leitura com as datas e periodicidade selecionadas. Verifique os dados.");
                     } else if (diasPlano.length < numeroDiasInput) {
                          alert(`Atenção: Com a periodicidade selecionada, foi possível gerar apenas ${diasPlano.length} dias de leitura, em vez dos ${numeroDiasInput} solicitados. O plano será criado/atualizado com ${diasPlano.length} dias.`);
                     }

                     // A data de fim é a data do último dia gerado
                     dataFim = diasPlano.length > 0 ? diasPlano[diasPlano.length - 1].data : null;
                     if (!dataFim || !(dataFim instanceof Date) || isNaN(dataFim)) {
                         throw new Error("Erro interno ao calcular a data final do plano a partir dos dias gerados. Tente novamente.");
                     }
                }
            } catch (error) {
                 console.error("Erro ao gerar dias do plano:", error);
                 alert("Erro ao processar período: " + error.message);
                 return; // Interrompe a submissão
            }


            // Última verificação se dias foram gerados
            if (diasPlano.length === 0) {
                alert("Falha crítica ao gerar os dias de leitura para o plano. Verifique as datas, número de dias e a periodicidade."); return;
            }

            // --- Criação ou Atualização do Objeto Plano ---
            const planoData = {
                // Usa o ID existente se estiver editando, ou gera um novo UUID se for novo
                id: planoEditandoIndex !== -1 ? planos[planoEditandoIndex].id : crypto.randomUUID(),
                titulo: titulo,
                linkDrive: linkDrive,
                paginaInicio: paginaInicio,
                paginaFim: paginaFim,
                totalPaginas: (paginaFim - paginaInicio + 1),
                definicaoPeriodo: definicaoPeriodo,
                dataInicio: dataInicio,
                dataFim: dataFim, // Data fim real (calculada ou fornecida)
                periodicidade: periodicidade,
                diasSemana: diasSemana, // Salva os dias selecionados (mesmo se diário, fica vazio)
                diasPlano: diasPlano, // O array de dias gerados
                paginasLidas: 0 // Inicializa com 0, será atualizado pela distribuição/preservação
            };

            // Preserva o status 'lido' dos dias ao editar
            if (planoEditandoIndex !== -1) {
                 console.log("Modo de edição: Preservando status 'lido' dos dias anteriores.");
                 const diasLidosAntigosMap = new Map();
                 // Mapeia os dias lidos do plano original pela data (string YYYY-MM-DD)
                 planos[planoEditandoIndex].diasPlano.forEach(diaAntigo => {
                     if (diaAntigo.lido && diaAntigo.data instanceof Date && !isNaN(diaAntigo.data)) {
                         diasLidosAntigosMap.set(diaAntigo.data.toISOString().split('T')[0], true);
                     }
                 });
                 // Verifica os novos dias gerados e marca como lido se a data coincidir
                 planoData.diasPlano.forEach(diaNovo => {
                     if (diaNovo.data instanceof Date && !isNaN(diaNovo.data)) {
                         const dataStr = diaNovo.data.toISOString().split('T')[0];
                         if (diasLidosAntigosMap.has(dataStr)) {
                             diaNovo.lido = true;
                             console.log(`Dia ${dataStr} preservado como lido.`);
                         }
                     }
                 });
            }

            // Distribui as páginas entre os dias gerados (ou atualizados)
            distribuirPaginasPlano(planoData); // Isso também atualiza planoData.paginasLidas

            // --- Salva o Plano (Adiciona ou Substitui no Array Local) ---
            if (planoEditandoIndex !== -1) {
                console.log("Atualizando plano existente no índice:", planoEditandoIndex);
                planos[planoEditandoIndex] = planoData; // Substitui o plano antigo pelo novo
            } else {
                console.log("Adicionando novo plano.");
                planos.unshift(planoData); // Adiciona o novo plano no início do array
            }

            // --- Salva no Firebase e Atualiza a Interface ---
            salvarPlanos(planos, (salvoComSucesso) => {
                if (salvoComSucesso) {
                    console.log(`Plano "${planoData.titulo}" ${planoEditandoIndex !== -1 ? 'atualizado' : 'salvo'} com sucesso.`);
                    planoEditandoIndex = -1; // Reseta o índice de edição
                    formPlano.querySelector('button[type="submit"]').textContent = 'Salvar Plano'; // Reseta texto do botão
                    // Volta para a tela inicial (simula clique no botão 'Início')
                    if(inicioBtn) inicioBtn.click();
                    alert(`Plano "${planoData.titulo}" ${planoEditandoIndex !== -1 ? 'atualizado' : 'salvo'} com sucesso!`);
                } else {
                    // Se falhou ao salvar, idealmente deveria reverter a adição/edição local.
                    // Por simplicidade, apenas alertamos. O usuário pode tentar salvar novamente.
                    alert("Houve um erro ao salvar o plano no servidor. Verifique sua conexão e tente novamente. As alterações podem não ter sido salvas.");
                    // Poderia tentar reverter: se era edição, voltar ao plano original; se era novo, remover do array 'planos'.
                }
            });
        });
    }

    // --- Inicialização da Aplicação ---
    console.log("DOM carregado. Inicializando aplicação...");
    initApp(); // Começa o fluxo da aplicação

}); // --- Fim do DOMContentLoaded ---
