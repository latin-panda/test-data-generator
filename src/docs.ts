import axios from 'axios';
import { v4 as uuid } from 'uuid';
import { DocType, Parent, Doc } from './doc-design.js';
import { environment } from './environment.js';

export class Docs {
  private static async saveDocs(docs, dbName = 'medic', batchId) {
    const path = `${environment.getChtUrl()}/${dbName}/_bulk_docs`;
    try {
      await axios.post(path, { docs });
      console.info(`Successfully saved ${docs.length} docs from ${batchId}.`);
    } catch (error) {
      console.error(`Failed saving docs from ${batchId}. Errors: `, error.message || error.errors || error);
    }
  }

  static async createDocs(designs, parentDoc?: Doc) {
    for(const [index, design] of designs.entries()) {
      if (!design.designId) {
        design.designId = index;
      }
      await this.createDocsForDesign(design, parentDoc);
    }
  }

  private static async createDocsForDesign(design, parentDoc?: Doc) {
    if (!design.amount || !design.getDoc) {
      throw Error(`Remember to set the "amount" and the "getDoc" in ${design.designId}.`);
    }

    const batch = new Array(design.amount)
      .fill(null)
      .map(() => {
        const doc = design.getDoc({ parent: parentDoc });
        return {
          design,
          doc: {
            _id: uuid(),
            ...doc,
            ...Docs.getParentAssociationData(doc, parentDoc)
          },
        };
      });

    await Docs.saveDocs(batch.map(entity => entity.doc), design.db, design.designId);
    const entityWithChildrenToCreate = batch
      .filter(entity => entity.doc.type !== DocType.dataRecord && entity.design.children);
    for(const entity of entityWithChildrenToCreate) {
      await Docs.createDocs(entity.design.children, entity.doc);
    }
  }

  private static createParentRelation(parentDoc: Doc | Parent): Parent {
    if (!parentDoc) {
      return;
    }

    const result: Parent = { _id: parentDoc._id };
    let minified: Parent = result;

    while (parentDoc.parent) {
      minified.parent = { _id: parentDoc.parent._id };
      minified = minified.parent;
      parentDoc = parentDoc.parent;
    }

    return result;
  }

  private static getPatientPlaceIdentifiers(parentDoc: Doc) {
    if (parentDoc.type === DocType.person || parentDoc.contact_type === DocType.person) {
      return {
        patient_id: parentDoc.patient_id,
        patient_uuid: parentDoc._id,
      };
    }
    return {
      place_id: parentDoc.place_id,
      place_uuid: parentDoc._id,
    };
  }

  private static populateDataRecordParentData(doc, parentDoc: Doc) {
    return {
      contact: this.createParentRelation(parentDoc),
      fields: {
        ...this.getPatientPlaceIdentifiers(parentDoc),
        ...doc.fields,
      }
    };
  }

  private static getParentAssociationData(doc, parentDoc: Doc) {
    if (doc.type === DocType.dataRecord) {
      const dataRecordParent = doc.contact || parentDoc;
      return dataRecordParent ? this.populateDataRecordParentData(doc, dataRecordParent) : {};
    }
    const contactParent = doc.parent || parentDoc;
    if (!contactParent) {
      return {};
    }
    return { parent: this.createParentRelation(contactParent) };
  }
}
