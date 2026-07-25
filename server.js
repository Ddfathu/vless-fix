// ============================================
// RAILWAY GATEWAY - FULL COMPLETE (OPTION 3: WS FORWARDING)
// UI Cyberpunk + VLESS/Trojan Generator + WebSocket + UDP
// Ready to Deploy - Node.js
// ============================================

const WebSocket = require('ws');
const net = require('net');
const dgram = require('dgram');
const fetch = require('node-fetch');
const http = require('http');
const https = require('https');
const url = require('url');

// ==================== CUSTOM PROXY HARDCODE ====================
const CUSTOM_PROXY = {
  "SG-GL": ["34.143.159.175:443"],
  "ID-PUSAT": ["103.6.207.108:8080"],
  "SG-OVH": ["51.79.158.58:8443"],
  "SG-DO": ["178.128.80.43:443"],
  "SG-MELBI": ["91.192.81.154:2053"],
  "US-DO": ["167.172.234.12:443", "159.203.182.32:2053"],
  "SG-LINODE": ["139.162.41.196:443", "172.104.188.34:2083"],
  "JP-AWS": ["18.179.45.123:443", "52.194.12.34:8443"],
  "SG-GCP": ["35.197.120.15:443", "34.87.112.45:8080"],
  "G-SG": ["178.128.80.43:443", "91.192.81.154:2053", "51.79.158.58:8443", "34.143.159.175:443"],
  "G-US": ["167.172.234.12:443", "159.203.182.32:2053", "45.79.120.99:8080"],
  "G-JP": ["18.179.45.123:443", "52.194.12.34:8443", "54.95.120.33:2053"],
  "G-PREMIUM": ["178.128.80.43:443", "91.192.81.154:2053", "18.179.45.123:443", "167.172.234.12:443"],
  "G-STREAMING": ["51.79.158.58:8443", "34.143.159.175:443", "139.162.41.196:443"],
  "G-ID": ["103.253.146.10:443", "45.32.100.100:8443", "149.28.200.50:443"]
};

// Constants
const horse = Buffer.from("dHJvamFu", 'base64').toString(); 
const flash = Buffer.from("dm1lc3M=", 'base64').toString(); 
const v2 = Buffer.from("djJyYXk=", 'base64').toString(); 
const neko = Buffer.from("Y2xhc2g=", 'base64').toString(); 

const KV_PRX_URL = "https://raw.githubusercontent.com/backup-heavenly-demons/gateway/refs/heads/main/kvProxyList.json";
const DNS_SERVER_ADDRESS = "8.8.8.8";
const DNS_SERVER_PORT = 53;
const WS_READY_STATE_OPEN = 1;
const WS_READY_STATE_CLOSING = 2;
const CORS_HEADER_OPTIONS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const REGION_MAP = {
  ASIA: ["ID", "SG", "MY", "PH", "TH", "VN", "JP", "KR", "CN", "HK", "TW"],
  SOUTHASIA: ["IN", "BD", "PK", "LK", "NP", "AF", "BT", "MV"],
  GLOBAL: []
};

class GatewayServer {
  constructor() {
    this.prxIP = "";
    this.cachedPrxList = [];
    this.wss = null;
    this.httpServer = null;
    this.activeUDPConnections = new Map();
    this.CORS_HEADER_OPTIONS = CORS_HEADER_OPTIONS;
    this.isDirectRoute = false;
    this.currentWsIncomingReq = null; // Menyimpan info request WS asal
  }

  // ==================== HTTP HANDLERS & UI ====================
  handleHealthCheck(req, res) {
    const healthData = { status: 'healthy', uptime: process.uptime() };
    res.writeHead(200, { 'Content-Type': 'application/json', ...this.CORS_HEADER_OPTIONS });
    res.end(JSON.stringify(healthData, null, 2));
  }

  handleCorsPreflight(req, res) { res.writeHead(200, this.CORS_HEADER_OPTIONS); res.end(); }

  async handleApiRequest(req, res, parsedUrl) {
    try {
      if (parsedUrl.pathname === '/api/proxies') {
        const proxies = await this.getPrxList(process.env.PRX_BANK_URL);
        const format = parsedUrl.query.format || 'json';
        if (format === 'text') {
          const proxyText = proxies.map(p => `${p.country} - ${p.prxIP}:${p.prxPort}`).join('\n');
          res.writeHead(200, { 'Content-Type': 'text/plain', ...this.CORS_HEADER_OPTIONS });
          res.end(proxyText); return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json', ...this.CORS_HEADER_OPTIONS });
        res.end(JSON.stringify(proxies, null, 2)); return;
      }
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  async handleHttpRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    if (req.method === 'OPTIONS') { this.handleCorsPreflight(req, res); return; }
    if (parsedUrl.pathname === '/health') { this.handleHealthCheck(req, res); return; }
    if (parsedUrl.pathname.startsWith('/api/')) { await this.handleApiRequest(req, res, parsedUrl); return; }
    
    if (parsedUrl.pathname === '/') {
      const currentHost = req.headers.host || 'localhost:3000';
      const protocolWs = req.headers['x-forwarded-proto'] === 'https' ? 'wss' : 'ws';
      const uptime = Math.floor(process.uptime());
      const ramUsed = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>RAILWAY GATEWAY // DASHBOARD</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    body { font-family: monospace; background-color: #0a0b10; color: #cbd5e1; }
    .neon-border { border: 1px solid rgba(59, 130, 246, 0.3); }
  </style>
</head>
<body class="p-6">
  <div class="max-w-7xl mx-auto space-y-6">
    <h2 class="text-xl font-bold text-white">RAILWAY GATEWAY // WEBSOCKET FORWARDER ACTIVE</h2>
    <div class="bg-[#0d0e16] neon-border p-6 rounded-xl">
      <p>Mode DIREK: <span class="text-red-400">${protocolWs}://${currentHost}/DIREK</span></p>
      <p>Mode PROXY WORKER: <span class="text-purple-400">${protocolWs}://${currentHost}/G-SG</span></p>
      <p>RAM Allocation: ${ramUsed} MB | Uptime: ${uptime}s</p>
    </div>
  </div>
</body>
</html>`);
      return;
    }
    
    const targetReversePrx = process.env.REVERSE_PRX_TARGET;
    if (targetReversePrx) { await this.reverseWeb(req, res, targetReversePrx); } 
    else { res.writeHead(404); res.end('Not Found'); }
  }

  async getKVPrxList(kvPrxUrl = KV_PRX_URL) {
    if (!kvPrxUrl) throw new Error("No URL Provided!");
    try {
      const kvPrx = await fetch(kvPrxUrl);
      if (kvPrx.status == 200) return await kvPrx.json();
      return {};
    } catch (error) { return {}; }
  }

  async getPrxList(prxBankUrl) {
    if (!prxBankUrl) return [];
    try {
      const response = await fetch(prxBankUrl);
      if (response.status === 200) {
        const data = await response.json();
        if (!Array.isArray(data)) return [];
        return data.map(proxy => {
          const ip = proxy.prxIP || proxy.ip || proxy.server;
          const port = proxy.prxPort || proxy.port;
          const country = proxy.country || proxy.cc || 'XX';
          if (!ip || !port) return null;
          return { prxIP: ip, prxPort: port, country: country.toUpperCase() };
        }).filter(Boolean);
      }
      return [];
    } catch (error) { return []; }
  }

  async reverseWeb(request, response, target, targetPath) {
    try {
      const targetUrl = new URL(request.url);
      const targetChunk = target.split(":");
      targetUrl.hostname = targetChunk[0];
      targetUrl.port = targetChunk[1]?.toString() || "443";
      targetUrl.pathname = targetPath || targetUrl.pathname;
      const options = {
        hostname: targetUrl.hostname, port: targetUrl.port,
        path: targetUrl.pathname + targetUrl.search, method: request.method,
        headers: { ...request.headers, host: targetUrl.hostname }
      };
      const proxyReq = (targetUrl.protocol === 'https:' ? https : http).request(options, (proxyRes) => {
        response.writeHead(proxyRes.statusCode, proxyRes.headers); proxyRes.pipe(response);
      });
      request.pipe(proxyReq);
    } catch (err) { response.writeHead(500); response.end(); }
  }

  // ==================== WEBSOCKET HANDLERS ====================

  async handleWebSocketConnection(ws, request) {
    try {
      const parsedUrl = url.parse(request.url, true);
      const path = parsedUrl.pathname;
      console.log(`WebSocket request path: ${path}`);

      this.isDirectRoute = false;
      this.currentWsIncomingReq = request; // Simpan info request incoming

      if (path.toUpperCase() === '/DIREK') {
        this.isDirectRoute = true;
        this.prxIP = "";
        await this.websocketHandler(ws); return;
      }

      const customMatch = path.match(/^\/([A-Z0-9]{2,3}-[A-Za-z0-9_]+)$/i);
      if (customMatch) {
        const customKey = customMatch[1].toUpperCase();
        if (CUSTOM_PROXY[customKey] && CUSTOM_PROXY[customKey].length > 0) {
          const list = CUSTOM_PROXY[customKey];
          this.prxIP = list[Math.floor(Math.random() * list.length)];
          await this.websocketHandler(ws); return;
        }
      }

      const proxies = await this.getPrxList(process.env.PRX_BANK_URL);
      if (proxies.length === 0) {
        const kvPrx = await this.getKVPrxList();
        const countryCode = path.replace("/", "").toUpperCase();
        if (kvPrx[countryCode] && kvPrx[countryCode].length > 0) {
          this.prxIP = kvPrx[countryCode][Math.floor(Math.random() * kvPrx[countryCode].length)];
        } else {
          const allProxies = Object.values(kvPrx).flat();
          this.prxIP = allProxies.length > 0 ? allProxies[Math.floor(Math.random() * allProxies.length)] : "";
        }
      } else {
        const countryCode = path.replace("/", "").toUpperCase();
        const filtered = proxies.filter(p => p.country === countryCode);
        this.prxIP = filtered.length > 0 ? `${filtered[0].prxIP}:${filtered[0].prxPort}` : `${proxies[0].prxIP}:${proxies[0].prxPort}`;
      }

      await this.websocketHandler(ws);
    } catch (err) { ws.close(1011); }
  }

  async websocketHandler(ws) {
    let addressLog = "", portLog = "";
    const log = (info, event) => console.log(`[${addressLog}:${portLog}] ${info}`, event || "");
    let remoteSocketWrapper = { value: null };

    ws.on('message', async (message) => {
      try {
        const chunk = Buffer.from(message);
        
        // JIKA CLIENT SUDAH TERHUBUNG KE OUTBOUND: Teruskan data langsung
        if (remoteSocketWrapper.value) {
          if (remoteSocketWrapper.value instanceof WebSocket) {
            if (remoteSocketWrapper.value.readyState === WebSocket.OPEN) {
              remoteSocketWrapper.value.send(chunk);
            }
          } else {
            remoteSocketWrapper.value.write(chunk);
          }
          return;
        }

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
      if (remoteSocketWrapper.value) {
        if (remoteSocketWrapper.value instanceof WebSocket) remoteSocketWrapper.value.close();
        else remoteSocketWrapper.value.end();
      }
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

  // ==================== ENGINE BARU LUAR BIASA (SISTEM OPERSAN WEBSOCKET HTTP) ====================
  async handleTCPOutBound(remoteSocket, addressRemote, portRemote, rawClientData, webSocket, responseHeader, log) {
    
    // JIKA PATH /DIREK AKTIF: Pakai modul TCP mentah bawaan asli temen lu
    if (this.isDirectRoute || !this.prxIP) {
      const connectAndWrite = (address, port) => new Promise((resolve, reject) => {
        const s = net.createConnection({ host: address, port }, () => { log(`connected to ${address}:${port}`); s.write(rawClientData); resolve(s); });
        s.on('error', reject);
      });
      try {
        const s = await connectAndWrite(addressRemote, portRemote);
        remoteSocket.value = s;
        s.on('close', () => webSocket.close()); s.on('error', () => webSocket.close());
        this.remoteSocketToWS(s, webSocket, responseHeader, null, log);
      } catch (e) { webSocket.close(); }
      return;
    }

    // JIKA MODE PROXY AKTIF: Ubah Railway menjadi Klien WebSocket untuk nembak HTTP Worker luar!
    try {
      const [proxyHost, proxyPort] = this.prxIP.split(/[:=-]/);
      const isPortTls = proxyPort == "443" || proxyPort == "8443" || proxyPort == "2053";
      const targetWsUrl = `${isPortTls ? 'wss' : 'ws'}://${proxyHost}:${proxyPort}${this.currentWsIncomingReq.url}`;
      
      log(`Option 3 Active: Dialing WebSocket Client to Worker -> ${targetWsUrl}`);

      // Ambil seluruh header jabat tangan WebSocket asli dari DarkTunnel agar lolos Cloudflare
      const forwardHeaders = { ...this.currentWsIncomingReq.headers };
      delete forwardHeaders.host;
      delete forwardHeaders.connection;
      delete forwardHeaders.upgrade;

      const outboundWs = new WebSocket(targetWsUrl, {
        headers: forwardHeaders,
        rejectUnauthorized: false
      });

      remoteSocket.value = outboundWs;

      outboundWs.on('open', () => {
        log(`WebSocket Handshake to target Worker SUCCESS!`);
        // Kirim raw payload pertama dari DarkTunnel setelah jabat tangan di seberang sukses
        outboundWs.send(rawClientData);
      });

      outboundWs.on('message', (data) => {
        if (webSocket.readyState === WebSocket.OPEN) {
          // Oper balik semua data web/streaming dari Worker luar ke aplikasi DarkTunnel
          webSocket.send(Buffer.from(data));
        }
      });

      outboundWs.on('close', () => webSocket.close());
      outboundWs.on('error', (err) => {
        log(`Outbound Worker WebSocket Error: ${err.message}`);
        webSocket.close();
      });

    } catch (error) {
      log(`Option 3 Failed to create client: ${error.message}`);
      webSocket.close();
    }
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
