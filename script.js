/**
 * 记忆模块：负责数据的存取与陪伴天数计算
 */
const Memory = {
    // 初始化：如果没记录相遇时间，则记下此时此刻
    init: () => { 
        if (!localStorage.getItem('spirit_meet')) {
            localStorage.setItem('spirit_meet', Date.now()); 
        }
    },
    // 获取带前缀的存储项
    get: (k) => localStorage.getItem('spirit_' + k),
    // 设置带前缀的存储项
    set: (k, v) => localStorage.setItem('spirit_' + k, v),
    // 增加星星
    addStar: () => { 
        let s = parseInt(Memory.get('stars') || 0) + 1; 
        Memory.set('stars', s); 
        return s; 
    },
    // 刷新 UI 上的陪伴信息
    refresh: () => {
        const name = Memory.get('name'); 
        if (!name) return;

        // 获取相遇时间戳并计算天数
        const meetTime = parseInt(localStorage.getItem('spirit_meet'));
        const days = Math.floor((Date.now() - meetTime) / (1000 * 60 * 60 * 24)) + 1;
        
        // 获取星星数
        const stars = Memory.get('stars') || 0;
        
        document.getElementById('badge-ui').innerHTML = `${name}的陪伴者<br>陪伴 ${days} 天 | 星星 ${stars}`;
    }
};

/**
 * DOM 元素引用
 */
const dom = {
    spirit: document.getElementById('spirit'),
    bWrap: document.getElementById('breath-wrap'),
    tilt: document.getElementById('tilt-box'),
    bubble: document.getElementById('bubble'),
    mouth: document.getElementById('mouth'),
    face: document.getElementById('face'),
    vent: document.getElementById('vent-area'),
    eyes: document.querySelectorAll('.eye'),
    blushes: document.querySelectorAll('.blush')
};

// 全局状态
let currentMode = 'idle', 
    breathTimer = null, 
    focusInt = null, 
    isPetting = false, 
    petStartPos = {x:0, y:0};

/**
 * 页面加载初始化
 */
window.onload = () => { 
    Memory.init(); 
    createStars(); 
    updateTimeTheme(); 
    
    if (!Memory.get('name')) {
        document.getElementById('onboarding').style.display = 'flex'; 
    } else {
        welcomeUser(); 
    }
};

/**
 * 基础交互与 UI 函数
 */
function showMessage(txt) {
    dom.bubble.style.opacity = 0; 
    dom.bubble.style.transform = "translateY(10px)";
    setTimeout(() => { 
        dom.bubble.innerText = txt; 
        dom.bubble.style.opacity = 1; 
        dom.bubble.style.transform = "translateY(0)"; 
    }, 300);
}

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
        s.style.position='absolute';
        s.style.left=Math.random()*100+'%';
        s.style.top=Math.random()*100+'%';
        s.style.width='2px';
        s.style.height='2px';
        s.style.background='white';
        s.style.opacity=Math.random()*0.5;
        c.appendChild(s);
    }
}

function welcomeUser() { 
    Memory.refresh(); 
    showMessage(`${Memory.get('name')}，你回来啦。`); 
}

function saveName() { 
    const n = document.getElementById('name-input').value.trim(); 
    if(n) { 
        Memory.set('name', n); 
        document.getElementById('onboarding').style.display = 'none'; 
        welcomeUser(); 
    } 
}

/**
 * 烦恼吞噬功能
 */
function startSwallowing() {
    const input = document.getElementById('vent-input');
    const val = input.value.trim();
    if(!val) return;
    input.value = "";
    
    const name = Memory.get('name');
    let reactionType = "normal"; 
    if (/累|哭|难过|压力|疼|碎/.test(val)) reactionType = "sad";
    else if (/笨|差|没用|失败|丑|错/.test(val)) reactionType = "doubt";
    else if (/加班|考试|老师|老板|领导|作业/.test(val)) reactionType = "angry";
    else if (/喜欢|爱|团子/.test(val)) reactionType = "love";

    dom.mouth.classList.add('open');
    if (reactionType === "sad") { 
        dom.eyes.forEach(e => e.classList.add('sad')); 
        showMessage(`(心疼) ${name}，累了就靠在我身上歇一歇吧...`); 
    } else if (reactionType === "doubt") { 
        dom.spirit.classList.add('shaking'); 
        showMessage(`(摇头) 不许这样说！你是团子心中最棒的 ${name}！`); 
    } else if (reactionType === "angry") { 
        dom.eyes.forEach(e => { e.className = 'eye'; e.classList.add('angry'); }); 
        showMessage(`(气鼓鼓) 这种坏东西，让团子大口吃掉！`); 
    } else if (reactionType === "love") { 
        dom.spirit.classList.add('is-blushing'); 
        dom.blushes.forEach(b => b.classList.add('shy')); 
        showMessage(`(脸红) 嘿嘿... 团子也最喜欢 ${name} 啦！`); 
    } else { 
        dom.eyes.forEach(e => e.classList.add('happy')); 
        showMessage("啊——呜！全吃掉！"); 
    }

    setTimeout(() => {
        dom.mouth.classList.remove('open');
        if (reactionType === "angry") dom.spirit.classList.add('munching-fast');
        else dom.spirit.classList.add('munching');
        
        setTimeout(() => {
            dom.spirit.classList.remove('munching', 'munching-fast', 'shaking');
            dom.spirit.classList.add('swallowing');
            setTimeout(() => {
                dom.spirit.classList.remove('swallowing');
                if(reactionType !== 'love') dom.spirit.classList.remove('is-blushing');
                
                const s = Memory.addStar(); 
                Memory.refresh();
                
                if (reactionType === "doubt") showMessage(`看，烦恼被我吓跑啦！存下第 ${s} 颗星星。`);
                else if (reactionType === "love") { 
                    showMessage(`这颗爱心变成第 ${s} 颗守护星啦。`); 
                    setTimeout(() => dom.spirit.classList.remove('is-blushing'), 2000); 
                } else showMessage(`好啦，舒服多了。收集到了第 ${s} 颗星。`);
                
                createBurst();
                setTimeout(() => dom.eyes.forEach(e => e.className = 'eye'), 1000);
            }, 600);
        }, 2500); 
    }, 800);
}

/**
 * 模式切换
 */
function switchMode(mode, el) {
    clearTimeout(breathTimer); 
    currentMode = mode;
    dom.bWrap.className = 'breath-wrap'; 
    dom.spirit.className = 'spirit'; 
    dom.spirit.style.transform = ""; 
    dom.face.style.transform = "";
    dom.vent.style.display = 'none'; 
    dom.bubble.style.opacity = 1; 
    dom.eyes.forEach(e => e.className = 'eye'); 
    
    document.querySelectorAll('.dock-item').forEach(d => d.classList.remove('active')); 
    el.classList.add('active');
    
    if(mode !== 'sleep') updateTimeTheme();
    if(mode === 'idle') welcomeUser();
    else if(mode === 'breath') runBreathCycle();
    else if(mode === 'vent') { dom.vent.style.display = 'flex'; showMessage("把烦恼写在这里，我会努力吃掉它的！"); }
    else if(mode === 'sleep') enterSleep();
}

function enterSleep() { 
    document.body.style.background = "#020617"; 
    dom.bWrap.classList.add('is-sleeping-wrap'); 
    dom.eyes.forEach(e => e.classList.add('sleeping')); 
    showMessage("晚安。安心睡吧... 呼..."); 
    setTimeout(() => { if(currentMode === 'sleep') dom.bubble.style.opacity = 0; }, 4000); 
}

function runBreathCycle() { 
    if(currentMode !== 'breath') return; 
    const step = () => { 
        if(currentMode !== 'breath') return; 
        showMessage("慢慢吸气..."); 
        dom.bWrap.className = 'breath-wrap breath-inhale'; 
        breathTimer = setTimeout(() => { 
            if(currentMode !== 'breath') return; 
            showMessage("停住一会儿..."); 
            dom.bWrap.className = 'breath-wrap breath-hold'; 
            breathTimer = setTimeout(() => { 
                if(currentMode !== 'breath') return; 
                showMessage("缓缓呼气..."); 
                dom.bWrap.className = 'breath-wrap breath-exhale'; 
                breathTimer = setTimeout(step, 6000); 
            }, 2000); 
        }, 4000); 
    }; 
    step(); 
}

/**
 * 专注、礼物、纸条
 */
function startFocus() { 
    toggleMenu('bag-menu'); 
    currentMode = 'focus'; 
    document.getElementById('main-dock').style.display='none'; 
    document.getElementById('focus-timer').style.display='block'; 
    document.getElementById('exit-focus').style.display='block'; 
    dom.eyes.forEach(e => e.classList.add('focusing')); 
    showMessage("我会乖乖陪着你的。加油哦！"); 
    
    let time = 25 * 60; 
    focusInt = setInterval(() => { 
        time--; 
        let m = Math.floor(time / 60), s = time % 60; 
        document.getElementById('focus-timer').innerText = `${m}:${s < 10 ? '0'+s : s}`; 
        if(time <= 0) stopFocus(true); 
    }, 1000); 
}

function stopFocus(fin = false) { 
    clearInterval(focusInt); 
    document.getElementById('main-dock').style.display='flex'; 
    document.getElementById('focus-timer').style.display='none'; 
    document.getElementById('exit-focus').style.display='none'; 
    currentMode = 'idle'; 
    switchMode('idle', document.querySelector('.dock-item')); 
    if(fin) { showMessage("25分钟到啦！你真棒！"); createBurst(); } 
}

function giveGift(emoji, name) { 
    toggleMenu('bag-menu'); 
    showMessage(`${Memory.get('name')} 送了我${name}！`); 
    dom.mouth.classList.add('open'); 
    dom.eyes.forEach(e => e.classList.add('happy')); 
    setTimeout(() => { 
        dom.mouth.classList.remove('open'); 
        dom.spirit.classList.add('munching'); 
        setTimeout(() => { 
            dom.spirit.classList.remove('munching'); 
            dom.spirit.classList.add('swallowing'); 
            setTimeout(() => { 
                dom.spirit.classList.remove('swallowing'); 
                setTimeout(() => dom.eyes.forEach(e => e.className = 'eye'), 1000); 
            }, 600); 
        }, 2000); 
    }, 1000); 
}

function giveNote() { 
    toggleMenu('note-menu'); 
    const ns = ["你已经很棒了。", "允许自己停下来。", "今天辛苦了。", "我会一直陪着你。", "记得喝口水呀。", "明天又是新的一页。"]; 
    showMessage(`(递纸条)："${ns[Math.floor(Math.random()*ns.length)]}"`); 
}

function toggleMenu(id) { 
    const m = document.getElementById(id); 
    const open = m.style.display === 'flex'; 
    document.querySelectorAll('.pop-menu').forEach(p => p.style.display = 'none'); 
    m.style.display = open ? 'none' : 'flex'; 
}

function teleportLog() { 
    showMessage(`好哒！带 ${Memory.get('name')} 去找温暖建议咯...`); 
    toggleMenu('bag-menu'); 
}

function createBurst() { 
    for(let i=0; i<10; i++) { 
        const p = document.createElement('div'); 
        p.innerText="✨"; 
        p.style.position="fixed"; 
        p.style.left="50%"; 
        p.style.top="60%"; 
        p.style.transition="1.5s ease-out"; 
        document.body.appendChild(p); 
        const a=Math.random()*Math.PI*2; 
        setTimeout(() => { 
            p.style.transform=`translate(${Math.cos(a)*150}px, ${Math.sin(a)*150}px) scale(0)`; 
            p.style.opacity=0; 
        }, 50); 
        setTimeout(() => p.remove(), 1500); 
    } 
}

/**
 * 揉揉与交互物理逻辑
 */
const startPet = (e, x, y) => { 
    if(e.cancelable) e.preventDefault(); 
    if(currentMode !== 'idle') return; 
    isPetting = true; petStartPos = {x, y}; 
    dom.spirit.classList.add('is-blushing'); 
    dom.eyes.forEach(e => e.classList.add('petting')); 
    dom.blushes.forEach(b => b.classList.add('shy')); 
    dom.spirit.style.transition = "background 1.5s ease, box-shadow 1.5s ease"; 
};

const stopPet = (e, x, y) => { 
    if(!isPetting) return; 
    isPetting = false; 
    // 判断是点击还是揉动
    if(Math.sqrt(Math.pow(x-petStartPos.x,2)+Math.pow(y-petStartPos.y,2)) < 15) handlePoke(); 
    
    dom.spirit.classList.remove('is-blushing'); 
    dom.eyes.forEach(e => e.classList.remove('petting')); 
    dom.blushes.forEach(b => b.classList.remove('shy')); 
    dom.spirit.style.transition = "all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), background 1.5s ease, box-shadow 1.5s ease"; 
    dom.spirit.style.transform = ""; 
    dom.face.style.transform = ""; 
};

const handlePoke = () => { 
    dom.spirit.style.transition = "transform 0.1s ease-out"; 
    dom.spirit.style.transform = "scale(0.85)"; 
    setTimeout(() => { 
        dom.spirit.style.transition = "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)"; 
        dom.spirit.style.transform = "scale(1.1) translateY(-15px)"; 
        setTimeout(() => { if(!isPetting) dom.spirit.style.transform = ""; }, 400); 
    }, 100); 
};

const movePet = (e, x, y) => { 
    if(!isPetting) return; 
    if(e.cancelable) e.preventDefault(); 
    const r = dom.spirit.getBoundingClientRect(); 
    const dx = (x - (r.left + r.width/2))/10, dy = (y - (r.top + r.height/2))/10; 
    dom.spirit.style.transform = `translate(${dx}px, ${dy}px) skew(${dx*0.4}deg) scale(${1-Math.abs(dy)/220}, ${1+Math.abs(dy)/220})`; 
    dom.face.style.transform = `translate(${dx*0.7}px, ${dy*0.7}px)`; 
};

// 绑定桌面端与移动端事件
dom.spirit.addEventListener('mousedown', (e) => startPet(e, e.clientX, e.clientY));
window.addEventListener('mouseup', (e) => stopPet(e, e.clientX, e.clientY));
window.addEventListener('mousemove', (e) => movePet(e, e.clientX, e.clientY));
dom.spirit.addEventListener('touchstart', (e) => startPet(e, e.touches[0].clientX, e.touches[0].clientY), {passive: false});
window.addEventListener('touchend', (e) => stopPet(e, e.changedTouches[0].clientX, e.changedTouches[0].clientY), {passive: false});
window.addEventListener('touchmove', (e) => movePet(e, e.touches[0].clientX, e.touches[0].clientY), {passive: false});