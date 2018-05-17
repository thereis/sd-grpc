import { observable, decorate, computed, action } from "mobx";

class AgentProvider {
  agentConnected = false;
  clientConnected = false;

  get clientStatus() {
    return this.clientConnected;
  }

  get agentStatus() {
    return this.agentConnected;
  }

  setClientStatus(status) {
    return (this.clientConnected = status);
  }

  setAgentStatus(status) {
    return (this.agentConnected = status);
  }
}

decorate(AgentProvider, {
  agentConnected: observable,
  clientConnected: observable,
  agentStatus: computed,
  clientStatus: computed,
  setAgentStatus: action,
  setClientStatus: action
});

export default AgentProvider;
