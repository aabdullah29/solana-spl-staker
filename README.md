# Solana DeFi Stake Program Rust
# Solana mint spl token (old token program)
# Solana mint spl authority
# Solana update spl token metadata


## Stake Program
`programs/staker/src/lib.rs`
solana rust program in anchor ehich have 3 functions:
  1. `create_myspl_ata` create ata for stake frogram for hold user tokens
  2. `stake` get user token save them in program ata and give the stake token
  3. `unstake` get stake token back from user and give his token back to him


### Get accounts for call stake program functions
run script for get functions params address `ts-node scripts/getPdaAndAtaAddressForProgram.ts`

## Mint spl tokens and update them
