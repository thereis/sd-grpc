import { observable, decorate, computed, action } from "mobx";

function fixedSort(a, b) {
  return a - b;
}

class AgentProvider {
  agentConnected = false;
  clientConnected = false;

  numbers = [];

  setClientStatus(status) {
    return (this.clientConnected = status);
  }

  setAgentStatus(status) {
    return (this.agentConnected = status);
  }

  addNumbers(numbers) {
    return (this.numbers = [...this.numbers, ...numbers]);
  }

  sortNumbers() {
    this.numbers = this.numbers.sort(fixedSort);
    return true;
  }
}

decorate(AgentProvider, {
  agentConnected: observable,
  clientConnected: observable,
  setAgentStatus: action,
  setClientStatus: action,
  addNumbers: action,
  sortNumbers: action
});

export default AgentProvider;
