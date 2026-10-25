COS10005 Assignment 2: Cinema-X - Movie finder and booking

Student name: Janet Yin
Student ID:   105943249

Mercury: https://mercury.swin.edu.au/cos10005/s105943249/assignment2/index.html
GitHub:  https://github.com/Janet1411/COS10005_AS2.git


1. WEBSITE STRUCTURE
1.1 Site map
All pages are linked from the header on every page.

Home (index.html)       About Cinema-X, poster filmstrip, how it works
├── movies.html         Every film: rating, runtime, sessions, price
├── recommend.html      3 questions -> top (up to) 3 matching films
├── booking.html        Booking form with live price and total
├── watchlist.html      Films saved from the Movies page
└── register.html       Registration form (front end only)

1.2 Page layout
Every page uses the same semantic layout:
<header>   Logo, plus <nav> with the main menu (current page highlighted with class="active" and aria-current="page")
<main>     The page's own content, in <section> panels
<aside>    Booking page only: the ticket summary beside the form
<footer>   Tagline, <address> with contact details, image credits

1.3 How the pages connect
- Movies, Recommend and Watchlist link to booking.html?movie=<film-id>, which pre-selects that film.
- Movies "+ Watchlist" saves to sessionStorage. Watchlist reads it.
- Home filmstrip posters link to movies.html#<film-id>.
- Booking submits by POST to the Mercury test script.

1.4 Files
├── *.html              The 6 pages above
├── css/style.css       Shared stylesheet
├── js/script.js        Shared script (see section 2)
└── images/
    ├── logo.png        Logo and favicon
    ├── bg-featured.jpg Blurred page background
    └── <film-id>.jpg   9 posters, e.g. dune-part-two.jpg

Each film uses one id (e.g. dune-part-two) for its poster file, Movies
row id, booking link, dropdown option, watchlist button and script.js data.

1.5 Breakpoints
- Mobile 767px and below
- Tablet 768px+
- Desktop 1024px+.

2. Javascript Validation Logic

All JavaScript is in js/script.js, which every page loads. Each feature first looks for its own form or list and stops if the page doesn't have one. Film details (id, title, rating, price, genres and who each film suits) are stored once in a list called "movies", which the recommendation, booking and watchlist code all read.

2.1 How errors are shown (registration and booking)
- Both forms have novalidate, which turns off the browser's own pop-ups, so script.js does every check itself.
- On submit, every field is checked. Each problem is shown in red under its field with a warning sign, the field gets a red border, and screen readers are told (aria-invalid and aria-live).
- If any check fails, submission is blocked and the cursor moves to the first field with a problem.
- After the first attempt, all fields are re-checked on every edit, so each message disappears as soon as it is fixed.

2.2 Registration form (register.html)
Every field is required. Spaces before or after the username, email and phone are ignored.
- Username: 5 or more characters, using only letters, numbers and underscores.
- Email: text, then @, then text containing a dot, with no spaces (e.g. name@example.com).
- Phone: 8 to 15 digits, numbers only (no spaces, + or dashes).
- Password: 10 or more characters, with an uppercase letter, a lowercase letter, a number and a special character (anything that is not a letter, number or space). A checklist under the box ticks each rule as it is typed, and the error message lists every rule still missing.
- Confirm password: must match the password exactly.
- Gender: one option chosen.
- Preferred genres: at least one ticked.
- Country or region: one chosen from the list.
There is no server for registration, so the form is never sent. When all checks pass, a confirmation message is shown and the form is cleared.

2.3 Booking form (booking.html)
- Full name: must not be empty.
- Email and billing email: same format rule as registration.
- Phone: at least 10 digits. Spaces are removed first, so "0412 345 678" is accepted, but + and dashes are not.
- Movie: a film must be chosen.
- Screening date and time: required, and not earlier than the time the form is submitted. The picker's minimum is also set to the time the page opened, so it doesn't offer past times.
- Number of tickets: a whole number above 0 (blank, 0, negative numbers and decimals such as 1.5 are rejected).
- Ticket type: one chosen (Adult is selected by default).
- Payment method: one chosen.
  - Voucher: the card fields are hidden and not checked. The 12-digit voucher box is not validated, as allowed by the brief.
  - Online payment: a card type must be chosen, and the card number must be digits only (no spaces): exactly 16 for Visa or Mastercard and 15 for Amex.
When every check passes, the form is sent by POST to the Mercury test script.

2.4 Booking page dynamic behaviour
These update on every change in the form.
- Pre-filled movie: the Book links on the Movies, Recommend and Watchlist pages add the film id to the address, e.g. booking.html?movie=dune-part-two. The booking page reads it with URLSearchParams and, if it matches a film, selects that film and shows a "Selected from the previous page" hint. An unknown id is ignored. The user can change the film at any time.
- Ticket cost: price each = the film's adult price x 1 (Adult), 0.7 (Child) or 0.85 (Student), rounded up to the nearest 50 cents. For example, a $19.50 film costs $14.00 for a child and $17.00 for a student. Total = price each x number of tickets. The ticket summary shows both, and the total is copied into a hidden booking_cost field so it is sent with the form.
- Payment fields: Voucher shows only the voucher box, Online payment shows only the card fields, and with no method chosen both are hidden. Hidden fields are also disabled, so they are not sent with the form (e.g. a card number typed before switching to Voucher).
- Billing email: ticking "Same as email address" copies the email in, makes the box read-only and keeps it matching while ticked. Unticking leaves the copied address so it can be edited.
- All of the above also re-run when the user comes back with the Back button, so the page matches the form values the browser restores.

2.5 Recommendations (recommend.html)
All three questions must be answered, or a message asks for them.
1. Age filter: Child sees G and PG films, Teen sees up to M (MA15+ is restricted for under-15s), and Adult sees all films.
2. Score: each remaining film gets 2 points if it is in the chosen genre and 1 point if it suits the viewing preference, so genre counts most.
3. Up to 3 films are shown, highest score first. Films with equal scores keep their order in the movies list. Films scoring 0 are left out, so a narrow choice can give fewer than 3 (Animation + Child + Solo gives 2).
4. If no allowed film is in the chosen genre (only possible for Child with Action, Drama, Sci-Fi or Horror), the heading changes to "No exact match" and the 3 films that best suit the viewing preference are shown instead, so the result is never empty.
Each result lists why it matched and has a "Book this film" link. The 72 possible answer combinations produce 23 different sets of results.

2.6 Watchlist (bonus: movies.html and watchlist.html)
- "+ Watchlist" adds the film's id to a list in sessionStorage, or removes it if it is already there, so no film is saved twice. The button changes to "✓ In watchlist", and aria-pressed tells screen readers it is on.
- sessionStorage only stores text, so the list is saved with JSON.stringify and read back with JSON.parse. It lasts while the tab is open, across all pages, which matches the brief's "during the browsing session".
- The Watchlist page builds a card for each saved film from the movies list and shows how many are saved. When the list is empty, a blank ticket links to the Movies page. "Remove" deletes the film, rebuilds the list and moves keyboard focus to the count.
- The Movies buttons and the Watchlist page both refresh when the user comes back with the Back button, so they always match the saved list.

3. Issues and Limitations
- Registration is front-end only. Details are checked but not sent or stored.
- The booking date and time picker accepts any future time. It is not limited to the session times listed on the Movies page.
- Card details are checked for format only. No real payment is processed.
- The voucher code is not validated, as allowed by the brief.
- The watchlist is cleared when the browser tab is closed. This is intended, because the brief asks for it to last during the browsing session.
- Fonts load from Google Fonts. Without an internet connection the site falls back to Arial Black and Arial.
- On some mobile browsers (such as Safari on iPhone) the background image scrolls with the page instead of staying fixed.
- There is no upper limit to how many tickets can be booked.

4. References

Film posters

A24 (2023) Past Lives [film poster]. The Movie Database (TMDb). Available at: https://www.themoviedb.org/movie/666277-past-lives (Accessed: 17 October 2026).

Disney/Pixar (2024) Inside Out 2 [film poster]. Pixar Post. Available at: https://pixarpost.com/2024/05/inside-out-2-movie-posters.html (Accessed: 17 October 2026).

DreamWorks Animation (2024) The Wild Robot [film poster]. The Movie Database (TMDb). Available at: https://www.themoviedb.org/movie/1184918-the-wild-robot (Accessed: 17 October 2026).

Paramount Pictures (2022) Top Gun: Maverick [film poster]. IMDb. Available at: https://www.imdb.com/title/tt1745960/ (Accessed: 17 October 2026).

Paramount Pictures (2024) A Quiet Place: Day One [film poster]. The Movie Database (TMDb). Available at: https://www.themoviedb.org/movie/762441-a-quiet-place-day-one (Accessed: 17 October 2026).

StudioCanal (2024) Paddington in Peru [film poster]. The Movie Database (TMDb). Available at: https://www.themoviedb.org/movie/516729-paddington-in-peru (Accessed: 17 October 2026).

Universal Pictures (2023) Oppenheimer [film poster]. The Movie Database (TMDb). Available at: https://www.themoviedb.org/movie/872585-oppenheimer (Accessed: 17 October 2026).
Universal Pictures (2023) Oppenheimer [film still, blurred and used as page background]. The Movie Database (TMDb). Available at: https://www.themoviedb.org/movie/872585-oppenheimer/images/backdrops (Accessed: 18 October 2026).

Warner Bros. Pictures (2023) Barbie [film poster]. The Movie Database (TMDb). Available at: https://www.themoviedb.org/movie/346698-barbie (Accessed: 17 October 2026).

Warner Bros. Pictures (2024) Dune: Part Two [film poster]. IMDb. Available at: https://www.imdb.com/title/tt15239678/ (Accessed: 17 October 2026).

Age ratings
Australian Classification (2026) Classification database. Available at:
https://www.classification.gov.au (Accessed: 17 October 2026).

Fonts
Google Fonts (n.d.) Archivo Black and Inter. Available at:
https://fonts.google.com (Accessed: 18 October 2026). Licensed under the SIL Open Font License.

Website Inspiration
vanph. (2023) Movie theatre website [website design]. Dribbble. Available at: https://dribbble.com/shots/22698980-Movie-theatre-website (Accessed: 16 October 2026).

5. AI Assistance: Claude was used to discuss design, show samples of visual design and creating logo in addition to writing movie descriptions and running bug test.