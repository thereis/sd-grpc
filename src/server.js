import ip from "ip";
import grpc from "grpc";
import signale from "signale";

import { readFileSync } from "fs";
import { chunker, convertToDouble } from "./utils";

import _ from "lodash";

import ServerStore from "./store/server";

// max chunk per chunks
const MAX_CHUNK_PER_CHUNKS = 30000;

/**
 * Global variables
 */

let protoDescriptor = grpc.load(__dirname + "/data/grpc.proto").SD.Project;

// Initialize the server
function startServer() {
  const server = new grpc.Server();

  // Register the SendChunk service and methods
  server.addService(protoDescriptor.SendChunk.service, {
    connectAgent,
    connectClient
  });

  // Bind to the internal + external addresses
  server.bind("0.0.0.0:50051", grpc.ServerCredentials.createInsecure());
  server.start();

  signale.start(`Masterserver is up! IP: ${ip.address()} Port: 50051`);

  async function connectClient(call) {
    call.on("data", async data => {
      if (!ServerStore.bundleLoaded) {
        let bundle = await getBundle();
        ServerStore.setBundle(bundle);
        ServerStore.setBundleStatus(true);
      }

      ServerStore.setClientStatus(true);
    });

    let streamInterval = setInterval(() => {
      call.write({ isConnected: true });

      if (ServerStore.transfersCompleted) {
        clearInterval(streamInterval);
        sendChunks(ServerStore.shallowBundle);
      }
    }, 500);

    const sendChunks = content => {
      let chunks = chunker(content, MAX_CHUNK_PER_CHUNKS);

      chunks.map(chunk => {
        call.write({
          sortedNumbers: chunk
        });
      });

      console.log("chunks: ", chunks.length);
      // console.log("chunks: ", chunks);
      console.log(content.length, "length of shallow bundle");

      console.log(`The transfer to the client, has been completed.`);

      call.write({
        isConnected: true,
        sortedNumbers: [],
        transferCompleted: true
      });
    };
  }

  /**
   * Handles the Agent events
   */
  function connectAgent(call) {
    let connectedAgent = {
      bundleLocked: false,
      transferCompleted: false
    };

    /**
     * Keep alive method
     */
    let streamInterval = setInterval(() => {
      // Check if client is connected and bundle is not locked
      if (ServerStore.clientConnected && !connectedAgent.bundleLocked) {
        sendBundle(ServerStore.bundle[connectedAgent.id - 1]);
        connectedAgent.bundleLocked = true;
      } else {
        call.write({
          agentConnected: true,
          clientConnected: ServerStore.clientConnected
        });
      }
    }, 1000);

    const sendBundle = content => {
      // split the content into chunks
      let chunks = chunker(content, MAX_CHUNK_PER_CHUNKS);

      signale.await(
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
        transferCompleted: true
      });

      signale.success(
        `The transfer for agent ${connectedAgent.id} has been completed.`
      );

      // Clear the old bundle
      ServerStore.bundle[connectedAgent.id - 1] = [];

      return true;
    };

    /**
     * It will handle the agent write method
     */
    call.on("data", data => {
      // First connection
      if (!connectedAgent.id) {
        let id = ServerStore.totalAgents + 1;

        connectedAgent = { id, data };
        ServerStore.addAgent(connectedAgent);

        signale.info(
          `New agent connected! Name: ${data.name} OS: ${data.os} ID: ${id}`,
          `Agents connected: ${ServerStore.totalAgents}`
        );
      }

      // If agent is sending some data
      if (data.sortedNumbers.length > 0 && !data.transferCompleted) {
        ServerStore.addToBundle(connectedAgent.id, data.sortedNumbers);
      }

      if (data.transferCompleted) {
        signale.complete(`${connectedAgent.id} has finished his job.`);
        ServerStore.updateAgent(connectedAgent.id, data);
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

      signale.complete(
        `Agent ${connectedAgent.data.name} has been disconnected.`,
        `Now we have ${ServerStore.totalAgents} connected agent(s).`
      );
    });

    /**
     * If something weird happen
     */
    call.on("error", e => {
      clearInterval(streamInterval);
      signale.error(`Oops, something wrong happened! Agent ID: ${connectAgent.id}
      Error: ${e}`);
    });

    /**
     * End the stream
     */
    call.on("end", () => {
      clearInterval(streamInterval);
      signale.error(`Agent ${connectedAgent.id} has been disconnected!`);
    });
  }
}

/**
 * Load synchronous the file
 */
const loadFile = async () => {
  signale.info("Loading file...");

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

    signale.sucess("File loaded, ready to distribute...");

    return bundle;
  } catch (e) {
    signale.error(e.message);
  }
};

const init = async () => {
  signale.info("Initializing masterserver...");
  startServer();
};

init();
