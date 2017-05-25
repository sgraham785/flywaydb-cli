import os from 'os'
import fs from 'fs'
import path from 'path'
import request from 'request'
import rp from 'request-promise'
import requestProgress from 'request-progress'
import ProgressBar from 'progress'
import extractZip from 'extract-zip'
import { spawn } from 'child_process'
import filesize from 'filesize'
import rimraf from 'rimraf'
const env = process.env

const repoBaseUrl = 'https://repo1.maven.org/maven2/org/flywaydb/flyway-commandline'

/**
 * @returns sources[os.platform()]
 */
export const getReleaseSource = () => rp({
  uri: `${repoBaseUrl}/maven-metadata.xml`
})
.then((response) => {
  let releaseRegularExp = new RegExp('<release>(.+)</release>')
  let releaseVersion = response.match(releaseRegularExp)[1]

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
  }

  return sources[os.platform()]
})

 /**
 * @param {any} source
 * @returns source.filename
 */
export const downloadFlywaySource = (source) => {
  let downloadDir = path.join(__dirname, '../../', 'tmp')

  if (!source) {
    throw new Error('Your platform is not supported')
  }

  source.filename = path.join(downloadDir, source.filename)
  if (fs.existsSync(source.filename)) {
    return Promise.resolve(source.filename)
  } else {
    rimraf(downloadDir, () => {
      fs.mkdir(downloadDir)
    })
  }

  console.log('Downloading', source.url)
  console.log('Saving to', source.filename)

  return new Promise((resolve, reject) => {
    let proxyUrl = env.npm_config_https_proxy || env.npm_config_http_proxy || env.npm_config_proxy
    let downloadOptions = {
      uri: source.url,
      encoding: null, // Get response as a buffer
      followRedirect: true,
      headers: {
        'User-Agent': env.npm_config_user_agent
      },
      strictSSL: true,
      proxy: proxyUrl
    }
    let consoleDownloadBar

    requestProgress(request(downloadOptions, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        fs.writeFileSync(source.filename, body)

        console.log(`\nReceived ${filesize(body.length)} total.`)

        resolve(source.filename)
      } else if (response) {
        console.error(`
        Error requesting source.
        Status: ${response.statusCode}
        Request options: ${JSON.stringify(downloadOptions, null, 2)}
        Response headers: ${JSON.stringify(response.headers, null, 2)}
        Make sure your network and proxy settings are correct.

        If you continue to have issues, please report this full log at https://github.com/sgraham/flywaydb-cli`)
        process.exit(1)
      } else {
        console.error('Error downloading : ', error)
        process.exit(1)
      }
    }))
      .on('progress', state => {
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

/**
 * @param {any} file
 * @returns extractDir
 */
export const extractTolib = (file) => {
  let extractDir = path.join(__dirname, '../../', 'lib')

  if (!fs.existsSync(extractDir)) {
    fs.mkdirSync(extractDir)
  } else {
    return Promise.resolve(extractDir)
  }

  if (path.extname(file) === '.zip') {
    return new Promise((resolve, reject) => {
      extractZip(file, { dir: extractDir }, err => {
        if (err) {
          console.error('Error extracting zip', err)
          reject(new Error('Error extracting zip'))
        } else {
          resolve(extractDir)
        }
      })
    })
  } else {
    return new Promise((resolve, reject) => {
      spawn('tar', ['zxf', file], {
        cwd: extractDir,
        stdio: 'inherit'
      }).on('close', code => {
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

/**
 * @param {any} libDir
 * @returns
 */
export const makeBinLink = (libDir) => {
  return new Promise((resolve, reject) => {
    let versionDirs = flywayVersionDir(libDir)
    let flywayDir = path.join(libDir, versionDirs[0])
    let binDir = path.join(__dirname, '../../', 'bin')

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
      reject(new Error(`flywayDir was not found at ${flywayDir}`))
    }
  })
}

/**
 * @param {any} libDir
 */
const flywayVersionDir = (libDir) => fs.readdirSync(libDir).filter(file => fs.statSync(path.join(libDir, file)).isDirectory())

export const rmTmpDir = () => {
  let tmpDir = path.join(__dirname, '../../', 'tmp')
  rimraf(tmpDir, () => {
    console.log(`Deleted ${tmpDir}`)
  })
}
