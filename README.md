## Wechat Token - Auto Refresh Access Token Manager

[![NPM version](https://badge.fury.io/js/wechat-token.png)](http://badge.fury.io/js/wechat-token)
[![Build Status](https://travis-ci.org/feit/wechat-token.png?branch=master)](https://travis-ci.org/feit/wechat-token)
[![Dependencies Status](https://david-dm.org/feit/wechat-token.png)](https://david-dm.org/feit/wechat-token)
[![Coverage Status](https://coveralls.io/repos/github/feit/wechat-token/badge.svg?branch=master)](https://coveralls.io/github/feit/wechat-token?branch=master)

### Install
```
npm install wechat-token --save
```

### Test
```
npm install && npm test
```

### Usage
```js
var TokenManager = require('wechat-token');

var tokenManager = new TokenManager('appid', 'secret');

var accessToken = '';

// 在刷新过程中，公众平台后台会保证在刷新短时间内
// 新老access_token都可用，这保证了第三方业务的平滑过渡
tokenManager.on('token', function(token) {
  accessToken = token;
});

tokenManager.on('error' function(error) {
  // maybe network error or wechat return errcode
  console.error(error);
});

// 当用户调用微信api因 access_token 失效而失败时
// 调用此接口能强制刷新 access_token
// 并在 access_token 刷新后调用传入的 callback
// 所以可以把调用失败的 method 传入
// 作为一种失败重试机制
// 保证在 access_token 刷新后再次调用
tokenManager.refresh(function(token) {});

// make token manager start work
tokenManager.start();
```

### 错误重试机制
当获取`access_token`发生网络错误，或者是微信服务器返回了`errcode`时
Token Manager 会默认在20秒后重新尝试获取`access_token`
你可以在TokenManager构造函数的第三个参数修改默认重试等待时间，单位秒

### License
The MIT license.
