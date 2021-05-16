pragma solidity 0.6.12;

import "../lib/SBFRewardVault.sol";
import "../lib/Ownable.sol";
import "../interface/IFarmRewardLock.sol";

contract FarmingCenter is Ownable {
    using SafeMath for uint256;
    using SafeBEP20 for IBEP20;

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    struct PoolInfo {
        IBEP20 lpToken;
        uint256 allocPoint;
        uint256 lastRewardBlock;
        uint256 accSBFPerShare;
        uint256 molecularOfLockRate;
        uint256 denominatorOfLockRate;
    }

    uint256 constant public REWARD_CALCULATE_PRECISION = 1e12;

    bool public initialized;

    IBEP20 public sbf;
    SBFRewardVault public sbfRewardVault;
    IFarmRewardLock public farmRewardLock;
    
    uint256 public sbfPerBlock;
    uint256 public totalAllocPoint;
    uint256 public startBlock;
    uint256 public endBlock;

    PoolInfo[] public poolInfo;
    mapping (uint256 => mapping (address => UserInfo)) public userInfo;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount, uint256 reward, uint256 lockedReward);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount, uint256 reward, uint256 lockedReward);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);

    constructor() public {}

    function initialize(
        address _owner,
        IBEP20 _sbf,
        IFarmRewardLock _farmRewardLock,
        uint256 _molecularOfLockRate,
        uint256 _denominatorOfLockRate
    ) public
    {
        require(!initialized, "already initialized");
        initialized = true;

        sbfRewardVault = new SBFRewardVault(_sbf, address(this));

        super.initializeOwner(_owner);
        farmRewardLock = _farmRewardLock;
        sbf = _sbf;
        sbfPerBlock = 0;
        startBlock = 0;
        endBlock = 0;

//        poolInfo.push(PoolInfo({
//            lpToken: IBEP20(address(_sbf)),
//            allocPoint: 1000,
//            lastRewardBlock: startBlock,
//            accSBFPerShare: 0,
//            molecularOfLockRate: _molecularOfLockRate,
//            denominatorOfLockRate: _denominatorOfLockRate
//        }));
//        totalAllocPoint = 1000;
    }

    function addNewFarmingPeriod(uint256 farmingPeriod, uint256 startHeight, uint256 sbfRewardPerBlock) public onlyOwner {
        require(block.number > endBlock, "Previous farming is not completed yet");
        require(block.number <= startHeight, "Start height must be in the future");
        require(sbfRewardPerBlock > 0, "sbfRewardPerBlock must be larger than 0");
        require(farmingPeriod > 0, "farmingPeriod must be larger than 0");
        
        massUpdatePools();

        uint256 totalSBFAmount = farmingPeriod.mul(sbfRewardPerBlock);
        sbf.safeTransferFrom(msg.sender, address(sbfRewardVault), totalSBFAmount);

        sbfPerBlock = sbfRewardPerBlock;
        startBlock = startHeight;
        endBlock = startHeight.add(farmingPeriod);

        for (uint256 pid = 0; pid < poolInfo.length; ++pid) {
            PoolInfo storage pool = poolInfo[pid];
            pool.lastRewardBlock = startHeight;
        }
    }

    function increaseFarmingReward(uint256 increasedSBFRewardPerBlock) public onlyOwner {
        require(block.number < endBlock, "Previous farming is already completed");
        massUpdatePools();

        uint256 sbfAmount = increasedSBFRewardPerBlock.mul(endBlock.sub(block.number));
        sbf.safeTransferFrom(msg.sender, address(sbfRewardVault), sbfAmount);
        sbfPerBlock = sbfPerBlock.add(increasedSBFRewardPerBlock);
    }

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    function add(uint256 _allocPoint, IBEP20 _lpToken, bool _withUpdate, uint256 molecularOfLockRate, uint256 denominatorOfLockRate) public onlyOwner {
        require(denominatorOfLockRate>0&&denominatorOfLockRate>=molecularOfLockRate, "invalid denominatorOfLockRate or molecularOfLockRate");
        for (uint256 pid = 0; pid < poolInfo.length; ++pid) {
            PoolInfo memory pool = poolInfo[pid];
            require(pool.lpToken!=_lpToken, "duplicated pool");
        }
        if (_withUpdate) {
            massUpdatePools();
        }
        uint256 lastRewardBlock = block.number > startBlock ? block.number : startBlock;
        totalAllocPoint = totalAllocPoint.add(_allocPoint);
        poolInfo.push(PoolInfo({
            lpToken: _lpToken,
            allocPoint: _allocPoint,
            lastRewardBlock: lastRewardBlock,
            accSBFPerShare: 0,
            molecularOfLockRate: molecularOfLockRate,
            denominatorOfLockRate: denominatorOfLockRate
            }));
        updateSBFPool();
    }

    function set(uint256 _pid, uint256 _allocPoint, bool _withUpdate) public onlyOwner {
        require(_pid < poolInfo.length, "invalid pool id");
        if (_withUpdate) {
            massUpdatePools();
        }
        uint256 prevAllocPoint = poolInfo[_pid].allocPoint;
        poolInfo[_pid].allocPoint = _allocPoint;
        if (prevAllocPoint != _allocPoint) {
            totalAllocPoint = totalAllocPoint.sub(prevAllocPoint).add(_allocPoint);
            updateSBFPool();
        }
    }

    function updateSBFPool() internal {
//        uint256 length = poolInfo.length;
//        uint256 points = 0;
//        for (uint256 pid = 1; pid < length; ++pid) {
//            points = points.add(poolInfo[pid].allocPoint);
//        }
//        // ensure the first pool weight is no less than 20%
//        points = points.div(4);
//        if (points != 0 && points > poolInfo[0].allocPoint) {
//            totalAllocPoint = totalAllocPoint.sub(poolInfo[0].allocPoint).add(points);
//            poolInfo[0].allocPoint = points;
//        }
    }

    // Return reward multiplier over the given _from to _to block.
    function getMultiplier(uint256 _from, uint256 _to) public view returns (uint256) {
        if (_to <= endBlock) {
            return _to.sub(_from);
        } else if (_from >= endBlock) {
            return 0;
        } else {
            return endBlock.sub(_from);
        }
    }

    function pendingSBF(uint256 _pid, address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accSBFPerShare = pool.accSBFPerShare;
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (block.number > pool.lastRewardBlock && lpSupply != 0) {
            uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
            uint256 sbfReward = multiplier.mul(sbfPerBlock).mul(pool.allocPoint).div(totalAllocPoint);
            accSBFPerShare = accSBFPerShare.add(sbfReward.mul(REWARD_CALCULATE_PRECISION).div(lpSupply));
        }
        return user.amount.mul(accSBFPerShare).div(REWARD_CALCULATE_PRECISION).sub(user.rewardDebt);
    }

    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    function updatePool(uint256 _pid) public {
        require(_pid < poolInfo.length, "invalid pool id");
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
        pool.accSBFPerShare = pool.accSBFPerShare.add(sbfReward.mul(REWARD_CALCULATE_PRECISION).div(lpSupply));
        pool.lastRewardBlock = block.number;
    }

    function deposit(uint256 _pid, uint256 _amount) public {
        require(_pid < poolInfo.length, "invalid pool id");
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        updatePool(_pid);
        uint256 reward;
        uint256 lockedReward;
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(pool.accSBFPerShare).div(REWARD_CALCULATE_PRECISION).sub(user.rewardDebt);

            if (pending > 0) {
                (reward, lockedReward) = rewardSBF(msg.sender, pending, pool.molecularOfLockRate, pool.denominatorOfLockRate);
            }
        }
        if (_amount > 0) {
            pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
            user.amount = user.amount.add(_amount);
        }
        user.rewardDebt = user.amount.mul(pool.accSBFPerShare).div(REWARD_CALCULATE_PRECISION);
        emit Deposit(msg.sender, _pid, _amount, reward, lockedReward);
    }

    function withdraw(uint256 _pid, uint256 _amount) public {
        require(_pid < poolInfo.length, "invalid pool id");
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        uint256 reward;
        uint256 lockedReward;
        require(user.amount >= _amount, "withdraw: not good");

        updatePool(_pid);
        uint256 pending = user.amount.mul(pool.accSBFPerShare).div(REWARD_CALCULATE_PRECISION).sub(user.rewardDebt);

        if (pending > 0) {
            (reward, lockedReward) = rewardSBF(msg.sender, pending, pool.molecularOfLockRate, pool.denominatorOfLockRate);
        }

        if (_amount > 0) {
            user.amount = user.amount.sub(_amount);
            pool.lpToken.safeTransfer(address(msg.sender), _amount);
        }
        user.rewardDebt = user.amount.mul(pool.accSBFPerShare).div(REWARD_CALCULATE_PRECISION);
        emit Withdraw(msg.sender, _pid, _amount, reward, lockedReward);
    }

    function emergencyWithdraw(uint256 _pid) public {
        require(_pid < poolInfo.length, "invalid pool id");
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        pool.lpToken.safeTransfer(address(msg.sender), user.amount);
        emit EmergencyWithdraw(msg.sender, _pid, user.amount);
        user.amount = 0;
        user.rewardDebt = 0;
    }

    function rewardSBF(address _to, uint256 _amount, uint256 molecularOfLockRate, uint256 denominatorOfLockRate) internal returns (uint256, uint256) {
        uint256 farmingReward = _amount;
        uint256 lockedAmount = 0;
        if (block.number < farmRewardLock.getLockEndHeight()) {
            lockedAmount = farmingReward.mul(molecularOfLockRate).div(denominatorOfLockRate);
            farmingReward = farmingReward.sub(lockedAmount);
            uint256 actualAmount = sbfRewardVault.safeTransferSBF(address(farmRewardLock), lockedAmount);
            farmRewardLock.notifyDeposit(_to, actualAmount);
        }
        uint256 actualAmount = sbfRewardVault.safeTransferSBF(_to, farmingReward);
        return (actualAmount, lockedAmount);
    }

    function setPoolRewardLockRate(uint256 _pid, uint256 molecular, uint256 denominator) public onlyOwner {
        require(denominator>0&&denominator>=molecular, "invalid molecular or denominator");
        PoolInfo storage pool = poolInfo[_pid];
        pool.molecularOfLockRate = molecular;
        pool.denominatorOfLockRate = denominator;
    }
}
