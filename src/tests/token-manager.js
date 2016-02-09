/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions, no-new */
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
        .reply(200, () => {
          latestToken = generateToken();
          return { access_token: latestToken, expires_in: 7200 };
        });

      clock = useFakeTimers();
      tokenManager = new TokenManager(appid, secret);
      tokenManager.start();
    });

    it('should throw error when not provide appid', () => {
      should.throws(() => {
        new TokenManager(null, 'secret');
      }, Error, /Missing Appid or Secret/);
    });

    it('should throw error when not provide secret', () => {
      should.throws(() => {
        new TokenManager('appid', null);
      }, Error, /Missing Appid or Secret/);
    });

    it('should init with a new access token', (done) => {
      tokenManager.once('token', (token) => {
        should(token).equal(latestToken);
        done();
      });

      clock.tick(tokenManager.delay);
    });

    it('should fetch new one when access token expired', (done) => {
      const previousToken = latestToken;

      tokenManager.once('token', (token) => {
        should(token).not.equal(previousToken);
        should(token).equal(latestToken);
        done();
      });

      clock.tick(tokenManager.delay);
    });

    after(() => {
      tokenManager.stop();
      clock.restore();
    });
  });

  describe('Network Error', () => {
    before(() => {
      nock.cleanAll();
      nock('https://api.weixin.qq.com')
        .get('/cgi-bin/token')
        .query(true)
        .replyWithError('network error');

      nock('https://api.weixin.qq.com')
        .get('/cgi-bin/token')
        .query(true)
        .reply(200, () => {
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
        .reply(200, () => {
          latestToken = generateToken();
          return { access_token: latestToken, expires_in: 7200 };
        });

      clock = useFakeTimers();
      tokenManager = new TokenManager(appid, secret);
      tokenManager.start();
    });

    it('should emit a error when occur network error', (done) => {
      tokenManager.once('error', (error) => {
        should.exist(error);
        done();
      });

      clock.tick(tokenManager.delay);
    });

    it('should retry when occured network error after retryDelay second', (done) => {
      const previousToken = latestToken;
      should(tokenManager.delay).equal(tokenManager.retryDelay);

      tokenManager.once('token', (token) => {
        should(token).not.equal(previousToken);
        should(token).equal(latestToken);
        done();
      });

      clock.tick(tokenManager.delay);
    });

    it('should emit a error when return unexpected status code', (done) => {
      tokenManager.once('error', (error) => {
        should.exist(error);
        done();
      });

      clock.tick(tokenManager.delay);
    });

    it('should retry when occured network error after retryDelay second', (done) => {
      const previousToken = latestToken;
      should(tokenManager.delay).equal(tokenManager.retryDelay);

      tokenManager.once('token', (token) => {
        should(token).not.equal(previousToken);
        should(token).equal(latestToken);
        done();
      });

      clock.tick(tokenManager.delay);
    });

    after(() => {
      tokenManager.stop();
      clock.restore();
    });
  });

  describe('Wechat Errcode', () => {
    before(() => {
      nock.cleanAll();
      nock('https://api.weixin.qq.com')
        .get('/cgi-bin/token')
        .query(true)
        .reply(200, () => ({ errcode: 1, errmsg: 'wechat api error' }));

      nock('https://api.weixin.qq.com')
        .get('/cgi-bin/token')
        .query(true)
        .reply(200, () => {
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

    it('should retry when occured errcode error after retryDelay second', (done) => {
      const previousToken = latestToken;
      should(tokenManager.delay).equal(tokenManager.retryDelay);

      tokenManager.once('token', (token) => {
        should(token).not.equal(previousToken);
        should(token).equal(latestToken);
        done();
      });

      clock.tick(tokenManager.delay);
    });

    after(() => {
      tokenManager.stop();
      clock.restore();
    });
  });

  describe('Custom retryDelay', () => {
    const customRetryDelay = 10;
    before(() => {
      nock.cleanAll();
      nock('https://api.weixin.qq.com')
        .get('/cgi-bin/token')
        .query(true)
        .reply(200, () => ({ errcode: 1, errmsg: 'wechat api error' }));

      clock = useFakeTimers();
      tokenManager = new TokenManager(appid, secret, customRetryDelay);
      tokenManager.start();
    });

    it('should replace default retryDelay', (done) => {
      tokenManager.once('error', (error) => {
        should.exist(error);
        should(error.name).equal('WeChatTokenError');
        should(error.code).equal(1);
        should(tokenManager.delay).equal(customRetryDelay);
        done();
      });

      clock.tick(tokenManager.delay);
    });

    after(() => {
      tokenManager.stop();
      clock.restore();
    });
  });

  describe('Refresh', () => {
    before(() => {
      nock.cleanAll();
      nock('https://api.weixin.qq.com')
        .get('/cgi-bin/token')
        .query(true)
        .times(2)
        .reply(200, () => {
          latestToken = generateToken();
          return { access_token: latestToken, expires_in: 7200 };
        });

      clock = useFakeTimers();
      tokenManager = new TokenManager(appid, secret);
      tokenManager.start();
    });

    // it('should init with a new access token', (done) {
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

    after(() => {
      tokenManager.stop();
      clock.restore();
    });
  });
});
