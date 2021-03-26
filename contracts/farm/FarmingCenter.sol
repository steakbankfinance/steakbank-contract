pragma solidity 0.6.12;

import "../lib/Ownable.sol";
import "../interface/IMintBurnToken.sol";
import "../interface/IFarmRewardLock.sol";

import "@pancakeswap/pancake-swap-lib/contracts/math/SafeMath.sol";
import "@pancakeswap/pancake-swap-lib/contracts/token/BEP20/IBEP20.sol";
import "@pancakeswap/pancake-swap-lib/contracts/token/BEP20/SafeBEP20.sol";

// import "@nomiclabs/buidler/console.sol";

interface IMigratorChef {
    function migrate(IBEP20 token) external returns (IBEP20);
}


// FarmingCenter is the master of SBF. He can make SBF and he is a fair guy.
//
// Note that it"s ownable and the owner wields tremendous power. The ownership
// will be transferred to a governance smart contract once SBF is sufficiently
// distributed and the community can show to govern itself.
//
// Have fun reading it. Hopefully it"s bug-free. God bless.
contract FarmingCenter is Ownable {
    using SafeMath for uint256;
    using SafeBEP20 for IBEP20;

    // Info of each user.
    struct UserInfo {
        uint256 amount;     // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
        //
        // We do some fancy math here. Basically, any point in time, the amount of SBFs
        // entitled to a user but is pending to be distributed is:
        //
        //   pending reward = (user.amount * pool.accSBFPerShare) - user.rewardDebt
        //
        // Whenever a user deposits or withdraws LP tokens to a pool. Here"s what happens:
        //   1. The pool"s `accSBFPerShare` (and `lastRewardBlock`) gets updated.
        //   2. User receives the pending reward sent to his/her address.
        //   3. User"s `amount` gets updated.
        //   4. User"s `rewardDebt` gets updated.
    }

    // Info of each pool.
    struct PoolInfo {
        IBEP20 lpToken;           // Address of LP token contract.
        uint256 allocPoint;       // How many allocation points assigned to this pool. SBFs to distribute per block.
        uint256 lastRewardBlock;  // Last block number that SBFs distribution occurs.
        uint256 accSBFPerShare; // Accumulated SBFs per share, times 1e18. See below.
    }

    bool public initialized;

    // The SBF TOKEN!
    IMintBurnToken public sbf;
    // Lock farm reward
    IFarmRewardLock public farmRewardLock;
    // SBF tokens created per block.
    uint256 public sbfPerBlock;
    // Bonus muliplier for early SBF makers.
    uint256 public BONUS_MULTIPLIER;
    // The migrator contract. It has a lot of power. Can only be set through governance (owner).
    IMigratorChef public migrator;

    // Info of each pool.
    PoolInfo[] public poolInfo;
    // Info of each user that stakes LP tokens.
    mapping (uint256 => mapping (address => UserInfo)) public userInfo;
    // Total allocation points. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint = 0;
    // The block number when SBF mining starts.
    uint256 public startBlock;

    uint256 public lockRateMolecular;
    uint256 public lockRateDenominator;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount, uint256 reward, uint256 lockedReward);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount, uint256 reward, uint256 lockedReward);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);

    constructor() public {}

    function initialize(
        address _owner,
        address _lbnb,
        IMintBurnToken _sbf,
        IFarmRewardLock _farmRewardLock,
        uint256 _sbfPerBlock,
        uint256 _startBlock,
        uint256 _lockRateMolecular,
        uint256 _lockRateDenominator
    ) public
    {
        require(!initialized, "already initialized");
        initialized = true;

        super.initializeOwner(_owner);

        sbf = _sbf;
        farmRewardLock = _farmRewardLock;
        sbfPerBlock = _sbfPerBlock;
        startBlock = _startBlock;

        require(_lockRateDenominator>0&&_lockRateDenominator>=_lockRateMolecular, "invalid _lockRateDenominator or _lockRateMolecular");
        lockRateMolecular = _lockRateMolecular;
        lockRateDenominator = _lockRateDenominator;

        // staking pool
        poolInfo.push(PoolInfo({
            lpToken: IBEP20(_lbnb),
            allocPoint: 1000,
            lastRewardBlock: startBlock,
            accSBFPerShare: 0
            }));

        totalAllocPoint = 1000;
        BONUS_MULTIPLIER = 1;
    }

    function updateMultiplier(uint256 multiplierNumber) public onlyOwner {
        BONUS_MULTIPLIER = multiplierNumber;
    }

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    // Add a new lp to the pool. Can only be called by the owner.
    // XXX DO NOT add the same LP token more than once. Rewards will be messed up if you do.
    function add(uint256 _allocPoint, IBEP20 _lpToken, bool _withUpdate) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        uint256 lastRewardBlock = block.number > startBlock ? block.number : startBlock;
        totalAllocPoint = totalAllocPoint.add(_allocPoint);
        poolInfo.push(PoolInfo({
            lpToken: _lpToken,
            allocPoint: _allocPoint,
            lastRewardBlock: lastRewardBlock,
            accSBFPerShare: 0
            }));
        updateLBNBPool();
    }

    // Update the given pool"s SBF allocation point. Can only be called by the owner.
    function set(uint256 _pid, uint256 _allocPoint, bool _withUpdate) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        uint256 prevAllocPoint = poolInfo[_pid].allocPoint;
        poolInfo[_pid].allocPoint = _allocPoint;
        if (prevAllocPoint != _allocPoint) {
            totalAllocPoint = totalAllocPoint.sub(prevAllocPoint).add(_allocPoint);
            updateLBNBPool();
        }
    }

    function updateLBNBPool() internal {
        uint256 length = poolInfo.length;
        uint256 points = 0;
        for (uint256 pid = 1; pid < length; ++pid) {
            points = points.add(poolInfo[pid].allocPoint);
        }
        points = points.div(3);
        if (points != 0 && points > poolInfo[0].allocPoint) {
            totalAllocPoint = totalAllocPoint.sub(poolInfo[0].allocPoint).add(points);
            poolInfo[0].allocPoint = points;
        }
    }

    // Set the migrator contract. Can only be called by the owner.
    function setMigrator(IMigratorChef _migrator) public onlyOwner {
        migrator = _migrator;
    }

    // Migrate lp token to another lp contract. Can be called by anyone. We trust that migrator contract is good.
    function migrate(uint256 _pid) public {
        require(address(migrator) != address(0), "migrate: no migrator");
        PoolInfo storage pool = poolInfo[_pid];
        IBEP20 lpToken = pool.lpToken;
        uint256 bal = lpToken.balanceOf(address(this));
        lpToken.safeApprove(address(migrator), bal);
        IBEP20 newLpToken = migrator.migrate(lpToken);
        require(bal == newLpToken.balanceOf(address(this)), "migrate: bad");
        pool.lpToken = newLpToken;
    }

    // Return reward multiplier over the given _from to _to block.
    function getMultiplier(uint256 _from, uint256 _to) public view returns (uint256) {
        return _to.sub(_from).mul(BONUS_MULTIPLIER);
    }

    // View function to see pending SBF on frontend.
    function pendingSBF(uint256 _pid, address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accSBFPerShare = pool.accSBFPerShare;
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (block.number > pool.lastRewardBlock && lpSupply != 0) {
            uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
            uint256 sbfReward = multiplier.mul(sbfPerBlock).mul(pool.allocPoint).div(totalAllocPoint);
            accSBFPerShare = accSBFPerShare.add(sbfReward.mul(1e18).div(lpSupply));
        }
        return user.amount.mul(accSBFPerShare).div(1e18).sub(user.rewardDebt);
    }

    // Update reward variables for all pools. Be careful of gas spending!
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }


    // Update reward variables of the given pool to be up-to-date.
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        if (block.number <= pool.lastRewardBlock) {
            return;
        }
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (lpSupply == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }
        uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
        uint256 sbfReward = multiplier.mul(sbfPerBlock).mul(pool.allocPoint).div(totalAllocPoint);
        pool.accSBFPerShare = pool.accSBFPerShare.add(sbfReward.mul(1e18).div(lpSupply));
        pool.lastRewardBlock = block.number;
    }

    // Deposit LP tokens to FarmingCenter for SBF allocation.
    function deposit(uint256 _pid, uint256 _amount) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        updatePool(_pid);
        uint256 reward;
        uint256 lockedReward;
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(pool.accSBFPerShare).div(1e18).sub(user.rewardDebt);

            if (pending > 0) {
                (reward, lockedReward) = rewardSBF(msg.sender, pending);
            }
        }
        if (_amount > 0) {
            pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
            user.amount = user.amount.add(_amount);
        }
        user.rewardDebt = user.amount.mul(pool.accSBFPerShare).div(1e18);
        emit Deposit(msg.sender, _pid, _amount, reward, lockedReward);
    }

    // Withdraw LP tokens from FarmingCenter.
    function withdraw(uint256 _pid, uint256 _amount) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        uint256 reward;
        uint256 lockedReward;
        require(user.amount >= _amount, "withdraw: not good");

        updatePool(_pid);
        uint256 pending = user.amount.mul(pool.accSBFPerShare).div(1e18).sub(user.rewardDebt);

        if (pending > 0) {
            (reward, lockedReward) = rewardSBF(msg.sender, pending);
        }

        if (_amount > 0) {
            user.amount = user.amount.sub(_amount);
            pool.lpToken.safeTransfer(address(msg.sender), _amount);
        }
        user.rewardDebt = user.amount.mul(pool.accSBFPerShare).div(1e18);
        emit Withdraw(msg.sender, _pid, _amount, reward, lockedReward);
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        pool.lpToken.safeTransfer(address(msg.sender), user.amount);
        emit EmergencyWithdraw(msg.sender, _pid, user.amount);
        user.amount = 0;
        user.rewardDebt = 0;
    }

    function rewardSBF(address _to, uint256 _amount) internal returns (uint256, uint256) {
        // before the startReleaseHeight, 70% SBF reward will be locked.
        uint256 farmingReward = _amount;
        uint256 lockedAmount = 0;
        if (block.number < farmRewardLock.getLockEndHeight()) {
            lockedAmount = farmingReward.mul(lockRateMolecular).div(lockRateDenominator);
            farmingReward = farmingReward.sub(lockedAmount);
            sbf.mintTo(address(farmRewardLock), lockedAmount);
            farmRewardLock.notifyDeposit(_to, lockedAmount);
        }
        sbf.mintTo(_to, farmingReward);
        return (farmingReward, lockedAmount);
    }

    function setRewardLockRate(uint256 molecular, uint256 denominator) public onlyOwner {
        require(denominator>0&&denominator>=molecular, "invalid molecular or denominator");
        lockRateMolecular = molecular;
        lockRateDenominator = denominator;
    }
}
