function val(id) {
    return document.getElementById(id).value
}

function newcrew(visibility) {
    try {
        document.querySelector(".prompt").style.display = visibility
        document.querySelector(".newcrew").style.display = visibility
    } catch (error) {
        console.error(`Error While Trying to Open New Crew Form: ${error}`)
    }
}

async function createcrew() {
    try {
        const response = await fetch('./api/new', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json', 
            },
            body: JSON.stringify({
                name: val('name'),
                description: val('description'),
                public: !document.getElementById("private").checked, 
                key: localStorage.getItem("key")
            }), 
        })

        if (!response.ok) {
            throw new Error(`HTTP error, status: ${response.status}`);
        }

        const data = await response.json()
        if(data.code == 200) {
            window.location = `./crew/${data.id}`
        } else {
            errorString = ""
            for(let i = 0; i < data.error.length; i++) {
                errorString += `${data.error[i][1]} `
            }
            document.querySelector(".errormessage").textContent = errorString
            document.querySelector(".errormessage").style.display = "block"
        }
    } catch (error) {
        console.error(`New Crew Creation Failed: ${error}`)
        errorString = error
        document.querySelector(".errormessage").textContent = errorString
        document.querySelector(".errormessage").style.display = "block"
    }
}

if(window.location.pathname == "/discover") {
    document.getElementById("searchquery").addEventListener('keydown', (e) => {
        if(e.key === "Enter" || e.keyCode === 13) {
            searchcrew()
        }
    })
}

async function searchcrew() {
    try {
        const response = await fetch('../api/search-crews', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', 
            },
            body: JSON.stringify({
                q: val("searchquery")
            })
        })
        
        if (!response.ok) {
            throw new Error(`HTTP error, status: ${response.status}`);
        }

        const data = await response.json()
        document.querySelector(".crews").innerHTML = ""
        for (let i = 0; i < data.results.length; i++) {
            let amount = "Members"
            if (data.results[i].members === 1) {
                amount = "Member"
            }
        
            document.querySelector(".crews").innerHTML += `
                <div class="crew">
                    <h2>${data.results[i].name}</h2>
                    <p><i class="fa-solid fa-users"></i> ${data.results[i].members} ${amount}</p>
                    <button onclick="window.location = './crew/${data.results[i].id}'">View</button>
                </div>
            `
        }  
    } catch (error) {
        console.error(`There was an error searching for crews: ${error.toString()}`)
    }
}

if(window.location.pathname.split("/")[1] == "crew") {
    document.getElementById("action").addEventListener("click", (e) => {
        if(e.target.textContent == "Leave Crew") {
            leavecrew()
        } else if(e.target.textContent == "Join Crew") {
            joincrew()
        }
    })
}

async function leavecrew() {
    try {
        let id = window.location.href.split("/").pop()
        const response = await fetch('../api/leave-crew', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', 
            },
            body: JSON.stringify({
                id: id,
                key: localStorage.getItem("key")
            })
        })
        
        if (!response.ok) {
            throw new Error(`HTTP error, status: ${response.status}`);
        }

        location.reload()
    } catch (error) {
        window.location = "../dashboard"
    }
}

async function joincrew() {
    try {
        let id = window.location.href.split("/").pop()
        const response = await fetch('../api/join-crew', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', 
            },
            body: JSON.stringify({
                id: id,
                key: localStorage.getItem("key")
            })
        })
        
        if (!response.ok) {
            throw new Error(`HTTP error, status: ${response.status}`);
        }

        location.reload()
    } catch (error) {
        window.location = "../dashboard"
    }
}