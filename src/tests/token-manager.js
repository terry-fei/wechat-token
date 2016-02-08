/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */
import should from 'should';
import nock from 'nock';
import { useFakeTimers } from 'sinon';

import TokenManager from '../token-manager';

const { describe, before, it, after } = global;

const appid = 'whatever';
const secret = 'whatever';

const generateToken = () => Math.floor(Math.random() * 1e5);

describe('Token Manager', () => {
  let clock;
  let tokenManager;
  let latestToken;

  describe('Base function', () => {
    before(() => {
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
      // expect(TokenManager).to.throw(Error);
    });

    it('should init with a new access token', function (done) {
      tokenManager.once('token', (token) => {
        should(token).equal(latestToken);
        done();
      });

      clock.tick(tokenManager.delay);
    });

    it('access token expired should fetch new one', function (done) {
      const previousToken = latestToken;

      tokenManager.once('token', (token) => {
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

  describe('Network Error', () => {
    before(() => {
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

      clock = useFakeTimers();
      tokenManager = new TokenManager(appid, secret);
      tokenManager.start();
    });

    it('should emit a error when occur network error', function (done) {
      tokenManager.once('error', (error) => {
        should.exist(error);
        done();
      });

      clock.tick(tokenManager.delay);
    });

    it('should retry when occured network error after retryDelay second', function (done) {
      const previousToken = latestToken;
      should(this.delay).equal(this.retryDelay);

      tokenManager.once('token', (token) => {
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

  describe('Wechat Errcode', () => {
    before(() => {
      nock('https://api.weixin.qq.com')
        .get('/cgi-bin/token')
        .query(true)
        .reply(200, function () {
          return { errcode: 1, errmsg: 'wechat api error' };
        });

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

    it('should emit error when wechat server return errcode', (done) => {
      tokenManager.once('error', (error) => {
        should.exist(error);
        should(error.name).equal('WeChatTokenError');
        should(error.code).equal(1);
        done();
      });

      clock.tick(tokenManager.delay);
    });

    it('should retry when occured errcode error after retryDelay second', function (done) {
      const previousToken = latestToken;
      should(this.delay).equal(this.retryDelay);

      tokenManager.once('token', (token) => {
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

  describe('Refresh', () => {
    before(() => {
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

    // it('should init with a new access token', function (done) {
    //   tokenManager.once('token', (token) => {
    //     should(token).equal(latestToken);
    //     done();
    //   });
    //
    //   clock.tick(tokenManager.delay);
    // });

    it('should refresh access token', (done) => {
      tokenManager.refresh((token) => {
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
});
