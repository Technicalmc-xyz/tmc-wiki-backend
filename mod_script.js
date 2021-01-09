var sqlite3 = require("sqlite3");
let db = new sqlite3.Database("Authentication.db", sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, err => {
    if (err) { 
        console.error(err.message); 
    } else {
        console.log("Connected to the authentication database.");
    }
});

// Creating the table for the first time, also shows the table structure. Lots of info incase you want to add stuff in the future (forward thinking)
db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS "accounts" ("DiscordId" VARCHAR(20) NOT NULL UNIQUE, "Username" VARCHAR(50) NOT NULL, "McUsername" VARCHAR(16), "NickName" VARCHAR(50), "Email" VARCHAR(100), "Desciption" TEXT, "Servers" TEXT, "Links" TEXT, "Rank" TINYINT DEFAULT `guest`, "Added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY("DiscordId"));');
});

const modifyPermissions = (discordId, rank) =>{
    db.run("UPDATE accounts SET Rank = ? WHERE DiscordId = ?", [rank, discordId], (err) => {
        if (err) { console.error(err.message);}
        console.log("Changed Rank for discordId: "+discordId+" to "+rank);
        getUser(discordId)
    });
}
const getUser = (discordId) => {
    db.get("SELECT * FROM accounts WHERE DiscordId = ?",[discordId],(err, row) => {
        if (row == undefined) { // No users exist, excuse me... WHAT?
            console.error("That user could not be found");
            return null;
        } else { // If user exists, just assign
            console.log(JSON.parse(JSON.stringify(row)));
        }
    });
}
modifyPermissions("219185683447808001", 'mod');
