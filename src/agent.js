"use strict";

import { hostname, type } from "os";
import { observe } from "mobx";
import { argv } from "yargs";

import signale from "signale";

import grpc from "grpc";
import AgentProvider from "./store/agent";
import { chunker } from "./utils";

// max chunk per chunks
const MAX_CHUNK_PER_CHUNKS = 30000;

/**
 * Main application function
 */
const init = async (ip, port) => {
  try {
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

    // Connecting to masterserver message
    signale.info(`Connecting to: ${ip}:${port}`);

    /**
     * Connect and register the agent into masterserver
     * and wait for the result
     */
    let connectAgent = agent.connectAgent((error, result) => {
      if (error) {
        signale.error(`Something went wrong!\n\nError: ${error}`);
      }
    });

    /**
     * If masterserver send us isConnected confirmation,
     * then we are connected!
     */
    const isConnectedHandler = async () => {
      signale.success(
        "Connected to the masterserver... waiting for the client to be connected."
      );
    };

    /**
     * Registers the agent information to the masterserver
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
        signale.await(`Adding ${data.numbers.length} numbers to the list...`);
        AgentStore.addNumbers(data.numbers);
      }

      // If we have finished the adding, then sort
      if (data.transferCompleted) {
        signale.success(`Total numbers received: ${AgentStore.numbers.length}`);
        signale.await("Sorting the numbers...");

        // Sort the numbers
        AgentStore.sortNumbers();

        // Now it will send the numbers back to masterserver
        signale.success("Sorting completed.");
        sendToMasterserver();
      }
    });

    /**
     * Transfer back the sorted numbers
     */
    const sendToMasterserver = () => {
      let chunks = chunker(AgentStore.numbers, MAX_CHUNK_PER_CHUNKS);

      signale.await(`Sending the chunks back to masterserver...`);

      chunks.map(chunk => {
        connectAgent.write({
          sortedNumbers: chunk
        });
      });

      connectAgent.write({
        sortedNumbers: [],
        transferCompleted: true
      });

      signale.complete(`Sent! Killing the agent...`);
      connectAgent.end();
      // process.exit(0);
    };

    /**
     * If occurs an error
     */
    connectAgent.on("error", e => {
      signale.error(
        `Oops! Probably you've lost the connection to the masterserver.
        Error: ${e}`
      );
    });

    /**
     * Confirmation
     */
    connectAgent.on("end", () => {
      signale.complete(`The transaction has finished.`);
    });
  } catch (e) {
    signale.error(e);
  }
};

/**
 * Initialize the main application
 */

signale.info("Initializing...");
setTimeout(() => {
  try {
    /**
     * Check if arguments have been passed
     */
    let ip = argv.ip,
      port = argv.port;

    if (!ip || !port)
      throw new Error(
        "You need to use the -- --ip --port flag to initialize the client."
      );
    if (ip === "" || port === true)
      throw new Error("Provide a value to ip and port.");

    // Init the application
    init(ip, port);
  } catch (e) {
    signale.error(e.message);
  }
}, 1500);
