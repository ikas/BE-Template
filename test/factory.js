const { Profile, Contract } = require('../src/model');

exports.createContract = async function createContract(override = {}) {
    return await Contract.create({
        terms: 'new contract',
        status: 'terminated',
        ClientId: '1',
        ContractorId: '1',
        ...override,
    });
}

exports.createProfile = async function createProfile(override = {}) {
    return await Profile.create({
        firstName: 'Harry',
        lastName: 'Potter',
        profession: 'Wizard',
        balance: 1150,
        type: 'client',
        ...override,
    });
}