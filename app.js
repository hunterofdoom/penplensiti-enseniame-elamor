/* ==========================================================================
   STARRY/NEBULA BACKGROUND CANVAS
   ========================================================================== */
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

let stars = [];
let width = window.innerWidth;
let height = window.innerHeight;

canvas.width = width;
canvas.height = height;

window.addEventListener('resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    initStars();
});

class Star {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 1.5;
        this.speedX = (Math.random() - 0.5) * 0.05;
        this.speedY = (Math.random() - 0.5) * 0.05;
        this.alpha = Math.random();
        this.alphaSpeed = 0.005 + Math.random() * 0.01;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Wrap around boundaries
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;

        // Twinkle
        this.alpha += this.alphaSpeed;
        if (this.alpha > 1 || this.alpha < 0) {
            this.alphaSpeed = -this.alphaSpeed;
        }
    }

    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, this.alpha)})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function initStars() {
    stars = [];
    const starCount = Math.floor((width * height) / 8000);
    for (let i = 0; i < starCount; i++) {
        stars.push(new Star());
    }
}

function animateBackground() {
    // Semi-transparent background clear to create slight nebula trailing (glowing sky)
    ctx.fillStyle = '#090714';
    ctx.fillRect(0, 0, width, height);

    // Draw a soft glowing gradient in the center/bottom
    const gradient = ctx.createRadialGradient(
        width / 2, height / 2, 10,
        width / 2, height / 2, Math.max(width, height)
    );
    gradient.addColorStop(0, '#130d2b');
    gradient.addColorStop(0.5, '#0b0819');
    gradient.addColorStop(1, '#05040a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    stars.forEach(star => {
        star.update();
        star.draw();
    });

    requestAnimationFrame(animateBackground);
}

initStars();
animateBackground();

/* ==========================================================================
   AMBIENT AUDIO SYNTHESIZER (WEB AUDIO API)
   ========================================================================== */
let audioCtx = null;
let isPlaying = false;
let synthInterval = null;
let activeOscillators = [];

const notes = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00]; // Pentatonic Scale C major

function initAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playAmbientSound() {
    if (!audioCtx) initAudio();

    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    isPlaying = true;
    document.getElementById('sound-toggle').classList.add('playing');
    document.getElementById('sound-toggle').querySelector('i').className = 'fas fa-volume-up';

    // Start a master volume node
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.08, audioCtx.currentTime); // keep it very soft and background-friendly
    masterGain.connect(audioCtx.destination);

    // Continuous drone synth (warm pad)
    const baseDrone1 = audioCtx.createOscillator();
    const baseDrone2 = audioCtx.createOscillator();
    const droneGain = audioCtx.createGain();
    
    baseDrone1.type = 'triangle';
    baseDrone1.frequency.setValueAtTime(65.41, audioCtx.currentTime); // C2
    
    baseDrone2.type = 'sine';
    baseDrone2.frequency.setValueAtTime(98.00, audioCtx.currentTime); // G2

    droneGain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    
    baseDrone1.connect(droneGain);
    baseDrone2.connect(droneGain);
    droneGain.connect(masterGain);
    
    baseDrone1.start();
    baseDrone2.start();
    activeOscillators.push(baseDrone1, baseDrone2);

    // Random bell chords trigger every 4 seconds
    triggerBellNotes(masterGain);
    synthInterval = setInterval(() => {
        triggerBellNotes(masterGain);
    }, 4000);
}

function stopAmbientSound() {
    isPlaying = false;
    document.getElementById('sound-toggle').classList.remove('playing');
    document.getElementById('sound-toggle').querySelector('i').className = 'fas fa-volume-mute';

    if (synthInterval) clearInterval(synthInterval);

    activeOscillators.forEach(osc => {
        try {
            osc.stop();
        } catch (e) {}
    });
    activeOscillators = [];
}

function triggerBellNotes(destination) {
    if (!audioCtx || audioCtx.state === 'suspended') return;

    // Pick 2-3 random notes from pentatonic scale
    const chordCount = 2 + Math.floor(Math.random() * 2);
    const now = audioCtx.currentTime;

    for (let i = 0; i < chordCount; i++) {
        const randNote = notes[Math.floor(Math.random() * notes.length)];
        const delay = Math.random() * 1.5; // Arpeggiate them slightly

        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(randNote, now + delay);

        // Slow attack, long decay (bell envelope)
        gainNode.gain.setValueAtTime(0, now + delay);
        gainNode.gain.linearRampToValueAtTime(0.3, now + delay + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + 3.0);

        osc.connect(gainNode);
        gainNode.connect(destination);

        osc.start(now + delay);
        osc.stop(now + delay + 3.2);
    }
}

// User toggle sound listener
document.getElementById('sound-toggle').addEventListener('click', () => {
    if (isPlaying) {
        stopAmbientSound();
    } else {
        playAmbientSound();
    }
});

/* ==========================================================================
   NAVIGATION & CARD STEPS
   ========================================================================== */
const nextButtons = document.querySelectorAll('.btn-next-step');
const prevButtons = document.querySelectorAll('.btn-prev-step');
const cards = document.querySelectorAll('.card');

nextButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetId = btn.getAttribute('data-target');
        // Save form content to state/localStorage
        saveCurrentReflections();
        showCard(targetId);
    });
});

prevButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetId = btn.getAttribute('data-target');
        showCard(targetId);
    });
});

function showCard(id) {
    cards.forEach(card => {
        card.classList.remove('active');
    });
    const targetCard = document.getElementById(id);
    targetCard.classList.add('active');
    
    // Auto-resume breathing text if page is step-1
    if (id === 'step-1') {
        startBreathingTextLogic();
    } else {
        stopBreathingTextLogic();
    }

    // Populate summaries if card is the summary
    if (id === 'summary-section') {
        populateSummaryScroll();
    }
}

/* ==========================================================================
   STEP 1: BREATHING INSTRUCTION CYCLER
   ========================================================================== */
let breathingTextInterval = null;
const breathingLabel = document.querySelector('.breathing-text');

function startBreathingTextLogic() {
    if (breathingTextInterval) clearInterval(breathingTextInterval);

    let cycleCount = 0;
    const cycleStates = [
        { text: "Inhala...", duration: 3200 },
        { text: "Sostén...", duration: 800 },
        { text: "Exhala...", duration: 3200 },
        { text: "Sostén...", duration: 800 }
    ];

    function runCycle() {
        const state = cycleStates[cycleCount % 4];
        breathingLabel.textContent = state.text;
        
        breathingTextInterval = setTimeout(() => {
            cycleCount++;
            runCycle();
        }, state.duration);
    }
    
    runCycle();
}

function stopBreathingTextLogic() {
    if (breathingTextInterval) {
        clearTimeout(breathingTextInterval);
        breathingTextInterval = null;
    }
}

/* ==========================================================================
   STEP 2: EMPATHY SCENARIO CHOICE SELECTION
   ========================================================================== */
const choiceButtons = document.querySelectorAll('.choice-btn');
const feedbackContainer = document.querySelector('.scenario-feedback');

choiceButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const isCorrect = btn.getAttribute('data-correct') === 'true';
        
        // Remove active colors
        choiceButtons.forEach(b => {
            b.classList.remove('selected-correct', 'selected-incorrect');
        });

        feedbackContainer.classList.remove('hidden', 'correct', 'incorrect');

        if (isCorrect) {
            btn.classList.add('selected-correct');
            feedbackContainer.classList.add('correct');
            feedbackContainer.innerHTML = `<i class="fas fa-check-circle"></i> <strong>¡Exacto!</strong> Esta respuesta demuestra empatía genuina al validar sus sentimientos, ofrecer tu presencia silenciosa y abrir un espacio seguro sin juzgar ni forzar soluciones apresuradas.`;
        } else {
            btn.classList.add('selected-incorrect');
            feedbackContainer.classList.add('incorrect');
            const explanation = btn.querySelector('.choice-letter').textContent === 'A' 
                ? "Esta respuesta minimiza su sufrimiento, haciéndole sentir incomprendido o culpable por estar mal."
                : "Intentar dar consejos prácticos de inmediato es un impulso común, pero a menudo invalida el peso emocional y corta la conexión. Primero conecta, luego apoya.";
            feedbackContainer.innerHTML = `<i class="fas fa-times-circle"></i> <strong>Sigue intentándolo:</strong> ${explanation}`;
        }
    });
});

/* ==========================================================================
   STEP 3: VULNERABILITY SHIELDS FLIP AND SOLVE
   ========================================================================== */
const shieldItems = document.querySelectorAll('.shield-item');

shieldItems.forEach(shield => {
    shield.addEventListener('click', () => {
        if (!shield.classList.contains('flipped')) {
            shield.classList.add('flipped');
            const back = shield.querySelector('.shield-back');
            const truthText = shield.getAttribute('data-truth');
            back.textContent = truthText;
        }
    });
});

/* ==========================================================================
   STEP 4: GARDEN OF LOVE DRAG & DROP / CLICK WATERING
   ========================================================================== */
const waterDrops = document.querySelectorAll('.water-drop');
const pot = document.getElementById('pot');
const stem = document.getElementById('stem');
const leafL = document.getElementById('leaf-l');
const leafR = document.getElementById('leaf-r');
const flowerHead = document.getElementById('flower-head');
const statusText = document.querySelector('.garden-status');

let wateredDrops = new Set();

// Desktop Drag and Drop
waterDrops.forEach(drop => {
    drop.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', drop.getAttribute('data-type'));
    });

    // Make touch devices/clicks also trigger watering
    drop.addEventListener('click', () => {
        const type = drop.getAttribute('data-type');
        waterPlant(type, drop);
    });
});

pot.addEventListener('dragover', (e) => {
    e.preventDefault();
    pot.classList.add('drag-over');
});

pot.addEventListener('dragleave', () => {
    pot.classList.remove('drag-over');
});

pot.addEventListener('drop', (e) => {
    e.preventDefault();
    pot.classList.remove('drag-over');
    const type = e.dataTransfer.getData('text/plain');
    
    // Find the corresponding element
    const dropEl = Array.from(waterDrops).find(d => d.getAttribute('data-type') === type);
    if (dropEl) {
        waterPlant(type, dropEl);
    }
});

function waterPlant(type, element) {
    if (wateredDrops.has(type)) {
        statusText.textContent = `Ya has regado con ${translateType(type)}. ¡Prueba con otra gota!`;
        return;
    }

    wateredDrops.add(type);
    element.style.opacity = '0.3';
    element.style.pointerEvents = 'none';
    element.setAttribute('draggable', 'false');

    const totalWatered = wateredDrops.size;
    updateFlowerSVG(totalWatered);

    // Set interactive status message
    switch (type) {
        case 'patience':
            statusText.textContent = "Has regado Paciencia. Las raíces se asientan firmemente.";
            break;
        case 'honesty':
            statusText.textContent = "Has regado Honestidad. El tallo crece recto y fuerte.";
            break;
        case 'time':
            statusText.textContent = "Has regado Tiempo. Las hojas se abren para absorber luz.";
            break;
        case 'kindness':
            statusText.textContent = "Has regado Bondad. ¡Un hermoso capullo florece!";
            break;
    }

    if (totalWatered === 4) {
        statusText.innerHTML = "<strong>¡Felicidades!</strong> Tu jardín del amor está floreciendo plenamente.";
    }
}

function translateType(type) {
    const map = { patience: 'Paciencia', honesty: 'Honestidad', time: 'Tiempo', kindness: 'Bondad' };
    return map[type] || type;
}

function updateFlowerSVG(level) {
    // Grow stem
    if (level === 1) {
        stem.setAttribute('d', 'M 100,245 Q 90,210 100,185');
    } else if (level === 2) {
        stem.setAttribute('d', 'M 100,245 Q 90,210 100,170 T 95,140');
        leafL.classList.add('visible-element');
    } else if (level === 3) {
        stem.setAttribute('d', 'M 100,245 Q 90,210 100,170 T 95,130 T 100,105');
        leafR.classList.add('visible-element');
    } else if (level === 4) {
        stem.setAttribute('d', 'M 100,245 Q 90,210 100,170 T 95,130 T 100,100');
        // Reposition flower head slightly depending on stem end
        flowerHead.setAttribute('transform', 'translate(0, 0)');
        flowerHead.classList.add('visible-element');
    }
}

/* ==========================================================================
   REFLECTIONS STATE & JOURNAL STORAGE
   ========================================================================== */
function saveCurrentReflections() {
    for (let i = 1; i <= 4; i++) {
        const textarea = document.getElementById(`journal-${i}`);
        if (textarea) {
            localStorage.setItem(`journal_${i}`, textarea.value);
        }
    }
}

function populateSummaryScroll() {
    for (let i = 1; i <= 4; i++) {
        const storedVal = localStorage.getItem(`journal_${i}`);
        const summaryText = document.getElementById(`summary-journal-${i}`);
        
        if (summaryText) {
            if (storedVal && storedVal.trim() !== "") {
                summaryText.textContent = storedVal;
                summaryText.style.fontStyle = "normal";
            } else {
                summaryText.innerHTML = `<em>No dejaste ninguna anotación para esta sección...</em>`;
                summaryText.style.fontStyle = "italic";
            }
        }
    }
}

// Restart buttons
const restartBtn = document.getElementById('restart-btn');
restartBtn.addEventListener('click', () => {
    // Clear localStorage values
    for (let i = 1; i <= 4; i++) {
        localStorage.removeItem(`journal_${i}`);
        const textarea = document.getElementById(`journal-${i}`);
        if (textarea) textarea.value = "";
    }

    // Reset garden state
    wateredDrops.clear();
    waterDrops.forEach(drop => {
        drop.style.opacity = '1';
        drop.style.pointerEvents = 'auto';
        drop.setAttribute('draggable', 'true');
    });
    stem.setAttribute('d', 'M 100,245 Q 100,245 100,245');
    leafL.classList.remove('visible-element');
    leafR.classList.remove('visible-element');
    flowerHead.classList.remove('visible-element');
    statusText.textContent = "La semilla del amor espera tus cuidados...";

    // Reset empathy choices
    choiceButtons.forEach(b => {
        b.classList.remove('selected-correct', 'selected-incorrect');
    });
    feedbackContainer.classList.add('hidden');

    // Reset shields
    shieldItems.forEach(shield => {
        shield.classList.remove('flipped');
    });

    showCard('welcome-section');
});
