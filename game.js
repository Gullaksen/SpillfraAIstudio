// VIKTIG: Erstatt med DIN Replit backend URL
const SERVER_URL = 'https://4f60f89f-8665-4cfc-9f33-65e38728b6cb-00-3ea6nbydk5678.kirk.replit.dev/'; 

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const serverStatusElement = document.getElementById('serverStatus');

// Sett canvas-størrelse (bør matche 'worldWidth' og 'worldHeight' fra serveren,
// men vi kan hardkode det her for nå, eller få det fra serveren senere)
canvas.width = 800;
canvas.height = 600;

const socket = io(SERVER_URL, {
    transports: ['websocket'] // Kan hjelpe med noen Replit-konfigurasjoner
});

let players = {}; // Objekt for å lagre alle spillere, inkludert vår egen
let myPlayerId = null; // ID for vår egen spiller

// Håndterer tilkobling
socket.on('connect', () => {
    console.log('Koblet til serveren! Min ID:', socket.id);
    serverStatusElement.textContent = "Koblet til!";
    serverStatusElement.style.color = "green";
});

socket.on('connect_error', (err) => {
    console.error('Tilkoblingsfeil:', err.message);
    serverStatusElement.textContent = "Tilkoblingsfeil!";
    serverStatusElement.style.color = "red";
});

// Mottar listen over alle nåværende spillere når vi kobler til
socket.on('currentPlayers', (serverPlayers) => {
    console.log('Mottok nåværende spillere:', serverPlayers);
    players = serverPlayers; // Erstatter vår lokale spilleroversikt
});

// Mottar data om vår egen spiller (f.eks. farge, startposisjon)
socket.on('yourPlayer', (playerData) => {
    console.log('Dette er min spiller:', playerData);
    myPlayerId = playerData.id;
    // Vi har allerede spillerdata i 'players' fra 'currentPlayers',
    // men dette bekrefter vår ID og kan brukes til å hente spesifikk info.
});

// En ny spiller har koblet seg til
socket.on('newPlayer', (playerInfo) => {
    console.log('En ny spiller koblet til:', playerInfo);
    players[playerInfo.id] = playerInfo;
});

// En spiller har beveget seg
socket.on('playerMoved', (playerInfo) => {
    if (players[playerInfo.id]) {
        players[playerInfo.id].x = playerInfo.x;
        players[playerInfo.id].y = playerInfo.y;
    } else {
        // Hvis spilleren ikke finnes lokalt (burde ikke skje ofte med currentPlayers/newPlayer)
        players[playerInfo.id] = playerInfo; 
    }
});

// En spiller har koblet fra
socket.on('playerDisconnected', (playerId) => {
    console.log('Spiller koblet fra:', playerId);
    delete players[playerId];
    if (playerId === myPlayerId) {
        // Dette skulle ikke skje med mindre serveren har et problem
        // eller vi ble manuelt frakoblet
        console.warn("Serveren sier at VI har koblet fra?");
    }
});


// Input håndtering (enkel)
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});

// Funksjon for å sende bevegelsesdata til serveren
function sendMovement() {
    if (!myPlayerId) return; // Ikke send hvis vi ikke har fått vår ID enda

    // Bare send hvis minst en tast er trykket
    if (keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight) {
        socket.emit('playerMovement', {
            up: keys.ArrowUp,
            down: keys.ArrowDown,
            left: keys.ArrowLeft,
            right: keys.ArrowRight
        });
    }
}

// Spill-løkke for tegning og input-sending
function gameLoop() {
    // Send input med jevne mellomrom (kan justeres)
    sendMovement();

    // Tøm canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Tegn alle spillere
    for (const id in players) {
        const player = players[id];
        ctx.fillStyle = player.color || 'blue'; // Bruk spillerens farge, default til blå
        ctx.beginPath();
        ctx.arc(player.x, player.y, 10, 0, Math.PI * 2); // Tegn som en sirkel med radius 10
        ctx.fill();

        // Valgfritt: Tegn spillerens ID (nyttig for debugging)
        // ctx.fillStyle = 'black';
        // ctx.font = '10px Arial';
        // ctx.fillText(id === myPlayerId ? "Meg" : id.substring(0,4), player.x -10, player.y - 15);
    }

    requestAnimationFrame(gameLoop); // Kall gameLoop igjen for neste frame
}

// Start spill-løkken
gameLoop();
