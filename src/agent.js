import { readFileSync } from "fs";
import { chunker, convertToDouble } from "./utils";

let grpc = require("grpc");
let protoDescriptor = grpc.load(__dirname + "/data/grpc.proto");

/**
 * Main application function
 */
const init = async () => {
  try {
    /**
     * Instantiate a new connection to the server
     */
    let client = new protoDescriptor.SD.Project.SendChunk(
      "0.0.0.0:50051",
      grpc.credentials.createInsecure()
    );

    /**
     * Connect and register the client into master server
     */
    let connectClient = client.connectAgent((error, result) =>
      console.log(error, result)
    );

    let isConnected = connectClient.write({
      name: "Servidor 1",
      details: "oi"
    });

    if (isConnected) console.log("Connected to the master server!");
    else return console.log(`You're not able to connect to the master server`);

    //connectClient.end();

    //let call = client.sendChunk((error, result) => console.log(error, result));

    //call.write({ numbers: convertToDouble(chunks[0]) });

    //call.end();
  } catch (e) {
    console.log(e);
  }
};

/**
 * Initialize the main application
 */
init();
