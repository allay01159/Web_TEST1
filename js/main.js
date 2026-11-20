'use strict';

window.NoirCircus = window.NoirCircus || {};

(function (NC) {
  const $ = (id) => document.getElementById(id);
  const PI = Math.PI;
  const { CONFIG, solid, cell, cx, cz, clamp, lerp, generator } = NC;

  const sound = new NC.SoundEngine();
  const view = $('view');
  const engine = new NC.Engine3D(view);
  const world = new NC.TheatreWorld(engine);

  // Preload poster silhouette image (with data URI fallback)
  const posterClownImg = new Image();
  posterClownImg.onload = () => drawPoster();
  posterClownImg.onerror = () => {
    if (posterClownImg.src !== NC.CLOWN_DATA_URI) {
      posterClownImg.src = NC.CLOWN_DATA_URI;
    }
  };
  posterClownImg.src = 'assets/clown.png';

  const ink = '#181818';
  const paper = '#dedcd2';

  function drawPoster() {
    const c = $('poster');
    if (!c || c.hidden) return;
    const w = c.clientWidth || 960;
    const h = c.clientHeight || 540;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = w * dpr;
    c.height = h * dpr;

    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    g.fillStyle = paper;
    g.fillRect(0, 0, w, h);

    const small = w < 720;
    const cxPos = w * (small ? 0.72 : 0.76);
    const cyPos = h * (small ? 0.30 : 0.50);
    const radius = Math.min(w * (small ? 0.24 : 0.21), h * 0.38);

    g.save();
    g.translate(cxPos, cyPos);

    // Art-deco theatrical sunbeams around the spotlight medallion
    for (let i = 0; i < 84; i++) {
      const a = (i * PI) / 42;
      const len = i % 2 === 0 ? radius * 0.22 : radius * 0.12;
      g.beginPath();
      g.moveTo(Math.cos(a) * (radius + 2), Math.sin(a) * (radius + 2));
      g.lineTo(Math.cos(a) * (radius + len), Math.sin(a) * (radius + len));
      g.strokeStyle = i % 2 === 0 ? '#6e6c64' : '#96948b';
      g.lineWidth = i % 2 === 0 ? 1.1 : 0.7;
      g.stroke();
    }

    // Double medallion ring
    g.beginPath();
    g.arc(0, 0, radius, 0, PI * 2);
    g.fillStyle = '#ebe9df';
    g.fill();
    g.lineWidth = 2.5;
    g.strokeStyle = '#3c3b37';
    g.stroke();

    g.beginPath();
    g.arc(0, 0, radius - 7, 0, PI * 2);
    g.lineWidth = 1;
    g.strokeStyle = '#77756d';
    g.stroke();

    // Clip to inner spotlight circle and draw user's custom entity silhouette
    g.save();
    g.beginPath();
    g.arc(0, 0, radius - 9, 0, PI * 2);
    g.clip();

    if (posterClownImg.complete && posterClownImg.naturalWidth > 0) {
      const aspect = posterClownImg.naturalWidth / posterClownImg.naturalHeight;
      const drawH = radius * 1.92;
      const drawW = drawH * aspect;
      g.drawImage(posterClownImg, -drawW / 2, -drawH * 0.44, drawW, drawH);
    }
    g.restore();
    g.restore();

    // Vintage film grain & frame border
    const r = generator(16);
    for (let i = 0; i < w * h * 0.04; i++) {
      g.fillStyle = r() > 0.5 ? 'rgba(20,20,20,0.08)' : 'rgba(255,255,255,0.28)';
      g.fillRect(r() * w, r() * h, r() * 1.8 + 0.4, 1);
    }

    g.strokeStyle = '#696860';
    g.lineWidth = 1.5;
    g.strokeRect(10, 10, w - 20, h - 20);
    g.strokeRect(14, 14, w - 28, h - 28);

    for (const x of [22, w - 22]) {
      for (const y of [22, h - 22]) {
        g.beginPath();
        g.arc(x, y, 2.5, 0, PI * 2);
        g.fillStyle = ink;
        g.fill();
      }
    }
  }

  new ResizeObserver(drawPoster).observe($('poster'));

  // Game State
  let mode = 'cover';
  let player = null;
  let enemy = null;
  let tickets = [];
  let found = [];
  let seen = new Set();
  let elapsed = 0;
  let cool = 0;
  let lure = null;
  let msg = '';
  let msgTill = 0;
  let stepPhase = 0;
  let stepClock = 0;
  let enemyStepTimer = 0;
  let heartTimer = 0;
  let hidingSpot = null; // null or hidingSpot index (0..5)
  let hideBlend = 0; // 0 = outside, 1 = inside shelter
  let peekYaw = 0;
  let hideEnterTime = 0;
  let hideSearchTimer = 0;
  let hideOpen = CONFIG.hidingSpots.map(() => 1);
  let exitUnlocked = false;
  let exitOpenAngle = 0;
  let winSequenceTimer = 0;
  let dragX = null;
  const keys = new Set();

  function tell(text, duration = 3.2) {
    msg = text;
    msgTill = elapsed + duration;
  }

  const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t) % 60).padStart(2, '0')}`;

  function updateKeyPips() {
    const pips = document.querySelectorAll('#keyPips .pip');
    pips.forEach((el, seatIdx) => {
      const spotIdx = CONFIG.order.indexOf(seatIdx);
      if (found[spotIdx]) {
        el.classList.add('collected');
        el.textContent = `${CONFIG.roman[seatIdx]}:${tickets[spotIdx]}`;
      } else {
        el.classList.remove('collected');
        el.textContent = CONFIG.roman[seatIdx];
      }
    });
  }

  function reset() {
    player = {
      x: 6.5,
      z: 14.25,
      a: -PI / 2,
      energy: 1.0
    };
    enemy = {
      x: 10.5,
      z: 2.5,
      target: null,
      goal: 0,
      aggro: 0,
      last: cell(10.5, 2.5),
      route: [],
      think: 0
    };

    tickets = CONFIG.spots.map(() => Math.floor(Math.random() * 10));
    found = CONFIG.spots.map(() => false);
    seen = new Set();
    elapsed = 0;
    cool = 0;
    lure = null;
    stepPhase = 0;
    stepClock = 0;
    enemyStepTimer = 0;
    heartTimer = 0;
    hidingSpot = null;
    hideBlend = 0;
    peekYaw = 0;
    hideEnterTime = 0;
    hideSearchTimer = 0;
    hideOpen = CONFIG.hidingSpots.map(() => 1);
    exitUnlocked = false;
    exitOpenAngle = 0;
    winSequenceTimer = 0;

    world.syncTicketDigits(tickets);
    world.updateKeypadTexture(found, false);
    updateKeyPips();

    sound.init();
    $('cover').hidden = true;
    $('poster').hidden = true;
    view.hidden = false;
    $('hud').hidden = false;
    $('vignette').hidden = false;
    $('meters').hidden = false;
    $('hideOverlay').hidden = true;
    $('vignette').classList.remove('danger');
    document.body.classList.add('play');

    resume();
    tell('M으로 수첩 지도 확인 · 벽면의 커튼 부스/옷장에서 E로 숨을 수 있습니다.', 5.5);
  }

  function resume() {
    mode = 'play';
    $('modal').hidden = true;
    $('hint').hidden = false;
    keys.clear();
    view.focus();
  }

  function title() {
    mode = 'cover';
    keys.clear();
    hidingSpot = null;
    document.body.classList.remove('play');
    $('cover').hidden = false;
    $('poster').hidden = false;
    for (const el of [view, $('hud'), $('hint'), $('modal'), $('vignette'), $('meters'), $('hideOverlay')]) {
      el.hidden = true;
    }
    drawPoster();
  }

  function dialog(state, titleText, html, buttons) {
    mode = state;
    keys.clear();
    dragX = null;
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    $('hint').hidden = true;
    $('modal').hidden = false;
    $('mt').textContent = titleText;
    $('body').innerHTML = html;
    $('buttons').replaceChildren();

    for (const [label, fn] of buttons) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = label;
      b.onclick = fn;
      $('buttons').append(b);
    }
    if ($('buttons').firstChild) {
      $('buttons').firstChild.focus();
    }
  }

  function guide() {
    dialog(
      'guide',
      '공연 안내',
      `<p>네 개의 방(분장실·영사실·소품실·대기실)에서 열쇠를 회수하세요. 열쇠에 붙은 입장권 숫자를 <b>좌석 Ⅰ → Ⅳ</b> 순서대로 조합하면 <b>3D 비상 출구</b>가 열립니다.</p>
       <p><b>3D 은신처 활용:</b> 복도의 <b>벨벳 커튼 부스</b>와 <b>분장실 옷장</b> 앞에서 <b>E</b>를 누르면 안으로 숨어 문을 닫고 틈새로 밖을 살필 수 있습니다.</p>
       <p><b>WASD</b> 이동 · <b>← → / 마우스</b> 시점 · <b>Shift</b> 질주 · <b>E</b> 조사/숨기 · <b>Q</b> 태엽 인형 · <b>M</b> 수첩 · <b>Esc</b> 일시정지</p>`,
      [
        ['입장하기', reset],
        ['뒤로', title]
      ]
    );
  }

  function pause() {
    dialog(
      'pause',
      '잠시 휴막',
      '<p>공연이 일시정지되었습니다.</p>',
      [
        ['계속하기', resume],
        ['처음 화면', title]
      ]
    );
  }

  function notesHtml() {
    return (
      '<div class="tickets">' +
      CONFIG.roman
        .map((r, seatIdx) => {
          const spotIdx = CONFIG.order.indexOf(seatIdx);
          const isFound = found[spotIdx];
          return `<span class="ticket ${isFound ? 'found' : ''}">${r}석 &nbsp;${isFound ? tickets[spotIdx] : '?'}</span>`;
        })
        .join('') +
      '</div>'
    );
  }

  function journal() {
    dialog(
      'journal',
      '공연장 수첩',
      `<canvas id="map" class="map" width="380" height="190"></canvas>
       <div class="legend">
         <span>● 내 위치</span>
         <span>◆ 열쇠</span>
         <span>⌂ 은신처</span>
         <span>□ 3D 출구</span>
       </div>
       ${notesHtml()}
       <p>입장권 숫자를 좌석 Ⅰ → Ⅳ 순서로 읽으세요.</p>`,
      [['접기', resume]]
    );

    const q = $('map').getContext('2d');
    q.fillStyle = '#1d1d1f';
    q.fillRect(0, 0, 380, 190);
    const z = 10.5;
    const ox = 100;
    const oy = 6;
    const N = CONFIG.N;

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (!CONFIG.grid[y][x]) {
          q.fillStyle = seen.has(cell(x, y)) ? '#d5d4ce' : '#63635e';
          q.fillRect(ox + x * z, oy + y * z, z, z);
        }
      }
    }

    // Draw Hiding Spots on Minimap
    q.fillStyle = '#9aa8b8';
    q.font = '10px monospace';
    q.textAlign = 'center';
    for (const hs of CONFIG.hidingSpots) {
      q.fillText('⌂', ox + hs.x * z, oy + hs.z * z + 3);
    }

    // Draw Keys & Room Names
    CONFIG.spots.forEach((s, i) => {
      q.fillStyle = '#ffffff';
      if (!found[i]) {
        q.font = '12px sans-serif';
        q.textAlign = 'center';
        q.fillText('◆', ox + s.x * z, oy + s.z * z + 4);
      }
      q.font = '10px sans-serif';
      q.textAlign = s.x < 8 ? 'right' : 'left';
      q.fillText(s.name, s.x < 8 ? ox - 5 : ox + N * z + 5, oy + s.z * z + 4);
    });

    // Draw 3D EXIT Marker
    q.strokeStyle = '#ffffff';
    q.lineWidth = 1.5;
    q.strokeRect(ox + CONFIG.exit.x * z - 4.5, oy + CONFIG.exit.z * z - 4.5, 9, 9);

    // Draw Player Position & Facing Direction
    const px = ox + player.x * z;
    const pz = oy + player.z * z;
    q.strokeStyle = '#111111';
    q.lineWidth = 2;
    q.beginPath();
    q.moveTo(px, pz);
    q.lineTo(px + Math.cos(player.a) * 8, pz + Math.sin(player.a) * 8);
    q.stroke();

    q.fillStyle = '#111111';
    q.beginPath();
    q.arc(px, pz, 3.6, 0, PI * 2);
    q.fill();
    q.strokeStyle = '#ffffff';
    q.lineWidth = 1;
    q.stroke();
  }

  function findInteractable() {
    if (hidingSpot !== null) {
      return { kind: 'exitHide', id: hidingSpot };
    }

    // Check 4 room keys
    for (let i = 0; i < 4; i++) {
      if (!found[i]) {
        const s = CONFIG.spots[i];
        if (Math.hypot(player.x - s.x, player.z - s.z) < 1.15) {
          return { kind: 'key', id: i };
        }
      }
    }

    // Check 3D EXIT
    if (Math.hypot(player.x - CONFIG.exit.x, player.z - CONFIG.exit.z) < 1.25) {
      return { kind: 'exit' };
    }

    // Check 6 3D Hiding Spots
    let bestSpot = null;
    let bestDist = 1.18;
    for (const hs of CONFIG.hidingSpots) {
      const d = Math.hypot(player.x - hs.entryX, player.z - hs.entryZ);
      if (d < bestDist) {
        bestDist = d;
        bestSpot = hs;
      }
    }
    if (bestSpot) {
      return { kind: 'hide', spot: bestSpot };
    }

    return null;
  }

  function enterHiding(spot) {
    hidingSpot = spot.id;
    hideEnterTime = elapsed;
    peekYaw = 0;

    // Clear movement keys so holding W while entering never ejects the player immediately
    keys.delete('KeyW');
    keys.delete('ArrowUp');
    keys.delete('KeyS');
    keys.delete('ArrowDown');

    // Break line-of-sight immediately so the monster loses track and searches briefly before leaving
    if (enemy.aggro > 0) {
      enemy.aggro = 0;
      hideSearchTimer = 1.6;
      enemy.last = cell(spot.entryX, spot.entryZ);
      enemy.think = 0;
    } else {
      hideSearchTimer = 0;
    }

    sound.playHide(true, spot.type);
    $('hideOverlay').hidden = false;
    tell(`${spot.name}에 몸을 숨겼다. [E] 또는 [S]로 나올 수 있다.`, 3.2);
  }

  function leaveHiding() {
    if (hidingSpot === null) return;
    const spot = CONFIG.hidingSpots[hidingSpot];
    player.x = spot.entryX;
    player.z = spot.entryZ;
    player.a = spot.yaw;
    hidingSpot = null;
    peekYaw = 0;
    hideSearchTimer = 0;
    keys.delete('KeyW');
    keys.delete('ArrowUp');
    keys.delete('KeyS');
    keys.delete('ArrowDown');
    sound.playHide(false, spot.type);
    $('hideOverlay').hidden = true;
  }

  function use() {
    if (mode !== 'play') return;
    const target = findInteractable();
    if (!target) return;

    if (target.kind === 'exitHide') {
      leaveHiding();
      return;
    }

    if (target.kind === 'hide') {
      enterHiding(target.spot);
      return;
    }

    if (target.kind === 'key') {
      const i = target.id;
      found[i] = true;
      sound.playKeyPickup();
      updateKeyPips();
      world.updateKeypadTexture(found, false);
      tell(`${CONFIG.spots[i].name} 열쇠 획득 · ${CONFIG.roman[CONFIG.order[i]]}석 숫자: ${tickets[i]}`, 4.2);
      return;
    }

    if (target.kind === 'exit') {
      if (exitUnlocked) return;
      if (!found.every(Boolean)) {
        const left = found.filter((x) => !x).length;
        tell(`3D 비상 출구가 잠겨 있다. 남은 열쇠 ${left}개`, 2.8);
        return;
      }

      dialog(
        'code',
        '마지막 검표 · EXIT LOCK',
        `${notesHtml()}
         <p>좌석 Ⅰ부터 Ⅳ까지, 네 자리 출구 암호를 입력하세요.</p>
         <input id="codeInput" aria-label="네 자리 암호" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="••••">
         <p id="error" role="status"></p>`,
        [
          ['잠금 해제', checkCode],
          ['돌아가기', resume]
        ]
      );
      $('codeInput').focus();
    }
  }

  function checkCode() {
    const expected = CONFIG.roman.map((_, seatIdx) => tickets[CONFIG.order.indexOf(seatIdx)]).join('');
    if ($('codeInput').value !== expected) {
      $('error').textContent = '잠금쇠가 맞물리지 않는다. 수첩의 좌석 순서를 확인하자.';
      $('codeInput').select();
      return;
    }

    exitUnlocked = true;
    world.updateKeypadTexture(found, true);
    sound.playUnlock();
    resume();
    tell('3D 비상 출구의 자물쇠가 풀렸다! 문이 열린다...', 3.5);
  }

  function toy() {
    if (mode !== 'play') return;
    if (hidingSpot !== null) {
      tell('은신처 안에서는 태엽 인형을 놓을 수 없다.', 1.8);
      return;
    }
    if (cool > 0) {
      tell(`태엽을 다시 감는 중 · ${Math.ceil(cool)}초`, 1.4);
      return;
    }
    cool = CONFIG.toyCooldown;
    lure = {
      x: Math.floor(player.x) + 0.5,
      z: Math.floor(player.z) + 0.5,
      until: elapsed + CONFIG.toyDuration
    };
    enemy.think = 0;
    sound.playToyMelody();
    tell('태엽 인형이 오르골 소리로 6초 동안 검은 광대를 유인한다.', 3.2);
  }

  function findPath(start, end) {
    const N = CONFIG.N;
    const back = new Map([[start, -1]]);
    const q = [start];
    for (let i = 0; i < q.length && !back.has(end); i++) {
      for (const [dx, dz] of CONFIG.dirs) {
        const n = q[i] + dx + dz * N;
        if (!back.has(n) && !solid(cx(n), cz(n))) {
          back.set(n, q[i]);
          q.push(n);
        }
      }
    }
    const out = [];
    if (back.has(end)) {
      for (let n = end; n !== start; n = back.get(n)) {
        out.push(n);
      }
    }
    return out.reverse();
  }

  function visible(a, b) {
    const d = Math.hypot(a.x - b.x, a.z - b.z);
    const steps = Math.ceil(d * 7);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (solid(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) {
        return false;
      }
    }
    return true;
  }

  function moveEntity(obj, dx, dz) {
    const r = CONFIG.playerRadius;
    if (!solid(obj.x + dx + Math.sign(dx) * r, obj.z - r) &&
        !solid(obj.x + dx + Math.sign(dx) * r, obj.z + r)) {
      obj.x += dx;
    }
    if (!solid(obj.x - r, obj.z + dz + Math.sign(dz) * r) &&
        !solid(obj.x + r, obj.z + dz + Math.sign(dz) * r)) {
      obj.z += dz;
    }
  }

  function finishWin() {
    let best = elapsed;
    try {
      const old = Number(localStorage.getItem('noir-circus-3d-best'));
      best = old > 0 ? Math.min(old, elapsed) : elapsed;
      localStorage.setItem('noir-circus-3d-best', String(best));
    } catch (e) {}

    dialog(
      'win',
      '커튼콜 · CURTAIN CALL',
      `<p>육중한 3D 극장 문이 열리고 눈부신 백색 빛이 쏟아졌다. 문밖으로 나서자 텅 빈 객석에서 단 한 사람의 느린 박수 소리가 울렸다.</p>
       <p><b>탈출 시간 ${fmt(elapsed)} &nbsp;·&nbsp; 최고 기록 ${fmt(best)}</b></p>`,
      [
        ['다시 공연하기', reset],
        ['처음 화면', title]
      ]
    );
  }

  function update(dt) {
    elapsed += dt;
    cool = Math.max(0, cool - dt);

    // Handle 3D EXIT Door Opening & Win Sequence
    if (exitUnlocked) {
      exitOpenAngle = lerp(exitOpenAngle, 1.42, Math.min(1, dt * 3.2));
      winSequenceTimer += dt;
      if (winSequenceTimer > 1.35) {
        finishWin();
        return;
      }
    }

    // Smoothly animate 3D Hiding Spot curtains & wardrobe doors
    const nearItem = findInteractable();
    for (let i = 0; i < CONFIG.hidingSpots.length; i++) {
      let targetOpen = 1.0;
      if (hidingSpot === i) {
        targetOpen = 0.0; // Closed tight with narrow viewing slit
      } else if (nearItem && nearItem.kind === 'hide' && nearItem.spot.id === i) {
        targetOpen = 1.0; // Invitingly open when standing right in front
      } else {
        targetOpen = 0.78;
      }
      hideOpen[i] = lerp(hideOpen[i], targetOpen, Math.min(1, dt * 7.5));
    }

    // Player Movement vs Hiding State
    if (hidingSpot !== null) {
      const spot = CONFIG.hidingSpots[hidingSpot];
      hideBlend = lerp(hideBlend, 1.0, Math.min(1, dt * 8.0));
      player.x = lerp(player.x, spot.insideX, Math.min(1, dt * 9.0));
      player.z = lerp(player.z, spot.insideZ, Math.min(1, dt * 9.0));

      // Peek left/right inside shelter
      const turnInput = Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft'));
      peekYaw = clamp(peekYaw + turnInput * dt * 1.4, -0.45, 0.45);
      player.a = spot.yaw + peekYaw;

      // Pressing S / Down after a brief settle delay steps back out (E also exits)
      if (elapsed - hideEnterTime > 0.45 && (keys.has('KeyS') || keys.has('ArrowDown'))) {
        leaveHiding();
      }

      // Recover breath faster while hiding
      player.energy = clamp(player.energy + dt * 0.28, 0, 1);
    } else {
      hideBlend = lerp(hideBlend, 0.0, Math.min(1, dt * 8.0));
      player.a += (Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft'))) * dt * 2.15;

      const f = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
      const s = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
      const mag = Math.hypot(f, s);
      const running = mag > 0 && (keys.has('ShiftLeft') || keys.has('ShiftRight')) && player.energy > 0.04;

      if (mag > 0) {
        const speed = ((running ? 3.65 : 2.38) * dt) / mag;
        moveEntity(
          player,
          (Math.cos(player.a) * f - Math.sin(player.a) * s) * speed,
          (Math.sin(player.a) * f + Math.cos(player.a) * s) * speed
        );
        stepPhase += dt * (running ? 12.2 : 8.2);
        if (Math.floor(stepPhase / PI) !== stepClock) {
          stepClock = Math.floor(stepPhase / PI);
          sound.playFootstep(running);
        }
      }

      player.energy = clamp(player.energy + dt * (running ? -0.24 : 0.17), 0, 1);
    }

    seen.add(cell(player.x, player.z));

    // Clockwork lure expiration
    if (lure && elapsed >= lure.until) {
      lure = null;
    }

    // Black Clown AI & Line of Sight
    const dist = Math.hypot(player.x - enemy.x, player.z - enemy.z);
    const canSeePlayer = hidingSpot === null && dist < 7.2 && visible(enemy, player);

    const prevAggro = enemy.aggro;
    enemy.aggro = Math.max(0, enemy.aggro - dt);
    hideSearchTimer = Math.max(0, hideSearchTimer - dt);

    if (canSeePlayer && !lure) {
      if (prevAggro <= 0.1 && elapsed > 2.5) {
        sound.playSpotted();
      }
      enemy.aggro = 3.2;
      enemy.last = cell(player.x, player.z);
    }

    // If player is safely hidden and monster arrives at the hiding spot area, make it give up & walk away
    if (hidingSpot !== null && dist < 1.25 && hideSearchTimer > 0) {
      hideSearchTimer = 0;
      enemy.aggro = 0;
      // Pick the patrol waypoint farthest from the hiding spot so the monster leaves
      let bestGoal = 0;
      let maxD = -1;
      CONFIG.patrolCells.forEach((pc, idx) => {
        const d = Math.hypot(cx(pc) - player.x, cz(pc) - player.z);
        if (d > maxD) {
          maxD = d;
          bestGoal = idx;
        }
      });
      enemy.goal = bestGoal;
      enemy.think = 0;
    }

    enemy.think -= dt;
    if (enemy.think <= 0) {
      enemy.think = 0.24;
      const pos = cell(enemy.x, enemy.z);
      if (pos === CONFIG.patrolCells[enemy.goal]) {
        enemy.goal = (enemy.goal + 1) % CONFIG.patrolCells.length;
      }
      const targetCell = lure
        ? cell(lure.x, lure.z)
        : (enemy.aggro > 0 || hideSearchTimer > 0)
          ? enemy.last
          : CONFIG.patrolCells[enemy.goal];

      if (enemy.target !== targetCell || enemy.route.length === 0) {
        enemy.route = findPath(pos, targetCell);
        enemy.target = targetCell;
      }
    }

    const node = enemy.route[0];
    let tx = node === undefined ? cx(enemy.target) : cx(node);
    let tz = node === undefined ? cz(enemy.target) : cz(node);

    if (!lure && canSeePlayer && cell(enemy.x, enemy.z) === cell(player.x, player.z)) {
      tx = player.x;
      tz = player.z;
    }

    const dx = tx - enemy.x;
    const dz = tz - enemy.z;
    const len = Math.hypot(dx, dz);
    const spd = lure ? 2.2 : enemy.aggro > 0 ? 2.02 : 1.12;

    if (len > 0.035) {
      const k = Math.min(1, (spd * dt) / len);
      moveEntity(enemy, dx * k, dz * k);
    } else if (node !== undefined) {
      enemy.route.shift();
    }

    // Enemy footsteps & tense heartbeat
    enemyStepTimer -= dt;
    if (dist < 8.0 && enemyStepTimer <= 0) {
      enemyStepTimer = enemy.aggro > 0 ? 0.42 : 0.72;
      sound.playEnemyStep(dist, enemy.aggro > 0);
    }

    heartTimer -= dt;
    if (dist < 5.5 && heartTimer <= 0) {
      const intensity = 1 - dist / 5.5;
      heartTimer = lerp(0.95, 0.42, intensity);
      sound.playHeartbeat(intensity);
    }

    // Danger Vignette
    if (enemy.aggro > 0 || dist < 4.2) {
      $('vignette').classList.add('danger');
    } else {
      $('vignette').classList.remove('danger');
    }

    // Capture check (completely safe while inside a hiding spot!)
    if (hidingSpot === null && dist < 0.48 && elapsed > 3.0 && !exitUnlocked) {
      sound.playCapture();
      dialog(
        'lost',
        '공연은 끝났다',
        `<p>어둠 속에서 솟아오른 검은 형체가 당신의 자리를 찾아냈다.</p>
         <p>회수한 열쇠 <b>${found.filter(Boolean).length} / 4</b> &nbsp;·&nbsp; 생존 시간 <b>${fmt(elapsed)}</b></p>
         <p>발소리가 들리면 복도의 <b>벨벳 커튼 부스</b>나 <b>분장실 옷장</b>에 [E]로 숨거나, [Q]로 태엽 인형을 놓으세요.</p>`,
        [
          ['다시 입장', reset],
          ['처음 화면', title]
        ]
      );
    }
  }

  function renderFrame() {
    const bob = hidingSpot === null ? Math.sin(stepPhase) * 0.022 : Math.sin(elapsed * 2.1) * 0.006;
    const eyeY = CONFIG.playerEyeHeight + bob - hideBlend * 0.06;
    const fx = Math.cos(player.a);
    const fz = Math.sin(player.a);

    const camera = {
      eye: [player.x, eyeY, player.z],
      target: [player.x + fx, eyeY - 0.02, player.z + fz],
      forward: [fx, -0.02, fz],
      fov: hidingSpot !== null ? 0.96 : 1.12,
      flashlight: hidingSpot !== null ? 0.55 : 1.0
    };

    world.render({
      player,
      enemy,
      found,
      lure,
      elapsed,
      camera,
      hideOpen,
      hidingSpot,
      exitUnlocked,
      exitOpenAngle
    });

    // Update HUD text & bars
    const count = found.filter(Boolean).length;
    $('status').textContent = `열쇠 ${count}/4  ·  ${fmt(elapsed)}`;
    $('energyBar').style.width = `${Math.round(player.energy * 100)}%`;
    const toyReady = cool <= 0 ? 1 : 1 - cool / CONFIG.toyCooldown;
    $('toyBar').style.width = `${Math.round(toyReady * 100)}%`;

    const near = findInteractable();
    const hintEl = $('hint');
    let promptText = '';
    let isInteractive = false;

    if (elapsed < msgTill) {
      promptText = msg;
    } else if (hidingSpot !== null) {
      isInteractive = true;
      const distToEnemy = Math.hypot(player.x - enemy.x, player.z - enemy.z);
      promptText = distToEnemy < 5.5
        ? `숨을 죽였다… 발소리가 지나가길 기다리세요 · [E] 또는 [S] 나가기`
        : `[E] 또는 [S] ${CONFIG.hidingSpots[hidingSpot].name}에서 나오기`;
    } else if (near) {
      isInteractive = true;
      if (near.kind === 'exitHide') {
        promptText = `[E] ${CONFIG.hidingSpots[near.id].name}에서 나오기`;
      } else if (near.kind === 'hide') {
        promptText = `[E] ${near.spot.name}에 숨기`;
      } else if (near.kind === 'key') {
        promptText = `[E] ${CONFIG.spots[near.id].name} 열쇠 조사`;
      } else if (near.kind === 'exit') {
        promptText = found.every(Boolean)
          ? '[E] 3D 비상 출구 암호 입력'
          : `[E] 3D 비상 출구 (열쇠 ${4 - count}개 더 필요)`;
      }
    } else if (lure) {
      promptText = '♪ 태엽 인형이 검은 광대를 유인하는 중…';
    } else if (enemy.aggro > 0) {
      promptText = '발각되었다! 은신처에 숨거나 모퉁이를 돌아 태엽 인형 [Q] 사용';
    } else if (Math.hypot(player.x - enemy.x, player.z - enemy.z) < 6.2) {
      promptText = '가까운 어둠 속에서 무거운 발소리가 울린다…';
    } else if (count === 4) {
      promptText = '모든 열쇠를 모았다! 남쪽 회랑의 3D EXIT 출구로 향하세요';
    } else {
      promptText = `E 조사/숨기 · Q 태엽 ${cool > 0 ? Math.ceil(cool) + '초' : '준비'} · M 수첩`;
    }

    hintEl.textContent = promptText;
    hintEl.classList.toggle('interactive', isInteractive);
  }

  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    if (mode === 'play') {
      update(dt);
      if (mode === 'play') {
        renderFrame();
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // UI Event Bindings
  $('sound').onclick = () => {
    const muted = sound.toggleMute();
    $('sound').textContent = muted ? '소리 꺼짐 ×' : '소리 켜짐 ♪';
  };
  $('start').onclick = reset;
  $('guide').onclick = guide;
  $('journal').onclick = () => {
    if (mode === 'play') journal();
  };
  $('pause').onclick = () => {
    if (mode === 'play') pause();
  };
  $('use').onclick = use;
  $('wind').onclick = toy;

  document.addEventListener('keydown', (ev) => {
    const k = ev.code;
    if (mode === 'code' && k === 'Enter' && document.activeElement === $('codeInput')) {
      ev.preventDefault();
      checkCode();
      return;
    }
    if (k === 'Escape') {
      if (mode === 'play') pause();
      else if (['pause', 'journal', 'code'].includes(mode)) resume();
      else if (mode === 'guide') title();
      return;
    }
    if (mode === 'journal' && k === 'KeyM' && !ev.repeat) {
      resume();
      return;
    }
    if (mode !== 'play') return;

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(k)) {
      ev.preventDefault();
    }
    keys.add(k);
    if (ev.repeat) return;

    if (k === 'KeyM') journal();
    if (k === 'KeyE') use();
    if (k === 'KeyQ') toy();
  });

  document.addEventListener('keyup', (ev) => keys.delete(ev.code));
  window.addEventListener('blur', () => {
    if (mode === 'play') pause();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && mode === 'play') pause();
  });

  // Mouse Pointer Lock & Touch Drag Look
  view.addEventListener('pointerdown', (ev) => {
    if (mode !== 'play') return;
    dragX = ev.clientX;
    view.setPointerCapture(ev.pointerId);
    if (ev.pointerType === 'mouse' && view.requestPointerLock) {
      try {
        view.requestPointerLock()?.catch(() => {});
      } catch (e) {}
    }
  });

  document.addEventListener('mousemove', (ev) => {
    if (mode === 'play' && document.pointerLockElement === view) {
      if (hidingSpot !== null) {
        peekYaw = clamp(peekYaw + ev.movementX * 0.0025, -0.45, 0.45);
      } else {
        player.a += ev.movementX * 0.003;
      }
    }
  });

  view.addEventListener('pointermove', (ev) => {
    if (mode === 'play' && dragX !== null && !document.pointerLockElement) {
      const delta = (ev.clientX - dragX) * 0.0085;
      if (hidingSpot !== null) {
        peekYaw = clamp(peekYaw + delta, -0.45, 0.45);
      } else {
        player.a += delta;
      }
      dragX = ev.clientX;
    }
  });

  for (const evt of ['pointerup', 'pointercancel']) {
    view.addEventListener(evt, () => {
      dragX = null;
    });
  }

  document.querySelectorAll('[data-key]').forEach((btn) => {
    btn.onpointerdown = (ev) => {
      ev.preventDefault();
      btn.setPointerCapture(ev.pointerId);
      keys.add(btn.dataset.key);
    };
    btn.onlostpointercapture = () => keys.delete(btn.dataset.key);
  });

  // Initial poster draw
  drawPoster();
})(window.NoirCircus);
