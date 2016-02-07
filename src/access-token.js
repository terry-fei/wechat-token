import rp from 'request-promise';

export default class AccessToken {
  constructor(appid, secret, retryTime) {
    if (!appid || !secret) {
      throw new Error('Missing appid or secret');
    }

    this.appid = appid;
    this.secret = secret;
    this.retryTime = retryTime || 20 * 1000;
    this.accessTokenUrl = `https://api.weixin.qq.com/cgi-bin/token?` +
      `grant_type=client_credential&appid=${this.appid}&secret=${this.secret}`;

    // init accessToken
  }

  get accessToken() {
    return {
      access_token: this._accessToken,
    };
  }

  set accessToken(data) {
    // 将实际过期时间提前30秒，以防止临界点
    this._expireIn = (data.expires_in - 30) * 1000;
    this._expireTime = (new Date().getTime()) + this._expireIn;
    this._accessToken = data.access_token;
  }

  initAccessToken() {
    return this.fetchAccessToken()
      .then(data => {
        if (data.errcode) this.exit(data);

        this.accessToken = data;
        this.autoFetch();
      })
      .catch(this.exit);
  }

  isValid() {
    return !!this._accessToken && (new Date().getTime()) < this._expireTime;
  }

  fetchAccessToken() {
    return rp({ uri: this.accessTokenUrl, json: true });
  }

  autoFetch() {
    if (!this._expireIn) return;

    // promise only one timer
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.fetchAccessToken()
        .then(data => {
          if (data.errcode) {
            this.error = data;
            this.retry();
            return;
          }

          // clear error
          this.error = null;

          this.accessToken = data;
          this.autoFetch();
        })
        .catch(err => {
          this.error = err;
          this.retry();
          return;
        });
    }, this._expireIn);
  }

  refresh() {

  }

  retry() {
    this._expireIn = this.retryTime;
    this.autoFetch();
  }
}
