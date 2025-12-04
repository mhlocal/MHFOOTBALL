const apiUrl = 'https://streamed.pk/api/matches/football';
const containerElement = document.getElementById('match-container');
const defaultBadge = 'https://cdn-icons-png.flaticon.com/512/1165/1165187.png';

let allMatches = [];
let countdownInterval = null;

init();

function init() {
    containerElement.innerHTML = '<p class="loading">Loading matches...</p>';
    history.replaceState({ filter: 'all' }, null, "");
    setupRemoteControl(); // TV Remote Support

    fetch(apiUrl)
        .then(response => response.json())
        .then(matches => {
            const now = new Date();
            allMatches = matches.filter(match => {
                const matchTime = new Date(match.date);
                return new Date(matchTime.getTime() + (150 * 60000)) > now;
            });

            if(allMatches.length > 0) renderMatches(allMatches);
            else containerElement.innerHTML = '<p style="text-align:center;">No upcoming matches found.</p>';
        })
        .catch(error => {
            console.error(error);
            containerElement.innerHTML = `<p style="text-align:center; color:red;">Connection Error.</p>`;
        });
}

// --- REMOTE CONTROL LOGIC ---
function setupRemoteControl() {
    document.addEventListener('keydown', function(e) {
        // Enter Key = Click
        if (e.key === 'Enter' || e.keyCode === 13) {
            if (document.activeElement) document.activeElement.click();
        }
        // Back/Escape Key = Close Modal
        if (e.key === 'Backspace' || e.key === 'Escape' || e.keyCode === 27 || e.keyCode === 8) {
             const modal = document.getElementById('video-modal');
             if(modal.style.display === 'block') history.back();
        }
    });
}

function toggleDropdown() {
    document.getElementById("filterDropdown").classList.toggle("show");
}

function filterData(type, updateHistory = true) {
    let filteredMatches = [];
    const now = new Date();
    const filterBtn = document.querySelector('.dropbtn');

    if (updateHistory) history.pushState({ filter: type }, null, "");

    if (type === 'all') {
        filteredMatches = allMatches;
        filterBtn.innerHTML = 'All Matches 🔽';
    } else if (type === 'popular') {
        filteredMatches = allMatches.filter(match => match.popular === true);
        filterBtn.innerHTML = 'Popular Matches 🔽';
    } else if (type === 'live') {
        filteredMatches = allMatches.filter(match => now >= new Date(match.date));
        filterBtn.innerHTML = 'Live Matches 🔴 🔽';
    }

    renderMatches(filteredMatches);
    document.getElementById("filterDropdown").classList.remove('show');
}

function renderMatches(matches) {
    containerElement.innerHTML = '';
    if (matches.length > 0) {
        matches.forEach(match => {
            const card = document.createElement('div');
            card.className = 'match-card';
            // tabindex="0" is vital for TV Remote
            card.setAttribute('tabindex', '0'); 
            card.onclick = () => handleMatchClick(match);

            const isLive = new Date() >= new Date(match.date); 
            
            let titleHTML = match.title;
            if(match.popular) titleHTML = `🔥 ${titleHTML}`;
            if (isLive) titleHTML += ` <span class="live-badge">LIVE 🔴</span>`;

            card.innerHTML = `
                <div class="match-title">${titleHTML}</div>
                <div class="match-date">${isLive ? '<span style="color:#27ae60;font-weight:bold;">Started / Streaming Now</span>' : new Date(match.date).toLocaleString()}</div>
            `;

            if (match.teams) {
                const teamsDiv = document.createElement('div');
                teamsDiv.className = 'teams-container';
                teamsDiv.appendChild(createBadge(match.teams.home));
                const vs = document.createElement('span');
                vs.className = 'vs-text';
                vs.textContent = ' VS ';
                teamsDiv.appendChild(vs);
                teamsDiv.appendChild(createBadge(match.teams.away));
                card.appendChild(teamsDiv);
            }
            containerElement.appendChild(card);
        });
    } else {
        containerElement.innerHTML = '<p style="text-align:center; padding:20px;">No matches found.</p>';
    }
}

function createBadge(teamData) {
    const img = document.createElement('img');
    img.className = 'team-badge';
    img.alt = (teamData && teamData.name) ? teamData.name : 'Team';
    if (teamData && teamData.badge) {
        img.src = `https://streamed.pk/api/images/badge/${teamData.badge}.webp`;
        img.onerror = function() { this.src = defaultBadge; this.onerror = null; };
    } else { img.src = defaultBadge; }
    return img;
}

function handleMatchClick(match) {
    if (new Date() < new Date(match.date)) showCountdown(match);
    else setupLiveUI(match);
}

function openModal(title) {
    const modal = document.getElementById('video-modal');
    if (modal.style.display !== 'block') history.pushState({ modalOpen: true }, null, "");
    modal.style.display = 'block';
    document.getElementById('modal-title').textContent = title;
    document.body.classList.add('no-scroll');
}

window.addEventListener('popstate', function(event) {
    const modal = document.getElementById('video-modal');
    if (modal.style.display === 'block') performCloseUI();
    else if (event.state && event.state.filter) filterData(event.state.filter, false);
    else filterData('all', false);
});

function closeModal() { history.back(); }

function performCloseUI() {
    document.getElementById('video-modal').style.display = 'none';
    document.getElementById('player-container').innerHTML = '';
    document.getElementById('server-selection-container').innerHTML = '';
    document.body.classList.remove('no-scroll');
    if (countdownInterval) clearInterval(countdownInterval);
}

function showCountdown(match) {
    openModal(match.title);
    const container = document.getElementById('player-container');
    document.getElementById('server-selection-container').innerHTML = '';
    const matchTime = new Date(match.date).getTime();
    
    const updateTimer = () => {
        const distance = matchTime - new Date().getTime();
        if (distance < 0) { clearInterval(countdownInterval); setupLiveUI(match); return; }
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        container.innerHTML = `<div class="countdown-box"><p style="color:#aaa;margin-bottom:10px;">Match Starts In</p><div class="countdown-timer">${days>0?days+'d ':''} ${hours}h : ${minutes}m : ${seconds}s</div></div>`;
    };
    updateTimer();
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(updateTimer, 1000);
}

function setupLiveUI(match) {
    if (countdownInterval) clearInterval(countdownInterval);
    openModal(match.title);
    const playerContainer = document.getElementById('player-container');
    const serverContainer = document.getElementById('server-selection-container');
    playerContainer.innerHTML = ''; serverContainer.innerHTML = '';

    if (!match.sources || match.sources.length === 0) {
        playerContainer.innerHTML = '<div class="countdown-box"><p>No streams yet.</p></div>'; return;
    }

    playStream(match.sources[0].source, match.sources[0].id);

    match.sources.forEach((sourceObj, index) => {
        const btn = document.createElement('button');
        btn.className = 'server-btn';
        btn.setAttribute('tabindex', '0'); // For TV Remote
        if (index === 0) btn.classList.add('active-server');
        btn.innerHTML = `<span class="hd-badge">HD</span> Stream ${index + 1}`;
        btn.onclick = function() {
            document.querySelectorAll('.server-btn').forEach(b => b.classList.remove('active-server'));
            btn.classList.add('active-server');
            playStream(sourceObj.source, sourceObj.id);
        };
        serverContainer.appendChild(btn);
    });
}

function playStream(sourceName, sourceId) {
    const container = document.getElementById('player-container');
    container.innerHTML = '<div class="countdown-box"><p>Connecting...</p></div>';
    fetch(`https://streamed.pk/api/stream/${sourceName}/${sourceId}`)
        .then(res => res.json())
        .then(streams => {
            if (streams.length > 0) {
                container.innerHTML = `<iframe src="${streams[0].embedUrl}" scrolling="no" frameborder="0" allowfullscreen allow="autoplay; encrypted-media" sandbox="allow-scripts allow-same-origin allow-presentation"></iframe>`;
            } else container.innerHTML = '<div class="countdown-box"><p>Stream Error.</p></div>';
        })
        .catch(() => container.innerHTML = '<div class="countdown-box"><p>Connection Failed.</p></div>');
}

window.onclick = function(event) {
    if (!event.target.matches('.dropbtn')) {
        const dropdowns = document.getElementsByClassName("dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            if (dropdowns[i].classList.contains('show')) dropdowns[i].classList.remove('show');
        }
    }
}
