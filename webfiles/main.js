// main.js

// Ensure 'players' array is accessible from players.js (loaded first)
// It's already global, so no import statement is needed here for non-module scripts.

// Process players data to add 'Name' property: "[LastName], [FirstName]"
// This needs to happen once the players array is loaded.
if (typeof players !== 'undefined' && players.length > 0) {
    players.forEach(player => {
        player.Name = `${player.LastName}, ${player.FirstName}`;
    });
    console.log("Players data processed successfully.");
} else {
    console.error("Error: players array is not defined or is empty. Ensure players.js is loaded correctly and contains data.");
    document.addEventListener('DOMContentLoaded', () => {
        // Placeholder for matrix will be inside matrix-container, so no need to touch it here
        // The player selection info text
        document.getElementById('player-selection-info').textContent = "Error: Player data could not be loaded. Please check players.js.";
        document.getElementById('generate-matrix-btn').disabled = true;
        document.getElementById('select-all-btn').disabled = true;
        document.getElementById('deselect-all-btn').disabled = true;
        playerSearchInput.disabled = true;
        countryFilterSelect.disabled = true;
    });
}


const playerCheckboxesDiv = document.getElementById('player-checkboxes');
const generateMatrixBtn = document.getElementById('generate-matrix-btn');
const selectAllBtn = document.getElementById('select-all-btn');
const deselectAllBtn = document.getElementById('deselect-all-btn');
const matrixContainer = document.getElementById('matrix-container');
const playerSearchInput = document.getElementById('player-search');
const countryFilterSelect = document.getElementById('country-filter');
const selectedPlayersCountSpan = document.getElementById('selected-players-count');
const loadingSpinner = document.getElementById('loading-spinner');
// Removed matrixPlaceholder as it's now 'player-selection-info'

// New elements for showing/hiding player selection
const playerSelectionSection = document.getElementById('player-selection-section');
const showPlayerSelectionBtn = document.getElementById('show-player-selection-btn');
const playerSelectionInfo = document.getElementById('player-selection-info'); // Reference to the moved placeholder


// Store the currently selected player IDs to persist selections across searches and filters
let selectedPlayerIds = new Set();

/**
 * Updates the displayed count of selected players.
 */
function updateSelectedPlayersCount() {
    selectedPlayersCountSpan.textContent = selectedPlayerIds.size;
}

/**
 * Populates the country filter dropdown with distinct, alphabetically sorted countries.
 */
function populateCountryFilter() {
    if (typeof players === 'undefined' || players.length === 0) {
        console.error("Error: players data not loaded or empty. Cannot populate country filter.");
        return;
    }
    const countries = new Set(players.map(player => player.Country));
    const sortedCountries = Array.from(countries).sort();

    let optionsHTML = '<option value="All">All</option>';
    sortedCountries.forEach(country => {
        optionsHTML += `<option value="${country}">${country}</option>`;
    });
    countryFilterSelect.innerHTML = optionsHTML;
}

/**
 * Renders the player checkboxes based on the players array and applied filters.
 * Maintains the selection state of players.
 * @param {string} searchTerm - Optional search term to filter players by name.
 * @param {string} countryFilter - Optional country code to filter players by country.
 */
function renderPlayerCheckboxes(searchTerm = '', countryFilter = 'All') {
    playerCheckboxesDiv.innerHTML = ''; // Clear existing checkboxes
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    if (typeof players === 'undefined' || players.length === 0) {
        playerCheckboxesDiv.innerHTML = '<p class="text-red-500">Player data is not available.</p>';
        return;
    }

    // Sort all players alphabetically by their generated 'Name' property
    const sortedPlayers = [...players].sort((a, b) => a.Name.localeCompare(b.Name));

    let playersFound = false;
    sortedPlayers.forEach(player => {
        const matchesSearch = searchTerm === '' || player.Name.toLowerCase().includes(lowerCaseSearchTerm);
        const matchesCountry = countryFilter === 'All' || player.Country === countryFilter;

        if (matchesSearch && matchesCountry) {
            playersFound = true;
            const div = document.createElement('div');
            div.className = 'flex items-center';
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.id = `player-${player.PlayerID}`;
            input.value = player.PlayerID;
            input.className = 'h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500';

            // Set checked state based on selectedPlayerIds set
            if (selectedPlayerIds.has(player.PlayerID)) {
                input.checked = true;
            }

            // Add event listener to update selectedPlayerIds on change
            input.addEventListener('change', (event) => {
                const playerId = parseInt(event.target.value);
                if (event.target.checked) {
                    selectedPlayerIds.add(playerId);
                } else {
                    selectedPlayerIds.delete(playerId);
                }
                updateSelectedPlayersCount(); // Update count on change
            });

            const label = document.createElement('label');
            label.htmlFor = `player-${player.PlayerID}`;
            label.className = 'ml-2 text-gray-700 cursor-pointer';
            label.textContent = `${player.Name} (${player.Rating})`;

            div.appendChild(input);
            div.appendChild(label);
            playerCheckboxesDiv.appendChild(div);
        }
    });

    if (!playersFound) {
        playerCheckboxesDiv.innerHTML = '<p class="text-gray-500 italic">No players found matching your criteria.</p>';
    }
    updateSelectedPlayersCount(); // Update count after rendering
}

/**
 * Calculates the handicap and win score between two players.
 * The handicap is based on the absolute rating difference.
 * If the absolute difference is less than 100, the handicap is 0.
 * Otherwise, it's calculated as floor(abs_diff / 100) * HANDICAP_PER_100_RATING.
 * The handicap is capped at MAX_HANDICAP.
 * The win score is 32 + handicap (positive for stronger player, negative for weaker).
 * @param {object} player1 - The first player object (the row player).
 * @param {object} player2 - The second player object (the column player).
 * @returns {{handicap: number, winScore: number}} - An object containing handicap and win score for player1 vs player2.
 */
function calculateHandicapAndScore(player1, player2) {
    const HANDICAP_PER_100_RATING = 2; // Constant for handicap calculation
    const MAX_HANDICAP = 32;          // Maximum allowed handicap
    const OTHELLO_DRAW_SCORE = 32;    // Othello draw score

    const ratingDiff = player1.Rating - player2.Rating;
    const absRatingDiff = Math.abs(ratingDiff);

    let calculatedHandicapValue = 0;

    // Only apply handicap if absolute rating difference is 100 or more
    if (absRatingDiff >= 100) {
        calculatedHandicapValue = Math.floor(absRatingDiff / 100) * HANDICAP_PER_100_RATING;
    }

    // Cap the calculated handicap at the maximum allowed handicap
    calculatedHandicapValue = Math.min(calculatedHandicapValue, MAX_HANDICAP);

    // Determine the direction of the handicap for player1 relative to player2
    let directionalHandicap = 0;
    if (player1.Rating > player2.Rating) {
        directionalHandicap = calculatedHandicapValue;
    } else if (player1.Rating < player2.Rating) {
        directionalHandicap = -calculatedHandicapValue;
    }
    // If ratings are equal, directionalHandicap remains 0.

    const winScore = OTHELLO_DRAW_SCORE + directionalHandicap;

    return { handicap: directionalHandicap, winScore: winScore };
}

/**
 * Generates and displays the matrix of selected players.
 */
async function generateMatrix() {
    loadingSpinner.classList.remove('hidden'); // Show spinner

    // Hide player selection and show "Back to Player Selection" button
    playerSelectionSection.classList.add('hidden');
    showPlayerSelectionBtn.classList.remove('hidden');

    // Show matrix container
    matrixContainer.classList.remove('hidden');


    // Small delay to allow spinner to show before heavy computation (if any)
    await new Promise(resolve => setTimeout(resolve, 50));

    if (typeof players === 'undefined' || players.length === 0) {
        document.getElementById('matrix-table-wrapper').innerHTML = `<p class="text-center text-red-600 font-semibold mt-4">Error: Player data not loaded or empty. Cannot generate matrix.</p>`;
        loadingSpinner.classList.add('hidden');
        return;
    }

    const selectedPlayersArray = players.filter(player => selectedPlayerIds.has(player.PlayerID));

    if (selectedPlayersArray.length === 0) {
        document.getElementById('matrix-table-wrapper').innerHTML = `
            <p class="text-center text-red-600 font-semibold mt-4">Please select at least one player to generate the matrix.</p>
        `;
        loadingSpinner.classList.add('hidden');
        return;
    }

    // Sort selected players by rating in descending order for matrix headers
    selectedPlayersArray.sort((a, b) => b.Rating - a.Rating);

    let tableHTML = `
        <table class="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
    `;
    tableHTML += '<thead class="bg-gray-50">';
    tableHTML += '<tr>';
    tableHTML += '<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tl-lg sticky-col" style="min-width: 150px;"></th>'; // Empty top-left cell
    selectedPlayersArray.forEach(player => {
        tableHTML += `<th scope="col" class="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">${player.Name}<br>(${player.Rating})</th>`;
    });
    tableHTML += '</tr>';
    tableHTML += '</thead>';
    tableHTML += '<tbody class="bg-white divide-y divide-gray-200">';

    selectedPlayersArray.forEach(rowPlayer => {
        tableHTML += '<tr>';
        tableHTML += `<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky-col">${rowPlayer.Name} (${rowPlayer.Rating})</td>`; // Y-axis label

        selectedPlayersArray.forEach(colPlayer => {
            let cellContent = '';
            let cellClasses = 'px-6 py-4 whitespace-nowrap text-sm text-gray-700';
            if (rowPlayer.PlayerID === colPlayer.PlayerID) {
                cellContent = '<span class="text-gray-400">N/A</span>'; // Same player
                cellClasses += ' bg-gray-100'; // Different background for N/A cells
            } else {
                const result = calculateHandicapAndScore(rowPlayer, colPlayer);
                cellContent = `<span class="matrix-cell">H: ${result.handicap}<br>S: ${result.winScore}</span>`;
            }
            tableHTML += `<td class="${cellClasses}">${cellContent}</td>`;
        });
        tableHTML += '</tr>';
    });

    tableHTML += '</tbody>';
    tableHTML += '</table>';
    
    document.getElementById('matrix-table-wrapper').innerHTML = tableHTML;
    loadingSpinner.classList.add('hidden'); // Hide spinner
}

// Event Listeners
generateMatrixBtn.addEventListener('click', generateMatrix);

// Event listener for the new "Back to Player Selection" button
showPlayerSelectionBtn.addEventListener('click', () => {
    playerSelectionSection.classList.remove('hidden'); // Show player selection section
    showPlayerSelectionBtn.classList.add('hidden'); // Hide the button itself
    matrixContainer.classList.add('hidden'); // Hide the matrix container
    document.getElementById('matrix-table-wrapper').innerHTML = ''; // Clear matrix content
});

selectAllBtn.addEventListener('click', () => {
    if (typeof players === 'undefined' || players.length === 0) {
        console.error("Error: players data not loaded or empty. Cannot select all.");
        return;
    }
    const currentSearchTerm = playerSearchInput.value;
    const currentCountryFilter = countryFilterSelect.value;
    const visiblePlayers = players.filter(player => {
        const matchesSearch = currentSearchTerm === '' || player.Name.toLowerCase().includes(currentSearchTerm.toLowerCase());
        const matchesCountry = currentCountryFilter === 'All' || player.Country === currentCountryFilter;
        return matchesSearch && matchesCountry;
    });

    selectedPlayerIds.clear(); // Clear existing selections
    visiblePlayers.forEach(player => selectedPlayerIds.add(player.PlayerID)); // Add only visible player IDs
    renderPlayerCheckboxes(currentSearchTerm, currentCountryFilter); // Re-render to show all checked
    updateSelectedPlayersCount();
});

deselectAllBtn.addEventListener('click', () => {
    selectedPlayerIds.clear(); // Clear all selections
    renderPlayerCheckboxes(playerSearchInput.value, countryFilterSelect.value); // Re-render to show all unchecked
    updateSelectedPlayersCount();
});

playerSearchInput.addEventListener('input', (event) => {
    renderPlayerCheckboxes(event.target.value, countryFilterSelect.value);
});

countryFilterSelect.addEventListener('change', (event) => {
    renderPlayerCheckboxes(playerSearchInput.value, event.target.value);
});

// Initial render logic
document.addEventListener('DOMContentLoaded', () => {
    // Check if players data is available before attempting to render/populate
    if (typeof players !== 'undefined' && players.length > 0) {
        populateCountryFilter();
        renderPlayerCheckboxes();
    } else {
        // Player data not loaded, display error in the info text
        playerSelectionInfo.textContent = "Error: Player data could not be loaded. Please check players.js.";
        generateMatrixBtn.disabled = true;
        selectAllBtn.disabled = true;
        deselectAllBtn.disabled = true;
        playerSearchInput.disabled = true;
        countryFilterSelect.disabled = true;
    }
});