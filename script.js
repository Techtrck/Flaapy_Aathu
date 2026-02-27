const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreBoard = document.getElementById('score-board');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over');
const finalScoreText = document.getElementById('final-score');
const highScoreText = document.getElementById('high-score');

// Load assets
const assetImg = new Image();
assetImg.src = 'asset.jpg';

const birdImg = new Image();
birdImg.src = 'asset1.jpg';

const jumpSound = new Audio('bhaai.mp3');
const failSound = new Audio('telugu-screaming.mp3');
jumpSound.volume = 0.5;
failSound.volume = 0.6;

// Game state constants
const GAME_STATE = {
    READY: 'ready',
    PLAYING: 'playing',
    GAME_OVER: 'game_over'
};

let gameState = GAME_STATE.READY;
let score = 0;
let highScore = localStorage.getItem('flappyFaceHighScore') || 0;

// Game constants
const GRAVITY = 0.22;
const JUMP_STRENGTH = -5.2;
const PIPE_SPEED = 2.5;
const PIPE_SPAWN_INTERVAL = 2200; // Increased interval makes pipes further apart
const PIPE_GAP = 190; // Slightly larger gap for better playability
const BIRD_SIZE = 50;

// Game objects
let bird = {
    x: 50,
    y: 0,
    velocity: 0,
    size: BIRD_SIZE,
    rotation: 0
};

let pipes = [];
let lastPipeSpawn = 0;
let animationId = null;

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    // Initial bird position
    bird.y = canvas.height / 2;
    bird.x = canvas.width / 4;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Game logic
function spawnPipe() {
    const minHeight = 50;
    const maxHeight = canvas.height - PIPE_GAP - minHeight;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;

    pipes.push({
        x: canvas.width,
        topHeight: topHeight,
        width: 60,
        passed: false
    });
}

function update(timestamp) {
    if (gameState === GAME_STATE.PLAYING) {
        // Update bird
        bird.velocity += GRAVITY;
        bird.y += bird.velocity;
        bird.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, bird.velocity * 0.1));

        // Spawn pipes
        if (timestamp - lastPipeSpawn > PIPE_SPAWN_INTERVAL) {
            spawnPipe();
            lastPipeSpawn = timestamp;
        }

        // Update pipes
        for (let i = pipes.length - 1; i >= 0; i--) {
            const pipe = pipes[i];
            pipe.x -= PIPE_SPEED;

            // Score point
            if (!pipe.passed && pipe.x + pipe.width < bird.x) {
                pipe.passed = true;
                score++;
                scoreBoard.innerText = score;

                // Pulse score board
                scoreBoard.style.transform = 'scale(1.2)';
                setTimeout(() => scoreBoard.style.transform = 'scale(1)', 100);
            }

            // Remove off-screen pipes
            if (pipe.x + pipe.width < 0) {
                pipes.splice(i, 1);
            }

            // Collision check
            if (checkCollision(pipe)) {
                endGame();
            }
        }

        // Floor / Ceiling check
        if (bird.y + bird.size / 2 > canvas.height || bird.y - bird.size / 2 < 0) {
            endGame();
        }
    }

    draw();
    animationId = requestAnimationFrame(update);
}

function checkCollision(pipe) {
    const bx = bird.x - bird.size / 2;
    const by = bird.y - bird.size / 2;
    const bw = bird.size;
    const bh = bird.size;

    // Top pipe collision
    if (bx + bw > pipe.x && bx < pipe.x + pipe.width &&
        by < pipe.topHeight) {
        return true;
    }

    // Bottom pipe collision
    if (bx + bw > pipe.x && bx < pipe.x + pipe.width &&
        by + bh > pipe.topHeight + PIPE_GAP) {
        return true;
    }

    return false;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background (subtle gradient)
    const grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grd.addColorStop(0, '#000000');
    grd.addColorStop(1, '#01131a');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw pipes (using the same image)
    pipes.forEach(pipe => {
        // Top pipe
        ctx.save();
        ctx.translate(pipe.x, 0);

        // Use a clipping path for the pipe to avoid stretching the image
        ctx.beginPath();
        ctx.rect(0, 0, pipe.width, pipe.topHeight);
        ctx.clip();

        // Draw image scaled to width, maintaining aspect ratio but covering the area
        const imgAspect = assetImg.width / assetImg.height;
        const drawWidth = pipe.width;
        const drawHeight = drawWidth / imgAspect;

        // Tile the image vertically for the pipe
        for (let y = 0; y < pipe.topHeight; y += drawHeight) {
            ctx.drawImage(assetImg, 0, y, drawWidth, drawHeight);
        }

        // Add a "cap" to the pipe
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(0, pipe.topHeight - 10, pipe.width, 10);
        ctx.restore();

        // Bottom pipe
        const bottomY = pipe.topHeight + PIPE_GAP;
        const bottomHeight = canvas.height - bottomY;

        ctx.save();
        ctx.translate(pipe.x, bottomY);

        ctx.beginPath();
        ctx.rect(0, 0, pipe.width, bottomHeight);
        ctx.clip();

        for (let y = 0; y < bottomHeight; y += drawHeight) {
            ctx.drawImage(assetImg, 0, y, drawWidth, drawHeight);
        }

        // Add a "cap" to the pipe
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(0, 0, pipe.width, 10);
        ctx.restore();
    });

    // Draw bird (rotated)
    ctx.save();
    ctx.translate(bird.x, bird.y);
    // Smooth rotation: tilt up when jumping, down when falling
    const targetRotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, bird.velocity * 0.1));
    bird.rotation += (targetRotation - bird.rotation) * 0.1;
    ctx.rotate(bird.rotation);

    // Draw image as bird
    ctx.beginPath();
    ctx.arc(0, 0, bird.size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(birdImg, -bird.size / 2, -bird.size / 2, bird.size, bird.size);

    // Glow effect
    ctx.restore();
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, bird.size / 2, 0, Math.PI * 2);
    ctx.stroke();

    // Shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(-bird.size / 4, -bird.size / 4, bird.size / 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function jump() {
    if (gameState === GAME_STATE.READY) {
        startGame();
        bird.velocity = JUMP_STRENGTH;
        playSound(jumpSound, 1000); // Shortened jump sound to 400ms
    } else if (gameState === GAME_STATE.PLAYING) {
        bird.velocity = JUMP_STRENGTH;
        playSound(jumpSound, 1000); // Shortened jump sound to 400ms
    } else if (gameState === GAME_STATE.GAME_OVER) {
        resetGame();
    }
}

function playSound(audio, duration = 0) {
    audio.currentTime = 0;
    audio.play().catch(e => console.log("Sound play failed:", e));

    if (duration > 0) {
        setTimeout(() => {
            audio.pause();
            audio.currentTime = 0;
        }, duration);
    }
}

function startGame() {
    gameState = GAME_STATE.PLAYING;
    startScreen.classList.add('hidden');
    score = 0;
    scoreBoard.innerText = score;
    lastPipeSpawn = performance.now();
}

function endGame() {
    gameState = GAME_STATE.GAME_OVER;
    playSound(failSound, 1000); // Shortened failure sound to 1.0 second
    gameOverScreen.classList.remove('hidden');
    finalScoreText.innerText = score;

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyFaceHighScore', highScore);
    }
    highScoreText.innerText = highScore;
}

function resetGame() {
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    pipes = [];
    score = 0;
    scoreBoard.innerText = score;
    gameState = GAME_STATE.READY;
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
}

// Input listeners
canvas.parentElement.addEventListener('mousedown', (e) => {
    e.preventDefault();
    jump();
});

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        jump();
    }
});

// Start loop
animationId = requestAnimationFrame(update);
