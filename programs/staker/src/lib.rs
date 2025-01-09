// Import necessary packages from Anchor framework and SPL Token libraries
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

// Declare the program ID for the smart contract
declare_id!("E1XZtRdN7pSmzTr4f26WLATW2ifneyuWShZ9ZLV7d6Me");

#[program]
pub mod staker {
    // Constants for the addresses of the reward mint and MYSPL mint
    pub const REWARD_MINT_ADDRESS: &str = "5yCiYccC6xiv7s4yPHo4ESgHjBsXh1ySuwZr9Z1oL5v7";
    pub const MYSPL_MINT_ADDRESS: &str = "6oban7Xk5hk58NngWWyajhM9pQZej2akxUBSkAKwGJPF";
    
    use super::*;

    // Function to create an associated token account (ATA) for the MYSPL token
    pub fn create_myspl_ata(ctx: Context<CreateMysplATA>) -> Result<()> {
        Ok(()) // No operation is currently performed; this function can be expanded later
    }

    // Function to stake MYSPL tokens and mint rewards
    pub fn stake(
        ctx: Context<Stake>,
        authority_of_reward_mint_bump: u8, // Bump seed for the reward mint authority
        myspl_ata_for_program_bump: u8, // Bump seed for the MYSPL ATA
        myspl_amount: u64, // Amount of MYSPL tokens to stake
    ) -> Result<()> {
        // ************************************************************
        // 1. Ask SPL Token Program to mint REWARD tokens to the user.
        // ************************************************************
        let reward_amount = myspl_amount; // For now, reward amount equals staked amount (to be modified later)

        // Get the reward mint account's public key
        let reward_mint_address = ctx.accounts.reward_mint.key();
        
        // Define the seeds for deriving a Program Derived Address (PDA) for minting rewards
        let seeds = &[
            reward_mint_address.as_ref(),
            &[authority_of_reward_mint_bump], // This is the bump to avoid collisions
        ];
        let signer = [&seeds[..]]; // Prepare the signer for authorization

        // Prepare the CPI context for minting tokens
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                // Assemble the necessary accounts for the minting operation
                mint: ctx.accounts.reward_mint.to_account_info(), // Mint account for the reward
                to: ctx.accounts.reward_ata_for_user.to_account_info(), // User's ATA for rewards
                authority: ctx.accounts.authority_of_reward_mint.to_account_info(), // Authority to mint
            },
            &signer, // Use the derived signer
        );

        // Call the mint_to CPI function to mint reward tokens
        token::mint_to(cpi_ctx, reward_amount)?;

        // ************************************************************
        // 2. Ask SPL Token Program to transfer MYSPL from the user to the program.
        // ************************************************************
        // Prepare the transfer context for moving MYSPL tokens from the user
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(), // Specify the token program to use
            token::Transfer {
                from: ctx.accounts.myspl_ata_for_user.to_account_info(), // User's ATA containing MYSPL
                to: ctx.accounts.myspl_ata_for_program.to_account_info(), // Program's ATA to hold MYSPL
                authority: ctx
                    .accounts
                    .authority_of_myspl_ata_for_user
                    .to_account_info(), // Authority of the user's MYSPL ATA
            },
        );

        // Execute the transfer of MYSPL tokens
        token::transfer(cpi_ctx, myspl_amount)?;

        Ok(()) // Return a successful result
    }

    // Function to unstake and retrieve MYSPL tokens and burn rewards
    pub fn unstake(
        ctx: Context<UnStake>,
        myspl_ata_for_program_bump: u8, // Bump seed for the MYSPL ATA
        reward_amount: u64, // The amount of rewards to burn
    ) -> Result<()> {
        // ************************************************************
        // 1. Ask SPL Token Program to burn the user's REWARD tokens.
        // ************************************************************
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Burn {
                mint: ctx.accounts.reward_mint.to_account_info(), // Mint of the reward token
                from: ctx.accounts.reward_ata_for_user.to_account_info(), // User's ATA that holds REWARD tokens
                authority: ctx
                    .accounts
                    .authority_of_reward_ata_for_user
                    .to_account_info(), // Authority for burning
            },
        );

        // Execute the burn of reward tokens
        token::burn(cpi_ctx, reward_amount)?;

        // ************************************************************
        // 2. Ask SPL Token Program to transfer MYSPL back to the user.
        // ************************************************************
        let myspl_mint_address = ctx.accounts.myspl_mint.key(); // Get the mint address for MYSPL

        // Define PDAs for the program address to retrieve MYSPL
        let seeds = &[myspl_mint_address.as_ref(), &[myspl_ata_for_program_bump]];
        let signer = [&seeds[..]]; // Prepare signer for the transaction

        // Prepare the context for transferring MYSPL back to the user
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.myspl_ata_for_program.to_account_info(), // Program ATA to transfer MYSPL from
                authority: ctx.accounts.myspl_ata_for_program.to_account_info(), // Program ATA authority
                to: ctx.accounts.myspl_ata_for_user.to_account_info(), // User's ATA to receive MYSPL
            },
            &signer, // Use the derived signer
        );

        let myspl_amount = reward_amount; // For now, reward amount equals the unstaked amount (to be modified later)
        
        // Execute the transfer of MYSPL tokens to the user
        token::transfer(cpi_ctx, myspl_amount)?;

        Ok(()) // Return a successful result
    }
}

// Structure for creating MYSPL Associated Token Account (ATA)
#[derive(Accounts)]
pub struct CreateMysplATA<'info> {
    // 1. PDA (Public Key) for MYSPL ATA for our program
    #[account(
        init,
        payer = payer, // The payer for this transaction
        seeds = [ MYSPL_MINT_ADDRESS.parse::<Pubkey>().unwrap().as_ref() ], // Create seed based on MYSPL mint
        bump,
        token::mint = myspl_mint, // Specify the token mint type
        token::authority = myspl_ata_for_program, // Authority is the program's own PDA
    )]
    pub myspl_ata_for_program: Account<'info, TokenAccount>, // Represents the Program's Associated Token Account (ATA)

    // 2. The MYSPL token mint address
    #[account(
        address = MYSPL_MINT_ADDRESS.parse::<Pubkey>().unwrap(), // Ensure the address matches the expected MYSPL mint
    )]
    pub myspl_mint: Account<'info, Mint>, // The MYSPL Mint account

    // 3. Rent payer account
    #[account(mut)]
    pub payer: Signer<'info>, // The account that will pay for any rent fees

    // 4. Required accounts for Anchor to create an Associated Token Account
    pub system_program: Program<'info, System>, // System program for account management
    pub token_program: Program<'info, Token>, // Token program for token operations
    pub rent: Sysvar<'info, Rent>, // Rent account for account state management
}

// Structure for staking tokens
#[derive(Accounts)]
#[instruction(authority_of_reward_mint_bump: u8, myspl_ata_for_program_bump: u8)]
pub struct Stake<'info> {
    pub token_program: Program<'info, Token>, // Token program to handle token operations

    // ***********
    // MINTING REWARD TO USERS
    // ***********

    #[account(mut)]
    pub reward_ata_for_user: Account<'info, TokenAccount>, // User's ATA to receive reward tokens

    /// CHECK: This account only serves as a signing PDA for minting rewards
    #[account(
    seeds = [ reward_mint.key().as_ref() ], // Seed derived from the reward mint address
    bump = authority_of_reward_mint_bump, // The bump seed to avoid collisions
    )]
    pub authority_of_reward_mint: UncheckedAccount<'info>, // Authority for the reward mint
    
    #[account(
    mut,
    address = REWARD_MINT_ADDRESS.parse::<Pubkey>().unwrap(), // Ensure the address matches the expected reward mint
    )]
    pub reward_mint: Account<'info, Mint>, // The Mint for reward tokens

    // ***********
    // TRANSFERRING MYSPL FROM USERS
    // ***********

    #[account(mut)]
    pub myspl_ata_for_user: Account<'info, TokenAccount>, // User's ATA containing MYSPL to stake

    pub authority_of_myspl_ata_for_user: Signer<'info>, // Authority for the user's ATA

    #[account(
        mut,
        seeds = [ myspl_mint.key().as_ref() ], // Seed derived from the MYSPL mint address
        bump = myspl_ata_for_program_bump, // Bump seed to ensure uniqueness
    )]
    pub myspl_ata_for_program: Account<'info, TokenAccount>, // Program's ATA to receive MYSPL tokens

    #[account(
        address = MYSPL_MINT_ADDRESS.parse::<Pubkey>().unwrap(), // Ensure the address matches the expected MYSPL mint
    )]
    pub myspl_mint: Account<'info, Mint>, // The Mint for MYSPL tokens
}

// Structure for unstaking tokens
#[derive(Accounts)]
#[instruction(myspl_ata_for_program_bump: u8)]
pub struct UnStake<'info> {
    pub token_program: Program<'info, Token>, // Token program for handling operations

    // ***********
    // BURNING USER'S REWARD
    // ***********

    #[account(mut)]
    pub reward_ata_for_user: Account<'info, TokenAccount>, // User's ATA containing rewards to burn

    pub authority_of_reward_ata_for_user: Signer<'info>, // Authority for burning rewards

    #[account(
        mut,
        address = REWARD_MINT_ADDRESS.parse::<Pubkey>().unwrap(), // Ensure the address matches the expected reward mint
    )]
    pub reward_mint: Account<'info, Mint>, // The Mint for reward tokens

    // ***********
    // TRANSFER MYSPL TO USERS
    // ***********

    #[account(
        mut,
        seeds = [ myspl_mint.key().as_ref() ], // Seed derived from the MYSPL mint address
        bump = myspl_ata_for_program_bump, // Bump seed to ensure uniqueness
    )]
    pub myspl_ata_for_program: Account<'info, TokenAccount>, // Program's ATA containing MYSPL to transfer back

    #[account(mut)]
    pub myspl_ata_for_user: Account<'info, TokenAccount>, // User's ATA to receive MYSPL tokens

    #[account(
        address = MYSPL_MINT_ADDRESS.parse::<Pubkey>().unwrap(), // Ensure the address matches the expected MYSPL mint
    )]
    pub myspl_mint: Box<Account<'info, Mint>>, // The Mint for MYSPL tokens
}