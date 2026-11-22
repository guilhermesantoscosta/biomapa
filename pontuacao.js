const scoreState = {
  capturas1: 0,
  capturas2: 0,
  bonusAgua1: 0,
  bonusAgua2: 0,
  dominios1: 0,
  dominios2: 0,
  jogadaExtraUsada: false,
  biomasDominados: new Set(),
  passesConsecutivos: 0,
  jogoEncerrado: false
};

function resetarPontuacao() {
  scoreState.capturas1 = 0;
  scoreState.capturas2 = 0;
  scoreState.bonusAgua1 = 0;
  scoreState.bonusAgua2 = 0;
  scoreState.dominios1 = 0;
  scoreState.dominios2 = 0;
  scoreState.jogadaExtraUsada = false;
  scoreState.biomasDominados.clear();
  scoreState.passesConsecutivos = 0;
  scoreState.jogoEncerrado = false;
  const modalFim = document.getElementById('modal-fim');
  if (modalFim) modalFim.classList.add('hidden');
}

function avaliarBonusHidrico(vx, vy, mapa) {
  if (!mapa || !Array.isArray(mapa.rios)) return null;
  const vizinhos = [[vx, vy - 1], [vx, vy + 1], [vx - 1, vy], [vx + 1, vy]];
  let melhor = null;

  const registrar = (candidato) => {
    if (!melhor || candidato.pts > melhor.pts) melhor = candidato;
  };

  for (const rio of mapa.rios) {
    if (rio.nascente) {
      if (rio.nascente.x === vx && rio.nascente.y === vy) {
        registrar({ pts: 3, label: `💧 Nascente (${rio.nome}): +3 pts` });
      } else if (vizinhos.some(([nx, ny]) => nx === rio.nascente.x && ny === rio.nascente.y)) {
        registrar({ pts: 2, label: `💧 Margem da Nascente (${rio.nome}): +2 pts` });
      }
    }
    if (Array.isArray(rio.vertices)) {
      if (rio.vertices.some(([rx, ry]) => rx === vx && ry === vy)) {
        registrar({ pts: 2, label: `🌊 Rio (${rio.nome}): +2 pts` });
      } else if (rio.vertices.some(([rx, ry]) => vizinhos.some(([nx, ny]) => nx === rx && ny === ry))) {
        registrar({ pts: 1, label: `🌊 Margem do Rio (${rio.nome}): +1 pt` });
      }
    }
  }
  return melhor;
}

function contarPecasEquipeNoBioma(board, rows, cols, biomaAlvo, equipe) {
  if (!biomaAlvo || biomaAlvo === "Oceano" || typeof getBiomaNoVertice !== 'function') return 0;
  let total = 0;
  for (let y = 1; y < rows; y++) {
    const linha = board.at(y);
    if (!linha) continue;
    for (let x = 1; x < cols; x++) {
      const cel = linha.at(x);
      if (cel && cel.equipe === equipe && getBiomaNoVertice(x, y) === biomaAlvo) {
        total++;
      }
    }
  }
  return total;
}

function processarJogadaPontuacao(dados) {
  scoreState.passesConsecutivos = 0;

  const hidrico = avaliarBonusHidrico(dados.vx, dados.vy, dados.mapa);
  const bonusAgua = hidrico ? hidrico.pts : 0;
  const pontosJogada = dados.captured + bonusAgua;

  if (dados.equipe === 1) {
    scoreState.capturas1 += dados.captured;
    scoreState.bonusAgua1 += bonusAgua;
  } else {
    scoreState.capturas2 += dados.captured;
    scoreState.bonusAgua2 += bonusAgua;
  }

  const biomaAtual = typeof getBiomaNoVertice === 'function' ? getBiomaNoVertice(dados.vx, dados.vy) : "";
  const qtdNoBioma = contarPecasEquipeNoBioma(dados.board, dados.rows, dados.cols, biomaAtual, dados.equipe);
  const chaveMarco = `${dados.equipe}-${biomaAtual}-${qtdNoBioma}`;
  let ganhouJogadaExtra = false;

  if (qtdNoBioma > 0 && qtdNoBioma % 5 === 0 && !scoreState.biomasDominados.has(chaveMarco) && !scoreState.jogadaExtraUsada) {
    scoreState.biomasDominados.add(chaveMarco);
    scoreState.jogadaExtraUsada = true;
    ganhouJogadaExtra = true;
    if (dados.equipe === 1) scoreState.dominios1++;
    else scoreState.dominios2++;
  } else {
    scoreState.jogadaExtraUsada = false;
  }

  const avisos = [];
  if (dados.captured) avisos.push(`Captura! +${dados.captured} pt(s)`);
  if (hidrico) avisos.push(hidrico.label);
  if (ganhouJogadaExtra) {
    avisos.push(`🌿 DOMÍNIO DE BIOMA (${biomaAtual}: ${qtdNoBioma} peças) — JOGADA EXTRA para ${dados.jogadorNome}!`);
  }

  return {
    pontosJogada,
    ganhouJogadaExtra,
    mensagem: avisos.join(" | ")
  };
}

function registrarPasseETestarFim(board, rows, cols) {
  const totalJogadores = typeof getTotalJogadores === 'function' ? getTotalJogadores() : 2;
  scoreState.passesConsecutivos++;
  scoreState.jogadaExtraUsada = false;

  if (scoreState.passesConsecutivos >= totalJogadores) {
    finalizarPartidaETabela(board, rows, cols);
    return { encerrou: true };
  }

  return {
    encerrou: false,
    passes: scoreState.passesConsecutivos,
    totalJogadores
  };
}

function finalizarPartidaETabela(board, rows, cols) {
  scoreState.jogoEncerrado = true;

  let pecas1 = 0;
  let pecas2 = 0;
  for (let y = 1; y < rows; y++) {
    const linha = board.at(y);
    if (!linha) continue;
    for (let x = 1; x < cols; x++) {
      const cel = linha.at(x);
      if (cel && cel.equipe === 1) pecas1++;
      if (cel && cel.equipe === 2) pecas2++;
    }
  }

  const bonusDom1 = scoreState.dominios1 * 2;
  const bonusDom2 = scoreState.dominios2 * 2;

  const total1 = pecas1 + scoreState.capturas1 + scoreState.bonusAgua1 + bonusDom1;
  const total2 = pecas2 + scoreState.capturas2 + scoreState.bonusAgua2 + bonusDom2;

  document.getElementById('c1').textContent = total1;
  document.getElementById('c2').textContent = total2;

  const banner = document.getElementById('vencedor-banner');
  if (total1 > total2) {
    banner.textContent = `🏆 Vitória dos ● Defensores (${total1} a ${total2} pts)!`;
  } else if (total2 > total1) {
    banner.textContent = `🏆 Vitória da ▲ Expansão (${total2} a ${total1} pts)!`;
  } else {
    banner.textContent = `🤝 Empate Técnico (${total1} a ${total2} pts)!`;
  }

  const corpo = document.getElementById('tabela-fim-corpo');
  corpo.innerHTML = `
    <tr>
      <td>Peças Vivas no Mapa (+1 pt/peça)</td>
      <td>${pecas1} pts</td>
      <td>${pecas2} pts</td>
    </tr>
    <tr>
      <td>Peças Capturadas</td>
      <td>+${scoreState.capturas1} pts</td>
      <td>+${scoreState.capturas2} pts</td>
    </tr>
    <tr>
      <td>💧 Bônus de Rios e Nascentes</td>
      <td>+${scoreState.bonusAgua1} pts</td>
      <td>+${scoreState.bonusAgua2} pts</td>
    </tr>
    <tr>
      <td>🌿 Bônus Domínio de Bioma (+2 pts/marco)</td>
      <td>+${bonusDom1} pts (${scoreState.dominios1}x)</td>
      <td>+${bonusDom2} pts (${scoreState.dominios2}x)</td>
    </tr>
    <tr class="total-row">
      <td>PONTUAÇÃO TOTAL</td>
      <td>${total1} pts</td>
      <td>${total2} pts</td>
    </tr>
  `;

  const modalFim = document.getElementById('modal-fim');
  if (modalFim) modalFim.classList.remove('hidden');
}
