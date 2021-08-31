/*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/

class TributeMenuEvents {
  constructor(tribute) {
    this.tribute = tribute;
    this.tribute.menuEvents = this;
    this.menu = this.tribute.menu;
  }

  bind(_menu) {
    const DEBOUNCE_TIMEOUT_MS = 100;
    this.menuClickEvent = this.tribute.events.click.bind(null, this);
    this.menuContainerScrollEvent = this.tribute.debounce(() => {
      this.tribute.hideMenu();
    }, DEBOUNCE_TIMEOUT_MS);
    this.windowResizeEvent = this.tribute.debounce(() => {
      this.tribute.hideMenu();
    }, DEBOUNCE_TIMEOUT_MS);

    this.windowBlurEvent = () => {
      this.tribute.hideMenu();
    };

    this.tribute.range
      .getDocument()
      .addEventListener("mousedown", this.menuClickEvent, false);
    window.addEventListener("resize", this.windowResizeEvent);
    window.addEventListener("blur", this.windowBlurEvent);

    if (this.menuContainer) {
      this.menuContainer.addEventListener(
        "scroll",
        this.menuContainerScrollEvent,
        false
      );
    } else {
      window.addEventListener("scroll", this.menuContainerScrollEvent);
    }
  }

  unbind(_menu) {
    this.tribute.range
      .getDocument()
      .removeEventListener("mousedown", this.menuClickEvent, false);
    window.removeEventListener("resize", this.windowResizeEvent);
    window.removeEventListener("blur", this.windowBlurEvent);

    if (this.menuContainer) {
      this.menuContainer.removeEventListener(
        "scroll",
        this.menuContainerScrollEvent,
        false
      );
    } else {
      window.removeEventListener("scroll", this.menuContainerScrollEvent);
    }
  }
}

export default TributeMenuEvents;
