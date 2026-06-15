async function checkNode(
    url,
    nodeId,
    statusId
){

    try{

        await fetch(url);

        document
        .getElementById(nodeId)
        .classList.remove("offline");

        document
        .getElementById(nodeId)
        .classList.add("online");

        document
        .getElementById(statusId)
        .innerText =
        "🟢 ONLINE";

    }

    catch{

        document
        .getElementById(nodeId)
        .classList.remove("online");

        document
        .getElementById(nodeId)
        .classList.add("offline");

        document
        .getElementById(statusId)
        .innerText =
        "🔴 OFFLINE";

    }

}

async function refreshDashboard(){

    try{

        let leaderResponse =
        await fetch("/leader");

        let leaderData =
        await leaderResponse.json();

        document
        .getElementById("leader")
        .innerText =
        "Leader: " + leaderData.leader;

        document
        .getElementById("role")
        .innerText =
        "Role: " + leaderData.role;

        let node1 =
        document.getElementById("node1");

        if(
            leaderData.leader === "node1"
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

    catch(error){

        console.log(error);

    }


    try{

        let commitResponse =
        await fetch("/commit_index");

        let commitData =
        await commitResponse.json();

        document
        .getElementById("commit-index")
        .innerText =
        commitData.commit_index;

    }

    catch(error){

        console.log(error);

    }


    try{

        let logsResponse =
        await fetch("/logs");

        let logs =
        await logsResponse.json();

        document
        .getElementById("logs")
        .innerText =
        JSON.stringify(
            logs,
            null,
            2
        );

    }

    catch(error){

        console.log(error);

    }


    checkNode(
        "http://127.0.0.1:8000/health",
        "node1",
        "status1"
    );

    checkNode(
        "http://127.0.0.1:8001/health",
        "node2",
        "status2"
    );

    checkNode(
        "http://127.0.0.1:8002/health",
        "node3",
        "status3"
    );

}


refreshDashboard();

setInterval(
    refreshDashboard,
    2000
);