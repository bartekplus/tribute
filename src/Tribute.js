import "./utils";
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
    autocompleteSeparator = null,
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
    menuItemLimit = null,
    menuShowMinLength = 0,
    keys = null,
    useHTML = true,
    numberOfWordsInContextText = 5,
  }) {
    this.autocompleteMode = autocompleteMode;
    this.autocompleteSeparator = autocompleteSeparator;
    this.menuSelected = 0;
    this.current = {};
    this.isActive = false;
    this.activationPending = false;
    this.menuContainer = menuContainer;
    this.allowSpaces = allowSpaces;
    this.replaceTextSuffix = replaceTextSuffix;
    this.positionMenu = positionMenu;
    this.hasTrailingSpace = false;
    this.spaceSelectsMatch = spaceSelectsMatch;
    this.useHTML = useHTML;
    this.numberOfWordsInContextText = numberOfWordsInContextText;
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
      if (this.current.element) {
        const noMatchEvent = new CustomEvent(`tribute-active-${val}`);
        this.current.element.dispatchEvent(noMatchEvent);
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
    // Only proceed if menu isn't already shown for the current element & mentionText
    if (
      this.isActive &&
      this.current.element === element &&
      this.current.mentionText === this.currentMentionTextSnapshot
    ) {
      return;
    }
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

    const processValues = (values, forceReplace) => {
      // Tribute may not be active any more by the time the value callback returns
      if (!this.activationPending) {
        return;
      }
      this.activationPending = false;
      // Element is no longer in focus - don't show menu
      if (document.activeElement !== this.current.element) {
        return;
      }

      if (forceReplace) {
        // Do force replace - don't show menu
        this.current.mentionPosition -= forceReplace.length;
        this.current.mentionText =
          " ".repeat(forceReplace.length) + this.current.mentionText;
        this.replaceText(forceReplace.text, null, null);
        return;
      }

      let items = this.search.filter(this.current.mentionText, values, {
        pre: this.current.collection.searchOpts.pre || "<span>",
        post: this.current.collection.searchOpts.post || "</span>",
        skip: this.current.collection.searchOpts.skip,
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

      if (this.current.collection.menuItemLimit) {
        items = items.slice(0, this.current.collection.menuItemLimit);
      }

      this.current.filteredItems = items;

      const ul = this.menu.querySelector("ul");
      let showMenu = false;

      if (!items.length) {
        const noMatchEvent = new CustomEvent("tribute-no-match", {
          detail: this.menu,
        });
        this.current.element.dispatchEvent(noMatchEvent);
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
      } else {
        ul.innerHTML = "";
        const fragment = this.range.getDocument().createDocumentFragment();

        items.forEach((item, index) => {
          const li = this.range.getDocument().createElement("li");
          li.setAttribute("data-index", index);
          li.className = this.current.collection.itemClass;
          li.addEventListener("mousemove", (e) => {
            const [, index] = this._findLiTarget(e.target);
            if (e.movementY !== 0) {
              this.events.setActiveLi(index);
            }
          });
          if (this.menuSelected === index) {
            li.classList.add(this.current.collection.selectClass);
          }
          li.innerHTML = this.current.collection.menuItemTemplate(item);
          fragment.appendChild(li);
        });
        ul.appendChild(fragment);
        showMenu = true;
      }
      if (showMenu) {
        this.isActive = true;
        this.range.positionMenuAtCaret(scrollTo);
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
        this.current.fullText
      );
    } else {
      processValues(this.current.collection.values);
    }
  }

  _findLiTarget(el) {
    if (!el) return [];
    const index = el.getAttribute("data-index");
    return !index ? this._findLiTarget(el.parentNode) : [el, index];
  }

  showMenuForCollection(element, collectionIndex) {
    if (!this.events.updateSelection(element)) return;
    if (element !== document.activeElement) {
      this.placeCaretAtEnd(element);
      if (element.isContentEditable)
        this.insertTextAtCursor(this.current.collection.trigger);
      else this.insertAtCaret(element, this.current.collection.trigger);
    }

    this.current.collection = this.collection[collectionIndex || 0];
    this.current.element = element;

    this.showMenuFor(element);
  }

  // TODO: make sure this works for inputs/textareas
  placeCaretAtEnd(el) {
    el.focus();
    if (
      typeof window.getSelection !== "undefined" &&
      typeof document.createRange !== "undefined"
    ) {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } else if (typeof document.body.createTextRange !== "undefined") {
      const textRange = document.body.createTextRange();
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
    const textNode = document.createTextNode(text);
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
}

export default Tribute;
