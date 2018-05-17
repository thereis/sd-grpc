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

  async function connectClient(call) {
    call.on("data", async data => {
      console.log(data);

      if (!ServerStore.fileLoaded) {
        let content = await loadChunks();
        ServerStore.setFileContent(content);
        ServerStore.setFileStatus(true);
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
      id: 0,
      data: {},
      fileLocked: false
    };

    /**
     * Keep alive method
     */
    let streamInterval = setInterval(async () => {
      // Check if client is connected
      if (ServerStore.clientStatus) {
        // Check if file is already loaded

        if (!connectedAgent.fileLocked) {
          console.log("vim aqui");
          dataTrigger(ServerStore.fileContent[connectedAgent.id - 1]);
          connectedAgent.fileLocked = true;
          //ServerStore.setFileLocked(true);
        }

        // send the data
        // call.write({
        //   agentConnected: true,
        //   clientConnected: true,
        //   numbers: [1, 2, 3]
        // });
      } else {
        call.write({
          agentConnected: true,
          clientConnected: false
        });
      }
    }, 1000);

    const dataTrigger = async chunk => {
      //console.log(ServerStore.fileContent);
      let content = convertToDouble(chunk); // chega 300k

      let calculation = Math.ceil(content.length * 0.1); // 300k / 3000
      let teste = chunker(content, calculation / 3);

      console.log(teste.length, "total de arrays", "resultado", calculation);

      for (let value of teste) {
        //console.log(value)
        call.write({
          agentConnected: true,
          clientConnected: true,
          numbers: value
        });
      }

      call.write({
        message: "Terminei de processar"
      });
    };
    /**
     * On first data received, register the agent
     */
    call.on("data", data => {
      let id = ServerStore.totalAgents + 1;
      console.log(
        `New agent connected! Name: ${data.name} OS: ${data.os} ID: ${id}`
      );

      connectedAgent = { id, data };
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

      console.log(`Agent ${connectedAgent.data.name} has been disconnected.`);

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

    const maxChunks = ServerStore.totalAgents;
    //const maxChunks = 3;
    const chunkDivisor = Math.ceil(numbers.length / maxChunks);
    const chunks = chunker(numbers, chunkDivisor); // 300k para 3 agents

    console.log("File loaded, ready to distribute...");

    return chunks;
  } catch (e) {
    console.log(e);
  }
};

const init = async () => {
  createServer();
  //loadChunks();
};

init();
