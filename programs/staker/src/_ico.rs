use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

declare_id!("XhKfHXqkQF7ALsqyNTDK7EzZdzLidtyEa5S6dp9tXQW");

#[program]
pub mod ico {
    pub const USDT_MINT_ADDRESS: &str = "7zzcTCAHZizEkLGfJkj148TYfWfaRvs9JQn4gD75Y6gx";
    pub const ICO_MINT_ADDRESS: &str = "FBKhAghAqzttng8UAAf7VuX7msiNAtVxgEsY4PrfZxP4";
    use super::*;

    /* 
    ===========================================================
        create_ico_ata function use CreateIcoATA struct
    ===========================================================
*/
    pub fn create_ico_ata(
        ctx: Context<CreateIcoATA>,
        ico_amount: u64,
        sol_price: u64,
        usdt_price: u64,
    ) -> Result<()> {
        msg!("create program ATA for hold ICO");
        // transfer ICO admin to program ata
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.ico_ata_for_admin.to_account_info(),
                to: ctx.accounts.ico_ata_for_ico_program.to_account_info(),
                authority: ctx.accounts.admin.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, ico_amount)?;
        msg!("send {} ICO to program ATA.", ico_amount);

        // save data in data PDA
        let data = &mut ctx.accounts.data;
        data.sol = sol_price;
        data.usdt = usdt_price;
        data.admin = *ctx.accounts.admin.key;
        msg!("save data in program PDA.");
        Ok(())
    }

    /* 
    ===========================================================
        deposit_ico_in_ata function use DepositIcoInATA struct
    ===========================================================
*/
    pub fn deposit_ico_in_ata(ctx: Context<DepositIcoInATA>, ico_amount: u64) -> ProgramResult {
        if ctx.accounts.data.admin != *ctx.accounts.admin.key {
            return Err(ProgramError::IncorrectProgramId);
        }
        // transfer ICO admin to program ata
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.ico_ata_for_admin.to_account_info(),
                to: ctx.accounts.ico_ata_for_ico_program.to_account_info(),
                authority: ctx.accounts.admin.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, ico_amount)?;
        msg!("deposit {} ICO in program ATA.", ico_amount);
        Ok(())
    }

    /* 
    ===========================================================
        buy_with_sol function use BuyWithSol struct
    ===========================================================
*/
    pub fn buy_with_sol(
        ctx: Context<BuyWithSol>,
        _ico_ata_for_ico_program_bump: u8,
        sol_amount: u64,
    ) -> Result<()> {
        // transfer sol from user to admin
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.admin.key(),
            sol_amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.admin.to_account_info(),
            ],
        )?;
        msg!("transfer {} sol to admin.", sol_amount);

        // transfer ICO from program to user ATA
        let ico_amount = sol_amount * ctx.accounts.data.sol;
        let ico_mint_address = ctx.accounts.ico_mint.key();
        let seeds = &[ico_mint_address.as_ref(), &[_ico_ata_for_ico_program_bump]];
        let signer = [&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.ico_ata_for_ico_program.to_account_info(),
                to: ctx.accounts.ico_ata_for_user.to_account_info(),
                authority: ctx.accounts.ico_ata_for_ico_program.to_account_info(),
            },
            &signer,
        );
        token::transfer(cpi_ctx, ico_amount)?;
        msg!("transfer {} ico to buyer/user.", ico_amount);
        Ok(())
    }

    /* 
    ===========================================================
        buy_with_usdt function use BuyWithUsdt struct
    ===========================================================
*/
    pub fn buy_with_usdt(
        ctx: Context<BuyWithUsdt>,
        _ico_ata_for_ico_program_bump: u8,
        usdt_amount: u64,
    ) -> Result<()> {
        // transfer USDT from user to the admin ATA
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.usdt_ata_for_user.to_account_info(),
                to: ctx.accounts.usdt_ata_for_admin.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, usdt_amount)?;
        msg!("transfer {} usdt to admin.", usdt_amount);

        // transfer ICO from program to the user ATA
        let ico_amount = usdt_amount * ctx.accounts.data.usdt;
        let ico_mint_address = ctx.accounts.ico_mint.key();
        let seeds = &[ico_mint_address.as_ref(), &[_ico_ata_for_ico_program_bump]];
        let signer = [&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.ico_ata_for_ico_program.to_account_info(),
                to: ctx.accounts.ico_ata_for_user.to_account_info(),
                authority: ctx.accounts.ico_ata_for_ico_program.to_account_info(),
            },
            &signer,
        );
        token::transfer(cpi_ctx, ico_amount)?;
        msg!("transfer {} ico to buyer/user.", ico_amount);
        Ok(())
    }

    /* 
    ===========================================================
        update_data function use UpdateData struct
    ===========================================================
*/
    pub fn update_data(ctx: Context<UpdateData>, sol_price: u64, usdt_price: u64) -> ProgramResult {
        if ctx.accounts.data.admin != *ctx.accounts.admin.key {
            return Err(ProgramError::IncorrectProgramId);
        }
        let data = &mut ctx.accounts.data;
        data.sol = sol_price;
        data.usdt = usdt_price;
        msg!("update SOL/ICO {} and USDT/ICO {}", sol_price, usdt_price);
        Ok(())
    }

    /* 
    -----------------------------------------------------------
        CreateIcoATA struct for create_ico_ata function
    -----------------------------------------------------------
*/
    #[derive(Accounts)]
    pub struct CreateIcoATA<'info> {
        // 1. PDA (pubkey) for ico ATA for our program.
        // seeds: [ico_mint + current program id] => "HashMap[seeds+bump] = pda"
        // token::mint: Token Program wants to know what kind of token this ATA is for
        // token::authority: It's a PDA so the authority is itself!
        #[account(
        init,
        payer = admin,
        seeds = [ ICO_MINT_ADDRESS.parse::<Pubkey>().unwrap().as_ref() ],
        bump,
        token::mint = ico_mint,
        token::authority = ico_ata_for_ico_program,
    )]
        pub ico_ata_for_ico_program: Account<'info, TokenAccount>,

        #[account(init, payer=admin, space=9000, seeds=[b"data", admin.key().as_ref()], bump)]
        pub data: Account<'info, Data>,

        #[account(
        address = ICO_MINT_ADDRESS.parse::<Pubkey>().unwrap(),
    )]
        pub ico_mint: Account<'info, Mint>,

        #[account(mut)]
        pub ico_ata_for_admin: Account<'info, TokenAccount>,

        #[account(mut)]
        pub admin: Signer<'info>,

        pub system_program: Program<'info, System>,
        pub token_program: Program<'info, Token>,
        pub rent: Sysvar<'info, Rent>,
    }

    /* 
    -----------------------------------------------------------
        DepositIcoInATA struct for deposit_ico_in_ata function
    -----------------------------------------------------------
*/
    #[derive(Accounts)]
    pub struct DepositIcoInATA<'info> {
        #[account(mut)]
        pub ico_ata_for_ico_program: Account<'info, TokenAccount>,

        #[account(mut)]
        pub data: Account<'info, Data>,

        #[account(
        address = ICO_MINT_ADDRESS.parse::<Pubkey>().unwrap(),
    )]
        pub ico_mint: Account<'info, Mint>,

        #[account(mut)]
        pub ico_ata_for_admin: Account<'info, TokenAccount>,

        #[account(mut)]
        pub admin: Signer<'info>,
        pub token_program: Program<'info, Token>,
    }

    /* 
    -----------------------------------------------------------
        BuyWithSol struct for buy_with_sol function
    -----------------------------------------------------------
*/
    #[derive(Accounts)]
    #[instruction(_ico_ata_for_ico_program_bump: u8)]
    pub struct BuyWithSol<'info> {
        #[account(
        mut,
        seeds = [ ico_mint.key().as_ref() ],
        bump = _ico_ata_for_ico_program_bump,
    )]
        pub ico_ata_for_ico_program: Account<'info, TokenAccount>,

        #[account(mut)]
        pub data: Account<'info, Data>,

        #[account(
        address = ICO_MINT_ADDRESS.parse::<Pubkey>().unwrap(),
    )]
        pub ico_mint: Account<'info, Mint>,

        #[account(mut)]
        pub ico_ata_for_user: Account<'info, TokenAccount>,

        #[account(mut)]
        pub user: Signer<'info>,

        #[account(mut)]
        pub admin: AccountInfo<'info>,

        pub token_program: Program<'info, Token>,
        pub system_program: Program<'info, System>,
    }

    /* 
    -----------------------------------------------------------
        BuyWithUsdt struct for buy_with_usdt function
    -----------------------------------------------------------
*/
    #[derive(Accounts)]
    #[instruction(_ico_ata_for_ico_program_bump: u8)]
    pub struct BuyWithUsdt<'info> {
        #[account(
        mut,
        seeds = [ ico_mint.key().as_ref() ],
        bump = _ico_ata_for_ico_program_bump,
    )]
        pub ico_ata_for_ico_program: Account<'info, TokenAccount>,

        #[account(mut)]
        pub data: Account<'info, Data>,

        #[account(
        address = ICO_MINT_ADDRESS.parse::<Pubkey>().unwrap(),
    )]
        pub ico_mint: Account<'info, Mint>,

        #[account(mut)]
        pub ico_ata_for_user: Account<'info, TokenAccount>,

        #[account(mut)]
        pub usdt_ata_for_user: Account<'info, TokenAccount>,

        #[account(mut)]
        pub usdt_ata_for_admin: Account<'info, TokenAccount>,

        #[account(mut)]
        pub user: Signer<'info>,

        pub token_program: Program<'info, Token>,
    }

    /* 
    -----------------------------------------------------------
        UpdateData struct for update_data function
    -----------------------------------------------------------
*/
    #[derive(Accounts)]
    pub struct UpdateData<'info> {
        #[account(mut)]
        pub data: Account<'info, Data>,
        #[account(mut)]
        pub admin: Signer<'info>,
        pub system_program: Program<'info, System>,
    }

    /* 
    -----------------------------------------------------------
        Data struct for PDA Account
    -----------------------------------------------------------
*/
    #[account]
    pub struct Data {
        pub sol: u64,
        pub usdt: u64,
        pub admin: Pubkey,
    }
}
