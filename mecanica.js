const CORES_BIOMA = {
  0: "#38bdf8", // mar
  1: "#64748b", // andes
  2: "#d97706", // atacama
  3: "#065f46", // valdiviana
  4: "#d6d3d1", // patagonia
  5: "#fde047", // llanos
  6: "#15803d", // amazonia
  7: "#fb923c", // caatinga
  8: "#eab308", // cerrado
  9: "#84cc16", // pantanal
  10: "#4ade80", // mata_atlantica
  11: "#bef264", // pampa
  12: "#a3a380"  // espinal
};

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const dom = {
  aviso: document.getElementById('aviso'),
  btnModo: document.getElementById('btn-modo'),
  btnPass: document.getElementById('btn-pass'),
  btnPlacar: document.getElementById('btn-placar'),
  btnReset: document.getElementById('btn-reset')
};

const state = {
  cols: 30,
  rows: 40,
  cell: 60,
  mapa: MAPA_DADOS,
  board: [],
  turn: 1,
  caps: { team1: 0, team2: 0 },
  lastMove: null,
  hoverVertex: null,
  landOnly: true
};

const setAviso = (txt) => { dom.aviso.textContent = txt; };

function initBoard() {
  state.board = Array.from({ length: state.rows + 1 }, () => Array(state.cols + 1).fill(null));
  state.caps = { team1: 0, team2: 0 };
  state.turn = 1;
  state.lastMove = null;
}

function inicializarJogo() {
  if (state.mapa?.config) {
    state.cols = state.mapa.config.colunas || 30;
    state.rows = state.mapa.config.linhas || 40;
    state.cell = state.mapa.config.tamanhoCelula || 60;
    canvas.width = state.cols * state.cell;
    canvas.height = state.rows * state.cell;
  }
  initBoard();
  setAviso("Configure os jogadores para começar!");
  render();
}

// =========================================================================
// RENDERIZAÇÃO EM CAMADAS NO CANVAS (DE BAIXO PARA CIMA)
// =========================================================================
function render() {
  const c = state.cell;

  // 1. Fundo (Oceano)
  ctx.fillStyle = CORES_BIOMA[0];
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!state.mapa) return;

  // 2. Biomas
  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.cols; x++) {
      const cod = state.mapa.grid[y][x];
      if (cod > 0 && CORES_BIOMA[cod]) {
        ctx.fillStyle = CORES_BIOMA[cod];
        ctx.fillRect(x * c, y * c, c, c);
      }
    }
  }

  // 3. Malha Quadriculada (Grid)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = 0; x <= state.cols; x++) {
    ctx.moveTo(x * c, 0);
    ctx.lineTo(x * c, canvas.height);
  }
  for (let y = 0; y <= state.rows; y++) {
    ctx.moveTo(0, y * c);
    ctx.lineTo(canvas.width, y * c);
  }
  ctx.stroke();

  // 4. Rios e Nascentes
  (state.mapa.rios || []).forEach(r => {
    if (!r.pontos) return;
    const coords = r.pontos.split(" ").map(par => par.split(",").map(Number));

    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = c * 0.09;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    coords.forEach(([vx, vy], i) => {
      if (i === 0) ctx.moveTo(vx * c, vy * c);
      else ctx.lineTo(vx * c, vy * c);
    });
    ctx.stroke();

    // Nascente
    ctx.fillStyle = "#0369a1";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = c * 0.04;
    ctx.beginPath();
    ctx.arc(r.nascente.x * c, r.nascente.y * c, c * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  // 5. Prévia da Jogada (Ghost)
  if (state.hoverVertex) {
    const { vx, vy } = state.hoverVertex;
    const jogador = getJogadorAtual();
    const valid = vx >= 1 && vx < state.cols && vy >= 1 && vy < state.rows &&
                  state.board[vy][vx] === null && (!state.landOnly || isLand(vx, vy));
    if (valid && jogador) {
      desenharPeca(vx, vy, state.turn, jogador.cor, 0.5);
    }
  }

  // 6. Peças Jogadas
  for (let y = 1; y < state.rows; y++) {
    for (let x = 1; x < state.cols; x++) {
      const cel = state.board[y][x];
      if (cel) desenharPeca(x, y, cel.equipe, cel.cor, 1);
    }
  }

  // 7. Marcador da Última Jogada
  if (state.lastMove) {
    ctx.fillStyle = "#ef4444";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = c * 0.02;
    ctx.beginPath();
    ctx.arc(state.lastMove.x * c, state.lastMove.y * c, c * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  atualizarPontuacaoEInterface(state.caps);
}

function desenharPeca(vx, vy, equipe, cor, alpha = 1) {
  const c = state.cell;
  const cx = vx * c;
  const cy = vy * c;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = cor;
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = c * 0.06;
  ctx.lineJoin = "round";
  ctx.beginPath();

  if (equipe === 1) {
    ctx.arc(cx, cy, c * 0.36, 0, Math.PI * 2);
  } else {
    ctx.moveTo(cx, cy - c * 0.42);
    ctx.lineTo(cx - c * 0.38, cy + c * 0.32);
    ctx.lineTo(cx + c * 0.38, cy + c * 0.32);
    ctx.closePath();
  }

  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// =========================================================================
// REGRAS DO JOGO & EVENTOS
// =========================================================================
const celulasAdjacentes = (vx, vy) => [
  [vx - 1, vy - 1], [vx, vy - 1],
  [vx - 1, vy],     [vx, vy]
].filter(([x, y]) => y >= 0 && y < state.rows && x >= 0 && x < state.cols);

function isLand(vx, vy) {
  if (!state.mapa) return false;
  return celulasAdjacentes(vx, vy).some(([x, y]) => {
    const cod = state.mapa.grid[y][x];
    return state.mapa.terrenos?.[cod]?.continente ?? (cod > 0);
  });
}

function getBiomaNoVertice(vx, vy) {
  if (!state.mapa) return "";
  for (const [x, y] of celulasAdjacentes(vx, vy)) {
    const cod = state.mapa.grid[y][x];
    if (cod > 0 && state.mapa.terrenos?.[cod]) return state.mapa.terrenos[cod].nome;
  }
  return "Oceano";
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
  if (state.landOnly && !isLand(vx, vy)) return setAviso("Jogue apenas nos vértices do continente.");
  if (state.board[vy][vx] !== null) return setAviso("Vértice já ocupado.");

  const jogador = getJogadorAtual();
  if (!jogador) return;

  const nextBoard = state.board.map(row => [...row]);
  nextBoard[vy][vx] = { equipe: state.turn, cor: jogador.cor, jogadorId: jogador.id };

  const opp = state.turn === 1 ? 2 : 1;
  let captured = 0;

  for (const [nx, ny] of neighbors(vx, vy)) {
    if (nextBoard[ny][nx]?.equipe === opp) {
      const group = getGroup(nx, ny, nextBoard);
      if (group.libs === 0) {
        group.stones.forEach(([gx, gy]) => { nextBoard[gy][gx] = null; });
        captured += group.stones.length;
      }
    }
  }

  if (getGroup(vx, vy, nextBoard).libs === 0) {
    return setAviso("Jogada inválida (Suicídio): grupo sem liberdades.");
  }

  state.board = nextBoard;
  if (state.turn === 1) state.caps.team1 += captured;
  else state.caps.team2 += captured;

  state.lastMove = { x: vx, y: vy };
  state.turn = avancarTurnoAlternado();
  setAviso(captured ? `Captura! +${captured} ponto(s) para a equipe.` : "");
  render();
}

function getVertex(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  return { vx: Math.round(x / state.cell), vy: Math.round(y / state.cell) };
}

canvas.addEventListener('mousemove', e => {
  if (!state.mapa) return;
  const { vx, vy } = getVertex(e);
  state.hoverVertex = { vx, vy };
  if (vx >= 1 && vx < state.cols && vy >= 1 && vy < state.rows) {
    setAviso(`Vértice (${vx}, ${vy}) — Bioma: ${getBiomaNoVertice(vx, vy)}`);
  }
  render();
});

canvas.addEventListener('mouseleave', () => {
  state.hoverVertex = null;
  render();
});

canvas.addEventListener('click', e => {
  const { vx, vy } = getVertex(e);
  play(vx, vy);
});

dom.btnModo.onclick = () => {
  state.landOnly = !state.landOnly;
  dom.btnModo.textContent = state.landOnly ? "Só Continente" : "Mapa Completo";
  dom.btnModo.classList.toggle('ativo', state.landOnly);
};

dom.btnPass.onclick = () => {
  state.turn = avancarTurnoAlternado();
  setAviso("Turno passado para o próximo jogador.");
  render();
};

dom.btnPlacar.onclick = () => exibirPlacarGeral(state.caps);
dom.btnReset.onclick = () => document.getElementById('modal-setup').classList.remove('hidden');

inicializarJogo();
