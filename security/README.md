# JARVIS token security

Token security is separated from wallet custody and provider infrastructure. The subsystem validates canonical identity, Token-2022 authorities, fixed supply policy, bridge activation prerequisites, metadata/artwork integrity, and public configuration hygiene.

Production bridge activation requires all of the following simultaneously:

- verified canonical Sui JARVIS coin type;
- verified Solana Token-2022 JARVIS mint;
- approved Solana bridge-program mint authority;
- disabled Solana freeze authority;
- verified Wormhole NTT route/transceiver;
- active reserve reconciliation monitoring;
- configured emergency pause path;
- deployment evidence marked verified.

`JARVIS_BRIDGE_ENABLED=true` is only an operator intent flag. It can never make an incomplete deployment operational by itself.

Never store private keys, mnemonics, recovery phrases, Sui keystore contents, RPC provider tokens, multisig signer material, or authority keypairs under `token/`.
