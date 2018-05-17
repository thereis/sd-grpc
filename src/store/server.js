import { observable, action, computed, decorate } from "mobx";

class ServerProvider {
  agents = [];
  clientConnected = false;
  fileLoaded = false;
  fileContent = null;
  fileLocked = false;

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

  get clientStatus() {
    return this.clientConnected;
  }

  setFileStatus(status) {
    return (this.fileLoaded = status);
  }

  setFileContent(content) {
    return (this.fileContent = content);
  }

  setFileLocked(status) {
    return (this.fileLocked = status);
  }
}

decorate(ServerProvider, {
  agents: observable,
  clientConnected: observable,
  addAgent: action,
  removeAgent: action,
  totalAgents: computed,
  setClientStatus: action,
  clientStatus: computed,
  fileLoaded: observable,
  setFileStatus: action,
  setFileContent: action,
  fileLocked: observable,
  setFileLocked: action
});

const ServerStore = new ServerProvider();

export default ServerStore;
