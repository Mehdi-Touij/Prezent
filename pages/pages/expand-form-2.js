/**
 * Prezent.ai - Form Scripts v2 (Hosted on GitHub)
 * File: pages/expand-form-2.js  —  replaces pages/expand-form.js on the
 * /exp/register/* pages. The original expand-form.js is left untouched.
 * Consolidated: UTM tracking, form submission, phone input,
 * country sync, geotargeting, swiper
 *
 * v2 - performance pass:
 *   - jQuery dependency removed (plain JS), so the extra jQuery copy can be deleted
 *   - intl-tel-input JS + CSS + utils.js are loaded lazily, off the critical path
 *   - the 5s location.reload() after submit is gone
 *   - form validation / submission logic is unchanged from v1
 */

/* ============================================
   0. SMALL HELPERS
   ============================================ */
function onReady(fn) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fn);
    } else {
        fn();
    }
}

function loadScript(src) {
    return new Promise(function (resolve, reject) {
        var existing = document.querySelector('script[data-lazy-src="' + src + '"]');
        if (existing) {
            existing.addEventListener('load', resolve);
            existing.addEventListener('error', reject);
            return;
        }
        var s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.setAttribute('data-lazy-src', src);
        s.onload = resolve;
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

// Runs `fn` once, on whichever happens first: user touches the form,
// the form scrolls into view, or the browser goes idle.
function whenNeeded(target, fn) {
    var done = false;
    function go() {
        if (done) return;
        done = true;
        fn();
    }

    if (target) {
        ['focusin', 'pointerdown', 'touchstart'].forEach(function (evt) {
            target.addEventListener(evt, go, { once: true, passive: true });
        });

        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                if (entries.some(function (e) { return e.isIntersecting; })) {
                    io.disconnect();
                    go();
                }
            });
            io.observe(target);
        }
    }

    // Safety net: always load shortly after the page settles.
    if ('requestIdleCallback' in window) {
        requestIdleCallback(go, { timeout: 2500 });
    } else {
        setTimeout(go, 1200);
    }
}


/* ============================================
   1. UTM PARAMETERS (with cookie fallback)
   ============================================ */
function checkUTMParameters() {
    const trackingParams = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'gclid'
    ];

    const formFieldMapping = {
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
            if (fieldId) {
                var field = document.getElementById(fieldId);
                if (field) {
                    field.value = trackingData[param];
                }
            }
        });
    }

    function getURLParameters() {
        var urlParams = new URLSearchParams(window.location.search);
        var trackingData = {};
        var hasTracking = false;
        trackingParams.forEach(function (param) {
            var value = urlParams.get(param);
            if (value) {
                trackingData[param] = value;
                hasTracking = true;
            }
        });
        return hasTracking ? trackingData : null;
    }

    function getCookie(name) {
        var value = '; ' + document.cookie;
        var parts = value.split('; ' + name + '=');
        if (parts.length === 2) {
            return parts.pop().split(';').shift();
        }
        return null;
    }

    function parseTrackingFromCookieURL(cookieValue) {
        if (!cookieValue) return null;
        try {
            var decodedValue = decodeURIComponent(cookieValue);
            var url = new URL(decodedValue);
            var urlParams = new URLSearchParams(url.search);
            var trackingData = {};
            var hasTracking = false;
            trackingParams.forEach(function (param) {
                var value = urlParams.get(param);
                if (value) {
                    trackingData[param] = value;
                    hasTracking = true;
                }
            });
            return hasTracking ? trackingData : null;
        } catch (error) {
            return null;
        }
    }

    // Main logic: check URL first, then cookie fallback
    var trackingData = getURLParameters();
    if (trackingData) {
        populateFormFields(trackingData);
        return { source: 'url', data: trackingData };
    }

    var cookieValue = getCookie('__gtm_campaign_url');
    if (cookieValue) {
        trackingData = parseTrackingFromCookieURL(cookieValue);
        if (trackingData) {
            populateFormFields(trackingData);
            return { source: 'cookie', data: trackingData };
        }
    }

    return { source: 'none', data: null };
}

// The hidden UTM inputs are inside the form, so wait for the DOM.
onReady(checkUTMParameters);


/* ============================================
   2. MAIN FORM SUBMISSION + VALIDATION
   (logic unchanged from v1)
   ============================================ */
onReady(function () {
    var form = document.getElementById('wf-form-client-registration-expand');
    if (!form) return; // Exit if form not on this page

    var workEmail = document.getElementById('work-email-l');
    var phoneInput = document.getElementById('phone-number-l');
    var customSubmitBtn = document.getElementById('submit-2');
    var originalSubmitBtn = form.querySelector('input[type="submit"]');

    if (!customSubmitBtn) return;

    // Hide the original submit button
    if (originalSubmitBtn) {
        originalSubmitBtn.style.display = 'none';
    }

    // Phone number validation
    function validatePhoneNumber(phoneNumber) {
        var cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
        var isValidNumber = /^\d+$/.test(cleanNumber);
        var hasValidLength = cleanNumber.length >= 7 && cleanNumber.length <= 15;
        return isValidNumber && hasValidLength;
    }

    // Form validation
    function validateForm() {
        var requiredFields = form.querySelectorAll('[required]');
        var isValid = true;

        requiredFields.forEach(function (field) {
            if (!field.value.trim()) {
                isValid = false;
                field.classList.add('error');
            } else {
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
                        errorMessage.textContent = 'Please enter a valid phone number (numbers only)';
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
            }
        });

        return isValid;
    }

    // Wait for Webflow submission
    function waitForWebflowSubmission(redirectUrl) {
        var submitted = false;
        var timeoutId;

        var successHandler = function () {
            if (!submitted) {
                submitted = true;
                clearTimeout(timeoutId);
                setTimeout(function () {
                    window.location.href = redirectUrl;
                }, 500);
            }
        };

        var errorHandler = function () {
            if (!submitted) {
                submitted = true;
                clearTimeout(timeoutId);
                customSubmitBtn.textContent = "Submit";
                customSubmitBtn.disabled = false;
                alert('Form submission failed. Please try again.');
            }
        };

        document.addEventListener('webflow:success', successHandler);
        document.addEventListener('webflow:error', errorHandler);

        var checkForWebflowResponse = function () {
            var successDiv = document.querySelector('.w-form-done');
            var errorDiv = document.querySelector('.w-form-fail');

            if (successDiv && successDiv.style.display !== 'none') {
                successHandler();
                return;
            }
            if (errorDiv && errorDiv.style.display !== 'none') {
                errorHandler();
                return;
            }
            if (!submitted) {
                setTimeout(checkForWebflowResponse, 100);
            }
        };

        setTimeout(checkForWebflowResponse, 100);

        timeoutId = setTimeout(function () {
            if (!submitted) {
                submitted = true;
                console.log('Webflow submission timeout - redirecting anyway');
                window.location.href = redirectUrl;
            }
        }, 3000);

        return function cleanup() {
            clearTimeout(timeoutId);
            document.removeEventListener('webflow:success', successHandler);
            document.removeEventListener('webflow:error', errorHandler);
        };
    }

    // Custom submit button click handler
    customSubmitBtn.addEventListener('click', async function (event) {
        event.preventDefault();

        if (!validateForm()) {
            return;
        }

        customSubmitBtn.textContent = "Please wait...";
        customSubmitBtn.disabled = true;

        try {
            // Make sure the phone number is in international format before sending,
            // even if the phone widget finished loading late.
            formatPhoneForSubmit();

            var formData = {
                email: workEmail.value,
                firstname: document.getElementById('first-name-l').value,
                lastname: document.getElementById('last-name-l').value,
                companyname: document.getElementById('company-name-l').value,
                country: document.getElementById('country-selected-l').value,
                phone: phoneInput.value.replace(/[\s\-\(\)]/g, ''),
                queryString: window.location.search,
                source: "Website"
            };

            var response = await fetch('https://production-api.prezent.ai/trial/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([formData])
            });

            var data = await response.json();
            var userAlreadyExist = data.data[0].userAlreadyExist;
            var companyRegistered = data.data[0].companyRegistered;

            if (userAlreadyExist === true) {
                window.location.href = "/redirection-successful";
            } else if (userAlreadyExist === false && companyRegistered === true) {
                if (form.checkValidity()) {
                    waitForWebflowSubmission("/registration-successful");
                    originalSubmitBtn.click();
                }
            } else if (userAlreadyExist === false && companyRegistered === false) {
                if (form.checkValidity()) {
                    waitForWebflowSubmission("/thank-you");
                    originalSubmitBtn.click();
                }
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
            customSubmitBtn.textContent = "Submit";
            customSubmitBtn.disabled = false;
        }
    });

    // Remove error class on input
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
            } else {
                if (field.value.trim()) {
                    field.classList.remove('error');
                }
            }
        });
    });

    // Inject error CSS
    var style = document.createElement('style');
    style.textContent =
        '.error { border-color: red !important; background-color: #fff0f0; } ' +
        '.error-message { color: red; font-size: 0.8em; margin-top: 4px; }';
    document.head.appendChild(style);

    /* ---- Phone input is set up lazily, see section 3 ---- */
    whenNeeded(form, function () { initPhoneInputs(form); });
});


/* ============================================
   3. PHONE INPUT (lazy intl-tel-input + country sync)
   ============================================ */
var ITI_VERSION = '17.0.8';
var ITI_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/' + ITI_VERSION;
var ITI_UTILS = ITI_BASE + '/js/utils.js';

// Set by initPhoneInputs so the submit handler can reformat the number.
var formatPhoneForSubmit = function () {};

function initPhoneInputs(scope) {
    var inputs = (scope || document).querySelectorAll('input[ms-code-phone-number]');
    if (!inputs.length) return;

    loadStylesheet(ITI_BASE + '/css/intlTelInput.min.css');

    loadScript(ITI_BASE + '/js/intlTelInput.min.js')
        .then(function () {
            inputs.forEach(setupPhoneInput);
        })
        .catch(function (err) {
            console.error('intl-tel-input failed to load', err);
            // The form still works: the phone field stays a plain text input,
            // and the country field falls back to the IP lookup below.
            syncCountryFromIP(null);
        });
}

function setupPhoneInput(input) {
    var preferredCountries = (input.getAttribute('ms-code-phone-number') || '')
        .split(',')
        .map(function (c) { return c.trim(); })
        .filter(Boolean);

    var countryInput = document.getElementById('country-selected-l');

    var iti = window.intlTelInput(input, {
        preferredCountries: preferredCountries,
        // intl-tel-input fetches this itself, asynchronously, so it never blocks.
        utilsScript: ITI_UTILS
    });

    function utilsReady() {
        return typeof window.intlTelInputUtils !== 'undefined';
    }

    function syncCountryField() {
        if (!countryInput) return;
        var countryData = iti.getSelectedCountryData();
        if (countryData && countryData.name) {
            countryInput.value = countryData.name;
        }
    }

    // ---- COUNTRY SYNC: update hidden field when flag changes ----
    input.addEventListener('countrychange', syncCountryField);

    // Auto-detect country from IP and sync
    syncCountryFromIP(function (countryCode) {
        if (countryCode) iti.setCountry(countryCode.toLowerCase());
        syncCountryField();
    });

    // Format phone number as the user types (only once utils.js has arrived)
    function formatPhoneNumber() {
        if (!utilsReady()) return;
        var formatted = iti.getNumber(intlTelInputUtils.numberFormat.NATIONAL);
        if (formatted) input.value = formatted;
    }

    input.addEventListener('change', formatPhoneNumber);
    input.addEventListener('keyup', formatPhoneNumber);

    // Switch to international format on submit
    formatPhoneForSubmit = function () {
        if (!utilsReady()) return;
        var formatted = iti.getNumber(intlTelInputUtils.numberFormat.INTERNATIONAL);
        if (formatted) input.value = formatted;
    };

    var form = input.closest('form');
    if (form) form.addEventListener('submit', formatPhoneForSubmit);

    // Make sure the hidden country field is never left empty.
    syncCountryField();
}

// Plain fetch instead of jQuery JSONP, with a timeout so a slow
// lookup can never hold up the form.
function syncCountryFromIP(callback) {
    var controller = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, 2000);

    fetch('https://ipinfo.io/json', {
        signal: controller ? controller.signal : undefined
    })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
            clearTimeout(timer);
            if (callback) callback(data && data.country ? data.country : null);
        })
        .catch(function () {
            clearTimeout(timer);
            if (callback) callback(null);
        });
}


/* ============================================
   4. GEOTARGETING (conditional on path)
   ============================================ */
onReady(function () {
    if (window.location.href.indexOf('/registration/platform') !== -1) {
        (function (g, e) {
            var s = function () {
                var def = 'geotargetlygeocontent1711351295995_default';
                var nodes = g.getElementsByClassName(def);
                for (var i = 0; i < nodes.length; i++) {
                    nodes[i].style.display = 'inline';
                }
            };
            var t = g.getElementsByTagName(e)[0];
            var y = g.createElement(e);
            y.async = true;
            y.src = 'https://g1584674684.co/gc?winurl=' + encodeURIComponent(window.location) + '&refurl=' + g.referrer + '&id=-NtoU5wvSHI2ffsEI_Mk';
            t.parentNode.insertBefore(y, t);
            y.onerror = function () { s(); };
        })(document, 'script');
    } else {
        var elements = document.getElementsByClassName('geotargetlygeocontent1711351295995_content_2');
        for (var i = 0; i < elements.length; i++) {
            elements[i].style.display = 'block';
        }
    }
});


/* ============================================
   5. SWIPER (e-book carousel)
   ============================================ */
onReady(function () {
    var el = document.querySelector('.e-book');
    if (!el || typeof Swiper === 'undefined') return;

    new Swiper('.e-book', {
        effect: "coverflow",
        grabCursor: true,
        loop: true,
        centeredSlides: false,
        initialSlide: 1,
        slidesPerGroup: 2,
        speed: 800,
        coverflowEffect: {
            rotate: 50,
            stretch: 0,
            depth: 100,
            modifier: 1,
            slideShadows: true,
        },
        autoplay: {
            delay: 3000,
            disableOnInteraction: false,
        },
        breakpoints: {
            300: { slidesPerView: 1, initialSlide: 0, slidesPerGroup: 1 },
            480: { slidesPerView: 1.2, initialSlide: 0, slidesPerGroup: 1 },
            768: { slidesPerView: 2 },
            992: { slidesPerView: 2.2, initialSlide: 0, slidesPerGroup: 1 }
        },
        pagination: { el: ".swiper-pagination" },
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
    });
});
