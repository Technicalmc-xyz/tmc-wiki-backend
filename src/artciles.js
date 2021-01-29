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
exports.getNetworkPostObject = exports.createPost = exports.commit = exports.setPostBody = exports.getMetadata = exports.postExistsDB = exports.postExists = exports.getMetadataDB = exports.getAllMetadata = exports.saveMetadata = exports.PostMetadata = void 0;
var _a = require('fs'), existsSync = _a.existsSync, promises = _a.promises, readFileSync = _a.readFileSync, writeFile = _a.writeFile;
var Git = require('nodegit');
var dir = './posts';
var metadataFile = dir + "/metadata.json";
var _b = require('chalk'), greenBright = _b.greenBright, magenta = _b.magenta;
var sqlite3 = require('sqlite3');
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
var PostMetadata = (function () {
    function PostMetadata() {
        this.id = 0;
        this.title = '';
        this.tag = '';
        this.description = '';
        this.last_edited = Date.now();
        this.edit_count = 0;
    }
    return PostMetadata;
}());
exports.PostMetadata = PostMetadata;
var postMetadata = new Map();
var nextPostId = 0;
var initialize = function () {
    var metadata;
    var needsToSave = false;
    if (existsSync(metadataFile)) {
        metadata = JSON.parse(readFileSync(metadataFile, 'utf8'));
    }
    else {
        if (existsSync('metadata.json')) {
            metadata = JSON.parse(readFileSync('metadata.json', 'utf8'));
        }
        else {
            metadata = null;
        }
        needsToSave = true;
    }
    if (metadata) {
        if (Array.isArray(metadata)) {
            for (var _i = 0, metadata_1 = metadata; _i < metadata_1.length; _i++) {
                var post = metadata_1[_i];
                post.id = +post.id;
                post.edit_count = post.edit_count || 0;
                postMetadata.set(post.id, Object.assign(new PostMetadata(), post));
                if (post.id >= nextPostId) {
                    nextPostId = post.id + 1;
                }
            }
        }
        else {
            nextPostId = metadata.nextPostId;
            for (var _a = 0, _b = metadata.posts; _a < _b.length; _a++) {
                var post = _b[_a];
                if (typeof (post.last_edited) === 'string') {
                    var parts = post.last_edited.split(' ');
                    var month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(parts[1]);
                    var day = +parts[2];
                    var year = +parts[3];
                    post.last_edited = new Date(year, month, day).getTime();
                }
                postMetadata.set(post.id, Object.assign(new PostMetadata(), post));
            }
        }
    }
    if (needsToSave) {
        exports.saveMetadata().then(function () { return console.log('Written initial metadata.json file'); });
    }
    Git.Repository.open(dir + "/.git").then(function () { return console.log(greenBright('Found posts git repository')); }, function () {
        var repo, index;
        Git.Repository.init(dir, 0).then(function (r) {
            repo = r;
            return repo.refreshIndex();
        })
            .then(function (i) {
            index = i;
            return index.addAll();
        })
            .then(function () { return index.write(); })
            .then(function () { return index.writeTree(); })
            .then(function (oid) {
            var author = Git.Signature.now('tmc-wiki', 'tmc-wiki@technicalmc.xyz');
            var committer = Git.Signature.now('tmc-wiki', 'tmc-wiki@technicalmc.xyz');
            return repo.createCommit('HEAD', author, committer, 'Initial commit', oid, []);
        })
            .then(function () {
            console.log('Created posts git repository');
        });
    });
};
var saveMetadata = function () { return __awaiter(_this, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4, writeFile(metadataFile, JSON.stringify({
                    nextPostId: nextPostId,
                    posts: Array.from(postMetadata.values())
                }, null, 2), function (err) {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        console.log('Metadata saved correctly');
                    }
                })];
            case 1:
                _a.sent();
                return [2];
        }
    });
}); };
exports.saveMetadata = saveMetadata;
var getAllMetadata = function () { return Array.from(postMetadata.values()); };
exports.getAllMetadata = getAllMetadata;
var getMetadataDB = function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
    switch (_a.label) {
        case 0: return [4, prisma["article"].findMany()];
        case 1: return [2, _a.sent()];
    }
}); }); };
exports.getMetadataDB = getMetadataDB;
var postExists = function (postId) { return postMetadata.has(postId); };
exports.postExists = postExists;
var postExistsDB = function (id) { return __awaiter(_this, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4, prisma["article"].findUnique({ where: { id: id } })];
            case 1: return [2, (_a.sent()) !== null];
        }
    });
}); };
exports.postExistsDB = postExistsDB;
var getMetadata = function (postId) { return postMetadata.get(postId); };
exports.getMetadata = getMetadata;
var postBodyCacheLimit = 100;
var postBodyCache = new Map();
var getPostBody = function (postId) { return __awaiter(_this, void 0, void 0, function () {
    var body_1, beautified, body;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (postBodyCache.has(postId)) {
                    body_1 = postBodyCache.get(postId);
                    postBodyCache["delete"](postId);
                    postBodyCache.set(postId, body_1);
                    return [2, body_1];
                }
                while (postBodyCache.size >= postBodyCacheLimit) {
                    postBodyCache["delete"](postBodyCache.keys().next().value);
                }
                return [4, promises.readFile(dir + "/" + postId + ".json", 'utf8')];
            case 1:
                beautified = _a.sent();
                body = JSON.stringify(JSON.parse(beautified));
                postBodyCache.set(postId, body);
                return [2, body];
        }
    });
}); };
var setPostBody = function (postId, newBody) { return __awaiter(_this, void 0, void 0, function () {
    var beautified;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!postBodyCache.has(postId)) {
                    while (postBodyCache.size >= postBodyCacheLimit) {
                        postBodyCache["delete"](postBodyCache.keys().next().value);
                    }
                }
                beautified = JSON.stringify(JSON.parse(newBody), null, 2);
                postBodyCache.set(postId, newBody);
                return [4, writeFile(dir + "/" + postId + ".json", beautified, { encoding: 'utf8' }, function (err) {
                        if (err) {
                            console.log(err);
                        }
                        else {
                            console.log("Post " + postId + " saved successfully");
                        }
                    })];
            case 1:
                _a.sent();
                return [2];
        }
    });
}); };
exports.setPostBody = setPostBody;
var commit = function (postId, message, author, email) {
    if (email === void 0) { email = author + "@technicalmc.xyz"; }
    return __awaiter(_this, void 0, void 0, function () {
        var gitUsername, repo, index, oid, head, parent, authorSig, committerSig, commitId;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (typeof (author) === 'object') {
                        gitUsername = author.discordName;
                        if (gitUsername.length > 34) {
                            gitUsername = gitUsername.substring(0, 34);
                        }
                        gitUsername = gitUsername.replace(/\W/g, '_');
                        gitUsername += '_' + String(author.discordDiscriminator).padStart(4, '0');
                        email = author.discordId + '@technicalmc.xyz';
                        author = gitUsername;
                    }
                    return [4, Git.Repository.open(dir + "/.git")];
                case 1:
                    repo = _a.sent();
                    return [4, repo.refreshIndex()];
                case 2:
                    index = _a.sent();
                    return [4, index.addByPath(postId + ".json")];
                case 3:
                    _a.sent();
                    return [4, index.addByPath('metadata.json')];
                case 4:
                    _a.sent();
                    return [4, index.write()];
                case 5:
                    _a.sent();
                    return [4, index.writeTree()];
                case 6:
                    oid = _a.sent();
                    return [4, Git.Reference.nameToId(repo, 'HEAD')];
                case 7:
                    head = _a.sent();
                    return [4, repo.getCommit(head)];
                case 8:
                    parent = _a.sent();
                    authorSig = Git.Signature.now(author, email);
                    committerSig = Git.Signature.now('tmc-wiki', 'tmc-wiki@technicalmc.xyz');
                    return [4, repo.createCommit('HEAD', authorSig, committerSig, "[" + postId + "] " + message, oid, [parent])];
                case 9:
                    commitId = _a.sent();
                    console.log("Committed change " + commitId + " to file " + postId + ".json");
                    return [2];
            }
        });
    });
};
exports.commit = commit;
var createMetadataDB = function (metadata) { return __awaiter(_this, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4, prisma["article"].create({
                    data: {
                        id: metadata.id,
                        title: metadata.title,
                        tag: metadata.tag,
                        description: metadata.description,
                        last_edited: metadata.last_edited,
                        edit_count: metadata.edit_count
                    }
                })];
            case 1: return [2, _a.sent()];
        }
    });
}); };
var createPost = function (author, title, description, tag, body) { return __awaiter(_this, void 0, void 0, function () {
    var postId, metadata;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                postId = nextPostId++;
                return [4, exports.setPostBody(postId, body)];
            case 1:
                _a.sent();
                metadata = new PostMetadata();
                metadata.id = postId;
                metadata.title = title;
                metadata.description = description;
                metadata.tag = tag;
                postMetadata.set(postId, metadata);
                return [4, exports.saveMetadata()];
            case 2:
                _a.sent();
                return [4, createMetadataDB(metadata)];
            case 3:
                _a.sent();
                return [4, exports.commit(postId, "Create " + title, author)];
            case 4:
                _a.sent();
                return [2, metadata];
        }
    });
}); };
exports.createPost = createPost;
var getNetworkPostObject = function (postId) { return __awaiter(_this, void 0, void 0, function () {
    var metadata;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                metadata = exports.getMetadata(postId);
                _a = {
                    id: postId,
                    title: metadata.title,
                    description: metadata.description,
                    tag: metadata.tag,
                    last_edited: metadata.last_edited,
                    editCount: metadata.edit_count
                };
                return [4, getPostBody(postId)];
            case 1: return [2, (_a.body = _b.sent(),
                    _a)];
        }
    });
}); };
exports.getNetworkPostObject = getNetworkPostObject;
initialize();
//# sourceMappingURL=artciles.js.map