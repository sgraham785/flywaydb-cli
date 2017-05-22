'use strict'

const requestProgress = require('request-progress')
const ProgressBar = require('progress')
const extractZip = require('extract-zip')
const spawn = require('child_process').spawn
const path = require('path')
const request = require('request')
const filesize = require('filesize')
const os = require('os')
const fs = require('fs')
const env = process.env

let repoBaseUrl = 'https://repo1.maven.org/maven2/org/flywaydb/flyway-commandline'

// get latest version
request(`${repoBaseUrl}/maven-metadata.xml`, function (err, response) {
  let latestVersion
  try {
    if (err) throw err

    let mavenMetadata = response.body
    let releaseRegularExp = new RegExp('<release>(.+)</release>')

    latestVersion = mavenMetadata.match(releaseRegularExp)[1]
  } catch (err) {
    latestVersion = '4.2.0'
    console.error(`error: could not figure out latest release version. using default version ${latestVersion}`)
  }

  let completedSuccessfully = false
  let sources = {
    'win32': {
      url: `${repoBaseUrl}/${latestVersion}/flyway-commandline-${latestVersion}-windows-x64.zip`,
      filename: `flyway-commandline-${latestVersion}-windows-x64.zip`,
      folder: `flyway-${latestVersion}`
    },
    'linux': {
      url: `${repoBaseUrl}/${latestVersion}/flyway-commandline-${latestVersion}-linux-x64.tar.gz`,
      filename: `flyway-commandline-${latestVersion}-linux-x64.tar.gz`,
      folder: `flyway-${latestVersion}`
    },
    'darwin': {
      url: `${repoBaseUrl}/${latestVersion}/flyway-commandline-${latestVersion}-macosx-x64.tar.gz`,
      filename: `flyway-commandline-${latestVersion}-macosx-x64.tar.gz`,
      folder: `flyway-${latestVersion}`
    }
  }

  let currentSource = sources[os.platform()]

  process.once('exit', function () {
    if (!completedSuccessfully) {
      console.log('Install did not complete successfully')
      process.exit(1)
    }
  })

  downloadFlywayWithJre()
        .then(extractTolib)
        .then(makeBinLink)
        .then(function () {
          completedSuccessfully = true
        }, function (err) {
          console.log(err)
        })

  function makeBinLink (libDir) {
    return new Promise(function (resolve, reject) {
      let flywayDir = path.join(libDir, currentSource.folder)
      let binDir = path.join(__dirname, 'bin')

      if (fs.existsSync(flywayDir)) {
        if (fs.existsSync(binDir)) {
          fs.unlinkSync(path.join(binDir, 'flyway'))
          fs.symlinkSync(path.join(flywayDir, 'flyway'), path.join(binDir, 'flyway'))
        } else {
          fs.mkdir(binDir)
          fs.symlinkSync(path.join(flywayDir, 'flyway'), path.join(binDir, 'flyway'))
        }

        resolve()
      } else {
        reject(new Error('flywayDir was not found at ' + flywayDir))
      }
    })
  }

  function extractTolib (compressedFlywaySource) {
    let extractDir = path.join(__dirname, 'lib')

    if (!fs.existsSync(extractDir)) {
      fs.mkdirSync(extractDir)
    } else {
      return Promise.resolve(extractDir)
    }

    if (path.extname(compressedFlywaySource) === '.zip') {
      return new Promise(function (resolve, reject) {
        extractZip(compressedFlywaySource, { dir: extractDir }, function (err) {
          if (err) {
            console.error('Error extracting zip', err)
            reject(new Error('Error extracting zip'))
          } else {
            resolve(extractDir)
          }
        })
      })
    } else {
      return new Promise(function (resolve, reject) {
        spawn('tar', ['zxf', compressedFlywaySource], {
          cwd: extractDir,
          stdio: 'inherit'
        }).on('close', function (code) {
          if (code === 0) {
            resolve(extractDir)
          } else {
            console.log('Untaring file failed', code)
            reject(new Error('Untaring file failed'))
          }
        })
      })
    }
  }

  function downloadFlywayWithJre () {
    let downloadDir = getCacheDir()

    if (!currentSource) {
      throw new Error('Your platform is not supported')
    }

    currentSource.filename = path.join(downloadDir, currentSource.filename)

    if (fs.existsSync(currentSource.filename)) {
      return Promise.resolve(currentSource.filename)
    }

    console.log('Downloading', currentSource.url)
    console.log('Saving to', currentSource.filename)

    return new Promise(function (resolve, reject) {
      let proxyUrl = env.npm_config_https_proxy || env.npm_config_http_proxy || env.npm_config_proxy
      let downloadOptions = {
        uri: currentSource.url,
        encoding: null, // Get response as a buffer
        followRedirect: true,
        headers: {
          'User-Agent': env.npm_config_user_agent
        },
        strictSSL: true,
        proxy: proxyUrl
      }
      let consoleDownloadBar

      requestProgress(request(downloadOptions, function (error, response, body) {
        if (!error && response.statusCode === 200) {
          fs.writeFileSync(currentSource.filename, body)

          console.log('\nReceived ' + filesize(body.length) + ' total.')

          resolve(currentSource.filename)
        } else if (response) {
          console.error(`
        Error requesting archive.
        Status: ${response.statusCode}
        Request options: ${JSON.stringify(downloadOptions, null, 2)}
        Response headers: ${JSON.stringify(response.headers, null, 2)}
        Make sure your network and proxy settings are correct.

        If you continue to have issues, please report this full log at https://github.com/markgardner/flywaydb-cli`)
          process.exit(1)
        } else {
          console.error('Error downloading archive: ', error)
          process.exit(1)
        }
      }))
                .on('progress', function (state) {
                  try {
                    if (!consoleDownloadBar) {
                      consoleDownloadBar = new ProgressBar('  [:bar] :percent', { total: state.size.total, width: 40 })
                    }

                    consoleDownloadBar.curr = state.size.transferred
                    consoleDownloadBar.tick()
                  } catch (e) {
                    console.log('error', e)
                  }
                })
    })
  }

  function getCacheDir () {
    let tmpDirs = [
      process.env.npm_config_tmp,
      os.tmpdir(),
      path.join(process.cwd(), 'tmp')
    ]
    let writeAbleTmpDir = tmpDirs.find(dir => {
      if (dir) {
        try {
          dir = path.resolve(dir, 'flywaydb-cli')

          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, '0777')
            fs.chmodSync(dir, '0777')
          }

          let tmpFile = path.join(dir, Date.now() + '.tmp')
          fs.writeFileSync(tmpFile, 'test')
          fs.unlinkSync(tmpFile)

          return true
        } catch (e) {
          console.log(dir, 'is not writable:', e)
        }
      }

      return false
    })

    if (writeAbleTmpDir) {
      return path.resolve(writeAbleTmpDir, 'flywaydb-cli')
    } else {
      console.error('Can not find a writable tmp directory.')
      exit(1)
    }
  }
})

module.exports = {
  // _makeBinLink: makeBinLink
  _install: install
}
