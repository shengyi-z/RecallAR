//@input Component.MLComponent ml
//@input Component.AudioComponent sabrinaAudio
//@input Component.AudioComponent cleoAudio

var ml = script.ml;
var frameCount = 0;

// ===== Tunable parameters =====
var FRAME_SKIP = 15;          // run every N frames
var SCORE_THRESHOLD = 0.995;  // minimum best score to accept known person
var MIN_MARGIN = 0.002;       // best - second best must exceed this
var SMOOTH_WINDOW = 5;        // number of recent predictions to smooth over

// 把 embeddings_lens.json 内容直接贴到这里
var db = {}// ===== State =====
var recentResults = [];

// ===== Helpers =====
function l2Normalize(v) {
    var norm = 0.0;
    for (var i = 0; i < v.length; i++) {
        norm += v[i] * v[i];
    }
    norm = Math.sqrt(norm);

    if (norm === 0) {
        return v;
    }

    var out = [];
    for (var j = 0; j < v.length; j++) {
        out.push(v[j] / norm);
    }
    return out;
}

// Assumes both vectors are already L2-normalized
function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) {
        return -1;
    }

    var dot = 0.0;
    for (var i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
    }
    return dot;
}

// Optionally normalize DB on startup in case you pasted raw vectors
function normalizeDatabase() {
    for (var name in db) {
        var refs = db[name];
        for (var i = 0; i < refs.length; i++) {
            refs[i] = l2Normalize(refs[i]);
        }
    }
}

function findBestMatch(embedding) {
    var bestName = "Unknown";
    var bestScore = -1;
    var secondScore = -1;

    for (var name in db) {
        var refs = db[name];
        var personBest = -1;

        for (var i = 0; i < refs.length; i++) {
            var score = cosineSimilarity(embedding, refs[i]);
            if (score > personBest) {
                personBest = score;
            }
        }

        if (personBest > bestScore) {
            secondScore = bestScore;
            bestScore = personBest;
            bestName = name;
        } else if (personBest > secondScore) {
            secondScore = personBest;
        }
    }

    var margin = bestScore - secondScore;

    if (bestScore < SCORE_THRESHOLD || margin < MIN_MARGIN) {
        bestName = "Unknown";
    }

    return {
        name: bestName,
        score: bestScore,
        secondScore: secondScore,
        margin: margin
    };
}

function smoothResult(name) {
    recentResults.push(name);

    if (recentResults.length > SMOOTH_WINDOW) {
        recentResults.shift();
    }

    var counts = {};
    for (var i = 0; i < recentResults.length; i++) {
        var n = recentResults[i];
        counts[n] = (counts[n] || 0) + 1;
    }

    var bestName = "Unknown";
    var bestCount = 0;

    for (var key in counts) {
        if (counts[key] > bestCount) {
            bestCount = counts[key];
            bestName = key;
        }
    }

    return bestName;
}

function hasValidDatabase() {
    for (var name in db) {
        if (db[name] && db[name].length > 0 && db[name][0].length > 0) {
            return true;
        }
    }
    return false;
}

// ===== Init =====
normalizeDatabase();

// ===== Main loop =====
script.createEvent("UpdateEvent").bind(function () {
    frameCount++;
    if (frameCount % FRAME_SKIP !== 0) {
        return;
    }

    if (!ml) {
        print("No ML component assigned");
        return;
    }

    if (!hasValidDatabase()) {
        print("Database is empty. Paste real normalized embeddings into db.");
        return;
    }

    try {
        var output = ml.getOutput("516");

        if (!output || !output.data || output.data.length !== 512) {
            print("Output not ready");
            return;
        }

        var embedding = l2Normalize(Array.from(output.data));
        var rawResult = findBestMatch(embedding);
        var stableName = smoothResult(rawResult.name);

        print(
            "Raw: " + rawResult.name +
            " | Stable: " + stableName +
            " | score=" + rawResult.score +
            " | second=" + rawResult.secondScore +
            " | margin=" + rawResult.margin
        );
    } catch (e) {
        print("Recognition error: " + e);
    }
});