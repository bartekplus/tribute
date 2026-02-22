"use strict";

import {
    clearDom,
    createDomElement,
    fillIn,
} from "./utils/dom-helpers";
import { attachTribute, detachTribute } from "./utils/tribute-helpers";

describe("Tribute menuShowMinLength cases", function () {
    afterEach(function () {
        clearDom();
    });

    ["text", "contenteditable"].forEach(elementType => {
        it(`should not show menu when mentiontext length is less than menuShowMinLength for ${elementType}`, () => {
            let input = createDomElement(elementType);

            let collectionObject = {
                menuShowMinLength: 3,
                selectTemplate: function (item) {
                    return item.original.value;
                },
                values: [
                    { key: "Jordan Humphreys", value: "Jordan Humphreys" },
                    { key: "Sir Walter Riley", value: "Sir Walter Riley" }
                ]
            };

            let tribute = attachTribute(collectionObject, input.id);

            // typing 2 characters "@J"
            fillIn(input, "@J");

            let popupListWrapper = document.querySelector(".tribute-container");
            // Menu is NOT shown because 1 < 3
            expect(popupListWrapper).toBeNull();

            detachTribute(tribute, input.id);
        });

        it(`should update menu when mention length is equal or greater than menuShowMinLength for ${elementType}`, () => {
            let input = createDomElement(elementType);

            let collectionObject = {
                menuShowMinLength: 3,
                selectTemplate: function (item) {
                    return item.original.value;
                },
                values: [
                    { key: "Jordan Humphreys", value: "Jordan Humphreys" },
                    { key: "Sir Walter Riley", value: "Sir Walter Riley" }
                ]
            };

            let tribute = attachTribute(collectionObject, input.id);

            // typing 5 characters "@Jora", mentionText="Jora" length=4
            fillIn(input, "@Jora");

            let popupListWrapper = document.querySelector(".tribute-container");
            // Menu is shown because length >= 3
            expect(popupListWrapper).not.toBeNull();

            detachTribute(tribute, input.id);
        });
    });
});
