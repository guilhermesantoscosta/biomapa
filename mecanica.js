const LOCAL_JSON_URL = "./mapa-dados.json";

const dom = {
  svg: document.getElementById('svg'),
  pecas: document.getElementById('pecas'),
  ghost: document.getElementById('ghost'),
  rios: document.getElementById('camada-rios'),
  aviso: document.getElementById('aviso'),
  btnModo: document.getElementById('btn-modo'),
  btnPass: document.getElementById('btn-pass'),
  btnReset: document.getElementById('btn-reset')
};

const state = {
  cols: 30,
  rows: 40,
  cell: 60,
  mapa: null,
  board: [],
  turn: 1,
  caps: { team1: 0, team2: 0 },
  lastMove: null,
  landOnly: true
};

const bonusState = {
  jogadaExtraUsada: false,
  biomasDominados: new Set()
};

const FRONTEIRA_BRASIL_PADRAO = [
  {
    id: "brasil",
    nome: "Fronteira do Brasil",
    vertices: [,,,,,,,,,
,,,,,,,,,
,,,,,,,,,
,,,,,,,,,
,,,,,,,,,
,,,,,,
    ]
  }
];

// =========================================================================
// SINTETIZADOR DE EFEITOS SONOROS (SEM ARQUIVOS EXTERNOS)
// =========================================================================
const sfx = {
  ctx: null,
  tocarNota(freq, tipo, duracao, atraso = 0, vol = 0.12) {
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = tipo;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + atraso);

      gain.gain.setValueAtTime(vol, this.ctx.currentTime + atraso);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + atraso + duracao);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + atraso);
      osc.stop(this.ctx.currentTime + atraso + duracao);
    } catch {}
  },
  peca() { this.tocarNota(320, 'triangle', 0.09, 0, 0.15); },
  erro() { this.tocarNota(140, 'sawtooth', 0.14, 0, 0.08); },
  agua() {
    this.tocarNota(587.33, 'sine', 0.15, 0, 0.12);
    this.tocarNota(880, 'sine', 0.22, 0.07, 0.12);
  },
  captura() {
    this.tocarNota(440, 'triangle', 0.12, 0, 0.14);
    this.tocarNota(330, 'triangle', 0.18, 0.08, 0.14);
  },
  dominio() {
    this.tocarNota(523.25, 'triangle', 0.14, 0, 0.15);
    this.tocarNota(659.25, 'triangle', 0.14, 0.09, 0.15);
    this.tocarNota(783.99, 'triangle', 0.28, 0.18, 0.15);
  }
};

const setAviso = (txt) => {
  if (dom.aviso) dom.aviso.textContent = txt;
};

function initBoard() {
  state.board = Array.from({ length: state.rows + 1 }, () => Array(state.cols + 1).fill(null));
  state.caps = { team1: 0, team2: 0 };
  state.turn = 1;
  state.lastMove = null;
  bonusState.jogadaExtraUsada = false;
  bonusState.biomasDominados.clear();
}

function criarMapaFallback() {
  return {
    config: { colunas: 30, linhas: 40, tamanhoCelula: 60 },
    terrenos: { 1: { nome: "Continente", continente: true } },
    grid: Array.from({ length: 40 }, (_, y) =>
      Array.from({ length: 30 }, (_, x) => (x >= 3 && x <= 28 && y >= 2 && y <= 35 ? 1 : 0))
    ),
    fronteiras: FRONTEIRA_BRASIL_PADRAO,
    rios: []
  };
}

async function carregarMapa() {
  try {
    const res = await fetch(LOCAL_JSON_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.mapa = await res.json();

    if (state.mapa.config) {
      state.cols = state.mapa.config.colunas || 30;
      state.rows = state.mapa.config.linhas || 40;
      state.cell = state.mapa.config.tamanhoCelula || 60;
    }
    setAviso("Mapa carregado! Clique nos vértices do continente para jogar.");
  } catch {
    state.mapa = criarMapaFallback();
    setAviso("Mapa iniciado! Clique nos vértices do continente para jogar.");
  }

  initBoard();
  desenharFronteiras(state.mapa.fronteiras || FRONTEIRA_BRASIL_PADRAO);
  desenharRios(state.mapa.rios);
  render();
}

function desenharFronteiras(fronteiras = []) {
  if (!dom.svg || !Array.isArray(fronteiras)) return;

  let camada = document.getElementById('camada-fronteiras');
  if (!camada) {
    camada = document.createElementNS('http://w3.org', 'g');
    camada.setAttribute('id', 'camada-fronteiras');
    camada.setAttribute('transform', `scale(${state.cell})`);
    dom.svg.insertBefore(camada, dom.rios || null);
  }

  camada.innerHTML = fronteiras.map(f => {
    const d = f.vertices.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z';
    return `<path d="${d}" fill="none" stroke="#0f172a" stroke-width="0.14" stroke-dasharray="0.35 0.25" stroke-linecap="round" stroke-linejoin="round" opacity="0.85" pointer-events="none"><title>${f.nome}</title></path>`;
  }).join('');
}

function desenharRios(rios = []) {
  if (!dom.rios || !Array.isArray(rios)) return;
  dom.rios.innerHTML = rios.map(r => {
    const d = r.vertices.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
    return `<path class="rio" d="${d}"><title>${r.nome}</title></path>` +
           `<circle cx="${r.nascente.x}" cy="${r.nascente.y}" r="0.14" class="nascente"><title>Nascente: ${r.nome}</title></circle>`;
  }).join('');
}

const celulasAdjacentes = (vx, vy) => [
  [vx - 1, vy - 1], [vx, vy - 1],
  [vx - 1, vy],     [vx, vy]
].filter(([x, y]) => y >= 0 && y < state.rows && x >= 0 && x < state.cols);

function isLand(vx, vy) {
  if (!state.mapa?.grid) return false;
  return celulasAdjacentes(vx, vy).some(([x, y]) => {
    const cod = state.mapa.grid[y]?.[x] ?? 0;
    return state.mapa.terrenos?.[cod]?.continente ?? (cod > 0);
  });
}

function getBiomaNoVertice(vx, vy) {
  if (!state.mapa?.grid) return "";
  for (const [x, y] of celulasAdjacentes(vx, vy)) {
    const cod = state.mapa.grid[y]?.[x] ?? 0;
    if (cod > 0 && state.mapa.terrenos?.[cod]) return state.mapa.terrenos[cod].nome;
  }
  return "Oceano";
}

function verificarTipoHidrico(vx, vy) {
  if (!state.mapa || !Array.isArray(state.mapa.rios)) return null;
  const vizinhos = [[vx, vy - 1], [vx, vy + 1], [vx - 1, vy], [vx + 1, vy]];
  let melhor = null;

  const registrar = (candidato) => {
    if (!melhor || candidato.pts > melhor.pts) melhor = candidato;
  };

  for (const rio of state.mapa.rios) {
    if (rio.nascente) {
      if (rio.nascente.x === vx && rio.nascente.y === vy) {
        registrar({ tipo: "nascente", nome: rio.nome, pts: 3, label: `💧 Nascente (${rio.nome}): +3 pts` });
      } else if (vizinhos.some(([nx, ny]) => nx === rio.nascente.x && ny === rio.nascente.y)) {
        registrar({ tipo: "nascente_margem", nome: rio.nome, pts: 2, label: `💧 Margem da Nascente (${rio.nome}): +2 pts` });
      }
    }
    if (Array.isArray(rio.vertices)) {
      if (rio.vertices.some(([rx, ry]) => rx === vx && ry === vy)) {
        registrar({ tipo: "rio", nome: rio.nome, pts: 2, label: `🌊 Rio (${rio.nome}): +2 pts` });
      } else if (rio.vertices.some(([rx, ry]) => vizinhos.some(([nx, ny]) => nx === rx && ny === ry))) {
        registrar({ tipo: "rio_margem", nome: rio.nome, pts: 1, label: `🌊 Margem do Rio (${rio.nome}): +1 pt` });
      }
    }
  }
  return melhor;
}

function contarPecasEquipeNoBioma(boardState, biomaAlvo, equipe) {
  if (!biomaAlvo || biomaAlvo === "Oceano") return 0;
  let total = 0;
  for (let y = 1; y < state.rows; y++) {
    for (let x = 1; x < state.cols; x++) {
      if (boardState[y][x]?.equipe === equipe && getBiomaNoVertice(x, y) === biomaAlvo) {
        total++;
      }
    }
  }
  return total;
}

function neighbors(vx, vy) {
  return [[vx, vy - 1], [vx, vy + 1], [vx - 1, vy], [vx + 1, vy]].filter(([x, y]) =>
    x >= 1 && x < state.cols && y >= 1 && y < state.rows && (!state.landOnly || isLand(x, y))
  );
}

function getGroup(sx, sy, boardState) {
  const equipe = boardState[sy][sx]?.equipe;
  const visited = new Set([`${sx},${sy}`]);
  const libs = new Set();
  const stones = [];
  const queue = [[sx, sy]];

  while (queue.length) {
    const [x, y] = queue.shift();
    stones.push([x, y]);
    for (const [nx, ny] of neighbors(x, y)) {
      const key = `${nx},${ny}`;
      const cell = boardState[ny][nx];
      if (!cell) libs.add(key);
      else if (cell.equipe === equipe && !visited.has(key)) {
        visited.add(key);
        queue.push([nx, ny]);
      }
    }
  }
  return { stones, libs: libs.size };
}

function play(vx, vy) {
  if (!state.mapa || vx < 1 || vx >= state.cols || vy < 1 || vy >= state.rows) return;
  if (state.landOnly && !isLand(vx, vy)) {
    sfx.erro();
    return setAviso("Jogue apenas nos vértices do continente.");
  }
  if (state.board[vy][vx] !== null) {
    sfx.erro();
    return setAviso("Vértice já ocupado.");
  }

  const jogador = typeof getJogadorAtual === 'function' ? getJogadorAtual() : null;
  if (!jogador) {
    document.getElementById('modal-setup')?.classList.remove('hidden');
    return;
  }

  const nextBoard = state.board.map(row => [...row]);
  nextBoard[vy][vx] = { equipe: state.turn, cor: jogador.cor };

  const opp = state.turn === 1 ? 2 : 1;
  let captured = 0;

  for (const [nx, ny] of neighbors(vx, vy)) {
    if (nextBoard[ny][nx]?.equipe === opp) {
      const group = getGroup(nx, ny, nextBoard);
      if (group.libs === 0) {
        group.stones.forEach(([gx, gy]) => nextBoard[gy][gx] = null);
        captured += group.stones.length;
      }
    }
  }

  if (getGroup(vx, vy, nextBoard).libs === 0) {
    sfx.erro();
    return setAviso("Jogada inválida (Suicídio): grupo sem liberdades.");
  }

  state.board = nextBoard;
  state.lastMove = { x: vx, y: vy, cor: jogador.cor };

  const hidrico = verificarTipoHidrico(vx, vy);
  const bonusAgua = hidrico ? hidrico.pts : 0;
  const pontosTotaisJogada = captured + bonusAgua;

  if (state.turn === 1) state.caps.team1 += pontosTotaisJogada;
  else state.caps.team2 += pontosTotaisJogada;

  const biomaAtual = getBiomaNoVertice(vx, vy);
  const qtdNoBioma = contarPecasEquipeNoBioma(state.board, biomaAtual, state.turn);
Use o código com cuidado.
const chaveMarco = ${state.turn}-${biomaAtual}-${qtdNoBioma};
let ganhouJogadaExtra = false;
if (qtdNoBioma > 0 && qtdNoBioma % 5 === 0 && !bonusState.biomasDominados.has(chaveMarco) && !bonusState.jogadaExtraUsada) {
bonusState.biomasDominados.add(chaveMarco);
bonusState.jogadaExtraUsada = true;
ganhouJogadaExtra = true;
}
if (ganhouJogadaExtra) sfx.dominio();
else if (captured > 0) sfx.captura();
else if (hidrico) sfx.agua();
else sfx.peca();
const mensagens = [];
if (captured) mensagens.push(Captura! +${captured} pt(s));
if (hidrico) mensagens.push(hidrico.label);
if (ganhouJogadaExtra) {
mensagens.push(🌿 DOMÍNIO DE BIOMA (${biomaAtual}: ${qtdNoBioma} peças) — JOGADA EXTRA para ${jogador.nome}!);
} else {
bonusState.jogadaExtraUsada = false;
state.turn = typeof avancarTurnoAlternado === 'function' ? avancarTurnoAlternado() : opp;
}
setAviso(mensagens.join(" | "));
render();
}
const shapeSVG = (x, y, equipe, cor, extra = "", isLast = false) => {
const escala = isLast ? 1.1 : 1; // +10% apenas na última jogada
if (equipe === 1) {
const r = (0.36 * escala).toFixed(3);
return <circle cx="${x}" cy="${y}" r="${r}" fill="${cor}" class="peca ${extra}" />;
} else {
const topo = (y - 0.42 * escala).toFixed(3);
const base = (y + 0.32 * escala).toFixed(3);
const esq  = (x - 0.38 * escala).toFixed(3);
const dir  = (x + 0.38 * escala).toFixed(3);
return <polygon points="${x},${topo} ${esq},${base} ${dir},${base}" fill="${cor}" class="peca ${extra}" />;
}
};
function render() {
if (!dom.pecas) return;
let html = "";
for (let y = 1; y < state.rows; y++) {
for (let x = 1; x < state.cols; x++) {
const celula = state.board[y]?.[x];
if (celula) {
const isLast = Boolean(state.lastMove && state.lastMove.x === x && state.lastMove.y === y);
html += shapeSVG(x, y, celula.equipe, celula.cor, isLast ? "peca-nova" : "", isLast);
}
}
}
if (state.lastMove) {
html += <circle cx="${state.lastMove.x}" cy="${state.lastMove.y}" r="0.09" class="last" />;
}
dom.pecas.innerHTML = html;
if (typeof atualizarPontuacaoEInterface === 'function') {
atualizarPontuacaoEInterface(state.caps);
}
}
function getVertex(e) {
const pt = dom.svg.createSVGPoint();
pt.x = e.clientX;
pt.y = e.clientY;
const p = pt.matrixTransform(dom.svg.getScreenCTM().inverse());
return { vx: Math.round(p.x / state.cell), vy: Math.round(p.y / state.cell) };
}
dom.svg.addEventListener('mousemove', e => {
if (!state.mapa) return;
const { vx, vy } = getVertex(e);
const inBounds = vx >= 1 && vx < state.cols && vy >= 1 && vy < state.rows;
const valid = inBounds && state.board[vy]?.[vx] === null && (!state.landOnly || isLand(vx, vy));
const jogador = typeof getJogadorAtual === 'function' ? getJogadorAtual() : null;
dom.ghost.innerHTML = (valid && jogador) ? shapeSVG(vx, vy, state.turn, jogador.cor, "ghost", false) : "";
if (inBounds) setAviso(Vértice (${vx}, ${vy}) — Bioma: ${getBiomaNoVertice(vx, vy)});
});
dom.svg.addEventListener('mouseleave', () => {
dom.ghost.innerHTML = "";
});
dom.svg.addEventListener('click', e => {
const { vx, vy } = getVertex(e);
play(vx, vy);
});
dom.btnModo.addEventListener('click', () => {
state.landOnly = !state.landOnly;
dom.btnModo.textContent = state.landOnly ? "Só Continente" : "Mapa Completo";
dom.btnModo.classList.toggle('ativo', state.landOnly);
});
dom.btnPass.addEventListener('click', () => {
if (typeof avancarTurnoAlternado === 'function') {
bonusState.jogadaExtraUsada = false;
state.turn = avancarTurnoAlternado();
sfx.peca();
setAviso("Turno passado.");
render();
}
});
dom.btnReset.addEventListener('click', () => {
document.getElementById('modal-setup')?.classList.remove('hidden');
});
carregarMapa();
