## Introduction about Native BSC(Binance Smart Chain) Staking Mechanism

The staking engine for BSC is on BC(Binance Chain). BSC's users have to transfer their BNB to their BC wallets first. Then they can send staking transactions from their BC wallets. At each UTC 00:00, the BSC staking engine will distribute the previous received validator reward to all validator and delegators. Besides, according to the staking snapshot at UTC 00:00, the BSC staking engine will generate a cross chain package which specify all qualified BSC validators. Once the cross chain package is delivered on BSC, BSC will transfer the accumulated validator rewards back to BC and apply new validator set.

## Characteristics of Native BSC Staking Mechanism

1. During one day, staking time has no effect on validator set selecting result.

   The BSC staking engine will take a snapshot for all validators' voting power at UTC 00:00 and select the top 21 validators from the snapshot. Suppose a user stake some BNB at UTC 01:00, then the staking won't have any effect in this day, but it will be counted in the next day.

2. Delayed Staking Rewards

   Suppose a user stakes some BNB to a validator at the first day and the validator is in the validator set in next UTC 00:00, then the user will get the first staking rewards at the third day.

## Defects in Attending Native Binance Smart Chain Staking

1. Lack liquidity: Once BNB is staked on BC, users will lose all liquidity of staked BNB.

2. Cost too much time to get staked BNB back. Currently, users have to wait for at least 7 days to get staked BNB back.

3. Require much effort on selecting validators to achieve better APY.

## What is StakingBNB

StakingBNB is a DeFi platform which can provide better staking BNB service than directly attending the native BSC(Binance Smart Chain) Staking. With StakingBNB, users will get liquidity event after staking and can get staked BNB back much faster. Besides, the StakingBNB will offer the better staking reward APY by dynamically calibrating staking strategy. The most important point is that LBNB can be used in many farming pools which can provide attractive reward.

### LBNB and SKB

LBNB/BNB is always 1:1 on our platform. A user stake 1:BNB, then 1:LBNB will be minted immediately. On the contrary, a users can call unstake method to burn 1:LBNB to get 1:BNB back. Although, during the unstake process, users can't get their BNB back immediately. SKB is the governance token of our platform. Initially, only a smart part of SKB will be minted. Most SKB will be minted as farming reward.

### Liquidity

StakingBNB will provide better liquidity by more quick unstake mechanism and LBNB. As we know, native staking mechanism requires more than 7 days to get staked BNB back. However, on our platform, in the most optimistic scenario, users can get their staked BNB back in the second day. On average, users can get staked BNB back in 2 or 3 days. LBNB is the key for providing liquidity. Users can deposit LBNB to farming pool and borrow money with LBNB on other Defi platform.

### Better Staking APY

There are many factors which will affect staking APY:

1. Validator commission rate. Validator can modify their commission rate at each 24 hours.
2. Validator total voting power. For a validator, when its voting power is getting larger, then the proportion of a single staker will get less. As a result, the less reward will be distributed to the staker.
3. Validator maintainer ability. Validator with poor maintainer ability is much easier to be jailed. If the validator is jailed, all stakers on the validator will get no reward.
4. Other validator staking changes. If other validators is getting more and more voting power, then the current validator will be kicked out of top 21. To avoid that, a staker need to stake more asset or just move staking to other validators.

`BCStakingProxy` will monitor changes about all above factors and dynamically calibrate staking strategy to achieve better APY.

### Farming

Initially, four farming pools will be created. One of the farming pool is for `LBNB`. Another three farming pools are for LP tokens of three pancake swap pairs: `LBNB/BNB`, `LBNB/BUSD`, `SKB/BUSD`. In the first two months, 70% farming reward will be locked, and only 30% will be directly transferred to users' wallets. Since the beginning of the second month, all locked reward will be released linearly. Users are required to claim their released reward actively.

## Detailed Mechanism

### Stake

Users with more than 1:BNB can call the stake method to their BNB. They will get the equivalent amount of LBNB immediately. At the beginning of the third day, the staking reward will be distributed to all stakers. Users need to actively claim the reward to their wallets.

### Unstake

For users who only hold LBNB but never staked BNB, they can't try to unstake and get BNB back. Suppose a user have staked 100:BNB, then it can unstake 100:LBNB at most.

When multiple users try to unstake during a period, only all the prior unstakes have been fulfilled, then the currently one will be fulfilled. Some volunteers in our community will be in charge of claim all mature unstakes. Users don't need to do anything and their unstaked BNB will be paid to their wallets automatically.

### AccelerateUnstakedMature

Under some circumstance, some users might want to get staked BNB back as soon as possible. An accelerating mechanism is offered here. Users just need to burn enough SKB and then theirs unstake will be fulfilled with more priorities. The burned SKB amount is proportion to the sum of all prior unstake amounts and the current unstaked amount.

### Breathe Time

From UTC 23:30 to the next day UTC 00:10, all stake and unstake operations will be denied.
