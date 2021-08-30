/*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
class TributeEvents {
  constructor(tribute) {
    this.tribute = tribute;
    this.tribute.events = this;
  }

  static keys() {
    return ["Tab", "Enter", "Escape", "ArrowUp", "ArrowDown"];
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
    element.boundKeyDown = this.keydown.bind(element, this);
    element.boundKeyUpInput = this.tribute.debounce(
      this.input.bind(element, this),
      32
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
    if (instance.shouldDeactivate(event)) {
      instance.tribute.hideMenu();
    }
    if (event instanceof KeyboardEvent) {
      let controlKeyPressed = false;
      TributeEvents.modifiers().forEach((o) => {
        if (event.getModifierState(o)) {
          controlKeyPressed = true;
          return;
        }
      });
      if (controlKeyPressed) return;
    }

    if (instance.tribute.isActive) {
      TributeEvents.keys().forEach((key) => {
        if (key === event.code) {
          instance.callbacks()[key](event, this);
        }
      });
    }
  }

  input(instance, event) {
    if (!(event instanceof CustomEvent)) {
      instance.keyup.call(this, instance, event);
    }
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

    if (!instance.tribute.allowSpaces && instance.tribute.hasTrailingSpace) {
      instance.tribute.hasTrailingSpace = false;
      instance.callbacks().Space(event, this);
      return;
    }

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

  shouldDeactivate(event) {
    let controlKeyPressed = false;
    TributeEvents.keys().forEach((key) => {
      if (key === event.code) {
        controlKeyPressed = true;
        return;
      }
    });

    if (controlKeyPressed) return false;
    if (this.tribute.isActive) return true;

    return false;
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
      false,
      this.tribute.hasTrailingSpace,
      true,
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
          } else if (!this.tribute.allowSpaces) {
            e.stopImmediatePropagation();
            setTimeout(() => {
              this.tribute.hideMenu();
            }, 0);
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
            this.tribute.menuSelected--;
            this.setActiveLi();
          } else if (selected === 0) {
            this.tribute.menuSelected = count - 1;
            this.setActiveLi();
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
            this.tribute.menuSelected++;
            this.setActiveLi();
          } else if (count === selected) {
            this.tribute.menuSelected = 0;
            this.setActiveLi();
            this.tribute.menu.scrollTop = 0;
          }
        }
      },
      Delete: (e, el) => {
        if (
          this.tribute.isActive &&
          this.tribute.current.mentionText.length < 1
        ) {
          this.tribute.hideMenu();
        } else if (this.tribute.isActive) {
          this.tribute.showMenuFor(el);
        }
      },
    };
  }

  setActiveLi(index) {
    const lis = this.tribute.menu.querySelectorAll("li"),
      length = lis.length >>> 0;

    if (index) this.tribute.menuSelected = parseInt(index);

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

  getFullHeight(elem, includeMargin) {
    const height = elem.getBoundingClientRect().height;

    if (includeMargin) {
      const style = elem.currentStyle || window.getComputedStyle(elem);
      return (
        height + parseFloat(style.marginTop) + parseFloat(style.marginBottom)
      );
    }

    return height;
  }
}

export default TributeEvents;
