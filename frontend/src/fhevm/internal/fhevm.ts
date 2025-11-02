import { Eip1193Provider, JsonRpcProvider } from "ethers";
import type { FhevmInstance } from "../fhevmTypes";

declare global {
  interface Window {
    relayerSDK?: any & { __initialized__?: boolean };
    ethereum?: Eip1193Provider;
  }
}

async function getChainId(providerOrUrl: Eip1193Provider | string): Promise<number> {
  if (typeof providerOrUrl === "string") {
    const provider = new JsonRpcProvider(providerOrUrl);
    const net = await provider.getNetwork();
    return Number(net.chainId);
  }
  const chainIdHex = (await providerOrUrl.request({ method: "eth_chainId" })) as string;
  return Number.parseInt(chainIdHex, 16);
}

async function getWeb3Client(rpcUrl: string) {
  const rpc = new JsonRpcProvider(rpcUrl);
  try {
    return await rpc.send("web3_clientVersion", []);
  } finally {
    rpc.destroy();
  }
}

async function getFHEVMRelayerMetadata(rpcUrl: string) {
  const rpc = new JsonRpcProvider(rpcUrl);
  try {
    return await rpc.send("fhevm_relayer_metadata", []);
  } finally {
    rpc.destroy();
  }
}

export async function createFhevmInstance(parameters: {
  provider: Eip1193Provider | string;
  signal?: AbortSignal;
  mockChains?: Record<number, string>;
}): Promise<FhevmInstance> {
  const { provider, signal, mockChains } = parameters;
  const throwIfAborted = () => {
    if (signal?.aborted) throw new Error("aborted");
  };

  const chainId = await getChainId(provider);
  let rpcUrl: string | undefined = typeof provider === "string" ? provider : undefined;
  const mocks: Record<number, string> = { 31337: "http://localhost:8545", ...(mockChains ?? {}) };

  if (mocks[chainId]) {
    rpcUrl = rpcUrl ?? mocks[chainId];
    const version = await getWeb3Client(rpcUrl!);
    if (typeof version === "string" && version.toLowerCase().includes("hardhat")) {
      const metadata = await getFHEVMRelayerMetadata(rpcUrl!);
      if (
        metadata &&
        typeof metadata === "object" &&
        typeof metadata.ACLAddress === "string" &&
        metadata.ACLAddress.startsWith("0x")
      ) {
        const { fhevmMockCreateInstance } = await import("./mock/fhevmMock");
        return fhevmMockCreateInstance({
          rpcUrl: rpcUrl!,
          chainId,
          metadata,
        });
      }
    }
  }

  // Use UMD web bundle on window
  if (!window.relayerSDK?.__initialized__) {
    // dynamic load via CDN is possible here; assume initialized externally or by app
    const { initSDK } = await import("@zama-fhe/relayer-sdk/bundle");
    await initSDK();
    window.relayerSDK = await import("@zama-fhe/relayer-sdk/bundle");
    window.relayerSDK.__initialized__ = true;
  }

  const relayerSDK = window.relayerSDK;
  const config = {
    ...relayerSDK.SepoliaConfig,
    network: provider,
  };
  throwIfAborted();
  const instance: FhevmInstance = await relayerSDK.createInstance(config);
  throwIfAborted();
  return instance;
}


