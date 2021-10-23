const {ethers} = require('ethers')

const Timelock = require('../build-ovm/Timelock.json')
const GovernorBravoDelegate = require('../build-ovm/GovernorBravoDelegate.json')
const GovernorBravoDelegator = require('../build-ovm/GovernorBravoDelegator.json')
const Comp = require('../build-ovm/Comp.json')

const addresses = require('../networks/addresses.json')

require('dotenv').config()

const env = process.env


const compAddress = addresses.DAO_Comp;
const timelockAddress = addresses.DAO_Timelock;
const governorBravoDelegateAddress = addresses.DAO_GovernorBravoDelegate;
const governorBravoDelegatorAddress = addresses.DAO_GovernorBravoDelegator;

const sleep = async (timeout) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, timeout)
    })
}

async function getBlockNumber(web3url, chainID){
    const provider = new ethers.providers.JsonRpcProvider(web3url, {chainId: chainID});
    const blockNumber = await provider.getBlockNumber();
    return blockNumber;
}

async function main(){

    const l2_provider = new ethers.providers.JsonRpcProvider(env.L2_NODE_WEB3_URL, { chainId: 28 })

    const wallet1 = new ethers.Wallet(env.pk_0, l2_provider)
    const wallet2 = new ethers.Wallet(env.pk_1, l2_provider)
    const wallet3 = new ethers.Wallet(env.pk_2, l2_provider)

    const governorBravoDelegate = new ethers.Contract(governorBravoDelegateAddress , GovernorBravoDelegate.abi , wallet1)
    
    const timelock = new ethers.Contract(timelockAddress, Timelock.abi, wallet1)

    const governorBravoDelegator = new ethers.Contract(governorBravoDelegatorAddress, GovernorBravoDelegator.abi, wallet1)

    const comp = new ethers.Contract(compAddress, Comp.abi, wallet1)

    const governorBravo = await governorBravoDelegate.attach(
        governorBravoDelegator.address
    )

    const proposalStates = [
        'Pending',
        'Active',
        'Canceled',
        'Defeated',
        'Succeeded',
        'Queued',
        'Expired',
        'Executed',
    ];

    let addresses = [governorBravo.address] // the address of the contract where the function will be called
    let values = [0] // the eth necessary to send to the contract above
    let signatures = [''] // the function that will carry out the proposal
    
    let calldatas = [ethers.utils.defaultAbiCoder.encode( // the parameter for the above function
        ['uint256'],
        [0]
    )]
    
    let description = '#And, again' // the description of the proposal

    let value = await comp.balanceOf(wallet1.address)
    console.log('Wallet1: Comp power: ', value.toString())
    console.log('Wallet1: Current votes: ',(await comp.getCurrentVotes(wallet1.address)).toString())
    console.log(`Proposing`)

    // submitting the proposal
    await governorBravo.connect(wallet1).propose(
        addresses,
        values,
        signatures,
        calldatas,
        description,
        {
            gasPrice: 15000000,
            gasLimit: 8000000
        }
    )

    console.log()
    sleep(15 * 1000) //wait for 15 seconds
    
    const proposalID = (await governorBravo.proposalCount())._hex
    console.log(`Proposed. Proposal ID: ${proposalID}`)
    
    let proposal = await governorBravo.proposals(proposalID)
    console.log(`Proposal:`, proposal)

    console.log(`Block Number: ${await getBlockNumber(env.L2_NODE_WEB3_URL, 28)}`)
    
    let state = await governorBravo.state(proposalID)
    console.log('State is: ', proposalStates[state])

    console.log(`Waiting for voting delay - this is until the proposal becomes active and allows votes`)
    await sleep(150 * 1000) //wait for 150 seconds
}

(async () =>{
    try {
        await main();
    } catch (error) {
        console.log(error)
    }
})();