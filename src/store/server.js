import { observable, action, computed, decorate } from "mobx";

class ServerProvider {
  agents = [];
  client = [];

  addAgent(agent) {
    this.agents.push(agent);
  }

  removeAgent(agent) {
    this.agents = this.agents.filter(obj => obj.id !== agent.id);
    return true;
  }

  get totalAgents() {
    return this.agents.length;
  }

  get isClientConnected() {
    return this.client.length !== 0 ? true : false;
  }
}

decorate(ServerProvider, {
  agents: observable,
  client: observable,
  addAgent: action,
  removeAgent: action,
  totalAgents: computed,
  isClientConnected: computed
});

const ServerStore = new ServerProvider();

export default ServerStore;
