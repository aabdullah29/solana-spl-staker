use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

declare_id!("GqWug5qcoMMXguytUTWAsBAchhQk7byrtpaESaF1wT3Q");

#[program]
pub mod ico {
    pub const USDT_MINT_ADDRESS: &str = "5yCiYccC6xiv7s4yPHo4ESgHjBsXh1ySuwZr9Z1oL5v7";
    pub const ICO_SPL_MINT_ADDRESS: &str = "6oban7Xk5hk58NngWWyajhM9pQZej2akxUBSkAKwGJPF";
    use super::*;

    /* 
    ===========================================================
        ============= create_ico_spl_ata ==================
    ===========================================================
*/
    pub fn create_ico_spl_ata(
        ctx: Context<CreateIcoSplATA>,
        ico_spl_amount: u64,
        sol_price: u64,
        usdt_price: u64,
    ) -> Result<()> {
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.ico_ata_for_admin.to_account_info(),
                to: ctx.accounts.ico_spl_ata_for_ico_program.to_account_info(),
                authority: ctx.accounts.admin.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, ico_spl_amount)?;

        let price = &mut ctx.accounts.price;
        price.sol = sol_price;
        price.usdt = usdt_price;
        Ok(())
    }

    #[derive(Accounts)]
    pub struct CreateIcoSplATA<'info> {
        // 1. PDA (pubkey) for ico_spl ATA for our program.
        // seeds: [ico_spl_mint + current program id] => "HashMap[seeds+bump] = pda"
        // token::mint: Token Program wants to know what kind of token this ATA is for
        // token::authority: It's a PDA so the authority is itself!
        #[account(
        init,
        payer = admin,
        seeds = [ ICO_SPL_MINT_ADDRESS.parse::<Pubkey>().unwrap().as_ref() ],
        bump,
        token::mint = ico_spl_mint,
        token::authority = ico_spl_ata_for_ico_program,
    )]
        pub ico_spl_ata_for_ico_program: Account<'info, TokenAccount>,

        #[account(init, payer=admin, space=9000, seeds=[b"price", admin.key().as_ref()], bump)]
        pub price: Account<'info, Price>,

        #[account(
        address = ICO_SPL_MINT_ADDRESS.parse::<Pubkey>().unwrap(),
    )]
        pub ico_spl_mint: Account<'info, Mint>,

        #[account(mut)]
        pub ico_ata_for_admin: Account<'info, TokenAccount>,

        #[account(mut)]
        pub admin: Signer<'info>,

        pub system_program: Program<'info, System>,
        pub token_program: Program<'info, Token>,
        pub rent: Sysvar<'info, Rent>,
    }

    /* 
    ===========================================================
        ============= deposit_ico_spl_in_ata ==================
    ===========================================================
*/
    pub fn deposit_ico_spl_in_ata(
        ctx: Context<DepositIcoSplInATA>,
        ico_spl_amount: u64,
    ) -> Result<()> {
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.ico_ata_for_admin.to_account_info(),
                to: ctx.accounts.ico_spl_ata_for_ico_program.to_account_info(),
                authority: ctx.accounts.admin.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, ico_spl_amount)?;
        Ok(())
    }

    #[derive(Accounts)]
    pub struct DepositIcoSplInATA<'info> {
        #[account(
        address = ICO_SPL_MINT_ADDRESS.parse::<Pubkey>().unwrap(),
    )]
        pub ico_spl_mint: Account<'info, Mint>,

        #[account(mut)]
        pub ico_spl_ata_for_ico_program: Account<'info, TokenAccount>,

        #[account(mut)]
        pub ico_ata_for_admin: Account<'info, TokenAccount>,

        #[account(mut)]
        pub admin: Signer<'info>,
        pub token_program: Program<'info, Token>,
    }

    /* 
    ===========================================================
        ============= buy_with_sol ==================
    ===========================================================
*/
    pub fn buy_with_sol(
        ctx: Context<BuyWithSol>,
        _ico_spl_ata_for_ico_program_bump: u8,
        sol_amount: u64,
    ) -> Result<()> {
        //
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

        //
        let ico_spl_amount = sol_amount * ctx.accounts.price.sol;
        let ico_spl_mint_address = ctx.accounts.ico_spl_mint.key();
        let seeds = &[
            ico_spl_mint_address.as_ref(),
            &[_ico_spl_ata_for_ico_program_bump],
        ];
        let signer = [&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.ico_spl_ata_for_ico_program.to_account_info(),
                to: ctx.accounts.ico_spl_ata_for_user.to_account_info(),
                authority: ctx.accounts.ico_spl_ata_for_ico_program.to_account_info(),
            },
            &signer,
        );
        token::transfer(cpi_ctx, ico_spl_amount)?;

        Ok(())
    }

    #[derive(Accounts)]
    #[instruction(_ico_spl_ata_for_ico_program_bump: u8)]
    pub struct BuyWithSol<'info> {
        #[account(mut)]
        pub user: Signer<'info>,

        #[account(mut)]
        pub admin: AccountInfo<'info>,

        #[account(
        address = ICO_SPL_MINT_ADDRESS.parse::<Pubkey>().unwrap(),
    )]
        pub ico_spl_mint: Account<'info, Mint>,

        // User ATA which holds ICO_SPL.
        #[account(mut)]
        pub ico_spl_ata_for_user: Account<'info, TokenAccount>,

        // Program ATA to receive ICO_SPL from users
        #[account(
        mut,
        seeds = [ ico_spl_mint.key().as_ref() ],
        bump = _ico_spl_ata_for_ico_program_bump,
    )]
        pub ico_spl_ata_for_ico_program: Account<'info, TokenAccount>,

        #[account(mut)]
        pub price: Account<'info, Price>,

        // SPL Token Program
        pub token_program: Program<'info, Token>,
        pub system_program: Program<'info, System>,
    }

    /* 
    ===========================================================
        ============= buy_with_usdt ==================
    ===========================================================
*/
    pub fn buy_with_usdt(
        ctx: Context<BuyWithUsdt>,
        _ico_spl_ata_for_ico_program_bump: u8,
        usdt_amount: u64,
    ) -> Result<()> {
        // transfer USDT from user to the admin
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.usdt_ata_for_user.to_account_info(),
                to: ctx.accounts.usdt_ata_for_admin.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, usdt_amount)?;

        // transfer ICO_SPL from program to the user
        let ico_spl_amount = usdt_amount * ctx.accounts.price.usdt;
        let ico_spl_mint_address = ctx.accounts.ico_spl_mint.key();
        let seeds = &[
            ico_spl_mint_address.as_ref(),
            &[_ico_spl_ata_for_ico_program_bump],
        ];
        let signer = [&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.ico_spl_ata_for_ico_program.to_account_info(),
                to: ctx.accounts.ico_spl_ata_for_user.to_account_info(),
                authority: ctx.accounts.ico_spl_ata_for_ico_program.to_account_info(),
            },
            &signer,
        );
        token::transfer(cpi_ctx, ico_spl_amount)?;

        Ok(())
    }

    #[derive(Accounts)]
    #[instruction(_ico_spl_ata_for_ico_program_bump: u8)]
    pub struct BuyWithUsdt<'info> {
        #[account(mut)]
        pub user: Signer<'info>,

        #[account(mut)]
        pub usdt_ata_for_user: Account<'info, TokenAccount>,

        #[account(mut)]
        pub usdt_ata_for_admin: Account<'info, TokenAccount>,

        #[account(
        address = ICO_SPL_MINT_ADDRESS.parse::<Pubkey>().unwrap(),
    )]
        pub ico_spl_mint: Account<'info, Mint>,

        #[account(mut)]
        pub ico_spl_ata_for_user: Account<'info, TokenAccount>,

        #[account(
        mut,
        seeds = [ ico_spl_mint.key().as_ref() ],
        bump = _ico_spl_ata_for_ico_program_bump,
    )]
        pub ico_spl_ata_for_ico_program: Account<'info, TokenAccount>,

        #[account(mut)]
        pub price: Account<'info, Price>,
        pub token_program: Program<'info, Token>,
    }

    /* 
    ===========================================================
        ============= setPrice ==================
    ===========================================================
*/
    pub fn set_price(ctx: Context<SetPrice>, sol_price: u64, usdt_price: u64) -> Result<()> {
        let price = &mut ctx.accounts.price;
        price.sol = sol_price;
        price.usdt = usdt_price;
        Ok(())
    }
    #[derive(Accounts)]
    pub struct SetPrice<'info> {
        #[account(mut)]
        pub price: Account<'info, Price>,
        #[account(mut)]
        pub admin: Signer<'info>,
        pub system_program: Program<'info, System>,
    }

    #[account]
    pub struct Price {
        pub sol: u64,
        pub usdt: u64,
    }
}
