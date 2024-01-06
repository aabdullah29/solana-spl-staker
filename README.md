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
`scripts/spl`
  1. for mint spl token 1st set the `.env` requirements
  2. set the token metadata in `scripts/spl/splHelper/consts.ts`
  3. after mint mint address and other info will save in `scripts/spl/outputs` folder with the token name

### Run scripts
  1. `scripts/spl/call/mint.ts` for mint new spl token (before this `.env` and `conts.ts` should be set)
  2. `scripts/spl/call/update.ts` for update spl token metadata (before this `.env` and `conts.ts` should be set)
  3. `scripts/spl/call/disableMintAuthority.ts` for disable mint authority
  4. `scripts/spl/call/disableMetadataMutable.ts` for disable metadata mutable
  5. `scripts/spl/call/disableFreezeAuthority.ts` for disable freeze authority


