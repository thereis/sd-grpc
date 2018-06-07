import grpc from "grpc";

import { hostname, type } from "os";
import { createWriteStream } from "fs";
import { argv } from "yargs";

import signale from "signale";
import _ from "lodash";

const init = async (ip, port) => {
  try {
    /**
     * Initialize grpc.proto and then connects to masterserver
     */
    let protoDescriptor = grpc.load(__dirname + "/data/grpc.proto").SD.Project;
    let client = new protoDescriptor.SendChunk(
      `${ip}:${port}`,
      grpc.credentials.createInsecure()
    );

    // Connecting to masterserver message
    signale.info(`Connecting to: ${ip}:${port}`);

    /**
     * Connect and register the client into masterserver
     * and wait for the result
     */
    let connectClient = client.connectClient((error, result) => {
      if (error) {
        signale.error(`Something went wrong!\n\nError: ${error}`);
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
        signale.success("Finished");
        //console.log(numbers.length, _.flattenDeep(numbers).length);
        let teste = _.flattenDeep(numbers);
        fileStream.write(teste.join("\n"));
        fileStream.close();
      }
    });
  } catch (e) {
    signale.error(e.message);
  }
};

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
        "You need to use the --ip and --port flag to initialize the agent."
      );
    if (ip === "" || port === true)
      throw new Error("Provide a value to ip and port.");

    // Initialize the application
    init(ip, port);
  } catch (e) {
    signale.error(e.message);
  }
}, 1000);
