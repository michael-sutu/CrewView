const express = require("express")
const path = require("path")
const { MongoClient } = require("mongodb")
const bcrypt = require("bcrypt")
const nodemailer = require("nodemailer")
const cors = require("cors")
const OpenAI = require("openai")
require('dotenv').config()

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const app = express()
app.use(express.json())
app.use(cors())
app.use('/img', express.static(path.join(__dirname, 'img')))
app.use('/src', express.static(path.join(__dirname, 'src')))

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})

const client = new MongoClient(process.env.MONGO_URI)
let db

function randomId(length) {
    try {
        let final = ""
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        const charactersLength = characters.length
        let counter = 0
        while (counter < length) {
            final += characters.charAt(Math.floor(Math.random() * charactersLength))
            counter += 1
        }
        return { code: 200, result: final }
    } catch(error) {
        return { code: 500, error: error.toString() }
    }
}

function validateEmail(email) {
    try {
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
        return { code: 200, result: email.toLowerCase().match(emailRegex) }
    } catch(error) {
        return { code: 500, error: error.toString() }
    }
}

async function dbCreate(collection, data) {
    try {
        const result = await db.collection(collection).insertOne(data)
        return { code: 200 }
    } catch(error) {
        return { code: 500, error: error.toString() }
    }
}

async function dbGet(collection, query) {
    try {
        const result = await db.collection(collection).findOne(query)
        return { code: 200, result: result }
    } catch(error) {
        return { code: 500, error: error.toString() }
    }
}

async function dbUpdateSet(collection, query, data) {
    try {
        const result = await db.collection(collection).updateOne(query, { $set: data })
        return { code: 200, result: result }
    } catch(error) {
        return { code: 500, error: error.toString() }
    }
}

async function assistant_response(id, input) {
    const thread = await openai.beta.threads.create()

    await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: input
    })
    
    const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: id
    })
    
    let timeElapsed = 0
    let timeout = 30000
    let result = null
    while (timeElapsed < timeout) {
        const current = await openai.beta.threads.runs.retrieve(thread.id, run.id)
        if (current.status === 'requires_action') {
            let message = current
            result = message
            timeElapsed = 30000
        }
        await new Promise((resolve) => setTimeout(resolve, 1000))
        timeElapsed += 1000
    }

    let args = result.required_action.submit_tool_outputs.tool_calls

    return JSON.parse(args[0].function.arguments).response
}

app.post("/api/login", async (req, res) => {
    try {
        let result = await dbGet("users", { email: req.body.email.toLowerCase() })
        result = result.result
        if(result) {
            bcrypt.compare(req.body.password, result.password, (error, pass) => {
                if(error) {
                    res.json({ code: 500, error: error.toString() })
                } else {
                    if (pass) {
                        res.json({ code: 200, key: result.key })
                    } else {
                        res.json({ code: 400, error: [2, "Invalid password."] })
                    }
                }
            })
        } else {
            res.json({ code: 400, error: [1, "Unknown email."] })
        }
    } catch(error) {
        res.json({ code: 500, error: error.toString() })
    } 
})

app.post("/api/signup", async (req, res) => {
	try {
        const name = req.body.name
        const username = req.body.username
        const email = req.body.email.toLowerCase()
        const password = req.body.password
        const key = randomId(16)
        let errors = []

        if(name == "" || name == null) {
            errors.push([1, "Name required."])
        }

        if(email == "" || email == null) {
            errors.push([2, "Email required."])
        } else {
            const testEmail = validateEmail(email)
            if(testEmail.result == null) {
                errors.push([3, "Invalid email."])
            }

            const getEmail = await dbGet("users", {"email": email})
            if(getEmail.result != null) {
                errors.push([4, "Email taken."])
            }
        }

        if (password == "" || password == null) {
            errors.push([5, "Password required."]);
        } else {
            if (password.length < 8) {
                errors.push([6, "Passwords must be at least 8 characters long."]);
            }
        }   

        if(username == "" || username == null) {
            errors.push([7, "Username required."])
        } else {
            const getUsername = await dbGet("users", {"username": username})
            if(getUsername.result != null) {
                errors.push([8, "Username taken."])
            }
        }

        if(errors.length > 0) {
            res.json({ code: 400, error: errors })
        } else {
            bcrypt.genSalt(10, async (error, salt) => {
                bcrypt.hash(password, salt, async function(error, hash) {
                    const result = await dbCreate("users", {
                        name: name,
                        email: email,
                        username: username,
                        key: key.result,
                        password: hash,
                        crews: []
                    })

                    if(result.code == 200) {
                        result.key = key.result
                        res.json(result)
                    } else {
                        res.json(result)
                    }
                })
            })
        }
    } catch(error) {
        console.error(error)
        res.json({ code: 500, error: error.toString() })
    }
})

app.post("/api/new", async (req, res) => {
	try {
        const name = req.body.name
        const description = req.body.description
        const public = req.body.public
        const key = req.body.key
        const id = randomId(16)
        let errors = []

        if(name == "" || name == null) {
            errors.push([1, "Name required."])
        }

        if(description == "" || description == null) {
            errors.push([2, "Description required."])
        }

        if(public == null) {
            errors.push([3, "Visibility is required."])
        }

        let currentUser
        if(key == "" || key == null) {
            errors.push([4, "Key required."])
        } else {
            currentUser = await dbGet("users", { "key": key })
            if(currentUser.result == null) {
                errors.push([5, "Unknown key."])
            }
        }

        if(errors.length > 0) {
            res.json({ code: 400, error: errors })
        } else {
            const result = await dbCreate("crews", {
                name: name,
                description: description,
                public: public,
                creator: key,
                id: id.result,
                members: [key],
                links: []
            })

            if(result.code == 200) {
                let updatedCrews = currentUser.result.crews
                updatedCrews.push(id.result)
                const updatedUser = await dbUpdateSet("users", { "key": key }, { crews: updatedCrews })
                if(updatedUser.code == 200) {
                    updatedUser.id = id.result
                }
                res.json(updatedUser)
            } else {
                res.json(result)
            }
        }
    } catch(error) {
        console.error(error)
        res.json({ code: 500, error: error.toString() })
    }
})

app.post("/api/get", async (req, res) => {
    try {
        let result = await dbGet("users", { key: req.body.key })
        result = result.result
        if(result) {
            let results = {
                name: result.name, 
                email: result.email,
                username: result.username,
                crews: []
            }

            for(let i = 0; i < result.crews.length; i++) {
                let crew = await dbGet("crews", { id: result.crews[i] })
                results.crews.push({
                    name: crew.result.name,
                    description: crew.result.description,
                    members: crew.result.members.length,
                    id: crew.result.id
                })
            }

            res.json({ code: 200, results: results })
        } else {
            res.json({ code: 400, error: [1, "Unknown key."] })
        }
    } catch(error) {
        res.json({ code: 500, error: error.toString() })
    } 
})

app.post("/api/get-crew", async (req, res) => {
    try {
        let result = await dbGet("crews", { id: req.body.id })
        result = result.result
        if(result) {
            let results = {
                name: result.name, 
                members: result.members.length,
                description: result.description,
                isMember: (result.members.includes(req.body.key)),
                links: result.links
            }

            res.json({ code: 200, results: results })
        } else {
            res.json({ code: 400, error: [1, "Unknown id."] })
        }
    } catch(error) {
        res.json({ code: 500, error: error.toString() })
    } 
})

function checkEntry(key, hash, array) {
    try {
        let pass = true
        for(let z = 0; z < array.length; z++) {
            if(array[z][0] == key && array[z][1] == hash) {
                pass = false
            }
        }

        return pass
    } catch (error) {
        console.error(error.toString())
    }
}

setInterval(async (e) => {
    try {
        let captured = tempPages
        tempPages = {}
    
        for(let id in captured) {
            let crew = await dbGet("pages", { id: id })
            crew = crew.result
    
            let newPages = {}
            if(crew) {
                newPages = crew.pages
            } else {
                await dbCreate("pages", {
                    id: id,
                    pages: {},
                    ignore: [],
                    accept: []
                })
            }
    
            for(let i = 0; i < captured[id].length; i++) {
                if(!newPages.hasOwnProperty(captured[id][i][1])) {
                    newPages[captured[id][i][1]] = []
                }
    
                let pass = true
                for(let x = 0; x < newPages[captured[id][i][1]].length; x++) {
                    if(newPages[captured[id][i][1]][x][0] == captured[id][i][0]) {
                        pass = false
                    }
                }
    
                if(pass) {
                    newPages[captured[id][i][1]].push([captured[id][i][0], captured[id][i][2]])
                }
            }
    
            await dbUpdateSet("pages", { id: id }, { pages: newPages })
        }
    } catch (error) {
        console.error(error.toString())
    }
}, 900000)

let tempPages = {}
app.post("/api/pages", async (req, res) => {
    try {
        let key = req.body.key
        let pages = req.body.pages

        if(!key || !pages) {
            res.json({ code: 400, error: [[2, "Key and pages are required."]]})
        } else {
            let user = await dbGet("users", { key: key })
            user = user.result
            if(user) {
                for(let i = 0; i < user.crews.length; i++) {
                    if(!tempPages.hasOwnProperty(user.crews[i])) {
                        tempPages[user.crews[i]] = []
                    }

                    for(let x = 0; x < pages.length; x++) {
                        if(checkEntry(key, pages[x], tempPages[user.crews[i]])) {
                            tempPages[user.crews[i]].push([key, pages[x], Date.now()])
                        }
                    }
                }
                res.json({ code: 200 })
            } else {
                res.json({ code: 400, error: [[2, "Unknown key."]]})
            }
        }
    } catch (error) {
        res.json({ code: 500, error: error.toString() })
    }
})

app.post("/api/process", async (req, res) => {
    try {
        let crews = req.body.crew
        let content = req.body.content
        let hash = req.body.hash
        let final = []

        for(let i = 0; i < crews.length; i++) {
            let pageCrew = await dbGet("pages", { id: crews[i] })
            let crew = await dbGet("crews", { id: crews[i] })
            if(!pageCrew.result.ignore.includes(hash)) {
                if(pageCrew.result.accept.includes(hash)) {
                    final.push(crew.result.name)
                } else {
                    let text = `Description of the group: "${crew.result.description}". Contents of the web page (make sure to only suggest if it matches up with the groups interests): "${content}"`
                    let response = await assistant_response("asst_CvAeS1r35DqvsX3cpXqUnsJd", text)
                    let pageCrew = await dbGet("pages", { id: crews[i] })
                    if(response) {
                        final.push(crew.result.name)
                        let newAccept = pageCrew.result.accept
                        newAccept.push(hash)
                        await dbUpdateSet("pages", { id: crews[i] }, { accept: newAccept })
                    } else {
                        let newIgnore = pageCrew.result.ignore
                        newIgnore.push(hash)
                        await dbUpdateSet("pages", { id: crews[i] }, { ignore: newIgnore })
                    }
                }
            }
        }

        res.json({ code: 200, crews: final })
    } catch (error) {
        console.error(error.toString())
        res.json({ code: 500, error: error.toString() })
    }
})

app.post("/api/get-popular", async (req, res) => {
    const key = req.body.key

    if (!key) {
        res.json({ code: 400, error: "User key is required." })
        return
    }

    try {
        const userResult = await dbGet("users", { key: key })
        if (!userResult.result) {
            res.json({ code: 400, error: "User not found." })
            return
        }

        const userCrews = userResult.result.crews
        let popularPagesByCrew = {}

        const now = Date.now()
        const twoWeeksAgo = now - 1209600000

        for (const crewId of userCrews) {
            const crewResult = await dbGet("crews", { id: crewId })
            if (!crewResult.result) continue

            const pagesResult = await dbGet("pages", { id: crewId })
            if (!pagesResult.result) continue

            const crewPages = pagesResult.result.pages
            const memberCount = crewResult.result.members.length
            const threshold = Math.ceil(memberCount * 0.5)

            let updatedPages = {}
            let popularPages = []

            for (let [pageId, entries] of Object.entries(crewPages)) {
                const recentEntries = entries.filter(entry => {
                    const timestamp = parseInt(entry[1])
                    return timestamp > twoWeeksAgo
                })

                if (recentEntries.length != entries.length) {
                    updatedPages[pageId] = recentEntries
                }

                if (recentEntries.length >= threshold) {
                    popularPages.push({
                        pageId: pageId,
                        count: recentEntries.length
                    })
                }
            }

            if (Object.keys(updatedPages).length > 0) {
                await dbUpdateSet("pages", { id: crewId }, { pages: updatedPages })
            }

            if (popularPages.length > 0) {
                popularPagesByCrew[crewId] = popularPages
            }
        }

        res.json({ code: 200, results: popularPagesByCrew })
    } catch (error) {
        console.error("Failed to get popular pages:", error)
        res.json({ code: 500, error: error.toString() })
    }
})

app.post("/api/search-crews", async (req, res) => {
    try {
        const searchTerm = req.body.q

        if (!searchTerm) {
            res.json({ code: 400, error: [1, "Search query is required."] })
            return
        }

        const results = await db.collection('crews').find({
            name: { $regex: new RegExp(searchTerm, 'i') } 
        }).limit(20).toArray()

        let final = []
        for(let i = 0; i < results.length; i++) {
            final.push({
                name: results[i].name,
                description: results[i].description,
                id: results[i].id,
                members: results[i].members.length
            })
        }

        res.json({ code: 200, results: final })
    } catch (error) {
        console.error("Failed to search crews:", error)
        res.json({ code: 500, error: error.toString() })
    }
})

app.post("/api/top-crews", async (req, res) => {
    try {
        const results = await db.collection('crews').aggregate([
            { $project: { name: 1, description: 1, id: 1, members: { $size: "$members" } } },
            { $sort: { members: -1 } },
            { $limit: 20 }
        ]).toArray()

        res.json({ code: 200, results: results });
    } catch (error) {
        console.error("Failed to retrieve top crews:", error);
        res.json({ code: 500, error: error.toString() })
    }
})

app.post("/api/leave-crew", async (req, res) => {
    const id = req.body.id
    const key = req.body.key

    if (!id || !key) {
        res.json({ code: 400, error: [1, "User key and crew id is required."] })
        return
    }

    try {
        const crewUpdateResult = await db.collection('crews').updateOne(
            { id: id },
            { $pull: { members: key } }
        )

        if (crewUpdateResult.matchedCount === 0) {
            res.json({ code: 400, error: [2, "Crew not found."] })
            return
        } else if (crewUpdateResult.modifiedCount === 0) {
            res.json({ code: 400, error: [3, "User is not in that crew."] })
            return
        }

        const userUpdateResult = await db.collection('users').updateOne(
            { key: key },
            { $pull: { crews: id } }
        )

        if (userUpdateResult.matchedCount === 0) {
            res.json({ code: 400, error: [4, "User not found."] })
            return;
        } else if (userUpdateResult.modifiedCount === 0) {
            res.json({ code: 400, error: [5, "Crew not listed on users profile."] })
            return
        }

        res.json({ code: 200 })
    } catch (error) {
        console.error("Error leaving crew:", error)
        res.json({ code: 500, error: error.toString() })
    }
})

app.post("/api/join-crew", async (req, res) => {
    const id = req.body.id
    const key = req.body.key

    if (!id || !key) {
        res.json({ code: 400, error: [1, "User key and crew id is required."] })
        return
    }

    try {
        const crewUpdateResult = await db.collection('crews').updateOne(
            { id: id },
            { $addToSet: { members: key } }
        )

        if (crewUpdateResult.matchedCount === 0) {
            res.json({ code: 400, error: [2, "Crew not found."] })
            return
        } else if (crewUpdateResult.modifiedCount === 0) {
            res.json({ code: 400, error: [3, "User already in that crew."] })
            return
        }

        const userUpdateResult = await db.collection('users').updateOne(
            { key: key },
            { $addToSet: { crews: id } }
        )

        if (userUpdateResult.matchedCount === 0) {
            res.json({ code: 400, error: [4, "User not found."] })
            return
        } else if (userUpdateResult.modifiedCount === 0) {
            res.json({ code: 400, error: [5, "Crew already listed on user's profile."] })
            return
        }

        res.json({ code: 200 })
    } catch (error) {
        console.error("Error joining crew:", error)
        res.json({ code: 500, error: error.toString() })
    }
})

let resetSessions = []
const filterSessionsInterval = setInterval((e) => {
    let newSessions = []
    for(let i = 0; i < resetSessions.length; i++) {
        if(Date.now() - resetSessions[i].start < 600000) {
            newSessions.push(resetSessions[i])
        }
    }
    resetSessions = newSessions
}, 600000)

app.post("/api/send-code", async (req, res) => {
    try {
        const email = req.body.email
        let result = await dbGet("users", { email: email })
        result = result.result
        if(result) {
            let resetCode = randomId(6)
            resetCode = resetCode.result.toUpperCase()
            let secretCode = randomId(10)
            secretCode = secretCode.result

            const mailOptions = {
                from: 'crewview.reset@gmail.com',
                to: email,
                subject: "Password Reset",
                html: `You password reset code is: ${resetCode}`
            }
            
            transporter.sendMail(mailOptions, function(error, info) {
                if (error) {
                    res.json({ code: 500, error: error.toString() })
                } else {
                    let newSessions = []
                    for(let i = 0; i < resetSessions.length; i++) {
                        if(resetSessions[i].email != email) {
                            newSessions.push(resetSessions[i])
                        }
                    }
                    resetSessions = newSessions
                    resetSessions.push({resetCode: resetCode, secretCode: secretCode, email: email, start: Date.now()})
                    res.json({ code: 200 })
                }
            })
        } else {
            res.json({ code: 400, error: [1, "Unknown email."] })
        }
    } catch(error) {
        res.json({ code: 500, error: error.toString() })
    } 
})

app.post("/api/verify-code", async (req, res) => {
    try {
        const email = req.body.email
        const resetCode = req.body.code
        let chosen = -1
        let chosenIndex = -1
        let errors = []
        for(let i = 0; i < resetSessions.length; i++) {
            if(resetSessions[i].email == email) {
                chosen = resetSessions[i]
                chosenIndex = i
                if(resetSessions[i].resetCode != resetCode) {
                    errors.push([1, "Invalid reset code."])
                } else {
                    resetSessions[i].start = Date.now()
                }
            }
        }

        if(chosen == -1) {
            errors.push([2, "No password reset sessions with that email. It might have expired."])
        }

        if(errors.length > 0) {
            res.json({ code: 400, error: errors })
        } else {
            res.json({ code: 200, secretCode: chosen.secretCode })
        }
    } catch(error) {
        res.json({ code: 500, error: error.toString() })
    } 
})

app.post("/api/reset-password", async (req, res) => {
    try {
        const email = req.body.email
        const secretCode = req.body.secretCode
        const password = req.body.password
        let chosen = -1
        let chosenIndex = -1
        let errors = []
        for(let i = 0; i < resetSessions.length; i++) {
            if(resetSessions[i].email == email) {
                chosen = resetSessions[i]
                chosenIndex = i
                if(resetSessions[i].secretCode != secretCode) {
                    errors.push([1, "Invalid secretCode."])
                }
            }
        }

        if(chosen == -1) {
            errors.push([2, "No password reset sessions with that email. It might have expired."])
        }

        if(password == "" || password == null) {
            errors.push([3, "Password required."])
        }

        if(errors.length > 0) {
            res.json({ code: 400, error: errors })
        } else {
            resetSessions.splice(chosenIndex, 1)
            bcrypt.genSalt(10, async (err, salt) => {
                bcrypt.hash(password, salt, async function(err, hash) {
                    const result = await dbUpdateSet("users", { email: email }, { password: hash })

                    if(result.code == 200) {
                        res.json(result)
                    } else {
                        res.json(result)
                    }
                })
            })
        }
    } catch(err) {
        res.json({code: 500, err: err})
    }
})

function encode(string) {
    let hash = 0
    for (let i = 0; i < string.length; i++) {
        const charCode = string.charCodeAt(i)
        hash = (hash << 5) - hash + charCode
        hash |= 0
    }

    return Math.abs(hash).toString(16)
}

app.post("/api/share", async (req, res) => {
    const { key, crews, link } = req.body
    if (!key || !crews || !link) {
        res.status(400).json({ code: 400, error: [1, "Key, crews, and link must be provided."] })
        return
    }

    try {
        const userResult = await db.collection('users').findOne({ key: key })
        if (!userResult) {
            res.status(404).json({ code: 400, error: [2, "User not found."] })
            return
        }

        const username = userResult.username
        const shareDate = new Date().toLocaleDateString("en-US", { month: 'long', day: 'numeric' })
        const linkObject = { username: username, link: link, date: shareDate }
        const linkHash = encode(link)

        const updateOperations = crews.map(crewId =>
            db.collection('crews').updateOne(
                { id: crewId },
                { $push: { links: linkObject } }
            ).then(() => 
                db.collection('pages').updateOne(
                    { id: crewId },
                    { $addToSet: { ignore: linkHash } }
                )
            )
        )

        await Promise.all(updateOperations)

        res.json({ code: 200 })
    } catch (error) {
        console.error("Failed to share links:", error)
        res.status(500).json({ code: 500, error: error.toString() })
    }
})

app.get("/", (req, res) => {
    res.sendFile(__dirname+"/public/index.html")
})

app.get("/password-reset", (req, res) => {
    res.sendFile(__dirname+"/public/password-reset.html")
})

app.get("/dashboard", (req, res) => {
    res.sendFile(__dirname+"/public/dashboard.html")
})

app.get("/discover", (req, res) => {
    res.sendFile(__dirname+"/public/discover.html")
})

app.get("/crew/:id", (req, res) => {
    res.sendFile(__dirname+"/public/crew.html")
})

app.listen(1000, async () => {
    try {
      await client.connect()
      db = client.db("main")
      console.log(`Server running on http://localhost:1000`)
    } catch (error) {
      console.error("Could not connect to db:", error)
      process.exit(1)
    }
  })