(() => {
  "use strict";

  /* ==========================================================================
     1. ESTADO PRIVADO DO JOGO
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

  // Tabela para priorização de gênero nos sorteios das alternativas (com Zirlei como feminino)
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
  const TOTAL_OPCOES = 4;

  /* ==========================================================================
     2. ELEMENTOS DO DOM
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
     3. PRÉ-CARREGAMENTO DE IMAGENS
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

  /* ==========================================================================
     4. ÁUDIO SINTETIZADO (Toque Neutro)
     ========================================================================== */
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioCtx = AudioContextClass ? new AudioContextClass() : null;

  function tocarSomClique() {
    if (!audioCtx) return;
    try {
      if (audioCtx.state === "suspended") audioCtx.resume();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const agora = audioCtx.currentTime;
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, agora);
      osc.frequency.exponentialRampToValueAtTime(320, agora + 0.1);
      gain.gain.setValueAtTime(0.12, agora);
      gain.gain.exponentialRampToValueAtTime(0.01, agora + 0.1);
      osc.start(agora);
      osc.stop(agora + 0.1);
    } catch (e) {
      console.warn("Áudio não executado:", e);
    }
  }

  /* ==========================================================================
     5. EFEITO VISUAL DE CONFETES (Canvas)
     ========================================================================== */
  function dispararConfetes() {
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
    const particulas = Array.from({ length: 60 }, () => ({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.8) * 18,
      cor: cores[Math.floor(Math.random() * cores.length)],
      tamanho: Math.random() * 8 + 4,
      rotacao: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 12,
    }));

    let frames = 0;
    function animar() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particulas.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.42;
        p.rotacao += p.vRot;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotacao * Math.PI) / 180);
        ctx.fillStyle = p.cor;
        ctx.fillRect(-p.tamanho / 2, -p.tamanho / 2, p.tamanho, p.tamanho);
        ctx.restore();
      });

      frames++;
      if (frames < 65) {
        requestAnimationFrame(animar);
      } else {
        canvas.remove();
      }
    }
    requestAnimationFrame(animar);
  }

  /* ==========================================================================
     6. CRIPTOGRAFIA SHA-256 E UTILITÁRIOS
     ========================================================================== */
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
     7. INICIALIZAÇÃO E NORMALIZAÇÃO DE DADOS
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

      if (txtTitulo && configuracoes.titulo)
        txtTitulo.textContent = configuracoes.titulo;
      if (txtDescricao && configuracoes.subtitulo)
        txtDescricao.textContent = configuracoes.subtitulo;

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
    btn.innerHTML = `<span class="opt-letter">${letra}</span><span class="opt-name">${nome}</span>`;
    btn.onclick = () => selecionarOpcao(nome, btn);
    containerOpcoes.appendChild(btn);
  }

  /* ==========================================================================
     9. SELEÇÃO DE OPÇÃO (PERMITE TROCAR LIVREMENTE ANTES DE AVANÇAR)
     ========================================================================== */
  function selecionarOpcao(nome, botaoClicado) {
    opcaoSelecionadaAtual = nome;

    const todosBotoes = containerOpcoes.querySelectorAll("button");
    todosBotoes.forEach((b) => b.classList.remove("btn-selected"));
    botaoClicado.classList.add("btn-selected");

    tocarSomClique();

    const ehUltima = indiceAtual === rodadaAtual.length - 1;
    if (ehUltima) {
      btnProxima.innerHTML = `Finalizar e Ver Resultado <i class="bi bi-trophy-fill ms-2"></i>`;
    } else {
      btnProxima.innerHTML = `Confirmar e Próxima <i class="bi bi-arrow-right-circle-fill ms-2"></i>`;
    }

    btnProxima.classList.remove("d-none");
  }

  /* ==========================================================================
     10. CARREGAMENTO DA PERGUNTA COM PRIORIZAÇÃO DE GÊNERO
     ========================================================================== */
  function carregarPagina() {
    opcaoSelecionadaAtual = null;
    btnProxima.classList.add("d-none");
    if (badgeRevelacao) badgeRevelacao.classList.add("d-none");
    containerOpcoes.innerHTML = "";

    const desafio = rodadaAtual[indiceAtual];
    fotoExibida.src = encodeURI(desafio.fotoCrianca);

    indicadorPergunta.innerHTML = `<i class="bi bi-card-image me-1"></i> ${indiceAtual + 1} de ${rodadaAtual.length}`;
    if (indicadorPontos) {
      indicadorPontos.innerHTML = `<i class="bi bi-patch-question me-1"></i> Adivinhe!`;
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

    // 1. Identifica o gênero correto (Zirlei agora é detectada como feminina)
    const ehPessoaFeminina = ehFeminino(nomeCorreto);

    // 2. Filtra prioritariamente opções do mesmo gênero
    const erradasMesmoGenero = bancoNomes.filter(
      (n) => n !== nomeCorreto && ehFeminino(n) === ehPessoaFeminina,
    );

    const erradasOutroGenero = bancoNomes.filter(
      (n) => n !== nomeCorreto && ehFeminino(n) !== ehPessoaFeminina,
    );

    // 3. Monta as opções garantindo que todos os 4 nomes sejam do mesmo gênero
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
     11. CONFIRMAÇÃO DA ESCOLHA AO CLICAR EM PRÓXIMA
     ========================================================================== */
  async function confirmarEAvancar() {
    if (!opcaoSelecionadaAtual) return;

    const desafio = rodadaAtual[indiceAtual];
    const hashEscolhido =
      mapaNomeParaHash.get(opcaoSelecionadaAtual) ||
      (await calcularSHA256(opcaoSelecionadaAtual));

    if (hashEscolhido === desafio.hashResposta) {
      pontuacao++;
    }

    barraProgresso.style.width = `${((indiceAtual + 1) / rodadaAtual.length) * 100}%`;

    indiceAtual++;
    if (indiceAtual < rodadaAtual.length) {
      carregarPagina();
    } else {
      finalizarJogo();
    }
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
    const palavras = texto.split(" ");
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

    if (document.fonts) {
      await document.fonts.ready;
    }

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
    ctx.fillText("Especial Dia das Crianças 🎉", 540, 230);

    ctx.font = "120px sans-serif";
    const icone = perc === 100 ? "🏆" : perc >= 50 ? "⭐" : "👀";
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

  /* ==========================================================================
     13. TELA FINAL
     ========================================================================== */
  async function finalizarJogo() {
    telaJogo.classList.add("d-none");
    telaFim.classList.remove("d-none");

    const total = rodadaAtual.length;
    const perc = Math.round((pontuacao / total) * 100);

    let statusMsg = configuracoes.mensagens.baixo;
    if (perc === 100) {
      statusMsg = configuracoes.mensagens.perfeito;
      dispararConfetes();
    } else if (perc >= 50) {
      statusMsg = configuracoes.mensagens.bom;
    }

    if (placarFinal) placarFinal.textContent = `${pontuacao} / ${total}`;
    if (porcentagemAcerto) porcentagemAcerto.textContent = `${perc}%`;
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
          } catch (err) {
            console.log("Compartilhamento cancelado.");
          }
        } else {
          baixarImagem(dataUrl);
        }
      };
    }

    if (btnDownloadImagem) {
      btnDownloadImagem.onclick = () => {
        baixarImagem(dataUrl);
      };
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
