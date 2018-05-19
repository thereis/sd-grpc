import { observable, action, computed, decorate } from "mobx";

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

  removeAgent(agent) {
    this.agents = this.agents.filter(obj => obj.id !== agent.id);
    return true;
  }

  get totalAgents() {
    return this.agents.length;
  }

  setBundleStatus(status) {
    return (this.bundleLoaded = status);
  }

  setBundle(content) {
    return (this.bundle = content);
  }

  setBundleLocked(status) {
    return (this.bundleLocked = status);
  }
}

decorate(ServerProvider, {
  agents: observable,
  clientConnected: observable,
  addAgent: action,
  removeAgent: action,
  totalAgents: computed,
  setClientStatus: action,
  bundle: observable,
  bundleLoaded: observable,
  bundleLocked: observable,
  setBundle: action,
  setBundleStatus: action,
  setBundleLocked: action
});

const ServerStore = new ServerProvider();

export default ServerStore;
