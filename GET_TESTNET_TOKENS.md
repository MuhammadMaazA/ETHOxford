# Get Sui Testnet Tokens

Your address: `0xbc29c6dc00f25b3a2ccb17471395854711076f9f0db2433621a338afda1093a5`

## Option 1: Discord Faucet (Most Reliable) ✅

1. **Join Sui Discord**: https://discord.gg/sui
2. Go to `#testnet-faucet` channel
3. Type this command:
   ```
   !faucet 0xbc29c6dc00f25b3a2ccb17471395854711076f9f0db2433621a338afda1093a5
   ```
4. Bot will send you **1 SUI** (~immediately)

## Option 2: Web Faucet

Try these URLs:
- https://faucet.sui.io/
- https://sui-testnet-faucet.vercel.app/

## Option 3: API Request (Try This Now)

Run this in PowerShell:
```powershell
$address = "0xbc29c6dc00f25b3a2ccb17471395854711076f9f0db2433621a338afda1093a5"
$body = @{
    FixedAmountRequest = @{
        recipient = $address
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://faucet.testnet.sui.io/v1/gas" -Method POST -Body $body -ContentType "application/json"
```

## Check Balance After

```bash
sui client balance
```

**You need ~1 SUI** to deploy and test your smart contracts.
