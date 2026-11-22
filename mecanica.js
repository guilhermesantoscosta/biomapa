// =========================================================================
// CONFIGURAÇÃO DO REPOSITÓRIO PÚBLICO GITHUB
// =========================================================================
const GITHUB_JSON_URL = "https://githubusercontent.com";
const LOCAL_JSON_URL  = "./mapa-dados.json";

const dom = {
  svg: document.getElementById('svg'),
  pecas: document.getElementById('pecas'),
  ghost: document.getElementById('ghost'),
  rios: document.getElementById('camada-rios'),
  aviso: document.getElementById('aviso'),
  turno: document.getElementById('turno'),
  c1: document.getElementById('c1'),
  c2: document.getElementById('c2'),
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
  caps: { 1: 0, 2: 0 },
  lastMove: null,
  landOnly: true
};

const setAviso = (txt) => { dom.aviso.textContent = txt; };

function initBoard() {
  state.board = Array.from({ length: state.rows + 1 }, () => Array(state.cols + 1).fill(0));
  state.caps = { 1: 0, 2: 0 };
  state.turn = 1;
  state.lastMove = null;
}

// =========================================================================
// 1. IMPORTAÇÃO DO JSON DO REPOSITÓRIO
// =========================================================================
async function carregarMapa() {
  try {
    let res = await fetch(LOCAL_JSON_URL).catch(() => null);
    if (!res || !res.ok) res = await fetch(GITHUB_JSON_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    state.mapa = await res.json();

    if (state.mapa.config) {
      state.cols = state.mapa.config.colunas || 30;
      state.rows = state.mapa.config.linhas || 40;
      state.cell = state.mapa.config.tamanhoCelula || 60;
    }

    initBoard();
    desenharRios(state.mapa.rios);
    setAviso("Mapa carregado! Clique nos vértices do continente para jogar.");
    render();
  } catch (err) {
    setAviso("Erro ao carregar mapa-dados.json. Verifique se o repositório está público.");
    console.error("Falha ao carregar JSON:", err);
  }
}

function desenharRios(rios = []) {
  dom.rios.innerHTML = rios.map(r => {
    const d = r.vertices.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
    return `<path class="rio" d="${d}"><title>${r.nome}</title></path>` +
           `<circle cx="${r.nascente.x}" cy="${r.nascente.y}" r="0.14" class="nascente"><title>Nascente: ${r.nome}</title></circle>`;
  }).join('');
}

// =========================================================================
// 2. REGRAS DE TERRENO & MOTOR DO GO
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
    if (cod > 0 && state.mapa.terrenos?.[cod]) {
      return state.mapa.terrenos[cod].nome;
    }
  }
  return "Oceano";
}

function neighbors(vx, vy) {
  return [[vx, vy - 1], [vx, vy + 1], [vx - 1, vy], [vx + 1, vy]].filter(([x, y]) =>
    x >= 1 && x < state.cols &&
    y >= 1 && y < state.rows &&
    (!state.landOnly || isLand(x, y))
  );
}

function getGroup(sx, sy, boardState) {
  const color = boardState[sy][sx];
  const visited = new Set([`${sx},${sy}`]);
  const libs = new Set();
  const stones = [];
  const queue = [[sx, sy]];

  while (queue.length) {
    const [x, y] = queue.shift();
    stones.push([x, y]);
    for (const [nx, ny] of neighbors(x, y)) {
      const key = `${nx},${ny}`;
      const val = boardState[ny][nx];
      if (val === 0) libs.add(key);
      else if (val === color && !visited.has(key)) {
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
  if (state.board[vy][vx] !== 0) return setAviso("Vértice já ocupado.");

  const nextBoard = state.board.map(row => [...row]);
  nextBoard[vy][vx] = state.turn;
  const opp = state.turn === 1 ? 2 : 1;
  let captured = 0;

  for (const [nx, ny] of neighbors(vx, vy)) {
    if (nextBoard[ny][nx] === opp) {
      const group = getGroup(nx, ny, nextBoard);
      if (group.libs === 0) {
        group.stones.forEach(([gx, gy]) => nextBoard[gy][gx] = 0);
        captured += group.stones.length;
      }
    }
  }

  if (getGroup(vx, vy, nextBoard).libs === 0) {
    return setAviso("Jogada inválida (Suicídio): grupo sem liberdades.");
  }

  state.board = nextBoard;
  state.caps[state.turn] += captured;
  state.lastMove = { x: vx, y: vy };
  state.turn = opp;
  setAviso(captured ? `Captura! +${captured} peça(s).` : "");
  render();
}

// =========================================================================
// 3. RENDERIZAÇÃO E EVENTOS
// =========================================================================
const shapeSVG = (x, y, player, extra = "") => player === 1
  ? `<circle cx="${x}" cy="${y}" r="0.36" class="p1 ${extra}" />`
  : `<polygon points="${x},${y - 0.42} ${x - 0.38},${y + 0.32} ${x + 0.38},${y + 0.32}" class="p2 ${extra}" />`;

function render() {
  let html = "";
  for (let y = 1; y < state.rows; y++) {
    for (let x = 1; x < state.cols; x++) {
      if (state.board[y][x]) html += shapeSVG(x, y, state.board[y][x]);
    }
  }
  if (state.lastMove) {
    html += `<circle cx="${state.lastMove.x}" cy="${state.lastMove.y}" r="0.09" class="last" />`;
  }
  dom.pecas.innerHTML = html;
  dom.c1.textContent = state.caps[1];
  dom.c2.textContent = state.caps[2];
  dom.turno.textContent = state.turn === 1
    ? "● Vez: Círculo (Jogador 1)"
    : "▲ Vez: Triângulo (Jogador 2)";
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
  const valid = inBounds && state.board[vy][vx] === 0 && (!state.landOnly || isLand(vx, vy));
  dom.ghost.innerHTML = valid ? shapeSVG(vx, vy, state.turn, "ghost") : "";
  if (inBounds) {
    setAviso(`Vértice (${vx}, ${vy}) — ${getBiomaNoVertice(vx, vy)}`);
  }
});

dom.svg.addEventListener('mouseleave', () => {
  dom.ghost.innerHTML = "";
});

dom.svg.addEventListener('click', e => {
  const { vx, vy } = getVertex(e);
  play(vx, vy);
});

dom.btnModo.onclick = () => {
  state.landOnly = !state.landOnly;
  dom.btnModo.textContent = state.landOnly ? "Só Continente" : "Mapa Completo";
  dom.btnModo.classList.toggle('ativo', state.landOnly);
};

dom.btnPass.onclick = () => {
  state.turn = state.turn === 1 ? 2 : 1;
  setAviso("Turno passado.");
  render();
};

dom.btnReset.onclick = () => {
  initBoard();
  setAviso("Partida reiniciada.");
  render();
};

carregarMapa();
