# FlowPay AI

Automate crypto payroll on Solana using natural language. Write a single sentence — FlowPay AI interprets it and executes real blockchain transactions instantly.

## What it does

FlowPay AI lets company admins automate payments to their remote team using plain language:

> *"Pay 0.05 SOL to Ana, Luis and Carlos every Friday"*

The AI parses the instruction, shows a confirmation, and executes real transactions on Solana — each with a verifiable on-chain hash.

## Features

- Natural language payment instructions (Spanish + English)
- Real Solana transactions with on-chain verification
- Admin dashboard: create rules, manage team, view history
- Employee dashboard: view scheduled payments and received transactions
- Team management: register employees with their Solana wallets
- Smart name matching (partial names, nicknames)
- Ambiguous name detection

## Tech Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Backend:** Supabase Edge Functions (Deno)
- **AI:** Groq API (Llama 3.1)
- **Blockchain:** Solana Devnet (@solana/web3.js)
- **Database:** Supabase (PostgreSQL)

## Demo credentials

- **Admin:** admin@flowpay.com / admin123
- **Employees:** created by admin through the Team page

## Network

Currently running on **Solana Devnet** (test network). All transactions are real and verifiable at explorer.solana.com.

## Team

Built at WEB3PACK Hackathon 2026.
