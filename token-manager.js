/* eslint-disable vars-on-top, func-names, no-param-reassign */
var request = require('request');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var querystring = require('querystring');

function TokenManager(appid, secret, retryDelay) {
  EventEmitter.call(this);

  if (!appid || !secret) {
    var error = new Error('Missing Appid or Secret');
    error.name = 'WeChatTokenError';
    throw error;
  }

  this.appid = appid;
  this.secret = secret;

  this.delay = 1;
  this.retryDelay = retryDelay || 20 * 1000;

  this.querystring = querystring.stringify({
    appid: appid,
    secret: secret,
    grant_type: 'client_credential',
  });

  this.accessTokenUri = 'https://api.weixin.qq.com/cgi-bin/token?${this.querystring}';
}

util.inherits(TokenManager, EventEmitter);

TokenManager.prototype.start = function start() {
  this.autoFetchAccessToken();
  this.emit('start');
};

TokenManager.prototype.stop = function stop() {
  process.nextTick(function () {
    // clean up
    clearTimeout(this.accessTokenTimer);
    this.refreshing = false;
    this.delay = 1;
    this.accessToken = null;
    this.emit('stop');
  }.bind(this));
};

TokenManager.prototype.retry = function retry() {
  this.delay = this.retryDelay;
  this.autoFetchAccessToken();
};

TokenManager.prototype.setAccessToken = function setAccessToken(data) {
  this.refreshing = false;
  // 将实际过期时间提前120秒
  this.delay = (data.expires_in - 120) * 1000;
  this.accessToken = data.access_token;
  this.emit('token', this.accessToken);
};

TokenManager.prototype.autoFetchAccessToken = function autoFetchAccessToken() {
  // promise only one timer
  clearTimeout(this.accessTokenTimer);
  this.accessTokenTimer = setTimeout(function () {
    request({ uri: this.accessTokenUri, json: true }, function (error, res, data) {
      if (error) {
        this.retry();
        this.emit('error', error);
        return;
      }

      if (res.statusCode !== 200) {
        error = new Error('Unexpected Status Code: ${res.statusCode}');
        error.name = 'WeChatTokenError';
        this.retry();
        this.emit('error', error);
        return;
      }

      if (data && data.errcode) {
        error = new Error(data.errmsg);
        error.name = 'WeChatTokenError';
        error.code = data.errcode;
        this.retry();
        this.emit('error', error);
        return;
      }

      this.setAccessToken(data);
      this.autoFetchAccessToken();
    }.bind(this));
  }.bind(this), this.delay);
};

// 当用户调用微信api因 access_token 失效而失败时
// 调用此接口能强制刷新 access_token
// 并在 access_token 刷新后调用传入的 callback
// 所以可以把调用失败的 method 传入
// 作为一种失败重试机制
// 保证在 access_token 刷新后再次调用
TokenManager.prototype.refresh = function refresh(callback) {
  this.once('token', callback);
  if (this.refreshing) return true;
  this.refreshing = true;
  this.delay = 1;
  this.autoFetchAccessToken();
};

module.exports = TokenManager;
