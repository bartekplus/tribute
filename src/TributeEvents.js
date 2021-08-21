class TributeEvents {
  constructor(tribute) {
    this.tribute = tribute;
    this.tribute.events = this;
  }

  static keys() {
    return [
      {
        key: 9,
        value: "TAB"
      },
      {
        key: 13,
        value: "ENTER"
      },
      {
        key: 27,
        value: "ESCAPE"
      },
      {
        key: 38,
        value: "UP"
      },
      {
        key: 40,
        value: "DOWN"
      }
    ];
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
      "Win"
    ];
  }

  bind(element) {
    element.boundKeyDown = this.keydown.bind(element, this);
    element.boundKeyUp = this.keyup.bind(element, this);
    element.boundKeyPress = this.keypress.bind(element, this);
    element.boundInput = this.input.bind(element, this);

    element.addEventListener("keydown", element.boundKeyDown, true);
    element.addEventListener("keyup", element.boundKeyUp, true);
    element.addEventListener("keypress", element.boundKeyPress, true);
    element.addEventListener("input", element.boundInput, true);
  }

  unbind(element) {
    element.removeEventListener("keydown", element.boundKeyDown, true);
    element.removeEventListener("keyup", element.boundKeyUp, true);
    element.removeEventListener("keypress", element.boundKeyPress, true);
    element.removeEventListener("input", element.boundInput, true);

    delete element.boundKeyDown;
    delete element.boundKeyUp;
    delete element.boundKeyPress;
    delete element.boundInput;
  }

  keydown(instance, event) {
    if (instance.shouldDeactivate(event)) {
      instance.tribute.hideMenu();
    }
    if (event instanceof KeyboardEvent) {
      TributeEvents.modifiers().forEach(o => {
        if (event.getModifierState(o)) {
          return;
        }
      });
    }

    if (instance.tribute.isActive)
    {
      TributeEvents.keys().forEach(o => {
        if (o.key === event.keyCode) {
          instance.callbacks()[o.value.toLowerCase()](event, this);
        }
      });
    }
  }

  input(instance, event) {
    if (event instanceof InputEvent) instance.keyup.call(this, instance, event);
  }

  click(instance, event) {
    let tribute = instance.tribute;
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
      tribute.hideMenu();

      // TODO: should fire with externalTrigger and target is outside of menu
    } else if (tribute.current.element && !tribute.current.externalTrigger) {
      tribute.current.externalTrigger = false;
      tribute.hideMenu();
    }
  }

  keypress(  instance, event) {
    instance.keyup.call(this, instance, event);
  }
  
  keyup(instance, event) {    
    // Check for modifiers keys
    if (event instanceof KeyboardEvent) {
      TributeEvents.modifiers().forEach(o => {
        if (event.getModifierState(o)) {
          return;
        }
      });
    }
    // Check for control keys
    TributeEvents.keys().forEach(o => {
      if (o.key === event.keyCode) {
        return;
      }
    });

    if (!instance.tribute.allowSpaces && instance.tribute.hasTrailingSpace) {
      instance.tribute.hasTrailingSpace = false;
      instance.callbacks()["space"](event, this);
      return;
    }

    if (!instance.updateSelection(this)) return;

    // Get and validate trigger char
    const keyCode = instance.getKeyCode(instance, this, event);
    if (keyCode && !isNaN(keyCode)) {
      if (instance.tribute.autocompleteMode && String.fromCharCode(keyCode).match(/(\w|\s)/g)) {
        instance.tribute.current.trigger = ""
      }
      else {
        instance.tribute.current.trigger = instance.tribute.triggers().find(trigger => {
          return trigger.charCodeAt(0) === keyCode;
        });
      }
    } else if (instance.tribute.autocompleteMode && event instanceof InputEvent) {
      instance.tribute.current.trigger = "";
    }
    if (!(
      instance.tribute.current.trigger ||
      (instance.tribute.current.trigger === "" && instance.tribute.autocompleteMode))
    ) return;

    // Get and validate collection
    instance.tribute.current.collection = instance.tribute.collection.find(item => {
      return item.trigger === instance.tribute.current.trigger;
    });
    if (!instance.tribute.current.collection ||
      instance.tribute.current.collection.menuShowMinLength >
      instance.tribute.current.mentionText.length
    ) {
      return;
    }

    instance.tribute.showMenuFor(this, true);
  }

  shouldDeactivate(event) {
    let controlKeyPressed = false;
    TributeEvents.keys().forEach(o => {
      if (event.keyCode === o.key) controlKeyPressed = true;
    });

    if (controlKeyPressed) return false;
    if (this.tribute.isActive) return true;

    return false;
  }

  getKeyCode(instance, el, event) {
    let char;
    let tribute = instance.tribute;
    let info = tribute.range.getTriggerInfo(
      false,
      tribute.hasTrailingSpace,
      true,
      tribute.allowSpaces,
      tribute.autocompleteMode
    );

    if (info && info.mentionTriggerChar) {
      return info.mentionTriggerChar.charCodeAt(0);
    } else if (event instanceof KeyboardEvent){
      return event.keyCode || event.which || event.code;
    }
    return false;
  }

  updateSelection(el) {
    let success = false;
    this.tribute.current.element = el;
    let info = this.tribute.range.getTriggerInfo(
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
    }
    else {
      this.tribute.current = {}
    }
    return success;
  }

  callbacks() {
    return {
      enter: (e, el) => {
        // choose selection
        if (this.tribute.isActive && this.tribute.current.filteredItems) {
          e.preventDefault();
          e.stopPropagation();
          this.tribute.selectItemAtIndex(this.tribute.menuSelected, e);
          this.tribute.hideMenu();
        }
      },
      escape: (e, el) => {
        if (this.tribute.isActive) {
          e.preventDefault();
          e.stopPropagation();
          this.tribute.hideMenu();
        }
      },
      tab: (e, el) => {
        // choose first match
        this.callbacks().enter(e, el);
      },
      space: (e, el) => {
        if (this.tribute.isActive) {
          if (this.tribute.spaceSelectsMatch) {
            this.callbacks().enter(e, el);
          } else if (!this.tribute.allowSpaces) {
            e.stopPropagation();
            setTimeout(() => {
              this.tribute.hideMenu();
            }, 0);
          }
        }
      },
      up: (e, el) => {
        // navigate up ul
        if (this.tribute.isActive && this.tribute.current.filteredItems) {
          e.preventDefault();
          e.stopPropagation();
          let count = this.tribute.current.filteredItems.length,
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
      down: (e, el) => {
        // navigate down ul
        if (this.tribute.isActive && this.tribute.current.filteredItems) {
          e.preventDefault();
          e.stopPropagation();
          let count = this.tribute.current.filteredItems.length - 1,
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
      delete: (e, el) => {
        if (
          this.tribute.isActive &&
          this.tribute.current.mentionText.length < 1
        ) {
          this.tribute.hideMenu();
        } else if (this.tribute.isActive) {
          this.tribute.showMenuFor(el);
        }
      }
    };
  }

  setActiveLi(index) {
    let lis = this.tribute.menu.querySelectorAll("li"),
      length = lis.length >>> 0;

    if (index) this.tribute.menuSelected = parseInt(index);

    for (let i = 0; i < length; i++) {
      let li = lis[i];
      if (i === this.tribute.menuSelected) {
        li.classList.add(this.tribute.current.collection.selectClass);

        let liClientRect = li.getBoundingClientRect();
        let menuClientRect = this.tribute.menu.getBoundingClientRect();

        if (liClientRect.bottom > menuClientRect.bottom) {
          let scrollDistance = liClientRect.bottom - menuClientRect.bottom;
          this.tribute.menu.scrollTop += scrollDistance;
        } else if (liClientRect.top < menuClientRect.top) {
          let scrollDistance = menuClientRect.top - liClientRect.top;
          this.tribute.menu.scrollTop -= scrollDistance;
        }
      } else {
        li.classList.remove(this.tribute.current.collection.selectClass);
      }
    }
  }

  getFullHeight(elem, includeMargin) {
    let height = elem.getBoundingClientRect().height;

    if (includeMargin) {
      let style = elem.currentStyle || window.getComputedStyle(elem);
      return (
        height + parseFloat(style.marginTop) + parseFloat(style.marginBottom)
      );
    }

    return height;
  }
}

export default TributeEvents;
