import { readFileSync } from "fs";
import { chunker } from "./utils";

const loadFile = async () => {
  console.log("Loading file...");

  let content = await readFileSync("data.in", "utf8");

  console.log("Loaded! Returning statement...");
  
  return content.toString().split("\n");
};

const init = async () => {
  console.log("Loading v");
  let numbers = await loadFile();
  let numbersLength = numbers.length;

  const maxChunks = 3;
  const chunkDivisor = Math.ceil(numbersLength / maxChunks);
  const chunks = chunker(numbers, chunkDivisor);

  // Initializes chunks array
  /*for (let i = 1; i <= maxChunks; i++) {
    let test = numbers.splice(chunkAux, chunkDivisor * i);

    console.log(test);

    chunkAux = test.length - 1;
  }*/

  //console.log(chunksMap);
};

// Initialize main application
init();
