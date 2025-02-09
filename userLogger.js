(function (global) {
    "use strict";
  
    /**
     * USERQUERY (Stable Hash-Based ZenIDs Without Position Dependence)
     *
     * This module tracks user interactions on a website by:
     * - Generating stable element identifiers (ZenIDs) based on static attributes.
     * - Labeling elements on click if they aren’t already labeled.
     * - Tracking events (e.g., clicks, page load/unload, custom events).
     * - Batching events in memory and periodically broadcasting them via a POST request.
     *
     * The endpoint for broadcasting events is defined below.
     */
  
    // Define the endpoint here.
    const ENDPOINT = "http://www.api.userquery.tech/track";
  
    const USERQUERY = {};
  
    // Internal state variables
    let _initialized = false;
    let _siteId = null;
    let _userId = null;
    let _config = {};
    let _eventListeners = [];
    let _eventBatch = [];
    let _batchTimer = null;
  
    // Default configuration values
    const DEFAULT_CONFIG = {
      siteId: "UNKNOWN_SITE",
      batchInterval: 5000 // in milliseconds
      // Note: endpoint is now defined in the script as the constant ENDPOINT.
    };
  
    // Global mapping: signature -> { id, count }
    // Used to ensure that multiple elements with the same signature receive unique suffixes.
    const __zenMapping = {};
  
    /**
     * Generate a signature for an element based on its static properties.
     * Ignores positional or dynamic data.
     */
    function generateElementSignature(element) {
      if (!element || !element.tagName) return null;
  
      const parts = [element.tagName.toLowerCase()];
      if (element.id) parts.push(`id:${element.id}`);
      if (element.className) parts.push(`class:${element.className}`);
      const nameAttr = element.getAttribute("name");
      if (nameAttr) parts.push(`name:${nameAttr}`);
      const typeAttr = element.getAttribute("type");
      if (typeAttr) parts.push(`type:${typeAttr}`);
  
      // Include a truncated innerText if available and short
      const text = element.textContent.trim();
      if (text && text.length < 50) {
        parts.push(`text:${text}`);
      }
      return parts.join("|");
    }
  
    /**
     * Compute a 32-bit FNV-1a hash for a given string.
     * Returns a base-36 string representation.
     */
    function fnv32a(str) {
      let hash = 0x811c9dc5;
      for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
      }
      return (hash >>> 0).toString(36);
    }
  
    /**
     * Generate a stable ZenID for the given element. If duplicate signatures occur,
     * a counter suffix is appended to ensure uniqueness.
     */
    function generateStableZenId(element) {
      const signature = generateElementSignature(element);
      if (!signature) return null;
  
      const baseHash = "zen-" + fnv32a(signature);
      if (!(signature in __zenMapping)) {
        __zenMapping[signature] = { id: baseHash, count: 1 };
        return baseHash;
      } else {
        const entry = __zenMapping[signature];
        const newId = entry.count === 1 ? baseHash + "-2" : baseHash + "-" + (entry.count + 1);
        entry.count++;
        return newId;
      }
    }
  
    /**
     * Label a single element with a stable data-zenid attribute.
     */
    function labelElement(el) {
      if (!el.hasAttribute("data-zenid")) {
        const zenId = generateStableZenId(el);
        if (zenId) {
          el.setAttribute("data-zenid", zenId);
        }
      }
    }
  
    /**
     * Retrieve or create a persistent user ID stored in localStorage.
     * Uses crypto.randomUUID() when available for better uniqueness.
     */
    function getOrCreateUserId() {
      let existingId = null;
      try {
        existingId = localStorage.getItem("USERQUERY_uid");
      } catch (err) {
        console.warn("[USERQUERY] localStorage not available. Using in-memory ID.");
      }
      if (!existingId) {
        // Use crypto.randomUUID() if available for a robust UUID.
        if (crypto && typeof crypto.randomUUID === "function") {
          existingId = crypto.randomUUID();
        } else {
          // Fallback: Generate a UUID-like string using crypto.getRandomValues.
          const array = new Uint8Array(16);
          crypto.getRandomValues(array);
          const hex = Array.from(array, b => b.toString(16).padStart(2, "0")).join("");
          existingId = `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(12, 4)}-${hex.substr(16, 4)}-${hex.substr(20, 12)}`;
        }
        try {
          localStorage.setItem("USERQUERY_uid", existingId);
        } catch (err) {
          console.warn("[USERQUERY] Unable to persist userId to localStorage.");
        }
      }
      return existingId;
    }
  
    /**
     * Add an event to the batch.
     */
    function trackInternal(eventName, data = {}) {
      const payload = {
        eventName,
        timestamp: new Date().toISOString(),
        siteId: _siteId,
        userId: _userId,
        url: window.location.href,
        ...data
      };
      _eventBatch.push(payload);
    }
  
    /**
     * Broadcast the batched events via a POST request to the defined endpoint.
     */
    function flushEventBatch() {
      if (_eventBatch.length === 0) return;
  
      const eventsPayload = {
        userId: _userId,
        siteId: _siteId,
        events: _eventBatch
      };
  
      fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(eventsPayload)
      })
        .then(response => {
          if (!response.ok) {
            console.warn("[USERQUERY] Failed to post events. Response status:", response.status);
          }
          // Clear the batch whether or not the request was successful.
          _eventBatch = [];
        })
        .catch(err => {
          console.warn("[USERQUERY] Error posting events:", err);
          // Optionally, you might decide not to clear the batch on error.
          _eventBatch = [];
        });
    }
  
    /**
     * Attach core event listeners.
     * The click event listener labels the element on click and tracks the event.
     */
    function attachCoreEventListeners() {
      // Click event handler: labels and logs the click.
      const clickHandler = function (e) {
        labelElement(e.target);
        const data = {
          tagName: e.target.tagName,
          dataZenId: e.target.getAttribute("data-zenid"),
          id: e.target.id || null,
          classes: e.target.className || null,
          button: e.button
        };
        trackInternal("click", data);
      };
      document.addEventListener("click", clickHandler);
      _eventListeners.push({ target: document, event: "click", handler: clickHandler });
  
      // Page unload event handler: log unload and flush events.
      const unloadHandler = function () {
        trackInternal("pageUnload");
        flushEventBatch();
      };
      window.addEventListener("beforeunload", unloadHandler, { capture: true });
      _eventListeners.push({
        target: window,
        event: "beforeunload",
        handler: unloadHandler,
        options: { capture: true }
      });
    }
  
    /**
     * Initialize USERQUERY with the provided configuration.
     *
     * Options can include:
     *   - siteId: A unique identifier for the site.
     *   - batchInterval: Interval (in ms) to flush event batches via POST.
     *
     * Note: Elements are labeled on demand when clicked.
     */
    USERQUERY.init = function (config = {}) {
      if (_initialized) {
        console.warn("[USERQUERY] Already initialized.");
        return;
      }
      _initialized = true;
      _config = Object.assign({}, DEFAULT_CONFIG, config);
      _siteId = _config.siteId;
      _userId = getOrCreateUserId();
  
      console.log(`[USERQUERY] Initializing with siteId="${_siteId}", userId="${_userId}"`);
  
      // Attach core event listeners.
      attachCoreEventListeners();
  
      // Track page load event.
      trackInternal("pageLoad", {
        title: document.title,
        referrer: document.referrer
      });
  
      // Set up a periodic flush of the event batch.
      _batchTimer = setInterval(flushEventBatch, _config.batchInterval);
    };
  
    /**
     * Stop USERQUERY by removing event listeners and flushing any pending events.
     */
    USERQUERY.stop = function () {
      if (!_initialized) {
        console.warn("[USERQUERY] Not initialized or already stopped.");
        return;
      }
      _initialized = false;
      console.log("[USERQUERY] Stopping. Removing event listeners...");
  
      // Remove all attached event listeners.
      _eventListeners.forEach(({ target, event, handler, options }) => {
        target.removeEventListener(event, handler, options || false);
      });
      _eventListeners = [];
  
      // Flush any pending events.
      flushEventBatch();
  
      // Clear the batch timer.
      if (_batchTimer) {
        clearInterval(_batchTimer);
        _batchTimer = null;
      }
    };
  
    /**
     * Log a custom event with a given name and data payload.
     */
    USERQUERY.trackCustom = function (eventName, data = {}) {
      if (!_initialized) {
        console.warn("[USERQUERY] Not initialized. Cannot track custom events.");
        return;
      }
      trackInternal(eventName, data);
    };
  
    // Expose USERQUERY globally.
    global.USERQUERY = USERQUERY;
  })(window);