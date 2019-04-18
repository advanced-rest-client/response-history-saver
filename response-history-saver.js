/**
@license
Copyright 2018 The Advanced REST client authors <arc@mulesoft.com>
Licensed under the Apache License, Version 2.0 (the "License"); you may not
use this file except in compliance with the License. You may obtain a copy of
the License at
http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
License for the specific language governing permissions and limitations under
the License.
*/
import {PolymerElement} from '../../@polymer/polymer/polymer-element.js';
import '../../@advanced-rest-client/uuid-generator/uuid-generator.js';
import '../../pouchdb/dist/pouchdb.js';
/**
 * An element that saves requests history in a datastore.
 *
 * This element supports Advanced REST Client project.
 *
 * It handles the `api-response` event asynchronously and updates both
 * requests history and history data data store.
 *
 * The requests history keeps a daily record of requests made by the application.
 * It keeps record of rhe request data that can be restored lated by the
 * application.
 *
 * The history data keeps record of every request made by the application.
 * It can be used to analyse performance of an API endpoint.
 *
 * ## Data model
 *
 * ### request data
 *
 * Note that payload is always string even if the response body was different type.
 *
 * Property | Type | Description
 * ----------------|-------------|-------------
 * `_id` | `String` | PouchDB database key.
 * `timings` | `Object` | Valid HAR 1.2 timings object.
 * `totalTime` | `Number` | Number of milliseconds that took to perform the full request.
 * `created` | `Number` | Timestamp of the entry
 * `request` | `Object` | A request details object (see below).
 * `request.headers` | `String` | HTTP headers string sent to the server.
 * `request.payload` | `String` | HTTP message string set to the server.
 * `request.url` | `String` | Request URL
 * `request.method` | `String` | HTTP method of the request
 * `response` | `Object` | Response details object
 * `response.statusCode` | `Number` | A status code of the response.
 * `response.statusText` | `String` | Status text message. Can be empty or undefined.
 * `response.headers` | `String` | HTTP headers string of the response.
 * `response.payload` | `String` | Response body string.
 * `stats` | `Object` | Request and response basic statistics
 * `stats.request` | `Object` | Request basic statistics
 * `stats.request.headersSize` | `Number` | Request headers size in bytes
 * `stats.request.payloadSize` | `Number` | Request payload size in bytes
 * `stats.response` | `Object` | Response basic statistics
 * `stats.response.headersSize` | `Number` | Response headers size in bytes
 * `stats.response.payloadSize` | `Number` | Response payload size in bytes
 *
 * @customElement
 * @polymer
 * @demo demo/index.html
 * @memberof LogicElements
 */
class ResponseHistorySaver extends PolymerElement {
  constructor() {
    super();
    this._afterRequestHandler = this._afterRequestHandler.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('api-response', this._afterRequestHandler);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('api-response', this._afterRequestHandler);
  }

  /**
   * @return {PouchDB} A PouchDB instance for the history-data store.
   */
  get _dbData() {
    /* global PouchDB */
    return new PouchDB('history-data');
  }
  /**
   * Handler for the `api-response` event
   *
   * @param {CustomEvent} e
   */
  _afterRequestHandler(e) {
    const {isError, response, request, timing} = e.detail;
    if (isError) {
      return;
    }
    // Async so the response can be rendered to the user faster.
    setTimeout(() => this.saveHistory(request, response, timing));
  }
  /**
   * Saves request and response data in history.
   *
   * @param {Object} request ARC request object
   * @param {Object} response ARC response object
   * @param {Object} timings Request timings as HAR 1.2 timings object
   * @return {Promise}
   */
  saveHistory(request, response, timings) {
    return this._saveHistoryData(request, response, timings)
    .then(() => this._updateHistory(request, timings))
    .catch((cause) => this._handleException(cause));
  }
  /**
   * Saves history data for history analysis in the data store.
   *
   * @param {Request} request The request object containg information about
   * the request
   * @param {Response} response The response object for the response
   * @param {?Object} eventTimings The timings object as descrived in HAR 1.2 spec. Optional.
   * @return {Promise} A promise resolved when data were inserted to the
   * datastore.
   */
  _saveHistoryData(request, response, eventTimings) {
    const doc = this._createHistoryDataModel(request, response, eventTimings);
    const db = this._dbData;
    return db.put(doc)
    .catch((e) => this._handleException(e));
  }
  // Creates a data store model for `_saveHistoryData`
  _createHistoryDataModel(request, response, eventTimings) {
    const requestHeaders = request.headers;
    const responseHeaders = response.headers;
    const timings = this._computeTimings(eventTimings);
    const totalTime = this._computeTotalTime(timings);
    const requestPayloadSize = this._computePayloadSize(request.payload);
    const responsePayloadSize = this._computePayloadSize(response.payload);
    const requestHeadersSize = this._calculateBytes(requestHeaders);
    const responseHeadersSize = this._calculateBytes(responseHeaders);
    const requestStartTime = this._computeStartTime(eventTimings);
    const url = this._computeHistoryStoreUrl(request.url);
    const id = this._computeHistoryDataId(url, request.method);
    const requestPayload = this._computePayloadString(request.payload);
    const responsePayload = this._computePayloadString(response.payload);

    const doc = {
      _id: id,
      timings: timings,
      totalTime: totalTime,
      created: requestStartTime,
      request: {
        headers: requestHeaders,
        payload: requestPayload,
        url: request.url,
        method: request.method,
      },
      response: {
        statusCode: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        payload: responsePayload
      },
      stats: {
        request: {
          headersSize: requestHeadersSize,
          payloadSize: requestPayloadSize
        },
        response: {
          headersSize: responseHeadersSize,
          payloadSize: responsePayloadSize
        }
      }
    };
    return doc;
  }
  /**
   * Updates the requests history data store.
   * If the request for given URL and method has been already performed this
   * day then the record in the datastore is updated with new data.
   * Otherwise a new record is created.
   *
   * @param {Request} request The request object.
   * @param {?Object} eventTimings A HAR 1.2 timings object from the response
   * event.
   * @return {Promise} A promise that is resolved then the history object has
   * been updated in the data store.
   */
  _updateHistory(request, eventTimings) {
    const updated = this._computeStartTime(eventTimings);
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    let id = d.getTime();
    id += '/' + encodeURIComponent(request.url);
    id += '/' + request.method;
    const doc = {
      _id: id,
      updated,
      created: updated,
      headers: request.headers,
      method: request.method,
      payload: request.payload,
      url: request.url
    };
    const e = new CustomEvent('save-history', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: {
        request: doc
      }
    });
    this.dispatchEvent(e);
    if (!e.defaultPrevented) {
      return Promise.reject(new Error('request model not found'));
    }
    return e.detail.result;
  }
  /**
   * Computes a valid timings object as descrived in HAR 1.2 spec.
   *
   * @param {?Object} eventTimings A timings object passed by the response
   * event
   * @return {Object} A valid HAR 1.2 timings object.
   */
  _computeTimings(eventTimings) {
    eventTimings = eventTimings || {};
    const timings = {
      connect: eventTimings.connect || -1,
      receive: eventTimings.receive || -1,
      send: eventTimings.send || -1,
      ssl: eventTimings.ssl || -1,
      wait: eventTimings.wait || -1
    };
    return timings;
  }
  /**
   * Computes a timestamp of the request start time.
   * If timings object provided with the response event contains `startTime`
   * property it will compute timestamp from it. Otherwise it will use
   * current time.
   *
   * @param {?Object} eventTimings Timings object from the response event.
   * @return {Number} Timestamp of the request start.
   */
  _computeStartTime(eventTimings) {
    eventTimings = eventTimings || {};
    return eventTimings.startTime ?
      new Date(eventTimings.startTime).getTime() :
      Date.now();
  }
  /**
   * Computes total time of the request from the timings object.
   *
   * @param {Object} timings A timings object as described in HAR 1.2 spec.
   * @return {Number} Sum of times in the `timings` object. The `-1` values
   * doeasn't adds. It returns `-1` if all values are -1.
   */
  _computeTotalTime(timings) {
    const values = Object.keys(timings).map((key) => timings[key]);
    let total = values.reduce((sum, value) => {
      if (value > -1) {
        return sum + value;
      }
      return sum;
    }, 0);
    if (total === 0) {
      total = -1;
    }
    return total;
  }
  /**
   * Produces valid URL to be used in the history-data store.
   * The URL is stripped from query parameters and hash.
   *
   * @param {String} url A URL to process
   * @return {String}
   */
  _computeHistoryStoreUrl(url) {
    try {
      url = new URL(url);
      url.search = '';
      url.hash = '';
      url = url.toString();
    } catch (e) {}
    if (url) {
      let i = url.indexOf('?');
      if (i !== -1) {
        url = url.substr(0, i);
      }
      i = url.indexOf('#');
      if (i !== -1) {
        url = url.substr(0, i);
      }
    }
    return url;
  }
  /**
   * Computes size of the payload.
   *
   * @param {ArrayBuffer|Blob|String} payload The payload
   * @return {Number} Size of the payload
   */
  _computePayloadSize(payload) {
    if (!payload) {
      return 0;
    }
    if (payload instanceof ArrayBuffer) {
      return payload.byteLength;
    } else if (payload instanceof Blob) {
      return payload.size;
    } else {
      return this._calculateBytes(payload);
    }
  }
  /**
   * Calculates size of the string
   * @param {String} str A string to compute size from.
   * @return {Number} Size of the string.
   */
  _calculateBytes(str) {
    if (!str || !str.length || typeof str !== 'string') {
      return 0;
    }
    let s = str.length;
    for (let i = str.length - 1; i >= 0; i--) {
      const code = str.charCodeAt(i);
      if (code > 0x7f && code <= 0x7ff) {
        s++;
      } else if (code > 0x7ff && code <= 0xffff) {
        s += 2;
      }
      if (code >= 0xDC00 && code <= 0xDFFF) {
        i--; // trail surrogate
      }
    }
    return s;
  }
  /**
   * Computes an ID for the `history-data` datas tore.
   *
   * @param {String} url Request URL stripped from query parameters and
   * the hash.
   * @param {String} method HTTP method name.
   * @return {String} Generated unique for this request data store ID. It uses
   * UUID generator to add some random data to the ID except for the
   * URL and method.
   */
  _computeHistoryDataId(url, method) {
    if (!this.__uuid) {
      this.__uuid = document.createElement('uuid-generator');
    }
    const id = encodeURIComponent(url) + '/' + method + '/' +
      this.__uuid.generate();
    return id;
  }
  /**
   * Computes a payload message as a string.
   *
   * @param {any} input Request or response payload
   * @return {String}
   */
  _computePayloadString(input) {
    let result = '';
    if (!input) {
      return result;
    }
    if (typeof input === 'string') {
      return input;
    }
    if (input instanceof Uint8Array) {
      return input.toString();
    }
    if (input instanceof ArrayBuffer) {
      return this._arrayBufferToString(input);
    }
    return result;
  }
  /**
   * Convert ArrayBuffer to readable form
   * @param {ArrayBuffer} buffer
   * @return {String} Converted string
   */
  _arrayBufferToString(buffer) {
    if (!!buffer.buffer) {
      const b = buffer.slice(0);
      buffer = b.buffer;
    }
    if ('TextDecoder' in window) {
      try {
        const decoder = new TextDecoder('utf-8');
        const view = new DataView(buffer);
        return decoder.decode(view);
      } catch (e) {
        return '';
      }
    }
    let str = '';
    try {
      const array = new Uint8Array(buffer);
      for (let i = 0; i < array.length; ++i) {
        str += String.fromCharCode(array[i]);
      }
    } catch (e) {}
    return str;
  }
  /**
   * Handles exceptions to log message ad throws the same exception
   *
   * @param {Error} e
   */
  _handleException(e) {
    let message;
    if (e instanceof Error) {
      message = e.message;
    } else {
      message = JSON.stringify(e);
    }
    this.dispatchEvent(new CustomEvent('send-analytics', {
      composed: true,
      bubbles: true,
      detail: {
        type: 'exception',
        description: message,
        fatal: false
      }
    }));
    console.error('Response history saver', e);
    throw new Error(e.message || e);
  }
}
window.customElements.define('response-history-saver', ResponseHistorySaver);
