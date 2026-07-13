var canvas = document.getElementById("gameCanvas");
    var ctx = canvas.getContext("2d");

    // --- 0. ضبط حجم العرض + تحويل إحداثيات اللمس (متوافق مع WebView القديم، بدون optional chaining) ---
    function resizeCanvas() {
        var ratio = 400 / 640;
        var maxW = window.innerWidth;
        var maxH = window.innerHeight;
        var w = maxW;
        var h = w / ratio;
        if (h > maxH) { h = maxH; w = h * ratio; }
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    function getCanvasCoords(clientX, clientY) {
        var rect = canvas.getBoundingClientRect();
        var scaleX = canvas.width / rect.width;
        var scaleY = canvas.height / rect.height;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    }

    // --- 1. قائمة الصدارة المحلية ---
    var localLeaderboard = [
        { name: "البطل الأسطوري", score: 3000 },
        { name: "المحترف", score: 1500 }
    ];

    // --- 2. الترجمة ---
    var currentLang = "ar";
    var translations = {
        ar: {
            title: "باني الأبراج الأسطوري", play: "▶️ المناطق والأقاليم", leaderboard: "🏆 قائمة الصدارة",
            back: "🔙 عودة", stage: "المرحلة", score: "🏆 النقاط",
            perfect: "🌟 ممتاز جداً! ✨", great: "✨ رائع ✨", good: "جيد",
            stageCleared: "اكتملت المرحلة! 🎉", lostLife: "فقدت قلباً! المتبقي:",
            boxesLeft: "الصناديق المتبقية: ", gameOver: "GAME OVER", top50: "🏆 أفضل اللاعبين 🏆",
            region1: "🗺️ مصر (1-200)", region2: "🗺️ اليابان (1-200)", region3: "🗺️ باريس (1-200)", region4: "🗺️ دبي (1-200)",
            selectStage: "اختر المرحلة الفرعية",
            regionShort1: "مصر", regionShort2: "اليابان", regionShort3: "باريس", regionShort4: "دبي",
            mapBtn: "⬅️ الخريطة", nextBtn: "التالي ➡️", homeBtn: "🏠 القائمة الرئيسية",
            selectRegion: "اختر المنطقة السياحية", tapToContinue: "اضغط على الشاشة للمتابعة",
            shop: "🛒 المتجر", shopTitle: "🛒 متجر الأشكال", coins: "🪙 عملاتك:",
            owned: "مملوك", equipped: "مُفعّل ✔", locked: "🔒 اضغط للشراء", tapToEquip: "اضغط للتفعيل",
            page: "الصفحة", of: "من", prevPage: "◀ السابق", nextPage: "التالي ▶",
            insufficient: "🪙 العملات غير كافية!"
        },
        en: {
            title: "Tower Builder", play: "▶️ Regions & Maps", leaderboard: "🏆 Leaderboard",
            back: "🔙 Back", stage: "Stage", score: "🏆 Score",
            perfect: "🌟 Perfect! ✨", great: "✨ Great ✨", good: "Good",
            stageCleared: "Stage Cleared! 🎉", lostLife: "Life Lost! Remaining:",
            boxesLeft: "Boxes Left: ", gameOver: "GAME OVER", top50: "🏆 Top Players 🏆",
            region1: "🗺️ Egypt (1-200)", region2: "🗺️ Japan (1-200)", region3: "🗺️ Paris (1-200)", region4: "🗺️ Dubai (1-200)",
            selectStage: "Select Sub-Stage",
            regionShort1: "Egypt", regionShort2: "Japan", regionShort3: "Paris", regionShort4: "Dubai",
            mapBtn: "⬅️ Map", nextBtn: "Next ➡️", homeBtn: "🏠 Main Menu",
            selectRegion: "Select Region", tapToContinue: "Tap screen to continue",
            shop: "🛒 Shop", shopTitle: "🛒 Skins Shop", coins: "🪙 Coins:",
            owned: "Owned", equipped: "Equipped ✔", locked: "🔒 Tap to buy", tapToEquip: "Tap to equip",
            page: "Page", of: "of", prevPage: "◀ Prev", nextPage: "Next ▶",
            insufficient: "🪙 Not enough coins!"
        }
    };
    function t(key) {
        var langObj = translations[currentLang] || translations.ar;
        if (langObj && langObj[key]) { return langObj[key]; }
        return key;
    }

    // --- 3. تخطيط الأزرار الموحّد (نفس القيم تُستخدم للرسم وللمس معاً لمنع أي تفاوت) ---
    var LAYOUT = {
        menu: { x: canvas.width/2 - 110, w: 220, h: 50, play: 190, leaderboard: 260, shop: 330, lang: 400 },
        region: { x: canvas.width/2 - 120, w: 240, h: 55, r1: 140, r2: 205, r3: 270, r4: 335,
                  back: { x: canvas.width/2 - 70, y: 560, w: 140, h: 45 } },
        stageGrid: { boxSize: 48, startX: 34, startY: 108, colGap: 65, rowGap: 60, cols: 4, rows: 5, perPage: 20,
                     prev: { x: 30, y: 440, w: 110, h: 42 }, next: { x: 260, y: 440, w: 110, h: 42 },
                     back: { x: canvas.width/2 - 70, y: 560, w: 140, h: 45 } },
        leaderboardBack: { x: canvas.width/2 - 70, y: 560, w: 140, h: 45 },
        shop: { itemX: 25, itemW: 350, itemH: 70, startY: 105, gap: 15,
                back: { x: canvas.width/2 - 70, y: 580, w: 140, h: 45 } },
        stageClear: { map: { x: 100, y: 420, w: 80, h: 50 }, next: { x: 220, y: 420, w: 80, h: 50 } },
        fullGameOver: { home: { x: canvas.width/2 - 95, y: 400, w: 190, h: 50 } }
    };

    // --- 4. حالة اللعبة ---
    var currentScreen = "mainMenu";
    var selectedRegion = 1;
    var currentSubStage = 1;
    var currentStagePage = 0; // 0..9 (كل صفحة 20 مرحلة، 200/20=10 صفحات)
    var cameraY = 0;

    var boxColors = ["#e74c3c", "#2ecc71", "#9b59b6", "#f1c40f", "#e67e22", "#1abc9c", "#fd79a8", "#3498db"];
    function getRandomColor() { return boxColors[Math.floor(Math.random() * boxColors.length)]; }

    var stageScore = 0; var totalScore = 0;
    var lives = 5; var maxLives = 5;
    var gameOver = false; var isFullGameOver = false; var isStageCleared = false;
    var feedbackText = ""; var feedbackTimer = 0;
    var comboCount = 0;
    var shopMessage = ""; var shopMessageTimer = 0;

    var rope = { startX: 200, startY: 0, length: 140, angle: 0, direction: 1 };
    var currentBox = { x: 0, y: 0, width: 75, height: 55, color: boxColors[0], isDropped: false, speedY: 0 };
    var tower = [];

    // --- عملات ومتجر الأشكال (تُحفظ لمدة الجلسة الحالية فقط - تُصفّر عند إغلاق الصفحة) ---
    var playerCoins = 0;
    var skins = [
        { id: 0, ar: "كلاسيكي", en: "Classic", cost: 0 },
        { id: 1, ar: "خشبي", en: "Wooden", cost: 500 },
        { id: 2, ar: "جليدي", en: "Icy", cost: 1200 },
        { id: 3, ar: "ذهبي", en: "Golden", cost: 2500 },
        { id: 4, ar: "مباني حديثة", en: "Modern", cost: 4000 }
    ];
    var ownedSkins = [0];
    var equippedSkin = 0;

    // --- حفظ دائم على الجهاز (localStorage) - تقدمك وعملاتك وأشكالك بتفضل محفوظة حتى لو قفلت الصفحة ---
    var SAVE_KEY = "towerBuilderSave_v1";
    function saveGame() {
        try {
            var data = { coins: playerCoins, owned: ownedSkins, equipped: equippedSkin, lang: currentLang };
            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        } catch (e) { /* localStorage غير متاح (مثلاً معاينة مباشرة بدون دومين حقيقي) - نتجاهل بصمت */ }
    }
    function loadGame() {
        try {
            var raw = localStorage.getItem(SAVE_KEY);
            if (!raw) { return; }
            var data = JSON.parse(raw);
            if (typeof data.coins === "number") { playerCoins = data.coins; }
            if (data.owned && data.owned.length) { ownedSkins = data.owned; }
            if (typeof data.equipped === "number") { equippedSkin = data.equipped; }
            if (data.lang === "ar" || data.lang === "en") { currentLang = data.lang; }
        } catch (e) { /* لو الملف تالف أو localStorage مش شغال، هيبدأ اللاعب من جديد بأمان */ }
    }

    // --- 5. إعدادات صعوبة المرحلة ---
    // المرحلة 1 = 20 صندوق، وكل مرحلة +5 صناديق (بحد أقصى 120 عشان يفضل قابل للعب في المراحل المتأخرة).
    // بعد المرحلة 20: تظهر عقبات متحركة. بعد المرحلة 40: البرج نفسه يتمايل بخفة.
    function getStageConfig(region, subStage) {
        var boxes = 20 + (subStage - 1) * 5;
        if (boxes > 120) { boxes = 120; }

        var speed = 0.016 + (subStage - 1) * 0.0002;
        if (speed > 0.026) { speed = 0.026; }

        var obstacleEnabled = subStage > 20;

        var swayEnabled = subStage > 40;
        var swayAmplitude = 0;
        if (swayEnabled) {
            swayAmplitude = 6 + Math.min((subStage - 40) * 0.15, 18);
        }

        return { requiredBoxes: boxes, baseSpeed: speed, obstacleEnabled: obstacleEnabled, swayEnabled: swayEnabled, swayAmplitude: swayAmplitude };
    }
    var stageConfig = getStageConfig(selectedRegion, currentSubStage);

    function spawnBox() {
        currentBox.width = 75; currentBox.height = 55;
        currentBox.color = getRandomColor();
        currentBox.isDropped = false;
        currentBox.speedY = 0;
    }

    // --- تدرّج لوني بسيط (نهار -> مساء) حسب تقدم اللاعب داخل الـ200 مرحلة، لكسر الملل البصري بدون تغيير كل التصميم ---
    function lerpColor(a, b, tt) {
        var ah = parseInt(a.slice(1), 16), bh = parseInt(b.slice(1), 16);
        var ar = (ah >> 16) & 255, ag = (ah >> 8) & 255, ab = ah & 255;
        var br = (bh >> 16) & 255, bg = (bh >> 8) & 255, bb = bh & 255;
        var rr = Math.round(ar + (br - ar) * tt), rg = Math.round(ag + (bg - ag) * tt), rb = Math.round(ab + (bb - ab) * tt);
        return "rgb(" + rr + "," + rg + "," + rb + ")";
    }
    function dayFactor() { return Math.min(currentSubStage / 200, 1); }

    // --- 6. جسيمات خلفية للتشتيت الخفيف (بدون مبالغة) ---
    var bgParticles = [];
    var bgParticlesRegion = 0;
    function initBgParticles(region) {
        bgParticles = [];
        var i;
        if (region === 1) {
            for (i = 0; i < 5; i++) { bgParticles.push({ type: "bird", x: Math.random() * canvas.width, y: 60 + Math.random() * 150, speed: 0.3 + Math.random() * 0.3, size: 6 + Math.random() * 4 }); }
        } else if (region === 2) {
            for (i = 0; i < 9; i++) { bgParticles.push({ type: "petal", x: Math.random() * canvas.width, y: Math.random() * canvas.height, speed: 0.4 + Math.random() * 0.5, drift: Math.random() * 0.6 - 0.3, size: 3 + Math.random() * 3 }); }
        } else if (region === 3) {
            for (i = 0; i < 10; i++) { bgParticles.push({ type: "twinkle", x: Math.random() * canvas.width, y: 150 + Math.random() * 380, phase: Math.random() * Math.PI * 2, size: 1.5 + Math.random() * 2 }); }
        } else if (region === 4) {
            for (i = 0; i < 4; i++) { bgParticles.push({ type: "cloud", x: Math.random() * canvas.width, y: 60 + Math.random() * 100, speed: 0.15 + Math.random() * 0.15, size: 20 + Math.random() * 15 }); }
        }
        bgParticlesRegion = region;
    }
    function updateAndDrawBgParticles() {
        bgParticles.forEach(function (p) {
            if (p.type === "bird") {
                p.x -= p.speed * 2;
                if (p.x < -20) { p.x = canvas.width + 20; p.y = 60 + Math.random() * 150; }
                ctx.strokeStyle = "rgba(60,60,60,0.5)"; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(p.x - p.size, p.y); ctx.quadraticCurveTo(p.x, p.y - p.size * 0.6, p.x + p.size, p.y); ctx.stroke();
            } else if (p.type === "petal") {
                p.y += p.speed; p.x += p.drift;
                if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
                ctx.fillStyle = "rgba(255,182,193,0.7)";
                ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size, p.size * 0.6, p.drift, 0, Math.PI * 2); ctx.fill();
            } else if (p.type === "twinkle") {
                p.phase += 0.05;
                var alpha = 0.3 + Math.abs(Math.sin(p.phase)) * 0.6;
                ctx.fillStyle = "rgba(255,241,118," + alpha.toFixed(2) + ")";
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
            } else if (p.type === "cloud") {
                p.x += p.speed;
                if (p.x > canvas.width + 40) { p.x = -40; }
                ctx.fillStyle = "rgba(255,255,255,0.55)";
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
                ctx.arc(p.x + p.size * 0.6, p.y + 4, p.size * 0.5, 0, Math.PI * 2);
                ctx.arc(p.x - p.size * 0.6, p.y + 4, p.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    // --- شرارات الكومبو (Combo Sparkles) ---
    var particles = [];
    function spawnSparkles(cx, cy, big) {
        var count = big ? 22 : 12;
        for (var i = 0; i < count; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = 1.5 + Math.random() * (big ? 3.5 : 2.5);
            particles.push({ x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 30, maxLife: 30, color: Math.random() < 0.5 ? "#fff176" : "#ffffff" });
        }
    }
    function updateParticles() {
        for (var i = particles.length - 1; i >= 0; i--) {
            var p = particles[i];
            p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life--;
            if (p.life <= 0) { particles.splice(i, 1); }
        }
    }
    function drawParticles() {
        particles.forEach(function (p) {
            ctx.globalAlpha = Math.max(p.life / p.maxLife, 0);
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    // --- العقبات المتحركة (تظهر بعد المرحلة 20) وتمايل البرج (بعد المرحلة 40) ---
    var obstacle = { active: false, x: 0, y: 0, dir: 1, speed: 3.5 };
    var obstacleTimer = 300; // 5 ثواني تقريبًا عند 60 إطار/ثانية
    var swayOffset = 0;

    // --- 7. الأصوات (مُصنّعة عبر Web Audio API - بدون ملفات خارجية) ---
    var audioCtx = null;
    function initAudio() {
        try {
            if (!audioCtx) { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
            else if (audioCtx.state === "suspended") { audioCtx.resume(); }
        } catch (e) { audioCtx = null; }
    }

    // --- موسيقى خلفية بسيطة تُعزف قبل بدء اللعب (تتوقف بمجرد دخول شاشة اللعب) ---
    var musicPlaying = false;
    var musicTimeoutId = null;
    var musicNotes = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 783.99, 659.25];
    var musicIndex = 0;
    function scheduleMusicNote() {
        if (!musicPlaying) { return; }
        if (audioCtx) { beep(musicNotes[musicIndex % musicNotes.length], 0.4, "sine", 0.04); }
        musicIndex++;
        musicTimeoutId = setTimeout(scheduleMusicNote, 480);
    }
    function startMusic() {
        if (musicPlaying) { return; }
        musicPlaying = true;
        scheduleMusicNote();
    }
    function stopMusic() {
        musicPlaying = false;
        if (musicTimeoutId) { clearTimeout(musicTimeoutId); musicTimeoutId = null; }
    }
    function beep(freq, duration, type, volume, delay) {
        if (!audioCtx) { return; }
        try {
            var t0 = audioCtx.currentTime + (delay || 0);
            var osc = audioCtx.createOscillator();
            var gain = audioCtx.createGain();
            osc.type = type || "sine";
            osc.frequency.setValueAtTime(freq, t0);
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(volume || 0.1, t0 + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(t0); osc.stop(t0 + duration + 0.02);
        } catch (e) {}
    }
    function sndTick() { beep(700, 0.04, "square", 0.045); }
    function sndPerfect() { beep(880, 0.09, "sine", 0.12); beep(1175, 0.09, "sine", 0.1, 0.07); beep(1568, 0.12, "sine", 0.1, 0.14); }
    function sndGreat() { beep(660, 0.1, "sine", 0.1); }
    function sndGood() { beep(440, 0.1, "sine", 0.08); }
    function sndCrash() { beep(120, 0.25, "sawtooth", 0.12); }
    function sndGameOver() { beep(300, 0.15, "sine", 0.1); beep(220, 0.15, "sine", 0.1, 0.15); beep(160, 0.25, "sine", 0.1, 0.3); }
    function sndBuy() { beep(1000, 0.06, "sine", 0.1); beep(1300, 0.08, "sine", 0.1, 0.06); }

    // --- 8. رسوم الخلفيات لكل دولة (4 دول) ---
    function drawDetailedPyramid(centerX, baseY, width, height) {
        ctx.fillStyle = "#e67e22"; ctx.beginPath(); ctx.moveTo(centerX, baseY - height); ctx.lineTo(centerX + width / 2, baseY); ctx.lineTo(centerX, baseY); ctx.fill();
        ctx.fillStyle = "#d35400"; ctx.beginPath(); ctx.moveTo(centerX, baseY - height); ctx.lineTo(centerX - width / 2, baseY); ctx.lineTo(centerX, baseY); ctx.fill();
        ctx.strokeStyle = "rgba(0, 0, 0, 0.12)"; ctx.lineWidth = 1;
        for (var i = 1; i < 8; i++) {
            var ratio = i / 8; var currentHeight = height * ratio; var currentWidth = width * ratio;
            ctx.beginPath(); ctx.moveTo(centerX - currentWidth / 2, baseY - height + currentHeight); ctx.lineTo(centerX + currentWidth / 2, baseY - height + currentHeight); ctx.stroke();
        }
    }
    function drawJapanBackground(cameraYOffset) {
        var df = dayFactor();
        var top = lerpColor("#2c3e50", "#0c1a2b", df);
        var grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, top); grad.addColorStop(0.5, "#e84393"); grad.addColorStop(1, "#ff7675");
        ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#d63031"; ctx.beginPath(); ctx.arc(200, 260, 55, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(0, cameraYOffset);
        ctx.fillStyle = "#2d3436"; ctx.beginPath(); ctx.moveTo(200, 300); ctx.lineTo(380, 560); ctx.lineTo(20, 560); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.moveTo(200, 300); ctx.lineTo(225, 335); ctx.lineTo(175, 335); ctx.fill();
        ctx.restore();
    }
    function drawParisBackground(cameraYOffset) {
        var df = dayFactor();
        var top = lerpColor("#0c2461", "#020814", df);
        var grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, top); grad.addColorStop(1, "#4a69bd");
        ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.save(); ctx.translate(0, cameraYOffset);
        ctx.fillStyle = "#1e272e";
        ctx.fillRect(185, 320, 30, 240);
        ctx.beginPath(); ctx.moveTo(200, 220); ctx.lineTo(215, 320); ctx.lineTo(185, 320); ctx.fill();
        ctx.beginPath(); ctx.moveTo(170, 560); ctx.lineTo(185, 480); ctx.lineTo(215, 480); ctx.lineTo(230, 560); ctx.fill();
        ctx.restore();
    }
    function drawDubaiBackground(cameraYOffset) {
        var df = dayFactor();
        var top = lerpColor("#ffb88c", "#1b1f3b", df);
        var grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, top); grad.addColorStop(1, "#f6d365");
        ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff200"; ctx.beginPath(); ctx.arc(110, 300, 40, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(0, cameraYOffset);
        // برج شاهق مبسّط
        ctx.fillStyle = "#7f8c8d";
        ctx.beginPath();
        ctx.moveTo(210, 150); ctx.lineTo(222, 560); ctx.lineTo(198, 560); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#95a5a6"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(210, 150); ctx.lineTo(210, 110); ctx.stroke();
        // مبنى ثانوي
        ctx.fillStyle = "#636e72"; ctx.fillRect(270, 400, 45, 160);
        ctx.fillStyle = "#57606f"; ctx.fillRect(70, 440, 60, 120);
        ctx.restore();
    }
    function drawCountryBackground() {
        var cameraYOffset = cameraY * 0.4;
        if (bgParticlesRegion !== selectedRegion) { initBgParticles(selectedRegion); }

        if (selectedRegion === 1) {
            var df = dayFactor();
            var top = lerpColor("#ff7675", "#341f38", df);
            var skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            skyGradient.addColorStop(0, top); skyGradient.addColorStop(0.4, "#fdcb6e"); skyGradient.addColorStop(1, "#fad390");
            ctx.fillStyle = skyGradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#fff200"; ctx.beginPath(); ctx.arc(290, 320, 45, 0, Math.PI * 2); ctx.fill();
            ctx.save(); ctx.translate(0, cameraYOffset);
            drawDetailedPyramid(110, 580, 220, 160); drawDetailedPyramid(280, 580, 160, 110);
            ctx.fillStyle = "#eccc68"; ctx.fillRect(0, 560, canvas.width, 500);
            ctx.restore();
        } else if (selectedRegion === 2) {
            drawJapanBackground(cameraYOffset);
            ctx.save(); ctx.translate(0, cameraYOffset); ctx.fillStyle = "#636e72"; ctx.fillRect(0, 560, canvas.width, 500); ctx.restore();
        } else if (selectedRegion === 3) {
            drawParisBackground(cameraYOffset);
            ctx.save(); ctx.translate(0, cameraYOffset); ctx.fillStyle = "#2f3640"; ctx.fillRect(0, 560, canvas.width, 500); ctx.restore();
        } else if (selectedRegion === 4) {
            drawDubaiBackground(cameraYOffset);
            ctx.save(); ctx.translate(0, cameraYOffset); ctx.fillStyle = "#e1b382"; ctx.fillRect(0, 560, canvas.width, 500); ctx.restore();
        }
        updateAndDrawBgParticles();
    }

    // --- 9. الأشكال (Skins) ---
    function drawClassicBox(x, y, w, h, color) {
        ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.fillRect(x + w / 4 - 5, y + h / 2 - 6, 10, 12); ctx.fillRect(x + (3 * w) / 4 - 5, y + h / 2 - 6, 10, 12);
    }
    function drawWoodBox(x, y, w, h) {
        var grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, "#a9744f"); grad.addColorStop(1, "#7a4a2b");
        ctx.fillStyle = grad; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = "#5c3317"; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
        ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1;
        for (var i = 1; i < 4; i++) { var ly = y + (h / 4) * i; ctx.beginPath(); ctx.moveTo(x, ly); ctx.lineTo(x + w, ly); ctx.stroke(); }
    }
    function drawIceBox(x, y, w, h) {
        var grad = ctx.createLinearGradient(x, y, x + w, y + h);
        grad.addColorStop(0, "#dff9fb"); grad.addColorStop(1, "#74b9ff");
        ctx.fillStyle = grad; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath(); ctx.arc(x + w * 0.3, y + h * 0.35, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + w * 0.7, y + h * 0.6, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + w * 0.5, y + h * 0.25, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    function drawGoldBox(x, y, w, h) {
        var grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, "#fff9c4"); grad.addColorStop(0.5, "#ffd700"); grad.addColorStop(1, "#b8860b");
        ctx.fillStyle = grad; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = "#8b6508"; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(x + w * 0.15, y + 2, w * 0.15, h - 4);
    }
    function drawModernBox(x, y, w, h) {
        ctx.fillStyle = "#2f3640"; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = "#57606f"; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = "rgba(116,185,255,0.55)";
        var cols = 3, rows = 2, pad = 4;
        var cw = (w - pad * (cols + 1)) / cols, ch = (h - pad * (rows + 1)) / rows;
        for (var r = 0; r < rows; r++) { for (var c = 0; c < cols; c++) { ctx.fillRect(x + pad + c * (cw + pad), y + pad + r * (ch + pad), cw, ch); } }
    }
    function drawSkinnedBox(x, y, w, h, color) {
        if (equippedSkin === 1) { drawWoodBox(x, y, w, h); }
        else if (equippedSkin === 2) { drawIceBox(x, y, w, h); }
        else if (equippedSkin === 3) { drawGoldBox(x, y, w, h); }
        else if (equippedSkin === 4) { drawModernBox(x, y, w, h); }
        else { drawClassicBox(x, y, w, h, color); }
    }

    // --- 10. واجهات الشاشات ---
    function drawButton(x, y, w, h, text, color) {
        ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.font = "bold 13px Arial";
        ctx.fillText(text, x + w / 2, y + h / 2 + 5);
    }

    function drawMainMenu() {
        ctx.fillStyle = "#2c3e50"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.font = "bold 24px Arial";
        ctx.fillText(t("title"), canvas.width / 2, 110);
        var L = LAYOUT.menu;
        drawButton(L.x, L.play, L.w, L.h, t("play"), "#2ecc71");
        drawButton(L.x, L.leaderboard, L.w, L.h, t("leaderboard"), "#f1c40f");
        drawButton(L.x, L.shop, L.w, L.h, t("shop"), "#9b59b6");
        drawButton(L.x, L.lang, L.w, L.h, "🌐 " + (currentLang === "ar" ? "العربية" : "English"), "#3498db");
    }

    function drawRegionsMap() {
        ctx.fillStyle = "#34495e"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.font = "bold 22px Arial";
        ctx.fillText(t("selectRegion"), canvas.width / 2, 70);
        var L = LAYOUT.region;
        drawButton(L.x, L.r1, L.w, L.h, t("region1"), "#e67e22");
        drawButton(L.x, L.r2, L.w, L.h, t("region2"), "#e84393");
        drawButton(L.x, L.r3, L.w, L.h, t("region3"), "#4a69bd");
        drawButton(L.x, L.r4, L.w, L.h, t("region4"), "#00b894");
        drawButton(L.back.x, L.back.y, L.back.w, L.back.h, t("back"), "#e74c3c");
    }

    function drawStagesMap() {
        ctx.fillStyle = "#2c3e50"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.font = "bold 20px Arial";
        var regionName = selectedRegion === 1 ? t("region1") : selectedRegion === 2 ? t("region2") : selectedRegion === 3 ? t("region3") : t("region4");
        ctx.fillText(regionName, canvas.width / 2, 40);
        ctx.font = "13px Arial"; ctx.fillStyle = "#b2bec3";
        ctx.fillText(t("selectStage"), canvas.width / 2, 62);

        var G = LAYOUT.stageGrid;
        var totalPages = 200 / G.perPage;
        for (var i = 0; i < G.perPage; i++) {
            var row = Math.floor(i / G.cols); var col = i % G.cols;
            var x = G.startX + (col * G.colGap); var y = G.startY + (row * G.rowGap);
            var stageNum = currentStagePage * G.perPage + i + 1;
            if (stageNum > 200) { continue; }
            drawButton(x, y, G.boxSize, G.boxSize, "" + stageNum, "#3498db");
        }
        ctx.fillStyle = "#dfe6e9"; ctx.font = "13px Arial"; ctx.textAlign = "center";
        ctx.fillText(t("page") + " " + (currentStagePage + 1) + " " + t("of") + " " + totalPages, canvas.width / 2, 420);

        drawButton(G.prev.x, G.prev.y, G.prev.w, G.prev.h, t("prevPage"), currentStagePage > 0 ? "#636e72" : "#2d3436");
        drawButton(G.next.x, G.next.y, G.next.w, G.next.h, t("nextPage"), currentStagePage < totalPages - 1 ? "#636e72" : "#2d3436");
        drawButton(G.back.x, G.back.y, G.back.w, G.back.h, t("back"), "#e74c3c");
    }

    function drawLeaderboardScreen() {
        ctx.fillStyle = "#34495e"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.font = "bold 22px Arial";
        ctx.fillText(t("top50"), canvas.width / 2, 50);
        var startY = 110;
        localLeaderboard.forEach(function (player, index) {
            var itemY = startY + (index * 44);
            var rank = index + 1;
            ctx.fillStyle = "rgba(255,255,255,0.07)"; ctx.fillRect(32, itemY - 26, canvas.width - 64, 32);
            ctx.fillStyle = "#ffffff"; ctx.font = "14px Arial"; ctx.textAlign = "left";
            ctx.fillText(rank + ". " + player.name, 45, itemY - 5);
            ctx.textAlign = "right"; ctx.fillText(String(player.score), canvas.width - 45, itemY - 5);
        });
        var L = LAYOUT.leaderboardBack;
        drawButton(L.x, L.y, L.w, L.h, t("back"), "#e74c3c");
    }

    function drawShopScreen() {
        ctx.fillStyle = "#2d3436"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.font = "bold 20px Arial";
        ctx.fillText(t("shopTitle"), canvas.width / 2, 40);
        ctx.font = "15px Arial"; ctx.fillStyle = "#ffeaa7";
        ctx.fillText(t("coins") + " " + playerCoins, canvas.width / 2, 68);

        var S = LAYOUT.shop;
        for (var i = 0; i < skins.length; i++) {
            var sk = skins[i];
            var y = S.startY + i * (S.itemH + S.gap);
            var owned = ownedSkins.indexOf(sk.id) !== -1;
            var isEquipped = equippedSkin === sk.id;
            var bg = isEquipped ? "#27ae60" : (owned ? "#2980b9" : "#636e72");
            ctx.fillStyle = bg; ctx.fillRect(S.itemX, y, S.itemW, S.itemH);
            ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.strokeRect(S.itemX, y, S.itemW, S.itemH);

            // معاينة صغيرة لشكل الصندوق
            var pv_x = S.itemX + 12, pv_y = y + 12, pv_w = 46, pv_h = 46;
            if (sk.id === 0) { drawClassicBox(pv_x, pv_y, pv_w, pv_h, "#3498db"); }
            else if (sk.id === 1) { drawWoodBox(pv_x, pv_y, pv_w, pv_h); }
            else if (sk.id === 2) { drawIceBox(pv_x, pv_y, pv_w, pv_h); }
            else if (sk.id === 3) { drawGoldBox(pv_x, pv_y, pv_w, pv_h); }
            else if (sk.id === 4) { drawModernBox(pv_x, pv_y, pv_w, pv_h); }

            ctx.textAlign = "left"; ctx.fillStyle = "#ffffff"; ctx.font = "bold 15px Arial";
            var name = currentLang === "ar" ? sk.ar : sk.en;
            ctx.fillText(name, S.itemX + 75, y + 28);
            ctx.font = "13px Arial"; ctx.fillStyle = "#dfe6e9";
            var statusText = isEquipped ? t("equipped") : (owned ? t("tapToEquip") : (t("locked") + " (" + sk.cost + "🪙)"));
            ctx.fillText(statusText, S.itemX + 75, y + 50);
        }

        if (shopMessageTimer > 0) {
            ctx.fillStyle = "#ff7675"; ctx.font = "bold 15px Arial"; ctx.textAlign = "center";
            ctx.fillText(shopMessage, canvas.width / 2, S.startY + skins.length * (S.itemH + S.gap) + 10);
            shopMessageTimer--;
        }

        var B = S.back;
        drawButton(B.x, B.y, B.w, B.h, t("back"), "#e74c3c");
    }

    // --- 11. حلقة اللعبة ---
    function gameLoop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (currentScreen === "game") { stopMusic(); } else { startMusic(); }

        if (currentScreen === "mainMenu") { drawMainMenu(); }
        else if (currentScreen === "regionsMap") { drawRegionsMap(); }
        else if (currentScreen === "stagesMap") { drawStagesMap(); }
        else if (currentScreen === "leaderboard") { drawLeaderboardScreen(); }
        else if (currentScreen === "shop") { drawShopScreen(); }
        else if (currentScreen === "game") {
            drawCountryBackground();

            if (tower.length === 0) {
                tower.push({ x: canvas.width / 2 - 50, y: 570, width: 100, height: 50, color: "#34495e" });
            }

            var targetCameraY = 0;
            if (tower.length > 3) { targetCameraY = (tower.length - 3) * 55; }
            cameraY += (targetCameraY - cameraY) * 0.1;

            ctx.save(); ctx.translate(0, cameraY);

            // تمايل البرج (بعد المرحلة 40) - مؤثر بصري وعلى الاصطدام فقط، لا يغيّر الإحداثيات المخزّنة
            swayOffset = stageConfig.swayEnabled ? Math.sin(Date.now() / 600) * stageConfig.swayAmplitude : 0;

            if (!isStageCleared && !gameOver && !isFullGameOver) {
                // تحديث العقبة المتحركة (تظهر كل 5 ثواني تقريبًا بعد المرحلة 20)
                if (stageConfig.obstacleEnabled) {
                    if (!obstacle.active) {
                        obstacleTimer--;
                        if (obstacleTimer <= 0) {
                            obstacle.active = true;
                            obstacle.dir = Math.random() < 0.5 ? 1 : -1;
                            obstacle.x = obstacle.dir === 1 ? -30 : canvas.width + 30;
                            obstacle.y = tower[tower.length - 1].y - 90;
                            obstacle.speed = 3.5;
                        }
                    } else {
                        obstacle.x += obstacle.dir * obstacle.speed;
                        if ((obstacle.dir === 1 && obstacle.x > canvas.width + 30) || (obstacle.dir === -1 && obstacle.x < -30)) {
                            obstacle.active = false;
                            obstacleTimer = 300;
                        }
                    }
                }

                if (!currentBox.isDropped) {
                    var prevAngle = rope.angle;
                    rope.angle += stageConfig.baseSpeed * rope.direction;
                    if (Math.abs(rope.angle) > 0.8) { rope.direction *= -1; sndTick(); }
                    currentBox.x = rope.startX + Math.sin(rope.angle) * rope.length - currentBox.width / 2;
                    currentBox.y = (rope.startY - cameraY) + Math.cos(rope.angle) * rope.length - currentBox.height / 2;

                    ctx.strokeStyle = "#2c3e50"; ctx.lineWidth = 3; ctx.beginPath();
                    ctx.moveTo(rope.startX, rope.startY - cameraY); ctx.lineTo(currentBox.x + currentBox.width / 2, currentBox.y); ctx.stroke();
                } else {
                    currentBox.speedY += 0.8; currentBox.y += currentBox.speedY;

                    // الاصطدام بالعقبة المتحركة أثناء السقوط = خسارة قلب فورية
                    if (stageConfig.obstacleEnabled && obstacle.active) {
                        var odx = (currentBox.x + currentBox.width / 2) - obstacle.x;
                        var ody = (currentBox.y + currentBox.height / 2) - obstacle.y;
                        var odist = Math.sqrt(odx * odx + ody * ody);
                        if (odist < 16 + Math.max(currentBox.width, currentBox.height) / 2) {
                            comboCount = 0; lives--; sndCrash();
                            obstacle.active = false; obstacleTimer = 300;
                            if (lives > 0) { gameOver = true; } else { isFullGameOver = true; sndGameOver(); }
                        }
                    }

                    var topBox = tower[tower.length - 1];
                    var topBoxX = topBox.x + swayOffset;
                    if (!gameOver && !isFullGameOver && currentBox.y + currentBox.height >= topBox.y) {
                        var centerDiff = (currentBox.x + currentBox.width / 2) - (topBoxX + topBox.width / 2);
                        if (Math.abs(centerDiff) < topBox.width - 15) {
                            tower.push({ x: currentBox.x, y: topBox.y - currentBox.height, width: currentBox.width, height: currentBox.height, color: currentBox.color });
                            stageScore++;

                            var absDiff = Math.abs(centerDiff);
                            var gained = 0;
                            if (absDiff <= 6) {
                                gained = 100; comboCount++;
                                spawnSparkles(currentBox.x + currentBox.width / 2, topBox.y, comboCount >= 3 && comboCount % 3 === 0);
                                if (comboCount >= 2) { gained += comboCount * 10; feedbackText = "🔥 COMBO x" + comboCount + "! " + t("perfect"); }
                                else { feedbackText = t("perfect"); }
                                sndPerfect();
                            } else if (absDiff <= 18) {
                                gained = 40; comboCount = 0; feedbackText = t("great"); sndGreat();
                            } else {
                                gained = 15; comboCount = 0; feedbackText = t("good"); sndGood();
                            }
                            totalScore += gained; playerCoins += gained; saveGame();
                            feedbackTimer = 40;

                            if (stageScore >= stageConfig.requiredBoxes) { isStageCleared = true; }
                            spawnBox();
                        } else {
                            comboCount = 0;
                            lives--;
                            sndCrash();
                            if (lives > 0) { gameOver = true; } else { isFullGameOver = true; sndGameOver(); }
                        }
                    }
                }
            }

            if (!isStageCleared && !gameOver && !isFullGameOver) { drawSkinnedBox(currentBox.x, currentBox.y, currentBox.width, currentBox.height, currentBox.color); }
            tower.forEach(function (b) {
                var sx = stageConfig.swayEnabled ? b.x + swayOffset : b.x;
                drawSkinnedBox(sx, b.y, b.width, b.height, b.color);
            });

            if (stageConfig.obstacleEnabled && obstacle.active) {
                var glowPulse = 0.6 + Math.abs(Math.sin(Date.now() / 150)) * 0.4;
                ctx.save();
                ctx.shadowColor = "#ff4757"; ctx.shadowBlur = 20 * glowPulse;
                ctx.fillStyle = "rgba(255,71,87," + glowPulse.toFixed(2) + ")";
                ctx.beginPath(); ctx.arc(obstacle.x, obstacle.y, 16, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke();
                ctx.restore();
            }

            updateParticles(); drawParticles();
            ctx.restore();

            // شريط HUD
            ctx.fillStyle = "rgba(44, 62, 80, 0.85)"; ctx.fillRect(0, 0, canvas.width, 95);
            ctx.fillStyle = "#ffffff"; ctx.font = "bold 15px Arial"; ctx.textAlign = "left";
            var regionLabel = selectedRegion === 1 ? t("regionShort1") : selectedRegion === 2 ? t("regionShort2") : selectedRegion === 3 ? t("regionShort3") : t("regionShort4");
            ctx.fillText(regionLabel + " - " + t("stage") + ": " + currentSubStage, 25, 30);
            ctx.fillText(t("score") + ": " + totalScore, 25, 55);
            var boxesLeft = stageConfig.requiredBoxes - stageScore;
            ctx.fillText(t("boxesLeft") + (boxesLeft < 0 ? 0 : boxesLeft), 25, 80);
            ctx.textAlign = "right"; ctx.font = "18px Arial"; ctx.fillText("❤️".repeat(lives), canvas.width - 25, 35);

            if (stageConfig.obstacleEnabled && !obstacle.active && obstacleTimer < 60 && !isStageCleared && !gameOver && !isFullGameOver) {
                ctx.textAlign = "right"; ctx.font = "14px Arial";
                ctx.fillText("⚠️", canvas.width - 25, 80);
            }

            if (feedbackTimer > 0) {
                ctx.fillStyle = "#2c3e50"; ctx.font = "bold 22px Arial"; ctx.textAlign = "center";
                ctx.fillText(feedbackText, canvas.width / 2, 140); feedbackTimer--;
            }

            if (isStageCleared) {
                ctx.fillStyle = "rgba(44, 62, 80, 0.95)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = "#f1c40f"; ctx.textAlign = "center"; ctx.font = "bold 26px Arial"; ctx.fillText(t("stageCleared"), canvas.width / 2, 220);
                var C = LAYOUT.stageClear;
                drawButton(C.map.x, C.map.y, C.map.w, C.map.h, t("mapBtn"), "#e74c3c");
                drawButton(C.next.x, C.next.y, C.next.w, C.next.h, t("nextBtn"), "#2ecc71");
            }

            if (gameOver) {
                ctx.fillStyle = "rgba(0, 0, 0, 0.85)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.font = "bold 20px Arial"; ctx.fillText(t("lostLife") + " " + lives + " ❤️", canvas.width / 2, 300);
                ctx.font = "14px Arial"; ctx.fillText(t("tapToContinue"), canvas.width / 2, 360);
            }

            if (isFullGameOver) {
                ctx.fillStyle = "rgba(0, 0, 0, 0.95)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = "#ff4757"; ctx.textAlign = "center"; ctx.font = "bold 32px Arial"; ctx.fillText(t("gameOver"), canvas.width / 2, 260);
                ctx.font = "bold 20px Arial"; ctx.fillStyle = "#ffffff"; ctx.fillText(t("score") + ": " + totalScore, canvas.width / 2, 320);
                var H = LAYOUT.fullGameOver.home;
                drawButton(H.x, H.y, H.w, H.h, t("homeBtn"), "#7f8c8d");
            }
        }
        requestAnimationFrame(gameLoop);
    }

    // --- 12. معالجة اللمس/النقر ---
    function inRect(px, py, x, y, w, h) { return px >= x && px <= x + w && py >= y && py <= y + h; }

    function startStage(subStage) {
        currentSubStage = subStage;
        stageConfig = getStageConfig(selectedRegion, currentSubStage);
        stageScore = 0; tower = []; lives = maxLives; cameraY = 0; totalScore = 0; comboCount = 0; particles = [];
        obstacle.active = false; obstacleTimer = 300; swayOffset = 0;
        currentScreen = "game"; spawnBox();
    }

    function handleInteraction(clickX, clickY) {
        if (currentScreen === "mainMenu") {
            var M = LAYOUT.menu;
            if (clickX >= M.x && clickX <= M.x + M.w) {
                if (inRect(clickX, clickY, M.x, M.play, M.w, M.h)) { currentScreen = "regionsMap"; }
                else if (inRect(clickX, clickY, M.x, M.leaderboard, M.w, M.h)) { currentScreen = "leaderboard"; }
                else if (inRect(clickX, clickY, M.x, M.shop, M.w, M.h)) { currentScreen = "shop"; }
                else if (inRect(clickX, clickY, M.x, M.lang, M.w, M.h)) { currentLang = currentLang === "ar" ? "en" : "ar"; saveGame(); }
            }
        }
        else if (currentScreen === "regionsMap") {
            var R = LAYOUT.region;
            if (clickX >= R.x && clickX <= R.x + R.w) {
                if (inRect(clickX, clickY, R.x, R.r1, R.w, R.h)) { selectedRegion = 1; currentStagePage = 0; currentScreen = "stagesMap"; }
                else if (inRect(clickX, clickY, R.x, R.r2, R.w, R.h)) { selectedRegion = 2; currentStagePage = 0; currentScreen = "stagesMap"; }
                else if (inRect(clickX, clickY, R.x, R.r3, R.w, R.h)) { selectedRegion = 3; currentStagePage = 0; currentScreen = "stagesMap"; }
                else if (inRect(clickX, clickY, R.x, R.r4, R.w, R.h)) { selectedRegion = 4; currentStagePage = 0; currentScreen = "stagesMap"; }
            }
            if (inRect(clickX, clickY, R.back.x, R.back.y, R.back.w, R.back.h)) { currentScreen = "mainMenu"; }
        }
        else if (currentScreen === "stagesMap") {
            var G = LAYOUT.stageGrid;
            var totalPages = 200 / G.perPage;
            for (var i = 0; i < G.perPage; i++) {
                var row = Math.floor(i / G.cols); var col = i % G.cols;
                var x = G.startX + (col * G.colGap); var y = G.startY + (row * G.rowGap);
                var stageNum = currentStagePage * G.perPage + i + 1;
                if (stageNum > 200) { continue; }
                if (inRect(clickX, clickY, x, y, G.boxSize, G.boxSize)) { startStage(stageNum); return; }
            }
            if (inRect(clickX, clickY, G.prev.x, G.prev.y, G.prev.w, G.prev.h) && currentStagePage > 0) { currentStagePage--; }
            else if (inRect(clickX, clickY, G.next.x, G.next.y, G.next.w, G.next.h) && currentStagePage < totalPages - 1) { currentStagePage++; }
            else if (inRect(clickX, clickY, G.back.x, G.back.y, G.back.w, G.back.h)) { currentScreen = "regionsMap"; }
        }
        else if (currentScreen === "leaderboard") {
            var LB = LAYOUT.leaderboardBack;
            if (inRect(clickX, clickY, LB.x, LB.y, LB.w, LB.h)) { currentScreen = "mainMenu"; }
        }
        else if (currentScreen === "shop") {
            var S = LAYOUT.shop;
            for (var si = 0; si < skins.length; si++) {
                var sk = skins[si];
                var iy = S.startY + si * (S.itemH + S.gap);
                if (inRect(clickX, clickY, S.itemX, iy, S.itemW, S.itemH)) {
                    var owned = ownedSkins.indexOf(sk.id) !== -1;
                    if (owned) { equippedSkin = sk.id; sndBuy(); saveGame(); }
                    else if (playerCoins >= sk.cost) { playerCoins -= sk.cost; ownedSkins.push(sk.id); equippedSkin = sk.id; sndBuy(); saveGame(); }
                    else { shopMessage = t("insufficient"); shopMessageTimer = 60; }
                    return;
                }
            }
            var B = S.back;
            if (inRect(clickX, clickY, B.x, B.y, B.w, B.h)) { currentScreen = "mainMenu"; }
        }
        else if (currentScreen === "game") {
            if (isStageCleared) {
                var C = LAYOUT.stageClear;
                if (inRect(clickX, clickY, C.map.x, C.map.y, C.map.w, C.map.h)) { currentScreen = "stagesMap"; isStageCleared = false; }
                else if (inRect(clickX, clickY, C.next.x, C.next.y, C.next.w, C.next.h)) {
                    if (currentSubStage < 200) { currentSubStage++; }
                    else { currentSubStage = 1; if (selectedRegion < 4) { selectedRegion++; } }
                    stageConfig = getStageConfig(selectedRegion, currentSubStage);
                    stageScore = 0; tower = []; comboCount = 0; particles = [];
                    obstacle.active = false; obstacleTimer = 300; swayOffset = 0;
                    spawnBox(); isStageCleared = false;
                }
                return;
            }
            if (gameOver) { gameOver = false; spawnBox(); return; }
            if (isFullGameOver) {
                var H = LAYOUT.fullGameOver.home;
                if (inRect(clickX, clickY, H.x, H.y, H.w, H.h)) { isFullGameOver = false; currentScreen = "mainMenu"; }
                return;
            }
            if (!currentBox.isDropped) { currentBox.isDropped = true; }
        }
    }

    window.addEventListener("mousedown", function (e) {
        initAudio();
        var p = getCanvasCoords(e.clientX, e.clientY);
        handleInteraction(p.x, p.y);
    });
    window.addEventListener("touchstart", function (e) {
        e.preventDefault();
        initAudio();
        var touch = e.touches[0];
        var p = getCanvasCoords(touch.clientX, touch.clientY);
        handleInteraction(p.x, p.y);
    }, { passive: false });

    loadGame();
    window.addEventListener("beforeunload", saveGame);
    window.addEventListener("pagehide", saveGame);

    gameLoop();
