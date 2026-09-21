(function () {
  // === SYNTHESIZED 8-BIT AUDIO SYSTEM (Web Audio API) ===
  let audioCtx = null;
  let audioMuted = false;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSynthSound(type) {
    if (audioMuted || !audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'laser') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'explosion') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'powerup') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.setValueAtTime(440, now + 0.05);
        osc.frequency.setValueAtTime(660, now + 0.10);
        osc.frequency.setValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === 'bomb') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.6);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      }
    } catch (e) {}
  }

  // === CANVAS & RETRO SHOOTER ENGINE ===
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // DOM Elements
  const scoreDisplay = document.getElementById('scoreDisplay');
  const highScoreDisplay = document.getElementById('highScoreDisplay');
  const multiplierDisplay = document.getElementById('multiplierDisplay');
  const livesContainer = document.getElementById('livesContainer');
  const gameOverlay = document.getElementById('gameOverlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlaySubtitle = document.getElementById('overlaySubtitle');
  const btnStartGame = document.getElementById('btnStartGame');
  const btnPauseToggle = document.getElementById('btnPauseToggle');
  const pauseIcon = document.getElementById('pauseIcon');
  const btnSoundToggle = document.getElementById('btnSoundToggle');
  const btnRestart = document.getElementById('btnRestart');
  const btnScanlines = document.getElementById('btnScanlines');
  const scanlineOverlay = document.getElementById('scanlineOverlay');

  // Game Engine State
  let gameRunning = false;
  let gamePaused = false;
  let score = 0;
  let highScore = parseInt(localStorage.getItem('nexus_void_hiscore') || '0', 10);
  let multiplier = 1.0;
  let multiplierTimer = 0;
  let lives = 3;
  let animFrameId = null;

  // Render scaling
  let logicalWidth = 800;
  let logicalHeight = 500;
  let scaleX = 1;
  let scaleY = 1;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    logicalWidth = rect.width;
    logicalHeight = rect.height;
    scaleX = dpr;
    scaleY = dpr;
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // High score format
  highScoreDisplay.textContent = String(highScore).padStart(5, '0');

  // Input states
  const keys = {
    ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false,
    KeyA: false, KeyD: false, KeyW: false, KeyS: false,
    Space: false
  };

  // Player Entity
  const player = {
    x: 0,
    y: 0,
    width: 32,
    height: 38,
    speed: 6.5,
    cooldown: 0,
    tripleShotTime: 0,
    bombs: 2,
    shield: false,
    particles: []
  };

  // World Arrays
  let stars = [];
  let projectiles = [];
  let enemyProjectiles = [];
  let enemies = [];
  let powerups = [];
  let explosions = [];
  let floatingTexts = [];

  // Generate 3-layer parallax starfield
  function initStars() {
    stars = [];
    const count = 75;
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * logicalWidth,
        y: Math.random() * logicalHeight,
        speed: 0.5 + Math.random() * 2.5,
        size: 1 + Math.random() * 2,
        color: Math.random() > 0.6 ? '#4cd7f6' : (Math.random() > 0.5 ? '#d0bcff' : '#ffffff')
      });
    }
  }
  initStars();

  function resetGame() {
    score = 0;
    multiplier = 1.0;
    multiplierTimer = 0;
    lives = 3;
    player.x = logicalWidth / 2;
    player.y = logicalHeight - 65;
    player.tripleShotTime = 0;
    player.cooldown = 0;
    projectiles = [];
    enemyProjectiles = [];
    enemies = [];
    powerups = [];
    explosions = [];
    floatingTexts = [];
    updateHUD();
  }

  function updateHUD() {
    scoreDisplay.textContent = String(score).padStart(5, '0');
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('nexus_void_hiscore', String(highScore));
      highScoreDisplay.textContent = String(highScore).padStart(5, '0');
    }
    multiplierDisplay.textContent = 'x' + multiplier.toFixed(1);

    // Update life indicator blocks
    livesContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const bar = document.createElement('div');
      bar.className = 'w-5 h-3 rounded-sm transition-all duration-200 ' +
        (i < lives ? 'bg-primary shadow-[0_0_8px_#4cd7f6]' : 'bg-surface-variant opacity-40');
      livesContainer.appendChild(bar);
    }
  }

  function spawnFloatingText(text, x, y, color) {
    floatingTexts.push({
      text, x, y,
      vy: -1.2,
      alpha: 1.0,
      color: color || '#4cd7f6'
    });
  }

  function spawnExplosion(x, y, color, particleCount) {
    playSynthSound('explosion');
    const count = particleCount || 22;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      explosions.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color: color || (Math.random() > 0.5 ? '#4cd7f6' : '#ffb0cd'),
        life: 1.0,
        decay: 0.02 + Math.random() * 0.03
      });
    }
  }

  function triggerHyperBomb() {
    if (player.bombs <= 0) return;
    player.bombs--;
    playSynthSound('bomb');
    spawnFloatingText('HYPER-BOMB CLEARED SKY!', logicalWidth / 2, logicalHeight / 2, '#ffd9e4');

    // Annihilate active enemies & hostile projectiles
    enemies.forEach(e => {
      score += Math.round(150 * multiplier);
      spawnExplosion(e.x, e.y, '#ff79b4', 18);
    });
    enemies = [];
    enemyProjectiles = [];
    updateHUD();
  }

  // === KEYBOARD LISTENERS ===
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyP') {
      togglePause();
      return;
    }
    if (e.code === 'KeyM') {
      toggleAudio();
      return;
    }
    if (e.code === 'KeyB' && gameRunning && !gamePaused) {
      triggerHyperBomb();
      return;
    }
    if (keys.hasOwnProperty(e.code)) {
      keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code) && document.activeElement === canvas) {
        e.preventDefault();
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) {
      keys[e.code] = false;
    }
  });

  // Touch / Pointer controls on canvas
  let pointerActive = false;
  canvas.addEventListener('pointerdown', (e) => {
    initAudio();
    pointerActive = true;
    const rect = canvas.getBoundingClientRect();
    player.x = e.clientX - rect.left;
    player.y = Math.min(logicalHeight - 30, Math.max(30, e.clientY - rect.top));
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pointerActive) return;
    const rect = canvas.getBoundingClientRect();
    player.x = Math.min(logicalWidth - 20, Math.max(20, e.clientX - rect.left));
    player.y = Math.min(logicalHeight - 30, Math.max(30, e.clientY - rect.top));
  });
  window.addEventListener('pointerup', () => { pointerActive = false; });
  window.addEventListener('pointercancel', () => { pointerActive = false; });

  // Virtual buttons bindings
  function bindVirtualBtn(id, pressAction, releaseAction) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = (e) => {
      e.preventDefault();
      initAudio();
      pressAction();
    };
    const end = (e) => {
      e.preventDefault();
      if (releaseAction) releaseAction();
    };
    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointerleave', end);
  }

  bindVirtualBtn('vbtn-left', () => { keys.ArrowLeft = true; }, () => { keys.ArrowLeft = false; });
  bindVirtualBtn('vbtn-right', () => { keys.ArrowRight = true; }, () => { keys.ArrowRight = false; });
  bindVirtualBtn('vbtn-up', () => { keys.ArrowUp = true; }, () => { keys.ArrowUp = false; });
  bindVirtualBtn('vbtn-down', () => { keys.ArrowDown = true; }, () => { keys.ArrowDown = false; });
  bindVirtualBtn('vbtn-fire', () => { keys.Space = true; }, () => { keys.Space = false; });
  bindVirtualBtn('vbtn-bomb', () => { triggerHyperBomb(); });

  function togglePause() {
    if (!gameRunning) return;
    gamePaused = !gamePaused;
    if (gamePaused) {
      pauseIcon.textContent = 'play_arrow';
      gameOverlay.classList.remove('opacity-0', 'pointer-events-none');
      overlayTitle.textContent = 'SYSTEM SUSPENDED';
      overlaySubtitle.textContent = 'Game loop paused. Hotkey [P] or click below to resume execution.';
      btnStartGame.querySelector('span:last-child').textContent = 'RESUME';
    } else {
      pauseIcon.textContent = 'pause';
      gameOverlay.classList.add('opacity-0', 'pointer-events-none');
      lastTime = performance.now();
      requestAnimationFrame(gameLoop);
    }
  }

  function toggleAudio() {
    audioMuted = !audioMuted;
    btnSoundToggle.querySelector('.material-symbols-outlined').textContent = audioMuted ? 'volume_off' : 'volume_up';
    btnSoundToggle.classList.toggle('text-primary', !audioMuted);
    btnSoundToggle.classList.toggle('text-on-surface-variant', audioMuted);
    if (!audioMuted) initAudio();
  }

  btnPauseToggle.addEventListener('click', togglePause);
  btnSoundToggle.addEventListener('click', toggleAudio);
  btnRestart.addEventListener('click', () => {
    initAudio();
    startGame();
  });
  btnScanlines.addEventListener('click', () => {
    scanlineOverlay.classList.toggle('hidden');
  });

  btnStartGame.addEventListener('click', () => {
    initAudio();
    if (gamePaused) {
      togglePause();
    } else {
      startGame();
    }
  });

  function startGame() {
    resetGame();
    gameRunning = true;
    gamePaused = false;
    pauseIcon.textContent = 'pause';
    gameOverlay.classList.add('opacity-0', 'pointer-events-none');
    lastTime = performance.now();
    cancelAnimationFrame(animFrameId);
    animFrameId = requestAnimationFrame(gameLoop);
  }

  function gameOver() {
    gameRunning = false;
    gameOverlay.classList.remove('opacity-0', 'pointer-events-none');
    overlayTitle.textContent = 'HULL BREACHED';
    overlaySubtitle.textContent = `FINAL SCORE: ${score} // SYSTEM DATA ARCHIVED`;
    btnStartGame.querySelector('span:last-child').textContent = 'RE-ENGAGE SYSTEM';
  }

  // === MAIN 60 FPS ENGINE LOOP ===
  let lastTime = performance.now();
  let enemySpawnTimer = 0;

  function gameLoop(time) {
    if (!gameRunning || gamePaused) return;
    const dt = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    update(dt);
    render();

    animFrameId = requestAnimationFrame(gameLoop);
  }

  function update(dt) {
    // Multiplier decay
    if (multiplier > 1.0) {
      multiplierTimer -= dt;
      if (multiplierTimer <= 0) {
        multiplier = Math.max(1.0, multiplier - 0.2);
        multiplierTimer = 2.0;
        multiplierDisplay.textContent = 'x' + multiplier.toFixed(1);
      }
    }

    // Stars Parallax update
    stars.forEach(s => {
      s.y += s.speed;
      if (s.y > logicalHeight) {
        s.y = 0;
        s.x = Math.random() * logicalWidth;
      }
    });

    // Player Movement
    let dx = 0;
    let dy = 0;
    if (keys.ArrowLeft || keys.KeyA) dx -= 1;
    if (keys.ArrowRight || keys.KeyD) dx += 1;
    if (keys.ArrowUp || keys.KeyW) dy -= 1;
    if (keys.ArrowDown || keys.KeyS) dy += 1;

    player.x += dx * player.speed;
    player.y += dy * player.speed;
    player.x = Math.max(20, Math.min(logicalWidth - 20, player.x));
    player.y = Math.max(30, Math.min(logicalHeight - 30, player.y));

    // Player thruster particle trail
    if (Math.random() > 0.2) {
      player.particles.push({
        x: player.x + (Math.random() - 0.5) * 8,
        y: player.y + 18,
        vy: 2 + Math.random() * 3,
        vx: (Math.random() - 0.5) * 1,
        life: 1.0,
        decay: 0.05
      });
    }

    for (let i = player.particles.length - 1; i >= 0; i--) {
      const p = player.particles[i];
      p.y += p.vy;
      p.x += p.vx;
      p.life -= p.decay;
      if (p.life <= 0) player.particles.splice(i, 1);
    }

    // Weapon Cooldown & Firing
    if (player.cooldown > 0) player.cooldown -= dt;
    if (player.tripleShotTime > 0) player.tripleShotTime -= dt;

    if (keys.Space && player.cooldown <= 0) {
      playSynthSound('laser');
      player.cooldown = 0.16;

      if (player.tripleShotTime > 0) {
        projectiles.push({ x: player.x, y: player.y - 15, vx: 0, vy: -12, color: '#4cd7f6' });
        projectiles.push({ x: player.x - 8, y: player.y - 12, vx: -2.5, vy: -11.5, color: '#ffb0cd' });
        projectiles.push({ x: player.x + 8, y: player.y - 12, vx: 2.5, vy: -11.5, color: '#ffb0cd' });
      } else {
        projectiles.push({ x: player.x - 6, y: player.y - 15, vx: 0, vy: -12, color: '#4cd7f6' });
        projectiles.push({ x: player.x + 6, y: player.y - 15, vx: 0, vy: -12, color: '#4cd7f6' });
      }
    }

    // Update projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -20 || p.x < 0 || p.x > logicalWidth) {
        projectiles.splice(i, 1);
      }
    }

    // Update enemy projectiles
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = enemyProjectiles[i];
      ep.y += ep.vy;
      ep.x += ep.vx;

      // Check collision with player
      const dist = Math.hypot(ep.x - player.x, ep.y - player.y);
      if (dist < 18) {
        enemyProjectiles.splice(i, 1);
        handlePlayerHit();
        continue;
      }

      if (ep.y > logicalHeight + 20) {
        enemyProjectiles.splice(i, 1);
      }
    }

    // Spawn Enemies
    enemySpawnTimer += dt;
    if (enemySpawnTimer > 0.85) {
      enemySpawnTimer = 0;
      const isElite = Math.random() > 0.75;
      enemies.push({
        x: 40 + Math.random() * (logicalWidth - 80),
        y: -30,
        type: isElite ? 'elite' : 'drone',
        hp: isElite ? 3 : 1,
        maxHp: isElite ? 3 : 1,
        speed: isElite ? 2.2 : 3.0,
        shootCooldown: 1.2 + Math.random() * 1.5,
        shootTimer: 0,
        width: isElite ? 38 : 28,
        height: isElite ? 32 : 24,
        angle: 0
      });
    }

    // Update Enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.y += e.speed;
      e.angle += 0.03;

      // Elite shooting
      if (e.type === 'elite') {
        e.shootTimer += dt;
        if (e.shootTimer >= e.shootCooldown) {
          e.shootTimer = 0;
          enemyProjectiles.push({
            x: e.x,
            y: e.y + 15,
            vx: (player.x - e.x) * 0.015,
            vy: 4.5,
            color: '#ff79b4'
          });
        }
      }

      // Check collision with player projectiles
      for (let j = projectiles.length - 1; j >= 0; j--) {
        const p = projectiles[j];
        if (Math.abs(p.x - e.x) < e.width / 2 && Math.abs(p.y - e.y) < e.height / 2) {
          projectiles.splice(j, 1);
          e.hp -= 1;
          spawnExplosion(p.x, p.y, '#4cd7f6', 6);

          if (e.hp <= 0) {
            // Killed enemy
            const gainedScore = Math.round((e.type === 'elite' ? 250 : 100) * multiplier);
            score += gainedScore;
            multiplier = Math.min(4.0, multiplier + 0.2);
            multiplierTimer = 3.5;
            spawnFloatingText(`+${gainedScore}`, e.x, e.y, e.type === 'elite' ? '#d0bcff' : '#4cd7f6');
            spawnExplosion(e.x, e.y, e.type === 'elite' ? '#ff79b4' : '#4cd7f6', 16);

            // Chance to drop powerup
            if (Math.random() > 0.8) {
              const pType = Math.random() > 0.5 ? 'triple' : 'bomb';
              powerups.push({
                x: e.x,
                y: e.y,
                type: pType,
                vy: 2.0
              });
            }

            enemies.splice(i, 1);
            updateHUD();
            break;
          }
        }
      }

      // Collision with player hull
      if (Math.hypot(e.x - player.x, e.y - player.y) < 24) {
        enemies.splice(i, 1);
        spawnExplosion(e.x, e.y, '#ffb4ab', 24);
        handlePlayerHit();
        continue;
      }

      if (e.y > logicalHeight + 40) {
        enemies.splice(i, 1);
      }
    }

    // Update Powerups
    for (let i = powerups.length - 1; i >= 0; i--) {
      const pu = powerups[i];
      pu.y += pu.vy;

      if (Math.hypot(pu.x - player.x, pu.y - player.y) < 26) {
        playSynthSound('powerup');
        if (pu.type === 'triple') {
          player.tripleShotTime = 7.0;
          spawnFloatingText('TRIPLE CORE ACTIVE!', player.x, player.y - 20, '#4cd7f6');
        } else if (pu.type === 'bomb') {
          player.bombs = Math.min(3, player.bombs + 1);
          spawnFloatingText('+1 HYPER-BOMB', player.x, player.y - 20, '#ffd9e4');
        }
        powerups.splice(i, 1);
        continue;
      }

      if (pu.y > logicalHeight + 20) {
        powerups.splice(i, 1);
      }
    }

    // Update Explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
      const exp = explosions[i];
      exp.x += exp.vx;
      exp.y += exp.vy;
      exp.life -= exp.decay;
      if (exp.life <= 0) {
        explosions.splice(i, 1);
      }
    }

    // Update Floating Text
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.02;
      if (ft.alpha <= 0) {
        floatingTexts.splice(i, 1);
      }
    }
  }

  function handlePlayerHit() {
    playSynthSound('explosion');
    spawnExplosion(player.x, player.y, '#ffb4ab', 30);
    multiplier = 1.0;
    lives--;
    updateHUD();
    if (lives <= 0) {
      gameOver();
    }
  }

  function render() {
    ctx.save();
    ctx.scale(scaleX, scaleY);
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);

    // 1. Draw Starfield
    stars.forEach(s => {
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. Draw Player Thruster Particles
    player.particles.forEach(p => {
      ctx.fillStyle = `rgba(76, 215, 246, ${p.life})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. Draw Player Spaceship (Sleek Cybernetic Vector)
    ctx.save();
    ctx.translate(player.x, player.y);

    // Neon Glow Underlay
    ctx.shadowColor = '#4cd7f6';
    ctx.shadowBlur = 14;

    ctx.fillStyle = '#171b26';
    ctx.strokeStyle = '#4cd7f6';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(14, 14);
    ctx.lineTo(6, 10);
    ctx.lineTo(0, 15);
    ctx.lineTo(-6, 10);
    ctx.lineTo(-14, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner cockpit core
    ctx.fillStyle = '#acedff';
    ctx.beginPath();
    ctx.arc(0, -2, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Wingtip energy accents
    ctx.fillStyle = '#ff79b4';
    ctx.fillRect(-14, 10, 2, 4);
    ctx.fillRect(12, 10, 2, 4);

    ctx.restore();

    // 4. Draw Projectiles
    projectiles.forEach(p => {
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 8, 4, 14);
    });

    // 5. Draw Hostile Enemy Projectiles
    enemyProjectiles.forEach(ep => {
      ctx.shadowColor = '#ff79b4';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ff79b4';
      ctx.beginPath();
      ctx.arc(ep.x, ep.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 6. Draw Enemies
    enemies.forEach(e => {
      ctx.save();
      ctx.translate(e.x, e.y);

      if (e.type === 'drone') {
        ctx.shadowColor = '#ff79b4';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#262a35';
        ctx.strokeStyle = '#ff79b4';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(0, 14);
        ctx.lineTo(12, -10);
        ctx.lineTo(-12, -10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffb0cd';
        ctx.fillRect(-2, -2, 4, 4);
      } else {
        // Elite Battleship
        ctx.shadowColor = '#d0bcff';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#1c1f2a';
        ctx.strokeStyle = '#d0bcff';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(0, 16);
        ctx.lineTo(18, -6);
        ctx.lineTo(8, -14);
        ctx.lineTo(-8, -14);
        ctx.lineTo(-18, -6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Core pulsating node
        ctx.fillStyle = '#ff79b4';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // 7. Draw Powerups
    powerups.forEach(pu => {
      ctx.save();
      ctx.translate(pu.x, pu.y);
      ctx.shadowColor = pu.type === 'triple' ? '#4cd7f6' : '#ffd9e4';
      ctx.shadowBlur = 12;
      ctx.fillStyle = pu.type === 'triple' ? '#06b6d4' : '#ffd9e4';
      ctx.fillRect(-9, -9, 18, 18);

      ctx.fillStyle = '#0a0e18';
      ctx.font = '10px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pu.type === 'triple' ? '3X' : 'B', 0, 1);
      ctx.restore();
    });

    // 8. Draw Explosions
    explosions.forEach(exp => {
      ctx.shadowBlur = 0;
      ctx.fillStyle = exp.color;
      ctx.globalAlpha = Math.max(0, exp.life);
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });

    // 9. Floating Score Popups
    floatingTexts.forEach(ft => {
      ctx.font = 'bold 13px "JetBrains Mono"';
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.globalAlpha = 1.0;
    });

    ctx.restore();
  }

  // === PROJECT FILTER BUTTONS ===
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('active', 'bg-primary', 'text-on-primary', 'shadow-[0_0_12px_rgba(76,215,246,0.3)]');
        b.classList.add('bg-surface-container-high', 'text-on-surface-variant');
      });
      btn.classList.add('active', 'bg-primary', 'text-on-primary', 'shadow-[0_0_12px_rgba(76,215,246,0.3)]');
      btn.classList.remove('bg-surface-container-high', 'text-on-surface-variant');

      const filterVal = btn.getAttribute('data-filter');
      projectCards.forEach(card => {
        const cat = card.getAttribute('data-category') || '';
        if (filterVal === 'all' || cat.includes(filterVal)) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });

  // === COPY EMAIL MICRO-INTERACTION ===
  const btnCopyEmail = document.getElementById('btnCopyEmail');
  const targetEmailText = document.getElementById('targetEmailText');
  const copyFeedback = document.getElementById('copyFeedback');
  const copyIcon = document.getElementById('copyIcon');

  if (btnCopyEmail && targetEmailText) {
    btnCopyEmail.addEventListener('click', () => {
      navigator.clipboard.writeText(targetEmailText.textContent.trim()).then(() => {
        copyFeedback.textContent = 'COPIED!';
        copyIcon.textContent = 'check';
        btnCopyEmail.classList.add('bg-primary', 'text-on-primary');
        setTimeout(() => {
          copyFeedback.textContent = 'COPY';
          copyIcon.textContent = 'content_copy';
          btnCopyEmail.classList.remove('bg-primary', 'text-on-primary');
        }, 2000);
      });
    });
  }

  // === TERMINAL FORM SUBMIT FEEDBACK ===
  window.submitDispatch = function () {
    const feedback = document.getElementById('formFeedback');
    const sender = document.getElementById('inputSender').value;
    if (feedback) {
      feedback.textContent = `TRANSMISSION CONFIRMED: PACKET DISPATCHED FOR [${sender.toUpperCase()}]`;
      feedback.classList.remove('opacity-0');
      setTimeout(() => {
        feedback.classList.add('opacity-0');
        document.getElementById('contactForm').reset();
      }, 3500);
    }
  };

})();
