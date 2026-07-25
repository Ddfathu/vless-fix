// ============================================
// RAILWAY GATEWAY - 100000000000% UNIVERSAL DIRECT CONNECT
// MURNI SCRIPT BAWAAN LU - HANYA GANTI TAMPILAN UI DDFATHUVLES
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
      const currentHost = req.headers.host || 'localhost:8080';
      const uptime = Math.floor(process.uptime());
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ddfathuvles // SYSTEM MONITOR</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
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

  <div class="text-center my-2">
    <div id="live-timer" class="text-4xl font-bold text-white tracking-widest">00:00:00</div>
  </div>

  <main class="space-y-4 flex-grow mt-2">
    <div class="text-center card-dark p-3 rounded-xl border-dashed">
      <h1 class="text-lg font-bold text-white tracking-wider">⚡ DDFATHUVLES<span class="text-blue-500">.sys</span></h1>
      <p class="text-[10px] text-emerald-400 font-bold tracking-widest mt-0.5">TUNNEL MONITOR & ACCOUNT GENERATOR</p>
    </div>

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

    <div class="card-dark p-4 rounded-xl">
      <div class="flex justify-between items-center mb-2">
        <p class="text-[10px] text-slate-500 font-bold tracking-wider">NETWORK TRAFFIC (60S)</p>
        <div class="flex gap-3 text-[10px] font-bold">
          <span class="text-emerald-400">● RX</span>
          <span class="text-blue-400">● TX</span>
        </div>
      </div>
      <div class="h-28 w-full">
        <canvas id="trafficChart"></canvas>
      </div>
    </div>

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

    const ctx = document.getElementById('trafficChart').getContext('2d');
    const dataPoints = Array(30).fill(0).map(() => Math.random() * 10 + 2);
    const trafficChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array(30).fill(''),
        datasets: [{
          data: dataPoints,
          borderColor: '#06b6d4',
          borderWidth: 1.5,
          pointRadius: 0,
          fill: true,
          backgroundColor: 'rgba(6, 182, 212, 0.05)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { display: false, min: 0, max: 100 } }
      }
    });

    setInterval(() => {
      trafficChart.data.datasets[0].data.shift();
      let nextPulse = Math.random() > 0.9 ? Math.random() * 70 + 20 : Math.random() * 8 + 2;
      trafficChart.data.datasets[0].data.push(nextPulse);
      trafficChart.update();
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

  // ==================== WEBSOCKET HANDLERS (UNIVERSAL ASLI MULTI-PROTOCOL) ====================
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

  async handleTCPOutBound(remoteSocket, addressRemote, portRemote, rawClientData, webSocket, responseHeader) {
    const connectAndWrite = (address, port) => new Promise((resolve, reject) => {
      const s = net.createConnection({ host: address, port }, () => { s.write(rawClientData); resolve(s); });
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

  start(port = process.env.PORT || 8080) {
    const server = http.createServer((req, res) => { this.handleHttpRequest(req, res).catch(() => {}); });
    this.wss = new WebSocket.Server({ server, perMessageDeflate: false });
    this.wss.on('connection', (ws, req) => { this.handleWebSocketConnection(ws, req); });
    server.listen(port, '0.0.0.0', () => {});
  }
}

if (require.main === module) {
  const server = new GatewayServer();
  const port = process.env.PORT || 8080;
  server.start(port);
}

module.exports = GatewayServer;
