import { observable, decorate } from "mobx";

class AgentProvider {
  isConnected = false;
}

decorate(AgentProvider, {
  isConnected: observable
});

export default AgentProvider;
