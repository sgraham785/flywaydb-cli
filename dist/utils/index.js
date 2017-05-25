'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.rmTmpDir = exports.makeBinLink = exports.extractTolib = exports.downloadFlywaySource = exports.getReleaseSource = undefined;

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _requestPromise = require('request-promise');

var _requestPromise2 = _interopRequireDefault(_requestPromise);

var _requestProgress = require('request-progress');

var _requestProgress2 = _interopRequireDefault(_requestProgress);

var _progress = require('progress');

var _progress2 = _interopRequireDefault(_progress);

var _extractZip = require('extract-zip');

var _extractZip2 = _interopRequireDefault(_extractZip);

var _child_process = require('child_process');

var _filesize = require('filesize');

var _filesize2 = _interopRequireDefault(_filesize);

var _rimraf = require('rimraf');

var _rimraf2 = _interopRequireDefault(_rimraf);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const env = process.env;

const repoBaseUrl = 'https://repo1.maven.org/maven2/org/flywaydb/flyway-commandline';

/**
 * @returns sources[os.platform()]
 */
const getReleaseSource = exports.getReleaseSource = () => (0, _requestPromise2.default)({
  uri: `${repoBaseUrl}/maven-metadata.xml`
}).then(response => {
  let releaseRegularExp = new RegExp('<release>(.+)</release>');
  let releaseVersion = response.match(releaseRegularExp)[1];

  let sources = {
    'win32': {
      url: `${repoBaseUrl}/${releaseVersion}/flyway-commandline-${releaseVersion}-windows-x64.zip`,
      filename: `flyway-commandline-${releaseVersion}-windows-x64.zip`,
      folder: `flyway-${releaseVersion}`
    },
    'linux': {
      url: `${repoBaseUrl}/${releaseVersion}/flyway-commandline-${releaseVersion}-linux-x64.tar.gz`,
      filename: `flyway-commandline-${releaseVersion}-linux-x64.tar.gz`,
      folder: `flyway-${releaseVersion}`
    },
    'darwin': {
      url: `${repoBaseUrl}/${releaseVersion}/flyway-commandline-${releaseVersion}-macosx-x64.tar.gz`,
      filename: `flyway-commandline-${releaseVersion}-macosx-x64.tar.gz`,
      folder: `flyway-${releaseVersion}`
    }
  };

  return sources[_os2.default.platform()];
});

/**
* @param {any} source
* @returns source.filename
*/
const downloadFlywaySource = exports.downloadFlywaySource = source => {
  let downloadDir = _path2.default.join(__dirname, '../../', 'tmp');

  if (!source) {
    throw new Error('Your platform is not supported');
  }

  source.filename = _path2.default.join(downloadDir, source.filename);
  if (_fs2.default.existsSync(source.filename)) {
    return Promise.resolve(source.filename);
  } else {
    (0, _rimraf2.default)(downloadDir, () => {
      _fs2.default.mkdir(downloadDir);
    });
  }

  console.log('Downloading', source.url);
  console.log('Saving to', source.filename);

  return new Promise((resolve, reject) => {
    let proxyUrl = env.npm_config_https_proxy || env.npm_config_http_proxy || env.npm_config_proxy;
    let downloadOptions = {
      uri: source.url,
      encoding: null, // Get response as a buffer
      followRedirect: true,
      headers: {
        'User-Agent': env.npm_config_user_agent
      },
      strictSSL: true,
      proxy: proxyUrl
    };
    let consoleDownloadBar;

    (0, _requestProgress2.default)((0, _request2.default)(downloadOptions, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        _fs2.default.writeFileSync(source.filename, body);

        console.log(`\nReceived ${(0, _filesize2.default)(body.length)} total.`);

        resolve(source.filename);
      } else if (response) {
        console.error(`
        Error requesting source.
        Status: ${response.statusCode}
        Request options: ${JSON.stringify(downloadOptions, null, 2)}
        Response headers: ${JSON.stringify(response.headers, null, 2)}
        Make sure your network and proxy settings are correct.

        If you continue to have issues, please report this full log at https://github.com/sgraham/flywaydb-cli`);
        process.exit(1);
      } else {
        console.error('Error downloading : ', error);
        process.exit(1);
      }
    })).on('progress', state => {
      try {
        if (!consoleDownloadBar) {
          consoleDownloadBar = new _progress2.default('  [:bar] :percent', { total: state.size.total, width: 40 });
        }

        consoleDownloadBar.curr = state.size.transferred;
        consoleDownloadBar.tick();
      } catch (e) {
        console.log('error', e);
      }
    });
  });
};

/**
 * @param {any} file
 * @returns extractDir
 */
const extractTolib = exports.extractTolib = file => {
  let extractDir = _path2.default.join(__dirname, '../../', 'lib');

  if (!_fs2.default.existsSync(extractDir)) {
    _fs2.default.mkdirSync(extractDir);
  } else {
    return Promise.resolve(extractDir);
  }

  if (_path2.default.extname(file) === '.zip') {
    return new Promise((resolve, reject) => {
      (0, _extractZip2.default)(file, { dir: extractDir }, err => {
        if (err) {
          console.error('Error extracting zip', err);
          reject(new Error('Error extracting zip'));
        } else {
          resolve(extractDir);
        }
      });
    });
  } else {
    return new Promise((resolve, reject) => {
      (0, _child_process.spawn)('tar', ['zxf', file], {
        cwd: extractDir,
        stdio: 'inherit'
      }).on('close', code => {
        if (code === 0) {
          resolve(extractDir);
        } else {
          console.log('Untaring file failed', code);
          reject(new Error('Untaring file failed'));
        }
      });
    });
  }
};

/**
 * @param {any} libDir
 * @returns
 */
const makeBinLink = exports.makeBinLink = libDir => {
  return new Promise((resolve, reject) => {
    let versionDirs = flywayVersionDir(libDir);
    let flywayDir = _path2.default.join(libDir, versionDirs[0]);
    let binDir = _path2.default.join(__dirname, '../../', 'bin');

    if (_fs2.default.existsSync(flywayDir)) {
      if (_fs2.default.existsSync(binDir)) {
        _fs2.default.unlinkSync(_path2.default.join(binDir, 'flyway'));
        _fs2.default.symlinkSync(_path2.default.join(flywayDir, 'flyway'), _path2.default.join(binDir, 'flyway'));
      } else {
        _fs2.default.mkdir(binDir);
        _fs2.default.symlinkSync(_path2.default.join(flywayDir, 'flyway'), _path2.default.join(binDir, 'flyway'));
      }

      resolve();
    } else {
      reject(new Error(`flywayDir was not found at ${flywayDir}`));
    }
  });
};

/**
 * @param {any} libDir
 */
const flywayVersionDir = libDir => _fs2.default.readdirSync(libDir).filter(file => _fs2.default.statSync(_path2.default.join(libDir, file)).isDirectory());

const rmTmpDir = exports.rmTmpDir = () => {
  let tmpDir = _path2.default.join(__dirname, '../../', 'tmp');
  (0, _rimraf2.default)(tmpDir, () => {
    console.log(`Deleted ${tmpDir}`);
  });
};