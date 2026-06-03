/* ==========================================================================
   BURNING EMBERS / BONFIRE BACKGROUND CANVAS
   ========================================================================== */
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

let embers = [];
let width = window.innerWidth;
let height = window.innerHeight;

canvas.width = width;
canvas.height = height;

window.addEventListener('resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    initEmbers();
});

class Ember {
    constructor() {
        this.reset();
        // Stagger spawn heights initially
        this.y = Math.random() * height;
    }

    reset() {
        this.x = Math.random() * width;
        this.y = height + Math.random() * 50;
        this.size = 1 + Math.random() * 3;
        this.speedY = -(0.5 + Math.random() * 1.5);
        this.speedX = (Math.random() - 0.5) * 0.4;
        // Warm fiery colors: orange, red, yellow
        const r = 200 + Math.floor(Math.random() * 55);
        const g = 30 + Math.floor(Math.random() * 120);
        const b = 0;
        this.color = `${r}, ${g}, ${b}`;
        this.alpha = 0.5 + Math.random() * 0.5;
        this.decay = 0.001 + Math.random() * 0.003;
    }

    update() {
        this.y += this.speedY;
        this.x += this.speedX + Math.sin(this.y / 30) * 0.2; // sway as they rise
        this.alpha -= this.decay;

        if (this.alpha <= 0 || this.y < -20) {
            this.reset();
        }
    }

    draw() {
        ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
        ctx.shadowColor = `rgba(${this.color}, 0.5)`;
        ctx.shadowBlur = this.size * 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
    }
}

function initEmbers() {
    embers = [];
    const count = Math.floor((width * height) / 9000);
    for (let i = 0; i < count; i++) {
        embers.push(new Ember());
    }
}

function animateBackground() {
    // Solid deep dark purple/black sky
    ctx.fillStyle = '#07050a';
    ctx.fillRect(0, 0, width, height);

    // Vignette / central red-violet glowing aura
    const gradient = ctx.createRadialGradient(
        width / 2, height / 2, 20,
        width / 2, height / 2, Math.max(width, height)
    );
    gradient.addColorStop(0, '#16081e');
    gradient.addColorStop(0.6, '#0b0610');
    gradient.addColorStop(1, '#050207');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    embers.forEach(ember => {
        ember.update();
        ember.draw();
    });

    requestAnimationFrame(animateBackground);
}

initEmbers();
animateBackground();

/* ==========================================================================
   LO-FI BLACK METAL SYNTHESIZER (WEB AUDIO API)
   ========================================================================== */
let audioCtx = null;
let isPlaying = false;
let metalLoopInterval = null;
let activeOscillators = [];
let distortionNode = null;

// Black Metal guitar scales: Minor/Phrygian (E, F, G, A, A#, B)
const riffNotes = [82.41, 87.31, 98.00, 110.00, 116.54, 123.47, 164.81, 174.61, 196.00];

function initAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function makeDistortionCurve(amount) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
}

function playAmbientSound() {
    if (!audioCtx) initAudio();

    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    isPlaying = true;
    const toggleBtn = document.getElementById('sound-toggle');
    toggleBtn.classList.add('playing');
    toggleBtn.querySelector('i').className = 'fas fa-volume-up';

    // Riff Loop & Blast Beats
    let step = 0;
    
    // Play a funny metal intro scream / jiji
    playJijiScream();

    metalLoopInterval = setInterval(() => {
        const time = audioCtx.currentTime;
        
        // Tremolo picked riff (alternating high speed notes)
        // Pick a base note that changes every 8 steps
        const baseNoteIndex = Math.floor(step / 8) % riffNotes.length;
        // Alternate with minor second for that classic dark Norwegian feel
        const offset = (step % 2 === 0) ? 0 : 1;
        const currentFreq = riffNotes[(baseNoteIndex + offset) % riffNotes.length];
        
        playGuitarNote(currentFreq, time, 0.15);

        // Blast beats (Kick and Snare noise)
        if (step % 2 === 0) {
            playKickDrum(time);
        } else {
            playSnareDrum(time);
        }

        // Random little giggle/screech every 32 steps
        if (step % 32 === 0 && Math.random() > 0.4) {
            playJijiScream();
        }

        step++;
    }, 150); // Fast 150ms blast beat loop!
}

function stopAmbientSound() {
    isPlaying = false;
    const toggleBtn = document.getElementById('sound-toggle');
    toggleBtn.classList.remove('playing');
    toggleBtn.querySelector('i').className = 'fas fa-volume-mute';

    if (metalLoopInterval) {
        clearInterval(metalLoopInterval);
        metalLoopInterval = null;
    }

    activeOscillators.forEach(osc => {
        try {
            osc.stop();
        } catch (e) {}
    });
    activeOscillators = [];
}

// Distorted Guitar Sound Generator (Realistic physical modeling)
function playGuitarNote(frequency, startTime, duration) {
    if (!audioCtx) return;

    // Detuned sawtooth and square waves for string friction
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const oscSub = audioCtx.createOscillator();
    
    const preGain = audioCtx.createGain();
    const distortionNode = audioCtx.createWaveShaper();
    const cabinetLowpass = audioCtx.createBiquadFilter();
    const cabinetHighpass = audioCtx.createBiquadFilter();
    const presenceFilter = audioCtx.createBiquadFilter();
    const gainNode = audioCtx.createGain();

    // Setup waveforms
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(frequency, startTime);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(frequency * 1.008, startTime); // detune square wave for rasp

    oscSub.type = 'sawtooth';
    oscSub.frequency.setValueAtTime(frequency * 0.5, startTime); // heavy sub-octave string rumble

    // Saturation and distortion parameters
    preGain.gain.setValueAtTime(20.0, startTime); // Drive waveshaper hard
    distortionNode.curve = makeDistortionCurve(220); // Thick clipping curve
    distortionNode.oversample = '4x';

    // Cabinet simulation EQ:
    // Cuts out extreme highs and mud, boosting metallic mid presence
    cabinetLowpass.type = 'lowpass';
    cabinetLowpass.frequency.setValueAtTime(2800, startTime); // Cut standard synth fuzz buzz

    cabinetHighpass.type = 'highpass';
    cabinetHighpass.frequency.setValueAtTime(80, startTime); // Cut low mud rumble

    presenceFilter.type = 'peaking';
    presenceFilter.frequency.setValueAtTime(1400, startTime); // High presence bite
    presenceFilter.Q.setValueAtTime(1.5, startTime);
    presenceFilter.gain.setValueAtTime(10.0, startTime); // Boost guitar midrange

    // Fast decay and sharp pluck envelope
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.045, startTime + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration - 0.01);

    // Route: Oscs -> PreGain -> Distortion -> Cab Lowpass -> Cab Highpass -> Presence -> Output Gain -> Destination
    osc1.connect(preGain);
    osc2.connect(preGain);
    oscSub.connect(preGain);
    
    preGain.connect(distortionNode);
    distortionNode.connect(cabinetLowpass);
    cabinetLowpass.connect(cabinetHighpass);
    cabinetHighpass.connect(presenceFilter);
    presenceFilter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc1.start(startTime);
    osc2.start(startTime);
    oscSub.start(startTime);
    
    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
    oscSub.stop(startTime + duration);
}

// Synthesized Kick Drum
function playKickDrum(startTime) {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, startTime);
    // Rapid pitch sweep down
    osc.frequency.exponentialRampToValueAtTime(0.01, startTime + 0.08);

    gainNode.gain.setValueAtTime(0.2, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.09);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.1);
}

// Synthesized Snare/Noise Burst
function playSnareDrum(startTime) {
    // Simple short burst of highpass-filtered noise or high frequency sine
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(350, startTime);

    gainNode.gain.setValueAtTime(0.12, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.09);
}

// Siniestra risita / Chillido ("jiji" / "scream")
function playJijiScream() {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    
    const time = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    // Sweeps up rapidly like a high-pitched cartoon evil laugh
    osc.frequency.setValueAtTime(800, time);
    osc.frequency.linearRampToValueAtTime(2400, time + 0.4);
    
    // Add vibrato/tremolo to the giggle
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.frequency.setValueAtTime(25, time); // 25Hz rapid wobble
    lfoGain.gain.setValueAtTime(200, time);
    
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.05, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.55);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    lfo.start(time);
    osc.start(time);
    lfo.stop(time + 0.6);
    osc.stop(time + 0.6);
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
    
    if (id === 'step-1') {
        startBreathingTextLogic();
    } else {
        stopBreathingTextLogic();
    }

    if (id === 'summary-section') {
        populateSummaryScroll();
    }
    
    // Play a giggle when changing sections
    if (isPlaying) {
        playJijiScream();
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
        { text: "Inhala el vacío...", duration: 3200 },
        { text: "Sostén la llama...", duration: 800 },
        { text: "Exhala el pop...", duration: 3200 },
        { text: "Sostén el abismo...", duration: 800 }
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
        
        choiceButtons.forEach(b => {
            b.classList.remove('selected-correct', 'selected-incorrect');
        });

        feedbackContainer.classList.remove('hidden', 'correct', 'incorrect');

        if (isCorrect) {
            btn.classList.add('selected-correct');
            feedbackContainer.classList.add('correct');
            feedbackContainer.innerHTML = `<i class="fas fa-check-circle"></i> <strong>¡TRUE!</strong> Exacto, jiji. Ofrecer tu hombro metalero y validar que la lluvia noruega daña el corpse paint es auténtico amor oscuro. Escucha activa extrema.`;
            if (isPlaying) playGuitarNote(261.63, audioCtx.currentTime, 0.4); // little guitar shred approval
        } else {
            btn.classList.add('selected-incorrect');
            feedbackContainer.classList.add('incorrect');
            const explanation = btn.querySelector('.choice-letter').textContent === 'A' 
                ? "Llamarlo poser invalida su crisis existencial. Hasta Abbath de Immortal tiene sentimientos, jiji."
                : "Intentar arreglarlo con consejos prácticos inmediatos es muy aburrido. Los verdaderos metaleros se sientan juntos en el cementerio a llorar primero.";
            feedbackContainer.innerHTML = `<i class="fas fa-times-circle"></i> <strong>POSER DETECTADO:</strong> ${explanation}`;
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
            
            if (isPlaying) {
                playJijiScream();
            }
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

waterDrops.forEach(drop => {
    drop.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', drop.getAttribute('data-type'));
    });

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
    
    const dropEl = Array.from(waterDrops).find(d => d.getAttribute('data-type') === type);
    if (dropEl) {
        waterPlant(type, dropEl);
    }
});

function waterPlant(type, element) {
    if (wateredDrops.has(type)) {
        statusText.textContent = `Ya pusiste ${translateType(type)}. ¡Prueba con otro ingrediente!`;
        return;
    }

    wateredDrops.add(type);
    element.style.opacity = '0.3';
    element.style.pointerEvents = 'none';
    element.setAttribute('draggable', 'false');

    const totalWatered = wateredDrops.size;
    updateFlowerSVG(totalWatered);

    // Guitar noise feedback
    if (isPlaying) {
        playGuitarNote(146.83 * (1 + totalWatered * 0.2), audioCtx.currentTime, 0.35);
    }

    switch (type) {
        case 'patience':
            statusText.textContent = "Has vertido Café Negro. Las raíces metaleras reviven.";
            break;
        case 'honesty':
            statusText.textContent = "Has vertido Blast Beats. El tallo crece con potencia destructiva.";
            break;
        case 'time':
            statusText.textContent = "Has vertido Noches True. Brotaron espinas y hojas oscuras.";
            break;
        case 'kindness':
            statusText.textContent = "Has vertido Mimos Jiji. ¡La rosa del caos florece en sangre!";
            break;
    }

    if (totalWatered === 4) {
        statusText.innerHTML = "<strong>¡PACTO CUMPLIDO!</strong> La rosa negra del amor verdadero brilla en la oscuridad (jiji).";
    }
}

function translateType(type) {
    const map = { patience: 'Café Negro', honesty: 'Blast Beats', time: 'Noches True', kindness: 'Mimos Jiji' };
    return map[type] || type;
}

function updateFlowerSVG(level) {
    if (level === 1) {
        stem.setAttribute('d', 'M 100,220 Q 90,190 100,165');
    } else if (level === 2) {
        stem.setAttribute('d', 'M 100,220 Q 90,190 100,150 T 95,120');
        leafL.classList.add('visible-element');
    } else if (level === 3) {
        stem.setAttribute('d', 'M 100,220 Q 90,190 100,150 T 95,110 T 100,85');
        leafR.classList.add('visible-element');
    } else if (level === 4) {
        stem.setAttribute('d', 'M 100,220 Q 90,190 100,150 T 95,110 T 100,80');
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
                summaryText.innerHTML = `<em>No dejaste ninguna anotación en el grimorio...</em>`;
                summaryText.style.fontStyle = "italic";
            }
        }
    }
}

// Restart buttons
const restartBtn = document.getElementById('restart-btn');
restartBtn.addEventListener('click', () => {
    for (let i = 1; i <= 4; i++) {
        localStorage.removeItem(`journal_${i}`);
        const textarea = document.getElementById(`journal-${i}`);
        if (textarea) textarea.value = "";
    }

    wateredDrops.clear();
    waterDrops.forEach(drop => {
        drop.style.opacity = '1';
        drop.style.pointerEvents = 'auto';
        drop.setAttribute('draggable', 'true');
    });
    stem.setAttribute('d', 'M 100,220 Q 100,220 100,220');
    leafL.classList.remove('visible-element');
    leafR.classList.remove('visible-element');
    flowerHead.classList.remove('visible-element');
    statusText.textContent = "Invoca el poder de la rosa del amor eterno...";

    choiceButtons.forEach(b => {
        b.classList.remove('selected-correct', 'selected-incorrect');
    });
    feedbackContainer.classList.add('hidden');

    shieldItems.forEach(shield => {
        shield.classList.remove('flipped');
    });

    showCard('welcome-section');
});
