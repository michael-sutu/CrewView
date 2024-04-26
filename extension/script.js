function val(id) {
  return document.getElementById(id).value
}

async function getUser(key) {
  try {
    const response = await fetch('http://localhost:1000/api/get', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', 
      },
      body: JSON.stringify({
        key: key,
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

document.querySelector(".forgotpassword").addEventListener("click", (e) => {
  window.open("http://localhost:1000/password-reset")
})

document.getElementById("finalbtn").addEventListener("click", async (e) => {
  try {
    const response = await fetch('http://localhost:1000/api/login', {
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
      chrome.storage.local.set({key: data.key})
      location.reload()
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
})

document.getElementById("logout").addEventListener("click", (e) => {
  chrome.storage.local.set({key: ""})
  location.reload()
})

document.getElementById("share").addEventListener("click", async (e) => {
  let toShare = []
  document.querySelectorAll("input[type='checkbox']").forEach((check) => {
    if(check.checked) {
      toShare.push(check.dataset.id)
      check.checked = false
    }
  })

  document.getElementById("share").disabled = true
  document.getElementById("share").textContent = "Shared!"

  setTimeout(() => {
    document.getElementById("share").disabled = false
    document.getElementById("share").textContent = "Share to Crew"
  }, 2000)

  await fetch('http://localhost:1000/api/share', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', 
    },
    body: JSON.stringify({
      key: key,
      crews: toShare,
      link: currentUrl
    }), 
  })
})

let currentUrl
document.addEventListener('DOMContentLoaded', function() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    let currentTab = tabs[0]
    currentUrl = currentTab.url
  })
})

let key
chrome.storage.local.get(["key"]).then(async(result) => {
  key = result.key
  if(key) {
    user = await getUser(key)
    if(user.code == 200) {
      document.querySelector(".main").style.display = "block"
      document.querySelector(".authform").style.display = "none"
      document.getElementById("username").textContent = user.results.username

      for(let i = 0; i < user.results.crews.length; i++) {
        let amount = "Members"
        if(user.results.crews[i].members == 1) {
          amount = "Member"
        }

        document.querySelector(".crews").innerHTML += `
          <div class="crew">
            <input type="checkbox" value="no" data-id="${user.results.crews[i].id}">
            <div>
              <h2>${user.results.crews[i].name}</h2>
              <p><i class="fa-solid fa-users"></i>${user.results.crews[i].members} ${amount}</p>
            </div>
          </div>
        `
      }
    }
  }

  document.querySelector(".loading").style.display = "none"
})