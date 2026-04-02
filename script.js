const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('finalScore');
const gameOverScreen = document.getElementById('gameOverScreen');
const restartBtn = document.getElementById('restartBtn');

// Board config
const tileCount = 20;
const tileSize = canvas.width / tileCount;

// Game state
let snake = [];
let food = { x: 0, y: 0 };
let dx = 0;
let dy = 0;
let score = 0;
let isGameOver = false;

// Speed config
const initialSpeed = 150;
let currentSpeed = initialSpeed;
const minSpeed = 50;
const speedDecrement = 3;

let gameLoopTimeout;
let nextDx = 0;
let nextDy = 0;

// Audio context
let audioCtx;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
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

function resetGame() {
    snake = [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 }
    ];
    dx = 0;
    dy = -1;
    nextDx = 0;
    nextDy = -1;
    score = 0;
    currentSpeed = initialSpeed;
    isGameOver = false;
    
    scoreEl.textContent = score;
    gameOverScreen.classList.add('hidden');
    
    spawnFood();
    if (gameLoopTimeout) clearTimeout(gameLoopTimeout);
    gameLoop();
}

function spawnFood() {
    let validPos = false;
    while (!validPos) {
        food.x = Math.floor(Math.random() * tileCount);
        food.y = Math.floor(Math.random() * tileCount);
        
        // Ensure food isn't on the snake
        validPos = true;
        for (let i = 0; i < snake.length; i++) {
            if (snake[i].x === food.x && snake[i].y === food.y) {
                validPos = false;
                break;
            }
        }
    }
}

function gameLoop() {
    if (isGameOver) return;
    
    // Apply queued direction
    dx = nextDx;
    dy = nextDy;
    
    update();
    draw();
    
    if (!isGameOver) {
        gameLoopTimeout = setTimeout(gameLoop, currentSpeed);
    }
}

function update() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    
    // Check wall collisions
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        handleGameOver();
        return;
    }
    
    // Check self collisions
    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            handleGameOver();
            return;
        }
    }
    
    snake.unshift(head);
    
    // Check food collision
    if (head.x === food.x && head.y === food.y) {
        score++;
        scoreEl.textContent = score;
        playEatSound();
        
        // Increase speed (decrease timeout duration)
        if (currentSpeed > minSpeed) {
            currentSpeed -= speedDecrement;
            if (currentSpeed < minSpeed) currentSpeed = minSpeed;
        }
        
        spawnFood();
    } else {
        snake.pop(); // Remove tail if no food eaten
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#0d121c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < canvas.width; i += tileSize) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
    
    // Draw food
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#fe0060';
    ctx.fillStyle = '#fe0060';
    ctx.beginPath();
    // Using rounded rectangles for a premium feel
    if (ctx.roundRect) {
        ctx.roundRect(food.x * tileSize + 2, food.y * tileSize + 2, tileSize - 4, tileSize - 4, 4);
    } else {
        ctx.fillRect(food.x * tileSize + 2, food.y * tileSize + 2, tileSize - 4, tileSize - 4);
    }
    ctx.fill();
    
    // Draw snake
    for (let i = 0; i < snake.length; i++) {
        if (i === 0) {
            // Head
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00f2fe';
            ctx.fillStyle = '#00f2fe';
        } else {
            // Body parts
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#0891b2';
        }
        
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(snake[i].x * tileSize + 1, snake[i].y * tileSize + 1, tileSize - 2, tileSize - 2, 4);
        } else {
            ctx.fillRect(snake[i].x * tileSize + 1, snake[i].y * tileSize + 1, tileSize - 2, tileSize - 2);
        }
        ctx.fill();
    }
    ctx.shadowBlur = 0; // Reset
}

function handleGameOver() {
    isGameOver = true;
    playDieSound();
    finalScoreEl.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

// Input handling
window.addEventListener('keydown', (e) => {
    initAudio(); // Initialize audio on first key press
    
    // Prevent default scroll behavior for arrow keys
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.code) > -1) {
        e.preventDefault();
    }
    
    // Queue the next move to avoid rapid double-key press self-collision
    if (e.code === 'ArrowUp' && dy === 0) {
        nextDx = 0;
        nextDy = -1;
    } else if (e.code === 'ArrowDown' && dy === 0) {
        nextDx = 0;
        nextDy = 1;
    } else if (e.code === 'ArrowLeft' && dx === 0) {
        nextDx = -1;
        nextDy = 0;
    } else if (e.code === 'ArrowRight' && dx === 0) {
        nextDx = 1;
        nextDy = 0;
    }
});

restartBtn.addEventListener('click', () => {
    initAudio();
    resetGame();
});

// Start game
resetGame();
