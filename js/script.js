/* Cinema-X shared script */
// Every page loads this file, so each feature first checks its form or list exists

/* Film data */
// Shared by the recommendation, booking and watchlist features.
// genres and suits use the same lowercase values as the form's radio buttons.
var movies = [
    { id: "inside-out-2", title: "Inside Out 2", rating: "PG", price: 15.00, genres: ["animation", "comedy"], suits: ["family"] },
    { id: "wild-robot", title: "The Wild Robot", rating: "PG", price: 15.00, genres: ["animation"], suits: ["family"] },
    { id: "paddington-peru", title: "Paddington in Peru", rating: "PG", price: 15.00, genres: ["comedy"], suits: ["family"] },
    { id: "barbie", title: "Barbie", rating: "PG", price: 17.50, genres: ["comedy"], suits: ["friends", "date"] },
    { id: "top-gun-maverick", title: "Top Gun: Maverick", rating: "M", price: 19.50, genres: ["action", "drama"], suits: ["friends", "solo"] },
    { id: "dune-part-two", title: "Dune: Part Two", rating: "M", price: 21.00, genres: ["sci-fi", "action"], suits: ["solo", "friends"] },
    { id: "quiet-place-day-one", title: "A Quiet Place: Day One", rating: "M", price: 17.50, genres: ["horror", "sci-fi"], suits: ["friends"] },
    { id: "past-lives", title: "Past Lives", rating: "M", price: 17.50, genres: ["drama"], suits: ["date", "solo"] },
    { id: "oppenheimer", title: "Oppenheimer", rating: "MA15+", price: 21.00, genres: ["drama"], suits: ["solo"] }
];

// Ratings as numbers so they can be compared with <=
var ratingLevels = { "G": 0, "PG": 1, "M": 2, "MA15+": 3 };

// Highest rating per age group; teens stop at M because MA15+ is restricted for under-15s
var maxLevelForAge = { child: 1, teen: 2, adult: 3 };

// Wording used to turn form values into readable sentences
var genreNames = { action: "Action", comedy: "Comedy", animation: "Animation", drama: "Drama", "sci-fi": "Sci-Fi", horror: "Horror" };
var preferenceNames = { family: "families", date: "a date night", friends: "a group of friends", solo: "watching alone" };
var ageLimitText = { child: "rated G or PG", teen: "rated M or below", adult: "of any rating" };
var ageSuitText = { child: "Suitable for children", teen: "Suitable for teens", adult: "Suitable for adults" };

var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Shared helpers */
// Returns the film with this id, or undefined if there is none
function findMovie(id) {
    return movies.find(function (movie) {
        return movie.id === id;
    });
}

// Returns the checked value in a radio group, or null if nothing is checked
function getChecked(name) {
    var checked = document.querySelector('input[name="' + name + '"]:checked');
    return checked ? checked.value : null;
}

// Creates an element with an optional class and text, adds it to parent and returns it.
// textContent is used so text is always shown as plain text, never as HTML.
function addElement(parent, tag, className, text) {
    var element = document.createElement(tag);
    if (className) {
        element.className = className;
    }
    if (text) {
        element.textContent = text;
    }
    parent.appendChild(element);
    return element;
}

// Poster and rating badge, used by both recommendation and watchlist cards
function addPoster(parent, movie) {
    var img = addElement(parent, "img");
    img.src = "images/" + movie.id + ".jpg";
    img.alt = movie.title + " film poster";
    img.width = 400;
    img.height = 600;
}

function addRating(parent, movie) {
    // "MA15+" becomes "rating-ma" to match the CSS badge classes
    var badge = addElement(parent, "span", "rating rating-" + movie.rating.replace("15+", "").toLowerCase());
    addElement(badge, "span", "visually-hidden", "Rated ");
    badge.appendChild(document.createTextNode(movie.rating));
}

// Shows or clears each [id, message] pair under its field and marks the field for screen readers.
// Returns the first invalid field so it can be focused, or null when everything is valid.
function showErrors(checks) {
    var firstInvalid = null;
    for (var i = 0; i < checks.length; i++) {
        var field = document.getElementById(checks[i][0]);
        var message = checks[i][1];
        document.getElementById(checks[i][0] + "-error").textContent = message;
        field.setAttribute("aria-invalid", message ? "true" : "false");
        if (message && !firstInvalid) {
            // Radio and checkbox groups are fieldsets, so focus their first option instead
            firstInvalid = field.tagName === "FIELDSET" ? field.querySelector("input") : field;
        }
    }
    return firstInvalid;
}

/* Recommendation page */
function initRecommend() {
    var form = document.getElementById("recommend-form");
    if (!form) {
        return;
    }

    form.addEventListener("submit", function (event) {
        // Results are shown on this page, so stop the form reloading it
        event.preventDefault();

        var genre = getChecked("genre");
        var age = getChecked("age");
        var preference = getChecked("preference");
        var error = document.getElementById("recommend-error");
        var title = document.getElementById("results-title");
        var summary = document.getElementById("results-summary");
        var list = document.getElementById("results");

        if (!genre || !age || !preference) {
            error.textContent = "Choose an answer for all three questions.";
            return;
        }
        error.textContent = "";

        var result = recommend(genre, age, preference);
        if (result.exactMatch) {
            title.textContent = "Recommended films";
            summary.textContent = "Films " + ageLimitText[age] + ", ranked by " + genreNames[genre] + " first, then by how good they are for " + preferenceNames[preference] + ".";
        } else {
            title.textContent = "No exact match";
            summary.textContent = "There are no " + genreNames[genre] + " films " + ageLimitText[age] + ". These are the closest films for " + preferenceNames[preference] + " instead.";
        }

        // Replace any previous results, then bring them into view below the form
        list.textContent = "";
        for (var i = 0; i < result.picks.length; i++) {
            buildResultCard(list, result.picks[i], i === 0, genre, age, preference);
        }
        document.getElementById("results-panel").scrollIntoView({ behavior: "smooth" });
    });
}

/*
  Rule-based matching:
  1. The age group removes films above its allowed rating.
  2. Each remaining film scores 2 for a genre match and 1 for suiting the viewing preference.
  3. The top three scores are returned.
  4. If no allowed film is in the chosen genre, the three closest films are returned instead.
*/
function recommend(genre, age, preference) {
    var scored = [];
    var exactMatch = false;

    for (var i = 0; i < movies.length; i++) {
        var movie = movies[i];

        // Step 1: skip films above the age group's allowed rating
        if (ratingLevels[movie.rating] > maxLevelForAge[age]) {
            continue;
        }

        // Step 2: score the film
        var genreMatch = movie.genres.indexOf(genre) !== -1;
        var preferenceMatch = movie.suits.indexOf(preference) !== -1;
        var score = 0;
        if (genreMatch) {
            score += 2;
            exactMatch = true;
        }
        if (preferenceMatch) {
            score += 1;
        }
        scored.push({ movie: movie, score: score, genreMatch: genreMatch, preferenceMatch: preferenceMatch });
    }

    // Step 3: highest score first
    scored.sort(function (a, b) {
        return b.score - a.score;
    });

    // Step 4: when some film matches the genre, films that match nothing are left out
    if (exactMatch) {
        scored = scored.filter(function (pick) {
            return pick.score > 0;
        });
    }
    return { picks: scored.slice(0, 3), exactMatch: exactMatch };
}

// One result card, listing the reasons the film matched
function buildResultCard(list, pick, isBest, genre, age, preference) {
    var li = addElement(list, "li", isBest ? "result best" : "result");
    addPoster(li, pick.movie);
    var box = addElement(li, "div");
    addRating(box, pick.movie);
    if (isBest) {
        addElement(box, "span", "best-label", "Best match");
    }
    addElement(box, "h3", "", pick.movie.title);

    var reasons = addElement(box, "ul", "reasons");
    addElement(reasons, "li", "", "✓ " + ageSuitText[age]);
    if (pick.genreMatch) {
        addElement(reasons, "li", "", "✓ " + genreNames[genre]);
    }
    if (pick.preferenceMatch) {
        addElement(reasons, "li", "", "✓ Good for " + preferenceNames[preference]);
    }

    var link = addElement(box, "a", "btn btn-primary", "Book this film");
    link.href = "booking.html?movie=" + pick.movie.id;
}

/* Booking page */
// Discounts applied to the adult price for each ticket type
var ticketRates = { adult: 1, child: 0.7, student: 0.85 };
var ticketTypeNames = { adult: "Adult", child: "Child", student: "Student" };

var cardLengths = { visa: 16, mastercard: 16, amex: 15 };

function initBooking() {
    var form = document.getElementById("booking-form");
    if (!form) {
        return;
    }

    var email = document.getElementById("email");
    var movieSelect = document.getElementById("movie");
    var movieHint = document.getElementById("movie-hint");
    var screening = document.getElementById("screening");
    var tickets = document.getElementById("tickets");
    var billingEmail = document.getElementById("billing-email");
    var sameEmail = document.getElementById("same-email");
    var submitted = false;

    // Pre-fill the film passed in the link, e.g. booking.html?movie=dune-part-two
    var movieId = new URLSearchParams(window.location.search).get("movie");
    if (findMovie(movieId)) {
        movieSelect.value = movieId;
        movieHint.hidden = false;
    }

    // Stops the date picker offering past times (the submit check still enforces it)
    screening.min = toDateTimeValue(new Date());

    // Runs on every edit in the form (typing, ticking, choosing from a list)
    form.addEventListener("input", function (event) {
        // The hint only describes the pre-filled film, so hide it once the user picks another
        if (event.target === movieSelect) {
            movieHint.hidden = true;
        }

        updateDynamicFields();

        // After the first submit attempt, re-check so each error clears as soon as it is fixed
        if (submitted) {
            validateBooking();
        }
    });

    form.addEventListener("submit", function (event) {
        submitted = true;
        var firstInvalid = validateBooking();
        if (firstInvalid) {
            event.preventDefault();
            firstInvalid.focus();
        }
    });

    // Run now, and again on "pageshow": when the user comes Back to this page, the browser
    // restores the form's values after this script has run, so the shown fields must catch up
    updateDynamicFields();
    window.addEventListener("pageshow", updateDynamicFields);

    // Reads only the form's current values, so it is safe to run at any time
    function updateDynamicFields() {
        var payment = getChecked("payment");

        // Show only the fields for the chosen payment method
        showFields("voucher-fields", payment === "voucher");
        showFields("card-fields", payment === "online");

        // While ticked, the billing email copies the email and can't be edited
        billingEmail.readOnly = sameEmail.checked;
        if (sameEmail.checked) {
            billingEmail.value = email.value;
        }

        updateTicket();
    }

    function updateTicket() {
        var movie = findMovie(movieSelect.value);
        var type = getChecked("ticket_type") || "adult";
        var count = ticketCount(tickets.value);
        var each = movie ? ticketPrice(movie.price, type) : 0;
        var total = each * count;

        document.getElementById("summary-movie").textContent = movie ? movie.title : "Not selected";
        document.getElementById("summary-session").textContent = screening.value ? formatSession(screening.value) : "Not selected";
        document.getElementById("summary-tickets").textContent = count + " × " + ticketTypeNames[type];
        document.getElementById("summary-price").textContent = movie ? "$" + each.toFixed(2) : "–";
        document.getElementById("total").textContent = "$" + total.toFixed(2);
        document.getElementById("booking-cost").value = total.toFixed(2);
    }

    // Card fields are only checked for online payment, and the voucher code only for voucher payment
    function validateBooking() {
        var payment = getChecked("payment");
        var cardType = document.getElementById("card-type").value;
        var cardNumber = document.getElementById("card-number").value.trim();
        var phone = document.getElementById("phone").value.replace(/\s/g, "");
        var voucher = document.getElementById("voucher").value.trim();

        return showErrors([
            ["full-name", document.getElementById("full-name").value.trim() === "" ? "Enter your full name." : ""],
            ["email", !emailPattern.test(email.value.trim()) ? "Enter a valid email address, like name@example.com." : ""],
            ["phone", !/^\d{10,}$/.test(phone) ? "Enter a phone number with at least 10 digits, using numbers only." : ""],
            ["movie", movieSelect.value === "" ? "Choose a film." : ""],
            ["screening", checkScreening(screening.value)],
            ["tickets", ticketCount(tickets.value) === 0 ? "Enter a whole number of tickets greater than 0." : ""],
            ["ticket-type", !getChecked("ticket_type") ? "Choose a ticket type." : ""],
            ["payment", !payment ? "Choose a payment method." : ""],
            ["voucher", payment === "voucher" && !/^\d{12}$/.test(voucher) ? "Enter a 12-digit voucher code, using numbers only." : ""],
            ["card-type", payment === "online" && cardType === "" ? "Choose a card type." : ""],
            ["card-number", payment === "online" ? checkCardNumber(cardType, cardNumber) : ""],
            ["billing-email", !emailPattern.test(billingEmail.value.trim()) ? "Enter a valid billing email address." : ""]
        ]);
    }
}

function checkScreening(value) {
    if (value === "") {
        return "Choose a screening date and time.";
    }
    if (new Date(value) < new Date()) {
        return "Choose a date and time that is not in the past.";
    }
    return "";
}

// Digits only, and the length must match the card type
function checkCardNumber(cardType, number) {
    if (number === "") {
        return "Enter your card number.";
    }
    if (!/^\d+$/.test(number)) {
        return "Enter the card number using digits only.";
    }
    if (cardType && number.length !== cardLengths[cardType]) {
        return "This card type needs exactly " + cardLengths[cardType] + " digits.";
    }
    return "";
}

// Hidden fields are also disabled, because disabled fields are not sent with the form
function showFields(id, show) {
    var group = document.getElementById(id);
    group.hidden = !show;
    var fields = group.querySelectorAll("input, select");
    for (var i = 0; i < fields.length; i++) {
        fields[i].disabled = !show;
    }
}

// Discounted prices are rounded up to the nearest 50 cents
function ticketPrice(adultPrice, type) {
    return Math.ceil(adultPrice * ticketRates[type] * 2) / 2;
}

// Returns the number of tickets, or 0 if the box holds anything that isn't
// a whole number above 0 (e.g. "", "-2" or "1.5")
function ticketCount(value) {
    var count = Number(value);
    return Number.isInteger(count) && count > 0 ? count : 0;
}

// datetime-local inputs need dates written as YYYY-MM-DDTHH:MM in local time
function toDateTimeValue(date) {
    var pad = function (n) {
        return String(n).padStart(2, "0");
    };
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + "T" + pad(date.getHours()) + ":" + pad(date.getMinutes());
}

function formatSession(value) {
    return new Date(value).toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

/* Registration page */
// Each password rule, the checklist item it ticks, and the test it must pass
var passwordRules = [
    { id: "rule-length", name: "at least 10 characters", test: /^.{10,}$/ },
    { id: "rule-upper", name: "an uppercase letter", test: /[A-Z]/ },
    { id: "rule-lower", name: "a lowercase letter", test: /[a-z]/ },
    { id: "rule-number", name: "a number", test: /[0-9]/ },
    { id: "rule-special", name: "a special character", test: /[^A-Za-z0-9\s]/ }
];

function initRegister() {
    var form = document.getElementById("register-form");
    if (!form) {
        return;
    }

    var success = document.getElementById("register-success");
    var submitted = false;

    // Tick checklist rules as the password is typed, and re-check fields after a submit attempt
    form.addEventListener("input", function () {
        updatePasswordChecklist();
        if (submitted) {
            validateRegister();
        }
    });

    form.addEventListener("submit", function (event) {
        // There is no server for registration, so the form never actually submits
        event.preventDefault();
        submitted = true;
        success.hidden = true;

        var firstInvalid = validateRegister();
        if (firstInvalid) {
            firstInvalid.focus();
            return;
        }

        success.hidden = false;
        form.reset();
        submitted = false;
        updatePasswordChecklist();
    });
}

function updatePasswordChecklist() {
    var password = document.getElementById("password").value;
    for (var i = 0; i < passwordRules.length; i++) {
        var rule = passwordRules[i];
        document.getElementById(rule.id).className = rule.test.test(password) ? "met" : "";
    }
}

function validateRegister() {
    var username = document.getElementById("username").value.trim();
    var email = document.getElementById("reg-email").value.trim();
    var phone = document.getElementById("reg-phone").value.trim();
    var password = document.getElementById("password").value;
    var confirm = document.getElementById("confirm-password").value;
    var genresChosen = document.querySelectorAll('input[name="genres"]:checked').length;

    return showErrors([
        ["username", checkUsername(username)],
        ["reg-email", checkRequiredEmail(email)],
        ["password", checkPassword(password)],
        ["confirm-password", checkConfirm(password, confirm)],
        ["reg-phone", checkPhone(phone)],
        ["country", document.getElementById("country").value === "" ? "Choose your country or region." : ""],
        ["gender", !getChecked("gender") ? "Choose a gender option." : ""],
        ["genres", genresChosen === 0 ? "Choose at least one genre." : ""]
    ]);
}

// \w matches letters, numbers and underscores only
function checkUsername(value) {
    if (value === "") {
        return "Enter a username.";
    }
    if (!/^\w{5,}$/.test(value)) {
        return "Use at least 5 characters: letters, numbers or underscores only.";
    }
    return "";
}

function checkRequiredEmail(value) {
    if (value === "") {
        return "Enter your email address.";
    }
    if (!emailPattern.test(value)) {
        return "Enter a valid email address, like name@example.com.";
    }
    return "";
}

// Lists every unmet rule in one message so the user can fix them all at once
function checkPassword(value) {
    if (value === "") {
        return "Enter a password.";
    }
    var missing = passwordRules.filter(function (rule) {
        return !rule.test.test(value);
    });
    if (missing.length > 0) {
        return "Your password still needs " + missing.map(function (rule) {
            return rule.name;
        }).join(", ") + ".";
    }
    return "";
}

function checkConfirm(password, confirm) {
    if (confirm === "") {
        return "Re-enter your password.";
    }
    if (confirm !== password) {
        return "Passwords do not match.";
    }
    return "";
}

function checkPhone(value) {
    if (value === "") {
        return "Enter your phone number.";
    }
    if (!/^[0-9]{8,15}$/.test(value)) {
        return "Enter 8 to 15 digits, using numbers only with no spaces.";
    }
    return "";
}

/* Watchlist */
// sessionStorage keeps the list while the tab is open, across every page of the site.
// It only stores text, so the list of film ids is saved as a JSON string.
var watchlistKey = "cinemaxWatchlist";

function getWatchlist() {
    return JSON.parse(sessionStorage.getItem(watchlistKey)) || [];
}

// Adds the film if it isn't saved yet, or removes it if it is, so ids are never duplicated
function toggleWatchlist(id) {
    var list = getWatchlist();
    var index = list.indexOf(id);
    if (index === -1) {
        list.push(id);
    } else {
        list.splice(index, 1);
    }
    sessionStorage.setItem(watchlistKey, JSON.stringify(list));
}

/* Movies page: watchlist buttons */
function initWatchlistButtons() {
    var buttons = document.querySelectorAll("button[data-movie]");
    if (buttons.length === 0) {
        return;
    }

    for (var i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener("click", function (event) {
            toggleWatchlist(event.currentTarget.getAttribute("data-movie"));
            updateWatchButton(event.currentTarget);
        });
    }

    // Run now, and again on "pageshow": Back can show a saved copy of this page
    // from before a film was removed on the Watchlist page
    updateAllButtons();
    window.addEventListener("pageshow", updateAllButtons);

    function updateAllButtons() {
        for (var i = 0; i < buttons.length; i++) {
            updateWatchButton(buttons[i]);
        }
    }
}

// Shows whether a film is saved; aria-pressed tells screen readers the button is on or off
function updateWatchButton(button) {
    var saved = getWatchlist().indexOf(button.getAttribute("data-movie")) !== -1;
    button.textContent = saved ? "✓ In watchlist" : "+ Watchlist";
    button.setAttribute("aria-pressed", saved ? "true" : "false");
    button.classList.toggle("active", saved);
}

/* Watchlist page */
// Rebuilds the saved films from storage; runs on load and after each removal
function renderWatchlist() {
    var list = document.getElementById("watchlist");
    if (!list) {
        return;
    }

    var ids = getWatchlist();
    list.textContent = "";
    for (var i = 0; i < ids.length; i++) {
        var movie = findMovie(ids[i]);
        if (movie) {
            buildWatchCard(list, movie);
        }
    }

    var total = list.children.length;
    document.getElementById("watchlist-empty").hidden = total > 0;
    document.getElementById("watchlist-count").textContent = total === 1 ? "1 film saved" : total + " films saved";
}

function buildWatchCard(list, movie) {
    var li = addElement(list, "li", "watch-card stub");
    addPoster(li, movie);
    addRating(li, movie);
    addElement(li, "h2", "", movie.title);
    addElement(li, "p", "meta", "$" + movie.price.toFixed(2) + " adult ticket");

    var actions = addElement(li, "div", "actions");
    var book = addElement(actions, "a", "btn btn-primary", "Book now");
    book.href = "booking.html?movie=" + movie.id;

    var remove = addElement(actions, "button", "btn-text", "Remove");
    remove.type = "button";
    remove.setAttribute("aria-label", "Remove " + movie.title + " from watchlist");
    remove.addEventListener("click", function () {
        toggleWatchlist(movie.id);
        renderWatchlist();
        // The removed button no longer exists, so move keyboard focus to the updated count
        document.getElementById("watchlist-count").focus();
    });
}

/* Start */
initRecommend();
initBooking();
initRegister();
initWatchlistButtons();
renderWatchlist();
// Back can also show a saved copy of the Watchlist page, so rebuild it then too
window.addEventListener("pageshow", renderWatchlist);