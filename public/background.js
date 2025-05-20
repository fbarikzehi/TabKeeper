


// Listener for when the extension is installed
self.addEventListener("install", (event) => {
    console.log("Service Worker installed");
});

// Listener for messages or events
self.addEventListener("message", (event) => {
    console.log("Received message:", event.data);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received:", message);
    sendResponse({ response: "Message processed by background.js" });
});
