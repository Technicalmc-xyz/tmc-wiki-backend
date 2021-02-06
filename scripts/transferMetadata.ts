export {}

const metadataFile = `./posts/metadata.json`
const postMetadata = new Map();
const {existsSync, readFileSync, writeFile} = require('fs');
const articles = require('../src/artciles')
let nextPostId = 0;

class PostMetadata {
    id: number;
    title: string;
    tags: string;
    description: string;
    last_edited: number;
    edit_count: number
    constructor() {
        this.id = 0;
        this.title = '';
        this.tags = '';
        this.description = '';
        this.last_edited = Date.now();
        this.edit_count = 0;
    }
}

const initialize = () => {
    let metadata;
    let needsToSave = false;
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
}
const saveMetadata = async () => {
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
const getAllMetadata = () => Array.from(postMetadata.values());
//TODO make the transfer code
const transferMetaData = () => {
    const metadata = getAllMetadata();
    metadata.forEach(element =>
        articles.createMetadataDB(element)
    )
}
const main = async () => {
    initialize()
    transferMetaData()
}
main();