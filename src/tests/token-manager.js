/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */
import 'should';
import nock from 'nock';
import { useFakeTimers } from 'sinon';

import TokenManager from '../token-manager';

const { describe, before, it, after } = global;

const appid = 'whatever';
const secret = 'whatever';

describe('Token Manager', function () {
  let clock;
  let tokenManager;
  let latestToken;
  let requestTimes = 0;

  before(function () {
    nock('https://api.weixin.qq.com')
      .get('/cgi-bin/token')
      .query(true)
      .times(100)
      .reply(200, function () {
        latestToken = `${Math.floor(Math.random() * 1e5)}`;
        return { access_token: latestToken, expires_in: 7200 };
      });

    clock = useFakeTimers();
    tokenManager = new TokenManager(appid, secret);
    tokenManager.on('token', () => requestTimes += 1);
    tokenManager.start();
  });

  after(function () {
    tokenManager.stop();
    clock.restore();
  });

  it('shoule throw error when not provide appid', function () {
    // expect(TokenManager).to.throw(Error);
  });

  it('should init with a new access token', function (done) {
    tokenManager.once('token', (token) => {
      token.should.equal(latestToken);
      done();
    });

    clock.tick(tokenManager.delay);
  });

  it('access token expired should fetch new one', function (done) {
    const previousToken = latestToken;

    tokenManager.once('token', (token) => {
      token.should.not.equal(previousToken);
      done();
    });

    clock.tick(tokenManager.delay);
  });
});
