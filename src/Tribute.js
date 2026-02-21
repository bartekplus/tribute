import TributeEvents from "./TributeEvents";
import TributeMenuEvents from "./TributeMenuEvents";
import TributeRange from "./TributeRange";
import TributeSearch from "./TributeSearch";

class Tribute {
  constructor({
    values = null,
    loadingItemTemplate = null,
    iframe = null,
    selectClass = "highlight",
    containerClass = "tribute-container",
    itemClass = "",
    trigger = "@",
    autocompleteMode = false,
    autocompleteSeparator = RegExp(/\s+/),
    selectTemplate = null,
    menuItemTemplate = null,
    lookup = "key",
    fillAttr = "value",
    collection = null,
    menuContainer = null,
    noMatchTemplate = null,
    requireLeadingSpace = true,
    allowSpaces = false,
    replaceTextSuffix = null,
    positionMenu = true,
    spaceSelectsMatch = false,
    searchOpts = {},
    menuItemLimit = undefined,
    menuShowMinLength = 0,
    keys = null,
    numberOfWordsInContextText = 5,
    supportRevert = false,
    selectByDigit = false,
    inline = false,
  }) {
    this.autocompleteMode = autocompleteMode;
    this.autocompleteSeparator = autocompleteSeparator;
    this.menuSelected = 0;
    this.current = {};
    this.lastReplacement = null;
    this.isActive = false;
    this.activationPending = false;
    this.menuContainer = menuContainer;
    this.allowSpaces = allowSpaces;
    this.replaceTextSuffix = replaceTextSuffix;
    this.positionMenu = positionMenu;
    this.spaceSelectsMatch = spaceSelectsMatch;
    this.numberOfWordsInContextText = numberOfWordsInContextText;
    this.supportRevert = supportRevert;
    this.selectByDigit = selectByDigit;
    this.inline = inline;
    if (keys) {
      TributeEvents.keys = keys;
    }

    if (this.autocompleteMode) {
      trigger = "";
      allowSpaces = false;
    }

    if (values) {
      this.collection = [
        {
          // symbol that starts the lookup
          trigger: trigger,

          // is it wrapped in an iframe
          iframe: iframe,

          // class applied to selected item
          selectClass: selectClass,

          // class applied to the Container
          containerClass: containerClass,

          // class applied to each item
          itemClass: itemClass,

          // function called on select that retuns the content to insert
          selectTemplate: (
            selectTemplate || Tribute.defaultSelectTemplate
          ).bind(this),

          // function called that returns content for an item
          menuItemTemplate: (
            menuItemTemplate || Tribute.defaultMenuItemTemplate
          ).bind(this),

          // function called when menu is empty, disables hiding of menu.
          noMatchTemplate: ((t) => {
            if (typeof t === "string") {
              if (t.trim() === "") return null;
              return t;
            }
            if (typeof t === "function") {
              return t.bind(this);
            }

            return (
              noMatchTemplate ||
              function () {
                return "<li>No Match Found!</li>";
              }
            );
          })(noMatchTemplate),

          // column to search against in the object
          lookup: lookup,

          // column that contains the content to insert by default
          fillAttr: fillAttr,

          // array of objects or a function returning an array of objects
          values: values,

          // useful for when values is an async function
          loadingItemTemplate: loadingItemTemplate,

          requireLeadingSpace: requireLeadingSpace,

          searchOpts: searchOpts,

          menuItemLimit: menuItemLimit,

          menuShowMinLength: menuShowMinLength,
          inline: inline,
        },
      ];
    } else if (collection) {
      if (this.autocompleteMode)
        console.warn(
          "Tribute in autocomplete mode does not work for collections"
        );
      this.collection = collection.map((item) => {
        return {
          trigger: item.trigger || trigger,
          iframe: item.iframe || iframe,
          selectClass: item.selectClass || selectClass,
          containerClass: item.containerClass || containerClass,
          itemClass: item.itemClass || itemClass,
          selectTemplate: (
            item.selectTemplate || Tribute.defaultSelectTemplate
          ).bind(this),
          menuItemTemplate: (
            item.menuItemTemplate || Tribute.defaultMenuItemTemplate
          ).bind(this),
          // function called when menu is empty, disables hiding of menu.
          noMatchTemplate: ((t) => {
            if (typeof t === "string") {
              if (t.trim() === "") return null;
              return t;
            }
            if (typeof t === "function") {
              return t.bind(this);
            }

            return (
              noMatchTemplate ||
              function () {
                return "<li>No Match Found!</li>";
              }
            );
          })(noMatchTemplate),
          lookup: item.lookup || lookup,
          fillAttr: item.fillAttr || fillAttr,
          values: item.values,
          loadingItemTemplate: item.loadingItemTemplate,
          requireLeadingSpace: item.requireLeadingSpace,
          searchOpts: item.searchOpts || searchOpts,
          menuItemLimit: item.menuItemLimit || menuItemLimit,
          menuShowMinLength: item.menuShowMinLength || menuShowMinLength,
          inline: item.inline !== undefined ? item.inline : inline,
        };
      });
    } else {
      throw new Error("[Tribute] No collection specified.");
    }

    new TributeRange(this);
    new TributeEvents(this);
    new TributeMenuEvents(this);
    new TributeSearch(this);
  }

  get isActive() {
    return this._isActive;
  }

  set isActive(val) {
    if (this._isActive !== val) {
      this._isActive = val;
      if (this.current && this.current.element) {
        const activeEvent = new CustomEvent(`tribute-active-${val}`);
        this.current.element.dispatchEvent(activeEvent);
      }
    }
  }

  static defaultSelectTemplate(item) {
    if (typeof item === "undefined")
      return `${this.current.collection.trigger}${this.current.mentionText}`;
    if (this.range.isContentEditable(this.current.element)) {
      return (
        '<span class="tribute-mention">' +
        (this.current.collection.trigger +
          item.original[this.current.collection.fillAttr]) +
        "</span>"
      );
    }

    return (
      this.current.collection.trigger +
      item.original[this.current.collection.fillAttr]
    );
  }

  static defaultMenuItemTemplate(matchItem) {
    return matchItem.string;
  }

  static inputTypes() {
    return ["TEXTAREA", "INPUT"];
  }

  triggers() {
    return this.collection.map((config) => {
      return config.trigger;
    });
  }

  attach(el) {
    if (!el) {
      throw new Error("[Tribute] Must pass in a DOM node or NodeList.");
    }

    /* global jQuery */
    // Check if it is a jQuery collection
    if (typeof jQuery !== "undefined" && el instanceof jQuery) {
      el = el.get();
    }

    // Is el an Array/Array-like object?
    if (
      el.constructor === NodeList ||
      el.constructor === HTMLCollection ||
      el.constructor === Array
    ) {
      const length = el.length;
      for (let i = 0; i < length; ++i) {
        this._attach(el[i]);
      }
    } else {
      this._attach(el);
    }
  }

  _attach(el) {
    if (el.hasAttribute("data-tribute")) {
      console.warn("Tribute was already bound to " + el.nodeName);
    }

    this.ensureEditable(el);
    this.events.bind(el);
    el.setAttribute("data-tribute", true);
  }

  ensureEditable(element) {
    if (Tribute.inputTypes().indexOf(element.nodeName) === -1) {
      if (element.contentEditable) {
        element.contentEditable = true;
      } else {
        throw new Error("[Tribute] Cannot bind to " + element.nodeName);
      }
    }
  }

  createMenu(containerClass, element) {
    const properties = [
      "fontStyle",
      "fontVariant",
      "fontWeight",
      "fontStretch",
      "fontSizeAdjust",
      "fontFamily",
    ];
    const computed = window.getComputedStyle
      ? getComputedStyle(element)
      : element.currentStyle;
    const wrapper = this.range.getDocument().createElement("div"),
      ul = this.range.getDocument().createElement("ul");
    wrapper.className = containerClass;
    wrapper.setAttribute("tabindex", "0");
    wrapper.appendChild(ul);
    wrapper.style.fontSize =
      Math.round(parseInt(computed.fontSize) * 0.9) + "px";
    wrapper.style.display = "none";

    properties.forEach((prop) => {
      wrapper.style[prop] = computed[prop];
    });

    if (this.menuContainer) {
      return this.menuContainer.appendChild(wrapper);
    }

    return this.range.getDocument().body.appendChild(wrapper);
  }

  showMenuFor(element, scrollTo) {
    if (
      this.isActive &&
      this.current.element === element &&
      this.current.mentionText === this.currentMentionTextSnapshot
    ) {
      return;
    }
    this.current.element = element;
    this.currentMentionTextSnapshot = this.current.mentionText;

    // create the menu if it doesn't exist.
    if (!this.menu) {
      this.menu = this.createMenu(
        this.current.collection.containerClass,
        element
      );
      element.tributeMenu = this.menu;
      this.menuEvents.bind(this.menu);
    }

    this.activationPending = true;
    this.menuSelected = 0;

    if (!this.current.mentionText) {
      this.current.mentionText = "";
    }

    const processValues = (values, forceReplace, header = null) => {
      // Tribute may not be active any more by the time the value callback returns
      if (!this.activationPending) {
        return;
      }
      this.activationPending = false;
      // Element is no longer in focus - don't show menu
      if (this.range.getDocument().activeElement !== this.current.element) {
        return;
      }

      if (forceReplace) {
        // Do force replace - don't show menu
        this.current.mentionPosition -= forceReplace.length;
        this.current.mentionText = this.current.fullText.slice(-forceReplace.length);
        this.replaceText(forceReplace.text, null, null);
        return;
      }

      let items = this.search.filter(this.current.mentionText, values, {
        pre: this.current.collection.searchOpts.pre || "<span>",
        post: this.current.collection.searchOpts.post || "</span>",
        skip: this.current.collection.searchOpts.skip || false,
        caseSensitive:
          this.current.collection.searchOpts.caseSensitive || false,
        extract: (el) => {
          if (typeof this.current.collection.lookup === "string") {
            return el[this.current.collection.lookup];
          } else if (typeof this.current.collection.lookup === "function") {
            return this.current.collection.lookup(el, this.current.mentionText);
          } else {
            throw new Error(
              "Invalid lookup attribute, lookup must be string or function."
            );
          }
        },
      });

      items = items.slice(0, this.current.collection.menuItemLimit);

      this.current.filteredItems = items;

      const inlineConfig = this.current.collection.inline;
      const inlineEnabled = inlineConfig === true;
      let inlineShown = false;

      const ul = this.menu.querySelector("ul");
      let showMenu = false;

      if (!items.length) {
        this.range.hideInlineSuggestion();
        this.current.inlineSuggestionItem = null;
        this.current.inlineSuggestionText = null;
        const noMatchEvent = new CustomEvent("tribute-no-match", {
          detail: this.menu,
        });
        this.current.element.dispatchEvent(noMatchEvent);
        if (inlineEnabled) {
          showMenu = false;
        } else {
          if (
            (typeof this.current.collection.noMatchTemplate === "function" &&
              !this.current.collection.noMatchTemplate()) ||
            !this.current.collection.noMatchTemplate
          ) {
            showMenu = false;
          } else {
            typeof this.current.collection.noMatchTemplate === "function"
              ? (ul.innerHTML = this.current.collection.noMatchTemplate())
              : (ul.innerHTML = this.current.collection.noMatchTemplate);
            showMenu = true;
          }
        }
      } else {
        if (inlineEnabled) {
          this.range.hideInlineSuggestion();
          if (this.current.element) {
            this.events.updateSelection(this.current.element);
          }
          let mentionTextForMatch = this.current.mentionText || "";
          const triggerForMatch =
            this.current.mentionTriggerChar ||
            (this.current.collection && this.current.collection.trigger) ||
            "";
          if (this.current.element) {
            let fullTextForMatch = null;
            if (!this.range.isContentEditable(this.current.element)) {
              const elementValue = this.current.element.value || "";
              const selectionStart = this.current.element.selectionStart;
              fullTextForMatch =
                typeof selectionStart === "number"
                  ? elementValue.substring(0, selectionStart)
                  : elementValue;
            } else {
              const selection = this.range.getContentEditableSelectionStart(false);
              if (selection && selection.range) {
                const preRange = selection.range.cloneRange();
                preRange.selectNodeContents(this.current.element);
                preRange.setEnd(
                  selection.range.startContainer,
                  selection.range.startOffset
                );
                fullTextForMatch = preRange.toString();
              } else {
                fullTextForMatch =
                  this.current.element.textContent ||
                  this.current.fullText ||
                  "";
              }
            }
            let matchedTrigger = triggerForMatch;
            let start =
              matchedTrigger && fullTextForMatch
                ? fullTextForMatch.lastIndexOf(matchedTrigger)
                : -1;
            if (start < 0) {
              let lastTriggerIndex = -1;
              let lastTrigger = "";
              this.collection.forEach((config) => {
                if (!config.trigger) return;
                const idx =
                  fullTextForMatch && config.trigger
                    ? fullTextForMatch.lastIndexOf(config.trigger)
                    : -1;
                if (idx > lastTriggerIndex) {
                  lastTriggerIndex = idx;
                  lastTrigger = config.trigger;
                }
              });
              if (lastTriggerIndex >= 0) {
                matchedTrigger = lastTrigger;
                start = lastTriggerIndex;
              }
            }
            if (start >= 0 && matchedTrigger) {
              const candidate = fullTextForMatch.substring(
                start + matchedTrigger.length
              );
              if (candidate.length || !mentionTextForMatch) {
                mentionTextForMatch = candidate;
                this.current.mentionPosition = start;
                this.current.mentionTriggerChar = matchedTrigger;
              }
            }
          }
          if (mentionTextForMatch !== this.current.mentionText) {
            this.current.mentionText = mentionTextForMatch;
          }
          const firstMatch = items[0];
          if (firstMatch) {
            let text =
              firstMatch.original[this.current.collection.fillAttr || "value"];
            if (!text) {
              text = this.current.collection.menuItemTemplate(firstMatch);
            }
            if (
              text
                .toLowerCase()
                .startsWith(mentionTextForMatch.toLowerCase())
            ) {
              const suffix = text.substring(mentionTextForMatch.length);
              if (suffix) {
                this.range.showInlineSuggestion(suffix);
                inlineShown = true;
                this.current.inlineSuggestionText = text;
                this.current.inlineSuggestionItem = firstMatch;
              } else {
                this.range.hideInlineSuggestion();
              }
            } else {
              this.range.hideInlineSuggestion();
            }
          } else {
            this.range.hideInlineSuggestion();
          }

          if (!inlineShown) {
            this.current.inlineSuggestionItem = null;
            this.current.inlineSuggestionText = null;
          }
          if (this.menu) {
            this.menu.style.display = "none";
          }
          this.isActive = inlineShown;
          return;
        } else {
          this.range.hideInlineSuggestion();
          this.current.inlineSuggestionItem = null;
          this.current.inlineSuggestionText = null;
        }

        const fragment = this.range.getDocument().createDocumentFragment();
        ul.innerHTML = "";
        if (header) {
          const lh = this.range.getDocument().createElement("lh");
          lh.innerHTML = header;
          ul.appendChild(lh)
        }

        items.forEach((item, index) => {
          const li = this.range.getDocument().createElement("li");
          li.setAttribute("data-index", index);
          li.className = this.current.collection.itemClass;
          li.addEventListener(
            "mouseover",
            function (index) {
              this.events.setActiveLi(index);
            }.bind(this, index)
          );

          if (this.menuSelected === index) {
            li.classList.add(this.current.collection.selectClass);
          }
          li.innerHTML = this.current.collection.menuItemTemplate(item);
          if (this.selectByDigit) {
            li.innerHTML = ((index + 1) % 10).toString() + '. ' + li.innerHTML;
          }
          fragment.appendChild(li);
        });
        ul.appendChild(fragment);
        showMenu = true;
      }
      if (showMenu) {
        this.isActive = true;
        this.range.positionMenuAtCaret(scrollTo);
      } else if (this.isActive) {
        this.isActive = false;
        this.hideMenu();
      }
    };

    if (typeof this.current.collection.values === "function") {
      if (this.current.collection.loadingItemTemplate) {
        this.menu.querySelector("ul").innerHTML =
          this.current.collection.loadingItemTemplate;
        this.range.positionMenuAtCaret(scrollTo);
      }

      this.current.collection.values(
        this.current.mentionText,
        processValues,
        this.current.fullText,
        this.current.nextChar
      );
    } else {
      processValues(this.current.collection.values);
    }
  }

  showMenuForCollection(element, collectionIndex) {
    if (!this.events.updateSelection(element)) return;
    if (element !== this.range.getDocument().activeElement) {
      this.placeCaretAtEnd(element);
      if (element.isContentEditable)
        this.insertTextAtCursor(this.current.collection.trigger);
      else this.insertAtCaret(element, this.current.collection.trigger);
    }

    this.current.collection = this.collection[collectionIndex || 0];

    this.showMenuFor(element);
  }

  // TODO: make sure this works for inputs/textareas
  placeCaretAtEnd(el) {
    el.focus();
    if (
      typeof window.getSelection !== "undefined" &&
      typeof this.range.getDocument().createRange !== "undefined"
    ) {
      const range = this.range.getDocument().createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } else if (
      typeof this.range.getDocument().body.createTextRange !== "undefined"
    ) {
      const textRange = this.range.getDocument().body.createTextRange();
      textRange.moveToElementText(el);
      textRange.collapse(false);
      textRange.select();
    }
  }

  // for contenteditable
  insertTextAtCursor(text) {
    const sel = window.getSelection();
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const textNode = this.range.getDocument().createTextNode(text);
    range.insertNode(textNode);
    range.selectNodeContents(textNode);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // for regular inputs
  insertAtCaret(textarea, text) {
    const scrollPos = textarea.scrollTop;
    let caretPos = textarea.selectionStart;

    const front = textarea.value.substring(0, caretPos);
    const back = textarea.value.substring(
      textarea.selectionEnd,
      textarea.value.length
    );
    textarea.value = front + text + back;
    caretPos = caretPos + text.length;
    textarea.selectionStart = caretPos;
    textarea.selectionEnd = caretPos;
    textarea.focus();
    textarea.scrollTop = scrollPos;
  }

  hideMenu() {
    if (this.menu) {
      this.menu.remove();
      this.menu = null;
    }
    this.range.hideInlineSuggestion();
    this.isActive = false;
    this.activationPending = false;
    this.current = {};
  }

  selectItemAtIndex(index, originalEvent) {
    index = parseInt(index);
    if (!(typeof index !== "number" || isNaN(index) || !originalEvent.target)) {
      const item = this.current.filteredItems[index];
      const content = this.current.collection.selectTemplate(item);
      if (content !== null) this.replaceText(content, originalEvent, item);
    }
    this.hideMenu();
  }

  replaceText(content, originalEvent, item) {
    if (this.supportRevert) {
      this.lastReplacement = { ...this.current };
      this.lastReplacement.content = content;
    }

    this.range.replaceTriggerText(content, originalEvent, item);
  }

  _append(collection, newValues, replace) {
    if (typeof collection.values === "function") {
      throw new Error("Unable to append to values, as it is a function.");
    } else if (!replace) {
      collection.values = collection.values.concat(newValues);
    } else {
      collection.values = newValues;
    }
  }

  append(collectionIndex, newValues, replace) {
    const index = parseInt(collectionIndex);
    if (typeof index !== "number")
      throw new Error("please provide an index for the collection to update.");

    const collection = this.collection[index];

    this._append(collection, newValues, replace);
  }

  appendCurrent(newValues, replace) {
    if (this.isActive) {
      this._append(this.current.collection, newValues, replace);
    } else {
      throw new Error(
        "No active state. Please use append instead and pass an index."
      );
    }
  }

  detach(el) {
    if (!el) {
      throw new Error("[Tribute] Must pass in a DOM node or NodeList.");
    }

    // Check if it is a jQuery collection
    if (typeof jQuery !== "undefined" && el instanceof jQuery) {
      el = el.get();
    }

    // Is el an Array/Array-like object?
    if (
      el.constructor === NodeList ||
      el.constructor === HTMLCollection ||
      el.constructor === Array
    ) {
      const length = el.length;
      for (let i = 0; i < length; ++i) {
        this._detach(el[i]);
      }
    } else {
      this._detach(el);
    }
  }

  _detach(el) {
    this.events.unbind(el);
    if (el.tributeMenu) {
      this.menuEvents.unbind(el.tributeMenu);
    }

    setTimeout(() => {
      el.removeAttribute("data-tribute");
      this.isActive = false;
      if (el.tributeMenu) {
        el.tributeMenu.remove();
      }
    });
  }

  debounce(func, wait, option = { leading: true, trailing: true }) {
    let timer = null;
    return (...args) => {
      const timerExpired = (callFunc) => {
        timer = null;
        if (callFunc) func.apply(this, args);
      };
      const callNow = option.leading && timer === null;
      const timeoutFn = timerExpired.bind(this, !callNow && option.trailing);
      clearTimeout(timer);
      timer = setTimeout(timeoutFn, wait);
      if (callNow) func.apply(this, args);
    };
  }
}

export default Tribute;
