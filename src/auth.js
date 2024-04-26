let noAuthRequired = ["/", "/password-reset"]
let user
let secretCode

function toggle(btn) {
    try {
        let mode = btn.textContent
        document.getElementById("selected").id = ""
        btn.id = "selected"

        if(mode == "Login") {
            document.getElementById("signup").style.display = "none"
            document.getElementById("login").style.display = "block"
        } else if(mode == "Sign Up") {
            document.getElementById("signup").style.display = "block"
            document.getElementById("login").style.display = "none"
        }
    } catch (error) {
        console.error(`Toggling Mode Failed: ${error}`)
    }
}

function domain(url) {
    const regex = /^(?:https?:\/\/)?(?:www\.)?([^\/\n]+)/
    const match = url.match(regex)
    return match ? match[1] : null
}

function logout() {
    try {
        localStorage.removeItem("key")
        window.location = "../"
    } catch (error) {
        console.error(`Logging Out Failed: ${error}`)
    }
}

async function signup() {
    try {
        const response = await fetch('../api/signup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json', 
            },
            body: JSON.stringify({
                name: val('sName'),
                username: val('sUsername'),
                email: val('sEmail'), 
                password: val('sPassword')
            }), 
        })

        if (!response.ok) {
            throw new Error(`HTTP error, status: ${response.status}`)
        }

        const data = await response.json()
        if(data.code == 200) {
            localStorage.setItem("key", data.key)
            window.location = "../dashboard"
        } else {
            errorString = ""
            for(let i = 0; i < data.error.length; i++) {
                errorString += `${data.error[i][1]} `
            }
            document.getElementById("signup").querySelector(".errormessage").textContent = errorString
            document.getElementById("signup").querySelector(".errormessage").style.display = "block"
        }
    } catch (error) {
        console.error(`New Account Creation Failed: ${error}`)
        errorString = error
        document.getElementById("signup").querySelector(".errormessage").textContent = errorString
        document.getElementById("signup").querySelector(".errormessage").style.display = "block"
    }
}

async function login() {
    try {
        const response = await fetch('../api/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json', 
            },
            body: JSON.stringify({
                email: val('lEmail'), 
                password: val('lPassword')
            }), 
        })

        if (!response.ok) {
            throw new Error(`HTTP error, status: ${response.status}`)
        }

        const data = await response.json()
        if(data.code == 200) {
            localStorage.setItem("key", data.key)
            window.location = "../dashboard"
        } else {
            errorString = data.error[1]
            document.getElementById("login").querySelector(".errormessage").textContent = errorString
            document.getElementById("login").querySelector(".errormessage").style.display = "block"
        }
    } catch (error) {
        console.error(`Account Login Failed: ${error}`)
        errorString = error
        document.getElementById("login").querySelector(".errormessage").textContent = errorString
        document.getElementById("login").querySelector(".errormessage").style.display = "block"
    }
}

async function sendCode() {
    try {
        const response = await fetch('../api/send-code', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json', 
            },
            body: JSON.stringify({
                email: val('emailInput')
            }), 
        })

        if (!response.ok) {
            throw new Error(`HTTP error, status: ${response.status}`)
        }

        const data = await response.json()
        if(data.code == 200) {
            document.getElementById("email").style.display = "none"
            document.getElementById("code").style.display = "block"
        } else {
            errorString = data.error[1]
            document.getElementById("email").querySelector(".errormessage").textContent = errorString
            document.getElementById("email").querySelector(".errormessage").style.display = "block"
        }
    } catch (error) {
        console.error(`Sending Code Failed: ${error}`)
        errorString = error
        document.getElementById("email").querySelector(".errormessage").textContent = errorString
        document.getElementById("email").querySelector(".errormessage").style.display = "block"
    }
}

async function verifyCode() {
    try {
        const response = await fetch('../api/verify-code', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json', 
            },
            body: JSON.stringify({
                email: val('emailInput'),
                code: val('codeInput')
            }), 
        })

        if (!response.ok) {
            throw new Error(`HTTP error, status: ${response.status}`)
        }

        const data = await response.json()
        if(data.code == 200) {
            secretCode = data.secretCode
            document.getElementById("code").style.display = "none"
            document.getElementById("password").style.display = "block"
        } else {
            errorString = ""
            for(let i = 0; i < data.error.length; i++) {
                errorString += `${data.error[i][1]} `
            }
            document.getElementById("code").querySelector(".errormessage").textContent = errorString
            document.getElementById("code").querySelector(".errormessage").style.display = "block"
        }
    } catch (error) {
        console.error(`Verifying Code Failed: ${error}`)
        errorString = error
        document.getElementById("code").querySelector(".errormessage").textContent = errorString
        document.getElementById("code").querySelector(".errormessage").style.display = "block"
    }
}

async function resetPassword() {
    try {
        const response = await fetch('../api/reset-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json', 
            },
            body: JSON.stringify({
                email: val('emailInput'),
                password: val('passwordInput'),
                secretCode: secretCode
            }), 
        })

        if (!response.ok) {
            throw new Error(`HTTP error, status: ${response.status}`)
        }

        const data = await response.json()
        if(data.code == 200) {
            window.location = "../"
        } else {
            errorString = ""
            for(let i = 0; i < data.error.length; i++) {
                errorString += `${data.error[i][1]} `
            }
            document.getElementById("password").querySelector(".errormessage").textContent = errorString
            document.getElementById("password").querySelector(".errormessage").style.display = "block"
        }
    } catch (error) {
        console.error(`Resetting Password Failed: ${error}`)
        errorString = error
        document.getElementById("password").querySelector(".errormessage").textContent = errorString
        document.getElementById("password").querySelector(".errormessage").style.display = "block"
    }
}

async function getUser() {
    try {
        const response = await fetch('../api/get', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', 
            },
            body: JSON.stringify({
                key: localStorage.getItem('key'),
            }), 
        })
        
        if (!response.ok) {
            throw new Error(`HTTP error, status: ${response.status}`)
        }

        const data = await response.json()
        return data 
    } catch (error) {
        console.error(`Retrieving User Data Failed: ${error}`)
        return { code: 500, error: error.toString() }
    }
}

(async () => {
    try {
        if(localStorage.getItem("key")) {
            user = await getUser()
            if(user.code !== 200) {
                alert(localStorage.getItem("key"))
                localStorage.removeItem("key")
                if(!noAuthRequired.includes(window.location.pathname)) {
                    window.location = "../"
                } else {
                    document.querySelector(".loading").style.display = "none"
                }
            } else {
                if(noAuthRequired.includes(window.location.pathname)) {
                    window.location = "../dashboard"
                } else {
                    document.getElementById("username").textContent = user.results.username

                    if(window.location.pathname == "/dashboard") {
                        for(let i = 0; i < user.results.crews.length; i++) {
                            let amount = "Members"
                            if(user.results.crews[i].members == 1) {
                                amount = "Member"
                            }

                            document.querySelector(".crews").innerHTML += `
                                <div class="crew">
                                    <h2>${user.results.crews[i].name}</h2>
                                    <p><i class="fa-solid fa-users"></i>${user.results.crews[i].members} ${amount}</p>
                                    <button onclick="window.location = './crew/${user.results.crews[i].id}'">View</button>
                                </div>
                            `
                        }
                    } else if(window.location.pathname.split("/")[1] == "crew") {
                        try {
                            let id = window.location.href.split("/").pop()
                            const response = await fetch('../api/get-crew', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json', 
                                },
                                body: JSON.stringify({
                                    id: id,
                                    key: localStorage.getItem("key")
                                }), 
                            })
                            
                            if (!response.ok) {
                                throw new Error(`HTTP error, status: ${response.status}`)
                            }
                    
                            const data = await response.json()
                            let amount = "Members"
                            if(data.results.members == 1) {
                                amount = "Member"
                            }

                            document.getElementById("members").innerHTML = `<i class="fa-solid fa-users"></i>${data.results.members} ${amount}`
                            document.getElementById("name").textContent = data.results.name
                            document.getElementById("description").innerHTML = `<p style="font-weight: bold; padding-bottom: 5px;">Description</p>${data.results.description}`

                            if(data.results.isMember) {
                                document.getElementById("action").textContent = "Leave Crew"
                            } else {
                                document.getElementById("action").textContent = "Join Crew"
                            }

                            if(data.results.links.length > 0) {
                                document.getElementById("links").innerHTML = `<p style="font-weight: bold; padding-bottom: 5px;">Links</p>`

                                for(let x = 0; x < data.results.links.length; x++) {
                                    document.getElementById("links").innerHTML += `
                                        <div class="link">
                                            <p>${data.results.links[x].username}</p>
                                            <a href="${data.results.links[x].link}">${domain(data.results.links[x].link)}</a> 
                                            <p>${data.results.links[x].date}</p>
                                        </div>`
                                }
                            }
                        } catch (error) {
                            alert(error.toString())
                            window.location = "../dashboard"
                        }
                    } else if(window.location.pathname == "/discover") {
                        try {
                            const response = await fetch('../api/top-crews', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json', 
                                }
                            })
                            
                            if (!response.ok) {
                                throw new Error(`HTTP error, status: ${response.status}`)
                            }
                    
                            const data = await response.json()
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
                            window.location = "../dashboard"
                        }
                    }

                    document.querySelector(".loading").style.display = "none"
                }
            }
        } else {
            if(!noAuthRequired.includes(window.location.pathname)) {
                window.location = "../"
            } else {
                document.querySelector(".loading").style.display = "none"
            }
        }
    } catch(error) {
        console.error(`Initiating Authentication Failed: ${error}`)
    }
})()
