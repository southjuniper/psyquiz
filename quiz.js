// =====================
//  PSY TEST QUIZ LOGIC
// =====================

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

// init quiz
renderQuestion();


// ========================
//  NFT MINTING (Base L1)
// ========================

// Твой контракт на Base mainnet:
const NFT_CONTRACT_ADDRESS = "0xAFEB1ae391d005a71a0f48a9c8193279B176d204";

// ABI: PRICE, mint, balanceOf (ERC721)
const NFT_CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "PRICE",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }],
    "name": "balanceOf",
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
  }
];

// Универсальный провайдер: MiniApp (Farcaster/Base) ИЛИ браузерный (MetaMask)
async function getProviderAndSigner() {
  // 1) Пробуем Mini App SDK (Farcaster/Base)
  const sdk = window.__miniappSdk;
  if (sdk && sdk.wallet && typeof sdk.wallet.getEthereumProvider === "function") {
    try {
      const ethProvider = await sdk.wallet.getEthereumProvider();
      const provider = new ethers.BrowserProvider(ethProvider);
      const signer = await provider.getSigner();
      console.log("[PsyQuiz] Using Farcaster/Base miniapp provider");
      return { provider, signer, mode: "miniapp" };
    } catch (e) {
      console.log("[PsyQuiz] Miniapp provider failed, fallback to browser wallet:", e);
    }
  }

  // 2) Пробуем обычный браузерный wallet (MetaMask)
  if (window.ethereum) {
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    console.log("[PsyQuiz] Using window.ethereum provider");
    return { provider, signer, mode: "browser" };
  }

  throw new Error(
    "No wallet provider found. Open this app in a Farcaster/Base client or in a browser with a crypto wallet."
  );
}

async function mintNft() {
  mintStatus.textContent = "Preparing transaction...";
  mintStatus.style.color = "#f5f5ff";

  try {
    const { provider, signer, mode } = await getProviderAndSigner();

    // Проверяем сеть, но мягко (если getNetwork отвалится в miniapp из-за багов RPC — просто логируем)
    let chainId = null;
    try {
      const network = await provider.getNetwork();
      chainId = network.chainId;
      console.log("[PsyQuiz] Network chainId:", chainId.toString());
    } catch (e) {
      console.log("[PsyQuiz] getNetwork failed:", e);
    }

    // Если chainId известно и это не Base mainnet (8453) — просим переключиться
    if (chainId && chainId !== 8453n) {
      throw new Error(
        `Please switch your wallet to Base mainnet (chainId 8453). Current chainId: ${chainId.toString()}`
      );
    }

    const contract = new ethers.Contract(
      NFT_CONTRACT_ADDRESS,
      NFT_CONTRACT_ABI,
      signer
    );

    const userAddress = await signer.getAddress();
    console.log("[PsyQuiz] User address:", userAddress);

    // Предварительная проверка: если уже есть NFT (balanceOf > 0), не шлём транзакцию
    try {
      const balance = await contract.balanceOf(userAddress);
      console.log("[PsyQuiz] Current balance:", balance.toString());
      if (balance > 0n) {
        mintStatus.textContent = "You already minted this NFT.";
        mintStatus.style.color = "#00e0a0";
        return;
      }
    } catch (e) {
      console.log("[PsyQuiz] balanceOf check failed (will still attempt mint):", e);
    }

    // Берём цену из контракта
    let price;
    try {
      price = await contract.PRICE();
    } catch (e) {
      console.log("[PsyQuiz] PRICE read failed, falling back to 0.0001 ETH:", e);
      price = ethers.parseEther("0.0001");
    }

    mintStatus.textContent = "Waiting for wallet confirmation...";

    const tx = await contract.mint({ value: price });
    mintStatus.textContent = "Minting... waiting for confirmation...";

    const receipt = await tx.wait();

    if (receipt.status === 1) {
      mintStatus.textContent = "✅ NFT minted successfully!";
      mintStatus.style.color = "#00e0a0";
    } else {
      mintStatus.textContent = "Transaction failed on-chain.";
      mintStatus.style.color = "#ff8b8b";
    }
  } catch (err) {
    console.error("[PsyQuiz] Mint error:", err);

    // Нормальные сообщения вместо странных ошибок
    const msg = (err && err.message) ? err.message : String(err);

    // Отклонение транзакции пользователем
    if (err.code === "ACTION_REJECTED" || err.code === 4001) {
      mintStatus.textContent = "Transaction rejected in wallet.";
      mintStatus.style.color = "#ff8b8b";
      return;
    }

    // Ошибки провайдера типа "could not coalesce error / eth_accounts"
    if (msg.includes("eth_accounts") || msg.includes("coalesce error")) {
      mintStatus.textContent =
        "Wallet provider error. Try re-opening the mini app or connecting your wallet again.";
      mintStatus.style.color = "#ff8b8b";
      return;
    }

    // Ошибки без revert data (Farcaster mobile часто так делает)
    if (err.code === "CALL_EXCEPTION" && msg.includes("missing revert data")) {
      mintStatus.textContent =
        "Mint failed on-chain (maybe already minted or contract reverted).";
      mintStatus.style.color = "#ff8b8b";
      return;
    }

    // Общий fallback
    mintStatus.textContent = "Error: " + msg;
    mintStatus.style.color = "#ff8b8b";
  }
}

mintBtn.onclick = () => {
  mintNft();
};
