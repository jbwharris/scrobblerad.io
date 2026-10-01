import { filters } from './filterData.js';

/**
 * Populates the three <select> elements from the shared filter data.
 * Called once on page load. Selects stay as empty shells in the HTML.
 */
function populateSelect(id, items) {
 var select = document.getElementById(id);
 if (!select) return;

 var frag = document.createDocumentFragment();
 items.forEach(function (item) {
 var option = document.createElement('option');
 option.value = item.value;
 option.textContent = item.label;
 frag.appendChild(option);
 });
 select.appendChild(frag);
}

function init() {
 populateSelect('tagCountry', filters.countries);
 populateSelect('tagFormat', filters.formats);
 populateSelect('tagGenre', filters.genres);
}

export { init };