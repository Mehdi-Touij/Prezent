
/**
 * Prezent.ai - Form Scripts (Hosted on GitHub)
 * Consolidated: UTM tracking, form submission, phone input, 
 * country sync, page refresh, geotargeting, swiper
 */

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

// Run UTM check immediately
checkUTMParameters();


/* ============================================
   2. MAIN FORM SUBMISSION + VALIDATION
   ============================================ */
document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('wf-form-client-registration-expand');
    if (!form) return; // Exit if form not on this page

    var workEmail = document.getElementById('work-email-l');
    var phoneInput = document.getElementById('phone-number-l');
    var customSubmitBtn = document.getElementById('submit-2');
    var originalSubmitBtn = form.querySelector('input[type="submit"]');

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
});


/* ============================================
   3. PAGE REFRESH AFTER SUBMIT (5s)
   ============================================ */
if (typeof Webflow !== 'undefined') {
    Webflow.push(function () {
        $(document).on('submit', 'form', function () {
            setTimeout(function () {
                location.reload(true);
            }, 5000);
        });
    });
}


/* ============================================
   4. PHONE INPUT (intl-tel-input + country sync)
   ============================================ */
$(document).ready(function () {
    $('input[ms-code-phone-number]').each(function () {
        var input = this;
        var preferredCountries = $(input).attr('ms-code-phone-number').split(',');
        var countryInput = document.getElementById('country-selected-l');

        var iti = window.intlTelInput(input, {
            preferredCountries: preferredCountries,
            utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js"
        });

        // ---- COUNTRY SYNC: update hidden field when flag changes ----
        input.addEventListener('countrychange', function () {
            var countryData = iti.getSelectedCountryData();
            if (countryInput && countryData.name) {
                countryInput.value = countryData.name;
                console.log('Country synced from phone flag:', countryData.name);
            }
        });

        // Auto-detect country from IP and sync
        $.get("https://ipinfo.io", function (response) {
            var countryCode = response.country;
            iti.setCountry(countryCode);
            // Sync hidden field after auto-detection
            var countryData = iti.getSelectedCountryData();
            if (countryInput && countryData.name) {
                countryInput.value = countryData.name;
                console.log('Country auto-detected:', countryData.name);
            }
        }, "jsonp");

        // Format phone number
        input.addEventListener('change', formatPhoneNumber);
        input.addEventListener('keyup', formatPhoneNumber);

        function formatPhoneNumber() {
            var formattedNumber = iti.getNumber(intlTelInputUtils.numberFormat.NATIONAL);
            input.value = formattedNumber;
        }

        // Switch to international format on submit
        var form = $(input).closest('form');
        form.submit(function () {
            var formattedNumber = iti.getNumber(intlTelInputUtils.numberFormat.INTERNATIONAL);
            input.value = formattedNumber;
        });
    });
});


/* ============================================
   5. GEOTARGETING (conditional on path)
   ============================================ */
if (window.location.href.indexOf('/registration/platform') !== -1) {
    (function (g, e) {
        var s = function () {
            var def = 'geotargetlygeocontent1711351295995_default';
            var len = g.getElementsByClassName(def).length;
            if (len > 0) {
                for (var i = 0; i < len; i++) {
                    g.getElementsByClassName(def)[i].style.display = 'inline';
                }
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


/* ============================================
   6. SWIPER (e-book carousel)
   ============================================ */
document.addEventListener('DOMContentLoaded', function () {
    if (typeof Swiper !== 'undefined' && document.querySelector('.e-book')) {
        new Swiper(".e-book", {
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
                300: {
                    slidesPerView: 1,
                    initialSlide: 0,
                    slidesPerGroup: 1,
                },
                480: {
                    slidesPerView: 1.2,
                    initialSlide: 0,
                    slidesPerGroup: 1,
                },
                768: {
                    slidesPerView: 2,
                },
                992: {
                    slidesPerView: 2.2,
                    initialSlide: 0,
                    slidesPerGroup: 1,
                }
            },
            pagination: {
                el: ".swiper-pagination",
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
        });
    }
});
