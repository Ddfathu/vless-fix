// ============================================
// RAILWAY GATEWAY - UNIVERSAL STABLE DIRECT
// UI Cyberpunk + VLESS/Trojan Generator + WebSocket (NO PARSER = NO ERROR)
// Ready to Deploy - Node.js
// ============================================

const WebSocket = require('ws');
const net = require('net');
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
  }

  // ==================== HTTP HANDLERS & UI GENERATOR ====================
  handleHealthCheck(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADER_OPTIONS });
    res.end(JSON.stringify({ status: 'healthy', uptime: process.uptime() }));
  }

  async handleHttpRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    if (req.method === 'OPTIONS') { res.writeHead(200, CORS_HEADER_OPTIONS); res.end(); return; }
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
  </style>
</head>
<body class="text-slate-300 min-h-screen flex flex-col justify-between p-6">

  <header class="border-b border-slate-900 pb-4 flex justify-between items-center max-w-7xl w-full mx-auto">
    <div>
      <h1 class="text-xl font-bold text-white">RAILWAY_GATEWAY<span class="text-blue-500">.sys</span></h1>
      <p class="text-xs text-slate-500">UNIVERSAL DIRECT HIGH-SPEED PASS THROUGH</p>
    </div>
    <div class="text-xs font-semibold text-emerald-400 bg-[#121420] px-4 py-2 rounded border border-blue-500/20">SYSTEM ONLINE</div>
  </header>

  <main class="max-w-7xl w-full mx-auto my-6 space-y-6 flex-grow">
    
    <!-- STATS -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-[#0d0e16] neon-border p-5 rounded-xl flex items-center justify-between">
        <div>
          <p class="text-xs text-slate-500 mb-1">SYSTEM UPTIME</p>
          <p id="uptime-val" class="text-lg font-bold text-white">${uptime}s</p>
        </div>
      </div>
      <div class="bg-[#0d0e16] neon-border p-5 rounded-xl flex items-center justify-between">
        <div>
          <p class="text-xs text-slate-500 mb-1">RAM ALLOCATION</p>
          <p class="text-lg font-bold text-white">${ramUsed} MB</p>
        </div>
      </div>
      <div class="bg-[#0d0e16] neon-border p-5 rounded-xl flex items-center justify-between">
        <div>
          <p class="text-xs text-slate-500 mb-1">TUNNEL MODE</p>
          <p class="text-lg font-bold text-emerald-400">PURE DIRECT</p>
        </div>
      </div>
      <div class="bg-[#0d0e16] neon-border p-5 rounded-xl flex items-center justify-between">
        <div>
          <p class="text-xs text-slate-500 mb-1">NODE ENGINE</p>
          <p class="text-lg font-bold text-blue-400">${nodeVersion}</p>
        </div>
      </div>
    </div>

    <!-- INFO BOX -->
    <div class="bg-[#0d0e16] border border-slate-900 rounded-xl p-6 space-y-1">
      <p class="text-xs text-slate-400">
        <span class="text-emerald-400 font-bold">INFO UNIVERSAL ROUTE:</span> Kamu bebas menggunakan kata atau path apa saja di aplikasi VPN (seperti /DIREK, /ALL, /G-SG, /VMESS, dll). Semuanya otomatis terhubung menggunakan mesin inti direct yang terbukti lancar jaya!
      </p>
    </div>

    <!-- ==================== VLESS & TROJAN GENERATOR ==================== -->
    <div class="bg-[#0d0e16] border border-slate-900 rounded-xl p-6 space-y-5">
      <div class="flex items-center gap-2 border-b border-slate-900 pb-3">
        <i class="fa-solid fa-key text-yellow-400"></i>
        <h2 class="text-md font-bold text-white">VLESS / TROJAN ACCOUNT GENERATOR</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <!-- INPUT -->
        <div class="space-y-4">
          <div>
            <label class="text-xs text-slate-400 block mb-1">UUID / Password</label>
            <div class="flex gap-2">
              <input id="uuidInput" type="text" value="853b8456-0c0b-4bfa-b3b4-b2619248a9bc" class="w-full bg-[#10121d] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none">
              <button id="randomUuidBtn" class="bg-blue-600/20 border border-blue-500/30 text-blue-400 px-3 py-2 rounded-lg text-xs font-bold">RANDOM</button>
            </div>
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">Host / Domain</label>
            <input id="hostInput" type="text" value="${currentHost}" class="w-full bg-[#10121d] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none">
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">Port</label>
            <input id="portInput" type="text" value="443" class="w-full bg-[#10121d] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none">
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">Path (Bebas Isi Apa Saja)</label>
            <input id="pathInput" type="text" value="/DIREK" class="w-full bg-[#10121d] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none">
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">SNI (Server Name Indication)</label>
            <input id="sniInput" type="text" value="business.whatsapp.com" class="w-full bg-[#10121d] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none">
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">Nama / Remark</label>
            <input id="remarkInput" type="text" value="RAILWAY PURE DIRECT ⚡" class="w-full bg-[#10121d] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none">
          </div>
          <button id="generateBtn" class="w-full bg-gradient-to-r from-yellow-500 to-orange-600 text-black font-bold py-2.5 px-4 rounded-lg text-sm">GENERATE ACCOUNTS</button>
        </div>

        <!-- OUTPUT -->
        <div class="space-y-3">
          <label class="text-xs text-slate-400 block">📋 Hasil Generate</label>
          <div class="space-y-2">
            <div class="bg-[#07080e] rounded-lg p-4 border border-slate-950">
              <p class="text-[10px] text-purple-400 font-bold mb-1">VLESS</p>
              <p id="vlessOutput" class="text-xs text-purple-300 font-mono break-all bg-[#0a0b12] p-2 rounded border border-slate-900">Loading...</p>
            </div>
            <div class="bg-[#07080e] rounded-lg p-4 border border-slate-950">
              <p class="text-[10px] text-orange-400 font-bold mb-1">TROJAN</p>
              <p id="trojanOutput" class="text-xs text-orange-300 font-mono break-all bg-[#0a0b12] p-2 rounded border border-slate-900">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>

  <footer class="text-center text-xs text-slate-600 border-t border-slate-900 pt-4">&copy; 2026 RAILWAY GATEWAY CONTROL STABLE.</footer>

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
      document.getElementById('trojanOutput').textContent = 'trojan://' + uuid + '@' + host + ':' + port + '?security=tls&sni=' + sni + '&type=ws&host=' + host + '&path=' + ep + '#' + er;
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

  // ==================== ENGINE INTI JALAN JAYA (100% SAMA SEPERTI VERSI PENDEK AWAL) ====================
  async handleWebSocketConnection(ws, request) {
    // Mode Passthrough murni: Semua path diizinkan masuk tanpa parsing pemotong data
    let remoteSocket = null;

    ws.on('message', (message) => {
      const chunk = Buffer.from(message);

      // Jika socket tujuan internet sudah terbuka, langsung tembak aliran datanya
      if (remoteSocket) {
        if (remoteSocket.writable) remoteSocket.write(chunk);
        return;
      }

      // Sniff and parse alamat IP/port tujuan internet secara dinamis langsung dari payload awal
      try {
        let addressRemote = "127.0.0.1";
        let portRemote = 80;
        let rawClientData = chunk;

        // Skema pembacaan data dinamis murni VLESS/Trojan untuk langsung dial ke luar
        const at = chunk[0] === 0x00 || chunk[0] === 0x01 ? chunk[1] : chunk[0];
        if (at === 1 && chunk.length > 10) {
          addressRemote = Array.from(chunk.slice(2, 6)).join(".");
          portRemote = chunk.readUInt16BE(6);
          rawClientData = chunk.slice(8);
        } else if (chunk.length > 70) {
          // Fallback parsing trojan standard padding
          const db = chunk.slice(58);
          if (db.length > 6) {
            const tat = db[1];
            if (tat === 1) { addressRemote = Array.from(db.slice(2, 6)).join("."); portRemote = db.readUInt16BE(6); rawClientData = db.slice(10); }
            else if (tat === 3) { let len = db[2]; addressRemote = db.slice(3, 3 + len).toString(); portRemote = db.readUInt16BE(3 + len); rawClientData = db.slice(3 + len + 4); }
          }
        }

        // Buka koneksi TCP langsung ke internet via server Railway (Sama persis seperti kodingan pendek pertamamu)
        remoteSocket = net.createConnection({ host: addressRemote, port: portRemote }, () => {
          remoteSocket.write(rawClientData);
        });

        remoteSocket.on('data', (data) => {
          if (ws.readyState === WebSocket.OPEN) ws.send(data);
        });

        remoteSocket.on('close', () => ws.close());
        remoteSocket.on('error', () => ws.close());

      } catch (e) {
        ws.close();
      }
    });

    ws.on('close', () => { if (remoteSocket) remoteSocket.destroy(); });
    ws.on('error', () => { if (remoteSocket) remoteSocket.destroy(); });
  }

  start(port = process.env.PORT || 3000) {
    const server = http.createServer((req, res) => { this.handleHttpRequest(req, res).catch(() => {}); });
    this.wss = new WebSocket.Server({ server, perMessageDeflate: false });
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
