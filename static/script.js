// --- State ---
let currentDeck = null;
let quizCards = [];
let quizIndex = 0;
let currentMode = 'learning';
let quizScore = 0;
let quizTotal = 0;

// --- Screen Navigation ---

function showHome() {
    hide("deck-screen");
    hide("quiz-screen");
    show("home-screen");
    hide("nav-quiz-btn");
    loadDecks();
}

function showDeck() {
    hide("home-screen");
    hide("quiz-screen");
    show("deck-screen");
    show("nav-quiz-btn");
    loadCards();
}

function showQuiz() {
    hide("home-screen");
    hide("deck-screen");
    show("quiz-screen");
    currentMode = 'learning';
    document.getElementById('btn-learning').classList.add('active');
    document.getElementById('btn-quiz').classList.remove('active');
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

// --- Mode ---

function setMode(mode) {
    currentMode = mode;
    document.getElementById('btn-learning').classList.toggle('active', mode === 'learning');
    document.getElementById('btn-quiz').classList.toggle('active', mode === 'quiz');
    startQuiz();
}

// --- Quiz ---

async function startQuiz() {
    const res = await fetch(`/api/decks/${currentDeck}/cards`);
    quizCards = await res.json();
    quizCards = shuffleCards(quizCards);
    quizIndex = 0;
    quizScore = 0;
    quizTotal = 0;
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

    // Reset card state
    const card = quizCards[quizIndex];
    document.getElementById("question-text").textContent = card.question;
    document.getElementById("answer-text").textContent = card.answer;
    hide("answer-text");
    hide("learning-buttons");
    hide("quiz-options");
    hide("flip-hint");

    if (currentMode === 'learning') {
        show("flip-hint");
        document.getElementById("quiz-card").onclick = flipCard;
    } else {
        document.getElementById("quiz-card").onclick = null;
        showOptions(card);
    }
}

function flipCard() {
    show("answer-text");
    show("learning-buttons");
    hide("flip-hint");
    document.getElementById("quiz-card").onclick = null;
}

function showOptions(currentCard) {
    // Need at least 3 cards total for 2 wrong answers
    const otherCards = quizCards.filter((_, i) => i !== quizIndex);

    let options;
    if (otherCards.length >= 2) {
        const wrong = shuffleCards([...otherCards]).slice(0, 2);
        options = shuffleCards([currentCard, ...wrong]);
    } else if (otherCards.length === 1) {
        options = shuffleCards([currentCard, otherCards[0]]);
        // Pad with a dummy if needed
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
    quizTotal++;

    for (let i = 0; i < 3; i++) {
        const b = document.getElementById(`option-${i}`);
        b.disabled = true;
        if (b.dataset.correct === 'true') b.classList.add('option-correct');
        else b.classList.add('option-wrong');
    }

    if (correct) {
        quizScore++;
        setTimeout(() => { quizIndex++; showQuestion(); }, 800);
    } else {
        setTimeout(() => { quizIndex++; showQuestion(); }, 1200);
    }
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