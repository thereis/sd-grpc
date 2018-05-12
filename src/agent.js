import { readFileSync } from "fs";
import { chunker, convertToDouble } from "./utils";

import grpc from "grpc";
import AgentProvider from "./store/agent";
import { observe } from "mobx";

/**
 * Main application function
 */
const init = async () => {
  try {
    /**
     * Local variables
     */
    let AgentStore = new AgentProvider();

    observe(AgentStore, e => {
      console.log(e);
    });

    /**
     * Initialize grpc.proto and then connects to masterserver
     */
    let protoDescriptor = grpc.load(__dirname + "/data/grpc.proto");
    let agent = new protoDescriptor.SD.Project.SendChunk(
      "0.0.0.0:50051",
      grpc.credentials.createInsecure()
    );

    while (true) {
      /**
       * Connect and register the agent into master
       * server and wait for the result
       */
      let connectAgent = agent.connectAgent((error, result) => {
        console.log(error, result, "oioioi");

        AgentStore.isConnected = result.isConnected;
      });

      /**
       * register the agent information to the server
       */
      let teste = connectAgent.write({
        name: "Servidor 1",
        details: "oi"
      });

      connectAgent.end();

      if (AgentStore.isConnected) console.log("isconnectedbitch");

      //let response = connectAgent.end();

      //if (response) console.log("Connected to the master server!");
      //else return console.log(`You're not able to connect to the master server`);

      //connectClient.end();

      //let call = client.sendChunk((error, result) => console.log(error, result));

      //call.write({ numbers: convertToDouble(chunks[0]) });

      //call.end();
    }
  } catch (e) {
    console.log(e);
  }
};

/**
 * Initialize the main application
 */
init();
