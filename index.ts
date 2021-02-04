export {}
const {randomBytes} = require('crypto');
const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const fs = require('fs');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');
const {red} = require('chalk')
const xss = require('xss-clean');
const fileUpload = require('express-fileupload');

const articles = require('./src/artciles.ts');
const archive = require('./src/archive.ts');
const users = require('./src/user.ts');
const utils = require('./utils/utils.ts');
const fetch = require('node-fetch')

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
    users.userExists(discordId).then((result) => {
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
    users.LoginDatabase({
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



const urlPrefix = production ? '/' : '/api/';

app.get(urlPrefix + '__getpost__', articles.getArticle);

app.post(urlPrefix + '__newpost__', users.requirePermission('guest'), articles.handleCreatePost);

app.post(urlPrefix + '__editpost__', users.requirePermission('guest'), articles.editArticle);

app.get(urlPrefix + '__listposts__', articles.getPublicArticles);

app.get(urlPrefix + '__getadminarticles__',users.requirePermission("mod"), articles.getAllArticles);
app.post(urlPrefix + '__removepost__', users.requirePermission("mod") , articles.removeArticle);
app.post(urlPrefix + '__publicize__', users.requirePermission("mod") , articles.publicizeArticle);
app.post(urlPrefix + '__privatize__', users.requirePermission("mod") , articles.privatizeArticle);

app.get(urlPrefix + 'archive/:fileName', archive.download);
app.get(urlPrefix + 'archive', archive.index);
app.post(urlPrefix + '__archive-upload__', users.requirePermission('trusted'), archive.uploadProcess);
// FIXME
app.get(urlPrefix + '__getalluserperms__', users.requirePermission('guest'), users.getUsers);
app.post(urlPrefix + '__modifyuserperms__', users.requirePermission('guest'), users.modifyPermissions);


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

app.get(urlPrefix + 'auth/logout', users.requirePermission('banned'), users.logout);

app.get(urlPrefix + '__userinfo__', users.getUserInfo);

const config = JSON.parse(fs.readFileSync('configs/config.json', 'utf8'));
app.listen(config['port'], () => {
    console.log(`Backend running on ${config['port']}`);
});
