async function refreshDashboard(){

let leaderResponse=
await fetch("/leader");

let leaderData=
await leaderResponse.json();

document
.getElementById("leader")
.innerText=
"Leader: "+leaderData.leader;

document
.getElementById("role")
.innerText=
"Role: "+leaderData.role;


let logsResponse=
await fetch("/logs");

let logs=
await logsResponse.json();

document
.getElementById("logs")
.innerText=
JSON.stringify(
logs,
null,
2
);


let node1=
document.getElementById("node1");

let node2=
document.getElementById("node2");

let node3=
document.getElementById("node3");


node1.classList.add(
"online"
);

node2.classList.add(
"online"
);

node3.classList.add(
"online"
);


if(
leaderData.leader==="node1"
){

node1.classList.add(
"leader"
);

}
else{

node1.classList.remove(
"leader"
);

}

}

refreshDashboard();

setInterval(
refreshDashboard,
2000
);