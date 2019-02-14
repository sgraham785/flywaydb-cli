"use strict";

var _utils = require("./utils");

(0, _utils.getReleaseSource)().then(_utils.downloadFlywaySource).then(_utils.extractToLib).then(_utils.copyToBin).then(_utils.cleanupDirs).catch(function (reason) {
  // Handle failed request...
  console.error(`error --> ${reason}`);
});