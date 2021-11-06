const { Profile, Contract, Job } = require('../src/model');

exports.createProfile = async function createProfile() {
    return await Profile.create({
        firstName: 'Harry',
        lastName: 'Potter',
        profession: 'Wizard',
        balance: 1150,
        type: 'client',
    });
}

exports.createContract = async function createContract(ClientId, ContractorId, status = 'terminated') {
    return await Contract.create({
        terms: 'new contract',
        status,
        ClientId,
        ContractorId,
    });
}

exports.createJob = async function createJob(ContractId, paid = false) {
    return await Job.create({
        description: 'work',
        price: 2020,
        paid: paid ? true : null,
        paymentDate: paid ? '2020-08-15T19:11:26.737Z' : null,
        ContractId,
    });
}