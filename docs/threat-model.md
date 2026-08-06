# Bridge threat model

| Threat | Preventive control | Detection | Response |
|---|---|---|---|
| Unbacked Solana mint | NTT-only authority; checked set/claim | Supply reconciliation | Pause both managers |
| Forged/replayed message | Peers, threshold, replay protection | Rejection alerts | Pause and preserve evidence |
| Compromised administrator | Multisig/MPC and separated roles | Authority monitoring | Pause and rotate safe roles |
| Wrong peer or chain ID | Cross-file validation | Startup audit | Keep paused and correct |
| Rate-limit bypass | Conservative limits | Flow anomaly alerts | Zero limits and pause |
| Stuck transfer | Queue monitoring | Queue-age alert | Stop new transfers |
| RPC deception | Independent providers | State mismatch | Discard evidence |
| Dependency compromise | Lockfile and audit gate | CI/audit failure | Block release |

The verifier cannot prove operator observations came from honest RPCs.
Production reconciliation must use finalized state from independent providers
at recorded checkpoints, with separate review of the raw responses.
