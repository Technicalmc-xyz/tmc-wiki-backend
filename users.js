
const usersById = new Map();

class User {
    constructor(discordId, discordName, discordDiscriminator, discordAvatar, rank) {
        this.discordId = discordId;
        this.discordName = discordName;
        this.discordDiscriminator = discordDiscriminator;
        this.discordAvatar = discordAvatar;
		this.rank = rank;
        usersById.set(discordId, this);
    }

    static findById = (id) => {
        return usersById.get(id);
    }
}
exports.User = User;
