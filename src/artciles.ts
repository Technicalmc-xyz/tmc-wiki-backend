import {PrismaClient} from "@prisma/client"
import {getUser} from "./user";

const prisma = new PrismaClient()

const {existsSync, promises, readFileSync, writeFile} = require('fs');
const Git = require('nodegit');
const dir = './posts';
const metadataFile = `${dir}/metadata.json`
const {greenBright, magenta, red, cyan, yellow} = require('chalk')


const utils = require('../utils/utils');
const users = require('./user');
const webhook = require('./webhooks')

// ===== POST METADATA ===== //
export class PostMetadata {
    id: number;
    title: string;
    tag: string;
    description: string;
    last_edited: number;
    edit_count: number

    constructor() {
        this.id = 0;
        this.title = '';
        this.tag = '';
        this.description = '';
        this.last_edited = Date.now();
        this.edit_count = 0;
    }
}

const postMetadata: Map<number, PostMetadata> = new Map();


const initialize = (): void => {
    Git.Repository.open(`${dir}/.git`).then(() => console.log(greenBright('Found posts git repository')), () => {
        let repo, index;
        Git.Repository.init(dir, 0).then(r => {
            repo = r;
            return repo.refreshIndex();
        })
            .then(i => {
                index = i;
                return index.addAll();
            })
            .then(() => index.write())
            .then(() => index.writeTree())
            .then(oid => {
                const author = Git.Signature.now('tmc-wiki', 'tmc-wiki@technicalmc.xyz');
                const committer = Git.Signature.now('tmc-wiki', 'tmc-wiki@technicalmc.xyz');
                return repo.createCommit('HEAD', author, committer, 'Initial commit', oid, []);
            })
            .then(() => {
                console.log('Created posts git repository');
            });
    });
};


//update the metadata of an article in the database
export const setMetadata = async (
    id: number,
    title: any,
    tag,
    description,
    edit_count
) => {
    return await prisma.article.update({
        where: {id: id},
        data: {
            title: title,
            tag: tag,
            description: description,
            last_edited: Date.now(),
            edit_count: edit_count
        }
    });
}


export const handleCreatePost = async (req, res) => {
    const reqBody = utils.cast('object', req.body);
    const body = utils.cast('string', reqBody.body);
    const title = utils.cast('string', reqBody.title);
    const tags = utils.cast('string', reqBody.tags);
    const description = utils.cast('string', reqBody.description);
    const metadata = await createPost(req.user, title, description, tags, body);
    console.log(cyan(`Created post #${metadata.id}`));

    const user = await users.getUser(req.user)
    await webhook.newArticleWebhook(user, title, metadata.id, description, tags);
    const article = await getMetadataDB(metadata.id)
    await webhook.incomingArticle(article.title, metadata.id, article.description, article.tag, user)
    res.send('OK');
};


export const editArticle = async (req, res) => {
    const postId = utils.cast('number', +utils.cast('object', req.query).id);

    if (!await articleExists(postId)) {
        res.status(404).send(`No such post ID ${postId}`);
        return;
    }

    const reqBody = utils.cast('object', req.body);


    const metadataDB = await getMetadataDB(postId);
    // test to see if the edit count has gone up, outdated
    if (metadataDB.edit_count !== utils.cast('number', req.body.lastEditCount)) {
        return res.send('OUTDATED');
    }
    //if it is not updated go on with the edit
    metadataDB.edit_count++;

    await setPostBody(postId, utils.cast('string', reqBody.body));

    const message = utils.cast('string', reqBody.message);
    metadataDB.title = utils.cast('string', reqBody.title);
    metadataDB.tag = utils.cast('string', reqBody.tags);
    metadataDB.description = utils.cast('string', reqBody.description);

    await commit(postId, message, req.user);

    await setMetadata(metadataDB.id, metadataDB.title, metadataDB.tag, metadataDB.description, metadataDB.edit_count)

    console.log(cyan(`Edited post #${postId}`))
    res.send('OK');
};

export const getArticle = async (req, res) => {
    const postId = utils.cast('number', +utils.cast('object', req.query).id);
    articleExists(postId)
        .then((response) => {
            if (response) {
                const networkPost = getNetworkPostObject(postId)
                    .then((networkPost) => res.send(networkPost))
                    .catch((err) => res.status(404).send(`No such post ID ${err}`))
            } else {
                res.status(404).send(`No such post ID ${postId}`);
                return;
            }
        })
};

export const getPublicArticles = async (req, res) => {
    // TODO implement this back
    // const query = utils.cast('object', req.query);
    // let n = utils.cast('number', +query.n) || 5;
    // if (n < 0) n = 5;
    // let start = utils.cast('number', +query.start) || 0;
    // if (start < 0) start = 0;
    // const q = utils.cast('string', query.q);
    let myArticles = await getPublicMetadata();
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
export const getAllArticles = async (req, res) => {
    let myArticles = await getAllMetadata();
    res.send(myArticles);
}
//get the all of the metadata - ordered from newest to oldest
export const getAllMetadata = async () => await prisma.article.findMany({
    orderBy: {
        id: 'desc'
    }
})
// get all of the public metadata - ordered from newest to oldest
export const getPublicMetadata = async () => await prisma.article.findMany({
    where: {publicized: true},
    orderBy: {
        id: 'desc'
    }
})

export const getFeaturedMetadata = async (req, res) => {
    const featured = await prisma.article.findMany({
        where: {featured: true},
        orderBy: {
            id: 'desc'
        },
    })
    res.send(featured)
}

// find if the article exists
export const articleExists = async (id: number): Promise<boolean> =>
    await prisma.article.findUnique({where: {id: id}}) !== null;

export const featureArticle = async (req, res) => {
    const reqBody = utils.cast('object', req.body);
    const id = utils.cast('number', reqBody.id);
    articleExists(id).then(async exists => {
        if (exists) {
            await prisma.article.update({
                where: {id: id},
                data: {
                    featured: true,
                    publicized: true
                }
            })
            console.log(magenta(`Article ${id} was featured`));
            return res.status(200).send(`Article ${id} was featured`)
        } else {
            return res.status(403).send("This article does not exist")
        }
    })
        .catch(err => {
            console.log(red(err));
            return res.status(403).send(err)
        })
    const article = await getMetadataDB(id)
    await webhook.newFeaturedArticle(article.title, id, article.description, article.tag)
};

export const unfeatureArticle = async (req, res) => {
    const reqBody = utils.cast('object', req.body);
    const id = utils.cast('number', reqBody.id);
    articleExists(id).then(async exists => {
        if (exists) {
            await prisma.article.update({
                where: {id: id},
                data: {
                    featured: false,
                }
            })
            console.log(magenta(`Article ${id} was unfeatured`));
            return res.status(200).send(`Article ${id} was unfeatured`)
        } else {
            return res.status(403).send("This article does not exist")
        }
    })
        .catch(err => {
            console.log(red(err));
            return res.status(403).send(err)
        })
};

export const removeArticle = async (req, res) => {
    const reqBody = utils.cast('object', req.body);
    const id = utils.cast('number', reqBody.id);
    articleExists(id).then(async exists => {
        if (exists) {
            await prisma.article.delete({
                where: {id: id}
            })
            console.log(magenta(`Article ${id} was removed`));
            return res.status(200).send(`Article ${id} was removed`)
        } else {
            return res.status(403).send("This article does not exist")
        }
    })
        .catch(err => {
            console.log(red(err));
            return res.status(403).send(err)
        })
    const article = await getMetadataDB(id)
    const user = await getUser(req.user)
    await webhook.removedArticle(article.title, article.description, article.tag, user)
};

export const publicizeArticle = async (req, res) => {
    const reqBody = utils.cast('object', req.body);
    const id = utils.cast('number', reqBody.id);
    articleExists(id).then(async exists => {
        if (exists) {
            await prisma.article.update({
                where: {id: id},
                data: {
                    publicized: true,
                    status: false,
                }
            })
            console.log(magenta(`Article ${id} was publicized`));
            return res.status(200).send(`Article ${id} was publicized`)
        } else {
            return res.status(403).send("This article does not exist")
        }
    })
        .catch(err => {
            console.log(red(err));
            return res.status(403).send(err)
        })
    const article = await getMetadataDB(id)
    const user = await getUser(req.user)
    await webhook.publicizeArticle(article.title, article.description, article.tag, user)
};

export const privatizeArticle = async (req, res) => {
    const reqBody = utils.cast('object', req.body);
    const id = utils.cast('number', reqBody.id);
    articleExists(id).then(async exists => {
        if (exists) {
            await prisma.article.update({
                where: {id: id},
                data: {
                    publicized: false,
                    featured: false
                }
            })
            console.log(magenta(`Article ${id} was privatized`));
            return res.status(200).send(`Article ${id} was privatized`)
        } else {
            return res.status(403).send("This article does not exist")
        }
    })
        .catch(err => {
            console.log(red(err));
            return res.status(403).send(err)
        })
    const article = await getMetadataDB(id)
    const user = await getUser(req.user)
    await webhook.privatisedArticle(article.title, article.description, article.tag, user)
};


// get a single articles metadata from the database
export const getMetadataDB = async (postId: number) =>
    await prisma.article.findUnique({
        where: {id: postId}
    })


// ===== POST BODY ===== //

const postBodyCacheLimit: number = 100;
const postBodyCache: Map<number, string> = new Map();

const getPostBody = async (postId: number) => {
    if (postBodyCache.has(postId)) {
        // Move this post ID to the end of the cache
        const body = postBodyCache.get(postId);
        postBodyCache.delete(postId);
        postBodyCache.set(postId, body);
        return body;
    }

    while (postBodyCache.size >= postBodyCacheLimit) {
        postBodyCache.delete(postBodyCache.keys().next().value);
    }

    const beautified = await promises.readFile(`${dir}/${postId}.json`, 'utf8');
    const body: string = JSON.stringify(JSON.parse(beautified));

    postBodyCache.set(postId, body);
    return body;
};


export const setPostBody = async (postId: number, newBody: string) => {
    if (!postBodyCache.has(postId)) {
        while (postBodyCache.size >= postBodyCacheLimit) {
            postBodyCache.delete(postBodyCache.keys().next().value);
        }
    }
    const beautified: string = JSON.stringify(JSON.parse(newBody), null, 2);
    postBodyCache.set(postId, newBody);
    await writeFile(`${dir}/${postId}.json`, beautified, {encoding: 'utf8'}, (err) => {
        if (err) {
            console.log(err);
        } else {
            console.log(cyan(`Post ${postId} saved successfully`));
        }
    });
}


// ===== GIT ===== //

export const commit = async (postId, message, author, email = `${author}@technicalmc.xyz`) => {
    if (typeof (author) === 'object') {
        let gitUsername = author.discordName;
        if (gitUsername.length > 34) {
            gitUsername = gitUsername.substring(0, 34);
        }
        gitUsername = gitUsername.replace(/\W/g, '_');
        gitUsername += '_' + String(author.discordDiscriminator).padStart(4, '0');
        email = author.discordId + '@technicalmc.xyz';
        author = gitUsername;
    }
    const repo = await Git.Repository.open(`${dir}/.git`);
    const index = await repo.refreshIndex();
    await index.addByPath(`${postId}.json`);
    await index.addByPath('metadata.json');
    await index.write();
    const oid = await index.writeTree();
    const head = await Git.Reference.nameToId(repo, 'HEAD');
    const parent = await repo.getCommit(head);
    const authorSig = Git.Signature.now(author, email);
    const committerSig = Git.Signature.now('tmc-wiki', 'tmc-wiki@technicalmc.xyz');
    const commitId = await repo.createCommit('HEAD', authorSig, committerSig, `[${postId}] ${message}`, oid, [parent]);

    console.log(yellow(`Committed change ${commitId} to file ${postId}.json`));
}

// add the metadata to the database
export const createMetadataDB = async (metadata: PostMetadata) =>
    await prisma["article"].create({
        data: {
            title: metadata.title,
            tag: metadata.tag,
            description: metadata.description,
            last_edited: metadata.last_edited,
            edit_count: metadata.edit_count
        }
    })

//FIXME check for race condition
export const createPost = async (author: string, title: string, description: string, tag: string, body: any) => {
    const metadata = new PostMetadata();
    metadata.title = title;
    metadata.description = description;
    metadata.tag = tag;

    const metadatadb = await createMetadataDB(metadata);
    const postId = metadatadb.id;
    await setPostBody(postId, body);
    await postMetadata.set(postId, metadata);
    await commit(postId, `Create ${title}`, author);

    return metadatadb;
}

export const getNetworkPostObject = async (postId: number) => {
    const metadata = await prisma.article.findUnique({
        where: {id: postId}
    })
    return {
        id: postId,
        title: metadata.title,
        description: metadata.description,
        tag: metadata.tag,
        last_edited: metadata.last_edited,
        editCount: metadata.edit_count,
        publicized: metadata.publicized,
        featured: metadata.featured,
        body: await getPostBody(postId)
    };
}

initialize();
