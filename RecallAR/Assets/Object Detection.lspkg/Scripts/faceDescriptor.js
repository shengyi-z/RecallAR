// FaceRecognizer.js
// @input Component.MLComponent mlComponent
// @input Component.Text resultLabel

// --- STEP A: Paste your pre-captured embeddings here ---
// Run registerMode = true first to capture, then paste the output
var knownPeople = [
    {
        name: "Your Son · David · 40 yrs",
        embedding: null  // filled after registration
    },
    {
        name: "Your Daughter · Sarah",
        embedding: null  // filled after registration
    }
];

var THRESHOLD = 0.6; // cosine similarity threshold — tune this

// --- Cosine similarity ---
function cosineSim(a, b) {
    var dot = 0, na = 0, nb = 0;
    for (var i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// --- Run inference every frame ---
script.createEvent("UpdateEvent").bind(function () {
    if (!script.mlComponent) return;

    script.mlComponent.runImmediate(true);

    var output = script.mlComponent
        .getOutput("output")
        .data; // float32 array, length 512

    // Compare against known people
    var bestMatch = null;
    var bestScore = -1;

    for (var i = 0; i < knownPeople.length; i++) {
        if (!knownPeople[i].embedding) continue;
        var score = cosineSim(output, knownPeople[i].embedding);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = knownPeople[i];
        }
    }

    if (bestMatch && bestScore > THRESHOLD) {
        if (script.resultLabel) {
            script.resultLabel.text = bestMatch.name;
        }
        print("Recognized: " + bestMatch.name + " (" + bestScore.toFixed(2) + ")");
    } else {
        if (script.resultLabel) {
            script.resultLabel.text = "Unknown person";
        }
    }
});