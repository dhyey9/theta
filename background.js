chrome.runtime.onMessageExternal.addListener(function (
  request,
  sender,
  sendResponse
) {
  console.log("Received message:", request); // Move this line inside the listener
  if (request.action === "openPopupAndPrefill") {
    chrome.storage.local.set({ transactionData: request.data }, function () {
      chrome.windows.create(
        {
          url: chrome.runtime.getURL("popup.html"),
          type: "popup",
          width: 400,
          height: 600,
        },
        function (createdWindow) {
          sendResponse({ status: "Popup opened", windowId: createdWindow.id });
        }
      );
    });
    return true; // Indicate asynchronous response
  }
});
