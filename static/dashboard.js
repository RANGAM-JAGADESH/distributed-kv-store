// ==========================================
//  HEARTBEAT LINES  (SVG, edge-to-edge)
// ==========================================

function drawHeartbeatLines() {

    var topo = document.getElementById("topology");
    var n1   = document.getElementById("top-node1");
    var n2   = document.getElementById("top-node2");
    var n3   = document.getElementById("top-node3");
    var svg  = document.getElementById("hb-svg");

    if (!topo || !n1 || !n2 || !n3 || !svg) return;

    var NS = "http://www.w3.org/2000/svg";
    var XL = "http://www.w3.org/1999/xlink";

    function center(el) {
        var pr = topo.getBoundingClientRect();
        var er = el.getBoundingClientRect();
        return {
            x: er.left - pr.left + er.width  / 2,
            y: er.top  - pr.top  + er.height / 2
        };
    }

    function offsetPoint(from, to, offset) {
        var dx  = to.x - from.x;
        var dy  = to.y - from.y;
        var len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return from;
        return {
            x: from.x + (dx / len) * offset,
            y: from.y + (dy / len) * offset
        };
    }

    // Clear everything except <defs>
    Array.from(svg.children).forEach(function (child) {
        if (child.tagName.toLowerCase() !== "defs") svg.removeChild(child);
    });

    var c1 = center(n1);
    var c2 = center(n2);
    var c3 = center(n3);
    var EDGE = 80;   // half node width (70) + gap

    function makeLine(fromC, toC, pathId, delay) {

        var from = offsetPoint(fromC, toC, EDGE);
        var to   = offsetPoint(toC, fromC, EDGE);

        // Track
        var track = document.createElementNS(NS, "line");
        track.setAttribute("x1", from.x); track.setAttribute("y1", from.y);
        track.setAttribute("x2", to.x);   track.setAttribute("y2", to.y);
        track.setAttribute("stroke", "#444");
        track.setAttribute("stroke-width", "4");
        track.setAttribute("stroke-linecap", "round");
        svg.appendChild(track);

        // Motion path (hidden)
        var path = document.createElementNS(NS, "path");
        path.setAttribute("id", pathId);
        path.setAttribute("d",
            "M" + from.x + "," + from.y + " L" + to.x + "," + to.y);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "none");
        svg.appendChild(path);

        // Glow dot
        var dot = document.createElementNS(NS, "circle");
        dot.setAttribute("r",    "10");
        dot.setAttribute("fill", "url(#pglow)");

        var anim = document.createElementNS(NS, "animateMotion");
        anim.setAttribute("dur",         "1.5s");
        anim.setAttribute("begin",       delay + "s");
        anim.setAttribute("repeatCount", "indefinite");

        var mpath = document.createElementNS(NS, "mpath");
        mpath.setAttributeNS(XL, "href", "#" + pathId);

        anim.appendChild(mpath);
        dot.appendChild(anim);
        svg.appendChild(dot);
    }

    makeLine(c1, c2, "path-n1-n2", 0);
    makeLine(c1, c3, "path-n1-n3", 0.75);
}

window.addEventListener("load",   function () { setTimeout(drawHeartbeatLines, 150); });
window.addEventListener("resize", drawHeartbeatLines);


// ==========================================
//  CLUSTER HEALTH
// ==========================================

// Track per-node online state
var nodeOnline = { node1: false, node2: false, node3: false };

async function checkNode(url, nodeId, statusId) {
    try {
        await fetch(url);
        nodeOnline[nodeId] = true;
        document.getElementById(nodeId).classList.remove("offline");
        document.getElementById(nodeId).classList.add("online");
        document.getElementById(statusId).innerText = "🟢 ONLINE";
    }
    catch {
        nodeOnline[nodeId] = false;
        document.getElementById(nodeId).classList.remove("online");
        document.getElementById(nodeId).classList.add("offline");
        document.getElementById(statusId).innerText = "🔴 OFFLINE";
    }
}

function updateHealthBar() {

    var online = Object.values(nodeOnline).filter(Boolean).length;
    var total  = Object.keys(nodeOnline).length;
    var pct    = Math.round((online / total) * 100);

    var label   = document.getElementById("healthLabel");
    var bar     = document.getElementById("healthBar");
    var percent = document.getElementById("healthPercent");

    if (!label || !bar || !percent) return;

    label.innerText   = online + "/" + total + " nodes online";
    percent.innerText = pct + "%";
    bar.style.width   = pct + "%";

    bar.classList.remove("warn", "crit");
    if (pct <= 33)      bar.classList.add("crit");
    else if (pct <= 66) bar.classList.add("warn");

    percent.style.color =
        pct === 100 ? "#00ff88" :
        pct  >= 66  ? "#f39c12" : "#e74c3c";
}


// ==========================================
//  EVENT CARDS
// ==========================================

// Track IDs we have already rendered to avoid duplicates
var renderedEvents = new Set();

function classForEvent(msg) {
    if (msg.includes("Leader") || msg.includes("👑")) return "leader-event";
    if (msg.includes("Offline") || msg.includes("❌"))  return "offline-event";
    if (msg.includes("Committed") || msg.includes("✅")) return "commit-event";
    return "";
}

function renderEvents(events) {

    var container = document.getElementById("events");
    if (!container) return;

    events.forEach(function (ev) {

        // Build a unique key per event
        var key = ev.time + "|" + ev.message;
        if (renderedEvents.has(key)) return;
        renderedEvents.add(key);

        var card = document.createElement("div");
        card.className = "event-card " + classForEvent(ev.message);

        var timeSpan = document.createElement("span");
        timeSpan.className   = "event-time";
        timeSpan.textContent = ev.time;

        var msgSpan = document.createElement("span");
        msgSpan.className   = "event-msg";
        msgSpan.textContent = ev.message;

        card.appendChild(timeSpan);
        card.appendChild(msgSpan);

        // Insert newest at top
        container.insertBefore(card, container.firstChild);
    });
}


// ==========================================
//  DASHBOARD REFRESH
// ==========================================

async function refreshDashboard() {

    // --- Leader + Role ---
    try {
        var leaderData = await fetch("/leader").then(function (r) { return r.json(); });

        document.getElementById("leader").innerText =
            "Leader: " + leaderData.leader;
        document.getElementById("role").innerText =
            "Role: " + leaderData.role;

        // Highlight in cluster row
        ["node1", "node2", "node3"].forEach(function (id) {
            document.getElementById(id).classList.remove("leader");
        });
        if (leaderData.leader && document.getElementById(leaderData.leader)) {
            document.getElementById(leaderData.leader).classList.add("leader");
        }

        // Highlight in topology
        ["top-node1", "top-node2", "top-node3"].forEach(function (id) {
            document.getElementById(id).classList.remove("leader");
        });
        var topId = "top-" + leaderData.leader;
        if (leaderData.leader && document.getElementById(topId)) {
            document.getElementById(topId).classList.add("leader");
        }
    }
    catch (e) { console.log("Leader error:", e); }


    // --- Commit Index ---
    try {
        var commitData = await fetch("/commit_index").then(function (r) { return r.json(); });
        document.getElementById("commit-index").innerText = commitData.commit_index;
    }
    catch (e) { console.log("Commit index error:", e); }


    // --- Metrics + Counters ---
    try {
        var m = await fetch("/metrics").then(function (r) { return r.json(); });

        setText("totalLogs",      m.total_logs);
        setText("committedLogs",  m.committed_logs);
        setText("pendingLogs",    m.pending_logs);
        setText("commitIndex",    m.commit_index);
        setText("heartbeatCount", m.heartbeats);
        setText("electionCount",  m.elections);
    }
    catch (e) { console.log("Metrics error:", e); }


    // --- Events ---
    try {
        var events = await fetch("/events").then(function (r) { return r.json(); });
        renderEvents(events);
    }
    catch (e) { console.log("Events error:", e); }


    // --- Logs ---
    try {
        var logs = await fetch("/logs").then(function (r) { return r.json(); });
        document.getElementById("logs").innerText = JSON.stringify(logs, null, 2);
    }
    catch (e) { console.log("Logs error:", e); }


    // --- Node health (parallel) ---
    await Promise.all([
        checkNode("http://127.0.0.1:8000/health", "node1", "status1"),
        checkNode("http://127.0.0.1:8001/health", "node2", "status2"),
        checkNode("http://127.0.0.1:8002/health", "node3", "status3")
    ]);

    updateHealthBar();
}


// Helper: safely set innerText
function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.innerText = (value !== undefined && value !== null) ? value : "0";
}


// Boot
refreshDashboard();
setInterval(refreshDashboard, 2000);