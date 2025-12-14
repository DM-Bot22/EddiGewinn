document.addEventListener('DOMContentLoaded', () => {
    // === CANVASES UND CONTEXTE ===
    const prizeCanvas = document.getElementById('prizeCanvas'); // Z1: Preisbild
    const prizeCtx = prizeCanvas.getContext('2d');
    
    const scratchCanvas = document.getElementById('scratchCanvas'); // Z2: Rubbelschicht (Farbe)
    const scratchCtx = scratchCanvas.getContext('2d');
    
    const prizeImage = document.getElementById('prizeImage');
    const scratchContainer = document.getElementById('scratchContainer');
    const messageBox = document.getElementById('messageBox');
    
    // === KONFIGURATION ===
    const REVEAL_THRESHOLD = 0.40;
    const BRUSH_SIZE = 40; 
    const FADE_SPEED = 0.02; 
    
    const BASE_WIDTH = 400;
    const BASE_HEIGHT = 600;
    const SCRATCH_COLOR = '#AAAAAA'; 
    
    let isScratching = false;
    let isRevealed = false;
    let scratchAlpha = 1.0;
    
    let currentWidth = BASE_WIDTH;
    let currentHeight = BASE_HEIGHT;
    
    // Das Muster wird über CSS geladen, daher ist diese Logik vereinfacht
    const patternReady = true; 

    // === INITIALISIERUNG FUNKTIONEN ===

    function initPrizeCanvas() {
        prizeCtx.clearRect(0, 0, currentWidth, currentHeight);
        
        // Kritisch: Prüft auf Größe des Bildes (naturalWidth)
        if (prizeImage.complete && prizeImage.naturalWidth > 0) {
            prizeCtx.drawImage(prizeImage, 0, 0, prizeImage.naturalWidth, prizeImage.naturalHeight, 0, 0, currentWidth, currentHeight);
        }
    }

    function initScratchCanvas() {
        scratchCtx.globalCompositeOperation = 'source-over'; 
        scratchCtx.clearRect(0, 0, currentWidth, currentHeight);

        scratchCtx.globalAlpha = 1.0;
        scratchCanvas.style.opacity = 1.0; 
        
        // Füllt das Canvas (Z2) mit der einfachen Farbe. 
        // Durch die Transparenz sehen wir das Muster, das auf den Container gelegt wurde.
        scratchCtx.fillStyle = SCRATCH_COLOR;
        scratchCtx.fillRect(0, 0, currentWidth, currentHeight);
        
        // Radiermodus
        scratchCtx.globalCompositeOperation = 'destination-out'; 
        
        scratchCtx.strokeStyle = 'rgba(0,0,0,1)'; 
        scratchCtx.lineWidth = BRUSH_SIZE;
        scratchCtx.lineCap = 'round';
        scratchCtx.lineJoin = 'round';
        
        scratchCtx.beginPath();
    }

    function updateDimensions(w, h, resetScratch = false) {
        currentWidth = w;
        currentHeight = h;
        
        scratchContainer.style.width = `${w}px`;
        scratchContainer.style.height = `${h}px`;

        prizeCanvas.width = w;
        prizeCanvas.height = h;
        scratchCanvas.width = w;
        scratchCanvas.height = h;
        
        // Zuerst Preisbild zeichnen
        initPrizeCanvas();
        
        // Fallback: Wenn das Bild beim ersten Versuch noch nicht seine Größe hatte, zeichnen wir es verzögert
        if (prizeImage.naturalWidth === 0 && !prizeImage.complete) {
            setTimeout(initPrizeCanvas, 100); 
        }

        if (resetScratch || !isRevealed) {
            initScratchCanvas();
            isRevealed = false; 
            scratchAlpha = 1.0;
        }
    }
    
    // === AUTOMATISCHE ROTATIONSLOGIK ===

    function handleOrientationChange() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        const isCurrentPortrait = windowHeight >= windowWidth; 
        
        let newCanvasWidth, newCanvasHeight;
        
        if (isCurrentPortrait) {
            newCanvasWidth = BASE_WIDTH;
            newCanvasHeight = BASE_HEIGHT;
            scratchContainer.classList.remove('landscape-mode');
            scratchContainer.classList.add('portrait-mode');
        } else {
            newCanvasWidth = BASE_HEIGHT;
            newCanvasHeight = BASE_WIDTH;
            scratchContainer.classList.remove('portrait-mode');
            scratchContainer.classList.add('landscape-mode');
        }
        
        // Ruft updateDimensions auf, was das Bild zeichnet und die Größen setzt
        updateDimensions(newCanvasWidth, newCanvasHeight, true); 
    }

    // === RUBBELN LOGIK ===
    
    function getMousePos(e) {
        const rect = scratchCanvas.getBoundingClientRect();
        let clientX, clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: (clientX - rect.left) * (currentWidth / rect.width),
            y: (clientY - rect.top) * (currentHeight / rect.height)
        };
    }

    function startScratch(e) {
        e.preventDefault();
        if (isRevealed) return; 
        
        isScratching = true;
        const pos = getMousePos(e);
        
        scratchCtx.beginPath();
        scratchCtx.moveTo(pos.x, pos.y);
    }

    function scratchMove(e) {
        e.preventDefault();
        if (!isScratching || isRevealed) return;

        const pos = getMousePos(e);
        
        scratchCtx.lineTo(pos.x, pos.y);
        scratchCtx.stroke();
        
        checkRevealPercentage();
    }

    function endScratch() {
        if (!isScratching || isRevealed) return;
        isScratching = false;

        checkRevealPercentage();
    }
    
    // === PROZENT-CHECK LOGIK ===
    
    function checkRevealPercentage() {
        if (isRevealed) return;

        const data = scratchCtx.getImageData(0, 0, currentWidth, currentHeight).data;
        let revealedPixels = 0;
        const totalPixels = currentWidth * currentHeight;
        
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] === 0) {
                revealedPixels++;
            }
        }
        
        const percentage = revealedPixels / totalPixels;
        
        if (percentage >= REVEAL_THRESHOLD) {
            isRevealed = true;
            startFadeOut();
        }
    }
    
    // === ANIMATION LOGIK ===
    
    function startFadeOut() {
        scratchCtx.globalCompositeOperation = 'source-over'; 
        
        scratchCanvas.style.display = 'block'; 
        scratchCanvas.style.opacity = scratchAlpha; 
        
        function fadeStep() {
            if (scratchAlpha <= 0) {
                scratchAlpha = 0;
                scratchCanvas.style.display = 'none';
                messageBox.classList.remove('hidden');
                return;
            }
            
            scratchAlpha -= FADE_SPEED;
            scratchCanvas.style.opacity = scratchAlpha; 
            
            requestAnimationFrame(fadeStep);
        }

        requestAnimationFrame(fadeStep);
    }
    
    // === EVENT LISTENER ANBINDEN ===

    scratchCanvas.addEventListener('mousedown', startScratch);
    document.addEventListener('mousemove', scratchMove); 
    document.addEventListener('mouseup', endScratch); 
    
    scratchCanvas.addEventListener('touchstart', startScratch, { passive: false });
    scratchCanvas.addEventListener('touchmove', scratchMove, { passive: false });
    scratchCanvas.addEventListener('touchend', endScratch);

    // Automatisches Drehen und Initialisieren bei Größenänderung/Laden
    window.addEventListener('resize', handleOrientationChange);
    
    // === INITIALISIERUNG BEIM START ===

    const assetsLoaded = () => {
        // Kritisch: Wenn das Bild geladen ist, initialisieren wir die gesamte Ansicht
        if (prizeImage.complete && prizeImage.naturalWidth > 0 && patternReady) {
            handleOrientationChange(); 
        }
    };

    if (!prizeImage.complete) {
        prizeImage.onload = assetsLoaded;
        // Für den Fall, dass das Bild schnell aus dem Cache geladen wird
    } else {
        assetsLoaded(); 
    }
});