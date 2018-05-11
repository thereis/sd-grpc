import { observable, action, computed, decorate } from "mobx";

class DataProvider {
  agents = [];

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
}

decorate(DataProvider, {
  agents: observable,
  addAgent: action,
  removeAgent: action,
  totalAgents: computed
});

const DataStore = new DataProvider();

export default DataStore;
