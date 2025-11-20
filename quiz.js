// =============== PSY TEST QUIZ ===============

const questions = [
  {
    text: "When facing a new challenge, you usually…",
    options: [
      { text: "Feel excited and curious", score: 2 },
      { text: "Feel tense but push through", score: 1 },
      { text: "Overthink and delay", score: 0 },
      { text: "Avoid it if possible", score: -1 }
    ]
  },
  {
    text: "How do you usually react to mistakes?",
    options: [
      { text: "As a chance to learn", score: 2 },
      { text: "Annoyed, but I move on", score: 1 },
      { text: "I replay them in my head for days", score: 0 },
      { text: "I feel like a failure", score: -1 }
    ]
  },
  {
    text: "Your inner voice is mostly…",
    options: [
      { text: "Supportive and motivating", score: 2 },
      { text: "Neutral, practical", score: 1 },
      { text: "Critical and doubtful", score: 0 },
      { text: "Harsh and self-blaming", score: -1 }
    ]
  },
  {
    text: "When plans change unexpectedly, you…",
    options: [
      { text: "Adapt quickly and improvise", score: 2 },
      { text: "Feel uncomfortable but adjust", score: 1 },
      { text: "Feel stressed and stuck", score: 0 },
      { text: "Shut down or withdraw", score: -1 }
    ]
  },
  {
    text: "How often do you do something just for fun or creativity?",
    options: [
      { text: "Almost every day", score: 2 },
      { text: "A few times a week", score: 1 },
      { text: "Rarely", score: 0 },
      { text: "Almost never", score: -1 }
    ]
  }
];

let currentQuestion = 0;
let totalScore = 0;
let answered = false;

const questionEl = document.getElementById("question");
const optionsEl = document.getElementById("options");
const nextBtn = document.getElementById("next-btn");
const quizContainer = document.getElementById("quiz-container");
const resultContainer = document.getElementById("result-container");
const resultText = document.getElementById("result-text");
const mintBtn = document.getElementById("mint-btn");
const mintStatus = document.getElementById("mint-status");

function renderQuestion() {
  const q = questions[currentQuestion];
  questionEl.textContent = q.text;
  optionsEl.innerHTML = "";
  answered = false;
  nextBtn.disabled = true;

  q.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = opt.text;
    btn.onclick = () => {
      if (answered) return;
      answered = true;
      totalScore += opt.score;
      Array.from(optionsEl.children).forEach((c) =>
        c.classList.remove("selected")
      );
      btn.classList.add("selected");
      nextBtn.disabled = false;
    };
    optionsEl.appendChild(btn);
  });
}

nextBtn.onclick = () => {
  if (!answered) return;

  currentQuestion += 1;

  if (currentQuestion < questions.length) {
    renderQuestion();
  } else {
    showResult();
  }
};

function showResult() {
  quizContainer.classList.add("hidden");
  resultContainer.classList.remove("hidden");

  let label, explanation;

  if (totalScore >= 7) {
    label = "Resilient Optimist";
    explanation =
      "You tend to face challenges with curiosity and a flexible mindset. You bounce back quickly and keep moving.";
  } else if (totalScore >= 3) {
    label = "Stable Realist";
    explanation =
      "You stay grounded and practical. You feel stress, but you usually manage it and keep going.";
  } else if (totalScore >= 0) {
    label = "Thoughtful Worrier";
    explanation =
      "You reflect a lot and sometimes get stuck in your thoughts. With a bit more self-kindness, your mindset could shift a lot.";
  } else {
    label = "Hidden Storm";
    explanation =
      "You carry a lot internally. This test is not a diagnosis, but a small reminder: support and self-care matter.";
  }

  resultText.textContent = `${label}: ${explanation}`;
}

// стартуем квиз
renderQuestion();


// =============== NFT MINT LOGIC ===============

// Адрес ТВОЕГО контракта на Base mainnet
const NFT_CONTRACT_ADDRESS = "0xAFEB1ae391d005a71a0f48a9c8193279B176d204";

// ABI с нужными функциями (PRICE, mint, minted)
const NFT_CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "PRICE",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "mint",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "minted",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  }
];

const BASE_CHAIN_ID = 8453n; // Base mainnet chainId as bigint

function setStatus(msg, color) {
  mintStatus.textContent = msg;
  if (color) mintStatus.style.color = color;
}

// Получаем provider+signer: либо из miniapp SDK, либо из window.ethereum
async function getProviderAndSigner() {
  // 1) Пытаемся через Farcaster MiniApp SDK
  const sdk = window.__miniappSdk;
  if (sdk && sdk.wallet && sdk.wallet.getEthereumProvider) {
    try {
      const ethProvider = await sdk.wallet.getEthereumProvider();
      if (ethProvider) {
        const provider = new ethers.BrowserProvider(ethProvider);
        const signer = await provider.getSigner();
        return { provider, signer, source: "miniapp" };
      }
    } catch (e) {
      console.log("sdk.wallet.getEthereumProvider error:", e);
      // пойдём дальше, попробуем MetaMask
    }
  }

  // 2) Фоллбек: обычный браузер + MetaMask
  if (window.ethereum) {
    const provider = new ethers.BrowserProvider(window.ethereum);
    // запросить аккаунты
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    return { provider, signer, source: "browser" };
  }

  throw new Error("No wallet provider found. Open this app in Farcaster/Base or in a browser with MetaMask.");
}

// Проверяем/переключаем сеть на Base mainnet (8453)
async function ensureBaseNetwork(provider, source) {
  const network = await provider.getNetwork();
  const currentId = network.chainId;

  if (currentId === BASE_CHAIN_ID) return;

  // Если мы в обычном браузере и есть window.ethereum — попробуем переключить сеть
  if (source === "browser" && window.ethereum && window.ethereum.request) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x2105" }] // 0x2105 = 8453
      });
      return;
    } catch (e) {
      console.log("wallet_switchEthereumChain error:", e);
      throw new Error("Please switch your wallet to Base mainnet (chainId 8453). Current chainId: " + currentId.toString());
    }
  }

  // В miniapp или если не удалось переключить
  throw new Error("Please switch your wallet to Base mainnet (chainId 8453). Current chainId: " + currentId.toString());
}

async function mintNft() {
  try {
    setStatus("Preparing transaction...", "#f5f5ff");

    const { provider, signer, source } = await getProviderAndSigner();
    await ensureBaseNetwork(provider, source);

    const contract = new ethers.Contract(
      NFT_CONTRACT_ADDRESS,
      NFT_CONTRACT_ABI,
      signer
    );

    const userAddress = await signer.getAddress();

    // 1) Проверяем, не минтил ли уже этот адрес
    let alreadyMinted = false;
    try {
      alreadyMinted = await contract.minted(userAddress);
    } catch (e) {
      console.log("minted(address) check failed (not critical):", e);
    }

    if (alreadyMinted) {
      setStatus("You already minted this NFT with this wallet.", "#ffb36b");
      return;
    }

    // 2) Узнаём цену
    let price;
    try {
      price = await contract.PRICE();
    } catch (e) {
      console.log("PRICE() call failed:", e);
      // как fallback — жёстко 0.0001 ETH
      price = ethers.parseEther("0.0001");
    }

    setStatus("Waiting for wallet confirmation...", "#f5f5ff");

    // 3) Отправляем транзакцию mint
    const tx = await contract.mint({ value: price });
    setStatus("Minting... waiting for confirmation...", "#f5f5ff");

    const receipt = await tx.wait();

    if (receipt && receipt.status === 1n || receipt.status === 1) {
      setStatus("✅ NFT minted successfully!", "#00e0a0");
    } else {
      setStatus("Transaction failed.", "#ff8b8b");
    }
  } catch (err) {
    console.error("mintNft error:", err);

    const msg = String(err?.message || err || "");
    // Немного нормализуем типичные ошибки
    if (msg.includes("user rejected") || msg.includes("User rejected")) {
      setStatus("Transaction rejected by user.", "#ffb36b");
      return;
    }
    if (msg.includes("already minted") || msg.includes("Already minted")) {
      setStatus("You already minted this NFT with this wallet.", "#ffb36b");
      return;
    }
    if (msg.includes("missing revert data") || msg.includes("CALL_EXCEPTION")) {
      // Скорее всего, это повторный mint или другая бизнес-логика контракта
      setStatus("Mint failed on-chain (maybe already minted?).", "#ff8b8b");
      return;
    }

    setStatus("Error: " + msg, "#ff8b8b");
  }
}

mintBtn.onclick = () => {
  mintNft();
};
