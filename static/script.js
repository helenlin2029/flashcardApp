// --- State ---
let currentDeck = null;
let quizCards = [];
let quizIndex = 0;

// --- Screen Navigation ---

function showHome() {
    hide("deck-screen");
    hide("quiz-screen");
    show("home-screen");
    loadDecks();
}

function showDeck() {
    hide("home-screen");
    hide("quiz-screen");
    show("deck-screen");
    loadCards();
}

function showQuiz() {
    hide("home-screen");
    hide("deck-screen");
    show("quiz-screen");
    startQuiz();
}

// --- Helpers ---

function show(id) {
    document.getElementById(id).classList.remove("hidden");
}

function hide(id) {
    document.getElementById(id).classList.add("hidden");
}

// --- Decks ---

async function loadDecks() {
    const res = await fetch("/api/decks");
    const decks = await res.json();
    const list = document.getElementById("deck-list");
    list.innerHTML = "";
    for (const name in decks) {
        list.innerHTML += `
      <div class="deck-item">
        <span onclick="openDeck('${name}')">${name}</span>
        <button onclick="deleteDeck('${name}')">Delete</button>
      </div>`;
    }
}

async function createDeck() {
    const input = document.getElementById("new-deck-name");
    const name = input.value.trim();
    if (!name) return;
    await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
    });
    input.value = "";
    loadDecks();
}

async function deleteDeck(name) {
    await fetch(`/api/decks/${name}`, { method: "DELETE" });
    loadDecks();
}

function openDeck(name) {
    currentDeck = name;
    document.getElementById("deck-title").textContent = name;
    document.getElementById("quiz-deck-title").textContent = name;
    showDeck();
}

// --- Cards ---

async function loadCards() {
    const res = await fetch(`/api/decks/${currentDeck}/cards`);
    const cards = await res.json();
    const list = document.getElementById("card-list");
    list.innerHTML = "";
    cards.forEach(card => {
        list.innerHTML += `
      <div class="card-item">
        <div class="card-text">
          <strong>Q:</strong> ${card.question} &nbsp;|&nbsp;
          <strong>A:</strong> ${card.answer}
          &nbsp;| Difficulty: ${card.difficulty}
        </div>
        <button onclick="deleteCard('${card.id}')">Delete</button>
      </div>`;
    });
}

async function addCard() {
    const question = document.getElementById("new-question").value.trim();
    const answer = document.getElementById("new-answer").value.trim();
    if (!question || !answer) return;
    await fetch(`/api/decks/${currentDeck}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer })
    });
    document.getElementById("new-question").value = "";
    document.getElementById("new-answer").value = "";
    loadCards();
}

async function deleteCard(cardId) {
    await fetch(`/api/decks/${currentDeck}/cards/${cardId}`, {
        method: "DELETE"
    });
    loadCards();
}

// --- Quiz ---

async function startQuiz() {
    const res = await fetch(`/api/decks/${currentDeck}/cards`);
    quizCards = await res.json();
    quizIndex = 0;
    hide("quiz-complete");
    show("quiz-card");
    showQuestion();
}

function showQuestion() {
    if (quizIndex >= quizCards.length) {
        hide("quiz-card");
        show("quiz-complete");
        return;
    }
    const card = quizCards[quizIndex];
    document.getElementById("question-text").textContent = card.question;
    document.getElementById("answer-text").textContent = card.answer;
    hide("answer-text");
    hide("quiz-buttons");
}

function flipCard() {
    show("answer-text");
    show("quiz-buttons");
}

async function submitResult(correct) {
    const card = quizCards[quizIndex];
    await fetch(`/api/decks/${currentDeck}/cards/${card.id}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correct })
    });
    quizIndex++;
    showQuestion();
}

// --- Init ---
loadDecks();