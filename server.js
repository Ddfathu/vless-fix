// ============================================
// RAILWAY GATEWAY - UNIVERSAL DIRECT + GENERATOR (FIXED)
// UI Cyberpunk + VLESS/Trojan Generator + WebSocket + UDP
// Ready to Deploy - Node.js
// ============================================

const WebSocket = require('ws');
const net = require('net');
const dgram = require('dgram');
const http = require('http');
const https = require('https');
const url = require('url');

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
      const currentHost = req.headers.host || 'localhost:3000';
      const protocolWs = req.headers['x-forwarded-proto'] === 'https' ? 'wss' : 'ws';
      const uptime = Math.floor(process.uptime());
      const ramUsed = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      const nodeVersion = process.version;
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RAILWAY GATEWAY // DASHBOARD</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap');
    body { font-family: 'JetBrains Mono', monospace; background-color: #0a0b10; }
    .cyber-glow { box-shadow: 0 0 15px rgba(59, 130, 246, 0.2); }
    .cyber-glow-green { box-shadow: 0 0 15px rgba(16, 185, 129, 0.4); }
    .neon-border { border: 1px solid rgba(59, 130, 246, 0.3); }
    .neon-border:hover { border-color: rgba(59, 130, 246, 0.8); }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #0f111a; }
    ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
  </style>
</head>
<body class="text-slate-300 min-h-screen flex flex-col justify-between selection:bg-blue-600 selection:text-white">

  <header class="border-b border-slate-900 bg-[#0d0e16]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
    <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 rounded-lg bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 cyber-glow animate-pulse">
          <i class="fa-solid fa-terminal text-lg"></i>
        </div>
        <div>
          <h1 class="text-xl font-bold tracking-wider text-white">RAILWAY_GATEWAY<span class="text-blue-500">.sys</span></h1>
          <p class="text-xs text-slate-500">CORE NODE UNIVERSAL MODE</p>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 bg-[#121420] neon-border px-4 py-2 rounded-lg">
          <span class="h-2.5 w-2.5 rounded-full bg-emerald-500 cyber-glow-green animate-ping"></span>
          <span class="text-xs font-semibold text-emerald-400 tracking-wider">DIRECT MODE ACTIVE</span>
        </div>
      </div>
    </div>
  </header>

  <main class="max-w-7xl w-full mx-auto p-6 space-y-8 flex-grow">
    
    <!-- STATS -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-[#0d0e16] neon-border p-5 rounded-xl flex items-center justify-between">
        <div>
          <p class="text-xs text-slate-500 font-medium mb-1">SYSTEM UPTIME</p>
          <p id="uptime-val" class="text-lg font-bold text-white">${uptime}s</p>
        </div>
        <i class="fa-solid fa-clock text-slate-700 text-2xl"></i>
      </div>
      <div class="bg-[#0d0e16] neon-border p-5 rounded-xl flex items-center justify-between">
        <div>
          <p class="text-xs text-slate-500 font-medium mb-1">RAM ALLOCATION</p>
          <p class="text-lg font-bold text-white">${ramUsed} MB</p>
        </div>
        <i class="fa-solid fa-microchip text-slate-700 text-2xl"></i>
      </div>
      <div class="bg-[#0d0e16] neon-border p-5 rounded-xl flex items-center justify-between">
        <div>
          <p class="text-xs text-slate-500 font-medium mb-1">TUNNEL STRATEGY</p>
          <p class="text-lg font-bold text-emerald-400">UNIVERSAL DIRECT</p>
        </div>
        <i class="fa-solid fa-bolt text-emerald-900/50 text-2xl"></i>
      </div>
      <div class="bg-[#0d0e16] neon-border p-5 rounded-xl flex items-center justify-between">
        <div>
          <p class="text-xs text-slate-500 font-medium mb-1">NODE VERSION</p>
          <p class="text-lg font-bold text-blue-400">${nodeVersion}</p>
        </div>
        <i class="fa-brands fa-node-js text-blue-900/50 text-2xl"></i>
      </div>
    </div>

    <!-- INFO BOX -->
    <div class="bg-[#0d0e16] border border-slate-900 rounded-xl p-6 space-y-2">
      <div class="flex items-center gap-2 text-white font-bold">
        <i class="fa-solid fa-circle-info text-blue-400"></i>
        <span>INFO MODE UNIVERSAL DIRECT</span>
      </div>
      <p class="text-xs text-slate-400 leading-relaxed">
        Server ini berjalan dalam mode <span class="text-emerald-400 font-bold">Universal Direct</span>. Semua fitur proxy luar yang bermasalah telah dihapus. Kamu bebas mengisi kolom path di aplikasi VPN dengan nama atau kata apa saja, semuanya otomatis terkoneksi langsung via server Railway.
      </p>
    </div>

    <!-- ==================== VLESS & TROJAN GENERATOR ==================== -->
    <div class="bg-[#0d0e16] border border-slate-900 rounded-xl p-6 space-y-5">
      <div class="flex items-center gap-2 border-b border-slate-900 pb-3">
        <i class="fa-solid fa-key text-yellow-400"></i>
        <h2 class="text-md font-bold tracking-wide text-white">VLESS / TROJAN ACCOUNT GENERATOR</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        <!-- INPUT SECTION -->
        <div class="space-y-4">
          <div>
            <label class="text-xs text-slate-400 font-medium mb-1.5 block">UUID / Password</label>
            <div class="flex gap-2">
              <input id="uuidInput" type="text" value="853b8456-0c0b-4bfa-b3b4-b2619248a9bc" 
                     class="w-full bg-[#10121d] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-blue-500 focus:outline-none transition">
              <button id="randomUuidBtn" class="bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white px-3 py-2 rounded-lg text-xs transition flex items-center gap-1 whitespace-nowrap">
                <i class="fa-solid fa-shuffle"></i> RANDOM
              </button>
            </div>
          </div>

          <div>
            <label class="text-xs text-slate-400 font-medium mb-1.5 block">Host / Domain</label>
            <input id="hostInput" type="text" value="${currentHost}" 
                   class="w-full bg-[#10121d] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-blue-500 focus:outline-none transition">
          </div>

          <div>
            <label class="text-xs text-slate-400 font-medium mb-1.5 block">Port</label>
            <input id="portInput" type="text" value="443" 
                   class="w-full bg-[#10121d] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-blue-500 focus:outline-none transition">
          </div>

          <div>
            <label class="text-xs text-slate-400 font-medium mb-1.5 block">Path (Bebas Isi Nama Apa Saja)</label>
            <div class="flex gap-2">
              <select id="pathSelect" 
                      class="bg-[#10121d] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-blue-500 focus:outline-none transition">
                <option value="/DIREK">⚡ /DIREK (Standard)</option>
                <option value="/ALL">🌍 /ALL (Universal)</option>
                <option value="/G-SG">🇸🇬 /G-SG</option>
                <option value="/ID">🇮🇩 /ID</option>
                <option value="/VMESS">📡 /VMESS</option>
                <option value="/CUSTOM">✏️ CUSTOM PATH</option>
              </select>
              <input id="pathInput" type="text" value="/DIREK" 
                     class="w-full bg-[#10121d] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-blue-500 focus:outline-none transition">
            </div>
          </div>

          <!-- SNI SECTION -->
          <div>
            <label class="text-xs text-slate-400 font-medium mb-1.5 block">
              <i class="fa-solid fa-fingerprint text-purple-400 mr-1"></i> SNI (Server Name Indication)
            </label>
            <select id="sniSelect" 
                    class="w-full bg-[#10121d] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-purple-500 focus:outline-none transition mb-2">
              <option value="business.whatsapp.com">📱 business.whatsapp.com</option>
              <option value="media-sin6-3.cdn.whatsapp.net">📡 media-sin6-3.cdn.whatsapp.net</option>
              <option value="c.whatsapp.com">💬 c.whatsapp.com</option>
              <option value="web.whatsapp.com">🌐 web.whatsapp.com</option>
              <option value="v.whatsapp.net">📞 v.whatsapp.net</option>
              <option value="custom">✏️ CUSTOM SNI...</option>
            </select>
            <input id="sniInput" type="text" value="business.whatsapp.com" 
                   class="w-full bg-[#10121d] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-purple-500 focus:outline-none transition"
                   placeholder="Ketik manual SNI custom di sini...">
          </div>

          <div>
            <label class="text-xs text-slate-400 font-medium mb-1.5 block">Nama / Remark</label>
            <input id="remarkInput" type="text" value="RAILWAY STABLE ⚡" 
                   class="w-full bg-[#10121d] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-blue-500 focus:outline-none transition">
          </div>

          <button id="generateBtn" 
                  class="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-black font-bold py-2.5 px-4 rounded-lg transition text-sm flex items-center justify-center gap-2 active:scale-95">
            <i class="fa-solid fa-bolt"></i> GENERATE ACCOUNTS
          </button>
        </div>

        <!-- OUTPUT SECTION -->
        <div class="space-y-3">
          <label class="text-xs text-slate-400 font-medium block">📋 Hasil Generate Config</label>
          
          <div class="space-y-2">
            <div class="bg-[#07080e] rounded-lg p-4 border border-slate-950">
              <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded font-bold border border-purple-500/20">VLESS</span>
                <button onclick="copyText(document.getElementById('vlessOutput').textContent)" 
                        class="text-xs bg-[#171a29] border border-slate-800 text-slate-400 hover:text-purple-400 px-2 py-1 rounded transition flex items-center gap-1">
                  <i class="fa-regular fa-copy"></i> COPY
                </button>
              </div>
              <p id="vlessOutput" class="text-xs text-purple-300 font-mono break-all leading-relaxed bg-[#0a0b12] p-2 rounded border border-slate-900">
                Loading...
              </p>
            </div>

            <div class="bg-[#07080e] rounded-lg p-4 border border-slate-950">
              <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded font-bold border border-orange-500/20">TROJAN</span>
                <button onclick="copyText(document.getElementById('trojanOutput').textContent)" 
                        class="text-xs bg-[#171a29] border border-slate-800 text-slate-400 hover:text-orange-400 px-2 py-1 rounded transition flex items-center gap-1">
                  <i class="fa-regular fa-copy"></i> COPY
                </button>
              </div>
              <p id="trojanOutput" class="text-xs text-orange-300 font-mono break-all leading-relaxed bg-[#0a0b12] p-2 rounded border border-slate-900">
                Loading...
              </p>
            </div>
          </div>

          <div class="bg-[#10121d] border border-slate-800 rounded-lg p-3">
            <p class="text-[10px] text-slate-500 mb-1">🔗 FORMAT IMPORT CLASH META / V2RAY</p>
            <pre id="clashOutput" class="text-[11px] text-slate-400 font-mono break-all leading-relaxed whitespace-pre-wrap bg-[#0a0b12] p-2 rounded border border-slate-900 max-h-48 overflow-y-auto">Loading...</pre>
          </div>
        </div>

      </div>
    </div>

  </main>

  <footer class="border-t border-slate-950 bg-[#07080d] px-6 py-4 text-center text-xs text-slate-600">
    <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
      <p>&copy; 2026 RAILWAY GATEWAY. ALL SYSTEM OPERATIONAL.</p>
    </div>
  </footer>

  <div id="toast" class="fixed bottom-6 right-6 bg-blue-600 text-white font-semibold px-4 py-2.5 rounded-lg shadow-lg opacity-0 pointer-events-none transition-all duration-300 transform translate-y-2 text-xs z-50 flex items-center gap-2">
    <i class="fa-solid fa-circle-check"></i> ENDPOINT COPIED TO CLIPBOARD
  </div>

  <script>
    function copyText(text) {
      navigator.clipboard.writeText(text).then(() => {
        const toast = document.getElementById('toast');
        toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-2');
        toast.classList.add('opacity-100', 'translate-y-0');
        setTimeout(() => {
          toast.classList.remove('opacity-100', 'translate-y-0');
          toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-2');
        }, 2500);
      });
    }

    let uptimeStart = ${uptime};
    setInterval(() => {
      uptimeStart++;
      document.getElementById('uptime-val').innerText = uptimeStart + 's';
    }, 1000);

    function generateUUID() {
      const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      document.getElementById('uuidInput').value = uuid;
      generateAccounts();
    }

    function generateTrojanPass() {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      let pass = '';
      for (let i = 0; i < 36; i++) {
        if (i === 8 || i === 13 || i === 18 || i === 23) { pass += '-'; }
        else { pass += chars.charAt(Math.floor(Math.random() * chars.length)); }
      }
      return pass;
    }

    function generateAccounts() {
      try {
        const uuid = document.getElementById('uuidInput').value.trim() || '853b8456-0c0b-4bfa-b3b4-b2619248a9bc';
        const host = document.getElementById('hostInput').value.trim() || '${currentHost}';
        const port = document.getElementById('portInput').value.trim() || '443';
        const path = document.getElementById('pathInput').value.trim() || '/DIREK';
        const sni = document.getElementById('sniInput').value.trim() || 'business.whatsapp.com';
        const remark = document.getElementById('remarkInput').value.trim() || 'RAILWAY';
        const encodedPath = encodeURIComponent(path);
        const encodedRemark = encodeURIComponent(remark);

        const vlessUrl = 'vless://' + uuid + '@' + host + ':' + port +
                         '?encryption=none&security=tls&sni=' + sni +
                         '&fp=randomized&type=ws&host=' + host +
                         '&path=' + encodedPath + '#' + encodedRemark;

        const trojanPass = generateTrojanPass();
        const trojanUrl = 'trojan://' + trojanPass + '@' + host + ':' + port +
                          '?security=tls&sni=' + sni +
                          '&type=ws&host=' + host +
                          '&path=' + encodedPath + '#' + encodedRemark;

        document.getElementById('vlessOutput').textContent = vlessUrl;
        document.getElementById('trojanOutput').textContent = trojanUrl;

        document.getElementById('clashOutput').textContent = 
          '- name: "' + remark + ' VLESS"\\n' +
          '  type: vless\\n' +
          '  server: ' + host + '\\n' +
          '  port: ' + port + '\\n' +
          '  uuid: ' + uuid + '\\n' +
          '  network: ws\\n' +
          '  tls: true\\n' +
          '  udp: true\\n' +
          '  sni: "' + sni + '"\\n' +
          '  client-fingerprint: randomized\\n' +
          '  ws-opts:\\n' +
          '    path: "' + path + '"\\n' +
          '    headers:\\n' +
          '      host: "' + host + '"\\n\\n' +
          '- name: "' + remark + ' TROJAN"\\n' +
          '  type: trojan\\n' +
          '  server: ' + host + '\\n' +
          '  port: ' + port + '\\n' +
          '  password: ' + trojanPass + '\\n' +
          '  network: ws\\n' +
          '  tls: true\\n' +
          '  udp: true\\n' +
          '  sni: "' + sni + '"\\n' +
          '  ws-opts:\\n' +
          '    path: "' + path + '"\\n' +
          '    headers:\\n' +
          '      host: "' + host + '"';
      } catch(err) { console.error('Generator Error:', err); }
    }

    setTimeout(generateAccounts, 300);
    setTimeout(() => {
      ['uuidInput','hostInput','portInput','pathInput','sniInput','remarkInput'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', generateAccounts);
      });
      const pathSelect = document.getElementById('pathSelect');
      if (pathSelect) pathSelect.addEventListener('change', function() {
        if (this.value !== '/CUSTOM') {
          document.getElementById('pathInput').value = this.value;
          generateAccounts();
        }
      });
      const sniSelect = document.getElementById('sniSelect');
      if (sniSelect) sniSelect.addEventListener('change', function() {
        const sniInput = document.getElementById('sniInput');
        if (this.value === 'custom') { sniInput.value = ''; sniInput.focus(); }
        else { sniInput.value = this.value; generateAccounts(); }
      });
      const genBtn = document.getElementById('generateBtn');
      if (genBtn) genBtn.addEventListener('click', function(e) { e.preventDefault(); generateAccounts(); });
      const randBtn = document.getElementById('randomUuidBtn');
      if (randBtn) randBtn.addEventListener('click', function(e) { e.preventDefault(); generateUUID(); });
    }, 600);
  </script>
</body>
</html>`);
      return;
    }
    
    const targetReversePrx = process.env.REVERSE_PRX_TARGET;
    if (targetReversePrx) { await this.reverseWeb(req, res, targetReversePrx); } 
    else { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not Found'); }
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

  // ==================== WEBSOCKET HANDLERS (UNIVERSAL DIRECT FIXED) ====================
  async handleWebSocketConnection(ws, request) {
    // Mode Universal: Menerima path apapun untuk dilarikan langsung ke internet via server Railway
    console.log(`Universal WS accepted via path: ${url.parse(request.url).pathname}`);
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
    // Balik ke logic asli bawaan temen lu yang dijamin nembus lurus
    const connectAndWrite = (address, port) => new Promise((resolve, reject) => {
      const s = net.createConnection({ host: address, port }, () => { log(`connected to ${address}:${port}`); s.write(rawClientData); resolve(s); });
      s.on('error', reject);
    });
    try {
      const s = await connectAndWrite(addressRemote, portRemote);
      remoteSocket.value = s;
      s.on('close', () => webSocket.close());
      s.on('error', () => webSocket.close());
      this.remoteSocketToWS(s, webSocket, responseHeader, null, log); // <--- Parameter log dipasang pas
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

  // Balikkan fungsi core pembaca data asli bawaan temen lu tanpa modifikasi rusak
  remoteSocketToWS(remoteSocket, webSocket, responseHeader, retry, log) {
    let header = responseHeader, hasData = false;
    remoteSocket.on('data', (chunk) => {
      hasData = true;
      if (webSocket.readyState !== WebSocket.OPEN) { remoteSocket.destroy(); return; }
      if (header) { webSocket.send(Buffer.concat([Buffer.from(header), chunk])); header = null; }
      else webSocket.send(chunk);
    });
    remoteSocket.on('close', () => { if (!hasData && retry) retry(); });
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
