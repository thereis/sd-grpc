import grpc from "grpc";
import { create } from "domain";
var protoDescriptor = grpc.load("./grpc.proto");
const bim = protoDescriptor.SD.Project;

function createServer() {
  const server = new grpc.Server();

  server.addService(protoDescriptor.SD.Project.SendChunk.service, {
    sendChunk
  });

  server.bind("0.0.0.0:50051", grpc.ServerCredentials.createInsecure());

  server.start();
  console.log("Server running on port 50051");

  function sendChunk(call, callback) {
    let data = [];

    call.on("data", item => {
      console.log("Received: ", item);
      data = item.numbers;
    });

    let result = data.sort();

    console.log(result, 'result here');

    call.on("end", () => callback(null, data.sort((a, b) => a - b)));
  }
}

createServer();
