// =========================
//  HEARTBEAT LINES (SVG)
//  Lines run edge-to-edge between nodes,
//  not center-to-center, so they never
//  appear drawn on top of the node boxes.
// =========================

function drawHeartbeatLines() {

    const topo = document.getElementById("topology");
    const n1   = document.getElementById("top-node1");
    const n2   = document.getElementById("top-node2");
    const n3   = document.getElementById("top-node3");
    const svg  = document.getElementById("hb-svg");

    const NS = "http://www.w3.org/2000/svg";
    const XL = "http://www.w3.org/1999/xlink";

    // Get center of an element relative to the topology container
    function center(el) {
        const pr = topo.getBoundingClientRect();
        const er = el.getBoundingClientRect();
        return {
            x: er.left - pr.left + er.width  / 2,
            y: er.top  - pr.top  + er.height / 2
        };
    }

    // Move a point from 'from' toward 'to' by 'offset' pixels
    // Used to pull line endpoints back to the node edge
    function offsetPoint(from, to, offset) {
        var dx  = to.x - from.x;
        var dy  = to.y - from.y;
        var len = Math.sqrt(dx * dx + dy * dy);
        return {
            x: from.x + (dx / len) * offset,
            y: from.y + (dy / len) * offset
        };
    }

    // Remove all children except <defs>
    Array.from(svg.children).forEach(function(child) {
        if (child.tagName !== "defs") {
            svg.removeChild(child);
        }
    });

    var c1 = center(n1);
    var c2 = center(n2);
    var c3 = center(n3);

    // Half the node size (140px) + a small gap so the line
    // starts/ends just outside the node border
    var EDGE_OFFSET = 80;

    // Draw one track line + animated glow dot between two node edges
    function makeLine(fromCenter, toCenter, pathId, delaySeconds) {

        // Pull both endpoints inward by EDGE_OFFSET so the line
        // starts at the edge of fromCenter's node and ends at
        // the edge of toCenter's node — never inside either box
        var from = offsetPoint(fromCenter, toCenter, EDGE_OFFSET);
        var to   = offsetPoint(toCenter, fromCenter, EDGE_OFFSET);

        // Static grey track
        var track = document.createElementNS(NS, "line");
        track.setAttribute("x1", from.x);
        track.setAttribute("y1", from.y);
        track.setAttribute("x2", to.x);
        track.setAttribute("y2", to.y);
        track.setAttribute("stroke", "#444");
        track.setAttribute("stroke-width", "4");
        track.setAttribute("stroke-linecap", "round");
        svg.appendChild(track);

        // Hidden motion path (dot travels from node1-edge to target-edge)
        var path = document.createElementNS(NS, "path");
        path.setAttribute("id", pathId);
        path.setAttribute("d", "M" + from.x + "," + from.y + " L" + to.x + "," + to.y);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "none");
        svg.appendChild(path);

        // Glowing dot that travels the path
        var dot = document.createElementNS(NS, "circle");
        dot.setAttribute("r", "10");
        dot.setAttribute("fill", "url(#pglow)");

        var anim = document.createElementNS(NS, "animateMotion");
        anim.setAttribute("dur", "1.5s");
        anim.setAttribute("begin", delaySeconds + "s");
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

// Redraw lines on load and on window resize
window.addEventListener("load", function() {
    // Small timeout to ensure layout is complete
    setTimeout(drawHeartbeatLines, 100);
});

window.addEventListener("resize", drawHeartbeatLines);


// =========================
//  CLUSTER STATUS
// =========================

async function checkNode(url, nodeId, statusId) {

    try {

        await fetch(url);

        document.getElementById(nodeId).classList.remove("offline");
        document.getElementById(nodeId).classList.add("online");
        document.getElementById(statusId).innerText = "🟢 ONLINE";

    }
    catch {

        document.getElementById(nodeId).classList.remove("online");
        document.getElementById(nodeId).classList.add("offline");
        document.getElementById(statusId).innerText = "🔴 OFFLINE";

    }

}


// =========================
//  DASHBOARD REFRESH
// =========================

async function refreshDashboard() {

    // Leader + Role
    try {

        let leaderResponse = await fetch("/leader");
        let leaderData     = await leaderResponse.json();

        document.getElementById("leader").innerText =
            "Leader: " + leaderData.leader;

        document.getElementById("role").innerText =
            "Role: " + leaderData.role;

        // Highlight leader node in topology
        ["node1", "node2", "node3"].forEach(function(id) {
            document.getElementById(id).classList.remove("leader");
        });

        let leaderId = leaderData.leader; // e.g. "node1"
        if (leaderId && document.getElementById(leaderId)) {
            document.getElementById(leaderId).classList.add("leader");
        }

        // Also highlight in topology row
        ["top-node1", "top-node2", "top-node3"].forEach(function(id) {
            document.getElementById(id).classList.remove("leader");
        });

        var topLeaderId = "top-" + leaderId;
        if (leaderId && document.getElementById(topLeaderId)) {
            document.getElementById(topLeaderId).classList.add("leader");
        }

    }
    catch (error) {
        console.log("Leader fetch error:", error);
    }

    // Commit Index
    try {

        let commitResponse = await fetch("/commit_index");
        let commitData     = await commitResponse.json();

        document.getElementById("commit-index").innerText =
            commitData.commit_index;

    }
    catch (error) {
        console.log("Commit index fetch error:", error);
    }

    // Logs
    try {

        let logsResponse = await fetch("/logs");
        let logs         = await logsResponse.json();

        document.getElementById("logs").innerText =
            JSON.stringify(logs, null, 2);

    }
    catch (error) {
        console.log("Logs fetch error:", error);
    }

    // Node health checks
    checkNode("http://127.0.0.1:8000/health", "node1", "status1");
    checkNode("http://127.0.0.1:8001/health", "node2", "status2");
    checkNode("http://127.0.0.1:8002/health", "node3", "status3");

}


// Initial load + polling every 2 seconds
refreshDashboard();
setInterval(refreshDashboard, 2000);