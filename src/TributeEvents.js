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
    element.boundKeyUp = this.keyup.bind(element, this);
    element.boundInput = this.input.bind(element, this);

    element.addEventListener("keydown", element.boundKeyDown, true);
    element.addEventListener("keyup", element.boundKeyUp, true);
    element.addEventListener("input", element.boundInput, true);
  }

  unbind(element) {
    element.removeEventListener("keydown", element.boundKeyDown, true);
    element.removeEventListener("keyup", element.boundKeyUp, true);
    element.removeEventListener("input", element.boundInput, true);

    delete element.boundKeyDown;
    delete element.boundKeyUp;
    delete element.boundInput;
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
      event.stopPropagation();
      while (li.nodeName.toLowerCase() !== "li") {
        li = li.parentNode;
        if (!li || li === tribute.menu) {
          throw new Error("cannot find the <li> container for the click");
        }
      }

      tribute.selectItemAtIndex(li.getAttribute("data-index"), event);
      // TODO: should fire with externalTrigger and target is outside of menu
    } else if (tribute.current.element && !tribute.current.externalTrigger) {
      tribute.current.externalTrigger = false;
      tribute.hideMenu();
    }
  }

  keyup(instance, event) {
    if (!instance.updateSelection(this)) return;
    const keyCode = instance.getKeyCode(instance, this, event);
    // Check for modifiers keys
    if (event instanceof KeyboardEvent) {
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

    if (!instance.tribute.allowSpaces && instance.tribute.hasTrailingSpace) {
      instance.tribute.hasTrailingSpace = false;
      instance.callbacks().Space(event, this);
      return;
    }

    // Get and validate trigger char
    if (keyCode && !isNaN(keyCode)) {
      if (
        instance.tribute.autocompleteMode &&
        String.fromCharCode(keyCode).match(/(\w|\s)/g)
      ) {
        instance.tribute.current.trigger = "";
      } else {
        instance.tribute.current.trigger = instance.tribute
          .triggers()
          .find((trigger) => {
            return trigger.charCodeAt(0) === keyCode;
          });
      }
    } else if (
      instance.tribute.autocompleteMode &&
      event instanceof InputEvent
    ) {
      instance.tribute.current.trigger = "";
    }
    if (
      !(
        instance.tribute.current.trigger ||
        (instance.tribute.current.trigger === "" &&
          instance.tribute.autocompleteMode)
      )
    )
      return;

    // Get and validate collection
    instance.tribute.current.collection = instance.tribute.collection.find(
      (item) => {
        return item.trigger === instance.tribute.current.trigger;
      }
    );
    if (
      !instance.tribute.current.collection ||
      instance.tribute.current.collection.menuShowMinLength >
        instance.tribute.current.mentionText.length
    ) {
      return;
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

  getKeyCode(instance, el, event) {
    const tribute = instance.tribute;
    const info = tribute.range.getTriggerInfo(
      false,
      tribute.hasTrailingSpace,
      true,
      tribute.allowSpaces,
      tribute.autocompleteMode
    );

    if (event.keyCode || event.which || event.code) {
      return event.keyCode || event.which || event.code;
    } else if (info) {
      if (info.mentionTriggerChar) return info.mentionTriggerChar.charCodeAt(0);
      else return info.mentionText.charCodeAt(info.mentionText.length - 1);
    } else {
      return NaN;
    }
  }

  updateSelection(el) {
    let success = false;
    this.tribute.current.element = el;
    const info = this.tribute.range.getTriggerInfo(
      false,
      this.tribute.hasTrailingSpace,
      true,
      this.tribute.allowSpaces,
      this.tribute.autocompleteMode
    );

    if (info) {
      this.tribute.current.selectedPath = info.mentionSelectedPath;
      this.tribute.current.mentionText = info.mentionText;
      this.tribute.current.fullText = info.fullText;
      this.tribute.current.selectedOffset = info.mentionSelectedOffset;
      this.tribute.current.info = info;
      success = true;
    } else {
      this.tribute.current = {};
    }
    return success;
  }

  callbacks() {
    return {
      Enter: (e, _el) => {
        // choose selection
        if (this.tribute.isActive && this.tribute.current.filteredItems) {
          e.preventDefault();
          e.stopPropagation();
          this.tribute.selectItemAtIndex(this.tribute.menuSelected, e);
        }
      },
      Escape: (e, _el) => {
        if (this.tribute.isActive) {
          e.preventDefault();
          e.stopPropagation();
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
            e.stopPropagation();
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
          e.stopPropagation();
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
          e.stopPropagation();
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
