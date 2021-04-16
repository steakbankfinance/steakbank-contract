pragma solidity 0.6.12;

import "../lib/Ownable.sol";

import "@pancakeswap/pancake-swap-lib/contracts/math/SafeMath.sol";
import "@pancakeswap/pancake-swap-lib/contracts/token/BEP20/IBEP20.sol";
import "@pancakeswap/pancake-swap-lib/contracts/token/BEP20/SafeBEP20.sol";

contract BlindFarmingCenter is Ownable {
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
    }

    uint256 constant public REWARD_CALCULATE_PRECISION = 1e12;

    bool public initialized;

    IBEP20 public sbf;
    uint256 public sbfPerBlock;
    uint256 public releaseHeight;
    mapping(address => uint256) public userLockedRewardAmount;

    PoolInfo[] public poolInfo;
    mapping (uint256 => mapping (address => UserInfo)) public userInfo;
    uint256 public totalAllocPoint = 0;
    uint256 public startBlock;
    uint256 public endBlock;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount, uint256 reward);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount, uint256 reward);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event Reward(address indexed user, uint256 reward);

    constructor() public {}

    function initialize(
        address _owner,
        IBEP20 _sbf
    ) public
    {
        require(!initialized, "already initialized");
        initialized = true;

        super.initializeOwner(_owner);
        sbf = _sbf;
        sbfPerBlock = 0;
        startBlock = 0;
        endBlock = 0;
        releaseHeight = uint256(-1);
    }

    function startBindFarming(uint256 sbfRewardPerBlock, uint256 startHeight, uint256 farmingPeriod) public onlyOwner {
        require(block.number < startHeight, "startHeight must be larger than current block height");
        massUpdatePools();

        uint256 sbfAmount = sbfRewardPerBlock.mul(farmingPeriod);
        sbf.safeTransferFrom(msg.sender, address(this), sbfAmount);
        sbfPerBlock = sbfRewardPerBlock;
        startBlock = startHeight;
        endBlock = startHeight.add(farmingPeriod);

        for (uint256 pid = 0; pid < poolInfo.length; ++pid) {
            PoolInfo storage pool = poolInfo[pid];
            pool.lastRewardBlock = startHeight;
        }
    }

    function increaseBlindFarmingReward(uint256 increasedRewardPerBlock) public onlyOwner {
        require(block.number < endBlock, "Previous farming is already completed");
        massUpdatePools();

        uint256 sbfAmount = increasedRewardPerBlock.mul(endBlock.sub(block.number));
        sbf.safeTransferFrom(msg.sender, address(this), sbfAmount);
        sbfPerBlock = sbfPerBlock.add(increasedRewardPerBlock);
    }

    function extendBlindFarmingPeriod(uint256 extendBlockNumber) public onlyOwner {
        require(block.number < endBlock, "Previous farming is already completed");
        massUpdatePools();

        uint256 sbfAmount = sbfPerBlock.mul(extendBlockNumber);
        sbf.safeTransferFrom(msg.sender, address(this), sbfAmount);
        endBlock = endBlock.add(extendBlockNumber);
    }

    function trimBlindFarmingPeriod(uint256 trimBlockNumber) public onlyOwner {
        require(block.number < endBlock.sub(trimBlockNumber), "Trim too many blocks");
        massUpdatePools();

        uint256 sbfAmount = sbfPerBlock.mul(trimBlockNumber);
        sbf.safeTransferFrom(address(this), msg.sender, sbfAmount);
        endBlock = endBlock.sub(trimBlockNumber);
    }

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

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
        uint256 length = poolInfo.length;
        uint256 points = 0;
        for (uint256 pid = 1; pid < length; ++pid) {
            points = points.add(poolInfo[pid].allocPoint);
        }
        // ensure the first pool weight is no less than 20%
        points = points.div(4);
        if (points != 0 && points > poolInfo[0].allocPoint) {
            totalAllocPoint = totalAllocPoint.sub(poolInfo[0].allocPoint).add(points);
            poolInfo[0].allocPoint = points;
        }
    }

    // Return reward multiplier over the given _from to _to block.
    function getMultiplier(uint256 _from, uint256 _to) internal view returns (uint256) {
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
        uint256 pending;
        if (user.amount > 0) {
            pending = user.amount.mul(pool.accSBFPerShare).div(REWARD_CALCULATE_PRECISION).sub(user.rewardDebt);

            if (pending > 0) {
                rewardSBF(msg.sender, pending);
            }
        }
        if (_amount > 0) {
            pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
            user.amount = user.amount.add(_amount);
        }
        user.rewardDebt = user.amount.mul(pool.accSBFPerShare).div(REWARD_CALCULATE_PRECISION);
        emit Deposit(msg.sender, _pid, _amount, pending);
    }

    function withdraw(uint256 _pid, uint256 _amount) public {
        require(_pid < poolInfo.length, "invalid pool id");
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        uint256 reward;
        require(user.amount >= _amount, "withdraw: not good");

        updatePool(_pid);
        uint256 pending = user.amount.mul(pool.accSBFPerShare).div(REWARD_CALCULATE_PRECISION).sub(user.rewardDebt);

        if (pending > 0) {
            rewardSBF(msg.sender, pending);
        }

        if (_amount > 0) {
            user.amount = user.amount.sub(_amount);
            pool.lpToken.safeTransfer(address(msg.sender), _amount);
        }
        user.rewardDebt = user.amount.mul(pool.accSBFPerShare).div(REWARD_CALCULATE_PRECISION);
        emit Withdraw(msg.sender, _pid, _amount, pending);
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

    function rewardSBF(address _to, uint256 _amount) internal {
        if (block.number < releaseHeight) {
            userLockedRewardAmount[_to] = userLockedRewardAmount[_to].add(_amount);
        } else {
            sbf.safeTransfer(_to, _amount);
        }
    }

    function setReleaseHeight(uint256 newReleaseHeight) public onlyOwner {
        require(releaseHeight > block.number, "release height must be larger than current height");
        releaseHeight = newReleaseHeight;
    }

    function claimReward() public {
        require(block.number>=releaseHeight, "release height is not reached");
        uint256 reward = userLockedRewardAmount[msg.sender];
        require(reward>0, "no reward");
        userLockedRewardAmount[msg.sender] = 0;
        sbf.safeTransfer(address(msg.sender), reward);
        emit Reward(msg.sender, reward);
    }
}
