import "server-only";
import type { CollectionReference, DocumentData, UpdateData } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * Generic na base class para sa lahat ng Firestore collection (Data Layer, Fig. 6).
 * - `D` ang hugis ng document sa Firestore.
 * - `T` ang domain object (class instance) na ginagamit ng app.
 * Kailangan lang ng subclass na sabihin ang pangalan ng collection at kung paano i-convert ang D at T.
 */
export abstract class BaseRepository<T, D extends DocumentData> {
  protected abstract readonly collectionName: string;

  protected abstract toEntity(id: string, data: D): T;
  protected abstract toDocument(entity: T): D;

  protected get collection(): CollectionReference<D> {
    return getAdminDb().collection(this.collectionName) as CollectionReference<D>;
  }

  async findById(id: string): Promise<T | null> {
    const snap = await this.collection.doc(id).get();
    const data = snap.data();
    return data ? this.toEntity(snap.id, data) : null;
  }

  async findAll(): Promise<T[]> {
    const snap = await this.collection.get();
    return snap.docs.map((doc) => this.toEntity(doc.id, doc.data()));
  }

  async findWhere(field: string, value: unknown): Promise<T[]> {
    const snap = await this.collection.where(field, "==", value).get();
    return snap.docs.map((doc) => this.toEntity(doc.id, doc.data()));
  }

  /** Gumagawa ng document. Kapag walang `id`, auto-generated ito ng Firestore. */
  async create(entity: T, id?: string): Promise<string> {
    const data = this.toDocument(entity);
    if (id) {
      await this.collection.doc(id).set(data);
      return id;
    }
    const ref = await this.collection.add(data);
    return ref.id;
  }

  async update(id: string, changes: UpdateData<D>): Promise<void> {
    await this.collection.doc(id).update(changes);
  }

  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }
}
