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

`npm i -S flyway-cli`

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