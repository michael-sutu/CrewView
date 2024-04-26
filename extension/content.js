chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === "showNotification" && message.content) {
        const notificationElement = document.createElement('div')
        notificationElement.innerHTML = `
            <h1>CrewView - Notification</h1>
            <p>This page may be useful to people in the following crews, consider sharing: <span style="font-weight: bold;"></span></p>
            <button onclick="this.parentElement.remove()">Close</button>
        `

        notificationElement.style.cssText = `
            position: fixed;
            right: 20px;
            top: 20px;
            background-color: rgb(250, 250, 250);
            border: 0px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            padding: 30px;
            z-index: 1000;
            border-radius: 12px;
            font-family: 'Poppins', sans-serif;
            text-align: center;
            width: 400px;
            max-height: 300px;
            color: black;
        `

        notificationElement.querySelector("h1").style.cssText = `
            margin-bottom: 10px;
            text-align: left;
        `

        notificationElement.querySelector("p").style.cssText = `
            font-size: 20px;
            text-align: left;
            margin-bottom: 30px;
        `

        notificationElement.querySelector("button").style.cssText = `
            font-size: 15px;
            width: 400px;
            cursor: pointer;
            padding: 10px;
	        border: 0px;
	        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
	        background-color: #757B86;
	        color: white;
	        border-radius: 5px;
        `

        document.body.appendChild(notificationElement)
        notificationElement.querySelector("span").textContent = message.content
    }
})