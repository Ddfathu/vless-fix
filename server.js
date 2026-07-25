// ============================================
// RAILWAY GATEWAY - FULL COMPLETE (FIXED VLESS CORE)
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
const horse = Buffer.from("dHJvamFu", 'base64').toString(); // "trojan"
const flash = Buffer.from("dm1lc3M=", 'base64').toString(); // "vmess"
const v2 = Buffer.from("djJyYXk=", 'base64').toString(); // "v2ray"
const neko = Buffer.from("Y2xhc2g=", 'base64').toString(); // "clash"

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

// Region Mapping
const REGION_MAP = {
  ASIA: ["ID", "SG", "MY", "PH", "TH", "VN", "JP", "KR", "CN", "HK", "TW"],
  SOUTHASIA: ["IN", "BD", "PK", "LK", "NP", "AF", "BT", "MV"],
  CENTRALASIA: ["KZ", "UZ", "TM", "KG", "TJ"],
  NORTHASIA: ["RU"],
  MIDDLEEAST: ["AE", "SA", "IR", "IQ", "JO", "IL", "YE", "SY", "OM", "KW", "QA", "BH", "LB"],
  CIS: ["RU", "UA", "BY", "KZ", "UZ", "AM", "GE", "MD", "TJ", "KG", "TM", "AZ"],
  WESTEUROPE: ["FR", "DE", "NL", "BE", "AT", "CH", "IE", "LU", "MC"],
  EASTEUROPE: ["PL", "CZ", "SK", "HU", "RO", "BG", "MD", "UA", "BY"],
  NORTHEUROPE: ["SE", "FI", "NO", "DK", "EE", "LV", "LT", "IS"],
  SOUTHEUROPE: ["IT", "ES", "PT", "GR", "HR", "SI", "MT", "AL", "BA", "RS", "ME", "MK"],
  EUROPE: ["FR", "DE", "NL", "BE", "AT", "CH", "IE", "LU", "MC", "PL", "CZ", "SK", "HU", "RO", "BG", "MD", "UA", "BY", "SE", "FI", "NO", "DK", "EE", "LV", "LT", "IS", "IT", "ES", "PT", "GR", "HR", "SI", "MT", "AL", "BA", "RS", "ME", "MK"],
  AFRICA: ["ZA", "NG", "EG", "MA", "KE", "DZ", "TN", "GH", "CI", "SN", "ET"],
  NORTHAMERICA: ["US", "CA", "MX"],
  SOUTHAMERICA: ["BR", "AR", "CL", "CO", "PE", "VE", "EC", "UY", "PY", "BO"],
  LATAM: ["MX", "BR", "AR", "CL", "CO", "PE", "VE", "EC", "UY", "PY", "BO", "CR", "GT", "PA", "DO", "HN", "NI", "SV"],
  AMERICA: ["US", "CA", "MX", "BR", "AR", "CL", "CO", "PE", "VE", "EC"],
  OCEANIA: ["AU", "NZ", "PG", "FJ"],
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
  }

  // ==================== HTTP HANDLERS ====================

  handleHealthCheck(req, res) {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'railway-gateway',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
      features: { websocket: true, tcp: true, udp: true, protocols: ['trojan', 'vmess', 'ss'] }
    };
    res.writeHead(200, { 'Content-Type': 'application/json', ...this.CORS_HEADER_OPTIONS });
    res.end(JSON.stringify(healthData, null, 2));
  }

  handleCorsPreflight(req, res) {
    res.writeHead(200, this.CORS_HEADER_OPTIONS);
    res.end();
  }

  async handleApiRequest(req, res, parsedUrl) {
    try {
      if (parsedUrl.pathname === '/api/proxies') {
        const proxies = await this.getPrxList(process.env.PRX_BANK_URL);
        const format = parsedUrl.query.format || 'json';
        if (format === 'text') {
          const proxyText = proxies.map(p => `${p.country} - ${p.prxIP}:${p.prxPort}`).join('\n');
          res.writeHead(200, { 'Content-Type': 'text/plain', ...this.CORS_HEADER_OPTIONS });
          res.end(proxyText);
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json', ...this.CORS_HEADER_OPTIONS });
        res.end(JSON.stringify(proxies, null, 2));
        return;
      }
    } catch (error) {
      console.error('API error:', error);
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
      const protocolHttp = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const uptime = Math.floor(process.uptime());
      const ramUsed = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      const nodeVersion = process.version;
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>RAILWAY GATEWAY // DASHBOARD</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap');
    body { font-family: 'JetBrains Mono', monospace; background-color: #0a0b10; }
    .neon-border { border: 1px solid rgba(59, 130, 246, 0.3); }
    .neon-border:hover { border-color: rgba(59, 130, 246, 0.8); }
  </style>
</head>
<body class="text-slate-300 min-h-screen flex flex-col justify-between p-6">
  <header class="max-w-7xl w-full mx-auto flex justify-between items-center border-b border-slate-900 pb-4">
    <div>
      <h1 class="text-xl font-bold text-white">RAILWAY_GATEWAY<span class="text-blue-500">.sys</span></h1>
      <p class="text-xs text-slate-500">VLESS / TROJAN TUNNEL ACTIVE</p>
    </div>
    <div class="text-emerald-400 text-xs font-bold bg-[#121420] px-4 py-2 rounded border border-blue-500/20">SYSTEM ONLINE</div>
  </header>
  <main class="max-w-7xl w-full mx-auto my-6 space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-[#0d0e16] neon-border p-6 rounded-xl space-y-2">
        <h3 class="text-white font-bold">TUNNEL PATHS</h3>
        <p class="text-xs text-slate-400">Direct Route: <span class="text-red-400">${protocolWs}://${currentHost}/DIREK</span></p>
        <p class="text-xs text-slate-400">Global Cluster: <span class="text-blue-400">${protocolWs}://${currentHost}/ALL</span></p>
        <p class="text-xs text-slate-400">Singapore Group: <span class="text-purple-400">${protocolWs}://${currentHost}/G-SG</span></p>
      </div>
      <div class="bg-[#0d0e16] neon-border p-6 rounded-xl space-y-2">
        <h3 class="text-white font-bold">RESOURCES</h3>
        <p class="text-xs text-slate-400">Uptime: ${uptime}s | RAM Allocation: ${ramUsed} MB</p>
        <p class="text-xs text-slate-400">Node Engine: ${nodeVersion}</p>
      </div>
    </div>
  </main>
  <footer class="text-center text-xs text-slate-600 border-t border-slate-900 pt-4">&copy; 2026 RAILWAY GATEWAY TERMINAL.</footer>
</body>
</html>`);
      return;
    }

    const targetReversePrx = process.env.REVERSE_PRX_TARGET;
    if (targetReversePrx) {
      await this.reverseWeb(req, res, targetReversePrx);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  }

  // ==================== PROXY LIST MANAGEMENT ====================

  async getKVPrxList(kvPrxUrl = KV_PRX_URL) {
    if (!kvPrxUrl) return {};
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
        headers: { ...request.headers }
      };
      options.headers['host'] = targetUrl.hostname;
      options.headers['x-forwarded-host'] = request.headers.host;

      const proxyReq = (targetUrl.protocol === 'https:' ? https : http).request(options, (proxyRes) => {
        response.writeHead(proxyRes.statusCode, {
          ...Object.fromEntries(Object.entries(this.CORS_HEADER_OPTIONS)),
          ...Object.fromEntries(Object.entries(proxyRes.headers)),
          'x-proxied-by': 'Railway Gateway'
        });
        proxyRes.pipe(response);
      });

      proxyReq.on('error', () => { response.writeHead(500); response.end('Proxy error'); });
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        let body = [];
        request.on('data', (chunk) => body.push(chunk)).on('end', () => {
          proxyReq.write(Buffer.concat(body)); proxyReq.end();
        });
      } else { proxyReq.end(); }
    } catch (err) { response.writeHead(500); response.end('Internal server error'); }
  }

  // ==================== WEBSOCKET HANDLERS ====================

  async handleWebSocketConnection(ws, request) {
    try {
      const parsedUrl = url.parse(request.url, true);
      const path = parsedUrl.pathname;
      console.log(`WebSocket request path: ${path}`);
      
      this.isDirectRoute = false;

      if (path.toUpperCase() === '/DIREK') {
        this.isDirectRoute = true;
        this.prxIP = "";
        console.log(`[ROUTE-MODE] Active -> RAILWAY DIRECT IP`);
        await this.websocketHandler(ws);
        return;
      }

      const customMatch = path.match(/^\/([A-Z0-9]{2,3}-[A-Za-z0-9_]+)$/i);
      if (customMatch) {
        const customKey = customMatch[1].toUpperCase();
        if (CUSTOM_PROXY[customKey] && CUSTOM_PROXY[customKey].length > 0) {
          const list = CUSTOM_PROXY[customKey];
          this.prxIP = list[Math.floor(Math.random() * list.length)];
          console.log(`[HARDCODE PROXY] Selected Key: ${customKey} -> ${this.prxIP}`);
          await this.websocketHandler(ws);
          return;
        }
      }

      const proxyListMatch = path.match(/^\/PROXYLIST\/([A-Z]{2}(,[A-Z]{2})*)$/i);
      if (proxyListMatch) {
        const countryCodes = proxyListMatch[1].toUpperCase().split(",");
        const proxies = await this.getPrxList(process.env.PRX_BANK_URL);
        if (proxies.length === 0) {
          const kvPrx = await this.getKVPrxList();
          const availableCountries = countryCodes.filter(code => kvPrx[code] && kvPrx[code].length > 0);
          if (availableCountries.length === 0) { ws.close(1000, `No proxies`); return; }
          const prxKey = availableCountries[Math.floor(Math.random() * availableCountries.length)];
          this.prxIP = kvPrx[prxKey][Math.floor(Math.random() * kvPrx[prxKey].length)];
        } else {
          const filteredProxies = proxies.filter(p => countryCodes.includes(p.country));
          if (filteredProxies.length === 0) { ws.close(1000, `No proxies`); return; }
          const randomProxy = filteredProxies[Math.floor(Math.random() * filteredProxies.length)];
          this.prxIP = `${randomProxy.prxIP}:${randomProxy.prxPort}`;
        }
        await this.websocketHandler(ws);
        return;
      }

      const allMatch = path.match(/^\/ALL(\d+)?$/i);
      if (allMatch) {
        const index = allMatch[1] ? parseInt(allMatch[1], 10) - 1 : null;
        const proxies = await this.getPrxList(process.env.PRX_BANK_URL);
        if (proxies.length === 0) {
          const kvPrx = await this.getKVPrxList();
          const allProxies = Object.values(kvPrx).flat();
          if (allProxies.length === 0) { ws.close(1000, `No proxies`); return; }
          this.prxIP = allProxies[Math.floor(Math.random() * allProxies.length)];
        } else {
          let selectedProxy;
          if (index === null) { selectedProxy = proxies[Math.floor(Math.random() * proxies.length)]; }
          else {
            const grouped = proxies.reduce((acc, p) => { if(!acc[p.country])acc[p.country]=[]; acc[p.country].push(p); return acc; }, {});
            const byIndex = []; for(const c in grouped) { if(index < grouped[c].length) byIndex.push(grouped[c][index]); }
            if(byIndex.length === 0) { ws.close(1000, `No proxy`); return; }
            selectedProxy = byIndex[Math.floor(Math.random() * byIndex.length)];
          }
          this.prxIP = `${selectedProxy.prxIP}:${selectedProxy.prxPort}`;
        }
        await this.websocketHandler(ws);
        return;
      }

      const putarMatch = path.match(/^\/PUTAR(\d+)?$/i);
      if (putarMatch) {
        const countryCount = putarMatch[1] ? parseInt(putarMatch[1], 10) : null;
        const proxies = await this.getPrxList(process.env.PRX_BANK_URL);
        if (proxies.length === 0) {
          const kvPrx = await this.getKVPrxList();
          const countries = Object.keys(kvPrx).filter(c => kvPrx[c]?.length > 0);
          if (countries.length === 0) { ws.close(1000, `No proxies`); return; }
          const shuffled = [...countries].sort(() => Math.random() - 0.5);
          const selected = countryCount ? shuffled.slice(0, Math.min(countryCount, countries.length)) : shuffled;
          const prxKey = selected[Math.floor(Math.random() * selected.length)];
          this.prxIP = kvPrx[prxKey][Math.floor(Math.random() * kvPrx[prxKey].length)];
        } else {
          const grouped = proxies.reduce((acc, p) => { if(!acc[p.country])acc[p.country]=[]; acc[p.country].push(p); return acc; }, {});
          const countries = Object.keys(grouped);
          if (countries.length === 0) { ws.close(1000, `No proxies`); return; }
          const shuffled = [...countries].sort(() => Math.random() - 0.5);
          const selected = countryCount ? shuffled.slice(0, Math.min(countryCount, countries.length)) : shuffled;
          const selProxies = selected.map(c => grouped[c][Math.floor(Math.random() * grouped[c].length)]);
          const randomProxy = selProxies[Math.floor(Math.random() * selProxies.length)];
          this.prxIP = `${randomProxy.prxIP}:${randomProxy.prxPort}`;
        }
        await this.websocketHandler(ws);
        return;
      }

      const regionMatch = path.match(/^\/([A-Z]+)(\d+)?$/i);
      if (regionMatch && REGION_MAP[regionMatch[1].toUpperCase()]) {
        const regionKey = regionMatch[1].toUpperCase();
        const index = regionMatch[2] ? parseInt(regionMatch[2], 10) - 1 : null;
        const countries = regionKey === "GLOBAL" ? [] : REGION_MAP[regionKey];
        const proxies = await this.getPrxList(process.env.PRX_BANK_URL);
        
        if (proxies.length === 0) {
          const kvPrx = await this.getKVPrxList();
          let available = [];
          if (regionKey === "GLOBAL") { available = Object.values(kvPrx).flat(); }
          else { for(const c of countries) { if(kvPrx[c]) available.push(...kvPrx[c]); } }
          if (available.length === 0) { ws.close(1000, `No proxies`); return; }
          this.prxIP = index !== null ? (available[index] || available[Math.floor(Math.random() * available.length)]) : available[Math.floor(Math.random() * available.length)];
        } else {
          const filtered = regionKey === "GLOBAL" ? proxies : proxies.filter(p => countries.includes(p.country));
          if (filtered.length === 0) { ws.close(1000, `No proxies`); return; }
          const sel = index !== null ? (filtered[index] || filtered[Math.floor(Math.random() * filtered.length)]) : filtered[Math.floor(Math.random() * filtered.length)];
          this.prxIP = `${sel.prxIP}:${sel.prxPort}`;
        }
        await this.websocketHandler(ws);
        return;
      }

      const countryMatch = path.match(/^\/([A-Z]{2})(\d+)?$/);
      if (countryMatch) {
        const countryCode = countryMatch[1].toUpperCase();
        const index = countryMatch[2] ? parseInt(countryMatch[2], 10) - 1 : null;
        const proxies = await this.getPrxList(process.env.PRX_BANK_URL);
        
        if (proxies.length === 0) {
          const kvPrx = await this.getKVPrxList();
          if (!kvPrx[countryCode] || kvPrx[countryCode].length === 0) { ws.close(1000, `No proxies`); return; }
          this.prxIP = index !== null ? (kvPrx[countryCode][index] || kvPrx[countryCode][0]) : kvPrx[countryCode][Math.floor(Math.random() * kvPrx[countryCode].length)];
        } else {
          const filtered = proxies.filter(p => p.country === countryCode);
          if (filtered.length === 0) { ws.close(1000, `No proxies`); return; }
          const sel = index !== null ? (filtered[index] || filtered[0]) : filtered[Math.floor(Math.random() * filtered.length)];
          this.prxIP = `${sel.prxIP}:${sel.prxPort}`;
        }
        await this.websocketHandler(ws);
        return;
      }

      const ipPortMatch = path.match(/^\/(.+[:=-]\d+)$/);
      if (ipPortMatch) {
        this.prxIP = ipPortMatch[1].replace(/[=:-]/, ":");
        await this.websocketHandler(ws);
        return;
      }

      if (path.length === 4 || path.includes(',')) {
        const prxKeys = path.replace("/", "").toUpperCase().split(",");
        const prxKey = prxKeys[Math.floor(Math.random() * prxKeys.length)];
        const kvPrx = await this.getKVPrxList();
        if (kvPrx[prxKey] && kvPrx[prxKey].length > 0) {
          this.prxIP = kvPrx[prxKey][Math.floor(Math.random() * kvPrx[prxKey].length)];
          await this.websocketHandler(ws);
          return;
        }
        ws.close(1000, `No proxies`); return;
      }
      ws.close(1000, "Invalid WebSocket path");
    } catch (err) { ws.close(1011, 'Internal server error'); }
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

        // Kunci penanganan data VLESS & Trojan agar masuk satu pintu parser terpadu
        if (protocol === horse || protocol === "vless") protocolHeader = this.readHorseHeader(chunk);
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
        ws.close(1011, err.message);
      }
    });

    ws.on('close', () => {
      if (remoteSocketWrapper.value) remoteSocketWrapper.value.end();
      this.cleanupUDPConnections(ws);
    });
    ws.on('error', () => this.cleanupUDPConnections(ws));
  }

  // ==================== PROTOCOL SNIFFERS (LOCK VLESS FIXED) ====================

  async protocolSniffer(buffer) {
    if (!buffer || buffer.length === 0) return "ss";
    
    // Kunci deteksi byte awal VLESS (0x00 / 0x01) pada koneksi WebSocket pendek
    if (buffer[0] === 0x00 || buffer[0] === 0x01) {
      return "vless";
    }

    if (buffer.length >= 62) {
      const d = buffer.slice(56, 60);
      if (d[0] === 0x0d && d[1] === 0x0a && [0x01,0x03,0x7f].includes(d[2]) && [0x01,0x03,0x04].includes(d[3])) return horse;
    }
    const h = buffer.slice(1, 17).toString('hex');
    if (h.match(/^[0-9a-f]{8}[0-9a-f]{4}4[0-9a-f]{3}[89ab][0-9a-f]{3}[0-9a-f]{12}$/i)) return flash;
    
    // Fallback utama jika sniffer meleset: anggap VLESS/Trojan gateway default agar tidak masuk SS
    return "vless";
  }

  async handleTCPOutBound(remoteSocket, addressRemote, portRemote, rawClientData, webSocket, responseHeader, log) {
    const connectAndWrite = (address, port) => new Promise((resolve, reject) => {
      const s = net.createConnection({ host: address, port }, () => { log(`connected to ${address}:${port}`); s.write(rawClientData); resolve(s); });
      s.on('error', reject);
    });
    
    if (this.isDirectRoute) {
      try {
        const s = await connectAndWrite(addressRemote, portRemote);
        remoteSocket.value = s;
        s.on('close', () => webSocket.close()); s.on('error', () => webSocket.close());
        this.remoteSocketToWS(s, webSocket, responseHeader, null, log);
      } catch (e) { webSocket.close(); }
      return;
    }

    const retry = async () => {
      try {
        const s = await connectAndWrite(this.prxIP.split(/[:=-]/)[0] || addressRemote, this.prxIP.split(/[:=-]/)[1] || portRemote);
        remoteSocket.value = s;
        s.on('close', () => webSocket.close()); s.on('error', () => webSocket.close());
        this.remoteSocketToWS(s, webSocket, responseHeader, null, log);
      } catch(e) { webSocket.close(); }
    };
    try {
      const s = await connectAndWrite(addressRemote, portRemote);
      remoteSocket.value = s;
      s.on('close', () => webSocket.close()); s.on('error', () => webSocket.close());
      this.remoteSocketToWS(s, webSocket, responseHeader, retry, log);
    } catch(e) { await retry(); }
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
    const v = buf[0]; let udp = false;
    const ol = buf[17]; const cmd = buf[18+ol];
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
    // Cek apakah paket data berupa VLESS WS murni (diawali byte 0x00 atau 0x01)
    const isVless = buf[0] === 0x00 || buf[0] === 0x01;
    // Jika VLESS, gunakan buffer utuh tanpa potongan padding 58 byte pertamanya
    const db = isVless ? buf : buf.slice(58);
    
    if (db.length < 6) return { hasError: true, message: "Invalid data" };
    let udp = false;
    const cmd = db[0];
    
    if (cmd == 3) udp = true; 
    else if (cmd != 1) {
      if (isVless) return this.readHorseHeader(buf.slice(58));
      return { hasError: true, message: "Unsupported cmd" };
    }
    
    let at = db[1]; let al = 0, avi = 2, av = "";
    if (at === 1) { al = 4; av = Array.from(db.slice(avi, avi+al)).join("."); }
    else if (at === 3) { al = db[avi]; avi += 1; av = db.slice(avi, avi+al).toString(); }
    else if (at === 4) { al = 16; const ip = []; for(let i=0;i<8;i++) ip.push(db.readUInt16BE(avi+i*2).toString(16)); av = ip.join(":"); }
    else return { hasError: true, message: `Invalid addr type` };
    
    if (!av) return { hasError: true, message: "Address empty" };
    const pi = avi + al;
    const pr = db.readUInt16BE(pi);
    
    return { 
      hasError: false, 
      addressRemote: av, 
      portRemote: pr, 
      rawDataIndex: isVless ? (pi + 2) : (pi + 4), 
      rawClientData: isVless ? db.slice(pi + 2) : db.slice(pi + 4), 
      version: isVless ? Buffer.from([buf[0], 0]) : null, 
      isUDP: udp || pr == 53 
    };
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
    const server = http.createServer((req, res) => {
      this.handleHttpRequest(req, res).catch(() => {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      });
    });

    this.wss = new WebSocket.Server({ server, perMessageDeflate: false });
    this.wss.on('connection', (ws, req) => { this.handleWebSocketConnection(ws, req); });

    const gracefulShutdown = () => {
      if (this.wss) { this.wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.close(); }); this.wss.close(); }
      for (const [key, conn] of this.activeUDPConnections) { try { conn.socket.close(); } catch(_) {} }
      if (this.httpServer) { this.httpServer.close(() => { process.exit(0); }); }
      setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', gracefulShutdown); process.on('SIGINT', gracefulShutdown);
    server.listen(port, '0.0.0.0', () => { this.httpServer = server; });
  }
}

if (require.main === module) {
  const server = new GatewayServer();
  try { require('dotenv').config(); } catch (e) {}
  const port = process.env.PORT || 3000;
  server.start(port);
}

module.exports = GatewayServer;
