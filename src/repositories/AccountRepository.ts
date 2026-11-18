import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { createUser, type AccountStatus, type Role, type User } from "@/domain/users/User";
import { BaseRepository } from "./BaseRepository";

/** Hugis ng `accounts/{uid}` sa Firestore. */
export interface AccountDocument {
  username: string;
  email: string;
  role: Role;
  status: AccountStatus;
  createdAt: Timestamp;
}

export class AccountRepository extends BaseRepository<User, AccountDocument> {
  protected readonly collectionName = "accounts";

  protected toEntity(id: string, data: AccountDocument): User {
    return createUser(id, data.role, {
      username: data.username,
      email: data.email,
      status: data.status,
      createdAt: data.createdAt.toDate(),
    });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.findOneWhere("username", username.trim().toLowerCase());
  }

  isUsernameTaken(username: string): Promise<boolean> {
    return this.existsWhere("username", username.trim().toLowerCase());
  }

  protected toDocument(user: User): AccountDocument {
    const props = user.toAccountProps();
    return {
      username: props.username,
      email: props.email,
      role: user.role,
      status: props.status,
      createdAt: Timestamp.fromDate(props.createdAt),
    };
  }
}
