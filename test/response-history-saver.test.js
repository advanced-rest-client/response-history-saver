import { fixture, assert, html, aTimeout } from '@open-wc/testing';
import * as sinon from 'sinon/pkg/sinon-esm.js';
import { DataGenerator } from '@advanced-rest-client/arc-data-generator/arc-data-generator.js';
import '@advanced-rest-client/arc-models/request-model.js';
import '../response-history-saver.js';
/* global PouchDB */

describe('<response-history-saver>', function() {
  async function basicFixture() {
    return await fixture(`<response-history-saver></response-history-saver>`);
  }

  async function modelFixture() {
    const element = await fixture(html`
      <div>
      <request-model></request-model>
      <response-history-saver></response-history-saver>
      </div>
    `);
    return element.querySelector('response-history-saver');
  }

  describe('_computeHistoryStoreUrl()', function() {
    let element;
    before(async () => {
      element = await basicFixture();
    });

    it('Returns undefined for missing argument', function() {
      const result = element._computeHistoryStoreUrl();
      assert.isUndefined(result);
    });

    it('Normalizes url for domain', function() {
      const url = 'https://domain.com';
      const result = element._computeHistoryStoreUrl(url);
      assert.equal(result, url + '/');
    });

    it('Normalizes url for resource', function() {
      const url = 'https://domain.com/path';
      const result = element._computeHistoryStoreUrl(url);
      assert.equal(result, url);
    });

    it('Normalizes url for path', function() {
      const url = 'https://domain.com/path/';
      const result = element._computeHistoryStoreUrl(url);
      assert.equal(result, url);
    });

    it('Normalizes url for query parameters', function() {
      const url = 'https://domain.com/path/';
      const result = element._computeHistoryStoreUrl(url + '?a=b');
      assert.equal(result, url);
    });

    it('Normalizes url for resource and query parameters', function() {
      const url = 'https://domain.com/path';
      const result = element._computeHistoryStoreUrl(url + '?a=b');
      assert.equal(result, url);
    });

    it('Normalizes url for domain and query parameters', function() {
      const url = 'https://domain.com/';
      const result = element._computeHistoryStoreUrl(url + '?a=b');
      assert.equal(result, url);
    });

    it('Normalizes url for hash', function() {
      const url = 'https://domain.com/';
      const result = element._computeHistoryStoreUrl(url + '#abc');
      assert.equal(result, url);
    });

    it('Normalizes url for hash and query parameters', function() {
      const url = 'https://domain.com/';
      const result = element._computeHistoryStoreUrl(url + '?a=b#abc');
      assert.equal(result, url);
    });
  });

  describe('_computePayloadSize()', function() {
    let element;
    before(async () => {
      element = await basicFixture();
    });

    it('Returns 0 for empty argument', function() {
      const result = element._computePayloadSize();
      assert.equal(result, 0);
    });

    it('Returns size of a buffer', function() {
      const buffer = new ArrayBuffer(8);
      const result = element._computePayloadSize(buffer);
      assert.equal(result, 8);
    });

    it('Returns size of a blob', function() {
      const blob = new Blob(['test']);
      const result = element._computePayloadSize(blob);
      assert.equal(result, 4);
    });

    it('Returns size of a string', function() {
      const blob = 'test';
      const result = element._computePayloadSize(blob);
      assert.equal(result, 4);
    });
  });

  describe('_calculateBytes()', function() {
    let element;
    before(async () => {
      element = await basicFixture();
    });

    it('Returns 0 for empty argument', function() {
      const result = element._calculateBytes();
      assert.equal(result, 0);
    });

    it('Returns 0 for non string argument', function() {
      const blob = new Blob(['test']);
      const result = element._calculateBytes(blob);
      assert.equal(result, 0);
    });

    it('Returns size of a string', function() {
      const blob = 'test';
      const result = element._calculateBytes(blob);
      assert.equal(result, 4);
    });

    it('Returns size of a string with non-latin', function() {
      const blob = 'ł';
      const result = element._calculateBytes(blob);
      assert.equal(result, 2);
    });
  });

  describe('_computeHistoryDataId()', function() {
    let element;
    const URL = 'https://api.domain.com/endpoint';
    const METHOD = 'GET';
    let id;
    before(async () => {
      element = await basicFixture();
      id = element._computeHistoryDataId(URL, METHOD);
    });

    it('Contains 3 parts', function() {
      assert.lengthOf(id.split('/'), 3);
    });

    it('Part 1 is URL endoded url', function() {
      const encoded = id.split('/')[0];
      assert.equal(encoded, encodeURIComponent(URL));
    });

    it('Part 2 is method', function() {
      const encoded = id.split('/')[1];
      assert.equal(encoded, METHOD);
    });

    it('Part 3 is UUID', function() {
      const uuid = id.split('/')[2];
      assert.match(uuid, /[a-f0-9]{8}-([a-f0-9]{4}-){3}[a-f0-9]{12}/);
    });
  });

  describe('_computePayloadString()', function() {
    let element;
    before(async () => {
      element = await basicFixture();
    });

    function getBuffer() {
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      for (let i = 0; i < 8; i++) {
        view.setInt8(i, 42);
      }
      return buffer;
    }

    const string = '********';

    it('Returns string for ArrayBuffer', function() {
      const result = element._computePayloadString(getBuffer());
      assert.equal(result, string);
    });
  });

  describe('_computeStartTime()', function() {
    let element;
    before(async () => {
      element = await basicFixture();
    });

    it('Computes time from undefined argument', function() {
      const result = element._computeStartTime();
      assert.isAbove(result, 0);
    });

    it('Computes time from missing property', function() {
      const result = element._computeStartTime({});
      assert.isAbove(result, 0);
    });

    it('Computes time from set time', function() {
      const t = Date.now();
      const result = element._computeStartTime({
        startTime: t
      });
      assert.equal(result, t);
    });
  });

  describe('_handleException()', function() {
    let element;
    before(async () => {
      element = await basicFixture();
    });

    const err = new Error('test');

    it('Throws an exception', function() {
      assert.throws(function() {
        element._handleException(err);
      });
    });

    it('Fires send-analytics custom event', function() {
      const spy = sinon.spy();
      element.addEventListener('send-analytics', spy);
      try {
        element._handleException(err);
      } catch (e) {
        // ,,,
      }
      assert.isTrue(spy.called);
    });
  });

  describe('Saving history data', function() {
    let element;
    let request;
    let response;
    let timings;
    function initVariables() {
      request = {
        url: 'https://domain.com/path/?query=value',
        method: 'POST',
        payload: 'hello world',
        headers: 'content-type: text/plain\ncontent-length: 11'
      };
      response = {
        status: 218,
        statusText: 'OK TEST',
        headers: 'x-test: true',
        payload: 'test-response'
      };
      timings = {
        connect: 2.008,
        receive: 24.1769,
        send: 96.1234,
        ssl: 11,
        wait: 54.512,
        startTime: 1499427973215
      };
    }

    describe('_createHistoryDataModel()', function() {
      let model;
      beforeEach(async () => {
        element = await basicFixture();
        initVariables();
        model = element._createHistoryDataModel(request, response, timings);
      });

      it('Model has _id', function() {
        assert.typeOf(model._id, 'string');
      });

      it('_id has no "undefined" properties', function() {
        assert.isTrue(model._id.indexOf('undefined') === -1);
      });

      it('Does not contain _rev', function() {
        assert.isUndefined(model._rev);
      });

      it('Has timings', function() {
        assert.typeOf(model.timings, 'object');
      });

      it('Timings are computed according to HAR 1.2 spec', function() {
        const allowedKeys = ['blocked', 'dns', 'connect', 'send', 'wait',
          'receive', 'ssl'];
        const keys = Object.keys(model.timings);
        const otherKeys = keys.some((key) => allowedKeys.indexOf(key) === -1);
        assert.isFalse(otherKeys);
      });

      it('Timings have values', function() {
        const keys = Object.keys(model.timings);
        const otherKeys = keys.some((key) => model.timings[key] === -1);
        assert.isFalse(otherKeys);
      });

      it('Has totalTime', function() {
        assert.typeOf(model.totalTime, 'number', 'totalTime is a number');
        assert.isAbove(model.totalTime, -1, 'totalTime is greather than -1');
      });

      it('Has created', function() {
        assert.typeOf(model.created, 'number', 'totalTime is a number');
        assert.equal(model.created, timings.startTime, 'totalTime equals passed timings value');
      });

      it('Has request', function() {
        assert.typeOf(model.request, 'object');
      });

      it('Has request.headers', function() {
        assert.typeOf(model.request.headers, 'string');
      });

      it('Has request.payload', function() {
        assert.typeOf(model.request.payload, 'string');
      });

      it('Has request.url', function() {
        assert.typeOf(model.request.url, 'string');
        assert.equal(model.request.url, request.url);
      });

      it('Has request.method', function() {
        assert.typeOf(model.request.method, 'string');
        assert.equal(model.request.method, request.method);
      });

      it('Has response', function() {
        assert.typeOf(model.response, 'object');
      });

      it('Has response.statusCode', function() {
        assert.typeOf(model.response.statusCode, 'number');
        assert.equal(model.response.statusCode, response.status);
      });

      it('Has response.statusText', function() {
        assert.typeOf(model.response.statusText, 'string');
        assert.equal(model.response.statusText, response.statusText);
      });

      it('Has response.headers', function() {
        assert.typeOf(model.response.headers, 'string');
      });

      it('Has response.payload', function() {
        assert.typeOf(model.response.payload, 'string');
      });

      it('Has stats', function() {
        assert.typeOf(model.stats, 'object');
      });

      it('Has stats.request', function() {
        assert.typeOf(model.stats.request, 'object');
      });

      it('Has stats.request.headersSize', function() {
        assert.typeOf(model.stats.request.headersSize, 'number');
        assert.equal(model.stats.request.headersSize, 43);
      });

      it('Has stats.request.requestPayloadSize', function() {
        assert.typeOf(model.stats.request.payloadSize, 'number');
        assert.equal(model.stats.request.payloadSize, 11);
      });

      it('Has stats.response', function() {
        assert.typeOf(model.stats.response, 'object');
      });

      it('Has stats.response.headersSize', function() {
        assert.typeOf(model.stats.response.headersSize, 'number');
        assert.equal(model.stats.response.headersSize, 12);
      });

      it('Has stats.response.requestPayloadSize', function() {
        assert.typeOf(model.stats.response.payloadSize, 'number');
        assert.equal(model.stats.response.payloadSize, 13);
      });
    });

    describe('_createHistoryDataModel() with payload', function() {
      let model;
      beforeEach(async () => {
        element = await basicFixture();
        request = {
          url: 'https://domain.com/path/?query=value',
          method: 'POST',
          payload: '********',
          headers: 'content-type: plain/text\ncontent-length: 8'
        };
        response = {
          status: 218,
          statusText: 'OK TEST',
          payload: '********',
          headers: 'content-type: plain/text\ncontent-length: 8\nconnection: close'
        };
        model = element._createHistoryDataModel(request, response);
      });

      it('Has stats.request.headersSize', function() {
        assert.typeOf(model.stats.request.headersSize, 'number');
        assert.equal(model.stats.request.headersSize, 42);
      });

      it('Has stats.request.requestPayloadSize', function() {
        assert.typeOf(model.stats.request.payloadSize, 'number');
        assert.equal(model.stats.request.payloadSize, 8);
      });

      it('Has stats.response.headersSize', function() {
        assert.typeOf(model.stats.response.headersSize, 'number');
        assert.equal(model.stats.response.headersSize, 60);
      });

      it('Has stats.response.requestPayloadSize', function() {
        assert.typeOf(model.stats.response.payloadSize, 'number');
        assert.equal(model.stats.response.payloadSize, 8);
      });
    });

    describe('_saveHistoryData()', function() {
      after(async () => {
        await new PouchDB('history-data').destroy();
      });

      before(async () => {
        element = await basicFixture();
        initVariables();
      });

      it('Saves model to the datastore', async () => {
        const rsp = await element._saveHistoryData(request, response, timings)
        assert.isTrue(rsp.ok);
      });
    });
  });

  describe('Saving history request data', function() {
    let element;
    let request;
    let timings;
    function initVariables() {
      request = {
        url: 'https://domain.com/path/?query=value',
        method: 'POST',
        payload: 'hello world',
        headers: 'content-type: text/plain\ncontent-length: 11'
      };
      timings = {
        connect: 2.008,
        receive: 24.1769,
        send: 96.1234,
        ssl: 11,
        wait: 54.512,
        startTime: 1499427973215
      };
    }

    describe('_updateHistory()', function() {
      after(async () => {
        await DataGenerator.destroyHistoryData();
      });

      beforeEach(async () => {
        element = await modelFixture();
        initVariables();
      });

      let insertedObject;
      it('Saves new model to the datastore', async () => {
        const doc = await element._updateHistory(request, timings)
        insertedObject = doc;
        assert.isDefined(doc._id);
        assert.isDefined(doc._rev);
      });

      it('Updates existing model in the datastore', async () => {
        const doc = await element._updateHistory(request, timings)
        assert.equal(doc._id, insertedObject._id);
        assert.notEqual(doc._rev, insertedObject._rev);
      });
    });
  });

  describe('Saving history request data', function() {
    after(async () => {
      await DataGenerator.destroyHistoryData();
    });

    let element;
    let detail;
    function initVariables() {
      detail = {
        isXhr: false,
        request: {
          url: 'http://serwisy.gazeta.pl/aliasy/rss_hp/wiadomosci.xml',
          method: 'GET',
          headers: 'accept: application/xml',
          id: 'be2d8f61-df5a-4caa-bae3-c7a3ded161c4'
        },
        isError: false,
        response: {
          status: 200,
          statusText: 'OK',
          headers: 'Date: Thu, 18 Apr 2019 20:20:42 GMT\r\n' +
            'Server: Apache\r\nLast-Modified: Tue, 23 Jun 2015 09:50:01 GMT\r\n' +
            'Accept-Ranges: bytes\r\nContent-Length: 726\r\nVary: Accept-Encoding,' +
            'User-Agent\r\nContent-Type: application/xml',
          url: 'http://serwisy.gazeta.pl/aliasy/rss_hp/wiadomosci.xml',
          payload: 'test-payload',
          stats: {
            connect: 269.00000000023283,
            receive: 0.8000000088941306,
            send: 0.29999998514540493,
            wait: 271.8999999924563,
            dns: 1.0999999940395355,
            ssl: -1
          }
        },
        sentHttpMessage: 'GET /aliasy/rss_hp/wiadomosci.xml HTTP/1.1\r\nHost: serwisy.gazeta.pl\r\n\r\n',
        loadingTime: 543.0999999807682,
        timing: {
          dns: 1.0999999940395355,
          connect: 269.00000000023283,
          receive: 0.8000000088941306,
          send: 0.29999998514540493,
          ssl: -1,
          wait: 271.8999999924563
        },
        id: 'be2d8f61-df5a-4caa-bae3-c7a3ded161c4'
      };
    }

    describe('_afterRequestHandler()', function() {
      beforeEach(async () => {
        element = await modelFixture();
        initVariables();
      });

      function dispatch() {
        const e = new CustomEvent('api-response', {
          bubbles: true,
          detail
        });
        document.body.dispatchEvent(e);
      }

      it('Eventually calls saveHistory()', async () => {
        const spy = sinon.spy(element, 'saveHistory');
        dispatch();
        await aTimeout(100);
        assert.isTrue(spy.called);
      });

      it('Inserts data into the store', async () => {
        dispatch();
        await aTimeout(100);
        const docs = await element._dbData.allDocs({
          include_docs: true
        });
        const doc = docs.rows.pop().doc;
        assert.equal(doc.totalTime, 541.9999999867287);
        assert.deepEqual(doc.timings, {
          connect: 269.00000000023283,
          receive: 0.8000000088941306,
          send: 0.29999998514540493,
          ssl: -1,
          wait: 271.8999999924563
        });
        assert.deepEqual(doc.request, {
          headers: 'accept: application/xml',
          method: 'GET',
          payload: '',
          url: 'http://serwisy.gazeta.pl/aliasy/rss_hp/wiadomosci.xml'
        });
        assert.deepEqual(doc.response, {
          headers: 'Date: Thu, 18 Apr 2019 20:20:42 GMT\r\n' +
            'Server: Apache\r\nLast-Modified: Tue, 23 Jun 2015 09:50:01 GMT\r\n' +
            'Accept-Ranges: bytes\r\nContent-Length: 726\r\nVary: Accept-Encoding,' +
            'User-Agent\r\nContent-Type: application/xml',
          payload: 'test-payload',
          statusCode: 200,
          statusText: 'OK'
        });
        assert.deepEqual(doc.stats.request, {
          headersSize: 23,
          payloadSize: 0
        });
        assert.deepEqual(doc.stats.response, {
          headersSize: 205,
          payloadSize: 12
        });
      });
    });
  });

  describe('_arrayBufferToString()', () => {
    let element;
    before(async () => {
      element = await basicFixture();
    });

    function getView(str) {
      const buf = new ArrayBuffer(str.length);
      const bufView = new Uint8Array(buf);
      for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
      }
      return bufView;
    }

    function str2ab(str) {
      const buf = new ArrayBuffer(str.length);
      const bufView = new Uint8Array(buf);
      for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
      }
      return buf;
    }

    it('Coverts array buffer to string', () => {
      const ab = str2ab('test');
      const result = element._arrayBufferToString(ab);
      assert.equal(result, 'test');
    });

    it('Coverts Uint array to string', () => {
      const ab = getView('test');
      const result = element._arrayBufferToString(ab);
      assert.equal(result, 'test');
    });
  });

  describe('a11y', () => {
    it('is accessible', async () => {
      const element = await basicFixture();
      await assert.isAccessible(element);
    });
  });
});
