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
```
var TokenManager = require('wechat-token');

var tokenManager = new TokenManager('appid', 'secret');

var accessToken = '';

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
