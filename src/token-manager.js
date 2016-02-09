import request from 'request';
import { EventEmitter } from 'events';
import { stringify as queryStringify } from 'querystring';

export default class TokenManager extends EventEmitter {
  constructor(appid, secret, retryDelay) {
    super();

    if (!appid || !secret) {
      const error = new Error('Missing Appid or Secret');
      error.name = 'WeChatTokenError';
      throw error;
    }

    this.appid = appid;
    this.secret = secret;

    this.delay = 1;
    this.retryDelay = retryDelay || 20 * 1000;

    this.query = {
      appid, secret,
      grant_type: 'client_credential',
    };

    this.accessTokenUri = `https://api.weixin.qq.com/cgi-bin/token?${queryStringify(this.query)}`;
  }

  start() {
    this.autoFetchAccessToken();
    this.emit('start');
  }

  stop() {
    process.nextTick(() => {
      // clean up
      clearTimeout(this.accessTokenTimer);
      this.refreshing = false;
      this.delay = 1;
      this.accessToken = null;
      this.emit('stop');
    });
  }

  retry() {
    this.delay = this.retryDelay;
    this.autoFetchAccessToken();
  }

  setAccessToken(data) {
    this.refreshing = false;
    // 将实际过期时间提前120秒
    this.delay = (data.expires_in - 120) * 1000;
    this.accessToken = data.access_token;
    this.emit('token', this.accessToken);
  }

  autoFetchAccessToken() {
    // promise only one timer
    clearTimeout(this.accessTokenTimer);
    this.accessTokenTimer = setTimeout(() => {
      request({ uri: this.accessTokenUri, json: true }, (err, res, data) => {
        if (err) {
          this.retry();
          this.emit('error', err);
          return;
        }

        if (res.statusCode !== 200) {
          const error = new Error(`Unexpected Status Code: ${res.statusCode}`);
          error.name = 'WeChatTokenError';
          this.retry();
          this.emit('error', error);
          return;
        }

        if (data && data.errcode) {
          const error = new Error(data.errmsg);
          error.name = 'WeChatTokenError';
          error.code = data.errcode;
          this.retry();
          this.emit('error', error);
          return;
        }

        this.setAccessToken(data);
        this.autoFetchAccessToken();
      });
    }, this.delay);
  }

  // 当用户调用微信api因 access_token 失效而失败时
  // 调用此接口能强制刷新 access_token
  // 并在 access_token 刷新后调用传入的 callback
  // 所以可以把调用失败的 method 传入
  // 作为一种失败重试机制
  // 保证在 access_token 刷新后再次调用
  refresh(callback) {
    this.once('token', callback);
    if (this.refreshing) return;
    this.refreshing = true;
    this.delay = 1;
    this.autoFetchAccessToken();
  }
}
