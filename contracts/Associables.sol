//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Associables is ERC1155Burnable, Ownable {
    ERC20Burnable token;

    uint feesBurnRate;
    uint public fees;

    // name of associable => name of image => url
    mapping(string => mapping( string => string )) public associableImage;

    struct ItemIndex {
        uint256 index;
        bool inUse;
    }

    struct Associable {
        string name;
        uint256 maxSupply;
        uint256 minted;
        string uri;
        string[] costName;
        uint256[] costAmount;
        uint256 energyCost;
        uint256 fee;
    }

    event NewAssociableAdded(
        string indexed _name,
        uint256 indexed _maxSupply,
        string _uri,
        string[] _costName,
        uint256[] _costAmount,
        uint256 _energyCost,
        uint256 _fee
    );

    event UpdateAssociableMaxSupply(
        string indexed _name,
        uint256 indexed _maxSupply
    );

    event CraftAssociable(
        string indexed _name,
        address indexed _owner
    );

    event DeconstructAssociable(
        string indexed _name,
        address indexed _owner
    );

    event ImageAdded(
        string indexed _name,
        string indexed _provider,
        string _uri
    );

    // Assoiciable blueprint related
    // We are using an array in order to ensure that one can iterate over all the associables available.
    Associable[] public associablesArray;
    // Given an associable name, "wood", returns the array index where Associables are being stored.
    mapping(string => ItemIndex) public associablesIndex;

    /**
     * @dev Sets the values for {token} and {feesBurnRate}.
     *
     * We are passing an empty string as the URI since we will be creating IPFS URI as 
     * associables are creating. These can have completely different URIs
     */
    constructor(address _token, uint _feesBurnRate) ERC1155("") {
        token = ERC20Burnable(_token);
        feesBurnRate = _feesBurnRate;
    }

    /**
     * @dev Given the name of an associable, returns the token id/ index of the associable in the array
     */
    function getIdFromAssociableName(string memory _name) internal view returns(uint){
        return associablesIndex[_name].index;
    }

    /**
     * @dev Given the name of an associable, checks if this associable has been added and is in use. Returns a boolean
     */
    function isAssociableInUse(string memory _name) internal view returns(bool){
        return associablesIndex[_name].inUse;
    }

    /**
     * @dev Given a uint representing a fee, returns how much of that fee should be burnt
     */
    function calculateFeesToBeBurnt(uint fee) internal view returns(uint){
        return (fee * feesBurnRate) / 100;
    }

    /**
     * @dev Given a fee amount, handles calculating the fee burn, burning the tokens and adding the rest of the fee to 
     * the fees free balance.
     */
    function handleFees(uint fee) internal{
        uint burnTokens = calculateFeesToBeBurnt(fee);
        token.burn(burnTokens);
        fees += fee - burnTokens;
    }

    /**
     * @dev adds the associable blueprint to the {associablesArray}
     *
     * OnlyOwner: This is intended to be called by a governance contract.
     */
    function addAssociable(
        string memory _name,
        uint256 _maxSupply,
        string memory _uri,
        string[] memory _costName,
        uint256[] memory _costAmount,
        uint256 _energyCost,
        uint256 _fee
    ) external onlyOwner {
        require(!associablesIndex[_name].inUse, "This item has already been included as an associable.");
        require(_maxSupply > 0);
        associablesIndex[_name] = ItemIndex(associablesArray.length, true);
        Associable memory associable = Associable(_name, _maxSupply, 0, _uri, _costName, _costAmount, _energyCost, _fee);        

        associablesArray.push(associable);
        emit NewAssociableAdded(_name, _maxSupply, _uri, _costName, _costAmount, _energyCost, _fee);
    }

    /**
     * @dev updates the {_maxSupply} of existing associable by {_name}
     *
     * OnlyOwner: This is intended to be called by a governance contract.
     */
    function updateAssociableMaxSupply(string memory _name, uint _maxSupply) external onlyOwner{
        uint itemIndex = getIdFromAssociableName(_name);
        bool isItemInUse = isAssociableInUse(_name);
        require( isItemInUse, "This associable has not been added yet." );
        Associable storage associable = associablesArray[itemIndex];
        require(_maxSupply > associable.minted, "There are already more that this max supply.");

        associable.maxSupply = _maxSupply;
        emit UpdateAssociableMaxSupply(_name, _maxSupply);
    }

    /**
     * @dev Given a {_player} address and a valid associbale {_name} crafts an associable from a blueprint.
     *
     * The address {_player} must contain enough tokens (NRG) for the base fee and cost and if stipulated
     * enough base associables to create the associable.
     *
     * The associables, if any, that make up this new associable will be burnt to avoid double use.
     */
    function craft(address _player, string memory _name) external{
        uint itemIndex = getIdFromAssociableName(_name);
        bool isItemInUse = isAssociableInUse(_name);

        require( isItemInUse, "This associable has not been added yet." );
        
        Associable storage associable = associablesArray[itemIndex];
        require( associable.minted < associable.maxSupply, "The max supply for this associbale has already been reached. Cannot craft anymore.");
        
        uint tokenBalance = token.balanceOf(_player);
        uint totalCost = associable.energyCost + associable.fee;
        require( tokenBalance >= totalCost, "Not enough NRG. Go buy more." );

        for(uint i = 0; i < associable.costName.length; i++){
            require( balanceOf(_player, getIdFromAssociableName(associable.costName[i])) >= associable.costAmount[i], "Not enough resources");
        }

        token.transferFrom(_player, address(this), totalCost);
        handleFees(associable.fee);
        if(associable.costName.length > 0){
            uint[] memory ids = new uint[](associable.costName.length);
            for(uint i = 0; i < associable.costName.length; i++){
                ids[i] = associablesIndex[associable.costName[i]].index;
            }
            _burnBatch(_player, ids, associable.costAmount);
        }
        associable.minted += 1;
        _mint(_player, itemIndex, 1, "");
        emit CraftAssociable(_name, _player);
    }

    /**
     * @dev Given an {_associableId}, .i.e. token id, an owner may deconstruct that associable to the components that made
     * it up in the first place.
     *
     * Given associable C is made up of B and C, C will be burnt while B and C will be minted again. Apart from this the user 
     * will need to pay the fee associated with associable C.
     * 
     * Given associable C is a base associable, this is made up of the NRG token. In this case the cost of the NRG token will be
     * refunded minus the fee.
     */
    function deconstruct(uint256 _associableId) external {
        require( balanceOf(_msgSender(), _associableId) > 0, "You do not own any of these.");

        Associable storage associable = associablesArray[_associableId];
        
        // If base item.
        if(associable.costName.length == 0){
            uint refundValue = associable.energyCost - associable.fee;
            token.transfer(_msgSender(), refundValue);
        } else {
            require(token.balanceOf(_msgSender()) > associable.fee, "Not enough NRG. Go buy more.");
            token.transferFrom(_msgSender(), address(this), associable.fee);
            
            // remint the items which make up this item
            if(associable.costName.length > 0){
                uint[] memory ids = new uint[](associable.costName.length);
                for(uint i = 0; i < associable.costName.length; i++){
                    ids[i] = associablesIndex[associable.costName[i]].index;
                }
                _mintBatch(_msgSender(), ids, associable.costAmount, "");
            }
        }
        _burn(_msgSender(), _associableId, 1);
        associable.minted -= 1;
        handleFees(associable.fee);
        emit DeconstructAssociable(associable.name, _msgSender());
    }

    /**
     * @dev Returns the total number of associable "blueprints which have been added".
     */
    function associablesTypesCount() external view returns (uint256) {
        return associablesArray.length;
    }

    /**
     * @dev Given an {_associableName}, an {_associableIdentifier}, and a {_url} sets an IPFS image URL.
     *
     * This functionality was added to ensure that different games may provide their own assets for their games. These assets
     * may be used by anyone.
     * OnlyOwner: This is intended to be called by a governance contract.
     */
    function addAssociableImageURI(string memory _associableName, string memory _associableIdentifier, string memory _url) external onlyOwner {
        associableImage[_associableName][_associableIdentifier] = _url;
        emit ImageAdded(_associableName, _associableIdentifier, _url);
    }

    /**
     * @dev Given an {_associableName} and an {_associableIdentifier}, returns an IPFS image URL.
     *
     * This functionality was added to ensure that different games may provide their own assets for their games. These assets
     * may be used by anyone.
     */
    function getAssociableImageURI(string memory _associableName, string memory _associableIdentifier) external view returns(string memory){
        return associableImage[_associableName][_associableIdentifier];
    }

    /**
     * @dev Returns the generic URI for the associable defined by {_id}
     *
     * This functionality was added to ensure that different games may provide their own assets for their games. These assets
     * may be used by anyone.
     */
    function uri(uint256 _id) public view virtual override returns (string memory) {
        return associablesArray[_id].uri;
    }
}