import { hostname, type } from "os";
import { createWriteStream } from "fs";
import { observe } from "mobx";
import { argv } from "yargs";

import grpc from "grpc";
import _ from "lodash";

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
     * Initialize grpc.proto and then connects to masterserver
     */
    let protoDescriptor = grpc.load(__dirname + "/data/grpc.proto").SD.Project;
    let client = new protoDescriptor.SendChunk(
      `${ip}:${port}`,
      grpc.credentials.createInsecure()
    );

    console.log("Connecting...");

    /**
     * Connect and register the client into masterserver
     * and wait for the result
     */
    let connectClient = client.connectClient((error, result) => {
      if (error) {
        console.log(`Something went wrong!\n\nError: ${error}`);
      }
    });

    connectClient.write({
      name: hostname(),
      os: type()
    });

    let numbers = [];

    let fileStream = createWriteStream(__dirname + "/data/data.out");

    connectClient.on("data", data => {
      if (data.sortedNumbers.length > 0) {
        numbers.push(data.sortedNumbers);
      }

      if (data.transferCompleted) {
        // connectClient.end();
        console.log("Finished");
        console.log(numbers.length, _.flattenDeep(numbers).length);
        let teste = _.flattenDeep(numbers);
        fileStream.write(teste.join("\n"));
        fileStream.close();
      }
    });
  } catch (e) {
    console.log(e);
  }
};

console.log("Initializing...");
setTimeout(() => {
  init();
}, 1000);
