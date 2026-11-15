import { User } from "./User.js";
import { Contact } from "./Contact.js";
import { Call } from "./Call.js";
import { Token } from "./Token.js";

User.hasMany(Contact, { foreignKey: "ownerId", as: "contacts", onDelete: "CASCADE" });
Contact.belongsTo(User, { foreignKey: "ownerId", as: "owner" });
Contact.belongsTo(User, { foreignKey: "userId", as: "linkedUser" });

User.hasMany(Call, { foreignKey: "ownerId", as: "calls", onDelete: "CASCADE" });
Call.belongsTo(User, { foreignKey: "ownerId", as: "owner" });
Call.belongsTo(Contact, { foreignKey: "contactId", as: "contact" });
Call.belongsTo(User, { foreignKey: "userId", as: "remoteUser" });

User.hasMany(Token, { foreignKey: "ownerId", as: "tokens", onDelete: "CASCADE" });
Token.belongsTo(User, { foreignKey: "ownerId", as: "owner" });

export { User, Contact, Call, Token };
