const ACTION_TIME = 2500;
const ATTRIBUTES = ["attack", "defense", "hps", "speed"];
const POOL = 30;
document.getElementById("pool").innerHTML = POOL;

// Global varibable that mutates every time we edit the stats.
// That way multiple requests with the same stats don't all
// post to the server.
var postId;

function updateId() {
    postId = generateId();
    console.log(postId);
}
// ---------------------------- game logic ------------------------------------------

// villain: 'human' or 'computer'
function play(villain) {
    if (getPool() > 0) {
        alert("Allocate the rest of your pool first!");
        return;
    }
    const me = extractStats();

    if (me.name == "") {
        alert("Enter a name please!");
        return;
    }

    if (villain == "computer") {
        return playCallback(me, randomFoe())
    }

    // We may send many requests for an opponent.  The id is used
    // to insure our stats are only posted once.
    me.id = postId;

    matchup(me)
        .then(opponent => {
            if (!opponent) {
                noHumanMessage(true);
                console.log('failed to find opponent');
            } else {
                noHumanMessage(false);
                playCallback(me, opponent);
            }
        });
}

function playCallback(me, them) {
    // The animation functions want these labels.
    me.who = "hero";
    them.who = "villain";
    showGame(me, them);

    const fightSeq = fight(me, them);
    const actionSeq = new ActionSequence();
    actionSeq.push(prelude, ACTION_TIME);
    actionSeq.push(animateOrder, ACTION_TIME, [fightSeq[0].attacker, fightSeq[0].defender]);
    for (let attack of fightSeq) {
        actionSeq.push(animateAttack, ACTION_TIME, [attack]);
    }
    // The guy who attacked last obviously won.
    const winner = fightSeq.pop().attacker;
    actionSeq.push(animateWin, 0, [winner]);
    actionSeq.execute();
}

// p1, p2: stat field of each player
// Assumes each player passed validate.
// returns -> the action sequence of the fight
function fight(p1, p2) {
    const order = [null, null];
    var flip = false;
    if (p1.speed == p2.speed) {
        const first = flipCoin();
        const second = {1:0, 0:1}[first];
        order[first] = p1;
        order[second] = p2;
        flip = true;
    } else if (p1.speed > p2.speed) {
        order[0] = p1;
        order[1] = p2;
    } else {
        order[0] = p2;
        order[1] = p1;
    }

    // push each attack to animate later
    const actionSeq = [];

    while (p1.hps > 0 && p2.hps > 0) {
        console.log('attacking');
        actionSeq.push(attack(...order));
        order.reverse();
    }

    return actionSeq;
}

// Modifies defender by the amount of damage he has taken.
// Returns an object {attacker, defender, damage}
function attack(attacker, defender) {
    const dmg = Math.max(attacker.attack - defender.defense, 1);
    defender.hps = Math.max(defender.hps - dmg, 0);
    return {
        attacker: clone(attacker),
        defender: clone(defender),
        damage: dmg,
    };
}

// returns a promise
// stats: hero stats to post to the server
function matchup(stats) {
    // TODO:  Here we do an http fetch to get the actual opponent
    return fetch(MATCH_URL, {
        method: "POST",
        body: JSON.stringify(stats),
        headers: {'Content-Type': 'application/json'}
    })
        .then(response => response.json())
        .then(response => response.success ? intify(response.villain) : null);
}

function intify(stats) {
    console.log('intify', stats);
    for (attr of ATTRIBUTES) {
        stats[attr] = parseInt(stats[attr]);
    }
    return stats;
}

function randomFoe() {
    const output = {name: "foe", who: "villain", attack: 1, defense: 0, hps: 1, speed: 0};
    // Each position corresponds the same position in ATTRIBUTES.
    const ratios = ATTRIBUTES.map(_ => Math.random());
    const tot = ratios.reduce((a, b) => a + b);

    var available = POOL - 2; // Subtract the mandatory 1 hp and 1 attack.
    const values = ratios.map(r => Math.round(available * r / tot));
    for (let i = 0; i < ATTRIBUTES.length; i++) {
        let field = ATTRIBUTES[i];
        let value = values[i];

        // It's possible we don't end up with the exact number depending
        // on how the rounding went so I'll check the available pool at
        // each step and stop assigning when it hits zero.
        if (value >= available) {
            output[field] += available;
            break;
        }
        output[field] += value;
        available -= value;
    }
    return output;
}

// ------------------------------ ui / display ----------------------------------

function nextAttackFactory(className) {
    const gifs = document.getElementsByClassName(className);
    const attacks = [...gifs].filter(n => n.classList.contains("attack-gif"));
    var cursor = attacks.length - 1;
    return function () {
        for (let gif of gifs) {
            gif.hidden = true;
        }
        cursor = (cursor + 1) % attacks.length;
        attacks[cursor].hidden = false;
        reanimateGif(attacks[cursor]);
    }
}

const showAttackGif = {
    hero: nextAttackFactory('hero-gif'),
    villain: nextAttackFactory('villain-gif'),
};

function reanimateGif(gif) {
    // This is just how you do it /shrug.
    const src = gif.src;
    gif.src = ""
    gif.src = src;
}

function prelude() {
    for (element of document.getElementsByClassName("attack-gif")) {
        element.hidden = true;
    }
    for (let gif of document.getElementsByClassName("dodge-gif")) {
        gif.hidden = false;
        reanimateGif(gif);
    }
}

function animateOrder(first, second) {
    if (first.speed == second.speed) {
        console.log(`Equal speeds, ${first.name} wins the flip`);
        actionLog("Equal speeds, flipping a coin...")
        actionLog(`${first.name} wins the flip`);
    } else {
        console.log(`${first.name} goes first`);
        actionLog(`${first.name} goes first`);
    }
}

// attack {attacker, defender, damage}
function animateAttack(attk) {
    // Start the gif then set a timeout to show the attack result near the end of the gif sequence.
    showAttackGif[attk.attacker.who]();
    setTimeout(() => {
        console.log(`${attk.attacker.name} deals ${attk.damage} damage.  ${attk.defender.name}'s hps are reduced to ${attk.defender.hps}`);
        actionLog(`${attk.attacker.name} deals ${attk.damage} damage.  ${attk.defender.name}'s hps are reduced to ${attk.defender.hps}`);
        setHps(attk.defender.who, attk.defender.hps, true);
    }, ACTION_TIME);
}

function animateWin(winner) {
    console.log(`${winner.name} wins!`);
    actionLog(`${winner.name} wins!`);
    document.getElementById("play-again").style.display = "inherit";
}

function showGame(heroStats, villainStats) {

    for (let e of document.getElementsByClassName("input")) {
        e.style.display = "none";
    }
    clearLog();
    fillTable("hero", heroStats);
    fillTable("villain", villainStats);
    setHps("hero", heroStats.hps);
    setHps("villain", villainStats.hps);
    document.getElementById("output").style.display = "initial";
}

function playAgain() {
    document.getElementById("output").style.display = "none";
    document.getElementById("play-again").style.display = "none";
    for (let e of document.getElementsByClassName("input")) {
        e.style.display = "flex";
    }
}

function fillTable(tableId, stats) {
    // The names of the table elements match the names
    // of the stats objects.
    const table = document.getElementById(tableId);
    for (let name in stats) {
        let elements = table.getElementsByClassName(name);
        // This will skip the 'type' field and any additional non applicable fields that are added.
        if (elements.length == 1) {
            elements[0].innerHTML = stats[name];
        }
    }
}

function setHps(who, amount, damage) {
    const id = (who == "hero") ? "hero-hps" : "villain-hps";
    const hpsEle = document.getElementById(id);
    hpsEle.innerHTML = `Hps: ${amount}`;
    // Have the guy whos hps went down flash red for a second.
    if (damage) {
        hpsEle.style.color = "red";
        setTimeout(() => hpsEle.style.color = "black", 1000);
    }
}

// Add a span element with the mssg and a line break to the action log.
function actionLog(mssg) {
    const line = document.createElement('span');
    line.innerHTML = mssg;
    const log = document.getElementById("action-log");
    log.appendChild(document.createElement('br'));
    log.appendChild(line);
}

function clearLog() {
    document.getElementById("action-log").innerHTML = "";
}

function noHumanMessage(is_active) {
    const ele = document.getElementById("no-human").hidden = !is_active;
}

function flashDamage(who) {
    ;
}

function extractStats() {
    const stats = {};
    var statElement = document.getElementById("stat-input");
    for (element of statElement.getElementsByTagName("input")) {
        stats[element.name] = element.value;
    }
    return stats;
}

// Custom 'oninput' functionality for the html range sliders
function range(name) {
    updateId();
    const sliders = document.getElementsByClassName('slider');
    // Subtract all the slider values from the remaining pool except the one
    // that has been updated.  Hang on the thisSlider.
    var remaining = POOL;
    var thisSlider;
    for (let slider of sliders) {
        if (slider.name != name) {
            remaining -= parseInt(slider.value);
        } else {
            thisSlider = slider;
        }
    }
    // Set the slider to the lesser of it's current value and
    // it's maximum allowed value.
    if (parseInt(thisSlider.value) > remaining) {
        thisSlider.value = remaining;
    }
    remaining -= parseInt(thisSlider.value);

    // Update the label
    document.getElementById(name).innerHTML = thisSlider.value;

    // Now set the max on all sliders to their current value + remaining
    for (let slider of sliders) {
        slider.max = parseInt(slider.value) + remaining;
    }
    document.getElementById("pool").innerHTML = remaining;
}

function getPool() {
    return parseInt(document.getElementById("pool").innerHTML);
}

//-------------------------------- utils ----------------------------------------

function flipCoin() {
    if (Math.random() > 0.5) {
        return 0;
    }
    return 1;
}

// I'll just do an iteger from 0 to billion.
function generateId() {
    return Math.round(Math.random() * 1000000000);
}


function clone(obj) {
    return Object.assign({}, obj);
}


function ActionSequence() {
    this.actions = [];
}

// func: (required) function
// timeout: (default 0) in milliseconds
// args: (optional) Array of args for func
ActionSequence.prototype.push = function(func, timeout, args) {
    this.actions.push({
        func: func,
        timeout: timeout ? timeout : 0,
        args: args ? args : [],
    });
};

ActionSequence.prototype.execute = function() {
    const loop = function(actions) {
        if (actions.length == 0) {
            return;
        }
        const action = actions[0]
        action.func(...action.args);
        setTimeout(() => loop(actions.slice(1)), action.timeout);
    }
    loop(this.actions);
}
