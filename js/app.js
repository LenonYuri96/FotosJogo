(() => {
  "use strict";

  /* ==========================================================================
     1. INJEÇÃO DE ESTILOS VISUAIS NEUTROS (SEM ENTREGAR A RESPOSTA)
     ========================================================================== */
  const estiloDinamico = document.createElement("style");
  estiloDinamico.textContent = `
    @keyframes animPulsoNeutro {
      0% { transform: scale(1); }
      50% { transform: scale(1.02); }
      100% { transform: scale(1); }
    }
    @keyframes animFotoEntrada {
      0% { opacity: 0; transform: scale(0.94); }
      100% { opacity: 1; transform: scale(1); }
    }
    /* Estilo neutro de confirmação: sem verde ou vermelho */
    .btn-opcao-travada {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%) !important;
      border-color: #0284c7 !important;
      color: #ffffff !important;
      box-shadow: 0 0 14px rgba(2, 132, 199, 0.45) !important;
      animation: animPulsoNeutro 0.35s ease-in-out !important;
    }
    .btn-opcao-travada .opt-letter {
      background: #ffffff !important;
      color: #0369a1 !important;
    }
    .foto-transicao {
      animation: animFotoEntrada 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
  `;
  document.head.appendChild(estiloDinamico);

  /* ==========================================================================
     2. ESTADO PRIVADO DO JOGO
     ========================================================================== */
  let bancoNomes = [];
  let listaDesafios = [];
  let configuracoes = {
    titulo: "Quem é na Foto? 🕵️‍♂️",
    subtitulo: "Descubra quem são as pessoas quando eram crianças!",
    mensagens: {
      perfeito: "Lendário! Você acertou tudo de primeira! 🏆🔥",
      bom: "Mandou bem! Faltou pouco para gabaritar! 👀✨",
      baixo: "Passou longe! Precisa treinar essa memória fisionômica! 😅👓",
    },
    compartilhamento: {
      titulo: "Jogo: Quem é na Foto?",
      hashtags: "Quiz,QuemENaFoto,Desafio",
    },
  };

  const PRIMEIROS_NOMES_FEMININOS = new Set([
    "adriana",
    "aline",
    "amanda",
    "ana",
    "barbara",
    "bárbara",
    "bel",
    "bianca",
    "bibliana",
    "carla",
    "caroline",
    "cassia",
    "cássia",
    "cristina",
    "flavia",
    "flávia",
    "joice",
    "juliana",
    "katia",
    "kátia",
    "laenne",
    "maristela",
    "nubiane",
    "priscila",
    "zirlei",
  ]);

  function ehFeminino(nomeCompleto) {
    if (!nomeCompleto) return false;
    const primeiroNome = String(nomeCompleto)
      .trim()
      .split(" ")[0]
      .toLowerCase();
    return PRIMEIROS_NOMES_FEMININOS.has(primeiroNome);
  }

  const mapaHashParaNome = new Map();
  const mapaNomeParaHash = new Map();

  let rodadaAtual = [];
  let indiceAtual = 0;
  let pontuacao = 0;
  let opcaoSelecionadaAtual = null;
  let travadoParaTransicao = false;
  const TOTAL_OPCOES = 4;

  /* ==========================================================================
     3. ELEMENTOS DO DOM
     ========================================================================== */
  const telaInicio = document.getElementById("tela-inicio");
  const telaJogo = document.getElementById("tela-jogo");
  const telaFim = document.getElementById("tela-fim");

  const txtTitulo = document.getElementById("txt-titulo");
  const txtDescricao = document.getElementById("txt-descricao");
  const btnIniciar = document.getElementById("btn-iniciar");
  const btnProxima = document.getElementById("btn-proxima");
  const btnReiniciar = document.getElementById("btn-reiniciar");

  const fotoExibida = document.getElementById("foto-exibida");
  const containerOpcoes = document.getElementById("container-opcoes");
  const indicadorPergunta = document.getElementById("indicador-pergunta");
  const indicadorPontos = document.getElementById("indicador-pontos");
  const barraProgresso = document.getElementById("barra-progresso");
  const badgeRevelacao = document.getElementById("badge-revelacao");

  const canvasCard = document.getElementById("canvas-card");
  const imgResultadoGerada = document.getElementById("img-resultado-gerada");
  const btnShareImagem = document.getElementById("btn-share-imagem");
  const btnDownloadImagem = document.getElementById("btn-download-imagem");

  const placarFinal = document.getElementById("placar-final");
  const porcentagemAcerto = document.getElementById("porcentagem-acerto");
  const mensagemStatus = document.getElementById("mensagem-status");

  /* ==========================================================================
     4. ÁUDIO SINTETIZADO (Web Audio API)
     ========================================================================== */
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;

  function obterAudioContext() {
    if (!audioCtx && AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Toque suave ao clicar na alternativa
  function tocarSomClique() {
    const ctx = obterAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const agora = ctx.currentTime;
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, agora);
      osc.frequency.exponentialRampToValueAtTime(320, agora + 0.07);
      gain.gain.setValueAtTime(0.1, agora);
      gain.gain.exponentialRampToValueAtTime(0.01, agora + 0.07);
      osc.start(agora);
      osc.stop(agora + 0.07);
    } catch (e) {}
  }

  // Som neutro de confirmação (sem dar pistas de acerto ou erro)
  function tocarSomConfirmacaoNeutra() {
    const ctx = obterAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const agora = ctx.currentTime;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(520, agora);
      osc.frequency.exponentialRampToValueAtTime(680, agora + 0.12);
      gain.gain.setValueAtTime(0.12, agora);
      gain.gain.exponentialRampToValueAtTime(0.01, agora + 0.12);
      osc.start(agora);
      osc.stop(agora + 0.12);
    } catch (e) {}
  }

  // Fanfarra tocada exclusivamente na TELA FINAL
  function tocarSomFanfarra() {
    const ctx = obterAudioContext();
    if (!ctx) return;
    try {
      const acordes = [
        { notas: [523.25, 659.25], t: 0.0, d: 0.2 },
        { notas: [587.33, 698.46], t: 0.22, d: 0.2 },
        { notas: [659.25, 783.99], t: 0.44, d: 0.2 },
        { notas: [783.99, 1046.5], t: 0.68, d: 0.6 },
      ];
      acordes.forEach((a) => {
        a.notas.forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);

          const start = ctx.currentTime + a.t;
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.2, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + a.d);
          osc.start(start);
          osc.stop(start + a.d);
        });
      });
    } catch (e) {}
  }

  function tocarSomDerrota() {
    const ctx = obterAudioContext();
    if (!ctx) return;
    try {
      const tons = [293.66, 277.18, 261.63, 246.94];
      tons.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const tempo = ctx.currentTime + idx * 0.22;
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, tempo);
        gain.gain.setValueAtTime(0.12, tempo);
        gain.gain.exponentialRampToValueAtTime(0.001, tempo + 0.3);
        osc.start(tempo);
        osc.stop(tempo + 0.3);
      });
    } catch (e) {}
  }

  /* ==========================================================================
     5. EFEITO DE CONFETES (APENAS NA VITÓRIA FINAL)
     ========================================================================== */
  function dispararConfetes(quantidade = 80) {
    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "999999";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cores = [
      "#f59e0b",
      "#10b981",
      "#0284c7",
      "#ec4899",
      "#8b5cf6",
      "#f97316",
    ];
    const particulas = Array.from({ length: quantidade }, () => ({
      x: canvas.width / 2,
      y: canvas.height * 0.45,
      vx: (Math.random() - 0.5) * 18,
      vy: (Math.random() - 0.8) * 22,
      cor: cores[Math.floor(Math.random() * cores.length)],
      tamanho: Math.random() * 8 + 4,
      rotacao: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 14,
    }));

    let frames = 0;
    function animar() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particulas.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.44;
        p.rotacao += p.vRot;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotacao * Math.PI) / 180);
        ctx.fillStyle = p.cor;
        ctx.fillRect(-p.tamanho / 2, -p.tamanho / 2, p.tamanho, p.tamanho);
        ctx.restore();
      });

      frames++;
      if (frames < 75) {
        requestAnimationFrame(animar);
      } else {
        canvas.remove();
      }
    }
    requestAnimationFrame(animar);
  }

  /* ==========================================================================
     6. PRÉ-CARREGAMENTO E CRIPTOGRAFIA
     ========================================================================== */
  function preCarregarImagens(desafios) {
    if (!Array.isArray(desafios)) return;
    desafios.forEach((item) => {
      if (item && item.fotoCrianca) {
        const img = new Image();
        img.src = encodeURI(item.fotoCrianca);
      }
    });
  }

  async function calcularSHA256(texto) {
    if (!texto) return "";
    const encoder = new TextEncoder();
    const data = encoder.encode(texto.trim().toLowerCase());
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function embaralhar(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* ==========================================================================
     7. INICIALIZAÇÃO
     ========================================================================== */
  async function inicializar() {
    try {
      const [resNomes, resDesafios, resConfig] = await Promise.all([
        fetch("data/nomes.json"),
        fetch("data/desafios.json"),
        fetch("data/config.json"),
      ]);

      bancoNomes = await resNomes.json();
      listaDesafios = await resDesafios.json();
      const configJson = await resConfig.json();
      configuracoes = { ...configuracoes, ...configJson };

      const tituloFinal =
        configJson.metadados?.titulo ||
        configJson.titulo ||
        configuracoes.titulo;
      const subtituloFinal =
        configJson.metadados?.subtitulo ||
        configJson.subtitulo ||
        configuracoes.subtitulo;

      if (txtTitulo) txtTitulo.textContent = tituloFinal;
      if (txtDescricao) txtDescricao.textContent = subtituloFinal;

      if (fotoExibida) {
        fotoExibida.setAttribute("draggable", "false");
        fotoExibida.addEventListener("contextmenu", (e) => e.preventDefault());
      }

      preCarregarImagens(listaDesafios);

      await Promise.all(
        bancoNomes.map(async (nome) => {
          const hash = await calcularSHA256(nome);
          mapaHashParaNome.set(hash, nome);
          mapaNomeParaHash.set(nome, hash);
        }),
      );

      await Promise.all(
        listaDesafios.map(async (desafio) => {
          const entrada = String(desafio.hashResposta).trim();
          if (mapaHashParaNome.has(entrada)) return;

          const nomeCorrespondente = bancoNomes.find(
            (n) => n.trim().toLowerCase() === entrada.toLowerCase(),
          );

          if (nomeCorrespondente) {
            desafio.hashResposta = mapaNomeParaHash.get(nomeCorrespondente);
          } else {
            const hashDireto = await calcularSHA256(entrada);
            desafio.hashResposta = hashDireto;
          }
        }),
      );
    } catch (err) {
      console.error("Erro na inicialização dos dados:", err);
    }
  }

  /* ==========================================================================
     8. CICLO DO JOGO
     ========================================================================== */
  function iniciarJogo() {
    pontuacao = 0;
    indiceAtual = 0;
    opcaoSelecionadaAtual = null;
    travadoParaTransicao = false;
    rodadaAtual = embaralhar(listaDesafios);

    telaInicio.classList.add("d-none");
    telaFim.classList.add("d-none");
    telaJogo.classList.remove("d-none");

    carregarPagina();
  }

  function criarBotaoOpcao(nome, letra) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-option anim-slide-up";
    btn.dataset.nome = nome;
    btn.innerHTML = `<span class="opt-letter">${letra}</span><span class="opt-name">${nome}</span>`;
    btn.onclick = () => {
      if (travadoParaTransicao) return;
      selecionarOpcao(nome, btn);
    };
    containerOpcoes.appendChild(btn);
  }

  /* ==========================================================================
     9. SELEÇÃO DE OPÇÃO (PERMITE ALTERNAR LIVREMENTE)
     ========================================================================== */
  function selecionarOpcao(nome, botaoClicado) {
    opcaoSelecionadaAtual = nome;

    const todosBotoes = containerOpcoes.querySelectorAll("button");
    todosBotoes.forEach((b) => b.classList.remove("btn-selected"));
    botaoClicado.classList.add("btn-selected");

    tocarSomClique();

    const ehUltima = indiceAtual === rodadaAtual.length - 1;
    if (ehUltima) {
      btnProxima.innerHTML = `Finalizar Desafio <i class="bi bi-trophy-fill ms-2"></i>`;
    } else {
      btnProxima.innerHTML = `Confirmar e Avançar <i class="bi bi-arrow-right-circle-fill ms-2"></i>`;
    }

    btnProxima.classList.remove("d-none");
  }

  /* ==========================================================================
     10. CARREGAMENTO DA PERGUNTA (SEM PONTUAÇÃO PARCIAL)
     ========================================================================== */
  function carregarPagina() {
    opcaoSelecionadaAtual = null;
    travadoParaTransicao = false;
    btnProxima.classList.add("d-none");
    if (badgeRevelacao) {
      badgeRevelacao.classList.add("d-none");
    }
    containerOpcoes.innerHTML = "";

    const desafio = rodadaAtual[indiceAtual];
    fotoExibida.src = encodeURI(desafio.fotoCrianca);

    fotoExibida.classList.remove("foto-transicao");
    void fotoExibida.offsetWidth;
    fotoExibida.classList.add("foto-transicao");

    indicadorPergunta.innerHTML = `<i class="bi bi-card-image me-1"></i> Foto ${indiceAtual + 1} de ${rodadaAtual.length}`;

    // Totalmente neutro: sem mostrar pontuação para não entregar acertos/erros
    if (indicadorPontos) {
      indicadorPontos.innerHTML = `<i class="bi bi-patch-question me-1"></i> Quem será?`;
    }

    barraProgresso.style.width = `${(indiceAtual / rodadaAtual.length) * 100}%`;

    const letras = ["A", "B", "C", "D"];
    let nomeCorreto = mapaHashParaNome.get(desafio.hashResposta);

    if (!nomeCorreto) {
      nomeCorreto = bancoNomes.find(
        (n) =>
          n.trim().toLowerCase() ===
          String(desafio.hashResposta).trim().toLowerCase(),
      );
      if (nomeCorreto) {
        desafio.hashResposta = mapaNomeParaHash.get(nomeCorreto);
      }
    }

    if (!nomeCorreto) {
      const opcoesFallback = embaralhar(bancoNomes).slice(0, TOTAL_OPCOES);
      opcoesFallback.forEach((nome, idx) => criarBotaoOpcao(nome, letras[idx]));
      return;
    }

    const ehPessoaFeminina = ehFeminino(nomeCorreto);

    const erradasMesmoGenero = bancoNomes.filter(
      (n) => n !== nomeCorreto && ehFeminino(n) === ehPessoaFeminina,
    );

    const erradasOutroGenero = bancoNomes.filter(
      (n) => n !== nomeCorreto && ehFeminino(n) !== ehPessoaFeminina,
    );

    const poolDisponivel = [
      ...embaralhar(erradasMesmoGenero),
      ...embaralhar(erradasOutroGenero),
    ];

    const erradasSorteadas = poolDisponivel.slice(0, TOTAL_OPCOES - 1);
    const quatroOpcoes = embaralhar([nomeCorreto, ...erradasSorteadas]);

    quatroOpcoes.forEach((nome, idx) => {
      criarBotaoOpcao(nome, letras[idx]);
    });
  }

  /* ==========================================================================
     11. CONFIRMAÇÃO SILENCIOSA (SEM FEEDBACK DE ACERTO OU ERRO)
     ========================================================================== */
  async function confirmarEAvancar() {
    if (!opcaoSelecionadaAtual || travadoParaTransicao) return;
    travadoParaTransicao = true;
    btnProxima.classList.add("d-none");

    const desafio = rodadaAtual[indiceAtual];
    const hashEscolhido =
      mapaNomeParaHash.get(opcaoSelecionadaAtual) ||
      (await calcularSHA256(opcaoSelecionadaAtual));

    // Computa a pontuação em segredo absoluto
    if (hashEscolhido === desafio.hashResposta) {
      pontuacao++;
    }

    // Som e visual 100% neutros
    tocarSomConfirmacaoNeutra();

    const botoes = containerOpcoes.querySelectorAll("button");
    botoes.forEach((b) => {
      if (b.dataset.nome === opcaoSelecionadaAtual) {
        b.classList.add("btn-opcao-travada");
      }
    });

    if (badgeRevelacao) {
      badgeRevelacao.textContent = "Resposta registrada! 🔒";
      badgeRevelacao.className =
        "badge bg-secondary p-2 mt-2 shadow anim-slide-up";
      badgeRevelacao.classList.remove("d-none");
    }

    barraProgresso.style.width = `${((indiceAtual + 1) / rodadaAtual.length) * 100}%`;

    // Transição rápida e imperceptível
    setTimeout(() => {
      indiceAtual++;
      if (indiceAtual < rodadaAtual.length) {
        carregarPagina();
      } else {
        finalizarJogo();
      }
    }, 450);
  }

  /* ==========================================================================
     12. GERADOR DO CARD DE RESULTADO EM IMAGEM
     ========================================================================== */
  function desenharTextoComQuebra(
    ctx,
    texto,
    x,
    y,
    larguraMaxima,
    alturaLinha,
  ) {
    const palavras = String(texto || "").split(" ");
    let linha = "";
    const linhas = [];

    for (let i = 0; i < palavras.length; i++) {
      const linhaTeste = linha + palavras[i] + " ";
      const metricas = ctx.measureText(linhaTeste);
      if (metricas.width > larguraMaxima && i > 0) {
        linhas.push(linha.trim());
        linha = palavras[i] + " ";
      } else {
        linha = linhaTeste;
      }
    }
    linhas.push(linha.trim());

    const deslocamentoY = ((linhas.length - 1) * alturaLinha) / 2;
    linhas.forEach((l, index) => {
      ctx.fillText(l, x, y - deslocamentoY + index * alturaLinha);
    });
  }

  async function gerarImagemCardResultado(acertos, total, perc, mensagem) {
    const canvas = canvasCard || document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");

    if (document.fonts) await document.fonts.ready;

    const gradiente = ctx.createLinearGradient(0, 0, 1080, 1350);
    gradiente.addColorStop(0, "#fef3c7");
    gradiente.addColorStop(0.5, "#e0f2fe");
    gradiente.addColorStop(1, "#fce7f3");
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, 1080, 1350);

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(40, 40, 1000, 1270, 50);
    } else {
      ctx.rect(40, 40, 1000, 1270);
    }
    ctx.fill();

    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.fillStyle = "#0284c7";
    ctx.font = "bold 60px 'Poppins', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🎈 QUEM É NA FOTO? 👶", 540, 170);

    ctx.fillStyle = "#f97316";
    ctx.font = "bold 34px 'Poppins', sans-serif";
    ctx.fillText("Especial Infância dos Colegas 🎉", 540, 230);

    ctx.font = "120px sans-serif";
    const icone =
      perc === 100 ? "🏆" : perc >= 70 ? "⭐" : perc >= 40 ? "👀" : "😅";
    ctx.fillText(icone, 540, 400);

    ctx.fillStyle = "#f0f9ff";
    ctx.strokeStyle = "#bae6fd";
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(140, 470, 800, 360, 40);
    } else {
      ctx.rect(140, 470, 800, 360);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#0369a1";
    ctx.font = "bold 120px 'Poppins', sans-serif";
    ctx.fillText(`${acertos} / ${total}`, 540, 620);

    ctx.fillStyle = "#ec4899";
    ctx.font = "bold 46px 'Poppins', sans-serif";
    ctx.fillText(`${perc}% DE ACERTO!`, 540, 740);

    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 38px 'Poppins', sans-serif";
    desenharTextoComQuebra(ctx, mensagem, 540, 930, 860, 52);

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(240, 1070);
    ctx.lineTo(840, 1070);
    ctx.stroke();

    ctx.fillStyle = "#64748b";
    ctx.font = "600 32px 'Poppins', sans-serif";
    ctx.fillText("Será que você consegue me superar?", 540, 1140);

    ctx.fillStyle = "#f97316";
    ctx.font = "bold 38px 'Poppins', sans-serif";
    ctx.fillText("Jogue agora você também! 🚀", 540, 1205);

    const dataUrl = canvas.toDataURL("image/png");

    if (imgResultadoGerada) {
      imgResultadoGerada.src = dataUrl;
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        const file = new File([blob], "resultado-quem-e-na-foto.png", {
          type: "image/png",
        });
        resolve({ dataUrl, file });
      }, "image/png");
    });
  }

  function baixarImagem(dataUrl) {
    const link = document.createElement("a");
    link.download = "meu-resultado-quem-e-na-foto.png";
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function animarContador(elemento, valorFinal, sufixo = "") {
    if (!elemento) return;
    let atual = 0;
    const duracao = 900;
    const passo = Math.max(1, Math.floor(valorFinal / 30));
    const intervalo = setInterval(() => {
      atual += passo;
      if (atual >= valorFinal) {
        atual = valorFinal;
        clearInterval(intervalo);
      }
      elemento.textContent = `${atual}${sufixo}`;
    }, duracao / 30);
  }

  /* ==========================================================================
     13. TELA FINAL (ONDE TUDO É FINALMENTE REVELADO!)
     ========================================================================== */
  async function finalizarJogo() {
    telaJogo.classList.add("d-none");
    telaFim.classList.remove("d-none");

    const total = rodadaAtual.length;
    const perc = Math.round((pontuacao / total) * 100);

    let statusMsg = "Fim de jogo!";
    let deveLancarConfete = false;

    if (configuracoes.mensagensFinais?.faixas) {
      const faixaEncontrada = configuracoes.mensagensFinais.faixas.find(
        (f) => perc >= f.minPercentual,
      );
      if (faixaEncontrada) {
        statusMsg = faixaEncontrada.mensagem;
        deveLancarConfete = Boolean(faixaEncontrada.confete);

        if (
          faixaEncontrada.som === "vitoria_epica" ||
          faixaEncontrada.som === "vitoria_boa"
        ) {
          tocarSomFanfarra();
        } else if (faixaEncontrada.som === "derrota") {
          tocarSomDerrota();
        } else {
          tocarSomFanfarra();
        }
      }
    } else if (configuracoes.mensagens) {
      if (perc === 100) {
        statusMsg = configuracoes.mensagens.perfeito;
        deveLancarConfete = true;
        tocarSomFanfarra();
      } else if (perc >= 50) {
        statusMsg = configuracoes.mensagens.bom;
        tocarSomFanfarra();
      } else {
        statusMsg = configuracoes.mensagens.baixo;
        tocarSomDerrota();
      }
    }

    if (deveLancarConfete) {
      dispararConfetes(110);
      setTimeout(() => dispararConfetes(70), 500);
    }

    if (placarFinal) placarFinal.textContent = `${pontuacao} / ${total}`;
    if (porcentagemAcerto) animarContador(porcentagemAcerto, perc, "%");
    if (mensagemStatus) mensagemStatus.textContent = statusMsg;

    const { dataUrl, file } = await gerarImagemCardResultado(
      pontuacao,
      total,
      perc,
      statusMsg,
    );

    if (btnShareImagem) {
      btnShareImagem.onclick = async () => {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "Meu Resultado: Quem é na Foto?",
            });
          } catch (err) {}
        } else {
          baixarImagem(dataUrl);
        }
      };
    }

    if (btnDownloadImagem) {
      btnDownloadImagem.onclick = () => baixarImagem(dataUrl);
    }
  }

  /* ==========================================================================
     14. LISTENERS
     ========================================================================== */
  if (btnIniciar) btnIniciar.addEventListener("click", iniciarJogo);
  if (btnProxima) btnProxima.addEventListener("click", confirmarEAvancar);
  if (btnReiniciar) btnReiniciar.addEventListener("click", iniciarJogo);

  document.addEventListener("DOMContentLoaded", inicializar);
})();
