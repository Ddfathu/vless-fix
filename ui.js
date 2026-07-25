// ============================================
// DDFATHUVLES GATEWAY - BLUE CYBERPUNK UI TEMPLATE
// REAL-TIME IP MONITORING LIST ADDED
// Terpisah agar Aman dan Mudah Diedit Modifikasi
// ============================================

function generateUI(currentHost, uptime, onlineClients, totalVisits, ipList = [], visitorIP = '') {
  // Generate HTML untuk daftar IP aktif
  let ipListHTML = '';
  if (ipList.length === 0) {
    // Jika tidak ada koneksi VPN tapi lu lagi buka web, tampilin IP lu sendiri
    ipListHTML = `<div class="text-[11px] text-blue-400/70 py-1 font-mono">● ${visitorIP || '127.0.0.1'} <span class="text-emerald-400 font-bold">(You)</span></div>`;
  } else {
    ipList.forEach(ip => {
      const isMe = (ip === visitorIP) ? '<span class="text-emerald-400 font-bold">(You)</span>' : '';
      ipListHTML += `<div class="text-[11px] text-blue-300 py-0.5 font-mono tracking-wider border-b border-blue-950/30 last:border-none">● ${ip} ${isMe}</div>`;
    });
  }

  return `<!DOCTYPE html>
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
          <p class="text-[11px] text-emerald-300 font-bold tracking-widest">ONLINE CLIENTS: <span id="online-count" class="text-white">${onlineClients}</span> ORG</p>
        </div>
        <div class="flex justify-center items-center gap-1.5">
          <p class="text-[10px] text-blue-400 font-bold tracking-widest">📋 TOTAL HISTORY HITS: <span class="text-yellow-400 font-mono">${totalVisits}x</span> DIKUNJUNGI</p>
        </div>
      </div>
    </div>

    <!-- LIVE CONNECTED IP LIST BOX -->
    <div class="card-blue p-3 rounded-xl">
      <p class="text-[9px] text-blue-400 font-bold tracking-wider mb-1.5 uppercase">🌐 Active Connected IP Addresses</p>
      <div class="bg-[#040610] rounded-lg p-2 max-h-24 overflow-y-auto border border-blue-950 space-y-0.5">
        ${ipListHTML}
      </div>
    </div>

    <!-- METRICS GRID -->
    <div class="grid grid-cols-2 gap-3">
      <div class="card-blue p-4 rounded-xl relative overflow-hidden">
        <p class="text-[10px] text-blue-400 font-bold tracking-wider">CPU USAGE</p>
        <p id="cpu-val" class="text-2xl font-bold text-white mt-1">8.5%</p>
        <div class="absolute bottom-0 left-0 h-1 bg-blue-500 w-1/3"></div>
      </div>
      <div class="card-blue p-4 rounded-xl relative overflow-hidden">
        <p class="text-[10px] text-blue-400 font-bold tracking-wider">RAM ALLOC</p>
        <p id="ram-val" class="text-2xl font-bold text-white mt-1">23.6%</p>
        <div class="absolute bottom-0 left-0 h-1 bg-indigo-500 w-1/2"></div>
      </div>
    </div>

    <!-- TRAFFIC METRICS -->
    <div class="grid grid-cols-2 gap-3">
      <div class="card-blue p-4 rounded-xl">
        <p class="text-[10px] text-blue-400 font-bold tracking-wider">DOWNLOAD</p>
        <p id="dl-total" class="text-xl font-bold text-white mt-1">128.4 MB</p>
        <p id="dl-speed" class="text-[11px] text-emerald-400 font-bold mt-0.5">181.0 KB/s</p>
      </div>
      <div class="card-blue p-4 rounded-xl">
        <p class="text-[10px] text-blue-400 font-bold tracking-wider">UPLOAD</p>
        <p id="ul-total" class="text-xl font-bold text-white mt-1">96.2 MB</p>
        <p id="ul-speed" class="text-[11px] text-blue-400 font-bold mt-0.5">226.22 KB/s</p>
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

      <!-- KOLOM INPUT BUG HOST KHUSUS -->
      <div>
        <label class="text-[10px] text-blue-400 font-bold block mb-1">BUG HOST (SNI / CDN)</label>
        <input id="bugInput" type="text" value="sony.line.me" class="w-full bg-[#060917] border border-blue-900 rounded p-1.5 text-white font-mono focus:outline-none focus:border-blue-500">
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
      document.getElementById('cpu-val').innerText = (Math.random() * 2 + 7.5).toFixed(1) + '%';
      document.getElementById('ram-val').innerText = (Math.random() * 1 + 23.1).toFixed(1) + '%';
      let dlSpd = Math.random() * 100 + 100;
      let ulSpd = Math.random() * 150 + 100;
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
      if(event) event.target.classList.add('btn-active');
      
      const uuid = document.getElementById('uuidInput').value.trim();
      const host = document.getElementById('hostInput').value.trim();
      const bugHost = document.getElementById('bugInput').value.trim();
      const area = document.getElementById('output-area');
      const label = document.getElementById('out-type');
      const txt = document.getElementById('configText');

      let sniBug = type === 'sni' ? bugHost : host;
      let pathBug = type === 'cdn' ? '/' + bugHost : '/DIREK';
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
</html>`;
}

module.exports = { generateUI };
