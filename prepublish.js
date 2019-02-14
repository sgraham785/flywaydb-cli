const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const { closeSync, openSync } = require("fs");

const touch = filename => closeSync(openSync(filename, "w"));
const binDir = path.join(__dirname, "bin");

if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir);
} else {
  rimraf.sync(binDir);
  fs.mkdirSync(binDir);
}
// usage
touch("./bin/flyway");
touch("./bin/flyway.cmd");

console.log("done");
