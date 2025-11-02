"use client";

import { ethers } from "ethers";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import type { GenericStringStorage } from "@/fhevm/GenericStringStorage";
import { LottoABI } from "@/abi/LottoABI";
import { LottoAddresses } from "@/abi/LottoAddresses";

export const useLotto = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  chainId: number | undefined;
  signer: ethers.JsonRpcSigner | undefined;
  readonlyProvider: ethers.ContractRunner | undefined;
}) => {
  const { instance, fhevmDecryptionSignatureStorage, chainId, signer, readonlyProvider } = parameters;
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastTokenId, setLastTokenId] = useState<number | undefined>(undefined);
  const [ticketHandle, setTicketHandle] = useState<string | undefined>(undefined);
  const [resultHandle, setResultHandle] = useState<string | undefined>(undefined);
  const [clearResult, setClearResult] = useState<boolean | undefined>(undefined);
  const [currentRound, setCurrentRound] = useState<number | undefined>(undefined);
  const [clearTicketNumber, setClearTicketNumber] = useState<number | undefined>(undefined);
  const [winningHandle, setWinningHandle] = useState<string | undefined>(undefined);
  const [clearWinning, setClearWinning] = useState<number | undefined>(undefined);
  const [winningRevealed, setWinningRevealed] = useState<boolean | undefined>(undefined);
  const [ownerAddress, setOwnerAddress] = useState<string | undefined>(undefined);
  const [isOwner, setIsOwner] = useState<boolean>(false);

  const ref = useRef({ busy, lastTokenId, ticketHandle, resultHandle, clearResult, currentRound, winningHandle, clearWinning });
  useEffect(() => { ref.current = { busy, lastTokenId, ticketHandle, resultHandle, clearResult, currentRound, winningHandle, clearWinning }; }, [busy, lastTokenId, ticketHandle, resultHandle, clearResult, currentRound, winningHandle, clearWinning]);

  const lotto = useMemo(() => {
    if (!chainId) return { abi: LottoABI.abi } as const;
    const entry = LottoAddresses[chainId.toString() as keyof typeof LottoAddresses];
    return { abi: LottoABI.abi, address: entry?.address as `0x${string}` | undefined, chainId: entry?.chainId, chainName: entry?.chainName } as const;
  }, [chainId]);

  const isDeployed = useMemo(() => Boolean(lotto.address && lotto.address !== ethers.ZeroAddress), [lotto.address]);

  const refreshRound = useCallback(() => {
    if (!lotto.address || !readonlyProvider) return;
    const c = new ethers.Contract(lotto.address, lotto.abi, readonlyProvider);
    c.currentRound().then((r: bigint) => setCurrentRound(Number(r))).catch(() => setCurrentRound(undefined));
  }, [lotto.address, lotto.abi, readonlyProvider]);

  useEffect(() => { refreshRound(); }, [refreshRound]);

  // Fetch contract owner and check if current signer is owner
  useEffect(() => {
    if (!lotto.address || !readonlyProvider || !signer) return;
    const c = new ethers.Contract(lotto.address, lotto.abi, readonlyProvider);
    Promise.all([c.owner(), signer.getAddress()]).then(([owner, signerAddr]: [string, string]) => {
      setOwnerAddress(owner);
      setIsOwner(owner.toLowerCase() === signerAddr.toLowerCase());
    }).catch(() => {
      setOwnerAddress(undefined);
      setIsOwner(false);
    });
  }, [lotto.address, lotto.abi, readonlyProvider, signer]);

  const canBuy = useMemo(() => !!lotto.address && !!instance && !!signer && !busy, [lotto.address, instance, signer, busy]);
  const buyTicket = useCallback((num: number) => {
    if (ref.current.busy) return;
    if (!lotto.address || !instance || !signer) return;
    if (!(num >= 1 && num <= 99)) { setMessage("⚠️ Please choose a number between 1 and 99"); return; }
    setBusy(true); setMessage(`🔐 Encrypting your lucky number (${num}) with FHEVM...`);
    const address = lotto.address; const abi = lotto.abi; const thisSigner = signer;
    const run = async () => {
      try {
        const contract = new ethers.Contract(address, abi, thisSigner);
        const input = instance.createEncryptedInput(address, thisSigner.address);
        input.add8(num);
        const enc = await input.encrypt();
        const tx = await contract.buyTicket(enc.handles[0], enc.inputProof);
        setMessage(`⏳ Processing transaction... Please wait`);
        const receipt = await tx.wait();
        // Try parse tokenId from logs (Transfer event)
        const transferTopic = ethers.id("Transfer(address,address,uint256)");
        const log = receipt?.logs?.find((l: any) => l.topics?.[0] === transferTopic);
        if (log && log.topics?.[3]) {
          const tid = Number(BigInt(log.topics[3]));
          setLastTokenId(tid);
          setMessage(`✅ Success! Your ticket #${tid} has been purchased. Good luck!`);
        } else {
          setMessage("✅ Ticket purchased successfully!");
        }
        refreshRound();
      } catch (e) {
        setMessage(`❌ Purchase failed: ${(e as any)?.reason || (e as any)?.message || String(e)}`);
      } finally { setBusy(false); }
    };
    run();
  }, [instance, lotto.address, lotto.abi, signer, refreshRound]);

  const canDraw = useMemo(() => !!lotto.address && !!signer && !busy, [lotto.address, signer, busy]);
  const draw = useCallback(() => {
    if (ref.current.busy) return;
    if (!lotto.address || !signer) return;
    setBusy(true); setMessage("🎲 Drawing the winning number...");
    const run = async () => {
      try {
        const c = new ethers.Contract(lotto.address!, lotto.abi, signer);
        const tx = await c.drawAndStartNextRound();
        setMessage(`⏳ Waiting for blockchain confirmation...`);
        await tx.wait();
        setMessage("✅ Round complete! New round has started.");
        refreshRound();
      } catch (e) {
        setMessage(`❌ Draw failed: ${(e as any)?.reason || (e as any)?.message || String(e)}`);
      } finally { setBusy(false); }
    };
    run();
  }, [lotto.address, lotto.abi, signer, refreshRound]);

  const canRead = useMemo(() => !!lotto.address && !!readonlyProvider && !!lastTokenId && !busy, [lotto.address, readonlyProvider, lastTokenId, busy]);
  const refreshHandles = useCallback((tokenId?: number) => {
    if (ref.current.busy) return;
    if (!lotto.address || !readonlyProvider) return;
    const id = tokenId ?? ref.current.lastTokenId; if (!id) return;
    setBusy(true); setMessage(`📥 Fetching encrypted data for ticket #${id}...`);
    const c = new ethers.Contract(lotto.address!, lotto.abi, readonlyProvider);
    Promise.all([c.getTicketNumber(id), c.getTicketResult(id)]).then(([numH, resH]: [string, string]) => {
      setTicketHandle(numH);
      setResultHandle(resH);
      setMessage("✅ Ticket data fetched successfully! You can now decrypt the result.");
    }).catch((e: Error) => setMessage(`❌ Fetch failed: ${e.message}`)).finally(() => setBusy(false));
  }, [lotto.address, lotto.abi, readonlyProvider]);

  const canDecrypt = useMemo(() => !!lotto.address && !!instance && !!signer && !!resultHandle && !busy, [lotto.address, instance, signer, resultHandle, busy]);
  const decryptResult = useCallback(() => {
    if (ref.current.busy) return;
    if (!lotto.address || !instance || !signer || !resultHandle) return;
    setBusy(true); setMessage("🔓 Decrypting your result with FHEVM...");
    const run = async () => {
      try {
        const sig = await FhevmDecryptionSignature.loadOrSign(
          instance,
          [lotto.address as `0x${string}`],
          signer,
          fhevmDecryptionSignatureStorage
        );
        if (!sig) { setMessage("❌ Unable to create decryption signature. Please try again."); return; }
        const res = await instance.userDecrypt(
          [{ handle: resultHandle!, contractAddress: lotto.address! }],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );
        const v = res[resultHandle!];
        setClearResult(Boolean(v));
        setMessage(Boolean(v) ? "🎉 Congratulations! You won!" : "💫 Better luck next time! Try again.");
      } finally { setBusy(false); }
    };
    run();
  }, [fhevmDecryptionSignatureStorage, instance, lotto.address, resultHandle, signer]);

  // Decrypt user's own ticket number
  const canDecryptTicketNumber = useMemo(() => !!lotto.address && !!instance && !!signer && !!ticketHandle && !busy, [lotto.address, instance, signer, ticketHandle, busy]);
  const decryptTicketNumber = useCallback(() => {
    if (ref.current.busy) return;
    if (!lotto.address || !instance || !signer || !ticketHandle) return;
    setBusy(true); setMessage("🔓 Decrypting your ticket number...");
    const run = async () => {
      try {
        const sig = await FhevmDecryptionSignature.loadOrSign(
          instance,
          [lotto.address as `0x${string}`],
          signer,
          fhevmDecryptionSignatureStorage
        );
        if (!sig) { setMessage("❌ Unable to create decryption signature. Please try again."); return; }
        const res = await instance.userDecrypt(
          [{ handle: ticketHandle!, contractAddress: lotto.address! }],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );
        const v = res[ticketHandle!];
        setClearTicketNumber(Number(v));
        setMessage("✅ Your ticket number has been decrypted.");
      } finally { setBusy(false); }
    };
    run();
  }, [fhevmDecryptionSignatureStorage, instance, lotto.address, signer, ticketHandle]);

  // Admin: fetch and decrypt last round winning number, then optionally reveal
  const lastDrawnRound = useMemo(() => (currentRound && currentRound > 1 ? currentRound - 1 : undefined), [currentRound]);
  const canFetchWinning = useMemo(() => !!lotto.address && !!readonlyProvider && !!lastDrawnRound && !busy, [lotto.address, readonlyProvider, lastDrawnRound, busy]);
  const fetchWinningHandle = useCallback((round?: number) => {
    if (ref.current.busy) return;
    if (!lotto.address || !readonlyProvider) return;
    const r = round ?? lastDrawnRound; if (!r) return;
    setBusy(true); setMessage(`📥 Fetching winning handle for round #${r}...`);
    const c = new ethers.Contract(lotto.address!, lotto.abi, readonlyProvider);
    Promise.all([
      c.isRoundDrawn(r),
    ]).then(async ([drawn]: [boolean]) => {
      if (!drawn) { setMessage("⚠️ Round not drawn yet."); return; }
      const [wh, revealed, pub] = await Promise.all([
        c.getWinningNumber(r),
        c.isWinningRevealed(r).catch(() => false),
        c.getPublicWinning(r).catch(() => undefined)
      ]);
      setWinningHandle(wh as string);
      setWinningRevealed(Boolean(revealed as boolean));
      if (revealed && typeof pub === 'number') setClearWinning(Number(pub));
      setMessage("✅ Winning handle fetched.");
    }).catch((e: Error) => setMessage(`❌ Fetch failed: ${e.message}`)).finally(() => setBusy(false));
  }, [lotto.address, lotto.abi, readonlyProvider, lastDrawnRound]);

  const canDecryptWinning = useMemo(() => !!lotto.address && !!instance && !!signer && !!winningHandle && !busy, [lotto.address, instance, signer, winningHandle, busy]);
  const decryptWinning = useCallback(() => {
    if (ref.current.busy) return;
    if (!lotto.address || !instance || !signer || !winningHandle) return;
    setBusy(true); setMessage("🔓 Decrypting winning number (owner only)...");
    const run = async () => {
      try {
        const sig = await FhevmDecryptionSignature.loadOrSign(
          instance,
          [lotto.address as `0x${string}`],
          signer,
          fhevmDecryptionSignatureStorage
        );
        if (!sig) { setMessage("❌ Unable to create decryption signature. Please try again."); return; }
        const res = await instance.userDecrypt(
          [{ handle: winningHandle!, contractAddress: lotto.address! }],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );
        const v = res[winningHandle!];
        setClearWinning(Number(v));
        setMessage("✅ Winning number decrypted. You may now reveal it publicly.");
      } finally { setBusy(false); }
    };
    run();
  }, [fhevmDecryptionSignatureStorage, instance, lotto.address, winningHandle, signer]);

  const canRevealWinning = useMemo(() => !!lotto.address && !!signer && !!lastDrawnRound && typeof clearWinning === 'number' && !busy, [lotto.address, signer, lastDrawnRound, clearWinning, busy]);
  const revealWinning = useCallback(() => {
    if (ref.current.busy) return;
    if (!lotto.address || !signer || !lastDrawnRound || typeof clearWinning !== 'number') return;
    setBusy(true); setMessage("🚀 Publishing winning number to the public...");
    const run = async () => {
      try {
        const c = new ethers.Contract(lotto.address!, lotto.abi, signer);
        const tx = await c.revealWinning(lastDrawnRound, clearWinning);
        setMessage("⏳ Waiting for confirmation...");
        await tx.wait();
        setWinningRevealed(true);
        setMessage("✅ Winning number revealed to the public.");
      } catch (e) {
        setMessage(`❌ Reveal failed: ${(e as any)?.reason || (e as any)?.message || String(e)}`);
      } finally { setBusy(false); }
    };
    run();
  }, [lotto.address, lotto.abi, signer, lastDrawnRound, clearWinning]);

  return {
    contractAddress: lotto.address,
    isDeployed,
    message,
    busy,
    currentRound,
    lastTokenId,
    ticketHandle,
    resultHandle,
    clearResult,
    clearTicketNumber,
    winningHandle,
    clearWinning,
    winningRevealed,
    ownerAddress,
    isOwner,
    canBuy,
    buyTicket,
    canDraw,
    draw,
    canRead,
    refreshHandles,
    canDecrypt,
    decryptResult,
    canDecryptTicketNumber,
    decryptTicketNumber,
    lastDrawnRound,
    canFetchWinning,
    fetchWinningHandle,
    canDecryptWinning,
    decryptWinning,
    canRevealWinning,
    revealWinning,
  } as const;
};


