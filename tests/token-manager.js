/* eslint-disable vars-on-top, func-names, no-new */
var should = require('should');
var nock = require('nock');
var useFakeTimers = require('sinon').useFakeTimers;

var TokenManager = require('../token-manager');

var describe = global.describe;
var before = global.before;
var after = global.after;
var it = global.it;

var appid = 'whatever';
var secret = 'whatever';

function generateToken() {
  return Math.floor(Math.random() * 1e5);
}

describe('Token Manager', function () {
  var clock;
  var tokenManager;
  var latestToken;

  describe('Base function', function () {
    before(function () {
      nock('https://api.weixin.qq.com')
        .get('/cgi-bin/token')
        .query(true)
        .times(2)
        .reply(200, function () {
          latestToken = generateToken();
          return { access_token: latestToken, expires_in: 7200 };
        });

      clock = useFakeTimers();
      tokenManager = new TokenManager(appid, secret);
      tokenManager.start();
    });

    it('should throw error when not provide appid', function () {
      should.throws(function () {
        new TokenManager(null, 'secret');
      }, Error, /Missing Appid or Secret/);
    });

    it('should throw error when not provide secret', function () {
      should.throws(function () {
        new TokenManager('appid', null);
      }, Error, /Missing Appid or Secret/);
    });

    it('should init with a new access token', function (done) {
      tokenManager.once('token', function (token) {
        should(token).equal(latestToken);
        done();
      });

      clock.tick(tokenManager.delay);
    });

    it('should fetch new one when access token expired', function (done) {
      var previousToken = latestToken;

      tokenManager.once('token', function (token) {
        should(token).not.equal(previousToken);
        should(token).equal(latestToken);
        done();
      });

      clock.tick(tokenManager.delay);
    });

    after(function () {
      tokenManager.stop();
      clock.restore();
    });
  });

  describe('Network Error', function () {
    before(function () {
      nock.cleanAll();
      nock('https://api.weixin.qq.com')
        .get('/cgi-bin/token')
        .query(true)
        .replyWithError('network error');

      nock('https://api.weixin.qq.com')
        .get('/cgi-bin/token')
        .query(true)
        .reply(200, function () {
          latestToken = generateToken();
          return { access_token: latestToken, expires_in: 7200 };
        });

      nock('https://api.weixin.qq.com')
        .get('/cgi-bin/token')
        .query(true)
        .reply(404, 'Not Found');

      nock('https://api.weixin.qq.com')
        .get('/cgi-bin/token')
        .query(true)
        .reply(200, function () {
          latestToken = generateToken();
          return { access_token: latestToken, expires_in: 7200 };
        });

      clock = useFakeTimers();
      tokenManager = new TokenManager(appid, secret);
      tokenManager.start();
    });

    it('should emit a error when occur network error', function (done) {
      tokenManager.once('error', function (error) {
        should.exist(error);
        done();
      });

      clock.tick(tokenManager.delay);
    });

    it('should retry when occured network error after retryDelay second', function (done) {
      var previousToken = latestToken;
      should(tokenManager.delay).equal(tokenManager.retryDelay);

      tokenManager.once('token', function (token) {
        should(token).not.equal(previousToken);
        should(token).equal(latestToken);
        done();
      });

      clock.tick(tokenManager.delay);
    });

    it('should emit a error when return unexpected status code', function (done) {
      tokenManager.once('error', function (error) {
        should.exist(error);
        done();
      });

      clock.tick(tokenManager.delay);
    });

    it('should retry when occured network error after retryDelay second', function (done) {
      var previousToken = latestToken;
      should(tokenManager.delay).equal(tokenManager.retryDelay);

      tokenManager.once('token', function (token) {
        should(token).not.equal(previousToken);
        should(token).equal(latestToken);
        done();
      });

      clock.tick(tokenManager.delay);
    });

    after(function () {
      tokenManager.stop();
      clock.restore();
    });
  });

  describe('Wechat Errcode', function () {
    before(function () {
      nock.cleanAll();
      nock('https://api.weixin.qq.com')
        .get('/cgi-bin/token')
        .query(true)
        .reply(200, function () {
          return { errcode: 1, errmsg: 'wechat api error' };
        });

      nock('https://api.weixin.qq.com')
        .get('/cgi-bin/token')
        .query(true)
        .reply(200, function () {
          latestToken = generateToken();
          return { access_token: latestToken, expires_in: 7200 };
        });

      clock = useFakeTimers();
      tokenManager = new TokenManager(appid, secret);
      tokenManager.start();
    });

    it('should emit error when wechat server return errcode', function (done) {
      tokenManager.once('error', function (error) {
        should.exist(error);
        should(error.name).equal('WeChatTokenError');
        should(error.code).equal(1);
        done();
      });

      clock.tick(tokenManager.delay);
    });

    it('should retry when occured errcode error after retryDelay second', function (done) {
      var previousToken = latestToken;
      should(tokenManager.delay).equal(tokenManager.retryDelay);

      tokenManager.once('token', function (token) {
        should(token).not.equal(previousToken);
        should(token).equal(latestToken);
        done();
      });

      clock.tick(tokenManager.delay);
    });

    after(function () {
      tokenManager.stop();
      clock.restore();
    });
  });

  describe('Custom retryDelay', function () {
    var customRetryDelay = 10;
    before(function () {
      nock.cleanAll();
      nock('https://api.weixin.qq.com')
        .get('/cgi-bin/token')
        .query(true)
        .reply(200, function () {
          return { errcode: 1, errmsg: 'wechat api error' };
        });

      clock = useFakeTimers();
      tokenManager = new TokenManager(appid, secret, customRetryDelay);
      tokenManager.start();
    });

    it('should replace default retryDelay', function (done) {
      tokenManager.once('error', function (error) {
        should.exist(error);
        should(error.name).equal('WeChatTokenError');
        should(error.code).equal(1);
        should(tokenManager.delay).equal(customRetryDelay);
        done();
      });

      clock.tick(tokenManager.delay);
    });

    after(function () {
      tokenManager.stop();
      clock.restore();
    });
  });

  describe('Refresh', function () {
    before(function () {
      nock.cleanAll();
      nock('https://api.weixin.qq.com')
        .get('/cgi-bin/token')
        .query(true)
        .times(2)
        .reply(200, function () {
          latestToken = generateToken();
          return { access_token: latestToken, expires_in: 7200 };
        });

      clock = useFakeTimers();
      tokenManager = new TokenManager(appid, secret);
      tokenManager.start();
    });

    it('should refresh access token', function (done) {
      tokenManager.refresh(function (token) {
        should(token).equal(latestToken);
        done();
      });

      clock.tick(tokenManager.delay);
    });

    it('should not refresh access token when refreshing access token', function (done) {
      tokenManager.refresh(function (token) {
        should(token).equal(latestToken);
        done();
      });

      var refreshing = tokenManager.refresh(function () {});
      should(refreshing).equal(true);

      clock.tick(tokenManager.delay);
    });

    after(function () {
      tokenManager.stop();
      clock.restore();
    });
  });
});
