// ====== Quiz Logic ======

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

// Init
renderQuestion();

// ====== Mint NFT via Mini App Wallet + ethers.js ======

// ВСТАВЬ СВОЙ АДРЕС КОНТРАКТА НА BASE MAINNET
const NFT_CONTRACT_ADDRESS = "0xAFEB1ae391d005a71a0f48a9c8193279B176d204";

// ABI только нужных функций
const NFT_CONTRACT_ABI = [
  {
    inputs: [],
    name: "PRICE",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "mint",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  }
];

// Получение провайдера и signer с учётом Farcaster / браузера
async function getProviderAndSigner() {
  // 1) Пытаемся через Mini App SDK (Farcaster/Base)
  const sdk = window.__miniappSdk;
  if (sdk && sdk.wallet && sdk.wallet.getEthereumProvider) {
    const ethProvider = await sdk.wallet.getEthereumProvider();
    const provider = new ethers.BrowserProvider(ethProvider);
    const signer = await provider.getSigner();
    return { provider, signer, rawProvider: ethProvider };
  }

  // 2) Обычный браузерный кошелёк
  if (window.ethereum) {
    const ethProvider = window.ethereum;
    const provider = new ethers.BrowserProvider(ethProvider);
    // запросить аккаунты (MetaMask connect)
    await ethProvider.request({ method: "eth_requestAccounts" });
    const signer = await provider.getSigner();
    return { provider, signer, rawProvider: ethProvider };
  }

  throw new Error(
    "No wallet provider found. Open this app in Farcaster or with a browser wallet like MetaMask."
  );
}

// Проверка и переключение сети на Base mainnet
async function ensureBaseNetwork(rawProvider, provider) {
  const network = await provider.getNetwork();
  const chainIdNum = Number(network.chainId);

  if (chainIdNum === 8453) {
    // уже Base mainnet
    return;
  }

  // Пытаемся переключить сеть (работает в MetaMask и большинстве EIP-1193 провайдеров)
  if (rawProvider && rawProvider.request) {
    try {
      await rawProvider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x2105" }] // 8453 в hex
      });
      return;
    } catch (switchErr) {
      // Если сеть не добавлена — можно пробовать addChain
      // но чтобы не усложнять, просто дадим понятное сообщение
      console.error("wallet_switchEthereumChain error:", switchErr);
      throw new Error(
        "Please switch your wallet to Base mainnet (chainId 8453) and try again."
      );
    }
  } else {
    throw new Error(
      "Wallet does not support network switch. Please switch to Base mainnet manually."
    );
  }
}

async function mintNft() {
  mintStatus.textContent = "Preparing transaction...";
  mintStatus.style.color = "#f5f5ff";

  try {
    const { provider, signer, rawProvider } = await getProviderAndSigner();

    // Убедиться, что мы на Base mainnet
    await ensureBaseNetwork(rawProvider, provider);

    const contract = new ethers.Contract(
      NFT_CONTRACT_ADDRESS,
      NFT_CONTRACT_ABI,
      signer
    );

    const price = await contract.PRICE();
    mintStatus.textContent = "Waiting for wallet confirmation...";

    const tx = await contract.mint({ value: price });
    mintStatus.textContent = "Minting... waiting for confirmation...";
    const receipt = await tx.wait();

    if (receipt.status === 1) {
      mintStatus.textContent = "✅ NFT minted successfully!";
      mintStatus.style.color = "#00e0a0";
    } else {
      mintStatus.textContent = "Transaction failed.";
      mintStatus.style.color = "#ff8b8b";
    }
  } catch (err) {
    console.error("Mint error:", err);
    let msg = "Unknown error";
    if (err && typeof err === "object") {
      msg = err.message || JSON.stringify(err);
    } else if (typeof err === "string") {
      msg = err;
    }
    mintStatus.textContent = "Error: " + msg;
    mintStatus.style.color = "#ff8b8b";
  }
}

mintBtn.onclick = () => {
  mintNft();
};
