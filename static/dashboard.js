// ══════════════════════════════════════════════════════════════
//  DISTRIBUTED KV STORE — PRODUCTION DASHBOARD
//  Phase 8  |  All 12 Features
// ══════════════════════════════════════════════════════════════

// ── Cluster State ────────────────────────────────────────────
var S = {
    leader:        null,   // current leader node id e.g. "node1"
    prevLeader:    null,   // last known leader (detect changes)
    leaderChanges: 0,
    nodeOnline:    { node1: null, node2: null, node3: null },
    metrics:       { heartbeats: 0, elections: 0 },
    paused:        false,
    activeFilter:  "all",
    eventCount:    0,
    seenEvents:    new Set(),
    prevHB:        0,      // previous heartbeat count (to trigger beat)
};

var NODE_PORTS = { node1: 8000, node2: 8001, node3: 8002 };
var TOPO_ID    = { node1: "top-node1", node2: "top-node2", node3: "top-node3" };


// ══════════════════════════════════════════════════════════════
//  CLOCK
// ══════════════════════════════════════════════════════════════

function tickClock() {
    var el = document.getElementById("headerTime");
    if (el) el.textContent = new Date().toTimeString().slice(0, 8);
}
setInterval(tickClock, 1000);
tickClock();


// ══════════════════════════════════════════════════════════════
//  SVG HEARTBEAT LINES
//  Redrawn every refresh.
//  Rules:
//   • Leader online  → leader ↔ each online follower: green pulse dot
//   • No leader / election → follower ↔ follower: orange pulse dot
//   • Node offline   → lines to it: dim, no dot
// ══════════════════════════════════════════════════════════════

function drawHeartbeatLines() {
    var topo = document.getElementById("topology");
    var svg  = document.getElementById("hb-svg");
    if (!topo || !svg) return;

    var NS = "http://www.w3.org/2000/svg";
    var XL = "http://www.w3.org/1999/xlink";

    // Clear everything except <defs>
    Array.from(svg.children).forEach(function (c) {
        if (c.tagName.toLowerCase() !== "defs") svg.removeChild(c);
    });

    function center(el) {
        var pr = topo.getBoundingClientRect();
        var er = el.getBoundingClientRect();
        return { x: er.left - pr.left + er.width / 2, y: er.top - pr.top + er.height / 2 };
    }

    function pull(from, to, px) {
        var dx = to.x - from.x, dy = to.y - from.y;
        var len = Math.sqrt(dx * dx + dy * dy);
        if (!len) return from;
        return { x: from.x + dx / len * px, y: from.y + dy / len * px };
    }

    function makePair(idA, idB, delay) {
        var elA = document.getElementById(TOPO_ID[idA]);
        var elB = document.getElementById(TOPO_ID[idB]);
        if (!elA || !elB) return;

        var cA = center(elA), cB = center(elB);
        var from = pull(cA, cB, 72);
        var to   = pull(cB, cA, 72);

        var onA = S.nodeOnline[idA] === true;
        var onB = S.nodeOnline[idB] === true;

        // Is this a leader↔follower pair that should carry heartbeat?
        var leaderHB = S.leader && (idA === S.leader || idB === S.leader) && onA && onB;
        // Is this an election peer line (no leader, both online)?
        var electionLine = !S.leader && onA && onB;

        var active    = leaderHB || electionLine;
        var glowRef   = electionLine && !leaderHB ? "glow-orange" : "glow-green";
        var trackColor = active ? (electionLine ? "#3a2800" : "#1a3040") : "#141a26";

        // Track line
        var line = document.createElementNS(NS, "line");
        line.setAttribute("x1", from.x); line.setAttribute("y1", from.y);
        line.setAttribute("x2", to.x);   line.setAttribute("y2", to.y);
        line.setAttribute("stroke", trackColor);
        line.setAttribute("stroke-width", active ? "3" : "2");
        line.setAttribute("stroke-linecap", "round");
        if (active) line.setAttribute("filter", "url(#line-glow)");
        svg.appendChild(line);

        if (!active) return;

        // Motion path
        var pid  = "p-" + idA + "-" + idB;
        var path = document.createElementNS(NS, "path");
        path.setAttribute("id", pid);
        path.setAttribute("d", "M" + from.x + "," + from.y + " L" + to.x + "," + to.y);
        path.setAttribute("fill", "none"); path.setAttribute("stroke", "none");
        svg.appendChild(path);

        // Glow dot
        var dot = document.createElementNS(NS, "circle");
        dot.setAttribute("r", "9");
        dot.setAttribute("fill", "url(#" + glowRef + ")");

        var anim = document.createElementNS(NS, "animateMotion");
        anim.setAttribute("dur", "1.6s");
        anim.setAttribute("begin", delay.toFixed(2) + "s");
        anim.setAttribute("repeatCount", "indefinite");

        var mp = document.createElementNS(NS, "mpath");
        mp.setAttributeNS(XL, "href", "#" + pid);
        anim.appendChild(mp);
        dot.appendChild(anim);
        svg.appendChild(dot);
    }

    var delay = 0;
    var pairs = [["node1","node2"], ["node1","node3"], ["node2","node3"]];
    pairs.forEach(function (p) { makePair(p[0], p[1], delay); delay += 0.45; });
}

window.addEventListener("load",   function () { setTimeout(drawHeartbeatLines, 200); });
window.addEventListener("resize", drawHeartbeatLines);


// ══════════════════════════════════════════════════════════════
//  TOPOLOGY NODE  ←  update visuals
// ══════════════════════════════════════════════════════════════

function updateTopoNode(nodeId, isLeader, isOnline) {
    var el     = document.getElementById(TOPO_ID[nodeId]);
    var crown  = document.getElementById("crown-"  + nodeId);
    var ring   = document.getElementById("ring-"   + nodeId);
    var badge  = document.getElementById("badge-"  + nodeId);
    if (!el) return;

    // Remove all state classes
    el.classList.remove("topo-leader", "topo-crashed");

    if (isOnline === false) {
        // CRASHED
        el.classList.add("topo-crashed");
        if (crown) crown.classList.add("hidden");
        if (ring)  ring.classList.add("hidden");
        if (badge) { badge.className = "topo-badge offline-badge"; badge.textContent = "OFFLINE"; }
    } else if (isLeader) {
        // LEADER
        el.classList.add("topo-leader");
        if (crown) {
            crown.classList.remove("hidden");
            crown.classList.remove("popping");
            void crown.offsetWidth;
            crown.classList.add("popping");
        }
        if (ring) ring.classList.remove("hidden");
        if (badge) { badge.className = "topo-badge"; badge.textContent = "LEADER"; }
    } else {
        // FOLLOWER
        if (crown) crown.classList.add("hidden");
        if (ring)  ring.classList.add("hidden");
        if (badge) { badge.className = "topo-badge follower"; badge.textContent = "FOLLOWER"; }
    }
}

function shakeTopo(nodeId) {
    var el = document.getElementById(TOPO_ID[nodeId]);
    if (!el) return;
    el.classList.remove("shaking");
    void el.offsetWidth;
    el.classList.add("shaking");
    setTimeout(function () { el.classList.remove("shaking"); }, 600);
}


// ══════════════════════════════════════════════════════════════
//  CIRCULAR HEALTH GAUGE
// ══════════════════════════════════════════════════════════════

function updateGauge(online, total) {
    var pct    = total ? Math.round(online / total * 100) : 0;
    var circle = document.getElementById("gaugeFill");
    var pctEl  = document.getElementById("gaugePct");
    var subEl  = document.getElementById("gaugeSub");

    // Circumference for r=90: 2π×90 ≈ 565.49
    var circ = 2 * Math.PI * 90;
    if (circle) circle.setAttribute("stroke-dashoffset", (circ - pct / 100 * circ).toFixed(2));

    if (pctEl) {
        pctEl.textContent = pct + "%";
        pctEl.className = "gauge-pct" + (pct <= 33 ? " crit" : pct < 100 ? " warn" : "");
    }
    if (subEl) subEl.textContent = online + " / " + total + " online";

    if (circle) {
        circle.classList.remove("warn", "crit");
        if (pct <= 33)      circle.classList.add("crit");
        else if (pct < 100) circle.classList.add("warn");
    }

    // Linear bar
    var bar = document.getElementById("healthBarFill");
    if (bar) {
        bar.style.width = pct + "%";
        bar.className = "health-bar-fill" + (pct <= 33 ? " crit" : pct < 100 ? " warn" : "");
    }

    // Health pill
    setText("healthPillVal", online + "/" + total + " · " + pct + "%");
}


// ══════════════════════════════════════════════════════════════
//  METRIC CARDS
// ══════════════════════════════════════════════════════════════

var _prev = {};

function setMetric(id, value, maxValue) {
    var el = document.getElementById("m-" + id);
    if (!el) return;
    var v = (value !== null && value !== undefined) ? value : 0;
    var vStr = String(v);
    if (_prev[id] !== vStr) {
        el.textContent = vStr;
        el.classList.remove("popped");
        void el.offsetWidth;
        el.classList.add("popped");

        // Trend arrow
        var trend = document.getElementById("trend-" + id);
        if (trend && _prev[id] !== undefined) {
            var old = Number(_prev[id]), cur = Number(v);
            trend.textContent = cur > old ? "▲" : cur < old ? "▼" : "";
            trend.style.color = cur > old ? "var(--green)" : "var(--red)";
        }
        _prev[id] = vStr;
    }

    // Mini bar
    var bar = document.getElementById("bar-" + id);
    if (bar && maxValue && maxValue > 0) {
        bar.style.width = Math.min(100, Math.round(v / maxValue * 100)) + "%";
    }
}


// ══════════════════════════════════════════════════════════════
//  RAFT STATS PANEL
// ══════════════════════════════════════════════════════════════

function updateRaftPanel(m, onlineCount) {
    var eff = m.total_logs > 0
        ? Math.round(m.committed_logs / m.total_logs * 100) + "%"
        : "—";

    setText("r-leader",      m.leader  || "none");
    setText("r-role",        m.role    || "—");
    setText("r-commit",      m.commit_index);
    setText("r-total",       m.total_logs);
    setText("r-committed",   m.committed_logs);
    setText("r-pending",     m.pending_logs);
    setText("r-elections",   m.elections);
    setText("r-leaderChanges", S.leaderChanges);
    setText("r-eff",         eff);

    // Heartbeat with beat animation
    var hbEl = document.getElementById("r-hb");
    if (hbEl) {
        var newHB = String(m.heartbeats || 0);
        if (hbEl.textContent !== newHB) {
            hbEl.textContent = newHB;
            hbEl.classList.remove("beating");
            void hbEl.offsetWidth;
            hbEl.classList.add("beating");
        }
    }
}


// ══════════════════════════════════════════════════════════════
//  NODE STATUS CARDS
// ══════════════════════════════════════════════════════════════

async function checkNode(nodeId) {
    var port = NODE_PORTS[nodeId];
    var url  = "http://127.0.0.1:" + port + "/health";
    var wasOnline = S.nodeOnline[nodeId];

    var card   = document.getElementById("card-" + nodeId);
    var dot    = document.getElementById("dot-"  + nodeId);
    var status = document.getElementById("ncs-"  + nodeId);
    var role   = document.getElementById("ncr-"  + nodeId);
    var lbadge = document.getElementById("lbadge-" + nodeId);

    try {
        var resp = await fetch(url, { signal: AbortSignal.timeout(1500) });
        await resp.json();

        if (wasOnline === false) {
            injectLocalEvent("🟢 " + nodeId + " Back Online", "recovery");
        }
        S.nodeOnline[nodeId] = true;

        if (card)   { card.classList.remove("nc-offline"); card.classList.add("nc-online"); }
        if (dot)    { dot.className = "nc-dot dot-online"; }
        if (status) { status.textContent = "ONLINE"; status.className = "nc-status s-online"; }
    }
    catch {
        if (wasOnline === true) {
            // Just crashed
            shakeTopo(nodeId);
            if (card) { card.classList.remove("flash-crash"); void card.offsetWidth; card.classList.add("flash-crash"); }
            injectLocalEvent("❌ " + nodeId + " Crashed / Unreachable", "crash");
        }
        S.nodeOnline[nodeId] = false;

        if (card)   { card.classList.remove("nc-online"); card.classList.add("nc-offline"); }
        if (dot)    { dot.className = "nc-dot dot-offline"; }
        if (status) { status.textContent = "OFFLINE"; status.className = "nc-status s-offline"; }
        if (role)   role.textContent = "—";
        if (lbadge) lbadge.classList.add("hidden");
    }
}

function updateNodeRoles(leaderId) {
    ["node1", "node2", "node3"].forEach(function (nid) {
        var role   = document.getElementById("ncr-"    + nid);
        var lbadge = document.getElementById("lbadge-" + nid);
        var card   = document.getElementById("card-"   + nid);
        if (S.nodeOnline[nid] === false) return;

        var isLeader = nid === leaderId;
        if (role)   role.textContent = isLeader ? "LEADER" : "FOLLOWER";
        if (card)   {
            card.classList.toggle("nc-leader", isLeader);
        }
        if (lbadge) lbadge.classList.toggle("hidden", !isLeader);
    });
}


// ══════════════════════════════════════════════════════════════
//  HEARTBEAT STATUS BAR
// ══════════════════════════════════════════════════════════════

function updateHBBar(leaderOnline, hasLeader) {
    var dot  = document.getElementById("hbDot");
    var text = document.getElementById("hbStatusText");
    if (!dot || !text) return;

    if (!hasLeader) {
        dot.className  = "hb-dot orange";
        text.textContent = "⚡ Election in Progress...";
    } else if (!leaderOnline) {
        dot.className  = "hb-dot red";
        text.textContent = "💔 Heartbeat Lost — Leader Offline";
    } else {
        dot.className  = "hb-dot green";
        text.textContent = "💓 Heartbeat Active — " + S.leader + " is leader";
    }
}


// ══════════════════════════════════════════════════════════════
//  EVENT STREAM
// ══════════════════════════════════════════════════════════════

function eventCategory(msg) {
    if (msg.includes("👑") || msg.toLowerCase().includes("leader elected") || msg.toLowerCase().includes("leader changed"))
        return "leader";
    if (msg.includes("🗳️") || msg.includes("🗳") || msg.toLowerCase().includes("election") || msg.toLowerCase().includes("vote"))
        return "election";
    if (msg.includes("❌") || msg.toLowerCase().includes("crash") || msg.toLowerCase().includes("offline") || msg.toLowerCase().includes("unreachable"))
        return "crash";
    if (msg.includes("💓") || msg.toLowerCase().includes("heartbeat"))
        return "heartbeat";
    if (msg.includes("📦") || msg.toLowerCase().includes("replicated") || msg.toLowerCase().includes("synced"))
        return "replication";
    if (msg.includes("✅") || msg.toLowerCase().includes("committed"))
        return "commit";
    if (msg.includes("🔄") || msg.toLowerCase().includes("recovery") || msg.includes("🟢"))
        return "recovery";
    return "other";
}

function evAnimClass(cat) {
    return (cat === "leader" || cat === "crash" || cat === "election") ? "ev-slide" : "ev-fade";
}

function evColorClass(cat) {
    var map = {
        leader: "ev-leader", election: "ev-election", crash: "ev-crash",
        heartbeat: "ev-heartbeat", replication: "ev-replication",
        commit: "ev-commit", recovery: "ev-recovery", vote: "ev-vote"
    };
    return map[cat] || "";
}

function renderEvents(events) {
    if (S.paused) return;

    var container = document.getElementById("events");
    if (!container) return;

    events.forEach(function (ev) {
        var key = ev.time + "|" + ev.message;
        if (S.seenEvents.has(key)) return;
        S.seenEvents.add(key);
        S.eventCount++;

        var cat  = eventCategory(ev.message);
        var card = document.createElement("div");
        card.className = "event-card " + evColorClass(cat) + " " + evAnimClass(cat);
        card.dataset.category = cat;

        // Apply current filter
        if (S.activeFilter !== "all" && cat !== S.activeFilter) {
            card.classList.add("ev-hidden");
        }

        var tSpan = document.createElement("span");
        tSpan.className   = "ev-time";
        tSpan.textContent = ev.time;

        var mSpan = document.createElement("span");
        mSpan.className   = "ev-msg";
        mSpan.textContent = ev.message;

        card.appendChild(tSpan);
        card.appendChild(mSpan);
        container.insertBefore(card, container.firstChild);

        // Trim to 50 visible cards
        var all = container.querySelectorAll(".event-card");
        if (all.length > 50) all[all.length - 1].remove();
    });

    var badge = document.getElementById("eventBadge");
    if (badge) badge.textContent = S.eventCount + " events";
}

function injectLocalEvent(msg, cat) {
    var now = new Date().toTimeString().slice(0, 8);
    renderEvents([{ time: now, message: msg }]);
}

function clearEvents() {
    var container = document.getElementById("events");
    if (container) container.innerHTML = "";
    S.seenEvents.clear();
    S.eventCount = 0;
    var badge = document.getElementById("eventBadge");
    if (badge) badge.textContent = "0 events";
}

function togglePause() {
    S.paused = !S.paused;
    var btn = document.getElementById("pauseBtn");
    if (btn) btn.textContent = S.paused ? "▶ Resume" : "⏸ Pause";
}

function setFilter(btn, filter) {
    S.activeFilter = filter;
    document.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");

    // Show/hide existing cards
    document.querySelectorAll(".event-card").forEach(function (c) {
        if (filter === "all" || c.dataset.category === filter) {
            c.classList.remove("ev-hidden");
        } else {
            c.classList.add("ev-hidden");
        }
    });
}


// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════

function setText(id, v) {
    var el = document.getElementById(id);
    if (el) el.textContent = (v !== null && v !== undefined) ? String(v) : "—";
}


// ══════════════════════════════════════════════════════════════
//  MAIN REFRESH  (every 2s)
// ══════════════════════════════════════════════════════════════

async function refreshDashboard() {

    // 1 ── Health checks (parallel) ──────────────────────────
    await Promise.all(
        Object.keys(NODE_PORTS).map(function (id) { return checkNode(id); })
    );

    var onlineCount = Object.values(S.nodeOnline).filter(function (v) { return v === true; }).length;

    // 2 ── Leader + Role ─────────────────────────────────────
    try {
        var ld = await fetch("/leader").then(function (r) { return r.json(); });
        var newLeader = ld.leader || null;

        // Detect leader change
        if (newLeader !== S.leader) {
            if (S.leader !== null && newLeader) {
                S.leaderChanges++;
                injectLocalEvent("👑 Leader Changed: " + S.leader + " → " + newLeader, "leader");
            }
            S.prevLeader = S.leader;
            S.leader     = newLeader;
        }

        // Topology: update all 3 nodes
        Object.keys(TOPO_ID).forEach(function (nid) {
            updateTopoNode(nid, nid === newLeader, S.nodeOnline[nid]);
        });

        // Node cards roles
        updateNodeRoles(newLeader);

        // Pills
        setText("leaderVal", newLeader || "none");
        setText("roleVal",   ld.role   || "—");
    }
    catch (e) { console.log("Leader:", e); }

    // 3 ── Heartbeat status bar ──────────────────────────────
    var leaderOnline = S.leader ? S.nodeOnline[S.leader] === true : false;
    updateHBBar(leaderOnline, !!S.leader);

    // 4 ── Metrics ───────────────────────────────────────────
    try {
        var m = await fetch("/metrics").then(function (r) { return r.json(); });
        S.metrics = m;

        var maxLogs = Math.max(m.total_logs, 1);

        setMetric("totalLogs",  m.total_logs,     maxLogs);
        setMetric("committed",  m.committed_logs,  maxLogs);
        setMetric("pending",    m.pending_logs,     maxLogs);
        setMetric("commitIdx",  m.commit_index,     maxLogs);
        setMetric("heartbeats", m.heartbeats || 0, null);
        setMetric("elections",  m.elections  || 0, null);

        setText("commitVal", m.commit_index);

        updateRaftPanel(m, onlineCount);
    }
    catch (e) { console.log("Metrics:", e); }

    // 5 ── Gauge ─────────────────────────────────────────────
    updateGauge(onlineCount, 3);

    // 6 ── Events ────────────────────────────────────────────
    try {
        var events = await fetch("/events").then(function (r) { return r.json(); });
        renderEvents(events);
    }
    catch (e) { console.log("Events:", e); }

    // 7 ── Logs ──────────────────────────────────────────────
    try {
        var logs   = await fetch("/logs").then(function (r) { return r.json(); });
        var logsEl = document.getElementById("logs");
        if (logsEl) logsEl.textContent = JSON.stringify(logs, null, 2);
    }
    catch (e) { console.log("Logs:", e); }

    // 8 ── Redraw SVG lines ──────────────────────────────────
    drawHeartbeatLines();
}


// ══════════════════════════════════════════════════════════════
//  BOOT
// ══════════════════════════════════════════════════════════════

refreshDashboard();
setInterval(refreshDashboard, 2000);