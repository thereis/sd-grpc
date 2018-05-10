import { readFileSync } from "fs";
import { chunker, convertToDouble } from "./utils";

let grpc = require("grpc");
let protoDescriptor = grpc.load("./grpc.proto");

/**
 * Load the file synchronous
 */
const loadFile = async () => {
  console.log("Loading file...");

  let content = await readFileSync("data.in", "utf8");

  return content.toString().split("\n");
};

/**
 * Main application function
 */
const init = async () => {
  let numbers = await loadFile();

  console.log("File loaded!");

  /**
   * Numbers configuration
   */
  let numbersLength = numbers.length;

  const maxChunks = 3;
  const chunkDivisor = Math.ceil(numbersLength / maxChunks);
  const chunks = chunker(numbers, chunkDivisor);

  let client = new protoDescriptor.SD.Project.SendChunk(
    "0.0.0.0:50051",
    grpc.credentials.createInsecure()
  );

  let call = client.sendChunk((error, result) => console.log(error, result));


  call.write({ numbers: convertToDouble(chunks[0]) });

  call.end();
};

/**
 * Initialize the main application
 */
init();
