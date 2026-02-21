"use strict";

import {
    clearDom,
    createDomElement,
    fillIn,
    simulateMouseClick
} from "./utils/dom-helpers";

import { attachTribute, detachTribute } from "./utils/tribute-helpers";

describe("Tribute inline suggestions", function () {
    afterEach(function () {
        clearDom();
    });

    ["text", "contenteditable"].forEach(elementType => {
        it(`should display and accept inline suggestion for ${elementType}`, async () => {
            let input = createDomElement(elementType);
            let collectionObject = {
                inline: true,
                values: [
                    { key: "Jordan Humphreys", value: "Jordan Humphreys" },
                    { key: "Sir Walter Riley", value: "Sir Walter Riley" }
                ]
            };

            let tribute = attachTribute(collectionObject, input.id);
            fillIn(input, "@J");

            await new Promise(resolve => setTimeout(resolve, 200)); // Wait for debounce

            // Verify suggestion is shown
            let inlineDiv = document.querySelector(".tribute-inline");
            expect(inlineDiv).not.toBeNull();
            if (inlineDiv) expect(inlineDiv.innerText).toBe("ordan Humphreys");

            // Simulate Tab key
            let event = new KeyboardEvent('keydown', {
                key: 'Tab',
                code: 'Tab',
                keyCode: 9,
                which: 9,
                bubbles: true,
                cancelable: true
            });
            input.dispatchEvent(event);

            await new Promise(resolve => setTimeout(resolve, 10)); // Wait for async Tab handling

            // Verify text is replaced
            if (elementType === "contenteditable") {
                expect(input.innerText.trim()).toBe("@Jordan Humphreys");
            } else {
                expect(input.value.trim()).toBe("@Jordan Humphreys");
            }
            expect(document.querySelector(".tribute-inline")).toBeNull();

            detachTribute(tribute, input.id);
        });
    });
});
