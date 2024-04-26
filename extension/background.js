let popularPages = {}

async function getPopular() {
    try {
        chrome.storage.local.get(["key"]).then(async(result) => {
            const response = await fetch('http://localhost:1000/api/get-popular', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json', 
                },
                body: JSON.stringify({
                  key: result.key,
                })
            })
              
            if (!response.ok) {
                throw new Error(`HTTP error, status: ${response.status}`)
            }
          
            const data = await response.json()
            popularPages = data.results
            return { code: 200 }
        })   
    } catch (error) {
        console.error(`Retrieving User Data Failed: ${error}`)
        return { code: 500, error: error.toString() }
    } 
}

getPopular()
setInterval((e) => {
    getPopular()
}, 1.8e+6)

chrome.storage.local.get(["lastUpdated", "temp"]).then(async(result) => {
    let lastUpdated = parseInt(result.lastUpdated) || Date.now()
    chrome.storage.local.set({lastUpdated: lastUpdated.toString()})
    let temp

    if (result.temp) {
        try {
            temp = JSON.parse(result.temp)
        } catch (error) {
            temp = []
        }
    } else {
        temp = []
    }

    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
        try {
            if (changeInfo.status === 'complete' && tab.url) {
                let url = encode(tab.url)
                let suggestable = []
                for(let crew in popularPages) {
                    for(let i = 0; i < popularPages[crew].length; i++) {
                        if(url == popularPages[crew][i].pageId) {
                            suggestable.push(crew)
                        }
                    }
                }

                if(suggestable.length > 0) {
                    let currentContent = ""
                    function grabPageContents() {
                        function getAllTextNodes() {
                            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false)
                            const textNodes = []
                            let node
                            while (node = walker.nextNode()) {
                                if (node.parentNode.nodeName.toLowerCase() !== 'script' && node.parentNode.nodeName.toLowerCase() !== 'style' && node.nodeValue.trim() !== '') {
                                    textNodes.push(node.nodeValue.trim())
                                }
                            }
                            return textNodes
                        }
                        
                        return getAllTextNodes().join(' ')
                    }
                    
                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        function: grabPageContents
                    }, async (injectionResults) => {
                        if (chrome.runtime.lastError) {
                            console.error('Script injection failed: ', chrome.runtime.lastError.message)
                            return
                        }
                        if (injectionResults && Array.isArray(injectionResults)) {
                            for (const frameResult of injectionResults) {
                                currentContent = frameResult.result
                            }

                            const response = await fetch('http://localhost:1000/api/process', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json', 
                                },
                                body: JSON.stringify({
                                    crew: suggestable,
                                    content: currentContent,
                                    hash: url
                                })
                            })
                              
                            if (!response.ok) {
                                throw new Error(`HTTP error, status: ${response.status}`)
                            }
                            
                            const data = await response.json()
                            if(data.code == 200) {
                                console.log(data.crews)
                                chrome.tabs.sendMessage(tabId, { action: "showNotification", content: data.crews.join(', ') })
                            }
                        }
                    })
                }

                if(validateURL(tab.url)) {
                    if(!temp.includes(url)) {
                        temp.push(url)
                    }
                    chrome.storage.local.set({temp: JSON.stringify(temp)})
                }

                if(Date.now() > lastUpdated + 900000) {
                    chrome.storage.local.get(["key"]).then(async(result) => {
                        let key = result.key
                        if(key) {
                            await fetch('http://localhost:1000/api/pages', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json', 
                                },
                                body: JSON.stringify({
                                    key: key,
                                    pages: temp
                                }), 
                            })
                        }

                        temp = []
                        lastUpdated = Date.now()
                        chrome.storage.local.set({lastUpdated: lastUpdated.toString()})
                    })
                }
            }
        } catch (error) {
            console.error(error)
        }
    })
})

function validateURL(string) {
    return string.startsWith('http')
}

function encode(string) {
    let hash = 0
    for (let i = 0; i < string.length; i++) {
        const charCode = string.charCodeAt(i)
        hash = (hash << 5) - hash + charCode
        hash |= 0
    }

    return Math.abs(hash).toString(16)
}