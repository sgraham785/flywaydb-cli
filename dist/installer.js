'use strict';

var _utils = require('./utils');

(0, _utils.getReleaseSource)().then(_utils.downloadFlywaySource).then(_utils.extractTolib).then(_utils.makeBinLink).then(_utils.rmTmpDir).catch(function (reason) {
  // Handle failed request...
  console.error(`error --> ${reason}`);
});