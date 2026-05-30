const Memory = {
    init: () => { if (!localStorage.getItem('spirit_meet')) localStorage.setItem('spirit_meet', Date.now()); },
    get: (k) => localStorage.getItem('spirit_' + k),
    set: (k, v) => localStorage.setItem('spirit_' + k, v),
    addStar: () => { let s = parseInt(Memory.get('stars') || 0) + 1; Memory.set('stars', s); return s; },
    refresh: () => {
        const name = Memory.get('name'); if (!name) return;
        const meetTime = parseInt(localStorage.getItem('spirit_meet'));
        const days = Math.floor((Date.now() - meetTime) / (1000 * 60 * 60 * 24)) + 1;
        const stars = Memory.get('stars') || 0;
        document.getElementById('badge-ui').innerHTML = `${name}的陪伴者<br>陪伴 ${days} 天 | 星星 ${stars}`;
    },
    saveOrb: (orbData) => {
        let orbs = JSON.parse(localStorage.getItem('spirit_orbs') || '[]');
        orbs.push(orbData); if(orbs.length > 60) orbs.shift(); 
        localStorage.setItem('spirit_orbs', JSON.stringify(orbs));
    },
    getOrbs: () => JSON.parse(localStorage.getItem('spirit_orbs') || '[]')
};

const dom = {
    spirit: document.getElementById('spirit'),
    bWrap: document.getElementById('breath-wrap'),
    bubble: document.getElementById('bubble'),
    mouth: document.getElementById('mouth'),
    face: document.getElementById('face'),
    expressArea: document.getElementById('express-area'),
    orbContainer: document.getElementById('orb-container'),
    timer: document.getElementById('focus-timer'),
    exitFocus: document.getElementById('exit-focus'),
    eyes: document.querySelectorAll('.eye'),
    blushes: document.querySelectorAll('.blush')
};

let currentMode = 'idle', breathTimer = null, focusInt = null, isPetting = false, petStartPos = {x:0, y:0};
let currentImage = null;

window.onload = () => { 
    Memory.init(); createStars(); updateTimeTheme(); loadOldOrbs(); 
    TimeTunnel.init();
    if (!Memory.get('name')) document.getElementById('onboarding').style.display = 'flex'; 
    else welcomeUser(); 
    
    document.addEventListener('click', (e) => {
        console.log('🎯 全局点击:', e.target, 'class:', e.target.className);
    }, true);
    
    initImageUpload();
};

function initImageUpload() {
    const imageInput = document.getElementById('image-input');
    const imagePreview = document.getElementById('image-preview');
    
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            currentImage = event.target.result;
            imagePreview.innerHTML = `
                <img src="${currentImage}" alt="预览">
                <div class="remove-image" onclick="removeImage()">×</div>
            `;
            imagePreview.classList.add('active');
            imagePreview.style.position = 'relative';
        };
        reader.readAsDataURL(file);
    });
}

function removeImage() {
    currentImage = null;
    const imagePreview = document.getElementById('image-preview');
    imagePreview.innerHTML = '';
    imagePreview.classList.remove('active');
    document.getElementById('image-input').value = '';
}

function handleExpress(type) {
    const input = document.getElementById('express-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    const name = Memory.get('name');
    
    if (type === 'happy') {
        dom.eyes.forEach(e => e.classList.add('happy'));
        showMessage(`太棒了！这段回忆我会好好收着的 ✨`);
        createBurst();
    } else {
        dom.mouth.classList.add('open');
        if (type === 'worry') {
            dom.eyes.forEach(e => { e.className = 'eye'; e.classList.add('angry'); });
            showMessage(`(气鼓鼓) 这种烦恼，让团子大口吃掉！`);
        } else {
            dom.eyes.forEach(e => e.classList.add('sad'));
            showMessage(`${name}不难过，忧伤交给我就好。`);
        }
        setTimeout(() => {
            dom.mouth.classList.remove('open');
            dom.spirit.classList.add('munching');
            setTimeout(() => {
                dom.spirit.classList.remove('munching');
                dom.spirit.classList.add('swallowing');
                setTimeout(() => {
                    dom.spirit.classList.remove('swallowing');
                    dom.eyes.forEach(e => e.className = 'eye');
                }, 600);
            }, 2000);
        }, 800);
    }

    const orbData = { 
        type, 
        text, 
        x: Math.random() * 80 + 10, 
        yOffset: Math.random() * 35 + 5, 
        time: new Date().toLocaleDateString(),
        image: currentImage
    };
    Memory.saveOrb(orbData); 
    createOrbElement(orbData, false);
    Memory.addStar(); Memory.refresh();
    
    removeImage();
}

function createOrbElement(data, isStatic) {
    const orb = document.createElement('div');
    orb.className = `memory-orb orb-${data.type}`;
    orb.style.left = `${data.x}%`;
    const targetY = window.innerHeight - 85 - data.yOffset;
    if(isStatic) orb.style.top = `${targetY}px`;
    else {
        orb.style.top = `-20px`;
        setTimeout(() => { orb.style.transition = "top 3s cubic-bezier(0.25, 0.46, 0.45, 0.94)"; orb.style.top = `${targetY}px`; }, 100);
    }
    
    orb.dataset.orbData = JSON.stringify(data);
    
    orb.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('✅ 光点被点击了!', data);
        openTimeTunnel(data, orb);
    });
    
    orb.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('✅ 触摸光点!', data);
        openTimeTunnel(data, orb);
    });
    
    dom.orbContainer.appendChild(orb);
    console.log('💡 光点已创建:', data.type, '位置:', data.x + '%', targetY + 'px');
}

function loadOldOrbs() { Memory.getOrbs().forEach(orb => createOrbElement(orb, true)); }

function switchMode(mode, el) {
    clearTimeout(breathTimer); clearInterval(focusInt);
    currentMode = mode;
    dom.expressArea.style.display = 'none';
    dom.timer.style.display = 'none';
    dom.exitFocus.style.display = 'none';
    document.getElementById('main-dock').style.display = 'flex';
    dom.bWrap.className = 'breath-wrap';
    dom.spirit.className = 'spirit';
    dom.eyes.forEach(e => e.className = 'eye');
    dom.bubble.style.opacity = 1;
    if (mode !== 'sleep') updateTimeTheme();
    document.querySelectorAll('.dock-item').forEach(d => d.classList.remove('active'));
    if(el) el.classList.add('active');
    if(mode === 'idle') welcomeUser();
    else if(mode === 'express') { dom.expressArea.style.display = 'flex'; showMessage("想对点我说什么吗？我会一直听着的。"); }
    else if(mode === 'breath') runBreathCycle();
    else if(mode === 'sleep') enterSleep();
}

function startFocus() {
    toggleMenu('bag-menu'); currentMode = 'focus';
    document.getElementById('main-dock').style.display='none';
    dom.timer.style.display = 'block'; dom.exitFocus.style.display = 'block';
    dom.eyes.forEach(e => e.classList.add('focusing')); showMessage("我会乖乖陪着你的。加油哦！");
    let time = 25 * 60;
    focusInt = setInterval(() => {
        time--;
        let m = Math.floor(time / 60), s = time % 60;
        dom.timer.innerText = `${m}:${s < 10 ? '0'+s : s}`;
        if(time <= 0) stopFocus(true);
    }, 1000);
}

function stopFocus(fin = false) {
    clearInterval(focusInt); switchMode('idle', document.querySelector('.dock-item'));
    if(fin) { showMessage("25分钟到啦！你真棒！"); createBurst(); }
}

function showMessage(txt) {
    dom.bubble.style.opacity = 0;
    setTimeout(() => { dom.bubble.innerText = txt; dom.bubble.style.opacity = 1; }, 300);
}

function saveName() { const n = document.getElementById('name-input').value.trim(); if(n) { Memory.set('name', n); document.getElementById('onboarding').style.display = 'none'; welcomeUser(); } }
function welcomeUser() { Memory.refresh(); showMessage(`${Memory.get('name')}，你回来啦。`); }
function updateTimeTheme() {
    const h = new Date().getHours();
    let b = "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)";
    if(h>=5 && h<9) b = "linear-gradient(180deg, #ff9a9e 0%, #fad0c4 100%)";
    else if(h>=9 && h<17) b = "linear-gradient(180deg, #a1c4fd 0%, #c2e9fb 100%)";
    else if(h>=17 && h<20) b = "linear-gradient(180deg, #f6d365 0%, #fda085 100%)";
    document.body.style.background = b;
}

function createStars() {
    const c = document.getElementById('stars-container');
    for(let i=0; i<30; i++) {
        const s = document.createElement('div');
        s.className = 'star'; s.style.left=Math.random()*100+'%'; s.style.top=Math.random()*100+'%';
        c.appendChild(s);
    }
}

function createBurst() {
    for(let i=0; i<10; i++) {
        const p = document.createElement('div');
        p.innerText="✨"; p.style.position="fixed"; p.style.left="50%"; p.style.top="60%"; p.style.zIndex="1000";
        p.style.transition="1.5s ease-out"; document.body.appendChild(p);
        const a=Math.random()*Math.PI*2;
        setTimeout(() => { p.style.transform=`translate(${Math.cos(a)*150}px, ${Math.sin(a)*150}px) scale(0)`; p.style.opacity=0; }, 50);
        setTimeout(() => p.remove(), 1500);
    }
}

function toggleMenu(id) { const m = document.getElementById(id); const open = m.style.display === 'flex'; document.querySelectorAll('.pop-menu').forEach(p => p.style.display = 'none'); m.style.display = open ? 'none' : 'flex'; }
function giveGift(emoji, name) { toggleMenu('bag-menu'); showMessage(`${Memory.get('name')} 送了我${name}！`); dom.mouth.classList.add('open'); dom.eyes.forEach(e => e.classList.add('happy')); setTimeout(() => { dom.mouth.classList.remove('open'); dom.spirit.classList.add('munching'); setTimeout(() => { dom.spirit.classList.remove('munching'); dom.spirit.classList.add('swallowing'); setTimeout(() => { dom.spirit.classList.remove('swallowing'); setTimeout(() => dom.eyes.forEach(e => e.className = 'eye'), 1000); }, 600); }, 2000); }, 1000); }

// 抽纸条逻辑
function giveNote() {
    toggleMenu('note-menu');
    const ns = ["你已经很棒了。", "允许自己停下来。", "今天辛苦了。", "我会一直陪着你。", "记得喝口水呀。", "明天又是新的一页。", "慢慢来，比较快。", "你的存在本身就是一种美好。"];
    showMessage(`(递纸条)："${ns[Math.floor(Math.random()*ns.length)]}"`);
    // 递纸条时的小动作
    dom.spirit.style.transform = "translateY(-10px) rotate(5deg)";
    setTimeout(() => dom.spirit.style.transform = "", 300);
}

function runBreathCycle() { 
    if(currentMode !== 'breath') return; 
    const step = () => { 
        if(currentMode !== 'breath') return; showMessage("慢慢吸气..."); dom.bWrap.className = 'breath-wrap breath-inhale'; 
        breathTimer = setTimeout(() => { 
            if(currentMode !== 'breath') return; showMessage("停住一会儿..."); dom.bWrap.className = 'breath-wrap breath-hold'; 
            breathTimer = setTimeout(() => { 
                if(currentMode !== 'breath') return; showMessage("缓缓呼气..."); dom.bWrap.className = 'breath-wrap breath-exhale'; breathTimer = setTimeout(step, 6000); 
            }, 2000); 
        }, 4000); 
    }; 
    step(); 
}
function enterSleep() { document.body.style.background = "#020617"; dom.bWrap.classList.add('is-sleeping-wrap'); dom.eyes.forEach(e => e.classList.add('sleeping')); showMessage("晚安... 呼..."); }

const startPet = (e, x, y) => { if(currentMode !== 'idle') return; isPetting = true; petStartPos = {x, y}; dom.spirit.classList.add('is-blushing'); dom.eyes.forEach(e => e.classList.add('petting')); dom.blushes.forEach(b => b.classList.add('shy')); };
const stopPet = (e, x, y) => { if(!isPetting) return; isPetting = false; if(Math.sqrt(Math.pow(x-petStartPos.x,2)+Math.pow(y-petStartPos.y,2)) < 15) handlePoke(); dom.spirit.classList.remove('is-blushing'); dom.eyes.forEach(e => e.classList.remove('petting')); dom.blushes.forEach(b => b.classList.remove('shy')); dom.spirit.style.transform = ""; dom.face.style.transform = ""; };
const handlePoke = () => { dom.spirit.style.transform = "scale(0.85)"; setTimeout(() => { dom.spirit.style.transform = "scale(1.1) translateY(-15px)"; setTimeout(() => { if(!isPetting) dom.spirit.style.transform = ""; }, 400); }, 100); };
const movePet = (e, x, y) => { if(!isPetting) return; const r = dom.spirit.getBoundingClientRect(); const dx = (x - (r.left + r.width/2))/10, dy = (y - (r.top + r.height/2))/10; dom.spirit.style.transform = `translate(${dx}px, ${dy}px) skew(${dx*0.4}deg)`; dom.face.style.transform = `translate(${dx*0.7}px, ${dy*0.7}px)`; };

dom.spirit.addEventListener('mousedown', (e) => startPet(e, e.clientX, e.clientY));
window.addEventListener('mouseup', (e) => stopPet(e, e.clientX, e.clientY));
window.addEventListener('mousemove', (e) => movePet(e, e.clientX, e.clientY));
dom.spirit.addEventListener('touchstart', (e) => startPet(e, e.touches[0].clientX, e.touches[0].clientY));
window.addEventListener('touchend', (e) => stopPet(e, e.changedTouches[0].clientX, e.changedTouches[0].clientY));
window.addEventListener('touchmove', (e) => movePet(e, e.touches[0].clientX, e.touches[0].clientY));

// ==================== 时间穿梭系统 ====================

const TimeTunnel = {
    el: null,
    card: null,
    orbData: null,
    originOrb: null,
    currentOrbIndex: -1,
    
    init() {
        this.el = document.getElementById('time-tunnel');
        this.card = document.getElementById('time-card');
        
        this.el.addEventListener('click', (e) => {
            if (e.target === this.el || e.target.classList.contains('tunnel-background') || 
                e.target.classList.contains('tunnel-bg-layer') || e.target.classList.contains('time-river') ||
                e.target.classList.contains('time-line')) {
                this.close();
            }
        });
    },
    
    open(data, orbElement) {
        this.orbData = data;
        this.originOrb = orbElement;
        
        const orbs = Memory.getOrbs();
        this.currentOrbIndex = orbs.findIndex(o => 
            o.time === data.time && o.text === data.text && o.type === data.type
        );
        
        const rect = orbElement.getBoundingClientRect();
        const originOrb = document.createElement('div');
        originOrb.className = `orb-origin ${data.type}`;
        originOrb.style.width = '16px';
        originOrb.style.height = '16px';
        originOrb.style.left = `${rect.left}px`;
        originOrb.style.top = `${rect.top}px`;
        document.body.appendChild(originOrb);
        
        requestAnimationFrame(() => {
            originOrb.style.width = '300px';
            originOrb.style.height = '300px';
            originOrb.style.left = `${window.innerWidth / 2 - 150}px`;
            originOrb.style.top = `${window.innerHeight / 2 - 150}px`;
            originOrb.style.opacity = '0';
        });
        
        setTimeout(() => {
            originOrb.remove();
            this.el.classList.add('active');
            this.updateCard(data);
            
            setTimeout(() => {
                this.card.classList.add('visible');
            }, 100);
        }, 500);
    },
    
    updateCard(data) {
        console.log('📋 updateCard 被调用，data:', data);
        
        const emoji = data.type === 'happy' ? '✨' : '💧';
        const typeText = data.type === 'happy' ? '美好回忆' : '消化烦恼';
        
        this.card.querySelector('.time-card-emoji').textContent = emoji;
        this.card.querySelector('.time-card-type').textContent = typeText;
        
        const dateEl = this.card.querySelector('.time-card-date');
        console.log('📅 dateEl 元素:', dateEl);
        console.log('📅 data.time 值:', data.time);
        const displayDate = data.time || '某一天';
        dateEl.textContent = displayDate;
        console.log('📅 设置后的 textContent:', dateEl.textContent);
        
        this.card.querySelector('.time-card-content').textContent = data.text;
        
        this.card.classList.remove('happy-card', 'worry-card');
        const existingRain = this.card.querySelector('.rain-drops');
        if (existingRain) existingRain.remove();
        const existingGlow = this.card.querySelectorAll('.glow-layer-1, .glow-layer-2');
        existingGlow.forEach(g => g.remove());
        
        if (this.glowAnimation) {
            cancelAnimationFrame(this.glowAnimation);
            this.glowAnimation = null;
        }
        
        if (data.image) {
            this.card.style.backgroundImage = `url(${data.image})`;
            this.card.classList.add('with-image');
        } else {
            this.card.style.backgroundImage = '';
            this.card.classList.remove('with-image');
            
            if (data.type === 'happy') {
                this.card.classList.add('happy-card');
                this.createFlowingGlow();
            } else {
                this.card.classList.add('worry-card');
                this.createRainEffect();
            }
        }
        
        const footer = this.card.querySelector('.time-card-footer');
        if (data.type === 'happy') {
            footer.textContent = '这份美好，永远闪耀在时间长河中';
        } else {
            footer.textContent = '烦恼已被团子吃掉，化作前进的动力';
        }
    },
    
    createFlowingGlow() {
        const glow1 = document.createElement('div');
        glow1.className = 'glow-layer-1';
        
        const glow2 = document.createElement('div');
        glow2.className = 'glow-layer-2';
        
        this.card.appendChild(glow1);
        this.card.appendChild(glow2);
        
        let time = 0;
        const animate = () => {
            time += 0.008;
            
            const x1 = 50 + Math.sin(time * 1.3) * 25 + Math.cos(time * 0.7) * 15;
            const y1 = 50 + Math.cos(time * 1.1) * 25 + Math.sin(time * 0.9) * 15;
            
            const x2 = 50 + Math.cos(time * 1.5) * 30 + Math.sin(time * 0.8) * 20;
            const y2 = 50 + Math.sin(time * 1.2) * 30 + Math.cos(time * 0.6) * 20;
            
            glow1.style.background = `radial-gradient(circle at ${x1}% ${y1}%, rgba(255, 255, 255, 0.9) 0%, transparent 35%)`;
            glow2.style.background = `radial-gradient(circle at ${x2}% ${y2}%, rgba(251, 191, 36, 0.4) 0%, transparent 40%)`;
            
            this.glowAnimation = requestAnimationFrame(animate);
        };
        
        animate();
    },
    
    createRainEffect() {
        const rainContainer = document.createElement('div');
        rainContainer.className = 'rain-drops';
        
        for (let i = 0; i < 15; i++) {
            const drop = document.createElement('div');
            drop.className = 'rain-drop';
            
            const width = 1 + Math.random() * 2.5;
            const height = 15 + Math.random() * 50;
            const duration = 1.5 + Math.random() * 4;
            const delay = Math.random() * 3;
            
            drop.style.left = `${Math.random() * 100}%`;
            drop.style.width = `${width}px`;
            drop.style.height = `${height}px`;
            drop.style.animationDuration = `${duration}s`;
            drop.style.animationDelay = `${delay}s`;
            
            rainContainer.appendChild(drop);
        }
        
        this.card.appendChild(rainContainer);
    },
    
    close() {
        this.card.classList.remove('visible');
        this.card.classList.remove('with-image');
        
        setTimeout(() => {
            this.el.classList.remove('active');
        }, 300);
    },
    
    delete() {
        if (this.currentOrbIndex === -1) return;
        
        let orbs = Memory.getOrbs();
        orbs.splice(this.currentOrbIndex, 1);
        localStorage.setItem('spirit_orbs', JSON.stringify(orbs));
        
        if (this.originOrb) {
            this.originOrb.style.transition = 'all 0.3s ease-out';
            this.originOrb.style.transform = 'scale(0)';
            this.originOrb.style.opacity = '0';
            setTimeout(() => {
                this.originOrb.remove();
            }, 300);
        }
        
        this.close();
        
        showMessage('这条记录已从时间长河中消散...');
    }
};

function deleteCurrentOrb() {
    TimeTunnel.delete();
}

function openTimeTunnel(data, orbElement) {
    console.log('openTimeTunnel 被调用', data, orbElement);
    if (!TimeTunnel.el) {
        console.log('TimeTunnel 未初始化，现在初始化');
        TimeTunnel.init();
    }
    TimeTunnel.open(data, orbElement);
}