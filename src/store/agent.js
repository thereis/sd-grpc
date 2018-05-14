import { observable, decorate, computed, action } from "mobx";

class AgentProvider {
  isConnected = false;

  get status() {
    return this.isConnected;
  }

  setStatus(status) {
    return (this.isConnected = status);
  }
}

decorate(AgentProvider, {
  isConnected: observable,
  status: computed,
  setStatus: action
});

export default AgentProvider;
