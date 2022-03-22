/*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
class TributeEvents {
  constructor(tribute) {
    this.tribute = tribute;
    this.tribute.events = this;
  }

  static keys() {
    return ["Tab", "Enter", "Escape", "ArrowUp", "ArrowDown", "Backspace"];
  }

  static modifiers() {
    return [
      "CapsLock",
      "Control",
      "Fn",
      "Hyper",
      "Meta",
      "OS",
      "Super",
      "Symbol",
      "Win",
    ];
  }

  bind(element) {
    const KEY_EVENT_TIMEOUT_MS = 32;
    element.boundKeyDown = this.tribute.debounce(
      this.keydown.bind(element, this),
      KEY_EVENT_TIMEOUT_MS
    );
    element.boundKeyUpInput = this.tribute.debounce(
      this.input.bind(element, this),
      KEY_EVENT_TIMEOUT_MS
    );

    element.addEventListener("keydown", element.boundKeyDown, true);
    element.addEventListener("keyup", element.boundKeyUpInput, true);
    element.addEventListener("input", element.boundKeyUpInput, true);
  }

  unbind(element) {
    element.removeEventListener("keydown", element.boundKeyDown, true);
    element.removeEventListener("keyup", element.boundKeyUpInput, true);
    element.removeEventListener("input", element.boundKeyUpInput, true);

    delete element.boundKeyDown;
    delete element.boundKeyUpInput;
  }

  keydown(instance, event) {
    let controlKeyPressed = false;
    let keyProcessed = false;

    if (event instanceof KeyboardEvent) {
      TributeEvents.modifiers().forEach((o) => {
        if (event.getModifierState(o)) {
          controlKeyPressed = true;
          return;
        }
      });
    }

    if (!controlKeyPressed) {
      TributeEvents.keys().forEach((key) => {
        if (
          key === event.code &&
          // Special handling of Backspace
          (instance.tribute.isActive || event.code == "Backspace")) {
            instance.callbacks()[key](event, this);
            keyProcessed = true;
            return;
        }
      });
    }

    if (!keyProcessed) {
      instance.tribute.lastReplacement = null;
      instance.tribute.hideMenu();
    }
  }

  input(instance, event) {
    const cEvent = event instanceof CustomEvent;
    const iEvent = event instanceof InputEvent;
    const iEventHandle = iEvent && (event.inputType == "insertText"
      || event.inputType == "insertCompositionText"
      || event.inputType.startsWith("deleteContent"));

    if (cEvent) {
      return;
    }
    if (iEvent && !iEventHandle) {
      return;
    }
    
    instance.keyup.call(this, instance, event);
  }

  click(instance, event) {
    const tribute = instance.tribute;
    if (tribute.menu && tribute.menu.contains(event.target)) {
      let li = event.target;
      event.preventDefault();
      event.stopImmediatePropagation();
      while (li.nodeName.toLowerCase() !== "li") {
        li = li.parentNode;
        if (!li || li === tribute.menu) {
          throw new Error("cannot find the <li> container for the click");
        }
      }

      tribute.selectItemAtIndex(li.getAttribute("data-index"), event);
    } else {
      tribute.hideMenu();
    }
  }

  keyup(instance, event) {
    // Check for modifiers keys
    if (event instanceof KeyboardEvent) {
      if (event.key && event.key.length > 1) {
        // Not a Character exit early
        return;
      }

      let controlKeyPressed = false;
      TributeEvents.modifiers().forEach((o) => {
        if (event.getModifierState(o)) {
          controlKeyPressed = true;
          return;
        }
      });
      // Check for control keys
      TributeEvents.keys().forEach((key) => {
        if (key === event.code) {
          controlKeyPressed = true;
          return;
        }
      });
      if (controlKeyPressed) return;
    }

    if (!instance.updateSelection(this)) return;

    const keyCode = instance.getKeyCode(event);
    // Exit if no keyCode
    if (isNaN(keyCode)) {
      return;
    }

    if (!instance.tribute.autocompleteMode) {
      const trigger = instance.tribute.triggers().find((trigger) => {
        return trigger.charCodeAt(0) === keyCode;
      });
      if (!trigger) return;
      const collection = instance.tribute.collection.find((item) => {
        return item.trigger === trigger;
      });
      if (!collection) return;
      if (
        collection.menuShowMinLength >
        instance.tribute.current.mentionText.length
      )
        return;
      instance.tribute.current.collection = collection;
    } else {
      instance.tribute.current.collection = instance.tribute.collection[0];
    }

    instance.tribute.showMenuFor(this, true);
  }

  getKeyCode(event) {
    const keyCode = event.keyCode || event.which || event.code;
    if (keyCode) {
      return keyCode;
    } else {
      if (this.tribute.current.mentionTriggerChar)
        return this.tribute.current.mentionTriggerChar.charCodeAt(0);
      else if (this.tribute.current.mentionText)
        return this.tribute.current.mentionText.charCodeAt(
          this.tribute.current.mentionText.length - 1
        );
    }
    return NaN;
  }

  updateSelection(el) {
    this.tribute.current.element = el;
    const info = this.tribute.range.getTriggerInfo(
      this.tribute.allowSpaces,
      this.tribute.autocompleteMode
    );

    if (info) {
      this.tribute.current.mentionTriggerChar = info.mentionTriggerChar;
      this.tribute.current.mentionText = info.mentionText;
      this.tribute.current.mentionPosition = info.mentionPosition;
      this.tribute.current.fullText = info.fullText;
      this.tribute.current.nextChar = info.nextChar;
      return true;
    }

    return false;
  }

  callbacks() {
    return {
      Backspace: (e, _el) => {
        if (this.tribute.lastReplacement) {
          e.preventDefault();
          e.stopImmediatePropagation();

          this.tribute.current = {...this.tribute.lastReplacement};
          this.tribute.current.mentionText =this.tribute.lastReplacement.content;
          this.tribute.replaceText(this.tribute.lastReplacement.mentionText, e, null);
          this.tribute.lastReplacement = null;
          this.tribute.current = {};
        }
        this.tribute.hideMenu();
      },
      Enter: (e, _el) => {
        // choose selection
        if (this.tribute.isActive && this.tribute.current.filteredItems) {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.tribute.selectItemAtIndex(this.tribute.menuSelected, e);
        }
      },
      Escape: (e, _el) => {
        if (this.tribute.isActive) {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.tribute.hideMenu();
        }
      },
      Tab: (e, el) => {
        // choose first match
        this.callbacks().Enter(e, el);
      },
      Space: (e, el) => {
        if (this.tribute.isActive) {
          if (this.tribute.spaceSelectsMatch) {
            this.callbacks().Enter(e, el);
          } else {
            this.tribute.hideMenu();
          }
        }
      },
      ArrowUp: (e, _el) => {
        // navigate up ul
        if (this.tribute.isActive && this.tribute.current.filteredItems) {
          e.preventDefault();
          e.stopImmediatePropagation();
          const count = this.tribute.current.filteredItems.length,
            selected = this.tribute.menuSelected;

          if (count > selected && selected > 0) {
            this.setActiveLi(selected - 1);
          } else if (selected === 0) {
            this.setActiveLi(count - 1);
            this.tribute.menu.scrollTop = this.tribute.menu.scrollHeight;
          }
        }
      },
      ArrowDown: (e, _el) => {
        // navigate down ul
        if (this.tribute.isActive && this.tribute.current.filteredItems) {
          e.preventDefault();
          e.stopImmediatePropagation();
          const count = this.tribute.current.filteredItems.length - 1,
            selected = this.tribute.menuSelected;

          if (count > selected) {
            this.setActiveLi(selected + 1);
          } else if (count === selected) {
            this.setActiveLi(0);
            this.tribute.menu.scrollTop = 0;
          }
        }
      },
    };
  }

  setActiveLi(index) {
    const lis = this.tribute.menu.querySelectorAll("li"),
      length = lis.length >>> 0;

    this.tribute.menuSelected = index;

    for (let i = 0; i < length; i++) {
      const li = lis[i];
      if (i === this.tribute.menuSelected) {
        li.classList.add(this.tribute.current.collection.selectClass);

        const liClientRect = li.getBoundingClientRect();
        const menuClientRect = this.tribute.menu.getBoundingClientRect();

        if (liClientRect.bottom > menuClientRect.bottom) {
          const scrollDistance = liClientRect.bottom - menuClientRect.bottom;
          this.tribute.menu.scrollTop += scrollDistance;
        } else if (liClientRect.top < menuClientRect.top) {
          const scrollDistance = menuClientRect.top - liClientRect.top;
          this.tribute.menu.scrollTop -= scrollDistance;
        }
      } else {
        li.classList.remove(this.tribute.current.collection.selectClass);
      }
    }
  }
}

export default TributeEvents;
