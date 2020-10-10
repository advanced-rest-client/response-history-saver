___

This component is deprecated and moved to `arc-models`.
___

[![Published on NPM](https://img.shields.io/npm/v/@advanced-rest-client/response-history-saver.svg)](https://www.npmjs.com/package/@advanced-rest-client/response-history-saver)

[![Build Status](https://travis-ci.org/advanced-rest-client/response-history-saver.svg?branch=stage)](https://travis-ci.org/advanced-rest-client/response-history-saver)

[![Published on webcomponents.org](https://img.shields.io/badge/webcomponents.org-published-blue.svg)](https://www.webcomponents.org/element/advanced-rest-client/response-history-saver)

# response-history-saver

An element that saves requests history in a datastore.

History data is different that request history. It keeps a HAR-like object with history details.

The element handles `api-response` event and transforms response into a data object and stores in `history-data` datastore.
Originally it was designed to support API assistant, however this was removed in ARC 10 and currently it has no practical use in ARC. It may change in the future.

## Usage

### Installation
```
npm install --save @advanced-rest-client/response-history-saver
```

### In a LitElement

```js
import { LitElement, html } from 'lit-element';
import '@advanced-rest-client/response-history-saver/response-history-saver.js';

class SampleElement extends LitElement {
  render() {
    return html`
    <response-history-saver></response-history-saver>
    `;
  }
}
customElements.define('sample-element', SampleElement);
```

## Development

```sh
git clone https://github.com/advanced-rest-client/response-history-saver
cd response-history-saver
npm install
```

### Running the tests

```sh
npm test
```

## API components

This components is a part of [API components ecosystem](https://elements.advancedrestclient.com/)
