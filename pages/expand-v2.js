
/**
 * Prezent.ai - Form Scripts v2
 * File: pages/expand-form-2.js
 *
 * Replaces pages/expand-form.js on the /exp/register/* pages.
 * The original expand-form.js is left untouched as a rollback.
 *
 * LOADING PRINCIPLE
 * -----------------
 * Webflow's own HTML + CSS + scripts render first. Nothing in this file
 * blocks that. Work is split into three tiers:
 *
 *   Tier 1 - instant, no network   : UTM fields, geotargeting, country seed
 *   Tier 2 - when form is in view  : intl-tel-input (~50 KB) for the flag dropdown
 *   Tier 3 - on phone field touch  : utils.js (241 KB) for number formatting
 *
 * REPLACES THESE 4 PAGE TAGS (delete them from Webflow body code):
 *   jquery.min.js            87 KB  -> deleted, this file is plain JS
 *   swiper@11 bundle        169 KB  -> deleted, site-wide Swiper 8 is what runs
 *   intlTelInput.min.js      ~9 KB  -> loaded here, Tier 2
 *   utils.js                241 KB  -> loaded here, Tier 3
 *
 * AND THESE 2 PAGE TAGS (delete them from Webflow head code):
 *   intlTelInput.min.css    ~20 KB  -> loaded here, Tier 2
 *   swiper@11 CSS            18 KB  -> deleted, site-wide Swiper 8 CSS is what applies
 *
 * Form validation and submission logic is byte-for-byte the behaviour of v1.
 */

(function () {
    'use strict';

    var ITI_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8';


    /* ========================================================
       0. HELPERS
       ======================================================== */

    function onReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            var existing = document.querySelector('script[data-lazy="' + src + '"]');
            if (existing) {
                if (existing.dataset.loaded === '1') return resolve();
                existing.addEventListener('load', function () { resolve(); });
                existing.addEventListener('error', reject);
                return;
            }
            var s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.setAttribute('data-lazy', src);
            s.onload = function () { s.dataset.loaded = '1'; resolve(); };
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    function loadStylesheet(href) {
        if (document.querySelector('link[href="' + href + '"]')) return;
        var l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = href;
        document.head.appendChild(l);
    }

    // Run fn once, on whichever comes first: the user interacting with `el`,
    // `el` scrolling into view, or the browser being idle. Keeps work off the
    // critical path while guaranteeing it always eventually happens.
    function whenNeeded(el, events, fn) {
        var done = false;
        function go() {
            if (done) return;
            done = true;
            fn();
        }

        if (el) {
            events.forEach(function (evt) {
                el.addEventListener(evt, go, { once: true, passive: true });
            });
            if ('IntersectionObserver' in window) {
                var io = new IntersectionObserver(function (entries) {
                    if (entries.some(function (e) { return e.isIntersecting; })) {
                        io.disconnect();
                        go();
                    }
                });
                io.observe(el);
            }
        }

        if ('requestIdleCallback' in window) {
            requestIdleCallback(go, { timeout: 3000 });
        } else {
            setTimeout(go, 1500);
        }
    }

    // Same as whenNeeded but with NO idle fallback - only fires on real
    // interaction. Used for utils.js so visitors who never touch the phone
    // field never pay its 241 KB.
    function onFirstInteraction(el, events, fn) {
        if (!el) return;
        var done = false;
        function go() {
            if (done) return;
            done = true;
            fn();
        }
        events.forEach(function (evt) {
            el.addEventListener(evt, go, { once: true, passive: true });
        });
    }

    function countryNameFromCode(code) {
        if (!code) return '';
        try {
            return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;
        } catch (e) {
            return code;
        }
    }


    /* ========================================================
       TIER 1 - INSTANT, NO NETWORK
       ======================================================== */

    /* --- 1a. UTM parameters (with cookie fallback) --- */
    function checkUTMParameters() {
        var trackingParams = [
            'utm_source', 'utm_medium', 'utm_campaign',
            'utm_term', 'utm_content', 'gclid'
        ];

        var formFieldMapping = {
            'utm_source': 'utm-source',
            'utm_medium': 'utm-medium',
            'utm_campaign': 'utm-campaign',
            'utm_term': 'utm-term',
            'gclid': 'gclid'
        };

        function populateFormFields(trackingData) {
            if (!trackingData) return;
            Object.keys(trackingData).forEach(function (param) {
                var fieldId = formFieldMapping[param];
                if (!fieldId) return;
                var field = document.getElementById(fieldId);
                if (field) field.value = trackingData[param];
            });
        }

        function collect(search) {
            var urlParams = new URLSearchParams(search);
            var data = {};
            var found = false;
            trackingParams.forEach(function (param) {
                var value = urlParams.get(param);
                if (value) {
                    data[param] = value;
                    found = true;
                }
            });
            return found ? data : null;
        }

        function getCookie(name) {
            var value = '; ' + document.cookie;
            var parts = value.split('; ' + name + '=');
            return parts.length === 2 ? parts.pop().split(';').shift() : null;
        }

        // URL first
        var trackingData = collect(window.location.search);
        if (trackingData) {
            populateFormFields(trackingData);
            return;
        }

        // Cookie fallback
        var cookieValue = getCookie('__gtm_campaign_url');
        if (!cookieValue) return;
        try {
            var url = new URL(decodeURIComponent(cookieValue));
            trackingData = collect(url.search);
            if (trackingData) populateFormFields(trackingData);
        } catch (e) {
            /* malformed cookie - ignore */
        }
    }

    /* --- 1b. Geotargeting (conditional on path) --- */
    function initGeotargeting() {
        if (window.location.href.indexOf('/registration/platform') !== -1) {
            var showDefault = function () {
                var nodes = document.getElementsByClassName(
                    'geotargetlygeocontent1711351295995_default'
                );
                for (var i = 0; i < nodes.length; i++) {
                    nodes[i].style.display = 'inline';
                }
            };
            var first = document.getElementsByTagName('script')[0];
            var y = document.createElement('script');
            y.async = true;
            y.src = 'https://g1584674684.co/gc?winurl=' +
                encodeURIComponent(window.location) +
                '&refurl=' + document.referrer +
                '&id=-NtoU5wvSHI2ffsEI_Mk';
            y.onerror = showDefault;
            first.parentNode.insertBefore(y, first);
        } else {
            var els = document.getElementsByClassName(
                'geotargetlygeocontent1711351295995_content_2'
            );
            for (var j = 0; j < els.length; j++) {
                els[j].style.display = 'block';
            }
        }
    }

    /* --- 1c. Seed the hidden country field ---
       'country-selected-l' is a hidden REQUIRED field. In v1 it was filled by
       the phone widget, so if that widget failed the submit button silently
       did nothing. Here it is filled independently, straight from the IP
       lookup, so the form is never blocked by a library. intl-tel-input
       overwrites it with its own country name once it loads (Tier 2), keeping
       the submitted value identical to v1. */
    // Resolves to a 2-letter country code, or null. Kicked off immediately so
    // the lookup overlaps the rest of the page load. The phone widget WAITS on
    // this promise rather than reading a variable, so it can never race ahead
    // and fall back to the wrong country.
    var geoPromise = null;

    function seedCountryField() {
        var field = document.getElementById('country-selected-l');

        var controller = ('AbortController' in window) ? new AbortController() : null;
        var timer = setTimeout(function () { if (controller) controller.abort(); }, 2500);

        geoPromise = fetch('https://ipinfo.io/json', {
            signal: controller ? controller.signal : undefined
        })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                clearTimeout(timer);
                return (data && data.country) ? data.country : null;
            })
            .catch(function () {
                clearTimeout(timer);
                return null;
            })
            .then(function (code) {
                window.__prezentGeoCountry = code;
                // Seed the required field so it is never empty, even if the
                // phone widget never loads. intl-tel-input overwrites this
                // with its own country name once ready.
                if (field && code && !field.value.trim()) {
                    field.value = countryNameFromCode(code);
                }
                return code;
            });
    }


    /* ========================================================
       2. FORM SUBMISSION + VALIDATION  (logic unchanged from v1)
       ======================================================== */

    // Assigned in Tier 3 once utils.js is available.
    var formatPhoneForWebflowSubmit = function () {};

    function initForm() {
        var form = document.getElementById('wf-form-client-registration-expand');
        if (!form) return;

        var workEmail = document.getElementById('work-email-l');
        var phoneInput = document.getElementById('phone-number-l');
        var customSubmitBtn = document.getElementById('submit-2');
        var originalSubmitBtn = form.querySelector('input[type="submit"]');
        if (!customSubmitBtn) return;

        if (originalSubmitBtn) originalSubmitBtn.style.display = 'none';

        function validatePhoneNumber(phoneNumber) {
            var clean = phoneNumber.replace(/[\s\-\(\)]/g, '');
            return /^\d+$/.test(clean) && clean.length >= 7 && clean.length <= 15;
        }

        function validateForm() {
            var requiredFields = form.querySelectorAll('[required]');
            var isValid = true;
            var failed = [];

            requiredFields.forEach(function (field) {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('error');
                    failed.push(field);
                    return;
                }

                if (field.id === 'phone-number-l') {
                    if (!validatePhoneNumber(field.value)) {
                        isValid = false;
                        field.classList.add('error');
                        var errorMessage = field.nextElementSibling;
                        if (!errorMessage || !errorMessage.classList.contains('error-message')) {
                            errorMessage = document.createElement('div');
                            errorMessage.classList.add('error-message');
                            field.parentNode.insertBefore(errorMessage, field.nextSibling);
                        }
                        errorMessage.textContent =
                            'Please enter a valid phone number (numbers only)';
                    } else {
                        field.classList.remove('error');
                        var errMsg = field.nextElementSibling;
                        if (errMsg && errMsg.classList.contains('error-message')) {
                            errMsg.remove();
                        }
                    }
                } else {
                    field.classList.remove('error');
                }
            });

            // A required field that is display:none cannot show its red border,
            // so an empty one makes the button look completely dead. Shout
            // about it in the console instead of failing silently - this is
            // what a blank hidden company-name / country field looks like.
            var hiddenFailures = failed.filter(function (f) {
                return f.offsetParent === null || getComputedStyle(f).display === 'none';
            });
            if (hiddenFailures.length) {
                console.error(
                    '[prezent-form] Submit blocked by HIDDEN required field(s): ' +
                    hiddenFailures.map(function (f) { return '#' + f.id; }).join(', ') +
                    '. They are empty and invisible, so no error can be shown to the ' +
                    'user. Give them a value in Webflow or remove "required".'
                );
            }

            return isValid;
        }

        function waitForWebflowSubmission(redirectUrl) {
            var submitted = false;
            var timeoutId;

            var successHandler = function () {
                if (submitted) return;
                submitted = true;
                clearTimeout(timeoutId);
                setTimeout(function () { window.location.href = redirectUrl; }, 500);
            };

            var errorHandler = function () {
                if (submitted) return;
                submitted = true;
                clearTimeout(timeoutId);
                customSubmitBtn.textContent = 'Submit';
                customSubmitBtn.disabled = false;
                alert('Form submission failed. Please try again.');
            };

            document.addEventListener('webflow:success', successHandler);
            document.addEventListener('webflow:error', errorHandler);

            var poll = function () {
                var successDiv = document.querySelector('.w-form-done');
                var errorDiv = document.querySelector('.w-form-fail');
                if (successDiv && successDiv.style.display !== 'none') return successHandler();
                if (errorDiv && errorDiv.style.display !== 'none') return errorHandler();
                if (!submitted) setTimeout(poll, 100);
            };
            setTimeout(poll, 100);

            timeoutId = setTimeout(function () {
                if (submitted) return;
                submitted = true;
                console.log('Webflow submission timeout - redirecting anyway');
                window.location.href = redirectUrl;
            }, 3000);
        }

        customSubmitBtn.addEventListener('click', async function (event) {
            event.preventDefault();
            if (!validateForm()) return;

            customSubmitBtn.textContent = 'Please wait...';
            customSubmitBtn.disabled = true;

            try {
                // The phone number is sent EXACTLY as it sits in the field, in
                // national format. Do not reformat to international here - the
                // API rejects it. The international switch happens only on the
                // Webflow submit below, same as v1.
                var formData = {
                    email: workEmail.value,
                    firstname: document.getElementById('first-name-l').value,
                    lastname: document.getElementById('last-name-l').value,
                    companyname: document.getElementById('company-name-l').value,
                    country: document.getElementById('country-selected-l').value,
                    phone: phoneInput.value.replace(/[\s\-\(\)]/g, ''),
                    queryString: window.location.search,
                    source: 'Website'
                };

                var response = await fetch(
                    'https://production-api.prezent.ai/trial/register',
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify([formData])
                    }
                );

                var data = await response.json();
                var userAlreadyExist = data.data[0].userAlreadyExist;
                var companyRegistered = data.data[0].companyRegistered;

                if (userAlreadyExist === true) {
                    window.location.href = '/redirection-successful';
                } else if (userAlreadyExist === false && companyRegistered === true) {
                    if (form.checkValidity()) {
                        waitForWebflowSubmission('/registration-successful');
                        originalSubmitBtn.click();
                    }
                } else if (userAlreadyExist === false && companyRegistered === false) {
                    if (form.checkValidity()) {
                        waitForWebflowSubmission('/thank-you');
                        originalSubmitBtn.click();
                    }
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred. Please try again.');
                customSubmitBtn.textContent = 'Submit';
                customSubmitBtn.disabled = false;
            }
        });

        // Clear the error state as the user corrects a field
        form.querySelectorAll('[required]').forEach(function (field) {
            field.addEventListener('input', function () {
                if (field.id === 'phone-number-l') {
                    if (validatePhoneNumber(field.value)) {
                        field.classList.remove('error');
                        var errMsg = field.nextElementSibling;
                        if (errMsg && errMsg.classList.contains('error-message')) {
                            errMsg.remove();
                        }
                    }
                } else if (field.value.trim()) {
                    field.classList.remove('error');
                }
            });
        });

        var style = document.createElement('style');
        style.textContent =
            '.error { border-color: red !important; background-color: #fff0f0; } ' +
            '.error-message { color: red; font-size: 0.8em; margin-top: 4px; }';
        document.head.appendChild(style);

        // Hand off to the lazy tiers
        whenNeeded(form, ['focusin', 'pointerdown', 'touchstart'], function () {
            initPhoneWidget();
        });
    }


    /* ========================================================
       TIER 2 / TIER 3 - PHONE WIDGET
       ======================================================== */

    function initPhoneWidget() {
        var inputs = document.querySelectorAll('input[ms-code-phone-number]');
        if (!inputs.length) return;

        loadStylesheet(ITI_BASE + '/css/intlTelInput.min.css');

        loadScript(ITI_BASE + '/js/intlTelInput.min.js')
            .then(function () {
                inputs.forEach(setupPhoneInput);
            })
            .catch(function (err) {
                // Non-fatal: the phone field stays a plain text input and the
                // country field keeps the value seeded in Tier 1, so the form
                // still submits.
                console.error('intl-tel-input failed to load:', err);
            });
    }

    function setupPhoneInput(input) {
        var preferredCountries = (input.getAttribute('ms-code-phone-number') || '')
            .split(',')
            .map(function (c) { return c.trim(); })
            .filter(Boolean);

        var countryField = document.getElementById('country-selected-l');

        var iti = window.intlTelInput(input, {
            preferredCountries: preferredCountries,
            // utils.js is NOT passed here on purpose. Letting the library fetch
            // it would pull 241 KB for every visitor. It is loaded in Tier 3
            // instead, only when someone actually touches the phone field.
            autoPlaceholder: 'off'
        });

        function utilsReady() {
            return typeof window.intlTelInputUtils !== 'undefined';
        }

        // Keep the hidden country field in step with the flag. Uses
        // intl-tel-input's own country name, so the submitted value matches v1.
        function syncCountryField() {
            if (!countryField) return;
            var d = iti.getSelectedCountryData();
            if (d && d.name) countryField.value = d.name;
        }

        input.addEventListener('countrychange', syncCountryField);

        // Set the field straight away from whatever flag the library picked, so
        // it is never empty...
        syncCountryField();

        // ...then wait for the IP lookup and correct it. Waiting on the promise
        // is what stops the widget winning the race and leaving the default
        // preferred country (Canada) in place for a visitor in Morocco.
        Promise.resolve(geoPromise).then(function (code) {
            if (!code) return;
            iti.setCountry(String(code).toLowerCase());
            syncCountryField();
        });

        /* ---- TIER 3: utils.js, on first real interaction only ---- */
        function formatNational() {
            if (!utilsReady()) return;
            var formatted = iti.getNumber(intlTelInputUtils.numberFormat.NATIONAL);
            if (formatted) input.value = formatted;
        }

        onFirstInteraction(
            input,
            ['focus', 'pointerdown', 'touchstart', 'input', 'change'],
            function () {
                loadScript(ITI_BASE + '/js/utils.js')
                    .then(function () {
                        // Format whatever is already typed
                        formatNational();
                    })
                    .catch(function (err) {
                        console.error('intl-tel-input utils failed to load:', err);
                    });
            }
        );

        input.addEventListener('change', formatNational);
        input.addEventListener('keyup', formatNational);

        // Switch to international format for the Webflow record only.
        formatPhoneForWebflowSubmit = function () {
            if (!utilsReady()) return;
            var formatted = iti.getNumber(intlTelInputUtils.numberFormat.INTERNATIONAL);
            if (formatted) input.value = formatted;
        };

        var form = input.closest('form');
        if (form) {
            form.addEventListener('submit', function () {
                formatPhoneForWebflowSubmit();
            });
        }
    }


    /* ========================================================
       3. SWIPER - 
       ======================================================== */


document.addEventListener('DOMContentLoaded', function () {
  new Swiper('.expswiper', {
    slidesPerView: 3,
    slidesPerGroup: 1,
    spaceBetween: 24,
    loop: true,
    grabCursor: true,
    a11y: false,
    navigation: {
      nextEl: '.swiper-button-next-5',
      prevEl: '.swiper-button-prev-5',
    },
    breakpoints: {
      0:    { slidesPerView: 1 },
      640:  { slidesPerView: 2, spaceBetween: 32 },
      1024: { slidesPerView: 3, spaceBetween: 32 },
    },
  });
});






document.addEventListener('DOMContentLoaded', function () {
  new Swiper('.expswiper-2', {
    slidesPerView:1,
    slidesPerGroup: 1,
    spaceBetween: 24,
    loop: true,
    grabCursor: true,
    a11y: false,
    navigation: {
      nextEl: '.swiper-button-next-6',
      prevEl: '.swiper-button-prev-6',
    },
    breakpoints: {
      0:    { slidesPerView: 1 },
      640:  { slidesPerView: 1, spaceBetween: 32 },
      1024: { slidesPerView: 1, spaceBetween: 32 },
    },
  });
});



    /* ========================================================
       BOOT
       ======================================================== */

    onReady(function () {
        // Tier 1 - instant
        checkUTMParameters();
        initGeotargeting();
        seedCountryField();
        initForm();

        // Carousel: site-wide Swiper 8 is deferred, so it may land after us.
        if (typeof Swiper !== 'undefined') {
            initEbookSwiper();
        } else {
            window.addEventListener('load', initEbookSwiper, { once: true });
        }
    });
})();
