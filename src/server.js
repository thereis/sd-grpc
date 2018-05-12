import { readFileSync } from "fs";
import { chunker, convertToDouble } from "./utils";

import grpc from "grpc";
import DataStore from "./store";

/**
 * Load the file synchronous
 */
const loadFile = async () => {
  console.log("Loading file...");

  let content = await readFileSync(__dirname + "/data/data.in", "utf8");

  return content.toString().split("\n");
};

/**
 * Global variables
 */

let protoDescriptor = grpc.load(__dirname + "/data/grpc.proto");
let connectedAgents = [];

function createServer() {
  const server = new grpc.Server();

  server.addService(protoDescriptor.SD.Project.SendChunk.service, {
    sendChunk,
    connectAgent,
    connectClient
  });

  server.bind("0.0.0.0:50051", grpc.ServerCredentials.createInsecure());
  server.start();

  console.log("Server is running on port 50051");

  function connectClient(call, callback) {
    call.on("data", data => {
      console.log(data);
    });
  }

  function connectAgent(call, callback) {
    let connectedAgent;

    /**
     * If there is a new connected agent
     */
    call.on("data", data => {
      console.log(`New agent connected! Name: ${data.name}`);
      connectedAgent = { id: DataStore.totalAgents + 1, data };

      DataStore.addAgent(connectedAgent);

      console.log(`Agents connected: ${DataStore.totalAgents}`);
    });

    /**
     * If something wrong occurs
     */
    call.on("error", e => {
      console.log(`Something wrong happened. The error is: ${e}`);
    });

    /**
     * If the agent closes the connection
     */
    call.on("cancelled", () => {
      console.log(`Agent ${connectedAgent.id} has been disconnected.`);

      // It will pop the disconnected agent
      DataStore.removeAgent(connectedAgent);

      console.log(`Now we have ${DataStore.totalAgents} connected agent(s).`);

      callback(null, false);
    });

    call.on("status", status => {
      console.log(status, "status here");
    });

    call.on("end", () => callback(null, true));
  }

  function sendChunk(call, callback) {
    let data = [];

    console.log("callHeaders", call);

    call.on("data", item => {
      data = item.numbers;
    });

    let result = data.sort();

    console.log(result, "result here");

    call.on("end", () => callback(null, data.sort((a, b) => a - b)));
  }
}

const loadChunks = async () => {
  try {
    /**
     * Load configuration file
     */
    let numbers = await loadFile();

    /**
     * Numbers configuration
     */
    let numbersLength = numbers.length;

    const maxChunks = 3;
    const chunkDivisor = Math.ceil(numbersLength / maxChunks);
    const chunks = chunker(numbers, chunkDivisor);
  } catch (e) {
    console.log(e);
  }
};

const init = async () => {
  createServer();
  loadChunks();
};

init();
