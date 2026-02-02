/*Disable all dev mods for complex components if the user forgot to disable them in the admin area*/
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".dev-edite-mode").forEach((el) => {
    if (el.classList.contains("is-on")) {
      el.classList.remove("is-on");
    }
  });
});

/* ==========================================================================
   1. Lottie Playback on Visibility & Hover Control - UPDATED WITH HERO FIX
   ========================================================================== */
/*Play lottie when visible and control hover START */

(function () {
  const origLoad = bodymovin.loadAnimation;
  bodymovin.loadAnimation = function (config) {
    const anim = origLoad(config);
    if (config.container) config.container.__lottieAnim = anim;
    return anim;
  };
})();

document.addEventListener("DOMContentLoaded", function () {
  const lottieElements = document.querySelectorAll("[data-lottie-src]");
  
  lottieElements.forEach((element) => {
    // Skip if already loaded (prevents conflicts)
    if (element.__lottieAnim || element.hasAttribute("data-lottie-loaded")) {
      return;
    }

    element.style.position = "relative";
    element.style.width = "100%";
    element.style.height = "100%";
    element.style.overflow = "hidden";

    const lottieSrc = element.getAttribute("data-lottie-src");
    const playOnHover = element.hasAttribute("data-play-hover");
    const loopLottie = element.hasAttribute("data-lottie-loop");
    const noWait = element.hasAttribute("data-no-wait");
    const rendererType = element.getAttribute("data-lottie-renderer") || "svg";

    const animationConfig = {
      container: element,
      renderer: rendererType,
      path: lottieSrc,
      rendererSettings: {
        preserveAspectRatio: "xMidYMid slice",
      },
    };

    // IMMEDIATE PLAYBACK FOR HERO SECTIONS (data-no-wait)
    if (noWait) {
      if (playOnHover) {
        animationConfig.loop = false;
        animationConfig.autoplay = false;
        const anim = bodymovin.loadAnimation(animationConfig);

        const parentWrapper = element.closest(".lottie-wrapper-hover");
        if (parentWrapper) {
          parentWrapper.addEventListener("mouseenter", () => {
            anim.setDirection(1);
            anim.play();
          });
          parentWrapper.addEventListener("mouseleave", () => {
            anim.setDirection(-1);
            anim.play();
          });
        }
      } else {
        animationConfig.loop = loopLottie;
        animationConfig.autoplay = true;
        bodymovin.loadAnimation(animationConfig);
      }
      element.setAttribute("data-lottie-loaded", "true");
      return;
    }

    // LAZY LOADING FOR OTHER LOTTIES (scroll-triggered for performance)
    const observer = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (playOnHover) {
              animationConfig.loop = false;
              animationConfig.autoplay = false;
              const anim = bodymovin.loadAnimation(animationConfig);

              const parentWrapper = element.closest(".lottie-wrapper-hover");
              if (parentWrapper) {
                parentWrapper.addEventListener("mouseenter", () => {
                  anim.setDirection(1);
                  anim.play();
                });
                parentWrapper.addEventListener("mouseleave", () => {
                  anim.setDirection(-1);
                  anim.play();
                });
              }
            } else {
              animationConfig.loop = loopLottie;
              animationConfig.autoplay = true;
              bodymovin.loadAnimation(animationConfig);
            }
            element.setAttribute("data-lottie-loaded", "true");
            observer.unobserve(element);
          }
        });
      },
      {
        rootMargin: "0px",
        threshold: 0.1,
      }
    );

    observer.observe(element);
  });
});
/*Play lottie when visible and control hover END */

/* ==========================================================================
   7. Interactive Time Tabs with Video & Lottie Crossfade
   ========================================================================== */
(function () {
  // Initialize all interactive grid wrappers under the given root
  function initInteractiveGrids(root = document) {
    const wrappers = root.querySelectorAll(
      ".interactive-grid_wrapper:not(.__inited)"
    );
    if (
      !wrappers.length ||
      typeof gsap === "undefined" ||
      typeof ScrollTrigger === "undefined"
    ) {
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    wrappers.forEach((wrapper) => {
      wrapper.classList.add("__inited");
      setupInteractiveGrid(wrapper);
    });
  }

  // Set up a single interactive grid wrapper
  function setupInteractiveGrid(wrapper) {
    const duration = parseFloat(wrapper.dataset.stepDuration) || 6;
    const autoMediaHeight = wrapper.dataset.mediaWrapperAuto === "true";
    const fadeDuration = parseFloat(wrapper.dataset.fadeDuration) || 0.5;
    const animateInterContent = wrapper.dataset.animeInterContent === "true";

    const tabEls = Array.from(wrapper.querySelectorAll(".interactive-tab"));
    if (!tabEls.length) return;

    const tabs = tabEls.map((el) => ({
      container: el,
      hidden: el.querySelector(".interactive-tab_content_hidden"),
      visible: el.querySelector(".interactive-tab_content_visible"),
      content: el.querySelector(".interactive-tab_content"),
      bullet: el.querySelector(".bullets_active"),
      mediaWrapper: el.querySelector(".interactive-tab_media_wrap"),
      progressBar: el.querySelector(".interactive-progress"),
      progressWrapper: el.querySelector(".interactive-progress_wrap"),
      lottieEl: el.querySelector(".lottie-element"),
      contentInteractiveMedia: el.querySelector(
        ".content-in-interactive-media"
      ),
    }));

    let heightCache = [];
    let activeIndex = 0;
    let playTimer = null;
    let progressTween = null;
    let isAutoPlay = true;
    let isInViewport = false;
    let resizeDebounce = null;

    // Calculate and cache heights of hidden tab content
    function measureHeights() {
      heightCache = tabs.map((tab) => {
        const width = tab.hidden.getBoundingClientRect().width;
        gsap.set(tab.hidden, {
          height: "auto",
          width: `${width}px`,
          opacity: 1,
          position: "absolute",
          visibility: "hidden",
        });
        const h = tab.hidden.scrollHeight;
        gsap.set(tab.hidden, {
          clearProps: "height,width,opacity,position,visibility",
        });
        return h;
      });
    }
    measureHeights();

    // Re-measure on window resize
    window.addEventListener("resize", () => {
      clearTimeout(resizeDebounce);
      resizeDebounce = setTimeout(() => {
        measureHeights();
        const active = tabs[activeIndex];
        gsap.set(active.hidden, { height: "auto", opacity: 1 });
        if (window.innerWidth < 991) {
          if (autoMediaHeight) {
            gsap.set(active.mediaWrapper, { height: "auto", opacity: 1 });
          } else {
            gsap.set(active.mediaWrapper, {
              height: "80vw",
              overflow: "hidden",
              opacity: 1,
            });
          }
        } else {
          gsap.set(active.mediaWrapper, { clearProps: "height", opacity: 1 });
        }
      }, 100);
    });

    function clearPlayTimer() {
      clearTimeout(playTimer);
      playTimer = null;
    }
    function clearProgressTween() {
      if (progressTween) progressTween.kill();
      progressTween = null;
    }
    function startProgress() {
      if (!isAutoPlay || !isInViewport) return;
      const { progressBar, progressWrapper } = tabs[activeIndex];
      clearPlayTimer();
      clearProgressTween();
      gsap.set(progressWrapper, { opacity: 1 });
      gsap.set(progressBar, { opacity: 1, width: 0 });
      progressTween = gsap.fromTo(
        progressBar,
        { width: 0 },
        { width: "100%", ease: "none", duration }
      );
      playTimer = setTimeout(
        () => activateTab((activeIndex + 1) % tabs.length, false),
        duration * 1000
      );
    }
    function stopProgress() {
      clearPlayTimer();
      clearProgressTween();
    }

    // Set up scroll-triggered autoplay
    const scrollStart = wrapper.dataset.scrollStart || "top 100%";
    const scrollEnd = wrapper.dataset.scrollEnd || "bottom 0%";
    ScrollTrigger.create({
      trigger: wrapper,
      start: scrollStart,
      end: scrollEnd,
      onEnter: () => {
        isInViewport = true;
        startProgress();
      },
      onEnterBack: () => {
        isInViewport = true;
        startProgress();
      },
      onLeave: () => {
        isInViewport = false;
        stopProgress();
      },
      onLeaveBack: () => {
        isInViewport = false;
        stopProgress();
      },
    });

    // Reset all tabs to their initial state
    function resetTabs() {
      tabs.forEach((tab) => {
        tab.container.classList.remove("is-interactive-active");
        gsap.set(tab.hidden, { clearProps: "height,opacity,width" });
        gsap.set(tab.mediaWrapper, { clearProps: "height,opacity" });
        gsap.set(tab.progressWrapper, { clearProps: "opacity" });
        gsap.set(tab.progressBar, { clearProps: "width,opacity" });
        gsap.set(tab.content, { clearProps: "opacity" });
        gsap.set(tab.bullet, { clearProps: "opacity" });
        if (animateInterContent && tab.contentInteractiveMedia) {
          gsap.set(tab.contentInteractiveMedia, {
            clearProps: "opacity,y,zIndex,position",
          });
        }
      });
    }

    // Activate a specific tab by index
    function activateTab(index, userClicked) {
      const mobileUpStop = wrapper.dataset.mobileUpStop === "true";
      activeIndex = index;
      resetTabs();
      clearPlayTimer();
      clearProgressTween();

      const tab = tabs[index];
      tab.container.classList.add("is-interactive-active");

      gsap.to(tab.content, {
        opacity: 1,
        duration: fadeDuration,
        ease: "power2.out",
      });
      gsap.to(tab.bullet, {
        opacity: 1,
        duration: fadeDuration,
        ease: "power2.out",
      });
      gsap.to(tab.visible, {
        opacity: 1,
        duration: fadeDuration,
        ease: "power2.out",
      });

      gsap.fromTo(
        tab.hidden,
        { height: 0, opacity: 0 },
        {
          height: `${heightCache[index]}px`,
          opacity: 1,
          duration: 0.5,
          ease: "power2.out",
          onComplete: () => gsap.set(tab.hidden, { height: "auto" }),
        }
      );

      if (window.innerWidth < 991) {
        if (autoMediaHeight) {
          const mw = tab.mediaWrapper;
          const w = mw.getBoundingClientRect().width;
          gsap.set(mw, {
            height: "auto",
            width: `${w}px`,
            position: "absolute",
            visibility: "hidden",
          });
          const targetH = mw.scrollHeight;
          gsap.set(mw, {
            clearProps: "width,position,visibility",
            height: 0,
            overflow: "hidden",
            opacity: 1,
          });
          gsap.to(mw, {
            height: `${targetH}px`,
            duration: 0.5,
            ease: "power2.out",
            onComplete: () => gsap.set(mw, { height: "auto" }),
          });
        } else {
          gsap.to(tab.mediaWrapper, {
            height: "80vw",
            overflow: "hidden",
            opacity: 1,
            duration: 0.5,
            ease: "power2.out",
          });
        }
      } else {
        gsap.to(tab.mediaWrapper, {
          opacity: 1,
          duration: 0.5,
          ease: "power2.out",
        });
      }

      if (
        animateInterContent &&
        window.innerWidth >= 991 &&
        tab.contentInteractiveMedia
      ) {
        tab.contentInteractiveMedia.style.position = "relative";
        tab.contentInteractiveMedia.style.zIndex = "10";
        gsap.fromTo(
          tab.contentInteractiveMedia,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }
        );
      }

      if (userClicked) {
        isAutoPlay = false;
        gsap.set(tab.progressWrapper, { opacity: 1 });
        gsap.set(tab.progressBar, { opacity: 1, width: "100%" });
      } else {
        startProgress();
      }

      if (userClicked && window.innerWidth < 991 && !mobileUpStop) {
        const header =
          document.querySelector("header") ||
          document.querySelector(".navbar_component");
        const headerH = header ? header.getBoundingClientRect().height : 0;
        const extraOff = 30;
        const topY =
          tab.container.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({ top: topY - headerH - extraOff, behavior: "smooth" });
      }

      if (tab.lottieEl?.__lottieAnim) {
        tab.lottieEl.__lottieAnim.goToAndPlay(0, true);
      }
    }

    // Attach click handlers to each tab
    tabs.forEach((tab, i) => {
      const clickArea = tab.container.querySelector(
        ".interactive-tab_content_wrap"
      );
      if (clickArea) {
        clickArea.addEventListener("click", () => {
          if (activeIndex === i) return;
          activateTab(i, true);
        });
      }
    });

    // Show the first tab by default
    activateTab(0, false);
  }

  // Initialize on page load
  document.addEventListener("DOMContentLoaded", () => {
    initInteractiveGrids();
  });

  // Re-init and re-measure heights when dynamically loading new grids via .menu_tab click
  document.addEventListener("click", (e) => {
    if (e.target.closest(".menu_tab")) {
      setTimeout(() => {
        initInteractiveGrids();
        if (typeof ScrollTrigger !== "undefined") {
          ScrollTrigger.refresh();
        }
        // trigger a resize event so measureHeights runs for new wrappers
        window.dispatchEvent(new Event("resize"));
      }, 50);
    }
  });
})();

/* ==========================================================================
     9. Simple Custom Tabs
     ========================================================================== */
document.querySelectorAll(".tab-wrapper").forEach((wrapper) => {
  const tabs = wrapper.querySelectorAll(
    ".menu_tab, .switch_tab, .tab-img_switch"
  );
  const panels = wrapper.querySelectorAll(".content_tab");

  tabs.forEach((tab, idx) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("is-active"));
      tab.classList.add("is-active");

      panels.forEach((p) => p.classList.remove("is-active", "visible-anime"));
      const target = panels[idx];
      if (!target) return;

      target.classList.add("is-active");
      // force reflow for CSS animation
      void target.offsetWidth;
      target.classList.add("visible-anime");
    });
  });

  // optionally activate the first tab
  if (tabs.length) tabs[0].click();
});

/* ==========================================================================
           10. Mobile Sliders Initialization & Destruction
========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const BREAKPOINT = 768;
  const instances = new Map();

  function initSliders() {
    document.querySelectorAll(".menu-tabs-slider").forEach((el) => {
      if (!instances.has(el)) {
        let space = parseInt(el.dataset.sliderSpace, 8);
        if (isNaN(space)) space = 8;
        const swiper = new Swiper(el, {
          slidesPerView: "auto",
          spaceBetween: space,
        });
        instances.set(el, swiper);
      }
    });

    document.querySelectorAll(".winter-slider").forEach((el) => {
      if (!instances.has(el)) {
        const swiper = new Swiper(el, {
          slidesPerView: 2.1,
          spaceBetween: 8,
          loop: true,
          pagination: {
            el: ".swiper-bullet-wrapper.is-slider-winter",
            clickable: true,
            bulletClass: "swiper-bullet-winter",
            bulletActiveClass: "is_active_winter",
          },
        });
        instances.set(el, swiper);
      }
    });

    document.querySelectorAll(".brand-slider").forEach((el) => {
      if (!instances.has(el)) {
        const swiper = new Swiper(el, {
          slidesPerView: 1.2,
          spaceBetween: 8,
          loop: true,
          pagination: {
            el: ".swiper-bullet-wrapper.is-slider-brand",
            clickable: true,
            bulletClass: "swiper-bullet-brand",
            bulletActiveClass: "is_active_brand",
          },
        });
        instances.set(el, swiper);
      }
    });
  }

  function destroySliders() {
    instances.forEach((swiper, el) => {
      swiper.destroy(true, true);
      instances.delete(el);
    });
  }

  function checkSliders() {
    window.innerWidth <= BREAKPOINT ? initSliders() : destroySliders();
  }

  checkSliders();
  window.addEventListener("resize", checkSliders);
});

/* ==========================================================================
           11. Mob tabs for plans START
========================================================================== */

(function ($) {
  const BREAKPOINT = 767;
  let isInitialized = false;

  function initMobileTabs() {
    if (isInitialized) return;
    const $root = $(".plan-pricing-tabs-and-content");
    if (!$root.length) return;

    $root
      .find(".plan-tab-wrapper")
      .removeClass("is-active")
      .eq(0)
      .addClass("is-active");
    $root.find(".plan-tab-content").hide().eq(0).show();

    $root.on("click.mobileTabs", ".plan-tab-wrapper", function (e) {
      e.preventDefault();
      const $tabs = $root.find(".plan-tab-wrapper");
      const idx = $tabs.index(this);

      $tabs.removeClass("is-active");
      $(this).addClass("is-active");

      const $contents = $root.find(".plan-tab-content");
      $contents.filter(":visible").fadeOut(200, function () {
        $contents.eq(idx).fadeIn(200);
      });
    });

    isInitialized = true;
  }

  function destroyMobileTabs() {
    if (!isInitialized) return;
    const $root = $(".plan-pricing-tabs-and-content");
    $root.off("click.mobileTabs");
    $root.find(".plan-tab-content").show();
    $root.find(".plan-tab-wrapper").removeClass("is-active");
    isInitialized = false;
  }

  function toggleTabsByWidth() {
    if ($(window).width() < BREAKPOINT) {
      initMobileTabs();
    } else {
      destroyMobileTabs();
    }
  }

  function debounce(fn, delay = 250) {
    let t;
    return () => {
      clearTimeout(t);
      t = setTimeout(fn, delay);
    };
  }

  $(document).ready(function () {
    toggleTabsByWidth();
    $(window).on("resize orientationchange", debounce(toggleTabsByWidth));
  });
})(jQuery);

/*Mob tabs for plan END */

/* ==========================================================================
           12. Slider for Awwards carusel START
========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const sliders = document.querySelectorAll(".awwards-slider");

  if (sliders.length > 0) {
    sliders.forEach((sliderEl) => {
      new Swiper(sliderEl, {
        slidesPerView: 3.5,
        centeredSlides: true,
        loop: true,
        autoplay: {
          delay: 4000,
          disableOnInteraction: false,
        },
        spaceBetween: 20,
        breakpoints: {
          992: { slidesPerView: 3.5, spaceBetween: 20 },
          768: { slidesPerView: 2.2, spaceBetween: 8 },
          0: { slidesPerView: 1.1, spaceBetween: 8 },
        },
      });
    });
  }
});

/*Slider for Awwards carusel END */

/* ==========================================================================
           12. Slider for Related resources START
========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".blog-swiper-wrap").forEach((sliderEl) => {
    const block = sliderEl.closest(".block-wrapper");
    const prevArrow = block.querySelector("#blog-arrow-slider-prev");
    const nextArrow = block.querySelector("#blog-arrow-slider-next");
    const scrollbarEl = block.querySelector(".swiper-scrollbar");

    const swiper = new Swiper(sliderEl, {
      slidesPerView: 4,
      spaceBetween: 20,
      scrollbar: {
        el: scrollbarEl,
        hide: false,
      },
      navigation: {
        prevEl: prevArrow,
        nextEl: nextArrow,
      },
      breakpoints: {
        992: { slidesPerView: 4, spaceBetween: 20 },
        768: { slidesPerView: 2, spaceBetween: 8 },
        0: { slidesPerView: 1, spaceBetween: 8 },
      },
    });

    function updateArrowState() {
      prevArrow.classList.toggle("is-on", !swiper.isBeginning);
      nextArrow.classList.toggle("is-on", !swiper.isEnd);
    }

    updateArrowState();
    swiper.on("slideChange", updateArrowState);
    swiper.on("breakpoint", updateArrowState);
  });
});

/*Slider for Related resources END */

/* ==========================================================================
     15. Continuous Marquee Initialization
     ========================================================================== */
function initMarquees(selector, speed) {
  const marquees = document.querySelectorAll(selector);
  if (!marquees.length) return;

  marquees.forEach((parent) => {
    const original = parent.innerHTML;
    parent.insertAdjacentHTML("beforeend", original);
    parent.insertAdjacentHTML("beforeend", original);

    let offset = 0;
    let paused = false;

    setInterval(() => {
      if (paused) return;
      const first = parent.firstElementChild;
      first.style.marginLeft = `-${offset}px`;
      if (offset > first.clientWidth) offset = 0;
      else offset += speed;
    }, 16);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initMarquees(".marquee", 0.9);
});

/* ==========================================================================
     10. Navbar changes after scroll START
     ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const THRESHOLD = 2;
  const block = document.querySelector(".navbar_component");

  window.addEventListener("scroll", () => {
    const scrolled = window.pageYOffset;

    if (scrolled >= THRESHOLD) {
      block.classList.add("is-scroll");
    } else {
      block.classList.remove("is-scroll");
    }
  });
});

/* ==========================================================================
     7. Filters accordion custom START
     ========================================================================== */
$(function () {
  function initFiltersAccordion() {
    var $groups = $(".filters_filter-group");
    var $headings = $groups.find(".filters_filter-group-heading");

    $headings.off(".accordion");

    if ($(window).width() < 991) {
      $groups.removeClass("is-active").find(".flex-filtres-left").hide();

      $headings.on("click.accordion", function () {
        var $group = $(this).closest(".filters_filter-group");
        var $content = $group.find(".flex-filtres-left");

        if ($group.hasClass("is-active")) {
          $content.slideUp(200);
          $group.removeClass("is-active");
        } else {
          $groups
            .filter(".is-active")
            .removeClass("is-active")
            .find(".flex-filtres-left")
            .slideUp(200);

          $group.addClass("is-active");
          $content.slideDown(200);
        }
      });
    } else {
      $groups.removeClass("is-active").find(".flex-filtres-left").show();
    }
  }

  initFiltersAccordion();

  var resizeTimer;
  $(window).on("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(initFiltersAccordion, 100);
  });
});

/*Filters open close on tablet */
$(function () {
  function initFilterToggle() {
    var $wrapper = $(".filters_lists-wrapper");
    var $openBtn = $("[data-filters-open]");
    var $closeBtn = $("[data-filters-close]");

    if (!$wrapper.length) return;

    $openBtn.off("click.filterToggle");
    $closeBtn.off("click.filterToggle");

    if ($(window).width() < 991) {
      $wrapper.hide().removeClass("is-active");

      $openBtn.on("click.filterToggle", function () {
        if ($wrapper.hasClass("is-active")) {
          $wrapper.removeClass("is-active").slideUp(200);
        } else {
          $wrapper.addClass("is-active").slideDown(200);
        }
      });

      $closeBtn.on("click.filterToggle", function () {
        if ($wrapper.hasClass("is-active")) {
          $wrapper.removeClass("is-active").slideUp(200);
        }
      });
    } else {
      $wrapper.show().removeClass("is-active");
    }
  }

  initFilterToggle();

  var resizeTimer;
  $(window).on("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(initFilterToggle, 100);
  });
});

/*Filters accordion custom END */

/* ==========================================================================
     7. Button copied START
     ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const copyButtons = document.querySelectorAll(
    ".card-wrapper-spacebet-blog .button.is-copy"
  );

  copyButtons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();

      const card = btn.closest(".card-wrapper-spacebet-blog");
      if (!card) return;

      const box = card.querySelector(".box-copy-wrap");
      const textToCopy = box ? box.textContent.trim() : "";
      if (!textToCopy) return;

      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(textToCopy);
        } catch (err) {
          console.error("Error", err);
          return;
        }
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand("copy");
        } catch (err) {
          console.error("Error", err);
        }
        document.body.removeChild(textarea);
      }

      const textEl = btn.querySelector(".button-text");
      if (textEl) {
        const prev = textEl.textContent;
        textEl.textContent = "Copied!";
        setTimeout(() => {
          textEl.textContent = prev;
        }, 2000);
      }
    });
  });
});

/*Button copied END */

/*******NEW */

document.addEventListener("DOMContentLoaded", () => {
  const mm = gsap.matchMedia();
  mm.add("(min-width: 992px)", () => {
    document
      .querySelectorAll(".main-page-interection-wrapper")
      .forEach((comp) => {
        comp.querySelectorAll(".interactive-grid_wrapper").forEach((sec) => {
          ScrollTrigger.create({
            trigger: sec,
            start: "top 50%",
            end: "bottom 50%",
            onEnter: () => activateSection(sec),
            onEnterBack: () => activateSection(sec),
          });
        });
      });

    function activateSection(sec) {
      const parent = sec.closest(".main-page-interection-wrapper");
      parent
        .querySelectorAll(".interactive-grid_wrapper")
        .forEach((s) => s.classList.remove("is-active-scrolling"));
      sec.classList.add("is-active-scrolling");

      const lottie = sec.querySelector(".lottie-element");
      if (lottie?.__lottieAnim) {
        lottie.__lottieAnim.goToAndPlay(0, true);
      }
    }

    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  });
});



document.addEventListener("click", function (event) {
  const element = event.target.closest('[js-faq-collapse="true"]');
  if (element) {
    if (!element.classList.contains("open")) {
      document
        .querySelectorAll('[js-faq-collapse="true"].open')
        .forEach(function (item) {
          if (item !== element) {
            item.click();
          }
        });

      element.classList.add("open");
    } else {
      element.classList.remove("open");
    }
  }
});

/*HERO animation START */

document.addEventListener("DOMContentLoaded", () => {
  document
    .querySelectorAll("[data-headline-split-appear-hero]")
    .forEach((el) => {
      new SplitType(el, {
        types: "words",
        lineClass: "word",
      });
    });

  const firstElsHero = document.querySelectorAll("[data-first-el-appear-hero]");
  const opacityElsHero = document.querySelectorAll(
    "[data-opacity-el-appear-hero]"
  );
  const linesHero = document.querySelectorAll(
    "[data-headline-split-appear-hero] .word"
  );
  const secondElsHero = document.querySelectorAll(
    "[data-second-el-appear-hero]"
  );

  if (!firstElsHero.length && !linesHero.length && !secondElsHero.length)
    return;

  const tlHero = gsap.timeline();

  if (firstElsHero.length) {
    tlHero.to(firstElsHero, {
      opacity: 1,
      duration: 1,
      ease: "power2.out",
    });
  }

  if (opacityElsHero.length) {
    tlHero.to(
      opacityElsHero,
      {
        opacity: 1,
        duration: 0,
        ease: "power2.out",
      },
      0
    );
  }

  if (linesHero.length) {
    tlHero.to(
      linesHero,
      {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: "power2.out",
        stagger: 0.2,
      },
      0.1
    );
  }

  if (secondElsHero.length) {
    tlHero.to(
      secondElsHero,
      {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: "power2.out",
        stagger: 0.1,
      },
      0
    );
  }
});

/*HERO animation END */

/*All blocks animation on Scroll START */
gsap.registerPlugin(ScrollTrigger);

document.querySelectorAll("[data-animation-wrap]").forEach((wrap) => {
  const headlineEls = wrap.querySelectorAll("[data-headline-split-appear]");
  if (headlineEls.length) {
    headlineEls.forEach((el) => {
      new SplitType(el, { types: "words", wordClass: "word" });
    });
    ScrollTrigger.refresh();
  }

  const firstEls = wrap.querySelectorAll("[data-first-el-appear]");
  const words = wrap.querySelectorAll("[data-headline-split-appear] .word");
  const secondEls = wrap.querySelectorAll("[data-second-el-appear]");

  if (!firstEls.length && !words.length && !secondEls.length) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: wrap,
      start: "top 80%",
      toggleActions: "play none none none",
    },
  });

  if (firstEls.length) {
    tl.to(firstEls, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "power2.out",
      onStart() {
        firstEls.forEach((el) => el.classList.add("is-animated"));
      },
    });
  }

  if (words.length) {
    tl.to(
      words,
      {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: "power2.out",
        stagger: 0.1,
        onStart() {
          words.forEach((w) => w.classList.add("is-animated"));
        },
      },
      0.1
    );
  }

  if (secondEls.length) {
    tl.to(
      secondEls,
      {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: "power2.out",
        stagger: 0.1,
        onStart() {
          secondEls.forEach((el) => el.classList.add("is-animated"));
        },
      },
      0
    );
  }

  const numEls = wrap.querySelectorAll("[anime-numbers]");
  if (numEls.length) {
    numEls.forEach((el) => {
      const rawText = el.textContent.trim();
      const match = rawText.match(/-?\d+(\.\d+)?/);
      if (!match) return;
      const endStr = match[0];
      const endValue = parseFloat(endStr);
      const decimals = (endStr.split(".")[1] || "").length;
      const prefix = rawText.slice(0, match.index);
      const suffix = rawText.slice(match.index + endStr.length);
      const startValue = endValue * 0.7;
      el.textContent = decimals
        ? `${prefix}${startValue.toFixed(decimals)}${suffix}`
        : `${prefix}${Math.floor(startValue)}${suffix}`;
      const obj = { value: startValue };
      tl.to(
        obj,
        {
          value: endValue,
          duration: 1.5,
          ease: "power1.out",
          onUpdate() {
            const current = decimals
              ? obj.value.toFixed(decimals)
              : Math.floor(obj.value);
            el.textContent = `${prefix}${current}${suffix}`;
          },
        },
        0
      );
    });
  }
});

gsap.utils.toArray("[data-samefirts-el-appear]").forEach((el) => {
  gsap.to(el, {
    scrollTrigger: {
      trigger: el,
      start: "top 80%",
      toggleActions: "play none none none",
    },
    opacity: 1,
    duration: 1,
    ease: "power2.out",
    onStart() {
      el.classList.add("is-animated");
    },
  });
});

/*All blocks animation on Scroll END */
