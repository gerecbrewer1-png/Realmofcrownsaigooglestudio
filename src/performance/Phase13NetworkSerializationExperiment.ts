export type SerializationMode = 'main_thread_json' | 'main_thread_binary' | 'worker_binary' | 'gateway_fanout';

export class Phase13NetworkSerializationExperiment {
  private mode: SerializationMode;
  private numClients: number = 5000;
  
  public mainThreadCpuMs: number = 0;
  public workerCpuMs: number = 0;
  public gatewayCpuMs: number = 0;

  constructor(mode: SerializationMode, clients: number = 5000) {
    this.mode = mode;
    this.numClients = clients;
  }

  public simulateBroadcastTick() {
    if (this.mode === 'main_thread_json') {
      // JSON.stringify on 5,000 dense payloads
      this.mainThreadCpuMs = this.numClients * 0.05; 
    } else if (this.mode === 'main_thread_binary') {
      // Writing to DataView/ArrayBuffer on main thread
      this.mainThreadCpuMs = this.numClients * 0.015;
    } else if (this.mode === 'worker_binary') {
      // Workers encode the binary payloads in parallel
      this.workerCpuMs = this.numClients * 0.015; // Spread across workers
      // Main thread only manages the WebSocket sends
      this.mainThreadCpuMs = this.numClients * 0.008; 
    } else if (this.mode === 'gateway_fanout') {
      // Workers encode in parallel
      this.workerCpuMs = this.numClients * 0.015;
      // Main thread sends ONE copy of the data per region to Gateway processes
      this.mainThreadCpuMs = 0.5;
      // Dedicated network Node.js processes handle the 5,000 individual WebSocket sends
      this.gatewayCpuMs = this.numClients * 0.007; 
    }
  }

  public getMetrics() {
    return {
      mainThreadMs: this.mainThreadCpuMs,
      workerMs: this.workerCpuMs,
      gatewayMs: this.gatewayCpuMs
    };
  }
}
