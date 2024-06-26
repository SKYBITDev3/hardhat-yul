import { Artifact, Artifacts, ProjectPathsConfig, HardhatConfig, SolcConfig } from "hardhat/types";
import type { Artifacts as ArtifactsImpl } from "hardhat/internal/artifacts";
import { localPathToSourceName } from "hardhat/utils/source-names";
import path from "path";
import solc from "solc";
import yulp from "yulp";
import * as fs from "fs";
import util from "util";

export async function compileYul(
  config: HardhatConfig,
  artifacts: Artifacts
) {
  const files = await getYulSources(config.paths);

  const allArtifacts = [];
  for (const file of files) {
    const cwdPath = path.relative(process.cwd(), file);

    const hardhatConfigSolcVersion = config.solidity.compilers[0].version
    if(!solc.version().includes(hardhatConfigSolcVersion)) {
      console.log(`Your hardhat config specifies solc version ${hardhatConfigSolcVersion} but it was not found as a package in your repository. It's required to compile yul files. Install it by running yarn add solc@${hardhatConfigSolcVersion}.`)
      return
    }

    console.log(`Compiling ${cwdPath} using solc version ${solc.version()}...`); // e.g. 0.8.24+commit.e11b9ed9.Emscripten.clang

    const yulOutput = await _compileYul(cwdPath, file, config.solidity.compilers[0]);

    const sourceName = await localPathToSourceName(config.paths.root, file);
    const artifact = getArtifactFromYulOutput(sourceName, yulOutput);

    await artifacts.saveArtifactAndDebugFile(artifact);
    allArtifacts.push({ ...artifact, artifacts: [artifact.contractName] });

    const artifactsImpl = artifacts as ArtifactsImpl;
    artifactsImpl.addValidArtifacts(allArtifacts);
  }
}

export async function compileYulp(
  config: HardhatConfig,
  artifacts: Artifacts
) {
  const files = await getYulpSources(config.paths);

  const allArtifacts = [];
  for (const file of files) {
    const cwdPath = path.relative(process.cwd(), file);

    const hardhatConfigSolcVersion = config.solidity.compilers[0].version
    if(!solc.version().includes(hardhatConfigSolcVersion)) {
      console.log(`Your hardhat config specifies solidity compiler version ${hardhatConfigSolcVersion} but it was not found as a package in your repository. To compile yul files the installed solc version must match the solidity compiler version specified in hardhat.config.js. You can either install the correct version of solc by running 'yarn add solc@${hardhatConfigSolcVersion}', or update the version specified in hardhat.config.js to match whatever solc version is installed in your repository.`)
      return
    }

    console.log(`Compiling ${cwdPath} using solc version ${solc.version()}...`); // e.g. 0.8.24+commit.e11b9ed9.Emscripten.clang

    const yulOutput = await _compileYulp(cwdPath, file, config.solidity.compilers[0]);

    const sourceName = await localPathToSourceName(config.paths.root, file);
    const artifact = getArtifactFromYulOutput(sourceName, yulOutput);

    await artifacts.saveArtifactAndDebugFile(artifact);
    allArtifacts.push({ ...artifact, artifacts: [artifact.contractName] });

    const artifactsImpl = artifacts as ArtifactsImpl;
    artifactsImpl.addValidArtifacts(allArtifacts);
  }
}

async function getYulSources(paths: ProjectPathsConfig) {
  const glob = await import("glob");
  const yulFiles = glob.sync(path.join(paths.sources, "**", "*.yul").split(path.sep).join("/"));

  return yulFiles;
}

async function getYulpSources(paths: ProjectPathsConfig) {
  const glob = await import("glob");
  const yulpFiles = glob.sync(path.join(paths.sources, "**", "*.yulp").split(path.sep).join("/"));

  return yulpFiles;
}

function pathToContractName(file: string) {
  const sourceName = path.basename(file);
  return sourceName.substring(0, sourceName.indexOf("."));
}

function getArtifactFromYulOutput(sourceName: string, output: any): Artifact {
  const contractName = pathToContractName(sourceName);

  return {
    _format: "hh-sol-artifact-1", // sig"function add()" makes this work
    contractName,
    sourceName,
    abi: [], // FIXME: create a proper abi which will work with typechain etc...
    bytecode: output.bytecode,
    deployedBytecode: output.bytecode_runtime,
    linkReferences: {},
    deployedLinkReferences: {},
  };
}

async function _compileYul(filepath: string, filename: string, compiler: SolcConfig) {
  const data = fs.readFileSync(filepath, "utf8");

  const solcInput = {
    language: "Yul",
    sources: { "Target.yul": { content: data } },
    settings: {
      outputSelection: { "*": { "*": ["*"], "": ["*"] } },
      optimizer: {
        enabled: true,
        runs: 0,
        details: { yul: true, },
      },
    },
  }
  solcInput.settings = { ...solcInput.settings, ...compiler.settings } // merge with settings in user's hardhat.config.js
  solcInput.settings.optimizer.details = { yul: true } // make sure yul optimization is enabled in case it was overwritten
  console.log(`solc settings: ${JSON.stringify(solcInput.settings)}`)

  const output = JSON.parse(
    solc.compile(
      JSON.stringify(solcInput)
    )
  );
  if (output.errors && output.errors.length > 0) {
    throw new Error(
      `hardhat-yul: error compiling ${filename}: ${util.inspect(
        output,
        false,
        null,
        true
      )}`
    );
  }
  const contractObjects = Object.keys(output.contracts["Target.yul"]);
  const bytecode =
    "0x" +
    output.contracts["Target.yul"][contractObjects[0]]["evm"]["bytecode"][
    "object"
    ];
  const contractCompiled = {
    _format: "hh-sol-artifact-1",
    sourceName: filename,
    abi: [], // needs to be an empty array to not cause issues with typechain
    bytecode: bytecode,
  };

  return contractCompiled;
}

async function _compileYulp(filepath: string, filename: string, compiler: SolcConfig) {
  const data = fs.readFileSync(filepath, "utf8");
  const source = yulp.compile(data);

  const solcInput = {
    language: "Yul",
    sources: { "Target.yul": { content: yulp.print(source.results) } },
    settings: {
      outputSelection: { "*": { "*": ["*"], "": ["*"] } },
      optimizer: {
        enabled: true,
        runs: 0,
        details: { yul: true, },
      },
    },
  }
  solcInput.settings = { ...solcInput.settings, ...compiler.settings } // merge with settings in user's hardhat.config.js
  solcInput.settings.optimizer.details = { yul: true } // make sure yul optimization is enabled in case it was overwritten
  console.log(`solc settings: ${JSON.stringify(solcInput.settings)}`)

  const output = JSON.parse(
    solc.compile(
      JSON.stringify(solcInput)
    )
  );
  if (output.errors && output.errors.length > 0) {
    throw new Error(
      `hardhat-yul: error compiling ${filename}: ${util.inspect(
        output,
        false,
        null,
        true
      )}`
    );
  }
  const contractObjects = Object.keys(output.contracts["Target.yul"]);
  const bytecode =
    "0x" +
    output.contracts["Target.yul"][contractObjects[0]]["evm"]["bytecode"][
    "object"
    ];
  const abi = source.signatures
    .map((v: any) => v.abi.slice(4, -1))
    .concat(source.topics.map((v: any) => v.abi.slice(6, -1)));
  const contractCompiled = {
    _format: "hh-sol-artifact-1",
    sourceName: filename,
    abi: abi,
    bytecode: bytecode,
  };

  return contractCompiled;
}
