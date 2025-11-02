/* eslint-disable no-console */
import { promises as fs } from "fs";
import path from "path";

const ROOT = path.resolve(process.cwd(), "..");
const BACKEND = path.resolve(process.cwd(), "../backend");
const FRONTEND = path.resolve(process.cwd(), "../frontend");

async function main() {
  const deploymentsDir = path.join(BACKEND, "deployments");
  const outDir = path.join(FRONTEND, "src", "abi");
  await fs.mkdir(outDir, { recursive: true });

  const entries = await fs.readdir(deploymentsDir, { withFileTypes: true });
  const addresses = {};
  let abi = null;

  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const networkDir = ent.name;
    const p = path.join(deploymentsDir, networkDir, "Lotto.json");
    try {
      const raw = await fs.readFile(p, "utf8");
      const json = JSON.parse(raw);
      // derive numeric chainId from hardhat-deploy metadata when present
      let chainIdStr = networkDir;
      try {
        const chainIdFile = path.join(deploymentsDir, networkDir, ".chainId");
        const rawId = await fs.readFile(chainIdFile, "utf8");
        chainIdStr = String(rawId).trim();
      } catch {}

      addresses[chainIdStr] = {
        chainId: Number(chainIdStr),
        chainName: json.network || networkDir,
        address: json.address,
      };
      abi = json.abi;
    } catch {
      // ignore missing
    }
  }

  if (abi) {
    const abiFile = path.join(outDir, "LottoABI.ts");
    const content = `export const LottoABI = {\n  abi: ${JSON.stringify(abi, null, 2)}\n} as const;\n`;
    await fs.writeFile(abiFile, content, "utf8");
    console.log(`Wrote ${abiFile}`);
  }

  const addressesFile = path.join(outDir, "LottoAddresses.ts");
  const addrContent = `export const LottoAddresses = ${JSON.stringify(addresses, null, 2)} as const;\n`;
  await fs.writeFile(addressesFile, addrContent, "utf8");
  console.log(`Wrote ${addressesFile}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


