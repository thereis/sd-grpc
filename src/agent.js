"use strict";

import { hostname, type } from "os";
import { observe } from "mobx";
import { argv } from "yargs";

import grpc from "grpc";
import AgentProvider from "./store/agent";
import { chunker } from "./utils";

// max chunk per chunks
const MAX_CHUNK_PER_CHUNKS = 30000;

/**
 * Main application function
 */
const init = async () => {
  try {
    /**
     * Check if arguments have been passed
     */
    let ip = argv.ip,
      port = argv.port;

    if (!ip || !port)
      throw new Error(
        "You need to use the --ip and --port flag to initialize the agent."
      );
    if (ip === "" || port === true)
      throw new Error("Provide a value to ip and port.");

    /**
     * Initialize DataStore
     */
    let AgentStore = new AgentProvider();

    // Observe DataStore reaction
    observe(AgentStore, e => {
      switch (e.type) {
        case "update":
          // Detect updates in isAgentConnected observable
          if (e.name === "agentConnected") {
            isConnectedHandler();
          }
          break;
      }
    });

    /**
     * Initialize grpc.proto and then connects to masterserver
     */
    let protoDescriptor = grpc.load(__dirname + "/data/grpc.proto").SD.Project;
    let agent = new protoDescriptor.SendChunk(
      `${ip}:${port}`,
      grpc.credentials.createInsecure()
    );

    console.log("Connecting...");

    /**
     * Connect and register the agent into masterserver
     * and wait for the result
     */
    let connectAgent = agent.connectAgent((error, result) => {
      if (error) {
        console.log(`Something went wrong!\n\nError: ${error}`);
      }
    });

    /**
     * If masterserver send us isConnected confirmation,
     * then we are connected!
     */
    const isConnectedHandler = async () => {
      console.log(
        "Connected to the masterserver... waiting for the client to be connected."
      );
    };

    /**
     * register the agent information to the masterserver
     */
    connectAgent.write({
      name: hostname(),
      os: type()
    });

    /**
     * If the masterserver send us the isConnected message,
     * then we register this status through AgentStore and fire isConnectedHandler
     */
    connectAgent.on("data", data => {
      // Define if the agent is connected
      if (AgentStore.agentConnected === false && data.agentConnected === true) {
        AgentStore.setAgentStatus(true);
      }

      // If client is connected, add the numbers to the list
      if (data.numbers.length !== 0) {
        console.log(`Adding ${data.numbers.length} numbers to the list...`);
        AgentStore.addNumbers(data.numbers);
      }

      // If we have finished the adding, then sort
      if (data.transferCompleted) {
        console.log(`Total numbers received: ${AgentStore.numbers.length}`);
        console.log("Sorting the numbers...");
        AgentStore.sortNumbers();

        console.log("Sorting completed.");

        // Now it will send the numbers back to masterserver
        sendToMasterserver();
      }
    });

    /**
     * Transfer back the sorted numbers
     */
    const sendToMasterserver = () => {
      let chunks = chunker(AgentStore.numbers, MAX_CHUNK_PER_CHUNKS);

      console.log(`Sending the chunks back to masterserver...`);

      chunks.map(chunk => {
        connectAgent.write({
          sortedNumbers: chunk
        });
      });

      connectAgent.write({
        sortedNumbers: [],
        transferCompleted: true
      });

      console.log(`Sent! Killing the agent...`);
      connectAgent.end();
      // process.exit(0);
    };

    /**
     * If occurs an error
     */
    connectAgent.on("error", e => {
      console.log(
        `Oops! Probably you've lost the connection to the masterserver.
        Error: ${e}`
      );
    });

    /**
     * Confirmation
     */
    connectAgent.on("end", () => {
      console.log(`The transaction has finished.`);
    });
  } catch (e) {
    console.log(e);
  }
};

/**
 * Initialize the main application
 */

console.log("Initializing...");
setTimeout(() => {
  init();
}, 1000);
