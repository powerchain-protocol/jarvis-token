# Incident response

## Immediate containment

1. Pause both NTT managers through the emergency multisig.
2. Set inbound and outbound limits to zero where supported.
3. Stop relayers and user bridge initiation without deleting evidence.
4. Record finalized checkpoints, queues, locked balance, wrapped supply, and
   authorities using at least two independent RPC providers.
5. Notify security, operations, treasury, bridge provider, legal/compliance,
   and communications owners through the private incident channel.

Never manually mint or release funds to hide an unexplained discrepancy.
Recovery requires root cause and impact reports, independently reviewed fixes,
simulation, testnet reproduction, multisig approval, and a new evidence bundle.
Unpause in stages with minimal limits and enhanced monitoring.

Mandatory alerts include failed supply invariants, RPC disagreement, authority
or peer changes, threshold/mode/limit changes, excessive queue age, repeated
redemption failures, and relevant high/critical dependency advisories.
