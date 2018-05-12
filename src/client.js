import grpc from "grpc";

const init = async () => {
  /**
   * Initialize grpc.proto and then connects to masterserver
   */
  let protoDescriptor = grpc.load(__dirname + "/data/grpc.proto");
  let client = new protoDescriptor.SD.Project.SendChunk(
    "0.0.0.0:50051",
    grpc.credentials.createInsecure()
  );

  /**
   * Connect and register the client into master server
   */
  let connectClient = client.connectClient((error, result) =>
    console.log(error, result)
  );

  /**
   * Check if client is connected to the masterserver
   */
  let isConnected = connectClient.write({
    name: "Servidor 1",
    details: "oi"
  });
};

init();
