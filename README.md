## Wechat Token - Auto Refresh Access Token

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

// force refresh access token when necessary
// this will also emit `token` event when access token updated
// so you can do retry method inside this callback function
tokenManager.refresh(function(token) {});

// make token manager start work
tokenManager.start();
```

### License
The MIT license.
