/**
 * SMAART CARE - APP.JS
 * Versão: 49.0 (Beta 6)
 * Autor: Gemini & Luiz Pavani
 */

// --- 0. FIREBASE IMPORTS & CONFIG ---
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

let db = null;
let firebaseConfig = null;

async function loadFirebaseConfig() {
    const res = await fetch('./config.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('config.json não encontrado');
    return res.json();
}

function initFirebase(config) {
    try {
        const app = initializeApp(config);
        db = getFirestore(app);
        console.log("Firebase conectado:", config.projectId);
    } catch (e) {
        console.error("Erro Firebase Init:", e);
    }
}


const DEFAULT_SCREEN_REGIONS = {
    id: { x: 15, y: 750, w: 255, h: 300 },
    clock: { x: 1275, y: 750, w: 645, h: 300 }
};

const CONFIG = {
    width: 640,
    height: 720, 
    regions: {
        id: { x: 5, y: 610, w: 85, h: 100 },
        clock: { x: 425, y: 610, w: 215, h: 100 }
    },
    screenRegions: { ...DEFAULT_SCREEN_REGIONS },
    colors: {
        isYellow: (r,g,b) => r > 200 && g > 180 && b < 100,
        isWhite: (r,g,b) => r > 200 && g > 200 && b > 200
    },
    replay: {
        bufferSeconds: 60,
        fps: 30
    }
};

const ZONE_STORAGE_KEY = 'robotZonesV1';

function sanitizeRegion(region, fallback) {
    const x = Number(region?.x); const y = Number(region?.y);
    const w = Number(region?.w); const h = Number(region?.h);
    if (![x,y,w,h].every(n => Number.isFinite(n) && n >= 0)) return { ...fallback };
    return { x, y, w, h };
}

function loadScreenRegions() {
    try {
        const raw = localStorage.getItem(ZONE_STORAGE_KEY);
        if (!raw) return { ...DEFAULT_SCREEN_REGIONS };
        const parsed = JSON.parse(raw);
        return {
            id: sanitizeRegion(parsed.id, DEFAULT_SCREEN_REGIONS.id),
            clock: sanitizeRegion(parsed.clock, DEFAULT_SCREEN_REGIONS.clock)
        };
    } catch (e) {
        return { ...DEFAULT_SCREEN_REGIONS };
    }
}

function saveScreenRegions(regions) {
    localStorage.setItem(ZONE_STORAGE_KEY, JSON.stringify(regions));
    CONFIG.screenRegions = regions;
}

CONFIG.screenRegions = loadScreenRegions();

// --- 1. LIBRARY MANAGER ---
class LibraryManager {
    constructor(ui) {
        this.ui = ui;
        this.dirHandle = null;
        this.hasWritePermission = false;
        this.fileListEl = document.getElementById('file-list');
        const btnFolder = document.getElementById('btn-folder');
        btnFolder.onclick = () => this.selectFolder();
        document.getElementById('btn-refresh').onclick = () => this.refreshList();
    }
    async ensureWritePermission(allowRequest = false) {
        if (!this.dirHandle) return false;
        try {
            const current = await this.dirHandle.queryPermission({ mode: 'readwrite' });
            if (current === 'granted') { this.hasWritePermission = true; return true; }
            if (!allowRequest) return false;
            const requested = await this.dirHandle.requestPermission({ mode: 'readwrite' });
            this.hasWritePermission = requested === 'granted';
            return this.hasWritePermission;
        } catch (e) {
            return false;
        }
    }
    async selectFolder() {
        try {
            this.dirHandle = await window.showDirectoryPicker();
            await this.ensureWritePermission(true);
            const btn = document.getElementById('btn-folder');
            btn.classList.add('btn-success'); btn.innerText = "📂 1. PASTA OK";
            this.ui.log("Pasta Conectada"); await this.refreshList();
        } catch(e) {}
    }
    async refreshList() {
        if (!this.dirHandle) return;
        this.fileListEl.innerHTML = '...';
        try {
            const files = [];
            for await (const entry of this.dirHandle.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('.webm')) files.push(entry);
            }
            files.sort((a, b) => b.name.localeCompare(a.name));
            this.fileListEl.innerHTML = '';
            files.forEach(file => {
                const div = document.createElement('div');
                div.className = 'file-item';
                div.innerHTML = `<span class="material-icons" style="font-size:14px">movie</span> ${file.name.replace('.webm','')}`;
                div.onclick = async () => {
                    document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
                    div.classList.add('active');
                    this.ui.clearLogs();
                    this.ui.log(`Carregando: ${file.name}`, "neutral");
                    await this.loadLogSidecar(file.name);
                    const fileData = await file.getFile();
                    const url = URL.createObjectURL(fileData);
                    const video = document.getElementById('vid-cam');
                    video.srcObject = null; video.src = url; video.play();
                    window.videoMgr.mode = 'FILE';
                    window.videoMgr.resizeCanvas();
                    document.getElementById('replay-overlay').style.display = 'flex';
                    document.getElementById('main-canvas').classList.add('replay-full');
                };
                this.fileListEl.appendChild(div);
            });
        } catch(e) { console.error(e); }
    }
    async loadLogSidecar(videoName) {
        const jsonName = videoName.replace('.webm', '.json');
        try {
            const fileHandle = await this.dirHandle.getFileHandle(jsonName);
            const file = await fileHandle.getFile();
            const text = await file.text();
            const events = JSON.parse(text);
            if (Array.isArray(events)) { this.ui.importLogs(events); this.ui.log("Log carregado.", "success"); }
        } catch(e) {}
    }
}

// --- 2. VIDEO MANAGER ---
class VideoManager {
    constructor(ui, brain, replay) {
        this.ui = ui; this.brain = brain; this.replay = replay; this.mode = 'LIVE'; 
        this.vidCam = document.getElementById('vid-cam');
        this.vidScreen = document.getElementById('vid-screen');
        this.canvasMain = document.getElementById('main-canvas');
        this.ctxMain = this.canvasMain.getContext('2d');
        this.canvasMain.width = CONFIG.width; this.canvasMain.height = CONFIG.height;
        this.ctxMain.fillStyle = "#111"; this.ctxMain.fillRect(0, 0, CONFIG.width, CONFIG.height);
        this.ctxMain.fillStyle = "#444"; this.ctxMain.font = "16px Arial";
        this.ctxMain.fillText("1. Clique em CÂMERA", 240, 180); this.ctxMain.fillText("2. Clique em PLACAR", 240, 540);
        
        this.showZones = true;
        this.screenRect = null;
        this.camStream = null;
        this.isDrawingZone = false;
        this.zoneStart = null;
        this.zoneDraft = null;
        this.zoneEditTarget = 'id';
        this.scale = 1; this.panning = false; this.pointX = 0; this.pointY = 0; this.startX = 0; this.startY = 0;
        this.setupZoom();
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        document.getElementById('btn-cam').onclick = () => this.selectCam();
        document.getElementById('btn-screen').onclick = () => this.selectScreen();
        
        const btnZones = document.getElementById('btn-toggle-zones');
        const robotPanel = document.getElementById('robot-eyes-panel');
        const applyZoneState = () => {
            if (this.showZones) {
                btnZones.classList.add('active');
                if(robotPanel) robotPanel.style.display = 'block';
                if (this.ui) this.ui.log("ZONAS: arraste no placar (SHIFT = CRONÔMETRO)", "neutral");
            } else {
                btnZones.classList.remove('active');
                if(robotPanel) robotPanel.style.display = 'none';
            }
        };
        applyZoneState();
        btnZones.onclick = () => { this.showZones = !this.showZones; applyZoneState(); };

        this.bindZoneDrawing();

        this.loop();
    }

    resizeCanvas() {
        const stage = document.querySelector('.video-stage');
        if (!stage) return;
        const rect = stage.getBoundingClientRect();
        this.canvasMain.width = rect.width;
        this.canvasMain.height = rect.height;
    }

    setupZoom() {
        const stage = document.querySelector('.video-stage');
        stage.addEventListener('wheel', (e) => {
            e.preventDefault();
            const xs = (e.clientX - this.pointX) / this.scale;
            const ys = (e.clientY - this.pointY) / this.scale;
            const delta = -Math.sign(e.deltaY);
            const oldScale = this.scale;
            this.scale += delta * 0.1;
            this.scale = Math.min(Math.max(1, this.scale), 5);
            if (oldScale !== this.scale) {
                this.pointX = e.clientX - xs * this.scale;
                this.pointY = e.clientY - ys * this.scale;
                this.updateTransform();
            }
        });
        stage.addEventListener('mousedown', (e) => {
            if(this.scale > 1) { 
                e.preventDefault(); this.startX = e.clientX - this.pointX; this.startY = e.clientY - this.pointY;
                this.panning = true; stage.style.cursor = 'grabbing';
            }
        });
        window.addEventListener('mouseup', () => { this.panning = false; stage.style.cursor = 'default'; });
        window.addEventListener('mousemove', (e) => {
            if (!this.panning) return; e.preventDefault();
            this.pointX = e.clientX - this.startX; this.pointY = e.clientY - this.startY;
            this.updateTransform();
        });
    }
    bindZoneDrawing() {
        const canvas = this.canvasMain;
        if (!canvas) return;

        const getCanvasPoint = (e) => {
            const rect = canvas.getBoundingClientRect();
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };

        canvas.addEventListener('mousedown', (e) => {
            if (!this.showZones || this.mode !== 'LIVE') return;
            if (!this.screenRect) return;
            this.zoneEditTarget = e.shiftKey ? 'clock' : 'id';
            this.isDrawingZone = true;
            this.zoneStart = getCanvasPoint(e);
            this.zoneDraft = { x: this.zoneStart.x, y: this.zoneStart.y, w: 0, h: 0, target: this.zoneEditTarget };
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!this.isDrawingZone || !this.zoneStart) return;
            const p = getCanvasPoint(e);
            const x1 = this.zoneStart.x;
            const y1 = this.zoneStart.y;
            const x2 = p.x;
            const y2 = p.y;
            const x = Math.min(x1, x2);
            const y = Math.min(y1, y2);
            const w = Math.abs(x2 - x1);
            const h = Math.abs(y2 - y1);
            this.zoneDraft = { x, y, w, h, target: this.zoneEditTarget };
        });

        window.addEventListener('mouseup', () => {
            if (!this.isDrawingZone || !this.zoneDraft) return;
            const rect = this.clampToScreen(this.zoneDraft);
            const mapped = this.canvasRectToScreenRegion(rect);
            if (mapped) {
                const next = { ...CONFIG.screenRegions };
                next[this.zoneDraft.target] = mapped;
                saveScreenRegions(next);
                if (window.updateZoneInputs) window.updateZoneInputs(next);
            }
            this.isDrawingZone = false;
            this.zoneStart = null;
            this.zoneDraft = null;
        });
    }
    clampToScreen(rect) {
        if (!this.screenRect) return rect;
        const sr = this.screenRect;
        const x = Math.max(sr.x, Math.min(rect.x, sr.x + sr.w));
        const y = Math.max(sr.y, Math.min(rect.y, sr.y + sr.h));
        const maxX = Math.max(sr.x, Math.min(rect.x + rect.w, sr.x + sr.w));
        const maxY = Math.max(sr.y, Math.min(rect.y + rect.h, sr.y + sr.h));
        return { x, y, w: Math.max(1, maxX - x), h: Math.max(1, maxY - y), target: rect.target };
    }
    updateTransform() {
        this.canvasMain.style.transform = `translate(${this.pointX}px, ${this.pointY}px) scale(${this.scale})`;
        this.canvasMain.style.transformOrigin = '0 0';
    }
    resetZoom() {
        this.scale = 1; this.pointX = 0; this.pointY = 0;
        this.canvasMain.style.transform = `translate(0px, 0px) scale(1)`;
    }

    async selectCam() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720, frameRate: { ideal: 30, max: 30 } }
            });
            this.camStream = stream;
            this.vidCam.srcObject = stream; this.vidCam.play();
            document.getElementById('btn-cam').classList.add('active'); this.ui.log("Câmera OK");
        } catch(e) { alert("Erro Câmera: " + e.message); }
    }
    async selectScreen() {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: false });
            this.vidScreen.srcObject = stream; this.vidScreen.play();
            document.getElementById('btn-screen').classList.add('active'); this.ui.log("Placar OK");
        } catch(e) { console.error(e); }
    }
    loop() {
        requestAnimationFrame(() => this.loop());
        if (this.mode === 'LIVE') {
            const cw = this.canvasMain.width;
            const ch = this.canvasMain.height;
            const halfH = ch / 2;
            
            this.ctxMain.fillStyle = "#000";
            this.ctxMain.fillRect(0, 0, cw, ch);
            
            if (this.vidCam.readyState >= 2) {
                this.drawContain(this.vidCam, 0, 0, cw, halfH);
            }
            
            if (this.vidScreen.readyState >= 2) {
                const screenRect = this.drawContain(this.vidScreen, 0, halfH, cw, halfH);
                if (screenRect) this.screenRect = screenRect;
                this.brain.processFrame(this.canvasMain); 
            }
            if (this.showZones) this.drawOverlay();
            this.replay.captureFrame(this.vidCam);
        } else if (this.mode === 'REPLAY') {
            const frame = this.replay.getFrameToDraw();
            if (frame) this.drawReplayFrame(frame);
            this.replay.autoPlayTick();
        } else if (this.mode === 'FILE') {
             if (this.vidCam.readyState >= 2) {
                const frame = this.vidCam;
                this.drawReplayFrame(frame);
             }
        }
    }
    drawReplayFrame(frame) {
        const cw = this.canvasMain.width;
        const ch = this.canvasMain.height;
        this.ctxMain.fillStyle = "#000";
        this.ctxMain.fillRect(0, 0, cw, ch);
        const fw = frame.width || 640;
        const fh = frame.height || 360;
        const scale = Math.min(cw / fw, ch / fh);
        const dw = Math.floor(fw * scale);
        const dh = Math.floor(fh * scale);
        const dx = Math.floor((cw - dw) / 2);
        const dy = Math.floor((ch - dh) / 2);
        this.ctxMain.drawImage(frame, dx, dy, dw, dh);
    }
    getContainRect(video, x, y, w, h) {
        const vw = video.videoWidth || video.width || 1280;
        const vh = video.videoHeight || video.height || 720;
        const scale = Math.min(w / vw, h / vh);
        const dw = vw * scale;
        const dh = vh * scale;
        const dx = x + (w - dw) / 2;
        const dy = y + (h - dh) / 2;
        return { x: dx, y: dy, w: dw, h: dh, videoWidth: vw, videoHeight: vh };
    }
    drawContain(video, x, y, w, h) {
        const rect = this.getContainRect(video, x, y, w, h);
        this.ctxMain.save();
        this.ctxMain.beginPath();
        this.ctxMain.rect(x, y, w, h);
        this.ctxMain.clip();
        this.ctxMain.drawImage(video, rect.x, rect.y, rect.w, rect.h);
        this.ctxMain.restore();
        return rect;
    }
    getScreenRegion(region) {
        if (!this.screenRect) return null;
        const rect = this.screenRect;
        const scaleX = rect.w / rect.videoWidth;
        const scaleY = rect.h / rect.videoHeight;
        return {
            x: rect.x + (region.x * scaleX),
            y: rect.y + (region.y * scaleY),
            w: region.w * scaleX,
            h: region.h * scaleY
        };
    }
    canvasRectToScreenRegion(rect) {
        if (!this.screenRect) return null;
        const sr = this.screenRect;
        const scaleX = sr.w / sr.videoWidth;
        const scaleY = sr.h / sr.videoHeight;
        const x = (rect.x - sr.x) / scaleX;
        const y = (rect.y - sr.y) / scaleY;
        const w = rect.w / scaleX;
        const h = rect.h / scaleY;
        return {
            x: Math.max(0, Math.round(x)),
            y: Math.max(0, Math.round(y)),
            w: Math.max(1, Math.round(w)),
            h: Math.max(1, Math.round(h))
        };
    }
    drawOverlay() {
        const ctx = this.ctxMain; ctx.lineWidth = 2;
        const rID = this.getScreenRegion(CONFIG.screenRegions.id) || CONFIG.regions.id;
        ctx.strokeStyle = "rgba(0, 150, 255, 0.5)"; ctx.strokeRect(rID.x, rID.y, rID.w, rID.h);
        const rClk = this.getScreenRegion(CONFIG.screenRegions.clock) || CONFIG.regions.clock;
        ctx.strokeStyle = "rgba(255, 200, 0, 0.5)"; ctx.strokeRect(rClk.x, rClk.y, rClk.w, rClk.h);
        if (this.zoneDraft) {
            ctx.save();
            ctx.setLineDash([6, 4]);
            ctx.strokeStyle = this.zoneDraft.target === 'clock' ? "rgba(255, 200, 0, 0.9)" : "rgba(0, 150, 255, 0.9)";
            const rect = this.clampToScreen(this.zoneDraft);
            ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
            ctx.restore();
        }
    }
    goBackToLive() {
        this.mode = 'LIVE';
        if (this.vidCam.src && !this.vidCam.srcObject) this.vidCam.src = "";
        if (!this.vidCam.srcObject && this.camStream) {
            this.vidCam.srcObject = this.camStream;
        }
        if (this.vidCam.srcObject) this.vidCam.play();
        this.replay.exitReplayMode();
        this.resetZoom();
        this.resizeCanvas();
        document.getElementById('main-canvas').classList.remove('replay-full');
        document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
        this.ui.log("AO VIVO", "neutral");
    }
}

// --- 3. REPLAY SYSTEM ---
class ReplaySystem {
    constructor() {
        this.buffer = []; this.maxFrames = CONFIG.replay.bufferSeconds * CONFIG.replay.fps; 
        this.isReplaying = false; this.currentIndex = 0; this.playbackSpeed = 1.0;
        this.loopA = null; this.loopB = null; this.jogAcc = 0;
        this.slider = document.getElementById('seek-slider');
        this.timeDisplay = document.getElementById('replay-time');
        this.fileVideo = document.getElementById('vid-cam');
        this.fileFps = 30;
        this.bindFileVideo();
        this.setupControls();
        this.setupHotkeys();
    }
    bindFileVideo() {
        if (!this.fileVideo) return;
        this.fileVideo.onloadedmetadata = () => this.updateFileUI();
        this.fileVideo.ontimeupdate = () => this.updateFileUI();
        this.fileVideo.onplay = () => { this.setPlayIcon(true); this.updateFileUI(); };
        this.fileVideo.onpause = () => { this.setPlayIcon(false); this.updateFileUI(); };
    }
    isFileMode() {
        return window.videoMgr && window.videoMgr.mode === 'FILE';
    }
    formatTime(seconds) {
        if (!isFinite(seconds)) return "00:00";
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }
    updateFileUI() {
        if (!this.isFileMode() || !this.fileVideo) return;
        const v = this.fileVideo;
        if (!isFinite(v.duration) || v.duration === 0) return;
        const progress = (v.currentTime / v.duration) * 100;
        if (!Number.isNaN(progress)) this.slider.value = progress;
        this.timeDisplay.innerText = `${this.formatTime(v.currentTime)} / ${this.formatTime(v.duration)}`;
    }
    toggleFilePlay(playIcon) {
        if (!this.fileVideo) return;
        if (this.fileVideo.paused) {
            this.fileVideo.play();
            if (playIcon) playIcon.innerText = "pause";
        } else {
            this.fileVideo.pause();
            if (playIcon) playIcon.innerText = "play_arrow";
        }
    }
    setPlayIcon(isPlaying) {
        const icon = document.querySelector('#btn-play-pause span');
        if (!icon) return;
        icon.innerText = isPlaying ? "pause" : "play_arrow";
    }
    stepFile(dir) {
        if (!this.fileVideo || !isFinite(this.fileVideo.duration)) return;
        this.fileVideo.pause();
        const delta = dir * (1 / this.fileFps);
        const next = Math.min(Math.max(0, this.fileVideo.currentTime + delta), this.fileVideo.duration);
        this.fileVideo.currentTime = next;
        this.updateFileUI();
    }
    jumpFileSeconds(sec) {
        if (!this.fileVideo || !isFinite(this.fileVideo.duration)) return;
        this.fileVideo.pause();
        const next = Math.min(Math.max(0, this.fileVideo.currentTime + sec), this.fileVideo.duration);
        this.fileVideo.currentTime = next;
        this.updateFileUI();
    }
    jumpReplaySeconds(sec) {
        this.enterReplayMode();
        this.playbackSpeed = 0;
        const frame = this.buffer[Math.floor(this.currentIndex)];
        if (!frame) return;
        const target = frame.timestamp + (sec * 1000);
        let best = this.currentIndex, min = Infinity;
        for (let i = 0; i < this.buffer.length; i++) {
            const diff = Math.abs(this.buffer[i].timestamp - target);
            if (diff < min) { min = diff; best = i; }
        }
        this.currentIndex = best;
        this.updateTimeDisplay();
        this.setPlayIcon(false);
    }
    setupHotkeys() {
        document.addEventListener('keydown', (e) => {
            if (document.activeElement.tagName === 'INPUT') return;
            switch(e.code) {
                case 'Space': e.preventDefault(); document.getElementById('btn-play-pause').click(); break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (this.isFileMode()) { this.stepFile(-1); this.setPlayIcon(false); }
                    else { this.enterReplayMode(); this.playbackSpeed = 0; this.step(-1); }
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (this.isFileMode()) { this.stepFile(1); this.setPlayIcon(false); }
                    else { this.enterReplayMode(); this.playbackSpeed = 0; this.step(1); }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    if (this.isFileMode()) this.jumpFileSeconds(5);
                    else this.jumpReplaySeconds(5);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    if (this.isFileMode()) this.jumpFileSeconds(-5);
                    else this.jumpReplaySeconds(-5);
                    break;
                case 'KeyA': e.preventDefault(); document.getElementById('btn-loop-a').click(); break;
                case 'KeyB': e.preventDefault(); document.getElementById('btn-loop-b').click(); break;
                case 'KeyC': e.preventDefault(); document.getElementById('btn-loop-clr').click(); break;
                case 'Digit1': e.preventDefault(); document.getElementById('btn-speed-100').click(); break;
                case 'Digit2': e.preventDefault(); document.getElementById('btn-speed-050').click(); break;
                case 'Digit3': e.preventDefault(); this.setSpeedCustom(0.33); break;
                case 'Digit4': e.preventDefault(); document.getElementById('btn-speed-025').click(); break;
                case 'Enter': e.preventDefault(); window.videoMgr.goBackToLive(); break;
                case 'Escape': e.preventDefault(); window.videoMgr.goBackToLive(); break;
            }
        });
    }
    setSpeedCustom(s) {
        if (this.isFileMode() && this.fileVideo) this.fileVideo.playbackRate = s;
        this.playbackSpeed = s;
        document.querySelectorAll('.speed-group button').forEach(b => b.classList.remove('active'));
        this.setPlayIcon(s > 0);
    }
    setupControls() {
        const btnPlay = document.getElementById('btn-play-pause');
        const playIcon = btnPlay.querySelector('span');
        btnPlay.onclick = () => {
            if (this.isFileMode()) {
                this.toggleFilePlay(playIcon);
                return;
            }
            if (!this.isReplaying) this.enterReplayMode();
            if (this.playbackSpeed > 0) { this.playbackSpeed = 0; playIcon.innerText = "play_arrow"; }
            else { this.playbackSpeed = 1.0; playIcon.innerText = "pause"; }
        };
        document.getElementById('btn-live').onclick = () => window.videoMgr.goBackToLive();
        const footerLive = document.getElementById('btn-footer-live');
        if(footerLive) footerLive.onclick = () => window.videoMgr.goBackToLive();
        document.getElementById('btn-frame-back').onclick = () => { 
            if (this.isFileMode()) { this.stepFile(-1); playIcon.innerText="play_arrow"; return; }
            this.playbackSpeed = 0; this.step(-1); playIcon.innerText="play_arrow"; 
        };
        document.getElementById('btn-frame-fwd').onclick = () => { 
            if (this.isFileMode()) { this.stepFile(1); playIcon.innerText="play_arrow"; return; }
            this.playbackSpeed = 0; this.step(1); playIcon.innerText="play_arrow"; 
        };
        this.slider.oninput = (e) => {
            if (this.isFileMode()) {
                if (this.fileVideo && isFinite(this.fileVideo.duration)) {
                    this.fileVideo.currentTime = (parseInt(e.target.value)/100) * this.fileVideo.duration;
                    this.fileVideo.pause();
                    playIcon.innerText="play_arrow";
                }
                return;
            }
            if(!this.isReplaying) this.enterReplayMode();
            this.playbackSpeed = 0; playIcon.innerText="play_arrow";
            this.currentIndex = Math.floor((parseInt(e.target.value)/100) * (this.buffer.length-1));
            this.updateTimeDisplay();
        };
        const setSpeed = (s, id) => {
            if (this.isFileMode() && this.fileVideo) {
                this.fileVideo.playbackRate = s;
            }
            this.playbackSpeed = s;
            document.querySelectorAll('.speed-group button').forEach(b => b.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            if(s > 0) playIcon.innerText = "pause";
        };
        document.getElementById('btn-speed-025').onclick = () => setSpeed(0.25, 'btn-speed-025');
        document.getElementById('btn-speed-050').onclick = () => setSpeed(0.5, 'btn-speed-050');
        document.getElementById('btn-speed-100').onclick = () => setSpeed(1.0, 'btn-speed-100');
        document.getElementById('btn-loop-a').onclick = () => { this.loopA = this.currentIndex; document.getElementById('btn-loop-a').classList.add('active'); };
        document.getElementById('btn-loop-b').onclick = () => { this.loopB = this.currentIndex; document.getElementById('btn-loop-b').classList.add('active'); this.currentIndex = this.loopA || 0; this.playbackSpeed = 1.0; playIcon.innerText = "pause"; };
        document.getElementById('btn-loop-clr').onclick = () => { this.loopA = null; this.loopB = null; document.getElementById('btn-loop-a').classList.remove('active'); document.getElementById('btn-loop-b').classList.remove('active'); };

        const wheel = document.getElementById('jog-wheel');
        const wheelAnchor = wheel.parentElement; 
        if(wheel && wheelAnchor) {
            let isDragging = false, lastAngle = 0;
            wheel.onmousedown = (e) => { 
                isDragging = true; 
                if (this.isFileMode()) {
                    if (this.fileVideo) this.fileVideo.pause();
                    playIcon.innerText="play_arrow";
                    this.updateFileUI();
                } else {
                    this.enterReplayMode(); this.playbackSpeed = 0; playIcon.innerText="play_arrow";
                    this.updateTimeDisplay();
                }
                this.jogAcc = 0; e.preventDefault(); 
                const rect = wheelAnchor.getBoundingClientRect();
                lastAngle = Math.atan2(e.clientY - (rect.top + rect.height/2), e.clientX - (rect.left + rect.width/2)) * (180 / Math.PI);
            };
            window.addEventListener('mouseup', () => { isDragging = false; });
            window.addEventListener('mousemove', (e) => {
                if(!isDragging) return;
                const rect = wheelAnchor.getBoundingClientRect();
                const currentAngle = Math.atan2(e.clientY - (rect.top + rect.height/2), e.clientX - (rect.left + rect.width/2)) * (180 / Math.PI);
                let delta = currentAngle - lastAngle;
                if (delta > 180) delta -= 360; if (delta < -180) delta += 360;
                this.jogAcc += delta;
                if (Math.abs(this.jogAcc) > 2) {
                    const dir = Math.sign(this.jogAcc); 
                    if (this.isFileMode()) this.stepFile(dir);
                    else this.step(dir); 
                    this.jogAcc = 0;
                }
                wheel.style.transform = `rotate(${currentAngle}deg)`;
                lastAngle = currentAngle;
            });
        }
    }
    captureFrame(source) {
        if (!source) return;
        if (source.readyState !== undefined && source.readyState < 2) return;
        createImageBitmap(source).then(bmp => {
            this.buffer.push({ img: bmp, timestamp: Date.now() });
            if (this.buffer.length > this.maxFrames) {
                const old = this.buffer.shift(); old.img.close();
                if (this.loopA !== null) this.loopA = Math.max(0, this.loopA - 1);
                if (this.loopB !== null) this.loopB = Math.max(0, this.loopB - 1);
            }
        });
    }
    getFrameToDraw() {
        if (this.buffer.length === 0) return null;
        if (this.currentIndex < 0) this.currentIndex = 0;
        if (this.currentIndex >= this.buffer.length) this.currentIndex = this.buffer.length - 1;
        return this.buffer[Math.floor(this.currentIndex)].img;
    }
    autoPlayTick() {
        if (this.isReplaying && this.playbackSpeed > 0) {
            this.currentIndex += (0.5 * this.playbackSpeed);
            if (this.loopB !== null && this.currentIndex >= this.loopB) this.currentIndex = (this.loopA !== null) ? this.loopA : 0;
            else if (this.currentIndex >= this.buffer.length - 1) this.currentIndex = this.buffer.length - 1;
            this.slider.value = (this.currentIndex / (this.buffer.length-1)) * 100;
            this.updateTimeDisplay();
        }
    }
    step(dir) {
        this.currentIndex += dir;
        if (this.currentIndex < 0) this.currentIndex = 0;
        if (this.currentIndex >= this.buffer.length) this.currentIndex = this.buffer.length - 1;
        if (this.buffer.length > 1) this.slider.value = (this.currentIndex / (this.buffer.length - 1)) * 100;
        this.updateTimeDisplay();
    }
    enterReplayMode() {
        if(this.isReplaying) return;
        this.isReplaying = true; window.videoMgr.mode = 'REPLAY';
        window.videoMgr.resizeCanvas();
        document.getElementById('replay-overlay').style.display = 'flex';
        this.playbackSpeed = 0.5;
        this.setPlayIcon(true);
        document.getElementById('main-canvas').classList.add('replay-full');
    }
    exitReplayMode() {
        this.isReplaying = false; document.getElementById('replay-overlay').style.display = 'none';
        this.slider.value = 100; this.timeDisplay.innerText = "LIVE";
        this.setPlayIcon(false);
        document.getElementById('main-canvas').classList.remove('replay-full');
        this.loopA = null; this.loopB = null;
        document.getElementById('btn-loop-a').classList.remove('active');
        document.getElementById('btn-loop-b').classList.remove('active');
    }
    updateTimeDisplay() {
        if (this.isFileMode()) {
            this.updateFileUI();
            return;
        }
        const frame = this.buffer[Math.floor(this.currentIndex)];
        if(frame) {
            const diff = (Date.now() - frame.timestamp) / 1000;
            this.timeDisplay.innerText = `-${diff.toFixed(1)}s`;
            if (this.buffer.length > 1) this.slider.value = (this.currentIndex / (this.buffer.length - 1)) * 100;
        }
    }
    jumpToTimestamp(targetTime) {
        this.enterReplayMode(); this.playbackSpeed = 0; document.querySelector('#btn-play-pause span').innerText = "play_arrow";
        let target = targetTime - 5000; let best = 0, min = Infinity;
        for (let i = 0; i < this.buffer.length; i++) {
            const diff = Math.abs(this.buffer[i].timestamp - target);
            if (diff < min) { min = diff; best = i; }
        }
        this.currentIndex = best; this.updateTimeDisplay();
    }
}

// --- 4. BRAIN ---
class Brain {
    constructor(ui) {
        this.ui = ui;
        this.ctxDebugID = document.getElementById('debug-canvas-id').getContext('2d');
        this.ctxDebugClock = document.getElementById('debug-canvas-clock').getContext('2d');
        this.clockStatus = "---"; this.currentMatchID = ""; this.lastOCRTime = 0; this.lastColorCheck = 0;
        this.initOCR();
    }
    async initOCR() {
        if(typeof Tesseract !== 'undefined') {
            this.ocrWorker = await Tesseract.createWorker('eng');
            await this.ocrWorker.setParameters({ tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-' });
        }
    }
    processFrame(sourceCanvas) {
        const cID = document.getElementById('debug-canvas-id');
        const cClk = document.getElementById('debug-canvas-clock');
        const mappedClock = window.videoMgr?.getScreenRegion(CONFIG.screenRegions.clock);
        const mappedID = window.videoMgr?.getScreenRegion(CONFIG.screenRegions.id);
        const rClk = mappedClock || CONFIG.regions.clock;
        const rID = mappedID || CONFIG.regions.id;
        this.ctxDebugClock.drawImage(sourceCanvas, rClk.x, rClk.y, rClk.w, rClk.h, 0, 0, cClk.width, cClk.height);
        this.ctxDebugID.drawImage(sourceCanvas, rID.x, rID.y, rID.w, rID.h, 0, 0, cID.width, cID.height);
        const now = Date.now();
        if (now - this.lastOCRTime > 1000) { this.runOCR(); this.lastOCRTime = now; }
        if (now - this.lastColorCheck > 150) { this.analyzeClockColor(); this.lastColorCheck = now; }
    }
    analyzeClockColor() {
        const w = document.getElementById('debug-canvas-clock').width;
        const h = document.getElementById('debug-canvas-clock').height;
        const data = this.ctxDebugClock.getImageData(0, 0, w, h).data;
        let y=0, wh=0;
        for(let i=0; i<data.length; i+=16) {
            if(CONFIG.colors.isYellow(data[i], data[i+1], data[i+2])) y++;
            else if(CONFIG.colors.isWhite(data[i], data[i+1], data[i+2])) wh++;
        }
        let st = this.clockStatus;
        if(y>50) st="MATE"; else if(wh>50) st="HAJIME";
        if(st !== this.clockStatus) {
            this.clockStatus = st;
            const t = document.getElementById('debug-text-clock'); t.innerText = st;
            if(st==="HAJIME") { t.style.color="#0f0"; this.ui.log("HAJIME", "highlight", Date.now()); }
            else if(st==="MATE") { t.style.color="#f00"; this.ui.log("MATE", "alert", Date.now()); }
        }
    }
    async runOCR() {
        if(!this.ocrWorker) return;
        this.applyTunnelFilter(this.ctxDebugID, 100, 100);
        try {
            const { data: { text } } = await this.ocrWorker.recognize(document.getElementById('debug-canvas-id').toDataURL());
            let cl = text.trim().replace(/[^A-Z0-9-]/g, ""); 
            if(cl.length >= 2) {
                document.getElementById('debug-text-id').innerText = cl;
                const input = document.getElementById('match-id-input');
                if (document.activeElement !== input) input.value = cl;
                if(cl !== this.currentMatchID) {
                    this.currentMatchID = cl;
                    this.ui.clearLogs();
                    this.ui.log(`LUTA: ${cl}`, "neutral", Date.now());
                    if(window.recorder) window.recorder.switchFile(cl);
                }
            }
        } catch(e){}
    }
    applyTunnelFilter(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const edgeMargin = 5;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                if (x < edgeMargin || x > width - edgeMargin) {
                    data[i] = 255; data[i+1] = 255; data[i+2] = 255; continue;
                }
                const avg = (data[i] + data[i+1] + data[i+2]) / 3;
                const val = avg < 80 ? 0 : 255; 
                data[i] = val; data[i+1] = val; data[i+2] = val;
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }
}

class UI {
    constructor() { this.logList = document.getElementById('event-log'); this.currentEvents = []; }
    
    // --- LÓGICA ATUALIZADA COM FIREBASE ---
    log(msg, type="neutral", ts=null) {
        // 1. Atualiza a tela (Visual)
        const div = document.createElement('div');
        div.className = `log-item ${type}`;
        if(ts) { div.style.cursor="pointer"; div.title="Replay -5s"; div.onclick=()=>window.replay.jumpToTimestamp(ts); }
        div.innerHTML = `<div class="log-content">${ts?'<span class="material-icons" style="font-size:12px;margin-right:5px">history</span>':''}<span class="log-text">${msg}</span></div><span class="log-time">${new Date().toLocaleTimeString().split(' ')[0]}</span>`;
        this.logList.insertBefore(div, this.logList.firstChild);
        this.currentEvents.push({ msg, type, ts });

        // 2. Salva no Banco de Dados (Firestore)
        if(db) {
            const dbStatus = document.getElementById('db-status');
            dbStatus.innerText = "DB: Salvando...";
            dbStatus.style.color = "#fb0";
            
            addDoc(collection(db, "var_logs"), {
                mensagem: msg,
                tipo: type,
                timestamp_video: ts,
                data_real: serverTimestamp(),
                luta_id: document.getElementById('match-id-input').value || "N/A"
            }).then(() => {
                dbStatus.innerText = "DB: OK";
                dbStatus.style.color = "#0f0";
            }).catch(err => {
                console.error("Erro DB:", err);
                dbStatus.innerText = "DB: Erro";
                dbStatus.style.color = "#f00";
            });
        }
    }

    clearLogs() { this.logList.innerHTML = ''; this.currentEvents = []; }
    getEvents() { return this.currentEvents; }
    importLogs(events) { this.clearLogs(); events.forEach(evt => this.log(evt.msg, evt.type, evt.ts)); }
}

class Recorder {
    constructor(ui, library) {
        this.ui = ui; this.library = library; this.mediaRecorder = null; this.startTime = 0; this.currentFilenameBase = "";
        document.getElementById('btn-new-match').onclick = () => {
            const manualName = document.getElementById('match-id-input').value || "Manual_" + Date.now();
            this.start(manualName, true);
        };
        document.getElementById('btn-stop-rec').onclick = () => this.stop();
    }
    async switchFile(id) { 
        if(this.mediaRecorder && this.mediaRecorder.state==="recording") { 
            this.ui.log(`Fim Automático: ${this.currentFilenameBase}`, "neutral");
            this.stop(); setTimeout(()=>this.start(id, false), 1500); 
        } else {
            this.ui.log(`Início Automático: ${id}`, "highlight");
            this.start(id, false);
        }
    }
    async start(base, allowPermissionRequest = false) {
        if(!this.library.dirHandle) { this.ui.log("ERRO: Selecione a PASTA!", "alert"); return; }
        const hasPerm = await this.library.ensureWritePermission(allowPermissionRequest);
        if (!hasPerm) {
            this.ui.log("Permissão necessária. Clique em PASTA para autorizar.", "alert");
            return;
        }
        const cam = document.getElementById('vid-cam');
        if (!cam || (!cam.srcObject && !cam.src)) { this.ui.log("ERRO: Conecte a CÂMERA!", "alert"); return; }
        document.getElementById('match-id-input').value = base;
        this.currentFilenameBase = base.replace(/[^a-z0-9-]/gi,'_').toUpperCase();
        const videoName = this.currentFilenameBase + ".webm";
        try {
            const stream = cam.captureStream(30);
            const fh = await this.library.dirHandle.getFileHandle(videoName, {create:true});
            const writable = await fh.createWritable();
            this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
            this.mediaRecorder.ondataavailable = async e => { if(e.data.size>0) await writable.write(e.data); };
            this.mediaRecorder.onstop = async () => { await writable.close(); await this.saveJsonLog(); this.ui.log("Salvo: "+videoName); this.library.refreshList(); };
            this.mediaRecorder.start(1000); this.startTime = Date.now(); this.setRec(true, this.currentFilenameBase);
            this.timerLoop();
        } catch(e) { this.ui.log("Erro ao iniciar REC: "+e.message, "alert"); }
    }
    async saveJsonLog() {
        try {
            const jsonName = this.currentFilenameBase + ".json";
            const fh = await this.library.dirHandle.getFileHandle(jsonName, {create:true});
            const writable = await fh.createWritable();
            const events = this.ui.getEvents();
            await writable.write(JSON.stringify(events, null, 2));
            await writable.close();
        } catch(e) { console.error("Erro JSON", e); }
    }
    stop() { if(this.mediaRecorder) this.mediaRecorder.stop(); this.setRec(false); }
    setRec(isRec, t="") {
        const status = document.getElementById('rec-status-text');
        if(isRec) { 
            if(status) { status.innerText = "GRAVANDO..."; status.style.color = "#f00"; }
        } 
        else { 
            if(status) { status.innerText = "STATUS: PRONTO"; status.style.color = "#666"; }
        }
        document.getElementById('btn-new-match').disabled = isRec;
        document.getElementById('btn-stop-rec').disabled = !isRec;
    }
    timerLoop() {
        if(this.mediaRecorder && this.mediaRecorder.state==="recording") {
            const d = Math.floor((Date.now()-this.startTime)/1000);
            const m=Math.floor(d/60).toString().padStart(2,'0'), s=(d%60).toString().padStart(2,'0');
            document.getElementById('rec-duration').innerText = `${m}:${s}`;
            requestAnimationFrame(()=>this.timerLoop());
        }
    }
}

function initZoneControls(ui) {
    const ids = {
        id: {
            x: document.getElementById('zone-id-x'),
            y: document.getElementById('zone-id-y'),
            w: document.getElementById('zone-id-w'),
            h: document.getElementById('zone-id-h')
        },
        clock: {
            x: document.getElementById('zone-clock-x'),
            y: document.getElementById('zone-clock-y'),
            w: document.getElementById('zone-clock-w'),
            h: document.getElementById('zone-clock-h')
        }
    };
    const btnApply = document.getElementById('btn-zone-apply');
    const btnReset = document.getElementById('btn-zone-reset');
    if (!btnApply || !btnReset) return;

    const setInputs = (regions) => {
        Object.keys(ids).forEach(key => {
            ids[key].x.value = regions[key].x;
            ids[key].y.value = regions[key].y;
            ids[key].w.value = regions[key].w;
            ids[key].h.value = regions[key].h;
        });
    };

    const readInputs = () => ({
        id: {
            x: Number(ids.id.x.value),
            y: Number(ids.id.y.value),
            w: Number(ids.id.w.value),
            h: Number(ids.id.h.value)
        },
        clock: {
            x: Number(ids.clock.x.value),
            y: Number(ids.clock.y.value),
            w: Number(ids.clock.w.value),
            h: Number(ids.clock.h.value)
        }
    });

    setInputs(CONFIG.screenRegions);
    window.updateZoneInputs = setInputs;

    btnApply.onclick = () => {
        const next = {
            id: sanitizeRegion(readInputs().id, CONFIG.screenRegions.id),
            clock: sanitizeRegion(readInputs().clock, CONFIG.screenRegions.clock)
        };
        saveScreenRegions(next);
        if (ui) ui.log("Zonas atualizadas", "neutral");
    };

    btnReset.onclick = () => {
        saveScreenRegions({ ...DEFAULT_SCREEN_REGIONS });
        setInputs(CONFIG.screenRegions);
        if (ui) ui.log("Zonas resetadas", "neutral");
    };
}

// BOOT
async function initApp() {
    try {
        firebaseConfig = await loadFirebaseConfig();
        initFirebase(firebaseConfig);
    } catch (e) {
        console.warn("Firebase desativado:", e.message);
    }

    const ui = new UI();
    const library = new LibraryManager(ui); window.library = library;
    const replay = new ReplaySystem(); window.replay = replay;
    const brain = new Brain(ui); window.brain = brain;
    const videoMgr = new VideoManager(ui, brain, replay); window.videoMgr = videoMgr;
    const recorder = new Recorder(ui, library); window.recorder = recorder;

    initZoneControls(ui);
}

initApp();
