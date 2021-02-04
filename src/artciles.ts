// Post parser
export {};
const {existsSync, promises, readFileSync, writeFile} = require('fs');
const Git = require('nodegit');
const dir = './posts';
const metadataFile = `${dir}/metadata.json`
const {greenBright, magenta, red} = require('chalk')
const sqlite3 = require('sqlite3');
const utils = require('../utils/utils.ts');
import {PrismaClient} from "@prisma/client"

const prisma = new PrismaClient();

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

let nextPostId = 0;
const initialize = (): void => {
    let metadata;
    let needsToSave: boolean = false;
    if (existsSync(metadataFile)) {
        metadata = JSON.parse(readFileSync(metadataFile, 'utf8'));
    } else {
        if (existsSync('metadata.json')) {
            metadata = JSON.parse(readFileSync('metadata.json', 'utf8'));
        } else {
            metadata = null;
        }
        needsToSave = true;
    }

    if (metadata) {
        if (Array.isArray(metadata)) {
            // legacy format
            for (let post of metadata) {
                post.id = +post.id;
                post.edit_count = post.edit_count || 0;
                postMetadata.set(post.id, Object.assign(new PostMetadata(), post));
                if (post.id >= nextPostId) {
                    nextPostId = post.id + 1;
                }
            }
        } else {
            nextPostId = metadata.nextPostId;
            for (let post of metadata.posts) {
                if (typeof (post.last_edited) === 'string') {
                    // Legacy last_edited format (from Date.toDateString())
                    const parts = post.last_edited.split(' ');
                    const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(parts[1]);
                    const day = +parts[2];
                    const year = +parts[3];
                    post.last_edited = new Date(year, month, day).getTime();
                }

                postMetadata.set(post.id, Object.assign(new PostMetadata(), post));
            }
        }
    }

    if (needsToSave) {
        saveMetadata().then(() => console.log('Written initial metadata.json file'));
    }

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
// LEGACY?
export const saveMetadata = async (): Promise<void> => {
    await writeFile(metadataFile, JSON.stringify({
        nextPostId: nextPostId,
        posts: Array.from(postMetadata.values())
    }, null, 2), (err) => {
        if (err) {
            console.log(err);
        } else {
            console.log('Metadata saved correctly');
        }
    });
}

//get the all of the metadata - ordered from newest to oldest
export const getAllMetadata = async () => await prisma.article.findMany({
    orderBy: {
        id: 'desc'
    }
})
// get all of the public metadata - ordered from newest to oldest
export const getPublicMetadataDB = async () => await prisma.article.findMany({
    where: {publicized: true},
    orderBy: {
        id: 'desc'
    }
})

export const articleExists = async (id: number): Promise<boolean> =>
    await prisma.article.findUnique({where: {id: id}}) !== null;

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
};

export const publicizePost = async (req, res) => {
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
};

export const privatizePost = async (req, res) => {
    const reqBody = utils.cast('object', req.body);
    const id = utils.cast('number', reqBody.id);
    articleExists(id).then(async exists => {
        if (exists) {
            await prisma.article.update({
                where: {id: id},
                data: {publicized: false}
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
};

export const getMetadata = (postId: number): PostMetadata => postMetadata.get(postId);


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
            console.log(`Post ${postId} saved successfully`);
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
    console.log(`Committed change ${commitId} to file ${postId}.json`);
}


const createMetadataDB = async (metadata: PostMetadata) =>
    await prisma["article"].create({
        data: {
            title: metadata.title,
            tag: metadata.tag,
            description: metadata.description,
            last_edited: metadata.last_edited,
            edit_count: metadata.edit_count
        }
    });

export const createPost = async (author: string, title: string, description: string, tag: string, body: any) => {
    const postId = nextPostId++;
    // save post body before metadata to avoid race condition
    await setPostBody(postId, body);
    const metadata = new PostMetadata();
    metadata.id = postId;
    metadata.title = title;
    metadata.description = description;
    metadata.tag = tag;
    await saveMetadata();
    await postMetadata.set(postId, metadata);
    await createMetadataDB(metadata);
    await commit(postId, `Create ${title}`, author);
    return metadata;
}

export const getNetworkPostObject = async (postId: number) => {
    const metadata = await prisma.article.findUnique({
        where: {id: postId}
    })
    await console.log(`Metadata = ${metadata}`)
    return {
        id: postId,
        title: metadata.title,
        description: metadata.description,
        tag: metadata.tag,
        last_edited: metadata.last_edited,
        editCount: metadata.edit_count,
        status: metadata.status,
        body: await getPostBody(postId)
    };
}

initialize();
