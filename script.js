/* =========================================================
   WANDEROZA TRAVELS — HOMEPAGE INTERACTIONS
   Worldwide airport autocomplete + existing enquiry behaviour
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  /* ---------------------------------------------------------
     1. WORLDWIDE AIRPORT / CITY AUTOCOMPLETE
     Data source: OurAirports-derived worldwide airport dataset.
     No API key required. Internet connection is required.
  --------------------------------------------------------- */

  const AIRPORT_DATA_URL =
    'https://cdn.jsdelivr.net/gh/srestre/world-countries-cities-db@main/airports/airports.json';

  let airportDataPromise = null;
  let worldwideAirports = [];

  const countryNames = (() => {
    try {
      return new Intl.DisplayNames(['en'], { type: 'region' });
    } catch (error) {
      return null;
    }
  })();

  function countryName(code) {
    if (!code) return 'International';
    try {
      return countryNames ? countryNames.of(code) : code;
    } catch (error) {
      return code;
    }
  }

  function loadWorldwideAirports() {
    if (!airportDataPromise) {
      airportDataPromise = fetch(AIRPORT_DATA_URL)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Airport data request failed (${response.status})`);
          }
          return response.json();
        })
        .then(records => {
          worldwideAirports = records
            .filter(airport =>
              airport.iata &&
              /^[A-Z]{3}$/i.test(airport.iata) &&
              airport.type !== 'closed_airport'
            )
            .map(airport => ({
              city: airport.municipality || airport.name,
              country: countryName(airport.iso_country),
              airport: airport.name,
              code: airport.iata.toUpperCase(),
              icao: airport.icao || '',
              type: airport.type || '',
              searchText: [
                airport.municipality,
                airport.name,
                airport.iata,
                airport.icao,
                airport.iso_country,
                countryName(airport.iso_country)
              ].filter(Boolean).join(' ').toLowerCase()
            }));

          return worldwideAirports;
        })
        .catch(error => {
          airportDataPromise = null;
          throw error;
        });
    }

    return airportDataPromise;
  }

  /* Inject dropdown styling here: no separate CSS edit is required. */
  if (!document.getElementById('wanderoza-airport-autocomplete-styles')) {
    const style = document.createElement('style');
    style.id = 'wanderoza-airport-autocomplete-styles';
    style.textContent = `
      #flight .field-box.airport-autocomplete {
        position: relative !important;
        z-index: 20;
        overflow: visible !important;
        min-height: 66px;
        align-self: start;
      }
      #flight .field-box.airport-autocomplete:focus-within { z-index: 1000; }
      #flight .booking-fields,
      #flight .field-box { overflow: visible; }
      .airport-suggestions {
        position: fixed !important;
        top: 0;
        left: 0;
        right: auto;
        width: 320px;
        z-index: 2147483000;
        max-height: min(320px, 55vh);
        overflow-y: auto;
        background: #fff;
        border: 1px solid #dce5ed;
        border-radius: 10px;
        box-shadow: 0 14px 35px rgba(13,42,68,.18);
        text-align: left;
      }
      .airport-suggestions[hidden] { display: none !important; }
      .airport-suggestion {
        display: flex !important;
        width: 100%;
        min-height: 0 !important;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 14px !important;
        margin: 0;
        border: 0 !important;
        border-bottom: 1px solid #edf1f5 !important;
        border-radius: 0 !important;
        background: #fff !important;
        color: #263b50 !important;
        text-align: left !important;
        cursor: pointer;
        box-shadow: none !important;
      }
      .airport-suggestion:last-child { border-bottom: 0 !important; }
      .airport-suggestion:hover,
      .airport-suggestion.active { background: #eff7ff !important; }
      .airport-suggestion-copy {
        display: flex;
        min-width: 0;
        flex: 1;
        flex-direction: column;
        gap: 3px;
      }
      .airport-suggestion-copy strong {
        display: block;
        color: #263b50;
        font-family: inherit;
        font-size: 14px;
        font-weight: 700;
        line-height: 1.35;
      }
      .airport-suggestion-copy small {
        display: block;
        overflow: hidden;
        color: #82909d;
        font-size: 11px;
        line-height: 1.4;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .airport-code {
        flex: 0 0 auto;
        padding: 6px 9px;
        border-radius: 6px;
        background: #edf5fc;
        color: #0875bd;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: .5px;
      }
      .airport-no-results {
        padding: 14px;
        color: #7b8792;
        font-size: 13px;
      }
      @media(max-width:767px) {
        .airport-suggestions { max-height: 250px; }
        .airport-suggestion { padding: 10px 11px !important; }
        .airport-suggestion-copy strong { font-size: 13px; }
      }
    `;
    document.head.appendChild(style);
  }

  function addAirportAutocomplete(input) {
    if (!input || input.dataset.autocompleteReady === 'true') return;
    input.dataset.autocompleteReady = 'true';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-autocomplete', 'list');

    const field = input.closest('.field-box') || input.parentElement;
    field.classList.add('airport-autocomplete');

    const dropdown = document.createElement('div');
    dropdown.className = 'airport-suggestions';
    dropdown.setAttribute('role', 'listbox');
    dropdown.hidden = true;
    // Mount in <body> so booking-card overflow/height cannot clip the results.
    document.body.appendChild(dropdown);

    function positionDropdown() {
      if (dropdown.hidden) return;
      const rect = field.getBoundingClientRect();
      const gap = 7;
      const viewportPadding = 12;
      const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
      const left = Math.max(
        viewportPadding,
        Math.min(rect.left, window.innerWidth - width - viewportPadding)
      );
      const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPadding;
      const spaceAbove = rect.top - gap - viewportPadding;
      const openAbove = spaceBelow < 170 && spaceAbove > spaceBelow;
      const availableHeight = Math.max(120, Math.min(320, (openAbove ? spaceAbove : spaceBelow)));
      dropdown.style.width = `${width}px`;
      dropdown.style.left = `${left}px`;
      dropdown.style.maxHeight = `${availableHeight}px`;
      dropdown.style.top = openAbove
        ? `${Math.max(viewportPadding, rect.top - Math.min(dropdown.offsetHeight, availableHeight) - gap)}px`
        : `${rect.bottom + gap}px`;
    }

    window.addEventListener('resize', positionDropdown);
    window.addEventListener('scroll', positionDropdown, true);

    const form = input.closest('form');
    const codeName = input.name === 'from' ? 'fromCode' : 'toCode';
    let codeInput = form?.querySelector(`input[name="${codeName}"]`);

    if (form && !codeInput) {
      codeInput = document.createElement('input');
      codeInput.type = 'hidden';
      codeInput.name = codeName;
      form.appendChild(codeInput);
    }

    let activeIndex = -1;
    let matches = [];
    let requestNumber = 0;

    function closeDropdown() {
      dropdown.hidden = true;
      dropdown.innerHTML = '';
      activeIndex = -1;
    }

    function showMessage(message) {
      dropdown.innerHTML = '';
      const item = document.createElement('div');
      item.className = 'airport-no-results';
      item.textContent = message;
      dropdown.appendChild(item);
      dropdown.hidden = false;
      positionDropdown();
    }

    function chooseAirport(airport) {
      input.value = `${airport.city}, ${airport.country} (${airport.code})`;
      if (codeInput) codeInput.value = airport.code;
      closeDropdown();
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function renderSuggestions(query) {
      const q = query.trim().toLowerCase();
      if (q.length < 2) {
        closeDropdown();
        return;
      }

      const queryParts = q.split(/\s+/).filter(Boolean);

      const scoreAirport = airport => {
        const city = (airport.city || '').toLowerCase();
        const name = (airport.airport || '').toLowerCase();
        const country = (airport.country || '').toLowerCase();
        const code = (airport.code || '').toLowerCase();

        if (city === q) return 0;
        if (city.startsWith(q)) return 1;
        if (code === q) return 2;
        if (name.startsWith(q)) return 3;
        if (country.startsWith(q)) return 4;
        return 5;
      };

      matches = worldwideAirports
        .filter(airport => queryParts.every(part => airport.searchText.includes(part)))
        .sort((a, b) => {
          const relevance = scoreAirport(a) - scoreAirport(b);
          const airportSize =
            (a.type === 'large_airport' ? 0 : 1) -
            (b.type === 'large_airport' ? 0 : 1);
          return relevance || airportSize ||
            a.city.localeCompare(b.city) ||
            a.airport.localeCompare(b.airport);
        })
        .slice(0, 7);

      dropdown.innerHTML = '';
      activeIndex = -1;

      if (!matches.length) {
        showMessage('No matching airports found. Try another city or airport code.');
        return;
      }

      matches.forEach(airport => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'airport-suggestion';
        option.setAttribute('role', 'option');

        const copy = document.createElement('span');
        copy.className = 'airport-suggestion-copy';

        const title = document.createElement('strong');
        title.textContent = `${airport.city}, ${airport.country}`;

        const subtitle = document.createElement('small');
        subtitle.textContent = airport.airport;

        const code = document.createElement('span');
        code.className = 'airport-code';
        code.textContent = airport.code;

        copy.append(title, subtitle);
        option.append(copy, code);
        option.addEventListener('click', () => chooseAirport(airport));
        dropdown.appendChild(option);
      });

      dropdown.hidden = false;
      positionDropdown();
    }

    input.addEventListener('focus', async () => {
      if (input.value.trim().length < 2) return;
      if (!worldwideAirports.length) {
        showMessage('Loading worldwide airports…');
        try {
          await loadWorldwideAirports();
          renderSuggestions(input.value);
        } catch (error) {
          showMessage('Could not load airport data. Check your internet connection and try again.');
        }
      } else {
        renderSuggestions(input.value);
      }
    });

    input.addEventListener('input', async () => {
      if (codeInput) codeInput.value = '';
      const currentRequest = ++requestNumber;
      const query = input.value;

      if (query.trim().length < 2) {
        closeDropdown();
        return;
      }

      if (!worldwideAirports.length) {
        showMessage('Loading worldwide airports…');
        try {
          await loadWorldwideAirports();
          if (currentRequest === requestNumber) renderSuggestions(query);
        } catch (error) {
          if (currentRequest === requestNumber) {
            showMessage('Could not load airport data. Check your internet connection and try again.');
          }
        }
      } else {
        renderSuggestions(query);
      }
    });

    input.addEventListener('keydown', event => {
      const options = [...dropdown.querySelectorAll('.airport-suggestion')];
      if (dropdown.hidden || !options.length) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        activeIndex = (activeIndex + 1) % options.length;
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        activeIndex = (activeIndex - 1 + options.length) % options.length;
      } else if (event.key === 'Enter' && activeIndex >= 0) {
        event.preventDefault();
        options[activeIndex].click();
        return;
      } else if (event.key === 'Escape') {
        closeDropdown();
        return;
      } else {
        return;
      }

      options.forEach((option, index) => {
        option.classList.toggle('active', index === activeIndex);
        option.setAttribute('aria-selected', String(index === activeIndex));
      });
    });

    document.addEventListener('click', event => {
      if (!field.contains(event.target) && !dropdown.contains(event.target)) {
        closeDropdown();
      }
    });

    input.addEventListener('blur', () => {
      window.setTimeout(() => {
        if (!field.contains(document.activeElement) &&
            !dropdown.contains(document.activeElement)) closeDropdown();
      }, 140);
    });
  }

  const departureInput = document.querySelector('#flight input[name="from"]');
  const arrivalInput = document.querySelector('#flight input[name="to"]');
  addAirportAutocomplete(departureInput);
  addAirportAutocomplete(arrivalInput);

  /* ---------------------------------------------------------
     2. ENQUIRY FORMS — OPEN EMAIL DRAFT
  --------------------------------------------------------- */

  document.querySelectorAll('.enquiry-form').forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();

      const rows = [...new FormData(form).entries()]
        .filter(([key, value]) => String(value).trim())
        .map(([key, value]) => `${key}: ${value}`);

      const trip = document.querySelector('input[name="tripType"]:checked');
      if (trip && form.closest('#flight')) rows.unshift(`Trip type: ${trip.value}`);

      const cabin = document.querySelector('.cabin-select select');
      if (cabin && form.closest('#flight')) rows.push(`Cabin class: ${cabin.value}`);

      const subject = encodeURIComponent('WanderOza Travels - Travel Enquiry');
      const body = encodeURIComponent(
        'Hello WanderOza Travels,\n\nI would like to enquire about these travel plans:\n\n' +
        rows.join('\n') +
        '\n\nPlease contact me with available options.'
      );

      window.location.href =
        `mailto:hello@wanderozatravels.com?subject=${subject}&body=${body}`;
    });
  });

  /* ---------------------------------------------------------
     3. ROUND TRIP / ONE-WAY RETURN FIELD
  --------------------------------------------------------- */

  document.querySelectorAll('input[name="tripType"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const returnField = document.querySelector('.return-field');
      if (returnField) {
        returnField.classList.toggle(
          'd-none',
          radio.value === 'One way' && radio.checked
        );
      }
    });
  });

  /* ---------------------------------------------------------
     4. CLOSE MOBILE NAVIGATION AFTER CLICKING A LINK
  --------------------------------------------------------- */

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', () => {
      const nav = document.querySelector('.navbar-collapse');
      if (nav?.classList.contains('show') && window.bootstrap) {
        window.bootstrap.Collapse.getOrCreateInstance(nav).hide();
      }
    });
  });

  /* ---------------------------------------------------------
     5. PREVENT PAST DATES IN DATE PICKERS
  --------------------------------------------------------- */

  const today = new Date();
  const localToday = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0')
  ].join('-');

  document.querySelectorAll('input[type="date"]').forEach(input => {
    input.min = localToday;
  });
});