// ============================================
// RAILWAY GATEWAY - FULL COMPLETE (HYBRID SYSTEM)
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

const KV_PRX_URL = "https://raw.githubusercontent.com/backup-heavenly-demons/gateway/refs/heads/main/kvProxyList.json";
const WS_READY_STATE_OPEN = 1;
const CORS_HEADER_OPTIONS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const REGION_MAP = {
  ASIA: ["ID", "SG", "MY", "PH", "TH", "VN", "JP", "KR", "CN", "HK", "TW"],
  GLOBAL: []
};

class GatewayServer {
  constructor() {
    this.prxIP = "";
    this.wss = null;
    this.httpServer = null;
    this.activeUDPConnections = new Map();
    this.CORS_HEADER_OPTIONS = CORS_HEADER_OPTIONS;
    this.isDirectRoute = false;
  }

  // ==================== HTTP HANDLERS & UI ====================
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
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<html><body style="background:#0a0b10;color:#fff;font-family:monospace;padding:20px;">
        <h2>RAILWAY GATEWAY HYBRID // ACTIVE</h2>
        <p>Direct Path: ws://${currentHost}/DIREK</p>
        <p>Proxy Path: ws://${currentHost}/ALL atau ws://${currentHost}/G-SG</p>
      </body></html>`);
      return;
    }

    const targetReversePrx = process.env.REVERSE_PRX_TARGET;
    if (targetReversePrx) {
      this.reverseWeb(req, res, targetReversePrx);
    } else {
      res.writeHead(404); res.end('Not Found');
    }
  }

  async getKVPrxList(kvPrxUrl = KV_PRX_URL) {
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
        return data.map(proxy => ({
          prxIP: proxy.prxIP || proxy.ip || proxy.server,
          prxPort: proxy.prxPort || proxy.port,
          country: (proxy.country || proxy.cc || 'XX').toUpperCase()
        })).filter(p => p.prxIP && p.prxPort);
      }
      return [];
    } catch (error) { return []; }
  }

  async reverseWeb(request, response, target) {
    try {
      const targetUrl = new URL(request.url);
      const targetChunk = target.split(":");
      targetUrl.hostname = targetChunk[0];
      targetUrl.port = targetChunk[1] || "443";

      const options = {
        hostname: targetUrl.hostname, port: targetUrl.port,
        path: targetUrl.pathname + targetUrl.search, method: request.method,
        headers: { ...request.headers, host: targetUrl.hostname }
      };

      const proxyReq = https.request(options, (proxyRes) => {
        response.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(response);
      });
      proxyReq.on('error', () => { response.writeHead(500); response.end(); });
      request.pipe(proxyReq);
    } catch (err) { response.writeHead(500); response.end(); }
  }

  // ==================== WEBSOCKET HANDLERS ====================
  async handleWebSocketConnection(ws, request) {
    try {
      const parsedUrl = url.parse(request.url, true);
      const path = parsedUrl.pathname;
      console.log(`WebSocket path: ${path}`);
      
      this.isDirectRoute = false;

      // 1. Path /DIREK (Bypass mentah ke Railway)
      if (path.toUpperCase() === '/DIREK') {
        this.isDirectRoute = true;
        this.prxIP = "";
        await this.websocketHandler(ws);
        return;
      }

      // 2. Deteksi Hardcode Proxy Group (/G-SG, /SG-DO, dll)
      const customMatch = path.match(/^\/([A-Z0-9]{2,3}-[A-Za-z0-9_]+)$/i);
      if (customMatch) {
        const customKey = customMatch[1].toUpperCase();
        if (CUSTOM_PROXY[customKey]) {
          const list = CUSTOM_PROXY[customKey];
          this.prxIP = list[Math.floor(Math.random() * list.length)];
          console.log(`[PROXY MATCH] Custom Hardcode: ${this.prxIP}`);
          await this.websocketHandler(ws);
          return;
        }
      }

      // 3. Fallback routing dinamis bawaan (/ALL, /ID, /SG)
      const kvPrx = await this.getKVPrxList();
      const countryCode = path.replace("/", "").toUpperCase();
      
      if (kvPrx[countryCode] && kvPrx[countryCode].length > 0) {
        this.prxIP = kvPrx[countryCode][Math.floor(Math.random() * kvPrx[countryCode].length)];
      } else {
        const allProxies = Object.values(kvPrx).flat();
        this.prxIP = allProxies.length > 0 ? allProxies[Math.floor(Math.random() * allProxies.length)] : "";
      }

      console.log(`[PROXY MATCH] Dynamic Key: ${this.prxIP}`);
      await this.websocketHandler(ws);
    } catch (err) { ws.close(1011); }
  }

  async websocketHandler(ws) {
    let remoteSocketWrapper = { value: null };

    ws.on('message', async (message) => {
      try {
        const chunk = Buffer.from(message);
        if (remoteSocketWrapper.value) { remoteSocketWrapper.value.write(chunk); return; }

        // Gunakan metode pembacaan Shadowsocks asli bawaan temanmu yang terbukti tembus di Railway
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
    
    // Jika /DIREK, langsung buang koneksi mentah ke internet lewat Railway IP
    if (this.isDirectRoute || !this.prxIP) {
      try {
        const s = await connectAndWrite(addressRemote, portRemote);
        remoteSocket.value = s;
        s.on('close', () => webSocket.close()); s.on('error', () => webSocket.close());
        this.remoteSocketToWS(s, webSocket, responseHeader, null);
      } catch (e) { webSocket.close(); }
      return;
    }

    // Jika lewat path proxy, belokkan paksa ke IP Proxy tujuan (Trik antibocor IP Railway)
    const retry = async () => {
      try {
        const [proxyHost, proxyPort] = this.prxIP.split(/[:=-]/);
        const s = await connectAndWrite(proxyHost || addressRemote, parseInt(proxyPort) || portRemote);
        remoteSocket.value = s;
        s.on('close', () => webSocket.close()); s.on('error', () => webSocket.close());
        this.remoteSocketToWS(s, webSocket, responseHeader, null);
      } catch(e) { webSocket.close(); }
    };

    try {
      const [proxyHost, proxyPort] = this.prxIP.split(/[:=-]/);
      const s = await connectAndWrite(proxyHost, parseInt(proxyPort));
      remoteSocket.value = s;
      s.on('close', () => webSocket.close()); s.on('error', () => webSocket.close());
      this.remoteSocketToWS(s, webSocket, responseHeader, null);
    } catch(e) { await retry(); }
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

  // Fungsi pembaca data murni Shadowsocks bawaan temanmu yang terbukti lolos meloloskan traffic WebSocket Railway
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
