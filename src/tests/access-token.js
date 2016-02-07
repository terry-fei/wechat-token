const { describe, before, it } = global;

import { expect } from 'chai';
import nock from 'nock';

const appid = 'anyappid';
const secret = 'anysecret';

describe('Access Token', () => {
  describe('Init', () => {
    before(() => {
      nock('https://api.weixin.qq.com')
        .get(`cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`)
        .reply(200, { access_token: 'anytoken', expires_in: 7200 });
    });

    it('');
  });
});
