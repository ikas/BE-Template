const chai = require('chai');

const { createProfile, createContract, createJob } = require('./factory');
const { getTestServer, cleanDatabase } = require('./utils');

chai.should();

let requester;

describe('Balances API', () => {
    before(async () => {
        requester = await getTestServer();
    });

    beforeEach(async () => { await cleanDatabase(); });
    afterEach(async () => { await cleanDatabase(); });

    describe('Deposit money into a client account', () => {
        it('Depositing without providing authentication returns 401 Unauthorized', async () => {
            const response = await requester.post(`/balances/deposit/1`);
            response.status.should.equal(401);
        });

        it('Depositing without providing the amount returns 400 Bad Request', async () => {
            const user1 = await createProfile();

            const response = await requester
                .post(`/balances/deposit/200`)
                .set('profile_id', user1.id);

            response.status.should.equal(400);
            response.body.should.be.an('object').and.have.property('error', 'Amount not provided');
        });
    
        it('Depositing in the balance of a user that does not exist returns 404 Not Found', async () => {
            const user1 = await createProfile();

            const response = await requester
                .post(`/balances/deposit/200`)
                .set('profile_id', user1.id)
                .send({ amount: 100 });

            response.status.should.equal(404);
            response.body.should.be.an('object').and.have.property('error', 'Client not found');
        });

        it('Trying to deposit more than 25% of current total of jobs to pay returns 400 Bad request', async () => {
            const user1 = await createProfile(100);
            const user2 = await createProfile(100);

            const contract = await createContract(user1.id, user2.id);
            await createJob(contract.id, false, 399);

            const response = await requester
                .post(`/balances/deposit/${user1.id}`)
                .set('profile_id', user1.id)
                .send({ amount: 100 });

            response.status.should.equal(400);
            response.body.should.be.an('object').and.have.property('error', 'Cannot deposit more than 25% of unpaid jobs amount');
        });

        it('(Happy case) Trying to deposit less or equal than 25% of current total of jobs to pay returns 200 OK', async () => {
            const user1 = await createProfile(100);
            const user2 = await createProfile(100);

            const contract = await createContract(user1.id, user2.id);
            await createJob(contract.id, false, 401);

            const response = await requester
                .post(`/balances/deposit/${user1.id}`)
                .set('profile_id', user1.id)
                .send({ amount: 100 });

            response.status.should.equal(200);
            response.body.should.be.an('object').and.have.property('balance', 200);
        });
    });
});