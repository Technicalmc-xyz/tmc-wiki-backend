const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('Authentication.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Connected to the authentication database.');
  }
});

// Creating the table for the first time, also shows the table structure. Lots of info incase you want to add stuff in the future (forward thinking)
db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS "accounts" ("id" VARCHAR(20) NOT NULL UNIQUE, "username" VARCHAR(50) NOT NULL, "discriminator" SMALLINT NOT NULL, "avatar" VARCHAR NOT NULL,"mcusername" VARCHAR(16), "Links" TEXT, "rank" TINYINT DEFAULT `guest`, "Added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY("id"));');
});

const modifyPermissions = (id, rank) =>{
  db.run('UPDATE accounts SET rank = ? WHERE id = ?', [rank, id], (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Changed Rank for discordId: '+id+' to '+rank);
    getUser(id);
  });
};
const getUser = (id) => {
  db.get('SELECT * FROM accounts WHERE id = ?', [id], (err, row) => {
    if (row === undefined) { // No users exist, excuse me... WHAT?
      console.error('That user could not be found');
      return null;
    } else { // If user exists, just assign
      console.log(JSON.parse(JSON.stringify(row)));
    }
  });
};
modifyPermissions('219185683447808001', 'mod');
