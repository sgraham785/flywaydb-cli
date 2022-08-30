import os from "os";
import fs from "fs-extra";
import path from "path";
import request from "request";
import rp from "request-promise";
import requestProgress from "request-progress";
import ProgressBar from "progress";
import extractZip from "extract-zip";
import { spawn } from "child_process";
import filesize from "filesize";
import rimraf from "rimraf";
const env = process.env;

const repoBaseUrl =
  "https://repo1.maven.org/maven2/org/flywaydb/flyway-commandline";

const readDotFlywayFile = () => {
  let resolveDotFlywayPath = fs.existsSync(
    path.resolve(__dirname, "../../../../", ".flyway")
  )
    ? path.resolve(__dirname, "../../../../", ".flyway")
    : "";
  // console.log("readDotFlywayFile dotFlywayPath -> ", resolveDotFlywayPath);
  let encoding = "utf8";

  var version =
    resolveDotFlywayPath !== ""
      ? fs.readFileSync(resolveDotFlywayPath, { encoding })
      : "";

  version !== "" ? console.log("Found version in .flyway -> ", version) : "";
  return version.trim();
};

/**
 * @returns sources[os.platform()]
 */
export const getReleaseSource = () =>
  rp({
    uri: `${repoBaseUrl}/maven-metadata.xml`
  }).then(response => {
    let releaseRegularExp = new RegExp("<release>(.+)</release>");
    let releaseVersion =
      readDotFlywayFile() || response.match(releaseRegularExp)[1];

    // console.log("getReleaseSource releaseVersion -> ", releaseVersion);
    let sources = {
      win32: {
        url: `${repoBaseUrl}/${releaseVersion}/flyway-commandline-${releaseVersion}-windows-x64.zip`,
        filename: `flyway-commandline-${releaseVersion}-windows-x64.zip`,
        folder: `flyway-${releaseVersion}`
      },
      linux: {
        url: `${repoBaseUrl}/${releaseVersion}/flyway-commandline-${releaseVersion}-linux-x64.tar.gz`,
        filename: `flyway-commandline-${releaseVersion}-linux-x64.tar.gz`,
        folder: `flyway-${releaseVersion}`
      },
      darwin: {
        url: `${repoBaseUrl}/${releaseVersion}/flyway-commandline-${releaseVersion}-macosx-x64.tar.gz`,
        filename: `flyway-commandline-${releaseVersion}-macosx-x64.tar.gz`,
        folder: `flyway-${releaseVersion}`
      }
    };

    return sources[os.platform()];
  });

// copied from https://github.com/getsentry/sentry-cli/blob/c65df4fba17101e60e8c31f378f6001b514e5a42/scripts/install.js#L123-L131
const getNpmCache = () => {
  return (
    env.npm_config_cache ||
    env.npm_config_cache_folder ||
    env.npm_config_yarn_offline_mirror ||
    (env.APPDATA ? path.join(env.APPDATA, 'npm-cache') : path.join(os.homedir(), '.npm'))
  );
}

/**
 * @param {any} source
 * @returns source.filename
 */
export const downloadFlywaySource = source => {
  let downloadDir = path.join(getNpmCache(), 'flywaydb-cli');

  if (!source) {
    throw new Error("Your platform is not supported");
  }

  source.filename = path.join(downloadDir, source.filename);
  if (fs.existsSync(source.filename)) {
    console.log("Cached file exists, skipping download", source.filename);
    return Promise.resolve(source.filename);
  } else {
    rimraf(downloadDir, () => {
      fs.mkdirSync(downloadDir);
    });
  }

  console.log("Downloading", source.url);
  console.log("Saving to", source.filename);

  return new Promise((resolve, reject) => {
    let proxyUrl =
      env.npm_config_https_proxy ||
      env.npm_config_http_proxy ||
      env.npm_config_proxy;
    let downloadOptions = {
      uri: source.url,
      encoding: null, // Get response as a buffer
      followRedirect: true,
      headers: {
        "User-Agent": env.npm_config_user_agent
      },
      strictSSL: true,
      proxy: proxyUrl
    };
    let consoleDownloadBar;

    requestProgress(
      request(downloadOptions, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          fs.writeFileSync(source.filename, body);

          console.log(`\nReceived ${filesize(body.length)} total.`);

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
          console.error("Error downloading : ", error);
          process.exit(1);
        }
      })
    ).on("progress", state => {
      try {
        if (!consoleDownloadBar) {
          consoleDownloadBar = new ProgressBar("  [:bar] :percent", {
            total: state.size.total,
            width: 40
          });
        }

        consoleDownloadBar.curr = state.size.transferred;
        consoleDownloadBar.tick();
      } catch (e) {
        console.log("error", e);
      }
    });
  });
};

/**
 * @param {any} file
 * @returns extractDir
 */
export const extractToLib = file => {
  let extractDir = path.join(__dirname, "../../", "lib");

  if (!fs.existsSync(extractDir)) {
    fs.mkdirSync(extractDir);
  } else {
    rimraf.sync(extractDir);
    fs.mkdirSync(extractDir);
    return Promise.resolve(extractDir);
  }

  if (path.extname(file) === ".zip") {
    return new Promise((resolve, reject) => {
      extractZip(file, { dir: extractDir }, err => {
        if (err) {
          console.error("Error extracting zip", err);
          reject(new Error("Error extracting zip"));
        } else {
          resolve(extractDir);
        }
      });
    });
  } else {
    return new Promise((resolve, reject) => {
      spawn("tar", ["zxf", file], {
        cwd: extractDir,
        stdio: "inherit"
      }).on("close", code => {
        if (code === 0) {
          resolve(extractDir);
        } else {
          console.log("Untaring file failed", code);
          reject(new Error("Untaring file failed"));
        }
      });
    });
  }
};

/**
 * @param {any} libDir
 * @returns
 */
export const copyToBin = libDir => {
  return new Promise((resolve, reject) => {
    let versionDirs = flywayVersionDir(libDir);
    let flywayDir = path.join(libDir, versionDirs[0]);
    let binDir = path.join(__dirname, "../../", "bin");

    if (fs.existsSync(flywayDir)) {
      rimraf.sync(path.join(__dirname, "../../", "bin"));

      if (fs.existsSync(path.join(flywayDir, "jre", "lib", "amd64"))) {
        fs.removeSync(path.join(flywayDir, "jre", "lib", "amd64", "server", "libjsig.so")) // Broken link, we need to delete it to avoid the copy to fail
      }
      fs.copySync(flywayDir, binDir);

      resolve();
    } else {
      reject(new Error(`flywayDir was not found at ${flywayDir}`));
    }
  });
};

/**
 * @param {any} libDir
 */
const flywayVersionDir = libDir => {
  return fs
    .readdirSync(libDir)
    .filter(file => fs.statSync(path.join(libDir, file)).isDirectory());
};

export const cleanupDirs = () => {
  rimraf.sync(path.join(__dirname, "../../", "lib"));
};
