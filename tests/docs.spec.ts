import axios from 'axios';
import { assert, expect } from 'chai';
import { stub, restore, resetHistory } from 'sinon';

import { Docs } from '../src/docs.js';
import { DocType } from '../src/doc-design.js';

describe('Docs', () => {
  let axiosPostStub;
  let consoleErrorStub;
  let consoleWarnStub;

  beforeEach(() => {
    axiosPostStub = stub(axios, 'post').resolves();
    consoleErrorStub = stub(console, 'error');
    consoleWarnStub = stub(console, 'warn');
  });

  afterEach(() => restore());

  it('should create docs based on the doc design', async () => {
    const reportDoc = { _id: 'report-x', form: 'pregnancy_danger_sign', type: DocType.dataRecord };
    const personDoc = { _id: 'person-x', type: DocType.person, name: 'Green Hospital' }
    const hospitalDoc = { _id: 'hospital-x', type: 'hospital', name: 'Green Hospital' }
    const centerDoc = { _id: 'center-x', type: 'center', name: 'Green Health Center' }
    const clinicDoc = { _id: 'clinic-x', type: 'clinic', name: 'Green Clinic' }
    const unitDoc = { _id: 'unit-x', type: 'unit', name: 'Green Unit' }
    const houseDoc = { _id: 'house-x', type: 'house', name: 'Green House' }

    const designs = [
      { amount: 2, getDoc: () => reportDoc },
      {
        amount: 1,
        getDoc: () => hospitalDoc,
        children: [
          {
            amount: 1,
            getDoc: () => unitDoc,
            children: [
              { amount: 3, getDoc: () => clinicDoc },
              { amount: 3, getDoc: () => personDoc },
              {
                amount: 1,
                getDoc: () => houseDoc,
                children: [
                  { amount: 2, getDoc: () => personDoc },
                ],
              },
            ],
          },
          {
            amount: 1,
            getDoc: () => centerDoc,
            children: [
              { amount: 3, getDoc: () => personDoc },
              {
                amount: 1,
                getDoc: () => houseDoc,
                children: [
                  { amount: 10, getDoc: () => personDoc },
                ],
              },
            ],
          },
          { amount: 1, getDoc: () => personDoc },
        ],
      },
    ];

    await Promise
      .all(Docs.createDocs(designs))
      .catch(() => assert('Should have not thrown error.'));

    expect(axiosPostStub.callCount).to.equal(12);
    axiosPostStub.args.forEach(call => expect(call[0]).to.contain('/_bulk_docs'));
    expect(axiosPostStub.args[0][1]).to.deep.equal({
      docs: Array(2).fill({ ...reportDoc, parent: undefined }),
    });
    expect(axiosPostStub.args[1][1]).to.deep.equal({
      docs: [{ ...hospitalDoc, parent: undefined }],
    });

    expect(axiosPostStub.args[2][1]).to.deep.equal({
      docs: [{ ...unitDoc, parent: { _id: hospitalDoc._id } }],
    });
    expect(axiosPostStub.args[3][1]).to.deep.equal({
      docs: [{ ...centerDoc, parent: { _id: hospitalDoc._id } }],
    });
    expect(axiosPostStub.args[4][1]).to.deep.equal({
      docs: [{ ...personDoc, parent: { _id: hospitalDoc._id } }],
    });

    expect(axiosPostStub.args[5][1]).to.deep.equal({
      docs: Array(3).fill({
        ...clinicDoc,
        parent: { _id: unitDoc._id, parent: { _id: hospitalDoc._id } },
      }),
    });
    expect(axiosPostStub.args[6][1]).to.deep.equal({
      docs: Array(3).fill({
        ...personDoc,
        parent: { _id: unitDoc._id, parent: { _id: hospitalDoc._id } },
      }),
    });
    expect(axiosPostStub.args[7][1]).to.deep.equal({
      docs: [{
        ...houseDoc,
        parent: { _id: unitDoc._id, parent: { _id: hospitalDoc._id } },
      }],
    });

    expect(axiosPostStub.args[8][1]).to.deep.equal({
      docs: Array(3).fill({
        ...personDoc,
        parent: { _id: centerDoc._id, parent: { _id: hospitalDoc._id } },
      }),
    });
    expect(axiosPostStub.args[9][1]).to.deep.equal({
      docs: [{
        ...houseDoc,
        parent: { _id: centerDoc._id, parent: { _id: hospitalDoc._id } },
      }],
    });

    expect(axiosPostStub.args[10][1]).to.deep.equal({
      docs: Array(2).fill({
        ...personDoc,
        parent: { _id: houseDoc._id, parent: { _id: unitDoc._id } },
      }),
    });

    expect(axiosPostStub.args[11][1]).to.deep.equal({
      docs: Array(10).fill({
        ...personDoc,
        parent: { _id: houseDoc._id, parent: { _id: centerDoc._id } },
      }),
    });
  });

  it('should create docs based on the doc design and not override parent object', async () => {
    const hospitalDoc = { _id: 'hospital-x', type: 'hospital', name: 'Green Hospital' }
    const centerDoc = { _id: 'center-x', type: 'center', name: 'Green Health Center' }
    const unitDoc = { _id: 'unit-x', type: 'unit', name: 'Green Unit' }

    const designs = [
      {
        amount: 1,
        getDoc: () => hospitalDoc,
        children: [
          { amount: 4, getDoc: () => unitDoc },
          {
            amount: 13,
            getDoc: () => ({ ...centerDoc, parent: { _id: '009' } }),
          },
        ],
      },
      {
        amount: 3,
        getDoc: () => ({ ...centerDoc, parent: { _id: '007' } }),
        children: [
          { amount: 7, getDoc: () => unitDoc }
        ],
      },
    ];

    await Promise
      .all(Docs.createDocs(designs))
      .catch(() => assert('Should have not thrown error.'));

    expect(axiosPostStub.callCount).to.equal(8);
    axiosPostStub.args.forEach(call => expect(call[0]).to.contain('/_bulk_docs'));
    expect(axiosPostStub.args[0][1]).to.deep.equal({
      docs: [{ ...hospitalDoc, parent: undefined }],
    });
    expect(axiosPostStub.args[1][1]).to.deep.equal({
      docs: Array(3).fill({ ...centerDoc, parent: { _id: '007' } }),
    });

    expect(axiosPostStub.args[2][1]).to.deep.equal({
      docs: Array(4).fill({ ...unitDoc, parent: { _id: hospitalDoc._id } }),
    });
    expect(axiosPostStub.args[3][1]).to.deep.equal({
      docs: Array(13).fill({ ...centerDoc, parent: { _id: '009' } }),
    })

    expect(axiosPostStub.args[4][1]).to.deep.equal({
      docs: Array(7).fill({ ...unitDoc, parent: { _id: centerDoc._id, parent: { _id: '007' } } }),
    });
    expect(axiosPostStub.args[5][1]).to.deep.equal({
      docs: Array(7).fill({ ...unitDoc, parent: { _id: centerDoc._id, parent: { _id: '007' } } }),
    });
    expect(axiosPostStub.args[6][1]).to.deep.equal({
      docs: Array(7).fill({ ...unitDoc, parent: { _id: centerDoc._id, parent: { _id: '007' } } }),
    });
  });

  it('should warn if amount or getDoc are missing', async () => {
    let designs = [
      {},
      { amount: 2, getDoc: () => ({ _id: '124', type: 'hospital' }) },
    ];

    await Promise
      .all(Docs.createDocs(designs))
      .catch(() => assert('Should have not thrown error.'));

    expect(axiosPostStub.calledOnce).to.be.true;
    expect(consoleWarnStub.calledOnce).to.be.true;
    expect(consoleWarnStub.args[0][0]).to.equal('Remember to set the "amount" and the "getDoc".');

    resetHistory();
    designs = [
      {
        amount: 2,
        getDoc: () => ({ _id: '124', type: 'clinic' }),
        // @ts-ignore
        children: [ { amount: 3 }, { getDoc: () => {} } ],
      },
    ];

    await Promise.all(Docs.createDocs(designs));

    expect(axiosPostStub.calledOnce).to.be.true;
    expect(consoleWarnStub.callCount).to.equal(4); // The first "amount" is 2 then it will run the "children" twice.
    expect(consoleWarnStub.args[0][0]).to.equal('Remember to set the "amount" and the "getDoc".');

    resetHistory();
    designs = [{
        amount: 0,
        getDoc: () => ({ _id: '124', type: 'clinic' }),
    }];

    await Promise.all(Docs.createDocs(designs));

    expect(axiosPostStub.notCalled).to.be.true;
    expect(consoleWarnStub.calledOnce).to.be.true;
    expect(consoleWarnStub.args[0][0]).to.equal('Remember to set the "amount" and the "getDoc".');
  });

  it('should catch errors when saving docs', async () => {
    const designs = [
      { amount: 2, getDoc: () => ({ _id: '124', type: 'hospital' }) },
    ];
    const error = new Error('Ups something happened');
    axiosPostStub.rejects(error);

    try {
      await Promise.all(Docs.createDocs(designs));
      assert('Should have thrown error.');
    } catch (error) {
      expect(axiosPostStub.calledOnce).to.be.true;
      expect(consoleErrorStub.calledOnce).to.be.true;
      expect(consoleErrorStub.args[0]).to.have.members([ 'Failed saving docs ::>', error ]);
    }
  });

  it('should catch errors when saving docs, but continue saving other batches', async () => {
    const designs = [
      {
        amount: 2,
        getDoc: () => ({ _id: '124', type: 'ward-b' })
      },
      {
        amount: 2,
        getDoc: () => ({ _id: '888', type: 'ward-a' })
      },
    ];
    const error = new Error('Ups something happened');
    axiosPostStub.onFirstCall().rejects(error);

    try {
      await Promise.all(Docs.createDocs(designs));
      assert('Should have thrown error.');
    } catch (error) {
      expect(axiosPostStub.calledTwice).to.be.true;
      expect(consoleErrorStub.calledOnce).to.be.true;
      expect(consoleErrorStub.args[0]).to.have.members([ 'Failed saving docs ::>', error ]);
      expect(axiosPostStub.args[0][0]).to.contain('/_bulk_docs')
      expect(axiosPostStub.args[0][1]).to.deep.equal({
        docs: Array(2).fill({ _id: '888', type: 'ward-a', parent: undefined }),
      });
    }
  });
});
