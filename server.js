// ============================================
// DDFATHUVLES GATEWAY - SERVER ENGINE
// INTEGRATED CLOUDFLARED SPAWNER & API TUNNEL DETECTOR
// ============================================

const WebSocket = require('ws');
const net = require('net');
const dgram = require('dgram');
const http = require('http');
const url = require('url');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const { EventEmitter } = require('events');
const { generateUI } = require('./ui');

// Protocol Markers
const horse = Buffer.from("dHJvamFu", 'base64').toString(); // "trojan"
const flash = Buffer.from("dm1lc3M=", 'base64').toString(); // "vless / vmess"

const CORS_HEADER_OPTIONS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// ==================== HTTPUPGRADE RAW STREAM ADAPTER ====================
// HTTPUpgrade (h2up) bukan WebSocket beneran: handshake 101 tanpa
// Sec-WebSocket-Key, habis itu data jalan sebagai raw TCP stream tanpa
// frame WS. Adapter ini membungkus socket mentah itu supaya terlihat
// seperti koneksi `ws` di mata handler gateway yang sudah ada
// (on('message'|'close'|'error'), send(), close(), readyState).
class RawStreamAdapter extends EventEmitter {
  constructor(socket) {
    super();
    this.socket = socket;
    this.readyState = 1; // WebSocket.OPEN
    this.isRawStream = true;
    this.remoteRealIP = '';
    this._firstChunks = [];
    this._firstBytes = 0;
    this._firstFlushed = false;
    this._flushTimer = null;

    socket.on('data', (chunk) => {
      if (!this._firstFlushed) {
        // Chunk pertama ditahan sebentar: header protokol di stream mentah
        // bisa kepotong beberapa segmen TCP. Kumpulkan sampai >=128 byte
        // atau 30ms sejak byte pertama, baru lempar sebagai 'message'.
        this._firstChunks.push(chunk);
        this._firstBytes += chunk.length;
        if (!this._flushTimer) this._flushTimer = setTimeout(() => this._flushFirst(), 30);
        if (this._firstBytes >= 128) this._flushFirst();
        return;
      }
      this.emit('message', chunk);
    });
    socket.on('close', () => { this.readyState = 3; this.emit('close'); });
    socket.on('error', (err) => { this.readyState = 3; this.emit('error', err); });
  }

  _flushFirst() {
    if (this._firstFlushed) return;
    if (this._flushTimer) { clearTimeout(this._flushTimer); this._flushTimer = null; }
    if (!this._firstChunks.length) { this._firstFlushed = true; return; }
    let buf = Buffer.concat(this._firstChunks);
    // Penjaga template injek: blok response palsu ("HTTP/ 200 OK\r\n\r\n")
    // bisa tiba di depan data tunnel pada stream mentah (dikirim klien
    // sesudah [split], yaitu sesudah handoff front-end). Buang satu blok
    // header di awal bila stream diawali "HTTP/".
    if (buf.length >= 5 && buf.toString('latin1', 0, 5) === 'HTTP/') {
      const end = buf.indexOf('\r\n\r\n');
      if (end === -1 && buf.length < 8192) {
        // Blok palsu belum utuh: tahan dulu, tunggu lanjutan.
        this._flushTimer = setTimeout(() => this._flushFirst(), 30);
        return;
      }
      if (end !== -1) {
        buf = buf.subarray(end + 4);
        this._firstChunks = buf.length ? [buf] : [];
        this._firstBytes = buf.length;
        if (!buf.length) {
          // Baru blok palsu saja; tunggu data tunnel aslinya.
          this._flushTimer = setTimeout(() => this._flushFirst(), 30);
          return;
        }
      }
    }
    this._firstFlushed = true;
    this._firstChunks = [];
    this.emit('message', buf);
  }

  send(data) {
    if (this.readyState === 1 && !this.socket.destroyed) {
      try { this.socket.write(data); } catch (_) {}
    }
  }

  close() {
    this.readyState = 3;
    try { this.socket.end(); } catch (_) {}
    try { this.socket.destroy(); } catch (_) {}
  }
}

// =====================================================================
// VMess AEAD server support (protocol as implemented by Xray-core:
// proxy/vmess/aead + proxy/vmess/encoding, replicated exactly).
// VMess encrypts everything with a key derived from the UUID, so unlike
// VLESS it cannot accept arbitrary UUIDs: the accepted UUIDs come from
// the VMESS_UUID env var (comma separated) and default to the UI UUID.
// =====================================================================

function sha256HashObj() {
    let h = crypto.createHash('sha256');
    return {
        write(d) { h.update(d); },
        sum() { return h.copy().digest(); },
        reset() { h = crypto.createHash('sha256'); }
    };
}

// Faithful port of Go's crypto/hmac (needed because the VMess KDF nests
// HMACs in a way plain HMAC composition does not reproduce).
class GoHmac {
    constructor(newHash, key) {
        this.outer = newHash();
        this.inner = newHash();
        let k = Buffer.from(key);
        if (k.length > 64) { this.outer.write(k); k = this.outer.sum(); }
        this.ipad = Buffer.alloc(64, 0x36);
        this.opad = Buffer.alloc(64, 0x5c);
        for (let i = 0; i < k.length; i++) { this.ipad[i] ^= k[i]; this.opad[i] ^= k[i]; }
        this.inner.write(this.ipad);
    }
    write(d) { this.inner.write(d); }
    sum() {
        const digest = this.inner.sum();
        this.outer.reset();
        this.outer.write(this.opad);
        this.outer.write(digest);
        return this.outer.sum();
    }
    reset() { this.inner.reset(); this.inner.write(this.ipad); }
}

function vmessKDF(key, paths) {
    let cur = new GoHmac(sha256HashObj, Buffer.from('VMess AEAD KDF', 'utf8'));
    for (const p of paths) {
        const prev = cur;
        const pbuf = Buffer.isBuffer(p) ? p : Buffer.from(p, 'utf8');
        let calls = 0;
        cur = new GoHmac(() => {
            calls++;
            return calls === 1
                ? { write: d => prev.write(d), sum: () => prev.sum(), reset: () => prev.reset() }
                : prev;
        }, pbuf);
    }
    cur.write(Buffer.from(key));
    return cur.sum();
}
const vmessKDF16 = (key, paths) => vmessKDF(key, paths).slice(0, 16);

const CRC32_TABLE = (() => {
    const t = [];
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c >>> 0;
    }
    return t;
})();
function crc32IEEE(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = CRC32_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
}
function fnv1a32(buf) {
    let h = 0x811c9dc5;
    for (let i = 0; i < buf.length; i++) { h ^= buf[i]; h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
}
function chacha20Key(b16) {
    const a = crypto.createHash('md5').update(b16).digest();
    const b = crypto.createHash('md5').update(a).digest();
    return Buffer.concat([a, b]);
}
function aeadSeal(kind, key, nonce, plaintext, aad) {
    const c = kind === 'gcm'
        ? crypto.createCipheriv('aes-128-gcm', key, nonce, { authTagLength: 16 })
        : crypto.createCipheriv('chacha20-poly1305', key, nonce, { authTagLength: 16 });
    if (aad && aad.length) c.setAAD(aad);
    const ct = Buffer.concat([c.update(plaintext), c.final()]);
    return Buffer.concat([ct, c.getAuthTag()]);
}
function aeadOpen(kind, key, nonce, data, aad) {
    const tag = data.slice(data.length - 16);
    const ct = data.slice(0, data.length - 16);
    const d = kind === 'gcm'
        ? crypto.createDecipheriv('aes-128-gcm', key, nonce, { authTagLength: 16 })
        : crypto.createDecipheriv('chacha20-poly1305', key, nonce, { authTagLength: 16 });
    if (aad && aad.length) d.setAAD(aad);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(ct), d.final()]);
}
function chunkNonceGen(iv16) {
    const c = Buffer.from(iv16);
    let count = 0;
    return () => {
        c.writeUInt16BE(count & 0xFFFF, 0);
        count++;
        return Buffer.from(c.slice(0, 12));
    };
}
class ShakeStream {
    constructor(iv) {
        this.buf = crypto.createHash('shake128', { outputLength: 1 << 17 }).update(iv).digest();
        this.off = 0;
    }
    next16() {
        if (this.off + 2 > this.buf.length) throw new Error('shake stream exhausted');
        const v = this.buf.readUInt16BE(this.off);
        this.off += 2;
        return v;
    }
    nextPadding() { return this.next16() % 64; }
}

// One direction of the VMess chunk stream (size parser + AEAD + padding),
// mirroring Xray's AuthenticationWriter/Reader option handling.
class VmessChunkCodec {
    constructor(security, bodyKey, bodyIV, option) {
        this.kind = security; // 'gcm' | 'chacha'
        this.dataKey = security === 'gcm' ? bodyKey : chacha20Key(bodyKey);
        this.dataNonce = chunkNonceGen(bodyIV);
        this.authLen = !!(option & 0x10);
        this.masking = !!(option & 0x04);
        this.globalPadding = !!(option & 0x08);
        if (this.authLen) {
            const lk = vmessKDF16(bodyKey, ['auth_len']);
            this.lenKey = security === 'gcm' ? lk : chacha20Key(lk);
            this.lenNonce = chunkNonceGen(bodyIV);
        }
        if (this.masking) this.shake = new ShakeStream(bodyIV);
        this.sizeBytes = this.authLen ? 18 : 2;
    }
    decodeSize(raw) {
        if (this.authLen) {
            const p = aeadOpen(this.kind, this.lenKey, this.lenNonce(), raw, null);
            return p.readUInt16BE(0);
        }
        const v = raw.readUInt16BE(0);
        return this.masking ? (v ^ this.shake.next16()) : v;
    }
    takePadding() { return this.globalPadding ? this.shake.nextPadding() : 0; }
    encodeChunk(payload) {
        const paddingSize = this.globalPadding ? this.shake.nextPadding() : 0;
        const sizeVal = payload.length + 16 + paddingSize;
        let sizeField;
        if (this.authLen) {
            const sb = Buffer.alloc(2);
            sb.writeUInt16BE(sizeVal, 0);
            sizeField = aeadSeal(this.kind, this.lenKey, this.lenNonce(), sb, null);
        } else if (this.masking) {
            sizeField = Buffer.alloc(2);
            sizeField.writeUInt16BE(sizeVal ^ this.shake.next16(), 0);
        } else {
            sizeField = Buffer.alloc(2);
            sizeField.writeUInt16BE(sizeVal, 0);
        }
        const sealed = aeadSeal(this.kind, this.dataKey, this.dataNonce(), payload, null);
        return paddingSize > 0
            ? Buffer.concat([sizeField, sealed, crypto.randomBytes(paddingSize)])
            : Buffer.concat([sizeField, sealed]);
    }
    openChunk(sealed) { return aeadOpen(this.kind, this.dataKey, this.dataNonce(), sealed, null); }
}

class VmessSession {
    constructor(gateway, ws, clientIP, user) {
        this.gateway = gateway;
        this.ws = ws;
        this.clientIP = clientIP;
        this.user = user; // { uuid, cmdKey }
        this.inBuf = Buffer.alloc(0);
        this.headerDone = false;
        this.closed = false;
        this.respHeaderSent = false;
        this.finalSent = false;
        this.remote = null;
        this.remoteReady = false;
        this.pendingPlain = [];
        this.decState = 'size';
        this.curSize = 0;
        this.curPadding = 0;
    }

    feed(chunk) {
        if (this.closed) return;
        this.inBuf = this.inBuf.length ? Buffer.concat([this.inBuf, chunk]) : chunk;
        try {
            if (!this.headerDone) this.parseHeader();
            if (this.headerDone) this.pumpChunks();
        } catch (e) {
            console.log('[VMess] session error: ' + e.message);
            this.close();
        }
    }

    parseHeader() {
        const buf = this.inBuf;
        if (buf.length < 42) return; // authID(16) + encLen(18) + nonce(8)
        const authID = buf.slice(0, 16);
        const cmdKey = this.user.cmdKey;
        const encLen = buf.slice(16, 34);
        const nonce = buf.slice(34, 42);
        const lenKey = vmessKDF16(cmdKey, ['VMess Header AEAD Key_Length', authID, nonce]);
        const lenNonce = vmessKDF(cmdKey, ['VMess Header AEAD Nonce_Length', authID, nonce]).slice(0, 12);
        const lenPlain = aeadOpen('gcm', lenKey, lenNonce, encLen, authID);
        const headerLen = lenPlain.readUInt16BE(0);
        const total = 42 + headerLen + 16;
        if (buf.length < total) return;
        const payKey = vmessKDF16(cmdKey, ['VMess Header AEAD Key', authID, nonce]);
        const payNonce = vmessKDF(cmdKey, ['VMess Header AEAD Nonce', authID, nonce]).slice(0, 12);
        const p = aeadOpen('gcm', payKey, payNonce, buf.slice(42, total), authID);
        this.inBuf = buf.slice(total);

        if (p[0] !== 1) throw new Error('bad vmess version');
        this.bodyIV = p.slice(1, 17);
        this.bodyKey = p.slice(17, 33);
        this.respByte = p[33];
        this.option = p[34];
        const secByte = p[35];
        const paddingLen = secByte >> 4;
        const secType = secByte & 0x0F;
        if (secType === 3) this.security = 'gcm';
        else if (secType === 4) this.security = 'chacha';
        else throw new Error('unsupported vmess security ' + secType);
        this.command = p[37];
        if (this.command !== 1 && this.command !== 2) throw new Error('unsupported vmess command ' + this.command);
        this.port = p.readUInt16BE(38);
        const at = p[40];
        let idx = 41;
        if (at === 1) { this.host = Array.from(p.slice(idx, idx + 4)).join('.'); idx += 4; }
        else if (at === 2) { const l = p[idx]; this.host = p.slice(idx + 1, idx + 1 + l).toString('utf8'); idx += 1 + l; }
        else if (at === 3) {
            const parts = [];
            for (let i = 0; i < 8; i++) parts.push(p.readUInt16BE(idx + i * 2).toString(16));
            this.host = parts.join(':'); idx += 16;
        } else throw new Error('bad vmess address type ' + at);
        const end = idx + paddingLen;
        if (p.length < end + 4) throw new Error('short vmess header');
        if (fnv1a32(p.slice(0, end)) !== p.readUInt32BE(end)) throw new Error('vmess header checksum mismatch');

        this.dec = new VmessChunkCodec(this.security, this.bodyKey, this.bodyIV, this.option);
        const respBodyKey = crypto.createHash('sha256').update(this.bodyKey).digest().slice(0, 16);
        const respBodyIV = crypto.createHash('sha256').update(this.bodyIV).digest().slice(0, 16);
        this.respBodyKey = respBodyKey;
        this.respBodyIV = respBodyIV;
        this.enc = new VmessChunkCodec(this.security, respBodyKey, respBodyIV, this.option);
        this.headerDone = true;
        console.log(`[VMess] ${this.command === 2 ? 'UDP' : 'TCP'} -> ${this.host}:${this.port} (${this.security}, opt=0x${this.option.toString(16)})`);
        if (this.command === 2) this.startUDP();
        else this.startTCP();
    }

    sendResponseHeader() {
        if (this.respHeaderSent) return;
        this.respHeaderSent = true;
        const plain = Buffer.from([this.respByte, 0x00, 0x00, 0x00]);
        const lenKey = vmessKDF16(this.respBodyKey, ['AEAD Resp Header Len Key']);
        const lenIV = vmessKDF(this.respBodyIV, ['AEAD Resp Header Len IV']).slice(0, 12);
        const payKey = vmessKDF16(this.respBodyKey, ['AEAD Resp Header Key']);
        const payIV = vmessKDF(this.respBodyIV, ['AEAD Resp Header IV']).slice(0, 12);
        const lenBuf = Buffer.alloc(2);
        lenBuf.writeUInt16BE(plain.length, 0);
        const out = Buffer.concat([
            aeadSeal('gcm', lenKey, lenIV, lenBuf, null),
            aeadSeal('gcm', payKey, payIV, plain, null)
        ]);
        this.sendRaw(out);
    }

    sendRaw(buf) {
        if (this.closed) return;
        this.gateway.totalDownloadBytes += buf.length;
        try { this.ws.send(buf); } catch (e) { /* socket gone */ }
    }

    sendBody(data) {
        this.sendResponseHeader();
        if (this.command === 2) {
            this.sendRaw(this.enc.encodeChunk(data));
            return;
        }
        const MAXP = 8000;
        for (let off = 0; off < data.length; off += MAXP) {
            this.sendRaw(this.enc.encodeChunk(data.slice(off, off + MAXP)));
        }
    }

    sendFinal() {
        if (this.finalSent || this.closed) return;
        this.finalSent = true;
        this.sendResponseHeader();
        this.sendRaw(this.enc.encodeChunk(Buffer.alloc(0)));
    }

    pumpChunks() {
        while (!this.closed) {
            if (this.decState === 'size') {
                if (this.inBuf.length < this.dec.sizeBytes) return;
                const raw = this.inBuf.slice(0, this.dec.sizeBytes);
                this.curPadding = this.dec.takePadding();
                this.curSize = this.dec.decodeSize(raw);
                this.inBuf = this.inBuf.slice(this.dec.sizeBytes);
                if (this.curSize === 16 + this.curPadding) { this.onClientEOF(); return; }
                if (this.curSize < 16 + this.curPadding || this.curSize > 65535) throw new Error('bad chunk size ' + this.curSize);
                this.decState = 'data';
            }
            if (this.decState === 'data') {
                if (this.inBuf.length < this.curSize) return;
                const raw = this.inBuf.slice(0, this.curSize);
                this.inBuf = this.inBuf.slice(this.curSize);
                const plain = this.dec.openChunk(raw.slice(0, this.curSize - this.curPadding));
                this.decState = 'size';
                this.onPlain(plain);
            }
        }
    }

    onPlain(plain) {
        if (this.command === 2) {
            if (this.udpSock) {
                this.udpSock.send(plain, this.port, this.host, (err) => { if (err) console.log('[VMess] UDP send: ' + err.message); });
            }
            return;
        }
        if (this.remoteReady && this.remote) this.remote.write(plain);
        else this.pendingPlain.push(plain);
    }

    onClientEOF() {
        if (this.command === 1 && this.remote && !this.remote.destroyed) {
            try { this.remote.end(); } catch (e) { /* ignore */ }
        }
        if (this.command === 2) this.close();
    }

    startTCP() {
        const gateway = this.gateway;
        const remote = net.createConnection({ host: this.host, port: this.port }, () => {
            this.remoteReady = true;
            this.sendResponseHeader();
            if (this.pendingPlain.length) {
                for (const b of this.pendingPlain) remote.write(b);
                this.pendingPlain = [];
            }
        });
        this.remote = remote;
        remote.on('data', (d) => { this.sendBody(d); });
        remote.on('error', (err) => {
            console.log(`[VMess] remote ${this.host}:${this.port}: ${err.message}`);
            this.sendFinal();
            this.close();
        });
        remote.on('close', () => { this.sendFinal(); this.close(); });
    }

    startUDP() {
        const fam = net.isIPv6(this.host) ? 'udp6' : 'udp4';
        const sock = dgram.createSocket(fam);
        this.udpSock = sock;
        sock.on('message', (msg) => { this.sendBody(msg); });
        sock.on('error', (err) => { console.log('[VMess] UDP socket: ' + err.message); });
        try { sock.bind(0); } catch (e) { /* bind errors surface via 'error' */ }
        this.sendResponseHeader();
    }

    close() {
        if (this.closed) return;
        this.closed = true;
        if (this.remote) { try { this.remote.destroy(); } catch (e) { /* ignore */ } this.remote = null; }
        if (this.udpSock) { try { this.udpSock.close(); } catch (e) { /* ignore */ } this.udpSock = null; }
        if (this.ws.readyState === 1 || this.ws.readyState === 0) {
            try { this.ws.close(1000); } catch (e) { /* ignore */ }
        }
    }
}

class GatewayServer {
  constructor() {
    this.wss = null;
    this.rawClients = new Set();
    this.httpServer = null;
    this.activeUDPConnections = new Map();
    this.CORS_HEADER_OPTIONS = CORS_HEADER_OPTIONS;
    this.totalVisits = 0;
    
    // Counter Traffic Data
    this.totalDownloadBytes = 128400000; // 128.4 MB awal
    this.totalUploadBytes = 96200000;   // 96.2 MB awal

    // Tempat menyimpan URL Tunnel Cloudflare terbaru
    this.currentTunnelUrl = '';

    // Payload enhanced: listener TCP mentah di depan HTTP server yang
    // membuang payload sampah/decoy di depan request WS/h2up asli.
    // Default ON; PAYLOAD_ENHANCED=0 menonaktifkan (listen langsung).
    this.payloadEnhanced = process.env.PAYLOAD_ENHANCED !== '0';

    // VMess users: cmdKey = MD5(uuidBytes || "c48619fe-8f02-49e0-b9e9-edf763e17e21")
    const vmessUuids = (process.env.VMESS_UUID || '853b8456-0c0b-4bfa-b3b4-b2619248a9bc')
      .split(',').map(s => s.trim()).filter(Boolean);
    this.vmessUsers = [];
    for (const u of vmessUuids) {
      const hex = u.replace(/-/g, '');
      if (!/^[0-9a-fA-F]{32}$/.test(hex)) continue;
      const uuidBytes = Buffer.from(hex, 'hex');
      const cmdKey = crypto.createHash('md5')
        .update(Buffer.concat([uuidBytes, Buffer.from('c48619fe-8f02-49e0-b9e9-edf763e17e21', 'utf8')]))
        .digest();
      this.vmessUsers.push({ uuid: u, cmdKey });
    }
  }

  // Coba cocokkan 16 byte pertama sebagai VMess AuthID: dekripsi AES-ECB
  // pakai kunci turunan cmdKey, cek CRC32 + jendela waktu +-120 detik.
  matchVmessAuthID(authID) {
    for (const user of this.vmessUsers) {
      try {
        const aesKey = vmessKDF16(user.cmdKey, ['AES Auth ID Encryption']);
        const d = crypto.createDecipheriv('aes-128-ecb', aesKey, null);
        d.setAutoPadding(false);
        const dec = Buffer.concat([d.update(authID), d.final()]);
        if (crc32IEEE(dec.slice(0, 12)) !== dec.readUInt32BE(12)) continue;
        const ts = Number(dec.readBigInt64BE(0));
        if (ts < 0) continue;
        if (Math.abs(ts - Math.floor(Date.now() / 1000)) > 120) continue;
        return user;
      } catch (e) { /* lanjut ke user berikutnya */ }
    }
    return null;
  }

  // ==================== CLOUDFLARED RUNNER ====================
  startCloudflared(targetPort) {
    console.log('[Tunnel] Spawning cloudflared quick tunnel...');

    // Binary di repo terkomit tanpa permission execute (mode 100644) —
    // coba perbaiki dulu supaya spawn tidak EACCES di PaaS mana pun.
    try { fs.chmodSync('./cloudflared', 0o755); } catch (e) { /* abaikan, error handler di bawah yang jaga */ }

    // Panggil binary ./cloudflared yang ada di root repo
    let cf;
    try {
      cf = spawn('./cloudflared', ['tunnel', '--url', `http://localhost:${targetPort}`]);
    } catch (err) {
      console.log(`[Tunnel] Gagal spawn cloudflared: ${err.message} — server tetap jalan tanpa quick tunnel.`);
      return;
    }

    // WAJIB ada: tanpa handler ini, error spawn (EACCES/ENOENT) jadi
    // unhandled 'error' event dan MEMBUNUH seluruh proses Node.
    cf.on('error', (err) => {
      console.log(`[Tunnel] cloudflared error: ${err.message} — server tetap jalan tanpa quick tunnel.`);
    });

    const captureUrl = (data) => {
      const str = data.toString();
      console.log(`[cloudflared] ${str.trim()}`);
      
      // RegEx nangkep URL trycloudflare.com
      const match = str.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match) {
        this.currentTunnelUrl = match[0];
        console.log(`\n==============================================`);
        console.log(`🚀 QUICK TUNNEL URL DETECTED: ${this.currentTunnelUrl}`);
        console.log(`==============================================\n`);
      }
    };

    cf.stdout.on('data', captureUrl);
    cf.stderr.on('data', captureUrl);

    cf.on('close', (code) => {
      console.log(`[Tunnel] cloudflared process exited with code ${code}`);
    });
  }

  // ==================== HTTP HANDLERS & API ====================
  handleHealthCheck(req, res) {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'ddfathuvles-gateway',
      uptime: process.uptime(),
      tunnel: this.currentTunnelUrl || 'pending',
      payloadEnhanced: this.payloadEnhanced
    };
    res.writeHead(200, { 'Content-Type': 'application/json', ...this.CORS_HEADER_OPTIONS });
    res.end(JSON.stringify(healthData, null, 2));
  }

  async handleHttpRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    if (req.method === 'OPTIONS') { res.writeHead(200, this.CORS_HEADER_OPTIONS); res.end(); return; }
    if (parsedUrl.pathname === '/health') { this.handleHealthCheck(req, res); return; }
    
    // API Endpoint khusus buat UI ngambil URL Tunnel aktif
    if (parsedUrl.pathname === '/api/tunnel') {
      res.writeHead(200, { 'Content-Type': 'application/json', ...this.CORS_HEADER_OPTIONS });
      res.end(JSON.stringify({ url: this.currentTunnelUrl }));
      return;
    }

    if (parsedUrl.pathname === '/') {
      this.totalVisits++;
      
      const currentHost = req.headers.host || 'localhost:3000';
      const uptime = Math.floor(process.uptime());
      
      const activeIPs = new Set();
      if (this.wss && this.wss.clients) {
        this.wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN && client.remoteRealIP) {
            activeIPs.add(client.remoteRealIP);
          }
        });
      }
      if (this.rawClients) {
        this.rawClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN && client.remoteRealIP) {
            activeIPs.add(client.remoteRealIP);
          }
        });
      }
      
      const ipList = Array.from(activeIPs);
      const onlineClients = ipList.length || 1;
      
      let visitorIP = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress || '';
      if (visitorIP.includes(',')) visitorIP = visitorIP.split(',')[0].trim();

      const downloadMB = (this.totalDownloadBytes / (1024 * 1024)).toFixed(1);
      const uploadMB = (this.totalUploadBytes / (1024 * 1024)).toFixed(1);

      res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
      res.end(generateUI(currentHost, uptime, onlineClients, this.totalVisits, ipList, visitorIP, downloadMB, uploadMB, this.currentTunnelUrl));
      return;
    }
    
    res.writeHead(404);
    res.end('Not Found');
  }

  // ==================== WEBSOCKET HANDLERS ====================
  async handleWebSocketConnection(ws, request) {
    await this.websocketHandler(ws);
  }

  async websocketHandler(ws) {
    let addressLog = "", portLog = "";
    const log = (info, event) => console.log(`[${addressLog}:${portLog}] ${info}`, event || "");
    let remoteSocketWrapper = { value: null };
    let vmessSession = null;
    let vmessDecided = false;

    // State khusus stream mentah (HTTPUpgrade): sesi UDP berjalan di atas
    // stream, paketnya dibingkai prefix panjang 2 byte (khusus VLESS).
    let rawUdpSession = null;
    let rawUdpBuf = Buffer.alloc(0);
    const drainRawUdpFrames = () => {
      while (rawUdpBuf.length >= 2) {
        const len = rawUdpBuf.readUInt16BE(0);
        if (rawUdpBuf.length < 2 + len) break;
        const packet = rawUdpBuf.slice(2, 2 + len);
        rawUdpBuf = rawUdpBuf.slice(2 + len);
        rawUdpSession.send(packet);
      }
    };

    const processChunk = async (message) => {
      try {
        const chunk = Buffer.from(message);
        this.totalUploadBytes += chunk.length;

        // Sesi VMess yang sudah jalan: semua chunk berikutnya miliknya.
        if (vmessSession) { vmessSession.feed(chunk); return; }

        // Deteksi VMess AEAD dari AuthID (16 byte pertama) — harus sebelum
        // sniffer lain karena header VMess terenkripsi dan tampak acak.
        if (!vmessDecided) {
          vmessDecided = true;
          if (chunk.length >= 16) {
            const vmUser = this.matchVmessAuthID(chunk.slice(0, 16));
            if (vmUser) {
              const ip = (ws._socket && ws._socket.remoteAddress) || (ws.socket && ws.socket.remoteAddress) || '';
              vmessSession = new VmessSession(this, ws, ip, vmUser);
              vmessSession.feed(chunk);
              return;
            }
          }
        }

        // Stream mentah yang sesinya UDP: semua byte lanjutan milik sesi UDP.
        if (rawUdpSession) {
          if (rawUdpSession.framed) {
            rawUdpBuf = Buffer.concat([rawUdpBuf, chunk]);
            drainRawUdpFrames();
          } else {
            rawUdpSession.send(chunk);
          }
          return;
        }

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
          if (ws.isRawStream) {
            rawUdpSession = await this.handleRawUDPOutbound(ws, protocolHeader, log, protocol === flash);
            const rest = protocolHeader.rawClientData;
            if (rest && rest.length) {
              if (rawUdpSession.framed) {
                rawUdpBuf = Buffer.concat([rawUdpBuf, Buffer.from(rest)]);
                drainRawUdpFrames();
              } else {
                rawUdpSession.send(Buffer.from(rest));
              }
            }
            return;
          }
          return await this.handleUDPOutbound(protocolHeader.addressRemote, protocolHeader.portRemote, chunk.slice(protocolHeader.rawDataIndex), ws, protocolHeader.version, log);
        }

        this.handleTCPOutBound(remoteSocketWrapper, protocolHeader.addressRemote, protocolHeader.portRemote, protocolHeader.rawClientData, ws, protocolHeader.version, log);
      } catch (err) {
        ws.close(1011);
      }
    };

    if (ws.isRawStream) {
      // Stream mentah wajib serial: chunk tidak boleh diproses paralel,
      // urutan byte menentukan posisi header dan frame UDP.
      let chain = Promise.resolve();
      ws.on('message', (message) => { chain = chain.then(() => processChunk(message)).catch(() => {}); });
    } else {
      ws.on('message', processChunk);
    }

    ws.on('close', () => { if (vmessSession) vmessSession.close(); if (remoteSocketWrapper.value) remoteSocketWrapper.value.end(); this.cleanupUDPConnections(ws); });
    ws.on('error', () => { if (vmessSession) vmessSession.close(); this.cleanupUDPConnections(ws); });
  }

  // UDP di atas stream mentah (HTTPUpgrade): satu socket UDP per sesi ke
  // target dari header pertama. VLESS dibingkai prefix 2 byte dua arah;
  // protokol lain diteruskan mentah seperti jalur WS.
  async handleRawUDPOutbound(webSocket, protocolHeader, log, framed) {
    const targetAddress = protocolHeader.addressRemote;
    const targetPort = protocolHeader.portRemote;
    const sock = dgram.createSocket('udp4');
    const key = `raw:${targetAddress}:${targetPort}:${Date.now()}`;
    this.activeUDPConnections.set(key, { socket: sock, webSocket });

    let header = protocolHeader.version;
    const session = {
      framed: !!framed,
      send: (packet) => {
        try { sock.send(packet, targetPort, targetAddress, () => {}); } catch (_) {}
      }
    };

    let idleTimer = null;
    const armIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { try { sock.close(); } catch (_) {} }, 30000);
    };
    armIdleTimer();

    sock.on('message', (msg) => {
      armIdleTimer();
      if (webSocket.readyState !== WebSocket.OPEN) return;
      this.totalDownloadBytes += msg.length;
      let out = msg;
      if (session.framed) {
        const lenBuf = Buffer.alloc(2);
        lenBuf.writeUInt16BE(msg.length, 0);
        out = Buffer.concat([lenBuf, msg]);
      }
      if (header) { webSocket.send(Buffer.concat([Buffer.from(header), out])); header = null; }
      else webSocket.send(out);
    });
    sock.on('error', () => { try { sock.close(); } catch (_) {} this.activeUDPConnections.delete(key); });
    sock.on('close', () => { if (idleTimer) clearTimeout(idleTimer); this.activeUDPConnections.delete(key); });

    log(`raw UDP session to ${targetAddress}:${targetPort} (framed=${session.framed})`);
    return session;
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
        log(`direct connection established to ${addressRemote}:${portRemote}`);
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
        
        this.totalUploadBytes += dataChunk.length;
        
        sock.send(dataChunk, targetPort, targetAddress, (e) => { if(e){ try{sock.close()}catch(_){} this.activeUDPConnections.delete(key); } });
        sock.on('message', (msg) => {
          if (webSocket.readyState === WebSocket.OPEN) {
            this.totalDownloadBytes += msg.length;
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
      
      this.totalDownloadBytes += chunk.length;

      if (header) { webSocket.send(Buffer.concat([Buffer.from(header), chunk])); header = null; }
      else webSocket.send(chunk);
    });
  }

  // ==================== PAYLOAD-ENHANCED FRONT-END v2 ====================
  // Listener TCP mentah di depan HTTP server (pola ws-xray.js dari panel
  // vmesssh3-fix, diadaptasi: socket bersih diserahkan ke HTTP server
  // sendiri, bukan ke Xray). Front-end v2 memindai stream sebagai
  // RANGKAIAN blok header HTTP (tiap blok diakhiri \r\n\r\n):
  //   - Blok "kandidat" = blok request yang headernya mengandung
  //     "Upgrade:". Blok ASLI = kandidat pertama yang path-nya masuk
  //     allowlist PAYLOAD_PATHS (default "/direk"); kalau tidak ada,
  //     kandidat terakhir di buffer. Blok sebelum blok asli dibuang.
  //   - Blok asli DENGAN Sec-WebSocket-Key -> serahkan byte-preserving
  //     mulai dari blok itu (klien WS beneran).
  //   - Blok asli TANPA key (pola payload injek asli user: request umpan
  //     GET ber-Upgrade di offset 0, lalu blok PATCH [path] tanpa key)
  //     -> request upgrade bersih DISINTESIS (GET + Host + Upgrade +
  //     Connection: Upgrade, sengaja TANPA Sec-WebSocket-Key) supaya
  //     router lama mengambil jalur raw/HTTPUpgrade dan membalas 101.
  //   - Setelah blok asli, satu blok mirip-response ("HTTP/...") dibuang
  //     (response palsu "[split] HTTP/ 200 OK" dari template injek);
  //     sisanya yang lolos ke raw stream dijaga juga di RawStreamAdapter.
  //   - HTTP biasa bersih di offset 0 (UI / health / api) dan WS asli di
  //     offset 0 diteruskan seketika. Scan dibatasi (default 64 KB) +
  //     timeout ngendus (default 10 detik); sampah tanpa keputusan
  //     dibuang. PAYLOAD_ENHANCED=0 mematikan front-end ini.
  createPayloadFrontend(httpServer) {
    const MAX_SCAN = parseInt(process.env.PAYLOAD_MAX_SCAN_BYTES || '', 10) || 64 * 1024;
    const TIMEOUT_MS = parseInt(process.env.PAYLOAD_SNIFF_TIMEOUT_MS || '', 10) || 10000;
    const GRACE_MS = 300;
    const ALLOW_PATHS = (process.env.PAYLOAD_PATHS || '/direk')
      .split(',').map((s) => s.trim()).filter(Boolean);
    const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    const REQ_LINE_RE = /^([A-Z][A-Z0-9!#$%&'*+.^_`|~-]*) ([^ \r\n]+) HTTP\/1\.[01]$/;

    function blockEndOf(buf, from) {
      const i = buf.indexOf('\r\n\r\n', from);
      return i === -1 ? -1 : i + 4;
    }

    function pathOf(target) {
      if (/^https?:\/\//i.test(target)) {
        try { return new URL(target).pathname || '/'; } catch (_) { return '/'; }
      }
      const p = target.split('?')[0];
      return p || '/';
    }

    // Bisakah `s` (sisa buffer tanpa \r\n) menjadi awalan sebuah blok?
    function couldBeBlockPrefix(s) {
      if (!s.length) return true;
      if ('HTTP/'.startsWith(s)) return true;
      if (/^[A-Z]{1,24}$/.test(s)) return true;        // metode kepotong
      if (/^[A-Z]+ [^ \r\n]*$/.test(s)) return true;   // request line kepotong
      return false;
    }

    // Parse satu blok mulai PERSIS di pos. Hasil:
    // {kind:'request'|'response', start, end, ...} blok utuh,
    // {kind:'incomplete'} mulai seperti blok tapi belum utuh,
    // {kind:'prefix'} sisa buffer bisa jadi awalan blok,
    // {kind:'none'} bukan awal blok.
    function parseBlockAt(buf, pos) {
      const lineEnd = buf.indexOf('\r\n', pos);
      if (lineEnd === -1) {
        const rest = buf.toString('latin1', pos);
        return { kind: couldBeBlockPrefix(rest) ? 'prefix' : 'none', start: pos };
      }
      const line = buf.toString('latin1', pos, lineEnd);
      if (line.startsWith('HTTP/')) {
        const end = blockEndOf(buf, pos);
        return end === -1 ? { kind: 'incomplete', start: pos } : { kind: 'response', start: pos, end };
      }
      const m = line.match(REQ_LINE_RE);
      if (!m) return { kind: 'none', start: pos };
      const end = blockEndOf(buf, pos);
      if (end === -1) return { kind: 'incomplete', start: pos };
      const head = buf.toString('latin1', pos, end);
      const lines = head.split('\r\n');
      let isCandidate = false, hasKey = false, host = '';
      for (let i = 1; i < lines.length; i++) {
        const L = lines[i];
        if (/^upgrade\s*:/i.test(L)) isCandidate = true;
        else if (/^sec-websocket-key\s*:/i.test(L)) hasKey = true;
        else if (!host) { const hm = L.match(/^host\s*:\s*(.+)$/i); if (hm) host = hm[1].trim(); }
      }
      return {
        kind: 'request', start: pos, end,
        method: m[1], target: m[2], path: pathOf(m[2]),
        isCandidate, hasKey, host,
      };
    }

    // Offset awal blok berikutnya pada/di belakang `from`, -1 bila tidak ada.
    function findBlockStart(buf, from) {
      let best = -1;
      for (const t of METHODS) {
        const i = buf.indexOf(t + ' ', from);
        if (i !== -1 && (best === -1 || i < best)) best = i;
      }
      const h = buf.indexOf('HTTP/', from);
      if (h !== -1 && (best === -1 || h < best)) best = h;
      return best;
    }

    // Buang satu blok mirip response di awal `rest` (blok "HTTP/ 200 OK"
    // palsu dari template injek) bila sudah ter-buffer utuh.
    function stripFakeResponse(rest) {
      if (rest.length >= 5 && rest.toString('latin1', 0, 5) === 'HTTP/') {
        const end = blockEndOf(rest, 0);
        if (end !== -1) return rest.subarray(end);
      }
      return rest;
    }

    return net.createServer((socket) => {
      socket.setNoDelay(true);
      let buf = Buffer.alloc(0);
      let decided = false;
      let graceTimer = null;
      let lastCandidates = [];

      const timer = setTimeout(() => {
        // Timeout total: rangkaian multi-kandidat -> kandidat terakhir,
        // selain itu buang.
        if (!decided && lastCandidates.length >= 2) handoffBlock(lastCandidates[lastCandidates.length - 1]);
        else fail();
      }, TIMEOUT_MS);

      function cleanup() {
        clearTimeout(timer);
        if (graceTimer) { clearTimeout(graceTimer); graceTimer = null; }
        socket.removeListener('data', onData);
        socket.removeListener('error', onGone);
        socket.removeListener('close', onGone);
        socket.removeListener('end', onEnd);
      }
      function fail() {
        if (decided) return;
        decided = true;
        clearTimeout(timer);
        if (graceTimer) { clearTimeout(graceTimer); graceTimer = null; }
        try { socket.destroy(); } catch (_) {}
      }
      function onGone() {
        clearTimeout(timer);
        if (graceTimer) { clearTimeout(graceTimer); graceTimer = null; }
      }
      function onEnd() {
        if (decided) return;
        decide();
        if (!decided) {
          if (lastCandidates.length) handoffBlock(lastCandidates[lastCandidates.length - 1]);
          else fail();
        }
      }

      // Serahkan socket ke HTTP server, stream dimulai dari byte 0 buffer.
      function handoffRaw() {
        if (decided) return;
        decided = true;
        cleanup();
        const rest = buf;
        buf = null;
        if (rest.length) { try { socket.unshift(rest); } catch (_) {} }
        httpServer.emit('connection', socket);
      }

      // Serahkan socket dengan stream dimulai dari blok asli `b`:
      // byte-preserving bila blok membawa Sec-WebSocket-Key, disintesis
      // bersih bila tidak. Satu blok response palsu sesudah blok asli
      // (bila sudah ter-buffer) dibuang.
      function handoffBlock(b) {
        if (decided) return;
        decided = true;
        cleanup();
        const rest = stripFakeResponse(buf.subarray(b.end));
        let out;
        if (b.hasKey) {
          out = Buffer.concat([buf.subarray(b.start, b.end), rest]);
        } else {
          const synth = 'GET ' + b.path + ' HTTP/1.1\r\n' +
            'Host: ' + (b.host || 'localhost') + '\r\n' +
            'Upgrade: websocket\r\n' +
            'Connection: Upgrade\r\n\r\n';
          out = Buffer.concat([Buffer.from(synth, 'latin1'), rest]);
        }
        buf = null;
        if (out.length) { try { socket.unshift(out); } catch (_) {} }
        httpServer.emit('connection', socket);
      }

      function armGrace() {
        if (graceTimer) return;
        graceTimer = setTimeout(() => {
          graceTimer = null;
          if (!decided && lastCandidates.length >= 2) {
            handoffBlock(lastCandidates[lastCandidates.length - 1]);
          }
        }, GRACE_MS);
      }

      function decide() {
        if (decided) return;
        // Request bersih LF-only (tanpa CRLF): serahkan ke parser Node.
        const lf = buf.indexOf('\n');
        if (lf !== -1 && buf.indexOf('\r\n') === -1 &&
            /^[A-Z]+ [^ \n]+ HTTP\/1\.[01]\n$/.test(buf.toString('latin1', 0, lf + 1))) {
          return handoffRaw();
        }

        // Parse rangkaian blok dari awal stream (sampah sebelum blok
        // pertama dilompati; sesudah ada blok, byte bukan-blok dianggap
        // ekor stream / data tunnel).
        const blocks = [];
        let pos = 0;
        let tailStart = -1;
        let needMore = false;
        while (pos < buf.length) {
          const b = parseBlockAt(buf, pos);
          if (b.kind === 'request' || b.kind === 'response') { blocks.push(b); pos = b.end; continue; }
          if (b.kind === 'incomplete' || b.kind === 'prefix') { needMore = true; tailStart = pos; break; }
          // kind 'none'
          if (!blocks.length) {
            const ns = findBlockStart(buf, pos + 1);
            if (ns === -1) { tailStart = pos; break; }
            pos = ns; continue;
          }
          tailStart = pos; break;
        }
        if (pos >= buf.length) tailStart = buf.length;

        const candidates = blocks.filter((b) => b.kind === 'request' && b.isCandidate);
        lastCandidates = candidates;
        const first = blocks[0];

        if (first && first.start === 0 && first.kind === 'request') {
          if (first.hasKey) return handoffRaw(); // WS asli di offset 0
          if (!first.isCandidate && !candidates.length) {
            // Request biasa. Target absolute-form = pola umpan payload:
            // buang bloknya dan lanjut mengendus; selain itu serahkan.
            if (/^https?:\/\//i.test(first.target)) {
              buf = buf.subarray(first.end);
              return decide();
            }
            return handoffRaw(); // HTTP biasa (UI / health / api)
          }
        }

        // Blok asli: kandidat pertama yang path-nya masuk allowlist.
        const allow = candidates.find((c) => ALLOW_PATHS.includes(c.path));
        if (allow) return handoffBlock(allow);
        // Kandidat ber-Sec-WebSocket-Key = handshake WS asli.
        const keyed = candidates.find((c) => c.hasKey);
        if (keyed) return handoffBlock(keyed);
        // Byte non-blok setelah blok terakhir: stream sudah masuk data
        // tunnel -> kandidat terakhir adalah blok aslinya.
        if (candidates.length && tailStart !== -1 && tailStart < buf.length && !needMore) {
          return handoffBlock(candidates[candidates.length - 1]);
        }
        // Rangkaian multi-kandidat yang diam: beri jeda singkat, lalu
        // pakai kandidat terakhir (pola [split] pada template injek).
        if (candidates.length >= 2) armGrace();
        // Selain itu: tunggu data berikutnya / batas scan / timeout.
      }

      function onData(chunk) {
        if (decided) return;
        buf = Buffer.concat([buf, chunk]);
        decide();
        if (!decided && buf.length > MAX_SCAN) {
          if (lastCandidates.length) handoffBlock(lastCandidates[lastCandidates.length - 1]);
          else fail();
        }
      }

      socket.on('data', onData);
      socket.on('error', onGone);
      socket.on('close', onGone);
      socket.on('end', onEnd);
    });
  }

  start(port = process.env.PORT || 3000) {
    const server = http.createServer((req, res) => { this.handleHttpRequest(req, res).catch(() => {}); });
    this.wss = new WebSocket.Server({ noServer: true, perMessageDeflate: false });

    this.wss.on('connection', (ws, req) => {
      let clientIP = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress || '';
      if (clientIP.includes(',')) {
        clientIP = clientIP.split(',')[0].trim();
      }
      ws.remoteRealIP = clientIP;
      this.handleWebSocketConnection(ws, req);
    });

    // Routing upgrade manual: request DENGAN Sec-WebSocket-Key = WebSocket
    // beneran (diteruskan ke library ws); TANPA key = HTTPUpgrade (h2up),
    // handshake 101 dibalas sendiri lalu socket jalan sebagai raw stream.
    server.on('upgrade', (req, socket, head) => {
      const upgradeHeader = (req.headers.upgrade || '').toLowerCase();
      if (upgradeHeader !== 'websocket') { try { socket.destroy(); } catch (_) {} return; }

      if (req.headers['sec-websocket-key']) {
        this.wss.handleUpgrade(req, socket, head, (ws) => this.wss.emit('connection', ws, req));
        return;
      }

      try {
        socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n');
      } catch (_) { try { socket.destroy(); } catch (__) {} return; }

      const adapter = new RawStreamAdapter(socket);
      let clientIP = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress || '';
      if (clientIP.includes(',')) {
        clientIP = clientIP.split(',')[0].trim();
      }
      adapter.remoteRealIP = clientIP;
      this.rawClients.add(adapter);
      adapter.on('close', () => this.rawClients.delete(adapter));
      if (head && head.length) { try { socket.unshift(head); } catch (_) {} }
      this.handleWebSocketConnection(adapter, req);
    });
    
    const onListening = () => {
      this.httpServer = server;
      // Otomatis spawn cloudflared begitu HTTP server listening
      this.startCloudflared(port);
    };

    if (this.payloadEnhanced) {
      // Mode payload enhanced: HTTP server TIDAK listen langsung; front-end
      // TCP mentah yang listen di port eksternal dan menyerahkan socket
      // bersih ke HTTP server lewat emit('connection').
      this.frontServer = this.createPayloadFrontend(server);
      this.frontServer.listen(port, '0.0.0.0', onListening);
    } else {
      server.listen(port, '0.0.0.0', onListening);
    }
  }
}

if (require.main === module) {
  const server = new GatewayServer();
  const port = process.env.PORT || 3000;
  server.start(port);
}

module.exports = GatewayServer;
