/*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/

// Thanks to https://github.com/jeff-collins/ment.io
import "./utils";

class TributeRange {
  constructor(tribute) {
    this.tribute = tribute;
    this.tribute.range = this;
  }

  getDocument() {
    let iframe;
    if (this.tribute.current.collection) {
      iframe = this.tribute.current.collection.iframe;
    }

    if (!iframe) {
      return document;
    }

    return iframe.contentWindow.document;
  }

  positionMenuAtCaret(scrollTo) {
    const context = this.tribute.current;
    let coordinates;

    const info = this.getTriggerInfo(
      false,
      this.tribute.hasTrailingSpace,
      true,
      this.tribute.allowSpaces,
      this.tribute.autocompleteMode
    );

    if (typeof info !== "undefined") {
      if (!this.tribute.positionMenu) {
        this.tribute.menu.style.display = `block`;
        return;
      }

      if (!this.isContentEditable(context.element)) {
        coordinates = this.getTextAreaOrInputUnderlinePosition(
          this.tribute.current.element,
          info.mentionPosition + info.mentionText.length
        );
      } else {
        coordinates = this.getContentEditableCaretPosition(
          info.mentionPosition + info.mentionText.length
        );
      }

      this.tribute.menu.style.top = `${coordinates.top}px`;
      this.tribute.menu.style.left = `${coordinates.left}px`;
      this.tribute.menu.style.right = `${coordinates.right}px`;
      this.tribute.menu.style.bottom = `${coordinates.bottom}px`;
      this.tribute.menu.style["max-heigh"] = `${
        coordinates.maxHeight || 500
      }px`;
      this.tribute.menu.style["max-width"] = `${coordinates.maxWidth || 300}px`;
      this.tribute.menu.style.position = `${
        coordinates.position || "absolute"
      }`;
      this.tribute.menu.style.display = `block`;

      if (coordinates.left === "auto") {
        this.tribute.menu.style.left = "auto";
      }

      if (coordinates.top === "auto") {
        this.tribute.menu.style.top = "auto";
      }

      if (scrollTo) this.scrollIntoView();
    } else {
      this.tribute.menu.style.display = "none";
    }
  }

  get menuContainerIsBody() {
    return (
      this.tribute.menuContainer === document.body ||
      !this.tribute.menuContainer
    );
  }

  selectElement(targetElement, path, offset) {
    let elem = targetElement;

    if (path) {
      for (let i = 0; i < path.length; i++) {
        elem = elem.childNodes[path[i]];
        if (elem === undefined) {
          return;
        }
        while (elem.length < offset) {
          offset -= elem.length;
          elem = elem.nextSibling;
        }
        if (elem.childNodes.length === 0 && !elem.length) {
          elem = elem.previousSibling;
        }
      }
    }
    const sel = this.getWindowSelection();
    const range = this.getDocument().createRange();
    range.setStart(elem, offset);
    range.setEnd(elem, offset);
    range.collapse(true);

    try {
      sel.removeAllRanges();
    } catch (error) {
      console.error(error);
    }

    sel.addRange(range);
    targetElement.focus();
  }

  replaceTriggerText(
    text,
    requireLeadingSpace,
    hasTrailingSpace,
    originalEvent,
    item
  ) {
    const info = this.tribute.current.info; //this.getTriggerInfo(true, hasTrailingSpace, requireLeadingSpace, this.tribute.allowSpaces, this.tribute.autocompleteMode)

    if (info !== undefined) {
      const context = this.tribute.current;
      const detail = {
        item: item,
        instance: context,
        context: info,
        event: originalEvent,
        text: text,
      };
      const replaceEvent = new CustomEvent("tribute-replaced", {
        detail: detail,
      });

      if (!this.isContentEditable(context.element)) {
        const textEndsWithSpace = text !== text.trimEnd();
        const myField = this.tribute.current.element;
        const textSuffix =
          typeof this.tribute.replaceTextSuffix === "string"
            ? this.tribute.replaceTextSuffix
            : " ";
        text = this.stripHtml(text);
        text += textSuffix;
        const startPos = info.mentionPosition;
        let endPos =
          info.mentionPosition +
          info.mentionText.length +
          textSuffix.length +
          textEndsWithSpace;
        if (!this.tribute.autocompleteMode) {
          endPos += info.mentionTriggerChar.length - 1;
        }
        myField.value =
          myField.value.substring(0, startPos) +
          text +
          myField.value.substring(endPos, myField.value.length);
        myField.selectionStart = startPos + text.length;
        myField.selectionEnd = startPos + text.length;
      } else {
        // add a space to the end of the pasted text
        const textEndsWithSpace = text !== text.trimEnd();
        const textSuffix =
          typeof this.tribute.replaceTextSuffix === "string"
            ? this.tribute.replaceTextSuffix
            : "\xA0";
        text += textSuffix;
        let endPos =
          info.mentionPosition + info.mentionText.length + textEndsWithSpace;
        if (!this.tribute.autocompleteMode) {
          endPos += info.mentionTriggerChar.length;
        }
        this.tribute.useHTML
          ? this.pasteHtml(text, info.mentionPosition, endPos)
          : this.pasteText(text, info.mentionPosition, endPos);
      }

      context.element.dispatchEvent(
        new CustomEvent("input", { bubbles: true, detail: detail })
      );
      context.element.dispatchEvent(replaceEvent);
    }
  }

  pasteHtml(html, startPos, endPos) {
    const { sel } = this.getContentEditableSelectionStart(true);
    let range = null;
    if (sel.modify) {
      for (let index = 0; index < endPos - startPos; index++) {
        sel.modify("extend", "backward", "character");
      }
      range = sel.getRangeAt(0);
    } else {
      range.setStart(sel.anchorNode, Math.min(startPos, sel.anchorNode.length));
      range.setEnd(sel.anchorNode, Math.min(endPos, sel.anchorNode.length));
    }
    range.deleteContents();

    const el = this.getDocument().createElement("div");
    el.innerHTML = html;
    const frag = this.getDocument().createDocumentFragment();
    let node, lastNode;

    while ((node = el.firstChild)) {
      lastNode = frag.appendChild(node);
    }
    range.insertNode(frag);

    // Preserve the selection
    if (lastNode) {
      const newRange = this.getDocument().createRange();
      newRange.setStart(lastNode, lastNode.length);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      sel.collapseToEnd();
    }
  }

  stripHtml(html) {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }

  pasteText(html, startPos, endPos) {
    const text = this.stripHtml(html);
    const range = this.getDocument().createRange();
    const sel = this.getWindowSelection();
    sel.anchorNode.nodeValue =
      sel.anchorNode.nodeValue.substring(0, startPos) +
      text +
      sel.anchorNode.nodeValue.substring(
        endPos,
        sel.anchorNode.nodeValue.length
      );
    range.setStart(sel.anchorNode, startPos + text.length);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    sel.collapseToEnd();
  }

  getWindowSelection() {
    if (this.tribute.collection.iframe) {
      return this.tribute.collection.iframe.contentWindow.getSelection();
    }

    const rootNode = this.tribute.current.element.getRootNode();
    if (rootNode.getSelection) return rootNode.getSelection();
    else return window.getSelection();
  }

  getContentEditableSelectionStart(moveToEndofWord) {
    const sel = this.getWindowSelection();
    const range = sel.getRangeAt(0);
    const selectedElem = sel.anchorNode;
    const workingNodeContent = selectedElem.textContent;
    const selectStartOffset =
      this.getWindowSelection().getRangeAt(0).startOffset;

    if (sel.modify) {
      const nextChar =
        workingNodeContent.length >= selectStartOffset
          ? workingNodeContent[selectStartOffset]
          : null;
      const nextCharisWhitespce = nextChar && nextChar !== nextChar.trim();
      sel.collapseToEnd();
      if (!nextCharisWhitespce && moveToEndofWord)
        sel.modify("move", "forward", "word");
    }
    return { sel, range };
  }

  getNodePositionInParent(element) {
    if (element.parentNode === null) {
      return 0;
    }

    for (let i = 0; i < element.parentNode.childNodes.length; i++) {
      const node = element.parentNode.childNodes[i];

      if (node === element) {
        return i;
      }
    }
  }

  getContentEditableSelectedPath(_ctx) {
    const sel = this.getWindowSelection();
    let selected = sel.anchorNode;
    const path = [];
    let offset;

    if (selected !== null) {
      let i;
      let ce = selected.contentEditable;
      while (selected !== null && ce !== "true") {
        i = this.getNodePositionInParent(selected);
        path.push(i);
        selected = selected.parentNode;
        if (selected !== null) {
          ce = selected.contentEditable;
        }
      }
      path.reverse();

      // getRangeAt may not exist, need alternative
      offset = sel.getRangeAt(0).startOffset;

      return {
        selected: selected,
        path: path,
        offset: offset,
      };
    }
  }

  getWholeWordsUpToCharIndex(str, minLen) {
    let pos = 0;
    const arr = str
      .split(this.tribute.autocompleteSeparator)
      .filter(function (e) {
        return e.trim();
      });
    const text = str;
    for (let i = 0, len = arr.length; i < len; i++) {
      const idx = str.indexOf(arr[i]);
      pos = pos + idx;
      str = str.slice(idx);
      if (minLen >= pos && minLen <= pos + arr[i].length) {
        minLen = pos + arr[i].length;
        break;
      }
    }

    return text.substring(0, minLen);
  }
  getTextPrecedingCurrentSelection() {
    const context = this.tribute.current;
    let text = "";

    if (!this.isContentEditable(context.element)) {
      const textComponent = this.tribute.current.element;
      if (textComponent) {
        const startPos = textComponent.selectionStart;
        if (textComponent.value && startPos >= 0) {
          text = textComponent.value.substring(0);
          text = this.getWholeWordsUpToCharIndex(text, startPos);
        }
      }
    } else {
      const { sel, range } = this.getContentEditableSelectionStart(true);
      const selectedElem = sel.anchorNode;
      const workingNodeContent = selectedElem.textContent;
      const selectStartOffset =
        this.getWindowSelection().getRangeAt(0).startOffset;

      if (sel.modify) {
        const lastChar = workingNodeContent[Math.max(0, selectStartOffset - 1)];
        const addWhiteSpace = lastChar !== lastChar.trim();
        for (
          let index = 0;
          index < this.tribute.numberOfWordsInContextText;
          index++
        ) {
          sel.modify("extend", "backward", "word");
        }
        text = sel.toString().trim() + (addWhiteSpace ? " " : "");

        // restore selection
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        if (workingNodeContent && selectStartOffset >= 0) {
          text = workingNodeContent.substring(0);
          text = this.getWholeWordsUpToCharIndex(text, selectStartOffset);
        }
      }
    }

    return text;
  }

  getLastWordInText(text) {
    const separator = this.tribute.autocompleteSeparator
      ? this.tribute.autocompleteSeparator
      : /\s+/;
    const wordsArray = text.split(separator);

    if (!wordsArray.length) return " ";
    return wordsArray[wordsArray.length - 1];
  }

  getTriggerInfo(
    menuAlreadyActive,
    hasTrailingSpace,
    requireLeadingSpace,
    allowSpaces,
    isAutocomplete
  ) {
    const ctx = this.tribute.current;
    let selected, path, offset;

    if (!this.isContentEditable(ctx.element)) {
      selected = this.tribute.current.element;
    } else {
      const selectionInfo = this.getContentEditableSelectedPath(ctx);

      if (selectionInfo) {
        selected = selectionInfo.selected;
        path = selectionInfo.path;
        offset = selectionInfo.offset;
      }
    }

    const effectiveRange = this.getTextPrecedingCurrentSelection();
    const lastWordOfEffectiveRange = this.getLastWordInText(effectiveRange);

    if (isAutocomplete) {
      return {
        mentionPosition:
          effectiveRange.length - lastWordOfEffectiveRange.length,
        mentionText: lastWordOfEffectiveRange,
        fullText: effectiveRange,
        mentionSelectedElement: selected,
        mentionSelectedPath: path,
        mentionSelectedOffset: offset,
      };
    }

    if (effectiveRange !== undefined && effectiveRange !== null) {
      let mostRecentTriggerCharPos = -1;
      let triggerChar;

      this.tribute.collection.forEach((config) => {
        const c = config.trigger;
        const idx = config.requireLeadingSpace
          ? this.lastIndexWithLeadingSpace(effectiveRange, c)
          : effectiveRange.lastIndexOf(c);

        if (idx > mostRecentTriggerCharPos) {
          mostRecentTriggerCharPos = idx;
          triggerChar = c;
          requireLeadingSpace = config.requireLeadingSpace;
        }
      });

      if (
        mostRecentTriggerCharPos >= 0 &&
        (mostRecentTriggerCharPos === 0 ||
          !requireLeadingSpace ||
          /\s/.test(
            effectiveRange.substring(
              mostRecentTriggerCharPos - 1,
              mostRecentTriggerCharPos
            )
          ))
      ) {
        let currentTriggerSnippet = effectiveRange.substring(
          mostRecentTriggerCharPos + triggerChar.length,
          effectiveRange.length
        );

        triggerChar = effectiveRange.substring(
          mostRecentTriggerCharPos,
          mostRecentTriggerCharPos + triggerChar.length
        );
        const firstSnippetChar = currentTriggerSnippet.substring(0, 1);
        const leadingSpace =
          currentTriggerSnippet.length > 0 &&
          (firstSnippetChar === " " || firstSnippetChar === "\xA0");
        if (hasTrailingSpace) {
          currentTriggerSnippet = currentTriggerSnippet.trim();
        }

        const regex = allowSpaces ? /[^\S ]/g : /[\xA0\s]/g;

        this.tribute.hasTrailingSpace = regex.test(currentTriggerSnippet);

        if (
          !leadingSpace &&
          (menuAlreadyActive || !regex.test(currentTriggerSnippet))
        ) {
          return {
            mentionPosition: mostRecentTriggerCharPos,
            mentionText: currentTriggerSnippet,
            mentionSelectedElement: selected,
            mentionSelectedPath: path,
            mentionSelectedOffset: offset,
            mentionTriggerChar: triggerChar,
          };
        }
      }
    }
  }

  lastIndexWithLeadingSpace(str, trigger) {
    const reversedStr = str.split("").reverse().join("");
    let index = -1;

    for (let cidx = 0, len = str.length; cidx < len; cidx++) {
      const firstChar = cidx === str.length - 1;
      const leadingSpace = /\s/.test(reversedStr[cidx + 1]);

      let match = true;
      for (let triggerIdx = trigger.length - 1; triggerIdx >= 0; triggerIdx--) {
        if (trigger[triggerIdx] !== reversedStr[cidx - triggerIdx]) {
          match = false;
          break;
        }
      }

      if (match && (firstChar || leadingSpace)) {
        index = str.length - 1 - cidx;
        break;
      }
    }

    return index;
  }

  isContentEditable(element) {
    return element.nodeName !== "INPUT" && element.nodeName !== "TEXTAREA";
  }

  isMenuOffScreen(coordinates, menuDimensions) {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const doc = document.documentElement;
    const windowLeft =
      (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
    const windowTop =
      (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);

    const menuTop =
      typeof coordinates.top === "number"
        ? coordinates.top
        : coordinates.bottom - menuDimensions.height;
    const menuRight =
      typeof coordinates.right === "number"
        ? coordinates.right
        : coordinates.left + menuDimensions.width;
    const menuBottom =
      typeof coordinates.bottom === "number"
        ? coordinates.bottom
        : coordinates.top + menuDimensions.height;
    const menuLeft =
      typeof coordinates.left === "number"
        ? coordinates.left
        : coordinates.right - menuDimensions.width;

    return {
      top: menuTop < Math.floor(windowTop),
      right: menuRight > Math.ceil(windowLeft + windowWidth),
      bottom: menuBottom > Math.ceil(windowTop + windowHeight),
      left: menuLeft < Math.floor(windowLeft),
    };
  }

  getMenuDimensions() {
    // Width of the menu depends of its contents and position
    // We must check what its width would be without any obstruction
    // This way, we can achieve good positioning for flipping the menu
    const dimensions = {
      width: null,
      height: null,
    };

    this.tribute.menu.style.top = `0px`;
    this.tribute.menu.style.left = `0px`;
    this.tribute.menu.style.right = null;
    this.tribute.menu.style.bottom = null;
    this.tribute.menu.style.position = `fixed`;
    this.tribute.menu.style.visibility = `hidden`;
    this.tribute.menu.style.display = `block`;

    dimensions.width = this.tribute.menu.offsetWidth;
    dimensions.height = this.tribute.menu.offsetHeight;

    this.tribute.menu.style.display = `none`;
    this.tribute.menu.style.visibility = `visible`;

    return dimensions;
  }

  getTextAreaOrInputUnderlinePosition(element, position, _flipped) {
    const properties = [
      "direction",
      "boxSizing",
      "width",
      "height",
      "overflowX",
      "overflowY",
      "borderTopWidth",
      "borderRightWidth",
      "borderBottomWidth",
      "borderLeftWidth",
      "borderStyle",
      "paddingTop",
      "paddingRight",
      "paddingBottom",
      "paddingLeft",
      "fontStyle",
      "fontVariant",
      "fontWeight",
      "fontStretch",
      "fontSize",
      "fontSizeAdjust",
      "lineHeight",
      "fontFamily",
      "textAlign",
      "textTransform",
      "textIndent",
      "textDecoration",
      "letterSpacing",
      "wordSpacing",
    ];

    const div = this.getDocument().createElement("div");
    div.id = "input-textarea-caret-position-mirror-div";
    this.getDocument().body.appendChild(div);

    const style = div.style;
    const computed = window.getComputedStyle
      ? getComputedStyle(element)
      : element.currentStyle;

    style.whiteSpace = "pre-wrap";
    if (element.nodeName !== "INPUT") {
      style.wordWrap = "break-word";
    }

    // position off-screen
    style.position = "absolute";
    style.visibility = "hidden";

    // transfer the element's properties to the div
    properties.forEach((prop) => {
      style[prop] = computed[prop];
    });

    //NOT SURE WHY THIS IS HERE AND IT DOESNT SEEM HELPFUL
    // if (isFirefox) {
    //     style.width = `${(parseInt(computed.width) - 2)}px`
    //     if (element.scrollHeight > parseInt(computed.height))
    //         style.overflowY = 'scroll'
    // } else {
    //     style.overflow = 'hidden'
    // }

    const span0 = document.createElement("span");
    span0.textContent = element.value.substring(0, position);
    div.appendChild(span0);

    if (element.nodeName === "INPUT") {
      div.textContent = div.textContent.replace(/\s/g, " ");
    }

    //Create a span in the div that represents where the cursor
    //should be
    const span = this.getDocument().createElement("span");
    //we give it no content as this represents the cursor
    div.appendChild(span);

    const span2 = this.getDocument().createElement("span");
    span2.textContent = element.value.substring(position, position + 1);
    div.appendChild(span2);

    const rect = element.getBoundingClientRect();

    //position the div exactly over the element
    //so we can get the bounding client rect for the span and
    //it should represent exactly where the cursor is
    div.style.position = "fixed";
    div.style.left = rect.left + "px";
    div.style.top = rect.top + "px";
    div.style.width = rect.width + "px";
    div.style.height = rect.height + "px";
    div.scrollTop = element.scrollTop;

    const spanRect = span.getBoundingClientRect();
    const divRect = div.getBoundingClientRect();
    this.getDocument().body.removeChild(div);
    const clamp = function (number, min, max) {
      return Math.max(min, Math.min(number, max));
    };
    const finalRect = {
      height: Math.min(divRect.height, spanRect.height),
      left: clamp(spanRect.left, divRect.left, divRect.left + divRect.width),
      top: clamp(spanRect.top, divRect.top, divRect.top + divRect.height),
    };
    return this.getFixedCoordinatesRelativeToRect(finalRect);
  }

  getContentEditableCaretPosition(_selectedNodePosition) {
    const { sel, range } = this.getContentEditableSelectionStart(false);
    const newRange = sel.getRangeAt(0);
    // restore selection
    sel.removeAllRanges();
    sel.addRange(range);

    const rect = newRange.getBoundingClientRect();
    return this.getFixedCoordinatesRelativeToRect(rect);
  }

  getFixedCoordinatesRelativeToRect(rect) {
    const coordinates = {
      position: "fixed",
      left: rect.left,
      top: rect.top + rect.height,
    };

    const menuDimensions = this.getMenuDimensions();

    const availableSpaceOnTop = rect.top;
    const availableSpaceOnBottom =
      window.innerHeight - (rect.top + rect.height);

    //check to see where's the right place to put the menu vertically
    if (availableSpaceOnBottom < menuDimensions.height) {
      if (
        availableSpaceOnTop >= menuDimensions.height ||
        availableSpaceOnTop > availableSpaceOnBottom
      ) {
        coordinates.top = "auto";
        coordinates.bottom = window.innerHeight - rect.top;
        if (availableSpaceOnBottom < menuDimensions.height) {
          coordinates.maxHeight = availableSpaceOnTop;
        }
      } else {
        if (availableSpaceOnTop < menuDimensions.height) {
          coordinates.maxHeight = availableSpaceOnBottom;
        }
      }
    }

    const availableSpaceOnLeft = rect.left;
    const availableSpaceOnRight = window.innerWidth - rect.left;

    //check to see where's the right place to put the menu horizontally
    if (availableSpaceOnRight < menuDimensions.width) {
      if (
        availableSpaceOnLeft >= menuDimensions.width ||
        availableSpaceOnLeft > availableSpaceOnRight
      ) {
        coordinates.left = "auto";
        coordinates.right = window.innerWidth - rect.left;
        if (availableSpaceOnRight < menuDimensions.width) {
          coordinates.maxWidth = availableSpaceOnLeft;
        }
      } else {
        if (availableSpaceOnLeft < menuDimensions.width) {
          coordinates.maxWidth = availableSpaceOnRight;
        }
      }
    }

    return coordinates;
  }

  scrollIntoView(_elem) {
    const reasonableBuffer = 20;
    const maxScrollDisplacement = 100;
    let clientRect;
    let e = this.menu;

    if (typeof e === "undefined") return;

    while (clientRect === undefined || clientRect.height === 0) {
      clientRect = e.getBoundingClientRect();

      if (clientRect.height === 0) {
        e = e.childNodes[0];
        if (e === undefined || !e.getBoundingClientRect) {
          return;
        }
      }
    }

    const elemTop = clientRect.top;
    const elemBottom = elemTop + clientRect.height;

    if (elemTop < 0) {
      window.scrollTo(
        0,
        window.pageYOffset + clientRect.top - reasonableBuffer
      );
    } else if (elemBottom > window.innerHeight) {
      let maxY = window.pageYOffset + clientRect.top - reasonableBuffer;

      if (maxY - window.pageYOffset > maxScrollDisplacement) {
        maxY = window.pageYOffset + maxScrollDisplacement;
      }

      let targetY = window.pageYOffset - (window.innerHeight - elemBottom);

      if (targetY > maxY) {
        targetY = maxY;
      }

      window.scrollTo(0, targetY);
    }
  }
}

export default TributeRange;
