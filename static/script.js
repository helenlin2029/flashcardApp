// --- State ---
let currentDeck = null;
let quizCards = [];
let quizIndex = 0;
let currentMode = 'learning';
let quizScore = 0;
let quizTotal = 0;
let correctCards = [];
let wrongCards = [];

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

function showQuiz(mode) {
    currentMode = mode;
    hide("home-screen");
    hide("deck-screen");
    show("quiz-screen");
    document.getElementById("quiz-screen-title").textContent = currentDeck;
    startQuiz();
}

// --- Helpers ---

function show(id) {
    document.getElementById(id).classList.remove("hidden");
}

function hide(id) {
    document.getElementById(id).classList.add("hidden");
}

// --- Modal ---

function openCreateDeck() {
    show("modal-overlay");
}

function closeCreateDeck() {
    hide("modal-overlay");
    document.getElementById("new-deck-name").value = "";
}

// --- Decks ---

async function loadDecks() {
    const res = await fetch("/api/decks");
    const decks = await res.json();
    const list = document.getElementById("deck-list");
    list.innerHTML = "";
    for (const name in decks) {
        list.innerHTML += `
        <div class="deck-item" onclick="openDeck('${name}')">
            <span>${name}</span>
            <button class="delete-btn" onclick="event.stopPropagation(); deleteDeck('${name}')">Delete</button>
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
    closeCreateDeck();
    loadDecks();
}

async function deleteDeck(name) {
    await fetch(`/api/decks/${name}`, { method: "DELETE" });
    loadDecks();
}

function openDeck(name) {
    currentDeck = name;
    document.getElementById("deck-title").textContent = name;
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
            <button class="delete-btn" onclick="deleteCard('${card.id}')">Delete</button>
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
    await fetch(`/api/decks/${currentDeck}/cards/${cardId}`, { method: "DELETE" });
    loadCards();
}

// --- Quiz ---

async function startQuiz() {
    const res = await fetch(`/api/decks/${currentDeck}/cards`);
    quizCards = await res.json();
    quizCards = shuffleCards(quizCards);
    quizIndex = 0;
    quizScore = 0;
    quizTotal = 0;
    correctCards = [];
    wrongCards = [];
    hide("quiz-complete");
    show("quiz-card");
    showQuestion();
}

function shuffleCards(cards) {
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
}

function showQuestion() {
    if (quizIndex >= quizCards.length) {
        hide("quiz-card");
        show("quiz-complete");
        if (currentMode === 'quiz') {
            const pct = Math.round((quizScore / quizTotal) * 100);
            document.getElementById("quiz-score").textContent =
                `You got ${quizScore} out of ${quizTotal} correct (${pct}%)`;
        }
        return;
    }

    const card = quizCards[quizIndex];
    document.getElementById("question-text").textContent = card.question;
    document.getElementById("answer-text").textContent = card.answer;
    hide("answer-text");
    hide("quiz-options");
    hide("flip-hint");

    document.getElementById("quiz-card").onclick = null;
    hide("flip-hint");
    hide("learning-nav");
    showOptions(card);

    if (currentMode === 'learning') {
        show("learning-nav");
    }

    if (currentMode === 'quiz') {
        const pct = Math.round((quizScore / quizTotal) * 100);
        document.getElementById("quiz-score").textContent =
            `You got ${quizScore} out of ${quizTotal} correct (${pct}%)`;

        const correctList = document.getElementById("correct-list");
        const wrongList = document.getElementById("wrong-list");
        correctList.innerHTML = "";
        wrongList.innerHTML = "";

        correctCards.forEach(card => {
            correctList.innerHTML += `<li>${card.question}</li>`;
        });
        wrongCards.forEach(card => {
            wrongList.innerHTML += `<li>${card.question}</li>`;
        });
    }
}

function flipCard() {
    if (document.getElementById("answer-text").classList.contains("hidden")) {
        show("answer-text");
        hide("flip-hint");
        document.getElementById("quiz-card").onclick = nextCard;
    }
}

function prevCard() {
    if (quizIndex > 0) {
        quizIndex--;
        showQuestion();
    }
}

function nextCard() {
    if (quizIndex < quizCards.length - 1) {
        quizIndex++;
        showQuestion();
    }
}

function showOptions(currentCard) {
    const otherCards = quizCards.filter((_, i) => i !== quizIndex);

    let options;
    if (otherCards.length >= 2) {
        const wrong = shuffleCards([...otherCards]).slice(0, 2);
        options = shuffleCards([currentCard, ...wrong]);
    } else if (otherCards.length === 1) {
        options = shuffleCards([currentCard, otherCards[0]]);
        while (options.length < 3) options.push({ id: 'dummy', answer: 'None of the above' });
    } else {
        options = [currentCard, { id: 'dummy1', answer: 'None of the above' }, { id: 'dummy2', answer: 'Not applicable' }];
    }

    for (let i = 0; i < 3; i++) {
        const btn = document.getElementById(`option-${i}`);
        btn.textContent = options[i].answer;
        btn.dataset.correct = options[i].id === currentCard.id;
        btn.className = 'option-btn';
        btn.disabled = false;
    }
    show("quiz-options");
}

function selectOption(index) {
    const btn = document.getElementById(`option-${index}`);
    const correct = btn.dataset.correct === 'true';

    if (currentMode === 'quiz') {
        quizTotal++;
        if (correct) {
            quizScore++;
            correctCards.push(quizCards[quizIndex]);
        } else {
            wrongCards.push(quizCards[quizIndex]);
        }
        quizIndex++;
        showQuestion();
    } else {
        // Learning mode — highlight correct/incorrect, wait for nav buttons
        for (let i = 0; i < 3; i++) {
            const b = document.getElementById(`option-${i}`);
            b.disabled = true;
            if (b.dataset.correct === 'true') b.classList.add('option-correct');
            else b.classList.add('option-wrong');
        }
    }
}

// --- Init ---
loadDecks();