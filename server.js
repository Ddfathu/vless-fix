// ============================================
// RAILWAY GATEWAY UNIVERSAL DIRECT CONNECT
// UI Cyberpunk + VLESS/Trojan Generator + WebSocket + UDP
// TWEAKED FOR FULL SPEED & MAX PERFORMANCE - Node.js
// ============================================

const WebSocket = require('ws');
const net = require('net');
const dgram = require('dgram');
const fetch = require('node-fetch');
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
    this.isDirectRoute = true; 
  }

  // ==================== HTTP HANDLERS & UI GENERATOR ====================
  handleHealthCheck(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json', ...this.CORS_HEADER_OPTIONS });
    res.end(JSON.stringify({ status: 'healthy', uptime: process.uptime() }));
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
    .neon-border { border: 1px solid rgba(59, 130, 246, 0.3); }
  </style>
</head>
<body class="text-slate-300 min-h-screen flex flex-col justify-between p-6 selection:bg-blue-600 selection:text-white">

  <header class="border-b border-slate-900 pb-4 flex justify-between items-center max-w-7xl w-full mx-auto">
    <div>
      <h1 class="text-xl font-bold text-white">RAILWAY_GATEWAY<span class="text-blue-500">.sys</span></h1>
      <p class="text-xs text-slate-500">CORE TUNNEL UNLEASHED MODE</p>
    </div>
    <div class="text-xs font-semibold text-orange-400 bg-[#121420] px-4 py-2 rounded border border-orange-500/20">⚡ FULL SPEED TWEAKED</div>
  </header>

  <main class="max-w-7xl w-full mx-auto my-6 space-y-6 flex-grow">
    
    <!-- STATS -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-[#0d0e16] neon-border p-5 rounded-xl">
        <p class="text-xs text-slate-500 mb-1">SYSTEM UPTIME</p>
        <p id="uptime-val" class="text-lg font-bold text-white">${uptime}s</p>
      </div>
      <div class="bg-[#0d0e16] neon-border p-5 rounded-xl">
        <p class="text-xs text-slate-500 mb-1">RAM ALLOCATION</p>
        <p class="text-lg font-bold text-white">${ramUsed} MB</p>
      </div>
      <div class="bg-[#0d0e16] neon-border p-5 rounded-xl">
        <p class="text-xs text-slate-500 mb-1">TUNNEL STRATEGY</p>
        <p class="text-lg font-bold text-emerald-400">UNIVERSAL DIRECT + FULL SPEED</p>
      </div>
    </div>

    <!-- INFO BOX -->
    <div class="bg-[#0d0e16] border border-slate-900 rounded-xl p-6 space-y-1">
      <p class="text-xs text-slate-400">
        <span class="text-emerald-400 font-bold">INFO UNIVERSAL:</span> Kamu bebas mengisi kolom path di aplikasi VPN dengan nama atau kata apa saja, semuanya otomatis terkoneksi langsung via server Railway dengan optimasi throughput tanpa limit.
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
              <input id="uuidInput" type="text" value="853b8456-0c0b-4bfa-b3b4-b2619248a9bc" class="w-full bg-[#10121d] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none">
              <button id="randomUuidBtn" class="bg-blue-600/20 border border-blue-500/30 text-blue-400 px-3 py-2 rounded-lg text-xs font-bold">RANDOM</button>
            </div>
          </div>
          <div>
            <label class="text-xs text-slate-400 font-medium mb-1.5 block">Host / Domain</label>
            <input id="hostInput" type="text" value="${currentHost}" class="w-full bg-[#10121d] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none">
          </div>
          <div>
            <label class="text-xs text-slate-400 font-medium mb-1.5 block">Port</label>
            <input id="portInput" type="text" value="443" class="w-full bg-[#10121d] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none">
          </div>
          <div>
            <label class="text-xs text-slate-400 font-medium mb-1.5 block">Path (Bebas Isi Apa Saja)</label>
            <input id="pathInput" type="text" value="/DIREK" class="w-full bg-[#10121d] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none">
          </div>
          <div>
            <label class="text-xs text-slate-400 font-medium mb-1.5 block">SNI (Server Name Indication)</label>
            <input id="sniInput" type="text" value="business.whatsapp.com" class="w-full bg-[#10121d] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none">
          </div>
          <div>
            <label class="text-xs text-slate-400 font-medium mb-1.5 block">Nama / Remark</label>
            <input id="remarkInput" type="text" value="RAILWAY UNLEASHED DIRECT ⚡" class="w-full bg-[#10121d] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none">
          </div>
          <button id="generateBtn" class="w-full bg-gradient-to-r from-yellow-500 to-orange-600 text-black font-bold py-2.5 px-4 rounded-lg text-sm">GENERATE ACCOUNTS</button>
        </div>

        <!-- OUTPUT SECTION -->
        <div class="space-y-3">
          <label class="text-xs text-slate-400 font-medium block">📋 Hasil Generate Config</label>
          <div class="space-y-2">
            <div class="bg-[#07080e] rounded-lg p-4 border border-slate-950">
              <span class="text-[10px] text-purple-400 font-bold">VLESS</span>
              <p id="vlessOutput" class="text-xs text-purple-300 font-mono break-all bg-[#0a0b12] p-2 rounded border border-slate-900 mt-1">Loading...</p>
            </div>
            <div class="bg-[#07080e] rounded-lg p-4 border border-slate-950">
              <span class="text-[10px] text-orange-400 font-bold">TROJAN</span>
              <p id="trojanOutput" class="text-xs text-orange-300 font-mono break-all bg-[#0a0b12] p-2 rounded border border-slate-900 mt-1">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>

  <footer class="text-center text-xs text-slate-600 border-t border-slate-900 pt-4">&copy; 2026 RAILWAY GATEWAY.</footer>

  <script>
    let uptimeStart = ${uptime};
    setInterval(() => { uptimeStart++; document.getElementById('uptime-val').innerText = uptimeStart + 's'; }, 1000);

    function generateUUID() {
      const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
      document.getElementById('uuidInput').value = uuid; generateAccounts();
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
      const uuid = document.getElementById('uuidInput').value.trim();
      const host = document.getElementById('hostInput').value.trim();
      const port = document.getElementById('portInput').value.trim();
      const path = document.getElementById('pathInput').value.trim();
      const sni = document.getElementById('sniInput').value.trim();
      const remark = document.getElementById('remarkInput').value.trim();

      const ep = encodeURIComponent(path);
      const er = encodeURIComponent(remark);

      document.getElementById('vlessOutput').textContent = 'vless://' + uuid + '@' + host + ':' + port + '?encryption=none&security=tls&sni=' + sni + '&fp=randomized&type=ws&host=' + host + '&path=' + ep + '#' + er;
      document.getElementById('trojanOutput').textContent = 'trojan://' + generateTrojanPass() + '@' + host + ':' + port + '?security=tls&sni=' + sni + '&type=ws&host=' + host + '&path=' + ep + '#' + er;
    }

    document.getElementById('generateBtn').addEventListener('click', generateAccounts);
    document.getElementById('randomUuidBtn').addEventListener('click', generateUUID);
    setTimeout(generateAccounts, 300);
  </script>
</body>
</html>`);
      return;
    }
    
    const targetReversePrx = process.env.REVERSE_PRX_TARGET;
    if (targetReversePrx) { this.reverseWeb(req, res, targetReversePrx); } 
    else { res.writeHead(404); res.end('Not Found'); }
  }

  async reverseWeb(request, response, target) {
    try {
      const targetUrl = new URL(request.url);
      const targetChunk = target.split(":");
      targetUrl.hostname = targetChunk[0]; targetUrl.port = targetChunk[1] || "443";
      const options = {
        hostname: targetUrl.hostname, port: targetUrl.port,
        path: targetUrl.pathname + targetUrl.search, method: request.method,
        headers: { ...request.headers, host: targetUrl.hostname }
      };
      const proxyReq = https.request(options, (proxyRes) => {
        response.writeHead(proxyRes.statusCode, proxyRes.headers); proxyRes.pipe(response);
      });
      request.pipe(proxyReq);
    } catch (err) { response.writeHead(500); response.end(); }
  }

  // ==================== WEBSOCKET HANDLERS (UNIVERSAL ASLI) ====================
  async handleWebSocketConnection(ws, request) {
    await this.websocketHandler(ws);
  }

  async websocketHandler(ws) {
    let remoteSocketWrapper = { value: null };

    ws.on('message', async (message) => {
      try {
        const chunk = Buffer.from(message);
        if (remoteSocketWrapper.value) { remoteSocketWrapper.value.write(chunk); return; }

        const protocolHeader = this.readSsHeader(chunk);
        if (protocolHeader.hasError) throw new Error(protocolHeader.message);

        if (protocolHeader.isUDP) {
          return await this.handleUDPOutbound(protocolHeader.addressRemote, protocolHeader.portRemote, chunk.slice(protocolHeader.rawDataIndex), ws, protocolHeader.version);
        }

        this.handleTCPOutBound(remoteSocketWrapper, protocolHeader.addressRemote, protocolHeader.portRemote, protocolHeader.rawClientData, ws, protocolHeader.version);
      } catch (err) {
        ws.close(1011);
      }
    });

    ws.on('close', () => {
      if (remoteSocketWrapper.value) remoteSocketWrapper.value.end();
      this.cleanupUDPConnections(ws);
    });
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

  async handleTCPOutBound(remoteSocket, addressRemote, portRemote, rawClientData, webSocket, responseHeader) {
    // TWEAK 1: Menambahkan settingan buffer jumbo (highWaterMark) untuk speed maksimal
    const connectAndWrite = (address, port) => new Promise((resolve, reject) => {
      const s = net.createConnection({ 
        host: address, 
        port,
        highWaterMark: 1024 * 1024 // Alokasikan buffer data sebesar 1MB biar nampung data raksasa sekaligus
      }, () => { 
        // TWEAK 2: Matikan algoritma Nagle (NoDelay), paket internet lu langsung meluncur instan tanpa antrean!
        s.setNoDelay(true);
        s.write(rawClientData); 
        resolve(s); 
      });
      s.on('error', reject);
    });
    
    try {
      const s = await connectAndWrite(addressRemote, portRemote);
      remoteSocket.value = s;
      s.on('close', () => webSocket.close()); s.on('error', () => webSocket.close());
      this.remoteSocketToWS(s, webSocket, responseHeader, null);
    } catch (e) { webSocket.close(); }
  }

  async handleUDPOutbound(targetAddress, targetPort, dataChunk, webSocket, responseHeader) {
    return new Promise((resolve) => {
      try {
        let header = responseHeader;
        const key = `${targetAddress}:${targetPort}:${Date.now()}`;
        const sock = dgram.createSocket('udp4');
        this.activeUDPConnections.set(key, { socket: sock, webSocket });
        sock.on('error', () => { try{sock.close()}catch(_){} this.activeUDPConnections.set(key); });
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
    try {
      const at = buf[0]; let al = 0, avi = 1, av = "";
      if (at === 1) { al = 4; av = Array.from(buf.slice(avi, avi+al)).join("."); }
      else if (at === 3) { al = buf[avi]; avi += 1; av = buf.slice(avi, avi+al).toString(); }
      else if (at === 4) { al = 16; const ip = []; for(let i=0;i<8;i++) ip.push(buf.readUInt16BE(avi+i*2).toString(16)); av = ip.join(":"); }
      else { return { hasError: false, addressRemote: "127.0.0.1", portRemote: 80, rawDataIndex: 0, rawClientData: buf, version: null, isUDP: false }; }
      
      const pi = avi + al; const pr = buf.readUInt16BE(pi);
      return { hasError: false, addressRemote: av, portRemote: pr, rawDataIndex: pi+2, rawClientData: buf.slice(pi+2), version: null, isUDP: pr == 53 };
    } catch(e) {
      return { hasError: false, addressRemote: "127.0.0.1", portRemote: 80, rawDataIndex: 0, rawClientData: buf, version: null, isUDP: false };
    }
  }

  remoteSocketToWS(remoteSocket, webSocket, responseHeader, retry) {
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
    
    // TWEAK 3: Nonaktifkan perMessageDeflate (kompresi WS). 
    // Ini menghemat pemakaian CPU server Railway lu secara drastis saat download file gede, bikin traffic plong tanpa bottleneck!
    this.wss = new WebSocket.Server({ 
      server, 
      perMessageDeflate: false 
    });
    
    this.wss.on('connection', (ws, req) => { this.handleWebSocketConnection(ws, req); });
    server.listen(port, '0.0.0.0', () => {});
  }
}

if (require.main === module) {
  const server = new GatewayServer();
  const port = process.env.PORT || 3000;
  server.start(port);
}

module.exports = GatewayServer;
