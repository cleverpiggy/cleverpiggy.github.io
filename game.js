const FIELDS = ["attack", "defense", "hps", "speed"];
const TROOPS = 25;

function play(p1, p2) {

    if (parseInt(document.getElementById("pool").innerHTML) > 0) {
        alert("Allocate the rest of your pool first!");
        return;
    }
    const me = extractStats();
    const them = getOpponentStats();

    switch (fight(me, them)) {
        case 0: alert(`${me.name} wins!`);
        break;
        case 1: alert(`${them.name} wins!`);
        break;
        default: alert(`You've got the same allocations!  Try again.`);
        break;
    }
}


// p1, p2: stat field of each player
// Assumes each player passed validate.
// returns -> winner {0, 1, 2}
//   where 0: p1, 1: p2, 2: identical stats is a tie
function fight(p1, p2) {
    if (symetric(p1, p2)) {
        return 2;
    }
    const order = [null, null];
    if (p1.speed == p2.speed) {
        const first = flip_coin();
        const second = {1:0, 0:1}[first];
        order[first] = p1;
        order[second] = p2;
    } else if (p1.speed > p2.speed) {
        order[0] = p1;
        order[1] = p2;
    } else {
        order[0] = p2;
        order[1] = p1;
    }
    animateOrder(...order);

    while (p1.hps > 0 && p2.hps > 0) {
        attack(...order);
        order.reverse();
    }
    if (p1.hps > 0) {
        return 0;
    } else {
        return 1;
    }
}

function symetric(p1, p2) {
    for (field of FIELDS) {
        if (p1[field] != p2[field]) {
            return false;
        }
    }
    return true;
}

// Modifies defender by the amount of damage he has taken.
function attack(attacker, defender) {
    const dmg = Math.max(attacker.attack - defender.defense, 1);
    defender.hps = Math.max(defender.hps - dmg, 0);
    animateAttack(attack, defender, dmg);
}

function animateOrder(first, second) {
    if (first.speed == second.speed) {
        console.log(`Equal speeds, ${first.name} wins the flip`);
        alert(`Equal speeds, ${first.name} wins the flip`);
    } else {
        console.log(`${first.name} goes first`);
        alert(`${first.name} goes first`);
    }
}

function animateAttack(attacker, defender, dmg) {
    console.log(`${attacker.name} deals ${dmg} damage.  ${defender.name}'s hps are reduced to ${defender.hps}`);
    alert(`${attacker.name} deals ${dmg} damage.  ${defender.name}'s hps are reduced to ${defender.hps}`);
}

function range(name) {
    const sliders = document.getElementsByClassName('slider');
    // Subtract all the slider values from the remaining pool except the one
    // that has been updated.  Hang on the thisSlider.
    var remaining = TROOPS;
    var thisSlider;
    for (slider of sliders) {
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
    for (slider of sliders) {
        slider.max = parseInt(slider.value) + remaining;
    }
    document.getElementById("pool").innerHTML = remaining;
}

function extractStats() {
    var formElement = document.querySelector("form");
    var formData = new FormData(formElement);
    const data = Object.fromEntries(formData.entries());
    return data;
}

function getOpponentStats() {
    return randomFoe();
}

function randomFoe() {
    const output = {name: "foe"};
    // We need a min of 1 for attack and hps.
    var troops = TROOPS;
    output.attack = getRandomInt(1, troops - 1); // we need 1 for hps
    troops -= output.attack;
    output.hps = getRandomInt(1, troops);
    troops -= output.hps;
    output.defense = getRandomInt(0, troops);
    troops -= output.defense;
    output.speed = troops;
    return output;
}

function getRandomInt(min, max) {
    // non inclusive
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
}
