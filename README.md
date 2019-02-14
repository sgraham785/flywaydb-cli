# flywaydb-cli

A simple script installer for [flywaydb cli](https://flywaydb.org/documentation/commandline/)

## Usage Examples

```
"scripts": {
  "migrate": "flyway -X -configFile=conf/flyway.conf migrate"
}
```

```
"scripts": {
  "migrate": "flyway -X -user=postgres -schemas=public,another migrate"
}
```

## Motivation

After looking into a couple other packages and having issues with JS wrappers. I decided to simply install flyway command-line tools from source and make it usage in npm.

## Installation

`npm i -S flywaydb-cli`

## Flyway version support

`flywaydb-cli` now supports setting the version of Flyway that will be installed. By default `flywaydb-cli` will resolve the latest "releasedVersion" which is published by Flyway. If you wish to set the version place a `.flyway` file in your applications root path with the version you want to install. Version numbers are absolute, so look [here](https://repo1.maven.org/maven2/org/flywaydb/flyway-commandline/maven-metadata.xml) for the available versions list.

Note, only the absolute version number is allowed in the `.flyway` file e.g. 5.2.4

## CMD Reference

This simple installs the latest [flyway command-line tools](https://flywaydb.org/documentation/commandline/) from source. All the auguments that flyway allows are available.

## Tests

TODO

## Contributors

Maintainer/Publisher [sgraham785](https://github.com/sgraham785)

### Thank you to:

[markgardner](https://github.com/markgardner) for the inspiration [node-flywaydb](https://github.com/markgardner/node-flywaydb)

[LiranBri](https://github.com/LiranBri) for the updated source [installer](https://github.com/LiranBri/node-flywaydb/blob/master/install.js)

## License

[Apache-2](https://raw.githubusercontent.com/flyway/flyway/master/LICENSE.txt)
