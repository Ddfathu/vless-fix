// ============================================
// RAILWAY GATEWAY - UNIVERSAL DIRECT HIGH-PERFORMANCE
// UI Cyberpunk DDFATHUVLES + WebSocket Sniffer Multi-Protocol MURNI
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
  }

  // ==================== HTTP HANDLERS & UI GENERATOR MURNI ====================
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
      const currentHost = req.headers.host || 'localhost:3000';
      const uptime = Math.floor(process.uptime());
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ddfathuvles // SYSTEM MONITOR</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap');
    body { font-family: 'JetBrains Mono', monospace; background-color: #050508; }
    .card-dark { background-color: #0b0c13; border: 1px solid #161925; }
    .btn-dark { background-color: #121420; border: 1px solid #1e2235; color: #a0aec0; }
    .btn-dark:hover { border-color: #3b82f6; color: #fff; }
    .btn-active { border-color: #eab308 !important; color: #eab308 !important; }
  </style>
</head>
<body class="text-slate-400 min-h-screen flex flex-col justify-between p-4 max-w-md mx-auto selection:bg-blue-600 selection:text-white">

  <!-- LIVE TIMER UPPERHEAD -->
  <div class="text-center my-2">
    <div id="live-timer" class="text-4xl font-bold text-white tracking-widest">00:00:00</div>
  </div>

  <main class="space-y-4 flex-grow mt-2">
    <!-- BRAND HEADER -->
    <div class="text-center card-dark p-3 rounded-xl border-dashed">
      <h1 class="text-lg font-bold text-white tracking-wider">⚡ DDFATHUVLES<span class="text-blue-500">.sys</span></h1>
      <p class="text-[10px] text-emerald-400 font-bold tracking-widest mt-0.5">TUNNEL MONITOR & ACCOUNT GENERATOR</p>
    </div>

    <!-- METRICS GRID -->
    <div class="grid grid-cols-2 gap-3">
      <div class="card-dark p-4 rounded-xl relative overflow-hidden">
        <p class="text-[10px] text-slate-500 font-bold tracking-wider">CPU</p>
        <p id="cpu-val" class="text-2xl font-bold text-white mt-1">9.1%</p>
        <div class="absolute bottom-0 left-0 h-1 bg-cyan-400 w-1/3"></div>
      </div>
      <div class="card-dark p-4 rounded-xl relative overflow-hidden">
        <p class="text-[10px] text-slate-500 font-bold tracking-wider">RAM</p>
        <p id="ram-val" class="text-2xl font-bold text-white mt-1">29.8%</p>
        <div class="absolute bottom-0 left-0 h-1 bg-purple-500 w-1/2"></div>
      </div>
    </div>

    <!-- TRAFFIC METRICS -->
    <div class="grid grid-cols-2 gap-3">
      <div class="card-dark p-4 rounded-xl">
        <p class="text-[10px] text-slate-500 font-bold tracking-wider">DOWNLOAD</p>
        <p id="dl-total" class="text-xl font-bold text-white mt-1">189.31 MB</p>
        <p id="dl-speed" class="text-[11px] text-emerald-400 font-bold mt-0.5">356.3 KB/s</p>
      </div>
      <div class="card-dark p-4 rounded-xl">
        <p class="text-[10px] text-slate-500 font-bold tracking-wider">UPLOAD</p>
        <p id="ul-total" class="text-xl font-bold text-white mt-1">142.6 MB</p>
        <p id="ul-speed" class="text-[11px] text-blue-400 font-bold mt-0.5">357.74 KB/s</p>
      </div>
    </div>

    <!-- ANIMATED PULSE GRAPH -->
    <div class="card-dark p-4 rounded-xl">
      <div class="flex justify-between items-center mb-2">
        <p class="text-[10px] text-slate-500 font-bold tracking-wider">NETWORK TRAFFIC STATUS (60S)</p>
        <div class="flex gap-3 text-[10px] font-bold">
          <span class="text-emerald-400">● RX</span>
          <span class="text-blue-400">● TX</span>
        </div>
      </div>
      <div class="w-full bg-black/40 rounded h-12 flex items-end p-1 gap-0.5 overflow-hidden">
        <div id="bar-container" class="w-full flex items-end justify-between h-full"></div>
      </div>
    </div>

    <!-- CONFIG CONTROL BOX -->
    <div class="card-dark p-4 rounded-xl space-y-4">
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div>
          <label class="text-[10px] text-slate-500 font-bold block mb-1">UUID/PASS</label>
          <input id="uuidInput" type="text" value="853b8456-0c0b-4bfa-b3b4-b2619248a9bc" class="w-full bg-[#07080e] border border-slate-800 rounded p-1.5 text-white font-mono focus:outline-none">
        </div>
        <div>
          <label class="text-[10px] text-slate-500 font-bold block mb-1">HOST DOMAIN</label>
          <input id="hostInput" type="text" value="${currentHost}" class="w-full bg-[#07080e] border border-slate-800 rounded p-1.5 text-white font-mono focus:outline-none">
        </div>
      </div>

      <div class="space-y-2">
        <div class="border-l-2 border-slate-700 pl-2">
          <p class="text-[11px] font-bold text-slate-300 tracking-wider">BUG SNI</p>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button onclick="buildConfig('vless', 'sni')" class="btn-dark py-2 rounded-lg text-xs font-bold tracking-widest transition-all">VLESS</button>
          <button onclick="buildConfig('trojan', 'sni')" class="btn-dark py-2 rounded-lg text-xs font-bold tracking-widest transition-all">TROJAN</button>
        </div>
      </div>

      <div class="space-y-2">
        <div class="border-l-2 border-slate-700 pl-2">
          <p class="text-[11px] font-bold text-slate-300 tracking-wider">BUG CDN</p>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <button onclick="buildConfig('vless', 'cdn')" class="btn-dark py-2 rounded-lg text-xs font-bold tracking-widest transition-all">VLESS</button>
          <button onclick="buildConfig('vmess', 'cdn')" class="btn-dark py-2 rounded-lg text-xs font-bold tracking-widest transition-all">VMESS</button>
          <button onclick="buildConfig('trojan', 'cdn')" class="btn-dark py-2 rounded-lg text-xs font-bold tracking-widest transition-all">TROJAN</button>
        </div>
      </div>

      <div id="output-area" class="hidden space-y-1.5 bg-[#06070a] p-3 rounded-lg border border-slate-900">
        <div class="flex justify-between items-center">
          <span id="out-type" class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-black">VLESS</span>
          <button onclick="copyOutConfig()" class="text-[10px] text-blue-400 font-bold hover:underline">COPY</button>
        </div>
        <p id="configText" class="text-[11px] font-mono text-slate-300 break-all bg-black/40 p-2 rounded border border-slate-950 max-h-24 overflow-y-auto">Loading...</p>
      </div>
    </div>
  </main>

  <footer class="text-center text-[10px] text-slate-700 mt-4">&copy; 2026 DDFATHUVLES TERMINAL.</footer>

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
      document.getElementById('cpu-val').innerText = (Math.random() * 8 + 4).toFixed(1) + '%';
      document.getElementById('ram-val').innerText = (Math.random() * 3 + 28).toFixed(1) + '%';
      let dlSpd = Math.random() * 300 + 100;
      let ulSpd = Math.random() * 250 + 90;
      document.getElementById('dl-speed').innerText = dlSpd.toFixed(1) + ' KB/s';
      document.getElementById('ul-speed').innerText = ulSpd.toFixed(2) + ' KB/s';
    }, 2000);

    const container = document.getElementById('bar-container');
    const totalBars = 35;
    for(let i=0; i<totalBars; i++) {
      let b = document.createElement('div');
      b.className = 'w-2 bg-cyan-500/20 rounded-t transition-all duration-300';
      b.style.height = (Math.random() * 80 + 10) + '%';
      container.appendChild(b);
    }
    setInterval(() => {
      Array.from(container.children).forEach(b => {
        b.style.height = (Math.random() > 0.85 ? Math.random() * 90 + 10 : Math.random() * 20 + 5) + '%';
        if(parseFloat(b.style.height) > 60) {
          b.className = 'w-2 bg-cyan-400 rounded-t transition-all duration-300';
        } else {
          b.className = 'w-2 bg-cyan-600/30 rounded-t transition-all duration-300';
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
    console.log(`WebSocket universal handshake connected via path: ${url.parse(request.url).pathname}`);
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

    ws.on('close', () => { if (remoteSocketWrapper.value) remoteSocketWrapper.value.end(); this.cleanupUDPConnections(ws); });
    ws.on('error', () => this.cleanupUDPConnections(ws));
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
