import {
  getReleaseSource,
  downloadFlywaySource,
  extractTolib,
  makeBinLink,
  rmTmpDir
} from './utils'

getReleaseSource()
  .then(downloadFlywaySource)
  .then(extractTolib)
  .then(makeBinLink)
  .then(rmTmpDir)
  .catch(function (reason) {
    // Handle failed request...
    console.error(`error --> ${reason}`)
  })
