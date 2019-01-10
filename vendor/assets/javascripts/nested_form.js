(function() {
  window.NestedFormEvents = function() {
    this.addFields = this.addFields.bind(this);
    this.removeFields = this.removeFields.bind(this);
  };

  NestedFormEvents.prototype = {
    addFields: function(e) {
      // Setup
      var linkElement = e.selectorTarget;
      var assoc = linkElement.dataset.association; // Name of child
      var blueprint = document.getElementById(linkElement.dataset.blueprintId);
      var content = blueprint.dataset.blueprint; // Fields template

      // Make the context correct by replacing <parents> with the generated ID
      // of each of the parent objects
      var context = "";
      var fields = linkElement.closest(".fields");

      if (fields) {
        var formTagElement = fields.closestChild("input, textarea, select");

        if (formTagElement && formTagElement.hasAttribute("name")) {
          context = formTagElement
            .getAttribute("name")
            .replace(/\[[a-z_]+\]$/, "");
        }
      }

      // If the parent has no inputs we need to strip off the last pair
      var current = content.match(
        new RegExp("\\[([a-z_]+)\\]\\[new_" + assoc + "\\]")
      );
      if (current) {
        context = context.replace(
          new RegExp("\\[" + current[1] + "\\]\\[(new_)?\\d+\\]$"),
          ""
        );
      }

      // context will be something like this for a brand new form:
      // project[tasks_attributes][1255929127459][assignments_attributes][1255929128105]
      // or for an edit form:
      // project[tasks_attributes][0][assignments_attributes][1]
      if (context) {
        var parentNames =
          context.match(/[a-z_]+_attributes(?=\]\[(new_)?\d+\])/g) || [];
        var parentIds = context.match(/[0-9]+/g) || [];

        for (var i = 0; i < parentNames.length; i++) {
          if (parentIds[i]) {
            content = content.replace(
              new RegExp("(_" + parentNames[i] + ")_.+?_", "g"),
              "$1_" + parentIds[i] + "_"
            );

            content = content.replace(
              new RegExp("(\\[" + parentNames[i] + "\\])\\[.+?\\]", "g"),
              "$1[" + parentIds[i] + "]"
            );
          }
        }
      }

      // Make a unique ID for the new child
      var regexp = new RegExp("new_" + assoc, "g");
      var new_id = this.newId();
      content = content.replace(regexp, new_id).trim();

      var field = this.insertFields(content, assoc, linkElement);
      // bubble up event upto document (through form)
      var generalEvent = new CustomEvent("nested:fieldAdded", {
        bubbles: true,
        detail: { type: "nested:fieldAdded", field: field }
      });
      var specificEvent = new CustomEvent("nested:fieldAdded" + assoc, {
        bubbles: true,
        detail: { type: "nested:fieldAdded" + assoc, field: field }
      });

      field.dispatchEvent(generalEvent);
      field.dispatchEvent(specificEvent);

      return false;
    },
    newId: function() {
      return new Date().getTime();
    },
    insertFields: function(contentHTML, assoc, linkElement) {
      var target = linkElement.dataset.target;
      var contentElement = document.createElement("div");
      contentElement.innerHTML = contentHTML;
      contentElement = contentElement.firstElementChild;

      if (target) {
        document
          .querySelector(target)
          .insertAdjacentElement("beforeend", contentElement);
      } else {
        linkElement.insertAdjacentElement("beforebegin", contentElement);
      }

      return contentElement;
    },
    removeFields: function(e) {
      var linkElement = e.selectorTarget;
      var assoc = linkElement.dataset.association; // Name of child to be removed

      var hiddenField = linkElement.previousElementSibling;

      while (hiddenField) {
        if (
          hiddenField.tagName.toLowerCase() === "input" &&
          hiddenField.type === "hidden"
        ) {
          break;
        }

        hiddenField = hiddenField.previousElementSibling;
      }

      hiddenField.value = "1";

      var field = linkElement.closest(".fields");
      field.style.display = "hidden";

      var generalEvent = new CustomEvent("nested:fieldRemoved", {
        bubbles: true,
        detail: { type: "nested:fieldRemoved", field: field }
      });
      var specificEvent = new CustomEvent("nested:fieldRemoved" + assoc, {
        bubbles: true,
        detail: { type: "nested:fieldRemoved" + assoc, field: field }
      });

      field.dispatchEvent(generalEvent);
      field.dispatchEvent(specificEvent);

      return false;
    }
  };

  window.nestedFormEvents = new NestedFormEvents();

  document.addEventListener(
    "click",
    function(event) {
      const selectorTarget = event.target.closest("form a.add_nested_fields");

      if (!selectorTarget || !event.currentTarget.contains(selectorTarget)) {
        return;
      }

      event.selectorTarget = selectorTarget;

      nestedFormEvents.addFields(event);
    },
    true
  );

  document.addEventListener(
    "click",
    function(event) {
      const selectorTarget = event.target.closest(
        "form a.remove_nested_fields"
      );

      if (!selectorTarget || !event.currentTarget.contains(selectorTarget)) {
        return;
      }

      event.selectorTarget = selectorTarget;

      nestedFormEvents.removeFields(event);
    },
    true
  );
})();

(function() {
  if (Element.prototype.closestChild) {
    return;
  }

  Element.prototype.closestChild = function(selector) {
    if (!selector || selector === "") {
      return null;
    }

    var queue = [];
    queue.push(this);

    while (queue.length > 0) {
      var node = queue.shift();
      var children = node.children;

      for (var i = 0; i < children.length; i++) {
        var child = children[i];

        if (child.matches(selector)) {
          return child;
        }

        queue.push(child);
      }
    }

    return null;
  };
})();

(function() {
  if (typeof window.CustomEvent === "function") {
    return;
  }

  function CustomEvent(event, params) {
    params = params || {
      bubbles: false,
      cancelable: false,
      detail: undefined
    };
    var evt = document.createEvent("CustomEvent");
    evt.initCustomEvent(
      event,
      params.bubbles,
      params.cancelable,
      params.detail
    );
    return evt;
  }

  CustomEvent.prototype = window.Event.prototype;

  window.CustomEvent = CustomEvent;
})();
