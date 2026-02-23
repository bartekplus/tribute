"use strict";

import {
  clearDom,
  createDomElement,
  fillIn,
} from "./utils/dom-helpers";

import { attachTribute, detachTribute } from "./utils/tribute-helpers";

describe("Tribute autocomplete separator retrigger", function() {
  const defaultKeys = function() {
    return ["Tab", "Enter", "Escape", "ArrowUp", "ArrowDown", "Backspace"];
  };

  const keysWithSpace = function() {
    return ["Tab", "Enter", "Escape", "ArrowUp", "ArrowDown", "Backspace", "Space"];
  };

  const resetDefaultKeys = function() {
    new Tribute({
      values: [],
      keys: defaultKeys,
    });
  };

  afterEach(function() {
    clearDom();
    resetDefaultKeys();
  });

  const setValueAndCaretAtEnd = (element, elementType, value) => {
    element.focus();
    if (elementType === "contenteditable") {
      element.textContent = value;
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    element.value = value;
    element.selectionStart = value.length;
    element.selectionEnd = value.length;
  };

  ["text", "textarea", "contenteditable"].forEach((elementType) => {
    it(`should reopen menu after whitespace separator when menuShowMinLength is 0 for ${elementType}`, () => {
      const input = createDomElement(elementType);
      const valuesCalls = [];

      const tribute = attachTribute(
        {
          autocompleteMode: true,
          menuShowMinLength: 0,
          autocompleteSeparator: /\s+/,
          selectTemplate: function(item) {
            return item.original.value;
          },
          values: function(text, cb) {
            valuesCalls.push(text);
            const allValues = [
              { key: "Alpha", value: "Alpha" },
              { key: "Atlas", value: "Atlas" },
              { key: "Hello", value: "Hello" },
            ];
            if (!text) {
              cb(allValues);
              return;
            }
            const lower = text.toLowerCase();
            cb(
              allValues.filter((item) =>
                item.value.toLowerCase().startsWith(lower)
              )
            );
          },
        },
        input.id
      );

      fillIn(input, "a");
      let popupList = document.querySelectorAll(".tribute-container > ul > li");
      expect(popupList.length).toBe(2);
      expect(valuesCalls[valuesCalls.length - 1]).toBe("a");

      const valuesCallsBeforeSeparator = valuesCalls.length;
      fillIn(input, " ");
      popupList = document.querySelectorAll(".tribute-container > ul > li");
      expect(popupList.length).toBeGreaterThan(0);
      expect(valuesCalls.length).toBeGreaterThan(valuesCallsBeforeSeparator);
      if (elementType !== "contenteditable") {
        expect(valuesCalls[valuesCalls.length - 1]).toBe("");
      }

      fillIn(input, "h");
      popupList = document.querySelectorAll(".tribute-container > ul > li");
      expect(popupList.length).toBe(1);
      expect(valuesCalls[valuesCalls.length - 1]).toBe("h");

      detachTribute(tribute, input.id);
    });
  });

  ["text", "textarea", "contenteditable"].forEach((elementType) => {
    ["Space", "Spacebar"].forEach((spaceKey) => {
      it(`should process keyup ${spaceKey} in autocomplete mode for ${elementType}`, () => {
        const input = createDomElement(elementType);
        const valuesCalls = [];

        const tribute = attachTribute(
          {
            autocompleteMode: true,
            menuShowMinLength: 0,
            autocompleteSeparator: /\s+/,
            selectTemplate: function(item) {
              return item.original.value;
            },
            values: function(text, cb) {
              valuesCalls.push(text);
              cb([
                { key: "Alpha", value: "Alpha" },
                { key: "Atlas", value: "Atlas" },
                { key: "Hello", value: "Hello" },
              ]);
            },
          },
          input.id
        );

        fillIn(input, "a");
        tribute.hideMenu();
        const valuesCallsBeforeKeyup = valuesCalls.length;

        setValueAndCaretAtEnd(input, elementType, "a ");
        input.dispatchEvent(
          new KeyboardEvent("keyup", {
            key: spaceKey,
            code: "Space",
            bubbles: true,
          })
        );

        const popupList = document.querySelectorAll(".tribute-container > ul > li");
        expect(popupList.length).toBeGreaterThan(0);
        expect(valuesCalls.length).toBeGreaterThan(valuesCallsBeforeKeyup);
        if (elementType !== "contenteditable") {
          expect(valuesCalls[valuesCalls.length - 1]).toBe("");
        }

        detachTribute(tribute, input.id);
      });
    });
  });

  ["text", "textarea", "contenteditable"].forEach((elementType) => {
    it(`should not treat Space from custom keys as control when keydown did not handle it for ${elementType}`, () => {
      const input = createDomElement(elementType);
      const valuesCalls = [];

      const tribute = attachTribute(
        {
          autocompleteMode: true,
          menuShowMinLength: 0,
          autocompleteSeparator: /\s+/,
          keys: keysWithSpace,
          selectTemplate: function(item) {
            return item.original.value;
          },
          values: function(text, cb) {
            valuesCalls.push(text);
            cb([
              { key: "Alpha", value: "Alpha" },
              { key: "Atlas", value: "Atlas" },
              { key: "Hello", value: "Hello" },
            ]);
          },
        },
        input.id
      );

      setValueAndCaretAtEnd(input, elementType, "a ");
      input.dispatchEvent(
        new KeyboardEvent("keyup", {
          key: "Space",
          code: "Space",
          bubbles: true,
        })
      );

      const popupList = document.querySelectorAll(".tribute-container > ul > li");
      expect(popupList.length).toBeGreaterThan(0);
      expect(valuesCalls.length).toBeGreaterThan(0);
      if (elementType !== "contenteditable") {
        expect(valuesCalls[valuesCalls.length - 1]).toBe("");
      }

      detachTribute(tribute, input.id);
    });
  });

  it("should retrigger after Space handled on keydown when input is not prevented", () => {
    const input = createDomElement("text");
    const valuesCalls = [];

    const tribute = attachTribute(
      {
        autocompleteMode: true,
        menuShowMinLength: 0,
        autocompleteSeparator: /\s+/,
        keys: keysWithSpace,
        spaceSelectsMatch: false,
        selectTemplate: function(item) {
          return item.original.value;
        },
        values: function(text, cb) {
          valuesCalls.push(text);
          cb([
            { key: "Alpha", value: "Alpha" },
            { key: "Atlas", value: "Atlas" },
            { key: "Hello", value: "Hello" },
          ]);
        },
      },
      input.id
    );

    fillIn(input, "a");
    const valuesCallsBeforeSpace = valuesCalls.length;
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: " ",
        code: "Space",
        bubbles: true,
        cancelable: true,
      })
    );
    input.value = "a ";
    input.selectionStart = 2;
    input.selectionEnd = 2;
    input.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: " ",
        code: "Space",
        bubbles: true,
      })
    );

    const popupList = document.querySelectorAll(".tribute-container > ul > li");
    expect(popupList.length).toBeGreaterThan(0);
    expect(valuesCalls.length).toBeGreaterThan(valuesCallsBeforeSpace);
    expect(valuesCalls[valuesCalls.length - 1]).toBe("");

    detachTribute(tribute, input.id);
  });

  it("should ignore keyup after Space handled on keydown with preventDefault", () => {
    const input = createDomElement("text");
    const valuesCalls = [];

    const tribute = attachTribute(
      {
        autocompleteMode: true,
        menuShowMinLength: 0,
        autocompleteSeparator: /\s+/,
        keys: keysWithSpace,
        spaceSelectsMatch: true,
        selectTemplate: function(item) {
          return item.original.value;
        },
        values: function(text, cb) {
          valuesCalls.push(text);
          cb([
            { key: "Alpha", value: "Alpha" },
            { key: "Atlas", value: "Atlas" },
            { key: "Hello", value: "Hello" },
          ]);
        },
      },
      input.id
    );

    fillIn(input, "a");
    const valuesCallsBeforeSpace = valuesCalls.length;
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: " ",
        code: "Space",
        bubbles: true,
        cancelable: true,
      })
    );
    input.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: " ",
        code: "Space",
        bubbles: true,
      })
    );

    expect(valuesCalls.length).toBe(valuesCallsBeforeSpace);
    const popupList = document.querySelectorAll(".tribute-container > ul > li");
    expect(popupList.length).toBe(0);

    detachTribute(tribute, input.id);
  });
});
