const FIREBASE_URL = "https://hbg-auction-default-rtdb.asia-southeast1.firebasedatabase.app";

const defaultDb = {
    tournamentTitle: "제 [3]회 [햄부기 햄스터] 개최",
    directors: {
        "dir0": { name: "감독A", img: "https://api.dicebear.com/7.x/adventurer/svg?seed=A", points: 1000, squad: { "팀원1": null, "팀원2": null, "팀원3": null, "팀원4": null } },
        "dir1": { name: "감독B", img: "https://api.dicebear.com/7.x/adventurer/svg?seed=B", points: 1000, squad: { "팀원1": null, "팀원2": null, "팀원3": null, "팀원4": null } },
        "dir2": { name: "감독C", img: "https://api.dicebear.com/7.x/adventurer/svg?seed=C", points: 1000, squad: { "팀원1": null, "팀원2": null, "팀원3": null, "팀원4": null } },
        "dir3": { name: "감독D", img: "https://api.dicebear.com/7.x/adventurer/svg?seed=D", points: 1000, squad: { "팀원1": null, "팀원2": null, "팀원3": null, "팀원4": null } }
    },
    currentPrice: 0,
    currentBidder: "-",
    timerEndsAt: 0,
    isTimerRunning: false,
    logs: [{ txt: "------------- 다음 경매 대기중 -------------", cls: "log-divider" }],
    playerPool: [],
    failPool: [],
    selectedPlayerId: "",
    activeItem: { name: "대기 중", img: "https://api.dicebear.com/7.x/bottts/svg?seed=ready" },
    soundTrigger: { type: "", time: 0 }
};

let db = JSON.parse(JSON.stringify(defaultDb));
let currentRole = "";
let currentDirKey = "";
let lastPlayedTriggerTime = 0;
let lastSecondsInt = 15;

function goPage(hash) { location.hash = hash; location.reload(); }

async function fbPut(data) {
    if(!FIREBASE_URL) return;
    try { await fetch(`${FIREBASE_URL}/auction.json`, { method: 'PUT', body: JSON.stringify(data) }); } catch(e) { console.error(e); }
}
async function fbGet() {
    if(!FIREBASE_URL) return null;
    try { const r = await fetch(`${FIREBASE_URL}/auction.json`); return await r.json(); } catch(e) { return null; }
}

function playTone(type) {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        if (type === 'ready_tick') {
            const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(350, ctx.currentTime); gain.gain.setValueAtTime(0.08, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08); osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.08);
        } else if (type === 'start') {
            [440, 554.37, 659.25].forEach((freq) => {
                const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, ctx.currentTime); gain.gain.setValueAtTime(0.08, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2); osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 1.2);
            });
        } else if (type === 'warn_tick') {
            const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime); gain.gain.setValueAtTime(0.12, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12); osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.12);
        } else if (type === 'bid') {
            const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(1100, ctx.currentTime); gain.gain.setValueAtTime(0.1, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12); osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.12);
        } else if (type === 'success') {
            [523.25, 659.25, 783.99].forEach((freq, i) => {
                const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(freq, ctx.currentTime + i*0.08); gain.gain.setValueAtTime(0.1, ctx.currentTime + i*0.08); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i*0.08 + 0.4); osc.connect(gain); gain.connect(ctx.destination); osc.start(ctx.currentTime + i*0.08); osc.stop(ctx.currentTime + i*0.08 + 0.4);
            });
        } else if (type === 'fail') {
            const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(170, ctx.currentTime); osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.45); gain.gain.setValueAtTime(0.12, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.48); osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.48);
        }
    } catch (e) {}
}

async function init() {
    const hash = location.hash.replace("#", "");
    
    if(!hash) {
        const initialData = await fbGet();
        if(initialData && initialData.directors) { db = initialData; } else { await fbPut(defaultDb); }
        document.getElementById('lobby').style.display = "flex";
        updateLobbyUI();
        return;
    }

    const initialData = await fbGet();
    if(initialData && initialData.directors) { db = initialData; } else { await fbPut(defaultDb); }

    if(hash === "admin") {
        currentRole = "admin"; document.body.setAttribute('data-view', 'admin');
        
        const titleInput = document.getElementById('tournament-title-input');
        if(titleInput) {
            titleInput.value = db.tournamentTitle || "제 [3]회 [햄부기 햄스터] 개최";
        }

        for(let i=0; i<4; i++){
            if(db.directors && db.directors[`dir${i}`]) {
                document.getElementById(`dir-name-${i}`).value = db.directors[`dir${i}`].name;
                document.getElementById(`dir-pt-${i}`).value = db.directors[`dir${i}`].points;
                if(db.directors[`dir${i}`].img !== defaultDb.directors[`dir${i}`].img) {
                    document.getElementById(`dir-img-${i}`).value = db.directors[`dir${i}`].img;
                }
            }
        }
        rebuildSelect(); renderAllStatic();
    } else if(hash === "broadcast") {
        currentRole = "broadcast"; document.body.setAttribute('data-view', 'broadcast');
        renderAllStatic();
    } else if(hash.startsWith("dir")) {
        currentRole = "director"; currentDirKey = hash; document.body.setAttribute('data-view', 'director');
        renderAllStatic();
    }

    // 데이터 동기화 루프
    setInterval(async () => {
        const remote = await fbGet();
        if(remote && remote.directors) {
            let isChanged = JSON.stringify(db.directors) !== JSON.stringify(remote.directors) ||
                            JSON.stringify(db.playerPool || []) !== JSON.stringify(remote.playerPool || []) ||
                            JSON.stringify(db.failPool || []) !== JSON.stringify(remote.failPool || []) ||
                            db.selectedPlayerId !== remote.selectedPlayerId ||
                            db.currentPrice !== remote.currentPrice ||
                            db.currentBidder !== remote.currentBidder ||
                            JSON.stringify(db.logs || []) !== JSON.stringify(remote.logs || []);

            db.directors = remote.directors;
            db.playerPool = remote.playerPool || [];
            db.failPool = remote.failPool || [];
            db.selectedPlayerId = remote.selectedPlayerId || "";
            db.activeItem = remote.activeItem || { name: "대기 중", img: "" };
            db.currentPrice = remote.currentPrice !== undefined ? remote.currentPrice : 0;
            db.currentBidder = remote.currentBidder || "-";
            db.logs = remote.logs || [];
            db.timerEndsAt = remote.timerEndsAt || 0;
            db.isTimerRunning = remote.isTimerRunning || false;
            db.tournamentTitle = remote.tournamentTitle || "제 [3]회 [햄부기 햄스터] 개최";

            if(isChanged) renderAllStatic();
            if(!location.hash) updateLobbyUI();

            if (remote.soundTrigger && remote.soundTrigger.time > lastPlayedTriggerTime) {
                playTone(remote.soundTrigger.type);
                lastPlayedTriggerTime = remote.soundTrigger.time;
            }
        }
    }, 300);

    // 타이머 및 렌더링 루프
    setInterval(() => {
        let localTimeLeft = 15.00;
        if (db.isTimerRunning && db.timerEndsAt > 0) {
            const diff = db.timerEndsAt - Date.now();
            localTimeLeft = diff <= 0 ? 0 : diff / 1000;

            let currentSecInt = Math.ceil(localTimeLeft);
            if (localTimeLeft <= 5.0 && currentSecInt !== lastSecondsInt && currentSecInt > 0) {
                playTone('warn_tick'); lastSecondsInt = currentSecInt;
            } else if (localTimeLeft > 5.0) { lastSecondsInt = 15; }

            if (localTimeLeft <= 0 && db.isTimerRunning) {
                db.isTimerRunning = false;
                if (currentRole === "admin") {
                    if (db.currentBidder && db.currentBidder !== "-") {
                        autoCloseAuction();
                    } else {
                        autoFailAuction();
                    }
                }
            }
        }

        const timeStr = `TIME COUNT | ${localTimeLeft.toFixed(2)}`;
        const currentLogs = db.logs || [];

        const activeNameRaw = db.activeItem ? db.activeItem.name : "대기 중";
        const activeParts = activeNameRaw.split('/');
        const activeNickname = activeParts[0] ? activeParts[0].trim() : activeNameRaw;
        const activeSubinfo = activeParts.slice(1).join(' / ').trim();

        const activeDisplayHtml = `
            <span class="active-item-label">CURRENT AUCTION PLAYER</span>
            <span class="active-item-name">${activeNickname}</span>
            ${activeSubinfo ? `<span class="active-item-subname">${activeSubinfo}</span>` : ''}
        `;

        if(currentRole === "broadcast" && document.getElementById('main-timer-display')) {
            document.getElementById('main-timer-display').innerText = timeStr;
            document.getElementById('main-active-img').style.backgroundImage = `url('${db.activeItem ? db.activeItem.img : ''}')`;
            const infoBox = document.querySelector('#broadcast-view .active-item-info');
            if(infoBox) infoBox.innerHTML = activeDisplayHtml;
            document.getElementById('main-log-box').innerHTML = currentLogs.map(l => `<div class="${l.cls}">${l.txt}</div>`).join("");
        } else if(currentRole === "admin" && document.getElementById('admin-timer-display')) {
            document.getElementById('admin-timer-display').innerText = timeStr;
            document.getElementById('admin-active-img').style.backgroundImage = `url('${db.activeItem ? db.activeItem.img : ''}')`;
            const infoBox = document.querySelector('#admin-view .active-item-info');
            if(infoBox) infoBox.innerHTML = activeDisplayHtml;
            document.getElementById('gosegu-highest-price').innerText = db.currentPrice;
            document.getElementById('admin-log-box').innerHTML = currentLogs.map(l => `<div class="${l.cls}">${l.txt}</div>`).join("");
        } else if(currentRole === "director" && document.getElementById('dir-timer-display')) {
            document.getElementById('dir-timer-display').innerText = timeStr;
            document.getElementById('dir-active-img').style.backgroundImage = `url('${db.activeItem ? db.activeItem.img : ''}')`;
            const infoBox = document.querySelector('#director-view .active-item-info');
            if(infoBox) infoBox.innerHTML = activeDisplayHtml;
            document.getElementById('dir-highest-price').innerText = db.currentPrice;
            if(db.directors && db.directors[currentDirKey]) {
                document.getElementById('dir-my-points').innerText = db.directors[currentDirKey].points;
            }
            document.getElementById('dir-log-box').innerHTML = currentLogs.map(l => `<div class="${l.cls}">${l.txt}</div>`).join("");
        }

        const logBoxes = document.querySelectorAll('.log-box');
        logBoxes.forEach(box => {
            box.scrollTop = box.scrollHeight;
        });

    }, 20);
}

async function syncAdminSettings() {
    if(currentRole !== "admin") return;

    const titleInput = document.getElementById('tournament-title-input');
    if(titleInput) {
        db.tournamentTitle = titleInput.value.trim() || "제 [3]회 [햄부기 햄스터] 개최";
    }

    for(let i=0; i<4; i++){
        db.directors[`dir${i}`].name = document.getElementById(`dir-name-${i}`).value || `감독${String.fromCharCode(65+i)}`;
        db.directors[`dir${i}`].points = parseInt(document.getElementById(`dir-pt-${i}`).value) || 0;
        const imgVal = document.getElementById(`dir-img-${i}`).value.trim();
        db.directors[`dir${i}`].img = imgVal ? imgVal : defaultDb.directors[`dir${i}`].img;
    }
    await fbPut(db); rebuildSelect(); renderAllStatic();
}

function rebuildSelect() {
    const select = document.getElementById('active-director-select'); 
    const forceSelect = document.getElementById('force-target-director');
    
    if(select) {
        const val = select.value; select.innerHTML = "";
        for(let key in db.directors) { select.innerHTML += `<option value="${key}">${db.directors[key].name}</option>`; }
        if(val && db.directors[val]) select.value = val;
        updateActiveDirectorPoints();
    }

    if(forceSelect) {
        const fVal = forceSelect.value; forceSelect.innerHTML = "";
        for(let key in db.directors) { forceSelect.innerHTML += `<option value="${key}">${db.directors[key].name} 팀</option>`; }
        if(fVal && db.directors[fVal]) forceSelect.value = fVal;
    }
}

function updateActiveDirectorPoints() {
    const select = document.getElementById('active-director-select'); if(!select) return;
    const key = select.value;
    if(key && db.directors[key]) { document.getElementById('gosegu-my-points').innerText = db.directors[key].points; }
}

function renderAllStatic() {
    if(!db || !db.directors) return;
    const targets = ['main-director-list', 'admin-director-list', 'dir-all-teams-list'];
    targets.forEach(id => {
        const container = document.getElementById(id); if(!container) return;
        container.innerHTML = ""; let idx = 0;
        for(let key in db.directors) {
            const dir = db.directors[key]; let squadHtml = "";
            const slots = ["팀원1", "팀원2", "팀원3", "팀원4"];
            slots.forEach(s => {
                const m = dir.squad ? dir.squad[s] : null;
                if(m) {
                    const mParts = (m.name || "").split('/');
                    const mNick = mParts[0] ? mParts[0].trim() : m.name;
                    squadHtml += `<div class="member-slot"><div class="member-photo filled" style="background-image:url('${m.img}')"></div><div class="member-name" title="${m.name}">${mNick}</div></div>`;
                } else {
                    squadHtml += `<div class="member-slot"><div class="member-photo">${s}</div><div class="member-name">-</div></div>`;
                }
            });
            const isMyCard = (id === 'dir-all-teams-list' && key === currentDirKey) ? 'style="border: 2px solid #4ade80; background-color: #14233c;"' : '';
            const myBadge = (id === 'dir-all-teams-list' && key === currentDirKey) ? '<span style="font-size:11px; background:#16a34a; padding:1px 5px; border-radius:3px; margin-left:6px; color:white;">MY</span>' : '';
            container.innerHTML += `
                <div class="director-card dir-${idx}" ${isMyCard}>
                    <div class="card-header">
                        <span class="team-title">${dir.name} 팀${myBadge}</span>
                        <div class="point-container"><span>포인트</span><span class="point-badge">${dir.points}</span></div>
                    </div>
                    <div class="card-body">
                        <div class="director-profile">
                            <div class="director-avatar" style="background-image:url('${dir.img}')"></div>
                            <span class="director-name">${dir.name}</span>
                        </div>
                        <div class="squad-zone">${squadHtml}</div>
                    </div>
                </div>
            `;
            idx++;
        }
    });

    if(currentRole === "director" && currentDirKey && document.getElementById('dir-panel-header-title') && db.directors[currentDirKey]) {
        document.getElementById('dir-panel-header-title').innerText = `👥 ${db.directors[currentDirKey].name} 전용 실시간 입찰 패널 (원격 연결됨)`;
    }

    const mappings = [
        { p: 'main-player-list', f: 'main-fail-list' },
        { p: 'container-player-list', f: 'container-fail-list' },
        { p: 'dir-player-list', f: 'dir-fail-list' }
    ];
    mappings.forEach(m => {
        const pContainer = document.getElementById(m.p); const fContainer = document.getElementById(m.f);
        if(pContainer) {
            pContainer.innerHTML = (!db.playerPool || db.playerPool.length === 0) ? `` : "";
            if(db.playerPool) {
                let sequenceHtml = `<div class="auction-sequence-container">`;
                
                db.playerPool.forEach((p, index) => {
                    const parts = p.name.split('/');
                    const nickname = parts[0] ? parts[0].trim() : p.name;
                    const isSel = db.selectedPlayerId === p.id ? "selected" : "";
                    
                    sequenceHtml += `<div class="sequence-item-wrapper">`;

                    if(m.p === 'container-player-list') {
                        sequenceHtml += `
                            <div class="sequence-card ${isSel}" onclick="selectPlayer('${p.id}')" title="${p.name}">
                                <button class="sequence-delete-btn" onclick="deletePlayerFromPool('${p.id}', event)">X</button>
                                <div class="sequence-avatar" style="background-image:url('${p.img}')"></div>
                                <div class="sequence-name">${nickname}</div>
                            </div>`;
                    } else {
                        sequenceHtml += `
                            <div class="sequence-card ${isSel}" onclick="selectPlayer('${p.id}')" title="${p.name}">
                                <div class="sequence-avatar" style="background-image:url('${p.img}')"></div>
                                <div class="sequence-name">${nickname}</div>
                            </div>`;
                    }

                    if (index < db.playerPool.length - 1 && (index + 1) % 4 !== 0) {
                        sequenceHtml += `<span class="sequence-arrow">▶</span>`;
                    }

                    sequenceHtml += `</div>`;
                });

                sequenceHtml += `</div>`;
                pContainer.innerHTML = sequenceHtml;
            }
        }
        
        if(fContainer) {
            fContainer.innerHTML = (!db.failPool || db.failPool.length === 0) ? `` : "";
            if(db.failPool) {
                db.failPool.forEach((p, index) => {
                    const parts = p.name.split('/');
                    const nickname = parts[0] ? parts[0].trim() : p.name;

                    if(m.f === 'container-fail-list') {
                        fContainer.innerHTML += `
                            <div class="visual-card" style="border-color:#ef4444;" onclick="recoverFailedPlayer(${index})" title="${p.name}">
                                <span class="badge-index">${index + 1}</span>
                                <div class="visual-avatar" style="background-image:url('${p.img}')"></div>
                                <div class="visual-name-container">
                                    <div class="visual-nickname">${nickname}</div>
                                </div>
                            </div>`;
                    } else {
                        fContainer.innerHTML += `
                            <div class="visual-card" style="border-color:#ef4444;" title="${p.name}">
                                <span class="badge-index">${index + 1}</span>
                                <div class="visual-avatar" style="background-image:url('${p.img}')"></div>
                                <div class="visual-name-container">
                                    <div class="visual-nickname">${nickname}</div>
                                </div>
                            </div>`;
                    }
                });
            }
        }
    });
}

async function addNewPlayerToPool() {
    const nameInput = document.getElementById('reg-player-name'); let imgInput = document.getElementById('reg-player-img').value.trim();
    if(!nameInput.value.trim()) return;
    if(!imgInput) { imgInput = "https://api.dicebear.com/7.x/bottts/svg?seed=" + encodeURIComponent(nameInput.value); }
    if(!db.playerPool) db.playerPool = [];
    const newObj = { id: "p_" + Date.now() + "_" + Math.floor(Math.random()*1000), name: nameInput.value.trim(), img: imgInput };
    db.playerPool.push(newObj); if(!db.selectedPlayerId || db.playerPool.length === 1) { db.selectedPlayerId = newObj.id; }
    nameInput.value = ""; document.getElementById('reg-player-img').value = "";
    await fbPut(db); renderAllStatic();
}

async function addBulkPlayersToPool() {
    const area = document.getElementById('reg-bulk-names'); if(!area || !area.value.trim()) return;
    const lines = area.value.split('\n').filter(l => l.trim().length > 0); if(lines.length === 0) return;
    if(!db.playerPool) db.playerPool = [];
    let baseTime = Date.now();
    lines.forEach((line, idx) => {
        const parts = line.split(','); const name = parts[0].trim(); let img = (parts[1] && parts[1].trim()) ? parts[1].trim() : "";
        if (!name) return;
        if(!img) { img = "https://api.dicebear.com/7.x/bottts/svg?seed=" + encodeURIComponent(name); }
        db.playerPool.push({ id: "p_" + (baseTime + idx) + "_" + Math.floor(Math.random()*1000), name: name, img: img });
    });
    if(!db.selectedPlayerId && db.playerPool.length > 0) { db.selectedPlayerId = db.playerPool[0].id; }
    area.value = "";
    await fbPut(db); renderAllStatic();
}

async function deletePlayerFromPool(id, event) {
    if(event) { event.stopPropagation(); event.preventDefault(); }
    db.playerPool = (db.playerPool || []).filter(p => p.id !== id);
    if(db.selectedPlayerId === id) { db.selectedPlayerId = db.playerPool.length > 0 ? db.playerPool[0].id : ""; }
    await fbPut(db); renderAllStatic();
}

async function selectPlayer(id) { 
    if(!id) return; 
    db.selectedPlayerId = id; 
    
    // 선택한 선수의 정보를 activeItem에 즉시 반영
    const selected = (db.playerPool || []).find(p => p.id === id);
    if (selected) {
        db.activeItem = { name: selected.name, img: selected.img };
    }
    
    // 💡 화면을 먼저 깔끔하게 즉시 갱신 (깜빡임 방지)
    renderAllStatic();
    
    // 그 후 서버에 비동기 저장
    await fbPut(db); 
}

async function recoverFailedPlayer(index) {
    if(!db.failPool || index < 0 || index >= db.failPool.length) return;
    const targetPlayer = db.failPool[index]; if(!db.playerPool) db.playerPool = [];
    const recoveredObj = { id: "p_" + Date.now() + "_" + Math.floor(Math.random()*1000), name: targetPlayer.name, img: targetPlayer.img };
    db.playerPool.push(recoveredObj); if(!db.selectedPlayerId || db.playerPool.length === 1) { db.selectedPlayerId = recoveredObj.id; }
    db.failPool.splice(index, 1);
    await fbPut(db); renderAllStatic();
}

async function shufflePlayerPool() {
    if(!db.playerPool || db.playerPool.length <= 1) return;
    for (let i = db.playerPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); [db.playerPool[i], db.playerPool[j]] = [db.playerPool[j], db.playerPool[i]];
    }
    db.selectedPlayerId = db.playerPool[0].id; 
    await fbPut(db); renderAllStatic();
}

async function clearAllPlayersOnly() {
    if(!confirm("⚠️ 전체 매물 및 유찰 목록을 삭제하시겠습니까?")) return;
    db.playerPool = []; db.failPool = []; db.selectedPlayerId = "";
    db.activeItem = { name: "대기 중", img: "https://api.dicebear.com/7.x/bottts/svg?seed=ready" };
    db.currentPrice = 0; db.currentBidder = "-"; db.timerEndsAt = 0; db.isTimerRunning = false;
    await fbPut(db); renderAllStatic();
}

function triggerSequence() {
    if(currentRole !== "admin") return;
    if(!db.playerPool || db.playerPool.length === 0) { alert("등록된 매물이 없습니다."); return; }
    const currentSelected = db.playerPool.find(p => p.id === db.selectedPlayerId);
    const targetPlayer = currentSelected ? currentSelected : db.playerPool[0];
    db.selectedPlayerId = targetPlayer.id;

    db.currentPrice = 0; db.currentBidder = "-"; db.activeItem = { name: targetPlayer.name, img: targetPlayer.img };
    db.isTimerRunning = false; db.timerEndsAt = 0;
    document.getElementById('gosegu-custom-input').value = 0;
    if(document.getElementById('dir-custom-input')) document.getElementById('dir-custom-input').value = 0;

    const rawName = db.activeItem.name;
    const nickName = rawName.split('/')[0].trim();

    let c = 3; db.soundTrigger = { type: 'ready_tick', time: Date.now() };
    db.logs.push({ txt: `📢 ${nickName} - 경매 개시 준비 - ${c}초`, cls: 'log-countdown' });
    fbPut(db); c--;

    let seq = setInterval(() => {
        if(c > 0) {
            db.soundTrigger = { type: 'ready_tick', time: Date.now() };
            db.logs.push({ txt: `📢 ${nickName} - 경매 개시 준비 - ${c}초`, cls: 'log-countdown' });
            fbPut(db); c--;
        } else {
            clearInterval(seq);
            db.soundTrigger = { type: 'start', time: Date.now() };
            db.logs.push({ txt: `🔥 ${nickName} - 경매 시작!`, cls: 'log-start' });

            db.timerEndsAt = Date.now() + 15000;
            db.isTimerRunning = true;
            fbPut(db);
        }
    }, 1000);
}

function goseguAddPrice(amt) { let i = document.getElementById('gosegu-custom-input'); i.value = (parseInt(i.value) || db.currentPrice) + amt; }
function dirAddPrice(amt) { let i = document.getElementById('dir-custom-input'); i.value = (parseInt(i.value) || db.currentPrice) + amt; }

async function goseguSubmitBid(type) {
    let localTimeLeft = 15.00;
    if (db.isTimerRunning && db.timerEndsAt > 0) {
        localTimeLeft = (db.timerEndsAt - Date.now()) / 1000;
    }
    if(!db.activeItem || db.activeItem.name === "대기 중" || localTimeLeft <= 0 || !db.isTimerRunning) return;

    const key = (type === 'admin') ? document.getElementById('active-director-select').value : currentDirKey;
    const inputId = (type === 'admin') ? 'gosegu-custom-input' : 'dir-custom-input';
    const price = parseInt(document.getElementById(inputId).value);

    if(price <= db.currentPrice) { alert("현재 최고가보다 높아야 합니다."); return; }
    if(price > db.directors[key].points) { alert("포인트가 부족합니다."); return; }

    db.currentPrice = price;
    db.currentBidder = key;
    db.timerEndsAt = Date.now() + 12000; 
    db.soundTrigger = { type: 'bid', time: Date.now() };

    const nickName = db.activeItem.name.split('/')[0].trim();
    db.logs.push({ txt: `📢 ${db.directors[key].name} - ${nickName} [${price}P] 입찰!`, cls: 'log-bid' });

    if(document.getElementById('gosegu-highest-price')) document.getElementById('gosegu-highest-price').innerText = price;
    if(document.getElementById('dir-highest-price')) document.getElementById('dir-highest-price').innerText = price;
    renderAllStatic();

    fbPut(db);
}

async function closeAuction() {
    if(!db.activeItem || db.activeItem.name === "대기 중") return;
    if(db.currentBidder === "-") { alert("입찰자가 없습니다."); return; }
    
    const slot = getAutoEmptySlot(db.currentBidder);
    if(!slot) { alert("해당 팀의 스쿼드가 꽉 찼습니다!"); return; }

    db.directors[db.currentBidder].points -= db.currentPrice;
    db.directors[db.currentBidder].squad[slot] = { name: db.activeItem.name, img: db.activeItem.img };
    
    const nickName = db.activeItem.name.split('/')[0].trim();
    playTone('success');
    pushLog(`🎉 [낙찰] ${db.directors[db.currentBidder].name} 팀 -> ${nickName} 영입! (${db.currentPrice}P)`, "log-start");
    finishCurrentAuction();
}

async function failAuction() {
    if(!db.activeItem || db.activeItem.name === "대기 중") return;
    
    const nickName = db.activeItem.name.split('/')[0].trim();
    playTone('fail');
    pushLog(`❌ ${nickName} 선수가 유찰되었습니다.`, "log-fail");
    
    if(!db.failPool) db.failPool = [];
    db.failPool.push({ 
        id: db.selectedPlayerId || ("fail_" + Date.now()), 
        name: db.activeItem.name, 
        img: db.activeItem.img 
    });
    
    finishCurrentAuction();
}

async function autoCloseAuction() {
    if(!db.activeItem || db.activeItem.name === "대기 중") return;
    if(db.currentBidder === "-") {
        autoFailAuction();
        return;
    }
    
    const slot = getAutoEmptySlot(db.currentBidder);
    if(!slot) {
        pushLog(`⚠️ [낙찰 실패] ${db.directors[db.currentBidder].name} 팀의 스쿼드가 꽉 차서 유찰 처리됩니다.`, "log-fail");
        autoFailAuction();
        return;
    }

    db.directors[db.currentBidder].points -= db.currentPrice;
    db.directors[db.currentBidder].squad[slot] = { name: db.activeItem.name, img: db.activeItem.img };
    
    const nickName = db.activeItem.name.split('/')[0].trim();
    playTone('success');
    pushLog(`🎉 [낙찰] ${db.directors[db.currentBidder].name} 팀 -> ${nickName} 영입! (${db.currentPrice}P)`, "log-start");
    finishCurrentAuction();
}

async function autoFailAuction() {
    if(!db.activeItem || db.activeItem.name === "대기 중") return;
    
    const nickName = db.activeItem.name.split('/')[0].trim();
    playTone('fail');
    pushLog(`❌ [시간 종료] ${nickName} 선수가 유찰되었습니다.`, "log-fail");
    
    if(!db.failPool) db.failPool = [];
    db.failPool.push({ 
        id: db.selectedPlayerId || ("fail_" + Date.now()), 
        name: db.activeItem.name, 
        img: db.activeItem.img 
    });
    
    finishCurrentAuction();
}

async function finishCurrentAuction() {
    db.playerPool = (db.playerPool || []).filter(p => p.id !== db.selectedPlayerId);
    
    if(db.playerPool.length > 0) {
        db.selectedPlayerId = db.playerPool[0].id;
        db.activeItem = { name: db.playerPool[0].name, img: db.playerPool[0].img };
    } else {
        db.selectedPlayerId = "";
        db.activeItem = { name: "대기 중", img: "https://api.dicebear.com/7.x/bottts/svg?seed=ready" };
    }
    
    db.currentPrice = 0; 
    db.currentBidder = "-"; 
    db.timerEndsAt = 0; 
    db.isTimerRunning = false;
    
    if(!db.logs) db.logs = [];
    db.logs.push({ txt: "------------- 다음 경매 대기중 -------------", cls: "log-divider" });

    await fbPut(db);
    renderAllStatic();
}

function getAutoEmptySlot(directorKey) {
    const slots = ["팀원1", "팀원2", "팀원3", "팀원4"];
    for(let i=0; i<slots.length; i++) {
        if(!db.directors[directorKey].squad) db.directors[directorKey].squad = {};
        if(!db.directors[directorKey].squad[slots[i]]) return slots[i];
    }
    return null;
}

function pushLog(txt, cls) {
    if(!db.logs) db.logs = [];
    db.logs.push({ txt, cls });
    
    setTimeout(() => {
        const logBoxes = document.querySelectorAll('.log-box');
        logBoxes.forEach(box => {
            box.scrollTop = box.scrollHeight;
        });
    }, 10);
    
    fbPut(db);
}

async function forceAssignPlayer() {
    if(currentRole !== "admin") return;
    
    const currentSelected = (db.playerPool || []).find(p => p.id === db.selectedPlayerId) || (db.playerPool && db.playerPool[0]);
    if(!currentSelected) {
        alert("강제 지정할 매물이 없습니다.");
        return;
    }

    const targetDirKey = document.getElementById('force-target-director').value;
    if(!targetDirKey || !db.directors[targetDirKey]) {
        alert("지정할 팀을 선택해주세요.");
        return;
    }

    const slot = getAutoEmptySlot(targetDirKey);
    if(!slot) {
        alert(`${db.directors[targetDirKey].name} 팀의 스쿼드가 꽉 찼습니다!`);
        return;
    }

    const nickName = currentSelected.name.split('/')[0].trim();
    const teamName = db.directors[targetDirKey].name;

    if(!confirm(`[${nickName}] 선수를 [${teamName} 팀](${slot})으로 강제 지정하시겠습니까?\n(포인트는 차감되지 않습니다)`)) {
        return;
    }

    db.directors[targetDirKey].squad[slot] = { name: currentSelected.name, img: currentSelected.img };

    playTone('success');
    pushLog(`👑 [강제 지정] ${teamName} 팀 -> ${nickName} 영입 완료`, "log-start");

    db.isTimerRunning = false;
    db.timerEndsAt = 0;
    db.currentPrice = 0;
    db.currentBidder = "-";

    db.playerPool = db.playerPool.filter(p => p.id !== currentSelected.id);

    if(db.playerPool.length > 0) {
        db.selectedPlayerId = db.playerPool[0].id;
        db.activeItem = { name: db.playerPool[0].name, img: db.playerPool[0].img };
    } else {
        db.selectedPlayerId = "";
        db.activeItem = { name: "대기 중", img: "https://api.dicebear.com/7.x/bottts/svg?seed=ready" };
    }

    db.logs.push({ txt: "------------- 다음 경매 대기중 -------------", cls: "log-divider" });

    await fbPut(db);
    renderAllStatic();
}

function updateLobbyUI() {
    const titleEl = document.getElementById('lobby-tournament-title');
    if(titleEl && db.tournamentTitle) {
        titleEl.innerText = `🏆 ${db.tournamentTitle} 🏆`;
    }
    for(let i=0; i<4; i++) {
        const btn = document.getElementById(`lobby-dir-btn-${i}`);
        if(btn && db.directors[`dir${i}`]) {
            const colors = ['💚', '💙', '💜', '🧡'];
            btn.innerText = `${colors[i]} ${db.directors[`dir${i}`].name} 패널`;
        }
    }
}

function resetAllData() {
    if(confirm('데이터베이스를 완전히 초기화하시겠습니까?')) { fbPut(defaultDb).then(() => location.reload()); }
}

window.onload = init;
