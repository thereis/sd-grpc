import { readFileSync } from "fs";
import { chunker } from "./utils";

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
};

/**
 * Initialize the main application
 */
init();
