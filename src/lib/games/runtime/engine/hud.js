/**
 * Premium HUD and UI system for 3D browser games.
 * Provides health bars, score counters, timers, objective badges,
 * toasts, and Game Over / Victory modals.
 */
export function createHUD(options = {}) {
  const {
    title = "",
    showHealth = true,
    maxHealth = 100,
    showScore = true,
    showTimer = false,
  } = options;

  const container = document.createElement("div");
  container.id = "gamelia-hud";
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "0";
  container.style.width = "100%";
  container.style.height = "100%";
  container.style.pointerEvents = "none";
  container.style.userSelect = "none";
  container.style.fontFamily = "system-ui, -apple-system, sans-serif";
  container.style.zIndex = "30";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.justifyContent = "space-between";
  container.style.padding = "16px";
  document.body.appendChild(container);

  // Top Bar
  const topBar = document.createElement("div");
  topBar.style.display = "flex";
  topBar.style.justifyContent = "space-between";
  topBar.style.alignItems = "center";
  topBar.style.width = "100%";
  container.appendChild(topBar);

  // Left Section: Health & Title
  const leftSection = document.createElement("div");
  leftSection.style.display = "flex";
  leftSection.style.flexDirection = "column";
  leftSection.style.gap = "8px";
  topBar.appendChild(leftSection);

  if (title) {
    const titleEl = document.createElement("div");
    titleEl.textContent = title;
    titleEl.style.fontSize = "14px";
    titleEl.style.fontWeight = "700";
    titleEl.style.color = "#a1a1aa";
    titleEl.style.letterSpacing = "0.05em";
    leftSection.appendChild(titleEl);
  }

  // Health Bar
  let currentHealth = maxHealth;
  let healthFill = null;
  let healthText = null;

  if (showHealth) {
    const healthBox = document.createElement("div");
    healthBox.style.display = "flex";
    healthBox.style.alignItems = "center";
    healthBox.style.gap = "8px";

    const barBg = document.createElement("div");
    barBg.style.width = "160px";
    barBg.style.height = "14px";
    barBg.style.borderRadius = "8px";
    barBg.style.background = "rgba(24, 24, 27, 0.85)";
    barBg.style.border = "1px solid rgba(255, 255, 255, 0.15)";
    barBg.style.overflow = "hidden";
    barBg.style.boxShadow = "0 2px 6px rgba(0,0,0,0.5)";

    healthFill = document.createElement("div");
    healthFill.style.width = "100%";
    healthFill.style.height = "100%";
    healthFill.style.borderRadius = "8px";
    healthFill.style.background = "linear-gradient(90deg, #ea580c, #f97316)";
    healthFill.style.transition = "width 0.25s ease-out, background 0.25s ease";
    barBg.appendChild(healthFill);

    healthText = document.createElement("span");
    healthText.textContent = `${maxHealth} HP`;
    healthText.style.fontSize = "12px";
    healthText.style.fontWeight = "bold";
    healthText.style.color = "#f4f4f5";
    healthText.style.minWidth = "45px";

    healthBox.appendChild(barBg);
    healthBox.appendChild(healthText);
    leftSection.appendChild(healthBox);
  }

  // Right Section: Score and Timer
  const rightSection = document.createElement("div");
  rightSection.style.display = "flex";
  rightSection.style.gap = "16px";
  rightSection.style.alignItems = "center";
  topBar.appendChild(rightSection);

  let scoreValue = 0;
  let scoreEl = null;

  if (showScore) {
    const scoreBox = document.createElement("div");
    scoreBox.style.background = "rgba(24, 24, 27, 0.75)";
    scoreBox.style.backdropFilter = "blur(8px)";
    scoreBox.style.border = "1px solid rgba(255, 255, 255, 0.1)";
    scoreBox.style.padding = "6px 14px";
    scoreBox.style.borderRadius = "10px";
    scoreBox.style.display = "flex";
    scoreBox.style.flexDirection = "column";
    scoreBox.style.alignItems = "flex-end";

    const label = document.createElement("span");
    label.textContent = "SCORE";
    label.style.fontSize = "10px";
    label.style.fontWeight = "700";
    label.style.color = "#ea580c";
    label.style.letterSpacing = "0.08em";

    scoreEl = document.createElement("span");
    scoreEl.textContent = "0";
    scoreEl.style.fontSize = "20px";
    scoreEl.style.fontWeight = "800";
    scoreEl.style.color = "#fafafa";

    scoreBox.appendChild(label);
    scoreBox.appendChild(scoreEl);
    rightSection.appendChild(scoreBox);
  }

  let timerEl = null;
  if (showTimer) {
    const timerBox = document.createElement("div");
    timerBox.style.background = "rgba(24, 24, 27, 0.75)";
    timerBox.style.padding = "6px 14px";
    timerBox.style.borderRadius = "10px";
    timerBox.style.border = "1px solid rgba(255, 255, 255, 0.1)";

    timerEl = document.createElement("span");
    timerEl.textContent = "00:00";
    timerEl.style.fontSize = "16px";
    timerEl.style.fontWeight = "700";
    timerEl.style.color = "#f4f4f5";
    timerBox.appendChild(timerEl);
    rightSection.appendChild(timerBox);
  }

  // Objective Banner (top-center)
  const objectiveEl = document.createElement("div");
  objectiveEl.style.alignSelf = "center";
  objectiveEl.style.marginTop = "8px";
  objectiveEl.style.padding = "6px 16px";
  objectiveEl.style.borderRadius = "20px";
  objectiveEl.style.background = "rgba(24, 24, 27, 0.7)";
  objectiveEl.style.border = "1px solid rgba(255, 255, 255, 0.1)";
  objectiveEl.style.fontSize = "12px";
  objectiveEl.style.fontWeight = "600";
  objectiveEl.style.color = "#d4d4d8";
  objectiveEl.style.display = "none";
  container.appendChild(objectiveEl);

  // Message Toast
  const toastEl = document.createElement("div");
  toastEl.style.alignSelf = "center";
  toastEl.style.marginBottom = "40px";
  toastEl.style.padding = "10px 22px";
  toastEl.style.borderRadius = "12px";
  toastEl.style.background = "rgba(234, 88, 12, 0.9)";
  toastEl.style.color = "#ffffff";
  toastEl.style.fontSize = "15px";
  toastEl.style.fontWeight = "bold";
  toastEl.style.boxShadow = "0 4px 16px rgba(234, 88, 12, 0.4)";
  toastEl.style.opacity = "0";
  toastEl.style.transform = "scale(0.9)";
  toastEl.style.transition = "all 0.25s ease";
  container.appendChild(toastEl);

  let toastTimer = null;
  function showToast(msg, duration = 2.0) {
    if (toastTimer) clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.style.opacity = "1";
    toastEl.style.transform = "scale(1)";
    toastTimer = setTimeout(() => {
      toastEl.style.opacity = "0";
      toastEl.style.transform = "scale(0.9)";
    }, duration * 1000);
  }

  // Game Over Modal
  let gameOverOverlay = null;

  function showGameOver(opts = {}) {
    const {
      victory = false,
      title = victory ? "VICTORY!" : "GAME OVER",
      score = scoreValue,
      onRestart = () => window.location.reload(),
    } = opts;

    if (gameOverOverlay) return;

    gameOverOverlay = document.createElement("div");
    gameOverOverlay.style.position = "fixed";
    gameOverOverlay.style.inset = "0";
    gameOverOverlay.style.background = "rgba(9, 9, 11, 0.85)";
    gameOverOverlay.style.backdropFilter = "blur(10px)";
    gameOverOverlay.style.display = "flex";
    gameOverOverlay.style.flexDirection = "column";
    gameOverOverlay.style.alignItems = "center";
    gameOverOverlay.style.justifyContent = "center";
    gameOverOverlay.style.zIndex = "100";
    gameOverOverlay.style.pointerEvents = "auto";
    gameOverOverlay.style.opacity = "0";
    gameOverOverlay.style.transition = "opacity 0.3s ease";

    const card = document.createElement("div");
    card.style.background = "rgba(24, 24, 27, 0.95)";
    card.style.border = `2px solid ${victory ? "#22c55e" : "#ea580c"}`;
    card.style.borderRadius = "16px";
    card.style.padding = "32px 48px";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.alignItems = "center";
    card.style.gap = "16px";
    card.style.boxShadow = `0 8px 32px ${victory ? "rgba(34,197,94,0.3)" : "rgba(234,88,12,0.3)"}`;

    const titleText = document.createElement("h2");
    titleText.textContent = title;
    titleText.style.fontSize = "32px";
    titleText.style.fontWeight = "900";
    titleText.style.color = victory ? "#22c55e" : "#ea580c";
    titleText.style.margin = "0";
    card.appendChild(titleText);

    const scoreDisplay = document.createElement("div");
    scoreDisplay.innerHTML = `<span style="color:#a1a1aa;font-size:14px;">FINAL SCORE</span><br/><strong style="font-size:28px;color:#f4f4f5;">${score}</strong>`;
    scoreDisplay.style.textAlign = "center";
    card.appendChild(scoreDisplay);

    const restartBtn = document.createElement("button");
    restartBtn.textContent = "PLAY AGAIN";
    restartBtn.style.background = victory ? "#22c55e" : "#ea580c";
    restartBtn.style.color = "#ffffff";
    restartBtn.style.fontWeight = "bold";
    restartBtn.style.fontSize = "16px";
    restartBtn.style.padding = "12px 28px";
    restartBtn.style.borderRadius = "10px";
    restartBtn.style.border = "none";
    restartBtn.style.cursor = "pointer";
    restartBtn.style.boxShadow = "0 4px 14px rgba(0,0,0,0.4)";
    restartBtn.style.transition = "transform 0.1s ease, filter 0.2s ease";
    restartBtn.onmouseover = () => (restartBtn.style.filter = "brightness(1.1)");
    restartBtn.onmouseout = () => (restartBtn.style.filter = "brightness(1)");
    restartBtn.onmousedown = () => (restartBtn.style.transform = "scale(0.96)");
    restartBtn.onmouseup = () => (restartBtn.style.transform = "scale(1)");
    restartBtn.onclick = () => {
      gameOverOverlay.remove();
      gameOverOverlay = null;
      onRestart();
    };
    card.appendChild(restartBtn);

    gameOverOverlay.appendChild(card);
    document.body.appendChild(gameOverOverlay);

    requestAnimationFrame(() => {
      gameOverOverlay.style.opacity = "1";
    });
  }

  return {
    setHealth(hp) {
      currentHealth = Math.max(0, Math.min(hp, maxHealth));
      if (healthFill) {
        const pct = (currentHealth / maxHealth) * 100;
        healthFill.style.width = `${pct}%`;
        if (pct < 25) {
          healthFill.style.background = "#ef4444";
        } else if (pct < 50) {
          healthFill.style.background = "#f59e0b";
        } else {
          healthFill.style.background = "linear-gradient(90deg, #ea580c, #f97316)";
        }
      }
      if (healthText) {
        healthText.textContent = `${Math.ceil(currentHealth)} HP`;
      }
    },
    damage(amount) {
      this.setHealth(currentHealth - amount);
      if (currentHealth <= 0) {
        showGameOver({ victory: false });
      }
    },
    addScore(delta) {
      scoreValue += delta;
      if (scoreEl) scoreEl.textContent = String(scoreValue);
    },
    setScore(score) {
      scoreValue = score;
      if (scoreEl) scoreEl.textContent = String(scoreValue);
    },
    setTimer(seconds) {
      if (!timerEl) return;
      const m = Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0");
      const s = Math.floor(seconds % 60)
        .toString()
        .padStart(2, "0");
      timerEl.textContent = `${m}:${s}`;
    },
    setObjective(text) {
      if (!text) {
        objectiveEl.style.display = "none";
      } else {
        objectiveEl.textContent = text;
        objectiveEl.style.display = "block";
      }
    },
    toast: showToast,
    gameOver: showGameOver,
    getScore: () => scoreValue,
    getHealth: () => currentHealth,
  };
}
