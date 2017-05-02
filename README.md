# flywaydb-cli
Node module installer for [flywaydb cli](https://flywaydb.org/documentation/commandline/)

## Motivation
I found myself wanting to use flyway on my build systems and dreading installing and maintaining the cli with all of the PATH requirements. This simple wrapper will download the latest Flyway cli on install and provide a hook for your package scripts.

## Example run-script
```
"scripts": {
  "migrate": "flyway -configFile=conf/flyway.conf migrate"
}
```

See [Example config file for inspiration](example_config.js)


## Synopsis

A simple script installer for [flywaydb cli](https://flywaydb.org/documentation/commandline/)

## Usage Example

```
"scripts": {
  "migrate": "flyway -X -configFile=conf/flyway.conf migrate"
}
```

## Motivation

After looking into a couple other packages and 

## Installation

`npm i -S flyway-cli`

## CMD Reference

This simple

## Tests

TODO

## Contributors

Maintainer/Publisher [sgraham785](https://github.com/sgraham785)

### Thank you to:

[markgardner](https://github.com/markgardner) for the inspiration [node-flywaydb](https://github.com/markgardner/node-flywaydb)

[LiranBri](https://github.com/LiranBri) for the updated source [installer](https://github.com/LiranBri/node-flywaydb/blob/master/install.js)

## License

[Apache-2](https://raw.githubusercontent.com/flyway/flyway/master/LICENSE.txt)