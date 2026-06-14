from flask import Flask, jsonify, request, render_template
import json
import uuid

app = Flask(__name__)
DATA_FILE = "data.json"

# --- Helper functions ---

def load_data():
    with open(DATA_FILE, "r") as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

# --- Page route ---

@app.route("/")
def index():
    return render_template("index.html")

# --- Deck routes ---

@app.route("/api/decks", methods=["GET"])
def get_decks():
    data = load_data()
    return jsonify(data["decks"])

@app.route("/api/decks", methods=["POST"])
def create_deck():
    data = load_data()
    body = request.get_json()
    name = body["name"]
    if name in data["decks"]:
        return jsonify({"error": "Deck already exists"}), 400
    data["decks"][name] = []
    save_data(data)
    return jsonify({"message": "Deck created"}), 201

@app.route("/api/decks/<name>", methods=["DELETE"])
def delete_deck(name):
    data = load_data()
    if name not in data["decks"]:
        return jsonify({"error": "Deck not found"}), 404
    del data["decks"][name]
    save_data(data)
    return jsonify({"message": "Deck deleted"})

# --- Card routes ---

@app.route("/api/decks/<name>/cards", methods=["GET"])
def get_cards(name):
    data = load_data()
    if name not in data["decks"]:
        return jsonify({"error": "Deck not found"}), 404
    cards = sorted(data["decks"][name], key=lambda c: c["difficulty"], reverse=True)
    return jsonify(cards)

@app.route("/api/decks/<name>/cards", methods=["POST"])
def add_card(name):
    data = load_data()
    if name not in data["decks"]:
        return jsonify({"error": "Deck not found"}), 404
    body = request.get_json()
    card = {
        "id": str(uuid.uuid4()),
        "question": body["question"],
        "answer": body["answer"],
        "difficulty": 1
    }
    data["decks"][name].append(card)
    save_data(data)
    return jsonify({"message": "Card added"}), 201

@app.route("/api/decks/<name>/cards/<card_id>", methods=["DELETE"])
def delete_card(name, card_id):
    data = load_data()
    if name not in data["decks"]:
        return jsonify({"error": "Deck not found"}), 404
    data["decks"][name] = [c for c in data["decks"][name] if c["id"] != card_id]
    save_data(data)
    return jsonify({"message": "Card deleted"})

@app.route("/api/decks/<name>/cards/<card_id>/result", methods=["POST"])
def update_difficulty(name, card_id):
    data = load_data()
    body = request.get_json()
    correct = body["correct"]
    for card in data["decks"][name]:
        if card["id"] == card_id:
            if correct:
                card["difficulty"] = max(1, card["difficulty"] - 1)
            else:
                card["difficulty"] = min(5, card["difficulty"] + 1)
            break
    save_data(data)
    return jsonify({"message": "Difficulty updated"})

if __name__ == "__main__":
    app.run(debug=True)
    