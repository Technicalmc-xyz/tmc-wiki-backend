/*
TODO: read all posts backwards in order to show the NEWEST posts FIRST
 */


// Setting up the authentication library
 var sqlite3 = require("sqlite3");
 let db = new sqlite3.Database("Authentication.db", sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, err => {
 	if (err) { console.error(err.message); }
 	console.log("Connected to the authentication database.");
 });

// Creating the table for the first time, also shows the table structure. Lots of info incase you want to add stuff in the future (forward thinking)
 db.serialize(() => {
 	db.run('CREATE TABLE IF NOT EXISTS "accounts" ("DiscordId" BIGINT NOT NULL UNIQUE, "Username" VARCHAR(50) NOT NULL, "McUsername" VARCHAR(16), "NickName" VARCHAR(50), "Email" VARCHAR(100), "Desciption" TEXT, "Servers" TEXT, "Links" TEXT, "Rank" TINYINT DEFAULT `guest`, "Added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY("DiscordId"));');
});

const crypto = require('crypto');
const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const fs = require('fs');
const passport = require('passport');
const querystring = require('querystring');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');

const xss = require('xss-clean');
const fileUpload = require('express-fileupload');

const posts = require('./posts');
const archive = require('./archive');
const utils = require('./utils');
const users = require('./users');

const rankList = ["banned", "guest", "trusted", "editor", "mod", "dev"]; //0=banned, 1=guest, 2=trusted, 3=editor, 4=mod, 5=dev

//assumes that production and development are false and that you need to supply at least one argument
let production = false, development = false;
if (process.argv.length === 2) {
	console.error('Expected at least one argument!');
	process.exit(1);
}
//gets the third argument and makes either production or developent true
const arguments = process.argv.slice(2);
if (arguments[0] === 'pro'){
	production = true;
}
else {
	development = true;
}
console.log('arguments: ', arguments);

if (!fs.existsSync('secret_config.json')) {
	throw new Error('You need a secret_config.json file to store app secrets!');
}
const secretConfig = JSON.parse(fs.readFileSync('secret_config.json', 'utf8'));

const app = express();
passport.serializeUser((user, callback) => {
	callback(null, user.discordId);
});
passport.deserializeUser((discordId, callback) => {
	const user = users.User.findById(discordId);
	if (user) {
		callback(null, user);
	} else {
		callback(new Error(`User with id ${discordId} not found`));
	}
});
passport.use('discord', new DiscordStrategy({
	clientID: '773179848587608095',
	clientSecret: secretConfig.discord_client_secret,
	callbackURL: development ? '/api/auth/success' : 'https://technicalmc.xyz/api/auth/success', // FIXME
	scope: ['identify'],
	customHeaders: []
}, (accessToken, refreshToken, profile, callback) => {
	var rank = loginDatabase(profile.id,profile.username);
	return callback(null, new users.User(profile.id, profile.username, profile.discriminator, `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=32`, rank)); // Added Guest argument to user info
}));
app.use(session({
	secret: crypto.randomBytes(512).toString('base64'),
	saveUninitialized: true,
	resave: false,
	cookie: {
		secure: false // FIXME
	}
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json({limit: '100mb'}));
app.use(xss());
app.use(compression());
app.use(fileUpload({createParentPath: true}));

const createPost = async (req, res) => {
	const reqBody = utils.cast('object', req.body);
	const body = utils.cast('string', reqBody.body);
	const title = utils.cast('string', reqBody.title);
	const tags = utils.cast('string', reqBody.tags);
	const description = utils.cast('string', reqBody.description);
	const metadata = await posts.createPost(req.user, title, description, tags, body);
	console.log(`Created post #${metadata.id}`);
	res.send('OK')
}

const getPost = async (req, res) => {
	const postId = utils.cast('number', +utils.cast('object', req.query).id);
	if (!posts.postExists(postId)) {
		res.status(404).send(`No such post ID ${postId}`);
		return;
	}
	const networkPost = await posts.getNetworkPostObject(postId);
	// see what post number is being requested
	console.log("Post ID Number: " + postId)
	res.send(networkPost);
}
const getPost_ = async (req, res) => {
	const reqBody = utils.cast('object', req.body);
	const postId = utils.cast('number', +reqBody.id);
	if (!posts.postExists(postId)) {
		res.status(404).send(`No such post ID ${postId}`);
		return;
	}
	const networkPost = await posts.getNetworkPostObject(postId);
	// see what post number is being requested
	console.log("Post ID Number: " + postId)
	res.send(networkPost);
}

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
	console.log(`Edited post #${postId}`);
	res.send('OK');
}

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
}

const getUserInfo = (req, res) => {
	const result = {};
	if (req.isAuthenticated()) {
		Object.assign(result, req.user);
		result.authenticated = true;
	} else {
		result.authenticated = false;
	}
	res.send(result);
}

const logout = (req, res) => {
	req.logout();
	res.redirect('/');
}

// Adds user to database if they weren't already in the database. Done after discord authentication!
const loginDatabase = (discordId,username) => {
	var rank = "guest";
	db.get("SELECT DiscordId,Rank FROM accounts WHERE DiscordId = ?;",
	[discordId],
	(err, row) => {
		if (row == undefined) { // If user does not exist
			db.run("insert into accounts(DiscordId,Username) values (?,?)", [discordId,username], (err) => {
				if (err) {console.error(err.message);}
				console.log("DiscordId: "+discordId+" - Username: " + username + " was added to the login database!");
				// Rank would be "guest" so do nothing
			});
		} else { // If user exists, just assign
			rank = (row.Rank || "guest");
		}
	});
	return rank;
}

const requirePermission = (rankRequired) => (req, res, next) => { //(rankRequired) =>
	if (!req.isAuthenticated()) {
		res.status(403).send('Not authenticated');
	} else {
		if (typeof req.user !== "undefined") {
			if (rankList.indexOf(req.user.rank) >= rankList.indexOf(rankRequired)) {
				console.log("requirePermission PASSED!");
				next();
			} else {
				res.status(403).send('Incorrect Permission');
			}
		} else {
			res.status(500).send('An authentication error has occured!');
		}
		//next(); - old next() location
	}
}

const urlPrefix = production ? "/" : "/api/"

app.get(urlPrefix + '__getpost__', getPost);
app.post(urlPrefix + '__getpost__', getPost_);

app.post(urlPrefix + '__newpost__', requirePermission('guest'), createPost);

app.post(urlPrefix + '__editpost__', requirePermission('guest'), editPost);

app.get(urlPrefix + '__listposts__', getPosts);

app.get(urlPrefix + 'archive/:fileName', archive.download);
app.get(urlPrefix + 'archive', archive.index);
app.post(urlPrefix + '__archive-upload__', archive.uploadProcess);

app.get(urlPrefix + 'auth', (req, res, next) => {
	let redirect = utils.cast('string', req.query.redirect);
	if (!redirect) {
		redirect = '/';
	}
	passport.authenticate('discord', {state: redirect})(req, res, next);
});
app.get(urlPrefix + 'auth/success', (req, res, next) => {
	let callbackUrl = utils.cast('string', req.query.state);
	if (!callbackUrl) {callbackUrl = '/';}
	passport.authenticate('discord', {failureRedirect: '/', successRedirect: callbackUrl})(req, res, next);
});
app.get(urlPrefix + 'auth/logout', requirePermission('banned'), logout);

app.get(urlPrefix + "__userinfo__", getUserInfo);

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

app.listen(config["port"], () => {
	console.log(`Backend running on ${config["port"]}`);
});
