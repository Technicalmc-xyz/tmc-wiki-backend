import {PrismaClient} from "@prisma/client"
import {exists} from "fs";
import {getAllMetadata} from "./src/artciles";

const prisma = new PrismaClient();
const {randomBytes} = require('crypto');
const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const fs = require('fs');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');
const {greenBright, magenta, red} = require('chalk')
const xss = require('xss-clean');
const fileUpload = require('express-fileupload');

const articles = require('./src/artciles.ts');
const archive = require('./src/archive.ts');
const utils = require('./utils/utils.ts');
const fetch = require('node-fetch')
const rankList = ['banned', 'guest', 'trusted', 'editor', 'dev', 'mod']; // 0=banned, 1=guest, 2=trusted, 3=editor, 4=mod, 5=dev


// Assumes that production and development are false and that you need to supply at least one argument
let production: boolean = false;
let development: boolean = false;
if (process.argv.length === 2) {
    console.error(red('Expected at least one argument!'));
    process.exit(1);
}
// Gets the third argument and makes either production or development true
let args: string[] = process.argv.slice(2);
if (args[0] === 'pro') {
    production = true;
} else {
    development = true;
}
console.log('arguments: ', args);

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
    LoginDatabase({
        id: profile.id,
        username: profile.username,
        discriminator: profile.discriminator,
        avatar: profile.avatar
    })
        .catch((err) => console.log(red(err)));
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

const discordWebhook = async (username, avatar, userid, title, articleid, description, tags) => {
    fetch('https://discord.com/api/webhooks/805963511791878154/xCNeSXCgk5vQNtE4CSkj_MAHi9eKZ050jj0h6LR-JDYFhTmMjpWtFs0ToOIwq-HKdv7N', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "username": "Article Bot",
            "avatar_url": 'https://static.wikia.nocookie.net/minecraft/images/d/d3/KnowledgeBookNew.png/revision/latest/top-crop/width/220/height/220?cb=20190917030625',
            "embeds": [{
                "title": `${title} 📚`,
                "url": `https://technicalmc.xyz/render-article/${articleid}`,
                "author": {
                    "name": username,
                    "icon_url": `https://cdn.discordapp.com/avatars/${userid}/${avatar}.png`,
                },
            }],
            "description": description,
            "footer": {
                "text": tags,
            },
        })
    });
}
const handleCreatePost = async (req, res) => {
    const reqBody = utils.cast('object', req.body);
    const body = utils.cast('string', reqBody.body);
    const title = utils.cast('string', reqBody.title);
    const tags = utils.cast('string', reqBody.tags);
    const description = utils.cast('string', reqBody.description);
    const metadata = await articles.createPost(req.user, title, description, tags, body);
    console.log(`Created post #${metadata.id}`);
    const user = await getUser(req.user)
    const username = user.username
    const userid = user.id
    const avatar = user.avatar
    await discordWebhook(username, avatar, userid, title, metadata.id, description, tags);
    res.send('OK');
};


const editArticle = async (req, res) => {
    const postId = utils.cast('number', +utils.cast('object', req.query).id);
    if (!articles.postExists(postId)) {
        res.status(404).send(`No such post ID ${postId}`);
        return;
    }
    const reqBody = utils.cast('object', req.body);
    const metadata = articles.getMetadata(postId);
    if (metadata.edit_count !== utils.cast('number', req.body.lastEditCount)) {
        res.send('OUTDATED');
        return;
    }
    metadata.edit_count++;

    await articles.setPostBody(postId, utils.cast('string', reqBody.body));
    const message = utils.cast('string', reqBody.message);
    metadata.title = utils.cast('string', reqBody.title);
    metadata.tag = utils.cast('string', reqBody.tags);
    metadata.description = utils.cast('string', reqBody.description);
    metadata.last_edited = new Date().toDateString();
    await articles.commit(postId, message, req.user);
    await articles.saveMetadata();
    console.log(`Edited post #${postId}`)
    res.send('OK');
};

const getArticle = async (req, res) => {
    const postId = utils.cast('number', +utils.cast('object', req.query).id);
    console.log(postId)
    if (!articles.postExists(postId)) {
        res.status(404).send(`No such post ID ${postId}`);
        return;
    }
    const networkPost = await articles.getNetworkPostObject(postId);
    // await articles.removePostDB(postId);
    // See what post number is being requested
    // Console.log('Post ID Number: ' + postId);
    res.send(networkPost);
};

const getPublicArticles = async (req, res) => {
    // TODO implement this back
    // const query = utils.cast('object', req.query);
    // let n = utils.cast('number', +query.n) || 5;
    // if (n < 0) n = 5;
    // let start = utils.cast('number', +query.start) || 0;
    // if (start < 0) start = 0;
    // const q = utils.cast('string', query.q);
    let myArticles = await articles.getPublicMetadataDB();
    // if (q) {
    //     // TODO: sorting
    // } else {
    //     myPosts.sort((a, b) => {
    //         if (a.last_edited < b.last_edited) return -1;
    //         else if (a.last_edited > b.last_edited) return 1;
    //         else return 0;
    //     });
    // }
    //
    // const length = myPosts.length;
    // if (start > length) start = length;
    // if (start + n > length) n = length - start;
    //
    res.send(myArticles);
};
const getAllArticles = async (req,res)=> {
    let myArticles = await articles.getAllMetadata();
    res.send(myArticles);
}


const logout = (req, res) => {
    getUser(req.user).then(r => {
        console.log("id: " + r.id + "; Username: " + r.username + "; Has logged out!");
    })
    req.logout();
    res.redirect('/');
};


interface LoginDatabaseParams {
    id: string;
    username: string;
    discriminator: string;
    avatar: string;
}

const LoginDatabase = async ({id, username, discriminator, avatar}: LoginDatabaseParams) => {
    const user = await prisma["user"].findUnique({where: {id: id}});
    if (user === null) {
        console.log(`id: ${id} - username: ${username} has signed up`)
        return await prisma["user"].create({
            data: {
                id: id,
                username: username,
                discriminator: discriminator,
                avatar: avatar,
                rank: "guest"
            }
        })
    } else {
        console.log(`id: ${id} - username: ${username} has logged back in`)
        return await prisma["user"].update({
            where: {id: id},
            data: {
                username: username,
                discriminator: discriminator,
                avatar: avatar
            }
        })
    }
}

const requirePermission = (rankRequired: string) => (req, res, next) => {
    if (!req.isAuthenticated()) {
        console.log("THIS USER IS NOT AUTH'D");
        return res.status(403).send('Not authenticated');
    } else {
        getUser(req.user).then(r => {
            if (rankList.indexOf(r.rank) >= rankList.indexOf(rankRequired)) {
                next();
            } else {
                return res.status(403).send('Incorrect Permission Level');
            }
        })
    }
};


const modifyPermissions = async (req, res) => {
    const reqBody = utils.cast('object', req.body);
    const id = utils.cast('string', reqBody.discordId);
    const rank = utils.cast('string', reqBody.rank);
    if (!rankList.includes(rank)) {
        return res.status(403).send('NOT A RANK');

    } else if (id.length > 20) {
        return res.status(403).send('DISCORD ID IS TOO LARGE');
    } else {
        await prisma.user.update({
            where: {id: id},
            data: {rank: rank}
        })
            .then(() => {
                console.log(greenBright('Changed Rank for id: ' + id + ' to ' + rank));
                return res.status(200).send('Changed Rank for id: ' + id + ' to ' + rank);
            })
            .catch((err) => console.log(red(err)))
    }
};

//FIXME running multiple times on load of a screen
const getUserInfo = (req, res) => {
    let userInfo = {
        authenticated: undefined
    };
    if (req.isAuthenticated()) {
        userInfo.authenticated = true;
        getUser(req.user).then(r => {
            Object.assign(userInfo, r)
            res.send(userInfo)
        })
    } else {
        userInfo.authenticated = false;
        res.send(userInfo);
    }
};

const getUser = async (id: string) => {
    return await prisma.user.findUnique({where: {id: id}})
}

const getUsers = async (req, res) =>
    res.send(await prisma.user.findMany())

const userExists = async (id: string): Promise<boolean> =>
    await prisma.user.findUnique({where: {id: id}}) !== null;


const urlPrefix = production ? '/' : '/api/';

app.get(urlPrefix + '__getpost__', getArticle);

app.post(urlPrefix + '__newpost__', requirePermission('guest'), handleCreatePost);

app.post(urlPrefix + '__editpost__', requirePermission('guest'), editArticle);

app.get(urlPrefix + '__listposts__', getPublicArticles);

app.get(urlPrefix + '__getadminarticles__',requirePermission("mod"), getAllArticles);
app.post(urlPrefix + '__removepost__', requirePermission("mod") , articles.removeArticle);
app.post(urlPrefix + '__publicize__', requirePermission("mod") , articles.publicizePost);
app.post(urlPrefix + '__privatize__', requirePermission("mod") , articles.privatizePost);

app.get(urlPrefix + 'archive/:fileName', archive.download);
app.get(urlPrefix + 'archive', archive.index);
app.post(urlPrefix + '__archive-upload__', requirePermission('trusted'), archive.uploadProcess);
// FIXME
app.get(urlPrefix + '__getalluserperms__', requirePermission('guest'), getUsers);
app.post(urlPrefix + '__modifyuserperms__', requirePermission('guest'), modifyPermissions);


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
