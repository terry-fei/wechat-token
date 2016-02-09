Wechat Token
======
Auto Refresh Access Token

## Install
```
npm install wechat-token --save
```

## Test
```
npm install && npm test
```

## Usage
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

## License
The MIT license.
