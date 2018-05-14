import { readFileSync } from "fs";
import { chunker, convertToDouble } from "./utils";
import ip from "ip";
import grpc from "grpc";
import ServerStore from "./store/server";

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

let protoDescriptor = grpc.load(__dirname + "/data/grpc.proto").SD.Project;
let connectedAgents = [];

function createServer() {
  const server = new grpc.Server();

  // Register the SendChunk service and methods
  server.addService(protoDescriptor.SendChunk.service, {
    sendChunk,
    connectAgent,
    connectClient
  });

  // Bind to the internal + external addresses
  server.bind("0.0.0.0:50051", grpc.ServerCredentials.createInsecure());
  server.start();

  console.log(`Masterserver is up! IP: ${ip.address()} Port: 50051`);

  function connectClient(call, callback) {
    call.on("data", data => {
      console.log(data);
    });
  }

  /**
   * Handles the Agent events
   */
  function connectAgent(call) {
    let connectedAgent;

    let streamInterval = setInterval(() => {
      call.write({
        agentConnected: false,
        details: JSON.stringify({ isConnected: true })
      });
    }, 100);

    /**
     * On first data received, register the agent
     */
    call.on("data", data => {
      console.log(`New agent connected! Name: ${data.name} OS: ${data.os}`);
      connectedAgent = { id: ServerStore.totalAgents + 1, data };

      ServerStore.addAgent(connectedAgent);

      console.log(`Agents connected: ${ServerStore.totalAgents}`);
    });

    /**
     * If the agent disconnect, remove him from the list
     * and clear the message interval
     */
    call.on("cancelled", () => {
      // Clear the message interval
      clearTimeout(streamInterval);

      console.log(`Agent ${connectedAgent.id} has been disconnected.`);

      // It remove from the list
      ServerStore.removeAgent(connectedAgent);

      console.log(`Now we have ${ServerStore.totalAgents} connected agent(s).`);
    });

    /**
     * If something weird happen
     */
    call.on("error", e => {
      console.log(`Oops, something wrong happened! Agent ID: ${connectAgent.id}
      Error: ${e}`);
    });

    call.on("end", () => {
      clearInterval(streamInterval);
      console.log("Client disconnected!");
    });
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
