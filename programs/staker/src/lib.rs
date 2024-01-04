use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

declare_id!("CDtkAZN1PyZSDr8mteexTHivFXSQfy1faqXmagwgG1Z4");

#[program]
pub mod staker {
    pub const REWARD_MINT_ADDRESS: &str = "AXQgYYmLHasZoMukQ8jwmE2md9BYUUQgqv5VHvi6CH4p";
    pub const MYSPL_MINT_ADDRESS: &str = "Cir79rCNYx21nEhyPspnttAfmU6HQt5Es1by38JDhqnu";
    use super::*;
    pub fn create_myspl_ata(ctx: Context<CreateMysplATA>) -> Result<()> {
        Ok(())
    }

    pub fn stake(
        ctx: Context<Stake>,
        reward_mint_authority_bump: u8,
        // program_myspl_ata_bump: u8,
        myspl_amount: u64,
    ) -> Result<()> {
        // ************************************************************
        // 1. Ask SPL Token Program to mint REWARD to the user.
        // ************************************************************
        // findPDA(programId + seed)
        // rewardMintPDA, rewardMintPDABump = findPDA(programId + rewardMint.address)
        // and get signer
        let reward_amount = myspl_amount; // TODO: Change the formula
        let reward_mint_address = ctx.accounts.reward_mint.key();
        let seeds = &[reward_mint_address.as_ref(), &[reward_mint_authority_bump]];
        let signer = [&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.reward_mint.to_account_info(),
                to: ctx.accounts.user_reward_ata.to_account_info(),
                authority: ctx.accounts.reward_mint_authority.to_account_info(),
            },
            &signer,
        );
        token::mint_to(cpi_ctx, reward_amount)?;

        // ************************************************************
        // 2. Ask SPL Token Program to transfer MYSPL from the user.
        // ************************************************************
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.user_myspl_ata.to_account_info(),
                to: ctx.accounts.program_myspl_ata.to_account_info(),
                authority: ctx
                    .accounts
                    .user_myspl_ata_authority
                    .to_account_info(),
            },
        );
        token::transfer(cpi_ctx, myspl_amount)?;

        Ok(())
    }

    pub fn unstake(
        ctx: Context<UnStake>,
        program_myspl_ata_bump: u8,
        reward_amount: u64,
    ) -> Result<()> {
        // ************************************************************
        // 1. Ask SPL Token Program to burn user's REWARD.
        // ************************************************************
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Burn {
                mint: ctx.accounts.reward_mint.to_account_info(),
                from: ctx.accounts.user_reward_ata.to_account_info(),
                authority: ctx
                    .accounts
                    .user_reward_ata_authority
                    .to_account_info(),
            },
        );
        token::burn(cpi_ctx, reward_amount)?;

        // ************************************************************
        // 2. Ask SPL Token Program to transfer back MYSPL to the user.
        // ************************************************************
        let myspl_mint_address = ctx.accounts.myspl_mint.key();
        let seeds = &[myspl_mint_address.as_ref(), &[program_myspl_ata_bump]];
        let signer = [&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.program_myspl_ata.to_account_info(),
                authority: ctx.accounts.program_myspl_ata.to_account_info(),
                to: ctx.accounts.user_myspl_ata.to_account_info(),
            },
            &signer,
        );

        let myspl_amount = reward_amount; // TODO: Change the formula
        token::transfer(cpi_ctx, myspl_amount)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateMysplATA<'info> {
    // 1. PDA (pubkey) for myspl ATA for our program.
    // seeds: We use the token mint as a seed for the mapping -> think "HashMap[seeds+bump] = pda"
    // token::mint: Token Program wants to know what kind of token this ATA is for
    // token::authority: It's a PDA so the authority is itself!
    #[account(
        init,
        payer = payer,
        seeds = [ MYSPL_MINT_ADDRESS.parse::<Pubkey>().unwrap().as_ref() ],
        bump,
        token::mint = myspl_mint,
        token::authority = program_myspl_ata,
    )]
    pub program_myspl_ata: Account<'info, TokenAccount>,

    // 2. The MYSPL token address used as token::mint = [...]
    #[account(
        address = MYSPL_MINT_ADDRESS.parse::<Pubkey>().unwrap(),
    )]
    pub myspl_mint: Account<'info, Mint>,

    // 3. The rent payer
    #[account(mut)]
    pub payer: Signer<'info>,

    // 4. Anchor needed  for the creation of an Associated Token Account
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(reward_mint_authority_bump: u8, program_myspl_ata_bump: u8)]
pub struct Stake<'info> {
    // SPL Token Program
    pub token_program: Program<'info, Token>,

    // ***********
    // MINTING REWARD TO USERS
    // ***********

    // Address of the REWARD mint allowed as mutate for mint new for user
    #[account(
    mut,
    address = REWARD_MINT_ADDRESS.parse::<Pubkey>().unwrap(),
    )]
    pub reward_mint: Account<'info, Mint>,

    /// CHECK: only used as a signing PDA for mutate the above
    #[account(
    seeds = [ reward_mint.key().as_ref() ],
    bump = reward_mint_authority_bump,
    )]
    pub reward_mint_authority: UncheckedAccount<'info>,

    // User ATAt for receive REWARD
    #[account(mut)]
    pub user_reward_ata: Account<'info, TokenAccount>,

    // ***********
    // TRANSFERING MYSPL FROM USERS
    // ***********

    // User ATA which holds MYSPL.
    #[account(mut)]
    pub user_myspl_ata: Account<'info, TokenAccount>,

    // User ATA authority allowed for mutate the above
    pub user_myspl_ata_authority: Signer<'info>,

    // Program ATA to receive MYSPL from users
    #[account(
        mut,
        seeds = [ myspl_mint.key().as_ref() ],
        bump = program_myspl_ata_bump,
    )]
    pub program_myspl_ata: Account<'info, TokenAccount>,

    // Require for the PDA above
    #[account(
        address = MYSPL_MINT_ADDRESS.parse::<Pubkey>().unwrap(),
    )]
    pub myspl_mint: Account<'info, Mint>,
}

#[derive(Accounts)]
#[instruction(program_myspl_ata_bump: u8)]
pub struct UnStake<'info> {
    // SPL Token Program
    pub token_program: Program<'info, Token>,

    // ***********
    // BURNING USER'S REWARD
    // ***********

    // REWARD address use in `token::Burn.mint`
    #[account(
        mut,
        address = REWARD_MINT_ADDRESS.parse::<Pubkey>().unwrap(),
    )]
    pub reward_mint: Account<'info, Mint>,

    // user ata which hold REWARD use in `token::Burn.to`
    #[account(mut)]
    pub user_reward_ata: Account<'info, TokenAccount>,

    // The authority allowed for mutate the above
    pub user_reward_ata_authority: Signer<'info>,

    // ***********
    // TRANSFER MYSPL TO USERS
    // ***********

    // Program ATA use for `token::Transfer.from`
    #[account(
        mut,
        seeds = [ myspl_mint.key().as_ref() ],
        bump = program_myspl_ata_bump,
    )]
    pub program_myspl_ata: Account<'info, TokenAccount>,

    // user ATA use for `token::Transfer.to`
    #[account(mut)]
    pub user_myspl_ata: Account<'info, TokenAccount>,

    // Require for the PDA above
    #[account(
        address = MYSPL_MINT_ADDRESS.parse::<Pubkey>().unwrap(),
    )]
    pub myspl_mint: Box<Account<'info, Mint>>,
}
