import { observable, action, computed, decorate, toJS } from "mobx";
import _ from "lodash";

class ServerProvider {
  agents = [];
  clientConnected = false;

  bundle = null;
  bundleLoaded = false;
  bundleLocked = false;

  setClientStatus(status) {
    return (this.clientConnected = status);
  }

  addAgent(agent) {
    this.agents.push(agent);
  }

  updateAgent(id, content) {
    let index = _.findIndex(this.agents, obj => obj.id === id);
    let agent = this.agents[index];
    return (agent.data = { ...agent.data, ...content });
  }

  removeAgent(agent) {
    this.agents = this.agents.filter(obj => obj.id !== agent.id);
    return true;
  }

  get totalAgents() {
    return this.agents.length;
  }

  get transfersCompleted() {
    let count = 0;

    // iterate over list
    this.agents.map(obj => {
      if (obj.data.transferCompleted) count++;
    });

    if (this.totalAgents === count) return true;
    else return false;
  }

  addToBundle(agentId, content) {
    return this.bundle[agentId - 1].push(content);
  }

  setBundle(content) {
    return (this.bundle = content);
  }

  setBundleStatus(status) {
    return (this.bundleLoaded = status);
  }

  setBundleLocked(status) {
    return (this.bundleLocked = status);
  }

  get bundleSize() {
    return this.bundle.length;
  }

  get shallowBundle() {
    let numbers = toJS(this.bundle);
    return _.flattenDeep(numbers);
  }
}

decorate(ServerProvider, {
  agents: observable,
  clientConnected: observable,
  addAgent: action,
  updateAgent: action,
  removeAgent: action,
  totalAgents: computed,
  transfersCompleted: computed,
  setClientStatus: action,
  bundle: observable,
  bundleLoaded: observable,
  bundleLocked: observable,
  addToBundle: action,
  setBundle: action,
  setBundleStatus: action,
  setBundleLocked: action,
  bundleSize: computed,
  shallowBundle: computed
});

const ServerStore = new ServerProvider();

export default ServerStore;
