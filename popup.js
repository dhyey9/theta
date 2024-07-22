const providers = {
  ethereum: new ethers.providers.JsonRpcProvider(
    "https://eth-rpc-api-testnet.thetatoken.org/rpc"
  ),
  binance: new ethers.providers.JsonRpcProvider(
    "https://bsc-dataseed.binance.org/"
  ),
  polygon: new ethers.providers.JsonRpcProvider("https://polygon-rpc.com/"),
};

let wallets = {};

function getProvider(network) {
  return providers[network];
}

function getWallet(network) {
  return wallets[network];
}

document.addEventListener("DOMContentLoaded", () => {
  initializeNetworkSelection();
  initializeWallet();
});

document
  .getElementById("networkSelect")
  .addEventListener("change", async function (event) {
    const network = event.target.value;
    updateNetworkState(network);
  });

function initializeNetworkSelection() {
  const storedNetwork = localStorage.getItem("selectedNetwork") || "ethereum";
  document.getElementById("networkSelect").value = storedNetwork;
  updateNetworkState(storedNetwork);
}

function updateNetworkState(network) {
  localStorage.setItem("selectedNetwork", network);
  if (wallets[network]) {
    displayWalletInfo(network);
  } else {
    showSection("initialSection");
  }
}

document
  .getElementById("createWalletBtn")
  .addEventListener("click", showCreateSection);
document
  .getElementById("importWalletBtn")
  .addEventListener("click", showImportSection);
document
  .getElementById("saveNewWalletBtn")
  .addEventListener("click", saveNewWallet);
document.getElementById("loginBtn").addEventListener("click", importWallet);
document.getElementById("sendBtn").addEventListener("click", sendTransaction);
document.getElementById("logoutBtn").addEventListener("click", logout);

function showSection(sectionId) {
  const sections = [
    "initialSection",
    "createSection",
    "importSection",
    "walletSection",
  ];
  sections.forEach((section) => {
    const sectionElement = document.getElementById(section);
    if (sectionElement) {
      sectionElement.style.display = section === sectionId ? "block" : "none";
    } else {
      console.warn(`Element with ID ${section} not found`);
    }
  });
}

function showCreateSection() {
  const newWallet = ethers.Wallet.createRandom();
  document.getElementById("newWalletAddress").textContent = newWallet.address;
  document.getElementById("newWalletPrivateKey").textContent =
    newWallet.privateKey;
  showSection("createSection");
}

function showImportSection() {
  showSection("importSection");
}

function saveNewWallet() {
  const privateKey = document.getElementById("newWalletPrivateKey").textContent;
  const network = document.getElementById("networkSelect").value;
  wallets[network] = new ethers.Wallet(privateKey, getProvider(network));
  chrome.storage.local.set({ [network]: privateKey }, function () {
    console.log("New wallet saved");
    displayWalletInfo(network);
  });
}

async function importWallet() {
  const privateKey = document.getElementById("privateKeyInput").value;
  const network = document.getElementById("networkSelect").value;
  try {
    wallets[network] = new ethers.Wallet(privateKey, getProvider(network));
    chrome.storage.local.set({ [network]: privateKey }, function () {
      console.log("Wallet imported");
      displayWalletInfo(network);
    });
  } catch (error) {
    alert("Invalid private key. Please try again.");
  }
}

async function displayWalletInfo(network) {
  const wallet = wallets[network];
  const address = await wallet.getAddress();
  const balance = await getProvider(network).getBalance(address);

  document.getElementById("walletAddress").textContent = address;
  document.getElementById("walletBalance").textContent =
    ethers.utils.formatEther(balance);

  showSection("walletSection");
}

async function sendTransaction() {
  const recipientAddress = document.getElementById("recipientAddress").value;
  const amount = document.getElementById("amount").value;
  const category = document.getElementById("categorySelect").value;
  const network = document.getElementById("networkSelect").value;
  const wallet = wallets[network];

  if (!ethers.utils.isAddress(recipientAddress)) {
    alert("Invalid recipient address");
    return;
  }

  document.querySelector(".loader").style.display = "block";

  try {
    const tx = await wallet.sendTransaction({
      to: recipientAddress,
      value: ethers.utils.parseEther(amount),
    });

    alert(`Transaction sent! Hash: ${tx.hash}`);
    await tx.wait();
    alert("Transaction confirmed!");

    const balance = await getProvider(network).getBalance(wallet.address);
    document.getElementById("walletBalance").textContent =
      ethers.utils.formatEther(balance);

    const payload = {
      wallet_address: wallet.address,
      sender: wallet.address,
      recipient: recipientAddress,
      amount: ethers.utils.formatEther(tx.value),
      gas_fee: "0.0010", // This should be calculated based on the transaction receipt
      category: category,
      hash: tx.hash,
      date: new Date().toISOString().substring(0, 10),
      time: new Date().toTimeString().substring(0, 8),
      network: network,
    };

    console.log("Payload for server:", payload);

    sendCategoryDataToServer(payload);
  } catch (error) {
    alert("Error sending transaction. Please try again.");
    console.error("Error sending transaction:", error);
  } finally {
    document.querySelector(".loader").style.display = "none";
  }
}

function sendCategoryDataToServer(payload) {
  fetch("https://theta-wallet-app.onrender.com/api/transaction", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Success:", data);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

function logout() {
  const network = document.getElementById("networkSelect").value;
  chrome.storage.local.remove([network], function () {
    console.log("Wallet logged out");
  });
  wallets[network] = null;
  showSection("initialSection");
}
