import { readFileSync } from "fs";
import { chunker, convertToDouble } from "./utils";
import ip from "ip";
import grpc from "grpc";
import ServerStore from "./store/server";

import _ from "lodash";

// max chunk per chunks
const MAX_CHUNK_PER_CHUNKS = 30000;

/**
 * Global variables
 */

let protoDescriptor = grpc.load(__dirname + "/data/grpc.proto").SD.Project;

function startServer() {
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

  async function connectClient(call) {
    call.on("data", async data => {
      console.log(data);

      if (!ServerStore.bundleLoaded) {
        let bundle = await getBundle();
        ServerStore.setBundle(bundle);
        ServerStore.setBundleStatus(true);
      }

      ServerStore.setClientStatus(true);
    });

    call.write({ isConnected: true });
  }

  /**
   * Handles the Agent events
   */
  function connectAgent(call) {
    let connectedAgent = {
      bundleLocked: false
    };

    /**
     * Keep alive method
     */
    let streamInterval = setInterval(async () => {
      // Check if client is connected and file is not locked
      if (ServerStore.clientConnected && !connectedAgent.bundleLocked) {
        sendBundle(ServerStore.bundle[connectedAgent.id - 1]);
        connectedAgent.bundleLocked = true;
      } else {
        call.write({
          agentConnected: true,
          clientConnected: false
        });
      }
    }, 1000);

    const sendBundle = async content => {
      // split the content into chunks
      let chunks = chunker(content, MAX_CHUNK_PER_CHUNKS);

      console.log(
        `Transferring ${chunks.length} chunks to agent ${connectedAgent.id}`
      );

      // send each chunk
      chunks.map(chunk => {
        call.write({
          agentConnected: true,
          clientConnected: true,
          numbers: chunk
        });
      });

      // Send a confirmation that we've sent all numbers
      call.write({
        numbersSent: true
      });

      return true;
    };

    /**
     * It will handle the agent write method
     */
    call.on("data", data => {
      // Handles first connection
      if (!connectedAgent.id) {
        let id = ServerStore.totalAgents + 1;

        connectedAgent = { id, data };
        ServerStore.addAgent(connectedAgent);

        console.log(
          `New agent connected! Name: ${data.name} OS: ${data.os} ID: ${id}`
        );
        console.log(`Agents connected: ${ServerStore.totalAgents}`);
      }
    });

    /**
     * If the agent disconnect, remove him from the list
     * and clear the message interval
     */
    call.on("cancelled", () => {
      // Clear the message interval
      clearTimeout(streamInterval);
      ServerStore.removeAgent(connectedAgent);

      console.log(`Agent ${connectedAgent.data.name} has been disconnected.`);
      console.log(`Now we have ${ServerStore.totalAgents} connected agent(s).`);
    });

    /**
     * If something weird happen
     */
    call.on("error", e => {
      console.log(`Oops, something wrong happened! Agent ID: ${connectAgent.id}
      Error: ${e}`);
    });

    /**
     * End the stream
     */
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

/**
 * Load synchronous the file
 */
const loadFile = async () => {
  console.log("Loading file...");

  let read = await readFileSync(__dirname + "/data/data.in", "utf8");
  let content = read.toString().split("\n");

  // convert to integer all content
  return _.map(content, _.unary(parseInt));
};

/**
 *
 */
const getBundle = async () => {
  try {
    /**
     * load the file content
     */
    let chunks = await loadFile();
    let maxChunks = ServerStore.totalAgents;

    // max and min helper
    let max = 0,
      min = 0;

    // Find min/max numbers
    chunks.map(chunk => {
      if (chunk < min) min = chunk;
      if (chunk >= max) max = chunk;
    });

    // Get the number range
    let division = Math.ceil(max / maxChunks);

    // bundle it
    let bundle = chunks.reduce((accumulator, value) => {
      let slot = maxChunks <= 1 ? 0 : Math.floor(value / division);
      (accumulator[slot] = accumulator[slot] || []).push(value);
      return accumulator;
    }, []);

    console.log("File loaded, ready to distribute...");

    return bundle;
  } catch (e) {
    console.log(e);
  }
};

const init = async () => {
  startServer();
};

init();
