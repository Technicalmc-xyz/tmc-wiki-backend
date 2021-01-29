var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
exports.__esModule = true;
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
var sqlite3 = require('sqlite3');
var userdatabase = new sqlite3.Database('Authentication.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, function (err) {
    if (err) {
        console.error(err.message);
    }
    console.log(magenta('Connected to the authentication database.'));
});
userdatabase.serialize(function () {
    userdatabase.run('CREATE TABLE IF NOT EXISTS "accounts" ("id" VARCHAR(20) NOT NULL UNIQUE, "username" VARCHAR(50) NOT NULL, "discriminator" SMALLINT NOT NULL, "avatar" VARCHAR NOT NULL,"mcusername" VARCHAR(16), "links" TEXT, "rank" TINYINT DEFAULT `guest`, "added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY("id"));');
});
var randomBytes = require('crypto').randomBytes;
var express = require('express');
var compression = require('compression');
var bodyParser = require('body-parser');
var fs = require('fs');
var passport = require('passport');
var querystring = require('querystring');
var DiscordStrategy = require('passport-discord').Strategy;
var session = require('express-session');
var _a = require('chalk'), greenBright = _a.greenBright, magenta = _a.magenta, red = _a.red;
var xss = require('xss-clean');
var fileUpload = require('express-fileupload');
var articles = require('./src/artciles');
var archive = require('./src/archive');
var utils = require('./utils/utils');
var rankList = ['banned', 'guest', 'trusted', 'editor', 'dev', 'mod'];
var production = false;
var development = false;
if (process.argv.length === 2) {
    console.error(red('Expected at least one argument!'));
    process.exit(1);
}
var arguments = process.argv.slice(2);
if (arguments[0] === 'pro') {
    production = true;
}
else {
    development = true;
}
console.log('arguments: ', arguments);
if (!fs.existsSync('configs/secret_config.json')) {
    throw new Error('You need a secret_config.json file to store app secrets!');
}
var secretConfig = JSON.parse(fs.readFileSync('configs/secret_config.json', 'utf8'));
var app = express();
passport.serializeUser(function (user, callback) {
    callback(null, user);
});
passport.deserializeUser(function (discordId, callback) {
    userExists(discordId).then(function (result) {
        if (result) {
            callback(null, discordId);
        }
        else {
            callback(null, new Error("User with id " + discordId + " not found"));
        }
    });
});
passport.use('discord', new DiscordStrategy({
    clientID: '773179848587608095',
    clientSecret: secretConfig.discord_client_secret,
    callbackURL: development ? '/api/auth/success' : 'https://technicalmc.xyz/api/auth/success',
    scope: ['identify'],
    customHeaders: []
}, function (accessToken, refreshToken, profile, callback) {
    loginDatabase({ id: profile.id, username: profile.username, discriminator: profile.discriminator, avatar: profile.avatar });
    LoginDatabase_({ id: profile.id, username: profile.username, discriminator: profile.discriminator, avatar: profile.avatar });
    return callback(null, profile.id);
}));
app.use(session({
    secret: randomBytes(512).toString('base64'),
    saveUninitialized: true,
    resave: false,
    cookie: {
        secure: false
    }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: '100mb' }));
app.use(xss());
app.use(compression());
app.use(fileUpload({ createParentPath: true }));
var handleCreatePost = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
    var reqBody, body, title, tags, description, metadata;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                reqBody = utils.cast('object', req.body);
                body = utils.cast('string', reqBody.body);
                title = utils.cast('string', reqBody.title);
                tags = utils.cast('string', reqBody.tags);
                description = utils.cast('string', reqBody.description);
                return [4, articles.createPost(req.user, title, description, tags, body)];
            case 1:
                metadata = _a.sent();
                console.log("Created post #" + metadata.id);
                res.send('OK');
                return [2];
        }
    });
}); };
var editArticle = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
    var postId, reqBody, metadata, message;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                postId = utils.cast('number', +utils.cast('object', req.query).id);
                if (!articles.postExists(postId)) {
                    res.status(404).send("No such post ID " + postId);
                    return [2];
                }
                reqBody = utils.cast('object', req.body);
                metadata = articles.getMetadata(postId);
                if (metadata.edit_count !== utils.cast('number', req.body.lastEditCount)) {
                    res.send('OUTDATED');
                    return [2];
                }
                metadata.edit_count++;
                return [4, articles.setPostBody(postId, utils.cast('string', reqBody.body))];
            case 1:
                _a.sent();
                message = utils.cast('string', reqBody.message);
                metadata.title = utils.cast('string', reqBody.title);
                metadata.tag = utils.cast('string', reqBody.tags);
                metadata.description = utils.cast('string', reqBody.description);
                metadata.last_edited = new Date().toDateString();
                return [4, articles.saveMetadata()];
            case 2:
                _a.sent();
                return [4, articles.commit(postId, message, req.user)];
            case 3:
                _a.sent();
                console.log("Edited post #" + postId);
                res.send('OK');
                return [2];
        }
    });
}); };
var getArticle = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
    var postId, networkPost, _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                postId = utils.cast('number', +utils.cast('object', req.query).id);
                if (!articles.postExists(postId)) {
                    res.status(404).send("No such post ID " + postId);
                    return [2];
                }
                return [4, articles.getNetworkPostObject(postId)];
            case 1:
                networkPost = _c.sent();
                _b = (_a = console).log;
                return [4, articles.postExistsDB(postId)];
            case 2:
                _b.apply(_a, [_c.sent()]);
                res.send(networkPost);
                return [2];
        }
    });
}); };
var getArticles = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
    var query, n, start, q, myPosts, myArticles, length;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                query = utils.cast('object', req.query);
                n = utils.cast('number', +query.n) || 5;
                if (n < 0)
                    n = 5;
                start = utils.cast('number', +query.start) || 0;
                if (start < 0)
                    start = 0;
                q = utils.cast('string', query.q);
                myPosts = articles.getAllMetadata();
                return [4, articles.getMetadataDB()];
            case 1:
                myArticles = _a.sent();
                console.log(myArticles);
                if (q) {
                }
                else {
                    myPosts.sort(function (a, b) {
                        if (a.last_edited < b.last_edited)
                            return -1;
                        else if (a.last_edited > b.last_edited)
                            return 1;
                        else
                            return 0;
                    });
                }
                length = myPosts.length;
                if (start > length)
                    start = length;
                if (start + n > length)
                    n = length - start;
                myPosts = myPosts.slice(length - start - n, length - start);
                res.send(myArticles);
                return [2];
        }
    });
}); };
var getUserInfo = function (req, res) {
    var userInfo = {
        authenticated: undefined
    };
    if (req.isAuthenticated()) {
        getUser({ id: req.user, callback: function (result) {
                Object.assign(userInfo, result);
                res.send(userInfo);
            } });
        userInfo.authenticated = true;
    }
    else {
        userInfo.authenticated = false;
        res.send(userInfo);
    }
};
var logout = function (req, res) {
    getUser({ id: req.user, callback: function (result) {
            console.log("id: " + result.id + "; Username: " + result.username + "; Has logged out!");
        } });
    req.logout();
    res.redirect('/');
};
var LoginDatabase_ = function (_a) {
    var id = _a.id, username = _a.username, discriminator = _a.discriminator, avatar = _a.avatar;
    return __awaiter(_this, void 0, void 0, function () {
        var user;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4, prisma["user"].findUnique({ where: { id: id } })];
                case 1:
                    user = _b.sent();
                    if (!(user === null)) return [3, 3];
                    console.log("id: " + id + " - username: " + username + " has signed up");
                    return [4, prisma["user"].create({
                            data: {
                                id: id,
                                username: username,
                                discriminator: discriminator,
                                avatar: avatar,
                                rank: "guest"
                            }
                        })];
                case 2:
                    _b.sent();
                    return [3, 5];
                case 3:
                    console.log("id: " + id + " - username: " + username + " has logged back in");
                    return [4, prisma["user"].update({
                            where: { id: id },
                            data: {
                                username: username,
                                discriminator: discriminator,
                                avatar: avatar
                            }
                        })];
                case 4:
                    _b.sent();
                    _b.label = 5;
                case 5: return [2];
            }
        });
    });
};
var loginDatabase = function (_a) {
    var id = _a.id, username = _a.username, discriminator = _a.discriminator, avatar = _a.avatar;
    userdatabase.get('SELECT id FROM accounts WHERE id = ?;', [id], function (err, row) {
        if (row == undefined) {
            userdatabase.run('insert into accounts(id,username,discriminator,avatar) values (?,?,?,?)', [id, username, discriminator, avatar], function (err) {
                if (err) {
                    console.error(err.message);
                }
                console.log('id: ' + id + ' - Username: ' + username + ' was added to the login database!');
            });
        }
        else {
            userdatabase.run('UPDATE accounts set username = ?, discriminator =?, avatar = ? WHERE id = ?', [username, discriminator, avatar, id], function (err) {
                if (err) {
                    console.error(err.message);
                }
                console.log('id: ' + id + ' - Username: ' + username + ' has logged back in');
            });
        }
    });
};
var requirePermission = function (rankRequired) { return function (req, res, next) {
    if (!req.isAuthenticated()) {
        console.log("THIS USER IS NOT AUTH'D");
        return res.status(403).send('Not authenticated');
    }
    else {
        getUser({ id: req.user, callback: function (result) {
                if (rankList.indexOf(result.rank) >= rankList.indexOf(rankRequired)) {
                    next();
                }
                else {
                    return res.status(403).send('Incorrect Permission Level');
                }
            } });
    }
}; };
var modifyPermissions = function (req, res) {
    var reqBody = utils.cast('object', req.body);
    var id = utils.cast('string', reqBody.discordId);
    var rank = utils.cast('string', reqBody.rank);
    if (!rankList.includes(rank)) {
        return res.status(403).send('NOT A RANK');
    }
    else if (id.length > 20) {
        return res.status(403).send('DISCORD ID IS TOO LARGE');
    }
    else {
        userdatabase.run('UPDATE accounts set rank = ? WHERE id = ?', [rank, id], function (err) {
            if (err) {
                return res.status(403).send(err);
            }
            console.log(greenBright('Changed Rank for id: ' + id + ' to ' + rank));
            return res.status(200).send('Changed Rank for id: ' + id + ' to ' + rank);
        });
    }
};
var getUser = function (_a) {
    var id = _a.id, callback = _a.callback;
    userdatabase.get("SELECT * FROM accounts WHERE id = ?", [id], function (err, row) {
        if (row == undefined) {
            return callback(null);
        }
        else {
            return callback(row);
        }
    });
};
var getUsers = function (req, res) {
    return userdatabase.all('SELECT id,username,rank FROM accounts ORDER BY rank,id', [], function (err, rows) {
        if (rows == undefined) {
            res.send('No users in database with that rank?');
        }
        else {
            res.send(JSON.parse(JSON.stringify(rows)));
        }
    });
};
var userExists = function (id) { return __awaiter(_this, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4, userdatabase.get('SELECT * FROM accounts WHERE id = ?', [id], function (err, row) {
                    return row !== undefined;
                })];
            case 1: return [2, _a.sent()];
        }
    });
}); };
var urlPrefix = production ? '/' : '/api/';
app.get(urlPrefix + '__getpost__', getArticle);
app.post(urlPrefix + '__newpost__', requirePermission('guest'), handleCreatePost);
app.post(urlPrefix + '__editpost__', requirePermission('guest'), editArticle);
app.get(urlPrefix + '__listposts__', getArticles);
app.get(urlPrefix + 'archive/:fileName', archive.download);
app.get(urlPrefix + 'archive', archive.index);
app.post(urlPrefix + '__archive-upload__', requirePermission('trusted'), archive.uploadProcess);
app.get(urlPrefix + '__getalluserperms__', requirePermission('mod'), getUsers);
app.post(urlPrefix + '__modifyuserperms__', requirePermission('mod'), modifyPermissions);
app.get(urlPrefix + 'auth', function (req, res, next) {
    var redirect = utils.cast('string', req.query.redirect);
    if (!redirect) {
        redirect = '/';
    }
    passport.authenticate('discord', { state: redirect })(req, res, next);
});
app.get(urlPrefix + 'auth/success', function (req, res, next) {
    var callbackUrl = utils.cast('string', req.query.state);
    if (!callbackUrl) {
        callbackUrl = '/';
    }
    passport.authenticate('discord', { failureRedirect: '/', successRedirect: callbackUrl })(req, res, next);
});
app.get(urlPrefix + 'auth/logout', requirePermission('banned'), logout);
app.get(urlPrefix + '__userinfo__', getUserInfo);
var config = JSON.parse(fs.readFileSync('configs/config.json', 'utf8'));
app.listen(config['port'], function () {
    console.log("Backend running on " + config['port']);
});
//# sourceMappingURL=index.js.map