const ATTRIBUTES = ["attack", "defense", "hps", "speed"];
const POOL = 25;


// ---------------------------- game logic ------------------------------------------

// villian: 'human' or 'computer'
function initiateMatch(villian) {

    if (parseInt(document.getElementById("pool").innerHTML) > 0) {
        alert("Allocate the rest of your pool first!");
        return;
    }
    const me = extractStats();

    if (me.name == "") {
        alert("Enter a name please!");
        return;
    }

    getOpponentStats(villian, me)
        .then(opponent => {
            if (!opponent) {
                console.log('failed to find opponent');
            } else {
                play(me, opponent);
            }
        });
}

function play(me, them) {
    showGame(me, them);
    const actionSeq = fight(me, them);
    if (!actionSeq) {
        alert("You have the same allocations!  Try again.");
        return;
    }
    const delay = timeout(1500, 1000);
    delay(animateOrder, [actionSeq[0].attacker, actionSeq[0].defender]);
    for (let attack of actionSeq) {
        delay(animateAttack, [attack]);
    }

    // The guy who attacked last obviously won.
    const winner = actionSeq.pop().attacker;
    delay(animateWin, [winner]);
}

// p1, p2: stat field of each player
// Assumes each player passed validate.
// returns -> the action sequence of the fight
function fight(p1, p2) {
    if (symetric(p1, p2)) {
        return null;
    }

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

function symetric(p1, p2) {
    for (let field of ATTRIBUTES) {
        if (p1[field] != p2[field]) {
            return false;
        }
    }
    return true;
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

// stats: hero stats
// Omitting the parameter is the flag for using the computer opponent.
function getOpponentStats(villian, stats) {
    if (villian == "computer") {
        return new Promise((resolve, reject) => resolve(randomFoe()));
    }
    // TODO:  Here we do an http fetch to get the actual opponent
    return new Promise((resolve, reject) => resolve(null));
}

function randomFoe() {
    const output = {name: "foe", who: "villian", attack: 1, defense: 0, hps: 1, speed: 0};
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

function animateOrder(first, second) {
    if (first.speed == second.speed) {
        console.log(`Equal speeds, ${first.name} wins the flip`);
        attackMessage(`Equal speeds, ${first.name} wins the flip`);
    } else {
        console.log(`${first.name} goes first`);
        attackMessage(`${first.name} goes first`);
    }
}

// attack {attacker, defender, damage}
function animateAttack(attk) {
    console.log(`${attk.attacker.name} deals ${attk.damage} damage.  ${attk.defender.name}'s hps are reduced to ${attk.defender.hps}`);
    attackMessage(`${attk.attacker.name} deals ${attk.damage} damage.  ${attk.defender.name}'s hps are reduced to ${attk.defender.hps}`);
    flashDamage(attk.defender.who);
    reduceHps(attk.defender);
}

function animateWin(winner) {
    console.log(`${winner.name} wins!`);
    attackMessage(`${winner.name} wins!`);
}

function showGame(heroStats, villianStats) {

    fillTable("hero", heroStats);
    fillTable("villian", villianStats);
    for (let e of document.getElementsByClassName("output")) {
        e.style.visibility = "visible";
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

function attackMessage(mssg) {
    document.getElementById("attack-info").innerHTML = mssg;
}

// who: "hero" / "villian"
function flashDamage(who) {
    unflashDamage();
    document.getElementById(who).style.backgroundColor = "red";
}

function unflashDamage() {
    document.getElementById("hero").style.backgroundColor = "";
    document.getElementById("villian").style.backgroundColor = "";
}

function reduceHps(defender) {
    const element = document
        .getElementById(defender.who)
        .getElementsByClassName("hps")[0];
    element.innerHTML = defender.hps;
}

function extractStats() {
    var formElement = document.querySelector("form");
    var formData = new FormData(formElement);
    const data = Object.fromEntries(formData.entries());
    data.who = "hero";
    return data;
}

// Custom 'oninput' functionality for the html range sliders
function range(name) {
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


//-------------------------------- utils ----------------------------------------

function flipCoin() {
    if (Math.random() > 0.5) {
        return 0;
    }
    return 1;
}

// Return a settimeout function that increments its
// timeout every call.  Optionally set an initial timeout
// with the second parameter.  Otherwise the first call
// happens immediately.
function timeout(increment, initial) {
    var t = (initial) ? initial : 0;
    var output = function(callback, args) {
        setTimeout(callback, t, ...args);
        t += increment;
    }
    return output;
}

function clone(obj) {
    return Object.assign({}, obj);
}
