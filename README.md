# hardhat-yul

[![npm](https://img.shields.io/npm/v/@tovarishfin/hardhat-yul.svg)](https://www.npmjs.com/package/@skybit/hardhat-yul)

[Hardhat](https://hardhat.org) plugin to develop smart contracts with Yul and/or Yul+.

## What

This plugin adds support for Yul and Yul+ to Hardhat. Once installed, Yul contracts can be compiled by running the `compile` task.

The Yul compiler is run using the [official solc compiler](https://github.com/ethereum/solc-js#readme).

The Yul+ compiler is run using the [Yul+ transpiler from FuelLabs](https://github.com/FuelLabs/yulp) before being passed to the Yul compiler.

## Installation

First, you need to install the plugin and solc by running

```bash
yarn add -D @skybit/hardhat-yul solc
```

And add the following statement to your `hardhat.config.js`:

```js
require("@skybit/hardhat-yul");
```

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```ts
import "@skybit/hardhat-yul";
```

## Required plugins

No plugins dependencies.

## Tasks

This plugin creates no additional tasks.

## Environment extensions

This plugin does not extend the Hardhat Runtime Environment.

## Configuration

At the time, there are no configuration options. This might change in the future.

## Usage

There are no additional steps you need to take for this plugin to work.

### Additional notes

This is a fork of [@TovarishFin/hardhat-yul](https://github.com/TovarishFin/hardhat-yul) which no longer seems to be maintained and is not open for issues.

As of v4.2.0 solc has been made a peer dependency so that whatever version of solc that you choose to install in your own repository will be used to compile the yul files.
