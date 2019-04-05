[![Published on NPM](https://img.shields.io/npm/v/@advanced-rest-client/response-history-saver.svg)](https://www.npmjs.com/package/@advanced-rest-client/response-history-saver)

[![Build Status](https://travis-ci.org/advanced-rest-client/response-history-saver.svg?branch=stage)](https://travis-ci.org/advanced-rest-client/response-history-saver)

[![Published on webcomponents.org](https://img.shields.io/badge/webcomponents.org-published-blue.svg)](https://www.webcomponents.org/element/advanced-rest-client/response-history-saver)

# response-history-saver

An element that saves requests history in a datastore

```html
<response-history-saver></response-history-saver>
```

### API components

This components is a part of [API components ecosystem](https://elements.advancedrestclient.com/)

## Usage

### Installation
```
npm install --save @advanced-rest-client/response-history-saver
```

### In an html file

```html
<html>
  <head>
    <script type="module">
      import '@advanced-rest-client/response-history-saver/response-history-saver.js';
    </script>
  </head>
  <body>
    <response-history-saver></response-history-saver>
  </body>
</html>
```

### In a Polymer 3 element

```js
import {PolymerElement, html} from '@polymer/polymer';
import '@advanced-rest-client/response-history-saver/response-history-saver.js';

class SampleElement extends PolymerElement {
  static get template() {
    return html`
    <response-history-saver></response-history-saver>
    `;
  }
}
customElements.define('sample-element', SampleElement);
```

### Installation

```sh
git clone https://github.com/advanced-rest-client/response-history-saver
cd api-url-editor
npm install
npm install -g polymer-cli
```

### Running the demo locally

```sh
polymer serve --npm
open http://127.0.0.1:<port>/demo/
```

### Running the tests
```sh
polymer test --npm
```
