const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('finalScore');
const currentMapDisplayEl = document.getElementById('currentMapDisplay');

// Screen Elements
const mainMenuScreen = document.getElementById('mainMenuScreen');
const mainMenuContent = document.getElementById('mainMenuContent');
const mapSelectContent = document.getElementById('mapSelectContent');
const highscoreContent = document.getElementById('highscoreContent');
const highscoresList = document.getElementById('highscoresList');
const pauseScreen = document.getElementById('pauseScreen');
const gameOverScreen = document.getElementById('gameOverScreen');

// Buttons
document.getElementById('btnNewGame').addEventListener('click', startNewGame);
document.getElementById('btnLoadGame').addEventListener('click', loadGame);
document.getElementById('btnSelectMap').addEventListener('click', () => showMenuContent('MAPS'));
document.getElementById('btnHighscores').addEventListener('click', () => { showHighscores(); showMenuContent('HIGHSCORES'); });
document.querySelectorAll('.btnBackToMain').forEach(btn => btn.addEventListener('click', () => showMenuContent('MAIN')));
document.getElementById('btnResume').addEventListener('click', resumeGame);
document.getElementById('btnSaveGame').addEventListener('click', saveGame);
document.getElementById('btnQuitToMenu').addEventListener('click', quitToMenu);
document.getElementById('restartBtn').addEventListener('click', startNewGame);
document.getElementById('btnGameOverToMenu').addEventListener('click', quitToMenu);

// Map Select Buttons
const mapBtns = document.querySelectorAll('.map-btn');
mapBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        mapBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentMap = parseInt(e.target.dataset.map);
        updateMapDisplay();
    });
});

// Board config
const tileCount = 25;
const tileSize = canvas.width / tileCount;

// Game State
let gameState = 'MENU'; // MENU, PLAYING, PAUSED, GAMEOVER
let snake = [];
let food = { x: 0, y: 0 };
let dx = 0;
let dy = -1;
let nextDx = 0;
let nextDy = -1;
let score = 0;
let currentMap = 1;
let obstacles = [];

// Speed Constants
let initialSpeed = 150;
let currentSpeed = initialSpeed;
let minSpeed = 50;
let speedDecrement = 3;

let gameLoopTimeout;

// Audio Context
let audioCtx;
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playEatSound() {
    if(!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function playDieSound() {
    if(!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

// Map Names
const mapNames = {
    1: '1 (Zen)',
    2: '2 (Classic)',
    3: '3 (Blocks)',
    4: '4 (Rows)',
    5: '5 (Boxed)'
};

function updateMapDisplay() {
    currentMapDisplayEl.textContent = mapNames[currentMap];
}

function showMenuContent(type) {
    mainMenuContent.classList.add('hidden');
    mapSelectContent.classList.add('hidden');
    highscoreContent.classList.add('hidden');
    
    if (type === 'MAIN') mainMenuContent.classList.remove('hidden');
    if (type === 'MAPS') mapSelectContent.classList.remove('hidden');
    if (type === 'HIGHSCORES') highscoreContent.classList.remove('hidden');
}

function setupMap() {
    obstacles = [];
    if (currentMap === 1) { // Zen
        initialSpeed = 200; speedDecrement = 2; minSpeed = 80;
    } else if (currentMap === 2) { // Classic
        initialSpeed = 150; speedDecrement = 3; minSpeed = 50;
    } else if (currentMap === 3) { // Blocks
        initialSpeed = 150; speedDecrement = 3; minSpeed = 50;
        obstacles = [{x: 8, y: 8}, {x: 8, y: 16}, {x: 16, y: 8}, {x: 16, y: 16}];
    } else if (currentMap === 4) { // Rows
        initialSpeed = 130; speedDecrement = 2; minSpeed = 50;
        for (let i = 5; i <= 19; i++) {
            obstacles.push({x: i, y: 7});
            obstacles.push({x: 24 - i, y: 17});
        }
    } else if (currentMap === 5) { // Boxed
        initialSpeed = 140; speedDecrement = 2; minSpeed = 40;
        for (let i = 6; i <= 18; i++) {
            obstacles.push({x: i, y: 6});
            obstacles.push({x: i, y: 18});
            obstacles.push({x: 6, y: i});
            obstacles.push({x: 18, y: i});
        }
    }
}

function startNewGame() {
    initAudio();
    snake = [
        { x: 12, y: 12 },
        { x: 12, y: 13 },
        { x: 12, y: 14 }
    ];
    dx = 0; dy = -1;
    nextDx = 0; nextDy = -1;
    score = 0;
    scoreEl.textContent = score;
    setupMap();
    currentSpeed = initialSpeed;
    
    mainMenuScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameState = 'PLAYING';
    
    spawnFood();
    if (gameLoopTimeout) clearTimeout(gameLoopTimeout);
    gameLoop();
}

function spawnFood() {
    let validPos = false;
    while (!validPos) {
        food.x = Math.floor(Math.random() * tileCount);
        food.y = Math.floor(Math.random() * tileCount);
        validPos = true;
        
        for (let s of snake) {
            if (s.x === food.x && s.y === food.y) validPos = false;
        }
        for (let o of obstacles) {
            if (o.x === food.x && o.y === food.y) validPos = false;
        }
    }
}

function gameLoop() {
    if (gameState !== 'PLAYING') return;
    
    dx = nextDx;
    dy = nextDy;
    
    update();
    draw();
    
    if (gameState === 'PLAYING') {
        gameLoopTimeout = setTimeout(gameLoop, currentSpeed);
    }
}

function update() {
    let rawX = snake[0].x + dx;
    let rawY = snake[0].y + dy;
    
    // Screen wrapping mechanics
    let headX = (rawX + tileCount) % tileCount;
    let headY = (rawY + tileCount) % tileCount;
    
    const head = { x: headX, y: headY };
    
    // Self collision
    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            handleGameOver();
            return;
        }
    }
    
    // Obstacle collision
    for (let i = 0; i < obstacles.length; i++) {
        if (head.x === obstacles[i].x && head.y === obstacles[i].y) {
            handleGameOver();
            return;
        }
    }
    
    snake.unshift(head);
    
    // Food collision
    if (head.x === food.x && head.y === food.y) {
        score++;
        scoreEl.textContent = score;
        playEatSound();
        if (currentSpeed > minSpeed) {
            currentSpeed -= speedDecrement;
            if (currentSpeed < minSpeed) currentSpeed = minSpeed;
        }
        spawnFood();
    } else {
        snake.pop();
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#0d121c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < canvas.width; i += tileSize) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }
    
    // Draw obstacles
    ctx.fillStyle = '#475569';
    for (let o of obstacles) {
        ctx.fillRect(o.x * tileSize + 1, o.y * tileSize + 1, tileSize - 2, tileSize - 2);
    }
    
    // Draw food
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#fe0060';
    ctx.fillStyle = '#fe0060';
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(food.x * tileSize + 2, food.y * tileSize + 2, tileSize - 4, tileSize - 4, 4);
    } else {
        ctx.fillRect(food.x * tileSize + 2, food.y * tileSize + 2, tileSize - 4, tileSize - 4);
    }
    ctx.fill();
    
    // Draw snake
    for (let i = 0; i < snake.length; i++) {
        const seg = snake[i];
        if (i === 0) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00f2fe';
            ctx.fillStyle = '#00f2fe';
        } else {
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#0891b2';
        }
        
        ctx.beginPath();
        let r = 2; // default border radius
        if (i === snake.length - 1) r = 8; // rounded tail
        else if (i === 0) r = 6; // slightly rounded head
        
        if (ctx.roundRect) {
            ctx.roundRect(seg.x * tileSize + 1, seg.y * tileSize + 1, tileSize - 2, tileSize - 2, r);
        } else {
            ctx.fillRect(seg.x * tileSize + 1, seg.y * tileSize + 1, tileSize - 2, tileSize - 2);
        }
        ctx.fill();
        
        // Draw eyes on head
        if (i === 0) {
            ctx.fillStyle = 'white';
            ctx.shadowBlur = 0;
            let cx = seg.x * tileSize + tileSize / 2;
            let cy = seg.y * tileSize + tileSize / 2;
            
            // Eye positioning based on dx/dy
            let eyeX1, eyeY1, eyeX2, eyeY2;
            let offsetFwd = 4;
            let offsetSide = 4;
            
            if (dx === 1) { // Right
                eyeX1 = cx + offsetFwd; eyeY1 = cy - offsetSide;
                eyeX2 = cx + offsetFwd; eyeY2 = cy + offsetSide;
            } else if (dx === -1) { // Left
                eyeX1 = cx - offsetFwd; eyeY1 = cy - offsetSide;
                eyeX2 = cx - offsetFwd; eyeY2 = cy + offsetSide;
            } else if (dy === 1) { // Down
                eyeX1 = cx - offsetSide; eyeY1 = cy + offsetFwd;
                eyeX2 = cx + offsetSide; eyeY2 = cy + offsetFwd;
            } else { // Up (dy = -1 or initial empty)
                eyeX1 = cx - offsetSide; eyeY1 = cy - offsetFwd;
                eyeX2 = cx + offsetSide; eyeY2 = cy - offsetFwd;
            }
            
            ctx.beginPath(); ctx.arc(eyeX1, eyeY1, 2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(eyeX2, eyeY2, 2, 0, Math.PI*2); ctx.fill();
            
            // Pupils
            ctx.fillStyle = 'black';
            ctx.beginPath(); ctx.arc(eyeX1 + dx, eyeY1 + dy, 1, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(eyeX2 + dx, eyeY2 + dy, 1, 0, Math.PI*2); ctx.fill();
        }
    }
    ctx.shadowBlur = 0;
}

function handleGameOver() {
    gameState = 'GAMEOVER';
    playDieSound();
    finalScoreEl.textContent = score;
    gameOverScreen.classList.remove('hidden');
    saveHighscore(score);
}

// Pause Logic
function pauseGame() {
    if (gameState === 'PLAYING') {
        gameState = 'PAUSED';
        pauseScreen.classList.remove('hidden');
        if (gameLoopTimeout) clearTimeout(gameLoopTimeout);
    }
}

function resumeGame() {
    if (gameState === 'PAUSED') {
        gameState = 'PLAYING';
        pauseScreen.classList.add('hidden');
        gameLoop();
    }
}

function quitToMenu() {
    gameState = 'MENU';
    pauseScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    mainMenuScreen.classList.remove('hidden');
    showMenuContent('MAIN');
}

// Input Handling
window.addEventListener('keydown', (e) => {
    initAudio();
    
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight', 'Space'].indexOf(e.code) > -1) {
        e.preventDefault();
    }
    
    if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameState === 'PLAYING') pauseGame();
        else if (gameState === 'PAUSED') resumeGame();
        return;
    }
    
    if (gameState !== 'PLAYING') return;
    
    if (e.code === 'ArrowUp' && dy === 0) {
        nextDx = 0; nextDy = -1;
    } else if (e.code === 'ArrowDown' && dy === 0) {
        nextDx = 0; nextDy = 1;
    } else if (e.code === 'ArrowLeft' && dx === 0) {
        nextDx = -1; nextDy = 0;
    } else if (e.code === 'ArrowRight' && dx === 0) {
        nextDx = 1; nextDy = 0;
    }
});

// Save / Load / Highscores
function saveGame() {
    const saveData = {
        snake: snake,
        food: food,
        score: score,
        dx: dx,
        dy: dy,
        nextDx: nextDx,
        nextDy: nextDy,
        currentMap: currentMap,
        currentSpeed: currentSpeed
    };
    localStorage.setItem('snakeSave', JSON.stringify(saveData));
    alert('Game Saved Successfully!');
}

function loadGame() {
    const saveData = localStorage.getItem('snakeSave');
    if (!saveData) {
        alert('No saved game found.');
        return;
    }
    
    try {
        const data = JSON.parse(saveData);
        snake = data.snake;
        food = data.food;
        score = data.score;
        dx = data.dx;
        dy = data.dy;
        nextDx = data.nextDx;
        nextDy = data.nextDy;
        currentMap = data.currentMap;
        currentSpeed = data.currentSpeed;
        
        scoreEl.textContent = score;
        updateMapDisplay();
        setupMap(); // rebuild obstacles
        
        mainMenuScreen.classList.add('hidden');
        gameState = 'PLAYING';
        gameLoop();
    } catch(err) {
        alert('Error parsing save file.');
        console.error(err);
    }
}

function saveHighscore(newScore) {
    let scores = JSON.parse(localStorage.getItem('snakeHighscores') || '[]');
    scores.push({ score: newScore, date: new Date().toLocaleDateString() });
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 5); // top 5
    localStorage.setItem('snakeHighscores', JSON.stringify(scores));
}

function showHighscores() {
    const scores = JSON.parse(localStorage.getItem('snakeHighscores') || '[]');
    highscoresList.innerHTML = '';
    if (scores.length === 0) {
        highscoresList.innerHTML = '<div style="text-align:center;color:#94a3b8;margin-top:20px;">No highscores yet</div>';
        return;
    }
    
    scores.forEach((s, idx) => {
        const entry = document.createElement('div');
        entry.className = 'highscore-entry';
        entry.innerHTML = `<span class="rank">#${idx + 1} &nbsp; ${s.date}</span> <span class="points">${s.score} pts</span>`;
        highscoresList.appendChild(entry);
    });
}
