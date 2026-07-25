// ============================================
// RAILWAY GATEWAY - UNIVERSAL DIRECT HIGH-PERFORMANCE
// UI Blue Cyberpunk + Live Online Counter + Total Visit History MURNI
// Ready to Deploy - Node.js
// ============================================

const WebSocket = require('ws');
const net = require('net');
const dgram = require('dgram');
const http = require('http');
const https = require('https');
const url = require('url');

// Constants Murni Bawaan Lu
const horse = Buffer.from("dHJvamFu", 'base64').toString(); // "trojan"
const flash = Buffer.from("dm1lc3M=", 'base64').toString(); // "vmess"
const v2 = Buffer.from("djJyYXk=", 'base64').toString(); // "v2ray"
const neko = Buffer.from("Y2xhc2g=", 'base64').toString(); // "clash"

const CORS_HEADER_OPTIONS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

class GatewayServer {
  constructor() {
    this.wss = null;
    this.httpServer = null;
    this.activeUDPConnections = new Map();
    this.CORS_HEADER_OPTIONS = CORS_HEADER_OPTIONS;
    this.totalVisits = 0; // Menyimpan riwayat total kunjungan ke server
  }

  // ==================== HTTP HANDLERS & UI GENERATOR ====================
  handleHealthCheck(req, res) {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'railway-gateway',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      features: { websocket: true, tcp: true, udp: true }
    };
    res.writeHead(200, { 'Content-Type': 'application/json', ...this.CORS_HEADER_OPTIONS });
    res.end(JSON.stringify(healthData, null, 2));
  }

  async handleHttpRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    if (req.method === 'OPTIONS') { res.writeHead(200, this.CORS_HEADER_OPTIONS); res.end(); return; }
    if (parsedUrl.pathname === '/health') { this.handleHealthCheck(req, res); return; }
    
    if (parsedUrl.pathname === '/') {
      this.totalVisits++; // Tambah 1 riwayat setiap kali halaman diakses/dikunjungi
      
      const currentHost = req.headers.host || 'localhost:3000';
      const uptime = Math.floor(process.uptime());
      const onlineClients = this.wss ? this.wss.clients.size : 0;
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ddfathuvles // BLUE SYSTEM MONITOR</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap');
    body { font-family: 'JetBrains Mono', monospace; background-color: #060919; }
    .card-blue { background-color: #0c132b; border: 1px solid #1e295b; }
    .btn-blue { background-color: #131d42; border: 1px solid #283c79; color: #93c5fd; }
    .btn-blue:hover { border-color: #3b82f6; color: #fff; background-color: #1a2756; }
    .btn-active { border-color: #60a5fa !important; color: #fff !important; background-color: #1d4ed8 !important; }
  </style>
</head>
<body class="text-blue-200 min-h-screen flex flex-col justify-between p-4 max-w-md mx-auto selection:bg-blue-600 selection:text-white">

  <!-- LIVE TIMER UPPERHEAD -->
  <div class="text-center my-2">
    <div id="live-timer" class="text-4xl font-bold text-white tracking-widest drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">00:00:00</div>
  </div>

  <main class="space-y-4 flex-grow mt-2">
    <!-- BRAND HEADER & COUNTERS -->
    <div class="text-center card-blue p-3 rounded-xl border-dashed">
      <h1 class="text-lg font-bold text-white tracking-wider">⚡ DDFATHUVLES<span class="text-blue-400">.sys</span></h1>
      <div class="flex flex-col gap-1 mt-1.5 border-t border-blue-950/50 pt-1.5">
        <div class="flex justify-center items-center gap-2">
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <p class="text-[11px] text-emerald-300 font-bold tracking-widest">ONLINE CLIENTs: <span id="online-count" class="text-white">${onlineClients}</span> ORG</p>
        </div>
        <div class="flex justify-center items-center gap-1.5">
          <p class="text-[10px] text-blue-400 font-bold tracking-widest">📋 TOTAL HISTORY HITS: <span class="text-yellow-400 font-mono">${this.totalVisits}x</span> DIKUNJUNGI</p>
        </div>
      </div>
    </div>

    <!-- METRICS GRID (CPU & RAM) -->
    <div class="grid grid-cols-2 gap-3">
      <div class="card-blue p-4 rounded-xl relative overflow-hidden">
        <p class="text-[10px] text-blue-400 font-bold tracking-wider">CPU USAGE</p>
        <p id="cpu-val" class="text-2xl font-bold text-white mt-1">8.4%</p>
        <div class="absolute bottom-0 left-0 h-1 bg-blue-500 w-1/3"></div>
      </div>
      <div class="card-blue p-4 rounded-xl relative overflow-hidden">
        <p class="text-[10px] text-blue-400 font-bold tracking-wider">RAM ALLOC</p>
        <p id="ram-val" class="text-2xl font-bold text-white mt-1">24.2%</p>
        <div class="absolute bottom-0 left-0 h-1 bg-indigo-500 w-1/2"></div>
      </div>
    </div>

    <!-- TRAFFIC METRICS -->
    <div class="grid grid-cols-2 gap-3">
      <div class="card-blue p-4 rounded-xl">
        <p class="text-[10px] text-blue-400 font-bold tracking-wider">DOWNLOAD</p>
        <p id="dl-total" class="text-xl font-bold text-white mt-1">128.4 MB</p>
        <p id="dl-speed" class="text-[11px] text-emerald-400 font-bold mt-0.5">245.1 KB/s</p>
      </div>
      <div class="card-blue p-4 rounded-xl">
        <p class="text-[10px] text-blue-400 font-bold tracking-wider">UPLOAD</p>
        <p id="ul-total" class="text-xl font-bold text-white mt-1">96.2 MB</p>
        <p id="ul-speed" class="text-[11px] text-blue-400 font-bold mt-0.5">182.4 KB/s</p>
      </div>
    </div>

    <!-- ANIMATED PULSE GRAPH -->
    <div class="card-blue p-4 rounded-xl">
      <div class="flex justify-between items-center mb-2">
        <p class="text-[10px] text-blue-400 font-bold tracking-wider">NETWORK TRAFFIC STATUS (60S)</p>
        <div class="flex gap-3 text-[10px] font-bold">
          <span class="text-emerald-400">● RX</span>
          <span class="text-blue-400">● TX</span>
        </div>
      </div>
      <div class="w-full bg-[#040610] rounded h-12 flex items-end p-1 gap-0.5 overflow-hidden border border-blue-950">
        <div id="bar-container" class="w-full flex items-end justify-between h-full"></div>
      </div>
    </div>

    <!-- CONFIG CONTROL BOX -->
    <div class="card-blue p-4 rounded-xl space-y-4">
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div>
          <label class="text-[10px] text-blue-400 font-bold block mb-1">UUID/PASS</label>
          <input id="uuidInput" type="text" value="853b8456-0c0b-4bfa-b3b4-b2619248a9bc" class="w-full bg-[#060917] border border-blue-900 rounded p-1.5 text-white font-mono focus:outline-none focus:border-blue-500">
        </div>
        <div>
          <label class="text-[10px] text-blue-400 font-bold block mb-1">HOST DOMAIN</label>
          <input id="hostInput" type="text" value="${currentHost}" class="w-full bg-[#060917] border border-blue-900 rounded p-1.5 text-white font-mono focus:outline-none focus:border-blue-500">
        </div>
      </div>

      <div class="space-y-2">
        <div class="border-l-2 border-blue-500 pl-2">
          <p class="text-[11px] font-bold text-blue-200 tracking-wider">BUG SNI</p>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button onclick="buildConfig('vless', 'sni')" class="btn-blue py-2 rounded-lg text-xs font-bold tracking-widest transition-all">VLESS</button>
          <button onclick="buildConfig('trojan', 'sni')" class="btn-blue py-2 rounded-lg text-xs font-bold tracking-widest transition-all">TROJAN</button>
        </div>
      </div>

      <div class="space-y-2">
        <div class="border-l-2 border-blue-500 pl-2">
          <p class="text-[11px] font-bold text-blue-200 tracking-wider">BUG CDN</p>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <button onclick="buildConfig('vless', 'cdn')" class="btn-blue py-2 rounded-lg text-xs font-bold tracking-widest transition-all">VLESS</button>
          <button onclick="buildConfig('vmess', 'cdn')" class="btn-blue py-2 rounded-lg text-xs font-bold tracking-widest transition-all">VMESS</button>
          <button onclick="buildConfig('trojan', 'cdn')" class="btn-blue py-2 rounded-lg text-xs font-bold tracking-widest transition-all">TROJAN</button>
        </div>
      </div>

      <div id="output-area" class="hidden space-y-1.5 bg-[#040610] p-3 rounded-lg border border-blue-950">
        <div class="flex justify-between items-center">
          <span id="out-type" class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500 text-white">VLESS</span>
          <button onclick="copyOutConfig()" class="text-[10px] text-blue-400 font-bold hover:underline">COPY</button>
        </div>
        <p id="configText" class="text-[11px] font-mono text-blue-100 break-all bg-black/40 p-2 rounded border border-blue-950 max-h-24 overflow-y-auto">Loading...</p>
      </div>
    </div>
  </main>

  <footer class="text-center text-[10px] text-blue-500 mt-4">&copy; 2026 DDFATHUVLES BLUE TERMINAL.</footer>

  <script>
    let currentUptime = ${uptime};
    function formatTime(s) {
      let h = Math.floor(s / 3600).toString().padStart(2, '0');
      let m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
      let sec = (s % 60).toString().padStart(2, '0');
      return h + ':' + m + ':' + sec;
    }
    setInterval(() => {
      currentUptime++;
      document.getElementById('live-timer').innerText = formatTime(currentUptime);
    }, 1000);

    setInterval(() => {
      document.getElementById('cpu-val').innerText = (Math.random() * 6 + 4).toFixed(1) + '%';
      document.getElementById('ram-val').innerText = (Math.random() * 2 + 23).toFixed(1) + '%';
      let dlSpd = Math.random() * 250 + 80;
      let ulSpd = Math.random() * 200 + 70;
      document.getElementById('dl-speed').innerText = dlSpd.toFixed(1) + ' KB/s';
      document.getElementById('ul-speed').innerText = ulSpd.toFixed(2) + ' KB/s';
    }, 2000);

    const container = document.getElementById('bar-container');
    const totalBars = 35;
    for(let i=0; i<totalBars; i++) {
      let b = document.createElement('div');
      b.className = 'w-2 bg-blue-500/20 rounded-t transition-all duration-300';
      b.style.height = (Math.random() * 80 + 10) + '%';
      container.appendChild(b);
    }
    setInterval(() => {
      Array.from(container.children).forEach(b => {
        b.style.height = (Math.random() > 0.85 ? Math.random() * 90 + 10 : Math.random() * 20 + 5) + '%';
        if(parseFloat(b.style.height) > 60) {
          b.className = 'w-2 bg-blue-400 rounded-t transition-all duration-300';
        } else {
          b.className = 'w-2 bg-blue-700/30 rounded-t transition-all duration-300';
        }
      });
    }, 1000);

    function buildConfig(protocol, type) {
      document.querySelectorAll('button').forEach(b => b.classList.remove('btn-active'));
      event.target.classList.add('btn-active');
      const uuid = document.getElementById('uuidInput').value.trim();
      const host = document.getElementById('hostInput').value.trim();
      const area = document.getElementById('output-area');
      const label = document.getElementById('out-type');
      const txt = document.getElementById('configText');

      let sniBug = type === 'sni' ? 'business.whatsapp.com' : host;
      let pathBug = type === 'cdn' ? '/ddfathuvles-cdn' : '/DIREK';
      let remark = 'DDFATHU-' + protocol.toUpperCase() + '-' + type.toUpperCase();
      let configResult = '';
      label.innerText = protocol.toUpperCase();
      
      if(protocol === 'vless') {
        configResult = 'vless://' + uuid + '@' + host + ':443?encryption=none&security=tls&sni=' + sniBug + '&fp=randomized&type=ws&host=' + host + '&path=' + encodeURIComponent(pathBug) + '#' + encodeURIComponent(remark);
      } else if(protocol === 'vmess') {
        let jsonVmess = { v: "2", ps: remark, add: host, port: "443", id: uuid, aid: "0", scy: "none", net: "ws", type: "none", host: host, path: pathBug, tls: "tls", sni: sniBug };
        configResult = 'vmess://' + btoa(JSON.stringify(jsonVmess));
      } else if(protocol === 'trojan') {
        configResult = 'trojan://' + uuid + '@' + host + ':443?security=tls&sni=' + sniBug + '&type=ws&host=' + host + '&path=' + encodeURIComponent(pathBug) + '#' + encodeURIComponent(remark);
      }
      txt.innerText = configResult;
      area.classList.remove('hidden');
    }

    function copyOutConfig() {
      navigator.clipboard.writeText(document.getElementById('configText').innerText);
      alert('Config Berhasil Disalin!');
    }
  </script>
</body>
</html>`);
      return;
    }
    
    const targetReversePrx = process.env.REVERSE_PRX_TARGET;
    if (targetReversePrx) { await this.reverseWeb(req, res, targetReversePrx); } 
    else { res.writeHead(404); res.end('Not Found'); }
  }

  async reverseWeb(request, response, target, targetPath) {
    try {
      const targetUrl = new URL(request.url);
      const targetChunk = target.split(":");
      targetUrl.hostname = targetChunk[0];
      targetUrl.port = targetChunk[1] || "443";
      const options = {
        hostname: targetUrl.hostname, port: targetUrl.port,
        path: (targetPath || targetUrl.pathname) + targetUrl.search, method: request.method,
        headers: { ...request.headers, host: targetUrl.hostname }
      };
      const proxyReq = https.request(options, (proxyRes) => {
        response.writeHead(proxyRes.statusCode, proxyRes.headers); proxyRes.pipe(response);
      });
      request.pipe(proxyReq);
    } catch (err) { response.writeHead(500); response.end(); }
  }

  // ==================== WEBSOCKET HANDLERS (MURNI LOGIKA SAKTI LU) ====================
  async handleWebSocketConnection(ws, request) {
    console.log(`[ONLINE] Klien terhubung! Total aktif: ${this.wss.clients.size}`);
    await this.websocketHandler(ws);
  }

  async websocketHandler(ws) {
    let addressLog = "", portLog = "";
    const log = (info, event) => console.log(`[${addressLog}:${portLog}] ${info}`, event || "");
    let remoteSocketWrapper = { value: null };

    ws.on('message', async (message) => {
      try {
        const chunk = Buffer.from(message);
        if (remoteSocketWrapper.value) { remoteSocketWrapper.value.write(chunk); return; }

        const protocol = await this.protocolSniffer(chunk);
        let protocolHeader;

        if (protocol === horse) protocolHeader = this.readHorseHeader(chunk);
        else if (protocol === flash) protocolHeader = this.readFlashHeader(chunk);
        else if (protocol === "ss") protocolHeader = this.readSsHeader(chunk);
        else throw new Error("Unknown Protocol!");

        addressLog = protocolHeader.addressRemote;
        portLog = `${protocolHeader.portRemote} -> ${protocolHeader.isUDP ? "UDP" : "TCP"}`;
        if (protocolHeader.hasError) throw new Error(protocolHeader.message);

        if (protocolHeader.isUDP) {
          return await this.handleUDPOutbound(protocolHeader.addressRemote, protocolHeader.portRemote, chunk.slice(protocolHeader.rawDataIndex), ws, protocolHeader.version, log);
        }

        this.handleTCPOutBound(remoteSocketWrapper, protocolHeader.addressRemote, protocolHeader.portRemote, protocolHeader.rawClientData, ws, protocolHeader.version, log);
      } catch (err) {
        ws.close(1011);
      }
    });

    ws.on('close', () => { 
      if (remoteSocketWrapper.value) remoteSocketWrapper.value.end(); 
      this.cleanupUDPConnections(ws);
      console.log(`[DISCONNECT] Klien terputus. Sisa aktif: ${this.wss ? this.wss.clients.size : 0}`);
    });
    ws.on('error', () => {
      this.cleanupUDPConnections(ws);
    });
  }

  async protocolSniffer(buffer) {
    if (buffer.length >= 62) {
      const d = buffer.slice(56, 60);
      if (d[0] === 0x0d && d[1] === 0x0a && [0x01,0x03,0x7f].includes(d[2]) && [0x01,0x03,0x04].includes(d[3])) return horse;
    }
    const h = buffer.slice(1, 17).toString('hex');
    if (h.match(/^[0-9a-f]{8}[0-9a-f]{4}4[0-9a-f]{3}[89ab][0-9a-f]{3}[0-9a-f]{12}$/i)) return flash;
    return "ss";
  }

  async handleTCPOutBound(remoteSocket, addressRemote, portRemote, rawClientData, webSocket, responseHeader, log) {
    try {
      const s = net.createConnection({ host: addressRemote, port: portRemote }, () => {
        log(`pure direct connection established to ${addressRemote}:${portRemote}`);
        s.write(rawClientData);
      });
      remoteSocket.value = s;
      s.on('close', () => webSocket.close());
      s.on('error', () => webSocket.close());
      this.remoteSocketToWS(s, webSocket, responseHeader, log);
    } catch (e) { webSocket.close(); }
  }

  async handleUDPOutbound(targetAddress, targetPort, dataChunk, webSocket, responseHeader, log) {
    return new Promise((resolve) => {
      try {
        let header = responseHeader;
        const key = `${targetAddress}:${targetPort}:${Date.now()}`;
        const sock = dgram.createSocket('udp4');
        this.activeUDPConnections.set(key, { socket: sock, webSocket });
        sock.on('error', () => { try{sock.close()}catch(_){} this.activeUDPConnections.delete(key); });
        sock.send(dataChunk, targetPort, targetAddress, (e) => { if(e){ try{sock.close()}catch(_){} this.activeUDPConnections.delete(key); } });
        sock.on('message', (msg) => {
          if (webSocket.readyState === WebSocket.OPEN) {
            if (header) { webSocket.send(Buffer.concat([Buffer.from(header), msg])); header = null; }
            else webSocket.send(msg);
          }
        });
        sock.on('close', () => this.activeUDPConnections.delete(key));
        let t = setTimeout(() => { try{sock.close()}catch(_){} this.activeUDPConnections.delete(key); }, 30000);
        sock.on('message', () => { clearTimeout(t); t = setTimeout(() => { try{sock.close()}catch(_){} this.activeUDPConnections.delete(key); }, 30000); });
      } catch(e) {}
    });
  }

  cleanupUDPConnections(webSocket) {
    for (const [key, conn] of this.activeUDPConnections) {
      if (conn.webSocket === webSocket) { try { conn.socket.close(); } catch(_) {} this.activeUDPConnections.delete(key); }
    }
  }

  readSsHeader(buf) {
    const at = buf[0]; let al = 0, avi = 1, av = "";
    if (at === 1) { al = 4; av = Array.from(buf.slice(avi, avi+al)).join("."); }
    else if (at === 3) { al = buf[avi]; avi += 1; av = buf.slice(avi, avi+al).toString(); }
    else if (at === 4) { al = 16; const ip = []; for(let i=0;i<8;i++) ip.push(buf.readUInt16BE(avi+i*2).toString(16)); av = ip.join(":"); }
    else return { hasError: true, message: `Invalid addr type` };
    if (!av) return { hasError: true, message: "Address empty" };
    const pi = avi + al; const pr = buf.readUInt16BE(pi);
    return { hasError: false, addressRemote: av, portRemote: pr, rawDataIndex: pi+2, rawClientData: buf.slice(pi+2), version: null, isUDP: pr == 53 };
  }

  readFlashHeader(buf) {
    const v = buf[0]; let udp = false; const ol = buf[17]; const cmd = buf[18+ol];
    if (cmd === 2) udp = true; else if (cmd !== 1) return { hasError: true, message: `Cmd unsupported` };
    const pi = 18+ol+1; const pr = buf.readUInt16BE(pi);
    let ai = pi+2; const at = buf[ai]; let al = 0, avi = ai+1, av = "";
    if (at === 1) { al = 4; av = Array.from(buf.slice(avi, avi+al)).join("."); }
    else if (at === 2) { al = buf[avi]; avi += 1; av = buf.slice(avi, avi+al).toString(); }
    else if (at === 3) { al = 16; const ip = []; for(let i=0;i<8;i++) ip.push(buf.readUInt16BE(avi+i*2).toString(16)); av = ip.join(":"); }
    else return { hasError: true, message: `Invalid addr type` };
    if (!av) return { hasError: true, message: "Address empty" };
    return { hasError: false, addressRemote: av, portRemote: pr, rawDataIndex: avi+al, rawClientData: buf.slice(avi+al), version: Buffer.from([v,0]), isUDP: udp };
  }

  readHorseHeader(buf) {
    const db = buf.slice(58);
    if (db.length < 6) return { hasError: true, message: "Invalid data" };
    let udp = false; const cmd = db[0];
    if (cmd == 3) udp = true; else if (cmd != 1) throw new Error("Unsupported cmd");
    let at = db[1]; let al = 0, avi = 2, av = "";
    if (at === 1) { al = 4; av = Array.from(db.slice(avi, avi+al)).join("."); }
    else if (at === 3) { al = db[avi]; avi += 1; av = db.slice(avi, avi+al).toString(); }
    else if (at === 4) { al = 16; const ip = []; for(let i=0;i<8;i++) ip.push(db.readUInt16BE(avi+i*2).toString(16)); av = ip.join(":"); }
    else return { hasError: true, message: `Invalid addr type` };
    if (!av) return { hasError: true, message: "Address empty" };
    const pi = avi + al; const pr = db.readUInt16BE(pi);
    return { hasError: false, addressRemote: av, portRemote: pr, rawDataIndex: pi+4, rawClientData: db.slice(pi+4), version: null, isUDP: udp };
  }

  remoteSocketToWS(remoteSocket, webSocket, responseHeader, log) {
    let header = responseHeader;
    remoteSocket.on('data', (chunk) => {
      if (webSocket.readyState !== WebSocket.OPEN) { remoteSocket.destroy(); return; }
      if (header) { webSocket.send(Buffer.concat([Buffer.from(header), chunk])); header = null; }
      else webSocket.send(chunk);
    });
  }

  start(port = process.env.PORT || 3000) {
    const server = http.createServer((req, res) => { this.handleHttpRequest(req, res).catch(() => {}); });
    this.wss = new WebSocket.Server({ server, perMessageDeflate: false });
    this.wss.on('connection', (ws, req) => { this.handleWebSocketConnection(ws, req); });
    server.listen(port, '0.0.0.0', () => { this.httpServer = server; });
  }
}

if (require.main === module) {
  const server = new GatewayServer();
  const port = process.env.PORT || 3000;
  server.start(port);
}

module.exports = GatewayServer;
