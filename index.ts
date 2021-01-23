// Setting up the authentication library
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('Authentication.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log(chalk.greenBright('Connected to the authentication database.'));
});

// Creating the table for the first time, also shows the table structure. Lots of info in case you want to add stuff in the future (forward thinking)
db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS "accounts" ("id" VARCHAR(20) NOT NULL UNIQUE, "username" VARCHAR(50) NOT NULL, "discriminator" SMALLINT NOT NULL, "avatar" VARCHAR NOT NULL,"mcusername" VARCHAR(16), "links" TEXT, "rank" TINYINT DEFAULT `guest`, "added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY("id"));');
});

const {randomBytes} = require('crypto');
const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const fs = require('fs');
const passport = require('passport');
const querystring = require('querystring');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');
const chalk = require('chalk');
const xss = require('xss-clean');
const fileUpload = require('express-fileupload');

const posts = require('./src/posts');
const archive = require('./src/archive');
const utils = require('./utils/utils');

const rankList= ['banned', 'guest', 'trusted', 'editor', 'dev', 'mod']; // 0=banned, 1=guest, 2=trusted, 3=editor, 4=mod, 5=dev

// Assumes that production and development are false and that you need to supply at least one argument
let production: boolean = false;
let development: boolean = false;
if (process.argv.length === 2) {
    console.error('Expected at least one argument!');
    process.exit(1);
}
// Gets the third argument and makes either production or development true
const arguments = process.argv.slice(2);
if (arguments[0] === 'pro') {
    production = true;
} else {
    development = true;
}
console.log('arguments: ', arguments);


if (!fs.existsSync('configs/secret_config.json')) {
    throw new Error('You need a secret_config.json file to store app secrets!');
}

const secretConfig = JSON.parse(fs.readFileSync('configs/secret_config.json', 'utf8'));

const app = express();
passport.serializeUser((user, callback) => {
    callback(null, user);
});
passport.deserializeUser((discordId: string, callback) => {
    userExists(discordId).then((result) => {
        if (result) {
            callback(null, discordId);
        } else {
            callback(null, new Error(`User with id ${discordId} not found`));
        }
    });
});

passport.use('discord', new DiscordStrategy({
    clientID: '773179848587608095',
    clientSecret: secretConfig.discord_client_secret,
    callbackURL: development ? '/api/auth/success' : 'https://technicalmc.xyz/api/auth/success', // FIXME
    scope: ['identify'],
    customHeaders: []
}, (accessToken, refreshToken, profile, callback) => {
    loginDatabase({id : profile.id, username : profile.username, discriminator : profile.discriminator, avatar : profile.avatar});
    return callback(null, profile.id);
}));

app.use(session({
    secret: randomBytes(512).toString('base64'),
    saveUninitialized: true,
    resave: false,
    cookie: {
        secure: false // FIXME
    }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json({limit: '100mb'}));
app.use(xss());
app.use(compression());
app.use(fileUpload({createParentPath: true}));

const handleCreatePost = async (req, res) => {
    const reqBody = utils.cast('object', req.body);
    const body = utils.cast('string', reqBody.body);
    const title = utils.cast('string', reqBody.title);
    const tags = utils.cast('string', reqBody.tags);
    const description = utils.cast('string', reqBody.description);
    const metadata = await posts.createPost(req.user, title, description, tags, body);
    console.log(`Created post #${metadata.id}`);
    res.send('OK');
};


const getPost = async (req, res) => {
    const postId = utils.cast('number', +utils.cast('object', req.query).id);
    if (!posts.postExists(postId)) {
        res.status(404).send(`No such post ID ${postId}`);
        return;
    }
    const networkPost = await posts.getNetworkPostObject(postId);
    // See what post number is being requested
    // Console.log('Post ID Number: ' + postId);
    res.send(networkPost);
};


const editPost = async (req, res) => {
    const postId = utils.cast('number', +utils.cast('object', req.query).id);
    if (!posts.postExists(postId)) {
        res.status(404).send(`No such post ID ${postId}`);
        return;
    }
    const reqBody = utils.cast('object', req.body);
    const metadata = posts.getMetadata(postId);
    if (metadata.edit_count !== utils.cast('number', req.body.lastEditCount)) {
        res.send('OUTDATED');
        return;
    }
    metadata.edit_count++;

    await posts.setPostBody(postId, utils.cast('string', reqBody.body));
    const message = utils.cast('string', reqBody.message);
    metadata.title = utils.cast('string', reqBody.title);
    metadata.tags = utils.cast('string', reqBody.tags);
    metadata.description = utils.cast('string', reqBody.description);
    metadata.last_edited = new Date().toDateString();
    await posts.saveMetadata();
    await posts.commit(postId, message, req.user);
    console.log(`Edited post #${postId}`)
    res.send('OK');
};

const getPosts = async (req, res) => {
    const query = utils.cast('object', req.query);
    let n = utils.cast('number', +query.n) || 5;
    if (n < 0) n = 5;
    let start = utils.cast('number', +query.start) || 0;
    if (start < 0) start = 0;
    const q = utils.cast('string', query.q);
    let myPosts = posts.getAllMetadata();

    if (q) {
        // TODO: sorting
    } else {
        myPosts.sort((a, b) => {
            if (a.last_edited < b.last_edited) return -1;
            else if (a.last_edited > b.last_edited) return 1;
            else return 0;
        });
    }

    const length = myPosts.length;
    if (start > length) start = length;
    if (start + n > length) n = length - start;
    myPosts = myPosts.slice(length - start - n, length - start);
    res.send(myPosts);
};


const getUserInfo = (req, res) => {
    let userInfo = {
        authenticated: undefined
    };
    if (req.isAuthenticated()) {
        getUser({id : req.user, callback : (result) => {
            Object.assign(userInfo, result);
            res.send(userInfo);
        }});
        userInfo.authenticated = true;
    } else {
        userInfo.authenticated = false;
        res.send(userInfo);
    }
};

const logout = (req, res) => {
    getUser({id : req.user, callback : result => {
        console.log("id: " + result.id + "; Username: " + result.username + "; Has logged out!");
    }});
    req.logout();
    res.redirect('/');
};


interface LoginDatabaseParams {
    id: string;
    username: string;
    discriminator: number;
    avatar: string;
}
const loginDatabase = ({id, username, discriminator, avatar}: LoginDatabaseParams) => {
    db.get('SELECT id FROM accounts WHERE id = ?;', [id], (err, row) => {
        if (row == undefined) { // If user does not exist
            db.run('insert into accounts(id,username,discriminator,avatar) values (?,?,?,?)', [id, username, discriminator, avatar], (err) => {
                if (err) {
                    console.error(err.message);
                }
                console.log('id: ' + id + ' - Username: ' + username + ' was added to the login database!');
                // Rank would be "guest" so do nothing
            });
        } else { // If user exists, overwrite the database with the their information, in case they updated their profile
            db.run('UPDATE accounts set username = ?, discriminator =?, avatar = ? WHERE id = ?', [username, discriminator, avatar, id], (err) => {
                if (err) {
                    console.error(err.message);
                }
                console.log('id: ' + id + ' - Username: ' + username + ' has logged back in');
                // Rank would be "guest" so do nothing
            });
        }
    });
};


const requirePermission = (rankRequired: string) => (req, res, next) => {
    if (!req.isAuthenticated()) {
        console.log("THIS USER IS NOT AUTH'D");
        return res.status(403).send('Not authenticated');
    } else {
        getUser({id : req.user, callback : result => {
            if (rankList.indexOf(result.rank) >= rankList.indexOf(rankRequired)) {
                next();
            } else {
                return res.status(403).send('Incorrect Permission Level');
            }
        }});
    }
};


const modifyPermissions = (req, res) => {
    const reqBody = utils.cast('object', req.body);
    const id = utils.cast('string', reqBody.discordId);
    const rank = utils.cast('string', reqBody.rank);
    if (!rankList.includes(rank)) {
        return res.status(403).send('NOT A RANK');

    }
    else if (id.length > 20) {
        return res.status(403).send('DISCORD ID IS TOO LARGE');
    }
    else {
        db.run('UPDATE accounts set rank = ? WHERE id = ?', [rank, id], (err) => {
            if (err) {
                return res.status(403).send(err);
            }
            console.log((chalk.green('Changed Rank for id: ' + id + ' to ' + rank)));
            return res.status(200).send('Changed Rank for id: ' + id + ' to ' + rank);
        });
    }

};


interface User {
    id: string;
    callback: any;
}
// Will return all information on a single user in the database.
const getUser = ({id, callback}: User) => {
    db.get("SELECT * FROM accounts WHERE id = ?", [id], (err, row) => {
        if (row == undefined) { // No users exist
            return callback(null);
        }  // If user exists, just assign
        else {
            return callback(row);
        }
    });
};


// If no rank is specified it will return a list of all users. Otherwise it will return a list of all users with that rank
// Returns a JSON list of users, each user has a DiscordId, Username, and Rank. For more info about a user, do getUser(discordId)
const getUsers = (req, res) =>
    db.all('SELECT id,username,rank FROM accounts ORDER BY rank,id', [], (err, rows) => {
        if (rows == undefined) { // No users exist, excuse me... WHAT?
            res.send('No users in database with that rank?');
        } else { // If user exists, just assign
            res.send(JSON.parse(JSON.stringify(rows)));
        }
    });

const userExists = async (id: string): Promise<boolean> =>
    await db.get('SELECT * FROM accounts WHERE id = ?', [id], (err, row) => {
        return row !== undefined;
    });


const urlPrefix = production ? '/' : '/api/';

app.get(urlPrefix + '__getpost__', getPost);

app.post(urlPrefix + '__newpost__', requirePermission('guest'), handleCreatePost);

app.post(urlPrefix + '__editpost__', requirePermission('guest'), editPost);

app.get(urlPrefix + '__listposts__', getPosts);

app.get(urlPrefix + 'archive/:fileName', archive.download);
app.get(urlPrefix + 'archive', archive.index);
app.post(urlPrefix + '__archive-upload__', requirePermission('trusted'), archive.uploadProcess);

app.get(urlPrefix + '__getalluserperms__', requirePermission('mod'), getUsers);
app.post(urlPrefix + '__modifyuserperms__', requirePermission('mod'), modifyPermissions);

app.get(urlPrefix + 'auth', (req, res, next) => {
    let redirect = utils.cast('string', req.query.redirect);
    if (!redirect) {
        redirect = '/';
    }
    passport.authenticate('discord', {state: redirect})(req, res, next);
});

app.get(urlPrefix + 'auth/success', (req, res, next) => {
    let callbackUrl = utils.cast('string', req.query.state);
    if (!callbackUrl) {
        callbackUrl = '/';
    }
    passport.authenticate('discord', {failureRedirect: '/', successRedirect: callbackUrl})(req, res, next);
});

app.get(urlPrefix + 'auth/logout', requirePermission('banned'), logout);

app.get(urlPrefix + '__userinfo__', getUserInfo);

const config = JSON.parse(fs.readFileSync('configs/config.json', 'utf8'));
app.listen(config['port'], () => {
    console.log(`Backend running on ${config['port']}`);
});
